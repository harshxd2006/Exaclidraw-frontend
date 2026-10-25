// ============================================================================
// Tool Manager Module
// Controls active drawing tool, tool locking behavior, and canvas cursor styling.
// ============================================================================

import { getState, setState, setSelectedElementIds } from '../../core/state.js';
import { canvasElements } from '../../core/viewport.js';

// List of all recognized tool identifiers.
export const VALID_TOOLS = [
  'selection',
  'hand',
  'rectangle',
  'diamond',
  'ellipse',
  'arrow',
  'line',
  'freedraw',
  'text',
  'eraser'
];

// Updates the canvas cursor according to the active tool.
export function updateCanvasCursor(toolType) {
  const container = canvasElements.container;
  if (!container) {
    return;
  }

  switch (toolType) {
    case 'hand':
      container.style.cursor = 'grab';
      break;
    case 'selection':
      container.style.cursor = 'default';
      break;
    case 'text':
      container.style.cursor = 'text';
      break;
    default:
      // All shape drawing tools (rectangle, ellipse, diamond, line, arrow, freedraw, eraser)
      container.style.cursor = 'crosshair';
      break;
  }
}

// Sets the active tool and updates the workspace cursor.
export function setTool(toolType) {
  if (!VALID_TOOLS.includes(toolType)) {
    console.warn(`[ToolManager] Unknown tool: "${toolType}"`);
    return;
  }

  const state = getState();

  // If changing to a drawing tool, clear existing element selection.
  if (toolType !== 'selection') {
    setSelectedElementIds([]);
  }

  // Update active tool in central state.
  setState(currentState => {
    currentState.activeTool.type = toolType;
  });

  // Update the workspace cursor.
  updateCanvasCursor(toolType);

  console.log(`[ToolManager] Active tool set to: ${toolType}`);
}

// Toggles whether the active tool remains selected after drawing a shape.
export function toggleLock() {
  const state = getState();
  const newLockedState = !state.activeTool.locked;

  setState(currentState => {
    currentState.activeTool.locked = newLockedState;
  });

  console.log(`[ToolManager] Tool lock toggled: ${newLockedState ? 'LOCKED' : 'UNLOCKED'}`);
  return newLockedState;
}

// Automatically resets tool to 'selection' after committing a shape unless locked.
export function onShapeCommitted() {
  const state = getState();
  // If the tool is NOT locked, switch back to selection mode.
  if (!state.activeTool.locked && state.activeTool.type !== 'selection' && state.activeTool.type !== 'hand') {
    setTool('selection');
  }
}
