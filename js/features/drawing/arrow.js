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
  // Determine start and end coordinates.
  let startX = element.x;
  let startY = element.y;
  let endX = element.x + element.width;
  let endY = element.y + element.height;

  if (element.points && element.points.length > 1) {
    const first = element.points[0];
    const last = element.points[element.points.length - 1];
    startX = element.x + first[0];
    startY = element.y + first[1];
    endX = element.x + last[0];
    endY = element.y + last[1];
  }

  // 1. Draw the arrow shaft line.
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // 2. Draw the arrowhead tip at the end point.
  drawArrowheadTip(ctx, startX, startY, endX, endY, element.strokeWidth);
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
