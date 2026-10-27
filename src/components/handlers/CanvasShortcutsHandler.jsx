import { useEffect } from 'react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useCollabStore } from '../../store/useCollabStore';
import { TOOLS } from '../../constants';

export default function CanvasShortcutsHandler() {
  const isMenuOpen = useCanvasStore((state) => state.isMenuOpen);
  const isExportOpen = useCanvasStore((state) => state.isExportOpen);
  const isHelpOpen = useCanvasStore((state) => state.isHelpOpen);
  const isCollabOpen = useCollabStore((state) => state.isCollabOpen);
  const selectedElementIds = useCanvasStore((state) => state.selectedElementIds);

  const undo = useCanvasStore((state) => state.undo);
  const redo = useCanvasStore((state) => state.redo);
  const duplicateSelected = useCanvasStore((state) => state.duplicateSelected);
  const deleteSelected = useCanvasStore((state) => state.deleteSelected);
  const groupSelected = useCanvasStore((state) => state.groupSelected);
  const ungroupSelected = useCanvasStore((state) => state.ungroupSelected);
  const selectAll = useCanvasStore((state) => state.selectAll);
  const resetZoom = useCanvasStore((state) => state.resetZoom);
  const zoomIn = useCanvasStore((state) => state.zoomIn);
  const zoomOut = useCanvasStore((state) => state.zoomOut);
  const autoBranch = useCanvasStore((state) => state.autoBranch);
  const setSelectedElementIds = useCanvasStore((state) => state.setSelectedElementIds);
  const setActiveTool = useCanvasStore((state) => state.setActiveTool);
  const setModalOpen = useCanvasStore((state) => state.setModalOpen);
  const setIsCollabOpen = useCollabStore((state) => state.setIsCollabOpen);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept when user is typing in inputs or textareas
      const activeTag = document.activeElement?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag)) {
        return;
      }

      const isAnyModalOpen = isMenuOpen || isExportOpen || isHelpOpen || isCollabOpen;

      // Escape key handles modal closing or selection clearing
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

      // Suspend canvas shortcuts while any modal is open (CodeRabbit item 20)
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
        selectAll();
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

      // Zoom Controls: Ctrl+0, Ctrl++, Ctrl+-
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

      // Delete / Backspace
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
        autoBranch(false);
        return;
      }
      if (e.key === 'Enter' && selectedElementIds.length === 1) {
        e.preventDefault();
        autoBranch(true);
        return;
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
    undo,
    redo,
    duplicateSelected,
    deleteSelected,
    groupSelected,
    ungroupSelected,
    selectAll,
    resetZoom,
    zoomIn,
    zoomOut,
    autoBranch,
    setSelectedElementIds,
    setActiveTool,
    setModalOpen,
    setIsCollabOpen,
  ]);

  return null;
}
