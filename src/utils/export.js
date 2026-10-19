import rough from 'roughjs';
import { getElementsBounds } from './math';
import { renderElement } from './roughRenderer';

/**
 * Render elements to an offscreen canvas at high resolution
 */
export function generateExportCanvas(elements, options = {}) {
  const {
    padding = 40,
    backgroundColor = '#121212',
    scale = 2, // 2x for sharp retina rendering
  } = options;

  if (!elements || elements.length === 0) {
    const emptyCanvas = document.createElement('canvas');
    emptyCanvas.width = 400 * scale;
    emptyCanvas.height = 300 * scale;
    const ctx = emptyCanvas.getContext('2d');
    ctx.scale(scale, scale);
    ctx.fillStyle = backgroundColor || '#121212';
    ctx.fillRect(0, 0, 400, 300);
    ctx.fillStyle = '#888888';
    ctx.font = '20px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Canvas is empty', 200, 150);
    return emptyCanvas;
  }

  const bounds = getElementsBounds(elements, padding);
  const width = Math.max(100, bounds.width);
  const height = Math.max(100, bounds.height);

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(width * scale);
  canvas.height = Math.floor(height * scale);

  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // Fill background
  if (backgroundColor && backgroundColor !== 'transparent') {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }

  // Translate so (minX, minY) becomes (0, 0)
  ctx.translate(-bounds.minX, -bounds.minY);

  const rc = rough.canvas(canvas);

  // Render each element without selection borders
  for (const element of elements) {
    renderElement(ctx, rc, element, false);
  }

  return canvas;
}

/**
 * Export canvas elements as a high-quality JPG image and trigger browser download
 */
export function exportToJpg(elements, options = {}) {
  const {
    filename = 'whiteboard-drawing.jpg',
    backgroundColor = '#121212', // default canvas theme
    quality = 0.95,
    padding = 40,
    scale = 2,
  } = options;

  // Background must be solid color for JPG (no transparency)
  const solidBg = !backgroundColor || backgroundColor === 'transparent' ? '#ffffff' : backgroundColor;

  const canvas = generateExportCanvas(elements, {
    backgroundColor: solidBg,
    padding,
    scale,
  });

  const dataUrl = canvas.toDataURL('image/jpeg', quality);

  // Trigger download
  const link = document.createElement('a');
  link.download = filename.endsWith('.jpg') || filename.endsWith('.jpeg') ? filename : `${filename}.jpg`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export canvas elements as PNG image
 */
export function exportToPng(elements, options = {}) {
  const {
    filename = 'whiteboard-drawing.png',
    backgroundColor = 'transparent',
    padding = 40,
    scale = 2,
  } = options;

  const canvas = generateExportCanvas(elements, {
    backgroundColor,
    padding,
    scale,
  });

  const dataUrl = canvas.toDataURL('image/png');

  const link = document.createElement('a');
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export drawing project as JSON
 */
export function exportToJson(elements, appState = {}) {
  const projectData = {
    version: 1,
    source: 'excalidraw-clone',
    createdAt: new Date().toISOString(),
    elements,
    appState: {
      theme: appState.theme || 'dark',
      viewBackgroundColor: appState.viewBackgroundColor || '#121212',
    },
  };

  const jsonStr = JSON.stringify(projectData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.download = `whiteboard-project-${new Date().toISOString().slice(0, 10)}.json`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Import drawing project from JSON file
 */
export function importFromJson(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (Array.isArray(data.elements)) {
          resolve(data);
        } else if (Array.isArray(data)) {
          resolve({ elements: data });
        } else {
          reject(new Error('Invalid whiteboard project format'));
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
}
