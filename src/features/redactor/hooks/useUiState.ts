import { useMemo, useReducer } from 'react';

import { DEFAULT_OCR_LANGUAGES } from '../../../lib/app-config';
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
      if (!state.showConfirmAllExportModal) {
        return state;
      }
      return { ...state, showConfirmAllExportModal: false };
    case 'close-ocr-language-modal':
      if (!state.isOcrLanguageModalOpen) {
        return state;
      }
      return { ...state, isOcrLanguageModalOpen: false };
    case 'close-reset-confirm-modal':
      if (!state.showResetConfirmModal) {
        return state;
      }
      return { ...state, showResetConfirmModal: false };
    case 'close-review-panel':
      if (!state.isDesktopSidebarOpen && !state.isSidebarOpen) {
        return state;
      }
      return { ...state, isDesktopSidebarOpen: false, isSidebarOpen: false };
    case 'open-confirm-all-export-modal':
      if (state.showConfirmAllExportModal) {
        return state;
      }
      return { ...state, showConfirmAllExportModal: true };
    case 'open-ocr-language-modal':
      if (state.isOcrLanguageModalOpen) {
        return state;
      }
      return { ...state, isOcrLanguageModalOpen: true };
    case 'open-reset-confirm-modal':
      if (state.showResetConfirmModal) {
        return state;
      }
      return { ...state, showResetConfirmModal: true };
    case 'reset-workflow-ui':
      if (
        !state.isDesktopSidebarOpen &&
        !state.isOcrLanguageModalOpen &&
        !state.isSidebarOpen &&
        state.keywordDraft === '' &&
        state.selectedOcrLanguages.join(',') === DEFAULT_OCR_LANGUAGES.join(',') &&
        !state.showConfirmAllExportModal &&
        !state.showResetConfirmModal &&
        state.zoom === REDACTOR_UI.defaultZoom
      ) {
        return state;
      }
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
      if (state.appHeaderHeight === action.value) {
        return state;
      }
      return { ...state, appHeaderHeight: action.value };
    case 'set-desktop-sidebar-open':
      if (state.isDesktopSidebarOpen === action.value) {
        return state;
      }
      return { ...state, isDesktopSidebarOpen: action.value };
    case 'set-keyword-draft':
      if (state.keywordDraft === action.value) {
        return state;
      }
      return { ...state, keywordDraft: action.value };
    case 'set-mobile-viewport':
      if (state.isMobileViewport === action.value) {
        return state;
      }
      return { ...state, isMobileViewport: action.value };
    case 'set-ocr-language-modal-open':
      if (state.isOcrLanguageModalOpen === action.value) {
        return state;
      }
      return { ...state, isOcrLanguageModalOpen: action.value };
    case 'set-review-panel-open':
      if (state.isSidebarOpen === action.value) {
        return state;
      }
      return { ...state, isSidebarOpen: action.value };
    case 'set-selected-ocr-languages':
      if (state.selectedOcrLanguages.join(',') === action.value.join(',')) {
        return state;
      }
      return { ...state, selectedOcrLanguages: action.value };
    case 'set-viewer-content-width':
      if (state.viewerContentWidth === action.value) {
        return state;
      }
      return { ...state, viewerContentWidth: action.value };
    case 'set-zoom':
      if (state.zoom === action.value) {
        return state;
      }
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

  const actions = useMemo(
    () => ({
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
    }),
    [],
  );

  return {
    state,
    ...actions,
  };
}

export type { WorkflowUiState };
