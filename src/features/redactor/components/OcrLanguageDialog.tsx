import { Languages } from 'lucide-react';

import { DEFAULT_OCR_LANGUAGES, OCR_LANGUAGES } from '../../../lib/app-config';
import { Button, Dialog, StatusPill } from '../../../components/ui';
import { copy } from '../../../lib/copy';
import { useWorkflowContext } from '../context/WorkflowContext';
import { OcrLanguagePicker } from './OcrLanguagePicker';

const languageLabelByCode = new Map<string, string>(
  OCR_LANGUAGES.map((language) => [language.code, language.label]),
);

const formatLanguageList = (languages: string[]) =>
  languages.map((language) => languageLabelByCode.get(language) ?? language).join(', ');

const confidenceLabel = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Needs review',
} as const;

export function OcrLanguageDialog() {
  const {
    handleContinueOcr,
    isOcrLanguageModalOpen,
    isProcessing,
    ocrLanguageDetection,
    resetSession,
    selectedOcrLanguages,
    setSelectedOcrLanguages,
  } = useWorkflowContext();
  const hasDetectedLanguage =
    Boolean(ocrLanguageDetection?.detectedLanguage) && ocrLanguageDetection?.confidence !== 'low';
  const detectedLanguage = ocrLanguageDetection?.detectedLanguage
    ? (languageLabelByCode.get(ocrLanguageDetection.detectedLanguage) ??
      ocrLanguageDetection.detectedLanguage)
    : null;
  const sampledPages = ocrLanguageDetection?.samplePageIndexes?.map((pageIndex) => pageIndex + 1);

  return (
    <Dialog open={isOcrLanguageModalOpen} size="lg" top>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <div className="text-content-subtle text-content text-badge tracking-label flex items-center gap-1.5 font-mono leading-4 uppercase">
            <Languages size={14} strokeWidth={1.6} />
            {copy.ocr.eyebrow}
          </div>
          <h2 className="text-content-muted text-content leading-reading text-lg font-semibold text-pretty">
            {hasDetectedLanguage ? copy.ocr.heading : copy.ocr.fallbackHeading}
          </h2>
          <p className="text-content-muted text-sm leading-6">
            {hasDetectedLanguage ? copy.ocr.body : copy.ocr.fallbackBody}
          </p>
        </div>

        {ocrLanguageDetection ? (
          <div className="border-border flex flex-col gap-3 border-y py-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill
                size="sm"
                status={ocrLanguageDetection.confidence === 'low' ? 'pending' : 'trust'}
              >
                {confidenceLabel[ocrLanguageDetection.confidence]}
              </StatusPill>
              <span className="text-content-muted text-sm font-medium">
                {hasDetectedLanguage
                  ? `${detectedLanguage} detected`
                  : `${formatLanguageList(selectedOcrLanguages)} selected`}
              </span>
            </div>
            <p className="text-content-subtle text-note leading-5">
              {sampledPages?.length
                ? `Detected from page ${sampledPages.join(', ')} using local English bootstrap OCR.`
                : 'Selected from document text available in the browser.'}
            </p>
          </div>
        ) : null}

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
