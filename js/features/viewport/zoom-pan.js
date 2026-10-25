// ============================================================================
// Viewport Zoom & Pan Module
// Provides pointer-centered zoom calculations and canvas panning utilities.
// ============================================================================

import { getState, setViewport } from '../../core/state.js';
import { canvasElements } from '../../core/viewport.js';

// Minimum and maximum allowable zoom levels (10% to 500%).
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5.0;

// Standard zoom step multiplier (20% step per click/increment).
export const ZOOM_STEP_FACTOR = 1.2;

// Clamps a zoom level to stay strictly between MIN_ZOOM and MAX_ZOOM.
export function clampZoom(zoom) {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
}

// Retrieves the center coordinates of the canvas container in screen pixels.
export function getCanvasCenterScreen() {
  const container = canvasElements.container;
  if (!container) {
    return { clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 };
  }
  const rect = container.getBoundingClientRect();
  return {
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2
  };
}

// Performs a mathematically exact pointer-centered zoom.
// Guarantees that the exact scene position directly under (clientX, clientY)
// does not move a single pixel on screen during the zoom transition.
export function zoomAtPointer(clientX, clientY, targetZoom) {
  const container = canvasElements.container;
  if (!container) {
    return;
  }

  const rect = container.getBoundingClientRect();
  const offsetX = clientX - rect.left;
  const offsetY = clientY - rect.top;

  const state = getState();
  const oldZoom = state.viewport.zoom;
  const oldScrollX = state.viewport.scrollX;
  const oldScrollY = state.viewport.scrollY;

  const newZoom = clampZoom(targetZoom);
  if (Math.abs(newZoom - oldZoom) < 0.0001) {
    return;
  }

  // 1. Calculate the invariant scene position currently beneath the cursor:
  const sceneX = offsetX / oldZoom - oldScrollX;
  const sceneY = offsetY / oldZoom - oldScrollY;

  // 2. Invert the transform with the new zoom so (sceneX, sceneY) maps to identical (offsetX, offsetY):
  const newScrollX = offsetX / newZoom - sceneX;
  const newScrollY = offsetY / newZoom - sceneY;

  setViewport({
    zoom: newZoom,
    scrollX: newScrollX,
    scrollY: newScrollY
  });
}

// Zooms in by the standard step factor, centered on pointer or canvas middle.
export function zoomIn(clientX, clientY) {
  const coords = (clientX !== undefined && clientY !== undefined)
    ? { clientX, clientY }
    : getCanvasCenterScreen();

  const state = getState();
  const targetZoom = state.viewport.zoom * ZOOM_STEP_FACTOR;
  zoomAtPointer(coords.clientX, coords.clientY, targetZoom);
}

// Zooms out by the standard step factor, centered on pointer or canvas middle.
export function zoomOut(clientX, clientY) {
  const coords = (clientX !== undefined && clientY !== undefined)
    ? { clientX, clientY }
    : getCanvasCenterScreen();

  const state = getState();
  const targetZoom = state.viewport.zoom / ZOOM_STEP_FACTOR;
  zoomAtPointer(coords.clientX, coords.clientY, targetZoom);
}

// Resets zoom to exactly 100% (1.0), centered on the canvas middle.
export function resetZoom() {
  const center = getCanvasCenterScreen();
  zoomAtPointer(center.clientX, center.clientY, 1.0);
}

// Pans the canvas viewport by screen pixel deltas (dx, dy).
export function panByScreenDelta(screenDx, screenDy) {
  const state = getState();
  const zoom = state.viewport.zoom;

  // Screen delta divided by zoom gives scene delta:
  const newScrollX = state.viewport.scrollX + screenDx / zoom;
  const newScrollY = state.viewport.scrollY + screenDy / zoom;

  setViewport({
    zoom: state.viewport.zoom,
    scrollX: newScrollX,
    scrollY: newScrollY
  });
}

// Zooms and pans to fit all elements within the current viewport with comfortable padding.
export function zoomToFit() {
  const state = getState();
  const elements = state.elements.filter(el => !el.isDeleted);
  const container = canvasElements.container;

  if (elements.length === 0 || !container) {
    resetZoom();
    return;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    const elMinX = Math.min(el.x, el.x + el.width);
    const elMinY = Math.min(el.y, el.y + el.height);
    const elMaxX = Math.max(el.x, el.x + el.width);
    const elMaxY = Math.max(el.y, el.y + el.height);

    minX = Math.min(minX, elMinX);
    minY = Math.min(minY, elMinY);
    maxX = Math.max(maxX, elMaxX);
    maxY = Math.max(maxY, elMaxY);
  }

  const contentW = maxX - minX;
  const contentH = maxY - minY;
  const padding = 60; // 60px viewport margin

  const availW = container.clientWidth - padding * 2;
  const availH = container.clientHeight - padding * 2;

  if (availW <= 0 || availH <= 0 || contentW <= 0 || contentH <= 0) {
    resetZoom();
    return;
  }

  const fitZoom = clampZoom(Math.min(availW / contentW, availH / contentH, 1.0));
  const centerX = minX + contentW / 2;
  const centerY = minY + contentH / 2;

  const scrollX = (container.clientWidth / 2) / fitZoom - centerX;
  const scrollY = (container.clientHeight / 2) / fitZoom - centerY;

  setViewport({
    zoom: fitZoom,
    scrollX,
    scrollY
  });
}
