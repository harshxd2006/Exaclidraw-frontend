// ============================================================================
// LocalStorage Persistence Module
// Debounced auto-saving of scene elements and app state, with restoration on boot.
// Reference: packages/excalidraw/data/localStorage.ts in Excalidraw
// ============================================================================

import { cloneElements } from '../history/history-manager.js';

export const STORAGE_KEYS = {
  ELEMENTS: 'excalidraw-elements',
  APP_STATE: 'excalidraw-app-state',
  VERSION: 'excalidraw-storage-version'
};

const CURRENT_STORAGE_VERSION = '2.0';

let debounceTimer = null;
let saveStatusListener = null;

// Registers a listener for auto-save status changes ('saving' | 'saved' | 'idle')
export function onSaveStatusChange(listener) {
  saveStatusListener = listener;
}

function notifySaveStatus(status) {
  if (typeof saveStatusListener === 'function') {
    saveStatusListener(status);
  }
}

// Synchronously saves current elements and app state into browser localStorage
export function saveToLocalStorage(state) {
  try {
    if (!state) return false;

    // Filter out deleted elements and clone
    const validElements = cloneElements(state.elements.filter(el => !el.isDeleted));

    const appStateToSave = {
      viewBackgroundColor: state.viewBackgroundColor || '#ffffff',
      gridSize: state.gridSize || 20,
      showGrid: state.showGrid !== undefined ? state.showGrid : true,
      viewport: {
        zoom: state.viewport?.zoom || 1.0,
        scrollX: state.viewport?.scrollX || 0,
        scrollY: state.viewport?.scrollY || 0
      },
      elementProperties: { ...state.elementProperties }
    };

    localStorage.setItem(STORAGE_KEYS.ELEMENTS, JSON.stringify(validElements));
    localStorage.setItem(STORAGE_KEYS.APP_STATE, JSON.stringify(appStateToSave));
    localStorage.setItem(STORAGE_KEYS.VERSION, CURRENT_STORAGE_VERSION);

    notifySaveStatus('saved');
    return true;
  } catch (err) {
    console.error('[LocalStorage] Failed to save state to localStorage:', err);
    notifySaveStatus('error');
    return false;
  }
}

// Debounced auto-save triggered on every state mutation (350ms delay)
export function debouncedSaveToLocalStorage(state, delay = 350) {
  notifySaveStatus('saving');

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    saveToLocalStorage(state);
    debounceTimer = null;
  }, delay);
}

// Loads previously saved scene elements and application state from localStorage
export function loadFromLocalStorage() {
  try {
    const rawElements = localStorage.getItem(STORAGE_KEYS.ELEMENTS);
    const rawAppState = localStorage.getItem(STORAGE_KEYS.APP_STATE);

    if (!rawElements) {
      return null;
    }

    const elements = JSON.parse(rawElements);
    if (!Array.isArray(elements)) {
      return null;
    }

    let appState = null;
    if (rawAppState) {
      try {
        appState = JSON.parse(rawAppState);
      } catch (err) {
        console.warn('[LocalStorage] Could not parse saved app state:', err);
      }
    }

    return {
      elements,
      appState
    };
  } catch (err) {
    console.error('[LocalStorage] Failed to load data from localStorage:', err);
    return null;
  }
}

// Checks if valid scene data is stored in localStorage
export function hasSavedScene() {
  try {
    const rawElements = localStorage.getItem(STORAGE_KEYS.ELEMENTS);
    if (!rawElements) return false;
    const elements = JSON.parse(rawElements);
    return Array.isArray(elements) && elements.length > 0;
  } catch (err) {
    return false;
  }
}

// Clears all persisted Excalidraw items from localStorage
export function clearLocalStorage() {
  try {
    localStorage.removeItem(STORAGE_KEYS.ELEMENTS);
    localStorage.removeItem(STORAGE_KEYS.APP_STATE);
    localStorage.removeItem(STORAGE_KEYS.VERSION);
    notifySaveStatus('idle');
    console.log('[LocalStorage] Cleared saved scene from browser storage.');
    return true;
  } catch (err) {
    console.error('[LocalStorage] Failed to clear localStorage:', err);
    return false;
  }
}
