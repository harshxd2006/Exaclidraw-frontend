// ============================================================================
// Freehand Drawing Module
// Handles path smoothing and Canvas 2D rendering for freehand strokes.
// ============================================================================

// Draws a smoothed freehand stroke onto a 2D canvas context using quadratic Bezier curves.
export function drawFreehand(ctx, element) {
  const points = element.points;
  if (!points || points.length === 0) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = element.strokeColor || '#1e1e24';
  ctx.lineWidth = element.strokeWidth || 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. Single dot case: draw a small circle if the user just tapped without dragging.
  if (points.length === 1) {
    ctx.fillStyle = element.strokeColor || '#1e1e24';
    ctx.beginPath();
    ctx.arc(
      element.x + points[0][0],
      element.y + points[0][1],
      Math.max(1, (element.strokeWidth || 2) / 2),
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
    return;
  }

  // 2. Two points case: draw a direct line between the two points.
  if (points.length === 2) {
    ctx.beginPath();
    ctx.moveTo(element.x + points[0][0], element.y + points[0][1]);
    ctx.lineTo(element.x + points[1][0], element.y + points[1][1]);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // 3. Multi-point case: smooth the stroke using midpoint quadratic Bezier curves.
  ctx.beginPath();
  ctx.moveTo(element.x + points[0][0], element.y + points[0][1]);

  for (let i = 1; i < points.length - 1; i++) {
    const currentPt = points[i];
    const nextPt = points[i + 1];

    // Compute the midpoint between the current point and the next point.
    const midX = (currentPt[0] + nextPt[0]) / 2;
    const midY = (currentPt[1] + nextPt[1]) / 2;

    // Curve through the current point towards the midpoint.
    ctx.quadraticCurveTo(
      element.x + currentPt[0],
      element.y + currentPt[1],
      element.x + midX,
      element.y + midY
    );
  }

  // Draw the final curve ending at the very last recorded point.
  const secondLast = points[points.length - 2];
  const last = points[points.length - 1];
  ctx.quadraticCurveTo(
    element.x + secondLast[0],
    element.y + secondLast[1],
    element.x + last[0],
    element.y + last[1]
  );

  ctx.stroke();
  ctx.restore();
}

// Normalizes a freehand element so its (x, y) is the true top-left corner
// and its points are non-negative relative offsets.
export function normalizeFreehandElement(element) {
  const points = element.points;
  if (!points || points.length === 0) {
    return element;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  // Find the minimum and maximum boundaries across all recorded stroke points.
  for (const [px, py] of points) {
    if (px < minX) minX = px;
    if (py < minY) minY = py;
    if (px > maxX) maxX = px;
    if (py > maxY) maxY = py;
  }

  // Shift the origin (x, y) to the true top-left corner of the stroke bounding box.
  const newX = element.x + minX;
  const newY = element.y + minY;
  const newWidth = Math.max(1, maxX - minX);
  const newHeight = Math.max(1, maxY - minY);

  // Offset all point coordinates relative to the new top-left corner.
  const normalizedPoints = points.map(([px, py]) => [px - minX, py - minY]);

  return {
    ...element,
    x: newX,
    y: newY,
    width: newWidth,
    height: newHeight,
    points: normalizedPoints
  };
}
