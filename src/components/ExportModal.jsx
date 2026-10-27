import { useState, useEffect, useRef } from 'react';
import { Download, X, Image as ImageIcon, Check, Copy, AlertCircle } from 'lucide-react';
import { exportToJpg, exportToPng, exportToJson, generateExportCanvas, prepareElementsForExport } from '../utils/export';

function canvasToBlobAsync(canvas, type = 'image/png', quality = 0.95) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

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
  const [copyError, setCopyError] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const previewCanvasRef = useRef(null);

  // Generate live preview when elements, format, bgColor, scale change
  useEffect(() => {
    if (!isOpen || format === 'json') return;

    let isCurrent = true;

    prepareElementsForExport(elements).then(() => {
      if (!isCurrent) return;

      const canvas = generateExportCanvas(elements, {
        backgroundColor: format === 'png' && bgColor === 'transparent' ? 'transparent' : bgColor,
        scale: 1, // preview doesn't need high retina scale
        padding: 30,
        maxDimension: 1024,
      });

      if (previewCanvasRef.current) {
        const container = previewCanvasRef.current;
        container.innerHTML = '';
        canvas.className = 'max-w-full max-h-[260px] object-contain rounded-lg border border-white/10 shadow-md';
        container.appendChild(canvas);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [isOpen, elements, format, bgColor, scale]);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (format === 'jpg') {
        await exportToJpg(elements, {
          filename,
          backgroundColor: bgColor === 'transparent' ? '#ffffff' : bgColor,
          scale,
        });
      } else if (format === 'png') {
        await exportToPng(elements, {
          filename,
          backgroundColor: bgColor,
          scale,
        });
      } else if (format === 'json') {
        exportToJson(elements, { theme: isDarkMode ? 'dark' : 'light' });
      }
      onClose();
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    setCopyError(null);
    try {
      await prepareElementsForExport(elements);

      const canvas = generateExportCanvas(elements, {
        backgroundColor: format === 'jpg' && bgColor === 'transparent' ? '#ffffff' : bgColor,
        scale: 2,
        maxDimension: 2048,
      });

      const blob = await canvasToBlobAsync(canvas, 'image/png');
      if (!blob) {
        throw new Error('Failed to create image blob');
      }

      if (!navigator.clipboard || !navigator.clipboard.write) {
        throw new Error('Clipboard image writing is not supported in this browser');
      }

      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      setCopyError(err.message || 'Clipboard copy failed');
      setTimeout(() => setCopyError(null), 3000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
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
              <p className="text-xs text-neutral-400">Export high-resolution image or JSON for sharing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Live Preview Container (skipped for JSON format) */}
        {format !== 'json' ? (
          <div className="my-4 p-3 rounded-xl bg-black/30 border border-white/5 flex flex-col items-center justify-center min-h-[140px] overflow-hidden">
            <div ref={previewCanvasRef} className="flex items-center justify-center w-full" />
            <span className="text-[10px] text-neutral-500 mt-2 font-mono">Live Resolution Preview</span>
          </div>
        ) : (
          <div className="my-4 p-4 rounded-xl bg-black/30 border border-white/5 text-center text-xs text-neutral-400">
            Export full scene as a reusable JSON project file.
          </div>
        )}

        {/* Export Format Selector */}
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-neutral-300 mb-1.5">Format</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'jpg', label: 'JPG Image', desc: 'Solid background' },
                { id: 'png', label: 'PNG Image', desc: 'Transparent or solid' },
                { id: 'json', label: 'JSON Project', desc: 'Importable data' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    format === f.id
                      ? 'border-[#6965db] bg-[#6965db]/15 text-white ring-1 ring-[#6965db]'
                      : 'border-white/10 bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="font-semibold">{f.label}</div>
                  <div className="text-[10px] opacity-70 mt-0.5">{f.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Filename input */}
          <div>
            <label className="block font-medium text-neutral-300 mb-1.5">Filename</label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl border text-xs outline-none focus:border-[#6965db] ${
                isDarkMode
                  ? 'bg-[#18181f] border-[#34343e] text-white'
                  : 'bg-neutral-50 border-neutral-300 text-neutral-900'
              }`}
            />
          </div>

          {/* Background color options for image export */}
          {format !== 'json' && (
            <div>
              <label className="block font-medium text-neutral-300 mb-1.5">Canvas Background</label>
              <div className="flex items-center gap-2">
                {[
                  { label: 'Dark', value: '#121212' },
                  { label: 'Light', value: '#ffffff' },
                  ...(format === 'png' ? [{ label: 'Transparent', value: 'transparent' }] : []),
                ].map((bg) => (
                  <button
                    key={bg.value}
                    onClick={() => setBgColor(bg.value)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      bgColor === bg.value
                        ? 'border-[#6965db] bg-[#6965db]/20 text-[#827fe2]'
                        : 'border-white/10 hover:bg-white/5 text-neutral-400'
                    }`}
                  >
                    {bg.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Resolution Scale */}
          {format !== 'json' && (
            <div>
              <label className="block font-medium text-neutral-300 mb-1.5">Export Scale</label>
              <div className="flex items-center gap-2">
                {[
                  { label: '1x (Standard)', value: 1 },
                  { label: '2x (Sharp Retina)', value: 2 },
                  { label: '3x (Ultra Print)', value: 3 },
                ].map((sc) => (
                  <button
                    key={sc.value}
                    onClick={() => setScale(sc.value)}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      scale === sc.value
                        ? 'border-[#6965db] bg-[#6965db]/20 text-[#827fe2]'
                        : 'border-white/10 hover:bg-white/5 text-neutral-400'
                    }`}
                  >
                    {sc.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Copy Error Notice */}
        {copyError && (
          <div className="mt-3 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-1.5">
            <AlertCircle size={14} />
            <span>{copyError}</span>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between gap-3">
          {format !== 'json' ? (
            <button
              onClick={handleCopyToClipboard}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors ${
                copied
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                  : 'border-white/10 hover:bg-white/5 text-neutral-300'
              }`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied PNG!' : 'Copy to Clipboard'}
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium border border-white/10 hover:bg-white/5 text-neutral-400 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-[#6965db] hover:bg-[#5b57d1] text-white shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
            >
              <Download size={14} />
              {isExporting ? 'Exporting...' : 'Export File'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
