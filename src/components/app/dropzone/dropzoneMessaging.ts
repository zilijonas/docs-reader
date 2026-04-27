import type { ProcessingProgress } from '../../../types';

export const DROPZONE_SECTION_HEIGHT_CLASS = 'h-[24rem] sm:h-[25rem]';
export const DROPZONE_REASSURANCE_INTERVAL_MS = 2100;

export function getDropzoneReassuranceMessages(progress: ProcessingProgress | null) {
  switch (progress?.phase) {
    case 'booting':
      return ['Starting private processing', 'Warming up on your device', 'Nothing is uploaded'];
    case 'loading':
      return ['Preparing your PDF locally', 'Opening pages on your device', 'Your file stays here'];
    case 'extracting':
      return ['Reading text on your device', 'Preparing pages locally', 'Nothing is uploaded'];
    case 'ocr':
      return ['Scanning pages on your device', 'OCR stays local', 'Still on your device'];
    case 'rules':
      return [
        'Checking likely sensitive details',
        'Review stays in your control',
        'Nothing is uploaded',
      ];
    case 'preview':
      return ['Rendering page previews locally', 'Getting redaction tools ready', 'Almost ready'];
    case 'complete':
      return ['Ready to review'];
    default:
      return ['Processing locally', 'Your file stays here', 'Nothing is uploaded'];
  }
}
