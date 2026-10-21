import React from 'react';
import {
  Copy,
  Trash2,
  ArrowUpToLine,
  ArrowDownToLine,
  Sliders,
  Type as TypeIcon,
  X,
  Group,
  Ungroup,
  AlignLeft,
  AlignCenter,
  AlignRight,
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
  selectedElements = [],
  currentStyle,
  onUpdateStyle,
  onDuplicate,
  onDelete,
  onBringForward,
  onSendBackward,
  onGroup,
  onUngroup,
  onAlign,
  onAddTableRow,
  onRemoveTableRow,
  onAddTableCol,
  onRemoveTableCol,
  onToggleTableHeader,
  onAddBranchChild,
  onAddBranchSibling,
  isDarkMode = true,
  isOpen,
  setIsOpen,
}) {
  const isMulti = selectedElements.length > 1;
  const isGrouped =
    (isMulti || selectedElement?.groupId) &&
    selectedElements.length > 0 &&
    selectedElements.every((el) => el.groupId && el.groupId === selectedElements[0].groupId);

  const activeStyle = selectedElement || currentStyle;
  const isImage = selectedElement?.type === 'image';
  const isTable = selectedElement?.type === 'table';
  const isTextOrSticky = ['text', 'sticky', 'table', 'rectangle', 'ellipse', 'diamond'].includes(selectedElement?.type);
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
        <span className="text-xs font-semibold tracking-wider uppercase text-neutral-400 flex items-center gap-1.5 truncate pr-1">
          <Sliders size={14} className="text-[#827fe2] shrink-0" />
          {isGrouped
            ? `GROUP (${selectedElements.length})`
            : isMulti
            ? `MULTI (${selectedElements.length} ITEMS)`
            : selectedElement
            ? `${selectedElement.type.toUpperCase()} STYLES`
            : 'DEFAULT STYLES'}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {selectedElements.length > 0 && (
            <>
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
                className="p-1.5 rounded-lg transition-colors hover:bg-red-500/20 text-red-400 hover:text-red-300"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
          <button
            onClick={() => setIsOpen(false)}
            title="Close styles"
            className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Grouping & Alignment Section (Shows when multiple items or a group is selected) */}
      {(isMulti || isGrouped) && (
        <div className="pb-3 border-b border-white/10 mb-3 space-y-2.5">
          {/* Group / Ungroup Action Button */}
          <div className="flex items-center gap-1.5">
            {isGrouped ? (
              <button
                onClick={onUngroup}
                title="Ungroup selected elements (Ctrl+Shift+G)"
                className="flex-1 py-1.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors border border-amber-500/25 shadow-sm"
              >
                <Ungroup size={14} />
                <span>Ungroup (Ctrl+Shift+G)</span>
              </button>
            ) : (
              <button
                onClick={onGroup}
                title="Group selected elements together (Ctrl+G)"
                className="flex-1 py-1.5 px-3 rounded-xl bg-[#6965db]/20 hover:bg-[#6965db]/30 text-[#827fe2] font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors border border-[#6965db]/30 shadow-sm"
              >
                <Group size={14} />
                <span>Group (Ctrl+G)</span>
              </button>
            )}
          </div>

          {/* Quick Alignment Toolbar */}
          {onAlign && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-neutral-400 text-[11px]">Align Items</span>
              </div>
              <div className="grid grid-cols-6 gap-1 p-1 bg-black/25 rounded-lg text-center">
                <button
                  onClick={() => onAlign('left')}
                  title="Align Left"
                  className="py-1 rounded hover:bg-white/10 text-neutral-300 hover:text-white transition-colors text-xs font-mono font-bold"
                >
                  ⇤
                </button>
                <button
                  onClick={() => onAlign('center-h')}
                  title="Align Center (Horizontal)"
                  className="py-1 rounded hover:bg-white/10 text-neutral-300 hover:text-white transition-colors text-xs font-mono font-bold"
                >
                  ⇥⇤
                </button>
                <button
                  onClick={() => onAlign('right')}
                  title="Align Right"
                  className="py-1 rounded hover:bg-white/10 text-neutral-300 hover:text-white transition-colors text-xs font-mono font-bold"
                >
                  ⇥
                </button>
                <button
                  onClick={() => onAlign('top')}
                  title="Align Top"
                  className="py-1 rounded hover:bg-white/10 text-neutral-300 hover:text-white transition-colors text-xs font-mono font-bold"
                >
                  ⤒
                </button>
                <button
                  onClick={() => onAlign('center-v')}
                  title="Align Middle (Vertical)"
                  className="py-1 rounded hover:bg-white/10 text-neutral-300 hover:text-white transition-colors text-xs font-mono font-bold"
                >
                  ⤓⤒
                </button>
                <button
                  onClick={() => onAlign('bottom')}
                  title="Align Bottom"
                  className="py-1 rounded hover:bg-white/10 text-neutral-300 hover:text-white transition-colors text-xs font-mono font-bold"
                >
                  ⤓
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Table Grid Controls (Shows when a Table element is selected) */}
      {isTable && (
        <div className="pb-3 border-b border-white/10 mb-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-neutral-300 text-xs">Table Grid</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#6965db]/20 text-[#9794f0] font-mono font-semibold">
              {selectedElement.rows || 3}R × {selectedElement.cols || 3}C
            </span>
          </div>

          {/* Row controls */}
          <div className="flex items-center justify-between text-xs p-2 bg-black/20 rounded-xl border border-white/5">
            <span className="text-neutral-300 font-medium">Rows ({selectedElement.rows || 3})</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onRemoveTableRow && onRemoveTableRow(selectedElement.id)}
                disabled={(selectedElement.rows || 3) <= 1}
                title="Remove last row"
                className="w-7 h-6 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 text-white font-bold transition-colors"
              >
                -
              </button>
              <button
                onClick={() => onAddTableRow && onAddTableRow(selectedElement.id)}
                title="Add row at bottom"
                className="w-7 h-6 flex items-center justify-center rounded-lg bg-[#6965db] hover:bg-[#5b57d1] text-white font-bold transition-colors shadow-sm"
              >
                +
              </button>
            </div>
          </div>

          {/* Column controls */}
          <div className="flex items-center justify-between text-xs p-2 bg-black/20 rounded-xl border border-white/5">
            <span className="text-neutral-300 font-medium">Columns ({selectedElement.cols || 3})</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onRemoveTableCol && onRemoveTableCol(selectedElement.id)}
                disabled={(selectedElement.cols || 3) <= 1}
                title="Remove last column"
                className="w-7 h-6 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 text-white font-bold transition-colors"
              >
                -
              </button>
              <button
                onClick={() => onAddTableCol && onAddTableCol(selectedElement.id)}
                title="Add column on right"
                className="w-7 h-6 flex items-center justify-center rounded-lg bg-[#6965db] hover:bg-[#5b57d1] text-white font-bold transition-colors shadow-sm"
              >
                +
              </button>
            </div>
          </div>

          {/* Header Row toggle */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-neutral-400 font-medium">Header Row Style</span>
            <button
              onClick={() => onToggleTableHeader && onToggleTableHeader(selectedElement.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                selectedElement.hasHeader
                  ? 'bg-[#6965db] text-white shadow-sm'
                  : 'bg-white/10 text-neutral-400 hover:text-white'
              }`}
            >
              {selectedElement.hasHeader ? 'Enabled ✓' : 'Disabled'}
            </button>
          </div>

          <div className="text-[10px] text-neutral-400 italic text-center pt-1">
            💡 Tip: Double-click any cell to edit text! Tab to next cell.
          </div>
        </div>
      )}

      {/* Mind Map Auto-Branching Section */}
      {selectedElement && ['rectangle', 'sticky', 'ellipse', 'diamond', 'text'].includes(selectedElement.type) && !isMulti && (
        <div className="pb-3 border-b border-white/10 mb-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-neutral-300 text-xs flex items-center gap-1.5">
              <span>🧠</span> Mind Map Branching
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#6965db]/20 text-[#827fe2] font-mono">
              Auto Tree
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => onAddBranchChild && onAddBranchChild(selectedElement, 'right')}
              title="Add child branch to right (Shortcut: Tab)"
              className="py-1.5 px-2 rounded-xl bg-[#6965db]/20 hover:bg-[#6965db]/30 text-[#827fe2] hover:text-[#9794f0] font-semibold text-xs flex items-center justify-center gap-1 transition-colors border border-[#6965db]/30 shadow-sm"
            >
              <span>+ Child</span>
              <kbd className="text-[9px] px-1 py-0.2 bg-black/30 rounded font-mono">Tab</kbd>
            </button>
            <button
              onClick={() => onAddBranchSibling && onAddBranchSibling(selectedElement)}
              title="Add sibling branch below (Shortcut: Enter)"
              className="py-1.5 px-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-semibold text-xs flex items-center justify-center gap-1 transition-colors border border-emerald-500/25 shadow-sm"
            >
              <span>+ Sibling</span>
              <kbd className="text-[9px] px-1 py-0.2 bg-black/30 rounded font-mono">↵</kbd>
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-neutral-400">
            <span>Branch direction:</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onAddBranchChild && onAddBranchChild(selectedElement, 'left')}
                title="Branch Left"
                className="w-6 h-6 rounded bg-white/5 hover:bg-white/15 text-neutral-300 flex items-center justify-center text-xs"
              >
                ←
              </button>
              <button
                onClick={() => onAddBranchChild && onAddBranchChild(selectedElement, 'top')}
                title="Branch Up"
                className="w-6 h-6 rounded bg-white/5 hover:bg-white/15 text-neutral-300 flex items-center justify-center text-xs"
              >
                ↑
              </button>
              <button
                onClick={() => onAddBranchChild && onAddBranchChild(selectedElement, 'bottom')}
                title="Branch Down"
                className="w-6 h-6 rounded bg-white/5 hover:bg-white/15 text-neutral-300 flex items-center justify-center text-xs"
              >
                ↓
              </button>
              <button
                onClick={() => onAddBranchChild && onAddBranchChild(selectedElement, 'right')}
                title="Branch Right"
                className="w-6 h-6 rounded bg-white/5 hover:bg-white/15 text-neutral-300 flex items-center justify-center text-xs"
              >
                →
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 text-xs">
        {/* Stroke / Border Color */}
        <div>
          <label className="block mb-1.5 font-medium text-neutral-400">
            {isImage ? 'Border Color' : 'Stroke Color'}
          </label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {isImage && (
              <button
                onClick={() => update('strokeColor', 'transparent')}
                className={`w-6 h-6 rounded-md border relative transition-transform ${
                  activeStyle.strokeColor === 'transparent' ? 'scale-110 ring-2 ring-[#6965db]' : 'hover:scale-105'
                } ${isDarkMode ? 'border-[#444]' : 'border-neutral-300'}`}
                title="No border"
              >
                <span className="absolute inset-0 flex items-center justify-center text-red-500 font-bold text-xs">
                  /
                </span>
              </button>
            )}
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
                value={activeStyle.strokeColor && activeStyle.strokeColor !== 'transparent' ? activeStyle.strokeColor : '#ffffff'}
                onChange={(e) => update('strokeColor', e.target.value)}
                className="opacity-0 absolute inset-0 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Background / Fill Color (for shapes and sticky notes) */}
        {!isLineOrArrowOrPencil && !isImage && (
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
        {!isLineOrArrowOrPencil && selectedElement?.type !== 'sticky' && !isImage && (
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

        {/* Stroke / Border Width */}
        <div>
          <label className="block mb-1.5 font-medium text-neutral-400">
            {isImage ? 'Border Width' : 'Stroke Width'}
          </label>
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

        {/* Reset Original Size for images */}
        {isImage && selectedElement?.naturalWidth && selectedElement?.naturalHeight && (
          <div className="pt-1">
            <button
              onClick={() => {
                update('width', selectedElement.naturalWidth);
                update('height', selectedElement.naturalHeight);
              }}
              className={`w-full py-1.5 px-2 rounded-lg border flex items-center justify-center gap-1.5 text-[11px] font-medium transition-colors ${
                isDarkMode
                  ? 'border-[#3a3a46] hover:bg-[#2e2e38] text-neutral-300'
                  : 'border-neutral-200 hover:bg-neutral-100 text-neutral-700'
              }`}
            >
              <span>↺ Reset Original Size</span>
            </button>
          </div>
        )}

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
