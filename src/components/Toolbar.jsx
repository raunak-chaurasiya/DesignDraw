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
    <div className="fixed bottom-3 sm:bottom-auto sm:top-4 left-1/2 -translate-x-1/2 z-40 select-none max-w-[calc(100vw-1.5rem)] sm:max-w-none pb-[env(safe-area-inset-bottom,0px)]">
      <div
        className={`flex items-center gap-0.5 sm:gap-1 px-1.5 py-1 sm:p-1.5 rounded-2xl border shadow-xl backdrop-blur-md transition-colors overflow-x-auto touch-pan-x ${
          isDarkMode
            ? 'bg-[#18181c]/95 border-white/10 text-neutral-300 shadow-black/40'
            : 'bg-white/95 border-neutral-200 text-neutral-700 shadow-neutral-300/50'
        }`}
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {/* Lock toggle button */}
        <button
          onClick={() => setIsLocked(!isLocked)}
          title={isLocked ? 'Keep selected tool active' : 'Switch to select after drawing'}
          aria-label={isLocked ? 'Unlock tool (switch to selection after drawing)' : 'Lock tool (keep active)'}
          aria-pressed={isLocked}
          className={`relative p-2 rounded-xl transition-[color,background-color,border-color,transform] duration-150 ease-out flex items-center justify-center shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#6965db] focus-visible:outline-none motion-safe:active:scale-[0.96] ${
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
              aria-label={`${item.label} (${item.shortcut})`}
              aria-pressed={isActive}
              className={`relative p-2 rounded-xl transition-[color,background-color,border-color,transform] duration-150 ease-out group flex items-center justify-center shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#6965db] focus-visible:outline-none motion-safe:active:scale-[0.96] ${
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
              aria-label={isPropertiesOpen ? 'Hide styling panel' : 'Show styling panel'}
              aria-expanded={isPropertiesOpen}
              className={`relative p-2 rounded-xl transition-[color,background-color,border-color,transform] duration-150 ease-out flex items-center justify-center shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#6965db] focus-visible:outline-none motion-safe:active:scale-[0.96] ${
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
              aria-label={isCollabActive ? `Live session (${connectedPeerCount + 1} users)` : 'Live collaboration'}
              className={`relative px-2.5 py-1.5 rounded-xl transition-[color,background-color,border-color,transform] duration-150 ease-out flex items-center gap-1.5 shrink-0 text-xs font-normal cursor-pointer focus-visible:ring-2 focus-visible:ring-[#6965db] focus-visible:outline-none motion-safe:active:scale-[0.96] ${
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
