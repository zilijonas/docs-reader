import { ArrowRight, Download, Trash2 } from 'lucide-react';

import { Button } from '../../components/ui';
import { copy } from '@/lib/copy';

export function SidebarActionRow({
  disabledExport,
  onExport,
  onReset,
}: {
  disabledExport: boolean;
  onExport: () => void;
  onReset: () => void | Promise<void>;
}) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <Button
        className="justify-between"
        onClick={() => void onReset()}
        size="lg"
        variant="secondary"
      >
        <span className="inline-flex items-center gap-2">
          <Trash2 size={16} strokeWidth={1.5} />
          {copy.sidebar.removeFile}
        </span>
      </Button>
      <Button
        className="justify-between"
        disabled={disabledExport}
        onClick={onExport}
        size="lg"
        variant="primary"
      >
        <span className="inline-flex items-center gap-2">
          <Download size={16} strokeWidth={1.5} />
          {copy.sidebar.export}
        </span>
        <ArrowRight size={13} strokeWidth={1.5} />
      </Button>
    </div>
  );
}
