import React, { useRef } from 'react';
import {
  Menu,
  Download,
  FolderOpen,
  Save,
  Trash2,
  Moon,
  Sun,
  Grid,
  HelpCircle,
  X,
  FileCode,
} from 'lucide-react';
import { importFromJson } from '../utils/export';

export default function MenuModal({
  isOpen,
  setIsOpen,
  onOpenExport,
  onClearCanvas,
  onLoadElements,
  onSaveProject,
  isDarkMode,
  setIsDarkMode,
  showGrid,
  setShowGrid,
  onOpenHelp,
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await importFromJson(file);
      onLoadElements(data.elements || []);
      setIsOpen(false);
    } catch (err) {
      alert('Error loading file: ' + err.message);
    }
  };

  return (
    <>
      {/* Top Left Menu Trigger Button */}
      <div className="fixed top-4 left-4 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          title="Open menu"
          className={`p-2.5 rounded-xl border shadow-lg backdrop-blur-md transition-all flex items-center justify-center ${
            isDarkMode
              ? 'bg-[#232329]/90 border-[#34343e] text-neutral-300 hover:text-white hover:bg-[#2d2d38]'
              : 'bg-white/95 border-neutral-200 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 shadow-neutral-300/40'
          }`}
        >
          {isOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>

      {/* Menu Drawer / Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setIsOpen(false)}
          />
          <div
            className={`fixed top-16 left-4 z-50 w-72 rounded-2xl border p-3 shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-2 duration-150 ${
              isDarkMode
                ? 'bg-[#1e1e24] border-[#34343e] text-neutral-200'
                : 'bg-white border-neutral-200 text-neutral-800 shadow-neutral-300/50'
            }`}
          >
            <div className="px-3 py-2 border-b border-white/10 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Whiteboard Menu
              </span>
            </div>

            <div className="space-y-1 text-xs">
              {/* Export as JPG / Image */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenExport();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#6965db]/20 text-[#827fe2] hover:text-[#9794f0] font-semibold transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Download size={16} />
                  <span>Export Image (JPG, PNG)</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#6965db] text-white">
                  JPG
                </span>
              </button>

              <div className="my-1.5 border-t border-white/10" />

              {/* Open Project */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`w-full flex items-center gap-2.5 p-2 rounded-lg transition-colors ${
                  isDarkMode ? 'hover:bg-white/10 text-neutral-300' : 'hover:bg-neutral-100 text-neutral-700'
                }`}
              >
                <FolderOpen size={16} />
                <span>Open Project (.json)</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Save Project */}
              <button
                onClick={() => {
                  onSaveProject();
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 p-2 rounded-lg transition-colors ${
                  isDarkMode ? 'hover:bg-white/10 text-neutral-300' : 'hover:bg-neutral-100 text-neutral-700'
                }`}
              >
                <Save size={16} />
                <span>Save Project (.json)</span>
              </button>

              <div className="my-1.5 border-t border-white/10" />

              {/* Canvas Theme Toggle */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                  isDarkMode ? 'hover:bg-white/10 text-neutral-300' : 'hover:bg-neutral-100 text-neutral-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {isDarkMode ? <Moon size={16} /> : <Sun size={16} />}
                  <span>Theme</span>
                </div>
                <span className="text-neutral-400 capitalize">{isDarkMode ? 'Dark' : 'Light'}</span>
              </button>

              {/* Canvas Grid Toggle */}
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                  isDarkMode ? 'hover:bg-white/10 text-neutral-300' : 'hover:bg-neutral-100 text-neutral-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Grid size={16} />
                  <span>Dot Grid</span>
                </div>
                <span className="text-neutral-400">{showGrid ? 'On' : 'Off'}</span>
              </button>

              {/* Help & Shortcuts */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenHelp();
                }}
                className={`w-full flex items-center gap-2.5 p-2 rounded-lg transition-colors ${
                  isDarkMode ? 'hover:bg-white/10 text-neutral-300' : 'hover:bg-neutral-100 text-neutral-700'
                }`}
              >
                <HelpCircle size={16} />
                <span>Keyboard Shortcuts & Help</span>
              </button>

              <div className="my-1.5 border-t border-white/10" />

              {/* Clear Canvas */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  if (confirm('Are you sure you want to clear the entire whiteboard?')) {
                    onClearCanvas();
                  }
                }}
                className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 size={16} />
                <span>Clear Canvas</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
