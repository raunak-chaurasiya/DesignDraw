import { useState } from 'react';
import { X, Trash2, FolderOpen, Plus, Clock, Layers } from 'lucide-react';
import { useCanvasStore } from '../store/useCanvasStore';
import { useAuth } from '../context/AuthContext';

export default function CloudBoardsModal() {
  const isBoardsListOpen = useCanvasStore((state) => state.isBoardsListOpen);
  const setIsBoardsListOpen = useCanvasStore((state) => state.setIsBoardsListOpen);
  const cloudBoards = useCanvasStore((state) => state.cloudBoards);
  const isDarkMode = useCanvasStore((state) => state.isDarkMode);
  const loadCloudBoard = useCanvasStore((state) => state.loadCloudBoard);
  const deleteCloudBoard = useCanvasStore((state) => state.deleteCloudBoard);
  const saveCurrentBoardToCloud = useCanvasStore((state) => state.saveCurrentBoardToCloud);
  const showToast = useCanvasStore((state) => state.showToast);

  const { isSignedIn, openSignIn } = useAuth();
  const [newBoardTitle, setNewBoardTitle] = useState('');

  if (!isBoardsListOpen) return null;

  const handleSaveCurrent = (e) => {
    e.preventDefault();
    if (!newBoardTitle.trim()) return;
    if (!isSignedIn) {
      showToast('Please sign in to save boards to the cloud');
      openSignIn();
      return;
    }
    const success = saveCurrentBoardToCloud(newBoardTitle.trim());
    if (success) {
      setNewBoardTitle('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsBoardsListOpen(false)}
      />

      {/* Modal Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cloud-boards-title"
        className={`relative w-full max-w-md rounded-2xl border shadow-xl p-5 z-10 transition-colors ${
          isDarkMode
            ? 'bg-[#18181c] border-white/10 text-neutral-100 shadow-black/60'
            : 'bg-white border-neutral-200 text-neutral-900 shadow-neutral-300/40'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between pb-3 border-b mb-4 ${
          isDarkMode ? 'border-white/10' : 'border-neutral-200'
        }`}>
          <div>
            <h3 id="cloud-boards-title" className="text-base font-medium">Saved boards</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {cloudBoards.length} {cloudBoards.length === 1 ? 'board' : 'boards'} saved
            </p>
          </div>

          <button
            onClick={() => setIsBoardsListOpen(false)}
            aria-label="Close saved boards"
            className={`p-1.5 rounded-lg transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#6965db] focus-visible:outline-none ${
              isDarkMode ? 'text-neutral-400 hover:text-white hover:bg-white/10' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Sign in hint if not signed in */}
        {!isSignedIn && (
          <div className={`flex items-center justify-between px-3 py-2 mb-3.5 rounded-xl border text-xs transition-colors ${
            isDarkMode
              ? 'bg-white/[0.03] border-white/10 text-neutral-300'
              : 'bg-neutral-50 border-neutral-200 text-neutral-700'
          }`}>
            <span>Sign in to sync your boards</span>
            <button
              type="button"
              onClick={() => openSignIn()}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                isDarkMode
                  ? 'bg-white text-neutral-900 hover:bg-neutral-200'
                  : 'bg-neutral-900 text-white hover:bg-neutral-800'
              }`}
            >
              Sign in
            </button>
          </div>
        )}

        {/* Save Current Board Form */}
        <form onSubmit={handleSaveCurrent} className="flex gap-2 mb-4">
          <input
            type="text"
            value={newBoardTitle}
            onChange={(e) => setNewBoardTitle(e.target.value)}
            placeholder="Board title"
            aria-label="Board title"
            className={`flex-1 px-3 py-2 text-xs rounded-lg border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#6965db] ${
              isDarkMode
                ? 'bg-white/[0.04] border-white/10 text-white placeholder-neutral-500 focus:border-white/30'
                : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:border-neutral-400'
            }`}
          />
          <button
            type="submit"
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-normal rounded-lg transition-colors shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#6965db] focus-visible:outline-none motion-safe:active:scale-[0.96] ${
              isDarkMode
                ? 'bg-neutral-100 text-neutral-900 hover:bg-white'
                : 'bg-neutral-900 text-white hover:bg-neutral-800'
            }`}
          >
            <Plus size={14} strokeWidth={1.5} />
            <span>Save</span>
          </button>
        </form>

        {/* Boards List */}
        <div className="space-y-1.5 max-h-64 overflow-y-auto overscroll-contain pr-1" style={{ scrollbarWidth: 'thin' }}>
          {cloudBoards.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 text-xs">
              No saved boards yet. Draw on the canvas and click Save.
            </div>
          ) : (
            cloudBoards.map((board) => (
              <div
                key={board.id}
                className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                  isDarkMode
                    ? 'bg-white/[0.02] border-white/8 hover:bg-white/[0.05]'
                    : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                <div className="min-w-0 pr-3">
                  <h4 className={`text-xs font-normal truncate ${
                    isDarkMode ? 'text-neutral-200' : 'text-neutral-800'
                  }`}>
                    {board.title}
                  </h4>
                  <div className="flex items-center gap-3 mt-0.5 text-[10px] text-neutral-400">
                    <span className="flex items-center gap-1">
                      <Clock size={11} strokeWidth={1.5} />
                      {new Date(board.updatedAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers size={11} strokeWidth={1.5} />
                      {board.elementsCount || 0} items
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      loadCloudBoard(board.id);
                      setIsBoardsListOpen(false);
                    }}
                    title="Open board"
                    className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <FolderOpen size={13} strokeWidth={1.5} />
                    <span>Open</span>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${board.title}"?`)) {
                        deleteCloudBoard(board.id);
                      }
                    }}
                    title="Delete board"
                    className="p-1 rounded-md text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
