// ============================================================================
// Rectangle Drawing Module
// Handles geometry creation and Canvas 2D rendering for rectangles.
// ============================================================================

import { createElement } from '../../core/element-factory.js';

// Creates a rectangle element object with the given coordinates and styling options.
export function createRectangle(x, y, width, height, options = {}) {
  return createElement('rectangle', {
    x,
    y,
    width,
    height,
    ...options
  });
}

// Draws a rectangle onto a 2D canvas context using its stored position, size, and styling.
export function drawRectangle(ctx, element) {
  const hasFill = element.backgroundColor && element.backgroundColor !== 'transparent' && element.fillStyle !== 'transparent';

  // 1. Fill the rectangle interior if a background color is defined.
  if (hasFill) {
    if (element.fillStyle === 'semi') {
      ctx.save();
      ctx.globalAlpha = ctx.globalAlpha * 0.25;
      ctx.fillRect(element.x, element.y, element.width, element.height);
      ctx.restore();
    } else {
      ctx.fillRect(element.x, element.y, element.width, element.height);
    }
  }

  // 2. Stroke the rectangle border.
  ctx.strokeRect(element.x, element.y, element.width, element.height);
}
