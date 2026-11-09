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
  Table, 
  Network, 
  Image as ImageIcon, 
  Eraser, 
  Palette, 
  Users, 
  Radio
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
  { id: TOOLS.PENCIL, label: 'Pencil', icon: Pencil, shortcut: 'P' },
  { id: TOOLS.TEXT, label: 'Text', icon: Type, shortcut: 'T' },
  { id: TOOLS.STICKY, label: 'Sticky Note', icon: StickyNote, shortcut: 'N' },
  { id: TOOLS.TABLE, label: 'Table', icon: Table, shortcut: 'B' },
  { id: TOOLS.MINDMAP, label: 'Mind Map', icon: Network, shortcut: 'M' },
  { id: TOOLS.IMAGE, label: 'Image', icon: ImageIcon, shortcut: 'I' },
  { id: TOOLS.ERASER, label: 'Eraser', icon: Eraser, shortcut: 'E' },
];

export default function Toolbar({
  activeTool,
  setActiveTool,
  isLocked,
  setIsLocked,
  isDarkMode = true,
  onToggleProperties,
  isPropertiesOpen,
  onImageUpload,
  onOpenCollab,
  connectedPeerCount = 0,
  isCollabActive = false,
}) {
  return (
    <div className="fixed top-3 sm:top-4 left-[3.85rem] right-[6.8rem] sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-40 select-none max-w-full sm:max-w-none">
      <div
        className={`flex items-center gap-0.5 sm:gap-1 p-1 sm:p-1.5 rounded-xl border shadow-lg transition-colors overflow-x-auto touch-pan-x ${
          isDarkMode
            ? 'bg-[#18181c]/95 border-white/10 text-neutral-300'
            : 'bg-white/95 border-neutral-200 text-neutral-700 shadow-neutral-200/50'
        }`}
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {/* Lock toggle button */}
        <button
          onClick={() => setIsLocked(!isLocked)}
          title={isLocked ? 'Keep selected tool active' : 'Switch to select after drawing'}
          className={`relative p-1.5 sm:p-2 rounded-lg transition-colors flex items-center justify-center shrink-0 cursor-pointer ${
            isLocked
              ? isDarkMode ? 'bg-white/15 text-white' : 'bg-neutral-900 text-white'
              : isDarkMode
              ? 'hover:bg-white/5 text-neutral-400 hover:text-white'
              : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900'
          }`}
        >
          {isLocked ? <Lock size={15} strokeWidth={1.5} /> : <Unlock size={15} strokeWidth={1.5} />}
        </button>

        <div
          className={`h-4 w-[1px] mx-0.5 shrink-0 ${
            isDarkMode ? 'bg-white/10' : 'bg-neutral-200'
          }`}
        />

        {/* Tools list */}
        {TOOL_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTool === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === TOOLS.IMAGE && onImageUpload) {
                  onImageUpload();
                } else {
                  setActiveTool(item.id);
                }
              }}
              title={`${item.label} (${item.shortcut})`}
              className={`relative p-1.5 sm:p-2 rounded-lg transition-colors group flex items-center justify-center shrink-0 cursor-pointer ${
                isActive
                  ? isDarkMode
                    ? 'bg-white/15 text-white'
                    : 'bg-neutral-900 text-white'
                  : isDarkMode
                  ? 'hover:bg-white/5 text-neutral-400 hover:text-neutral-200'
                  : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Icon size={16} strokeWidth={isActive ? 1.8 : 1.5} />

              {/* Shortcut badge */}
              <span
                className={`hidden sm:inline-block absolute bottom-0.5 right-1 text-[8px] font-mono leading-none ${
                  isActive
                    ? 'text-white/70'
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

        {onToggleProperties && (
          <>
            <div
              className={`h-4 w-[1px] mx-0.5 shrink-0 ${
                isDarkMode ? 'bg-white/10' : 'bg-neutral-200'
              }`}
            />
            {/* Style Panel Toggle Button */}
            <button
              onClick={onToggleProperties}
              title={isPropertiesOpen ? 'Hide styles' : 'Show styles & colors'}
              className={`relative p-1.5 sm:p-2 rounded-lg transition-colors flex items-center justify-center shrink-0 cursor-pointer ${
                isPropertiesOpen
                  ? isDarkMode ? 'bg-white/15 text-white' : 'bg-neutral-900 text-white'
                  : isDarkMode
                  ? 'hover:bg-white/5 text-neutral-400 hover:text-white'
                  : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <Palette size={16} strokeWidth={1.5} />
            </button>
          </>
        )}

        {/* Live Collaboration Button */}
        {onOpenCollab && (
          <>
            <div
              className={`h-4 w-[1px] mx-0.5 shrink-0 ${
                isDarkMode ? 'bg-white/10' : 'bg-neutral-200'
              }`}
            />
            <button
              onClick={onOpenCollab}
              title={isCollabActive ? `Live Session (${connectedPeerCount + 1} users)` : 'Live Collaboration'}
              className={`relative px-2 sm:px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 text-xs font-normal cursor-pointer ${
                isCollabActive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : isDarkMode
                  ? 'hover:bg-white/5 text-neutral-400 hover:text-neutral-200'
                  : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {isCollabActive ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <Users size={14} strokeWidth={1.5} />
                  <span className="hidden sm:inline font-mono text-[11px]">{connectedPeerCount + 1}</span>
                </>
              ) : (
                <>
                  <Radio size={14} strokeWidth={1.5} />
                  <span className="hidden sm:inline">Collab</span>
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
