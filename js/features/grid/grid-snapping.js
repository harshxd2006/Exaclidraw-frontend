// ============================================================================
// Grid Snapping Module
// Provides mathematical snapping utilities for drawing, dragging, and resizing.
// Reference: packages/excalidraw/snapping.ts in Excalidraw
// ============================================================================

import { getState } from '../../core/state.js';

// Snaps a scalar value to the nearest multiple of step.
export function snapToGrid(value, step = 20) {
  if (!step || step <= 1) {
    return value;
  }
  return Math.round(value / step) * step;
}

// Snaps a 2D point (x, y) to the nearest grid intersection.
export function snapPointToGrid(x, y, step = 20) {
  if (!step || step <= 1) {
    return { x, y };
  }
  return {
    x: Math.round(x / step) * step,
    y: Math.round(y / step) * step
  };
}

// Returns the effective grid snap step based on current state and keyboard modifiers.
// Returns 1 (snapping disabled) if grid is OFF or user holds Ctrl/Cmd during interaction.
export function getActiveSnapStep(event = null) {
  const state = getState();
  if (!state.showGrid) {
    return 1;
  }

  // Ctrl or Cmd key held during mouse interaction temporarily bypasses grid snapping
  if (event && (event.ctrlKey || event.metaKey)) {
    return 1;
  }

  return state.gridSize || 20;
}
