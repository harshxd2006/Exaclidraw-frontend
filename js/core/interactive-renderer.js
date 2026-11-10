// ============================================================================
// Interactive Overlay Renderer
// Renders temporary drawing previews, selection boxes, and handles onto interactive-canvas.
// ============================================================================

import { canvasElements } from './viewport.js';
import { getState } from './state.js';
import { renderElement } from './static-renderer.js';
import {
  getTransformHandles,
  getLineEndpointHandles,
  getLineMidpointHandles,
  getLineIntermediateHandles
} from '../features/selection/transform.js';
import { renderSnapGuides } from '../features/selection/snap-overlay.js';

// Stores selections made by remote collaborators.
export const remoteSelections = new Map();

// Distinct colours for remote collaborator selections.
const REMOTE_SELECTION_COLORS = [
    "#e03131",
    "#1971c2",
    "#862e9c",
    "#e67700",
    "#0c8599",
    "#6741d9"
];

// Generate a consistent colour for each collaborator session.
function getRemoteSelectionColor(sessionId) {

    let hash = 0;

    for (const char of sessionId) {
        hash = ((hash << 5) - hash) + char.charCodeAt(0);
        hash |= 0;
    }

    return REMOTE_SELECTION_COLORS[
        Math.abs(hash) % REMOTE_SELECTION_COLORS.length
    ];
}

// Draws the temporary rectangle while selecting multiple elements.
function renderSelectionMarquee(ctx, element, zoom) {

    if (!element) return;

    ctx.save();

    // Handle dragging in any direction.
    const x = Math.min(element.x, element.x + element.width);
    const y = Math.min(element.y, element.y + element.height);

    const width = Math.abs(element.width);
    const height = Math.abs(element.height);

    // Light transparent background.
    ctx.fillStyle = 'rgba(40, 116, 91, 0.08)';
    ctx.fillRect(x, y, width, height);

    // Dashed selection boundary.
    ctx.strokeStyle = '#28745B';
    ctx.lineWidth = 1 / zoom;
    ctx.setLineDash([6 / zoom, 4 / zoom]);

    ctx.strokeRect(x, y, width, height);

    ctx.restore();
}

// Draws a bounding box with selection handles around a selected element.
export function renderSelectionBox(ctx, element, zoom) {
  if (!element || element.isDeleted) return;

  ctx.save();

  const isLinear = element.type === 'line' || element.type === 'arrow';

  // Calculate the true top-left and positive dimensions.
  const minX = Math.min(element.x, element.x + element.width);
  const minY = Math.min(element.y, element.y + element.height);
  const boxW = Math.abs(element.width);
  const boxH = Math.abs(element.height);

  const padding = 6 / zoom;
  const x = minX - padding;
  const y = minY - padding;
  const width = boxW + padding * 2;
  const height = boxH + padding * 2;

  // Draw dashed selection outline.
  ctx.strokeStyle = '#28745B';
  ctx.lineWidth = 1.5 / zoom;
  ctx.setLineDash([6 / zoom, 6 / zoom]);
  ctx.strokeRect(x, y, width, height);
  ctx.setLineDash([]);

  if (isLinear) {
    // ── Layer 1: Segment midpoint diamonds (add bend point affordance) ──
    const midHandles = getLineMidpointHandles(element, zoom);
    for (const h of midHandles) {
      const s = h.size * 0.6; // diamond half-diagonal
      ctx.save();
      ctx.translate(h.cx, h.cy);
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.rect(-s, -s, s * 2, s * 2);
      ctx.fillStyle = 'rgba(40,116,91,0.12)';
      ctx.fill();
      ctx.strokeStyle = '#28745B';
      ctx.lineWidth = 1 / zoom;
      ctx.setLineDash([]);
      ctx.stroke();
      ctx.restore();
    }

    // ── Layer 2: Existing intermediate (bend) point circles ──
    const intHandles = getLineIntermediateHandles(element, zoom);
    for (const h of intHandles) {
      ctx.beginPath();
      ctx.arc(h.cx, h.cy, h.r, 0, Math.PI * 2);
      ctx.fillStyle = '#28745B';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5 / zoom;
      ctx.stroke();
    }

    // ── Layer 3: Start / end endpoint circles ──
    const epHandles = getLineEndpointHandles(element, zoom);
    if (epHandles) {
      const r = 5 / zoom;
      // Start — hollow
      ctx.beginPath();
      ctx.arc(epHandles.start.cx, epHandles.start.cy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#28745B';
      ctx.lineWidth = 1.5 / zoom;
      ctx.stroke();
      // End — filled
      ctx.beginPath();
      ctx.arc(epHandles.end.cx, epHandles.end.cy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#28745B';
      ctx.fill();
      ctx.strokeStyle = '#28745B';
      ctx.lineWidth = 1 / zoom;
      ctx.stroke();
    }
  } else {
    // ── Regular shapes: draw 8 square transform handles ──
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#28745B';
    ctx.lineWidth = 1.5 / zoom;

    const handles = getTransformHandles(element, zoom);
    for (const key in handles) {
      const h = handles[key];
      ctx.fillRect(h.x, h.y, h.width, h.height);
      ctx.strokeRect(h.x, h.y, h.width, h.height);
    }
  }

  ctx.restore();
}


// Draws a selection outline for another collaborator.
export function renderRemoteSelectionOutline(
    ctx,
    element,
    zoom,
    color,
    sender,
    isEditing = false
) {
    if (!element || element.isDeleted) return;

    ctx.save();

    const minX = Math.min(element.x, element.x + element.width);
    const minY = Math.min(element.y, element.y + element.height);

    const padding = 8 / zoom;

    const x = minX - padding;
    const y = minY - padding;
    const width = Math.abs(element.width) + padding * 2;
    const height = Math.abs(element.height) + padding * 2;

    // Draw the coloured selection outline.
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 / zoom;
    ctx.setLineDash([5 / zoom, 4 / zoom]);

    ctx.strokeRect(x, y, width, height);

    ctx.setLineDash([]);

    // Show whether the collaborator is actively editing.
    const collaboratorName = String(sender || "Guest");
    const name = isEditing
        ? `${collaboratorName} · editing`
        : collaboratorName;

    const fontSize = 12 / zoom;
    const labelHeight = 20 / zoom;
    const labelPadding = 6 / zoom;

    ctx.font = `${fontSize}px sans-serif`;

    const textWidth = ctx.measureText(name).width;
    const labelWidth = textWidth + labelPadding * 2;
    const labelY = y - labelHeight;

    ctx.fillStyle = color;
    ctx.fillRect(x, labelY, labelWidth, labelHeight);

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    ctx.fillText(
        name,
        x + labelPadding,
        labelY + labelHeight / 2
    );

    ctx.restore();
}

// Main interactive overlay render function.
export function renderInteractiveScene() {
  const { interactiveCtx, width, height, dpr } = canvasElements;
  if (!interactiveCtx || width === 0 || height === 0) {
    return;
  }

  const state = getState();
  const { viewport, currentDraftElement, selectedElementIds, elements } = state;

  // 1. Clear the overlay drawing buffer.
  interactiveCtx.clearRect(0, 0, width * dpr, height * dpr);

  interactiveCtx.save();

  // 2. Apply Device Pixel Ratio (DPR) so coordinates map to CSS pixels.
  interactiveCtx.scale(dpr, dpr);

  // 3. Apply identical viewport transformation:
  interactiveCtx.scale(viewport.zoom, viewport.zoom);
  interactiveCtx.translate(viewport.scrollX, viewport.scrollY);

  // 4. Render active draft element preview (e.g. while dragging mouse to draw or selecting).
  if (currentDraftElement) {
    if (currentDraftElement.type === 'selection') {
      renderSelectionMarquee(interactiveCtx, currentDraftElement, viewport.zoom);
    } else {
      renderElement(interactiveCtx, currentDraftElement);
    }
  }

  // 5. Render selection bounding boxes around selected elements.
  for (const element of elements) {
    if (selectedElementIds[element.id]) {
      renderSelectionBox(interactiveCtx, element, viewport.zoom);
    }
  }

  // 6. Render selection outlines made by remote collaborators.
for (const [sessionId, selection] of remoteSelections) {

    const color = getRemoteSelectionColor(sessionId);

    for (const elementId of selection.selectedElementIds || []) {

        const element = elements.find(
            el => el.id === elementId
        );

        if (element) {

            // Check whether this particular shape is being edited.
            const isEditing = (
                selection.editingElementIds || []
            ).includes(elementId);

            renderRemoteSelectionOutline(
                interactiveCtx,
                element,
                viewport.zoom,
                color,
                selection.sender,
                isEditing
            );
        }
    }
}

  // 6. Render snap guide lines (visible during element dragging).
  renderSnapGuides(interactiveCtx, viewport.zoom);

  interactiveCtx.restore();
}
