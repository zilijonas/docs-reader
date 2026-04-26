/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RefObject } from 'react';

import { OcrLanguageDialog } from './OcrLanguageDialog';
import type { WorkflowContextValue } from '../context/WorkflowContext';
import { useWorkflowContext } from '../context/WorkflowContext';

vi.mock('../context/WorkflowContext', () => ({
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
    isOcrLanguageModalOpen: true,
    isProcessing: false,
    isSidebarOpen: false,
    keywordDraft: '',
    ocrLanguageDetection: {
      method: 'bootstrap-ocr',
      languages: ['eng', 'lit'],
      confidence: 'medium',
      detectedLanguage: 'lit',
      samplePageIndexes: [0],
    },
    openConfirmAllExportModal: vi.fn(),
    openResetConfirmModal: vi.fn(),
    progress: null,
    resetSession: vi.fn(),
    scrollToPage: vi.fn(),
    scrollToReviewItem: vi.fn(),
    selectedOcrLanguages: ['eng', 'lit'],
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
    workflowPhase: 'awaitingOcr',
    zoom: 1,
    ...overrides,
  };
}

function renderDialog(overrides: Partial<WorkflowContextValue> = {}) {
  vi.mocked(useWorkflowContext).mockReturnValue(createWorkflowContext(overrides));
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);

  act(() => {
    root.render(<OcrLanguageDialog />);
  });

  return { root };
}

describe('OcrLanguageDialog', () => {
  let root: Root | null = null;

  beforeEach(() => {
    document.body.innerHTML = '';
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
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

  it('shows detected language metadata and selected override chips', () => {
    const rendered = renderDialog();
    root = rendered.root;

    expect(document.body.textContent).toContain('We detected a language for OCR');
    expect(document.body.textContent).toContain('Medium confidence');
    expect(document.body.textContent).toContain('Lithuanian detected');
    expect(document.body.textContent).toContain(
      'Detected from page 1 using local English bootstrap OCR.',
    );
  });

  it('falls back to manual copy when confidence is low', () => {
    const rendered = renderDialog({
      ocrLanguageDetection: {
        method: 'bootstrap-ocr',
        languages: ['eng'],
        confidence: 'low',
        detectedLanguage: 'eng',
        samplePageIndexes: [0],
      },
      selectedOcrLanguages: ['eng'],
    });
    root = rendered.root;

    expect(document.body.textContent).toContain('Needs review');
    expect(document.body.textContent).toContain('English selected');
  });

  it('lets the user override preselected languages', () => {
    const setSelectedOcrLanguages = vi.fn();
    const rendered = renderDialog({ setSelectedOcrLanguages });
    root = rendered.root;

    const polishChip = [...document.body.querySelectorAll('button')].find(
      (button) => button.textContent === 'Polish',
    );
    if (!(polishChip instanceof HTMLButtonElement)) {
      throw new Error('Polish language chip did not render.');
    }

    act(() => {
      polishChip.click();
    });

    expect(setSelectedOcrLanguages).toHaveBeenCalledWith(['eng', 'lit', 'pol']);
  });
});
