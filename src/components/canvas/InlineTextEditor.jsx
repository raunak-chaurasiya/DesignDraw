import { useRef, useEffect } from 'react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { Check, X } from 'lucide-react';

export default function InlineTextEditor() {
  const editingText = useCanvasStore((state) => state.editingText);
  const finishEditingText = useCanvasStore((state) => state.finishEditingText);
  const cancelEditingText = useCanvasStore((state) => state.cancelEditingText);
  const isDarkMode = useCanvasStore((state) => state.isDarkMode);
  const zoom = useCanvasStore((state) => state.zoom);
  const pan = useCanvasStore((state) => state.pan);
  const currentStyle = useCanvasStore((state) => state.currentStyle);

  const textAreaRef = useRef(null);

  useEffect(() => {
    if (editingText && textAreaRef.current) {
      const timer = setTimeout(() => {
        if (textAreaRef.current) {
          textAreaRef.current.focus();
          textAreaRef.current.select();
        }
      }, 40);
      return () => clearTimeout(timer);
    }
  }, [editingText]);

  if (!editingText) return null;

  const screenX = editingText.x * zoom + pan.x;
  const screenY = editingText.y * zoom + pan.y;

  const handleKeyDown = (e) => {
    // Stop propagation so global canvas hotkeys don't intercept editor keys
    e.stopPropagation();

    if (e.key === 'Enter' && !e.shiftKey && editingText.type !== 'sticky') {
      e.preventDefault();
      finishEditingText();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditingText();
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: `${screenX}px`,
        top: `${screenY}px`,
        transform: `scale(${zoom})`,
        transformOrigin: 'top left',
        zIndex: 60,
      }}
      className="flex flex-col gap-1.5 select-auto"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <textarea
        ref={textAreaRef}
        value={editingText.text}
        onChange={(e) => {
          useCanvasStore.setState({
            editingText: { ...editingText, text: e.target.value },
          });
        }}
        onKeyDown={handleKeyDown}
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
        <span className="text-neutral-400">
          {editingText.type === 'sticky' ? 'Shift+Enter for newline' : 'Enter to save • Esc to cancel'}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => cancelEditingText()}
            title="Cancel (Esc)"
            className="p-1 hover:bg-white/10 rounded text-neutral-400 hover:text-white"
          >
            <X size={13} />
          </button>
          <button
            onClick={() => finishEditingText()}
            title="Done (Enter)"
            className="p-1 bg-[#6965db] text-white rounded hover:bg-[#5b57d1] flex items-center gap-1 font-semibold px-2"
          >
            <Check size={13} /> Done
          </button>
        </div>
      </div>
    </div>
  );
}
