import { getElementBounds } from './math';

/**
 * Returns the anchor (connection) points for a shape element
 */
export function getShapeAnchors(element) {
  if (!element || ['line', 'arrow', 'pencil'].includes(element.type)) {
    return [];
  }

  const bounds = getElementBounds(element);
  const cx = bounds.minX + bounds.width / 2;
  const cy = bounds.minY + bounds.height / 2;

  return [
    { type: 'top', x: cx, y: bounds.minY },
    { type: 'right', x: bounds.maxX, y: cy },
    { type: 'bottom', x: cx, y: bounds.maxY },
    { type: 'left', x: bounds.minX, y: cy },
  ];
}

/**
 * Get exact position of a specific anchor on an element
 */
export function getAnchorPosition(element, anchorType) {
  const anchors = getShapeAnchors(element);
  const found = anchors.find((a) => a.type === anchorType);
  if (found) return { x: found.x, y: found.y };

  // Fallback to center
  const bounds = getElementBounds(element);
  return {
    x: bounds.minX + bounds.width / 2,
    y: bounds.minY + bounds.height / 2,
  };
}

/**
 * Find the nearest anchor point on any shape near point (px, py)
 */
export function findNearestAnchor(px, py, elements, excludeId = null, threshold = 28) {
  let closest = null;
  let minDistance = threshold;

  for (const el of elements) {
    if (el.id === excludeId || ['line', 'arrow', 'pencil'].includes(el.type)) {
      continue;
    }

    const anchors = getShapeAnchors(el);
    for (const a of anchors) {
      const dist = Math.hypot(px - a.x, py - a.y);
      if (dist < minDistance) {
        minDistance = dist;
        closest = {
          elementId: el.id,
          element: el,
          anchor: a.type,
          x: a.x,
          y: a.y,
          distance: dist,
        };
      }
    }
  }

  return closest;
}

/**
 * Update all arrows and lines connected to a specific moved or resized element
 */
export function updateConnectedArrows(elements, movedElement) {
  if (!movedElement) return elements;

  return elements.map((el) => {
    if (el.type !== 'arrow' && el.type !== 'line') {
      return el;
    }

    let updated = { ...el };
    let changed = false;

    // Check if start is bound to the moved element
    if (el.startBinding && el.startBinding.elementId === movedElement.id) {
      const pos = getAnchorPosition(movedElement, el.startBinding.anchor);
      updated.x1 = pos.x;
      updated.y1 = pos.y;
      changed = true;
    }

    // Check if end is bound to the moved element
    if (el.endBinding && el.endBinding.elementId === movedElement.id) {
      const pos = getAnchorPosition(movedElement, el.endBinding.anchor);
      updated.x2 = pos.x;
      updated.y2 = pos.y;
      changed = true;
    }

    return changed ? updated : el;
  });
}

/**
 * Centralized scene geometry resolver:
 * Recomputes all connector endpoints in O(N) time for any scene changes
 * (multi-select move, alignment, font size changes, table expansion, image reset).
 */
export function updateAllConnectedArrows(elements) {
  if (!elements || elements.length === 0) return elements;

  // Build fast element lookup map
  const elementMap = new Map();
  for (const el of elements) {
    if (el && el.id) {
      elementMap.set(el.id, el);
    }
  }

  let anyChanged = false;

  const result = elements.map((el) => {
    if (!el || (el.type !== 'arrow' && el.type !== 'line')) {
      return el;
    }

    let updated = { ...el };
    let changed = false;

    if (el.startBinding && el.startBinding.elementId) {
      const target = elementMap.get(el.startBinding.elementId);
      if (target) {
        const pos = getAnchorPosition(target, el.startBinding.anchor);
        if (pos && (pos.x !== el.x1 || pos.y !== el.y1)) {
          updated.x1 = pos.x;
          updated.y1 = pos.y;
          changed = true;
        }
      }
    }

    if (el.endBinding && el.endBinding.elementId) {
      const target = elementMap.get(el.endBinding.elementId);
      if (target) {
        const pos = getAnchorPosition(target, el.endBinding.anchor);
        if (pos && (pos.x !== el.x2 || pos.y !== el.y2)) {
          updated.x2 = pos.x;
          updated.y2 = pos.y;
          changed = true;
        }
      }
    }

    if (changed) anyChanged = true;
    return changed ? updated : el;
  });

  return anyChanged ? result : elements;
}
