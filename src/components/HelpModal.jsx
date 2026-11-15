import { X } from 'lucide-react';

const SHORTCUTS = [
  { key: 'V', desc: 'Select' },
  { key: 'H', desc: 'Pan' },
  { key: 'R', desc: 'Rectangle' },
  { key: 'D', desc: 'Diamond' },
  { key: 'O', desc: 'Ellipse' },
  { key: 'A', desc: 'Arrow' },
  { key: 'L', desc: 'Line' },
  { key: 'P', desc: 'Pencil' },
  { key: 'T', desc: 'Text' },
  { key: 'N', desc: 'Sticky note' },
  { key: 'B', desc: 'Table' },
  { key: 'M', desc: 'Mind map' },
  { key: 'Tab', desc: 'Add child branch' },
  { key: 'Enter', desc: 'Add sibling branch' },
  { key: 'I', desc: 'Insert image' },
  { key: 'Ctrl + V', desc: 'Paste image' },
  { key: 'E', desc: 'Eraser' },
  { key: 'Space + Drag', desc: 'Pan canvas' },
  { key: 'Ctrl + Wheel', desc: 'Zoom' },
  { key: 'Ctrl + 0', desc: 'Reset zoom' },
  { key: 'Ctrl + Z', desc: 'Undo' },
  { key: 'Ctrl + Y', desc: 'Redo' },
  { key: 'Ctrl + A', desc: 'Select all' },
  { key: 'Ctrl + G', desc: 'Group' },
  { key: 'Ctrl + Shift + G', desc: 'Ungroup' },
  { key: 'Shift + Click', desc: 'Multi-select' },
  { key: 'Ctrl + D', desc: 'Duplicate' },
  { key: 'Delete', desc: 'Delete' },
  { key: 'Esc', desc: 'Deselect tool' },
];

export default function HelpModal({ isOpen, onClose, isDarkMode = true }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
        className={`w-full max-w-md max-h-[92vh] flex flex-col rounded-2xl border p-5 shadow-xl transition-colors ${
          isDarkMode
            ? 'bg-[#18181c] border-white/10 text-neutral-100 shadow-black/60'
            : 'bg-white border-neutral-200 text-neutral-900 shadow-neutral-300/40'
        }`}
      >
        <div className={`flex items-center justify-between pb-3 border-b mb-3 ${
          isDarkMode ? 'border-white/10' : 'border-neutral-200'
        }`}>
          <div>
            <h2 id="help-modal-title" className="text-base font-medium">Shortcuts</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Quick hotkeys for tools and canvas actions</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close keyboard shortcuts"
            className={`p-1.5 rounded-lg transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#6965db] focus-visible:outline-none ${
              isDarkMode ? 'text-neutral-400 hover:text-white hover:bg-white/10' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs max-h-[58vh] sm:max-h-[380px] overflow-y-auto overscroll-contain pr-1" style={{ scrollbarWidth: 'thin' }}>
          {SHORTCUTS.map((sc, i) => (
            <div
              key={i}
              className={`flex items-center justify-between px-2.5 py-2 rounded-lg border ${
                isDarkMode ? 'bg-white/[0.02] border-white/5 text-neutral-300' : 'bg-neutral-50 border-neutral-200 text-neutral-700'
              }`}
            >
              <span>{sc.desc}</span>
              <kbd
                className={`px-1.5 py-0.5 rounded font-mono text-[10px] border ${
                  isDarkMode
                    ? 'bg-white/10 border-white/10 text-neutral-300'
                    : 'bg-white border-neutral-300 text-neutral-800'
                }`}
              >
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className={`mt-4 pt-3 border-t flex justify-end ${
          isDarkMode ? 'border-white/10' : 'border-neutral-200'
        }`}>
          <button
            onClick={onClose}
            className={`px-3.5 py-1.5 text-xs font-normal rounded-lg transition-colors cursor-pointer ${
              isDarkMode
                ? 'bg-white/10 hover:bg-white/15 text-neutral-200'
                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
