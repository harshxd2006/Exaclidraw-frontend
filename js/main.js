// ============================================================================
// Main Application Entry Point
// Connects shared state, coordinates, event delegation, and the two renderers.
// ============================================================================

import { setupCanvases, resizeCanvases, canvasElements } from './core/viewport.js';
import {
  getState,
  subscribe,
  addElement,
  updateElement,
  updateElements,
  setDraftElement,
  clearDraftElement,
  setSelectedElementIds,
  toggleElementSelection,
  createSnapshot,
  pushUndoSnapshot,
  clearHistory,
  notify
} from './core/state.js';
import { createElement, createDraftElement, normalizeElementBounds } from './core/element-factory.js';
import { screenToScene } from './core/coordinates.js';
import { renderStaticScene } from './core/static-renderer.js';
import { renderInteractiveScene } from './core/interactive-renderer.js';
import { loadComponent } from './component-loader.js';
import { initToolbarUI } from './features/ui/toolbar.js';
import { initPropertiesPanel } from './features/ui/properties-panel.js';
import { initKeyboardShortcuts } from './features/tools/keyboard-shortcuts.js';
import { onShapeCommitted, updateCanvasCursor } from './features/tools/tool-manager.js';
import { createPencilStroke, addPencilPoint } from './features/drawing/pencil.js';
import { normalizeFreehandElement } from './features/drawing/freehand.js';
import { measureText } from './features/drawing/text.js';
import { startTextEditor, isEditingText } from './features/ui/text-editor.js';
import { hitTestElements, hitTestElementsIncludingLocked, doesElementIntersectBox } from './features/selection/hit-test.js';
import { hitTestTransformHandles, resizeElement, hitTestLineEndpointHandles, hitTestLineMidpointHandles, hitTestLineIntermediateHandles } from './features/selection/transform.js';
import { initZoomControls } from './features/ui/zoom-controls.js';
import { zoomAtPointer, panByScreenDelta } from './features/viewport/zoom-pan.js';
import { initContextMenu, showContextMenu, hideContextMenu } from './features/ui/context-menu.js';
import { snapToGrid, snapPointToGrid, getActiveSnapStep } from './features/grid/grid-snapping.js';
import { initTopbar } from './features/ui/topbar.js';
import { initTheme } from './features/ui/topbar.js';
import { initExportDialog } from './features/ui/export-dialog.js';
import { initDragAndDrop, loadFromJsonString } from './features/export/export-json.js';
import {
  loadFromLocalStorage,
  debouncedSaveToLocalStorage,
  saveToLocalStorage
} from './features/storage/local-storage.js';
import { initStatusBar } from './features/ui/status-bar.js';
import { computeSnaps } from './features/selection/snap-engine.js';
import { setSnapGuides, clearSnapGuides } from './features/selection/snap-overlay.js';
import { initFloatingToolbar } from './features/ui/floating-toolbar.js';
import { initLayersPanel } from './features/ui/layers-panel.js';

import {
    connectDrawingRoom,
    sendDrawingUpdate,
    disconnectDrawingRoom
} from './features/api/drawing-sync.js';

// Interaction tracking variables for drawing, moving elements, marquee selection, resizing, and panning.
let isDrawing = false;
let isDraggingElements = false;
let isMarqueeSelecting = false;
let isResizing = false;
let isPanning = false;
let isSpacePressed = false;
let panStartScreen = { x: 0, y: 0 };
let activeResizeHandle = null;
let resizingElementId = null;
let initialResizeBounds = null;
let startScenePos = { x: 0, y: 0 };
let currentDraft = null;
let dragInitialPositions = {};

// Endpoint drag state (for arrow/line head/tail independent dragging)
let isDraggingEndpoint = false;
let endpointDragElementId = null;
let endpointDragHandle = null; // 'start' | 'end'
let endpointDragInitialPoints = null;
let endpointDragInitialOrigin = null;

// Bend-point drag state (for moving or inserting intermediate polyline points)
let isDraggingBendPoint = false;
let bendPointElementId = null;
let bendPointIndex = null;        // which points[] index is being dragged
let bendPointInitialPoints = null;
let bendPointInitialOrigin = null;

// History gesture snapshot tracking variables
let beforeGestureSnapshot = null;
let gestureHasMoved = false;

// Populates initial demonstration elements to verify the rendering pipeline.
function seedDemonstrationElements() {
  // 1. Title text element
  const titleText = 'Excalidraw Vanilla — Stage 19 Arrow Labels & Element Locking';
  const titleMeasured = measureText(titleText, 26, 1, 1.25);
  const title = createElement('text', {
    x: 60,
    y: 80,
    width: titleMeasured.width,
    height: titleMeasured.height,
    text: titleText,
    fontSize: 26,
    strokeColor: '#6965db'
  });

  // 2. Subtitle text element
  const subtitleText = 'Draw, edit, or move anything: your drawing is continuously auto-saved to browser storage and restored on refresh!';
  const subtitleMeasured = measureText(subtitleText, 15, 1, 1.25);
  const subtitle = createElement('text', {
    x: 60,
    y: 118,
    width: subtitleMeasured.width,
    height: subtitleMeasured.height,
    text: subtitleText,
    fontSize: 15,
    strokeColor: '#868e96'
  });

  // 3. Sample Rectangle (Layer 1 - Bottom)
  const rect = createElement('rectangle', {
    x: 60,
    y: 165,
    width: 160,
    height: 120,
    strokeColor: '#6965db',
    backgroundColor: '#ececfb',
    strokeWidth: 2
  });

  // 4. Sample Ellipse (Layer 2 - Middle - Overlaps Rectangle)
  const ellipse = createElement('ellipse', {
    x: 155,
    y: 195,
    width: 155,
    height: 120,
    strokeColor: '#2f9e44',
    backgroundColor: '#b2f2bb',
    strokeWidth: 2
  });

  // 5. Sample Diamond (Layer 3 - Top - Overlaps Ellipse)
  const diamond = createElement('diamond', {
    x: 255,
    y: 165,
    width: 145,
    height: 130,
    strokeColor: '#f08c00',
    backgroundColor: '#ffec99',
    strokeWidth: 2
  });

  // 6. Sample Line
  const line = createElement('line', {
    x: 510,
    y: 175,
    width: 110,
    height: 80,
    points: [[0, 0], [110, 80]],
    strokeColor: '#1971c2',
    strokeWidth: 2
  });

  // 7. Sample Arrow
  const arrow = createElement('arrow', {
    x: 640,
    y: 175,
    width: 110,
    height: 80,
    points: [[0, 0], [110, 80]],
    strokeColor: '#f08c00',
    strokeWidth: 2
  });

  // 8. Sample Freehand Stroke
  const freehandSample = createElement('freedraw', {
    x: 780,
    y: 175,
    width: 110,
    height: 80,
    points: [
      [0, 50], [15, 65], [35, 75], [55, 45], [75, 20], [95, 10], [110, 25]
    ],
    strokeColor: '#7950f2',
    strokeWidth: 3
  });

  // 9. Sample Multiline Editable Text
  const multilineText = '• Double-click me to edit!\n• Press Ctrl+Enter or click away to save\n• Press Escape to cancel';
  const multilineMeasured = measureText(multilineText, 20, 1, 1.3);
  const multilineSample = createElement('text', {
    x: 60,
    y: 295,
    width: multilineMeasured.width,
    height: multilineMeasured.height,
    text: multilineText,
    fontSize: 20,
    fontFamily: 1,
    lineHeight: 1.3,
    strokeColor: '#e03131'
  });

  // Add initial shapes to the committed collection.
  addElement(title);
  addElement(subtitle);
  addElement(rect);
  addElement(ellipse);
  addElement(diamond);
  addElement(line);
  addElement(arrow);
  addElement(freehandSample);
  addElement(multilineSample);

  // Mark rectangle as initially selected.
  setSelectedElementIds([rect.id]);

  // Clear history so the initial seeded demonstration is not treated as undoable actions
  clearHistory();
}

// Handles pointerdown: starts drawing, moving elements, marquee box selection, or canvas panning.
function handlePointerDown(event) {
  // Allow primary (left) mouse clicks and middle mouse wheel button (for panning).
  if (event.button !== 0 && event.button !== 1) {
    return;
  }

  // Prevent native browser drag-and-drop and text selection from intercepting pointer events
  event.preventDefault();

  // If the user is currently typing in the text editor, let the editor handle blur/clicks.
  if (isEditingText()) {
    return;
  }

  // Failsafe: force cleanup of any previous interaction state so interactions never stick
  if (isResizing) {
    isResizing = false;
    activeResizeHandle = null;
    resizingElementId = null;
    initialResizeBounds = null;
  }
  if (isDraggingElements) {
    isDraggingElements = false;
    dragInitialPositions = {};
  }
  if (isMarqueeSelecting) {
    isMarqueeSelecting = false;
    clearDraftElement();
  }

  // Reset history gesture tracking for new interaction
  beforeGestureSnapshot = null;
  gestureHasMoved = false;

  const container = canvasElements.container;
  // Capture pointer on container so release events are guaranteed to fire even if mouse leaves window
  if (container && container.setPointerCapture && event.pointerId !== undefined) {
    try {
      container.setPointerCapture(event.pointerId);
    } catch (err) {}
  }

  const state = getState();
  const activeToolType = state.activeTool.type;

  // 0. Canvas Viewport Panning (Hand tool, Spacebar held, or Middle mouse click)
  if (event.button === 1 || activeToolType === 'hand' || isSpacePressed) {
    isPanning = true;
    panStartScreen = { x: event.clientX, y: event.clientY };
    if (container) {
      container.style.cursor = 'grabbing';
    }
    return;
  }

  const containerRect = container.getBoundingClientRect();
  const scenePos = screenToScene(event.clientX, event.clientY, state.viewport, containerRect);

  // 1. Text Tool: spawn inline textarea editor at clicked location
  if (activeToolType === 'text') {
    startTextEditor({ sceneX: scenePos.x, sceneY: scenePos.y });
    return;
  }

  // 2. Selection Tool: click handle to resize, click element to select/drag, or click empty canvas for marquee box
  if (activeToolType === 'selection') {
    const selectedIds = Object.keys(state.selectedElementIds);

    // 2a. Check if clicking on an active transform handle of a single selected element
    if (selectedIds.length === 1) {
      const selectedEl = state.elements.find(el => el.id === selectedIds[0]);
      if (selectedEl) {
        // 2a-i. For lines/arrows: check endpoint handles first
        if (selectedEl.type === 'line' || selectedEl.type === 'arrow') {
          // Priority 1: existing intermediate (bend) point handles
          const intHit = hitTestLineIntermediateHandles(scenePos.x, scenePos.y, selectedEl, state.viewport.zoom);
          if (intHit) {
            isDraggingBendPoint = true;
            bendPointElementId = selectedEl.id;
            bendPointIndex = intHit.pointIndex;
            bendPointInitialPoints = selectedEl.points.map(p => [...p]);
            bendPointInitialOrigin = { x: selectedEl.x, y: selectedEl.y };
            startScenePos = scenePos;
            beforeGestureSnapshot = createSnapshot(state);
            return;
          }

          // Priority 2: endpoint handles (start / end)
          const epHit = hitTestLineEndpointHandles(scenePos.x, scenePos.y, selectedEl, state.viewport.zoom);
          if (epHit) {
            isDraggingEndpoint = true;
            endpointDragElementId = selectedEl.id;
            endpointDragHandle = epHit;
            endpointDragInitialPoints = selectedEl.points.map(p => [...p]);
            endpointDragInitialOrigin = { x: selectedEl.x, y: selectedEl.y };
            startScenePos = scenePos;
            beforeGestureSnapshot = createSnapshot(state);
            return;
          }

          // Priority 3: segment midpoint handles — insert a new bend point then drag it
          const midHit = hitTestLineMidpointHandles(scenePos.x, scenePos.y, selectedEl, state.viewport.zoom);
          if (midHit) {
            const insertIdx = midHit.segmentIndex + 1;
            const newPx = Math.round(scenePos.x - selectedEl.x);
            const newPy = Math.round(scenePos.y - selectedEl.y);
            const newPoints = [
              ...selectedEl.points.slice(0, insertIdx).map(p => [...p]),
              [newPx, newPy],
              ...selectedEl.points.slice(insertIdx).map(p => [...p])
            ];
            updateElement(selectedEl.id, { points: newPoints });
            // Now drag that newly inserted point
            const updatedEl = getState().elements.find(e => e.id === selectedEl.id);
            isDraggingBendPoint = true;
            bendPointElementId = selectedEl.id;
            bendPointIndex = insertIdx;
            bendPointInitialPoints = newPoints.map(p => [...p]);
            bendPointInitialOrigin = { x: updatedEl ? updatedEl.x : selectedEl.x, y: updatedEl ? updatedEl.y : selectedEl.y };
            startScenePos = scenePos;
            beforeGestureSnapshot = createSnapshot(state);
            return;
          }
        }

        // 2a-ii. Regular bounding-box handles
        const handleHit = hitTestTransformHandles(scenePos.x, scenePos.y, selectedEl, state.viewport.zoom);
        if (handleHit) {
          isResizing = true;
          activeResizeHandle = handleHit.handle;
          resizingElementId = selectedEl.id;
          beforeGestureSnapshot = createSnapshot(state);

          // Normalize bounds so width and height are strictly positive before starting resize
          const norm = normalizeElementBounds(selectedEl);
          initialResizeBounds = {
            x: norm.x,
            y: norm.y,
            width: norm.width,
            height: norm.height,
            fontSize: selectedEl.fontSize,
            points: selectedEl.points ? selectedEl.points.map(p => [...p]) : null
          };
          startScenePos = scenePos;
          return;
        }
      }
    }

    // 2b. Check if clicking on any element to select or move
    const hitElement = hitTestElements(scenePos.x, scenePos.y, state.elements);

    if (hitElement) {
      if (event.shiftKey) {
        // Shift+Click: toggle selection of the clicked element
        toggleElementSelection(hitElement.id);
      } else {
        // Regular Click: if the clicked element is not already selected, select only it
        if (!state.selectedElementIds[hitElement.id]) {
          setSelectedElementIds([hitElement.id]);
        }
      }

      // Check if this click also hits one of this element's 8 transform handles!
      const handleHitOnElement = hitTestTransformHandles(scenePos.x, scenePos.y, hitElement, state.viewport.zoom);
      if (handleHitOnElement && !event.shiftKey) {
        isResizing = true;
        activeResizeHandle = handleHitOnElement.handle;
        resizingElementId = hitElement.id;
        beforeGestureSnapshot = createSnapshot(state);

        const norm = normalizeElementBounds(hitElement);
        initialResizeBounds = {
          x: norm.x,
          y: norm.y,
          width: norm.width,
          height: norm.height,
          fontSize: hitElement.fontSize,
          points: hitElement.points ? hitElement.points.map(p => [...p]) : null
        };
        startScenePos = scenePos;
        return;
      }

      // Initialize dragging for all currently selected elements
      const updatedState = getState();
      dragInitialPositions = {};
      for (const el of updatedState.elements) {
        if (updatedState.selectedElementIds[el.id]) {
          dragInitialPositions[el.id] = { x: el.x, y: el.y };
        }
      }

      // Only begin dragging if at least one element is selected
      if (Object.keys(dragInitialPositions).length > 0) {
        isDraggingElements = true;
        startScenePos = scenePos;
        beforeGestureSnapshot = createSnapshot(updatedState);
      }
      return;
    }

    // 2c. Check if clicking on a transform handle of ANY unselected element (e.g. corner handle just outside shape)
    for (let i = state.elements.length - 1; i >= 0; i--) {
      const el = state.elements[i];
      const handleHit = hitTestTransformHandles(scenePos.x, scenePos.y, el, state.viewport.zoom);
      if (handleHit) {
        setSelectedElementIds([el.id]);
        isResizing = true;
        activeResizeHandle = handleHit.handle;
        resizingElementId = el.id;
        beforeGestureSnapshot = createSnapshot(getState());

        const norm = normalizeElementBounds(el);
        initialResizeBounds = {
          x: norm.x,
          y: norm.y,
          width: norm.width,
          height: norm.height,
          fontSize: el.fontSize,
          points: el.points ? el.points.map(p => [...p]) : null
        };
        startScenePos = scenePos;
        return;
      }
    }

    // 2d. Clicked completely empty canvas: clear selection (unless holding Shift) and start marquee
    if (!event.shiftKey) {
      setSelectedElementIds([]);
    }

    isMarqueeSelecting = true;
    startScenePos = scenePos;
    currentDraft = {
      type: 'selection',
      x: scenePos.x,
      y: scenePos.y,
      width: 0,
      height: 0
    };
    setDraftElement(currentDraft);
    return;
  }

  // 3. Freehand Pencil Drawing Tool
  if (activeToolType === 'freedraw') {
    isDrawing = true;
    startScenePos = scenePos;
    currentDraft = createPencilStroke(scenePos.x, scenePos.y, {
      strokeColor: state.elementProperties.strokeColor,
      strokeWidth: state.elementProperties.strokeWidth,
      opacity: state.elementProperties.opacity
    });

    setSelectedElementIds([]);
    setDraftElement(currentDraft);
    return;
  }

  // 4. Basic Shape Drawing Tools
  const basicShapeTools = ['rectangle', 'ellipse', 'diamond', 'line', 'arrow'];
  if (!basicShapeTools.includes(activeToolType)) {
    return;
  }

  isDrawing = true;
  const snapStep = getActiveSnapStep(event);
  startScenePos = snapPointToGrid(scenePos.x, scenePos.y, snapStep);

  // Create zero-dimension draft element at click location.
  currentDraft = createDraftElement(activeToolType, startScenePos.x, startScenePos.y, {
    strokeColor: state.elementProperties.strokeColor,
    backgroundColor: state.elementProperties.backgroundColor,
    fillStyle: state.elementProperties.fillStyle,
    strokeWidth: state.elementProperties.strokeWidth,
    strokeStyle: state.elementProperties.strokeStyle,
    roughness: state.elementProperties.roughness,
    opacity: state.elementProperties.opacity
  });

  setSelectedElementIds([]);
  setDraftElement(currentDraft);
}

// Handles pointermove: resizes shapes via handles, drags elements, resizes marquee, or draws shapes.
function handlePointerMove(event) {
  const state = getState();
  const container = canvasElements.container;

  // 0. Live Canvas Viewport Panning
  if (isPanning) {
    const dx = event.clientX - panStartScreen.x;
    const dy = event.clientY - panStartScreen.y;
    panByScreenDelta(dx, dy);
    panStartScreen = { x: event.clientX, y: event.clientY };
    return;
  }

  const containerRect = container.getBoundingClientRect();
  const currentScenePos = screenToScene(event.clientX, event.clientY, state.viewport, containerRect);

  // 0b. Live Bend-Point Dragging (moving an intermediate polyline point)
  if (isDraggingBendPoint && bendPointElementId !== null && bendPointIndex !== null && bendPointInitialPoints) {
    gestureHasMoved = true;
    const snapStep = getActiveSnapStep(event);
    const snapped = snapPointToGrid(currentScenePos.x, currentScenePos.y, snapStep);
    const newPx = Math.round(snapped.x - bendPointInitialOrigin.x);
    const newPy = Math.round(snapped.y - bendPointInitialOrigin.y);
    const newPoints = bendPointInitialPoints.map((p, i) =>
      i === bendPointIndex ? [newPx, newPy] : [...p]
    );
    // Keep width/height in sync with the last point (end of arrow)
    const lastPt = newPoints[newPoints.length - 1];
    updateElement(bendPointElementId, { points: newPoints, width: lastPt[0], height: lastPt[1] });
    return;
  }

  // 1. Live Endpoint Dragging (line / arrow head or tail)
  if (isDraggingEndpoint && endpointDragElementId && endpointDragInitialPoints) {
    gestureHasMoved = true;

    const snapStep = getActiveSnapStep(event);
    const snapped = snapPointToGrid(currentScenePos.x, currentScenePos.y, snapStep);
    const targetEl = state.elements.find(el => el.id === endpointDragElementId);
    if (targetEl) {
      const newPoints = endpointDragInitialPoints.map(p => [...p]);
      const origin = endpointDragInitialOrigin;

      if (endpointDragHandle === 'start') {
        // Move the start point; adjust element origin so end stays fixed
        const oldStartX = origin.x + newPoints[0][0];
        const oldStartY = origin.y + newPoints[0][1];
        const dx = snapped.x - oldStartX;
        const dy = snapped.y - oldStartY;
        // Shift origin to new start position
        const newOriginX = origin.x + dx;
        const newOriginY = origin.y + dy;
        // Recalculate all points relative to new origin
        const adjustedPoints = newPoints.map(([px, py], i) =>
          i === 0 ? [0, 0] : [Math.round(px - dx), Math.round(py - dy)]
        );
        const endPt = adjustedPoints[adjustedPoints.length - 1];
        updateElement(endpointDragElementId, {
          x: Math.round(newOriginX),
          y: Math.round(newOriginY),
          width: endPt[0],
          height: endPt[1],
          points: adjustedPoints
        });
      } else {
        // Move the end point; origin (start) stays fixed
        const lastIdx = newPoints.length - 1;
        const newEndX = Math.round(snapped.x - origin.x);
        const newEndY = Math.round(snapped.y - origin.y);
        newPoints[lastIdx] = [newEndX, newEndY];
        updateElement(endpointDragElementId, {
          width: newEndX,
          height: newEndY,
          points: newPoints
        });
      }
    }
    return;
  }

  // 2. Live Element Resizing via 8 Transform Handles
  if (isResizing && resizingElementId && initialResizeBounds) {
    const dx = currentScenePos.x - startScenePos.x;
    const dy = currentScenePos.y - startScenePos.y;

    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
      gestureHasMoved = true;
    }

    const snapStep = getActiveSnapStep(event);
    let effectiveDx = dx;
    let effectiveDy = dy;
    if (snapStep > 1) {
      effectiveDx = snapToGrid(dx, snapStep);
      effectiveDy = snapToGrid(dy, snapStep);
    }

    const targetEl = state.elements.find(el => el.id === resizingElementId);
    if (targetEl) {
      const resizedUpdates = resizeElement(
        targetEl,
        activeResizeHandle,
        effectiveDx,
        effectiveDy,
        initialResizeBounds,
        { keepAspectRatio: event.shiftKey }
      );
      updateElement(resizingElementId, resizedUpdates);
    }
    return;
  }

  // 2. Moving/Dragging Selected Elements
  if (isDraggingElements) {
    let dx = currentScenePos.x - startScenePos.x;
    let dy = currentScenePos.y - startScenePos.y;

    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
      gestureHasMoved = true;
    }

    const snapStep = getActiveSnapStep(event);
    // Element-to-element snapping: active when grid snap is NOT engaged
    if (snapStep <= 1) {
      const currentState = getState();
      const draggingElements = currentState.elements.filter(
        el => currentState.selectedElementIds[el.id] && !el.isDeleted
      );
      const { snapDx, snapDy, guides } = computeSnaps(
        draggingElements,
        currentState.elements,
        currentState.selectedElementIds,
        currentState.viewport.zoom
      );
      setSnapGuides(guides);
      dx += snapDx;
      dy += snapDy;
    } else {
      dx = snapToGrid(dx, snapStep);
      dy = snapToGrid(dy, snapStep);
      clearSnapGuides();
    }

    // Shift key constraint: lock movement to strictly horizontal or vertical axis
    if (event.shiftKey) {
      if (Math.abs(dx) > Math.abs(dy)) {
        dy = 0;
      } else {
        dx = 0;
      }
    }

    const updates = {};
    for (const id in dragInitialPositions) {
      const initial = dragInitialPositions[id];
      updates[id] = {
        x: Math.round(initial.x + dx),
        y: Math.round(initial.y + dy)
      };
    }
    updateElements(updates);
    return;
  }

  // 3. Selection Marquee Box Drag
  if (isMarqueeSelecting && currentDraft) {
    currentDraft.width = currentScenePos.x - startScenePos.x;
    currentDraft.height = currentScenePos.y - startScenePos.y;
    setDraftElement({ ...currentDraft });

    // Select all elements whose bounds intersect the marquee box
    const intersectingIds = [];
    for (const el of state.elements) {
      if (doesElementIntersectBox(el, currentDraft)) {
        intersectingIds.push(el.id);
      }
    }
    setSelectedElementIds(intersectingIds);
    return;
  }

  // 4. Drawing Shapes & Freehand Strokes
  if (isDrawing && currentDraft) {
    // 4a. Freehand tool: stream new points into the active stroke
    if (currentDraft.type === 'freedraw') {
      currentDraft = addPencilPoint(currentDraft, currentScenePos.x, currentScenePos.y);
      setDraftElement(currentDraft);
      return;
    }

    // 4b. Basic shapes: calculate dx and dy with optional Shift-key constraints
    const snapStep = getActiveSnapStep(event);
    const snappedPos = snapPointToGrid(currentScenePos.x, currentScenePos.y, snapStep);
    let dx = snappedPos.x - startScenePos.x;
    let dy = snappedPos.y - startScenePos.y;

    if (event.shiftKey) {
      if (currentDraft.type === 'line' || currentDraft.type === 'arrow') {
        const angle = Math.atan2(dy, dx);
        const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
        const length = Math.hypot(dx, dy);
        dx = length * Math.cos(snappedAngle);
        dy = length * Math.sin(snappedAngle);
      } else {
        const maxDim = Math.max(Math.abs(dx), Math.abs(dy));
        dx = (dx < 0 ? -1 : 1) * maxDim;
        dy = (dy < 0 ? -1 : 1) * maxDim;
      }
    }

    currentDraft = {
      ...currentDraft,
      width: dx,
      height: dy
    };

    if (currentDraft.type === 'line' || currentDraft.type === 'arrow') {
      currentDraft.points = [[0, 0], [dx, dy]];
    }

    setDraftElement(currentDraft);
    return;
  }

  // 5. Hover Cursors in Selection Mode
  if (state.activeTool.type === 'selection' && !isDraggingElements && !isMarqueeSelecting && !isResizing && !isPanning && !isSpacePressed && !isDraggingEndpoint && !isDraggingBendPoint) {
    const selectedIds = Object.keys(state.selectedElementIds);

    if (selectedIds.length === 1) {
      const selectedEl = state.elements.find(el => el.id === selectedIds[0]);
      if (selectedEl && (selectedEl.type === 'line' || selectedEl.type === 'arrow')) {
        // Intermediate (bend) point handle → move cursor
        const intHit = hitTestLineIntermediateHandles(currentScenePos.x, currentScenePos.y, selectedEl, state.viewport.zoom);
        if (intHit) { container.style.cursor = 'move'; return; }
        // Endpoint handle → crosshair
        const epHit = hitTestLineEndpointHandles(currentScenePos.x, currentScenePos.y, selectedEl, state.viewport.zoom);
        if (epHit) { container.style.cursor = 'crosshair'; return; }
        // Segment midpoint (insert) → cell cursor signals "add"
        const midHit = hitTestLineMidpointHandles(currentScenePos.x, currentScenePos.y, selectedEl, state.viewport.zoom);
        if (midHit) { container.style.cursor = 'cell'; return; }
      } else if (selectedEl) {
        const handleHit = hitTestTransformHandles(currentScenePos.x, currentScenePos.y, selectedEl, state.viewport.zoom);
        if (handleHit) { container.style.cursor = handleHit.cursor; return; }
      }
    }

    const hoverHit = hitTestElements(currentScenePos.x, currentScenePos.y, state.elements);
    container.style.cursor = hoverHit ? 'move' : 'default';
  }
}

// Handles pointerup: finalizes shape creation, commits moved elements, closes marquee, or normalizes resized elements.
function handlePointerUp(event) {
  const container = canvasElements.container;

  // 0. Finalize Viewport Panning
  if (isPanning) {
    isPanning = false;
    if (container) {
      const state = getState();
      container.style.cursor = (isSpacePressed || state.activeTool.type === 'hand')
        ? 'grab'
        : (state.activeTool.type === 'selection' ? 'default' : 'crosshair');
    }
    return;
  }

  // Release pointer capture on container so pointer tracking is fully released
  if (container && container.releasePointerCapture && event && event.pointerId !== undefined) {
    try {
      if (container.hasPointerCapture(event.pointerId)) {
        container.releasePointerCapture(event.pointerId);
      }
    } catch (err) {}
  }

  const state = getState();

  // 0a. Finalize Bend-Point Dragging
  if (isDraggingBendPoint) {
    if (gestureHasMoved && beforeGestureSnapshot) {
      pushUndoSnapshot(beforeGestureSnapshot);
    }
    isDraggingBendPoint = false;
    bendPointElementId = null;
    bendPointIndex = null;
    bendPointInitialPoints = null;
    bendPointInitialOrigin = null;
    beforeGestureSnapshot = null;
    gestureHasMoved = false;
    if (container) container.style.cursor = 'default';
    return;
  }

  // 0. Finalize Endpoint Dragging
  if (isDraggingEndpoint) {
    if (gestureHasMoved && beforeGestureSnapshot) {
      pushUndoSnapshot(beforeGestureSnapshot);
    }
    isDraggingEndpoint = false;
    endpointDragElementId = null;
    endpointDragHandle = null;
    endpointDragInitialPoints = null;
    endpointDragInitialOrigin = null;
    beforeGestureSnapshot = null;
    gestureHasMoved = false;
    if (container) container.style.cursor = 'default';
    return;
  }

  // 1. Finalize Resizing
  if (isResizing) {
    if (resizingElementId) {
      const el = state.elements.find(item => item.id === resizingElementId);
      if (el) {
        const normalized = normalizeElementBounds(el);
        updateElement(resizingElementId, normalized);
      }
    }

    if (gestureHasMoved && beforeGestureSnapshot) {
      pushUndoSnapshot(beforeGestureSnapshot);
    }
    beforeGestureSnapshot = null;
    gestureHasMoved = false;

    isResizing = false;
    activeResizeHandle = null;
    resizingElementId = null;
    initialResizeBounds = null;
    if (container) {
      container.style.cursor = 'default';
    }
    return;
  }

  // 2. Finalize Dragging Elements
  if (isDraggingElements) {
    clearSnapGuides();
    if (gestureHasMoved && beforeGestureSnapshot) {
      pushUndoSnapshot(beforeGestureSnapshot);
    }
    beforeGestureSnapshot = null;
    gestureHasMoved = false;

    isDraggingElements = false;
    dragInitialPositions = {};
    return;
  }

  // 3. Finalize Marquee Selection Box
  if (isMarqueeSelecting) {
    isMarqueeSelecting = false;
    currentDraft = null;
    clearDraftElement();
    return;
  }

  // 4. Finalize Shape Drawing
  if (!isDrawing || !currentDraft) {
    return;
  }

  isDrawing = false;

  // 4a. Commit Freehand Stroke
  if (currentDraft.type === 'freedraw') {
    const finalizedStroke = normalizeFreehandElement(currentDraft);
    if (finalizedStroke.points && finalizedStroke.points.length > 0) {
      addElement(finalizedStroke);
      setSelectedElementIds([finalizedStroke.id]);
    }

    currentDraft = null;
    clearDraftElement();
    onShapeCommitted();
    return;
  }

  // 4b. Commit Basic Shapes
  let finalizedElement;

  if (currentDraft.type === 'line' || currentDraft.type === 'arrow') {
    finalizedElement = { ...currentDraft };
  } else {
    finalizedElement = normalizeElementBounds(currentDraft);
  }

  const size = Math.hypot(finalizedElement.width, finalizedElement.height);
  if (size > 4) {
    addElement(finalizedElement);
    setSelectedElementIds([finalizedElement.id]);
  }

  currentDraft = null;
  clearDraftElement();
  onShapeCommitted();
}

// Handles double-click events: opens the inline editor on text elements,
// or opens a label editor when double-clicking an arrow or line.
function handleDoubleClick(event) {
  const state = getState();
  const containerRect = canvasElements.container.getBoundingClientRect();
  const scenePos = screenToScene(event.clientX, event.clientY, state.viewport, containerRect);
  const hitElement = hitTestElements(scenePos.x, scenePos.y, state.elements);

  if (hitElement && hitElement.type === 'text') {
    // Edit the text element content.
    startTextEditor({ existingElement: hitElement });
  } else if (hitElement && (hitElement.type === 'line' || hitElement.type === 'arrow')) {
    // Open label editor at the midpoint of the line/arrow.
    setSelectedElementIds([hitElement.id]);
    startTextEditor({ existingElement: hitElement });
  }
}

// Handles context menu (right-click): selects clicked element and displays layer/object action menu.
function handleContextMenu(event) {
  event.preventDefault();
  const state = getState();
  const container = canvasElements.container;
  if (!container) return;

  const containerRect = container.getBoundingClientRect();
  const scenePos = screenToScene(event.clientX, event.clientY, state.viewport, containerRect);

  // Use the inclusive version so right-clicking a locked element still offers Unlock.
  const hitElement = hitTestElementsIncludingLocked(scenePos.x, scenePos.y, state.elements);

  if (hitElement) {
    if (hitElement.isLocked) {
      // For locked elements: don't select them, but open context menu so user can unlock.
      showContextMenu(event.clientX, event.clientY, scenePos, hitElement.id);
    } else {
      if (!state.selectedElementIds[hitElement.id]) {
        setSelectedElementIds([hitElement.id]);
      }
      showContextMenu(event.clientX, event.clientY, scenePos);
    }
  } else {
    // Empty canvas right-click — show for paste / grid toggle
    showContextMenu(event.clientX, event.clientY, scenePos);
  }
}

// Handles wheel events: pointer-centered zoom (Ctrl+Wheel / Pinch) and canvas panning (Wheel / Trackpad).
function handleWheel(event) {
  event.preventDefault();
  const state = getState();

  if (event.ctrlKey || event.metaKey) {
    // Pointer-Centered Zoom
    const zoomFactor = Math.pow(0.995, event.deltaY);
    const targetZoom = state.viewport.zoom * zoomFactor;
    zoomAtPointer(event.clientX, event.clientY, targetZoom);
  } else {
    // Canvas Viewport Panning via two-finger trackpad or wheel
    let dx = -event.deltaX;
    let dy = -event.deltaY;
    if (event.shiftKey && event.deltaX === 0) {
      // Shift + vertical scroll wheel scrolls horizontally
      dx = -event.deltaY;
      dy = 0;
    }
    panByScreenDelta(dx, dy);
  }
}

// Tracks spacebar key down to temporarily activate pan cursor and interaction.
function handleGlobalKeyDown(event) {
  if (event.code === 'Space' && !isSpacePressed) {
    const activeElement = document.activeElement;
    const isInputActive =
      activeElement &&
      (activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable);

    if (!isInputActive) {
      isSpacePressed = true;
      if (!isPanning && canvasElements.container) {
        canvasElements.container.style.cursor = 'grab';
      }
    }
  }
}

// Tracks spacebar key up to restore active tool cursor.
function handleGlobalKeyUp(event) {
  if (event.code === 'Space') {
    isSpacePressed = false;
    if (!isPanning && canvasElements.container) {
      const state = getState();
      updateCanvasCursor(state.activeTool.type);
    }
  }
}

// Initializes the application once the DOM is ready.
async function initializeApp() {
  console.log('[Excalidraw Vanilla] Initializing Stage 11 Application...');

  // Setup the two canvases by passing their element IDs.
  const isReady = setupCanvases('canvas-container', 'static-canvas', 'interactive-canvas');

  if (!isReady) {
    console.error('[Excalidraw Vanilla] Initialization aborted due to missing canvas elements.');
    return;
  }

  // Subscribe renderers to state changes: whenever state updates, re-render both layers and auto-save.
  subscribe(s => {
    renderStaticScene();
    renderInteractiveScene();
    debouncedSaveToLocalStorage(s);
  });

  // Initial sizing and DPR buffer setup.
  resizeCanvases();

  // Load saved scene from localStorage if present, otherwise seed demonstration elements
  const savedScene = loadFromLocalStorage();
  const state = getState();
  if (savedScene && Array.isArray(savedScene.elements) && savedScene.elements.length > 0) {
    state.elements = savedScene.elements;
    state.selectedElementIds = {};
    if (savedScene.appState) {
      if (typeof savedScene.appState.viewBackgroundColor === 'string') {
        state.viewBackgroundColor = savedScene.appState.viewBackgroundColor;
      }
      if (typeof savedScene.appState.gridSize === 'number') {
        state.gridSize = savedScene.appState.gridSize;
      }
      if (typeof savedScene.appState.showGrid === 'boolean') {
        state.showGrid = savedScene.appState.showGrid;
      }
      if (savedScene.appState.viewport) {
        state.viewport = { ...state.viewport, ...savedScene.appState.viewport };
      }
      if (savedScene.appState.elementProperties) {
        state.elementProperties = { ...state.elementProperties, ...savedScene.appState.elementProperties };
      }
    }
    clearHistory();
    console.log(`[LocalStorage] Restored ${state.elements.length} elements from browser storage.`);
  } else {
    seedDemonstrationElements();
  }

  // Theme + readable default strokes before UI panels first sync
  initTheme();

  // Initialize toolbar UI immediately if already in DOM, or load template as fallback.
  const toolbarContainer = document.getElementById('toolbar-container');
  if (toolbarContainer && toolbarContainer.querySelector('.tool-btn')) {
    initToolbarUI();
  } else {
    const toolbarLoaded = await loadComponent('toolbar-container', 'components/toolbar.html');
    if (toolbarLoaded) {
      initToolbarUI();
    }
  }

  // Initialize properties panel UI immediately if already in DOM, or load template as fallback.
  const propsContainer = document.getElementById('properties-panel-container');
  if (propsContainer && propsContainer.querySelector('.properties-panel')) {
    initPropertiesPanel();
  } else {
    const propertiesLoaded = await loadComponent('properties-panel-container', 'components/properties-panel.html');
    if (propertiesLoaded) {
      initPropertiesPanel();
    }
  }

  // Initialize bottom-left zoom controls UI
  initZoomControls();

  // Initialize right-click context menu UI
  initContextMenu();

  // Initialize bottom-right status bar and persistence indicator
  initStatusBar();

  // Initialize topbar, hamburger main menu, open/save/export triggers
  initTopbar();

  // Initialize export image modal dialog
  initExportDialog();

  // Initialize drag & drop file loading on canvas container
  initDragAndDrop(canvasElements.container, content => {
    if (loadFromJsonString(content, getState(), notify)) {
      saveToLocalStorage(getState());
    }
  });

  // Register global hotkeys (1-8, V, R, D, O, A, L, P, T, E, H, Q, Ctrl++, Ctrl+-, Ctrl+0, Ctrl+[, Ctrl+], Ctrl+S, Ctrl+O, Ctrl+Shift+E).
  initKeyboardShortcuts();

  // Attach window resize listener.
  window.addEventListener('resize', resizeCanvases);

  // Attach pointer events to both container and window to guarantee pointerup/cancel never get lost
  const container = canvasElements.container;
  container.addEventListener('pointerdown', handlePointerDown);
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp);
  container.addEventListener('pointerup', handlePointerUp);
  window.addEventListener('pointercancel', handlePointerUp);
  container.addEventListener('pointercancel', handlePointerUp);
  window.addEventListener('mouseup', handlePointerUp);
  container.addEventListener('dblclick', handleDoubleClick);

  // Right-click context menu listener
  container.addEventListener('contextmenu', handleContextMenu);

  // Wheel events for pointer-centered zoom and trackpad panning
  container.addEventListener('wheel', handleWheel, { passive: false });

  // Spacebar tracking for canvas panning
  // 14. Initialize floating action toolbar (appears above selected elements)
  initFloatingToolbar();

  // 15. Initialize layers panel (toggle with Ctrl+Shift+H or layers button)
  initLayersPanel();

  window.addEventListener('keydown', handleGlobalKeyDown);
  window.addEventListener('keyup', handleGlobalKeyUp);

  // Initial paint (subscribers are registered; scene was loaded before first notify)
  notify();

  let isApplyingRemoteUpdate = false;

  let previousElements = JSON.stringify(getState().elements);

  const roomId = new URLSearchParams(window.location.search)
    .get("room") || "demo-room";

    let currentUserName = localStorage.getItem("exacollab-user-name");

if (!currentUserName) {
    currentUserName = prompt("Enter your display name:")?.trim() || "Guest";

    localStorage.setItem("exacollab-user-name", currentUserName);


    
}


// Get collaborators UI elements.
const collaboratorsToggle = document.getElementById("collaborators-toggle");
const collaboratorsPanel = document.getElementById("collaborators-panel");
const collaboratorsWrapper = document.querySelector(".collaborators-wrapper");

// Open and close the collaborators panel.
collaboratorsToggle.addEventListener("click", (event) => {

    event.stopPropagation();

    const isOpen = collaboratorsToggle.getAttribute("aria-expanded") === "true";

    collaboratorsPanel.hidden = isOpen;

    collaboratorsToggle.setAttribute(
        "aria-expanded",
        String(!isOpen)
    );
});

// Close when clicking outside.
document.addEventListener("click", (event) => {

    if (!collaboratorsWrapper.contains(event.target)) {

        collaboratorsPanel.hidden = true;

        collaboratorsToggle.setAttribute("aria-expanded", "false");
    }
});

// Close when pressing Escape.
document.addEventListener("keydown", (event) => {

    if (event.key === "Escape") {

        collaboratorsPanel.hidden = true;

        collaboratorsToggle.setAttribute("aria-expanded", "false");
    }
});
// Connect to the drawing room.
connectDrawingRoom(

    roomId,

    // 1. Handles received drawing updates.
    (message) => {

        console.log("[Collaboration] Received drawing update:", message);

        if (!Array.isArray(message.elements)) {
            return;
        }

        const state = getState();

        isApplyingRemoteUpdate = true;

        try {

            state.elements = message.elements;

            const receivedIds = new Set(
                message.elements.map(element => element.id)
            );

            for (const id of Object.keys(state.selectedElementIds)) {
                if (!receivedIds.has(id)) {
                    delete state.selectedElementIds[id];
                }
            }

            notify();

        } finally {

            previousElements = JSON.stringify(state.elements);
            isApplyingRemoteUpdate = false;

        }
    },

    // 2. Pass the current user's name.
    currentUserName,

    // 3. Handle online-user updates.
    (usernames) => {

    console.log("[Presence] Current online users:", usernames);

   const countElement = document.getElementById("collaborators-count");
    const avatarList = document.getElementById("collaborators-list");
    const panelList = document.getElementById("collaborators-panel-list");

    // Update online count.
    countElement.textContent = `${usernames.length} online`;

    // Clear previous avatars and names.
    avatarList.innerHTML = "";
    panelList.innerHTML = "";

    // Create an avatar and a name entry for each session.
    usernames.forEach((username) => {

        const name = String(username || "Guest");

        // Create avatar.
        const avatar = document.createElement("div");
        avatar.className = "collaborator-avatar";
        avatar.textContent = name.charAt(0).toUpperCase();
        avatar.title = name;

        avatarList.appendChild(avatar);

        // Create collaborator row.
        const row = document.createElement("div");
        row.className = "collaborator-row";

        const status = document.createElement("span");
        status.className = "collaborator-status";

        const nameElement = document.createElement("span");
        nameElement.className = "collaborator-name";
        nameElement.textContent = name;

        row.appendChild(status);
        row.appendChild(nameElement);

        panelList.appendChild(row);
    });
}

);

let syncTimer = null;
let pendingElements = null;


// Listen for local state changes.
subscribe((state) => {

    const currentElements = JSON.stringify(state.elements);

    if (currentElements === previousElements) {
        return;
    }

    previousElements = currentElements;

    // Don't rebroadcast changes received from another user.
    if (isApplyingRemoteUpdate) {
        return;
    }

    console.log("[Collaboration] Sending drawing update:", state.elements);

    // Keep the latest drawing state waiting to be sent.
    pendingElements = JSON.parse(currentElements);

    // Send at most one update every 100 milliseconds.
    if (syncTimer !== null) {
        return;
    }

    syncTimer = setTimeout(() => {

        syncTimer = null;

        const elementsToSend = pendingElements;

        pendingElements = null;

        if (elementsToSend) {
            sendDrawingUpdate(currentUserName, elementsToSend);
        }

    }, 100);

});
window.sendTestDrawingUpdate = () => {

    const testRectangle = createElement("rectangle", {
        x: 100,
        y: 100,
        width: 150,
        height: 80,

        strokeColor: "#ff0000",
        backgroundColor: "#ffcccc",
        fillStyle: "solid",
        strokeWidth: 3
    });

    sendDrawingUpdate("Harsh", [testRectangle]);
};

  console.log('[Excalidraw Vanilla] Stage 19 Arrow Labels & Element Locking initialized successfully.');
}

// Wait for the DOM to be ready before initializing.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
