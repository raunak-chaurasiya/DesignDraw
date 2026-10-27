import { measureTextBounds } from './textMeasurement';

// Point distance
export function distance(p1, p2) {
  if (!p1 || !p2) return 0;
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

// Distance from point (px, py) to line segment (x1, y1)-(x2, y2)
export function distToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);
  return Math.hypot(px - projX, py - projY);
}

// Calculate bounding box for any element
export function getElementBounds(element) {
  if (!element) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };

  const { type } = element;

  if (type === 'pencil') {
    if (!element.points || element.points.length === 0) {
      const px = element.x || 0;
      const py = element.y || 0;
      return { minX: px, minY: py, maxX: px, maxY: py, width: 0, height: 0 };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of element.points) {
      if (!p || typeof p.x !== 'number' || typeof p.y !== 'number') continue;
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    if (!Number.isFinite(minX)) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    }
    const pad = (element.strokeWidth || 2) * 2;
    return {
      minX: minX - pad,
      minY: minY - pad,
      maxX: maxX + pad,
      maxY: maxY + pad,
      width: Math.max(1, maxX - minX + pad * 2),
      height: Math.max(1, maxY - minY + pad * 2),
    };
  }

  if (type === 'line' || type === 'arrow') {
    const minX = Math.min(element.x1 || 0, element.x2 || 0);
    const maxX = Math.max(element.x1 || 0, element.x2 || 0);
    const minY = Math.min(element.y1 || 0, element.y2 || 0);
    const maxY = Math.max(element.y1 || 0, element.y2 || 0);
    const pad = Math.max(10, (element.strokeWidth || 2) * 2);
    return {
      minX: minX - pad,
      minY: minY - pad,
      maxX: maxX + pad,
      maxY: maxY + pad,
      width: Math.max(1, maxX - minX + pad * 2),
      height: Math.max(1, maxY - minY + pad * 2),
    };
  }

  // Text element bounds calculation based on actual canvas text metrics
  if (type === 'text') {
    const fontSize = element.fontSize || 24;
    const fontFamily = element.fontFamily || "'Patrick Hand', cursive";
    const measured = measureTextBounds(element.text || '', fontSize, fontFamily);
    const w = element.width || measured.width;
    const h = element.height || measured.height;
    return {
      minX: element.x || 0,
      minY: element.y || 0,
      maxX: (element.x || 0) + w,
      maxY: (element.y || 0) + h,
      width: w,
      height: h,
    };
  }

  // Shapes, sticky, table & image
  const x = element.x || 0;
  const y = element.y || 0;
  const w = element.width || 0;
  const h = element.height || 0;

  const minX = Math.min(x, x + w);
  const maxX = Math.max(x, x + w);
  const minY = Math.min(y, y + h);
  const maxY = Math.max(y, y + h);

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

// Table cell & dimensions helpers
export function getTableDimensions(element) {
  if (!element || element.type !== 'table') return null;
  const rows = Math.max(1, element.rows || (element.data ? element.data.length : 3));
  const cols = Math.max(1, element.cols || (element.data && element.data[0] ? element.data[0].length : 3));
  const x = Math.min(element.x, element.x + element.width);
  const y = Math.min(element.y, element.y + element.height);
  const width = Math.max(80, Math.abs(element.width || 0));
  const height = Math.max(40, Math.abs(element.height || 0));
  const colWidth = width / cols;
  const rowHeight = height / rows;
  return { x, y, width, height, rows, cols, colWidth, rowHeight };
}

export function getCellAtPoint(px, py, element) {
  const dims = getTableDimensions(element);
  if (!dims) return null;
  const { x, y, width, height, rows, cols, colWidth, rowHeight } = dims;

  if (px < x || px > x + width || py < y || py > y + height) {
    return null;
  }

  const colIndex = Math.min(cols - 1, Math.max(0, Math.floor((px - x) / colWidth)));
  const rowIndex = Math.min(rows - 1, Math.max(0, Math.floor((py - y) / rowHeight)));

  return {
    rowIndex,
    colIndex,
    cellX: x + colIndex * colWidth,
    cellY: y + rowIndex * rowHeight,
    cellWidth: colWidth,
    cellHeight: rowHeight,
  };
}

// Compute total bounds for a list of elements
export function getElementsBounds(elements, padding = 40) {
  if (!elements || elements.length === 0) {
    return { minX: 0, minY: 0, maxX: 400, maxY: 300, width: 400, height: 300 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    if (!el) continue;
    const b = getElementBounds(el);
    if (b.minX < minX) minX = b.minX;
    if (b.minY < minY) minY = b.minY;
    if (b.maxX > maxX) maxX = b.maxX;
    if (b.maxY > maxY) maxY = b.maxY;
  }

  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 400, maxY: 300, width: 400, height: 300 };
  }

  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
    width: Math.max(100, maxX - minX + padding * 2),
    height: Math.max(100, maxY - minY + padding * 2),
  };
}

// Compute exact bounding box for a list of elements without 100px minimum enforcement
export function getElementsExactBounds(elements, padding = 0) {
  if (!elements || elements.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    if (!el) continue;
    const b = getElementBounds(el);
    if (b.minX < minX) minX = b.minX;
    if (b.minY < minY) minY = b.minY;
    if (b.maxX > maxX) maxX = b.maxX;
    if (b.maxY > maxY) maxY = b.maxY;
  }

  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
    width: Math.max(0, maxX - minX + padding * 2),
    height: Math.max(0, maxY - minY + padding * 2),
  };
}

// Check if a point (px, py) is inside or hits an element
export function isPointInElement(px, py, element, threshold = 8) {
  if (!element) return false;
  const bounds = getElementBounds(element);

  // Quick bounding box rejection
  if (
    px < bounds.minX - threshold ||
    px > bounds.maxX + threshold ||
    py < bounds.minY - threshold ||
    py > bounds.maxY + threshold
  ) {
    return false;
  }

  const { type } = element;

  if (type === 'pencil') {
    if (!element.points || element.points.length === 0) {
      return false;
    }
    if (element.points.length === 1) {
      return distance({ x: px, y: py }, element.points[0]) <= threshold + (element.strokeWidth || 2);
    }
    for (let i = 0; i < element.points.length - 1; i++) {
      const p1 = element.points[i];
      const p2 = element.points[i + 1];
      if (p1 && p2) {
        if (distToSegment(px, py, p1.x, p1.y, p2.x, p2.y) <= threshold + (element.strokeWidth || 2)) {
          return true;
        }
      }
    }
    return false;
  }

  if (type === 'line' || type === 'arrow') {
    return distToSegment(px, py, element.x1, element.y1, element.x2, element.y2) <= threshold + (element.strokeWidth || 2);
  }

  if (type === 'rectangle' || type === 'text' || type === 'sticky' || type === 'image' || type === 'table') {
    return (
      px >= bounds.minX - threshold &&
      px <= bounds.maxX + threshold &&
      py >= bounds.minY - threshold &&
      py <= bounds.maxY + threshold
    );
  }

  if (type === 'ellipse') {
    const rx = bounds.width / 2;
    const ry = bounds.height / 2;
    const cx = bounds.minX + rx;
    const cy = bounds.minY + ry;
    if (rx === 0 || ry === 0) return false;
    const expRx = rx + threshold;
    const expRy = ry + threshold;
    const normalized = ((px - cx) ** 2) / (expRx ** 2) + ((py - cy) ** 2) / (expRy ** 2);
    return normalized <= 1.0;
  }

  if (type === 'diamond') {
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    const halfW = bounds.width / 2 + threshold;
    const halfH = bounds.height / 2 + threshold;
    const dx = Math.abs(px - cx) / (halfW || 1);
    const dy = Math.abs(py - cy) / (halfH || 1);
    return dx + dy <= 1.0;
  }

  return false;
}

// Check if element is inside or intersects marquee selection box
export function isElementInBox(element, box) {
  if (!element || !box) return false;
  const eb = getElementBounds(element);
  const minX = Math.min(box.x1, box.x2);
  const maxX = Math.max(box.x1, box.x2);
  const minY = Math.min(box.y1, box.y2);
  const maxY = Math.max(box.y1, box.y2);

  return !(
    eb.maxX < minX ||
    eb.minX > maxX ||
    eb.maxY < minY ||
    eb.minY > maxY
  );
}

// 8 Resize handles for selected element
export function getResizeHandles(element) {
  if (!element) return [];

  if (element.type === 'line' || element.type === 'arrow') {
    return [
      { type: 'start', x: element.x1, y: element.y1, cursor: 'crosshair' },
      { type: 'end', x: element.x2, y: element.y2, cursor: 'crosshair' },
    ];
  }

  const b = getElementBounds(element);
  const cx = b.minX + b.width / 2;
  const cy = b.minY + b.height / 2;

  return [
    { type: 'nw', x: b.minX, y: b.minY, cursor: 'nwse-resize' },
    { type: 'n', x: cx, y: b.minY, cursor: 'ns-resize' },
    { type: 'ne', x: b.maxX, y: b.minY, cursor: 'nesw-resize' },
    { type: 'e', x: b.maxX, y: cy, cursor: 'ew-resize' },
    { type: 'se', x: b.maxX, y: b.maxY, cursor: 'nwse-resize' },
    { type: 's', x: cx, y: b.maxY, cursor: 'ns-resize' },
    { type: 'sw', x: b.minX, y: b.maxY, cursor: 'nesw-resize' },
    { type: 'w', x: b.minX, y: cy, cursor: 'ew-resize' },
  ];
}

// Check if a point hits any resize handle
export function getHitResizeHandle(px, py, element, zoom = 1) {
  const handles = getResizeHandles(element);
  const threshold = 8 / zoom;

  for (const h of handles) {
    if (Math.abs(px - h.x) <= threshold && Math.abs(py - h.y) <= threshold) {
      return h;
    }
  }
  return null;
}

// Proportionally scale pencil points during resize
export function scalePencilPoints(points, oldBounds, newBounds) {
  if (!points || points.length === 0) return points;
  const oldW = Math.max(1, oldBounds.maxX - oldBounds.minX);
  const oldH = Math.max(1, oldBounds.maxY - oldBounds.minY);
  const newW = Math.max(1, newBounds.maxX - newBounds.minX);
  const newH = Math.max(1, newBounds.maxY - newBounds.minY);

  return points.map((p) => ({
    x: newBounds.minX + ((p.x - oldBounds.minX) / oldW) * newW,
    y: newBounds.minY + ((p.y - oldBounds.minY) / oldH) * newH,
  }));
}
