// ============================================================================
// Arrow/Line Label Renderer — Stage 19
// Draws the midpoint text label for line and arrow elements.
// The label is stored as element.label and rendered centered at the line midpoint.
// ============================================================================

import { getFontString } from './text.js';

/**
 * Gets the midpoint of a line/arrow element in scene coordinates.
 */
function getLineMidpoint(element) {
  if (element.points && element.points.length >= 2) {
    // For multi-segment lines, use the midpoint of the middle segment.
    const mid = Math.floor((element.points.length - 1) / 2);
    const p1 = element.points[mid];
    const p2 = element.points[mid + 1];
    return {
      x: element.x + (p1[0] + p2[0]) / 2,
      y: element.y + (p1[1] + p2[1]) / 2
    };
  }
  // Fallback: use element center.
  return {
    x: element.x + element.width / 2,
    y: element.y + element.height / 2
  };
}

/**
 * Draws the label for a line or arrow element centered at its midpoint.
 * Should be called from the static renderer AFTER the line/arrow shape is drawn.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} element - The line or arrow element (must have .label string)
 */
export function drawLineLabel(ctx, element) {
  if (!element.label || element.label.trim() === '') return;

  const mid = getLineMidpoint(element);
  const fontSize = element.labelFontSize || 14;
  const fontFamily = 2; // Sans-serif for labels (clean and readable)
  const color = element.labelColor || element.strokeColor || '#1e1e24';
  const text = element.label;

  ctx.save();

  ctx.font = getFontString(fontSize, fontFamily);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Measure label width for a background pill.
  const textWidth = ctx.measureText(text).width;
  const padX = 6;
  const padY = 3;
  const pillW = textWidth + padX * 2;
  const pillH = fontSize + padY * 2;

  // Draw white/semi-transparent background pill so label is readable over the line.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  const rx = pillH / 2;
  ctx.roundRect
    ? ctx.roundRect(mid.x - pillW / 2, mid.y - pillH / 2, pillW, pillH, rx)
    : ctx.rect(mid.x - pillW / 2, mid.y - pillH / 2, pillW, pillH);
  ctx.fill();

  // Draw the label text.
  ctx.fillStyle = color;
  ctx.fillText(text, mid.x, mid.y);

  ctx.restore();
}
