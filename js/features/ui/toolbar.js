// ============================================================================
// Toolbar UI Controller Module
// Binds toolbar DOM buttons to the tool manager and updates active button styles.
// ============================================================================

import { setTool, toggleLock } from '../tools/tool-manager.js';
import { getState, subscribe } from '../../core/state.js';

// Updates the visual active/locked states of all toolbar buttons.
export function updateToolbarUI(state) {
  const toolbarContainer = document.getElementById('toolbar-container');
  if (!toolbarContainer) {
    return;
  }

  const buttons = toolbarContainer.querySelectorAll('.tool-btn');
  const activeToolType = state.activeTool.type;
  const isLocked = state.activeTool.locked;

  buttons.forEach(button => {
    const tool = button.dataset.tool;

    if (tool === 'lock') {
      button.classList.toggle('locked', Boolean(isLocked));
    } else {
      button.classList.toggle('active', tool === activeToolType);
    }
  });
}

// Handles click events on toolbar buttons.
function handleToolbarClick(event) {
  const button = event.target.closest('.tool-btn');
  if (!button) {
    return;
  }

  const tool = button.dataset.tool;
  if (!tool) {
    return;
  }

  if (tool === 'lock') {
    toggleLock();
  } else {
    setTool(tool);
  }
}

// Initializes the toolbar event listeners and syncs initial state.
export function initToolbarUI() {
  const toolbarContainer = document.getElementById('toolbar-container');
  if (!toolbarContainer) {
    console.error('[ToolbarUI] #toolbar-container element not found.');
    return;
  }

  // Attach click listener using event delegation.
  toolbarContainer.addEventListener('click', handleToolbarClick);

  // Subscribe to state changes to update active button styles automatically.
  subscribe(state => {
    updateToolbarUI(state);
  });

  // Apply initial state styling.
  updateToolbarUI(getState());

  console.log('[ToolbarUI] Toolbar UI listeners initialized.');
}
