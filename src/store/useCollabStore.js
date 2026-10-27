import { create } from 'zustand';
import { getPeerManager } from '../utils/peer-connection';
import { validateScene } from '../utils/validation';
import { useCanvasStore } from './useCanvasStore';

export const useCollabStore = create((set, get) => ({
  isCollabOpen: false,
  isCollabActive: false,
  isHost: true,
  myPeerId: null,
  shareUrl: '',
  connectedPeerCount: 0,
  remoteCursors: {}, // peerId -> { x, y, name, color, lastSeen }
  status: 'disconnected', // 'disconnected' | 'connecting' | 'connected' | 'error'
  hasReceivedHostInit: false,

  userProfile: {
    name: `User ${Math.floor(100 + Math.random() * 900)}`,
    color: ['#6965db', '#e03131', '#2f9e44', '#f08c00', '#1098ad', '#d6336c', '#7048e8', '#0ca678'][
      Math.floor(Math.random() * 8)
    ],
  },

  setIsCollabOpen: (isOpen) => set({ isCollabOpen: isOpen }),

  // Initialize and connect
  startCollaboration: async (targetRoomId = null, showToast = () => {}) => {
    try {
      const manager = getPeerManager();

      manager.onStatusChange = (status) => {
        set({ status });
      };

      manager.onPeerJoin = (joinedPeerId) => {
        const { isHost } = get();
        set({ connectedPeerCount: manager.getConnectedPeerCount() });
        showToast('A collaborator joined the whiteboard!');

        // ONLY the authoritative room host sends the initial canvas state to newly joined guests!
        // Guests NEVER send INIT_CANVAS!
        if (isHost) {
          const currentElements = useCanvasStore.getState().elements;
          manager.sendTo(joinedPeerId, {
            type: 'INIT_CANVAS',
            elements: currentElements,
            senderId: manager.myPeerId,
          });
        }
      };

      manager.onPeerLeave = (leftPeerId) => {
        set((state) => {
          const next = { ...state.remoteCursors };
          delete next[leftPeerId];
          return {
            connectedPeerCount: manager.getConnectedPeerCount(),
            remoteCursors: next,
          };
        });
        showToast('A collaborator left the whiteboard.');
      };

      // Inbound message handler with authoritative merge & host relaying
      manager.onData = (data, senderId) => {
        if (!data || typeof data !== 'object') return;
        const { isHost } = get();

        if (data.type === 'INIT_CANVAS') {
          // Guests accept INIT_CANVAS only once from host; host never accepts INIT_CANVAS
          if (!isHost && !get().hasReceivedHostInit) {
            try {
              const validated = validateScene(data.elements || []);
              useCanvasStore.setState({
                elements: validated,
                history: [validated],
                historyIndex: 0,
                selectedElementIds: [],
              });
              set({ hasReceivedHostInit: true });
              showToast('Whiteboard synchronized with host!');
            } catch (err) {
              console.warn('[Collab] Failed to parse INIT_CANVAS:', err);
            }
          }
        } else if (data.type === 'CANVAS_UPDATE') {
          try {
            const incomingElements = validateScene(data.elements || []);
            const currentElements = useCanvasStore.getState().elements;

            // Merging strategy: per-element Last-Write-Wins (LWW) based on version/updatedAt
            const currentMap = new Map(currentElements.map((el) => [el.id, el]));
            const mergedMap = new Map(currentElements.map((el) => [el.id, el]));

            for (const inc of incomingElements) {
              const existing = currentMap.get(inc.id);
              if (!existing) {
                mergedMap.set(inc.id, inc);
              } else {
                const incVer = inc.version || 1;
                const existVer = existing.version || 1;
                const incTime = inc.updatedAt || 0;
                const existTime = existing.updatedAt || 0;

                if (incVer > existVer || (incVer === existVer && incTime >= existTime)) {
                  mergedMap.set(inc.id, inc);
                }
              }
            }

            // Also handle deletions: if an element is removed in the incoming snapshot
            // when originating from authoritative host or if host is updating
            const finalMerged = isHost
              ? incomingElements // host directly reconciles
              : Array.from(mergedMap.values());

            useCanvasStore.setState((state) => {
              const nextHist = [...state.history.slice(0, 50), finalMerged];
              const bounded = nextHist.length > 50 ? nextHist.slice(nextHist.length - 50) : nextHist;
              return {
                elements: finalMerged,
                history: bounded,
                historyIndex: bounded.length - 1,
              };
            });

            // If this is the Host, relay the update to all OTHER guests! (Fixing CodeRabbit item 6)
            if (isHost) {
              manager.broadcast(
                {
                  type: 'CANVAS_UPDATE',
                  elements: finalMerged,
                  senderId: manager.myPeerId,
                },
                senderId // exclude original sender to prevent loops
              );
            }
          } catch (err) {
            console.warn('[Collab] Failed to apply CANVAS_UPDATE:', err);
          }
        } else if (data.type === 'CURSOR_MOVE') {
          const sender = data.senderId || senderId;
          set((state) => ({
            remoteCursors: {
              ...state.remoteCursors,
              [sender]: {
                x: data.x,
                y: data.y,
                name: data.name || 'Collaborator',
                color: data.color || '#6965db',
                lastSeen: Date.now(),
              },
            },
          }));

          // If Host, relay cursor move to other peers
          if (isHost) {
            manager.broadcast(data, senderId);
          }
        }
      };

      manager.onError = (err) => {
        console.error('[LiveCollab] Error:', err);
        showToast('Collaboration error. Please check your network.');
        set({ status: 'error' });
      };

      const myId = await manager.initialize();
      set({ myPeerId: myId });

      if (targetRoomId && targetRoomId !== myId) {
        set({ isHost: false, hasReceivedHostInit: false });
        showToast('Connecting to room...');
        await manager.connect(targetRoomId, {
          name: get().userProfile.name,
        });
        set({
          isCollabActive: true,
          shareUrl: window.location.href,
        });
        showToast('Connected to live whiteboard!');
      } else {
        set({ isHost: true, hasReceivedHostInit: true });
        const generatedUrl = `${window.location.origin}${window.location.pathname}?room=${myId}`;
        set({
          shareUrl: generatedUrl,
          isCollabActive: true,
          isCollabOpen: true,
        });
        window.history.replaceState({}, '', generatedUrl);
        showToast('Live room created! Share link or QR code.');
      }
    } catch (err) {
      console.error('[LiveCollab] Failed to start:', err);
      showToast(err.message || 'Failed to start live collaboration.');
      set({ status: 'error', isCollabActive: false });
    }
  },

  stopCollaboration: (showToast = () => {}) => {
    const manager = getPeerManager();
    manager.destroy();

    set({
      isCollabActive: false,
      connectedPeerCount: 0,
      remoteCursors: {},
      shareUrl: '',
      hasReceivedHostInit: false,
      status: 'disconnected',
    });

    window.history.replaceState({}, '', window.location.pathname);
    showToast('Left live collaboration session.');
  },

  // Broadcast scene changes to peers
  broadcastSceneUpdate: (elements) => {
    const { isCollabActive, myPeerId } = get();
    if (!isCollabActive) return;

    const manager = getPeerManager();
    manager.broadcast({
      type: 'CANVAS_UPDATE',
      elements,
      senderId: myPeerId,
    });
  },

  // Broadcast local cursor
  broadcastCursor: (canvasX, canvasY) => {
    const { isCollabActive, myPeerId, userProfile } = get();
    if (!isCollabActive) return;

    const manager = getPeerManager();
    manager.broadcast({
      type: 'CURSOR_MOVE',
      x: Math.round(canvasX),
      y: Math.round(canvasY),
      name: userProfile.name,
      color: userProfile.color,
      senderId: myPeerId,
    });
  },

  // Clean up stale cursors (> 8s old)
  cleanupStaleCursors: () => {
    const now = Date.now();
    set((state) => {
      let changed = false;
      const next = { ...state.remoteCursors };
      for (const [id, c] of Object.entries(next)) {
        if (now - c.lastSeen > 8000) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? { remoteCursors: next } : state;
    });
  },
}));
