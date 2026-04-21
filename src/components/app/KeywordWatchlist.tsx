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
    <div className="border-b border-border px-5 py-ui-section">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="type-data">{copy.sidebar.watchWords}</span>
      </div>

      <div className="mb-2.5 flex gap-1.5 items-center">
        <Input
          className="ui-text-field flex-1"
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
            <span className="whitespace-nowrap font-mono text-xs">{keyword}</span>
            <XIcon className="text-content-subtle" size={10} strokeWidth={1.5} />
          </Chip>
        ))}
        {keywords.length === 0 ? (
          <span className="ui-text-note italic text-content-subtle">{copy.sidebar.noKeywords}</span>
        ) : null}
      </div>
    </div>
  );
}
