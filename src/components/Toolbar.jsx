import React from 'react';
import {
  Lock,
  Unlock,
  Hand,
  MousePointer,
  Square,
  Diamond,
  Circle,
  MoveRight,
  Minus,
  Pencil,
  Type,
  StickyNote,
  Eraser,
} from 'lucide-react';
import { TOOLS } from '../constants';

const TOOL_ITEMS = [
  { id: TOOLS.HAND, label: 'Hand (Panning)', icon: Hand, shortcut: 'H' },
  { id: TOOLS.SELECT, label: 'Selection', icon: MousePointer, shortcut: 'V' },
  { id: TOOLS.RECTANGLE, label: 'Rectangle', icon: Square, shortcut: 'R' },
  { id: TOOLS.DIAMOND, label: 'Diamond', icon: Diamond, shortcut: 'D' },
  { id: TOOLS.ELLIPSE, label: 'Ellipse', icon: Circle, shortcut: 'O' },
  { id: TOOLS.ARROW, label: 'Arrow', icon: MoveRight, shortcut: 'A' },
  { id: TOOLS.LINE, label: 'Line', icon: Minus, shortcut: 'L' },
  { id: TOOLS.PENCIL, label: 'Draw / Pencil', icon: Pencil, shortcut: 'P' },
  { id: TOOLS.TEXT, label: 'Text', icon: Type, shortcut: 'T' },
  { id: TOOLS.STICKY, label: 'Sticky Note', icon: StickyNote, shortcut: 'N' },
  { id: TOOLS.ERASER, label: 'Eraser', icon: Eraser, shortcut: 'E' },
];

export default function Toolbar({
  activeTool,
  setActiveTool,
  isLocked,
  setIsLocked,
  isDarkMode = true,
}) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 select-none">
      <div
        className={`flex items-center gap-1 p-1.5 rounded-xl border shadow-xl backdrop-blur-md transition-colors ${
          isDarkMode
            ? 'bg-[#232329]/90 border-[#34343e] text-neutral-300'
            : 'bg-white/95 border-neutral-200 text-neutral-700 shadow-neutral-300/40'
        }`}
      >
        {/* Lock toggle button */}
        <button
          onClick={() => setIsLocked(!isLocked)}
          title={isLocked ? 'Keep selected tool active' : 'Switch to select after drawing'}
          className={`relative p-2 rounded-lg transition-all flex items-center justify-center ${
            isLocked
              ? 'bg-[#6965db]/20 text-[#827fe2]'
              : isDarkMode
              ? 'hover:bg-[#2e2e38] text-neutral-400 hover:text-white'
              : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900'
          }`}
        >
          {isLocked ? <Lock size={17} /> : <Unlock size={17} />}
        </button>

        <div
          className={`h-5 w-[1px] mx-0.5 ${
            isDarkMode ? 'bg-[#3b3b47]' : 'bg-neutral-200'
          }`}
        />

        {/* Tools list */}
        {TOOL_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTool === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTool(item.id)}
              title={`${item.label} (${item.shortcut})`}
              className={`relative p-2 rounded-lg transition-all group flex items-center justify-center ${
                isActive
                  ? 'bg-[#6965db] text-white shadow-sm'
                  : isDarkMode
                  ? 'hover:bg-[#2e2e38] text-neutral-300 hover:text-white'
                  : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />

              {/* Shortcut badge */}
              <span
                className={`absolute bottom-0.5 right-1 text-[9px] font-mono leading-none ${
                  isActive
                    ? 'text-white/80'
                    : isDarkMode
                    ? 'text-neutral-500 group-hover:text-neutral-400'
                    : 'text-neutral-400 group-hover:text-neutral-600'
                }`}
              >
                {item.shortcut}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
