import rough from 'roughjs';
import { getElementBounds, getResizeHandles } from './math';

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
