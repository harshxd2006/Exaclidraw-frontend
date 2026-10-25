// ============================================================================
// Zoom, History & Grid Controls UI Controller
// Manages the floating bottom-left dock: Undo, Redo, Zoom, and Grid Toggle.
// Reference: packages/excalidraw/components/LayerUI.tsx in Excalidraw
// ============================================================================

import { getState, subscribe, undo, redo, toggleGrid } from '../../core/state.js';
import { zoomIn, zoomOut, resetZoom } from '../viewport/zoom-pan.js';
import { updateHistoryUI } from '../history/history-manager.js';

// Syncs the zoom percentage badge and grid toggle state with application state.
export function syncZoomControlsUI(state) {
  const label = document.getElementById('zoom-value-label');
  if (label && state && state.viewport) {
    const percentage = Math.round(state.viewport.zoom * 100);
    label.textContent = `${percentage}%`;
  }

  const gridBtn = document.getElementById('btn-grid');
  if (gridBtn && state) {
    gridBtn.classList.toggle('active', Boolean(state.showGrid));
    gridBtn.setAttribute('aria-pressed', Boolean(state.showGrid));
  }

  updateHistoryUI();
}

let isInitialized = false;

// Binds event listeners to the zoom, history, and grid control buttons.
export function initZoomControls() {
  if (isInitialized) {
    syncZoomControlsUI(getState());
    return;
  }

  // 1. History buttons
  const undoBtn = document.getElementById('btn-undo');
  const redoBtn = document.getElementById('btn-redo');

  if (undoBtn) {
    undoBtn.addEventListener('click', () => {
      undo();
    });
  }

  if (redoBtn) {
    redoBtn.addEventListener('click', () => {
      redo();
    });
  }

  // 2. Zoom buttons
  const zoomOutBtn = document.getElementById('zoom-out-btn');
  const zoomInBtn = document.getElementById('zoom-in-btn');
  const zoomResetBtn = document.getElementById('zoom-reset-btn');

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      zoomOut();
    });
  }

  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      zoomIn();
    });
  }

  if (zoomResetBtn) {
    zoomResetBtn.addEventListener('click', () => {
      resetZoom();
    });
  }

  // 3. Grid Toggle button
  const gridBtn = document.getElementById('btn-grid');
  if (gridBtn) {
    gridBtn.addEventListener('click', () => {
      toggleGrid();
    });
  }

  // Subscribe to state updates to reflect zoom, grid, and history changes.
  subscribe(state => {
    syncZoomControlsUI(state);
  });

  // Initial sync
  syncZoomControlsUI(getState());
  isInitialized = true;
  console.log('[ZoomControls] Successfully initialized with History & Grid controls.');
}
