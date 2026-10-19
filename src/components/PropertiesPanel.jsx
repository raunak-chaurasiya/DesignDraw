import React from 'react';
import {
  Copy,
  Trash2,
  ArrowUpToLine,
  ArrowDownToLine,
  Sliders,
  Type as TypeIcon,
} from 'lucide-react';
import {
  STROKE_COLORS,
  BG_COLORS,
  STROKE_WIDTHS,
  STROKE_STYLES,
  FILL_STYLES,
  ROUGHNESS_LEVELS,
  FONT_SIZES,
} from '../constants';

export default function PropertiesPanel({
  selectedElement,
  currentStyle,
  onUpdateStyle,
  onDuplicate,
  onDelete,
  onBringForward,
  onSendBackward,
  isDarkMode = true,
  isOpen,
  setIsOpen,
}) {
  const activeStyle = selectedElement || currentStyle;
  const isTextOrSticky = selectedElement?.type === 'text' || selectedElement?.type === 'sticky';
  const isLineOrArrowOrPencil = ['line', 'arrow', 'pencil'].includes(selectedElement?.type);

  const update = (key, value) => {
    onUpdateStyle(key, value);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`fixed top-16 left-4 z-30 w-64 max-h-[calc(100vh-5rem)] overflow-y-auto rounded-2xl border p-4 shadow-2xl backdrop-blur-md transition-all ${
        isDarkMode
          ? 'bg-[#232329]/95 border-[#34343e] text-neutral-200'
          : 'bg-white/95 border-neutral-200 text-neutral-800 shadow-neutral-300/40'
      }`}
    >
      <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
        <span className="text-xs font-semibold tracking-wider uppercase text-neutral-400 flex items-center gap-1.5">
          <Sliders size={14} className="text-[#827fe2]" />
          {selectedElement ? `${selectedElement.type.toUpperCase()} STYLES` : 'DEFAULT STYLES'}
        </span>
        {selectedElement && (
          <div className="flex items-center gap-1">
            <button
              onClick={onDuplicate}
              title="Duplicate (Ctrl+D)"
              className={`p-1.5 rounded-lg transition-colors ${
                isDarkMode ? 'hover:bg-[#2f2f3a] text-neutral-300' : 'hover:bg-neutral-100 text-neutral-600'
              }`}
            >
              <Copy size={14} />
            </button>
            <button
              onClick={onDelete}
              title="Delete (Del)"
              className={`p-1.5 rounded-lg transition-colors hover:bg-red-500/20 text-red-400 hover:text-red-300`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4 text-xs">
        {/* Stroke Color */}
        <div>
          <label className="block mb-1.5 font-medium text-neutral-400">Stroke Color</label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {STROKE_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => update('strokeColor', color)}
                className={`w-6 h-6 rounded-md border transition-transform ${
                  activeStyle.strokeColor === color ? 'scale-110 ring-2 ring-[#6965db]' : 'hover:scale-105'
                }`}
                style={{
                  backgroundColor: color,
                  borderColor: color === '#ffffff' ? '#666' : 'transparent',
                }}
                title={color}
              />
            ))}
            {/* Custom Color Input */}
            <label
              title="Custom stroke color"
              className="w-6 h-6 rounded-md border border-dashed border-neutral-400 flex items-center justify-center cursor-pointer hover:border-white relative overflow-hidden"
            >
              <span className="text-[10px] leading-none">+</span>
              <input
                type="color"
                value={activeStyle.strokeColor || '#ffffff'}
                onChange={(e) => update('strokeColor', e.target.value)}
                className="opacity-0 absolute inset-0 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Background / Fill Color (for shapes and sticky notes) */}
        {!isLineOrArrowOrPencil && (
          <div>
            <label className="block mb-1.5 font-medium text-neutral-400">Background Fill</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {BG_COLORS.map((color) => {
                const isTrans = color === 'transparent';
                return (
                  <button
                    key={color}
                    onClick={() => update('backgroundColor', color)}
                    className={`w-6 h-6 rounded-md border relative transition-transform ${
                      activeStyle.backgroundColor === color
                        ? 'scale-110 ring-2 ring-[#6965db]'
                        : 'hover:scale-105'
                    } ${isDarkMode ? 'border-[#444]' : 'border-neutral-300'}`}
                    style={{
                      backgroundColor: isTrans ? 'transparent' : color,
                    }}
                    title={isTrans ? 'Transparent' : color}
                  >
                    {isTrans && (
                      <span className="absolute inset-0 flex items-center justify-center text-red-500 font-bold text-xs">
                        /
                      </span>
                    )}
                  </button>
                );
              })}
              {/* Custom background color input */}
              <label
                title="Custom background color"
                className="w-6 h-6 rounded-md border border-dashed border-neutral-400 flex items-center justify-center cursor-pointer hover:border-white relative overflow-hidden"
              >
                <span className="text-[10px] leading-none">+</span>
                <input
                  type="color"
                  value={
                    activeStyle.backgroundColor && activeStyle.backgroundColor !== 'transparent'
                      ? activeStyle.backgroundColor
                      : '#d0ebff'
                  }
                  onChange={(e) => update('backgroundColor', e.target.value)}
                  className="opacity-0 absolute inset-0 cursor-pointer"
                />
              </label>
            </div>
          </div>
        )}

        {/* Fill Style */}
        {!isLineOrArrowOrPencil && selectedElement?.type !== 'sticky' && (
          <div>
            <label className="block mb-1.5 font-medium text-neutral-400">Fill Style</label>
            <div className="grid grid-cols-4 gap-1 p-1 bg-black/20 rounded-lg">
              {FILL_STYLES.map((fs) => (
                <button
                  key={fs.value}
                  onClick={() => update('fillStyle', fs.value)}
                  className={`py-1 text-center rounded text-[11px] capitalize transition-all ${
                    activeStyle.fillStyle === fs.value
                      ? 'bg-[#6965db] text-white font-medium shadow-sm'
                      : isDarkMode
                      ? 'hover:bg-white/10 text-neutral-400'
                      : 'hover:bg-neutral-200 text-neutral-600'
                  }`}
                >
                  {fs.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stroke Width */}
        <div>
          <label className="block mb-1.5 font-medium text-neutral-400">Stroke Width</label>
          <div className="grid grid-cols-3 gap-1 p-1 bg-black/20 rounded-lg">
            {STROKE_WIDTHS.map((sw) => (
              <button
                key={sw.value}
                onClick={() => update('strokeWidth', sw.value)}
                className={`py-1 text-center rounded text-[11px] transition-all flex items-center justify-center gap-1 ${
                  activeStyle.strokeWidth === sw.value
                    ? 'bg-[#6965db] text-white font-medium shadow-sm'
                    : isDarkMode
                    ? 'hover:bg-white/10 text-neutral-400'
                    : 'hover:bg-neutral-200 text-neutral-600'
                }`}
              >
                <div
                  className="bg-current rounded-full"
                  style={{ width: 14, height: Math.max(2, sw.value) }}
                />
                <span>{sw.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stroke Style */}
        <div>
          <label className="block mb-1.5 font-medium text-neutral-400">Stroke Style</label>
          <div className="grid grid-cols-3 gap-1 p-1 bg-black/20 rounded-lg">
            {STROKE_STYLES.map((st) => (
              <button
                key={st.value}
                onClick={() => update('strokeStyle', st.value)}
                className={`py-1 text-center rounded text-[11px] capitalize transition-all ${
                  activeStyle.strokeStyle === st.value
                    ? 'bg-[#6965db] text-white font-medium shadow-sm'
                    : isDarkMode
                    ? 'hover:bg-white/10 text-neutral-400'
                    : 'hover:bg-neutral-200 text-neutral-600'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sloppiness / Roughness */}
        <div>
          <label className="block mb-1.5 font-medium text-neutral-400">Sloppiness (Hand-drawn)</label>
          <div className="grid grid-cols-3 gap-1 p-1 bg-black/20 rounded-lg">
            {ROUGHNESS_LEVELS.map((rl) => (
              <button
                key={rl.value}
                onClick={() => update('roughness', rl.value)}
                className={`py-1 text-center rounded text-[11px] transition-all ${
                  activeStyle.roughness === rl.value
                    ? 'bg-[#6965db] text-white font-medium shadow-sm'
                    : isDarkMode
                    ? 'hover:bg-white/10 text-neutral-400'
                    : 'hover:bg-neutral-200 text-neutral-600'
                }`}
              >
                {rl.label}
              </button>
            ))}
          </div>
        </div>

        {/* Typography Controls for text and sticky notes */}
        {isTextOrSticky && (
          <div className="pt-2 border-t border-white/10">
            <label className="block mb-1.5 font-medium text-neutral-400 flex items-center gap-1">
              <TypeIcon size={12} /> Font Size
            </label>
            <div className="grid grid-cols-4 gap-1 p-1 bg-black/20 rounded-lg">
              {FONT_SIZES.map((fs) => (
                <button
                  key={fs.value}
                  onClick={() => update('fontSize', fs.value)}
                  className={`py-1 text-center rounded text-[11px] font-bold transition-all ${
                    activeStyle.fontSize === fs.value
                      ? 'bg-[#6965db] text-white shadow-sm'
                      : isDarkMode
                      ? 'hover:bg-white/10 text-neutral-400'
                      : 'hover:bg-neutral-200 text-neutral-600'
                  }`}
                >
                  {fs.label}
                </button>
              ))}
            </div>

            <div className="mt-2">
              <label className="block mb-1.5 font-medium text-neutral-400">Font Family</label>
              <select
                value={activeStyle.fontFamily || "'Patrick Hand', cursive"}
                onChange={(e) => update('fontFamily', e.target.value)}
                className={`w-full py-1 px-2 rounded-lg border text-xs outline-none ${
                  isDarkMode
                    ? 'bg-[#1e1e24] border-[#34343e] text-neutral-200'
                    : 'bg-neutral-50 border-neutral-300 text-neutral-800'
                }`}
              >
                <option value="'Patrick Hand', cursive">Patrick Hand (Hand-drawn)</option>
                <option value="'Architects Daughter', cursive">Architects Daughter</option>
                <option value="'Inter', sans-serif">Inter (Clean Sans)</option>
                <option value="'Fira Code', monospace">Fira Code (Monospace)</option>
              </select>
            </div>
          </div>
        )}

        {/* Opacity slider */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="font-medium text-neutral-400">Opacity</label>
            <span className="text-[11px] text-neutral-400">{activeStyle.opacity || 100}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            value={activeStyle.opacity || 100}
            onChange={(e) => update('opacity', Number(e.target.value))}
            className="w-full accent-[#6965db] h-1.5 bg-neutral-600 rounded-lg cursor-pointer"
          />
        </div>

        {/* Layering controls when element is selected */}
        {selectedElement && (
          <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
            <button
              onClick={onBringForward}
              title="Bring Forward"
              className={`flex-1 py-1 px-2 rounded-lg border flex items-center justify-center gap-1 text-[11px] transition-colors ${
                isDarkMode
                  ? 'border-[#3a3a46] hover:bg-[#2e2e38] text-neutral-300'
                  : 'border-neutral-200 hover:bg-neutral-100 text-neutral-700'
              }`}
            >
              <ArrowUpToLine size={13} /> Forward
            </button>
            <button
              onClick={onSendBackward}
              title="Send Backward"
              className={`flex-1 py-1 px-2 rounded-lg border flex items-center justify-center gap-1 text-[11px] transition-colors ${
                isDarkMode
                  ? 'border-[#3a3a46] hover:bg-[#2e2e38] text-neutral-300'
                  : 'border-neutral-200 hover:bg-neutral-100 text-neutral-700'
              }`}
            >
              <ArrowDownToLine size={13} /> Backward
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
