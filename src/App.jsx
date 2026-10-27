import { useRef, useEffect, useCallback } from 'react';
import Toolbar from './components/Toolbar';
import PropertiesPanel from './components/PropertiesPanel';
import ZoomControls from './components/ZoomControls';
import MenuModal from './components/MenuModal';
import ExportModal from './components/ExportModal';
import HelpModal from './components/HelpModal';
import IntroCard from './components/IntroCard';
import QrShareModal from './components/qr-share-modal';
import WhiteboardCanvas from './components/canvas/WhiteboardCanvas';
import InlineTextEditor from './components/canvas/InlineTextEditor';
import TableCellEditor from './components/canvas/TableCellEditor';
import CollaboratorCursors from './components/canvas/CollaboratorCursors';
import Toast from './components/Toast';

import { useCanvasStore } from './store/useCanvasStore';
import { useCollabStore } from './store/useCollabStore';
import { TOOLS } from './constants';
import { createBranchNode } from './utils/mindmap';
import { Analytics } from '@vercel/analytics/react';

export default function App() {
  const fileInputRef = useRef(null);

  // Store bindings
  const elements = useCanvasStore((state) => state.elements);
  const selectedElementIds = useCanvasStore((state) => state.selectedElementIds);
  const activeTool = useCanvasStore((state) => state.activeTool);
  const isLocked = useCanvasStore((state) => state.isLocked);
  const currentStyle = useCanvasStore((state) => state.currentStyle);
  const isDarkMode = useCanvasStore((state) => state.isDarkMode);
  const showGrid = useCanvasStore((state) => state.showGrid);
  const zoom = useCanvasStore((state) => state.zoom);
  const historyIndex = useCanvasStore((state) => state.historyIndex);
  const history = useCanvasStore((state) => state.history);

  // Modals
  const isMenuOpen = useCanvasStore((state) => state.isMenuOpen);
  const isExportOpen = useCanvasStore((state) => state.isExportOpen);
  const isHelpOpen = useCanvasStore((state) => state.isHelpOpen);
  const isPropertiesOpen = useCanvasStore((state) => state.isPropertiesOpen);
  const showIntro = useCanvasStore((state) => state.showIntro);

  // Collab
  const isCollabOpen = useCollabStore((state) => state.isCollabOpen);
  const isCollabActive = useCollabStore((state) => state.isCollabActive);
  const connectedPeerCount = useCollabStore((state) => state.connectedPeerCount);
  const shareUrl = useCollabStore((state) => state.shareUrl);
  const myPeerId = useCollabStore((state) => state.myPeerId);
  const isHost = useCollabStore((state) => state.isHost);

  // Actions
  const setActiveTool = useCanvasStore((state) => state.setActiveTool);
  const setIsLocked = useCanvasStore((state) => state.setIsLocked);
  const setIsDarkMode = useCanvasStore((state) => state.setIsDarkMode);
  const setShowGrid = useCanvasStore((state) => state.setShowGrid);
  const setShowIntro = useCanvasStore((state) => state.setShowIntro);
  const setModalOpen = useCanvasStore((state) => state.setModalOpen);
  const setEditingText = useCanvasStore((state) => state.setEditingText);
  const setSelectedElementIds = useCanvasStore((state) => state.setSelectedElementIds);
  const updateSelectedProperties = useCanvasStore((state) => state.updateSelectedProperties);
  const deleteSelected = useCanvasStore((state) => state.deleteSelected);
  const duplicateSelected = useCanvasStore((state) => state.duplicateSelected);
  const groupSelected = useCanvasStore((state) => state.groupSelected);
  const ungroupSelected = useCanvasStore((state) => state.ungroupSelected);
  const bringForward = useCanvasStore((state) => state.bringForward);
  const sendBackward = useCanvasStore((state) => state.sendBackward);
  const alignSelected = useCanvasStore((state) => state.alignSelected);
  const undo = useCanvasStore((state) => state.undo);
  const redo = useCanvasStore((state) => state.redo);
  const zoomIn = useCanvasStore((state) => state.zoomIn);
  const zoomOut = useCanvasStore((state) => state.zoomOut);
  const resetZoom = useCanvasStore((state) => state.resetZoom);
  const loadScene = useCanvasStore((state) => state.loadScene);
  const clearCanvas = useCanvasStore((state) => state.clearCanvas);
  const pushHistory = useCanvasStore((state) => state.pushHistory);
  const showToast = useCanvasStore((state) => state.showToast);

  const startCollaboration = useCollabStore((state) => state.startCollaboration);
  const stopCollaboration = useCollabStore((state) => state.stopCollaboration);
  const setIsCollabOpen = useCollabStore((state) => state.setIsCollabOpen);

  const selectedElement = elements.find((el) => el.id === selectedElementIds[0]) || null;
  const selectedElements = elements.filter((el) => selectedElementIds.includes(el.id));

  // Auto-connect if URL has ?room=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      startCollaboration(room, showToast);
    }
  }, [startCollaboration, showToast]);

  // Insert image file from hidden input
  const handleImageFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target.result;
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

        const newImageEl = {
          id: `img-${Date.now()}`,
          type: 'image',
          x: Math.round(window.innerWidth / 2 - w / 2),
          y: Math.round(window.innerHeight / 2 - h / 2),
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
    e.target.value = '';
  };

  // Auto-branch mindmap node
  const handleAutoBranch = useCallback(
    (isSibling = false) => {
      if (selectedElementIds.length !== 1) {
        showToast('Select a shape to branch from');
        return;
      }
      const source = elements.find((el) => el.id === selectedElementIds[0]);
      if (!source || ['line', 'arrow', 'pencil'].includes(source.type)) return;

      const result = createBranchNode(source, 'right', elements, isSibling);
      if (!result) return;

      pushHistory(result.newElements);
      setSelectedElementIds([result.newNode.id]);

      // Automatically open inline text editor for new branch
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
    [selectedElementIds, elements, pushHistory, setSelectedElementIds, setEditingText, showToast]
  );

  // Table structure operations
  const handleAddTableRow = () => {
    if (!selectedElement || selectedElement.type !== 'table') return;
    const currentRows = selectedElement.rows || 3;
    const cols = selectedElement.cols || 3;
    const currentData = (selectedElement.data || []).map((r) => [...r]);
    currentData.push(Array(cols).fill(''));
    const h = selectedElement.height || 120;
    const newH = Math.round(h * ((currentRows + 1) / currentRows));
    updateSelectedProperties({ rows: currentRows + 1, data: currentData, height: newH });
  };

  const handleRemoveTableRow = () => {
    if (!selectedElement || selectedElement.type !== 'table') return;
    const currentRows = selectedElement.rows || 3;
    if (currentRows <= 1) return;
    const currentData = (selectedElement.data || []).slice(0, currentRows - 1);
    const h = selectedElement.height || 120;
    const newH = Math.round(h * ((currentRows - 1) / currentRows));
    updateSelectedProperties({ rows: currentRows - 1, data: currentData, height: newH });
  };

  const handleAddTableCol = () => {
    if (!selectedElement || selectedElement.type !== 'table') return;
    const currentCols = selectedElement.cols || 3;
    const currentData = (selectedElement.data || []).map((r) => [...r, '']);
    const w = selectedElement.width || 240;
    const newW = Math.round(w * ((currentCols + 1) / currentCols));
    updateSelectedProperties({ cols: currentCols + 1, data: currentData, width: newW });
  };

  const handleRemoveTableCol = () => {
    if (!selectedElement || selectedElement.type !== 'table') return;
    const currentCols = selectedElement.cols || 3;
    if (currentCols <= 1) return;
    const currentData = (selectedElement.data || []).map((r) => r.slice(0, currentCols - 1));
    const w = selectedElement.width || 240;
    const newW = Math.round(w * ((currentCols - 1) / currentCols));
    updateSelectedProperties({ cols: currentCols - 1, data: currentData, width: newW });
  };

  const handleToggleTableHeader = () => {
    if (!selectedElement || selectedElement.type !== 'table') return;
    updateSelectedProperties({ hasHeader: !selectedElement.hasHeader });
  };

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      // If typing in input, textarea, or select, do not trigger canvas shortcuts
      const activeTag = document.activeElement?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag)) {
        return;
      }

      // If any modal dialog is currently open, suspend background destructive actions (CodeRabbit item 20)
      const isAnyModalOpen = isMenuOpen || isExportOpen || isHelpOpen || isCollabOpen;

      if (e.key === 'Escape') {
        if (isMenuOpen) setModalOpen('isMenuOpen', false);
        else if (isExportOpen) setModalOpen('isExportOpen', false);
        else if (isHelpOpen) setModalOpen('isHelpOpen', false);
        else if (isCollabOpen) setIsCollabOpen(false);
        else {
          setSelectedElementIds([]);
          setActiveTool(TOOLS.SELECT);
        }
        return;
      }

      if (isAnyModalOpen) {
        return;
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
        return;
      }

      // Duplicate: Ctrl+D
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        duplicateSelected();
        return;
      }

      // Select All: Ctrl+A
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setSelectedElementIds(elements.map((el) => el.id));
        return;
      }

      // Group: Ctrl+G
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault();
        groupSelected();
        return;
      }

      // Ungroup: Ctrl+Shift+G
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault();
        ungroupSelected();
        return;
      }

      // Zoom Controls: Ctrl+0, Ctrl++, Ctrl+- (CodeRabbit item 20 & zoom alignment)
      if ((e.ctrlKey || e.metaKey) && (e.key === '0' || e.code === 'Digit0' || e.code === 'Numpad0')) {
        e.preventDefault();
        resetZoom();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+' || e.code === 'Equal' || e.code === 'NumpadAdd')) {
        e.preventDefault();
        zoomIn();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === '-' || e.key === '_' || e.code === 'Minus' || e.code === 'NumpadSubtract')) {
        e.preventDefault();
        zoomOut();
        return;
      }

      // Delete: Delete / Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementIds.length > 0) {
          e.preventDefault();
          deleteSelected();
        }
        return;
      }

      // Mindmap branch shortcuts
      if (e.key === 'Tab') {
        e.preventDefault();
        handleAutoBranch(false);
        return;
      }
      if (e.key === 'Enter' && selectedElementIds.length === 1) {
        e.preventDefault();
        handleAutoBranch(true);
        return;
      }

      // Single-key Tool Shortcuts (only if no modifiers pressed)
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
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
            fileInputRef.current?.click();
            break;
          case 'e':
            setActiveTool(TOOLS.ERASER);
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isMenuOpen,
    isExportOpen,
    isHelpOpen,
    isCollabOpen,
    selectedElementIds,
    elements,
    undo,
    redo,
    duplicateSelected,
    groupSelected,
    ungroupSelected,
    deleteSelected,
    handleAutoBranch,
    resetZoom,
    zoomIn,
    zoomOut,
    setActiveTool,
    setSelectedElementIds,
    setModalOpen,
    setIsCollabOpen,
  ]);

  // Clipboard Paste (Ctrl+V) for image data
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (evt) => {
              const dataUrl = evt.target.result;
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

                const newImageEl = {
                  id: `img-${Date.now()}`,
                  type: 'image',
                  x: Math.round(window.innerWidth / 2 - w / 2),
                  y: Math.round(window.innerHeight / 2 - h / 2),
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
                showToast('Image pasted from clipboard');
              };
              img.src = dataUrl;
            };
            reader.readAsDataURL(blob);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [elements, pushHistory, setSelectedElementIds, showToast]);

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden select-none ${
        isDarkMode ? 'bg-[#121212] text-white' : 'bg-[#f8f9fa] text-neutral-800'
      }`}
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
        setActiveTool={setActiveTool}
        isLocked={isLocked}
        setIsLocked={setIsLocked}
        isDarkMode={isDarkMode}
        onToggleProperties={() => setModalOpen('isPropertiesOpen', !isPropertiesOpen)}
        isPropertiesOpen={isPropertiesOpen}
        onImageUpload={() => fileInputRef.current?.click()}
        onOpenCollab={() => {
          if (!isCollabActive) {
            startCollaboration(null, showToast);
          } else {
            setIsCollabOpen(true);
          }
        }}
        connectedPeerCount={connectedPeerCount}
        isCollabActive={isCollabActive}
      />

      {/* Main Interactive HTML5 Whiteboard Canvas */}
      <WhiteboardCanvas fileInputRef={fileInputRef} />

      {/* Multiplayer Collaborator Cursors */}
      <CollaboratorCursors />

      {/* Inline Floating Text / Shape Label Editor */}
      <InlineTextEditor />

      {/* Inline Floating Table Cell Editor */}
      <TableCellEditor />

      {/* Intro Welcome Card */}
      {showIntro && (
        <IntroCard
          isDarkMode={isDarkMode}
          onSelectTool={(tool) => {
            setActiveTool(tool);
            setShowIntro(false);
          }}
          onDismiss={() => setShowIntro(false)}
        />
      )}

      {/* Properties & Style Customization Panel */}
      <PropertiesPanel
        isOpen={isPropertiesOpen}
        setIsOpen={(open) => setModalOpen('isPropertiesOpen', open)}
        selectedElement={selectedElement}
        selectedElements={selectedElements}
        currentStyle={currentStyle}
        onUpdateStyle={(patch) => updateSelectedProperties(patch)}
        onDuplicate={duplicateSelected}
        onDelete={deleteSelected}
        onBringForward={bringForward}
        onSendBackward={sendBackward}
        onGroup={groupSelected}
        onUngroup={ungroupSelected}
        onAlign={alignSelected}
        onAddTableRow={handleAddTableRow}
        onRemoveTableRow={handleRemoveTableRow}
        onAddTableCol={handleAddTableCol}
        onRemoveTableCol={handleRemoveTableCol}
        onToggleTableHeader={handleToggleTableHeader}
        onAddBranchChild={() => handleAutoBranch(false)}
        onAddBranchSibling={() => handleAutoBranch(true)}
        isDarkMode={isDarkMode}
      />

      {/* Zoom and Undo/Redo Floating Controls */}
      <ZoomControls
        zoom={zoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetZoom={resetZoom}
        onUndo={undo}
        onRedo={redo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        isDarkMode={isDarkMode}
      />

      {/* Menu Drawer */}
      <MenuModal
        isOpen={isMenuOpen}
        setIsOpen={(open) => setModalOpen('isMenuOpen', open)}
        onOpenExport={() => setModalOpen('isExportOpen', true)}
        onClearCanvas={clearCanvas}
        onLoadElements={loadScene}
        onSaveProject={() => setModalOpen('isExportOpen', true)}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        onOpenHelp={() => setModalOpen('isHelpOpen', true)}
      />

      {/* Export Diagram Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setModalOpen('isExportOpen', false)}
        elements={elements}
        isDarkMode={isDarkMode}
      />

      {/* Help & Hotkeys Modal */}
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setModalOpen('isHelpOpen', false)}
        isDarkMode={isDarkMode}
      />

      {/* Live Collaboration Share Modal */}
      <QrShareModal
        isOpen={isCollabOpen}
        onClose={() => setIsCollabOpen(false)}
        shareUrl={shareUrl}
        peerId={myPeerId}
        connectedCount={connectedPeerCount}
        isHost={isHost}
        onDisconnect={() => stopCollaboration(showToast)}
        isDarkMode={isDarkMode}
      />

      {/* Floating Animated Toast Notifications */}
      <Toast />

      {/* Vercel Analytics */}
      <Analytics />
    </div>
  );
}
