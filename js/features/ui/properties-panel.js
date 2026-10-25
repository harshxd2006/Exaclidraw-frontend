// ============================================================================
// Element Properties Panel Controller Module
// Controls the floating sidebar for editing shape colors, strokes, opacity, and text.
// ============================================================================

import {
  getState,
  subscribe,
  setElementProperty,
  deleteSelectedElements,
  duplicateSelectedElements,
  sendBackward,
  bringForward,
  sendToBack,
  bringToFront,
  copySelected,
  cutSelected,
  groupSelectedElements,
  ungroupSelectedElements,
  alignSelectedLeft,
  alignSelectedRight,
  alignSelectedCenterHorizontal,
  alignSelectedTop,
  alignSelectedBottom,
  alignSelectedCenterVertical,
  distributeSelectedHorizontal,
  distributeSelectedVertical
} from '../../core/state.js';
import { canGroupSelection, canUngroupSelection } from '../groups/group-manager.js';

// Tools that expose stroke/fill defaults before anything is drawn on the canvas.
const STYLE_DEFAULT_TOOLS = new Set([
  'rectangle',
  'diamond',
  'ellipse',
  'line',
  'arrow',
  'freedraw',
  'text'
]);

function isDefaultStyleMode(state) {
  const selectedIds = Object.keys(state.selectedElementIds);
  return selectedIds.length === 0 && STYLE_DEFAULT_TOOLS.has(state.activeTool.type);
}

function normalizeColorValue(color) {
  if (typeof color !== 'string') return '';
  return color.toLowerCase();
}

/** Syncs preset swatches and the custom picker for one color property. */
function syncColorControl(panel, property, colorValue, pickerInputId) {
  const normalized = normalizeColorValue(colorValue);
  let matchedPreset = false;

  panel.querySelectorAll(`[data-property="${property}"] .color-swatch`).forEach(swatch => {
    const swatchColor = normalizeColorValue(swatch.dataset.color);
    const isMatch =
      swatchColor === normalized ||
      (normalized === 'transparent' && swatchColor === 'transparent');
    swatch.classList.toggle('active', isMatch);
    if (isMatch) matchedPreset = true;
  });

  const picker = document.getElementById(pickerInputId);
  const pickerLabel = picker?.closest('.color-picker-label');
  if (picker && normalized.startsWith('#')) {
    picker.value = colorValue;
  }
  if (pickerLabel) {
    pickerLabel.classList.toggle('active', !matchedPreset && normalized.startsWith('#'));
    pickerLabel.classList.toggle('has-custom-color', !matchedPreset && normalized.startsWith('#'));
    pickerLabel.style.backgroundColor = !matchedPreset && normalized.startsWith('#') ? colorValue : '';
  }
}

// Syncs all UI controls (swatches, button groups, slider) with current state.
export function syncPropertiesPanelUI(state) {
  const panel = document.getElementById('properties-panel-container');
  if (!panel || !panel.querySelector('.properties-panel')) {
    return;
  }

  const selectedIds = Object.keys(state.selectedElementIds);
  const defaultStyleMode = isDefaultStyleMode(state);

  // Show when elements are selected, or when a drawing tool needs default style controls.
  if (selectedIds.length === 0 && !defaultStyleMode) {
    panel.style.opacity = '0';
    panel.style.pointerEvents = 'none';
    panel.style.transform = 'translateX(-8px)';
    panel.dataset.visible = 'false';
    return;
  }

  panel.style.opacity = '1';
  panel.style.pointerEvents = 'auto'; // must override .ui-layer { pointer-events: none }
  panel.style.transform = 'translateX(0)';
  panel.dataset.visible = 'true';

  const titleEl = document.getElementById('prop-panel-title');
  const strokeLabel = document.getElementById('stroke-label');
  const textGroup = document.getElementById('prop-group-text');
  const bgGroup = document.getElementById('prop-group-bg');
  const fillStyleGroup = document.getElementById('prop-group-fill-style');
  const strokeWidthGroup = document.getElementById('prop-group-stroke-width');
  const strokeStyleGroup = document.getElementById('prop-group-stroke-style');
  const roughnessGroup = document.getElementById('prop-group-roughness');
  const opacityGroup = document.getElementById('prop-group-opacity');
  const layersGroup = document.getElementById('prop-group-layers');
  const copyBtn = document.getElementById('prop-action-copy');
  const cutBtn = document.getElementById('prop-action-cut');
  const duplicateBtn = document.getElementById('prop-action-duplicate');
  const deleteBtn = document.getElementById('prop-action-delete');

  let activeProps = { ...state.elementProperties };
  let hasTextElement = false;
  let allTextElements = false;
  let hasFillableElement = true;
  let hasStrokableElement = true;

  if (titleEl) {
    if (defaultStyleMode) {
      titleEl.textContent = 'Default Style';
    } else {
      titleEl.textContent = selectedIds.length === 1 ? 'Element Style' : `${selectedIds.length} Selected`;
    }
  }

  const selectionActionsEnabled = !defaultStyleMode && selectedIds.length > 0;
  [copyBtn, cutBtn, duplicateBtn, deleteBtn].forEach(btn => {
    if (!btn) return;
    btn.style.opacity = selectionActionsEnabled ? '1' : '0.35';
    btn.style.pointerEvents = selectionActionsEnabled ? 'auto' : 'none';
  });

  const groupBtn = document.getElementById('prop-action-group');
  const ungroupBtn = document.getElementById('prop-action-ungroup');
  [groupBtn, ungroupBtn].forEach(btn => {
    if (!btn) return;
    btn.style.opacity = selectionActionsEnabled ? '1' : '0.35';
    btn.style.pointerEvents = selectionActionsEnabled ? 'auto' : 'none';
  });

  // Default style for the active drawing tool (no selection yet).
  if (defaultStyleMode) {
    const tool = state.activeTool.type;
    activeProps = {
      strokeColor: state.elementProperties.strokeColor,
      backgroundColor: state.elementProperties.backgroundColor,
      fillStyle: state.elementProperties.fillStyle || 'solid',
      strokeWidth: state.elementProperties.strokeWidth,
      strokeStyle: state.elementProperties.strokeStyle || 'solid',
      roughness: state.elementProperties.roughness,
      opacity: state.elementProperties.opacity,
      fontFamily: state.elementProperties.fontFamily || 1,
      fontSize: state.elementProperties.fontSize || 20,
      textAlign: state.elementProperties.textAlign || 'left'
    };
    hasTextElement = tool === 'text';
    allTextElements = tool === 'text';
    hasFillableElement = ['rectangle', 'diamond', 'ellipse'].includes(tool);
    hasStrokableElement = tool !== 'text';
  }

  // Inspect selected elements to determine text and shape capabilities
  const selectedElements = state.elements.filter(el => state.selectedElementIds[el.id]);
  if (!defaultStyleMode && selectedElements.length > 0) {
    const primary = selectedElements[0];
    activeProps = {
      strokeColor: primary.strokeColor || state.elementProperties.strokeColor,
      backgroundColor: primary.backgroundColor || state.elementProperties.backgroundColor,
      fillStyle: primary.fillStyle || state.elementProperties.fillStyle || 'solid',
      strokeWidth: primary.strokeWidth !== undefined ? primary.strokeWidth : state.elementProperties.strokeWidth,
      strokeStyle: primary.strokeStyle || state.elementProperties.strokeStyle || 'solid',
      roughness: primary.roughness !== undefined ? primary.roughness : state.elementProperties.roughness,
      opacity: primary.opacity !== undefined ? primary.opacity : state.elementProperties.opacity,
      fontFamily: primary.fontFamily || 1,
      fontSize: primary.fontSize || 20,
      textAlign: primary.textAlign || 'left'
    };

    hasTextElement = selectedElements.some(el => el.type === 'text');
    allTextElements = selectedElements.every(el => el.type === 'text');
    hasFillableElement = selectedElements.some(el => ['rectangle', 'ellipse', 'diamond'].includes(el.type));
    hasStrokableElement = selectedElements.some(el => ['rectangle', 'ellipse', 'diamond', 'line', 'arrow', 'freedraw'].includes(el.type));
  }

  // 1. Context-aware section display:
  if (allTextElements) {
    if (strokeLabel) strokeLabel.textContent = 'Text Color';
    if (textGroup) textGroup.style.display = 'flex';
    if (bgGroup) bgGroup.style.display = 'none';
    if (fillStyleGroup) fillStyleGroup.style.display = 'none';
    if (strokeWidthGroup) strokeWidthGroup.style.display = 'none';
    if (strokeStyleGroup) strokeStyleGroup.style.display = 'none';
    if (roughnessGroup) roughnessGroup.style.display = 'none';
    if (opacityGroup) opacityGroup.style.display = 'flex';
  } else {
    if (strokeLabel) strokeLabel.textContent = hasTextElement ? 'Color / Stroke' : 'Stroke';
    if (textGroup) textGroup.style.display = hasTextElement ? 'flex' : 'none';
    if (bgGroup) bgGroup.style.display = hasFillableElement ? 'flex' : 'none';
    if (fillStyleGroup) fillStyleGroup.style.display = hasFillableElement ? 'flex' : 'none';
    if (strokeWidthGroup) strokeWidthGroup.style.display = hasStrokableElement ? 'flex' : 'none';
    if (strokeStyleGroup) strokeStyleGroup.style.display = 'flex';
    if (roughnessGroup) roughnessGroup.style.display = 'flex';
    if (opacityGroup) opacityGroup.style.display = 'flex';
  }

  // Layer ordering group is visible only when elements are selected
  if (layersGroup) {
    layersGroup.style.display = !defaultStyleMode && selectedIds.length > 0 ? 'flex' : 'none';
  }

  // Alignment group is visible only when 2+ elements are selected
  const alignGroup = document.getElementById('prop-group-align');
  if (alignGroup) {
    alignGroup.style.display = !defaultStyleMode && selectedIds.length >= 2 ? 'flex' : 'none';
  }

  // 2. Sync Color Swatches & custom pickers
  syncColorControl(panel, 'strokeColor', activeProps.strokeColor, 'stroke-color-picker');
  syncColorControl(panel, 'backgroundColor', activeProps.backgroundColor, 'bg-color-picker');

  // 3. Sync Button Groups (Fill Style, Stroke Width, Stroke Style, Roughness, Font Family, Font Size, Text Align)
  const buttonGroups = panel.querySelectorAll('.button-group[data-property]');
  buttonGroups.forEach(group => {
    const propName = group.dataset.property;
    const currentVal = String(activeProps[propName]);
    const buttons = group.querySelectorAll('.prop-btn');

    // Font size: highlight closest standard button (16, 20, 28, 36)
    if (propName === 'fontSize') {
      const valNum = Number(currentVal);
      let closestBtn = null;
      let closestDiff = Infinity;
      buttons.forEach(btn => {
        const btnVal = Number(btn.dataset.value);
        const diff = Math.abs(btnVal - valNum);
        if (diff < closestDiff) {
          closestDiff = diff;
          closestBtn = btn;
        }
      });
      buttons.forEach(btn => {
        btn.classList.toggle('active', btn === closestBtn);
      });
      return;
    }

    buttons.forEach(btn => {
      btn.classList.toggle('active', String(btn.dataset.value) === currentVal);
    });
  });

  // 4. Sync Opacity Slider & Badge
  const slider = document.getElementById('opacity-slider');
  const label = document.getElementById('opacity-value-label');
  const opacityVal = activeProps.opacity !== undefined ? activeProps.opacity : 100;
  if (slider) {
    slider.value = opacityVal;
  }
  if (label) {
    label.textContent = `${opacityVal}%`;
  }
}

let isInitialized = false;

// Binds user interaction event listeners to the properties panel DOM elements.
export function initPropertiesPanel() {
  if (isInitialized) {
    syncPropertiesPanelUI(getState());
    return;
  }
  const panel = document.getElementById('properties-panel-container');
  if (!panel) {
    console.error('[PropertiesPanel] #properties-panel-container not found.');
    return;
  }
  isInitialized = true;

  // 1. Color Swatch Clicks (Stroke & Background)
  panel.addEventListener('click', event => {
    const swatch = event.target.closest('.color-swatch');
    if (!swatch) {
      return;
    }

    const palette = swatch.closest('.color-palette');
    if (!palette) {
      return;
    }

    const propName = palette.dataset.property;
    const color = swatch.dataset.color;
    if (propName && color) {
      setElementProperty(propName, color);
    }
  });

  // 2. Custom Color Picker Inputs
  const strokePicker = document.getElementById('stroke-color-picker');
  if (strokePicker) {
    strokePicker.addEventListener('input', e => {
      setElementProperty('strokeColor', e.target.value);
    });
  }

  const bgPicker = document.getElementById('bg-color-picker');
  if (bgPicker) {
    bgPicker.addEventListener('input', e => {
      setElementProperty('backgroundColor', e.target.value);
      setElementProperty('fillStyle', 'solid');
    });
  }

  // 3. Button Groups (Stroke width, dash style, fill style, roughness, fonts, align)
  panel.addEventListener('click', event => {
    const btn = event.target.closest('.prop-btn');
    if (!btn) {
      return;
    }

    const group = btn.closest('.button-group');
    if (!group) {
      return;
    }

    const propName = group.dataset.property;
    let value = btn.dataset.value;
    if (!propName || value === undefined) {
      return;
    }

    // Parse numeric properties
    if (['strokeWidth', 'roughness', 'fontFamily', 'fontSize'].includes(propName)) {
      value = Number(value);
    }

    setElementProperty(propName, value);
  });

  // 4. Opacity Slider
  const slider = document.getElementById('opacity-slider');
  const label = document.getElementById('opacity-value-label');
  if (slider) {
    slider.addEventListener('input', e => {
      const val = Number(e.target.value);
      if (label) {
        label.textContent = `${val}%`;
      }
      setElementProperty('opacity', val);
    });
  }

  // 5. Header Action Buttons (Copy, Cut, Duplicate & Delete)
  const copyBtn = document.getElementById('prop-action-copy');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      copySelected();
    });
  }

  const cutBtn = document.getElementById('prop-action-cut');
  if (cutBtn) {
    cutBtn.addEventListener('click', () => {
      cutSelected();
    });
  }

  const duplicateBtn = document.getElementById('prop-action-duplicate');
  if (duplicateBtn) {
    duplicateBtn.addEventListener('click', () => {
      duplicateSelectedElements();
    });
  }

  const deleteBtn = document.getElementById('prop-action-delete');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      deleteSelectedElements();
    });
  }

  // 6. Layer Ordering Action Buttons
  const sendBackBtn = document.getElementById('btn-layer-send-back');
  if (sendBackBtn) {
    sendBackBtn.addEventListener('click', () => {
      sendToBack();
    });
  }

  const sendBackwardBtn = document.getElementById('btn-layer-send-backward');
  if (sendBackwardBtn) {
    sendBackwardBtn.addEventListener('click', () => {
      sendBackward();
    });
  }

  const bringForwardBtn = document.getElementById('btn-layer-bring-forward');
  if (bringForwardBtn) {
    bringForwardBtn.addEventListener('click', () => {
      bringForward();
    });
  }

  const bringFrontBtn = document.getElementById('btn-layer-bring-front');
  if (bringFrontBtn) {
    bringFrontBtn.addEventListener('click', () => {
      bringToFront();
    });
  }

  // 7. Alignment Action Buttons (shown when 2+ elements are selected)
  const alignMap = [
    ['btn-align-left',       alignSelectedLeft],
    ['btn-align-center-h',   alignSelectedCenterHorizontal],
    ['btn-align-right',      alignSelectedRight],
    ['btn-align-top',        alignSelectedTop],
    ['btn-align-center-v',   alignSelectedCenterVertical],
    ['btn-align-bottom',     alignSelectedBottom],
    ['btn-distribute-h',     distributeSelectedHorizontal],
    ['btn-distribute-v',     distributeSelectedVertical],
  ];
  for (const [id, fn] of alignMap) {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', () => fn());
    }
  }

  // 8. Subscribe to application state changes to keep controls synchronized
  subscribe(state => {
    syncPropertiesPanelUI(state);
  });

  // Initial synchronization
  syncPropertiesPanelUI(getState());
  console.log('[PropertiesPanel] Successfully initialized.');
}
