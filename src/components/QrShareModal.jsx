import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, X, Users, LogOut } from 'lucide-react';

export default function QrShareModal({
  isOpen,
  onClose,
  shareUrl,
  connectedCount = 0,
  isHost = true,
  onDisconnect,
  isDarkMode = true,
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm select-none overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-sm sm:max-w-md max-h-[92vh] overflow-y-auto rounded-2xl p-5 sm:p-6 shadow-xl border transition-colors ${
          isDarkMode
            ? 'bg-[#18181c] border-white/10 text-neutral-100 shadow-black/60'
            : 'bg-white border-neutral-200 text-neutral-900 shadow-neutral-300/40'
        }`}
        style={{ scrollbarWidth: 'thin' }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-1.5 rounded-lg transition-colors cursor-pointer ${
            isDarkMode
              ? 'hover:bg-white/10 text-neutral-400 hover:text-white'
              : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900'
          }`}
          title="Close"
        >
          <X size={18} strokeWidth={1.5} />
        </button>

        {/* Header */}
        <div className="mb-4 pr-6">
          <h2 className="text-base sm:text-lg font-medium leading-tight truncate">
            Live collaboration
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5 truncate">
            {isHost ? 'Share link or QR code with collaborators' : 'Connected to shared session'}
          </p>
        </div>

        {/* Status Badge */}
        <div
          className={`flex items-center justify-between px-3 py-2 rounded-lg mb-4 text-xs font-normal border ${
            isDarkMode
              ? 'bg-white/[0.03] border-white/8 text-neutral-300'
              : 'bg-neutral-50 border-neutral-200 text-neutral-600'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 truncate">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
            <span className={`truncate ${isDarkMode ? 'text-neutral-200' : 'text-neutral-700'}`}>
              {connectedCount > 0 ? 'Session active' : 'Waiting for peers'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-neutral-400 shrink-0 font-mono text-[11px]">
            <Users size={13} strokeWidth={1.5} />
            <span>
              {connectedCount + 1} {connectedCount === 0 ? '(You)' : 'connected'}
            </span>
          </div>
        </div>

        {/* QR Code Container */}
        {shareUrl ? (
          <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white border border-neutral-200 mb-4">
            <div className="p-1">
              <QRCodeSVG
                value={shareUrl}
                size={150}
                level="M"
                includeMargin={false}
                className="rounded mx-auto"
              />
            </div>
            <p className="text-[11px] text-neutral-500 mt-2 text-center">
              Scan with mobile camera to join
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-neutral-500 text-xs">
            Connecting to broker...
          </div>
        )}

        {/* Link Input & Copy Button */}
        <div className="space-y-1.5 mb-4">
          <label className="text-xs text-neutral-400">
            Room link
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl || ''}
              className={`flex-1 min-w-0 px-3 py-2 text-xs rounded-lg border font-mono select-all focus:outline-none ${
                isDarkMode
                  ? 'bg-white/[0.04] border-white/10 text-neutral-300'
                  : 'bg-neutral-50 border-neutral-200 text-neutral-800'
              }`}
            />
            <button
              onClick={handleCopy}
              disabled={!shareUrl}
              className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-normal transition-colors shrink-0 cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : isDarkMode
                  ? 'bg-neutral-100 text-neutral-900 hover:bg-white'
                  : 'bg-neutral-900 text-white hover:bg-neutral-800'
              }`}
            >
              {copied ? (
                <>
                  <Check size={14} strokeWidth={1.5} />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy size={14} strokeWidth={1.5} />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className={`flex items-center justify-between pt-3 border-t ${
          isDarkMode ? 'border-white/10' : 'border-neutral-200'
        }`}>
          {onDisconnect ? (
            <button
              onClick={() => {
                onDisconnect();
                onClose();
              }}
              className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors py-1.5 px-2 rounded-md hover:bg-rose-500/10 cursor-pointer"
            >
              <LogOut size={13} strokeWidth={1.5} />
              <span>Leave session</span>
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className={`px-3.5 py-1.5 text-xs font-normal rounded-lg border transition-colors cursor-pointer ${
              isDarkMode
                ? 'border-white/10 hover:bg-white/5 text-neutral-300'
                : 'border-neutral-200 hover:bg-neutral-100 text-neutral-700'
            }`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

