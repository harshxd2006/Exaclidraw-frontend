// ============================================================================
// Inline Text Editor UI Module
// Manages the floating HTML textarea overlay for inline text creation & editing.
// References Excalidraw's TextEditor overlay in packages/excalidraw/components/TextEditor.tsx
// ============================================================================

import { getState, addElement, updateElement, setSelectedElementIds, recordSnapshot } from '../../core/state.js';
import { createElement } from '../../core/element-factory.js';
import { canvasElements } from '../../core/viewport.js';
import { getFontString, measureText } from '../drawing/text.js';
import { onShapeCommitted } from '../tools/tool-manager.js';

// Holds a reference to the active textarea DOM element while editing.
let activeTextarea = null;

// Holds configuration metadata for the element currently being edited.
let activeEditConfig = null;

// Flag to prevent double-commit when blur triggers while programmatically destroying.
let isCommitting = false;

// Captures outside presses before the canvas begins its next gesture, ensuring
// that clicking away always finishes the current text edit.
let activeOutsidePointerHandler = null;

function removeOutsidePointerHandler() {
  if (activeOutsidePointerHandler) {
    document.removeEventListener('pointerdown', activeOutsidePointerHandler, true);
    activeOutsidePointerHandler = null;
  }
}

// Returns true if the user is currently editing text inside the inline editor.
export function isEditingText() {
  return activeTextarea !== null;
}

// Returns the ID of the element currently being edited (if editing an existing element).
export function getEditingElementId() {
  return activeEditConfig && activeEditConfig.existingElement ? activeEditConfig.existingElement.id : null;
}

// Automatically recalculates and applies width and height to the active textarea.
// The transparent textarea is exactly the rendered text size, just like Excalidraw's
// inline editor. It has no border, padding, or visible background.
function autoResizeEditor(textarea, fontSize, fontFamily, lineHeight, zoom) {
  // Use a trailing space if value ends with newline so height expands immediately.
  let text = textarea.value;
  if (!text) {
    text = ' ';
  } else if (text.endsWith('\n')) {
    text += ' ';
  }

  const measured = measureText(text, fontSize, fontFamily, lineHeight);
  const scaledWidth  = measured.width  * zoom;
  const scaledHeight = measured.height * zoom;
  const lineH = Math.ceil(fontSize * lineHeight * zoom);

  const contentWidth = Math.max(Math.ceil(scaledWidth), Math.ceil(fontSize * zoom * 0.6));
  const contentHeight = Math.max(Math.ceil(scaledHeight), lineH);

  textarea.style.width = `${contentWidth}px`;
  textarea.style.height = `${contentHeight}px`;
}

// Spawns the inline text editor at the given scene position or over an existing element.
export function startTextEditor({ sceneX = 0, sceneY = 0, existingElement = null }) {
  // If an editor is already open, commit it before starting a new one.
  if (isEditingText()) {
    commitTextEditor();
  }

  const state = getState();
  const container = canvasElements.container;
  if (!container) {
    return;
  }

  // Determine if we are editing a line/arrow label vs. a text element.
  const isEditingExisting = existingElement !== null;
  const isLineLabel = isEditingExisting && (existingElement.type === 'line' || existingElement.type === 'arrow');

  // Determine editing properties (either from the existing element or state defaults).
  const initialText = isLineLabel
    ? (existingElement.label || '')
    : (isEditingExisting ? (existingElement.text || '') : '');

  let initialX, initialY;
  if (isLineLabel) {
    // Position the editor at the line midpoint.
    if (existingElement.points && existingElement.points.length >= 2) {
      const mid = Math.floor((existingElement.points.length - 1) / 2);
      const p1 = existingElement.points[mid];
      const p2 = existingElement.points[mid + 1];
      initialX = existingElement.x + (p1[0] + p2[0]) / 2;
      initialY = existingElement.y + (p1[1] + p2[1]) / 2;
    } else {
      initialX = existingElement.x + existingElement.width / 2;
      initialY = existingElement.y + existingElement.height / 2;
    }
  } else {
    initialX = isEditingExisting ? existingElement.x : sceneX;
    initialY = isEditingExisting ? existingElement.y : sceneY;
  }

  const fontSize    = isLineLabel ? (existingElement.labelFontSize || 14)
                    : isEditingExisting ? (existingElement.fontSize || 20)
                    : (state.elementProperties.fontSize || 20);
  const fontFamily  = isEditingExisting ? (existingElement.fontFamily || 1) : (state.elementProperties.fontFamily || 1);
  const lineHeight  = isLineLabel ? 1.25
                    : isEditingExisting ? (existingElement.lineHeight || 1.25)
                    : (state.elementProperties.lineHeight || 1.25);
  const textAlign   = isLineLabel ? 'center'
                    : isEditingExisting ? (existingElement.textAlign || 'left') : (state.elementProperties.textAlign || 'left');
  let strokeColor = isEditingExisting ? (existingElement.strokeColor || '#1e1e24') : (state.elementProperties.strokeColor || '#1e1e24');

  // The light-theme default charcoal is unreadable on this app's dark canvas.
  // Preserve every intentional custom colour, but use the dark-theme foreground
  // when the untouched default is being edited or created in dark mode.
  const isDarkTheme = document.documentElement.dataset.theme === 'dark';
  if (isDarkTheme && strokeColor.toLowerCase() === '#1e1e24') {
    strokeColor = '#eceae5';
  }

  activeEditConfig = {
    sceneX: initialX,
    sceneY: initialY,
    fontSize,
    fontFamily,
    lineHeight,
    textAlign,
    strokeColor,
    existingElement,
    isLineLabel
  };

  // Convert scene coordinates to canvas container pixel positions.
  const zoom = state.viewport.zoom;
  const canvasPixelX = (initialX + state.viewport.scrollX) * zoom;
  // For line labels, offset upward by half the font size so the editor sits above the midpoint.
  const labelYOffset = activeEditConfig.isLineLabel ? -(fontSize * zoom) / 2 : 0;
  const canvasPixelY = (initialY + state.viewport.scrollY) * zoom + labelYOffset;

  // Create the textarea overlay element.
  const textarea = document.createElement('textarea');
  textarea.className = 'canvas-text-editor';
  textarea.value = initialText;
  textarea.spellcheck = false;
  textarea.autocomplete = 'off';
  textarea.autocapitalize = 'off';
  textarea.setAttribute('autocorrect', 'off');
  textarea.setAttribute('data-gramm', 'false');
  textarea.setAttribute('data-gramm_editor', 'false');
  textarea.setAttribute('data-enable-grammarly', 'false');
  textarea.wrap = 'off';

  // Apply visual styling matching the target element and current viewport zoom.
  const scaledFontSize = Math.round(fontSize * zoom);
  textarea.style.left = `${canvasPixelX}px`;
  textarea.style.top = `${canvasPixelY}px`;
  textarea.style.font = getFontString(scaledFontSize, fontFamily);
  textarea.style.lineHeight = `${lineHeight}`;
  textarea.style.color = strokeColor;
  textarea.style.textAlign = textAlign;

  // For new text elements with center/right alignment, the canvas will render
  // text anchored at the clicked point. Use CSS transform so the textarea box
  // expands symmetrically from that anchor instead of always growing rightward.
  if (!isEditingExisting && !isLineLabel) {
    if (textAlign === 'center') {
      textarea.style.transformOrigin = 'top left';
      textarea.style.transform = 'translateX(-50%)';
    } else if (textAlign === 'right') {
      textarea.style.transformOrigin = 'top left';
      textarea.style.transform = 'translateX(-100%)';
    }
  }

  // Initial sizing.
  autoResizeEditor(textarea, fontSize, fontFamily, lineHeight, zoom);

  // Resize automatically as the user types.
  textarea.addEventListener('input', () => {
    autoResizeEditor(textarea, fontSize, fontFamily, lineHeight, zoom);
  });

  // Handle hotkeys: Escape to cancel, Ctrl+Enter or Cmd+Enter to commit immediately.
  textarea.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelTextEditor();
    } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      commitTextEditor();
    }
  });

  // Commit and close when clicking anywhere outside the editor.
  textarea.addEventListener('blur', () => {
    commitTextEditor();
  });

  // Append to container and capture focus.
  container.appendChild(textarea);
  activeTextarea = textarea;

  // A canvas click does not always transfer focus before its pointer handler
  // runs. Capture the press first so clicking anywhere outside writing commits.
  activeOutsidePointerHandler = event => {
    if (activeTextarea && !activeTextarea.contains(event.target)) {
      commitTextEditor();
    }
  };
  document.addEventListener('pointerdown', activeOutsidePointerHandler, true);

  // Select text if editing existing element; otherwise place caret at the end.
  setTimeout(() => {
    if (activeTextarea) {
      activeTextarea.focus();
      if (isEditingExisting) {
        activeTextarea.select();
      }
    }
  }, 10);
}

// Commits changes from the active textarea to the application state.
export function commitTextEditor() {
  if (!activeTextarea || isCommitting) {
    return;
  }

  isCommitting = true;

  const textValue = activeTextarea.value;
  const trimmed = textValue.trim();
  const config = activeEditConfig;

  // If text is not empty, measure and persist the element.
  if (trimmed.length > 0 && config) {
    const measured = measureText(textValue, config.fontSize, config.fontFamily, config.lineHeight);

    if (config.existingElement) {
      // ── Line/Arrow label editing ──
      if (config.isLineLabel) {
        const prev = config.existingElement.label || '';
        if (prev !== textValue) {
          recordSnapshot(getState());
        }
        updateElement(config.existingElement.id, { label: textValue });
        setSelectedElementIds([config.existingElement.id]);
      } else {
        // ── Regular text element editing ──
        if (config.existingElement.text !== textValue) {
          recordSnapshot(getState());
        }
        updateElement(config.existingElement.id, {
          text: textValue,
          width: measured.width,
          height: measured.height,
          strokeColor: config.strokeColor,
          isDeleted: false
        });
        setSelectedElementIds([config.existingElement.id]);
      }
    } else {
      // Create and commit a new text element.
      // For center/right aligned text, config.sceneX is the anchor point, not the left edge.
      // Adjust element.x so the text renders anchored at where the user clicked.
      let elementX = config.sceneX;
      if (config.textAlign === 'center') {
        elementX = config.sceneX - measured.width / 2;
      } else if (config.textAlign === 'right') {
        elementX = config.sceneX - measured.width;
      }

      const newElement = createElement('text', {
        x: elementX,
        y: config.sceneY,
        width: measured.width,
        height: measured.height,
        text: textValue,
        fontSize: config.fontSize,
        fontFamily: config.fontFamily,
        lineHeight: config.lineHeight,
        textAlign: config.textAlign,
        strokeColor: config.strokeColor
      });

      addElement(newElement);
      setSelectedElementIds([newElement.id]);

      // Switch back to selection mode unless tool locking is active.
      onShapeCommitted();
    }
  } else if (config && config.existingElement) {
    // If an existing text element was edited to be completely blank, mark it deleted.
    // For line labels, just clear the label (don't delete the line).
    if (config.isLineLabel) {
      updateElement(config.existingElement.id, { label: '' });
    } else {
      recordSnapshot(getState());
      updateElement(config.existingElement.id, { isDeleted: true });
      setSelectedElementIds([]);
    }
  }

  // Clean up and remove the DOM element.
  removeOutsidePointerHandler();
  if (activeTextarea.parentNode) {
    activeTextarea.parentNode.removeChild(activeTextarea);
  }

  activeTextarea = null;
  activeEditConfig = null;
  isCommitting = false;
}

// Cancels the current editing session without saving changes.
export function cancelTextEditor() {
  if (!activeTextarea) {
    return;
  }

  // Track whether we were creating a new element (not editing existing) before cleanup.
  const wasNewElement = activeEditConfig && !activeEditConfig.existingElement;

  // Remove the textarea from the DOM.
  removeOutsidePointerHandler();
  if (activeTextarea.parentNode) {
    activeTextarea.parentNode.removeChild(activeTextarea);
  }

  activeTextarea = null;
  activeEditConfig = null;
  isCommitting = false;

  // If cancelling a brand-new text element (not editing existing), switch back to selection.
  if (wasNewElement) {
    onShapeCommitted();
  }
}
