import React from 'react';
import {
  Square,
  Diamond,
  Circle,
  MoveRight,
  Pencil,
  Type,
  StickyNote,
  Sparkles,
} from 'lucide-react';
import { TOOLS } from '../constants';

const QUICK_SHAPES = [
  { id: TOOLS.RECTANGLE, label: 'Rectangle', icon: Square, color: '#6965db' },
  { id: TOOLS.DIAMOND, label: 'Diamond', icon: Diamond, color: '#2f9e44' },
  { id: TOOLS.ELLIPSE, label: 'Circle', icon: Circle, color: '#f08c00' },
  { id: TOOLS.ARROW, label: 'Arrow', icon: MoveRight, color: '#e03131' },
  { id: TOOLS.PENCIL, label: 'Pencil', icon: Pencil, color: '#748ffc' },
  { id: TOOLS.TEXT, label: 'Text', icon: Type, color: '#fab005' },
];

export default function IntroCard({
  visible,
  onSelectTool,
  onDismiss,
  isDarkMode = true,
}) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4 pointer-events-none select-none animate-in fade-in zoom-in-95 duration-200">
      <div
        className={`pointer-events-auto max-w-md w-full rounded-3xl border p-6 md:p-8 text-center shadow-2xl backdrop-blur-xl transition-all ${
          isDarkMode
            ? 'bg-[#1e1e24]/90 border-white/10 text-white shadow-black/60'
            : 'bg-white/95 border-neutral-200 text-neutral-800 shadow-neutral-400/40'
        }`}
      >
        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#6965db]/20 text-[#827fe2] mb-3">
          <Sparkles size={13} />
          <span>Virtual Whiteboard</span>
        </div>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
          Welcome to DesignDraw 🎨
        </h1>

        {/* Description */}
        <p className="text-xs md:text-sm text-neutral-400 mb-6 leading-relaxed max-w-sm mx-auto">
          Draw diagrams, connect shapes, sketch freehand ideas, and export in crystal-clear JPG.
        </p>

        {/* Quick Shape Selectors */}
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {QUICK_SHAPES.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTool(item.id);
                  onDismiss();
                }}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border transition-all hover:scale-105 active:scale-95 group ${
                  isDarkMode
                    ? 'bg-white/5 border-white/10 hover:border-[#6965db] hover:bg-[#6965db]/15 text-neutral-200 hover:text-white'
                    : 'bg-neutral-50 border-neutral-200 hover:border-[#6965db] hover:bg-neutral-100 text-neutral-700 hover:text-neutral-900'
                }`}
              >
                <div
                  className="p-2 rounded-xl"
                  style={{ backgroundColor: `${item.color}20`, color: item.color }}
                >
                  <Icon size={18} strokeWidth={2.2} />
                </div>
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Footer Hint */}
        <p className="text-[11px] text-neutral-400">
          💡 Select any tool above, tap anywhere, or paste images with <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[10px] text-white">Ctrl + V</kbd>!
        </p>
      </div>
    </div>
  );
}
