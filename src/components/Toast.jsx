import { useCanvasStore } from '../store/useCanvasStore';

export default function Toast() {
  const toastMessage = useCanvasStore((state) => state.toastMessage);

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-14 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-150">
      <div className="px-3.5 py-1.5 rounded-xl bg-[#1e1e24]/95 text-white text-xs font-medium shadow-2xl border border-[#34343e] backdrop-blur-md flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#6965db] animate-pulse" />
        <span>{toastMessage}</span>
      </div>
    </div>
  );
}
