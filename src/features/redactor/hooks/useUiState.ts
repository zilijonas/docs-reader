import { useReducer } from 'react';

import { DEFAULT_OCR_LANGUAGES } from '../../../lib/constants';
import { REDACTOR_UI } from '../config';

interface WorkflowUiState {
  appHeaderHeight: number;
  isDesktopSidebarOpen: boolean;
  isMobileViewport: boolean;
  isOcrLanguageModalOpen: boolean;
  isSidebarOpen: boolean;
  keywordDraft: string;
  selectedOcrLanguages: string[];
  showConfirmAllExportModal: boolean;
  showResetConfirmModal: boolean;
  viewerContentWidth: number;
  zoom: number;
}

type WorkflowUiAction =
  | { type: 'close-confirm-all-export-modal' }
  | { type: 'close-ocr-language-modal' }
  | { type: 'close-reset-confirm-modal' }
  | { type: 'close-review-panel' }
  | { type: 'open-confirm-all-export-modal' }
  | { type: 'open-ocr-language-modal' }
  | { type: 'open-reset-confirm-modal' }
  | { type: 'reset-workflow-ui' }
  | { type: 'set-app-header-height'; value: number }
  | { type: 'set-desktop-sidebar-open'; value: boolean }
  | { type: 'set-keyword-draft'; value: string }
  | { type: 'set-mobile-viewport'; value: boolean }
  | { type: 'set-ocr-language-modal-open'; value: boolean }
  | { type: 'set-review-panel-open'; value: boolean }
  | { type: 'set-selected-ocr-languages'; value: string[] }
  | { type: 'set-viewer-content-width'; value: number }
  | { type: 'set-zoom'; value: number }
  | { type: 'toggle-review-panel' };

const createInitialState = (): WorkflowUiState => ({
  appHeaderHeight: 57,
  isDesktopSidebarOpen: true,
  isMobileViewport: false,
  isOcrLanguageModalOpen: false,
  isSidebarOpen: false,
  keywordDraft: '',
  selectedOcrLanguages: [...DEFAULT_OCR_LANGUAGES],
  showConfirmAllExportModal: false,
  showResetConfirmModal: false,
  viewerContentWidth: REDACTOR_UI.viewerBaseWidth,
  zoom: REDACTOR_UI.defaultZoom,
});

const workflowUiReducer = (state: WorkflowUiState, action: WorkflowUiAction): WorkflowUiState => {
  switch (action.type) {
    case 'close-confirm-all-export-modal':
      return { ...state, showConfirmAllExportModal: false };
    case 'close-ocr-language-modal':
      return { ...state, isOcrLanguageModalOpen: false };
    case 'close-reset-confirm-modal':
      return { ...state, showResetConfirmModal: false };
    case 'close-review-panel':
      return { ...state, isDesktopSidebarOpen: false, isSidebarOpen: false };
    case 'open-confirm-all-export-modal':
      return { ...state, showConfirmAllExportModal: true };
    case 'open-ocr-language-modal':
      return { ...state, isOcrLanguageModalOpen: true };
    case 'open-reset-confirm-modal':
      return { ...state, showResetConfirmModal: true };
    case 'reset-workflow-ui':
      return {
        ...state,
        isDesktopSidebarOpen: false,
        isOcrLanguageModalOpen: false,
        isSidebarOpen: false,
        keywordDraft: '',
        selectedOcrLanguages: [...DEFAULT_OCR_LANGUAGES],
        showConfirmAllExportModal: false,
        showResetConfirmModal: false,
        zoom: REDACTOR_UI.defaultZoom,
      };
    case 'set-app-header-height':
      return { ...state, appHeaderHeight: action.value };
    case 'set-desktop-sidebar-open':
      return { ...state, isDesktopSidebarOpen: action.value };
    case 'set-keyword-draft':
      return { ...state, keywordDraft: action.value };
    case 'set-mobile-viewport':
      return { ...state, isMobileViewport: action.value };
    case 'set-ocr-language-modal-open':
      return { ...state, isOcrLanguageModalOpen: action.value };
    case 'set-review-panel-open':
      return { ...state, isSidebarOpen: action.value };
    case 'set-selected-ocr-languages':
      return { ...state, selectedOcrLanguages: action.value };
    case 'set-viewer-content-width':
      return { ...state, viewerContentWidth: action.value };
    case 'set-zoom':
      return { ...state, zoom: action.value };
    case 'toggle-review-panel':
      return {
        ...state,
        isDesktopSidebarOpen: !state.isDesktopSidebarOpen,
        isSidebarOpen: !state.isSidebarOpen,
      };
    default:
      return state;
  }
};

export function useUiState() {
  const [state, dispatch] = useReducer(workflowUiReducer, undefined, createInitialState);

  return {
    state,
    closeConfirmAllExportModal: () => dispatch({ type: 'close-confirm-all-export-modal' }),
    closeOcrLanguageModal: () => dispatch({ type: 'close-ocr-language-modal' }),
    closeResetConfirmModal: () => dispatch({ type: 'close-reset-confirm-modal' }),
    closeReviewPanel: () => dispatch({ type: 'close-review-panel' }),
    openConfirmAllExportModal: () => dispatch({ type: 'open-confirm-all-export-modal' }),
    openOcrLanguageModal: () => dispatch({ type: 'open-ocr-language-modal' }),
    openResetConfirmModal: () => dispatch({ type: 'open-reset-confirm-modal' }),
    resetWorkflowUi: () => dispatch({ type: 'reset-workflow-ui' }),
    setAppHeaderHeight: (value: number) => dispatch({ type: 'set-app-header-height', value }),
    setDesktopSidebarOpen: (value: boolean) => dispatch({ type: 'set-desktop-sidebar-open', value }),
    setKeywordDraft: (value: string) => dispatch({ type: 'set-keyword-draft', value }),
    setMobileViewport: (value: boolean) => dispatch({ type: 'set-mobile-viewport', value }),
    setOcrLanguageModalOpen: (value: boolean) => dispatch({ type: 'set-ocr-language-modal-open', value }),
    setReviewPanelOpen: (value: boolean) => dispatch({ type: 'set-review-panel-open', value }),
    setSelectedOcrLanguages: (value: string[]) => dispatch({ type: 'set-selected-ocr-languages', value }),
    setViewerContentWidth: (value: number) => dispatch({ type: 'set-viewer-content-width', value }),
    setZoom: (value: number) => dispatch({ type: 'set-zoom', value }),
    toggleReviewPanel: () => dispatch({ type: 'toggle-review-panel' }),
  };
}

export type { WorkflowUiState };
