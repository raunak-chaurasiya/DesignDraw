import { Minus, Plus, Undo2, Redo2 } from 'lucide-react';

export default function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  isDarkMode = true,
}) {
  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className="fixed bottom-3 sm:bottom-4 left-3 sm:left-4 z-30 flex items-center gap-1.5 sm:gap-2 select-none">
      {/* Zoom Widget */}
      <div
        className={`flex items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 py-1 rounded-xl border shadow-md backdrop-blur-md transition-colors ${
          isDarkMode
            ? 'bg-[#18181c]/95 border-white/10 text-neutral-300'
            : 'bg-white/95 border-neutral-200 text-neutral-700 shadow-neutral-200/50'
        }`}
      >
        <button
          onClick={onZoomOut}
          title="Zoom out (Ctrl + -)"
          className={`p-1 sm:p-1.5 rounded-lg transition-colors cursor-pointer ${
            isDarkMode ? 'hover:bg-white/5 text-neutral-300 hover:text-white' : 'hover:bg-neutral-100 text-neutral-700'
          }`}
        >
          <Minus size={14} strokeWidth={1.5} />
        </button>

        <button
          onClick={onResetZoom}
          title="Reset zoom (Ctrl + 0)"
          className={`px-1.5 sm:px-2 py-1 text-[11px] sm:text-xs font-mono font-normal rounded-lg transition-colors min-w-[42px] sm:min-w-[52px] text-center cursor-pointer ${
            isDarkMode ? 'hover:bg-white/5 text-neutral-300 hover:text-white' : 'hover:bg-neutral-100 text-neutral-700'
          }`}
        >
          {zoomPercent}%
        </button>

        <button
          onClick={onZoomIn}
          title="Zoom in (Ctrl + +)"
          className={`p-1 sm:p-1.5 rounded-lg transition-colors cursor-pointer ${
            isDarkMode ? 'hover:bg-white/5 text-neutral-300 hover:text-white' : 'hover:bg-neutral-100 text-neutral-700'
          }`}
        >
          <Plus size={14} strokeWidth={1.5} />
        </button>
      </div>

      {/* Undo & Redo buttons */}
      <div
        className={`flex items-center gap-1 p-1 rounded-xl border shadow-md backdrop-blur-md transition-colors ${
          isDarkMode
            ? 'bg-[#18181c]/95 border-white/10 text-neutral-300'
            : 'bg-white/95 border-neutral-200 text-neutral-700 shadow-neutral-200/50'
        }`}
      >
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl + Z)"
          className={`p-1.5 rounded-lg transition-colors ${
            !canUndo
              ? 'opacity-30 cursor-not-allowed'
              : isDarkMode
              ? 'hover:bg-white/5 text-neutral-300 hover:text-white cursor-pointer'
              : 'hover:bg-neutral-100 text-neutral-700 cursor-pointer'
          }`}
        >
          <Undo2 size={15} strokeWidth={1.5} />
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl + Y)"
          className={`p-1.5 rounded-lg transition-colors ${
            !canRedo
              ? 'opacity-30 cursor-not-allowed'
              : isDarkMode
              ? 'hover:bg-white/5 text-neutral-300 hover:text-white cursor-pointer'
              : 'hover:bg-neutral-100 text-neutral-700 cursor-pointer'
          }`}
        >
          <Redo2 size={15} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
