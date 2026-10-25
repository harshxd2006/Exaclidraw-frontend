// ============================================================================
// Export Dialog UI Controller Module
// Controls the modal dialog for PNG/SVG live preview, configuration, and download.
// Reference: packages/excalidraw/components/ExportDialog.tsx in Excalidraw
// ============================================================================

import { getState } from '../../core/state.js';
import { exportToCanvas, downloadPng, copyPngToClipboard } from '../export/export-png.js';
import { exportToSvgString, downloadSvg } from '../export/export-svg.js';

let isDialogOpen = false;

// Active export dialog configuration
const exportConfig = {
  format: 'png',            // 'png' | 'svg'
  scale: 2,                 // 1 | 2 | 3
  withBackground: true,     // boolean
  selectedOnly: false       // boolean
};

// Returns elements to be exported based on current configuration and state.
function getElementsForExport() {
  const state = getState();
  const selectedIds = state.selectedElementIds || {};

  if (exportConfig.selectedOnly && Object.keys(selectedIds).length > 0) {
    return state.elements.filter(el => selectedIds[el.id] && !el.isDeleted);
  }

  return state.elements.filter(el => !el.isDeleted);
}

// Updates the live preview thumbnail in the export modal.
export function updateExportPreview() {
  const previewImg = document.getElementById('export-preview-img');
  if (!previewImg || !isDialogOpen) return;

  const state = getState();
  const elements = getElementsForExport();

  if (elements.length === 0) {
    previewImg.src = '';
    return;
  }

  const options = {
    scale: 1, // Preview always renders at 1x for performance
    withBackground: exportConfig.withBackground,
    backgroundColor: state.viewBackgroundColor || '#ffffff',
    padding: 20
  };

  if (exportConfig.format === 'svg') {
    const svgStr = exportToSvgString(elements, options);
    previewImg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
  } else {
    const canvas = exportToCanvas(elements, options);
    previewImg.src = canvas.toDataURL('image/png');
  }
}

// Opens the Export Image dialog and computes initial preview.
export function openExportDialog() {
  const container = document.getElementById('dialogs-container');
  if (!container) return;

  const state = getState();
  const selectedCount = Object.keys(state.selectedElementIds || {}).length;

  // Manage visibility of "selected only" checkbox
  const selectedOnlyLabel = document.getElementById('lbl-export-selected-only');
  const selectedOnlyCheckbox = document.getElementById('chk-export-selected-only');
  if (selectedOnlyLabel && selectedOnlyCheckbox) {
    if (selectedCount > 0) {
      selectedOnlyLabel.style.display = 'flex';
      exportConfig.selectedOnly = true;
      selectedOnlyCheckbox.checked = true;
    } else {
      selectedOnlyLabel.style.display = 'none';
      exportConfig.selectedOnly = false;
      selectedOnlyCheckbox.checked = false;
    }
  }

  container.style.display = 'flex';
  isDialogOpen = true;

  updateExportPreview();
}

// Closes the Export Image dialog.
export function closeExportDialog() {
  const container = document.getElementById('dialogs-container');
  if (container) {
    container.style.display = 'none';
  }
  isDialogOpen = false;
}

// Returns whether the Export dialog is currently open.
export function isExportDialogOpen() {
  return isDialogOpen;
}

let isInitialized = false;

// Initializes DOM bindings and listeners for the Export Dialog.
export function initExportDialog() {
  if (isInitialized) return;

  const backdrop = document.getElementById('export-dialog-backdrop');
  const closeBtn = document.getElementById('btn-close-export');
  const downloadBtn = document.getElementById('btn-export-download');
  const downloadLabel = document.getElementById('btn-export-download-label');
  const copyBtn = document.getElementById('btn-export-copy-clipboard');
  const copyLabel = document.getElementById('btn-export-copy-label');
  const bgCheckbox = document.getElementById('chk-export-bg');
  const selectedOnlyCheckbox = document.getElementById('chk-export-selected-only');
  const scaleGroup = document.getElementById('group-export-scale');

  // Close handlers
  if (closeBtn) {
    closeBtn.addEventListener('click', closeExportDialog);
  }
  if (backdrop) {
    backdrop.addEventListener('click', event => {
      if (event.target === backdrop) {
        closeExportDialog();
      }
    });
  }

  // Escape hotkey dismisses dialog
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && isDialogOpen) {
      closeExportDialog();
    }
  });

  // 1. Format segmented control (PNG vs SVG)
  const formatButtons = document.querySelectorAll('#export-format-control .segment-btn');
  formatButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      formatButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      exportConfig.format = btn.dataset.format || 'png';

      // Hide scale buttons when SVG format is selected
      if (scaleGroup) {
        scaleGroup.style.display = exportConfig.format === 'svg' ? 'none' : 'flex';
      }

      // Update download button label
      if (downloadLabel) {
        downloadLabel.textContent = exportConfig.format === 'svg' ? 'Download SVG' : 'Download PNG';
      }

      // Hide copy to clipboard for SVG (only supported reliably for PNG)
      if (copyBtn) {
        copyBtn.style.display = exportConfig.format === 'svg' ? 'none' : 'flex';
      }

      updateExportPreview();
    });
  });

  // 2. Scale segmented control (1x, 2x, 3x)
  const scaleButtons = document.querySelectorAll('#export-scale-control .segment-btn');
  scaleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      scaleButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      exportConfig.scale = Number(btn.dataset.scale) || 2;
    });
  });

  // 3. Option checkboxes
  if (bgCheckbox) {
    bgCheckbox.addEventListener('change', () => {
      exportConfig.withBackground = bgCheckbox.checked;
      updateExportPreview();
    });
  }

  if (selectedOnlyCheckbox) {
    selectedOnlyCheckbox.addEventListener('change', () => {
      exportConfig.selectedOnly = selectedOnlyCheckbox.checked;
      updateExportPreview();
    });
  }

  // 4. Download trigger
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      const elements = getElementsForExport();
      const state = getState();

      const options = {
        scale: exportConfig.scale,
        withBackground: exportConfig.withBackground,
        backgroundColor: state.viewBackgroundColor || '#ffffff',
        padding: 30
      };

      if (exportConfig.format === 'svg') {
        downloadSvg(elements, options, 'drawing.svg');
      } else {
        downloadPng(elements, options, 'drawing.png');
      }

      closeExportDialog();
    });
  }

  // 5. Copy PNG to Clipboard
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const elements = getElementsForExport();
      const state = getState();

      const options = {
        scale: exportConfig.scale,
        withBackground: exportConfig.withBackground,
        backgroundColor: state.viewBackgroundColor || '#ffffff',
        padding: 30
      };

      try {
        if (copyLabel) copyLabel.textContent = 'Copying...';
        await copyPngToClipboard(elements, options);
        if (copyLabel) copyLabel.textContent = 'Copied to clipboard!';
        setTimeout(() => {
          if (copyLabel) copyLabel.textContent = 'Copy to clipboard';
        }, 2000);
      } catch (err) {
        console.error('[ExportDialog] Failed to copy PNG to clipboard:', err);
        if (copyLabel) copyLabel.textContent = 'Failed to copy';
        setTimeout(() => {
          if (copyLabel) copyLabel.textContent = 'Copy to clipboard';
        }, 2000);
      }
    });
  }

  isInitialized = true;
  console.log('[ExportDialog] Export modal initialized successfully.');
}
