import React from 'react';
import { X, Keyboard } from 'lucide-react';

const SHORTCUTS = [
  { key: 'V / 1', desc: 'Selection tool' },
  { key: 'H', desc: 'Hand (pan) tool' },
  { key: 'R / 2', desc: 'Rectangle tool' },
  { key: 'D / 3', desc: 'Diamond tool' },
  { key: 'O / 4', desc: 'Ellipse tool' },
  { key: 'A / 5', desc: 'Arrow tool' },
  { key: 'L / 6', desc: 'Line tool' },
  { key: 'P / 7', desc: 'Draw / Pencil tool' },
  { key: 'T / 8', desc: 'Text tool' },
  { key: 'N / 9', desc: 'Sticky note tool' },
  { key: 'E / 0', desc: 'Eraser tool' },
  { key: 'Space + Drag', desc: 'Pan canvas' },
  { key: 'Mouse Wheel', desc: 'Zoom in / Zoom out' },
  { key: 'Ctrl + Z', desc: 'Undo' },
  { key: 'Ctrl + Y', desc: 'Redo' },
  { key: 'Ctrl + D', desc: 'Duplicate selected' },
  { key: 'Delete / Backspace', desc: 'Delete selected element' },
  { key: 'Esc', desc: 'Deselect / Cancel tool' },
];

export default function HelpModal({ isOpen, onClose, isDarkMode = true }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl transition-all ${
          isDarkMode
            ? 'bg-[#1e1e24] border-[#34343e] text-neutral-100'
            : 'bg-white border-neutral-200 text-neutral-900 shadow-neutral-300/50'
        }`}
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#6965db]/20 text-[#827fe2]">
              <Keyboard size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold">Keyboard Shortcuts</h2>
              <p className="text-xs text-neutral-400">Work faster with whiteboard hotkeys</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs max-h-[380px] overflow-y-auto pr-1">
          {SHORTCUTS.map((sc, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2 rounded-lg bg-black/20"
            >
              <span className="text-neutral-300">{sc.desc}</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[11px] font-semibold text-[#827fe2]">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#6965db] text-white hover:bg-[#5b57d1] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
