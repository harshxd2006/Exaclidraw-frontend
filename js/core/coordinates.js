// ============================================================================
// Coordinate Transformation Module
// Converts between browser Screen Coordinates and infinite Scene Coordinates.
// ============================================================================

// Converts a screen pointer position (clientX, clientY) into scene coordinates.
export function screenToScene(clientX, clientY, viewport, canvasRect) {
  // 1. Calculate pointer position relative to the top-left of the canvas element.
  const canvasX = clientX - (canvasRect ? canvasRect.left : 0);
  const canvasY = clientY - (canvasRect ? canvasRect.top : 0);

  // 2. Invert the viewport zoom and scroll pan to find the exact point in the scene:
  // sceneX = (canvasX / zoom) - scrollX
  const sceneX = canvasX / viewport.zoom - viewport.scrollX;
  const sceneY = canvasY / viewport.zoom - viewport.scrollY;

  return { x: sceneX, y: sceneY };
}

// Converts scene coordinates (x, y) into screen coordinates (clientX, clientY).
export function sceneToScreen(sceneX, sceneY, viewport, canvasRect) {
  // 1. Apply viewport pan and zoom scale.
  const canvasX = (sceneX + viewport.scrollX) * viewport.zoom;
  const canvasY = (sceneY + viewport.scrollY) * viewport.zoom;

  // 2. Add canvas DOM offset to return absolute client viewport pixels.
  const clientX = canvasX + (canvasRect ? canvasRect.left : 0);
  const clientY = canvasY + (canvasRect ? canvasRect.top : 0);

  return { x: clientX, y: clientY };
}

// Calculates the distance between two points (used for line length and hit radius).
export function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}
