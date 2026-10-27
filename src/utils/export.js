import rough from 'roughjs';
import { getElementsBounds } from './math';
import { renderElement, imageCache } from './roughRenderer';
import { validateScene } from './validation';

/**
 * Preload and decode all images in the scene, and await fonts readiness
 */
export async function prepareElementsForExport(elements) {
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore
    }
  }

  const imagePromises = [];

  for (const el of elements) {
    if (el && el.type === 'image' && el.dataUrl) {
      const existing = imageCache.get(el.dataUrl);
      if (existing && existing.loaded) continue;

      const p = new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          imageCache.set(el.dataUrl, { img, loaded: true, error: false });
          resolve();
        };
        img.onerror = () => {
          imageCache.set(el.dataUrl, { img, loaded: false, error: true });
          resolve();
        };
        img.src = el.dataUrl;
      });
      imagePromises.push(p);
    }
  }

  if (imagePromises.length > 0) {
    await Promise.all(imagePromises);
  }
}

/**
 * Render elements to an offscreen canvas at high resolution with safe bounds
 */
export function generateExportCanvas(elements, options = {}) {
  const {
    padding = 40,
    backgroundColor = '#121212',
    scale = 2,
    maxDimension = 4096,
  } = options;

  const validElements = Array.isArray(elements) ? elements.filter(Boolean) : [];

  if (validElements.length === 0) {
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

  const bounds = getElementsBounds(validElements, padding);
  let width = Math.max(100, bounds.width);
  let height = Math.max(100, bounds.height);

  // Bound allocation size to prevent canvas memory crash or GPU overflow
  let effectiveScale = scale;
  if (width * effectiveScale > maxDimension || height * effectiveScale > maxDimension) {
    const maxSide = Math.max(width, height);
    effectiveScale = Math.max(0.5, maxDimension / maxSide);
  }

  const canvasWidth = Math.min(maxDimension, Math.floor(width * effectiveScale));
  const canvasHeight = Math.min(maxDimension, Math.floor(height * effectiveScale));

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext('2d');
  ctx.scale(effectiveScale, effectiveScale);

  // Fill background
  if (backgroundColor && backgroundColor !== 'transparent') {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }

  // Translate so (minX, minY) becomes (0, 0)
  ctx.translate(-bounds.minX, -bounds.minY);

  const rc = rough.canvas(canvas);

  // Render each element without selection borders
  for (const element of validElements) {
    renderElement(ctx, rc, element, false);
  }

  return canvas;
}

/**
 * Export canvas elements as a high-quality JPG image and trigger browser download
 */
export async function exportToJpg(elements, options = {}) {
  const {
    filename = 'whiteboard-drawing.jpg',
    backgroundColor = '#121212',
    quality = 0.95,
    padding = 40,
    scale = 2,
  } = options;

  await prepareElementsForExport(elements);

  const solidBg = !backgroundColor || backgroundColor === 'transparent' ? '#ffffff' : backgroundColor;

  const canvas = generateExportCanvas(elements, {
    backgroundColor: solidBg,
    padding,
    scale,
  });

  const dataUrl = canvas.toDataURL('image/jpeg', quality);

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
export async function exportToPng(elements, options = {}) {
  const {
    filename = 'whiteboard-drawing.png',
    backgroundColor = 'transparent',
    padding = 40,
    scale = 2,
  } = options;

  await prepareElementsForExport(elements);

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
 * Export drawing project as JSON with validated elements and appState
 */
export function exportToJson(elements, appState = {}) {
  const sanitizedElements = validateScene(elements || []);

  const projectData = {
    version: 1,
    source: 'design-draw',
    createdAt: new Date().toISOString(),
    elements: sanitizedElements,
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
 * Import drawing project from JSON file with strict validation
 */
export function importFromJson(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const rawElements = Array.isArray(data.elements) ? data.elements : (Array.isArray(data) ? data : null);

        if (!rawElements) {
          reject(new Error('Invalid whiteboard project format: missing elements array'));
          return;
        }

        const validated = validateScene(rawElements);
        resolve({
          elements: validated,
          appState: data.appState || {},
        });
      } catch (err) {
        reject(new Error('Failed to parse JSON file: ' + err.message));
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
}
