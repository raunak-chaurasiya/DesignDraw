import { useEffect } from 'react';
import { useCollabStore } from '../../store/useCollabStore';
import { useCanvasStore } from '../../store/useCanvasStore';

export default function CollaboratorCursors() {
  const remoteCursors = useCollabStore((state) => state.remoteCursors);
  const cleanupStaleCursors = useCollabStore((state) => state.cleanupStaleCursors);
  const zoom = useCanvasStore((state) => state.zoom);
  const pan = useCanvasStore((state) => state.pan);

  // Periodic cleanup for inactive cursors (> 8s)
  useEffect(() => {
    const timer = setInterval(() => {
      cleanupStaleCursors();
    }, 3000);
    return () => clearInterval(timer);
  }, [cleanupStaleCursors]);

  return (
    <>
      {Object.entries(remoteCursors).map(([id, cursor]) => {
        const screenX = cursor.x * zoom + pan.x;
        const screenY = cursor.y * zoom + pan.y;

        return (
          <div
            key={id}
            style={{
              position: 'absolute',
              left: `${screenX}px`,
              top: `${screenY}px`,
              pointerEvents: 'none',
              zIndex: 35,
              transform: 'translate(-2px, -2px)',
              transition: 'left 0.05s linear, top 0.05s linear',
            }}
            className="flex items-start gap-1 select-none pointer-events-none"
          >
            {/* Colorful Hand-drawn SVG Cursor */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className="drop-shadow-md"
            >
              <path
                d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
                fill={cursor.color || '#6965db'}
                stroke="#ffffff"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>

            {/* Name Tag Badge */}
            <span
              style={{ backgroundColor: cursor.color || '#6965db' }}
              className="px-2 py-0.5 text-[10px] font-semibold text-white rounded-md shadow-md whitespace-nowrap animate-in fade-in zoom-in-95 duration-100"
            >
              {cursor.name || 'Collaborator'}
            </span>
          </div>
        );
      })}
    </>
  );
}
