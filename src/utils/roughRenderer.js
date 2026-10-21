import rough from 'roughjs';
import { getElementBounds, getResizeHandles } from './math';

// Image cache to avoid re-decoding image data on every 60fps frame
export const imageCache = new Map();

export function getCachedImage(dataUrl, onLoaded) {
  if (!dataUrl) return null;
  let entry = imageCache.get(dataUrl);
  if (!entry) {
    const img = new Image();
    entry = { img, loaded: false };
    img.onload = () => {
      entry.loaded = true;
      if (onLoaded) onLoaded(img);
    };
    img.onerror = () => {
      entry.error = true;
    };
    img.src = dataUrl;
    imageCache.set(dataUrl, entry);
  }
  return entry.loaded ? entry.img : null;
}

export function renderElement(ctx, rc, element, isSelected = false) {
  if (!element) return;

  ctx.save();
  if (element.opacity !== undefined && element.opacity < 100) {
    ctx.globalAlpha = element.opacity / 100;
  }

  const strokeDash =
    element.strokeStyle === 'dashed'
      ? [8, 8]
      : element.strokeStyle === 'dotted'
      ? [3, 6]
      : undefined;

  const roughOptions = {
    seed: element.seed || 1,
    roughness: element.roughness !== undefined ? element.roughness : 1.2,
    stroke: element.strokeColor || '#ffffff',
    strokeWidth: element.strokeWidth || 2,
    fill: element.backgroundColor && element.backgroundColor !== 'transparent' ? element.backgroundColor : undefined,
    fillStyle: element.fillStyle || 'hachure',
    strokeLineDash: strokeDash,
    fillWeight: Math.max(1, (element.strokeWidth || 2) / 2),
    hachureGap: Math.max(4, (element.strokeWidth || 2) * 2.5),
  };

  const { type } = element;

  switch (type) {
    case 'rectangle': {
      const x = Math.min(element.x, element.x + element.width);
      const y = Math.min(element.y, element.y + element.height);
      const w = Math.abs(element.width);
      const h = Math.abs(element.height);
      if (w > 0 && h > 0) {
        rc.rectangle(x, y, w, h, roughOptions);
        if (element.text) {
          drawCenteredTextInShape(ctx, element, x, y, w, h);
        }
      }
      break;
    }

    case 'diamond': {
      const x = Math.min(element.x, element.x + element.width);
      const y = Math.min(element.y, element.y + element.height);
      const w = Math.abs(element.width);
      const h = Math.abs(element.height);
      if (w > 0 && h > 0) {
        const top = [x + w / 2, y];
        const right = [x + w, y + h / 2];
        const bottom = [x + w / 2, y + h];
        const left = [x, y + h / 2];
        rc.polygon([top, right, bottom, left], roughOptions);
        if (element.text) {
          drawCenteredTextInShape(ctx, element, x, y, w, h);
        }
      }
      break;
    }

    case 'ellipse': {
      const x = Math.min(element.x, element.x + element.width);
      const y = Math.min(element.y, element.y + element.height);
      const w = Math.abs(element.width);
      const h = Math.abs(element.height);
      if (w > 0 && h > 0) {
        const cx = x + w / 2;
        const cy = y + h / 2;
        rc.ellipse(cx, cy, w, h, roughOptions);
        if (element.text) {
          drawCenteredTextInShape(ctx, element, x, y, w, h);
        }
      }
      break;
    }

    case 'line': {
      rc.line(element.x1, element.y1, element.x2, element.y2, roughOptions);
      break;
    }

    case 'arrow': {
      // Draw main line
      rc.line(element.x1, element.y1, element.x2, element.y2, roughOptions);

      // Draw arrowhead
      const angle = Math.atan2(element.y2 - element.y1, element.x2 - element.x1);
      const arrowLength = Math.max(14, (element.strokeWidth || 2) * 5);
      const arrowAngle = Math.PI / 6; // 30 degrees

      const x2 = element.x2;
      const y2 = element.y2;

      const p1x = x2 - arrowLength * Math.cos(angle - arrowAngle);
      const p1y = y2 - arrowLength * Math.sin(angle - arrowAngle);
      const p2x = x2 - arrowLength * Math.cos(angle + arrowAngle);
      const p2y = y2 - arrowLength * Math.sin(angle + arrowAngle);

      rc.line(x2, y2, p1x, p1y, { ...roughOptions, strokeLineDash: undefined });
      rc.line(x2, y2, p2x, p2y, { ...roughOptions, strokeLineDash: undefined });
      break;
    }

    case 'pencil': {
      if (element.points && element.points.length > 0) {
        if (element.points.length === 1) {
          const p = element.points[0];
          ctx.beginPath();
          ctx.arc(p.x, p.y, (element.strokeWidth || 2) / 2, 0, Math.PI * 2);
          ctx.fillStyle = element.strokeColor || '#ffffff';
          ctx.fill();
        } else {
          // Smooth curve
          const pts = element.points.map((p) => [p.x, p.y]);
          rc.curve(pts, roughOptions);
        }
      }
      break;
    }

    case 'sticky': {
      const x = Math.min(element.x, element.x + element.width);
      const y = Math.min(element.y, element.y + element.height);
      const w = Math.abs(element.width);
      const h = Math.abs(element.height);

      if (w > 0 && h > 0) {
        // Subtle drop shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(x + 4, y + 4, w, h);

        // Sticky body
        const stickyFill = element.backgroundColor && element.backgroundColor !== 'transparent'
          ? element.backgroundColor
          : '#fff3bf';

        rc.rectangle(x, y, w, h, {
          ...roughOptions,
          fill: stickyFill,
          fillStyle: 'solid',
          stroke: element.strokeColor || '#f59f00',
          strokeWidth: 1.5,
          roughness: 0.8,
        });

        // Text inside sticky note
        if (element.text) {
          ctx.fillStyle = element.textColor || '#212529';
          const fontSize = element.fontSize || 20;
          ctx.font = `${fontSize}px ${element.fontFamily || "'Patrick Hand', cursive"}`;
          ctx.textBaseline = 'top';

          const padding = 16;
          const maxWidth = w - padding * 2;
          const lines = wrapText(ctx, element.text, maxWidth);
          const lineHeight = fontSize * 1.35;

          let startY = y + padding;
          for (const line of lines) {
            if (startY + lineHeight > y + h - padding) break;
            ctx.fillText(line, x + padding, startY);
            startY += lineHeight;
          }
        }
      }
      break;
    }

    case 'text': {
      const fontSize = element.fontSize || 24;
      const fontFamily = element.fontFamily || "'Patrick Hand', cursive";
      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.fillStyle = element.strokeColor || '#ffffff';
      ctx.textBaseline = 'top';

      const lines = (element.text || '').split('\n');
      const lineHeight = fontSize * 1.3;
      let curY = element.y;

      for (const line of lines) {
        ctx.fillText(line, element.x, curY);
        curY += lineHeight;
      }
      break;
    }

    case 'image': {
      const x = Math.min(element.x, element.x + element.width);
      const y = Math.min(element.y, element.y + element.height);
      const w = Math.abs(element.width);
      const h = Math.abs(element.height);

      if (w > 0 && h > 0) {
        const cachedImg = getCachedImage(element.dataUrl);

        if (cachedImg) {
          ctx.save();
          // Clip with subtle rounded corners
          ctx.beginPath();
          const r = Math.min(8, Math.min(w, h) / 6);
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(x, y, w, h, r);
          } else {
            ctx.rect(x, y, w, h);
          }
          ctx.clip();
          ctx.drawImage(cachedImg, x, y, w, h);
          ctx.restore();

          // If border is set, draw border
          if (element.strokeWidth && element.strokeWidth > 0 && element.strokeColor && element.strokeColor !== 'transparent') {
            rc.rectangle(x, y, w, h, {
              ...roughOptions,
              fill: undefined,
              fillStyle: undefined,
            });
          }
        } else {
          // Loading skeleton placeholder
          ctx.save();
          ctx.fillStyle = 'rgba(105, 101, 219, 0.08)';
          ctx.strokeStyle = '#6965db';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 6]);
          ctx.fillRect(x, y, w, h);
          ctx.strokeRect(x, y, w, h);
          ctx.fillStyle = '#827fe2';
          ctx.font = '13px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🖼️ Loading Image...', x + w / 2, y + h / 2);
          ctx.restore();
        }
      }
      break;
    }

    case 'table': {
      const x = Math.min(element.x, element.x + element.width);
      const y = Math.min(element.y, element.y + element.height);
      const w = Math.max(60, Math.abs(element.width));
      const h = Math.max(40, Math.abs(element.height));
      const rows = Math.max(1, element.rows || (element.data ? element.data.length : 3));
      const cols = Math.max(1, element.cols || (element.data && element.data[0] ? element.data[0].length : 3));
      const colW = w / cols;
      const rowH = h / rows;
      const data = element.data || [];

      if (w > 0 && h > 0) {
        // 1. Draw outer table container box
        rc.rectangle(x, y, w, h, roughOptions);

        // 2. Draw header tint if hasHeader is enabled
        if (element.hasHeader && rows > 0) {
          ctx.save();
          // Header subtle accent background tint
          const headerFill = element.backgroundColor && element.backgroundColor !== 'transparent'
            ? element.backgroundColor
            : 'rgba(105, 101, 219, 0.16)';
          ctx.fillStyle = headerFill;
          ctx.fillRect(x + 1, y + 1, w - 2, rowH - 1);
          ctx.restore();

          // Header row bottom border
          rc.line(x, y + rowH, x + w, y + rowH, {
            ...roughOptions,
            strokeWidth: Math.max(2.5, (element.strokeWidth || 2) * 1.25),
          });
        }

        // 3. Draw horizontal row dividers
        for (let r = 1; r < rows; r++) {
          if (r === 1 && element.hasHeader) continue; // already drawn above
          const lineY = y + r * rowH;
          rc.line(x, lineY, x + w, lineY, roughOptions);
        }

        // 4. Draw vertical column dividers
        for (let c = 1; c < cols; c++) {
          const lineX = x + c * colW;
          rc.line(lineX, y, lineX, y + h, roughOptions);
        }

        // 5. Draw cell text
        const fontSize = element.fontSize || 18;
        const fontFamily = element.fontFamily || "'Patrick Hand', cursive";
        ctx.textBaseline = 'top';

        const padX = 8;
        const padY = 6;
        const maxTextW = Math.max(20, colW - padX * 2);

        for (let r = 0; r < rows; r++) {
          const isHeaderRow = r === 0 && element.hasHeader;
          for (let c = 0; c < cols; c++) {
            const rawText = data[r] && data[r][c] !== undefined ? String(data[r][c]) : '';
            if (!rawText) continue;

            const cellX = x + c * colW;
            const cellY = y + r * rowH;

            ctx.fillStyle = element.strokeColor || '#ffffff';
            ctx.font = isHeaderRow
              ? `bold ${fontSize}px ${fontFamily}`
              : `${fontSize}px ${fontFamily}`;

            const lines = wrapText(ctx, rawText, maxTextW);
            const lineHeight = fontSize * 1.3;

            let curTextY = cellY + padY;
            for (const line of lines) {
              if (curTextY + lineHeight > cellY + rowH) break; // clip if exceeding cell height
              ctx.fillText(line, cellX + padX, curTextY);
              curTextY += lineHeight;
            }
          }
        }
      }
      break;
    }

    default:
      break;
  }

  ctx.restore();

  // Draw selection highlight if selected
  if (isSelected) {
    drawSelectionBox(ctx, element);
  }
}

// Wrap text to fit inside maximum width
function wrapText(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine ? currentLine + ' ' + words[i] : words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines.length > 0 ? lines : [''];
}

// Draw centered text inside shapes (rectangle, ellipse, diamond, etc.)
function drawCenteredTextInShape(ctx, element, x, y, w, h) {
  if (!element.text) return;
  const fontSize = element.fontSize || 20;
  const fontFamily = element.fontFamily || "'Patrick Hand', cursive";
  ctx.save();
  ctx.fillStyle = element.textColor || element.strokeColor || '#ffffff';
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const pad = 10;
  const maxWidth = Math.max(20, w - pad * 2);
  const lines = wrapText(ctx, element.text, maxWidth);
  const lineHeight = fontSize * 1.3;
  const totalHeight = lines.length * lineHeight;

  let startY = y + (h - totalHeight) / 2 + lineHeight / 2;
  const centerX = x + w / 2;

  for (const line of lines) {
    if (startY > y + h - pad / 2) break;
    ctx.fillText(line, centerX, startY);
    startY += lineHeight;
  }
  ctx.restore();
}

// Draw selection border and resize handles
function drawSelectionBox(ctx, element) {
  const handles = getResizeHandles(element);
  const handleSize = 8;

  ctx.save();
  ctx.strokeStyle = '#6965db';

  if (element.type === 'line' || element.type === 'arrow') {
    // For lines and arrows, draw endpoint handles as circular rings
    ctx.lineWidth = 1.5;
    for (const h of handles) {
      ctx.beginPath();
      ctx.arc(h.x, h.y, handleSize / 2 + 1, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#6965db';
      ctx.stroke();
    }
  } else {
    const bounds = getElementBounds(element);
    const pad = 6;
    const minX = bounds.minX - pad;
    const minY = bounds.minY - pad;
    const width = bounds.width + pad * 2;
    const height = bounds.height + pad * 2;

    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(minX, minY, width, height);

    // Resize handles
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#6965db';
    ctx.lineWidth = 1.5;

    for (const h of handles) {
      ctx.fillRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
    }
  }

  ctx.restore();
}

// Draw shape connection anchor points when snapping an arrow or line
export function drawShapeAnchors(ctx, element, activeAnchorType = null) {
  if (!element || ['line', 'arrow', 'pencil'].includes(element.type)) return;
  const bounds = getElementBounds(element);
  const cx = bounds.minX + bounds.width / 2;
  const cy = bounds.minY + bounds.height / 2;

  const anchors = [
    { type: 'top', x: cx, y: bounds.minY },
    { type: 'right', x: bounds.maxX, y: cy },
    { type: 'bottom', x: cx, y: bounds.maxY },
    { type: 'left', x: bounds.minX, y: cy },
  ];

  ctx.save();
  // Shape highlight dashed border
  ctx.strokeStyle = 'rgba(105, 101, 219, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(bounds.minX - 4, bounds.minY - 4, bounds.width + 8, bounds.height + 8);

  // Draw anchor dots
  for (const a of anchors) {
    const isActive = activeAnchorType === a.type;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(a.x, a.y, isActive ? 6 : 4.5, 0, Math.PI * 2);
    ctx.fillStyle = isActive ? '#6965db' : '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#6965db';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (isActive) {
      ctx.beginPath();
      ctx.arc(a.x, a.y, 10, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(105, 101, 219, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  ctx.restore();
}

// Draw dot grid for infinite canvas
export function drawGrid(ctx, width, height, pan, zoom, isDarkMode = true) {
  const gridSize = 24 * zoom;
  if (gridSize < 8) return; // Don't draw if too small

  const dotColor = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
  const dotRadius = Math.max(1, 1.2 * zoom);

  const startX = (pan.x % gridSize);
  const startY = (pan.y % gridSize);

  ctx.save();
  ctx.fillStyle = dotColor;

  for (let x = startX - gridSize; x < width + gridSize; x += gridSize) {
    for (let y = startY - gridSize; y < height + gridSize; y += gridSize) {
      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}
