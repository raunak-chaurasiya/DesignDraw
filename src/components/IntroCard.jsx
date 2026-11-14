import {
  Square,
  Diamond,
  Circle,
  MoveRight,
  Pencil,
  Type,
} from 'lucide-react';
import { TOOLS } from '../constants';

const QUICK_SHAPES = [
  { id: TOOLS.RECTANGLE, label: 'Rectangle', icon: Square },
  { id: TOOLS.DIAMOND, label: 'Diamond', icon: Diamond },
  { id: TOOLS.ELLIPSE, label: 'Circle', icon: Circle },
  { id: TOOLS.ARROW, label: 'Arrow', icon: MoveRight },
  { id: TOOLS.PENCIL, label: 'Pencil', icon: Pencil },
  { id: TOOLS.TEXT, label: 'Text', icon: Type },
];

export default function IntroCard({
  visible = true,
  onSelectTool,
  onDismiss,
  isDarkMode = true,
}) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4 pointer-events-none select-none">
      <div
        className={`pointer-events-auto max-w-sm w-full rounded-2xl border p-6 text-center shadow-lg transition-colors ${
          isDarkMode
            ? 'bg-[#18181c] border-white/10 text-neutral-100 shadow-black/50'
            : 'bg-white border-neutral-200 text-neutral-900 shadow-neutral-200/50'
        }`}
      >
        {/* Context Tag */}
        <span className="inline-block text-[11px] font-mono text-neutral-400 mb-1.5">
          Freehand & diagramming
        </span>

        {/* Title */}
        <h1 className="text-xl font-medium tracking-tight mb-1.5">
          DesignDraw
        </h1>

        {/* Description */}
        <p className="text-xs text-neutral-400 mb-5 leading-relaxed">
          Sketch diagrams, link shapes with arrows, or draw freehand.
        </p>

        {/* Quick Shape Selectors */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {QUICK_SHAPES.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTool(item.id);
                  onDismiss();
                }}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-colors cursor-pointer ${
                  isDarkMode
                    ? 'bg-white/[0.03] border-white/8 hover:bg-white/[0.07] hover:border-white/15 text-neutral-300 hover:text-white'
                    : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100 hover:border-neutral-300 text-neutral-700 hover:text-neutral-900'
                }`}
              >
                <Icon size={18} strokeWidth={1.5} className="text-neutral-400" />
                <span className="text-xs font-normal">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Footer Hint */}
        <p className="text-[11px] text-neutral-500 leading-normal">
          Pick a tool above, click anywhere to start, or paste images with{' '}
          <kbd
            className={`px-1.5 py-0.5 rounded font-mono text-[10px] border ${
              isDarkMode ? 'bg-white/10 border-white/10 text-neutral-300' : 'bg-white border-neutral-300 text-neutral-700'
            }`}
          >
            Ctrl + V
          </kbd>
        </p>
      </div>
    </div>
  );
}
