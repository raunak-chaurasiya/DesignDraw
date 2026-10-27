import { create } from 'zustand';
import { TOOLS, DEFAULT_STYLE } from '../constants';
import { updateAllConnectedArrows } from '../utils/binding';
import { validateScene } from '../utils/validation';
import { getElementBounds } from '../utils/math';
import { measureTextBounds } from '../utils/textMeasurement';
import { createBranchNode } from '../utils/mindmap';
import { useCollabStore } from './useCollabStore';

function generateId(prefix = 'el') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export const useCanvasStore = create((set, get) => ({
  // Scene elements & Selection
  elements: [],
  selectedElementIds: [],

  // History Stack (bounded to 50 snapshots)
  history: [[]],
  historyIndex: 0,

  // Viewport & Canvas Layout
  pan: { x: 0, y: 0 },
  zoom: 1,
  isDarkMode: true,
  showGrid: true,
  canvasDimensions: {
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  },

  // Active Tool & Lock
  activeTool: TOOLS.SELECT,
  isLocked: false,
  currentStyle: DEFAULT_STYLE,

  // Inline Editors
  editingText: null, // { id, type, x, y, width, height, text, isNew, fontSize, fontFamily, color, arrowId }
  editingCell: null, // { tableId, rowIndex, colIndex, cellX, cellY, cellWidth, cellHeight, text, fontSize, fontFamily }

  // Modals & Panels
  isMenuOpen: false,
  isExportOpen: false,
  isHelpOpen: false,
  isPropertiesOpen: typeof window !== 'undefined' ? window.innerWidth > 768 : false,
  showIntro: true,

  // Toast Notification
  toastMessage: null,
  toastTimeoutId: null,

  // --- ACTIONS ---

  showToast: (msg) => {
    const { toastTimeoutId } = get();
    if (toastTimeoutId) clearTimeout(toastTimeoutId);

    const timeoutId = setTimeout(() => {
      set({ toastMessage: null, toastTimeoutId: null });
    }, 2500);

    set({ toastMessage: msg, toastTimeoutId: timeoutId });
  },

  setCanvasDimensions: (dims) => {
    set({ canvasDimensions: dims });
  },

  setModalOpen: (modalName, isOpen) => {
    set({ [modalName]: isOpen });
  },

  setIsDarkMode: (isDark) => set({ isDarkMode: isDark }),
  setShowGrid: (show) => set({ showGrid: show }),
  setShowIntro: (show) => set({ showIntro: show }),
  setIsLocked: (locked) => set({ isLocked: locked }),

  setActiveTool: (tool) => {
    set({ activeTool: tool, showIntro: false });
  },

  setCurrentStyle: (newStyle) => {
    set((state) => ({
      currentStyle: typeof newStyle === 'function' ? newStyle(state.currentStyle) : { ...state.currentStyle, ...newStyle },
    }));
  },

  setPan: (newPan) => {
    set((state) => ({
      pan: typeof newPan === 'function' ? newPan(state.pan) : newPan,
    }));
  },

  setZoom: (newZoom) => {
    set((state) => {
      const zoomVal = typeof newZoom === 'function' ? newZoom(state.zoom) : newZoom;
      return { zoom: Math.min(4.0, Math.max(0.15, zoomVal)) };
    });
  },

  resetZoom: () => {
    set({ zoom: 1, pan: { x: 0, y: 0 } });
  },

  zoomIn: () => {
    set((state) => ({ zoom: Math.min(4.0, Number((state.zoom * 1.2).toFixed(2))) }));
  },

  zoomOut: () => {
    set((state) => ({ zoom: Math.max(0.15, Number((state.zoom / 1.2).toFixed(2))) }));
  },

  // Set elements directly (e.g. during live drag/gesture)
  setElements: (elements) => {
    set({ elements });
  },

  // Push elements snapshot into history and optionally broadcast to collaborators
  pushHistory: (newElements, shouldBroadcast = true) => {
    const { history, historyIndex } = get();
    // Centralize arrow bindings update
    const resolvedElements = updateAllConnectedArrows(newElements);

    // Retain branch up to historyIndex, append new snapshot
    const trimmed = history.slice(0, historyIndex + 1);
    trimmed.push(resolvedElements);

    // Bound to last 50 transactions
    const boundedHistory = trimmed.length > 50 ? trimmed.slice(trimmed.length - 50) : trimmed;
    const nextIndex = boundedHistory.length - 1;

    set({
      elements: resolvedElements,
      history: boundedHistory,
      historyIndex: nextIndex,
    });

    // Broadcast to live collaborators
    if (shouldBroadcast) {
      useCollabStore.getState().broadcastSceneUpdate(resolvedElements);
    }
  },

  // Undo transaction and synchronize with collaborators
  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const targetElements = history[newIndex] || [];
      set({
        historyIndex: newIndex,
        elements: targetElements,
        selectedElementIds: [],
      });
      useCollabStore.getState().broadcastSceneUpdate(targetElements);
    }
  },

  // Redo transaction and synchronize with collaborators
  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const targetElements = history[newIndex] || [];
      set({
        historyIndex: newIndex,
        elements: targetElements,
        selectedElementIds: [],
      });
      useCollabStore.getState().broadcastSceneUpdate(targetElements);
    }
  },

  // Selection
  setSelectedElementIds: (ids) => {
    set({ selectedElementIds: ids || [] });
  },

  selectElement: (id, multi = false) => {
    if (!id) {
      set({ selectedElementIds: [] });
      return;
    }
    set((state) => {
      if (multi) {
        const next = state.selectedElementIds.includes(id)
          ? state.selectedElementIds.filter((x) => x !== id)
          : [...state.selectedElementIds, id];
        return { selectedElementIds: next };
      }
      return { selectedElementIds: [id] };
    });
  },

  clearSelection: () => {
    set({ selectedElementIds: [] });
  },

  // Atomic property patch for selected elements (supports multiple keys at once, e.g. width & height)
  updateSelectedProperties: (patch) => {
    const { selectedElementIds, elements, pushHistory } = get();
    if (selectedElementIds.length === 0 || !patch) return;

    const updated = elements.map((el) => {
      if (selectedElementIds.includes(el.id)) {
        const newEl = {
          ...el,
          ...patch,
          version: (el.version || 1) + 1,
          updatedAt: Date.now(),
        };

        // If font properties changed on text, recompute dimensions
        if (el.type === 'text' && (patch.fontSize !== undefined || patch.fontFamily !== undefined)) {
          const fontSize = patch.fontSize !== undefined ? patch.fontSize : el.fontSize || 24;
          const fontFamily = patch.fontFamily !== undefined ? patch.fontFamily : el.fontFamily;
          const measured = measureTextBounds(el.text || '', fontSize, fontFamily);
          newEl.width = measured.width;
          newEl.height = measured.height;
        }

        return newEl;
      }
      return el;
    });

    pushHistory(updated);
  },

  deleteSelected: () => {
    const { selectedElementIds, elements, pushHistory, showToast } = get();
    if (selectedElementIds.length === 0) return;

    const count = selectedElementIds.length;
    const remaining = elements.filter((el) => !selectedElementIds.includes(el.id));

    set({ selectedElementIds: [] });
    pushHistory(remaining);
    if (count > 1) {
      showToast(`Deleted ${count} elements`);
    }
  },

  // Duplicate elements with binding remapping
  duplicateSelected: () => {
    const { selectedElementIds, elements, pushHistory, showToast } = get();
    if (selectedElementIds.length === 0) return;

    const selected = elements.filter((el) => selectedElementIds.includes(el.id));
    if (selected.length === 0) return;

    // Allocate oldId -> newId mapping first so duplicated connectors rebind to duplicated shapes
    const idMap = new Map();
    const groupMap = new Map();

    for (const el of selected) {
      idMap.set(el.id, generateId('el'));
      if (el.groupId && !groupMap.has(el.groupId)) {
        groupMap.set(el.groupId, generateId('grp'));
      }
    }

    const duplicates = selected.map((el) => {
      const newId = idMap.get(el.id);
      const newGroupId = el.groupId ? groupMap.get(el.groupId) : undefined;

      const dup = {
        ...el,
        id: newId,
        groupId: newGroupId,
        version: 1,
        updatedAt: Date.now(),
        seed: Math.floor(Math.random() * 100000),
      };

      if (dup.x !== undefined) dup.x += 20;
      if (dup.y !== undefined) dup.y += 20;
      if (dup.x1 !== undefined) dup.x1 += 20;
      if (dup.y1 !== undefined) dup.y1 += 20;
      if (dup.x2 !== undefined) dup.x2 += 20;
      if (dup.y2 !== undefined) dup.y2 += 20;
      if (dup.points) {
        dup.points = dup.points.map((p) => ({ x: p.x + 20, y: p.y + 20 }));
      }

      // Remap bindings if connector was duplicated along with its targets
      if (dup.startBinding && dup.startBinding.elementId) {
        if (idMap.has(dup.startBinding.elementId)) {
          dup.startBinding = {
            ...dup.startBinding,
            elementId: idMap.get(dup.startBinding.elementId),
          };
        } else {
          // Detach external binding when original shape wasn't duplicated
          dup.startBinding = undefined;
        }
      }

      if (dup.endBinding && dup.endBinding.elementId) {
        if (idMap.has(dup.endBinding.elementId)) {
          dup.endBinding = {
            ...dup.endBinding,
            elementId: idMap.get(dup.endBinding.elementId),
          };
        } else {
          dup.endBinding = undefined;
        }
      }

      return dup;
    });

    const updated = [...elements, ...duplicates];
    set({ selectedElementIds: duplicates.map((d) => d.id) });
    pushHistory(updated);
    showToast(`Duplicated ${duplicates.length} element${duplicates.length > 1 ? 's' : ''}`);
  },

  groupSelected: () => {
    const { selectedElementIds, elements, pushHistory, showToast } = get();
    if (selectedElementIds.length < 2) {
      showToast('Select at least 2 shapes to group');
      return;
    }
    const groupId = generateId('grp');
    const updated = elements.map((el) => {
      if (selectedElementIds.includes(el.id)) {
        return { ...el, groupId, version: (el.version || 1) + 1, updatedAt: Date.now() };
      }
      return el;
    });
    pushHistory(updated);
    showToast('Grouped selected elements');
  },

  ungroupSelected: () => {
    const { selectedElementIds, elements, pushHistory, showToast } = get();
    if (selectedElementIds.length === 0) return;
    const updated = elements.map((el) => {
      if (selectedElementIds.includes(el.id) && el.groupId) {
        const copy = { ...el, version: (el.version || 1) + 1, updatedAt: Date.now() };
        delete copy.groupId;
        return copy;
      }
      return el;
    });
    pushHistory(updated);
    showToast('Ungrouped elements');
  },

  // Z-index layer ordering
  bringForward: () => {
    const { selectedElementIds, elements, pushHistory } = get();
    if (selectedElementIds.length === 0) return;
    const updated = [...elements];
    for (let i = updated.length - 2; i >= 0; i--) {
      if (selectedElementIds.includes(updated[i].id) && !selectedElementIds.includes(updated[i + 1].id)) {
        const temp = updated[i];
        updated[i] = updated[i + 1];
        updated[i + 1] = temp;
      }
    }
    pushHistory(updated);
  },

  sendBackward: () => {
    const { selectedElementIds, elements, pushHistory } = get();
    if (selectedElementIds.length === 0) return;
    const updated = [...elements];
    for (let i = 1; i < updated.length; i++) {
      if (selectedElementIds.includes(updated[i].id) && !selectedElementIds.includes(updated[i - 1].id)) {
        const temp = updated[i];
        updated[i] = updated[i - 1];
        updated[i - 1] = temp;
      }
    }
    pushHistory(updated);
  },

  bringToFront: () => {
    const { selectedElementIds, elements, pushHistory } = get();
    if (selectedElementIds.length === 0) return;
    const unselected = elements.filter((el) => !selectedElementIds.includes(el.id));
    const selected = elements.filter((el) => selectedElementIds.includes(el.id));
    pushHistory([...unselected, ...selected]);
  },

  sendToBack: () => {
    const { selectedElementIds, elements, pushHistory } = get();
    if (selectedElementIds.length === 0) return;
    const unselected = elements.filter((el) => !selectedElementIds.includes(el.id));
    const selected = elements.filter((el) => selectedElementIds.includes(el.id));
    pushHistory([...selected, ...unselected]);
  },

  // Align selected elements
  alignSelected: (direction) => {
    const { selectedElementIds, elements, pushHistory, showToast } = get();
    if (selectedElementIds.length < 2) {
      showToast('Select at least 2 shapes to align');
      return;
    }

    const selected = elements.filter((el) => selectedElementIds.includes(el.id));
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const el of selected) {
      const b = getElementBounds(el);
      if (b.minX < minX) minX = b.minX;
      if (b.maxX > maxX) maxX = b.maxX;
      if (b.minY < minY) minY = b.minY;
      if (b.maxY > maxY) maxY = b.maxY;
    }

    const updated = elements.map((el) => {
      if (!selectedElementIds.includes(el.id) || ['line', 'arrow', 'pencil'].includes(el.type)) {
        return el;
      }
      const b = getElementBounds(el);
      let dx = 0;
      let dy = 0;

      if (direction === 'left') dx = minX - b.minX;
      else if (direction === 'right') dx = maxX - b.maxX;
      else if (direction === 'center-h') dx = (minX + maxX) / 2 - (b.minX + b.width / 2);
      else if (direction === 'top') dy = minY - b.minY;
      else if (direction === 'bottom') dy = maxY - b.maxY;
      else if (direction === 'center-v') dy = (minY + maxY) / 2 - (b.minY + b.height / 2);

      return {
        ...el,
        x: el.x + dx,
        y: el.y + dy,
        version: (el.version || 1) + 1,
        updatedAt: Date.now(),
      };
    });

    // Recompute arrow connections so arrows follow moved shapes
    pushHistory(updated);
    showToast(`Aligned ${direction}`);
  },

  // Text & Inline Editor Lifecycle
  setEditingText: (editState) => set({ editingText: editState }),

  finishEditingText: (customText) => {
    const { editingText, elements, currentStyle, isDarkMode, isLocked, pushHistory } = get();
    if (!editingText) return;

    const textVal = customText !== undefined ? customText : editingText.text;
    const trimmed = (textVal || '').trim();

    // If text is empty:
    if (!trimmed) {
      // Only delete standalone text element
      if (editingText.type === 'text') {
        const remaining = elements.filter((el) => el.id !== editingText.id);
        pushHistory(remaining);
      } else {
        // For shapes (rectangle, sticky, ellipse, diamond, table, etc.):
        // Preserve geometry and clear text label
        const updated = elements.map((el) => {
          if (el.id === editingText.id) {
            return { ...el, text: '', version: (el.version || 1) + 1, updatedAt: Date.now() };
          }
          return el;
        });
        pushHistory(updated);
      }
    } else {
      // Non-empty text
      const fontSize = editingText.fontSize || currentStyle.fontSize || 24;
      const fontFamily = editingText.fontFamily || currentStyle.fontFamily;
      const measured = measureTextBounds(trimmed, fontSize, fontFamily);

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
          width: editingText.type === 'sticky' ? (editingText.width || 180) : measured.width,
          height: editingText.type === 'sticky' ? (editingText.height || 160) : measured.height,
          text: trimmed,
          fontSize,
          fontFamily,
          strokeColor: textColor,
          backgroundColor: currentStyle.backgroundColor,
          strokeWidth: currentStyle.strokeWidth,
          strokeStyle: currentStyle.strokeStyle,
          fillStyle: currentStyle.fillStyle,
          roughness: currentStyle.roughness,
          seed: Math.floor(Math.random() * 100000),
          opacity: currentStyle.opacity,
          version: 1,
          updatedAt: Date.now(),
        };
        pushHistory([...elements, newEl]);
        set({ selectedElementIds: [newEl.id] });
      } else {
        const updated = elements.map((el) => {
          if (el.id === editingText.id) {
            return {
              ...el,
              text: trimmed,
              width: el.type === 'text' ? measured.width : el.width,
              height: el.type === 'text' ? measured.height : el.height,
              version: (el.version || 1) + 1,
              updatedAt: Date.now(),
            };
          }
          return el;
        });
        pushHistory(updated);
      }
    }

    set({ editingText: null });
    if (!isLocked) {
      set({ activeTool: TOOLS.SELECT });
    }
  },

  cancelEditingText: () => {
    const { editingText, elements, pushHistory, isLocked } = get();
    if (!editingText) return;

    // If it was a newly created node/branch that was cancelled, clean it up
    if (editingText.isNew) {
      const idsToRemove = new Set([editingText.id]);
      if (editingText.arrowId) idsToRemove.add(editingText.arrowId);
      const remaining = elements.filter((el) => !idsToRemove.has(el.id));
      if (remaining.length !== elements.length) {
        pushHistory(remaining);
      }
    }

    set({ editingText: null });
    if (!isLocked) {
      set({ activeTool: TOOLS.SELECT });
    }
  },

  // Table Cell Editing
  setEditingCell: (cellState) => set({ editingCell: cellState }),

  finishEditingCell: (commit = true, customText) => {
    const { editingCell, elements, pushHistory } = get();
    if (!editingCell) return;

    if (commit) {
      const val = customText !== undefined ? customText : editingCell.text;
      const updated = elements.map((el) => {
        if (el.id === editingCell.tableId && el.type === 'table') {
          const rows = Math.max(1, el.rows || 3);
          const cols = Math.max(1, el.cols || 3);
          const newData = (el.data || []).map((row) => [...row]);

          while (newData.length < rows) newData.push(Array(cols).fill(''));
          for (let r = 0; r < rows; r++) {
            while (newData[r].length < cols) newData[r].push('');
          }

          if (newData[editingCell.rowIndex]) {
            newData[editingCell.rowIndex][editingCell.colIndex] = val;
          }

          return { ...el, data: newData, version: (el.version || 1) + 1, updatedAt: Date.now() };
        }
        return el;
      });
      pushHistory(updated);
    }

    set({ editingCell: null });
  },

  // Load imported scene
  loadScene: (incomingElements, appState = {}) => {
    const validated = validateScene(incomingElements);
    set({
      elements: validated,
      history: [validated],
      historyIndex: 0,
      selectedElementIds: [],
    });

    if (appState.theme) {
      set({ isDarkMode: appState.theme === 'dark' });
    }

    get().showToast(`Loaded ${validated.length} elements from project`);
  },

  // Clear entire whiteboard
  clearCanvas: () => {
    get().pushHistory([]);
    set({ selectedElementIds: [] });
    get().showToast('Canvas cleared');
  },

  // Select all elements
  selectAll: () => {
    const { elements } = get();
    set({ selectedElementIds: elements.map((el) => el.id) });
  },

  // Insert image element
  insertImage: (dataUrl, clientX, clientY) => {
    if (!dataUrl) return;
    const { elements, pan, zoom, pushHistory, showToast } = get();

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

      const screenX = clientX !== undefined ? clientX : (typeof window !== 'undefined' ? window.innerWidth / 2 : 500);
      const screenY = clientY !== undefined ? clientY : (typeof window !== 'undefined' ? window.innerHeight / 2 : 400);

      const canvasX = (screenX - pan.x) / zoom;
      const canvasY = (screenY - pan.y) / zoom;

      const newImageEl = {
        id: generateId('img'),
        type: 'image',
        x: Math.round(canvasX - w / 2),
        y: Math.round(canvasY - h / 2),
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
      set({ selectedElementIds: [newImageEl.id] });
      showToast('Image inserted');
    };
    img.src = dataUrl;
  },

  // Auto-branch mindmap node
  autoBranch: (isSibling = false) => {
    const { selectedElementIds, elements, pushHistory, showToast, setEditingText } = get();
    if (selectedElementIds.length !== 1) {
      showToast('Select a shape to branch from');
      return;
    }
    const source = elements.find((el) => el.id === selectedElementIds[0]);
    if (!source || ['line', 'arrow', 'pencil'].includes(source.type)) return;

    const result = createBranchNode(source, 'right', elements, isSibling);
    if (!result) return;

    pushHistory(result.newElements);
    set({ selectedElementIds: [result.newNode.id] });

    setEditingText({
      id: result.newNode.id,
      type: result.newNode.type,
      x: result.newNode.x,
      y: result.newNode.y,
      width: result.newNode.width,
      height: result.newNode.height,
      text: '',
      isNew: true,
      fontSize: result.newNode.fontSize,
      fontFamily: result.newNode.fontFamily,
      arrowId: result.newArrow.id,
    });

    showToast(isSibling ? 'Added sibling branch' : 'Added child branch');
  },

  // Table structure actions
  addTableRow: () => {
    const { selectedElementIds, elements, updateSelectedProperties } = get();
    const selected = elements.find((el) => el.id === selectedElementIds[0]);
    if (!selected || selected.type !== 'table') return;

    const currentRows = selected.rows || 3;
    const cols = selected.cols || 3;
    const currentData = (selected.data || []).map((r) => [...r]);
    currentData.push(Array(cols).fill(''));
    const h = selected.height || 120;
    const newH = Math.round(h * ((currentRows + 1) / currentRows));
    updateSelectedProperties({ rows: currentRows + 1, data: currentData, height: newH });
  },

  removeTableRow: () => {
    const { selectedElementIds, elements, updateSelectedProperties } = get();
    const selected = elements.find((el) => el.id === selectedElementIds[0]);
    if (!selected || selected.type !== 'table') return;

    const currentRows = selected.rows || 3;
    if (currentRows <= 1) return;
    const currentData = (selected.data || []).slice(0, currentRows - 1);
    const h = selected.height || 120;
    const newH = Math.round(h * ((currentRows - 1) / currentRows));
    updateSelectedProperties({ rows: currentRows - 1, data: currentData, height: newH });
  },

  addTableCol: () => {
    const { selectedElementIds, elements, updateSelectedProperties } = get();
    const selected = elements.find((el) => el.id === selectedElementIds[0]);
    if (!selected || selected.type !== 'table') return;

    const currentCols = selected.cols || 3;
    const currentData = (selected.data || []).map((r) => [...r, '']);
    const w = selected.width || 240;
    const newW = Math.round(w * ((currentCols + 1) / currentCols));
    updateSelectedProperties({ cols: currentCols + 1, data: currentData, width: newW });
  },

  removeTableCol: () => {
    const { selectedElementIds, elements, updateSelectedProperties } = get();
    const selected = elements.find((el) => el.id === selectedElementIds[0]);
    if (!selected || selected.type !== 'table') return;

    const currentCols = selected.cols || 3;
    if (currentCols <= 1) return;
    const currentData = (selected.data || []).map((r) => r.slice(0, currentCols - 1));
    const w = selected.width || 240;
    const newW = Math.round(w * ((currentCols - 1) / currentCols));
    updateSelectedProperties({ cols: currentCols - 1, data: currentData, width: newW });
  },

  toggleTableHeader: () => {
    const { selectedElementIds, elements, updateSelectedProperties } = get();
    const selected = elements.find((el) => el.id === selectedElementIds[0]);
    if (!selected || selected.type !== 'table') return;
    updateSelectedProperties({ hasHeader: !selected.hasHeader });
  },
}));
