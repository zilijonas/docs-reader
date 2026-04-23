import { Button, Dialog } from '../../../components/ui';
import { copy } from '../../../lib/copy';
import { useReviewContext } from '../context/ReviewContext';
import { useWorkflowContext } from '../context/WorkflowContext';

export function ConfirmAllExportDialog() {
  const { handleConfirmAllExport } = useReviewContext();
  const { closeConfirmAllExportModal, showConfirmAllExportModal } = useWorkflowContext();

  return (
    <Dialog onClose={closeConfirmAllExportModal} open={showConfirmAllExportModal}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-content-muted text-content leading-reading text-lg font-semibold text-pretty">
            {copy.confirmAllExport.title}
          </h2>
          <p className="text-content-muted text-sm leading-6">{copy.confirmAllExport.body}</p>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={closeConfirmAllExportModal} variant="secondary">
            {copy.confirmAllExport.cancel}
          </Button>
          <Button onClick={handleConfirmAllExport}>{copy.confirmAllExport.confirm}</Button>
        </div>
      </div>
    </Dialog>
  );
}
