// ============================================================================
// Element Model Definition
// Defines default properties and schemas for Excalidraw elements.
// ============================================================================

// Default visual styling properties for new elements (matches Excalidraw defaults).
export const DEFAULT_ELEMENT_PROPERTIES = {
  strokeColor: '#1e1e24',       // Standard dark charcoal stroke color
  backgroundColor: 'transparent', // Transparent fill by default
  fillStyle: 'solid',           // Fill pattern: 'solid' | 'hachure' | 'cross-hatch'
  strokeWidth: 2,               // Border thickness: 1 (thin), 2 (medium), 4 (bold)
  strokeStyle: 'solid',         // Border dash style: 'solid' | 'dashed' | 'dotted'
  roughness: 1,                 // Sloppiness: 0 (architect/clean), 1 (artist), 2 (cartoonist)
  opacity: 100,                 // Transparency: 0 to 100
  angle: 0                      // Rotation in radians (0 = unrotated)
};

// Validates whether an object has the minimal required properties to be an element.
export function isValidElement(element) {
  return (
    element !== null &&
    typeof element === 'object' &&
    typeof element.id === 'string' &&
    typeof element.type === 'string' &&
    typeof element.x === 'number' &&
    typeof element.y === 'number' &&
    typeof element.width === 'number' &&
    typeof element.height === 'number'
  );
}
