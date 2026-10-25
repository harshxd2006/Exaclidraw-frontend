// ============================================================================
// Viewport & Two-Canvas Sizing Module
// Manages canvas dimensions, Device Pixel Ratio (DPR) scaling, and alignment.
// ============================================================================

import { renderStaticScene } from './static-renderer.js';
import { renderInteractiveScene } from './interactive-renderer.js';

// Object holding references to DOM elements and 2D rendering contexts.
export const canvasElements = {
  container: null,
  staticCanvas: null,
  interactiveCanvas: null,
  staticCtx: null,
  interactiveCtx: null,
  width: 0,
  height: 0,
  dpr: 1
};

// Returns the device pixel ratio (DPR) to ensure crisp rendering on Retina / high-DPI screens.
export function getDevicePixelRatio() {
  return window.devicePixelRatio || 1;
}

// Queries canvas DOM elements and initializes their 2D rendering contexts.
export function setupCanvases(containerId, staticId, interactiveId) {
  // Retrieve the outer workspace container element.
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`[Viewport] Container element #${containerId} not found.`);
    return false;
  }

  // Retrieve the static canvas element.
  const staticCanvas = document.getElementById(staticId);
  if (!staticCanvas) {
    console.error(`[Viewport] Static canvas #${staticId} not found.`);
    return false;
  }

  // Retrieve the interactive overlay canvas element.
  const interactiveCanvas = document.getElementById(interactiveId);
  if (!interactiveCanvas) {
    console.error(`[Viewport] Interactive canvas #${interactiveId} not found.`);
    return false;
  }

  // Initialize the 2D rendering contexts.
  const staticCtx = staticCanvas.getContext('2d');
  const interactiveCtx = interactiveCanvas.getContext('2d');

  if (!staticCtx || !interactiveCtx) {
    console.error('[Viewport] Unable to acquire 2D rendering contexts.');
    return false;
  }

  // Store references in the canvasElements object.
  canvasElements.container = container;
  canvasElements.staticCanvas = staticCanvas;
  canvasElements.interactiveCanvas = interactiveCanvas;
  canvasElements.staticCtx = staticCtx;
  canvasElements.interactiveCtx = interactiveCtx;

  console.log('[Viewport] Both static and interactive canvases successfully initialized.');
  return true;
}

// Synchronizes the width, height, and DPR buffer scaling of both canvases.
export function resizeCanvases() {
  const { container, staticCanvas, interactiveCanvas } = canvasElements;

  if (!container || !staticCanvas || !interactiveCanvas) {
    return;
  }

  // Measure the container's CSS dimensions (display width & height in CSS pixels).
  const width = container.clientWidth;
  const height = container.clientHeight;

  // Retrieve the current device pixel ratio (DPR) to avoid blurry text on high-DPI displays.
  const dpr = getDevicePixelRatio();

  // Update stored dimension values.
  canvasElements.width = width;
  canvasElements.height = height;
  canvasElements.dpr = dpr;

  // Set the canvas internal drawing buffer sizes (scaled by DPR).
  staticCanvas.width = Math.round(width * dpr);
  staticCanvas.height = Math.round(height * dpr);

  interactiveCanvas.width = Math.round(width * dpr);
  interactiveCanvas.height = Math.round(height * dpr);

  // Set the CSS display sizes so the canvas matches the container exactly.
  staticCanvas.style.width = `${width}px`;
  staticCanvas.style.height = `${height}px`;

  interactiveCanvas.style.width = `${width}px`;
  interactiveCanvas.style.height = `${height}px`;

  // Request full re-render of both scene layers upon resize.
  renderStaticScene();
  renderInteractiveScene();

  console.log(`[Viewport] Canvases resized to ${width}x${height} CSS px (${staticCanvas.width}x${staticCanvas.height} buffer px at DPR ${dpr})`);
}
