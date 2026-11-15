import {
  Copy,
  Trash2,
  ArrowUpToLine,
  ArrowDownToLine,
  Type as TypeIcon,
  X,
  Group,
  Ungroup,
  Plus,
  Minus,
  RotateCcw,
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
    if (typeof key === 'object') {
      onUpdateStyle(key);
    } else {
      onUpdateStyle({ [key]: value });
    }
  };

  if (!isOpen) {
    return null;
  }

  // Selected element title
  const selectionTitle = isGrouped
    ? `Group (${selectedElements.length})`
    : isMulti
    ? `Selection (${selectedElements.length})`
    : selectedElement
    ? `${selectedElement.type.charAt(0).toUpperCase() + selectedElement.type.slice(1)}`
    : 'Style Defaults';

  return (
    <>
      {/* Mobile backdrop to dismiss panel on tap outside */}
      <div
        className="fixed inset-0 z-25 sm:hidden bg-black/30 backdrop-blur-xs"
        onClick={() => setIsOpen(false)}
      />
      <aside
        aria-label="Element Properties"
        className={`fixed top-16 left-3 sm:left-4 z-30 w-[calc(100vw-1.5rem)] sm:w-68 max-w-xs sm:max-w-none max-h-[calc(100vh-8.5rem)] sm:max-h-[calc(100vh-5.5rem)] overflow-y-auto overscroll-contain rounded-2xl border p-3.5 sm:p-4 shadow-xl backdrop-blur-md transition-colors ${
          isDarkMode
            ? 'bg-[#18181c]/95 border-white/10 text-neutral-200 shadow-black/40'
            : 'bg-white/95 border-neutral-200/80 text-neutral-800 shadow-xl shadow-black/5'
        }`}
        style={{ scrollbarWidth: 'thin' }}
      >
      {/* Header */}
      <div className={`flex items-center justify-between pb-3 border-b mb-3 ${
        isDarkMode ? 'border-white/10' : 'border-neutral-200/80'
      }`}>
        <div className="flex items-center gap-1.5 min-w-0 pr-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#6965db] shrink-0" />
          <span className="text-xs font-medium tracking-tight truncate">
            {selectionTitle}
          </span>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          {selectedElements.length > 0 && (
            <>
              <button
                onClick={onDuplicate}
                title="Duplicate (Ctrl+D)"
                aria-label="Duplicate selected element (Ctrl + D)"
                className={`p-1.5 rounded-lg transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#6965db] focus-visible:outline-none ${
                  isDarkMode ? 'hover:bg-white/10 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <Copy size={13} strokeWidth={1.5} />
              </button>
              <button
                onClick={onDelete}
                title="Delete (Del)"
                aria-label="Delete selected element (Del)"
                className="p-1.5 rounded-lg transition-colors hover:bg-rose-500/15 text-rose-400 hover:text-rose-300 cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
              >
                <Trash2 size={13} strokeWidth={1.5} />
              </button>
            </>
          )}
          <button
            onClick={() => setIsOpen(false)}
            title="Close styles"
            aria-label="Close styling panel"
            className={`p-1.5 rounded-lg transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#6965db] focus-visible:outline-none ${
              isDarkMode ? 'hover:bg-white/10 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Multi-Selection: Grouping & Alignment */}
      {(isMulti || isGrouped) && (
        <div className={`pb-3 border-b mb-3 space-y-2.5 ${
          isDarkMode ? 'border-white/10' : 'border-neutral-200/80'
        }`}>
          {/* Group / Ungroup Button */}
          <div className="flex items-center gap-1.5">
            {isGrouped ? (
              <button
                onClick={onUngroup}
                title="Ungroup elements (Ctrl+Shift+G)"
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-normal flex items-center justify-center gap-1.5 transition-colors border cursor-pointer ${
                  isDarkMode
                    ? 'bg-white/8 hover:bg-white/12 text-neutral-200 border-white/10'
                    : 'bg-neutral-100 hover:bg-neutral-200/80 text-neutral-800 border-neutral-200/80'
                }`}
              >
                <Ungroup size={13} strokeWidth={1.5} />
                <span>Ungroup</span>
              </button>
            ) : (
              <button
                onClick={onGroup}
                title="Group elements together (Ctrl+G)"
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-normal flex items-center justify-center gap-1.5 transition-colors border cursor-pointer ${
                  isDarkMode
                    ? 'bg-white/8 hover:bg-white/12 text-neutral-200 border-white/10'
                    : 'bg-neutral-100 hover:bg-neutral-200/80 text-neutral-800 border-neutral-200/80'
                }`}
              >
                <Group size={13} strokeWidth={1.5} />
                <span>Group</span>
              </button>
            )}
          </div>

          {/* Precision Alignment Toolbar */}
          {onAlign && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[11px] font-normal text-neutral-400">Align</span>
              </div>
              <div className={`grid grid-cols-6 gap-0.5 p-1 rounded-xl border ${
                isDarkMode
                  ? 'bg-neutral-900/60 border-white/5'
                  : 'bg-neutral-100/90 border-neutral-200/70'
              }`}>
                {/* Left */}
                <button
                  onClick={() => onAlign('left')}
                  title="Align left"
                  className={`py-1.5 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                    isDarkMode ? 'hover:bg-white/10 text-neutral-300 hover:text-white' : 'hover:bg-white text-neutral-600 hover:text-neutral-900 hover:shadow-xs'
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="2" y1="2" x2="2" y2="14" />
                    <rect x="5" y="4" width="8" height="8" rx="1" />
                  </svg>
                </button>
                {/* Center H */}
                <button
                  onClick={() => onAlign('center-h')}
                  title="Align center (horizontal)"
                  className={`py-1.5 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                    isDarkMode ? 'hover:bg-white/10 text-neutral-300 hover:text-white' : 'hover:bg-white text-neutral-600 hover:text-neutral-900 hover:shadow-xs'
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="2" x2="8" y2="14" />
                    <rect x="4" y="4" width="8" height="8" rx="1" />
                  </svg>
                </button>
                {/* Right */}
                <button
                  onClick={() => onAlign('right')}
                  title="Align right"
                  className={`py-1.5 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                    isDarkMode ? 'hover:bg-white/10 text-neutral-300 hover:text-white' : 'hover:bg-white text-neutral-600 hover:text-neutral-900 hover:shadow-xs'
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="14" y1="2" x2="14" y2="14" />
                    <rect x="3" y="4" width="8" height="8" rx="1" />
                  </svg>
                </button>
                {/* Top */}
                <button
                  onClick={() => onAlign('top')}
                  title="Align top"
                  className={`py-1.5 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                    isDarkMode ? 'hover:bg-white/10 text-neutral-300 hover:text-white' : 'hover:bg-white text-neutral-600 hover:text-neutral-900 hover:shadow-xs'
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="2" y1="2" x2="14" y2="2" />
                    <rect x="4" y="5" width="8" height="8" rx="1" />
                  </svg>
                </button>
                {/* Center V */}
                <button
                  onClick={() => onAlign('center-v')}
                  title="Align middle (vertical)"
                  className={`py-1.5 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                    isDarkMode ? 'hover:bg-white/10 text-neutral-300 hover:text-white' : 'hover:bg-white text-neutral-600 hover:text-neutral-900 hover:shadow-xs'
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="2" y1="8" x2="14" y2="8" />
                    <rect x="4" y="4" width="8" height="8" rx="1" />
                  </svg>
                </button>
                {/* Bottom */}
                <button
                  onClick={() => onAlign('bottom')}
                  title="Align bottom"
                  className={`py-1.5 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                    isDarkMode ? 'hover:bg-white/10 text-neutral-300 hover:text-white' : 'hover:bg-white text-neutral-600 hover:text-neutral-900 hover:shadow-xs'
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="2" y1="14" x2="14" y2="14" />
                    <rect x="4" y="3" width="8" height="8" rx="1" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Table Element Controls */}
      {isTable && (
        <div className={`pb-3 border-b mb-3 space-y-2.5 ${
          isDarkMode ? 'border-white/10' : 'border-neutral-200/80'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-normal text-neutral-400">Table dimensions</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-md font-mono ${
              isDarkMode ? 'bg-white/10 text-neutral-300' : 'bg-neutral-100 text-neutral-700'
            }`}>
              {selectedElement.rows || 3}R × {selectedElement.cols || 3}C
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Rows Stepper */}
            <div className={`flex items-center justify-between p-2 rounded-xl border ${
              isDarkMode ? 'bg-neutral-900/60 border-white/5' : 'bg-neutral-50 border-neutral-200/70'
            }`}>
              <span className="text-neutral-400">Rows</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onRemoveTableRow && onRemoveTableRow(selectedElement.id)}
                  disabled={(selectedElement.rows || 3) <= 1}
                  title="Remove row"
                  className={`w-6 h-6 flex items-center justify-center rounded-lg disabled:opacity-30 transition-colors cursor-pointer ${
                    isDarkMode ? 'hover:bg-white/10 text-neutral-300' : 'hover:bg-neutral-200 text-neutral-700'
                  }`}
                >
                  <Minus size={11} strokeWidth={2} />
                </button>
                <span className="font-mono text-xs w-4 text-center">{selectedElement.rows || 3}</span>
                <button
                  onClick={() => onAddTableRow && onAddTableRow(selectedElement.id)}
                  title="Add row"
                  className={`w-6 h-6 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                    isDarkMode ? 'hover:bg-white/10 text-neutral-300' : 'hover:bg-neutral-200 text-neutral-700'
                  }`}
                >
                  <Plus size={11} strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Columns Stepper */}
            <div className={`flex items-center justify-between p-2 rounded-xl border ${
              isDarkMode ? 'bg-neutral-900/60 border-white/5' : 'bg-neutral-50 border-neutral-200/70'
            }`}>
              <span className="text-neutral-400">Cols</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onRemoveTableCol && onRemoveTableCol(selectedElement.id)}
                  disabled={(selectedElement.cols || 3) <= 1}
                  title="Remove column"
                  className={`w-6 h-6 flex items-center justify-center rounded-lg disabled:opacity-30 transition-colors cursor-pointer ${
                    isDarkMode ? 'hover:bg-white/10 text-neutral-300' : 'hover:bg-neutral-200 text-neutral-700'
                  }`}
                >
                  <Minus size={11} strokeWidth={2} />
                </button>
                <span className="font-mono text-xs w-4 text-center">{selectedElement.cols || 3}</span>
                <button
                  onClick={() => onAddTableCol && onAddTableCol(selectedElement.id)}
                  title="Add column"
                  className={`w-6 h-6 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                    isDarkMode ? 'hover:bg-white/10 text-neutral-300' : 'hover:bg-neutral-200 text-neutral-700'
                  }`}
                >
                  <Plus size={11} strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>

          {/* Header Row toggle */}
          <div className="flex items-center justify-between text-xs pt-0.5">
            <span className="text-neutral-400">Header row</span>
            <button
              onClick={() => onToggleTableHeader && onToggleTableHeader(selectedElement.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-normal transition-colors cursor-pointer ${
                selectedElement.hasHeader
                  ? isDarkMode ? 'bg-white/15 text-white' : 'bg-neutral-900 text-white'
                  : isDarkMode ? 'bg-white/5 text-neutral-400 hover:text-white' : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {selectedElement.hasHeader ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>
      )}

      {/* Mind Map Branching Controls */}
      {selectedElement && ['rectangle', 'sticky', 'ellipse', 'diamond', 'text'].includes(selectedElement.type) && !isMulti && (
        <div className={`pb-3 border-b mb-3 space-y-2.5 ${
          isDarkMode ? 'border-white/10' : 'border-neutral-200/80'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-normal text-neutral-400">
              Mind map branch
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => onAddBranchChild && onAddBranchChild(selectedElement, 'right')}
              title="Add child node (Tab)"
              className={`py-1.5 px-2.5 rounded-lg text-xs flex items-center justify-between transition-colors border cursor-pointer ${
                isDarkMode
                  ? 'bg-white/5 hover:bg-white/10 text-neutral-200 border-white/10'
                  : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border-neutral-200/80'
              }`}
            >
              <span>Child</span>
              <kbd className={`text-[10px] px-1 py-0.5 rounded font-mono ${
                isDarkMode ? 'bg-white/10 text-neutral-400' : 'bg-neutral-200/80 text-neutral-600'
              }`}>Tab</kbd>
            </button>
            <button
              onClick={() => onAddBranchSibling && onAddBranchSibling(selectedElement)}
              title="Add sibling node (Enter)"
              className={`py-1.5 px-2.5 rounded-lg text-xs flex items-center justify-between transition-colors border cursor-pointer ${
                isDarkMode
                  ? 'bg-white/5 hover:bg-white/10 text-neutral-200 border-white/10'
                  : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border-neutral-200/80'
              }`}
            >
              <span>Sibling</span>
              <kbd className={`text-[10px] px-1 py-0.5 rounded font-mono ${
                isDarkMode ? 'bg-white/10 text-neutral-400' : 'bg-neutral-200/80 text-neutral-600'
              }`}>↵</kbd>
            </button>
          </div>

          {/* Directional Pad */}
          <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-0.5">
            <span>Direction</span>
            <div className="flex items-center gap-1">
              {[
                { dir: 'left', arrow: '←' },
                { dir: 'top', arrow: '↑' },
                { dir: 'bottom', arrow: '↓' },
                { dir: 'right', arrow: '→' },
              ].map(({ dir, arrow }) => (
                <button
                  key={dir}
                  onClick={() => onAddBranchChild && onAddBranchChild(selectedElement, dir)}
                  title={`Branch ${dir}`}
                  className={`w-6 h-6 rounded-md flex items-center justify-center text-xs transition-colors cursor-pointer ${
                    isDarkMode ? 'bg-white/5 hover:bg-white/15 text-neutral-300' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                  }`}
                >
                  {arrow}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Styles Section */}
      <div className="space-y-3.5 text-xs">
        {/* Stroke / Outline Color */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-normal text-neutral-400">
              {isImage ? 'Border color' : 'Stroke'}
            </label>
            {activeStyle.strokeColor && activeStyle.strokeColor !== 'transparent' && (
              <span className="text-[10px] font-mono text-neutral-400 uppercase">
                {activeStyle.strokeColor}
              </span>
            )}
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {isImage && (
              <button
                onClick={() => update('strokeColor', 'transparent')}
                className={`h-6 rounded-md border relative transition-[box-shadow,opacity,border-color] duration-150 ease-out cursor-pointer ${
                  activeStyle.strokeColor === 'transparent'
                    ? 'ring-2 ring-offset-2 ring-[#6965db]'
                    : ''
                } ${isDarkMode ? 'border-white/10' : 'border-neutral-200'}`}
                title="No border"
              >
                <span className="absolute inset-0 flex items-center justify-center text-rose-500 font-bold text-xs">
                  /
                </span>
              </button>
            )}
            {STROKE_COLORS.map((color) => {
              const isSelected = activeStyle.strokeColor === color;
              const isWhite = color === '#ffffff';
              return (
                <button
                  key={color}
                  onClick={() => update('strokeColor', color)}
                  className={`h-6 rounded-md border transition-[box-shadow,opacity,border-color] duration-150 ease-out cursor-pointer relative ${
                    isSelected
                      ? `ring-2 ring-offset-2 ring-[#6965db] ${isDarkMode ? 'ring-offset-[#18181c]' : 'ring-offset-white'}`
                      : 'hover:opacity-90'
                  }`}
                  style={{
                    backgroundColor: color,
                    borderColor: isWhite ? (isDarkMode ? '#444' : '#d1d5db') : 'transparent',
                  }}
                  title={color}
                />
              );
            })}

            {/* Custom Color Input Swatch */}
            <label
              title="Custom stroke color"
              className={`h-6 rounded-md border border-dashed flex items-center justify-center cursor-pointer relative overflow-hidden transition-colors ${
                isDarkMode
                  ? 'border-neutral-600 hover:border-neutral-300 text-neutral-400'
                  : 'border-neutral-400 hover:border-neutral-800 text-neutral-600'
              }`}
            >
              <span className="text-xs leading-none font-bold">+</span>
              <input
                type="color"
                value={
                  activeStyle.strokeColor && activeStyle.strokeColor !== 'transparent'
                    ? activeStyle.strokeColor
                    : isDarkMode ? '#ffffff' : '#1e1e1e'
                }
                onChange={(e) => update('strokeColor', e.target.value)}
                className="opacity-0 absolute inset-0 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Background / Fill Color */}
        {!isLineOrArrowOrPencil && !isImage && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-normal text-neutral-400">Background fill</label>
              {activeStyle.backgroundColor && activeStyle.backgroundColor !== 'transparent' && (
                <span className="text-[10px] font-mono text-neutral-400 uppercase">
                  {activeStyle.backgroundColor}
                </span>
              )}
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {BG_COLORS.map((color) => {
                const isTrans = color === 'transparent';
                const isSelected = activeStyle.backgroundColor === color;
                return (
                  <button
                    key={color}
                    onClick={() => update('backgroundColor', color)}
                    className={`h-6 rounded-md border relative transition-[box-shadow,opacity,border-color] duration-150 ease-out cursor-pointer ${
                      isSelected
                        ? `ring-2 ring-offset-2 ring-[#6965db] ${isDarkMode ? 'ring-offset-[#18181c]' : 'ring-offset-white'}`
                        : 'hover:opacity-90'
                    } ${isDarkMode ? 'border-white/10' : 'border-neutral-200'}`}
                    style={{
                      backgroundColor: isTrans ? 'transparent' : color,
                    }}
                    title={isTrans ? 'Transparent' : color}
                  >
                    {isTrans && (
                      <span className="absolute inset-0 flex items-center justify-center text-rose-500 font-bold text-xs">
                        /
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Custom background color input */}
              <label
                title="Custom background color"
                className={`h-6 rounded-md border border-dashed flex items-center justify-center cursor-pointer relative overflow-hidden transition-colors ${
                  isDarkMode
                    ? 'border-neutral-600 hover:border-neutral-300 text-neutral-400'
                    : 'border-neutral-400 hover:border-neutral-800 text-neutral-600'
                }`}
              >
                <span className="text-xs leading-none font-bold">+</span>
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

        {/* Fill Style (for shapes) */}
        {!isLineOrArrowOrPencil && selectedElement?.type !== 'sticky' && !isImage && (
          <div>
            <label className="block mb-1.5 text-[11px] font-normal text-neutral-400">Fill style</label>
            <div className={`grid grid-cols-4 gap-0.5 p-1 rounded-xl border ${
              isDarkMode
                ? 'bg-neutral-900/60 border-white/5'
                : 'bg-neutral-100/90 border-neutral-200/70'
            }`}>
              {FILL_STYLES.map((fs) => {
                const isActive = activeStyle.fillStyle === fs.value;
                return (
                  <button
                    key={fs.value}
                    onClick={() => update('fillStyle', fs.value)}
                    className={`py-1 text-center rounded-lg text-[11px] capitalize transition-[color,background-color,border-color] duration-150 ease-out cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      isActive
                        ? isDarkMode
                          ? 'bg-white/15 text-white font-medium shadow-xs'
                          : 'bg-white text-neutral-900 font-medium shadow-xs border border-neutral-200/70'
                        : isDarkMode
                        ? 'text-neutral-400 hover:text-white'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    {fs.value === 'none' && (
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="2" y="2" width="12" height="12" rx="2" strokeDasharray="2 2" />
                      </svg>
                    )}
                    {fs.value === 'hachure' && (
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="2" y="2" width="12" height="12" rx="2" />
                        <line x1="3" y1="13" x2="13" y2="3" strokeWidth="1.2" />
                        <line x1="2" y1="8" x2="8" y2="2" strokeWidth="1.2" />
                        <line x1="8" y1="14" x2="14" y2="8" strokeWidth="1.2" />
                      </svg>
                    )}
                    {fs.value === 'cross-hatch' && (
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="2" y="2" width="12" height="12" rx="2" />
                        <line x1="3" y1="13" x2="13" y2="3" strokeWidth="1.2" />
                        <line x1="3" y1="3" x2="13" y2="13" strokeWidth="1.2" />
                      </svg>
                    )}
                    {fs.value === 'solid' && (
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <rect x="2" y="2" width="12" height="12" rx="2" />
                      </svg>
                    )}
                    <span className="text-[10px] leading-tight">{fs.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Stroke / Border Width */}
        <div>
          <label className="block mb-1.5 text-[11px] font-normal text-neutral-400">
            {isImage ? 'Border thickness' : 'Stroke thickness'}
          </label>
          <div className={`grid grid-cols-3 gap-0.5 p-1 rounded-xl border ${
            isDarkMode
              ? 'bg-neutral-900/60 border-white/5'
              : 'bg-neutral-100/90 border-neutral-200/70'
          }`}>
            {STROKE_WIDTHS.map((sw) => {
              const isActive = activeStyle.strokeWidth === sw.value;
              return (
                <button
                  key={sw.value}
                  onClick={() => update('strokeWidth', sw.value)}
                  className={`py-1.5 text-center rounded-lg text-[11px] transition-[color,background-color,border-color] duration-150 ease-out flex items-center justify-center gap-1.5 cursor-pointer ${
                    isActive
                      ? isDarkMode
                        ? 'bg-white/15 text-white font-medium shadow-xs'
                        : 'bg-white text-neutral-900 font-medium shadow-xs border border-neutral-200/70'
                      : isDarkMode
                      ? 'text-neutral-400 hover:text-white'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  <div
                    className="bg-current rounded-full"
                    style={{ width: 14, height: Math.max(1.5, sw.value) }}
                  />
                  <span>{sw.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stroke Style (Solid, Dashed, Dotted) */}
        <div>
          <label className="block mb-1.5 text-[11px] font-normal text-neutral-400">Stroke style</label>
          <div className={`grid grid-cols-3 gap-0.5 p-1 rounded-xl border ${
            isDarkMode
              ? 'bg-neutral-900/60 border-white/5'
              : 'bg-neutral-100/90 border-neutral-200/70'
          }`}>
            {STROKE_STYLES.map((st) => {
              const isActive = activeStyle.strokeStyle === st.value;
              return (
                <button
                  key={st.value}
                  onClick={() => update('strokeStyle', st.value)}
                  className={`py-1.5 text-center rounded-lg text-[11px] capitalize transition-[color,background-color,border-color] duration-150 ease-out cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    isActive
                      ? isDarkMode
                        ? 'bg-white/15 text-white font-medium shadow-xs'
                        : 'bg-white text-neutral-900 font-medium shadow-xs border border-neutral-200/70'
                      : isDarkMode
                      ? 'text-neutral-400 hover:text-white'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  {st.value === 'solid' && (
                    <svg width="24" height="6" viewBox="0 0 24 6">
                      <line x1="2" y1="3" x2="22" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  )}
                  {st.value === 'dashed' && (
                    <svg width="24" height="6" viewBox="0 0 24 6">
                      <line x1="2" y1="3" x2="22" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 3" />
                    </svg>
                  )}
                  {st.value === 'dotted' && (
                    <svg width="24" height="6" viewBox="0 0 24 6">
                      <line x1="2" y1="3" x2="22" y2="3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 4" />
                    </svg>
                  )}
                  <span className="text-[10px] leading-tight">{st.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Roughness (Sloppiness / Hand-drawn feel) */}
        <div>
          <label className="block mb-1.5 text-[11px] font-normal text-neutral-400">Sloppiness</label>
          <div className={`grid grid-cols-3 gap-0.5 p-1 rounded-xl border ${
            isDarkMode
              ? 'bg-neutral-900/60 border-white/5'
              : 'bg-neutral-100/90 border-neutral-200/70'
          }`}>
            {ROUGHNESS_LEVELS.map((rl) => {
              const isActive = activeStyle.roughness === rl.value;
              return (
                <button
                  key={rl.value}
                  onClick={() => update('roughness', rl.value)}
                  className={`py-1.5 text-center rounded-lg text-[11px] transition-[color,background-color,border-color] duration-150 ease-out cursor-pointer ${
                    isActive
                      ? isDarkMode
                        ? 'bg-white/15 text-white font-medium shadow-xs'
                        : 'bg-white text-neutral-900 font-medium shadow-xs border border-neutral-200/70'
                      : isDarkMode
                      ? 'text-neutral-400 hover:text-white'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  {rl.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Typography Controls */}
        {isTextOrSticky && (
          <div className={`pt-2.5 border-t space-y-2.5 ${
            isDarkMode ? 'border-white/10' : 'border-neutral-200/80'
          }`}>
            <div>
              <label className="block mb-1.5 text-[11px] font-normal text-neutral-400 flex items-center gap-1">
                <TypeIcon size={12} strokeWidth={1.5} />
                <span>Font size</span>
              </label>
              <div className={`grid grid-cols-4 gap-0.5 p-1 rounded-xl border ${
                isDarkMode
                  ? 'bg-neutral-900/60 border-white/5'
                  : 'bg-neutral-100/90 border-neutral-200/70'
              }`}>
                {FONT_SIZES.map((fs) => {
                  const isActive = activeStyle.fontSize === fs.value;
                  return (
                    <button
                      key={fs.value}
                      onClick={() => update('fontSize', fs.value)}
                      className={`py-1 text-center rounded-lg text-[11px] font-medium transition-[color,background-color,border-color] duration-150 ease-out cursor-pointer ${
                        isActive
                          ? isDarkMode
                            ? 'bg-white/15 text-white shadow-xs'
                            : 'bg-white text-neutral-900 shadow-xs border border-neutral-200/70'
                          : isDarkMode
                          ? 'text-neutral-400 hover:text-white'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      {fs.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block mb-1.5 text-[11px] font-normal text-neutral-400">Typeface</label>
              <select
                value={activeStyle.fontFamily || "'Patrick Hand', cursive"}
                onChange={(e) => update('fontFamily', e.target.value)}
                className={`w-full py-1.5 px-2.5 rounded-lg border text-xs outline-none transition-colors cursor-pointer ${
                  isDarkMode
                    ? 'bg-[#1e1e24] border-white/10 text-neutral-200 focus:border-white/20'
                    : 'bg-neutral-50 border-neutral-300 text-neutral-800 focus:border-neutral-400'
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
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-[11px] font-normal text-neutral-400">Opacity</label>
            <span className="text-[11px] font-mono text-neutral-400 tabular-nums">
              {activeStyle.opacity || 100}%
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            value={activeStyle.opacity || 100}
            onChange={(e) => update('opacity', Number(e.target.value))}
            className={`w-full accent-[#6965db] h-1.5 rounded-lg cursor-pointer ${
              isDarkMode ? 'bg-neutral-700' : 'bg-neutral-200'
            }`}
          />
        </div>

        {/* Reset Original Size (for Image) */}
        {isImage && selectedElement?.naturalWidth && selectedElement?.naturalHeight && (
          <div className="pt-1">
            <button
              onClick={() => {
                update({
                  width: selectedElement.naturalWidth,
                  height: selectedElement.naturalHeight,
                });
              }}
              className={`w-full py-1.5 px-2.5 rounded-lg border flex items-center justify-center gap-1.5 text-[11px] font-normal transition-colors cursor-pointer ${
                isDarkMode
                  ? 'border-white/10 hover:bg-white/5 text-neutral-300'
                  : 'border-neutral-200/80 hover:bg-neutral-100 text-neutral-700'
              }`}
            >
              <RotateCcw size={12} strokeWidth={1.5} />
              <span>Reset original size</span>
            </button>
          </div>
        )}

        {/* Layering controls */}
        {selectedElement && (
          <div className={`pt-2.5 border-t flex items-center justify-between gap-2 ${
            isDarkMode ? 'border-white/10' : 'border-neutral-200/80'
          }`}>
            <button
              onClick={onBringForward}
              title="Bring Forward (Ctrl + ])"
              className={`flex-1 py-1.5 px-2 rounded-lg border flex items-center justify-center gap-1 text-[11px] font-normal transition-colors cursor-pointer ${
                isDarkMode
                  ? 'border-white/10 hover:bg-white/5 text-neutral-300 hover:text-white'
                  : 'border-neutral-200/80 hover:bg-neutral-100 text-neutral-700 hover:text-neutral-900'
              }`}
            >
              <ArrowUpToLine size={12} strokeWidth={1.5} />
              <span>Forward</span>
            </button>
            <button
              onClick={onSendBackward}
              title="Send Backward (Ctrl + [)"
              className={`flex-1 py-1.5 px-2 rounded-lg border flex items-center justify-center gap-1 text-[11px] font-normal transition-colors cursor-pointer ${
                isDarkMode
                  ? 'border-white/10 hover:bg-white/5 text-neutral-300 hover:text-white'
                  : 'border-neutral-200/80 hover:bg-neutral-100 text-neutral-700 hover:text-neutral-900'
              }`}
            >
              <ArrowDownToLine size={12} strokeWidth={1.5} />
              <span>Backward</span>
            </button>
          </div>
        )}
      </div>
    </aside>
    </>
  );
}
