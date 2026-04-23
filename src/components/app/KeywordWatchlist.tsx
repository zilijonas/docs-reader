import { Plus, X as XIcon } from 'lucide-react';

import { Button, Chip, Input } from '../../components/ui';
import { copy } from '@/lib/copy';

export function KeywordWatchlist({
  draft,
  keywords,
  onDraftChange,
  onAddKeyword,
  onRemoveKeyword,
}: {
  draft: string;
  keywords: string[];
  onDraftChange: (value: string) => void;
  onAddKeyword: () => void | Promise<void>;
  onRemoveKeyword: (keyword: string) => void | Promise<void>;
}) {
  return (
    <div className="border-border py-ui-section border-b px-5">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-content-subtle text-badge tracking-label font-mono leading-4 uppercase">
          {copy.sidebar.watchWords}
        </span>
      </div>

      <div className="mb-2.5 flex items-center gap-1.5">
        <Input
          className="text-field flex-1"
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void onAddKeyword();
            }
          }}
          placeholder={copy.sidebar.addKeywordPlaceholder}
          value={draft}
        />
        <Button onClick={onAddKeyword} size="icon" variant="secondary">
          <Plus size={14} strokeWidth={1.5} />
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {keywords.map((keyword) => (
          <Chip interactive key={keyword} onClick={() => void onRemoveKeyword(keyword)}>
            <span className="font-mono text-xs whitespace-nowrap">{keyword}</span>
            <XIcon className="text-content-subtle" size={10} strokeWidth={1.5} />
          </Chip>
        ))}
        {keywords.length === 0 ? (
          <span className="text-content-subtle text-note italic">{copy.sidebar.noKeywords}</span>
        ) : null}
      </div>
    </div>
  );
}
