// ============================================================================
// Pencil Drawing Controller Module
// Initializes and streams new points into active freehand strokes.
// ============================================================================

import { createElement } from '../../core/element-factory.js';

// Creates a new freehand pencil stroke element starting at (startX, startY).
export function createPencilStroke(startX, startY, options = {}) {
  return createElement('freedraw', {
    x: startX,
    y: startY,
    width: 0,
    height: 0,
    points: [[0, 0]],
    ...options
  });
}

// Appends a new scene position point to the active pencil stroke if it moved sufficiently.
export function addPencilPoint(element, currentX, currentY) {
  const relativeX = currentX - element.x;
  const relativeY = currentY - element.y;

  const points = element.points || [];

  // Filter out redundant points that are too close to the previous point (< 1.5px) for performance.
  if (points.length > 0) {
    const lastPoint = points[points.length - 1];
    const dx = relativeX - lastPoint[0];
    const dy = relativeY - lastPoint[1];
    if (dx * dx + dy * dy < 2.25) { // 1.5 * 1.5 = 2.25
      return element;
    }
  }

  return {
    ...element,
    points: [...points, [relativeX, relativeY]]
  };
}
