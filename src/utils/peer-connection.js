import { Peer } from 'peerjs';

class PeerManager {
  constructor() {
    this.peer = null;
    this.myPeerId = null;
    this.connections = new Map(); // peerId -> DataConnection
    this.status = 'disconnected'; // 'disconnected' | 'connecting' | 'connected' | 'error'
    this.initPromise = null;

    // Callbacks
    this.onStatusChange = null;
    this.onPeerJoin = null;
    this.onPeerLeave = null;
    this.onData = null;
    this.onError = null;
  }

  setStatus(newStatus) {
    this.status = newStatus;
    if (this.onStatusChange) {
      this.onStatusChange(newStatus);
    }
  }

  /**
   * Initialize local Peer instance with single in-flight Promise guard
   * @param {string|null} preferredId - Optional custom ID, otherwise PeerJS cloud broker assigns one
   */
  initialize(preferredId = null) {
    if (this.peer && !this.peer.destroyed && this.myPeerId) {
      return Promise.resolve(this.myPeerId);
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.setStatus('connecting');

    this.initPromise = new Promise((resolve, reject) => {
      let timeoutId = null;
      let settled = false;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        this.initPromise = null;
      };

      try {
        const peerOptions = {
          debug: 1,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
            ],
          },
        };

        const peerInstance = preferredId ? new Peer(preferredId, peerOptions) : new Peer(peerOptions);
        this.peer = peerInstance;

        timeoutId = setTimeout(() => {
          if (!settled && !this.myPeerId) {
            settled = true;
            this.setStatus('error');
            cleanup();
            try {
              peerInstance.destroy();
            } catch {
              // ignore
            }
            reject(new Error('Peer connection timed out. Check your internet connection.'));
          }
        }, 15000);

        peerInstance.on('open', (id) => {
          if (settled) return;
          settled = true;
          cleanup();
          this.myPeerId = id;
          this.setStatus('connected');
          resolve(id);
        });

        // Listen for incoming peer connections
        peerInstance.on('connection', (conn) => {
          this.setupConnection(conn);
        });

        peerInstance.on('error', (err) => {
          console.error('[PeerManager] Peer error:', err);
          if (this.onError) this.onError(err);
          if (!settled) {
            settled = true;
            cleanup();
            this.setStatus('error');
            reject(err);
          }
        });

        peerInstance.on('disconnected', () => {
          this.setStatus('disconnected');
          if (this.peer && !this.peer.destroyed) {
            try {
              this.peer.reconnect();
            } catch {
              // ignore
            }
          }
        });
      } catch (err) {
        if (!settled) {
          settled = true;
          cleanup();
          this.setStatus('error');
          reject(err);
        }
      }
    });

    return this.initPromise;
  }

  /**
   * Connect to a remote peer (e.g. host)
   */
  connect(remotePeerId, metadata = {}) {
    if (!this.peer || this.peer.destroyed) {
      return Promise.reject(new Error('Peer is not initialized yet.'));
    }

    if (this.connections.has(remotePeerId)) {
      const existing = this.connections.get(remotePeerId);
      if (existing && existing.open) {
        return Promise.resolve(existing);
      }
    }

    return new Promise((resolve, reject) => {
      let timeoutId = null;
      let settled = false;

      const conn = this.peer.connect(remotePeerId, {
        reliable: true,
        metadata: {
          ...metadata,
          senderId: this.myPeerId,
        },
      });

      timeoutId = setTimeout(() => {
        if (!settled) {
          settled = true;
          try {
            conn.close();
          } catch {
            // ignore
          }
          reject(new Error(`Connecting to peer ${remotePeerId} timed out.`));
        }
      }, 12000);

      conn.on('open', () => {
        if (settled) return;
        settled = true;
        if (timeoutId) clearTimeout(timeoutId);
        this.setupConnection(conn);
        resolve(conn);
      });

      conn.on('error', (err) => {
        if (settled) return;
        settled = true;
        if (timeoutId) clearTimeout(timeoutId);
        try {
          conn.close();
        } catch {
          // ignore
        }
        console.error(`[PeerManager] Connection error with ${remotePeerId}:`, err);
        reject(err);
      });
    });
  }

  /**
   * Setup listeners on a DataConnection
   */
  setupConnection(conn) {
    const peerId = conn.peer;

    const onOpen = () => {
      this.connections.set(peerId, conn);
      if (this.onPeerJoin) {
        this.onPeerJoin(peerId, conn.metadata);
      }
    };

    if (conn.open) {
      onOpen();
    } else {
      conn.on('open', onOpen);
    }

    conn.on('data', (data) => {
      if (this.onData) {
        this.onData(data, peerId);
      }
    });

    conn.on('close', () => {
      this.connections.delete(peerId);
      if (this.onPeerLeave) {
        this.onPeerLeave(peerId);
      }
    });

    conn.on('error', (err) => {
      console.warn(`[PeerManager] Error on connection with ${peerId}:`, err);
      this.connections.delete(peerId);
      if (this.onPeerLeave) {
        this.onPeerLeave(peerId);
      }
    });
  }

  /**
   * Broadcast data to all connected peers, optionally excluding one peer ID
   */
  broadcast(data, excludePeerId = null) {
    for (const [peerId, conn] of this.connections.entries()) {
      if (excludePeerId && peerId === excludePeerId) continue;
      if (conn && conn.open) {
        try {
          conn.send(data);
        } catch (err) {
          console.error(`[PeerManager] Failed to send to ${peerId}:`, err);
        }
      }
    }
  }

  /**
   * Send data to a specific peer
   */
  sendTo(peerId, data) {
    const conn = this.connections.get(peerId);
    if (conn && conn.open) {
      try {
        conn.send(data);
      } catch (err) {
        console.error(`[PeerManager] Failed to sendTo ${peerId}:`, err);
      }
    }
  }

  getConnectedPeerCount() {
    return this.connections.size;
  }

  getConnectedPeers() {
    return Array.from(this.connections.keys());
  }

  /**
   * Disconnect and cleanup
   */
  destroy() {
    for (const conn of this.connections.values()) {
      try {
        conn.close();
      } catch {
        // ignore
      }
    }
    this.connections.clear();

    if (this.peer && !this.peer.destroyed) {
      try {
        this.peer.destroy();
      } catch {
        // ignore
      }
    }

    this.peer = null;
    this.myPeerId = null;
    this.initPromise = null;
    this.setStatus('disconnected');
  }
}

// Singleton helper
let instance = null;

export function getPeerManager() {
  if (!instance) {
    instance = new PeerManager();
  }
  return instance;
}

export { PeerManager };