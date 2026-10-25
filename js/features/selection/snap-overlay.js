// ============================================================================
// Snap Overlay Renderer Module — Stage 18
// Draws snap guide lines on the interactive canvas during element dragging.
//
// NOTE: renderSnapGuides() expects to be called while the canvas context
// already has the DPR + viewport (zoom + scroll) transforms applied, i.e.
// it draws directly in scene coordinate space.
// ============================================================================

/** Current active snap guides (set externally by snap engine consumers). */
let activeGuides = [];

/**
 * Updates the active snap guides to be rendered on the next frame.
 * @param {object[]} guides - Array of guide objects from computeSnaps().
 */
export function setSnapGuides(guides) {
  activeGuides = guides || [];
}

/**
 * Clears all active snap guides (call when drag ends).
 */
export function clearSnapGuides() {
  activeGuides = [];
}

/**
 * Renders all active snap guide lines onto the given canvas context.
 * Called from interactive-renderer.js while the context is already in
 * scene coordinate space (DPR + viewport transforms already applied).
 *
 * @param {CanvasRenderingContext2D} ctx   - The interactive canvas 2D context (already transformed).
 * @param {number} zoom                   - Current viewport zoom (for line-width compensation).
 */
export function renderSnapGuides(ctx, zoom) {
  if (activeGuides.length === 0) return;

  ctx.save();

  // Line style: green dashed lines, 1 CSS pixel wide regardless of zoom.
  ctx.strokeStyle = '#28745B';
  ctx.lineWidth = 1.5 / zoom;
  ctx.setLineDash([6 / zoom, 4 / zoom]);
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.75;

  for (const guide of activeGuides) {
    ctx.beginPath();

    if (guide.type === 'vertical') {
      ctx.moveTo(guide.x, guide.y1);
      ctx.lineTo(guide.x, guide.y2);
    } else if (guide.type === 'horizontal') {
      ctx.moveTo(guide.x1, guide.y);
      ctx.lineTo(guide.x2, guide.y);
    }

    ctx.stroke();

    // Draw small filled diamond at snap endpoints.
    ctx.setLineDash([]);
    ctx.fillStyle = '#28745B';
    ctx.globalAlpha = 0.9;
    const d = 4 / zoom;

    if (guide.type === 'vertical') {
      for (const yPos of [guide.y1, guide.y2]) {
        ctx.beginPath();
        ctx.moveTo(guide.x,     yPos - d);
        ctx.lineTo(guide.x + d, yPos);
        ctx.lineTo(guide.x,     yPos + d);
        ctx.lineTo(guide.x - d, yPos);
        ctx.closePath();
        ctx.fill();
      }
    } else if (guide.type === 'horizontal') {
      for (const xPos of [guide.x1, guide.x2]) {
        ctx.beginPath();
        ctx.moveTo(xPos - d, guide.y);
        ctx.lineTo(xPos,     guide.y - d);
        ctx.lineTo(xPos + d, guide.y);
        ctx.lineTo(xPos,     guide.y + d);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.setLineDash([6 / zoom, 4 / zoom]);
    ctx.globalAlpha = 0.85;
  }

  ctx.restore();
}
