// ============================================================================
// Alignment Manager Module — Stage 18
// Provides 6 alignment + 2 distribution operations for multi-selected elements.
// ============================================================================

/**
 * Returns the bounding rect (x, y, width, height) for an element.
 * Handles negative-dimension elements safely.
 */
function getBounds(el) {
  const x = el.width < 0 ? el.x + el.width : el.x;
  const y = el.height < 0 ? el.y + el.height : el.y;
  const w = Math.abs(el.width);
  const h = Math.abs(el.height);
  return { x, y, w, h };
}

/**
 * Computes the collective bounding box of a list of elements.
 */
function getCollectiveBounds(elements) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of elements) {
    const b = getBounds(el);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// ────────────────────────────────────────────────────────────
// 6 Alignment Operations
// Each function returns an updatesMap: { [id]: { x?, y? } }
// ────────────────────────────────────────────────────────────

/** Aligns all selected elements to the leftmost edge. */
export function alignLeft(elements, selectedIdMap) {
  const selected = elements.filter(el => selectedIdMap[el.id] && !el.isDeleted);
  if (selected.length < 2) return {};
  const collective = getCollectiveBounds(selected);
  const updates = {};
  for (const el of selected) {
    const b = getBounds(el);
    updates[el.id] = { x: collective.x + (el.x - b.x) };
  }
  return updates;
}

/** Aligns all selected elements to the rightmost edge. */
export function alignRight(elements, selectedIdMap) {
  const selected = elements.filter(el => selectedIdMap[el.id] && !el.isDeleted);
  if (selected.length < 2) return {};
  const collective = getCollectiveBounds(selected);
  const right = collective.x + collective.width;
  const updates = {};
  for (const el of selected) {
    const b = getBounds(el);
    updates[el.id] = { x: right - b.w + (el.x - b.x) };
  }
  return updates;
}

/** Aligns all selected elements to horizontal center. */
export function alignCenterHorizontal(elements, selectedIdMap) {
  const selected = elements.filter(el => selectedIdMap[el.id] && !el.isDeleted);
  if (selected.length < 2) return {};
  const collective = getCollectiveBounds(selected);
  const centerX = collective.x + collective.width / 2;
  const updates = {};
  for (const el of selected) {
    const b = getBounds(el);
    updates[el.id] = { x: centerX - b.w / 2 + (el.x - b.x) };
  }
  return updates;
}

/** Aligns all selected elements to the topmost edge. */
export function alignTop(elements, selectedIdMap) {
  const selected = elements.filter(el => selectedIdMap[el.id] && !el.isDeleted);
  if (selected.length < 2) return {};
  const collective = getCollectiveBounds(selected);
  const updates = {};
  for (const el of selected) {
    const b = getBounds(el);
    updates[el.id] = { y: collective.y + (el.y - b.y) };
  }
  return updates;
}

/** Aligns all selected elements to the bottommost edge. */
export function alignBottom(elements, selectedIdMap) {
  const selected = elements.filter(el => selectedIdMap[el.id] && !el.isDeleted);
  if (selected.length < 2) return {};
  const collective = getCollectiveBounds(selected);
  const bottom = collective.y + collective.height;
  const updates = {};
  for (const el of selected) {
    const b = getBounds(el);
    updates[el.id] = { y: bottom - b.h + (el.y - b.y) };
  }
  return updates;
}

/** Aligns all selected elements to vertical center. */
export function alignCenterVertical(elements, selectedIdMap) {
  const selected = elements.filter(el => selectedIdMap[el.id] && !el.isDeleted);
  if (selected.length < 2) return {};
  const collective = getCollectiveBounds(selected);
  const centerY = collective.y + collective.height / 2;
  const updates = {};
  for (const el of selected) {
    const b = getBounds(el);
    updates[el.id] = { y: centerY - b.h / 2 + (el.y - b.y) };
  }
  return updates;
}

// ────────────────────────────────────────────────────────────
// 2 Distribution Operations
// ────────────────────────────────────────────────────────────

/** Distributes selected elements evenly along the horizontal (X) axis. */
export function distributeHorizontal(elements, selectedIdMap) {
  const selected = elements.filter(el => selectedIdMap[el.id] && !el.isDeleted);
  if (selected.length < 3) return {};

  // Sort by left edge
  selected.sort((a, b) => getBounds(a).x - getBounds(b).x);

  const boundsArr = selected.map(getBounds);
  const totalWidth = boundsArr.reduce((sum, b) => sum + b.w, 0);
  const leftEdge = boundsArr[0].x;
  const rightEdge = boundsArr[boundsArr.length - 1].x + boundsArr[boundsArr.length - 1].w;
  const totalGap = (rightEdge - leftEdge - totalWidth) / (selected.length - 1);

  const updates = {};
  let cursor = leftEdge;
  for (let i = 0; i < selected.length; i++) {
    const el = selected[i];
    const b = boundsArr[i];
    updates[el.id] = { x: cursor + (el.x - b.x) };
    cursor += b.w + totalGap;
  }
  return updates;
}

/** Distributes selected elements evenly along the vertical (Y) axis. */
export function distributeVertical(elements, selectedIdMap) {
  const selected = elements.filter(el => selectedIdMap[el.id] && !el.isDeleted);
  if (selected.length < 3) return {};

  // Sort by top edge
  selected.sort((a, b) => getBounds(a).y - getBounds(b).y);

  const boundsArr = selected.map(getBounds);
  const totalHeight = boundsArr.reduce((sum, b) => sum + b.h, 0);
  const topEdge = boundsArr[0].y;
  const bottomEdge = boundsArr[boundsArr.length - 1].y + boundsArr[boundsArr.length - 1].h;
  const totalGap = (bottomEdge - topEdge - totalHeight) / (selected.length - 1);

  const updates = {};
  let cursor = topEdge;
  for (let i = 0; i < selected.length; i++) {
    const el = selected[i];
    const b = boundsArr[i];
    updates[el.id] = { y: cursor + (el.y - b.y) };
    cursor += b.h + totalGap;
  }
  return updates;
}
