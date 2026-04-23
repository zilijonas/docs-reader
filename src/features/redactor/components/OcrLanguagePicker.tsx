import { OCR_LANGUAGES } from '../../../lib/app-config';
import { Chip } from '../../../components/ui';

interface OcrLanguagePickerProps {
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}

export function OcrLanguagePicker({
  selected,
  onChange,
  disabled = false,
}: OcrLanguagePickerProps) {
  const toggle = (code: string) => {
    if (disabled) return;

    const isOn = selected.includes(code);
    const next = isOn ? selected.filter((entry) => entry !== code) : [...selected, code];
    onChange(next);
  };

  return (
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
            <span className="font-mono text-xs whitespace-nowrap">{label}</span>
          </Chip>
        );
      })}
    </div>
  );
}
