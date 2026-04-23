/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RefObject } from 'react';

import { AppHeader } from './AppHeader';
import type { ReviewContextValue } from '../context/ReviewContext';
import { useReviewContext } from '../context/ReviewContext';
import type { WorkflowContextValue } from '../context/WorkflowContext';
import { useWorkflowContext } from '../context/WorkflowContext';

vi.mock('../context/WorkflowContext', () => ({
  useWorkflowContext: vi.fn(),
}));

vi.mock('../context/ReviewContext', () => ({
  useReviewContext: vi.fn(),
}));

function createWorkflowContext(): WorkflowContextValue {
  return {
    appHeaderHeight: 0,
    appHeaderRef: { current: null },
    appShellRef: { current: null },
    closeConfirmAllExportModal: vi.fn(),
    closeOcrLanguageModal: vi.fn(),
    closeResetConfirmModal: vi.fn(),
    closeReviewPanel: vi.fn(),
    ensurePreview: vi.fn(),
    error: null,
    fileInputRef: { current: null } as RefObject<HTMLInputElement | null>,
    handleContinueOcr: vi.fn(),
    handleDrop: vi.fn(),
    handleExport: vi.fn(),
    handleFileChange: vi.fn(),
    handleKeywordRemove: vi.fn(),
    handleKeywordSubmit: vi.fn(),
    isDesktopSidebarOpen: false,
    isMobileViewport: false,
    isOcrLanguageModalOpen: false,
    isProcessing: false,
    isSidebarOpen: false,
    keywordDraft: '',
    openConfirmAllExportModal: vi.fn(),
    openResetConfirmModal: vi.fn(),
    progress: null,
    resetSession: vi.fn(),
    scrollToPage: vi.fn(),
    scrollToReviewItem: vi.fn(),
    selectedOcrLanguages: ['eng'],
    setDesktopSidebarOpen: vi.fn(),
    setKeywordDraft: vi.fn(),
    setReviewPanelOpen: vi.fn(),
    setSelectedOcrLanguages: vi.fn(),
    setZoom: vi.fn(),
    showConfirmAllExportModal: false,
    showResetConfirmModal: false,
    spans: [],
    toggleReviewPanel: vi.fn(),
    viewerColumnRef: { current: null },
    viewerContentWidth: 0,
    workflowPhase: 'idle',
    zoom: 1,
  };
}

function createReviewContext(): ReviewContextValue {
  return {
    activePage: 0,
    addManualRedaction: vi.fn(),
    canRedo: false,
    clearPendingManualRedactions: vi.fn(),
    confirmAll: vi.fn(),
    confirmedCount: 0,
    customKeywords: [],
    deferredReviewItems: [],
    detections: [],
    filters: { sources: [], statuses: [], types: [] },
    handleConfirmAllExport: vi.fn(),
    handleConfirmReset: vi.fn(),
    handlePrimaryExport: vi.fn(),
    handleResetRequest: vi.fn(),
    hasViewer: false,
    manualRedactions: [],
    pages: [],
    previews: {},
    redoLastChange: vi.fn(),
    removeManualRedaction: vi.fn(),
    revertAll: vi.fn(),
    reviewCounts: { confirmedCount: 0, reviewCount: 0, unconfirmedCount: 0 },
    setActivePage: vi.fn(),
    setDetectionStatus: vi.fn(),
    setFilters: vi.fn(),
    setManualStatus: vi.fn(),
    setSourceDocumentName: vi.fn(),
    setToolMode: vi.fn(),
    sourceDocument: null,
    spansByPage: new Map(),
    totalReviewItemCount: 0,
    toolMode: null,
    toggleDetectionStatus: vi.fn(),
    unconfirmedCount: 0,
    updateManualRedaction: vi.fn(),
    warnings: [],
  };
}

describe('AppHeader', () => {
  let root: Root | null = null;

  beforeEach(() => {
    document.body.innerHTML = '';
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.mocked(useWorkflowContext).mockReturnValue(createWorkflowContext());
    vi.mocked(useReviewContext).mockReturnValue(createReviewContext());
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('shows the privacy pill before a document is loaded', () => {
    const container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);

    act(() => {
      root?.render(<AppHeader />);
    });

    expect(document.body.textContent).toContain('Private by design');
  });
});
