// ============================================================================
// Snap Engine Module — Stage 18
// Computes element-to-element snap points (edges, centers) during drag ops.
// Returns snap deltas and the guide lines to draw on the interactive canvas.
// ============================================================================

/** Snap threshold in scene pixels — how close before snapping kicks in. */
const SNAP_THRESHOLD = 8;

/**
 * Returns the 6 key snap points of an element: left, right, top, bottom, centerX, centerY.
 */
function getSnapPoints(el) {
  const x1 = Math.min(el.x, el.x + el.width);
  const y1 = Math.min(el.y, el.y + el.height);
  const x2 = Math.max(el.x, el.x + el.width);
  const y2 = Math.max(el.y, el.y + el.height);
  return { x1, y1, x2, y2, cx: (x1 + x2) / 2, cy: (y1 + y2) / 2 };
}

/**
 * Computes snap corrections and guide lines for dragging elements against all
 * other (non-selected) elements in the scene.
 *
 * @param {object[]} draggingElements   - Elements currently being dragged.
 * @param {object[]} allElements        - All scene elements.
 * @param {object}   selectedIdMap      - Map of selected element IDs.
 * @param {number}   zoom               - Current viewport zoom.
 * @returns {{ snapDx: number, snapDy: number, guides: object[] }}
 */
export function computeSnaps(draggingElements, allElements, selectedIdMap, zoom) {
  // Scale threshold inversely with zoom for consistent feel at any zoom level.
  const threshold = SNAP_THRESHOLD / zoom;

  let snapDx = 0;
  let snapDy = 0;
  let bestXDist = threshold;
  let bestYDist = threshold;
  let xGuide = null;
  let yGuide = null;

  // Bounding box of the full dragging selection.
  let dragX1 = Infinity, dragY1 = Infinity, dragX2 = -Infinity, dragY2 = -Infinity;
  for (const el of draggingElements) {
    const sp = getSnapPoints(el);
    dragX1 = Math.min(dragX1, sp.x1);
    dragY1 = Math.min(dragY1, sp.y1);
    dragX2 = Math.max(dragX2, sp.x2);
    dragY2 = Math.max(dragY2, sp.y2);
  }

  if (!isFinite(dragX1)) {
    return { snapDx: 0, snapDy: 0, guides: [] };
  }

  const dragCX = (dragX1 + dragX2) / 2;
  const dragCY = (dragY1 + dragY2) / 2;

  // Source snap values for the dragging group: left, center, right / top, center, bottom.
  const dragXSources = [dragX1, dragCX, dragX2];
  const dragYSources = [dragY1, dragCY, dragY2];

  for (const el of allElements) {
    if (selectedIdMap[el.id] || el.isDeleted) continue;

    const sp = getSnapPoints(el);
    const targetXValues = [sp.x1, sp.cx, sp.x2];
    const targetYValues = [sp.y1, sp.cy, sp.y2];

    // ---- X axis snapping ----
    for (const dragX of dragXSources) {
      for (const targetX of targetXValues) {
        const dist = Math.abs(dragX - targetX);
        if (dist < bestXDist) {
          bestXDist = dist;
          snapDx = targetX - dragX;
          xGuide = {
            type: 'vertical',
            x: targetX,
            y1: Math.min(dragY1, sp.y1) - 12,
            y2: Math.max(dragY2, sp.y2) + 12
          };
        }
      }
    }

    // ---- Y axis snapping ----
    for (const dragY of dragYSources) {
      for (const targetY of targetYValues) {
        const dist = Math.abs(dragY - targetY);
        if (dist < bestYDist) {
          bestYDist = dist;
          snapDy = targetY - dragY;
          yGuide = {
            type: 'horizontal',
            y: targetY,
            x1: Math.min(dragX1, sp.x1) - 12,
            x2: Math.max(dragX2, sp.x2) + 12
          };
        }
      }
    }
  }

  // Build final guides array (only keep guides where a snap was found).
  const guides = [];
  if (bestXDist < threshold && xGuide) {
    guides.push(xGuide);
  } else {
    snapDx = 0;
  }
  if (bestYDist < threshold && yGuide) {
    guides.push(yGuide);
  } else {
    snapDy = 0;
  }

  return { snapDx, snapDy, guides };
}

/** Utility export (unused in main flow, exposed for testing). */
export function clearSnaps() {
  return { snapDx: 0, snapDy: 0, guides: [] };
}
