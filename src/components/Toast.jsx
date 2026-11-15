import { useCanvasStore } from '../store/useCanvasStore';

export default function Toast() {
  const toastMessage = useCanvasStore((state) => state.toastMessage);
  const isDarkMode = useCanvasStore((state) => state.isDarkMode);

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-16 sm:bottom-12 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in motion-safe:slide-in-from-bottom-2 duration-150">
      <div
        className={`px-3.5 py-1.5 rounded-xl text-xs font-medium shadow-xl border backdrop-blur-md flex items-center gap-2 ${
          isDarkMode
            ? 'bg-[#18181c]/95 text-neutral-100 border-white/10 shadow-black/40'
            : 'bg-white/95 text-neutral-800 border-neutral-200 shadow-neutral-200/60'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-[#6965db]" />
        <span>{toastMessage}</span>
      </div>
    </div>
  );
}
