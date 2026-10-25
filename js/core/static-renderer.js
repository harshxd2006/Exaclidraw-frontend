// ============================================================================
// Static Canvas Renderer
// Renders committed drawing elements, background color, and grid onto static-canvas.
// ============================================================================

import { canvasElements } from './viewport.js';
import { getState } from './state.js';
import { drawRectangle } from '../features/drawing/rectangle.js';
import { drawEllipse } from '../features/drawing/ellipse.js';
import { drawDiamond } from '../features/drawing/diamond.js';
import { drawLine } from '../features/drawing/line.js';
import { drawArrow } from '../features/drawing/arrow.js';
import { drawFreehand } from '../features/drawing/freehand.js';
import { drawText } from '../features/drawing/text.js';
import { drawLineLabel } from '../features/drawing/label-renderer.js';
import { getEditingElementId } from '../features/ui/text-editor.js';

/** Reads a CSS custom property from :root — used to pick up theme colors at render time. */
function getThemeColor(varName, fallback) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || fallback;
}

// Renders an individual shape element onto the given 2D canvas context.
export function renderElement(ctx, element) {
  // Skip deleted or hidden elements.
  if (!element || element.isDeleted || element.isHidden) return;

  // Skip text elements while the inline editor is open for them (the textarea overlay takes over).
  // Do NOT skip line/arrow elements during label editing — the shape must still render.
  const editingId = getEditingElementId();
  if (editingId && element.id === editingId && element.type === 'text') {
    return;
  }

  ctx.save();

  // 1. Apply element opacity (normalized from 0-100 to 0.0-1.0).
  const alpha = typeof element.opacity === 'number' ? element.opacity / 100 : 1;
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

  // 2. Apply element rotation around its center point if rotated.
  if (element.angle && element.angle !== 0) {
    const centerX = element.x + element.width / 2;
    const centerY = element.y + element.height / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate(element.angle);
    ctx.translate(-centerX, -centerY);
  }

  // 3. Configure stroke and fill styles.
  ctx.strokeStyle = element.strokeColor || '#1e1e24';
  ctx.fillStyle = element.backgroundColor || 'transparent';
  ctx.lineWidth = element.strokeWidth || 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Configure stroke dash pattern ('solid', 'dashed', 'dotted').
  if (element.strokeStyle === 'dashed') {
    ctx.setLineDash([8, 8]);
  } else if (element.strokeStyle === 'dotted') {
    ctx.setLineDash([3, 4]);
  } else {
    ctx.setLineDash([]);
  }

  // 4. Delegate to the dedicated shape drawing module.
  switch (element.type) {
    case 'rectangle':
      drawRectangle(ctx, element);
      break;

    case 'ellipse':
      drawEllipse(ctx, element);
      break;

    case 'diamond':
      drawDiamond(ctx, element);
      break;

    case 'line':
      drawLine(ctx, element);
      drawLineLabel(ctx, element);
      break;

    case 'arrow':
      drawArrow(ctx, element);
      drawLineLabel(ctx, element);
      break;

    case 'freedraw':
      drawFreehand(ctx, element);
      break;

    case 'text':
      drawText(ctx, element);
      break;

    default:
      ctx.strokeRect(element.x, element.y, element.width, element.height);
      break;
  }

  ctx.restore();

  // ── Locked-element indicator: draw a padlock badge in scene coordinates ──
  if (element.isLocked) {
    // We need the viewport zoom to keep the badge a consistent screen size.
    const zoom = getState().viewport.zoom;
    const badgePx = 18;           // desired badge size in CSS pixels
    const s = badgePx / zoom;     // badge size in scene units

    ctx.save();
    const minX = Math.min(element.x, element.x + element.width);
    const minY = Math.min(element.y, element.y + element.height);
    const lx = minX + (2 / zoom);
    const ly = minY + (2 / zoom);

    // Background pill
    ctx.fillStyle = 'rgba(40, 116, 91, 0.92)';
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1 / zoom;
    ctx.setLineDash([]);
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(lx, ly, s, s, (3 / zoom));
    } else {
      ctx.rect(lx, ly, s, s);
    }
    ctx.fill();
    ctx.stroke();

    // Shackle (arc above body)
    const cx = lx + s / 2;
    const bodyTop = ly + s * 0.52;
    const shackleR = s * 0.22;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = (1.8 / zoom);
    ctx.beginPath();
    ctx.arc(cx, bodyTop - shackleR * 0.5, shackleR, Math.PI, 0);
    ctx.stroke();

    // Lock body
    ctx.fillStyle = '#fff';
    const bodyH = s * 0.4;
    const bodyW = s * 0.6;
    const bodyX = lx + (s - bodyW) / 2;
    const bodyY = bodyTop;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(bodyX, bodyY, bodyW, bodyH, (1.5 / zoom));
      ctx.fill();
    } else {
      ctx.fillRect(bodyX, bodyY, bodyW, bodyH);
    }

    // Keyhole circle
    ctx.fillStyle = 'rgba(40, 116, 91, 0.9)';
    ctx.beginPath();
    ctx.arc(cx, bodyY + bodyH * 0.42, s * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// Draws the scene background dot grid taking viewport pan and zoom into account.
function drawSceneGrid(ctx, state, width, height) {
  if (!state.showGrid) {
    return;
  }

  const { viewport, gridSize } = state;
  const zoom = viewport.zoom;

  // Dynamic step scaling: if grid cells become too dense on screen (< 14px), multiply step size
  let effectiveGridSize = gridSize || 20;
  while (effectiveGridSize * zoom < 14) {
    effectiveGridSize *= 2;
  }

  // Calculate the visible scene bounds in scene coordinates.
  const startX = -viewport.scrollX;
  const startY = -viewport.scrollY;
  const endX = startX + width / zoom;
  const endY = startY + height / zoom;

  // Snap the grid starting positions to the nearest grid cell multiple.
  const firstGridX = Math.floor(startX / effectiveGridSize) * effectiveGridSize;
  const firstGridY = Math.floor(startY / effectiveGridSize) * effectiveGridSize;

  ctx.save();
  // Grid dot color driven by CSS theme variable so dark mode works automatically.
  ctx.fillStyle = getThemeColor('--color-grid', '#ced4da');

  // Calculate crisp dot radius: clamps between 0.6px and 1.2px scene units
  const dotRadius = Math.min(1.2, Math.max(0.6, 0.9 / zoom));

  // Render dots across the visible scene area.
  for (let x = firstGridX; x <= endX; x += effectiveGridSize) {
    for (let y = firstGridY; y <= endY; y += effectiveGridSize) {
      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

// Main static scene render function. Clears and repaints the entire static canvas.
export function renderStaticScene() {
  const { staticCtx, width, height, dpr } = canvasElements;
  if (!staticCtx || width === 0 || height === 0) {
    return;
  }

  const state = getState();
  const { viewport, viewBackgroundColor, elements } = state;

  // 1. Clear the entire static canvas buffer.
  staticCtx.clearRect(0, 0, width * dpr, height * dpr);

  // 2. Fill scene background — use CSS variable so dark mode is respected.
  staticCtx.save();
  staticCtx.fillStyle = getThemeColor('--color-bg-canvas', viewBackgroundColor || '#FAFAF8');
  staticCtx.fillRect(0, 0, width * dpr, height * dpr);

  // 3. Apply Device Pixel Ratio (DPR) so coordinates map to CSS pixels.
  staticCtx.scale(dpr, dpr);

  // 4. Apply viewport camera transformations.
  staticCtx.scale(viewport.zoom, viewport.zoom);
  staticCtx.translate(viewport.scrollX, viewport.scrollY);

  // 5. Draw the scene grid in transformed scene coordinates.
  drawSceneGrid(staticCtx, state, width, height);

  // 6. Draw all committed elements in order.
  for (const element of elements) {
    renderElement(staticCtx, element);
  }

  staticCtx.restore();
}
