// ============================================================================
// Line Drawing Module
// Handles geometry creation and Canvas 2D rendering for straight and multi-point lines.
// ============================================================================

import { createElement } from '../../core/element-factory.js';

// Creates a line element object with start and end coordinates.
export function createLine(startX, startY, endX, endY, options = {}) {
  const dx = endX - startX;
  const dy = endY - startY;

  return createElement('line', {
    x: startX,
    y: startY,
    width: dx,
    height: dy,
    points: [[0, 0], [dx, dy]],
    ...options
  });
}

// Draws a line onto the canvas using its origin and point offsets.
export function drawLine(ctx, element) {
  ctx.beginPath();

  // If the line has explicit point segments, connect them sequentially.
  if (element.points && element.points.length > 1) {
    const firstPoint = element.points[0];
    ctx.moveTo(element.x + firstPoint[0], element.y + firstPoint[1]);

    for (let i = 1; i < element.points.length; i++) {
      const pt = element.points[i];
      ctx.lineTo(element.x + pt[0], element.y + pt[1]);
    }
  } else {
    // Fallback: simple line from (x, y) to (x + width, y + height).
    ctx.moveTo(element.x, element.y);
    ctx.lineTo(element.x + element.width, element.y + element.height);
  }

  ctx.stroke();
}
