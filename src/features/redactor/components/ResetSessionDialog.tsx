import { Button, Dialog } from '../../../components/ui';
import { copy } from '../../../lib/copy';
import { useReviewContext } from '../context/ReviewContext';
import { useWorkflowContext } from '../context/WorkflowContext';

export function ResetSessionDialog() {
  const { handleConfirmReset } = useReviewContext();
  const { closeResetConfirmModal, showResetConfirmModal } = useWorkflowContext();

  return (
    <Dialog onClose={closeResetConfirmModal} open={showResetConfirmModal}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-content-muted text-content leading-reading text-lg font-semibold text-pretty">
            {copy.resetSession.title}
          </h2>
          <p className="text-content-muted text-sm leading-6">{copy.resetSession.body}</p>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={closeResetConfirmModal} variant="secondary">
            {copy.resetSession.cancel}
          </Button>
          <Button onClick={handleConfirmReset} variant="danger">
            {copy.resetSession.confirm}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
