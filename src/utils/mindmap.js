import { getElementBounds } from './math';
import { getAnchorPosition } from './binding';

/**
 * Find the parent element connected to this node via an incoming arrow
 */
export function findParentNode(nodeId, elements) {
  if (!nodeId || !elements) return null;

  // Look for an arrow whose endBinding points to this node
  const incomingArrow = elements.find(
    (el) => el.type === 'arrow' && el.endBinding && el.endBinding.elementId === nodeId
  );

  if (!incomingArrow || !incomingArrow.startBinding) return null;

  const parent = elements.find((el) => el.id === incomingArrow.startBinding.elementId);
  return parent ? { parent, arrow: incomingArrow } : null;
}

/**
 * Find all children of a node via outgoing arrows
 */
export function findChildNodes(nodeId, elements) {
  if (!nodeId || !elements) return [];

  const outgoingArrows = elements.filter(
    (el) => el.type === 'arrow' && el.startBinding && el.startBinding.elementId === nodeId
  );

  const children = [];
  for (const arrow of outgoingArrows) {
    if (arrow.endBinding) {
      const child = elements.find((el) => el.id === arrow.endBinding.elementId);
      if (child) {
        children.push({ child, arrow });
      }
    }
  }
  return children;
}

/**
 * Calculate a smart non-overlapping position for a new branch node
 */
export function calculateSmartBranchPosition(
  sourceNode,
  direction = 'right',
  elements = [],
  isSibling = false
) {
  const sourceBounds = getElementBounds(sourceNode);
  const nodeWidth = Math.max(130, Math.min(sourceBounds.width || 140, 220));
  const nodeHeight = Math.max(48, Math.min(sourceBounds.height || 54, 120));

  let targetX = sourceBounds.minX;
  let targetY = sourceBounds.minY;

  const hGap = 90; // horizontal gap
  const vGap = 28; // vertical gap between sibling nodes

  if (isSibling) {
    // Position below the sourceNode
    targetX = sourceBounds.minX;
    targetY = sourceBounds.maxY + vGap;
  } else {
    // Child branch
    if (direction === 'right') {
      targetX = sourceBounds.maxX + hGap;

      // Check existing children of sourceNode to stack them vertically
      const existingChildren = findChildNodes(sourceNode.id, elements);
      if (existingChildren.length === 0) {
        targetY = sourceBounds.minY + (sourceBounds.height - nodeHeight) / 2;
      } else {
        // Find bottommost child
        let maxY = -Infinity;
        for (const { child } of existingChildren) {
          const cb = getElementBounds(child);
          if (cb.maxY > maxY) maxY = cb.maxY;
        }
        targetY = maxY + vGap;
      }
    } else if (direction === 'bottom') {
      targetY = sourceBounds.maxY + hGap;
      targetX = sourceBounds.minX + (sourceBounds.width - nodeWidth) / 2;
    } else if (direction === 'left') {
      targetX = sourceBounds.minX - hGap - nodeWidth;
      targetY = sourceBounds.minY + (sourceBounds.height - nodeHeight) / 2;
    } else if (direction === 'top') {
      targetY = sourceBounds.minY - hGap - nodeHeight;
      targetX = sourceBounds.minX + (sourceBounds.width - nodeWidth) / 2;
    }
  }

  // Smart collision resolution: ensure target box doesn't overlap existing shapes
  let safetyCounter = 0;
  while (safetyCounter < 25) {
    const collides = elements.some((el) => {
      if (['arrow', 'line', 'pencil'].includes(el.type)) return false;
      if (el.id === sourceNode.id) return false;
      const b = getElementBounds(el);
      return !(
        targetX + nodeWidth < b.minX - 10 ||
        targetX > b.maxX + 10 ||
        targetY + nodeHeight < b.minY - 10 ||
        targetY > b.maxY + 10
      );
    });

    if (!collides) break;

    // Shift downwards to find open canvas space
    targetY += nodeHeight + vGap;
    safetyCounter++;
  }

  return { x: targetX, y: targetY, width: nodeWidth, height: nodeHeight };
}

/**
 * Vibrant mind-map color palettes for branch levels
 */
export const MINDMAP_PALETTES = [
  { stroke: '#4dabf7', bg: 'rgba(77, 171, 247, 0.15)' }, // Blue
  { stroke: '#51cf66', bg: 'rgba(81, 207, 102, 0.15)' }, // Green
  { stroke: '#ff922b', bg: 'rgba(255, 146, 43, 0.15)' }, // Orange
  { stroke: '#cc5de8', bg: 'rgba(204, 93, 232, 0.15)' }, // Purple
  { stroke: '#ff6b6b', bg: 'rgba(255, 107, 107, 0.15)' }, // Red
  { stroke: '#20c997', bg: 'rgba(32, 201, 151, 0.15)' }, // Teal
  { stroke: '#fcc419', bg: 'rgba(252, 196, 25, 0.15)' }, // Yellow
];

/**
 * Creates a new child or sibling node with a connecting arrow bound magnetically
 */
export function createBranchNode(sourceNode, direction = 'right', elements = [], isSibling = false) {
  if (!sourceNode) return null;

  // If creating sibling and this node has a parent, connect new sibling to the same parent!
  let effectiveParent = sourceNode;
  let effectiveDirection = direction;

  if (isSibling) {
    const parentInfo = findParentNode(sourceNode.id, elements);
    if (parentInfo) {
      effectiveParent = parentInfo.parent;
      effectiveDirection = parentInfo.arrow?.startBinding?.anchor || 'right';
    }
  }

  const pos = calculateSmartBranchPosition(sourceNode, effectiveDirection, elements, isSibling);

  // Pick branch color based on number of siblings or parent color
  const existingSiblings = findChildNodes(effectiveParent.id, elements);
  const colorIndex = existingSiblings.length % MINDMAP_PALETTES.length;
  const palette = MINDMAP_PALETTES[colorIndex];

  const newNodeId = 'el-node-' + Date.now();
  const arrowId = 'el-arrow-' + Date.now();

  // Child node type: sticky, rectangle, ellipse, or text
  const nodeType = sourceNode.type === 'sticky' ? 'sticky' : 'rectangle';

  const newNode = {
    id: newNodeId,
    type: nodeType,
    x: pos.x,
    y: pos.y,
    width: pos.width,
    height: pos.height,
    text: '',
    fontSize: Math.max(16, (sourceNode.fontSize || 20) - 2),
    fontFamily: sourceNode.fontFamily || "'Patrick Hand', cursive",
    strokeColor: palette.stroke,
    backgroundColor: palette.bg,
    strokeWidth: sourceNode.strokeWidth || 2,
    strokeStyle: 'solid',
    fillStyle: 'solid',
    roughness: sourceNode.roughness !== undefined ? sourceNode.roughness : 1.2,
    seed: Math.floor(Math.random() * 100000),
    opacity: 100,
  };

  // Determine magnetic anchor points
  let parentAnchor = effectiveDirection;
  let childAnchor = 'left';

  if (effectiveDirection === 'right') {
    parentAnchor = 'right';
    childAnchor = 'left';
  } else if (effectiveDirection === 'bottom') {
    parentAnchor = 'bottom';
    childAnchor = 'top';
  } else if (effectiveDirection === 'left') {
    parentAnchor = 'left';
    childAnchor = 'right';
  } else if (effectiveDirection === 'top') {
    parentAnchor = 'top';
    childAnchor = 'bottom';
  }

  const startPt = getAnchorPosition(effectiveParent, parentAnchor);
  const endPt = getAnchorPosition(newNode, childAnchor);

  const newArrow = {
    id: arrowId,
    type: 'arrow',
    x1: startPt.x,
    y1: startPt.y,
    x2: endPt.x,
    y2: endPt.y,
    startBinding: { elementId: effectiveParent.id, anchor: parentAnchor },
    endBinding: { elementId: newNode.id, anchor: childAnchor },
    strokeColor: palette.stroke,
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 1.0,
    seed: Math.floor(Math.random() * 100000),
    opacity: 100,
  };

  return {
    newNode,
    newArrow,
    newElements: [...elements, newArrow, newNode],
  };
}
