// ============================================================================
// Application State Module
// Central single source of truth for elements, active tool, selection, and viewport.
// ============================================================================

import { DEFAULT_ELEMENT_PROPERTIES } from './element-model.js';
import { generateId } from './element-factory.js';
import { measureText } from '../features/drawing/text.js';
import {
  reorderSendBackward,
  reorderBringForward,
  reorderSendToBack,
  reorderBringToFront
} from '../features/layers/layer-manager.js';
import {
  recordSnapshot,
  pushUndoSnapshot,
  createSnapshot,
  undo as historyUndo,
  redo as historyRedo,
  canUndo,
  canRedo,
  clearHistory
} from '../features/history/history-manager.js';
import {
  copySelectedElements,
  cutSelectedElements,
  pasteElements as clipboardPaste,
  hasClipboardData,
  handleSystemPaste
} from '../features/clipboard/clipboard-manager.js';
import {
  expandSelectionToGroups,
  groupElements,
  ungroupElements,
  canGroupSelection,
  canUngroupSelection
} from '../features/groups/group-manager.js';
import {
  alignLeft,
  alignRight,
  alignCenterHorizontal,
  alignTop,
  alignBottom,
  alignCenterVertical,
  distributeHorizontal,
  distributeVertical
} from '../features/selection/align-manager.js';

// The centralized state object.
const state = {
  // Collection of committed drawing elements in layer order (bottom to top).
  elements: [],

  // Set of currently selected element IDs (e.g., { "elem_1": true }).
  selectedElementIds: {},

  // Current active tool in toolbar ('selection', 'rectangle', 'ellipse', 'diamond', etc.).
  activeTool: {
    type: 'selection',
    locked: false
  },

  // Default properties applied to newly created elements.
  elementProperties: { ...DEFAULT_ELEMENT_PROPERTIES },

  // Viewport transformation: zoom multiplier (1.0 = 100%) and pan offsets.
  viewport: {
    zoom: 1.0,
    scrollX: 0,
    scrollY: 0
  },

  // Background color of the drawing scene.
  viewBackgroundColor: '#ffffff',

  // Grid settings.
  gridSize: 20,
  showGrid: true,

  // Temporary preview element being drawn before mouse release (rendered only on interactive-canvas).
  currentDraftElement: null
};

// Registered state listeners invoked whenever state changes.
const listeners = new Set();

// Returns a shallow copy or direct reference to the application state.
export function getState() {
  return state;
}

// Subscribes a callback function to be called whenever state updates.
export function subscribe(callback) {
  listeners.add(callback);
  // Return an unsubscribe function.
  return () => listeners.delete(callback);
}

// Emits state update notification to all subscribers.
export function notify() {
  for (const callback of listeners) {
    try {
      callback(state);
    } catch (err) {
      console.error('[State] Error in state listener:', err);
    }
  }
}

// Resets canvas elements with undo snapshot recording.
export function resetCanvas() {
  recordSnapshot(state);
  state.elements = [];
  state.selectedElementIds = {};
  notify();
}

// Updates top-level state properties and notifies all registered subscribers.
export function setState(updater) {
  if (typeof updater === 'function') {
    updater(state);
  } else if (typeof updater === 'object' && updater !== null) {
    Object.assign(state, updater);
  }
  notify();
}

// Appends a new committed element to the scene.
export function addElement(element, skipHistory = false) {
  if (!skipHistory) {
    recordSnapshot(state);
  }
  state.elements.push(element);
  notify();
  return element;
}

// Updates an existing element by ID.
export function updateElement(id, updates) {
  const index = state.elements.findIndex(elem => elem.id === id);
  if (index !== -1) {
    state.elements[index] = {
      ...state.elements[index],
      ...updates,
      version: (state.elements[index].version || 1) + 1
    };
    notify();
  }
}

// Updates multiple elements simultaneously with a single subscriber notification.
export function updateElements(updatesMap) {
  let hasChanges = false;
  for (let i = 0; i < state.elements.length; i++) {
    const el = state.elements[i];
    if (updatesMap[el.id]) {
      state.elements[i] = {
        ...el,
        ...updatesMap[el.id],
        version: (el.version || 1) + 1
      };
      hasChanges = true;
    }
  }

  if (hasChanges) {
    notify();
  }
}

// Sets or updates the active draft preview element.
export function setDraftElement(draftElement) {
  state.currentDraftElement = draftElement;
  notify();
}

// Clears the active draft preview element once drawing is complete.
export function clearDraftElement() {
  if (state.currentDraftElement !== null) {
    state.currentDraftElement = null;
    notify();
  }
}

// Replaces the set of currently selected element IDs.
export function setSelectedElementIds(ids, skipGroupExpansion = false) {
  const newMap = {};
  if (Array.isArray(ids)) {
    for (const id of ids) {
      newMap[id] = true;
    }
  } else if (typeof ids === 'object' && ids !== null) {
    Object.assign(newMap, ids);
  }
  state.selectedElementIds = skipGroupExpansion
    ? newMap
    : expandSelectionToGroups(state.elements, newMap);
  notify();
}

// Toggles selection for a single element ID (used for Shift-click multi-selection).
export function toggleElementSelection(id, skipGroupExpansion = false) {
  const newMap = { ...state.selectedElementIds };
  if (newMap[id]) {
    delete newMap[id];
  } else {
    newMap[id] = true;
  }
  state.selectedElementIds = skipGroupExpansion
    ? newMap
    : expandSelectionToGroups(state.elements, newMap);
  notify();
}

// Updates the viewport zoom and pan offsets, then notifies renderers and UI subscribers.
export function setViewport(newViewport) {
  state.viewport = {
    ...state.viewport,
    ...newViewport
  };
  notify();
}

// Updates a specific visual or styling property for all selected elements, or updates default properties if nothing is selected.
export function setElementProperty(property, value) {
  if (
    (property === 'strokeColor' || property === 'backgroundColor') &&
    typeof value === 'string' &&
    value.startsWith('#')
  ) {
    value = value.toLowerCase();
  }

  // 1. Update the default element property for future elements
  state.elementProperties[property] = value;

  // 2. If elements are currently selected, update all selected elements
  const selectedIds = Object.keys(state.selectedElementIds);
  if (selectedIds.length > 0) {
    recordSnapshot(state);
    for (let i = 0; i < state.elements.length; i++) {
      const el = state.elements[i];
      if (state.selectedElementIds[el.id]) {
        const updates = { [property]: value };

        // If updating a text formatting property on a text element, recalculate dimensions
        if (el.type === 'text' && (property === 'fontSize' || property === 'fontFamily' || property === 'lineHeight')) {
          const fontSize = property === 'fontSize' ? value : (el.fontSize || 20);
          const fontFamily = property === 'fontFamily' ? value : (el.fontFamily || 1);
          const lineHeight = property === 'lineHeight' ? value : (el.lineHeight || 1.25);
          const measured = measureText(el.text, fontSize, fontFamily, lineHeight);
          updates.width = measured.width;
          updates.height = measured.height;
        }

        state.elements[i] = {
          ...el,
          ...updates,
          version: (el.version || 1) + 1
        };
      }
    }
  }

  notify();
}

// Deletes all currently selected elements from the scene.
export function deleteSelectedElements() {
  const selectedIds = Object.keys(state.selectedElementIds);
  if (selectedIds.length === 0) {
    return;
  }

  recordSnapshot(state);

  // Remove selected elements from the scene
  state.elements = state.elements.filter(el => !state.selectedElementIds[el.id]);
  state.selectedElementIds = {};
  notify();
}

// Duplicates all currently selected elements with an offset and selects the new clones.
export function duplicateSelectedElements() {
  const selectedIds = Object.keys(state.selectedElementIds);
  if (selectedIds.length === 0) {
    return;
  }

  recordSnapshot(state);

  const offset = 20;
  const newSelectedIds = [];

  for (const el of state.elements) {
    if (state.selectedElementIds[el.id]) {
      const newId = generateId();
      const clone = {
        ...el,
        id: newId,
        x: el.x + offset,
        y: el.y + offset,
        seed: Math.floor(Math.random() * 2147483647),
        version: 1
      };
      if (clone.points) {
        clone.points = clone.points.map(p => [...p]);
      }
      state.elements.push(clone);
      newSelectedIds.push(newId);
    }
  }

  setSelectedElementIds(newSelectedIds);
}

// Sends selected elements one step backwards (downwards in layer order).
export function sendBackward() {
  const selectedIds = Object.keys(state.selectedElementIds);
  if (selectedIds.length === 0) return;
  recordSnapshot(state);
  state.elements = reorderSendBackward(state.elements, state.selectedElementIds);
  notify();
}

// Brings selected elements one step forwards (upwards in layer order).
export function bringForward() {
  const selectedIds = Object.keys(state.selectedElementIds);
  if (selectedIds.length === 0) return;
  recordSnapshot(state);
  state.elements = reorderBringForward(state.elements, state.selectedElementIds);
  notify();
}

// Sends selected elements to the very bottom of the canvas.
export function sendToBack() {
  const selectedIds = Object.keys(state.selectedElementIds);
  if (selectedIds.length === 0) return;
  recordSnapshot(state);
  state.elements = reorderSendToBack(state.elements, state.selectedElementIds);
  notify();
}

// Brings selected elements to the very top of the canvas.
export function bringToFront() {
  const selectedIds = Object.keys(state.selectedElementIds);
  if (selectedIds.length === 0) return;
  recordSnapshot(state);
  state.elements = reorderBringToFront(state.elements, state.selectedElementIds);
  notify();
}

// Rolls back to the previous state snapshot in the undo history stack.
export function undo() {
  return historyUndo(state, notify);
}

// Replays the next state snapshot in the redo history stack.
export function redo() {
  return historyRedo(state, notify);
}

// Copies the currently selected elements to clipboard.
export function copySelected() {
  return copySelectedElements(state);
}

// Cuts the currently selected elements to clipboard and removes them.
export function cutSelected() {
  return cutSelectedElements(state, deleteSelectedElements);
}

// Pastes elements from clipboard into the scene.
export function pasteSelected(targetScenePos = null) {
  const success = clipboardPaste(state, { targetScenePos });
  if (success) {
    notify();
  }
  return success;
}

// Handles system paste events
export function handlePaste(event, targetScenePos = null) {
  return handleSystemPaste(event, state, notify, targetScenePos);
}

// Toggles the scene background grid display and snapping.
export function toggleGrid(forcedState = null) {
  state.showGrid = forcedState !== null ? Boolean(forcedState) : !state.showGrid;
  notify();
  return state.showGrid;
}

// Updates the grid step size (e.g. 20).
export function setGridSize(size) {
  if (size > 0) {
    state.gridSize = size;
    notify();
  }
}

// Groups currently selected elements together with undo snapshot recording.
export function groupSelectedElements() {
  if (!canGroupSelection(state)) {
    return false;
  }
  recordSnapshot(state);
  const success = groupElements(state.elements, state.selectedElementIds);
  if (success) {
    state.selectedElementIds = expandSelectionToGroups(state.elements, state.selectedElementIds);
    notify();
  }
  return success;
}

// Ungroups currently selected elements with undo snapshot recording.
export function ungroupSelectedElements() {
  if (!canUngroupSelection(state)) {
    return false;
  }
  recordSnapshot(state);
  const success = ungroupElements(state.elements, state.selectedElementIds);
  if (success) {
    notify();
  }
  return success;
}

// ── Element Locking ──────────────────────────────────────────────────────────

/** Locks all currently selected elements (they can no longer be moved/resized/deleted). */
export function lockSelectedElements() {
  const selectedIds = Object.keys(state.selectedElementIds);
  if (selectedIds.length === 0) return;
  recordSnapshot(state);
  for (let i = 0; i < state.elements.length; i++) {
    if (state.selectedElementIds[state.elements[i].id]) {
      state.elements[i] = { ...state.elements[i], isLocked: true, version: (state.elements[i].version || 1) + 1 };
    }
  }
  // Deselect locked elements since they can no longer be interacted with.
  state.selectedElementIds = {};
  notify();
}

/** Unlocks all currently selected elements. */
export function unlockSelectedElements() {
  const selectedIds = Object.keys(state.selectedElementIds);
  if (selectedIds.length === 0) return;
  recordSnapshot(state);
  for (let i = 0; i < state.elements.length; i++) {
    if (state.selectedElementIds[state.elements[i].id]) {
      state.elements[i] = { ...state.elements[i], isLocked: false, version: (state.elements[i].version || 1) + 1 };
    }
  }
  notify();
}

/** Toggles the locked state of a single element by ID (for context-menu use). */
export function toggleLockElement(elementId) {
  const el = state.elements.find(e => e.id === elementId);
  if (!el) return;
  recordSnapshot(state);
  const idx = state.elements.findIndex(e => e.id === elementId);
  const willLock = !el.isLocked;
  state.elements[idx] = { ...el, isLocked: willLock, version: (el.version || 1) + 1 };
  if (willLock) {
    // Deselect once locked.
    const newMap = { ...state.selectedElementIds };
    delete newMap[elementId];
    state.selectedElementIds = newMap;
  }
  notify();
  return willLock;
}

// ────────────────────────────────────────────────────────────────────────────
// Alignment & Distribution Operations
// ────────────────────────────────────────────────────────────────────────────

/** Runs an alignment/distribution operation and applies it to state. */
function applyAlignment(operationFn) {
  const selectedIds = Object.keys(state.selectedElementIds);
  if (selectedIds.length < 2) return;
  recordSnapshot(state);
  const updates = operationFn(state.elements, state.selectedElementIds);
  if (Object.keys(updates).length > 0) {
    for (let i = 0; i < state.elements.length; i++) {
      const el = state.elements[i];
      if (updates[el.id]) {
        state.elements[i] = { ...el, ...updates[el.id], version: (el.version || 1) + 1 };
      }
    }
    notify();
  }
}

export const alignSelectedLeft             = () => applyAlignment(alignLeft);
export const alignSelectedRight            = () => applyAlignment(alignRight);
export const alignSelectedCenterHorizontal = () => applyAlignment(alignCenterHorizontal);
export const alignSelectedTop              = () => applyAlignment(alignTop);
export const alignSelectedBottom           = () => applyAlignment(alignBottom);
export const alignSelectedCenterVertical   = () => applyAlignment(alignCenterVertical);
export const distributeSelectedHorizontal  = () => applyAlignment(distributeHorizontal);
export const distributeSelectedVertical    = () => applyAlignment(distributeVertical);

export {
  canUndo,
  canRedo,
  clearHistory,
  recordSnapshot,
  pushUndoSnapshot,
  createSnapshot,
  hasClipboardData
};

