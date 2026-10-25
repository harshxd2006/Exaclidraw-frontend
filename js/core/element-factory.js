// ============================================================================
// Element Factory Module
// Creates new Excalidraw element objects with unique IDs and normalized coordinates.
// ============================================================================

import { DEFAULT_ELEMENT_PROPERTIES } from './element-model.js';

// Generates a short, unique random string ID for elements.
export function generateId() {
  const randomPart = Math.random().toString(36).substring(2, 10);
  const timePart = Date.now().toString(36).slice(-4);
  return `${randomPart}${timePart}`;
}

// Creates a new element object by merging defaults with provided properties.
export function createElement(type, options = {}) {
  const id = options.id || generateId();

  // Construct the base element matching Excalidraw's object structure.
  const element = {
    id,
    type,                                              // 'rectangle', 'ellipse', 'diamond', 'line', 'text', etc.
    x: options.x || 0,                                 // Top-left X in scene coordinates
    y: options.y || 0,                                 // Top-left Y in scene coordinates
    width: options.width || 0,                         // Shape width in scene coordinates
    height: options.height || 0,                       // Shape height in scene coordinates
    angle: options.angle || DEFAULT_ELEMENT_PROPERTIES.angle,
    strokeColor: options.strokeColor || DEFAULT_ELEMENT_PROPERTIES.strokeColor,
    backgroundColor: options.backgroundColor || DEFAULT_ELEMENT_PROPERTIES.backgroundColor,
    fillStyle: options.fillStyle || DEFAULT_ELEMENT_PROPERTIES.fillStyle,
    strokeWidth: options.strokeWidth || DEFAULT_ELEMENT_PROPERTIES.strokeWidth,
    strokeStyle: options.strokeStyle || DEFAULT_ELEMENT_PROPERTIES.strokeStyle,
    roughness: options.roughness !== undefined ? options.roughness : DEFAULT_ELEMENT_PROPERTIES.roughness,
    opacity: options.opacity !== undefined ? options.opacity : DEFAULT_ELEMENT_PROPERTIES.opacity,
    seed: Math.floor(Math.random() * 2147483647),     // Random seed for reproducible hand-drawn strokes
    version: 1,                                        // Incremented whenever the element is updated
    isDeleted: false,                                  // Soft-deletion flag
    isLocked: options.isLocked === true,               // Locked elements cannot be selected/moved/deleted
    isHidden: options.isHidden === true,               // Hidden elements are not rendered and not hit-tested
    groupIds: Array.isArray(options.groupIds) ? [...options.groupIds] : [] // Hierarchical group memberships
  };

  // Add type-specific defaults when needed.
  if (type === 'text') {
    element.text = options.text || '';
    element.fontSize = options.fontSize || 20;
    element.fontFamily = options.fontFamily || 1;     // 1 = Virgil/Caveat, 2 = Helvetica, 3 = Cascadia
    element.textAlign = options.textAlign || 'left';
  }

  if (type === 'line' || type === 'arrow') {
    element.points = options.points || [[0, 0], [element.width, element.height]];
    element.label         = options.label || '';           // Midpoint text label
    element.labelFontSize = options.labelFontSize || 14;   // Label font size
    element.labelColor    = options.labelColor || '';      // Label color (empty = inherits strokeColor)
  }

  return element;
}

// Creates an active draft element starting at the given scene position with zero dimensions.
export function createDraftElement(type, startX, startY, currentDefaults = {}) {
  return createElement(type, {
    x: startX,
    y: startY,
    width: 0,
    height: 0,
    ...currentDefaults
  });
}

// Normalizes an element so its width and height are always non-negative numbers.
// If dragged leftwards or upwards, adjusts (x, y) to the true top-left corner.
export function normalizeElementBounds(element) {
  let { x, y, width, height } = element;

  let newX = x;
  let newY = y;
  let newWidth = width;
  let newHeight = height;

  // If width is negative, the user dragged towards the left.
  if (width < 0) {
    newX = x + width;
    newWidth = Math.abs(width);
  }

  // If height is negative, the user dragged towards the top.
  if (height < 0) {
    newY = y + height;
    newHeight = Math.abs(height);
  }

  return {
    ...element,
    x: newX,
    y: newY,
    width: newWidth,
    height: newHeight
  };
}
