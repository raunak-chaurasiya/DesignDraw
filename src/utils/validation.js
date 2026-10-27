/**
 * Scene and Element Validator
 * Validates incoming scenes from JSON files and WebRTC peer messages
 * to prevent crashes, data corruption, and malicious injections.
 */

const VALID_TYPES = new Set([
  'rectangle',
  'diamond',
  'ellipse',
  'line',
  'arrow',
  'pencil',
  'text',
  'sticky',
  'table',
  'image',
]);

const VALID_ANCHORS = new Set(['top', 'right', 'bottom', 'left']);

function isFiniteNumber(val) {
  return typeof val === 'number' && Number.isFinite(val);
}

function clamp(val, min, max, defaultVal) {
  if (!isFiniteNumber(val)) return defaultVal;
  return Math.min(max, Math.max(min, val));
}

/**
 * Validates and sanitizes a single element. Returns sanitized element or null if invalid.
 */
export function validateElement(el) {
  if (!el || typeof el !== 'object' || Array.isArray(el)) {
    return null;
  }

  // ID must be a non-empty string
  const id = typeof el.id === 'string' && el.id.trim().length > 0
    ? el.id.trim()
    : (typeof el.id === 'number' ? `el-${el.id}` : null);

  if (!id) return null;

  // Type must be supported
  if (!VALID_TYPES.has(el.type)) {
    return null;
  }

  const sanitized = {
    id,
    type: el.type,
    seed: isFiniteNumber(el.seed) ? Math.floor(el.seed) : Math.floor(Math.random() * 100000),
    opacity: clamp(el.opacity, 0, 100, 100),
    strokeWidth: clamp(el.strokeWidth, 0.5, 50, 2),
    strokeColor: typeof el.strokeColor === 'string' ? el.strokeColor.slice(0, 50) : '#ffffff',
    backgroundColor: typeof el.backgroundColor === 'string' ? el.backgroundColor.slice(0, 50) : 'transparent',
    strokeStyle: ['solid', 'dashed', 'dotted'].includes(el.strokeStyle) ? el.strokeStyle : 'solid',
    fillStyle: ['none', 'hachure', 'cross-hatch', 'solid'].includes(el.fillStyle) ? el.fillStyle : 'hachure',
    roughness: clamp(el.roughness, 0, 5, 1.2),
    version: isFiniteNumber(el.version) ? Math.max(1, Math.floor(el.version)) : 1,
    updatedAt: isFiniteNumber(el.updatedAt) ? el.updatedAt : Date.now(),
  };

  if (typeof el.groupId === 'string' && el.groupId.trim()) {
    sanitized.groupId = el.groupId.trim();
  }

  // Type-specific validation
  if (el.type === 'line' || el.type === 'arrow') {
    if (
      !isFiniteNumber(el.x1) ||
      !isFiniteNumber(el.y1) ||
      !isFiniteNumber(el.x2) ||
      !isFiniteNumber(el.y2)
    ) {
      return null;
    }

    // Coordinate magnitude bound
    const MAX_COORD = 1e6;
    if (
      Math.abs(el.x1) > MAX_COORD ||
      Math.abs(el.y1) > MAX_COORD ||
      Math.abs(el.x2) > MAX_COORD ||
      Math.abs(el.y2) > MAX_COORD
    ) {
      return null;
    }

    sanitized.x1 = el.x1;
    sanitized.y1 = el.y1;
    sanitized.x2 = el.x2;
    sanitized.y2 = el.y2;

    // Optional magnetic bindings
    if (el.startBinding && typeof el.startBinding === 'object') {
      if (typeof el.startBinding.elementId === 'string' && VALID_ANCHORS.has(el.startBinding.anchor)) {
        sanitized.startBinding = {
          elementId: el.startBinding.elementId,
          anchor: el.startBinding.anchor,
        };
      }
    }

    if (el.endBinding && typeof el.endBinding === 'object') {
      if (typeof el.endBinding.elementId === 'string' && VALID_ANCHORS.has(el.endBinding.anchor)) {
        sanitized.endBinding = {
          elementId: el.endBinding.elementId,
          anchor: el.endBinding.anchor,
        };
      }
    }
  } else if (el.type === 'pencil') {
    if (!Array.isArray(el.points) || el.points.length === 0) {
      return null;
    }

    // Limit maximum points per pencil stroke to avoid DOM/canvas lockups
    const safePoints = [];
    const MAX_POINTS = 5000;
    const count = Math.min(el.points.length, MAX_POINTS);

    for (let i = 0; i < count; i++) {
      const p = el.points[i];
      if (p && isFiniteNumber(p.x) && isFiniteNumber(p.y)) {
        safePoints.push({ x: p.x, y: p.y });
      }
    }

    if (safePoints.length === 0) return null;
    sanitized.points = safePoints;
  } else {
    // 2D bounded boxes (rectangle, diamond, ellipse, sticky, text, table, image)
    if (!isFiniteNumber(el.x) || !isFiniteNumber(el.y)) {
      return null;
    }

    const MAX_COORD = 1e6;
    if (Math.abs(el.x) > MAX_COORD || Math.abs(el.y) > MAX_COORD) {
      return null;
    }

    sanitized.x = el.x;
    sanitized.y = el.y;
    sanitized.width = isFiniteNumber(el.width) ? Math.min(1e5, el.width) : 100;
    sanitized.height = isFiniteNumber(el.height) ? Math.min(1e5, el.height) : 60;

    // Text / label content
    if (el.text !== undefined) {
      sanitized.text = typeof el.text === 'string' ? el.text.slice(0, 10000) : String(el.text || '');
    }

    if (el.fontSize) {
      sanitized.fontSize = clamp(el.fontSize, 8, 120, 24);
    }
    if (typeof el.fontFamily === 'string') {
      sanitized.fontFamily = el.fontFamily.slice(0, 100);
    }
    if (typeof el.textColor === 'string') {
      sanitized.textColor = el.textColor.slice(0, 50);
    }

    // Table data
    if (el.type === 'table') {
      sanitized.rows = Math.floor(clamp(el.rows, 1, 50, 3));
      sanitized.cols = Math.floor(clamp(el.cols, 1, 30, 3));
      sanitized.hasHeader = Boolean(el.hasHeader);

      if (Array.isArray(el.data)) {
        sanitized.data = el.data.slice(0, sanitized.rows).map((row) => {
          if (!Array.isArray(row)) return Array(sanitized.cols).fill('');
          return row.slice(0, sanitized.cols).map((c) => (c != null ? String(c).slice(0, 500) : ''));
        });
      } else {
        sanitized.data = Array.from({ length: sanitized.rows }, () => Array(sanitized.cols).fill(''));
      }
    }

    // Image data
    if (el.type === 'image') {
      if (typeof el.dataUrl === 'string' && el.dataUrl.startsWith('data:image/')) {
        sanitized.dataUrl = el.dataUrl;
        sanitized.naturalWidth = isFiniteNumber(el.naturalWidth) ? el.naturalWidth : undefined;
        sanitized.naturalHeight = isFiniteNumber(el.naturalHeight) ? el.naturalHeight : undefined;
        sanitized.aspectRatio = isFiniteNumber(el.aspectRatio) ? el.aspectRatio : undefined;
      } else {
        return null;
      }
    }
  }

  return sanitized;
}

/**
 * Validates a scene element array. Returns a clean, sanitized array of unique elements.
 */
export function validateScene(elements) {
  if (!Array.isArray(elements)) {
    throw new Error('Scene elements must be an array');
  }

  const MAX_ELEMENTS = 10000;
  const seenIds = new Set();
  const validList = [];

  for (const el of elements) {
    if (validList.length >= MAX_ELEMENTS) break;
    const sanitized = validateElement(el);
    if (sanitized && !seenIds.has(sanitized.id)) {
      seenIds.add(sanitized.id);
      validList.push(sanitized);
    }
  }

  return validList;
}
