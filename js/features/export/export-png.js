// ============================================================================
// PNG Export Module
// Renders scene elements onto off-screen canvas at high DPR scale for image export.
// Reference: packages/excalidraw/scene/export.ts in Excalidraw
// ============================================================================

import { renderElement } from '../../core/static-renderer.js';

// Computes the tight bounding box encompassing all active elements.
export function getSceneBounds(elements, padding = 30) {
  if (!elements || elements.length === 0) {
    return { minX: 0, minY: 0, maxX: 400, maxY: 300, width: 400, height: 300 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    if (el.isDeleted) continue;

    if (Array.isArray(el.points) && el.points.length > 0) {
      for (const [px, py] of el.points) {
        const absX = el.x + px;
        const absY = el.y + py;
        if (absX < minX) minX = absX;
        if (absY < minY) minY = absY;
        if (absX > maxX) maxX = absX;
        if (absY > maxY) maxY = absY;
      }
    } else {
      const left = Math.min(el.x, el.x + el.width);
      const right = Math.max(el.x, el.x + el.width);
      const top = Math.min(el.y, el.y + el.height);
      const bottom = Math.max(el.y, el.y + el.height);

      if (left < minX) minX = left;
      if (top < minY) minY = top;
      if (right > maxX) maxX = right;
      if (bottom > maxY) maxY = bottom;
    }
  }

  if (minX === Infinity) {
    return { minX: 0, minY: 0, maxX: 400, maxY: 300, width: 400, height: 300 };
  }

  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, Math.round(maxX - minX)),
    height: Math.max(1, Math.round(maxY - minY))
  };
}

// Renders elements to an off-screen HTML5 Canvas.
export function exportToCanvas(elements, options = {}) {
  const {
    scale = 1,
    withBackground = true,
    backgroundColor = '#ffffff',
    padding = 30
  } = options;

  const validElements = elements.filter(el => !el.isDeleted);
  const bounds = getSceneBounds(validElements, padding);

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bounds.width * scale);
  canvas.height = Math.round(bounds.height * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return canvas;
  }

  // 1. Draw background color if enabled
  if (withBackground && backgroundColor && backgroundColor !== 'transparent') {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // 2. Apply camera offset and resolution scale
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-bounds.minX, -bounds.minY);

  // 3. Render each element onto the buffer
  for (const el of validElements) {
    renderElement(ctx, el);
  }

  ctx.restore();
  return canvas;
}

// Triggers a browser download of the scene rendered as a PNG file.
export function downloadPng(elements, options = {}, filename = 'drawing.png') {
  const canvas = exportToCanvas(elements, options);
  const dataUrl = canvas.toDataURL('image/png');

  const downloadLink = document.createElement('a');
  downloadLink.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  downloadLink.href = dataUrl;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

// Copies the rendered scene PNG directly into the operating system clipboard.
export async function copyPngToClipboard(elements, options = {}) {
  const canvas = exportToCanvas(elements, options);

  return new Promise((resolve, reject) => {
    canvas.toBlob(async blob => {
      if (!blob) {
        reject(new Error('Failed to generate PNG blob from canvas.'));
        return;
      }

      try {
        if (navigator.clipboard && navigator.clipboard.write) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          resolve(true);
        } else {
          reject(new Error('Clipboard image writing is not supported in this environment.'));
        }
      } catch (err) {
        reject(err);
      }
    }, 'image/png');
  });
}
