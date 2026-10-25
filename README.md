# Excalidraw Vanilla

A modular recreation of Excalidraw's frontend using plain **HTML**, **CSS**, and **Vanilla JavaScript (native ES Modules)** with **HTML Canvas 2D**.

## Key Architecture Principles

1. **Mandatory Two-Canvas Architecture**:
   - `static-canvas`: Renders committed scene elements, background color, and grid lines.
   - `interactive-canvas`: Renders transient graphics (drawing previews, selection bounding box, 8 resize handles, snapping guides).
   - `pointer-events: none` on the overlay canvas ensures events fall cleanly through to the workspace container.
2. **Device Pixel Ratio (DPR) Scaling**:
   - Both canvases automatically size their internal rendering buffers (`canvas.width = cssWidth * dpr`) to remain sharp on high-DPI displays (e.g. Retina).
3. **No External Frameworks or Libraries**:
   - Built purely with Vanilla HTML5 Canvas 2D and ES Modules.

## How to Run Locally

Because the project uses native ES Modules (`import`/`export`), open the project through any local HTTP server:

```bash
# Option 1: Using npm script
npm run dev

# Option 2: Using npx serve directly
npx serve .

# Option 3: Using Python built-in server
python -m http.server 3000
```

Then open `http://localhost:3000` in your browser.

## Implemented Architecture Stages

- **Stage 1–4**: Project structure, two-canvas architecture (`static-canvas` & `interactive-canvas`), DPR buffer scaling.
- **Stage 5–10**: Full drawing tool suite (Rectangle, Diamond, Ellipse, Line, Arrow, Freehand Pencil, Text, Eraser).
- **Stage 11**: Hit testing & 8-handle transformation resizing (NW, N, NE, E, SE, S, SW, W).
- **Stage 12**: Element styling properties panel (Stroke, Fill, Fill Style, Stroke Width, Dash, Sloppiness, Text attributes).
- **Stage 13**: History Manager (Undo `Ctrl+Z` / Redo `Ctrl+Y`, gesture deduplication, visual dock buttons).
- **Stage 14**: Clipboard Engine (Copy `Ctrl+C`, Cut `Ctrl+X`, Paste `Ctrl+V`, external plaintext paste).
- **Stage 15**: Canvas Dot Grid & Snapping (20px mathematical grid snapping, `Ctrl+'` toggle, Ctrl bypass).
- **Stage 16**: Export Engine & File I/O:
  - **PNG Export**: Off-screen canvas rendering at 1x, 2x, 3x scale, background toggle, PNG file download, and direct clipboard copying.
  - **SVG Export**: Pure vector XML export for rectangles, diamonds, ellipses, lines, arrows, freehand strokes, and multiline text.
  - **JSON Canvas Save & Load**: Compatible `.excalidraw` schema file save (`Ctrl+S`), load (`Ctrl+O`), and drag-and-drop loading directly onto the canvas.
  - **Main Topbar & Modal UI**: Hamburger menu, quick export button, live checkerboard preview modal dialog.
- **Stage 17**: LocalStorage Auto-Save Persistence:
  - **Debounced Continuous Auto-Save**: Automatically serializes elements and app state (`zoom`, `scrollX`, `scrollY`, `gridSize`, `showGrid`, default styles) to `localStorage` with a 350ms debounce window.
  - **Scene Restoration on Startup**: Automatically checks for saved drawings and restores them seamlessly when opening or refreshing the app.
  - **Status Bar Indicator**: Bottom-right status pill displaying real-time save states ("Saved", "Saving...", "Save failed") and active scene/selection metrics.
  - **Clean Reset Synchronization**: Canvas reset clears stored data from `localStorage`.
