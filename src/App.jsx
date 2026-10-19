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
} from './utils/math';
import { renderElement, drawGrid, drawShapeAnchors } from './utils/roughRenderer';
import { findNearestAnchor, updateConnectedArrows } from './utils/binding';
import { EraserEffectManager } from './utils/eraserEffects';
import { exportToJson } from './utils/export';

// Start with a clean whiteboard
const INITIAL_ELEMENTS = [];

export default function App() {
  const canvasRef = useRef(null);
  const textAreaRef = useRef(null);

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
  const [selectedElementId, setSelectedElementId] = useState(null);
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

  // Selected element object
  const selectedElement = elements.find((el) => el.id === selectedElementId) || null;

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
      renderElement(ctx, rc, el, el.id === selectedElementId);
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
    selectedElementId,
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

  // Update element style (or default style if nothing selected)
  const handleUpdateStyle = (key, value) => {
    setCurrentStyle((prev) => ({ ...prev, [key]: value }));

    if (selectedElementId) {
      const updated = elements.map((el) => {
        if (el.id === selectedElementId) {
          return { ...el, [key]: value };
        }
        return el;
      });
      pushHistory(updated);
    }
  };

  // Delete selected element
  const handleDeleteSelected = useCallback(() => {
    if (!selectedElementId) return;
    const updated = elements.filter((el) => el.id !== selectedElementId);
    setSelectedElementId(null);
    pushHistory(updated);
  }, [selectedElementId, elements, pushHistory]);

  // Duplicate selected element
  const handleDuplicateSelected = useCallback(() => {
    if (!selectedElement) return;
    const newElement = {
      ...selectedElement,
      id: 'el-' + Date.now(),
      x: (selectedElement.x || selectedElement.x1 || 0) + 20,
      y: (selectedElement.y || selectedElement.y1 || 0) + 20,
      x1: selectedElement.x1 !== undefined ? selectedElement.x1 + 20 : undefined,
      y1: selectedElement.y1 !== undefined ? selectedElement.y1 + 20 : undefined,
      x2: selectedElement.x2 !== undefined ? selectedElement.x2 + 20 : undefined,
      y2: selectedElement.y2 !== undefined ? selectedElement.y2 + 20 : undefined,
      seed: Math.floor(Math.random() * 100000),
    };
    const updated = [...elements, newElement];
    setSelectedElementId(newElement.id);
    pushHistory(updated);
  }, [selectedElement, elements, pushHistory]);

  // Layering: Forward / Backward
  const handleBringForward = () => {
    if (!selectedElementId) return;
    const index = elements.findIndex((el) => el.id === selectedElementId);
    if (index < elements.length - 1) {
      const updated = [...elements];
      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
      pushHistory(updated);
    }
  };

  const handleSendBackward = () => {
    if (!selectedElementId) return;
    const index = elements.findIndex((el) => el.id === selectedElementId);
    if (index > 0) {
      const updated = [...elements];
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
      pushHistory(updated);
    }
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
              width: el.type === 'sticky' ? el.width : calcWidth,
              height: el.type === 'sticky' ? el.height : calcHeight,
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

  // Mouse Down Handler
  const handleMouseDown = (e) => {
    if (editingText) {
      handleFinishEditingText();
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
      // Check if clicked resize handle of already selected element
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
        setSelectedElementId(hitElement.id);
        actionRef.current = 'moving';
        setAction('moving');
      } else {
        setSelectedElementId(null);
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

    // Moving selected element
    if (currentAction === 'moving' && selectedElementId) {
      const dx = (e.clientX - dragStartRef.current.x) / zoom;
      const dy = (e.clientY - dragStartRef.current.y) / zoom;
      dragStartRef.current = { x: e.clientX, y: e.clientY };

      let movedShape = null;

      const updatedElements = elements.map((el) => {
        if (el.id === selectedElementId) {
          if (el.type === 'line' || el.type === 'arrow') {
            const updatedLine = {
              ...el,
              x1: el.x1 + dx,
              y1: el.y1 + dy,
              x2: el.x2 + dx,
              y2: el.y2 + dy,
            };
            movedShape = updatedLine;
            return updatedLine;
          }
          if (el.type === 'pencil') {
            const updatedPencil = {
              ...el,
              points: el.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
            };
            movedShape = updatedPencil;
            return updatedPencil;
          }
          const updatedShape = {
            ...el,
            x: el.x + dx,
            y: el.y + dy,
          };
          movedShape = updatedShape;
          return updatedShape;
        }
        return el;
      });

      // Automatically move connected arrows and lines with this shape!
      const finalElements = updateConnectedArrows(updatedElements, movedShape);
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
      if (drawnEl.type === TOOLS.PENCIL) {
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
      // Find element inside selection box
      const hit = elementsRef.current.find((el) => isElementInBox(el, selectionBox));
      if (hit) {
        setSelectedElementId(hit.id);
      }
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
        if (el.type === 'text' || el.type === 'sticky') {
          setEditingText({
            id: el.id,
            type: el.type,
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height,
            text: el.text || '',
            isNew: false,
            fontSize: el.fontSize,
            fontFamily: el.fontFamily,
          });
          return;
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

      // Delete: Backspace or Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelected();
        return;
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
        case 'e':
        case '0':
          setActiveTool(TOOLS.ERASER);
          break;
        case 'escape':
          setSelectedElementId(null);
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
    editingText,
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
      className={`relative w-screen h-screen overflow-hidden select-none ${
        isDarkMode ? 'bg-[#121212] text-white' : 'bg-[#f8f9fa] text-neutral-800'
      }`}
      style={{ cursor: getCursor() }}
    >
      {/* Top Floating Toolbar */}
      <Toolbar
        activeTool={activeTool}
        setActiveTool={handleSelectTool}
        isLocked={isLocked}
        setIsLocked={setIsLocked}
        isDarkMode={isDarkMode}
        onToggleProperties={() => setIsPropertiesOpen((prev) => !prev)}
        isPropertiesOpen={isPropertiesOpen}
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
        currentStyle={currentStyle}
        onUpdateStyle={handleUpdateStyle}
        onDuplicate={handleDuplicateSelected}
        onDelete={handleDeleteSelected}
        onBringForward={handleBringForward}
        onSendBackward={handleSendBackward}
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

      {/* Vercel Analytics */}
      <Analytics />
    </div>
  );
}
