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

_VOWEL_CHARS = set("aeiouyąęėįųūœ")
_REPLACEMENT_CHAR = "\ufffd"

def _is_native_text_garbled(text_content, min_lowercase_ratio, min_vowel_token_ratio, min_letters):
    """Detect a broken ToUnicode CMap that produces letter-shaped junk.

    Real prose has a substantial run of lowercase letters and most word
    tokens contain at least one vowel. PDFs with a corrupt encoding emit
    short runs of uppercase consonant clusters that look plausible at a
    glance but contain almost no lowercase / no vowels.
    """
    if not text_content:
        return False

    letters = 0
    lowercase = 0
    replacement_chars = 0
    for ch in text_content:
        if ch == _REPLACEMENT_CHAR:
            replacement_chars += 1
        if ch.isalpha():
            letters += 1
            if ch.islower():
                lowercase += 1

    if letters < min_letters:
        return False

    lowercase_ratio = lowercase / letters if letters else 0.0

    tokens = [tok for tok in text_content.split() if any(c.isalpha() for c in tok)]
    if not tokens:
        return False

    vowel_tokens = 0
    for tok in tokens:
        lowered = tok.lower()
        if any(c in _VOWEL_CHARS for c in lowered):
            vowel_tokens += 1
    vowel_ratio = vowel_tokens / len(tokens) if tokens else 0.0

    if replacement_chars > 2:
        return True
    if lowercase_ratio < min_lowercase_ratio and vowel_ratio < min_vowel_token_ratio:
        return True
    return False


def load_document_from_bytes(
    pdf_bytes,
    preview_scale,
    min_text_spans,
    min_text_chars,
    min_lowercase_ratio=0.20,
    min_vowel_token_ratio=0.25,
    garbled_min_letters=40,
):
    global current_doc, current_bytes
    current_bytes = bytes(pdf_bytes)
    current_doc = pymupdf.open(stream=current_bytes, filetype="pdf")

    pages = []
    spans = []
    warnings = []
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
        meets_thresholds = (
            len(page_spans) >= min_text_spans and len(text_content) >= min_text_chars
        )
        garbled = meets_thresholds and _is_native_text_garbled(
            text_content,
            min_lowercase_ratio,
            min_vowel_token_ratio,
            garbled_min_letters,
        )
        if garbled:
            warnings.append(
                f"Page {page_index + 1} has a broken text layer — falling back to OCR."
            )
        lane = "searchable" if meets_thresholds and not garbled else "ocr"

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
        "warnings": warnings,
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

    pix = page.get_pixmap(matrix=pymupdf.Matrix(1.5, 1.5), colorspace=pymupdf.csGRAY, alpha=False)
    pixels, w, h = _downscale_gray(pix, 540)
    binary = _binarize(pixels, 210)

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
    min_ink_per_row = max(1, w // 120)
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
        if band_height < 3 or band_height > max(8, h // 3):
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
        merge_gap = max(8, w // 35)
        merge_y_slop = max(3, band_height)
        for comp in components:
            cx0, cy0, cx1, cy1, ink, rowspan = comp
            cw = cx1 - cx0 + 1
            ch = cy1 - cy0 + 1
            # Filter: tiny dots, solid blocks, tall isolated glyphs
            if ink < 3:
                continue
            if cw * ch > 0 and ink / (cw * ch) > 0.6:
                continue
            if clusters:
                prev = clusters[-1]
                vertically_close = cy0 <= prev[3] + merge_y_slop and cy1 + merge_y_slop >= prev[1]
            else:
                prev = None
                vertically_close = False

            if prev is not None and (cx0 - prev[2]) < merge_gap and vertically_close:
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
            if density < 0.015 or density > 0.45:
                continue
            min_wide_signature = max(20, w // 12)
            min_tall_signature_width = max(12, w // 22)
            min_tall_signature_height = max(14, h // 45)
            if cw < min_wide_signature and not (cw >= min_tall_signature_width and ch >= min_tall_signature_height):
                continue
            if rowspan < max(3, band_height * 0.5):
                continue

            raw_norm_x = cx0 / w
            raw_norm_y = cy0 / h
            raw_norm_w = cw / w
            raw_norm_h = ch / h
            raw_norm_box = (raw_norm_x, raw_norm_y, raw_norm_x + raw_norm_w, raw_norm_y + raw_norm_h)

            pad_x = max(6, int(cw * 0.35), w // 70)
            is_narrow_tall = ch > 0 and (cw / ch) < 1.25
            if is_narrow_tall:
                pad_y = max(10, min(int(ch * 0.65), h // 28), h // 70)
            else:
                pad_y = max(6, min(int(ch * 0.22), h // 70), h // 140)
            px0 = max(0, cx0 - pad_x)
            py0 = max(0, cy0 - pad_y)
            px1 = min(w - 1, cx1 + pad_x)
            py1 = min(h - 1, cy1 + pad_y)

            norm_x = px0 / w
            norm_y = py0 / h
            norm_w = (px1 - px0 + 1) / w
            norm_h = (py1 - py0 + 1) / h
            norm_box = (norm_x, norm_y, norm_x + norm_w, norm_y + norm_h)

            # Reject regions whose ink overlaps text. Use the raw ink box,
            # not the padded output box, so nearby labels do not erase a real
            # signature while prose glyph clusters still get filtered.
            overlap_count = 0
            overlap_area = 0.0
            for tb in text_boxes:
                tx0 = tb["x"]
                ty0 = tb["y"]
                tx1 = tx0 + tb["width"]
                ty1 = ty0 + tb["height"]
                if _overlaps(raw_norm_box, (tx0, ty0, tx1, ty1)):
                    overlap_count += 1
                    overlap_x = max(0.0, min(raw_norm_x + raw_norm_w, tx1) - max(raw_norm_x, tx0))
                    overlap_y = max(0.0, min(raw_norm_y + raw_norm_h, ty1) - max(raw_norm_y, ty0))
                    overlap_area += overlap_x * overlap_y
            if overlap_count >= 4:
                continue
            if raw_norm_w * raw_norm_h > 0 and overlap_area / (raw_norm_w * raw_norm_h) > 0.18:
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
