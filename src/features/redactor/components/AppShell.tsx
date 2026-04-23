import { AppShellContent } from './AppShellContent';
import { ReviewProvider } from '../context/ReviewContext';
import { WorkflowProvider } from '../context/WorkflowContext';

export function AppShell() {
  return (
    <WorkflowProvider>
      <ReviewProvider>
        <AppShellContent />
      </ReviewProvider>
    </WorkflowProvider>
  );
}
