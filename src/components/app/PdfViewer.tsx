import { getPageAnchorId } from '../../features/redactor';
import { useReviewContext } from '../../features/redactor/context/ReviewContext';
import { useWorkflowContext } from '../../features/redactor/context/WorkflowContext';
import { PagePreviewCard } from './PagePreviewCard';

export function PdfViewer() {
  const { ensurePreview, isMobileViewport, viewerContentWidth, zoom } = useWorkflowContext();
  const {
    activePage,
    addManualRedaction,
    clearPendingManualRedactions,
    detections,
    manualRedactions,
    pages,
    previews,
    removeManualRedaction,
    setActivePage,
    setManualStatus,
    spansByPage,
    toggleDetectionStatus,
    toolMode,
    updateManualRedaction,
  } = useReviewContext();
  return (
    <div className="pdf-viewer flex flex-col gap-7">
      {pages.map((page) => (
        <PagePreviewCard
          active={activePage === page.pageIndex}
          detections={detections.filter((detection) => detection.pageIndex === page.pageIndex)}
          toolMode={toolMode}
          id={getPageAnchorId(page.pageIndex)}
          isMobileViewport={isMobileViewport}
          key={page.pageIndex}
          manualRedactions={manualRedactions.filter((manualRedaction) => manualRedaction.pageIndex === page.pageIndex)}
          onActivate={() => setActivePage(page.pageIndex)}
          onCreateManual={(payload) => addManualRedaction({ pageIndex: page.pageIndex, ...payload })}
          onDismissPendingManuals={clearPendingManualRedactions}
          onEnsurePreview={() => ensurePreview(page.pageIndex)}
          onRemoveManual={removeManualRedaction}
          onSetManualStatus={setManualStatus}
          onToggleDetection={toggleDetectionStatus}
          onUpdateManual={updateManualRedaction}
          page={page}
          preview={previews[page.pageIndex]}
          spans={spansByPage.get(page.pageIndex) ?? []}
          totalPages={pages.length}
          viewerContentWidth={viewerContentWidth}
          zoom={zoom}
        />
      ))}

      <div className="mt-2 text-center">
        <span className="ui-text-label font-mono tracking-ui-data text-content-subtle">
          - end of document -
        </span>
      </div>
    </div>
  );
}
