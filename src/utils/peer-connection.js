import { Peer } from 'peerjs';

class PeerManager {
  constructor() {
    this.peer = null;
    this.myPeerId = null;
    this.connections = new Map(); // peerId -> DataConnection
    this.status = 'disconnected'; // 'disconnected' | 'connecting' | 'connected' | 'error'

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
   * Initialize local Peer instance
   * @param {string|null} preferredId - Optional custom ID, otherwise PeerJS cloud broker assigns one
   */
  initialize(preferredId = null) {
    if (this.peer && !this.peer.destroyed && this.myPeerId) {
      return Promise.resolve(this.myPeerId);
    }

    this.setStatus('connecting');

    return new Promise((resolve, reject) => {
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

        this.peer = preferredId ? new Peer(preferredId, peerOptions) : new Peer(peerOptions);

        const timeout = setTimeout(() => {
          if (!this.myPeerId) {
            this.setStatus('error');
            reject(new Error('Peer connection timed out. Check your internet connection.'));
          }
        }, 15000);

        this.peer.on('open', (id) => {
          clearTimeout(timeout);
          this.myPeerId = id;
          this.setStatus('connected');
          resolve(id);
        });

        // Listen for incoming peer connections
        this.peer.on('connection', (conn) => {
          this.setupConnection(conn);
        });

        this.peer.on('error', (err) => {
          console.error('[PeerManager] Peer error:', err);
          if (this.onError) this.onError(err);
          this.setStatus('error');
        });

        this.peer.on('disconnected', () => {
          this.setStatus('disconnected');
          if (this.peer && !this.peer.destroyed) {
            try {
              this.peer.reconnect();
            } catch (e) {
              console.warn('[PeerManager] Reconnect error:', e);
            }
          }
        });
      } catch (err) {
        this.setStatus('error');
        reject(err);
      }
    });
  }

  /**
   * Connect to a remote peer (e.g. host)
   */
  connect(remotePeerId, metadata = {}) {
    if (!this.peer || this.peer.destroyed) {
      return Promise.reject(new Error('Peer is not initialized yet.'));
    }

    if (this.connections.has(remotePeerId)) {
      return Promise.resolve(this.connections.get(remotePeerId));
    }

    return new Promise((resolve, reject) => {
      const conn = this.peer.connect(remotePeerId, {
        reliable: true,
        metadata: {
          ...metadata,
          senderId: this.myPeerId,
        },
      });

      const timeout = setTimeout(() => {
        reject(new Error(`Connecting to peer ${remotePeerId} timed out.`));
      }, 12000);

      conn.on('open', () => {
        clearTimeout(timeout);
        this.setupConnection(conn);
        resolve(conn);
      });

      conn.on('error', (err) => {
        clearTimeout(timeout);
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
   * Broadcast data to all connected peers
   */
  broadcast(data) {
    for (const [peerId, conn] of this.connections.entries()) {
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
      } catch (e) {
        // ignore
      }
    }
    this.connections.clear();

    if (this.peer && !this.peer.destroyed) {
      try {
        this.peer.destroy();
      } catch (e) {
        // ignore
      }
    }

    this.peer = null;
    this.myPeerId = null;
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

export function createPeerConnectionManager() {
  return getPeerManager();
}

export { PeerManager };