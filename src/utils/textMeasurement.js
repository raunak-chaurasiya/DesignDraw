/**
 * Text Measurement Utilities
 * Computes accurate font metrics and dimensions using an offscreen canvas context
 */

let measurementCtx = null;

function getMeasurementContext() {
  if (!measurementCtx && typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    measurementCtx = canvas.getContext('2d');
  }
  return measurementCtx;
}

/**
 * Measure multi-line text width and height accurately based on font size and font family
 */
export function measureTextBounds(text, fontSize = 24, fontFamily = "'Patrick Hand', cursive") {
  const lines = String(text || '').split('\n');
  const lineHeight = fontSize * 1.35;
  const ctx = getMeasurementContext();

  let maxWidth = 40;

  if (ctx) {
    ctx.font = `${fontSize}px ${fontFamily}`;
    for (const line of lines) {
      if (line.length > 0) {
        const metrics = ctx.measureText(line);
        if (metrics.width > maxWidth) {
          maxWidth = metrics.width;
        }
      }
    }
  } else {
    // Fallback if headless / no DOM
    const maxLen = lines.reduce((max, l) => Math.max(max, l.length), 0);
    maxWidth = Math.max(40, maxLen * (fontSize * 0.6) + 10);
  }

  const paddingX = 16;
  const paddingY = 8;
  const width = Math.ceil(maxWidth + paddingX);
  const height = Math.ceil(Math.max(fontSize * 1.4, lines.length * lineHeight + paddingY));

  return { width, height, lineHeight };
}
