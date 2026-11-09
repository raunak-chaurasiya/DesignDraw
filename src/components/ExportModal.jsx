import { useState, useEffect, useRef } from 'react';
import { Download, X, Check, Copy, AlertCircle } from 'lucide-react';
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
  const [customBgColor, setCustomBgColor] = useState(null);
  const [prevOpen, setPrevOpen] = useState(isOpen);

  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    if (isOpen) {
      setCustomBgColor(null);
    }
  }

  const bgColor = customBgColor ?? (isDarkMode ? '#121212' : '#ffffff');
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

      const previewIsDark = bgColor === '#121212' ? true : (bgColor === '#ffffff' ? false : isDarkMode);

      const canvas = generateExportCanvas(elements, {
        backgroundColor: format === 'png' && bgColor === 'transparent' ? 'transparent' : bgColor,
        scale: 1, // preview doesn't need high retina scale
        padding: 30,
        maxDimension: 1024,
        isDarkMode: previewIsDark,
      });

      if (previewCanvasRef.current) {
        const container = previewCanvasRef.current;
        container.innerHTML = '';
        canvas.className = `max-w-full max-h-[260px] object-contain rounded-lg border shadow-md ${
          isDarkMode ? 'border-white/10' : 'border-neutral-200'
        }`;
        container.appendChild(canvas);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [isOpen, elements, format, bgColor, scale, isDarkMode]);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const exportIsDark = bgColor === '#121212' ? true : (bgColor === '#ffffff' ? false : isDarkMode);

      if (format === 'jpg') {
        await exportToJpg(elements, {
          filename,
          backgroundColor: bgColor === 'transparent' ? '#ffffff' : bgColor,
          scale,
          isDarkMode: exportIsDark,
        });
      } else if (format === 'png') {
        await exportToPng(elements, {
          filename,
          backgroundColor: bgColor,
          scale,
          isDarkMode: exportIsDark,
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
      const copyIsDark = bgColor === '#121212' ? true : (bgColor === '#ffffff' ? false : isDarkMode);

      const canvas = generateExportCanvas(elements, {
        backgroundColor: format === 'jpg' && bgColor === 'transparent' ? '#ffffff' : bgColor,
        scale: 2,
        maxDimension: 2048,
        isDarkMode: copyIsDark,
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
        className={`w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border p-5 sm:p-6 shadow-xl transition-colors ${
          isDarkMode
            ? 'bg-[#18181c] border-white/10 text-neutral-100 shadow-black/60'
            : 'bg-white border-neutral-200 text-neutral-900 shadow-neutral-300/40'
        }`}
        style={{ scrollbarWidth: 'thin' }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between pb-3 border-b ${isDarkMode ? 'border-white/10' : 'border-neutral-200'}`}>
          <div>
            <h2 className="text-base font-medium">Export image</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Save as PNG, JPG, or JSON project file</p>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDarkMode ? 'hover:bg-white/10 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Live Preview Container (skipped for JSON format) */}
        {format !== 'json' ? (
          <div className={`my-4 p-3 rounded-xl border flex flex-col items-center justify-center min-h-[140px] overflow-hidden ${
            isDarkMode ? 'bg-black/30 border-white/5' : 'bg-neutral-100 border-neutral-200'
          }`}>
            <div ref={previewCanvasRef} className="flex items-center justify-center w-full" />
            <span className="text-[10px] text-neutral-500 mt-2 font-mono">Live Resolution Preview</span>
          </div>
        ) : (
          <div className={`my-4 p-4 rounded-xl border text-center text-xs ${
            isDarkMode ? 'bg-black/30 border-white/5 text-neutral-400' : 'bg-neutral-100 border-neutral-200 text-neutral-600'
          }`}>
            Export full scene as a reusable JSON project file.
          </div>
        )}

        {/* Export Format Selector */}
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-neutral-400 mb-1.5 font-normal">Format</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'jpg', label: 'JPG', desc: 'Solid background' },
                { id: 'png', label: 'PNG', desc: 'Transparent or solid' },
                { id: 'json', label: 'JSON', desc: 'Reusable scene' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id)}
                  className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                    format === f.id
                      ? isDarkMode
                        ? 'border-white/20 bg-white/10 text-white'
                        : 'border-neutral-900 bg-neutral-900 text-white'
                      : isDarkMode
                      ? 'border-white/8 bg-white/[0.02] text-neutral-400 hover:bg-white/[0.05] hover:text-white'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                  }`}
                >
                  <div className="font-normal">{f.label}</div>
                  <div className={`text-[10px] mt-0.5 ${format === f.id ? 'text-white/70' : 'text-neutral-500'}`}>{f.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Filename input */}
          <div>
            <label className="block text-neutral-400 mb-1.5 font-normal">Filename</label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-xs outline-none ${
                isDarkMode
                  ? 'bg-white/[0.04] border-white/10 text-white focus:border-white/30'
                  : 'bg-neutral-50 border-neutral-200 text-neutral-900 focus:border-neutral-400'
              }`}
            />
          </div>

          {/* Background color options for image export */}
          {format !== 'json' && (
            <div>
              <label className="block text-neutral-400 mb-1.5 font-normal">Background</label>
              <div className="flex items-center gap-2">
                {[
                  { label: 'Dark', value: '#121212' },
                  { label: 'Light', value: '#ffffff' },
                  ...(format === 'png' ? [{ label: 'Transparent', value: 'transparent' }] : []),
                ].map((bg) => (
                  <button
                    key={bg.value}
                    onClick={() => setCustomBgColor(bg.value)}
                    className={`px-3 py-1.5 rounded-md border text-xs transition-colors cursor-pointer ${
                      bgColor === bg.value
                        ? isDarkMode
                          ? 'border-white/20 bg-white/15 text-white'
                          : 'border-neutral-900 bg-neutral-900 text-white'
                        : isDarkMode
                        ? 'border-white/8 hover:bg-white/5 text-neutral-400'
                        : 'border-neutral-200 hover:bg-neutral-100 text-neutral-600'
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
              <label className="block text-neutral-400 mb-1.5 font-normal">Scale</label>
              <div className="flex items-center gap-2">
                {[
                  { label: '1x (Standard)', value: 1 },
                  { label: '2x (Sharp)', value: 2 },
                  { label: '3x (Print)', value: 3 },
                ].map((sc) => (
                  <button
                    key={sc.value}
                    onClick={() => setScale(sc.value)}
                    className={`flex-1 py-1.5 rounded-md border text-xs font-mono transition-colors cursor-pointer ${
                      scale === sc.value
                        ? isDarkMode
                          ? 'border-white/20 bg-white/15 text-white'
                          : 'border-neutral-900 bg-neutral-900 text-white'
                        : isDarkMode
                        ? 'border-white/8 hover:bg-white/5 text-neutral-400'
                        : 'border-neutral-200 hover:bg-neutral-100 text-neutral-600'
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
        <div className={`mt-6 pt-4 border-t flex items-center justify-between gap-3 ${
          isDarkMode ? 'border-white/10' : 'border-neutral-200'
        }`}>
          {format !== 'json' ? (
            <button
              onClick={handleCopyToClipboard}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-normal border transition-colors cursor-pointer ${
                copied
                  ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400'
                  : isDarkMode
                  ? 'border-white/10 hover:bg-white/5 text-neutral-300'
                  : 'border-neutral-200 hover:bg-neutral-100 text-neutral-700'
              }`}
            >
              {copied ? <Check size={14} strokeWidth={1.5} /> : <Copy size={14} strokeWidth={1.5} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-normal border transition-colors cursor-pointer ${
                isDarkMode
                  ? 'border-white/10 hover:bg-white/5 text-neutral-400 hover:text-neutral-200'
                  : 'border-neutral-200 hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-normal transition-colors disabled:opacity-50 cursor-pointer ${
                isDarkMode
                  ? 'bg-neutral-100 text-neutral-900 hover:bg-white'
                  : 'bg-neutral-900 text-white hover:bg-neutral-800'
              }`}
            >
              <Download size={14} strokeWidth={1.5} />
              <span>{isExporting ? 'Exporting...' : 'Export'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
