// ============================================================================
// History Manager Module (Undo & Redo)
// Manages history stacks, state snapshots, and rollback/replay operations.
// Reference: packages/excalidraw/history.ts in Excalidraw
// ============================================================================

// Maximum number of undo states kept in memory.
export const MAX_HISTORY_ENTRIES = 100;

// Internal history stacks.
const undoStack = [];
const redoStack = [];

// Deep-clones an individual scene element.
export function cloneElement(element) {
  const clone = { ...element };
  if (Array.isArray(element.points)) {
    clone.points = element.points.map(pt => [...pt]);
  }
  if (Array.isArray(element.groupIds)) {
    clone.groupIds = [...element.groupIds];
  }
  return clone;
}

// Deep-clones an array of elements.
export function cloneElements(elements) {
  return elements.map(cloneElement);
}

// Creates an immutable snapshot of elements and selection.
export function createSnapshot(state) {
  return {
    elements: cloneElements(state.elements),
    selectedElementIds: { ...state.selectedElementIds }
  };
}

// Records the current state as an undo snapshot before a mutation occurs.
export function recordSnapshot(state) {
  const snapshot = createSnapshot(state);
  undoStack.push(snapshot);

  if (undoStack.length > MAX_HISTORY_ENTRIES) {
    undoStack.shift();
  }

  // Any new user action invalidates the redo branch
  redoStack.length = 0;

  updateHistoryUI();
}

// Pushes a pre-captured snapshot directly to the undo stack (used for drag/resize gestures).
export function pushUndoSnapshot(snapshot) {
  if (!snapshot) {
    return;
  }
  undoStack.push(snapshot);
  if (undoStack.length > MAX_HISTORY_ENTRIES) {
    undoStack.shift();
  }
  redoStack.length = 0;
  updateHistoryUI();
}

// Rolls back to the previous state snapshot in the undo stack.
export function undo(state, notify) {
  if (undoStack.length === 0) {
    return false;
  }

  // 1. Save current state to the redo stack
  redoStack.push(createSnapshot(state));

  // 2. Restore previous state from undo stack
  const snapshot = undoStack.pop();
  state.elements = cloneElements(snapshot.elements);
  state.selectedElementIds = { ...snapshot.selectedElementIds };

  updateHistoryUI();
  if (typeof notify === 'function') {
    notify();
  }
  return true;
}

// Replays the next state snapshot in the redo stack.
export function redo(state, notify) {
  if (redoStack.length === 0) {
    return false;
  }

  // 1. Save current state to the undo stack
  undoStack.push(createSnapshot(state));

  // 2. Restore next state from redo stack
  const snapshot = redoStack.pop();
  state.elements = cloneElements(snapshot.elements);
  state.selectedElementIds = { ...snapshot.selectedElementIds };

  updateHistoryUI();
  if (typeof notify === 'function') {
    notify();
  }
  return true;
}

// Returns whether an undo action is currently available.
export function canUndo() {
  return undoStack.length > 0;
}

// Returns whether a redo action is currently available.
export function canRedo() {
  return redoStack.length > 0;
}

// Clears all history entries (used when resetting scene).
export function clearHistory() {
  undoStack.length = 0;
  redoStack.length = 0;
  updateHistoryUI();
}

// Updates enabled/disabled state of Undo and Redo UI buttons.
export function updateHistoryUI() {
  const undoBtn = document.getElementById('btn-undo');
  const redoBtn = document.getElementById('btn-redo');

  if (undoBtn) {
    undoBtn.disabled = !canUndo();
    undoBtn.style.opacity = canUndo() ? '1' : '0.35';
    undoBtn.style.pointerEvents = canUndo() ? 'auto' : 'none';
  }

  if (redoBtn) {
    redoBtn.disabled = !canRedo();
    redoBtn.style.opacity = canRedo() ? '1' : '0.35';
    redoBtn.style.pointerEvents = canRedo() ? 'auto' : 'none';
  }
}
