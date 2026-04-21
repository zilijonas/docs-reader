import type { LoadPyodideModule, PyProxyLike } from './state';
import { state, updateProgress, runPythonTask } from './state';

const PYTHON_HELPERS = `
import json
import pymupdf

current_doc = None
current_bytes = None

def _normalize_box(x0, y0, x1, y1, width, height):
    left = max(0.0, min(1.0, x0 / width))
    top = max(0.0, min(1.0, y0 / height))
    right = max(left, min(1.0, x1 / width))
    bottom = max(top, min(1.0, y1 / height))
    return {
        "x": left,
        "y": top,
        "width": right - left,
        "height": bottom - top,
    }

def load_document_from_bytes(pdf_bytes, preview_scale, min_text_spans, min_text_chars):
    global current_doc, current_bytes
    current_bytes = bytes(pdf_bytes)
    current_doc = pymupdf.open(stream=current_bytes, filetype="pdf")

    pages = []
    spans = []
    for page_index in range(current_doc.page_count):
        page = current_doc[page_index]
        rect = page.rect
        words = page.get_text("words", sort=True)
        page_spans = []
        text_parts = []
        cursor = 0

        for word_index, word in enumerate(words):
            x0, y0, x1, y1, text = word[:5]
            text = " ".join(str(text).split())
            if not text:
                continue

            prefix = "" if not text_parts else " "
            start = cursor + len(prefix)
            cursor = start + len(text)
            text_parts.append(text)
            page_spans.append({
                "id": f"span_{page_index}_{word_index}",
                "pageIndex": page_index,
                "text": text,
                "box": _normalize_box(x0, y0, x1, y1, rect.width, rect.height),
                "source": "native",
                "confidence": 1,
                "start": start,
                "end": cursor,
            })

        text_content = " ".join(text_parts)
        lane = "searchable" if len(page_spans) >= min_text_spans and len(text_content) >= min_text_chars else "ocr"

        pages.append({
            "pageIndex": page_index,
            "width": rect.width,
            "height": rect.height,
            "lane": lane,
            "previewScale": preview_scale,
            "textLayerStatus": "native" if lane == "searchable" else "missing",
            "ocrStatus": "skipped" if lane == "searchable" else "queued",
            "textContent": text_content if lane == "searchable" else "",
            "charCount": len(text_content),
            "spanCount": len(page_spans) if lane == "searchable" else 0,
        })

        if lane == "searchable":
            spans.extend(page_spans)

    return json.dumps({
        "pageCount": current_doc.page_count,
        "pages": pages,
        "spans": spans,
    })

def render_page_png(page_index, scale):
    if current_doc is None:
        raise RuntimeError("No PDF has been loaded yet.")
    page = current_doc[page_index]
    pix = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=False)
    return pix.tobytes("png")

def export_redacted_pdf(redactions_json):
    if current_bytes is None:
        raise RuntimeError("No PDF has been loaded yet.")

    doc = pymupdf.open(stream=current_bytes, filetype="pdf")
    redactions = json.loads(redactions_json)
    touched_pages = set()

    for item in redactions:
        page = doc[item["pageIndex"]]
        rect = page.rect
        box = item["box"]
        redact_rect = pymupdf.Rect(
            box["x"] * rect.width,
            box["y"] * rect.height,
            (box["x"] + box["width"]) * rect.width,
            (box["y"] + box["height"]) * rect.height,
        )
        page.add_redact_annot(redact_rect, fill=(0, 0, 0))
        touched_pages.add(item["pageIndex"])

    for page_index in sorted(touched_pages):
        doc[page_index].apply_redactions()

    return doc.tobytes(garbage=4, deflate=True)
`;

const withGlobals = async <T>(bindings: Record<string, unknown>, action: () => Promise<T>) =>
  runPythonTask(async () => {
    const pyodide = await ensurePyodide();
    Object.entries(bindings).forEach(([name, value]) => {
      pyodide.globals.set(name, value);
    });

    try {
      return await action();
    } finally {
      Object.keys(bindings).forEach((name) => {
        try {
          pyodide.globals.delete(name);
        } catch {
          pyodide.globals.set(name, undefined);
        }
      });
    }
  });

export const runPythonJson = async <T>(code: string, bindings: Record<string, unknown>) =>
  withGlobals(bindings, async () => {
    const pyodide = await ensurePyodide();
    const result = await pyodide.runPythonAsync(code);
    return JSON.parse(result as string) as T;
  });

export const runPythonBytes = async (code: string, bindings: Record<string, unknown>) =>
  withGlobals(bindings, async () => {
    const pyodide = await ensurePyodide();
    const proxy = (await pyodide.runPythonAsync(code)) as PyProxyLike;

    try {
      return proxy.toJs();
    } finally {
      proxy.destroy?.();
    }
  });

export const ensurePyodide = async () => {
  if (state.pyodide) {
    return state.pyodide;
  }

  if (!state.pyodidePromise) {
    state.pyodidePromise = (async () => {
      updateProgress(0, { phase: 'booting', progress: 0.05, message: 'Starting up…' });

      const moduleUrl = new URL(`${state.baseUrl}pyodide/pyodide.mjs`, self.location.origin).toString();
      const { loadPyodide } = (await import(/* @vite-ignore */ moduleUrl)) as LoadPyodideModule;
      const pyodide = await loadPyodide({
        indexURL: new URL(`${state.baseUrl}pyodide/`, self.location.origin).toString(),
      });

      updateProgress(0, { phase: 'booting', progress: 0.2, message: 'Preparing document tools…' });

      await pyodide.loadPackage('pymupdf');
      await pyodide.runPythonAsync(PYTHON_HELPERS);
      state.pyodide = pyodide;
      return pyodide;
    })();
  }

  return state.pyodidePromise;
};
