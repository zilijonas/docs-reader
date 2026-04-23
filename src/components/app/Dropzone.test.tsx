/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RefObject } from 'react';

import { Dropzone } from './Dropzone';
import type { WorkflowContextValue } from '../../features/redactor/context/WorkflowContext';
import { useWorkflowContext } from '../../features/redactor/context/WorkflowContext';

vi.mock('../../features/redactor/context/WorkflowContext', () => ({
  useWorkflowContext: vi.fn(),
}));

function createWorkflowContext(
  overrides: Partial<WorkflowContextValue> = {},
): WorkflowContextValue {
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
    ...overrides,
  };
}

function renderDropzone(overrides: Partial<WorkflowContextValue> = {}) {
  vi.mocked(useWorkflowContext).mockReturnValue(createWorkflowContext(overrides));
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);

  act(() => {
    root.render(<Dropzone />);
  });

  return { container, root };
}

describe('Dropzone', () => {
  let root: Root | null = null;

  beforeEach(() => {
    document.body.innerHTML = '';
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation(() => ({
        addEventListener: vi.fn(),
        matches: false,
        removeEventListener: vi.fn(),
      })),
    );
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

  it('renders only the upload card before upload', () => {
    const rendered = renderDropzone();
    root = rendered.root;

    expect(document.body.textContent).not.toContain('Processing on your device');
    expect(document.body.textContent).not.toContain('Your PDF is private and secure.');
    expect(document.body.textContent).toContain('Drop your PDF here');
    expect(document.body.textContent).toContain('100% Private');
    expect(document.body.textContent).toContain('Fast & Local');
    expect(document.body.textContent).toContain('No Sign Up');
  });

  it('changes upload copy during drag-over', () => {
    const rendered = renderDropzone();
    root = rendered.root;

    const dropTarget = rendered.container.querySelector('[role="button"]');
    if (!(dropTarget instanceof HTMLDivElement)) {
      throw new Error('Drop target did not render.');
    }

    act(() => {
      dropTarget.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
    });

    expect(document.body.textContent).toContain('Drop to start processing locally');
  });

  it('shows only the processing panel while processing', () => {
    const rendered = renderDropzone({
      isProcessing: true,
      progress: {
        message: 'Opening document locally',
        phase: 'loading',
        progress: 0.24,
      },
    });
    root = rendered.root;

    expect(document.body.textContent).toContain('Preparing your PDF locally');
    expect(document.body.textContent).toContain('Processing on your device');
    expect(document.body.textContent).toContain('Your PDF is private and secure.');
    expect(document.body.textContent).toContain('Opening document locally');
    expect(document.body.textContent).toContain('24%');
    expect(document.body.textContent).not.toContain('Drop your PDF here');
  });
});
