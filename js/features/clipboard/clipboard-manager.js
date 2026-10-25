// ============================================================================
// Clipboard Manager Module (Copy, Paste, Cut)
// Handles element serialization, system clipboard synchronization, and offset placement.
// Reference: packages/excalidraw/clipboard.ts in Excalidraw
// ============================================================================

import { generateId, createElement } from '../../core/element-factory.js';
import { cloneElements, recordSnapshot } from '../history/history-manager.js';
import { measureText } from '../drawing/text.js';

// Internal fallback clipboard storage in memory.
let internalClipboardElements = [];
let pasteStepCount = 0;

// Returns whether there are currently elements stored in the in-memory clipboard.
export function hasClipboardData() {
  return internalClipboardElements.length > 0;
}

// Deep-copies the currently selected elements into the clipboard.
export function copySelectedElements(state) {
  const selectedIds = state.selectedElementIds || {};
  const selectedElements = state.elements.filter(
    el => selectedIds[el.id] && !el.isDeleted
  );

  if (selectedElements.length === 0) {
    return false;
  }

  // Deep-clone selected elements into in-memory clipboard
  internalClipboardElements = cloneElements(selectedElements);
  pasteStepCount = 0;

  // Sync to system clipboard as JSON payload
  const clipboardPayload = {
    type: 'excalidraw/clipboard',
    version: 2,
    elements: internalClipboardElements
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(JSON.stringify(clipboardPayload)).catch(err => {
      console.warn('[Clipboard] System clipboard write failed (using internal fallback):', err);
    });
  }

  console.log(`[Clipboard] Copied ${selectedElements.length} element(s).`);
  return true;
}

// Cuts selected elements: copies them and removes them from the scene.
export function cutSelectedElements(state, deleteFn) {
  const copied = copySelectedElements(state);
  if (copied && typeof deleteFn === 'function') {
    deleteFn();
    return true;
  }
  return false;
}

// Pastes elements from clipboard into the scene with new IDs and calculated coordinates.
export function pasteElements(state, options = {}) {
  const sourceElements = options.sourceElements || internalClipboardElements;
  if (!sourceElements || sourceElements.length === 0) {
    return false;
  }

  // 1. Record snapshot for undo history before inserting new elements
  recordSnapshot(state);

  // 2. Compute bounding box of source elements
  let minX = Infinity;
  let minY = Infinity;
  for (const el of sourceElements) {
    if (el.x < minX) minX = el.x;
    if (el.y < minY) minY = el.y;
  }

  // 3. Determine positioning offset
  let offsetX = 0;
  let offsetY = 0;

  if (options.targetScenePos && Number.isFinite(options.targetScenePos.x) && Number.isFinite(options.targetScenePos.y)) {
    // Position at target scene coordinates (e.g. cursor or context menu click)
    offsetX = Math.round(options.targetScenePos.x - minX);
    offsetY = Math.round(options.targetScenePos.y - minY);
  } else {
    // Cascading offset for repeated keyboard pastes (Ctrl+V)
    pasteStepCount += 1;
    offsetX = 20 * pasteStepCount;
    offsetY = 20 * pasteStepCount;
  }

  // 4. Create new cloned elements with unique IDs, shifted coordinates, and new random seeds
  const newElements = [];
  const newSelectedIds = [];

  for (const source of sourceElements) {
    const newId = generateId();
    const cloned = {
      ...source,
      id: newId,
      x: Math.round(source.x + offsetX),
      y: Math.round(source.y + offsetY),
      seed: Math.floor(Math.random() * 2147483647),
      version: 1,
      isDeleted: false
    };

    if (Array.isArray(source.points)) {
      cloned.points = source.points.map(pt => [...pt]);
    }

    newElements.push(cloned);
    newSelectedIds.push(newId);
  }

  // 5. Append new elements to scene and select them
  state.elements.push(...newElements);
  state.selectedElementIds = {};
  for (const id of newSelectedIds) {
    state.selectedElementIds[id] = true;
  }

  console.log(`[Clipboard] Pasted ${newElements.length} element(s).`);
  return true;
}

// Pastes arbitrary plain text as a new text element into the scene.
export function pasteTextAsElement(state, text, targetScenePos = null) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return false;
  }

  recordSnapshot(state);

  // Measure text dimensions
  const fontSize = 20;
  const fontFamily = 1;
  const lineHeight = 1.25;
  const measured = measureText(text, fontSize, fontFamily, lineHeight);

  // Determine placement position
  let posX = 100;
  let posY = 100;

  if (targetScenePos && Number.isFinite(targetScenePos.x) && Number.isFinite(targetScenePos.y)) {
    posX = Math.round(targetScenePos.x);
    posY = Math.round(targetScenePos.y);
  } else if (state.viewport) {
    // Place near center of current viewport
    posX = Math.round(-state.viewport.scrollX + (window.innerWidth / (2 * state.viewport.zoom)) - (measured.width / 2));
    posY = Math.round(-state.viewport.scrollY + (window.innerHeight / (2 * state.viewport.zoom)) - (measured.height / 2));
  }

  const textElement = createElement('text', {
    x: posX,
    y: posY,
    width: measured.width,
    height: measured.height,
    text: text,
    fontSize: fontSize,
    fontFamily: fontFamily,
    lineHeight: lineHeight,
    strokeColor: state.elementProperties.strokeColor || '#1e1e24'
  });

  state.elements.push(textElement);
  state.selectedElementIds = { [textElement.id]: true };

  console.log('[Clipboard] Pasted plain text as new text element:', textElement.id);
  return true;
}

// Handles the global system paste event (window paste listener).
export function handleSystemPaste(event, state, notify, targetScenePos = null) {
  // If user is focused on an input or textarea, let native paste occur
  const active = document.activeElement;
  if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
    return;
  }

  event.preventDefault();

  const clipboardData = event.clipboardData || window.clipboardData;
  if (clipboardData) {
    const rawText = clipboardData.getData('text/plain');

    // 1. Try parsing Excalidraw JSON payload
    if (rawText) {
      try {
        const parsed = JSON.parse(rawText);
        if (parsed && parsed.type === 'excalidraw/clipboard' && Array.isArray(parsed.elements) && parsed.elements.length > 0) {
          internalClipboardElements = cloneElements(parsed.elements);
          const success = pasteElements(state, { sourceElements: internalClipboardElements, targetScenePos });
          if (success && typeof notify === 'function') {
            notify();
          }
          return;
        }
      } catch (err) {
        // Not JSON, continue to plain text handling
      }

      // 2. Paste plain text from external source as a new Text element
      const success = pasteTextAsElement(state, rawText, targetScenePos);
      if (success && typeof notify === 'function') {
        notify();
      }
      return;
    }
  }

  // 3. Fallback to in-memory internal clipboard
  const success = pasteElements(state, { targetScenePos });
  if (success && typeof notify === 'function') {
    notify();
  }
}
