import { useRef, useEffect } from 'react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { Check, X } from 'lucide-react';

export default function TableCellEditor() {
  const editingCell = useCanvasStore((state) => state.editingCell);
  const finishEditingCell = useCanvasStore((state) => state.finishEditingCell);
  const isDarkMode = useCanvasStore((state) => state.isDarkMode);
  const zoom = useCanvasStore((state) => state.zoom);
  const pan = useCanvasStore((state) => state.pan);

  const cellInputRef = useRef(null);

  useEffect(() => {
    if (editingCell && cellInputRef.current) {
      const timer = setTimeout(() => {
        if (cellInputRef.current) {
          cellInputRef.current.focus();
          cellInputRef.current.select();
        }
      }, 40);
      return () => clearTimeout(timer);
    }
  }, [editingCell]);

  if (!editingCell) return null;

  const screenX = editingCell.cellX * zoom + pan.x;
  const screenY = editingCell.cellY * zoom + pan.y;
  const screenW = Math.max(80, editingCell.cellWidth * zoom);
  const screenH = Math.max(34, editingCell.cellHeight * zoom);

  const handleKeyDown = (e) => {
    e.stopPropagation();

    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      finishEditingCell(true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      finishEditingCell(false);
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: `${screenX}px`,
        top: `${screenY}px`,
        width: `${screenW}px`,
        height: `${screenH}px`,
        zIndex: 60,
      }}
      className="flex items-center select-auto"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <input
        ref={cellInputRef}
        type="text"
        value={editingCell.text}
        onChange={(e) => {
          useCanvasStore.setState({
            editingCell: { ...editingCell, text: e.target.value },
          });
        }}
        onKeyDown={handleKeyDown}
        placeholder="Cell text..."
        style={{
          fontSize: `${Math.max(12, (editingCell.fontSize || 18) * zoom)}px`,
          fontFamily: editingCell.fontFamily || "'Patrick Hand', cursive",
          color: isDarkMode ? '#ffffff' : '#1e1e1e',
          backgroundColor: isDarkMode ? '#1e1e24' : '#ffffff',
        }}
        className="w-full h-full px-2 border-2 border-[#6965db] rounded outline-none shadow-xl"
      />
      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
        <button
          onClick={() => finishEditingCell(false)}
          title="Cancel"
          className="p-0.5 hover:bg-neutral-500/20 rounded text-neutral-400 hover:text-white"
        >
          <X size={12} />
        </button>
        <button
          onClick={() => finishEditingCell(true)}
          title="Save"
          className="p-0.5 bg-[#6965db] text-white rounded hover:bg-[#5b57d1]"
        >
          <Check size={12} />
        </button>
      </div>
    </div>
  );
}
