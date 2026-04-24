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

def _downscale_gray(pix, target_width):
    width = pix.width
    height = pix.height
    channels = pix.n
    samples = pix.samples
    if width <= target_width:
        step = 1
        scaled_w = width
    else:
        step = max(1, width // target_width)
        scaled_w = width // step
    scaled_h = max(1, height // step)

    row_stride = width * channels
    pixels = bytearray(scaled_w * scaled_h)
    for sy in range(scaled_h):
        src_y = sy * step
        row_offset = src_y * row_stride
        out_offset = sy * scaled_w
        for sx in range(scaled_w):
            idx = row_offset + sx * step * channels
            if channels >= 3:
                val = (samples[idx] + samples[idx + 1] + samples[idx + 2]) // 3
            else:
                val = samples[idx]
            pixels[out_offset + sx] = val
    return pixels, scaled_w, scaled_h

def _binarize(pixels, threshold=190):
    return bytes(0 if pixel < threshold else 1 for pixel in pixels)

def _overlaps(a, b, tolerance=0.0):
    ax0, ay0, ax1, ay1 = a
    bx0, by0, bx1, by1 = b
    return not (ax1 + tolerance < bx0 or bx1 + tolerance < ax0 or ay1 + tolerance < by0 or by1 + tolerance < ay0)

def _flood_cluster(binary, width, height, visited, start_x, start_y):
    stack = [(start_x, start_y)]
    min_x, min_y, max_x, max_y = start_x, start_y, start_x, start_y
    ink_count = 0
    rows = set()
    while stack:
        x, y = stack.pop()
        key = y * width + x
        if key in visited:
            continue
        visited.add(key)
        if binary[key] != 0:
            continue
        ink_count += 1
        rows.add(y)
        if x < min_x: min_x = x
        if x > max_x: max_x = x
        if y < min_y: min_y = y
        if y > max_y: max_y = y
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < width and 0 <= ny < height and (ny * width + nx) not in visited:
                stack.append((nx, ny))
    return min_x, min_y, max_x, max_y, ink_count, len(rows)

def detect_signature_regions(page_index, text_boxes_json, min_y_ratio=0.0):
    if current_doc is None:
        raise RuntimeError("No PDF has been loaded yet.")
    page = current_doc[page_index]
    rect = page.rect
    text_boxes = json.loads(text_boxes_json) if text_boxes_json else []

    pix = page.get_pixmap(matrix=pymupdf.Matrix(1.2, 1.2), colorspace=pymupdf.csGRAY, alpha=False)
    pixels, w, h = _downscale_gray(pix, 360)
    binary = _binarize(pixels, 190)

    # Precompute row ink density to find candidate "ink bands".
    row_ink = [0] * h
    for y in range(h):
        row_start = y * w
        count = 0
        for x in range(w):
            if binary[row_start + x] == 0:
                count += 1
        row_ink[y] = count

    # Locate contiguous ink bands (non-sparse rows). Signatures typically
    # produce a band 8-40 pixels tall at this scale with moderate density.
    bands = []
    y = 0
    min_ink_per_row = max(2, w // 80)
    while y < h:
        if row_ink[y] >= min_ink_per_row:
            start = y
            while y < h and row_ink[y] >= min_ink_per_row:
                y += 1
            end = y
            bands.append((start, end))
        else:
            y += 1

    results = []
    visited = set()
    for band_start, band_end in bands:
        band_height = band_end - band_start
        if band_height < 4 or band_height > max(8, h // 3):
            continue
        if band_start / h < min_y_ratio:
            continue

        # Flood-fill components inside this band.
        components = []
        for by in range(band_start, band_end):
            for bx in range(w):
                idx = by * w + bx
                if idx in visited or binary[idx] != 0:
                    continue
                comp = _flood_cluster(binary, w, h, visited, bx, by)
                components.append(comp)

        # Cluster components that are on the same horizontal band and close in x.
        components.sort(key=lambda comp: comp[0])
        clusters = []
        for comp in components:
            cx0, cy0, cx1, cy1, ink, rowspan = comp
            cw = cx1 - cx0 + 1
            ch = cy1 - cy0 + 1
            # Filter: tiny dots, solid blocks, tall isolated glyphs
            if ink < 6:
                continue
            if cw * ch > 0 and ink / (cw * ch) > 0.6:
                continue
            if clusters and (cx0 - clusters[-1][2]) < max(4, w // 80):
                prev = clusters[-1]
                clusters[-1] = (
                    min(prev[0], cx0),
                    min(prev[1], cy0),
                    max(prev[2], cx1),
                    max(prev[3], cy1),
                    prev[4] + ink,
                    max(prev[5], rowspan),
                )
            else:
                clusters.append([cx0, cy0, cx1, cy1, ink, rowspan])

        for cluster in clusters:
            cx0, cy0, cx1, cy1, ink, rowspan = cluster
            cw = cx1 - cx0 + 1
            ch = cy1 - cy0 + 1
            area = cw * ch
            if area == 0:
                continue
            density = ink / area
            # Signatures: irregular, not too dense, not too sparse, wide enough
            if density < 0.03 or density > 0.45:
                continue
            if cw < max(20, w // 12):
                continue
            if rowspan < max(3, band_height * 0.5):
                continue

            norm_x = cx0 / w
            norm_y = cy0 / h
            norm_w = cw / w
            norm_h = ch / h
            norm_box = (norm_x, norm_y, norm_x + norm_w, norm_y + norm_h)

            # Reject regions that heavily overlap existing text words.
            overlap_count = 0
            for tb in text_boxes:
                tx0 = tb["x"]
                ty0 = tb["y"]
                tx1 = tx0 + tb["width"]
                ty1 = ty0 + tb["height"]
                if _overlaps(norm_box, (tx0, ty0, tx1, ty1)):
                    overlap_count += 1
            if overlap_count >= 4:
                continue

            results.append({
                "box": {
                    "x": max(0.0, norm_x),
                    "y": max(0.0, norm_y),
                    "width": min(1.0, norm_w),
                    "height": min(1.0, norm_h),
                },
                "density": density,
                "width_px": cw,
                "height_px": ch,
            })

    # Sort by score (wider + irregular preferred) and cap results.
    results.sort(key=lambda item: item["width_px"] * item["height_px"], reverse=True)
    return json.dumps(results[:4])

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
      updateProgress(0, { phase: 'booting', progress: 0.05, message: 'Starting up' });

      const moduleUrl = new URL(
        `${state.baseUrl}pyodide/pyodide.mjs`,
        self.location.origin,
      ).toString();
      const { loadPyodide } = (await import(/* @vite-ignore */ moduleUrl)) as LoadPyodideModule;
      const pyodide = await loadPyodide({
        indexURL: new URL(`${state.baseUrl}pyodide/`, self.location.origin).toString(),
      });

      updateProgress(0, { phase: 'booting', progress: 0.2, message: 'Preparing document tools' });

      await pyodide.loadPackage('pymupdf');
      await pyodide.runPythonAsync(PYTHON_HELPERS);
      state.pyodide = pyodide;
      return pyodide;
    })();
  }

  return state.pyodidePromise;
};
