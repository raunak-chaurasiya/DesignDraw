import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, X, Users, Wifi, LogOut, Radio } from 'lucide-react';

export default function QrShareModal({
  isOpen,
  onClose,
  shareUrl,
  peerId,
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-sm sm:max-w-md rounded-2xl p-6 shadow-2xl border transition-all duration-200 ${
          isDarkMode
            ? 'bg-[#1e1e24] border-[#34343e] text-white shadow-black/60'
            : 'bg-white border-neutral-200 text-neutral-800 shadow-xl'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-1.5 rounded-lg transition-colors ${
            isDarkMode
              ? 'hover:bg-[#2b2b34] text-neutral-400 hover:text-white'
              : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-[#6965db]/15 text-[#827fe2]">
            <Radio size={22} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight">Live Collaboration</h2>
            <p className="text-xs text-neutral-400">
              {isHost ? 'Anyone with this link or QR can draw together' : 'Connected to shared session'}
            </p>
          </div>
        </div>

        {/* Live Status Badge */}
        <div
          className={`flex items-center justify-between px-3.5 py-2 rounded-xl mb-5 text-xs font-medium border ${
            isDarkMode
              ? 'bg-[#26262e] border-[#363642] text-neutral-300'
              : 'bg-neutral-50 border-neutral-200 text-neutral-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-emerald-500">
              {connectedCount > 0 ? 'Live Session Active' : 'Waiting for collaborators'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-neutral-400">
            <Users size={14} />
            <span>
              {connectedCount + 1} {connectedCount === 0 ? 'user (You)' : 'users online'}
            </span>
          </div>
        </div>

        {/* QR Code Container */}
        {shareUrl ? (
          <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white border border-neutral-200 mb-4 shadow-inner">
            <QRCodeSVG
              value={shareUrl}
              size={180}
              level="M"
              includeMargin={false}
              className="rounded"
            />
            <p className="text-[11px] font-semibold text-neutral-500 mt-2.5 tracking-wide">
              Scan with mobile camera to join instantly
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-neutral-400 text-sm">
            <Wifi size={28} className="animate-pulse mb-2 text-[#6965db]" />
            Initializing live room...
          </div>
        )}

        {/* Link input & Copy Button */}
        <div className="space-y-2 mb-5">
          <label className="text-xs font-semibold text-neutral-400">
            Collaboration Link
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl || ''}
              className={`flex-1 px-3 py-2 text-xs rounded-xl border font-mono select-all focus:outline-none ${
                isDarkMode
                  ? 'bg-[#26262e] border-[#363642] text-neutral-300'
                  : 'bg-neutral-50 border-neutral-300 text-neutral-800'
              }`}
            />
            <button
              onClick={handleCopy}
              disabled={!shareUrl}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                copied
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-[#6965db] hover:bg-[#5b57d1] text-white shadow-md hover:shadow-indigo-500/25'
              }`}
            >
              {copied ? (
                <>
                  <Check size={14} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={14} />
                  Copy Link
                </>
              )}
            </button>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-700/30">
          {onDisconnect ? (
            <button
              onClick={() => {
                onDisconnect();
                onClose();
              }}
              className="flex items-center gap-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 transition-colors py-1 px-2 rounded-lg hover:bg-rose-500/10"
            >
              <LogOut size={14} />
              Stop Session
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              isDarkMode
                ? 'border-[#363642] hover:bg-[#282830] text-neutral-300'
                : 'border-neutral-300 hover:bg-neutral-100 text-neutral-700'
            }`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}