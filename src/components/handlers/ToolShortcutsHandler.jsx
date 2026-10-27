import { useEffect } from 'react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useCollabStore } from '../../store/useCollabStore';
import { TOOLS } from '../../constants';

export default function ToolShortcutsHandler({ onImageUpload }) {
  const setActiveTool = useCanvasStore((state) => state.setActiveTool);
  const isMenuOpen = useCanvasStore((state) => state.isMenuOpen);
  const isExportOpen = useCanvasStore((state) => state.isExportOpen);
  const isHelpOpen = useCanvasStore((state) => state.isHelpOpen);
  const isCollabOpen = useCollabStore((state) => state.isCollabOpen);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Do not intercept if typing in an editable field or if a modal dialog is open
      const activeTag = document.activeElement?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag)) {
        return;
      }

      if (isMenuOpen || isExportOpen || isHelpOpen || isCollabOpen) {
        return;
      }

      // Single-key shortcuts only without Ctrl, Meta, or Alt modifiers
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

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
          if (onImageUpload) {
            onImageUpload();
          }
          break;
        case 'e':
          setActiveTool(TOOLS.ERASER);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    setActiveTool,
    onImageUpload,
    isMenuOpen,
    isExportOpen,
    isHelpOpen,
    isCollabOpen,
  ]);

  return null;
}
