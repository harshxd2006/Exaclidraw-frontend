// ============================================================================
// Context Menu UI Controller Module
// Controls the right-click context menu for clipboard, layer ordering, and element actions.
// Reference: packages/excalidraw/components/ContextMenu.tsx in Excalidraw
// ============================================================================

import {
  getState,
  sendBackward,
  bringForward,
  sendToBack,
  bringToFront,
  duplicateSelectedElements,
  deleteSelectedElements,
  copySelected,
  cutSelected,
  pasteSelected,
  hasClipboardData,
  toggleGrid,
  groupSelectedElements,
  ungroupSelectedElements,
  toggleLockElement
} from '../../core/state.js';
import { canGroupSelection, canUngroupSelection } from '../groups/group-manager.js';

let isMenuOpen = false;
let lastTargetScenePos = null;
let lastLockedHitId = null;  // ID of a locked element that was right-clicked directly

// Shows the context menu at the given client coordinates, clamped to screen bounds.
export function showContextMenu(clientX, clientY, targetScenePos = null, lockedElementId = null) {
  const container = document.getElementById('context-menu-container');
  const menu = document.getElementById('canvas-context-menu');
  if (!container || !menu) {
    return;
  }

  const state = getState();
  const selectedCount = Object.keys(state.selectedElementIds || {}).length;
  const canPaste = hasClipboardData();

  lastTargetScenePos = targetScenePos;
  lastLockedHitId = lockedElementId;

  // Update disabled state for selection-dependent items
  const copyBtn = menu.querySelector('[data-action="copy"]');
  const cutBtn = menu.querySelector('[data-action="cut"]');
  const pasteBtn = menu.querySelector('[data-action="paste"]');
  const duplicateBtn = menu.querySelector('[data-action="duplicate"]');
  const groupBtn = menu.querySelector('[data-action="group"]');
  const ungroupBtn = menu.querySelector('[data-action="ungroup"]');
  const deleteBtn = menu.querySelector('[data-action="delete"]');
  const bringFwdBtn = menu.querySelector('[data-action="bringForward"]');
  const bringFrontBtn = menu.querySelector('[data-action="bringToFront"]');
  const sendBwdBtn = menu.querySelector('[data-action="sendBackward"]');
  const sendBackBtn = menu.querySelector('[data-action="sendToBack"]');

  const toggleGridBtn = menu.querySelector('[data-action="toggleGrid"]');

  const setItemEnabled = (btn, enabled) => {
    if (!btn) return;
    btn.disabled = !enabled;
    btn.style.opacity = enabled ? '1' : '0.35';
    btn.style.pointerEvents = enabled ? 'auto' : 'none';
  };

  const hasSelection = selectedCount > 0;
  setItemEnabled(copyBtn, hasSelection);
  setItemEnabled(cutBtn, hasSelection);
  setItemEnabled(duplicateBtn, hasSelection);
  setItemEnabled(groupBtn, canGroupSelection(state));
  setItemEnabled(ungroupBtn, canUngroupSelection(state));
  setItemEnabled(deleteBtn, hasSelection);
  setItemEnabled(bringFwdBtn, hasSelection);
  setItemEnabled(bringFrontBtn, hasSelection);
  setItemEnabled(sendBwdBtn, hasSelection);
  setItemEnabled(sendBackBtn, hasSelection);
  setItemEnabled(pasteBtn, canPaste);
  setItemEnabled(toggleGridBtn, true);

  if (toggleGridBtn) {
    const labelSpan = toggleGridBtn.querySelector('.context-menu-label-group span:last-child');
    if (labelSpan) {
      labelSpan.textContent = state.showGrid ? 'Hide grid' : 'Show grid';
    }
  }

  // Update lock button label based on whether the hovered element is locked.
  const lockBtn = menu.querySelector('[data-action="toggleLock"]');
  const lockLabel = document.getElementById('context-menu-lock-label');
  if (lockBtn && lockLabel) {
    const selectedIds = Object.keys(state.selectedElementIds || {});
    const singleEl = selectedIds.length === 1
      ? state.elements.find(el => el.id === selectedIds[0])
      : null;
    // Also account for directly right-clicking a locked element.
    const lockedEl = lastLockedHitId
      ? state.elements.find(el => el.id === lastLockedHitId)
      : null;
    const isLocked = (singleEl && singleEl.isLocked) || (lockedEl && lockedEl.isLocked);
    lockLabel.textContent = isLocked ? 'Unlock element' : 'Lock element';
    setItemEnabled(lockBtn, selectedCount > 0 || !!lastLockedHitId);
  }

  // Make visible so we can measure the true rendered height before positioning.
  container.style.display = 'block';
  menu.style.display = 'flex';

  // Now measure the true rendered size.
  const rect = menu.getBoundingClientRect();
  const menuWidth = rect.width || 210;
  const menuHeight = rect.height || 400;

  // Open downward by default; flip upward if it would go off-screen.
  let x = clientX;
  let y = clientY;

  if (x + menuWidth + 8 > window.innerWidth) {
    x = window.innerWidth - menuWidth - 8;
  }
  if (y + menuHeight + 8 > window.innerHeight) {
    y = Math.max(8, clientY - menuHeight);
  }

  menu.style.left = `${Math.max(8, x)}px`;
  menu.style.top = `${Math.max(8, y)}px`;

  isMenuOpen = true;
}

// Hides the active context menu.
export function hideContextMenu() {
  const container = document.getElementById('context-menu-container');
  const menu = document.getElementById('canvas-context-menu');

  if (menu) menu.style.display = 'none';
  if (container) container.style.display = 'none';

  isMenuOpen = false;
  lastTargetScenePos = null;
  lastLockedHitId = null;
}

// Returns whether the context menu is currently open.
export function isContextMenuOpen() {
  return isMenuOpen;
}

let isInitialized = false;

// Initializes the context menu event bindings.
export function initContextMenu() {
  if (isInitialized) {
    return;
  }

  const container = document.getElementById('context-menu-container');
  const menu = document.getElementById('canvas-context-menu');
  if (!container || !menu) {
    console.error('[ContextMenu] DOM containers not found.');
    return;
  }

  // 1. Menu item action dispatch
  menu.addEventListener('click', event => {
    const item = event.target.closest('.context-menu-item');
    if (!item || item.disabled) {
      return;
    }

    const action = item.dataset.action;
    switch (action) {
      case 'copy':
        copySelected();
        break;
      case 'cut':
        cutSelected();
        break;
      case 'paste':
        pasteSelected(lastTargetScenePos);
        break;
      case 'bringForward':
        bringForward();
        break;
      case 'bringToFront':
        bringToFront();
        break;
      case 'sendBackward':
        sendBackward();
        break;
      case 'sendToBack':
        sendToBack();
        break;
      case 'duplicate':
        duplicateSelectedElements();
        break;
      case 'group':
        groupSelectedElements();
        break;
      case 'ungroup':
        ungroupSelectedElements();
        break;
      case 'delete':
        deleteSelectedElements();
        break;
      case 'toggleGrid':
        toggleGrid();
        break;
      case 'toggleLock': {
        const s = getState();
        const ids = Object.keys(s.selectedElementIds || {});
        if (ids.length === 1) {
          toggleLockElement(ids[0]);
        } else if (ids.length > 1) {
          import('../../core/state.js').then(m => m.lockSelectedElements());
        } else if (lastLockedHitId) {
          // Unlock a locked element that was right-clicked directly.
          toggleLockElement(lastLockedHitId);
        }
        break;
      }
    }

    hideContextMenu();
  });

  // 2. Dismiss context menu on click outside, escape key, or window resize
  window.addEventListener('pointerdown', event => {
    if (isMenuOpen && !event.target.closest('#canvas-context-menu')) {
      hideContextMenu();
    }
  });

  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && isMenuOpen) {
      hideContextMenu();
    }
  });

  window.addEventListener('resize', () => {
    if (isMenuOpen) {
      hideContextMenu();
    }
  });

  isInitialized = true;
  console.log('[ContextMenu] Context menu successfully initialized with Clipboard actions.');
}
