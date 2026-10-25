// ============================================================================
// Keyboard Shortcuts Module
// Handles keyboard navigation and tool hotkeys matching Excalidraw standards.
// ============================================================================

import { setTool, toggleLock } from './tool-manager.js';
import {
  deleteSelectedElements,
  duplicateSelectedElements,
  sendBackward,
  bringForward,
  sendToBack,
  bringToFront,
  undo,
  redo,
  copySelected,
  cutSelected,
  pasteSelected,
  handlePaste,
  toggleGrid,
  groupSelectedElements,
  ungroupSelectedElements,
  toggleLockElement,
  lockSelectedElements,
  getState
} from '../../core/state.js';
import { zoomIn, zoomOut, resetZoom, zoomToFit } from '../viewport/zoom-pan.js';
import { openLoadFileDialog, saveCanvasToFile } from '../ui/topbar.js';
import { openExportDialog } from '../ui/export-dialog.js';

// Map of keyboard keys/codes to tool identifiers.
const SHORTCUT_MAP = {
  '1': 'selection',
  'v': 'selection',
  'V': 'selection',

  '2': 'rectangle',
  'r': 'rectangle',
  'R': 'rectangle',

  '3': 'diamond',
  'd': 'diamond',
  'D': 'diamond',

  '4': 'ellipse',
  'o': 'ellipse',
  'O': 'ellipse',

  '5': 'arrow',
  'a': 'arrow',
  'A': 'arrow',

  '6': 'line',
  'l': 'line',
  'L': 'line',

  '7': 'freedraw',
  'p': 'freedraw',
  'P': 'freedraw',

  '8': 'text',
  't': 'text',
  'T': 'text',

  '0': 'eraser',
  'e': 'eraser',
  'E': 'eraser',

  'h': 'hand',
  'H': 'hand'
};

// Handles global keydown events to trigger tool selection shortcuts.
function handleKeyDown(event) {
  // Ignore shortcuts when the user is focused on an input or textarea element.
  const activeElement = document.activeElement;
  const isInputActive =
    activeElement &&
    (activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.isContentEditable);

  if (isInputActive) {
    return;
  }

  // Handle Lock Tool toggle shortcut (Q key).
  if (event.key === 'q' || event.key === 'Q') {
    event.preventDefault();
    toggleLock();
    return;
  }

  // Handle Undo (Ctrl+Z / Cmd+Z) and Redo (Ctrl+Shift+Z / Cmd+Shift+Z / Ctrl+Y / Cmd+Y)
  if ((event.ctrlKey || event.metaKey) && (event.key === 'z' || event.key === 'Z')) {
    event.preventDefault();
    if (event.shiftKey) {
      redo();
    } else {
      undo();
    }
    return;
  }

  if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || event.key === 'Y')) {
    event.preventDefault();
    redo();
    return;
  }

  // Handle Ctrl+C / Cmd+C for Copy
  if ((event.ctrlKey || event.metaKey) && (event.key === 'c' || event.key === 'C')) {
    const copied = copySelected();
    if (copied) {
      event.preventDefault();
    }
    return;
  }

  // Handle Ctrl+X / Cmd+X for Cut
  if ((event.ctrlKey || event.metaKey) && (event.key === 'x' || event.key === 'X')) {
    const cut = cutSelected();
    if (cut) {
      event.preventDefault();
    }
    return;
  }

  // Handle Ctrl+V / Cmd+V for Paste
  if ((event.ctrlKey || event.metaKey) && (event.key === 'v' || event.key === 'V')) {
    // If clipboard API paste event fires, it will be handled by the paste listener.
    // If not, pasteSelected handles the internal clipboard.
    // Return early to prevent selecting the selection tool 'v'.
    return;
  }

  // Handle Delete / Backspace for removing selected elements
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault();
    deleteSelectedElements();
    return;
  }

  // Handle Ctrl+D / Cmd+D for duplicating selected elements
  if ((event.ctrlKey || event.metaKey) && (event.key === 'd' || event.key === 'D')) {
    event.preventDefault();
    duplicateSelectedElements();
    return;
  }

  // Handle Ctrl+G / Cmd+G for Group / Ungroup
  if ((event.ctrlKey || event.metaKey) && (event.key === 'g' || event.key === 'G')) {
    event.preventDefault();
    if (event.shiftKey) {
      ungroupSelectedElements();
    } else {
      groupSelectedElements();
    }
    return;
  }

  // Handle Ctrl+Shift+L for Lock / Unlock element
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.key === 'l' || event.key === 'L')) {
    event.preventDefault();
    const s = getState();
    const ids = Object.keys(s.selectedElementIds || {});
    if (ids.length === 1) {
      toggleLockElement(ids[0]);
    } else if (ids.length > 1) {
      lockSelectedElements();
    }
    return;
  }

  // Handle Layer Ordering: Send Backward / Send to Back
  const isBracketLeft = event.key === '[' || event.key === '{' || event.code === 'BracketLeft';
  if ((event.ctrlKey || event.metaKey) && isBracketLeft) {
    event.preventDefault();
    if (event.shiftKey) {
      sendToBack();
    } else {
      sendBackward();
    }
    return;
  }

  // Handle Layer Ordering: Bring Forward / Bring to Front
  const isBracketRight = event.key === ']' || event.key === '}' || event.code === 'BracketRight';
  if ((event.ctrlKey || event.metaKey) && isBracketRight) {
    event.preventDefault();
    if (event.shiftKey) {
      bringToFront();
    } else {
      bringForward();
    }
    return;
  }

  // Handle Zoom In: Ctrl + Plus / Ctrl + Equal
  if ((event.ctrlKey || event.metaKey) && (event.key === '=' || event.key === '+')) {
    event.preventDefault();
    zoomIn();
    return;
  }

  // Handle Zoom Out: Ctrl + Minus
  if ((event.ctrlKey || event.metaKey) && (event.key === '-' || event.key === '_')) {
    event.preventDefault();
    zoomOut();
    return;
  }

  // Handle Zoom Reset: Ctrl + 0
  if ((event.ctrlKey || event.metaKey) && event.key === '0') {
    event.preventDefault();
    resetZoom();
    return;
  }

  // Handle Zoom to Fit: Shift + 1
  if (event.shiftKey && (event.key === '!' || event.key === '1')) {
    event.preventDefault();
    zoomToFit();
    return;
  }

  // Handle Toggle Grid: Ctrl + ' / Cmd + '
  if ((event.ctrlKey || event.metaKey) && (event.key === "'" || event.key === '"' || event.code === 'Quote')) {
    event.preventDefault();
    toggleGrid();
    return;
  }

  // Handle Ctrl+S / Cmd+S for Save to Disk
  if ((event.ctrlKey || event.metaKey) && !event.shiftKey && (event.key === 's' || event.key === 'S')) {
    event.preventDefault();
    saveCanvasToFile();
    return;
  }

  // Handle Ctrl+O / Cmd+O for Open Drawing File
  if ((event.ctrlKey || event.metaKey) && !event.shiftKey && (event.key === 'o' || event.key === 'O')) {
    event.preventDefault();
    openLoadFileDialog();
    return;
  }

  // Handle Ctrl+Shift+E / Cmd+Shift+E for Export Image Modal
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.key === 'e' || event.key === 'E')) {
    event.preventDefault();
    openExportDialog();
    return;
  }

  // Ensure modifier combinations (Ctrl/Meta/Alt) don't trigger single-key tool switches
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }

  // Check if the pressed key matches a known tool shortcut.
  const targetTool = SHORTCUT_MAP[event.key];
  if (targetTool) {
    event.preventDefault();
    setTool(targetTool);
  }
}

// Handles system paste events
function handleSystemPasteEvent(event) {
  handlePaste(event);
}

// Binds global keyboard shortcuts and paste listeners.
export function initKeyboardShortcuts() {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('paste', handleSystemPasteEvent);
  console.log('[KeyboardShortcuts] Hotkey listeners registered (1-8, V, R, D, O, A, L, P, T, E, H, Q, Ctrl+C/V/X).');
}
