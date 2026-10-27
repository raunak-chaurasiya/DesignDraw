import { useRef, useEffect } from 'react';
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

import CanvasShortcutsHandler from './components/handlers/CanvasShortcutsHandler';
import ToolShortcutsHandler from './components/handlers/ToolShortcutsHandler';
import ClipboardPasteHandler from './components/handlers/ClipboardPasteHandler';

import { useCanvasStore } from './store/useCanvasStore';
import { useCollabStore } from './store/useCollabStore';
import { Analytics } from '@vercel/analytics/react';

export default function App() {
  const fileInputRef = useRef(null);

  // Canvas Store State
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

  // Modals & Overlay Visibility
  const isMenuOpen = useCanvasStore((state) => state.isMenuOpen);
  const isExportOpen = useCanvasStore((state) => state.isExportOpen);
  const isHelpOpen = useCanvasStore((state) => state.isHelpOpen);
  const isPropertiesOpen = useCanvasStore((state) => state.isPropertiesOpen);
  const showIntro = useCanvasStore((state) => state.showIntro);

  // Collaboration State
  const isCollabOpen = useCollabStore((state) => state.isCollabOpen);
  const isCollabActive = useCollabStore((state) => state.isCollabActive);
  const connectedPeerCount = useCollabStore((state) => state.connectedPeerCount);
  const shareUrl = useCollabStore((state) => state.shareUrl);
  const isHost = useCollabStore((state) => state.isHost);

  // Store Actions
  const setActiveTool = useCanvasStore((state) => state.setActiveTool);
  const setIsLocked = useCanvasStore((state) => state.setIsLocked);
  const setIsDarkMode = useCanvasStore((state) => state.setIsDarkMode);
  const setShowGrid = useCanvasStore((state) => state.setShowGrid);
  const setShowIntro = useCanvasStore((state) => state.setShowIntro);
  const setModalOpen = useCanvasStore((state) => state.setModalOpen);
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
  const insertImage = useCanvasStore((state) => state.insertImage);
  const autoBranch = useCanvasStore((state) => state.autoBranch);
  const addTableRow = useCanvasStore((state) => state.addTableRow);
  const removeTableRow = useCanvasStore((state) => state.removeTableRow);
  const addTableCol = useCanvasStore((state) => state.addTableCol);
  const removeTableCol = useCanvasStore((state) => state.removeTableCol);
  const toggleTableHeader = useCanvasStore((state) => state.toggleTableHeader);
  const showToast = useCanvasStore((state) => state.showToast);

  const startCollaboration = useCollabStore((state) => state.startCollaboration);
  const stopCollaboration = useCollabStore((state) => state.stopCollaboration);
  const setIsCollabOpen = useCollabStore((state) => state.setIsCollabOpen);

  const selectedElement = elements.find((el) => el.id === selectedElementIds[0]) || null;
  const selectedElements = elements.filter((el) => selectedElementIds.includes(el.id));

  // Connect automatically if room ID is provided in query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      startCollaboration(room, showToast);
    }
  }, [startCollaboration, showToast]);

  // Insert image file from browser file input
  const handleImageFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      insertImage(evt.target.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden select-none ${
        isDarkMode ? 'bg-[#121212] text-white' : 'bg-[#f8f9fa] text-neutral-800'
      }`}
    >
      {/* Background Event & Shortcut Handlers */}
      <CanvasShortcutsHandler />
      <ToolShortcutsHandler onImageUpload={() => fileInputRef.current?.click()} />
      <ClipboardPasteHandler />

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

      {/* Interactive HTML5 Whiteboard Canvas */}
      <WhiteboardCanvas />

      {/* Multiplayer Live Collaborator Cursors */}
      <CollaboratorCursors />

      {/* Floating Text / Label Inline Editor */}
      <InlineTextEditor />

      {/* Floating Table Cell Inline Editor */}
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
        onAddTableRow={addTableRow}
        onRemoveTableRow={removeTableRow}
        onAddTableCol={addTableCol}
        onRemoveTableCol={removeTableCol}
        onToggleTableHeader={toggleTableHeader}
        onAddBranchChild={() => autoBranch(false)}
        onAddBranchSibling={() => autoBranch(true)}
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

      {/* Menu Modal Drawer */}
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
        connectedCount={connectedPeerCount}
        isHost={isHost}
        onDisconnect={() => stopCollaboration(showToast)}
        isDarkMode={isDarkMode}
      />

      {/* Floating Animated Toast Notifications */}
      <Toast />

      {/* Vercel Web Analytics */}
      <Analytics />
    </div>
  );
}
