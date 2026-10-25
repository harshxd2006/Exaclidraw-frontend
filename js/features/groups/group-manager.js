// ============================================================================
// Element Grouping & Ungrouping Module
// Implements Excalidraw's groupIds array architecture for nested element groups.
// Reference: packages/excalidraw/groups.ts in Excalidraw
// ============================================================================

import { generateId } from '../../core/element-factory.js';

// Generates a unique group identifier
export function generateGroupId() {
  return `group_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

// Returns the outermost (latest) groupId for an element, or null if ungrouped
export function getOutermostGroupId(element) {
  if (!element || !Array.isArray(element.groupIds) || element.groupIds.length === 0) {
    return null;
  }
  return element.groupIds[element.groupIds.length - 1];
}

// Checks if an element belongs to any group
export function isElementInGroup(element) {
  return Boolean(getOutermostGroupId(element));
}

// Returns all elements in the scene that share the specified groupId
export function getElementsInGroup(elements, groupId) {
  if (!groupId || !Array.isArray(elements)) return [];
  return elements.filter(el => !el.isDeleted && Array.isArray(el.groupIds) && el.groupIds.includes(groupId));
}

// Given a set of selected element IDs, expands the selection to include all elements
// that belong to the same outermost group for any selected member element.
export function expandSelectionToGroups(elements, selectedIdsMap) {
  if (!selectedIdsMap || Object.keys(selectedIdsMap).length === 0) {
    return { ...selectedIdsMap };
  }

  const expandedMap = { ...selectedIdsMap };
  const processedGroups = new Set();

  for (const el of elements) {
    if (el.isDeleted) continue;
    if (selectedIdsMap[el.id]) {
      const outerGroupId = getOutermostGroupId(el);
      if (outerGroupId && !processedGroups.has(outerGroupId)) {
        processedGroups.add(outerGroupId);
        const groupMembers = getElementsInGroup(elements, outerGroupId);
        for (const member of groupMembers) {
          expandedMap[member.id] = true;
        }
      }
    }
  }

  return expandedMap;
}

// Groups selected elements together by appending a shared groupId to each element
export function groupElements(elements, selectedIdsMap) {
  const selectedElements = elements.filter(el => !el.isDeleted && selectedIdsMap[el.id]);
  if (selectedElements.length < 2) {
    return false; // Grouping requires at least 2 elements
  }

  const newGroupId = generateGroupId();

  for (const el of selectedElements) {
    const groupIds = Array.isArray(el.groupIds) ? [...el.groupIds] : [];
    groupIds.push(newGroupId);
    el.groupIds = groupIds;
    el.version = (el.version || 1) + 1;
  }

  return true;
}

// Ungroups selected elements by removing their outermost groupId
export function ungroupElements(elements, selectedIdsMap) {
  const selectedElements = elements.filter(el => !el.isDeleted && selectedIdsMap[el.id]);
  if (selectedElements.length === 0) {
    return false;
  }

  // Find all outermost groupIds present among the selected elements
  const groupIdsToRemove = new Set();
  for (const el of selectedElements) {
    const outerGroupId = getOutermostGroupId(el);
    if (outerGroupId) {
      groupIdsToRemove.add(outerGroupId);
    }
  }

  if (groupIdsToRemove.size === 0) {
    return false; // Nothing to ungroup
  }

  // Remove the identified groupIds from all elements in those groups
  for (const el of elements) {
    if (el.isDeleted || !Array.isArray(el.groupIds)) continue;

    const filtered = el.groupIds.filter(gid => !groupIdsToRemove.has(gid));
    if (filtered.length !== el.groupIds.length) {
      el.groupIds = filtered;
      el.version = (el.version || 1) + 1;
    }
  }

  return true;
}

// Checks if the current selection can be grouped (at least 2 elements selected)
export function canGroupSelection(state) {
  const selectedCount = Object.keys(state.selectedElementIds || {}).length;
  return selectedCount >= 2;
}

// Checks if the current selection can be ungrouped (at least one selected element belongs to a group)
export function canUngroupSelection(state) {
  const selectedIds = state.selectedElementIds || {};
  return state.elements.some(el => !el.isDeleted && selectedIds[el.id] && isElementInGroup(el));
}

// Calculates the combined bounding box enclosing an entire array of grouped elements
export function getElementsBoundingBox(groupElements) {
  if (!groupElements || groupElements.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, x: 0, y: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of groupElements) {
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
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, x: 0, y: 0 };
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    x: minX,
    y: minY,
    width: Math.round(maxX - minX),
    height: Math.round(maxY - minY)
  };
}
