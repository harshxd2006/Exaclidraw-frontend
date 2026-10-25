// ============================================================================
// Layer Manager Module
// Manages z-index layer ordering: Bring to Front, Send to Back, Forward, Backward.
// Reference: packages/excalidraw/zindex.ts in Excalidraw
// ============================================================================

// Moves selected elements one step backwards (towards index 0).
export function reorderSendBackward(elements, selectedIdMap) {
  const result = [...elements];
  // Iterate from index 1 to the end; swap with preceding item if not selected
  for (let i = 1; i < result.length; i++) {
    const current = result[i];
    const prev = result[i - 1];
    if (selectedIdMap[current.id] && !selectedIdMap[prev.id]) {
      result[i - 1] = current;
      result[i] = prev;
    }
  }
  return result;
}

// Moves selected elements one step forwards (towards the end of the array).
export function reorderBringForward(elements, selectedIdMap) {
  const result = [...elements];
  // Iterate from second to last item down to 0; swap with following item if not selected
  for (let i = result.length - 2; i >= 0; i--) {
    const current = result[i];
    const next = result[i + 1];
    if (selectedIdMap[current.id] && !selectedIdMap[next.id]) {
      result[i + 1] = current;
      result[i] = next;
    }
  }
  return result;
}

// Moves all selected elements to the very bottom (index 0) of the canvas.
export function reorderSendToBack(elements, selectedIdMap) {
  const selected = [];
  const unselected = [];

  for (const el of elements) {
    if (selectedIdMap[el.id]) {
      selected.push(el);
    } else {
      unselected.push(el);
    }
  }

  return [...selected, ...unselected];
}

// Moves all selected elements to the very top (end of array) of the canvas.
export function reorderBringToFront(elements, selectedIdMap) {
  const selected = [];
  const unselected = [];

  for (const el of elements) {
    if (selectedIdMap[el.id]) {
      selected.push(el);
    } else {
      unselected.push(el);
    }
  }

  return [...unselected, ...selected];
}
