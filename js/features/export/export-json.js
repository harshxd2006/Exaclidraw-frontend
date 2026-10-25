// ============================================================================
// JSON Save & Load Module (.excalidraw files)
// Handles native Excalidraw file serialization, parsing, and drag & drop loading.
// Reference: packages/excalidraw/data/json.ts in Excalidraw
// ============================================================================

import { recordSnapshot } from '../history/history-manager.js';
import { cloneElements } from '../history/history-manager.js';

// Serializes the current application state to standard Excalidraw JSON format.
export function exportToJson(state) {
  const exportData = {
    type: 'excalidraw',
    version: 2,
    source: 'https://excalidraw.com',
    elements: cloneElements(state.elements.filter(el => !el.isDeleted)),
    appState: {
      viewBackgroundColor: state.viewBackgroundColor || '#ffffff',
      gridSize: state.gridSize || 20
    }
  };

  return JSON.stringify(exportData, null, 2);
}

// Triggers a browser download of the scene saved as a .excalidraw JSON file.
export function downloadJson(state, filename = 'drawing.excalidraw') {
  const jsonString = exportToJson(state);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const downloadLink = document.createElement('a');
  downloadLink.download = filename.endsWith('.excalidraw') ? filename : `${filename}.excalidraw`;
  downloadLink.href = url;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Loads and parses an .excalidraw or JSON file content into application state.
export function loadFromJsonString(jsonString, state, notify) {
  try {
    const data = JSON.parse(jsonString);

    if (!data || !Array.isArray(data.elements)) {
      throw new Error('Invalid Excalidraw file: missing elements array.');
    }

    // Record snapshot before applying loaded file so action is fully undoable
    recordSnapshot(state);

    // Deep clone and assign loaded elements
    state.elements = cloneElements(data.elements);
    state.selectedElementIds = {};

    // Restore app state if provided
    if (data.appState) {
      if (typeof data.appState.viewBackgroundColor === 'string') {
        state.viewBackgroundColor = data.appState.viewBackgroundColor;
      }
      if (typeof data.appState.gridSize === 'number') {
        state.gridSize = data.appState.gridSize;
      }
    }

    if (typeof notify === 'function') {
      notify();
    }

    console.log(`[ExportJSON] Successfully loaded ${state.elements.length} elements from file.`);
    return true;
  } catch (err) {
    console.error('[ExportJSON] Failed to load Excalidraw file:', err);
    alert('Failed to load file: Invalid Excalidraw JSON format.');
    return false;
  }
}

// Initializes drag and drop file loading onto the canvas container.
export function initDragAndDrop(targetElement, onFileLoaded) {
  if (!targetElement) return;

  targetElement.addEventListener('dragover', event => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
  });

  targetElement.addEventListener('drop', event => {
    event.preventDefault();
    event.stopPropagation();

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.name.endsWith('.excalidraw') || file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = e => {
        const content = e.target.result;
        if (typeof onFileLoaded === 'function') {
          onFileLoaded(content);
        }
      };
      reader.readAsText(file);
    }
  });
}
