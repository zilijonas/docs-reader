import { PDFDocument } from 'pdf-lib';

import { APP_LIMITS } from '../../lib/app-config';
import type { BoundingBox, Detection, ManualRedaction } from '../../types';
import { runPythonBytes } from './pyodide';
import { filterExportBoxes, state, toOwnedArrayBuffer, updateProgress } from './state';

const bytesToBlob = (bytes: Uint8Array, mimeType: string) => new Blob([toOwnedArrayBuffer(bytes)], { type: mimeType });

export const paintFlattenedPage = async (pageIndex: number, boxes: BoundingBox[]) => {
  const pngBytes = await runPythonBytes('render_page_png(page_index_js, scale_js)', {
    page_index_js: pageIndex,
    scale_js: APP_LIMITS.exportScale,
  });

  const blob = bytesToBlob(pngBytes, 'image/png');
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Could not create an export canvas.');
  }

  context.drawImage(bitmap, 0, 0);
  context.fillStyle = '#050505';
  boxes.forEach((box) => {
    context.fillRect(box.x * canvas.width, box.y * canvas.height, box.width * canvas.width, box.height * canvas.height);
  });

  const exportBlob = await canvas.convertToBlob({ type: 'image/png' });
  return new Uint8Array(await exportBlob.arrayBuffer());
};

export const exportFlattenedPdf = async (detections: Detection[], manualRedactions: ManualRedaction[], requestId: number) => {
  const output = await PDFDocument.create();

  for (const page of state.pages) {
    const boxes = filterExportBoxes(detections, manualRedactions)
      .filter((entry) => entry.pageIndex === page.pageIndex)
      .map((entry) => entry.box);

    const imageBytes = await paintFlattenedPage(page.pageIndex, boxes);
    const embedded = await output.embedPng(imageBytes);
    const pdfPage = output.addPage([page.width, page.height]);
    pdfPage.drawImage(embedded, {
      x: 0,
      y: 0,
      width: page.width,
      height: page.height,
    });

    updateProgress(requestId, {
      phase: 'export',
      progress: (page.pageIndex + 1) / state.pages.length,
      message: `Preparing page ${page.pageIndex + 1} of ${state.pages.length}…`,
      pageIndex: page.pageIndex,
    });
  }

  return output.save();
};
