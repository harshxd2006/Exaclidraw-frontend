// ============================================================================
// Topbar UI Controller Module
// Handles Main Hamburger Menu, File Open/Save, Quick Export, and Canvas Reset.
// Reference: packages/excalidraw/components/LayerUI.tsx in Excalidraw
// ============================================================================

import {
  getState,
  resetCanvas,
  notify,
  setElementProperty,
  updateElements,
  recordSnapshot
} from '../../core/state.js';
import { downloadJson, loadFromJsonString } from '../export/export-json.js';
import { openExportDialog } from './export-dialog.js';
import { clearLocalStorage, saveToLocalStorage } from '../storage/local-storage.js';
import { syncPropertiesPanelUI } from './properties-panel.js';
import {
    createCloudDrawing,
    updateCloudDrawing,
      getCloudDrawing
} from '../api/drawings-api.js';

// ── Dark / Light Theme ───────────────────────────────────────────────────────
const THEME_KEY = 'excalidraw-theme';

const MOON_SVG = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
const SUN_SVG  = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;

const LIGHT_MODE_STROKE_DEFAULT = '#1e1e24';
const DARK_MODE_STROKE_DEFAULT = '#ECEAE5';

function normalizeHex(color) {
  return typeof color === 'string' ? color.toLowerCase() : '';
}

/** Keeps default stroke readable on the current canvas theme (new + existing shapes). */
export function applyThemeAwareElementDefaults({ skipHistory = false } = {}) {
  const state = getState();
  if (!state?.elementProperties) {
    return;
  }

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const fromStroke = isDark ? LIGHT_MODE_STROKE_DEFAULT : DARK_MODE_STROKE_DEFAULT;
  const toStroke = isDark ? DARK_MODE_STROKE_DEFAULT : LIGHT_MODE_STROKE_DEFAULT;
  const fromNorm = normalizeHex(fromStroke);

  if (normalizeHex(state.elementProperties.strokeColor) === fromNorm) {
    setElementProperty('strokeColor', toStroke);
  }

  const updates = {};
  for (const el of state.elements) {
    if (el.isDeleted) continue;
    if (normalizeHex(el.strokeColor) === fromNorm) {
      updates[el.id] = { strokeColor: toStroke };
    }
  }

  if (Object.keys(updates).length > 0) {
    if (!skipHistory) {
      recordSnapshot(state);
    }
    updateElements(updates);
  }
}

/** Apply saved theme preference immediately (call before first paint to avoid flash). */
export function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
  _syncThemeUI();
  applyThemeAwareElementDefaults({ skipHistory: true });
}

/** Toggle between light and dark mode, persist the choice, and repaint the canvas. */
export function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem(THEME_KEY, 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem(THEME_KEY, 'dark');
  }
  _syncThemeUI();
  applyThemeAwareElementDefaults();
  // Force renderers to repaint with new theme colors immediately
  notify();
}

function _syncThemeUI() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const iconEl  = document.getElementById('menu-theme-icon');
  const labelEl = document.getElementById('menu-theme-label');
  if (iconEl)  iconEl.innerHTML   = isDark ? SUN_SVG  : MOON_SVG;
  if (labelEl) labelEl.textContent = isDark ? 'Light mode' : 'Dark mode';
}

let isMenuOpen = false;

// Toggles the hamburger dropdown menu visibility
export function toggleAppMenu(forceState = null) {
  const dropdown = document.getElementById('app-menu-dropdown');
  const menuBtn = document.getElementById('btn-app-menu');
  const propPanel = document.getElementById('properties-panel-container');
  if (!dropdown) return;

  isMenuOpen = forceState !== null ? Boolean(forceState) : !isMenuOpen;
  dropdown.style.display = isMenuOpen ? 'block' : 'none';

  if (menuBtn) {
    menuBtn.setAttribute('aria-expanded', isMenuOpen ? 'true' : 'false');
  }

  // Hide the properties panel while the menu is open so it doesn't overlap
  if (propPanel) {
    if (isMenuOpen) {
      propPanel.style.opacity = '0';
      propPanel.style.pointerEvents = 'none';
      propPanel.style.transform = 'translateX(-8px)';
    } else {
      // Re-sync visibility/styles after the menu closes (drawing-tool default style, selection, etc.)
      setTimeout(() => {
        syncPropertiesPanelUI(getState());
      }, 80);
    }
  }
}

// Closes the hamburger dropdown menu
export function closeAppMenu() {
  if (isMenuOpen) {
    toggleAppMenu(false);
  }
}

// Opens the native file picker to load a .excalidraw drawing file
export function openLoadFileDialog() {
  const fileInput = document.getElementById('file-input-load');
  if (fileInput) {
    fileInput.click();
  }
}

// Triggers browser download of the scene as a .excalidraw JSON file
export function saveCanvasToFile() {
  downloadJson(getState());
}
const CLOUD_DRAWING_ID_KEY = 'exacollab-current-cloud-drawing-id';
const CLOUD_DRAWING_TITLE_KEY = 'exacollab-current-cloud-drawing-title';

let activeCloudDrawingId =
    localStorage.getItem(CLOUD_DRAWING_ID_KEY);

let activeCloudDrawingTitle =
    localStorage.getItem(CLOUD_DRAWING_TITLE_KEY) || 'Untitled drawing';

let isInitialized = false;

// Initializes DOM event listeners for the Topbar and main menu
export function initTopbar() {
  if (isInitialized) return;

  const menuBtn = document.getElementById('btn-app-menu');
  const dropdown = document.getElementById('app-menu-dropdown');
  const openItem = document.getElementById('menu-item-open');
  const saveItem = document.getElementById('menu-item-save');
  const saveCloudItem =document.getElementById('menu-item-save-cloud');
  const loadCloudItem = document.getElementById('menu-item-load-cloud');
    
  const exportItem = document.getElementById('menu-item-export');
  const resetItem = document.getElementById('menu-item-reset');
  const fileInput = document.getElementById('file-input-load');
  const quickExportBtn = document.getElementById('btn-quick-export');

  // 1. Hamburger menu button toggle
  if (menuBtn) {
    menuBtn.addEventListener('click', event => {
      event.stopPropagation();
      toggleAppMenu();
    });
  }

  // 1b. Dark mode toggle
  const themeItem = document.getElementById('menu-item-theme');
  if (themeItem) {
    themeItem.addEventListener('click', () => {
      closeAppMenu();
      toggleTheme();
    });
  }

  // 1c. Alt+D keyboard shortcut for dark mode
  window.addEventListener('keydown', event => {
    if (event.altKey && (event.key === 'd' || event.key === 'D')) {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
      event.preventDefault();
      toggleTheme();
    }
  });

  // 2. Open file action
  if (openItem) {
    openItem.addEventListener('click', () => {
      closeAppMenu();
      openLoadFileDialog();
    });
  }

  // 3. Hidden file input change listener
  if (fileInput) {
    fileInput.addEventListener('change', event => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = e => {
        const content = e.target?.result;
        if (typeof content === 'string') {
          if (loadFromJsonString(content, getState(), notify)) {
            saveToLocalStorage(getState());
          }
        }
        // Reset file input so user can reload same file if needed
        fileInput.value = '';
      };
      reader.readAsText(file);
    });
  }

  // 4. Save to disk action
  if (saveItem) {
    saveItem.addEventListener('click', () => {
      closeAppMenu();
      saveCanvasToFile();
    });
  }
 // Save the current drawing to the cloud.
if (saveCloudItem) {
    saveCloudItem.addEventListener('click', async () => {
        closeAppMenu();

        const title = window.prompt(
            'Enter a name for your cloud drawing:',
            activeCloudDrawingTitle
        );

        if (title === null) {
            return;
        }

        if (!title.trim()) {
            window.alert('Please enter a drawing title.');
            return;
        }

        try {
            const state = getState();
            let savedDrawing;

            if (activeCloudDrawingId) {
                // An ID exists, so update the existing drawing.
                savedDrawing = await updateCloudDrawing(
                    activeCloudDrawingId,
                    state,
                    title.trim()
                );

                window.alert(
                    `Drawing updated successfully!\nID: ${savedDrawing.id}`
                );

            } else {
                // No ID exists, so create a new drawing.
                savedDrawing = await createCloudDrawing(
                    state,
                    title.trim()
                );

                window.alert(
                    `Drawing saved successfully!\nID: ${savedDrawing.id}`
                );
            }

            // Remember the ID and title only after a successful save.
            activeCloudDrawingId = savedDrawing.id;
            activeCloudDrawingTitle = savedDrawing.title;

            localStorage.setItem(
                CLOUD_DRAWING_ID_KEY,
                activeCloudDrawingId
            );

            localStorage.setItem(
                CLOUD_DRAWING_TITLE_KEY,
                activeCloudDrawingTitle
            );

            console.log('Cloud drawing saved:', savedDrawing);

        } catch (error) {
            console.error('Cloud save failed:', error);

            window.alert(
                `Could not save drawing: ${error.message}`
            );
        }
    });
}

// Load a saved drawing from the cloud.
if (loadCloudItem) {
    loadCloudItem.addEventListener('click', async () => {
        closeAppMenu();

        const id = window.prompt(
            'Enter the ID of the cloud drawing to load:'
        );

        // Stop if the user cancels.
        if (id === null) {
            return;
        }

        const drawingId = id.trim();

        if (!drawingId) {
            window.alert('Please enter a drawing ID.');
            return;
        }

        try {
            // Fetch the saved drawing from Spring Boot.
            const cloudDrawing = await getCloudDrawing(drawingId);

            // Check that the response contains valid scene data.
            if (!Array.isArray(cloudDrawing.sceneData?.elements)) {
                throw new Error('The saved drawing has invalid scene data.');
            }

            // Adapt the cloud response to the format
            // expected by the existing JSON-loading function.
            const excalidrawData = JSON.stringify({
                type: 'excalidraw',
                version: 2,
                source: 'ExaCollab',
                elements: cloudDrawing.sceneData.elements,
                appState: cloudDrawing.sceneData.appState || {}
            });

            // Restore the drawing into the existing application state.
            const loaded = loadFromJsonString(
                excalidrawData,
                getState(),
                notify
            );

            if (!loaded) {
                return;
            }

            // Preserve the existing local autosave behavior.
            saveToLocalStorage(getState());

            // Remember which cloud drawing is currently open.
            activeCloudDrawingId = cloudDrawing.id;
            activeCloudDrawingTitle =
                cloudDrawing.title || 'Untitled drawing';

            localStorage.setItem(
                CLOUD_DRAWING_ID_KEY,
                activeCloudDrawingId
            );

            localStorage.setItem(
                CLOUD_DRAWING_TITLE_KEY,
                activeCloudDrawingTitle
            );

            window.alert(
                `Loaded "${activeCloudDrawingTitle}" successfully!`
            );

            console.log('Loaded cloud drawing:', cloudDrawing);

        } catch (error) {
            console.error('Cloud load failed:', error);

            window.alert(
                `Could not load drawing: ${error.message}`
            );
        }
    });
}
  // 5. Export image modal action
  if (exportItem) {
    exportItem.addEventListener('click', () => {
      closeAppMenu();
      openExportDialog();
    });
  }

  // 6. Quick export button in top-right
  if (quickExportBtn) {
    quickExportBtn.addEventListener('click', () => {
      openExportDialog();
    });
  }

  // 7. Reset canvas action with confirmation dialog
  if (resetItem) {
    resetItem.addEventListener('click', () => {
      closeAppMenu();
      const state = getState();
      if (state.elements.length === 0) return;

      const confirmed = window.confirm('Reset canvas? This will clear all drawing elements (action can be undone with Ctrl+Z).');
      if (confirmed) {
        resetCanvas();
        clearLocalStorage();
      }
    });
  }

  // 8. Close dropdown when clicking outside
  document.addEventListener('click', event => {
    if (isMenuOpen && dropdown && menuBtn) {
      if (!dropdown.contains(event.target) && !menuBtn.contains(event.target)) {
        closeAppMenu();
      }
    }
  });

  // 9. Close dropdown on Escape key
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && isMenuOpen) {
      closeAppMenu();
    }
  });

  isInitialized = true;
  console.log('[Topbar] Hamburger menu and topbar actions initialized.');
}
