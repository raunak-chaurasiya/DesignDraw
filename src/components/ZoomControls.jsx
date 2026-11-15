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
    <div className="fixed bottom-16 sm:bottom-4 left-3 sm:left-4 z-30 flex items-center gap-1.5 sm:gap-2 select-none">
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
          aria-label="Zoom out (Ctrl + -)"
          className={`p-2 sm:p-1.5 min-w-[34px] min-h-[34px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-lg transition-[color,background-color,transform] duration-150 ease-out cursor-pointer focus-visible:ring-2 focus-visible:ring-[#6965db] focus-visible:outline-none motion-safe:active:scale-[0.96] ${
            isDarkMode ? 'hover:bg-white/5 text-neutral-300 hover:text-white' : 'hover:bg-neutral-100 text-neutral-700'
          }`}
        >
          <Minus size={14} strokeWidth={1.5} />
        </button>

        <button
          onClick={onResetZoom}
          title="Reset zoom (Ctrl + 0)"
          aria-label={`Reset zoom (current: ${zoomPercent}%)`}
          className={`px-1.5 sm:px-2 py-1 text-[11px] sm:text-xs font-mono tabular-nums font-normal rounded-lg transition-[color,background-color,transform] duration-150 ease-out min-w-[42px] sm:min-w-[52px] text-center cursor-pointer focus-visible:ring-2 focus-visible:ring-[#6965db] focus-visible:outline-none motion-safe:active:scale-[0.96] ${
            isDarkMode ? 'hover:bg-white/5 text-neutral-300 hover:text-white' : 'hover:bg-neutral-100 text-neutral-700'
          }`}
        >
          {zoomPercent}%
        </button>

        <button
          onClick={onZoomIn}
          title="Zoom in (Ctrl + +)"
          aria-label="Zoom in (Ctrl + +)"
          className={`p-2 sm:p-1.5 min-w-[34px] min-h-[34px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-lg transition-[color,background-color,transform] duration-150 ease-out cursor-pointer focus-visible:ring-2 focus-visible:ring-[#6965db] focus-visible:outline-none motion-safe:active:scale-[0.96] ${
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
          aria-label="Undo last canvas change (Ctrl + Z)"
          className={`p-2 sm:p-1.5 min-w-[34px] min-h-[34px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-lg transition-[color,background-color,opacity,transform] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-[#6965db] focus-visible:outline-none motion-safe:enabled:active:scale-[0.96] ${
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
          aria-label="Redo canvas change (Ctrl + Y)"
          className={`p-2 sm:p-1.5 min-w-[34px] min-h-[34px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-lg transition-[color,background-color,opacity,transform] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-[#6965db] focus-visible:outline-none motion-safe:enabled:active:scale-[0.96] ${
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
