import { useRef } from 'react';
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
  ExternalLink,
  Cloud,
} from 'lucide-react';
import { importFromJson } from '../utils/export';
import { useCanvasStore } from '../store/useCanvasStore';
import { useAuth } from '../context/AuthContext';

function GithubIcon({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`shrink-0 ${className}`}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

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

  // Cloud Store selectors
  const cloudBoards = useCanvasStore((state) => state.cloudBoards);
  const setIsBoardsListOpen = useCanvasStore((state) => state.setIsBoardsListOpen);
  const saveCurrentBoardToCloud = useCanvasStore((state) => state.saveCurrentBoardToCloud);
  const showToast = useCanvasStore((state) => state.showToast);

  const { isSignedIn, openSignIn } = useAuth();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await importFromJson(file);
      onLoadElements(data.elements || [], data.appState);
      setIsOpen(false);
    } catch (err) {
      alert('Error loading file: ' + err.message);
    }
  };


  return (
    <>
      {/* Top Left Menu Trigger Button */}
      <div className="fixed top-3 sm:top-4 left-3 sm:left-4 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          title="Open menu"
          className={`p-2 rounded-xl border shadow-lg backdrop-blur-md transition-colors flex items-center justify-center cursor-pointer ${
            isDarkMode
              ? 'bg-[#18181c]/95 border-white/10 text-neutral-300 hover:text-white hover:bg-white/5'
              : 'bg-white/95 border-neutral-200 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 shadow-neutral-200/50'
          }`}
        >
          {isOpen ? <X size={18} strokeWidth={1.5} /> : <Menu size={18} strokeWidth={1.5} />}
        </button>
      </div>

      {/* Menu Drawer */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <div
            className={`fixed top-14 sm:top-16 left-3 sm:left-4 z-50 w-72 rounded-2xl border p-3 shadow-xl backdrop-blur-md transition-colors ${
              isDarkMode
                ? 'bg-[#18181c] border-white/10 text-neutral-200 shadow-black/60'
                : 'bg-white border-neutral-200 text-neutral-800 shadow-neutral-300/40'
            }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-2 py-1 border-b mb-2.5 ${
              isDarkMode ? 'border-white/10' : 'border-neutral-200'
            }`}>
              <span className="text-xs font-normal text-neutral-400">
                Menu
              </span>
            </div>

            <div className="space-y-0.5 text-xs">
              {/* Save to Cloud */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  if (!isSignedIn) {
                    showToast('Please sign in to save boards to the cloud');
                    openSignIn();
                    return;
                  }
                  saveCurrentBoardToCloud();
                }}
                className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer ${
                  isDarkMode ? 'hover:bg-white/5 text-neutral-200' : 'hover:bg-neutral-100 text-neutral-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Cloud size={15} strokeWidth={1.5} className="text-neutral-400" />
                  <span>Save to cloud</span>
                </div>
                {!isSignedIn && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    isDarkMode ? 'bg-white/10 text-neutral-400' : 'bg-neutral-100 text-neutral-500'
                  }`}>
                    Sign in
                  </span>
                )}
              </button>

              {/* View Cloud Boards */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsBoardsListOpen(true);
                }}
                className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer ${
                  isDarkMode ? 'hover:bg-white/5 text-neutral-200' : 'hover:bg-neutral-100 text-neutral-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FolderOpen size={15} strokeWidth={1.5} className="text-neutral-400" />
                  <span>Saved boards</span>
                </div>
                <span className="text-[10px] font-mono text-neutral-500">
                  {cloudBoards.length}
                </span>
              </button>

              <div className={`my-1 border-t ${isDarkMode ? 'border-white/10' : 'border-neutral-200'}`} />

              {/* Export */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenExport();
                }}
                className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors cursor-pointer ${
                  isDarkMode ? 'hover:bg-white/5 text-neutral-200' : 'hover:bg-neutral-100 text-neutral-800'
                }`}
              >
                <Download size={15} strokeWidth={1.5} className="text-neutral-400" />
                <span>Export image (PNG, SVG, JPG)</span>
              </button>

              {/* Open File */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors cursor-pointer ${
                  isDarkMode ? 'hover:bg-white/5 text-neutral-200' : 'hover:bg-neutral-100 text-neutral-800'
                }`}
              >
                <FolderOpen size={15} strokeWidth={1.5} className="text-neutral-400" />
                <span>Open local file (.json)</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Save File */}
              <button
                onClick={() => {
                  onSaveProject();
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors cursor-pointer ${
                  isDarkMode ? 'hover:bg-white/5 text-neutral-200' : 'hover:bg-neutral-100 text-neutral-800'
                }`}
              >
                <Save size={15} strokeWidth={1.5} className="text-neutral-400" />
                <span>Save local file (.json)</span>
              </button>

              <div className={`my-1 border-t ${isDarkMode ? 'border-white/10' : 'border-neutral-200'}`} />

              {/* Theme Toggle */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer ${
                  isDarkMode ? 'hover:bg-white/5 text-neutral-200' : 'hover:bg-neutral-100 text-neutral-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isDarkMode ? <Moon size={15} strokeWidth={1.5} className="text-neutral-400" /> : <Sun size={15} strokeWidth={1.5} className="text-neutral-400" />}
                  <span>Theme</span>
                </div>
                <span className="text-neutral-400 capitalize">{isDarkMode ? 'Dark' : 'Light'}</span>
              </button>

              {/* Dot Grid */}
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer ${
                  isDarkMode ? 'hover:bg-white/5 text-neutral-200' : 'hover:bg-neutral-100 text-neutral-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Grid size={15} strokeWidth={1.5} className="text-neutral-400" />
                  <span>Dot grid</span>
                </div>
                <span className="text-neutral-400">{showGrid ? 'On' : 'Off'}</span>
              </button>

              {/* Shortcuts */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenHelp();
                }}
                className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors cursor-pointer ${
                  isDarkMode ? 'hover:bg-white/5 text-neutral-200' : 'hover:bg-neutral-100 text-neutral-800'
                }`}
              >
                <HelpCircle size={15} strokeWidth={1.5} className="text-neutral-400" />
                <span>Shortcuts</span>
              </button>

              <div className={`my-1 border-t ${isDarkMode ? 'border-white/10' : 'border-neutral-200'}`} />

              {/* GitHub Link */}
              <a
                href="https://github.com/raunak-chaurasiya/DesignDraw"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                  isDarkMode ? 'hover:bg-white/5 text-neutral-300' : 'hover:bg-neutral-100 text-neutral-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <GithubIcon size={15} className="text-neutral-400" />
                  <span>GitHub</span>
                </div>
                <ExternalLink size={12} className="opacity-40" />
              </a>

              {/* Clear Canvas */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  if (confirm('Clear the entire whiteboard canvas?')) {
                    onClearCanvas();
                  }
                }}
                className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
              >
                <Trash2 size={15} strokeWidth={1.5} />
                <span>Clear canvas</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
