// ============================================================================
// Diamond Drawing Module
// Handles geometry creation and Canvas 2D rendering for rhombus/diamond shapes.
// ============================================================================

import { createElement } from '../../core/element-factory.js';

// Creates a diamond element object with the given coordinates and styling options.
export function createDiamond(x, y, width, height, options = {}) {
  return createElement('diamond', {
    x,
    y,
    width,
    height,
    ...options
  });
}

// Draws a diamond by connecting four midpoint vertices along its bounding box.
export function drawDiamond(ctx, element) {
  const hasFill = element.backgroundColor && element.backgroundColor !== 'transparent' && element.fillStyle !== 'transparent';

  // 1. Calculate the four cardinal diamond vertices.
  const topX = element.x + element.width / 2;
  const topY = element.y;

  const rightX = element.x + element.width;
  const rightY = element.y + element.height / 2;

  const bottomX = element.x + element.width / 2;
  const bottomY = element.y + element.height;

  const leftX = element.x;
  const leftY = element.y + element.height / 2;

  // 2. Build the closed path connecting the vertices.
  ctx.beginPath();
  ctx.moveTo(topX, topY);
  ctx.lineTo(rightX, rightY);
  ctx.lineTo(bottomX, bottomY);
  ctx.lineTo(leftX, leftY);
  ctx.closePath();

  // 3. Fill interior if background color is defined.
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

  // 4. Stroke the perimeter border.
  ctx.stroke();
}
