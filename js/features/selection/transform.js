// ============================================================================
// Transform & Resize Module
// Manages the 8 bounding box transform handles, cursor styles, and resizing logic.
// References Excalidraw's packages/excalidraw/transform.ts & resizeElements.ts
// ============================================================================

import { measureText } from '../drawing/text.js';

// The 8 standard transform handle identifier names.
export const TRANSFORM_HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

// Returns the CSS cursor string for each transform handle.
export function getHandleCursor(handleName) {
  switch (handleName) {
    case 'nw':
    case 'se':
      return 'nwse-resize';
    case 'ne':
    case 'sw':
      return 'nesw-resize';
    case 'n':
    case 's':
      return 'ns-resize';
    case 'e':
    case 'w':
      return 'ew-resize';
    default:
      return 'default';
  }
}

// Calculates the positions and bounding boxes for all 8 handles of an element.
export function getTransformHandles(element, zoom = 1.0) {
  if (!element || element.isDeleted) {
    return {};
  }

  // Calculate normalized element bounds in scene coordinates.
  const minX = Math.min(element.x, element.x + element.width);
  const minY = Math.min(element.y, element.y + element.height);
  const boxW = Math.abs(element.width);
  const boxH = Math.abs(element.height);

  // Outer padding around the element where the dashed bounding box sits.
  const padding = 6 / zoom;
  const x = minX - padding;
  const y = minY - padding;
  const width = boxW + padding * 2;
  const height = boxH + padding * 2;

  // Handle dimensions (8px on screen, scaled inversely with zoom).
  const handleSize = 8 / zoom;
  const halfHandle = handleSize / 2;

  return {
    nw: {
      x: x - halfHandle,
      y: y - halfHandle,
      width: handleSize,
      height: handleSize,
      cursor: 'nwse-resize'
    },
    n: {
      x: x + width / 2 - halfHandle,
      y: y - halfHandle,
      width: handleSize,
      height: handleSize,
      cursor: 'ns-resize'
    },
    ne: {
      x: x + width - halfHandle,
      y: y - halfHandle,
      width: handleSize,
      height: handleSize,
      cursor: 'nesw-resize'
    },
    e: {
      x: x + width - halfHandle,
      y: y + height / 2 - halfHandle,
      width: handleSize,
      height: handleSize,
      cursor: 'ew-resize'
    },
    se: {
      x: x + width - halfHandle,
      y: y + height - halfHandle,
      width: handleSize,
      height: handleSize,
      cursor: 'nwse-resize'
    },
    s: {
      x: x + width / 2 - halfHandle,
      y: y + height - halfHandle,
      width: handleSize,
      height: handleSize,
      cursor: 'ns-resize'
    },
    sw: {
      x: x - halfHandle,
      y: y + height - halfHandle,
      width: handleSize,
      height: handleSize,
      cursor: 'nesw-resize'
    },
    w: {
      x: x - halfHandle,
      y: y + height / 2 - halfHandle,
      width: handleSize,
      height: handleSize,
      cursor: 'ew-resize'
    }
  };
}

// Tests whether a scene point (sceneX, sceneY) hits one of the 8 transform handles.
// Returns { handle, cursor } or null if no handle was clicked.
export function hitTestTransformHandles(sceneX, sceneY, element, zoom = 1.0) {
  if (!element || element.isDeleted) {
    return null;
  }

  const handles = getTransformHandles(element, zoom);
  // Add a generous 12px / zoom hit margin so corner and edge handles are effortless to grab.
  const hitMargin = 12 / zoom;

  // Check CORNER handles first because corners take grab priority over edge middles.
  const CORNER_HANDLES = ['nw', 'ne', 'se', 'sw'];
  for (const handleName of CORNER_HANDLES) {
    const h = handles[handleName];
    if (!h) {
      continue;
    }

    if (
      sceneX >= h.x - hitMargin &&
      sceneX <= h.x + h.width + hitMargin &&
      sceneY >= h.y - hitMargin &&
      sceneY <= h.y + h.height + hitMargin
    ) {
      return {
        handle: handleName,
        cursor: h.cursor
      };
    }
  }

  // Then check EDGE handles.
  const EDGE_HANDLES = ['n', 's', 'e', 'w'];
  for (const handleName of EDGE_HANDLES) {
    const h = handles[handleName];
    if (!h) {
      continue;
    }

    if (
      sceneX >= h.x - hitMargin &&
      sceneX <= h.x + h.width + hitMargin &&
      sceneY >= h.y - hitMargin &&
      sceneY <= h.y + h.height + hitMargin
    ) {
      return {
        handle: handleName,
        cursor: h.cursor
      };
    }
  }

  return null;
}

// Resizes an element based on the dragged handle, mouse deltas (dx, dy), and initial bounds.
// Supports aspect-ratio locking (e.g. holding Shift key or resizing text elements).
export function resizeElement(element, handle, dx, dy, initialBounds, options = {}) {
  const { keepAspectRatio = false } = options;

  let newX = initialBounds.x;
  let newY = initialBounds.y;
  let newWidth = initialBounds.width;
  let newHeight = initialBounds.height;

  // 1. Calculate raw target dimensions according to which handle is being dragged.
  switch (handle) {
    case 'se': // Bottom-Right
      newWidth = initialBounds.width + dx;
      newHeight = initialBounds.height + dy;
      if (newWidth < 0) {
        newX = initialBounds.x + newWidth;
        newWidth = Math.abs(newWidth);
      }
      if (newHeight < 0) {
        newY = initialBounds.y + newHeight;
        newHeight = Math.abs(newHeight);
      }
      break;

    case 's': // Bottom-Center
      newHeight = initialBounds.height + dy;
      if (newHeight < 0) {
        newY = initialBounds.y + newHeight;
        newHeight = Math.abs(newHeight);
      }
      break;

    case 'e': // Middle-Right
      newWidth = initialBounds.width + dx;
      if (newWidth < 0) {
        newX = initialBounds.x + newWidth;
        newWidth = Math.abs(newWidth);
      }
      break;

    case 'nw': // Top-Left
      newWidth = initialBounds.width - dx;
      newHeight = initialBounds.height - dy;
      newX = initialBounds.x + dx;
      newY = initialBounds.y + dy;
      if (newWidth < 0) {
        newX = initialBounds.x + initialBounds.width;
        newWidth = Math.abs(newWidth);
      }
      if (newHeight < 0) {
        newY = initialBounds.y + initialBounds.height;
        newHeight = Math.abs(newHeight);
      }
      break;

    case 'n': // Top-Center
      newHeight = initialBounds.height - dy;
      newY = initialBounds.y + dy;
      if (newHeight < 0) {
        newY = initialBounds.y + initialBounds.height;
        newHeight = Math.abs(newHeight);
      }
      break;

    case 'w': // Middle-Left
      newWidth = initialBounds.width - dx;
      newX = initialBounds.x + dx;
      if (newWidth < 0) {
        newX = initialBounds.x + initialBounds.width;
        newWidth = Math.abs(newWidth);
      }
      break;

    case 'ne': // Top-Right
      newWidth = initialBounds.width + dx;
      newHeight = initialBounds.height - dy;
      newY = initialBounds.y + dy;
      if (newWidth < 0) {
        newX = initialBounds.x + newWidth;
        newWidth = Math.abs(newWidth);
      }
      if (newHeight < 0) {
        newY = initialBounds.y + initialBounds.height;
        newHeight = Math.abs(newHeight);
      }
      break;

    case 'sw': // Bottom-Left
      newWidth = initialBounds.width - dx;
      newHeight = initialBounds.height + dy;
      newX = initialBounds.x + dx;
      if (newWidth < 0) {
        newX = initialBounds.x + initialBounds.width;
        newWidth = Math.abs(newWidth);
      }
      if (newHeight < 0) {
        newY = initialBounds.y + newHeight;
        newHeight = Math.abs(newHeight);
      }
      break;

    default:
      break;
  }

  // 2. Apply aspect ratio locking when holding Shift key.
  const isCorner = ['nw', 'ne', 'se', 'sw'].includes(handle);
  const shouldLockRatio = keepAspectRatio && isCorner;

  if (shouldLockRatio && initialBounds.height !== 0 && initialBounds.width !== 0) {
    const originalRatio = Math.abs(initialBounds.width) / Math.max(Math.abs(initialBounds.height), 1);
    const targetW = Math.max(newWidth, Math.round(newHeight * originalRatio));
    const targetH = Math.max(Math.round(targetW / originalRatio), 1);

    if (handle === 'nw') {
      newX = initialBounds.x + (initialBounds.width - targetW);
      newY = initialBounds.y + (initialBounds.height - targetH);
    } else if (handle === 'ne') {
      newY = initialBounds.y + (initialBounds.height - targetH);
    } else if (handle === 'sw') {
      newX = initialBounds.x + (initialBounds.width - targetW);
    }
    newWidth = targetW;
    newHeight = targetH;
  }

  // Enforce minimum dimension of 10px so shapes never disappear or jump unexpectedly
  if (newWidth < 10) {
    if (['nw', 'w', 'sw'].includes(handle)) {
      newX = initialBounds.x + initialBounds.width - 10;
    }
    newWidth = 10;
  }
  if (newHeight < 10) {
    if (['nw', 'n', 'ne'].includes(handle)) {
      newY = initialBounds.y + initialBounds.height - 10;
    }
    newHeight = 10;
  }

  const updates = {
    x: Math.round(newX),
    y: Math.round(newY),
    width: Math.round(newWidth),
    height: Math.round(newHeight)
  };

  // 3. Element-specific scaling:
  // 3a. Lines and Arrows: scale points proportionally to width and height changes
  if ((element.type === 'line' || element.type === 'arrow') && initialBounds.points) {
    const scaleX = initialBounds.width !== 0 ? newWidth / initialBounds.width : 1;
    const scaleY = initialBounds.height !== 0 ? newHeight / initialBounds.height : 1;

    updates.points = initialBounds.points.map(([px, py]) => [
      Math.round(px * scaleX),
      Math.round(py * scaleY)
    ]);
  }

  // 3b. Freehand strokes: scale point stream proportionally
  if (element.type === 'freedraw' && initialBounds.points) {
    const scaleX = initialBounds.width !== 0 ? newWidth / initialBounds.width : 1;
    const scaleY = initialBounds.height !== 0 ? newHeight / initialBounds.height : 1;

    updates.points = initialBounds.points.map(([px, py]) => [
      Math.round(px * scaleX),
      Math.round(py * scaleY)
    ]);
  }

  // 3c. Text elements: resize by scaling their font and then remeasuring.
  // Text has no independent wrapping width, so horizontal handles must scale the
  // font too; otherwise east/west handles appear to do nothing.
  if (element.type === 'text') {
    const scaleX = Math.abs(newWidth) / Math.max(Math.abs(initialBounds.width), 1);
    const scaleY = Math.abs(newHeight) / Math.max(Math.abs(initialBounds.height), 1);
    let scaleFactor;
    if (['e', 'w'].includes(handle)) {
      scaleFactor = scaleX;
    } else if (['n', 's'].includes(handle)) {
      scaleFactor = scaleY;
    } else {
      // Corner drags use the axis the user moved proportionally farther.
      scaleFactor = Math.abs(scaleX - 1) >= Math.abs(scaleY - 1) ? scaleX : scaleY;
    }
    const newFontSize = Math.max(Math.round((initialBounds.fontSize || 20) * scaleFactor), 10);
    updates.fontSize = newFontSize;

    // Recalculate exact text dimensions with the scaled font size
    const measured = measureText(
      element.text,
      newFontSize,
      element.fontFamily || 1,
      element.lineHeight || 1.25
    );
    updates.width = measured.width;
    updates.height = measured.height;

    // Keep the opposite edge fixed when resizing from a left or top handle.
    if (['nw', 'w', 'sw'].includes(handle)) {
      const rightEdge = initialBounds.x + initialBounds.width;
      updates.x = rightEdge - measured.width;
    } else {
      updates.x = newX;
    }
    if (['nw', 'n', 'ne'].includes(handle)) {
      const bottomEdge = initialBounds.y + initialBounds.height;
      updates.y = bottomEdge - measured.height;
    } else {
      updates.y = newY;
    }
  }

  return updates;
}

// ── Line / Arrow endpoint handles ────────────────────────────────────────────
// Returns { start, end } handles at the actual line endpoints (not bounding box corners).
// Used instead of the 8-handle bounding box for line and arrow elements.
export function getLineEndpointHandles(element, zoom = 1.0) {
  if (!element || element.isDeleted) return null;
  if (element.type !== 'line' && element.type !== 'arrow') return null;

  const points = element.points;
  if (!points || points.length < 2) return null;

  const handleSize = 9 / zoom;
  const half = handleSize / 2;

  // Start point = element origin + points[0]
  const sx = element.x + points[0][0];
  const sy = element.y + points[0][1];
  // End point = element origin + points[last]
  const ep = points[points.length - 1];
  const ex = element.x + ep[0];
  const ey = element.y + ep[1];

  return {
    start: { x: sx - half, y: sy - half, width: handleSize, height: handleSize, cx: sx, cy: sy },
    end:   { x: ex - half, y: ey - half, width: handleSize, height: handleSize, cx: ex, cy: ey }
  };
}

// Hit-tests a scene point against the two endpoint handles of a line/arrow.
// Returns 'start' | 'end' | null.
export function hitTestLineEndpointHandles(sceneX, sceneY, element, zoom = 1.0) {
  const handles = getLineEndpointHandles(element, zoom);
  if (!handles) return null;

  const hitRadius = 14 / zoom;

  for (const key of ['start', 'end']) {
    const h = handles[key];
    const dist = Math.hypot(sceneX - h.cx, sceneY - h.cy);
    if (dist <= hitRadius) return key;
  }
  return null;
}

// ── Line / Arrow bend-point (intermediate point) handles ──────────────────────
// Returns an array of handles sitting at the midpoint of each segment.
// Dragging one inserts a new bend point into the polyline.
export function getLineMidpointHandles(element, zoom = 1.0) {
  if (!element || element.isDeleted) return [];
  if (element.type !== 'line' && element.type !== 'arrow') return [];
  const points = element.points;
  if (!points || points.length < 2) return [];

  const size = 7 / zoom;
  const handles = [];
  for (let i = 0; i < points.length - 1; i++) {
    const ax = element.x + points[i][0];
    const ay = element.y + points[i][1];
    const bx = element.x + points[i + 1][0];
    const by = element.y + points[i + 1][1];
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    handles.push({ cx: mx, cy: my, size, segmentIndex: i });
  }
  return handles;
}

// Returns handles for every already-existing intermediate (bend) point.
// These are the points[1 .. n-2] that are neither start nor end.
export function getLineIntermediateHandles(element, zoom = 1.0) {
  if (!element || element.isDeleted) return [];
  if (element.type !== 'line' && element.type !== 'arrow') return [];
  const points = element.points;
  if (!points || points.length <= 2) return [];

  const r = 5 / zoom;
  const handles = [];
  for (let i = 1; i < points.length - 1; i++) {
    const cx = element.x + points[i][0];
    const cy = element.y + points[i][1];
    handles.push({ cx, cy, r, pointIndex: i });
  }
  return handles;
}

// Hit-tests against segment midpoint handles. Returns { segmentIndex } or null.
export function hitTestLineMidpointHandles(sceneX, sceneY, element, zoom = 1.0) {
  const handles = getLineMidpointHandles(element, zoom);
  const hitRadius = 11 / zoom;
  for (const h of handles) {
    if (Math.hypot(sceneX - h.cx, sceneY - h.cy) <= hitRadius) {
      return { segmentIndex: h.segmentIndex };
    }
  }
  return null;
}

// Hit-tests against existing intermediate (bend) point handles. Returns { pointIndex } or null.
export function hitTestLineIntermediateHandles(sceneX, sceneY, element, zoom = 1.0) {
  const handles = getLineIntermediateHandles(element, zoom);
  const hitRadius = 13 / zoom;
  for (const h of handles) {
    if (Math.hypot(sceneX - h.cx, sceneY - h.cy) <= hitRadius) {
      return { pointIndex: h.pointIndex };
    }
  }
  return null;
}
