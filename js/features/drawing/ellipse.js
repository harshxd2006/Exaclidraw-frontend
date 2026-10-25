// ============================================================================
// Ellipse Drawing Module
// Handles geometry creation and Canvas 2D rendering for ellipses and circles.
// ============================================================================

import { createElement } from '../../core/element-factory.js';

// Creates an ellipse element object with the given coordinates and styling options.
export function createEllipse(x, y, width, height, options = {}) {
  return createElement('ellipse', {
    x,
    y,
    width,
    height,
    ...options
  });
}

// Draws an ellipse onto a 2D canvas context using center and radius calculations.
export function drawEllipse(ctx, element) {
  const hasFill = element.backgroundColor && element.backgroundColor !== 'transparent' && element.fillStyle !== 'transparent';

  // Calculate half-dimensions (horizontal and vertical radii).
  const radiusX = Math.abs(element.width) / 2;
  const radiusY = Math.abs(element.height) / 2;

  // Calculate center coordinates.
  const centerX = element.x + radiusX;
  const centerY = element.y + radiusY;

  ctx.beginPath();
  // Draw complete 360-degree ellipse path (0 to 2*PI radians).
  ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);

  // Fill interior if background color is defined.
  if (hasFill) {
    if (element.fillStyle === 'semi') {
      ctx.save();
      ctx.globalAlpha = ctx.globalAlpha * 0.25;
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fill();
    }
  }

  // Stroke the perimeter border.
  ctx.stroke();
}
