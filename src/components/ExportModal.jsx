import React, { useState, useEffect, useRef } from 'react';
import { Download, X, Image as ImageIcon, Check, Copy } from 'lucide-react';
import { exportToJpg, exportToPng, exportToJson, generateExportCanvas } from '../utils/export';

export default function ExportModal({
  isOpen,
  onClose,
  elements,
  isDarkMode = true,
}) {
  const [format, setFormat] = useState('jpg'); // 'jpg' | 'png' | 'json'
  const [filename, setFilename] = useState('whiteboard-diagram');
  const [bgColor, setBgColor] = useState(isDarkMode ? '#121212' : '#ffffff');
  const [scale, setScale] = useState(2);
  const [copied, setCopied] = useState(false);
  const previewCanvasRef = useRef(null);

  // Generate live preview whenever elements, format, bgColor, scale change
  useEffect(() => {
    if (!isOpen) return;

    const canvas = generateExportCanvas(elements, {
      backgroundColor: format === 'png' && bgColor === 'transparent' ? 'transparent' : bgColor,
      scale: 1, // preview doesn't need huge scale
      padding: 30,
    });

    if (previewCanvasRef.current) {
      const container = previewCanvasRef.current;
      container.innerHTML = '';
      canvas.className = 'max-w-full max-h-[260px] object-contain rounded-lg border border-white/10 shadow-md';
      container.appendChild(canvas);
    }
  }, [isOpen, elements, format, bgColor, scale]);

  if (!isOpen) return null;

  const handleExport = () => {
    if (format === 'jpg') {
      exportToJpg(elements, {
        filename,
        backgroundColor: bgColor === 'transparent' ? '#ffffff' : bgColor,
        scale,
      });
    } else if (format === 'png') {
      exportToPng(elements, {
        filename,
        backgroundColor: bgColor,
        scale,
      });
    } else if (format === 'json') {
      exportToJson(elements);
    }
    onClose();
  };

  const handleCopyToClipboard = async () => {
    try {
      const canvas = generateExportCanvas(elements, {
        backgroundColor: format === 'jpg' && bgColor === 'transparent' ? '#ffffff' : bgColor,
        scale: 2,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div
        className={`w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border p-4 sm:p-6 shadow-2xl transition-all ${
          isDarkMode
            ? 'bg-[#1e1e24] border-[#34343e] text-neutral-100'
            : 'bg-white border-neutral-200 text-neutral-900 shadow-neutral-300/50'
        }`}
        style={{ scrollbarWidth: 'thin' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#6965db]/20 text-[#827fe2]">
              <ImageIcon size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold">Export Diagram</h2>
              <p className="text-xs text-neutral-400">Export high-resolution JPG or PNG for sharing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Live Preview Container */}
        <div className="my-4 flex flex-col items-center justify-center p-4 rounded-xl bg-black/25 min-h-[160px] max-h-[280px] overflow-hidden">
          <div ref={previewCanvasRef} className="flex items-center justify-center" />
          <span className="text-[11px] text-neutral-400 mt-2">
            {elements.length} element{elements.length !== 1 ? 's' : ''} ready to export
          </span>
        </div>

        {/* Format Selector Tabs */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-neutral-400 mb-1.5">Export Format</label>
          <div className="grid grid-cols-3 gap-2 p-1 bg-black/20 rounded-xl">
            <button
              onClick={() => setFormat('jpg')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all flex flex-col items-center gap-0.5 ${
                format === 'jpg'
                  ? 'bg-[#6965db] text-white shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>JPG Image</span>
              <span className="text-[10px] opacity-80 font-normal">Standard / Web</span>
            </button>
            <button
              onClick={() => setFormat('png')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all flex flex-col items-center gap-0.5 ${
                format === 'png'
                  ? 'bg-[#6965db] text-white shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>PNG Image</span>
              <span className="text-[10px] opacity-80 font-normal">Transparent / Crisp</span>
            </button>
            <button
              onClick={() => setFormat('json')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all flex flex-col items-center gap-0.5 ${
                format === 'json'
                  ? 'bg-[#6965db] text-white shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>Project JSON</span>
              <span className="text-[10px] opacity-80 font-normal">Editable file</span>
            </button>
          </div>
        </div>

        {/* Filename & Background Options */}
        {format !== 'json' && (
          <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
            <div>
              <label className="block text-neutral-400 mb-1 font-medium">Filename</label>
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="diagram-name"
                className={`w-full py-1.5 px-3 rounded-lg border text-xs outline-none ${
                  isDarkMode
                    ? 'bg-[#16161b] border-[#34343e] text-white focus:border-[#6965db]'
                    : 'bg-neutral-50 border-neutral-300 text-neutral-900 focus:border-[#6965db]'
                }`}
              />
            </div>

            <div>
              <label className="block text-neutral-400 mb-1 font-medium">Background</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBgColor('#121212')}
                  title="Dark theme background"
                  className={`w-7 h-7 rounded-lg border bg-[#121212] ${
                    bgColor === '#121212' ? 'ring-2 ring-[#6965db] border-white' : 'border-neutral-600'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setBgColor('#ffffff')}
                  title="Crisp white background"
                  className={`w-7 h-7 rounded-lg border bg-white ${
                    bgColor === '#ffffff' ? 'ring-2 ring-[#6965db] border-white' : 'border-neutral-300'
                  }`}
                />
                {format === 'png' && (
                  <button
                    type="button"
                    onClick={() => setBgColor('transparent')}
                    title="Transparent background"
                    className={`w-7 h-7 rounded-lg border border-dashed border-neutral-500 text-[10px] font-bold text-neutral-400 flex items-center justify-center ${
                      bgColor === 'transparent' ? 'ring-2 ring-[#6965db]' : ''
                    }`}
                  >
                    None
                  </button>
                )}
                {/* Custom Color input */}
                <label className="w-7 h-7 rounded-lg border border-dashed border-neutral-500 flex items-center justify-center cursor-pointer text-xs">
                  +
                  <input
                    type="color"
                    value={bgColor === 'transparent' ? '#ffffff' : bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="opacity-0 absolute w-0 h-0"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Quality Scale */}
        {format !== 'json' && (
          <div className="mb-5 flex items-center justify-between text-xs">
            <span className="text-neutral-400 font-medium">Resolution Quality:</span>
            <div className="flex items-center gap-1">
              {[
                { label: '1x (Standard)', val: 1 },
                { label: '2x (High Def)', val: 2 },
                { label: '3x (Ultra HD)', val: 3 },
              ].map((s) => (
                <button
                  key={s.val}
                  onClick={() => setScale(s.val)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    scale === s.val
                      ? 'bg-[#6965db] text-white'
                      : isDarkMode
                      ? 'bg-white/5 text-neutral-400 hover:text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
          {format !== 'json' ? (
            <button
              onClick={handleCopyToClipboard}
              className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all flex items-center gap-1.5 ${
                isDarkMode
                  ? 'border-[#34343e] hover:bg-white/5 text-neutral-300'
                  : 'border-neutral-200 hover:bg-neutral-100 text-neutral-700'
              }`}
            >
              {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              {copied ? 'Copied to clipboard!' : 'Copy to Clipboard'}
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="py-2 px-3 text-xs text-neutral-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              className="py-2 px-4 rounded-xl bg-[#6965db] hover:bg-[#5b57d1] text-white text-xs font-semibold shadow-lg shadow-[#6965db]/25 transition-all flex items-center gap-1.5"
            >
              <Download size={15} />
              Export {format.toUpperCase()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
