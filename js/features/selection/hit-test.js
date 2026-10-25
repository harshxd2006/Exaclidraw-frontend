// ============================================================================
// Hit-Testing Module
// Calculates whether pointer coordinates or selection boxes intersect elements.
// References Excalidraw's packages/element/src/collision.ts & packages/math/src/
// ============================================================================

// Calculates the shortest distance from a point (px, py) to a line segment (x1, y1)-(x2, y2).
export function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;

  // Segment is a single point.
  if (lengthSq === 0) {
    return Math.hypot(px - x1, py - y1);
  }

  // Calculate projection factor t, clamped between 0.0 (start) and 1.0 (end).
  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));

  // Find the closest point on the segment.
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;

  return Math.hypot(px - projX, py - projY);
}

// Determines whether a scene point (sceneX, sceneY) hits an individual element.
export function isPointInElement(sceneX, sceneY, element, threshold = 6) {
  if (!element || element.isDeleted) {
    return false;
  }

  const minX = Math.min(element.x, element.x + element.width);
  const maxX = Math.max(element.x, element.x + element.width);
  const minY = Math.min(element.y, element.y + element.height);
  const maxY = Math.max(element.y, element.y + element.height);
  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);

  // 1. Rectangle and Text: axis-aligned bounding box check with padding threshold.
  if (element.type === 'rectangle' || element.type === 'text') {
    return (
      sceneX >= minX - threshold &&
      sceneX <= maxX + threshold &&
      sceneY >= minY - threshold &&
      sceneY <= maxY + threshold
    );
  }

  // 2. Ellipse: normalized quadratic radius distance check.
  if (element.type === 'ellipse') {
    const cx = minX + width / 2;
    const cy = minY + height / 2;
    const rx = width / 2 + threshold;
    const ry = height / 2 + threshold;

    const normalizedDist = Math.pow((sceneX - cx) / rx, 2) + Math.pow((sceneY - cy) / ry, 2);
    return normalizedDist <= 1.0;
  }

  // 3. Diamond: Manhattan distance from center to diamond edge.
  if (element.type === 'diamond') {
    const cx = minX + width / 2;
    const cy = minY + height / 2;
    const rx = width / 2 + threshold;
    const ry = height / 2 + threshold;

    const diamondDist = Math.abs(sceneX - cx) / rx + Math.abs(sceneY - cy) / ry;
    return diamondDist <= 1.0;
  }

  // 4. Line and Arrow: check distance to line segments.
  if (element.type === 'line' || element.type === 'arrow') {
    if (element.points && element.points.length >= 2) {
      for (let i = 0; i < element.points.length - 1; i++) {
        const p1 = element.points[i];
        const p2 = element.points[i + 1];
        const dist = distanceToSegment(
          sceneX,
          sceneY,
          element.x + p1[0],
          element.y + p1[1],
          element.x + p2[0],
          element.y + p2[1]
        );
        if (dist <= threshold + (element.strokeWidth || 2) / 2) {
          return true;
        }
      }
      return false;
    }

    // Fallback simple segment check from (x, y) to (x + width, y + height).
    const dist = distanceToSegment(
      sceneX,
      sceneY,
      element.x,
      element.y,
      element.x + element.width,
      element.y + element.height
    );
    return dist <= threshold + (element.strokeWidth || 2) / 2;
  }

  // 5. Freehand Pencil: check distance to each point in the stroke.
  if (element.type === 'freedraw') {
    if (!element.points || element.points.length === 0) {
      return false;
    }

    const strokeThreshold = threshold + (element.strokeWidth || 2) / 2;

    // Single click point
    if (element.points.length === 1) {
      const p = element.points[0];
      return Math.hypot(sceneX - (element.x + p[0]), sceneY - (element.y + p[1])) <= strokeThreshold;
    }

    // Check consecutive line segments along the freehand path
    for (let i = 0; i < element.points.length - 1; i++) {
      const p1 = element.points[i];
      const p2 = element.points[i + 1];
      const dist = distanceToSegment(
        sceneX,
        sceneY,
        element.x + p1[0],
        element.y + p1[1],
        element.x + p2[0],
        element.y + p2[1]
      );
      if (dist <= strokeThreshold) {
        return true;
      }
    }
    return false;
  }

  // Default fallback
  return (
    sceneX >= minX - threshold &&
    sceneX <= maxX + threshold &&
    sceneY >= minY - threshold &&
    sceneY <= maxY + threshold
  );
}

// Determines whether an element's bounding box intersects a selection marquee box.
export function doesElementIntersectBox(element, box) {
  if (!element || element.isDeleted) {
    return false;
  }

  // Normalize box bounds (in case dragged right-to-left or bottom-to-top).
  const boxMinX = Math.min(box.x, box.x + box.width);
  const boxMaxX = Math.max(box.x, box.x + box.width);
  const boxMinY = Math.min(box.y, box.y + box.height);
  const boxMaxY = Math.max(box.y, box.y + box.height);

  // Normalize element bounds.
  const elMinX = Math.min(element.x, element.x + element.width);
  const elMaxX = Math.max(element.x, element.x + element.width);
  const elMinY = Math.min(element.y, element.y + element.height);
  const elMaxY = Math.max(element.y, element.y + element.height);

  // Standard AABB (Axis-Aligned Bounding Box) non-intersection test.
  const hasSeparation =
    elMaxX < boxMinX ||
    elMinX > boxMaxX ||
    elMaxY < boxMinY ||
    elMinY > boxMaxY;

  return !hasSeparation;
}

// Finds the topmost element under the given scene point (sceneX, sceneY).
// Searches in reverse order because elements later in the array are rendered on top.
// Locked elements are intentionally excluded — they cannot be interacted with.
export function hitTestElements(sceneX, sceneY, elements) {
  for (let i = elements.length - 1; i >= 0; i--) {
    const element = elements[i];
    if (element.isLocked || element.isHidden) continue;  // Skip locked and hidden elements
    if (isPointInElement(sceneX, sceneY, element)) {
      return element;
    }
  }
  return null;
}

// Same as hitTestElements but INCLUDES locked elements.
// Used by the context menu to find locked elements the user right-clicks on (to offer Unlock).
export function hitTestElementsIncludingLocked(sceneX, sceneY, elements) {
  for (let i = elements.length - 1; i >= 0; i--) {
    const element = elements[i];
    if (element.isDeleted || element.isHidden) continue;
    if (isPointInElement(sceneX, sceneY, element)) {
      return element;
    }
  }
  return null;
}

