// ============================================================================
// Text Element Rendering & Measurement Module
// Implements font formatting, multiline measurement, and Canvas 2D text drawing.
// References Excalidraw's packages/element/src/textElement.ts & textMeasurements.ts
// ============================================================================

// Font family ID constants matching original Excalidraw definitions:
// 1 = Virgil (Hand-drawn / Casual, using Caveat Google Font)
// 2 = Helvetica (Clean Sans-Serif, using Inter Google Font)
// 3 = Cascadia (Monospace / Code, using Courier New)
export const FONT_FAMILIES = {
  HAND_DRAWN: 1,
  SANS_SERIF: 2,
  MONOSPACE: 3
};

// Offscreen canvas context used for fast, off-screen text measurement.
let measurementCanvasCtx = null;

// Lazily initializes or returns the shared offscreen measurement context.
function getMeasurementContext() {
  if (!measurementCanvasCtx) {
    if (typeof document !== 'undefined' && document.createElement) {
      const offscreenCanvas = document.createElement('canvas');
      measurementCanvasCtx = offscreenCanvas.getContext('2d');
    }
  }
  return measurementCanvasCtx;
}

// Maps a numeric font family identifier to a complete CSS font-family stack.
export function getFontFamilyName(fontFamilyId) {
  switch (fontFamilyId) {
    case FONT_FAMILIES.SANS_SERIF:
      return "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    case FONT_FAMILIES.MONOSPACE:
      return "'Courier New', Courier, monospace";
    case FONT_FAMILIES.HAND_DRAWN:
    default:
      return "'Caveat', cursive, sans-serif";
  }
}

// Alias for SVG export compatibility
export const getFontFamilyCss = getFontFamilyName;

// Builds a valid Canvas 2D / CSS font shorthand string (e.g., "24px 'Caveat', cursive, sans-serif").
export function getFontString(fontSize, fontFamilyId) {
  const familyName = getFontFamilyName(fontFamilyId);
  return `${fontSize}px ${familyName}`;
}

// Measures multiline text dimensions (width and height) in scene coordinates.
// Returns the bounding box width, height, split lines array, and vertical line step.
export function measureText(text, fontSize = 20, fontFamilyId = 1, lineHeight = 1.25) {
  const ctx = getMeasurementContext();
  if (ctx) {
    ctx.font = getFontString(fontSize, fontFamilyId);
  }

  // Split text by newline to measure each line individually.
  const lines = (text || '').split('\n');

  let maxLineWidth = 0;
  for (const line of lines) {
    const width = ctx ? ctx.measureText(line).width : line.length * (fontSize * 0.6);
    if (width > maxLineWidth) {
      maxLineWidth = width;
    }
  }

  // Ensure minimum dimensions so empty or single-character elements remain selectable.
  const width = Math.max(Math.ceil(maxLineWidth), 24);
  const lineStep = fontSize * lineHeight;
  const height = Math.max(Math.ceil(lines.length * lineStep), Math.ceil(lineStep));

  return {
    width,
    height,
    lines,
    lineStep
  };
}

// Draws a committed multiline text element onto the 2D canvas.
// Supports left, center, and right text alignment and custom line heights.
export function drawText(ctx, element) {
  const fontSize = element.fontSize || 20;
  const fontFamily = element.fontFamily || 1;
  const lineHeight = element.lineHeight || 1.25;
  const textAlign = element.textAlign || 'left';
  const strokeColor = element.strokeColor || '#1e1e24';

  // Configure canvas text rendering properties.
  ctx.save();
  ctx.font = getFontString(fontSize, fontFamily);
  ctx.fillStyle = strokeColor;
  ctx.textBaseline = 'top';
  ctx.textAlign = textAlign;

  // Determine horizontal anchor position based on alignment.
  let anchorX = element.x;
  if (textAlign === 'center') {
    anchorX = element.x + element.width / 2;
  } else if (textAlign === 'right') {
    anchorX = element.x + element.width;
  }

  const lines = (element.text || '').split('\n');
  const lineStep = fontSize * lineHeight;

  // Render each line of text with its corresponding vertical spacing.
  for (let i = 0; i < lines.length; i++) {
    const lineY = element.y + i * lineStep;
    ctx.fillText(lines[i], anchorX, lineY);
  }

  ctx.restore();
}
