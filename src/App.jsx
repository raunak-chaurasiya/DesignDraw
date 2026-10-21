import React, { useState, useRef, useEffect, useCallback } from 'react';
import rough from 'roughjs';
import Toolbar from './components/Toolbar';
import PropertiesPanel from './components/PropertiesPanel';
import ZoomControls from './components/ZoomControls';
import MenuModal from './components/MenuModal';
import ExportModal from './components/ExportModal';
import HelpModal from './components/HelpModal';
import IntroCard from './components/IntroCard';
import { Analytics } from "@vercel/analytics/react";
import { TOOLS, DEFAULT_STYLE } from './constants';
import {
  isPointInElement,
  getElementBounds,
  getHitResizeHandle,
  isElementInBox,
  getElementsExactBounds,
  getCellAtPoint,
  getTableDimensions,
} from './utils/math';
import { renderElement, drawGrid, drawShapeAnchors, imageCache } from './utils/roughRenderer';
import { findNearestAnchor, updateConnectedArrows } from './utils/binding';
import { EraserEffectManager } from './utils/eraserEffects';
import { exportToJson } from './utils/export';
import { createBranchNode } from './utils/mindmap';

// Start with a clean whiteboard
const INITIAL_ELEMENTS = [];

export default function App() {
  const canvasRef = useRef(null);
  const textAreaRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastMousePosRef = useRef({ clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 });
  const [toastMessage, setToastMessage] = useState(null);
  const toastTimeoutRef = useRef(null);

  // Canvas View & Theme State
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  // Intro Welcome Overlay State (auto-dismisses when user selects any tool/shape or taps canvas)
  const [showIntro, setShowIntro] = useState(true);

  // Tool & Elements State
  const [activeTool, setActiveTool] = useState(TOOLS.SELECT);
  const [isLocked, setIsLocked] = useState(false);
  const [elements, setElements] = useState(INITIAL_ELEMENTS);
  const [selectedElementIds, setSelectedElementIds] = useState([]);
  const selectedElementId = selectedElementIds[0] || null;
  const setSelectedElementId = useCallback((id) => {
    setSelectedElementIds(id ? [id] : []);
  }, []);
  const [currentStyle, setCurrentStyle] = useState(DEFAULT_STYLE);

  // Undo / Redo History
  const [history, setHistory] = useState([INITIAL_ELEMENTS]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Interaction State
  const [action, setAction] = useState('none'); // 'none' | 'drawing' | 'moving' | 'resizing' | 'panning' | 'selecting'
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [currentElement, setCurrentElement] = useState(null);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [selectionBox, setSelectionBox] = useState(null);
  const [hoveredAnchor, setHoveredAnchor] = useState(null); // { element, anchor, x, y }
  const eraserFxRef = useRef(new EraserEffectManager());
  const [animFrame, setAnimFrame] = useState(0);

  // Synchronous refs to prevent any closure staleness or dropped frames on mobile touch events
  const actionRef = useRef('none');
  const currentElementRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const elementsRef = useRef(elements);
  elementsRef.current = elements;
  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;
  const isLockedRef = useRef(isLocked);
  isLockedRef.current = isLocked;
  const currentStyleRef = useRef(currentStyle);
  currentStyleRef.current = currentStyle;
  const panRef = useRef(pan);
  panRef.current = pan;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  // Inline Text Editor State
  const [editingText, setEditingText] = useState(null); // { id, x, y, text, isNew, fontSize, fontFamily, color }
  const [editingCell, setEditingCell] = useState(null); // { tableId, rowIndex, colIndex, cellX, cellY, cellWidth, cellHeight, text, fontSize, fontFamily }
  const cellInputRef = useRef(null);

  // Modals & Panels (Style panel closed by default on mobile so it doesn't obstruct screen)
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth > 768 : false
  );

  // Select tool and dismiss intro automatically
  const handleSelectTool = (tool) => {
    setActiveTool(tool);
    activeToolRef.current = tool;
    setShowIntro(false);
  };

  // Track space key for panning
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Helper: push new history state
  const pushHistory = useCallback(
    (newElements) => {
      const nextHistory = history.slice(0, historyIndex + 1);
      nextHistory.push(newElements);
      if (nextHistory.length > 50) nextHistory.shift();
      setHistory(nextHistory);
      setHistoryIndex(nextHistory.length - 1);
      setElements(newElements);
    },
    [history, historyIndex]
  );

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setElements(history[newIndex]);
      setSelectedElementId(null);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setElements(history[newIndex]);
      setSelectedElementId(null);
    }
  }, [history, historyIndex]);

  // Coordinate Conversion
  const getCanvasCoords = useCallback(
    (clientX, clientY) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const screenX = clientX - rect.left;
      const screenY = clientY - rect.top;
      return {
        x: (screenX - pan.x) / zoom,
        y: (screenY - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  const getScreenCoords = useCallback(
    (canvasX, canvasY) => {
      return {
        x: canvasX * zoom + pan.x,
        y: canvasY * zoom + pan.y,
      };
    },
    [pan, zoom]
  );

  // Toast notifications
  const showToast = useCallback((msg) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  }, []);

  // Insert image element onto canvas
  const insertImageElement = useCallback(
    (dataUrl, clientX, clientY) => {
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        const nw = img.naturalWidth || 400;
        const nh = img.naturalHeight || 300;
        const targetClientX = clientX !== undefined ? clientX : window.innerWidth / 2;
        const targetClientY = clientY !== undefined ? clientY : window.innerHeight / 2;

        const canvasCoord = getCanvasCoords(targetClientX, targetClientY);

        // Scale proportionally if image is large
        const maxDim = 520;
        let displayW = nw;
        let displayH = nh;
        if (displayW > maxDim || displayH > maxDim) {
          const scale = Math.min(maxDim / displayW, maxDim / displayH);
          displayW = Math.round(displayW * scale);
          displayH = Math.round(displayH * scale);
        }

        const newImageEl = {
          id: 'el-img-' + Date.now(),
          type: 'image',
          x: Math.round(canvasCoord.x - displayW / 2),
          y: Math.round(canvasCoord.y - displayH / 2),
          width: displayW,
          height: displayH,
          naturalWidth: nw,
          naturalHeight: nh,
          dataUrl,
          aspectRatio: nw / nh,
          strokeColor: 'transparent',
          strokeWidth: 0,
          strokeStyle: 'solid',
          roughness: 0,
          opacity: 100,
          seed: Math.floor(Math.random() * 100000),
        };

        // Cache image immediately so it renders at 60 FPS
        imageCache.set(dataUrl, { img, loaded: true });

        const updated = [...elementsRef.current, newImageEl];
        elementsRef.current = updated;
        pushHistory(updated);
        setSelectedElementId(newImageEl.id);
        setActiveTool(TOOLS.SELECT);
        activeToolRef.current = TOOLS.SELECT;
        setShowIntro(false);
        showToast('🖼️ Image pasted onto canvas!');
      };
      img.src = dataUrl;
    },
    [getCanvasCoords, pushHistory, showToast]
  );

  // File picker handler
  const handleImageFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('⚠️ Please select a valid image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      const pos = lastMousePosRef.current || {
        clientX: window.innerWidth / 2,
        clientY: window.innerHeight / 2,
      };
      insertImageElement(dataUrl, pos.clientX, pos.clientY);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleTriggerImageUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        const dropClientX = e.clientX;
        const dropClientY = e.clientY;
        reader.onload = (event) => {
          insertImageElement(event.target.result, dropClientX, dropClientY);
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  };

  // Global Clipboard Paste (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e) => {
      // If typing in input or textarea, let standard text paste happen
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;

          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target.result;
            const pos = lastMousePosRef.current || {
              clientX: window.innerWidth / 2,
              clientY: window.innerHeight / 2,
            };
            insertImageElement(dataUrl, pos.clientX, pos.clientY);
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [insertImageElement]);

  // Selected elements
  const selectedElements = elements.filter((el) => selectedElementIds.includes(el.id));
  const selectedElement = selectedElements.length === 1 ? selectedElements[0] : null;

  // Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Clear background
    ctx.fillStyle = isDarkMode ? '#121212' : '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    // Draw Grid
    if (showGrid) {
      drawGrid(ctx, width, height, pan, zoom, isDarkMode);
    }

    // Apply Pan and Zoom
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    const rc = rough.canvas(canvas);

    // Draw all committed elements
    for (const el of elements) {
      if (editingText && editingText.id === el.id) continue; // Don't draw element currently being typed in
      renderElement(ctx, rc, el, selectedElementIds.includes(el.id));
    }

    // Draw combined group/multi-selection bounding box if more than 1 element selected
    if (selectedElements.length > 1) {
      const b = getElementsExactBounds(selectedElements, 6);
      ctx.save();
      ctx.strokeStyle = '#6965db';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(b.minX, b.minY, b.width, b.height);

      // Check if all selected elements share the same groupId
      const isGroup =
        selectedElements[0].groupId &&
        selectedElements.every((el) => el.groupId === selectedElements[0].groupId);
      const badgeText = isGroup ? `Group (${selectedElements.length})` : `${selectedElements.length} items`;

      ctx.setLineDash([]);
      ctx.font = '11px Inter, sans-serif';
      const textMetrics = ctx.measureText(badgeText);
      const bw = textMetrics.width + 12;
      const bh = 18;
      const bx = b.minX;
      const by = b.minY - bh - 4;

      ctx.fillStyle = '#6965db';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(bx, by, bw, bh, 4);
      } else {
        ctx.rect(bx, by, bw, bh);
      }
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, bx + 6, by + bh / 2);
      ctx.restore();
    }

    // Draw active drawing element preview
    if (currentElement) {
      renderElement(ctx, rc, currentElement, false);
    }

    // Draw selection marquee box
    if (selectionBox) {
      const minX = Math.min(selectionBox.x1, selectionBox.x2);
      const minY = Math.min(selectionBox.y1, selectionBox.y2);
      const w = Math.abs(selectionBox.x2 - selectionBox.x1);
      const h = Math.abs(selectionBox.y2 - selectionBox.y1);

      ctx.save();
      ctx.fillStyle = 'rgba(105, 101, 219, 0.12)';
      ctx.strokeStyle = '#6965db';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.fillRect(minX, minY, w, h);
      ctx.strokeRect(minX, minY, w, h);
      ctx.restore();
    }

    // Draw snap anchors if hovering near an anchor while drawing or connecting arrow/line
    if (hoveredAnchor) {
      drawShapeAnchors(ctx, hoveredAnchor.element, hoveredAnchor.anchor);
    }

    // Render eraser visual ring cursor, trail, and particle bursts
    const hasActiveFx = eraserFxRef.current.render(ctx, action === 'erasing');

    ctx.restore(); // restore pan/zoom
    ctx.restore(); // restore dpr

    if (hasActiveFx) {
      const animId = requestAnimationFrame(() => {
        setAnimFrame((f) => (f + 1) % 100000);
      });
      return () => cancelAnimationFrame(animId);
    }
  }, [
    elements,
    currentElement,
    selectedElementIds,
    selectedElements,
    selectionBox,
    hoveredAnchor,
    animFrame,
    pan,
    zoom,
    isDarkMode,
    showGrid,
    editingText,
    action,
  ]);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-focus textarea when typing starts
  useEffect(() => {
    if (editingText) {
      const timer = setTimeout(() => {
        if (textAreaRef.current) {
          textAreaRef.current.focus();
        }
      }, 40);
      return () => clearTimeout(timer);
    }
  }, [editingText?.id]);

  // Auto-focus cell input when editing a table cell
  useEffect(() => {
    if (editingCell) {
      const timer = setTimeout(() => {
        if (cellInputRef.current) {
          cellInputRef.current.focus();
          cellInputRef.current.select();
        }
      }, 40);
      return () => clearTimeout(timer);
    }
  }, [editingCell?.tableId, editingCell?.rowIndex, editingCell?.colIndex]);

  // Update element style (or default style if nothing selected)
  const handleUpdateStyle = (key, value) => {
    setCurrentStyle((prev) => ({ ...prev, [key]: value }));

    if (selectedElementIds.length > 0) {
      const updated = elements.map((el) => {
        if (selectedElementIds.includes(el.id)) {
          return { ...el, [key]: value };
        }
        return el;
      });
      elementsRef.current = updated;
      pushHistory(updated);
    }
  };

  // Delete selected elements
  const handleDeleteSelected = useCallback(() => {
    if (selectedElementIds.length === 0) return;
    const count = selectedElementIds.length;
    const updated = elements.filter((el) => !selectedElementIds.includes(el.id));
    elementsRef.current = updated;
    setSelectedElementIds([]);
    pushHistory(updated);
    if (count > 1) {
      showToast(`Deleted ${count} elements`);
    }
  }, [selectedElementIds, elements, pushHistory, showToast]);

  // Duplicate selected elements
  const handleDuplicateSelected = useCallback(() => {
    if (selectedElementIds.length === 0) return;
    const selected = elements.filter((el) => selectedElementIds.includes(el.id));
    if (selected.length === 0) return;

    // Map old groupId to a new shared groupId so grouped sets remain grouped when duplicated
    const groupMapping = {};

    const duplicates = selected.map((el) => {
      let duplicateGroupId = undefined;
      if (el.groupId) {
        if (!groupMapping[el.groupId]) {
          groupMapping[el.groupId] = 'grp-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        }
        duplicateGroupId = groupMapping[el.groupId];
      }

      return {
        ...el,
        id: 'el-' + Date.now() + '-' + Math.floor(Math.random() * 100000),
        groupId: duplicateGroupId,
        x: el.x !== undefined ? el.x + 20 : undefined,
        y: el.y !== undefined ? el.y + 20 : undefined,
        x1: el.x1 !== undefined ? el.x1 + 20 : undefined,
        y1: el.y1 !== undefined ? el.y1 + 20 : undefined,
        x2: el.x2 !== undefined ? el.x2 + 20 : undefined,
        y2: el.y2 !== undefined ? el.y2 + 20 : undefined,
        points: el.points ? el.points.map((p) => ({ x: p.x + 20, y: p.y + 20 })) : undefined,
        seed: Math.floor(Math.random() * 100000),
      };
    });

    const updated = [...elements, ...duplicates];
    elementsRef.current = updated;
    setSelectedElementIds(duplicates.map((d) => d.id));
    pushHistory(updated);
    showToast(`Duplicated ${duplicates.length} element${duplicates.length > 1 ? 's' : ''}`);
  }, [selectedElementIds, elements, pushHistory, showToast]);

  // Group selected elements
  const handleGroupSelected = useCallback(() => {
    if (selectedElementIds.length < 2) {
      showToast('⚠️ Select at least 2 elements to group (Ctrl+G)');
      return;
    }

    const newGroupId = 'grp-' + Date.now();
    const updated = elements.map((el) => {
      if (selectedElementIds.includes(el.id)) {
        return { ...el, groupId: newGroupId };
      }
      return el;
    });

    elementsRef.current = updated;
    pushHistory(updated);
    showToast(`🔗 Grouped ${selectedElementIds.length} elements! (Ctrl+G)`);
  }, [selectedElementIds, elements, pushHistory, showToast]);

  // Ungroup selected elements
  const handleUngroupSelected = useCallback(() => {
    const selected = elements.filter((el) => selectedElementIds.includes(el.id));
    const hasGroup = selected.some((el) => el.groupId);
    if (!hasGroup) {
      showToast('⚠️ Selected elements are not grouped');
      return;
    }

    const updated = elements.map((el) => {
      if (selectedElementIds.includes(el.id) && el.groupId) {
        const { groupId, ...rest } = el;
        return rest;
      }
      return el;
    });

    elementsRef.current = updated;
    pushHistory(updated);
    showToast('🔓 Ungrouped elements! (Ctrl+Shift+G)');
  }, [selectedElementIds, elements, pushHistory, showToast]);

  // Alignment tool for multi-selection
  const handleAlign = useCallback(
    (direction) => {
      const selected = elements.filter((el) => selectedElementIds.includes(el.id));
      if (selected.length < 2) return;

      const itemsWithBounds = selected.map((el) => ({
        el,
        bounds: getElementBounds(el),
      }));

      const minX = Math.min(...itemsWithBounds.map((i) => i.bounds.minX));
      const maxX = Math.max(...itemsWithBounds.map((i) => i.bounds.maxX));
      const minY = Math.min(...itemsWithBounds.map((i) => i.bounds.minY));
      const maxY = Math.max(...itemsWithBounds.map((i) => i.bounds.maxY));
      const midX = (minX + maxX) / 2;
      const midY = (minY + maxY) / 2;

      const updated = elements.map((el) => {
        if (!selectedElementIds.includes(el.id)) return el;
        const b = getElementBounds(el);
        let dx = 0;
        let dy = 0;

        if (direction === 'left') dx = minX - b.minX;
        else if (direction === 'center-h') dx = midX - (b.minX + b.width / 2);
        else if (direction === 'right') dx = maxX - b.maxX;
        else if (direction === 'top') dy = minY - b.minY;
        else if (direction === 'center-v') dy = midY - (b.minY + b.height / 2);
        else if (direction === 'bottom') dy = maxY - b.maxY;

        if (dx === 0 && dy === 0) return el;

        if (el.type === 'line' || el.type === 'arrow') {
          return { ...el, x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy };
        }
        if (el.type === 'pencil') {
          return { ...el, points: el.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
        }
        return { ...el, x: el.x + dx, y: el.y + dy };
      });

      elementsRef.current = updated;
      pushHistory(updated);
      showToast(`📐 Aligned elements!`);
    },
    [selectedElementIds, elements, pushHistory, showToast]
  );

  // Layering: Forward / Backward across multi-selection
  const handleBringForward = () => {
    if (selectedElementIds.length === 0) return;
    const updated = [...elements];
    for (let i = updated.length - 2; i >= 0; i--) {
      if (selectedElementIds.includes(updated[i].id) && !selectedElementIds.includes(updated[i + 1].id)) {
        const temp = updated[i];
        updated[i] = updated[i + 1];
        updated[i + 1] = temp;
      }
    }
    elementsRef.current = updated;
    pushHistory(updated);
  };

  const handleSendBackward = () => {
    if (selectedElementIds.length === 0) return;
    const updated = [...elements];
    for (let i = 1; i < updated.length; i++) {
      if (selectedElementIds.includes(updated[i].id) && !selectedElementIds.includes(updated[i - 1].id)) {
        const temp = updated[i];
        updated[i] = updated[i - 1];
        updated[i - 1] = temp;
      }
    }
    elementsRef.current = updated;
    pushHistory(updated);
  };

  // Commit inline text editing
  const handleFinishEditingText = (customText) => {
    if (!editingText) return;
    const textVal = customText !== undefined ? customText : editingText.text;
    const trimmed = (textVal || '').trim();

    if (!trimmed) {
      // If empty and was existing element, delete it
      if (!editingText.isNew) {
        const updated = elements.filter((el) => el.id !== editingText.id);
        pushHistory(updated);
      }
    } else {
      const fontSize = editingText.fontSize || currentStyle.fontSize || 24;
      const lines = trimmed.split('\n');
      const maxLen = lines.reduce((max, l) => Math.max(max, l.length), 0);
      const calcWidth = Math.max(40, maxLen * (fontSize * 0.58) + 16);
      const calcHeight = Math.max(fontSize * 1.3, lines.length * (fontSize * 1.35));

      // Ensure good text contrast
      let textColor = currentStyle.strokeColor || '#ffffff';
      if (isDarkMode && (textColor === '#1e1e1e' || textColor === '#212529')) {
        textColor = '#ffffff';
      } else if (!isDarkMode && textColor === '#ffffff') {
        textColor = '#1e1e1e';
      }

      if (editingText.isNew) {
        const newEl = {
          id: editingText.id,
          type: editingText.type || 'text',
          x: editingText.x,
          y: editingText.y,
          width: editingText.type === 'sticky' ? (editingText.width || 180) : calcWidth,
          height: editingText.type === 'sticky' ? (editingText.height || 160) : calcHeight,
          text: trimmed,
          fontSize: fontSize,
          fontFamily: editingText.fontFamily || currentStyle.fontFamily,
          strokeColor: textColor,
          backgroundColor: currentStyle.backgroundColor,
          strokeWidth: currentStyle.strokeWidth,
          strokeStyle: currentStyle.strokeStyle,
          fillStyle: currentStyle.fillStyle,
          roughness: currentStyle.roughness,
          seed: Math.floor(Math.random() * 100000),
          opacity: currentStyle.opacity,
        };
        pushHistory([...elements, newEl]);
        setSelectedElementId(newEl.id);
      } else {
        const updated = elements.map((el) => {
          if (el.id === editingText.id) {
            return {
              ...el,
              text: trimmed,
              width: el.type === 'text' ? calcWidth : el.width,
              height: el.type === 'text' ? calcHeight : el.height,
            };
          }
          return el;
        });
        pushHistory(updated);
      }
    }

    setEditingText(null);
    if (!isLocked) setActiveTool(TOOLS.SELECT);
  };

  // Commit or cancel inline table cell editing
  const handleFinishEditingCell = (commit = true, moveNext = false, movePrev = false) => {
    if (!editingCell) return;
    const { tableId, rowIndex, colIndex, text } = editingCell;

    if (commit) {
      const currentElements = elementsRef.current;
      const targetTable = currentElements.find((el) => el.id === tableId);
      if (targetTable && targetTable.type === 'table') {
        const rows = targetTable.rows || (targetTable.data ? targetTable.data.length : 3);
        const cols = targetTable.cols || (targetTable.data && targetTable.data[0] ? targetTable.data[0].length : 3);

        const newData = targetTable.data
          ? targetTable.data.map((r) => [...r])
          : [];
        while (newData.length < rows) {
          newData.push(new Array(cols).fill(''));
        }
        while (newData[rowIndex].length < cols) {
          newData[rowIndex].push('');
        }
        newData[rowIndex][colIndex] = text;

        let nextRows = rows;
        let nextHeight = targetTable.height;
        let nextRow = rowIndex;
        let nextCol = colIndex;

        if (moveNext) {
          if (colIndex + 1 < cols) {
            nextCol = colIndex + 1;
          } else if (rowIndex + 1 < rows) {
            nextRow = rowIndex + 1;
            nextCol = 0;
          } else {
            // End of table reached! Auto-add a new row for smooth spreadsheet/table entry
            nextRows = rows + 1;
            newData.push(new Array(cols).fill(''));
            const rH = targetTable.height / rows;
            nextHeight = Math.round(targetTable.height + Math.max(35, rH));
            nextRow = rows;
            nextCol = 0;
          }
        } else if (movePrev) {
          if (colIndex > 0) {
            nextCol = colIndex - 1;
          } else if (rowIndex > 0) {
            nextRow = rowIndex - 1;
            nextCol = cols - 1;
          }
        }

        const updatedTable = {
          ...targetTable,
          rows: nextRows,
          height: nextHeight,
          data: newData,
        };

        const updated = currentElements.map((el) => (el.id === tableId ? updatedTable : el));
        elementsRef.current = updated;
        pushHistory(updated);

        if (moveNext || movePrev) {
          const dims = getTableDimensions(updatedTable);
          if (dims) {
            setEditingCell({
              tableId,
              rowIndex: nextRow,
              colIndex: nextCol,
              cellX: dims.x + nextCol * dims.colWidth,
              cellY: dims.y + nextRow * dims.rowHeight,
              cellWidth: dims.colWidth,
              cellHeight: dims.rowHeight,
              text: (newData[nextRow] && newData[nextRow][nextCol] !== undefined)
                ? String(newData[nextRow][nextCol])
                : '',
              fontSize: updatedTable.fontSize || 18,
              fontFamily: updatedTable.fontFamily || "'Patrick Hand', cursive",
            });
            return;
          }
        }
      }
    }

    setEditingCell(null);
  };

  // Table row and column management functions
  const handleAddTableRow = useCallback((tableId) => {
    const updated = elementsRef.current.map((el) => {
      if (el.id === tableId && el.type === 'table') {
        const currentRows = el.rows || (el.data ? el.data.length : 3);
        const currentCols = el.cols || (el.data && el.data[0] ? el.data[0].length : 3);
        const newRows = currentRows + 1;
        const newData = el.data ? el.data.map((r) => [...r]) : [];
        while (newData.length < currentRows) {
          newData.push(new Array(currentCols).fill(''));
        }
        newData.push(new Array(currentCols).fill(''));
        const rowHeight = el.height / currentRows;
        return {
          ...el,
          rows: newRows,
          data: newData,
          height: Math.round(el.height + Math.max(35, rowHeight)),
        };
      }
      return el;
    });
    elementsRef.current = updated;
    pushHistory(updated);
  }, [pushHistory]);

  const handleRemoveTableRow = useCallback((tableId) => {
    const updated = elementsRef.current.map((el) => {
      if (el.id === tableId && el.type === 'table') {
        const currentRows = el.rows || (el.data ? el.data.length : 3);
        if (currentRows <= 1) return el;
        const newRows = currentRows - 1;
        const newData = (el.data || []).slice(0, newRows);
        const rowHeight = el.height / currentRows;
        return {
          ...el,
          rows: newRows,
          data: newData,
          height: Math.max(50, Math.round(el.height - rowHeight)),
        };
      }
      return el;
    });
    elementsRef.current = updated;
    pushHistory(updated);
  }, [pushHistory]);

  const handleAddTableCol = useCallback((tableId) => {
    const updated = elementsRef.current.map((el) => {
      if (el.id === tableId && el.type === 'table') {
        const currentRows = el.rows || (el.data ? el.data.length : 3);
        const currentCols = el.cols || (el.data && el.data[0] ? el.data[0].length : 3);
        const newCols = currentCols + 1;
        const newData = [];
        for (let r = 0; r < currentRows; r++) {
          const row = el.data && el.data[r] ? [...el.data[r]] : new Array(currentCols).fill('');
          row.push(r === 0 && el.hasHeader ? `Col ${newCols}` : '');
          newData.push(row);
        }
        const colWidth = el.width / currentCols;
        return {
          ...el,
          cols: newCols,
          data: newData,
          width: Math.round(el.width + Math.max(60, colWidth)),
        };
      }
      return el;
    });
    elementsRef.current = updated;
    pushHistory(updated);
  }, [pushHistory]);

  const handleRemoveTableCol = useCallback((tableId) => {
    const updated = elementsRef.current.map((el) => {
      if (el.id === tableId && el.type === 'table') {
        const currentRows = el.rows || (el.data ? el.data.length : 3);
        const currentCols = el.cols || (el.data && el.data[0] ? el.data[0].length : 3);
        if (currentCols <= 1) return el;
        const newCols = currentCols - 1;
        const newData = (el.data || []).map((row) => row.slice(0, newCols));
        const colWidth = el.width / currentCols;
        return {
          ...el,
          cols: newCols,
          data: newData,
          width: Math.max(80, Math.round(el.width - colWidth)),
        };
      }
      return el;
    });
    elementsRef.current = updated;
    pushHistory(updated);
  }, [pushHistory]);

  const handleToggleTableHeader = useCallback((tableId) => {
    const updated = elementsRef.current.map((el) => {
      if (el.id === tableId && el.type === 'table') {
        return {
          ...el,
          hasHeader: !el.hasHeader,
        };
      }
      return el;
    });
    elementsRef.current = updated;
    pushHistory(updated);
  }, [pushHistory]);

  // Mind Map Auto-Branching handlers
  const handleAddBranchChild = useCallback(
    (sourceNode, direction = 'right') => {
      if (!sourceNode) return;
      const result = createBranchNode(sourceNode, direction, elementsRef.current, false);
      if (!result) return;

      const { newNode, newElements } = result;
      elementsRef.current = newElements;
      pushHistory(newElements);
      setSelectedElementIds([newNode.id]);

      // Automatically open inline text editor on the newly created child node!
      setTimeout(() => {
        setEditingText({
          id: newNode.id,
          type: newNode.type,
          x: newNode.x,
          y: newNode.y,
          width: newNode.width,
          height: newNode.height,
          text: '',
          isNew: false,
          fontSize: newNode.fontSize,
          fontFamily: newNode.fontFamily,
        });
      }, 40);

      showToast('🧠 Child branch added! Type idea...');
    },
    [pushHistory, showToast]
  );

  const handleAddBranchSibling = useCallback(
    (sourceNode) => {
      if (!sourceNode) return;
      const result = createBranchNode(sourceNode, 'bottom', elementsRef.current, true);
      if (!result) return;

      const { newNode, newElements } = result;
      elementsRef.current = newElements;
      pushHistory(newElements);
      setSelectedElementIds([newNode.id]);

      // Automatically open inline text editor on the newly created sibling node!
      setTimeout(() => {
        setEditingText({
          id: newNode.id,
          type: newNode.type,
          x: newNode.x,
          y: newNode.y,
          width: newNode.width,
          height: newNode.height,
          text: '',
          isNew: false,
          fontSize: newNode.fontSize,
          fontFamily: newNode.fontFamily,
        });
      }, 40);

      showToast('🌿 Sibling branch added! Type idea...');
    },
    [pushHistory, showToast]
  );

  // Mouse Down Handler
  const handleMouseDown = (e) => {
    if (editingText) {
      handleFinishEditingText();
      return;
    }
    if (editingCell) {
      handleFinishEditingCell(true);
      return;
    }

    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setDragStart({ x: e.clientX, y: e.clientY });

    const activeTool = activeToolRef.current;
    const currentStyle = currentStyleRef.current;
    const zoom = zoomRef.current;
    const elements = elementsRef.current;

    // 1. Pan mode: Hand tool or Space pressed or middle click
    if (activeTool === TOOLS.HAND || isSpacePressed || e.button === 1) {
      actionRef.current = 'panning';
      setAction('panning');
      return;
    }

    // Image mode: Click on canvas to pick image file
    if (activeTool === TOOLS.IMAGE) {
      handleTriggerImageUpload();
      if (!isLocked) {
        setActiveTool(TOOLS.SELECT);
        activeToolRef.current = TOOLS.SELECT;
      }
      return;
    }

    // 2. Eraser mode
    if (activeTool === TOOLS.ERASER) {
      actionRef.current = 'erasing';
      setAction('erasing');
      eraserFxRef.current.setCursor(x, y);
      eraserFxRef.current.addTrailPoint(x, y);
      const hit = elements.find((el) => isPointInElement(x, y, el, 14 / zoom));
      if (hit) {
        eraserFxRef.current.createBurst(x, y, 18);
        const updated = elements.filter((el) => el.id !== hit.id);
        elementsRef.current = updated;
        pushHistory(updated);
      }
      return;
    }

    // 3. Selection mode
    if (activeTool === TOOLS.SELECT) {
      // Check if clicked resize handle of already selected single element
      if (selectedElement) {
        const handle = getHitResizeHandle(x, y, selectedElement, zoom);
        if (handle) {
          actionRef.current = 'resizing';
          setAction('resizing');
          setResizeHandle(handle.type);
          return;
        }
      }

      // Check if clicked on any element (reverse loop to select topmost)
      let hitElement = null;
      for (let i = elements.length - 1; i >= 0; i--) {
        if (isPointInElement(x, y, elements[i], 10 / zoom)) {
          hitElement = elements[i];
          break;
        }
      }

      if (hitElement) {
        // Find all elements belonging to the same group as hitElement (if grouped)
        const groupMembers = hitElement.groupId
          ? elements.filter((el) => el.groupId === hitElement.groupId).map((el) => el.id)
          : [hitElement.id];

        if (e.shiftKey) {
          // Shift + Click: Toggle selection membership
          const allAlreadyIn = groupMembers.every((id) => selectedElementIds.includes(id));
          if (allAlreadyIn) {
            setSelectedElementIds((prev) => prev.filter((id) => !groupMembers.includes(id)));
          } else {
            setSelectedElementIds((prev) => Array.from(new Set([...prev, ...groupMembers])));
          }
          return;
        }

        // Normal Click:
        // If the clicked element is already in the multi-selection, keep the full selection so user can drag all items together!
        if (selectedElementIds.includes(hitElement.id)) {
          actionRef.current = 'moving';
          setAction('moving');
        } else {
          // New selection: select this element (or its group)
          setSelectedElementIds(groupMembers);
          actionRef.current = 'moving';
          setAction('moving');
        }
      } else {
        // Clicked on empty canvas
        if (!e.shiftKey) {
          setSelectedElementIds([]);
        }
        actionRef.current = 'selecting';
        setAction('selecting');
        setSelectionBox({ x1: x, y1: y, x2: x, y2: y });
      }
      return;
    }

    // 4. Text Tool Click
    if (activeTool === TOOLS.TEXT) {
      const textId = 'el-text-' + Date.now();
      setEditingText({
        id: textId,
        type: 'text',
        x,
        y,
        text: '',
        isNew: true,
        fontSize: currentStyle.fontSize,
        fontFamily: currentStyle.fontFamily,
      });
      return;
    }

    // 5. Sticky Note Click
    if (activeTool === TOOLS.STICKY) {
      const stickyId = 'el-sticky-' + Date.now();
      const newSticky = {
        id: stickyId,
        type: 'sticky',
        x,
        y,
        width: 180,
        height: 160,
        text: 'New Note',
        fontSize: 20,
        fontFamily: "'Patrick Hand', cursive",
        strokeColor: '#f59f00',
        backgroundColor: '#fff3bf',
        strokeWidth: 1.5,
        textColor: '#212529',
        seed: Math.floor(Math.random() * 100000),
        opacity: 100,
      };
      const updated = [...elements, newSticky];
      elementsRef.current = updated;
      pushHistory(updated);
      setSelectedElementId(newSticky.id);
      if (!isLockedRef.current) {
        setActiveTool(TOOLS.SELECT);
        activeToolRef.current = TOOLS.SELECT;
      }
      return;
    }

    // 5.5. Table Tool Click / Drag
    if (activeTool === TOOLS.TABLE) {
      actionRef.current = 'drawing';
      setAction('drawing');

      const defaultRows = 3;
      const defaultCols = 3;
      const defaultData = [
        ['Feature', 'Status', 'Priority'],
        ['Task 1', 'In Progress', 'High'],
        ['Task 2', 'Done', 'Normal'],
      ];

      const newTable = {
        id: 'el-table-' + Date.now(),
        type: TOOLS.TABLE,
        x,
        y,
        width: 0,
        height: 0,
        rows: defaultRows,
        cols: defaultCols,
        data: defaultData,
        hasHeader: true,
        strokeColor: currentStyle.strokeColor,
        backgroundColor: currentStyle.backgroundColor,
        strokeWidth: currentStyle.strokeWidth,
        strokeStyle: currentStyle.strokeStyle,
        fillStyle: currentStyle.fillStyle,
        roughness: currentStyle.roughness,
        fontSize: 18,
        fontFamily: currentStyle.fontFamily || "'Patrick Hand', cursive",
        seed: Math.floor(Math.random() * 100000),
        opacity: currentStyle.opacity,
      };

      currentElementRef.current = newTable;
      setCurrentElement(newTable);
      return;
    }

    // 5.6. Mind Map Root Tool Click
    if (activeTool === TOOLS.MINDMAP) {
      const rootId = 'el-node-' + Date.now();
      const newRoot = {
        id: rootId,
        type: 'rectangle',
        x: Math.round(x - 90),
        y: Math.round(y - 28),
        width: 180,
        height: 56,
        text: 'Central Idea',
        fontSize: 22,
        fontFamily: "'Patrick Hand', cursive",
        strokeColor: '#827fe2',
        backgroundColor: 'rgba(105, 101, 219, 0.25)',
        strokeWidth: 2.5,
        strokeStyle: 'solid',
        fillStyle: 'solid',
        roughness: 1.0,
        seed: Math.floor(Math.random() * 100000),
        opacity: 100,
      };

      const updated = [...elements, newRoot];
      elementsRef.current = updated;
      pushHistory(updated);
      setSelectedElementId(newRoot.id);
      showToast('🧠 Central Topic created! Press Tab to add child branches.');
      if (!isLockedRef.current) {
        setActiveTool(TOOLS.SELECT);
        activeToolRef.current = TOOLS.SELECT;
      }
      return;
    }

    // 6. Shape / Line / Pencil Drawing
    actionRef.current = 'drawing';
    setAction('drawing');

    let startX = x;
    let startY = y;
    let startBinding = null;

    if (activeTool === TOOLS.ARROW || activeTool === TOOLS.LINE) {
      const nearAnchor = findNearestAnchor(x, y, elements, null, 28);
      if (nearAnchor) {
        startX = nearAnchor.x;
        startY = nearAnchor.y;
        startBinding = { elementId: nearAnchor.elementId, anchor: nearAnchor.anchor };
      }
    }

    const newElement = {
      id: 'el-' + Date.now(),
      type: activeTool,
      x: startX,
      y: startY,
      width: 0,
      height: 0,
      x1: startX,
      y1: startY,
      x2: startX,
      y2: startY,
      startBinding,
      endBinding: null,
      points: activeTool === TOOLS.PENCIL ? [{ x, y }] : undefined,
      strokeColor: currentStyle.strokeColor,
      backgroundColor: currentStyle.backgroundColor,
      strokeWidth: currentStyle.strokeWidth,
      strokeStyle: currentStyle.strokeStyle,
      fillStyle: currentStyle.fillStyle,
      roughness: currentStyle.roughness,
      seed: Math.floor(Math.random() * 100000),
      opacity: currentStyle.opacity,
    };
    currentElementRef.current = newElement;
    setCurrentElement(newElement);
  };

  // Mouse Move Handler
  const handleMouseMove = (e) => {
    lastMousePosRef.current = { clientX: e.clientX, clientY: e.clientY };
    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    const activeTool = activeToolRef.current;
    const currentAction = actionRef.current;
    const zoom = zoomRef.current;
    const elements = elementsRef.current;

    // Update eraser cursor position
    if (activeTool === TOOLS.ERASER) {
      eraserFxRef.current.setCursor(x, y);
    } else {
      eraserFxRef.current.clearCursor();
    }

    // Pan canvas
    if (currentAction === 'panning') {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      return;
    }

    // Eraser drag
    if (currentAction === 'erasing') {
      eraserFxRef.current.addTrailPoint(x, y);
      const hit = elements.find((el) => isPointInElement(x, y, el, 14 / zoom));
      if (hit) {
        eraserFxRef.current.createBurst(x, y, 16);
        const updated = elements.filter((el) => el.id !== hit.id);
        elementsRef.current = updated;
        setElements(updated);
      }
      return;
    }

    // Marquee selection
    if (currentAction === 'selecting' && selectionBox) {
      setSelectionBox((prev) => ({ ...prev, x2: x, y2: y }));
      return;
    }

    // Drawing new shape
    if (currentAction === 'drawing' && currentElementRef.current) {
      let updated;
      const cur = currentElementRef.current;

      if (cur.type === TOOLS.PENCIL) {
        updated = {
          ...cur,
          points: [...cur.points, { x, y }],
        };
      } else if (cur.type === TOOLS.LINE || cur.type === TOOLS.ARROW) {
        // Snap end tip to nearest anchor of target shape
        const nearAnchor = findNearestAnchor(
          x,
          y,
          elements,
          cur.startBinding?.elementId,
          28
        );

        if (nearAnchor) {
          updated = {
            ...cur,
            x2: nearAnchor.x,
            y2: nearAnchor.y,
            endBinding: { elementId: nearAnchor.elementId, anchor: nearAnchor.anchor },
          };
          setHoveredAnchor(nearAnchor);
        } else {
          updated = {
            ...cur,
            x2: x,
            y2: y,
            endBinding: null,
          };
          setHoveredAnchor(null);
        }
      } else {
        // Rectangle, diamond, ellipse
        updated = {
          ...cur,
          width: x - cur.x,
          height: y - cur.y,
        };
      }

      currentElementRef.current = updated;
      setCurrentElement(updated);
      return;
    }

    // Moving selected element(s)
    if (currentAction === 'moving' && selectedElementIds.length > 0) {
      const dx = (e.clientX - dragStartRef.current.x) / zoom;
      const dy = (e.clientY - dragStartRef.current.y) / zoom;
      dragStartRef.current = { x: e.clientX, y: e.clientY };

      const movedShapes = [];

      const updatedElements = elements.map((el) => {
        if (selectedElementIds.includes(el.id)) {
          if (el.type === 'line' || el.type === 'arrow') {
            const updatedLine = {
              ...el,
              x1: el.x1 + dx,
              y1: el.y1 + dy,
              x2: el.x2 + dx,
              y2: el.y2 + dy,
            };
            movedShapes.push(updatedLine);
            return updatedLine;
          }
          if (el.type === 'pencil') {
            const updatedPencil = {
              ...el,
              points: el.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
            };
            movedShapes.push(updatedPencil);
            return updatedPencil;
          }
          const updatedShape = {
            ...el,
            x: el.x + dx,
            y: el.y + dy,
          };
          movedShapes.push(updatedShape);
          return updatedShape;
        }
        return el;
      });

      // Automatically move connected arrows and lines with any shape that moved
      let finalElements = updatedElements;
      for (const shape of movedShapes) {
        finalElements = updateConnectedArrows(finalElements, shape);
      }
      elementsRef.current = finalElements;
      setElements(finalElements);
      return;
    }

    // Resizing element
    if (currentAction === 'resizing' && selectedElement && resizeHandle) {
      if (selectedElement.type === 'line' || selectedElement.type === 'arrow') {
        let newX1 = selectedElement.x1;
        let newY1 = selectedElement.y1;
        let newX2 = selectedElement.x2;
        let newY2 = selectedElement.y2;
        let newStartBinding = selectedElement.startBinding;
        let newEndBinding = selectedElement.endBinding;

        if (resizeHandle === 'start') {
          const nearAnchor = findNearestAnchor(x, y, elements, selectedElement.id, 28);
          if (nearAnchor) {
            newX1 = nearAnchor.x;
            newY1 = nearAnchor.y;
            newStartBinding = { elementId: nearAnchor.elementId, anchor: nearAnchor.anchor };
            setHoveredAnchor(nearAnchor);
          } else {
            newX1 = x;
            newY1 = y;
            newStartBinding = null;
            setHoveredAnchor(null);
          }
        } else if (resizeHandle === 'end') {
          const nearAnchor = findNearestAnchor(x, y, elements, selectedElement.id, 28);
          if (nearAnchor) {
            newX2 = nearAnchor.x;
            newY2 = nearAnchor.y;
            newEndBinding = { elementId: nearAnchor.elementId, anchor: nearAnchor.anchor };
            setHoveredAnchor(nearAnchor);
          } else {
            newX2 = x;
            newY2 = y;
            newEndBinding = null;
            setHoveredAnchor(null);
          }
        }

        const updatedLine = {
          ...selectedElement,
          x1: newX1,
          y1: newY1,
          x2: newX2,
          y2: newY2,
          startBinding: newStartBinding,
          endBinding: newEndBinding,
        };
        const updatedElements = elements.map((el) =>
          el.id === selectedElement.id ? updatedLine : el
        );
        elementsRef.current = updatedElements;
        setElements(updatedElements);
        return;
      }

      const bounds = getElementBounds(selectedElement);
      let newX = selectedElement.x;
      let newY = selectedElement.y;
      let newW = selectedElement.width;
      let newH = selectedElement.height;

      if (selectedElement.type === 'image' && ['nw', 'ne', 'se', 'sw'].includes(resizeHandle)) {
        const ar = selectedElement.aspectRatio || (bounds.width / (bounds.height || 1)) || 1;
        if (resizeHandle === 'se') {
          newW = Math.max(20, x - bounds.minX);
          newH = Math.round(newW / ar);
        } else if (resizeHandle === 'sw') {
          newW = Math.max(20, bounds.maxX - x);
          newH = Math.round(newW / ar);
          newX = Math.round(bounds.maxX - newW);
        } else if (resizeHandle === 'ne') {
          newW = Math.max(20, x - bounds.minX);
          newH = Math.round(newW / ar);
          newY = Math.round(bounds.maxY - newH);
        } else if (resizeHandle === 'nw') {
          newW = Math.max(20, bounds.maxX - x);
          newH = Math.round(newW / ar);
          newX = Math.round(bounds.maxX - newW);
          newY = Math.round(bounds.maxY - newH);
        }
      } else {
        if (resizeHandle.includes('e')) newW = x - bounds.minX;
        if (resizeHandle.includes('s')) newH = y - bounds.minY;
        if (resizeHandle.includes('w')) {
          newW = bounds.maxX - x;
          newX = x;
        }
        if (resizeHandle.includes('n')) {
          newH = bounds.maxY - y;
          newY = y;
        }
      }

      if (selectedElement.type === 'table') {
        newW = Math.max(100, newW);
        newH = Math.max(50, newH);
      }

      const updatedShape = { ...selectedElement, x: newX, y: newY, width: newW, height: newH };
      const updatedElements = elements.map((el) =>
        el.id === selectedElement.id ? updatedShape : el
      );
      const finalElements = updateConnectedArrows(updatedElements, updatedShape);
      elementsRef.current = finalElements;
      setElements(finalElements);
      return;
    }

    // Highlight snap anchor points when hovering over shapes with arrow or line tool
    if (currentAction === 'none' && (activeTool === TOOLS.ARROW || activeTool === TOOLS.LINE)) {
      const nearAnchor = findNearestAnchor(x, y, elements, null, 28);
      setHoveredAnchor(nearAnchor);
    } else if (currentAction === 'none' && hoveredAnchor) {
      setHoveredAnchor(null);
    }
  };

  // Mouse Up Handler
  const handleMouseUp = () => {
    setHoveredAnchor(null);
    const activeAct = actionRef.current;
    const drawnEl = currentElementRef.current;

    if (activeAct === 'drawing' && drawnEl) {
      let isValid = true;
      if (drawnEl.type === TOOLS.TABLE) {
        if (Math.abs(drawnEl.width) < 15 && Math.abs(drawnEl.height) < 15) {
          drawnEl.width = 450;
          drawnEl.height = 210;
        } else {
          if (drawnEl.width < 0) {
            drawnEl.x = drawnEl.x + drawnEl.width;
            drawnEl.width = Math.abs(drawnEl.width);
          }
          if (drawnEl.height < 0) {
            drawnEl.y = drawnEl.y + drawnEl.height;
            drawnEl.height = Math.abs(drawnEl.height);
          }
          drawnEl.width = Math.max(120, drawnEl.width);
          drawnEl.height = Math.max(60, drawnEl.height);
        }
        isValid = true;
      } else if (drawnEl.type === TOOLS.PENCIL) {
        isValid = drawnEl.points.length > 1;
      } else if (drawnEl.type === TOOLS.LINE || drawnEl.type === TOOLS.ARROW) {
        isValid = Math.hypot(drawnEl.x2 - drawnEl.x1, drawnEl.y2 - drawnEl.y1) > 4;
      } else {
        isValid = Math.abs(drawnEl.width) > 4 || Math.abs(drawnEl.height) > 4;
      }

      if (isValid) {
        const nextElements = [...elementsRef.current, drawnEl];
        elementsRef.current = nextElements;
        pushHistory(nextElements);
        setSelectedElementId(drawnEl.id);
      }
      currentElementRef.current = null;
      setCurrentElement(null);
      if (!isLockedRef.current) {
        setActiveTool(TOOLS.SELECT);
        activeToolRef.current = TOOLS.SELECT;
      }
    }

    if (activeAct === 'moving' || activeAct === 'resizing' || activeAct === 'erasing') {
      pushHistory(elementsRef.current);
    }

    if (activeAct === 'selecting' && selectionBox) {
      // Find all elements inside selection box
      const hits = elementsRef.current.filter((el) => isElementInBox(el, selectionBox));

      const allSelectedIds = new Set();
      for (const el of hits) {
        allSelectedIds.add(el.id);
        if (el.groupId) {
          elementsRef.current
            .filter((o) => o.groupId === el.groupId)
            .forEach((o) => allSelectedIds.add(o.id));
        }
      }
      setSelectedElementIds(Array.from(allSelectedIds));
      setSelectionBox(null);
    }

    actionRef.current = 'none';
    setAction('none');
    setResizeHandle(null);
  };

  // Double Click Handler (edit existing text / sticky note, or create new text)
  const handleDoubleClick = (e) => {
    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (isPointInElement(x, y, el, 8 / zoom)) {
        if (['text', 'sticky', 'rectangle', 'ellipse', 'diamond'].includes(el.type)) {
          setEditingText({
            id: el.id,
            type: el.type,
            x: el.type === 'text' ? el.x : (el.x + (el.width - Math.min(el.width, 180)) / 2),
            y: el.type === 'text' ? el.y : (el.y + (el.height - Math.min(el.height, 44)) / 2),
            width: el.width,
            height: el.height,
            text: el.text || '',
            isNew: false,
            fontSize: el.fontSize,
            fontFamily: el.fontFamily,
          });
          return;
        }

        if (el.type === 'table') {
          const cellInfo = getCellAtPoint(x, y, el);
          if (cellInfo) {
            setEditingCell({
              tableId: el.id,
              rowIndex: cellInfo.rowIndex,
              colIndex: cellInfo.colIndex,
              cellX: cellInfo.cellX,
              cellY: cellInfo.cellY,
              cellWidth: cellInfo.cellWidth,
              cellHeight: cellInfo.cellHeight,
              text: (el.data && el.data[cellInfo.rowIndex] && el.data[cellInfo.rowIndex][cellInfo.colIndex] !== undefined)
                ? String(el.data[cellInfo.rowIndex][cellInfo.colIndex])
                : '',
              fontSize: el.fontSize || 18,
              fontFamily: el.fontFamily || "'Patrick Hand', cursive",
            });
            return;
          }
        }
      }
    }

    // Double clicking empty space also creates a new text input!
    const textId = 'el-text-' + Date.now();
    setEditingText({
      id: textId,
      type: 'text',
      x,
      y,
      text: '',
      isNew: true,
      fontSize: currentStyle.fontSize,
      fontFamily: currentStyle.fontFamily,
    });
  };

  // Smooth Zoom with Mouse Wheel (focused at mouse position)
  const handleWheel = (e) => {
    e.preventDefault();

    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newZoom = Math.min(4.0, Math.max(0.15, zoom * zoomFactor));

      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Keep mouse position pinned
      const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
      const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    } else {
      // Two finger pan or standard scroll pan
      setPan((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  };

  // Touch support for mobile phones and tablets
  const handleMouseDownRef = useRef(handleMouseDown);
  handleMouseDownRef.current = handleMouseDown;
  const handleMouseMoveRef = useRef(handleMouseMove);
  handleMouseMoveRef.current = handleMouseMove;
  const handleMouseUpRef = useRef(handleMouseUp);
  handleMouseUpRef.current = handleMouseUp;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let initialTouchDist = null;
    let initialTouchCenter = null;

    const onTouchStart = (e) => {
      e.preventDefault();
      setShowIntro(false);

      if (e.touches.length === 1) {
        const t = e.touches[0];
        handleMouseDownRef.current({
          clientX: t.clientX,
          clientY: t.clientY,
          button: 0,
        });
      } else if (e.touches.length >= 2) {
        // If 2 or more fingers, cancel any 1-finger drawing in progress and enter pinch/pan
        if (actionRef.current === 'drawing') {
          currentElementRef.current = null;
          setCurrentElement(null);
          actionRef.current = 'none';
          setAction('none');
        }
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        initialTouchDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        initialTouchCenter = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2,
        };
      }
    };

    const onTouchMove = (e) => {
      e.preventDefault();

      if (e.touches.length === 1) {
        const t = e.touches[0];
        handleMouseMoveRef.current({
          clientX: t.clientX,
          clientY: t.clientY,
        });
      } else if (e.touches.length >= 2 && initialTouchDist && initialTouchCenter) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const currentCenter = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2,
        };

        const zoomDelta = currentDist / initialTouchDist;
        initialTouchDist = currentDist;

        const dx = currentCenter.x - initialTouchCenter.x;
        const dy = currentCenter.y - initialTouchCenter.y;
        initialTouchCenter = currentCenter;

        setZoom((prevZoom) => {
          const nextZ = Math.min(4.0, Math.max(0.15, prevZoom * zoomDelta));
          zoomRef.current = nextZ;
          return nextZ;
        });
        setPan((prevPan) => {
          const nextP = { x: prevPan.x + dx, y: prevPan.y + dy };
          panRef.current = nextP;
          return nextP;
        });
      }
    };

    const onTouchEnd = (e) => {
      e.preventDefault();
      if (e.touches.length === 0) {
        initialTouchDist = null;
        initialTouchCenter = null;
        handleMouseUpRef.current();
      }
    };

    const onTouchCancel = (e) => {
      e.preventDefault();
      initialTouchDist = null;
      initialTouchCenter = null;
      if (actionRef.current === 'drawing') {
        currentElementRef.current = null;
        setCurrentElement(null);
      }
      actionRef.current = 'none';
      setAction('none');
    };

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', onTouchCancel, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchcancel', onTouchCancel);
    };
  }, []);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      // If typing in input or textarea, don't trigger global hotkeys
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        if (e.key === 'Escape') {
          handleFinishEditingText();
          handleFinishEditingCell(false);
        }
        return;
      }

      // Spacebar hold for temporary pan
      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Duplicate: Ctrl+D
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        handleDuplicateSelected();
        return;
      }

      // Select All: Ctrl+A
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        const allIds = elements.map((el) => el.id);
        setSelectedElementIds(allIds);
        showToast(`Selected all ${allIds.length} elements`);
        return;
      }

      // Group: Ctrl+G / Ungroup: Ctrl+Shift+G
      if ((e.ctrlKey || e.metaKey) && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault();
        if (e.shiftKey) {
          handleUngroupSelected();
        } else {
          handleGroupSelected();
        }
        return;
      }

      // Delete: Backspace or Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelected();
        return;
      }

      // Mind Map Auto-Branching Hotkeys: Tab (Child) & Enter (Sibling)
      if (
        selectedElement &&
        ['rectangle', 'sticky', 'ellipse', 'diamond', 'text'].includes(selectedElement.type)
      ) {
        if (e.key === 'Tab') {
          e.preventDefault();
          handleAddBranchChild(selectedElement, 'right');
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAddBranchSibling(selectedElement);
          return;
        }
      }

      // Tool Switch Shortcuts
      switch (e.key.toLowerCase()) {
        case 'v':
        case '1':
          setActiveTool(TOOLS.SELECT);
          break;
        case 'h':
          setActiveTool(TOOLS.HAND);
          break;
        case 'r':
        case '2':
          setActiveTool(TOOLS.RECTANGLE);
          break;
        case 'd':
        case '3':
          setActiveTool(TOOLS.DIAMOND);
          break;
        case 'o':
        case '4':
          setActiveTool(TOOLS.ELLIPSE);
          break;
        case 'a':
        case '5':
          setActiveTool(TOOLS.ARROW);
          break;
        case 'l':
        case '6':
          setActiveTool(TOOLS.LINE);
          break;
        case 'p':
        case '7':
          setActiveTool(TOOLS.PENCIL);
          break;
        case 't':
        case '8':
          setActiveTool(TOOLS.TEXT);
          break;
        case 'n':
        case '9':
          setActiveTool(TOOLS.STICKY);
          break;
        case 'b':
          setActiveTool(TOOLS.TABLE);
          break;
        case 'm':
          setActiveTool(TOOLS.MINDMAP);
          break;
        case 'i':
          handleTriggerImageUpload();
          break;
        case 'e':
        case '0':
          setActiveTool(TOOLS.ERASER);
          break;
        case 'escape':
          setSelectedElementIds([]);
          setActiveTool(TOOLS.SELECT);
          break;
        default:
          break;
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    handleUndo,
    handleRedo,
    handleDeleteSelected,
    handleDuplicateSelected,
    handleGroupSelected,
    handleUngroupSelected,
    editingText,
    elements,
  ]);

  // Cursor style based on active tool / space key
  const getCursor = () => {
    if (isSpacePressed || activeTool === TOOLS.HAND || action === 'panning') {
      return action === 'panning' ? 'grabbing' : 'grab';
    }
    if (activeTool === TOOLS.ERASER) return 'none'; // custom glowing eraser ring
    if (activeTool === TOOLS.SELECT) {
      if (action === 'moving') return 'move';
      if (action === 'resizing') return 'nwse-resize';
      return 'default';
    }
    if (activeTool === TOOLS.TEXT) return 'text';
    return 'crosshair';
  };

  // Zoom Button Handlers
  const handleZoomIn = () => {
    const newZoom = Math.min(4.0, zoom * 1.2);
    setZoom(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(0.15, zoom / 1.2);
    setZoom(newZoom);
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative w-screen h-screen overflow-hidden select-none ${
        isDarkMode ? 'bg-[#121212] text-white' : 'bg-[#f8f9fa] text-neutral-800'
      }`}
      style={{ cursor: getCursor() }}
    >
      {/* Hidden file input for image upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleImageFileSelect}
        className="hidden"
      />

      {/* Top Floating Toolbar */}
      <Toolbar
        activeTool={activeTool}
        setActiveTool={handleSelectTool}
        isLocked={isLocked}
        setIsLocked={setIsLocked}
        isDarkMode={isDarkMode}
        onToggleProperties={() => setIsPropertiesOpen((prev) => !prev)}
        isPropertiesOpen={isPropertiesOpen}
        onImageUpload={handleTriggerImageUpload}
      />

      {/* Top Left Menu Button & Dropdown */}
      <MenuModal
        isOpen={isMenuOpen}
        setIsOpen={setIsMenuOpen}
        onOpenExport={() => setIsExportOpen(true)}
        onClearCanvas={() => {
          setElements([]);
          setSelectedElementId(null);
          pushHistory([]);
        }}
        onLoadElements={(loaded) => {
          setElements(loaded);
          pushHistory(loaded);
        }}
        onSaveProject={() => exportToJson(elements, { theme: isDarkMode ? 'dark' : 'light' })}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      {/* Floating Style Properties Panel */}
      <PropertiesPanel
        selectedElement={selectedElement}
        selectedElements={selectedElements}
        currentStyle={currentStyle}
        onUpdateStyle={handleUpdateStyle}
        onDuplicate={handleDuplicateSelected}
        onDelete={handleDeleteSelected}
        onBringForward={handleBringForward}
        onSendBackward={handleSendBackward}
        onGroup={handleGroupSelected}
        onUngroup={handleUngroupSelected}
        onAlign={handleAlign}
        onAddTableRow={handleAddTableRow}
        onRemoveTableRow={handleRemoveTableRow}
        onAddTableCol={handleAddTableCol}
        onRemoveTableCol={handleRemoveTableCol}
        onToggleTableHeader={handleToggleTableHeader}
        onAddBranchChild={handleAddBranchChild}
        onAddBranchSibling={handleAddBranchSibling}
        isDarkMode={isDarkMode}
        isOpen={isPropertiesOpen}
        setIsOpen={setIsPropertiesOpen}
      />

      {/* Center Top Hint Message (just like in Excalidraw) */}
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none opacity-60 text-center">
        <span
          className={`text-xs px-3 py-1 rounded-full backdrop-blur-sm ${
            isDarkMode ? 'bg-white/5 text-neutral-400' : 'bg-black/5 text-neutral-500'
          }`}
        >
          To move canvas, hold <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[10px]">Space</kbd> or <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[10px]">Scroll Wheel</kbd> while dragging
        </span>
      </div>

      {/* Bottom Left Zoom & History Controls */}
      <ZoomControls
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        isDarkMode={isDarkMode}
      />

      {/* Bottom Right Export Shortcut & Help Button */}
      <div className="fixed bottom-4 right-4 z-30 flex items-center gap-2">
        <button
          onClick={() => setIsExportOpen(true)}
          className="py-2 px-3.5 rounded-xl bg-[#6965db] hover:bg-[#5b57d1] text-white text-xs font-semibold shadow-lg shadow-[#6965db]/25 transition-all flex items-center gap-1.5"
          title="Export as JPG or PNG"
        >
          <span>Export JPG</span>
        </button>
      </div>
          
      {/* Main HTML5 Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => eraserFxRef.current.clearCursor()}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="block absolute inset-0 touch-none"
      />

      {/* Inline Textarea Overlay when typing or editing text/sticky note */}
      {editingText && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            left: `${getScreenCoords(editingText.x, editingText.y).x}px`,
            top: `${getScreenCoords(editingText.x, editingText.y).y}px`,
            transformOrigin: 'top left',
            transform: `scale(${zoom})`,
            zIndex: 60,
          }}
          className="flex flex-col gap-1.5 select-auto"
        >
          <textarea
            ref={textAreaRef}
            autoFocus
            value={editingText.text}
            onChange={(e) =>
              setEditingText((prev) => ({ ...prev, text: e.target.value }))
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && editingText.type !== 'sticky') {
                e.preventDefault();
                handleFinishEditingText();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setEditingText(null);
                if (!isLocked) setActiveTool(TOOLS.SELECT);
              }
            }}
            placeholder={editingText.type === 'sticky' ? 'Write note here...' : 'Type text here...'}
            style={{
              fontSize: `${editingText.fontSize || currentStyle.fontSize || 24}px`,
              fontFamily: editingText.fontFamily || currentStyle.fontFamily,
              color: editingText.type === 'sticky' ? '#212529' : (isDarkMode ? '#ffffff' : '#1e1e1e'),
              backgroundColor:
                editingText.type === 'sticky'
                  ? '#fff3bf'
                  : isDarkMode
                  ? '#1e1e24'
                  : '#ffffff',
              minWidth: editingText.type === 'sticky' ? '180px' : '160px',
              minHeight: editingText.type === 'sticky' ? '140px' : '48px',
            }}
            className="p-2.5 border-2 border-[#6965db] rounded-xl outline-none resize-both shadow-2xl backdrop-blur-md leading-relaxed"
          />

          {/* Quick Action buttons below text input */}
          <div className="flex items-center justify-between gap-3 px-2 py-1 bg-[#1e1e24]/95 text-neutral-300 rounded-lg border border-[#34343e] shadow-lg text-[11px]">
            <span>Press <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[10px] text-white">Enter</kbd> to save</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setEditingText(null);
                  if (!isLocked) setActiveTool(TOOLS.SELECT);
                }}
                className="px-2 py-0.5 rounded hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleFinishEditingText()}
                className="px-2.5 py-0.5 rounded bg-[#6965db] hover:bg-[#5b57d1] text-white font-medium transition-colors shadow-sm"
              >
                Done ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Table Action Bar (shown when a Table is selected) */}
      {selectedElement && selectedElement.type === 'table' && !editingCell && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            left: `${getScreenCoords(
              getElementBounds(selectedElement).minX + getElementBounds(selectedElement).width / 2,
              getElementBounds(selectedElement).minY
            ).x}px`,
            top: `${getScreenCoords(
              getElementBounds(selectedElement).minX,
              getElementBounds(selectedElement).minY
            ).y - 48}px`,
            transform: 'translateX(-50%)',
            zIndex: 45,
          }}
          className={`flex items-center gap-1 p-1 rounded-xl border shadow-xl backdrop-blur-md select-none ${
            isDarkMode
              ? 'bg-[#1e1e24]/95 border-[#34343e] text-neutral-200 shadow-black/40'
              : 'bg-white/95 border-neutral-200 text-neutral-800 shadow-neutral-300/40'
          }`}
        >
          <span className="text-[11px] font-mono font-semibold px-2 text-[#9794f0]">
            {selectedElement.rows || 3}×{selectedElement.cols || 3}
          </span>
          <div className={`h-4 w-[1px] ${isDarkMode ? 'bg-white/10' : 'bg-neutral-200'}`} />
          <button
            onClick={() => handleAddTableRow(selectedElement.id)}
            title="Add row at bottom"
            className="px-2 py-1 rounded-lg text-xs font-medium hover:bg-[#6965db]/20 text-[#827fe2] hover:text-[#9794f0] transition-colors flex items-center gap-1"
          >
            <span>+ Row</span>
          </button>
          <button
            onClick={() => handleRemoveTableRow(selectedElement.id)}
            disabled={(selectedElement.rows || 3) <= 1}
            title="Remove last row"
            className="px-2 py-1 rounded-lg text-xs font-medium hover:bg-red-500/15 text-neutral-400 hover:text-red-400 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-400 transition-colors"
          >
            <span>- Row</span>
          </button>
          <div className={`h-4 w-[1px] ${isDarkMode ? 'bg-white/10' : 'bg-neutral-200'}`} />
          <button
            onClick={() => handleAddTableCol(selectedElement.id)}
            title="Add column on right"
            className="px-2 py-1 rounded-lg text-xs font-medium hover:bg-[#6965db]/20 text-[#827fe2] hover:text-[#9794f0] transition-colors flex items-center gap-1"
          >
            <span>+ Col</span>
          </button>
          <button
            onClick={() => handleRemoveTableCol(selectedElement.id)}
            disabled={(selectedElement.cols || 3) <= 1}
            title="Remove last column"
            className="px-2 py-1 rounded-lg text-xs font-medium hover:bg-red-500/15 text-neutral-400 hover:text-red-400 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-400 transition-colors"
          >
            <span>- Col</span>
          </button>
          <div className={`h-4 w-[1px] ${isDarkMode ? 'bg-white/10' : 'bg-neutral-200'}`} />
          <button
            onClick={() => handleToggleTableHeader(selectedElement.id)}
            title="Toggle Header Row styling"
            className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
              selectedElement.hasHeader
                ? 'bg-[#6965db] text-white shadow-sm'
                : 'hover:bg-white/10 text-neutral-400'
            }`}
          >
            Header
          </button>
        </div>
      )}

      {/* Inline Table Cell Editor */}
      {editingCell && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            left: `${getScreenCoords(editingCell.cellX, editingCell.cellY).x}px`,
            top: `${getScreenCoords(editingCell.cellX, editingCell.cellY).y}px`,
            width: `${editingCell.cellWidth * zoom}px`,
            height: `${editingCell.cellHeight * zoom}px`,
            zIndex: 65,
          }}
          className="select-auto flex items-center justify-center p-0.5"
        >
          <textarea
            ref={cellInputRef}
            autoFocus
            value={editingCell.text}
            onChange={(e) =>
              setEditingCell((prev) => ({ ...prev, text: e.target.value }))
            }
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault();
                handleFinishEditingCell(true, !e.shiftKey, e.shiftKey);
              } else if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleFinishEditingCell(true);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                handleFinishEditingCell(false);
              }
            }}
            style={{
              fontSize: `${(editingCell.fontSize || 18) * zoom}px`,
              fontFamily: editingCell.fontFamily,
              color: isDarkMode ? '#ffffff' : '#1e1e1e',
              backgroundColor: isDarkMode ? 'rgba(30, 30, 36, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            }}
            className="w-full h-full p-1.5 border-2 border-[#6965db] rounded-lg outline-none resize-none shadow-xl leading-snug"
          />
        </div>
      )}

      {/* Mind Map Branch Handles on 4 Sides of Selected Shape */}
      {selectedElement &&
        ['rectangle', 'sticky', 'ellipse', 'diamond', 'text'].includes(selectedElement.type) &&
        !editingText &&
        !editingCell &&
        action === 'none' &&
        selectedElements.length === 1 && (() => {
          const b = getElementBounds(selectedElement);
          const cx = b.minX + b.width / 2;
          const cy = b.minY + b.height / 2;

          const rightPos = getScreenCoords(b.maxX, cy);
          const bottomPos = getScreenCoords(cx, b.maxY);
          const leftPos = getScreenCoords(b.minX, cy);
          const topPos = getScreenCoords(cx, b.minY);

          return (
            <>
              {/* Right Branch Button (Add Child) */}
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddBranchChild(selectedElement, 'right');
                }}
                title="Add Child Branch (Shortcut: Tab)"
                style={{
                  position: 'absolute',
                  left: `${rightPos.x + 8}px`,
                  top: `${rightPos.y}px`,
                  transform: 'translateY(-50%)',
                  zIndex: 42,
                }}
                className="w-5 h-5 rounded-full bg-[#6965db] hover:bg-[#5b57d1] text-white flex items-center justify-center text-xs font-bold shadow-lg border border-white/40 hover:scale-125 transition-all select-none cursor-pointer"
              >
                +
              </button>

              {/* Bottom Branch Button (Add Child / Sibling Down) */}
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddBranchChild(selectedElement, 'bottom');
                }}
                title="Add Branch Below (Shortcut: Enter)"
                style={{
                  position: 'absolute',
                  left: `${bottomPos.x}px`,
                  top: `${bottomPos.y + 8}px`,
                  transform: 'translateX(-50%)',
                  zIndex: 42,
                }}
                className="w-5 h-5 rounded-full bg-[#6965db] hover:bg-[#5b57d1] text-white flex items-center justify-center text-xs font-bold shadow-lg border border-white/40 hover:scale-125 transition-all select-none cursor-pointer"
              >
                +
              </button>

              {/* Left Branch Button (Add Child Left) */}
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddBranchChild(selectedElement, 'left');
                }}
                title="Add Branch Left"
                style={{
                  position: 'absolute',
                  left: `${leftPos.x - 8}px`,
                  top: `${leftPos.y}px`,
                  transform: 'translate(-100%, -50%)',
                  zIndex: 42,
                }}
                className="w-5 h-5 rounded-full bg-[#6965db] hover:bg-[#5b57d1] text-white flex items-center justify-center text-xs font-bold shadow-lg border border-white/40 hover:scale-125 transition-all select-none cursor-pointer"
              >
                +
              </button>

              {/* Top Branch Button (Add Branch Up) */}
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddBranchChild(selectedElement, 'top');
                }}
                title="Add Branch Up"
                style={{
                  position: 'absolute',
                  left: `${topPos.x}px`,
                  top: `${topPos.y - 8}px`,
                  transform: 'translate(-50%, -100%)',
                  zIndex: 42,
                }}
                className="w-5 h-5 rounded-full bg-[#6965db] hover:bg-[#5b57d1] text-white flex items-center justify-center text-xs font-bold shadow-lg border border-white/40 hover:scale-125 transition-all select-none cursor-pointer"
              >
                +
              </button>
            </>
          );
        })()}

      {/* Export Modal (JPG / PNG / JSON) */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        elements={elements}
        isDarkMode={isDarkMode}
      />

      {/* Help Modal */}
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        isDarkMode={isDarkMode}
      />

      {/* Welcome Intro Screen - Auto-dismisses when any shape is selected */}
      <IntroCard
        visible={showIntro && elements.length === 0}
        onSelectTool={handleSelectTool}
        onDismiss={() => setShowIntro(false)}
        isDarkMode={isDarkMode}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div
            className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-2xl backdrop-blur-md border ${
              isDarkMode
                ? 'bg-[#1e1e24]/95 text-white border-white/10 shadow-black/50'
                : 'bg-white/95 text-neutral-800 border-neutral-200 shadow-neutral-400/40'
            }`}
          >
            {toastMessage}
          </div>
        </div>
      )}

      {/* Vercel Analytics */}
      <Analytics />
    </div>
  );
}
