import { Languages } from 'lucide-react';

import { DEFAULT_OCR_LANGUAGES } from '../../../lib/app-config';
import { Button, Dialog } from '../../../components/ui';
import { copy } from '../../../lib/copy';
import { useWorkflowContext } from '../context/WorkflowContext';
import { OcrLanguagePicker } from './OcrLanguagePicker';

export function OcrLanguageDialog() {
  const {
    handleContinueOcr,
    isOcrLanguageModalOpen,
    isProcessing,
    resetSession,
    selectedOcrLanguages,
    setSelectedOcrLanguages,
  } = useWorkflowContext();

  return (
    <Dialog open={isOcrLanguageModalOpen} size="lg" top>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <div className="text-content-subtle text-content text-badge tracking-label flex items-center gap-1.5 font-mono leading-4 uppercase">
            <Languages size={14} strokeWidth={1.6} />
            {copy.ocr.eyebrow}
          </div>
          <h2 className="text-content-muted text-content leading-reading text-lg font-semibold text-pretty">
            {copy.ocr.heading}
          </h2>
          <p className="text-content-muted text-sm leading-6">{copy.ocr.body}</p>
        </div>

        <OcrLanguagePicker
          onChange={(next) =>
            setSelectedOcrLanguages(next.length > 0 ? next : [...DEFAULT_OCR_LANGUAGES])
          }
          selected={selectedOcrLanguages}
        />

        <p className="text-content-subtle text-note italic">{copy.ocr.note}</p>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            onClick={() => {
              void resetSession();
            }}
            variant="secondary"
          >
            {copy.ocr.cancel}
          </Button>
          <Button disabled={isProcessing} onClick={() => void handleContinueOcr()}>
            {copy.ocr.start}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
