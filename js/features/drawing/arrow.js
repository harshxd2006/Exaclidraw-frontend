// ============================================================================
// Arrow Drawing Module
// Handles geometry creation and Canvas 2D rendering for directional arrows.
// ============================================================================

import { createElement } from '../../core/element-factory.js';

// Creates an arrow element object with start and end coordinates.
export function createArrow(startX, startY, endX, endY, options = {}) {
  const dx = endX - startX;
  const dy = endY - startY;

  return createElement('arrow', {
    x: startX,
    y: startY,
    width: dx,
    height: dy,
    points: [[0, 0], [dx, dy]],
    endArrowhead: 'arrow',
    ...options
  });
}

// Draws the arrow shaft line and the angled arrowhead tip.
export function drawArrow(ctx, element) {
  const points = element.points && element.points.length > 1
    ? element.points
    : [[0, 0], [element.width, element.height]];
  const first = points[0];
  const previous = points[points.length - 2];
  const last = points[points.length - 1];
  const startX = element.x + first[0];
  const startY = element.y + first[1];
  const previousX = element.x + previous[0];
  const previousY = element.y + previous[1];
  const endX = element.x + last[0];
  const endY = element.y + last[1];

  // 1. Draw every segment so midpoint bends reshape the arrow immediately.
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(element.x + points[i][0], element.y + points[i][1]);
  }
  ctx.stroke();

  // 2. Aim the arrowhead along the last segment, not the original start point.
  drawArrowheadTip(ctx, previousX, previousY, endX, endY, element.strokeWidth);
}

// Renders the two barb arms of the arrowhead at the specified tip coordinate.
function drawArrowheadTip(ctx, startX, startY, tipX, tipY, strokeWidth) {
  // Calculate the angle of the arrow line segment.
  const angle = Math.atan2(tipY - startY, tipX - startX);

  // Arrowhead arm length scales with stroke thickness.
  const arrowLength = Math.max(16, (strokeWidth || 2) * 8);
  const barbSpreadAngle = Math.PI / 6.5; // ~27 degrees spread for crisp appearance

  // Calculate coordinates for the two backwards-pointing arrowhead arms.
  const arm1X = tipX - arrowLength * Math.cos(angle - barbSpreadAngle);
  const arm1Y = tipY - arrowLength * Math.sin(angle - barbSpreadAngle);

  const arm2X = tipX - arrowLength * Math.cos(angle + barbSpreadAngle);
  const arm2Y = tipY - arrowLength * Math.sin(angle + barbSpreadAngle);

  // Stroke the open arrowhead arms.
  ctx.beginPath();
  ctx.moveTo(arm1X, arm1Y);
  ctx.lineTo(tipX, tipY);
  ctx.lineTo(arm2X, arm2Y);
  ctx.stroke();
}
