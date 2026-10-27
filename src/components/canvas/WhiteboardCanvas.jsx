import { useRef, useEffect, useCallback, useState } from 'react';
import rough from 'roughjs';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useCollabStore } from '../../store/useCollabStore';
import { TOOLS } from '../../constants';
import {
  isPointInElement,
  getElementBounds,
  getHitResizeHandle,
  isElementInBox,
  getCellAtPoint,
  scalePencilPoints,
} from '../../utils/math';
import { renderElement, drawGrid, drawShapeAnchors } from '../../utils/roughRenderer';
import { findNearestAnchor, updateConnectedArrows } from '../../utils/binding';
import { EraserEffectManager } from '../../utils/eraserEffects';

function generateId(prefix = 'el') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export default function WhiteboardCanvas() {
  const canvasRef = useRef(null);
  const eraserFxRef = useRef(new EraserEffectManager());
  const lastCursorBroadcastRef = useRef(0);

  // Zustand Store selectors
  const elements = useCanvasStore((state) => state.elements);
  const selectedElementIds = useCanvasStore((state) => state.selectedElementIds);
  const activeTool = useCanvasStore((state) => state.activeTool);
  const isLocked = useCanvasStore((state) => state.isLocked);
  const currentStyle = useCanvasStore((state) => state.currentStyle);
  const pan = useCanvasStore((state) => state.pan);
  const zoom = useCanvasStore((state) => state.zoom);
  const isDarkMode = useCanvasStore((state) => state.isDarkMode);
  const showGrid = useCanvasStore((state) => state.showGrid);
  const editingText = useCanvasStore((state) => state.editingText);

  const setElements = useCanvasStore((state) => state.setElements);
  const pushHistory = useCanvasStore((state) => state.pushHistory);
  const setSelectedElementIds = useCanvasStore((state) => state.setSelectedElementIds);
  const setActiveTool = useCanvasStore((state) => state.setActiveTool);
  const setPan = useCanvasStore((state) => state.setPan);
  const setZoom = useCanvasStore((state) => state.setZoom);
  const setEditingText = useCanvasStore((state) => state.setEditingText);
  const setEditingCell = useCanvasStore((state) => state.setEditingCell);
  const showToast = useCanvasStore((state) => state.showToast);

  const broadcastCursor = useCollabStore((state) => state.broadcastCursor);

  // Interaction State
  const [action, setAction] = useState('none'); // 'none' | 'drawing' | 'moving' | 'resizing' | 'panning' | 'selecting' | 'erasing'
  const [resizeHandle, setResizeHandle] = useState(null);
  const [selectionBox, setSelectionBox] = useState(null);
  const [hoveredAnchor, setHoveredAnchor] = useState(null);
  const [canvasDimensions, setCanvasDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });
  const [, setRenderTick] = useState(0);

  // Transient refs to prevent closure staleness in 60fps events
  const actionRef = useRef('none');
  const currentElementRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0, clientX: 0, clientY: 0 });
  const resizeInitialElementRef = useRef(null);
  const resizeInitialBoundsRef = useRef(null);
  const touchStateRef = useRef({ dist: null, center: null });
  const lastTapRef = useRef(0);

  // Callback to trigger redraw when an asynchronous image finishes loading
  const handleImageLoaded = useCallback(() => {
    setRenderTick((t) => t + 1);
  }, []);

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

  // Trigger re-render
  const requestRender = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Dot Grid
    if (showGrid) {
      drawGrid(ctx, canvasDimensions.width, canvasDimensions.height, pan, zoom, isDarkMode);
    }

    // 2. Camera pan & zoom transformation
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    const rc = rough.canvas(canvas);

    // 3. Render all scene elements
    for (const el of elements) {
      if (editingText && el.id === editingText.id && el.type === 'text') {
        continue;
      }
      const isSelected = selectedElementIds.includes(el.id);
      renderElement(ctx, rc, el, isSelected, handleImageLoaded);
    }

    // 4. Render element currently being drawn
    if (currentElementRef.current) {
      renderElement(ctx, rc, currentElementRef.current, false, handleImageLoaded);
    }

    // 5. Draw snap anchor highlights if drawing a connector
    if (hoveredAnchor) {
      drawShapeAnchors(ctx, hoveredAnchor.element, hoveredAnchor.anchor);
    }

    // 6. Draw Marquee selection box
    if (selectionBox) {
      ctx.save();
      const sx = Math.min(selectionBox.x1, selectionBox.x2);
      const sy = Math.min(selectionBox.y1, selectionBox.y2);
      const sw = Math.abs(selectionBox.x2 - selectionBox.x1);
      const sh = Math.abs(selectionBox.y2 - selectionBox.y1);

      ctx.fillStyle = 'rgba(105, 101, 219, 0.12)';
      ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeStyle = '#6965db';
      ctx.lineWidth = 1 / zoom;
      ctx.setLineDash([4 / zoom, 4 / zoom]);
      ctx.strokeRect(sx, sy, sw, sh);
      ctx.restore();
    }

    // 7. Render Eraser Particles
    eraserFxRef.current.render(ctx, zoom);

    ctx.restore(); // camera
    ctx.restore(); // dpr
  }, [
    elements,
    selectedElementIds,
    pan,
    zoom,
    isDarkMode,
    showGrid,
    editingText,
    hoveredAnchor,
    selectionBox,
    canvasDimensions,
    handleImageLoaded,
  ]);

  // Synchronize canvas backing-store with window/device dimensions
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      setCanvasDimensions({ width: w, height: h });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Main Render effect on state changes
  useEffect(() => {
    requestRender();
  }, [requestRender]);

  // Insert image file onto canvas at mouse/center position
  const insertImageFile = useCallback(
    (file, clientX, clientY) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        const img = new Image();
        img.onload = () => {
          const nw = img.naturalWidth || 400;
          const nh = img.naturalHeight || 300;
          const maxDim = 450;
          let w = nw;
          let h = nh;
          if (w > maxDim || h > maxDim) {
            const ratio = w / h;
            if (ratio > 1) {
              w = maxDim;
              h = Math.round(maxDim / ratio);
            } else {
              h = maxDim;
              w = Math.round(maxDim * ratio);
            }
          }

          const coords = getCanvasCoords(
            clientX !== undefined ? clientX : window.innerWidth / 2,
            clientY !== undefined ? clientY : window.innerHeight / 2
          );

          const newImageEl = {
            id: generateId('img'),
            type: 'image',
            x: Math.round(coords.x - w / 2),
            y: Math.round(coords.y - h / 2),
            width: w,
            height: h,
            naturalWidth: nw,
            naturalHeight: nh,
            aspectRatio: nw / nh,
            dataUrl,
            strokeColor: 'transparent',
            strokeWidth: 0,
            opacity: 100,
            version: 1,
            updatedAt: Date.now(),
          };

          pushHistory([...elements, newImageEl]);
          setSelectedElementIds([newImageEl.id]);
          showToast('Image inserted');
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    },
    [elements, getCanvasCoords, pushHistory, setSelectedElementIds, showToast]
  );

  // Drag and Drop Handling (Single owner: stops propagation so dropped files aren't processed twice)
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        insertImageFile(file, e.clientX, e.clientY);
      }
    }
  };

  // Pointer Down (Mouse, Pen, Touch unified)
  const handlePointerDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // ignore if unsupported
    }

    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    dragStartRef.current = { x, y, clientX: e.clientX, clientY: e.clientY };

    // Space panning or Hand tool or middle mouse button
    if (activeTool === TOOLS.HAND || e.button === 1 || e.spaceKey) {
      actionRef.current = 'panning';
      setAction('panning');
      return;
    }

    // Eraser Tool
    if (activeTool === TOOLS.ERASER) {
      actionRef.current = 'erasing';
      setAction('erasing');
      eraserFxRef.current.setCursor(x, y);

      const hit = elements.find((el) => isPointInElement(x, y, el, 14 / zoom));
      if (hit) {
        eraserFxRef.current.explode(x, y, hit.strokeColor || '#ff6b6b');
        const remaining = elements.filter((el) => el.id !== hit.id);
        setElements(remaining);
      }
      return;
    }

    // Selection tool
    if (activeTool === TOOLS.SELECT) {
      // Check resize handle on currently selected single element
      if (selectedElementIds.length === 1) {
        const selected = elements.find((el) => el.id === selectedElementIds[0]);
        if (selected) {
          const hitHandle = getHitResizeHandle(x, y, selected, zoom);
          if (hitHandle) {
            actionRef.current = 'resizing';
            setAction('resizing');
            setResizeHandle(hitHandle.type);
            resizeInitialElementRef.current = { ...selected };
            resizeInitialBoundsRef.current = getElementBounds(selected);
            return;
          }
        }
      }

      // Check click on an element
      let hitElement = null;
      for (let i = elements.length - 1; i >= 0; i--) {
        if (isPointInElement(x, y, elements[i], 8 / zoom)) {
          hitElement = elements[i];
          break;
        }
      }

      if (hitElement) {
        const isMulti = e.shiftKey;
        let newSelectedIds = isMulti
          ? selectedElementIds.includes(hitElement.id)
            ? selectedElementIds.filter((id) => id !== hitElement.id)
            : [...selectedElementIds, hitElement.id]
          : selectedElementIds.includes(hitElement.id)
            ? selectedElementIds
            : [hitElement.id];

        if (hitElement.groupId) {
          const groupIds = elements.filter((el) => el.groupId === hitElement.groupId).map((el) => el.id);
          const unionSet = new Set([...newSelectedIds, ...groupIds]);
          newSelectedIds = Array.from(unionSet);
        }

        setSelectedElementIds(newSelectedIds);
        actionRef.current = 'moving';
        setAction('moving');
        return;
      }

      // Clicked empty space: start marquee selection box
      if (!e.shiftKey) {
        setSelectedElementIds([]);
      }
      actionRef.current = 'selecting';
      setAction('selecting');
      setSelectionBox({ x1: x, y1: y, x2: x, y2: y });
      return;
    }

    // Text tool: click creates floating editor
    if (activeTool === TOOLS.TEXT) {
      const newTextId = generateId('text');
      setEditingText({
        id: newTextId,
        type: 'text',
        x,
        y,
        text: '',
        isNew: true,
        fontSize: currentStyle.fontSize || 24,
        fontFamily: currentStyle.fontFamily,
      });
      return;
    }

    // Sticky Note tool
    if (activeTool === TOOLS.STICKY) {
      const newStickyId = generateId('sticky');
      setEditingText({
        id: newStickyId,
        type: 'sticky',
        x,
        y,
        width: 180,
        height: 160,
        text: '',
        isNew: true,
        fontSize: 20,
        fontFamily: currentStyle.fontFamily,
      });
      return;
    }

    // Mind-map tool: click on canvas creates a root topic node
    if (activeTool === TOOLS.MINDMAP) {
      const newNodeId = generateId('mindmap');
      const rootEl = {
        id: newNodeId,
        type: 'rectangle',
        x: x - 70,
        y: y - 28,
        width: 140,
        height: 56,
        text: 'Central Topic',
        fontSize: 20,
        fontFamily: currentStyle.fontFamily,
        strokeColor: '#6965db',
        backgroundColor: 'rgba(105, 101, 219, 0.18)',
        strokeWidth: 2.5,
        strokeStyle: 'solid',
        fillStyle: 'solid',
        roughness: 1.0,
        seed: Math.floor(Math.random() * 100000),
        opacity: 100,
        version: 1,
        updatedAt: Date.now(),
      };
      pushHistory([...elements, rootEl]);
      setSelectedElementIds([rootEl.id]);
      if (!isLocked) setActiveTool(TOOLS.SELECT);
      return;
    }

    // Drawing shapes / connectors / pencil
    actionRef.current = 'drawing';
    setAction('drawing');

    const newId = generateId('el');
    let newEl;

    if (activeTool === TOOLS.PENCIL) {
      newEl = {
        id: newId,
        type: TOOLS.PENCIL,
        points: [{ x, y }],
        strokeColor: currentStyle.strokeColor,
        strokeWidth: currentStyle.strokeWidth,
        opacity: currentStyle.opacity,
        roughness: currentStyle.roughness,
        seed: Math.floor(Math.random() * 100000),
      };
    } else if (activeTool === TOOLS.LINE || activeTool === TOOLS.ARROW) {
      let startBinding = undefined;
      const nearAnchor = findNearestAnchor(x, y, elements, null, 28);
      let startX = x;
      let startY = y;

      if (nearAnchor) {
        startX = nearAnchor.x;
        startY = nearAnchor.y;
        startBinding = { elementId: nearAnchor.elementId, anchor: nearAnchor.anchor };
      }

      newEl = {
        id: newId,
        type: activeTool,
        x1: startX,
        y1: startY,
        x2: startX,
        y2: startY,
        startBinding,
        endBinding: undefined,
        strokeColor: currentStyle.strokeColor,
        strokeWidth: currentStyle.strokeWidth,
        strokeStyle: currentStyle.strokeStyle,
        roughness: currentStyle.roughness,
        seed: Math.floor(Math.random() * 100000),
        opacity: currentStyle.opacity,
      };
    } else {
      // Shapes: rectangle, diamond, ellipse, table
      newEl = {
        id: newId,
        type: activeTool,
        x,
        y,
        width: 0,
        height: 0,
        strokeColor: currentStyle.strokeColor,
        backgroundColor: currentStyle.backgroundColor,
        strokeWidth: currentStyle.strokeWidth,
        strokeStyle: currentStyle.strokeStyle,
        fillStyle: currentStyle.fillStyle,
        roughness: currentStyle.roughness,
        seed: Math.floor(Math.random() * 100000),
        opacity: currentStyle.opacity,
        fontSize: currentStyle.fontSize,
        fontFamily: currentStyle.fontFamily,
      };

      if (activeTool === TOOLS.TABLE) {
        newEl.rows = 3;
        newEl.cols = 3;
        newEl.hasHeader = true;
        newEl.data = [
          ['Header 1', 'Header 2', 'Header 3'],
          ['Row 1', 'Data', 'Data'],
          ['Row 2', 'Data', 'Data'],
        ];
      }
    }

    currentElementRef.current = newEl;
  };

  // Pointer Move
  const handlePointerMove = (e) => {
    const { x, y } = getCanvasCoords(e.clientX, e.clientY);

    // Throttle cursor sharing to collaborators (~30fps)
    const now = Date.now();
    if (now - lastCursorBroadcastRef.current > 35) {
      lastCursorBroadcastRef.current = now;
      broadcastCursor(x, y);
    }

    const currentAction = actionRef.current;

    // Panning
    if (currentAction === 'panning') {
      const dx = e.clientX - dragStartRef.current.clientX;
      const dy = e.clientY - dragStartRef.current.clientY;
      dragStartRef.current.clientX = e.clientX;
      dragStartRef.current.clientY = e.clientY;
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      return;
    }

    // Erasing
    if (currentAction === 'erasing') {
      eraserFxRef.current.setCursor(x, y);
      const hit = elements.find((el) => isPointInElement(x, y, el, 14 / zoom));
      if (hit) {
        eraserFxRef.current.explode(x, y, hit.strokeColor || '#ff6b6b');
        const remaining = elements.filter((el) => el.id !== hit.id);
        setElements(remaining);
      }
      return;
    }

    // Marquee Selecting
    if (currentAction === 'selecting') {
      setSelectionBox((prev) => prev ? { ...prev, x2: x, y2: y } : null);
      return;
    }

    // Moving selected elements
    if (currentAction === 'moving') {
      const dx = x - dragStartRef.current.x;
      const dy = y - dragStartRef.current.y;
      dragStartRef.current.x = x;
      dragStartRef.current.y = y;

      const updated = elements.map((el) => {
        if (!selectedElementIds.includes(el.id)) return el;
        if (el.type === 'line' || el.type === 'arrow') {
          return {
            ...el,
            x1: el.x1 + dx,
            y1: el.y1 + dy,
            x2: el.x2 + dx,
            y2: el.y2 + dy,
          };
        }
        if (el.type === 'pencil') {
          return {
            ...el,
            points: el.points ? el.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) : [],
          };
        }
        return {
          ...el,
          x: el.x + dx,
          y: el.y + dy,
        };
      });

      const withArrows = updateConnectedArrows(updated, elements.find((el) => el.id === selectedElementIds[0]));
      setElements(withArrows);
      return;
    }

    // Resizing selected element
    if (currentAction === 'resizing') {
      const selected = elements.find((el) => el.id === selectedElementIds[0]);
      if (!selected) return;

      const initEl = resizeInitialElementRef.current || selected;
      const initBounds = resizeInitialBoundsRef.current || getElementBounds(initEl);

      // Lines and Arrows: move start or end handle
      if (selected.type === 'line' || selected.type === 'arrow') {
        let updatedLine = { ...selected };
        if (resizeHandle === 'start') {
          updatedLine.x1 = x;
          updatedLine.y1 = y;
          const nearAnchor = findNearestAnchor(x, y, elements, selected.id, 28);
          if (nearAnchor) {
            updatedLine.x1 = nearAnchor.x;
            updatedLine.y1 = nearAnchor.y;
            updatedLine.startBinding = { elementId: nearAnchor.elementId, anchor: nearAnchor.anchor };
            setHoveredAnchor(nearAnchor);
          } else {
            updatedLine.startBinding = undefined;
            setHoveredAnchor(null);
          }
        } else {
          updatedLine.x2 = x;
          updatedLine.y2 = y;
          const nearAnchor = findNearestAnchor(x, y, elements, selected.id, 28);
          if (nearAnchor) {
            updatedLine.x2 = nearAnchor.x;
            updatedLine.y2 = nearAnchor.y;
            updatedLine.endBinding = { elementId: nearAnchor.elementId, anchor: nearAnchor.anchor };
            setHoveredAnchor(nearAnchor);
          } else {
            updatedLine.endBinding = undefined;
            setHoveredAnchor(null);
          }
        }

        setElements(elements.map((el) => (el.id === selected.id ? updatedLine : el)));
        return;
      }

      // Shapes, Table, Sticky, Image, Pencil: derive geometry from normalized initial bounds
      let newMinX = initBounds.minX;
      let newMaxX = initBounds.maxX;
      let newMinY = initBounds.minY;
      let newMaxY = initBounds.maxY;

      if (resizeHandle.includes('e')) newMaxX = Math.max(initBounds.minX + 10, x);
      if (resizeHandle.includes('s')) newMaxY = Math.max(initBounds.minY + 10, y);
      if (resizeHandle.includes('w')) newMinX = Math.min(initBounds.maxX - 10, x);
      if (resizeHandle.includes('n')) newMinY = Math.min(initBounds.maxY - 10, y);

      let newW = newMaxX - newMinX;
      let newH = newMaxY - newMinY;

      // Aspect ratio lock for images
      if (selected.type === 'image' && ['nw', 'ne', 'se', 'sw'].includes(resizeHandle)) {
        const ar = selected.aspectRatio || (initBounds.width / (initBounds.height || 1)) || 1;
        newH = Math.round(newW / ar);
        if (resizeHandle.includes('n')) newMinY = newMaxY - newH;
        else newMaxY = newMinY + newH;
      }

      let updatedShape = {
        ...selected,
        x: newMinX,
        y: newMinY,
        width: newW,
        height: newH,
      };

      // Proportionally scale pencil points if resizing a pencil stroke
      if (selected.type === 'pencil' && selected.points) {
        updatedShape.points = scalePencilPoints(
          initEl.points || selected.points,
          initBounds,
          { minX: newMinX, minY: newMinY, maxX: newMaxX, maxY: newMaxY }
        );
      }

      const updatedList = elements.map((el) => (el.id === selected.id ? updatedShape : el));
      const withArrows = updateConnectedArrows(updatedList, updatedShape);
      setElements(withArrows);
      return;
    }

    // Drawing new shape
    if (currentAction === 'drawing' && currentElementRef.current) {
      const drawnEl = { ...currentElementRef.current };

      if (drawnEl.type === TOOLS.PENCIL) {
        drawnEl.points = [...drawnEl.points, { x, y }];
      } else if (drawnEl.type === TOOLS.LINE || drawnEl.type === TOOLS.ARROW) {
        drawnEl.x2 = x;
        drawnEl.y2 = y;

        const nearAnchor = findNearestAnchor(x, y, elements, drawnEl.id, 28);
        if (nearAnchor) {
          drawnEl.x2 = nearAnchor.x;
          drawnEl.y2 = nearAnchor.y;
          drawnEl.endBinding = { elementId: nearAnchor.elementId, anchor: nearAnchor.anchor };
          setHoveredAnchor(nearAnchor);
        } else {
          drawnEl.endBinding = undefined;
          setHoveredAnchor(null);
        }
      } else {
        drawnEl.width = x - drawnEl.x;
        drawnEl.height = y - drawnEl.y;
      }

      currentElementRef.current = drawnEl;
      requestRender();
      return;
    }

    // Hover anchor detection when tool is arrow/line
    if (currentAction === 'none' && (activeTool === TOOLS.ARROW || activeTool === TOOLS.LINE)) {
      const nearAnchor = findNearestAnchor(x, y, elements, null, 28);
      setHoveredAnchor(nearAnchor);
    } else if (hoveredAnchor) {
      setHoveredAnchor(null);
    }
  };

  // Pointer Up (Mouse or Touch release anywhere)
  const handlePointerUp = (e) => {
    const canvas = canvasRef.current;
    if (canvas && e) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }

    const activeAct = actionRef.current;

    if (activeAct === 'drawing' && currentElementRef.current) {
      let drawnEl = { ...currentElementRef.current };
      let isValid = false;

      if (drawnEl.type === TOOLS.TABLE) {
        drawnEl.x = Math.min(drawnEl.x, drawnEl.x + drawnEl.width);
        drawnEl.y = Math.min(drawnEl.y, drawnEl.y + drawnEl.height);
        drawnEl.width = Math.max(120, Math.abs(drawnEl.width));
        drawnEl.height = Math.max(60, Math.abs(drawnEl.height));
        isValid = true;
      } else if (drawnEl.type === TOOLS.PENCIL) {
        isValid = drawnEl.points && drawnEl.points.length > 1;
      } else if (drawnEl.type === TOOLS.LINE || drawnEl.type === TOOLS.ARROW) {
        isValid = Math.hypot(drawnEl.x2 - drawnEl.x1, drawnEl.y2 - drawnEl.y1) > 4;
      } else {
        const normW = Math.abs(drawnEl.width);
        const normH = Math.abs(drawnEl.height);
        if (normW > 4 || normH > 4) {
          drawnEl.x = Math.min(drawnEl.x, drawnEl.x + drawnEl.width);
          drawnEl.y = Math.min(drawnEl.y, drawnEl.y + drawnEl.height);
          drawnEl.width = normW;
          drawnEl.height = normH;
          isValid = true;
        }
      }

      if (isValid) {
        drawnEl.version = 1;
        drawnEl.updatedAt = Date.now();
        pushHistory([...elements, drawnEl]);
        setSelectedElementIds([drawnEl.id]);
      }

      currentElementRef.current = null;

      if (!isLocked) {
        setActiveTool(TOOLS.SELECT);
      }
    }

    if (activeAct === 'moving' || activeAct === 'resizing' || activeAct === 'erasing') {
      pushHistory(elements);
    }

    if (activeAct === 'selecting' && selectionBox) {
      const hits = elements.filter((el) => isElementInBox(el, selectionBox));
      const allSelectedIds = new Set();
      for (const el of hits) {
        allSelectedIds.add(el.id);
        if (el.groupId) {
          elements.filter((o) => o.groupId === el.groupId).forEach((o) => allSelectedIds.add(o.id));
        }
      }
      setSelectedElementIds(Array.from(allSelectedIds));
      setSelectionBox(null);
    }

    actionRef.current = 'none';
    setAction('none');
    setResizeHandle(null);
    resizeInitialElementRef.current = null;
    resizeInitialBoundsRef.current = null;
    setHoveredAnchor(null);
  };

  // Window pointerup listener guarantees gestures stop even if released over toolbar/outside window
  useEffect(() => {
    const handleGlobalPointerUp = (e) => {
      if (actionRef.current !== 'none') {
        handlePointerUp(e);
      }
    };

    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  });

  // Double-Click / Double-Tap Handler
  const handleDoubleClick = (e) => {
    const { x, y } = getCanvasCoords(e.clientX, e.clientY);

    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (isPointInElement(x, y, el, 8 / zoom)) {
        if (el.type === 'table') {
          const cell = getCellAtPoint(x, y, el);
          if (cell) {
            const currentCellText = el.data && el.data[cell.rowIndex] && el.data[cell.rowIndex][cell.colIndex] !== undefined
              ? String(el.data[cell.rowIndex][cell.colIndex])
              : '';

            setEditingCell({
              tableId: el.id,
              rowIndex: cell.rowIndex,
              colIndex: cell.colIndex,
              cellX: cell.cellX,
              cellY: cell.cellY,
              cellWidth: cell.cellWidth,
              cellHeight: cell.cellHeight,
              text: currentCellText,
              fontSize: el.fontSize || 18,
              fontFamily: el.fontFamily,
            });
            return;
          }
        }

        if (['text', 'sticky', 'rectangle', 'ellipse', 'diamond'].includes(el.type)) {
          setEditingText({
            id: el.id,
            type: el.type,
            x: el.type === 'text' ? el.x : el.x + (el.width - Math.min(el.width, 180)) / 2,
            y: el.type === 'text' ? el.y : el.y + (el.height - Math.min(el.height, 44)) / 2,
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

    // Double click empty space creates a text label
    const newTextId = generateId('text');
    setEditingText({
      id: newTextId,
      type: 'text',
      x,
      y,
      text: '',
      isNew: true,
      fontSize: currentStyle.fontSize || 24,
      fontFamily: currentStyle.fontFamily,
    });
  };

  // Wheel handling: Unmodified wheel pans; Ctrl + Wheel zooms into cursor
  const handleWheel = (e) => {
    e.preventDefault();

    if (e.ctrlKey || e.metaKey) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newZoom = Math.min(4.0, Math.max(0.15, zoom * zoomFactor));

      const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
      const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    } else {
      setPan((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  };

  // Touch handlers for multi-touch pinch zoom anchored at fingers
  const handleTouchStart = (e) => {
    if (e.touches.length >= 2) {
      if (actionRef.current === 'drawing') {
        currentElementRef.current = null;
        actionRef.current = 'none';
        setAction('none');
      }

      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const center = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };
      touchStateRef.current = { dist, center };
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        handleDoubleClick(e.touches[0]);
      }
      lastTapRef.current = now;
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length >= 2 && touchStateRef.current.dist) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const currentCenter = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };

      const { dist: prevDist, center: prevCenter } = touchStateRef.current;
      const zoomRatio = currentDist / prevDist;
      const newZoom = Math.min(4.0, Math.max(0.15, zoom * zoomRatio));

      const rect = canvasRef.current.getBoundingClientRect();
      const midX = prevCenter.x - rect.left;
      const midY = prevCenter.y - rect.top;

      const worldPointX = (midX - pan.x) / zoom;
      const worldPointY = (midY - pan.y) / zoom;

      const newMidX = currentCenter.x - rect.left;
      const newMidY = currentCenter.y - rect.top;

      const newPanX = newMidX - worldPointX * newZoom;
      const newPanY = newMidY - worldPointY * newZoom;

      touchStateRef.current = { dist: currentDist, center: currentCenter };
      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) {
      touchStateRef.current = { dist: null, center: null };
    }
  };

  // Cursor style based on active tool or hover
  const getCanvasCursor = () => {
    if (action === 'panning' || activeTool === TOOLS.HAND) return 'grab';
    if (action === 'erasing' || activeTool === TOOLS.ERASER) return 'crosshair';
    if (action === 'resizing') return 'nwse-resize';
    if (activeTool === TOOLS.TEXT) return 'text';
    if (activeTool === TOOLS.SELECT) return 'default';
    return 'crosshair';
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="absolute inset-0 overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: getCanvasCursor() }}
        className="block absolute inset-0 touch-none"
      />
    </div>
  );
}
