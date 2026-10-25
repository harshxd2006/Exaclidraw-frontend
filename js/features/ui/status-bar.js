// ============================================================================
// Status Bar UI Controller Module
// Controls the bottom-right auto-save persistence status and scene element metrics.
// Reference: packages/excalidraw/components/LayerUI.tsx in Excalidraw
// ============================================================================

import { getState, subscribe } from '../../core/state.js';
import { onSaveStatusChange } from '../storage/local-storage.js';

const ICONS = {
  saved: `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19 16.9A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"></path>
      <polyline points="9 11 12 14 22 4"></polyline>
    </svg>
  `.trim(),
  saving: `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="2" x2="12" y2="6"></line>
      <line x1="12" y1="18" x2="12" y2="22"></line>
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
      <line x1="2" y1="12" x2="6" y2="12"></line>
      <line x1="18" y1="12" x2="22" y2="12"></line>
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
    </svg>
  `.trim(),
  error: `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
  `.trim()
};

// Updates the save indicator text and icon
export function updateSaveStatus(status) {
  const saveGroup = document.getElementById('status-save-group');
  const saveIcon = document.getElementById('status-save-icon');
  const saveText = document.getElementById('status-save-text');

  if (!saveGroup || !saveIcon || !saveText) return;

  saveGroup.classList.remove('status-saving', 'status-error');

  if (status === 'saving') {
    saveGroup.classList.add('status-saving');
    saveIcon.innerHTML = ICONS.saving;
    saveText.textContent = 'Saving...';
  } else if (status === 'saved') {
    saveIcon.innerHTML = ICONS.saved;
    saveText.textContent = 'Saved';
  } else if (status === 'error') {
    saveGroup.classList.add('status-error');
    saveIcon.innerHTML = ICONS.error;
    saveText.textContent = 'Save failed';
  } else if (status === 'idle') {
    saveIcon.innerHTML = ICONS.saved;
    saveText.textContent = 'Saved';
  }
}

// Updates element count and selected count metrics in the status bar
export function updateMetrics(state) {
  const metricsText = document.getElementById('status-metrics-text');
  if (!metricsText || !state) return;

  const validElements = state.elements.filter(el => !el.isDeleted);
  const totalCount = validElements.length;
  const selectedCount = Object.keys(state.selectedElementIds || {}).length;

  if (selectedCount > 0) {
    metricsText.textContent = `${selectedCount} of ${totalCount} selected`;
  } else {
    metricsText.textContent = `${totalCount} ${totalCount === 1 ? 'element' : 'elements'}`;
  }
}

let isInitialized = false;

// Initializes DOM bindings and state subscriptions for the Status Bar
export function initStatusBar() {
  if (isInitialized) return;

  // Listen to LocalStorage save status events
  onSaveStatusChange(updateSaveStatus);

  // Subscribe to central state to update element metrics
  subscribe(updateMetrics);

  // Initial populate with active state
  updateMetrics(getState());
  updateSaveStatus('saved');

  isInitialized = true;
  console.log('[StatusBar] Auto-save indicator and metrics initialized.');
}
