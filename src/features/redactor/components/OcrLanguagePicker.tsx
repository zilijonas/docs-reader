import { Languages } from 'lucide-react';

import { OCR_LANGUAGES } from '../../../lib/constants';
import { Chip } from '../../../components/ui';

interface OcrLanguagePickerProps {
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}

export function OcrLanguagePicker({ selected, onChange, disabled = false }: OcrLanguagePickerProps) {
  const toggle = (code: string) => {
    if (disabled) return;

    const isOn = selected.includes(code);
    const next = isOn ? selected.filter((entry) => entry !== code) : [...selected, code];
    onChange(next);
  };

  return (
    <div className="border-b border-border px-5 py-ui-section">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="type-data flex items-center gap-1.5">
          <Languages size={12} strokeWidth={1.75} />
          OCR languages
        </span>
        <span className="ui-text-note text-content-subtle">
          applied to next PDF
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {OCR_LANGUAGES.map(({ code, label }) => {
          const isOn = selected.includes(code);
          return (
            <Chip
              className={isOn ? 'border-content bg-surface-muted text-content' : undefined}
              data-active={isOn}
              interactive
              key={code}
              onClick={() => toggle(code)}
              tone={isOn ? 'muted' : 'neutral'}
            >
              <span className="whitespace-nowrap font-mono text-xs">{label}</span>
            </Chip>
          );
        })}
      </div>

      <p className="ui-text-note mt-2 italic text-content-subtle">
        Extra languages are fetched on demand (~5–15 MB each) and cached by your browser.
      </p>
    </div>
  );
}
