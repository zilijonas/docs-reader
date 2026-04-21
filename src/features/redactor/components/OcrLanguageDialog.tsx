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
          <div className="type-data flex items-center gap-1.5 text-content">
            <Languages size={14} strokeWidth={1.6} />
            {copy.ocr.eyebrow}
          </div>
          <h2 className="type-body-lg font-semibold text-content">{copy.ocr.heading}</h2>
          <p className="text-sm leading-6 text-content-muted">{copy.ocr.body}</p>
        </div>

        <OcrLanguagePicker
          onChange={(next) => setSelectedOcrLanguages(next.length > 0 ? next : [...DEFAULT_OCR_LANGUAGES])}
          selected={selectedOcrLanguages}
        />

        <p className="ui-text-note italic text-content-subtle">{copy.ocr.note}</p>

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
