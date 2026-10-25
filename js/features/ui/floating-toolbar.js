// ============================================================================
// Floating Action Toolbar — Stage 19
// A compact floating bar that appears above selected elements with quick actions:
// Copy, Cut, Duplicate, Group, Ungroup, Lock/Unlock, Delete.
// ============================================================================

import {
  getState,
  subscribe,
  copySelected,
  cutSelected,
  duplicateSelectedElements,
  deleteSelectedElements,
  groupSelectedElements,
  ungroupSelectedElements,
  toggleLockElement,
  lockSelectedElements,
  alignSelectedLeft,
  alignSelectedRight,
  alignSelectedCenterHorizontal,
  alignSelectedTop,
  alignSelectedBottom,
  alignSelectedCenterVertical,
  distributeSelectedHorizontal,
  distributeSelectedVertical
} from '../../core/state.js';
import { canGroupSelection, canUngroupSelection } from '../groups/group-manager.js';
import { canvasElements } from '../../core/viewport.js';

let toolbarEl = null;
let isInitialized = false;

/** Creates the floating toolbar DOM element and appends it to the canvas container. */
function createToolbar() {
  toolbarEl = document.createElement('div');
  toolbarEl.id = 'floating-action-toolbar';
  toolbarEl.setAttribute('role', 'toolbar');
  toolbarEl.setAttribute('aria-label', 'Element actions');
  toolbarEl.innerHTML = `
    <button class="fat-btn" id="fat-copy"      title="Copy (Ctrl+C)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>
    </button>
    <button class="fat-btn" id="fat-cut"       title="Cut (Ctrl+X)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/>
      </svg>
    </button>
    <button class="fat-btn" id="fat-duplicate" title="Duplicate (Ctrl+D)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="8" y="8" width="13" height="13" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
      </svg>
    </button>
    <div class="fat-divider"></div>
    <!-- Alignment buttons (shown only when 2+ elements selected) -->
    <button class="fat-btn fat-align-btn" id="fat-align-left"    title="Align left">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="3" y1="3" x2="3" y2="21"/><rect x="5" y="7" width="8" height="4" rx="1"/><rect x="5" y="13" width="14" height="4" rx="1"/>
      </svg>
    </button>
    <button class="fat-btn fat-align-btn" id="fat-align-center-h" title="Center horizontally">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="3" x2="12" y2="21"/><rect x="4" y="7" width="8" height="4" rx="1"/><rect x="2" y="13" width="14" height="4" rx="1"/>
      </svg>
    </button>
    <button class="fat-btn fat-align-btn" id="fat-align-right"   title="Align right">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="21" y1="3" x2="21" y2="21"/><rect x="11" y="7" width="8" height="4" rx="1"/><rect x="5" y="13" width="14" height="4" rx="1"/>
      </svg>
    </button>
    <button class="fat-btn fat-align-btn" id="fat-align-top"    title="Align top">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="3" y1="3" x2="21" y2="3"/><rect x="7" y="5" width="4" height="8" rx="1"/><rect x="13" y="5" width="4" height="14" rx="1"/>
      </svg>
    </button>
    <button class="fat-btn fat-align-btn" id="fat-align-center-v" title="Center vertically">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="3" y1="12" x2="21" y2="12"/><rect x="7" y="4" width="4" height="8" rx="1"/><rect x="13" y="2" width="4" height="14" rx="1"/>
      </svg>
    </button>
    <button class="fat-btn fat-align-btn" id="fat-align-bottom"  title="Align bottom">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="3" y1="21" x2="21" y2="21"/><rect x="7" y="11" width="4" height="8" rx="1"/><rect x="13" y="5" width="4" height="14" rx="1"/>
      </svg>
    </button>
    <div class="fat-divider fat-align-btn"></div>
    <button class="fat-btn" id="fat-group"     title="Group (Ctrl+G)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="7" width="7" height="7" rx="1"/><rect x="15" y="7" width="7" height="7" rx="1"/><path d="M7 10.5H17M12 7V3M12 21v-4"/>
      </svg>
    </button>
    <button class="fat-btn" id="fat-ungroup"   title="Ungroup (Ctrl+Shift+G)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="7" width="7" height="7" rx="1"/><rect x="15" y="7" width="7" height="7" rx="1"/><line x1="1" y1="1" x2="23" y2="23"/>
      </svg>
    </button>
    <div class="fat-divider"></div>
    <button class="fat-btn" id="fat-lock"      title="Lock (Ctrl+Shift+L)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    </button>
    <div class="fat-divider"></div>
    <button class="fat-btn fat-btn-danger" id="fat-delete" title="Delete (Del)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      </svg>
    </button>
  `;

  // Bind actions
  toolbarEl.querySelector('#fat-copy').addEventListener('click',      () => copySelected());
  toolbarEl.querySelector('#fat-cut').addEventListener('click',       () => cutSelected());
  toolbarEl.querySelector('#fat-duplicate').addEventListener('click', () => duplicateSelectedElements());
  toolbarEl.querySelector('#fat-group').addEventListener('click',     () => groupSelectedElements());
  toolbarEl.querySelector('#fat-ungroup').addEventListener('click',   () => ungroupSelectedElements());
  toolbarEl.querySelector('#fat-delete').addEventListener('click',    () => deleteSelectedElements());
  // Alignment
  toolbarEl.querySelector('#fat-align-left').addEventListener('click',      () => alignSelectedLeft());
  toolbarEl.querySelector('#fat-align-center-h').addEventListener('click',  () => alignSelectedCenterHorizontal());
  toolbarEl.querySelector('#fat-align-right').addEventListener('click',     () => alignSelectedRight());
  toolbarEl.querySelector('#fat-align-top').addEventListener('click',       () => alignSelectedTop());
  toolbarEl.querySelector('#fat-align-center-v').addEventListener('click',  () => alignSelectedCenterVertical());
  toolbarEl.querySelector('#fat-align-bottom').addEventListener('click',    () => alignSelectedBottom());
  toolbarEl.querySelector('#fat-lock').addEventListener('click', () => {
    const s = getState();
    const ids = Object.keys(s.selectedElementIds || {});
    if (ids.length === 1) {
      toggleLockElement(ids[0]);
    } else if (ids.length > 1) {
      lockSelectedElements();
    }
  });

  // Don't steal pointer events that would deselect elements
  toolbarEl.addEventListener('pointerdown', e => e.stopPropagation());

  const container = canvasElements.container;
  if (container) {
    container.appendChild(toolbarEl);
  }
}

/**
 * Repositions and updates the floating toolbar based on current state.
 * Called on every state change via subscribe().
 */
function syncToolbar(state) {
  if (!toolbarEl) return;

  const selectedIds = Object.keys(state.selectedElementIds || {});

  if (selectedIds.length === 0) {
    toolbarEl.style.display = 'none';
    return;
  }

  // Compute the bounding box of all selected elements in scene coords.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of state.elements) {
    if (!state.selectedElementIds[el.id] || el.isDeleted) continue;
    const ex1 = Math.min(el.x, el.x + el.width);
    const ey1 = Math.min(el.y, el.y + el.height);
    const ex2 = Math.max(el.x, el.x + el.width);
    const ey2 = Math.max(el.y, el.y + el.height);
    minX = Math.min(minX, ex1);
    minY = Math.min(minY, ey1);
    maxX = Math.max(maxX, ex2);
    maxY = Math.max(maxY, ey2);
  }

  if (!isFinite(minX)) {
    toolbarEl.style.display = 'none';
    return;
  }

  // Convert selection bounding box to screen coordinates.
  const { zoom, scrollX, scrollY } = state.viewport;
  const container = canvasElements.container;
  if (!container) return;

  const screenMinX = (minX + scrollX) * zoom;
  const screenMinY = (minY + scrollY) * zoom;
  const screenMaxX = (maxX + scrollX) * zoom;

  const toolbarW = toolbarEl.offsetWidth || 280;
  const toolbarH = toolbarEl.offsetHeight || 38;
  const GAP = 10;  // px gap between selection top and toolbar bottom

  // Center toolbar over selection; clamp to container bounds.
  const containerW = container.offsetWidth;
  let left = screenMinX + (screenMaxX - screenMinX) / 2 - toolbarW / 2;
  left = Math.max(8, Math.min(left, containerW - toolbarW - 8));

  let top = screenMinY - toolbarH - GAP;
  if (top < 8) {
    // Not enough space above — show below the selection instead.
    const screenMaxY = (maxY + scrollY) * zoom;
    top = screenMaxY + GAP;
  }

  toolbarEl.style.left = `${left}px`;
  toolbarEl.style.top  = `${top}px`;
  toolbarEl.style.display = 'flex';

  // Show/hide alignment buttons based on selection count
  const showAlign = selectedIds.length >= 2;
  toolbarEl.querySelectorAll('.fat-align-btn').forEach(el => {
    el.style.display = showAlign ? '' : 'none';
  });

  // Update enabled state of buttons.
  const canGroup   = canGroupSelection(state);
  const canUngroup = canUngroupSelection(state);
  const singleEl   = selectedIds.length === 1
    ? state.elements.find(e => e.id === selectedIds[0])
    : null;
  const isLocked   = singleEl ? singleEl.isLocked : false;

  const setBtn = (id, enabled) => {
    const btn = toolbarEl.querySelector(id);
    if (!btn) return;
    btn.disabled = !enabled;
    btn.style.opacity = enabled ? '' : '0.3';
    btn.style.pointerEvents = enabled ? '' : 'none';
  };

  setBtn('#fat-group',   canGroup);
  setBtn('#fat-ungroup', canUngroup);

  // Update lock button icon and title based on current lock state.
  const lockBtn = toolbarEl.querySelector('#fat-lock');
  if (lockBtn) {
    lockBtn.title = isLocked ? 'Unlock (Ctrl+Shift+L)' : 'Lock (Ctrl+Shift+L)';
    lockBtn.style.color = isLocked ? 'var(--color-primary)' : '';
  }
}

/** Initializes the floating toolbar — call once after DOM is ready. */
export function initFloatingToolbar() {
  if (isInitialized) return;
  isInitialized = true;

  createToolbar();
  subscribe(state => syncToolbar(state));
  syncToolbar(getState());

  console.log('[FloatingToolbar] Initialized.');
}
