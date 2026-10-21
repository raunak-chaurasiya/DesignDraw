export const TOOLS = {
  SELECT: 'select',
  HAND: 'hand',
  RECTANGLE: 'rectangle',
  DIAMOND: 'diamond',
  ELLIPSE: 'ellipse',
  ARROW: 'arrow',
  LINE: 'line',
  PENCIL: 'pencil',
  TEXT: 'text',
  STICKY: 'sticky',
  TABLE: 'table',
  MINDMAP: 'mindmap',
  IMAGE: 'image',
  ERASER: 'eraser',
};

export const STROKE_COLORS = [
  '#ffffff', // White
  '#f08c00', // Orange
  '#e03131', // Red
  '#2f9e44', // Green
  '#1971c2', // Blue
  '#9c36b5', // Purple
  '#f59f00', // Yellow
  '#e8590c', // Bright orange
  '#1e1e1e', // Dark charcoal
  '#adb5bd', // Gray
];

export const BG_COLORS = [
  'transparent',
  '#ffe3e3', // Light red
  '#d3f9d8', // Light green
  '#d0ebff', // Light blue
  '#fff3bf', // Light yellow
  '#f3d9fa', // Light purple
  '#ffe8cc', // Light orange
  '#343a40', // Dark fill
  '#e9ecef', // Light gray
];

export const STROKE_WIDTHS = [
  { label: 'Thin', value: 1.5 },
  { label: 'Medium', value: 3 },
  { label: 'Bold', value: 5 },
];

export const STROKE_STYLES = [
  { label: 'Solid', value: 'solid', dash: [] },
  { label: 'Dashed', value: 'dashed', dash: [8, 8] },
  { label: 'Dotted', value: 'dotted', dash: [3, 6] },
];

export const FILL_STYLES = [
  { label: 'None', value: 'none' },
  { label: 'Hachure', value: 'hachure' },
  { label: 'Cross-hatch', value: 'cross-hatch' },
  { label: 'Solid', value: 'solid' },
];

export const ROUGHNESS_LEVELS = [
  { label: 'Clean', value: 0 },
  { label: 'Artist', value: 1.2 },
  { label: 'Cartoon', value: 2.5 },
];

export const FONT_SIZES = [
  { label: 'S', value: 18 },
  { label: 'M', value: 24 },
  { label: 'L', value: 32 },
  { label: 'XL', value: 44 },
];

export const DEFAULT_STYLE = {
  strokeColor: '#ffffff',
  backgroundColor: 'transparent',
  strokeWidth: 2,
  strokeStyle: 'solid',
  fillStyle: 'hachure',
  roughness: 1.2,
  fontSize: 24,
  fontFamily: 'Patrick Hand, cursive',
  opacity: 100,
};
