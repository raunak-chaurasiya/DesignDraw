import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { createPeerConnectionManager } from './peer-connection';

// Create the collaboration context
export const CollaborationContext = createContext(null);

export function CollaborationProvider({ children }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [localPeerId, setLocalPeerId] = useState(null);
  const [peerName, setPeerName] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [peers, setPeers] = useState(new Map());
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeData, setQrCodeData] = useState('');
  
  // Refs for managing connections
  const peerManagerRef = useRef(null);
  const pendingConnectionRef = useRef(null);
  const reconnectionAttemptsRef = useRef(new Map());
  
  // Canvas state for synchronization
  const [canvasState, setCanvasState] = useState({
    elements: [],
    tool: 'select',
    style: {},
    zoom: 1,
    pan: { x: 0, y: 0 },
  });
  
  // Sync history for undoing/redoing across peers
  const [syncHistory, setSyncHistory] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Initialize peer connection
  const initializePeer = useCallback(async (peerId = null) => {
    try {
      if (!peerManagerRef.current) {
        peerManagerRef.current = createPeerConnectionManager(peerId);
        peerManagerRef.current.onPeerJoined = (peerId, metadata) => {
          setPeers(prev => new Map(prev).set(peerId, {
            ...metadata,
            connected: true,
            joinedAt: Date.now(),
          }));
        };
        
        peerManagerRef.current.onPeerLeft = (peerId, metadata) => {
          setPeers(prev => {
            const newPeers = new Map(prev);
            newPeers.delete(peerId);
            return newPeers;
          });
          setRemoteStreams(prev => {
            const newStreams = new Map(prev);
            newStreams.delete(peerId);
            return newStreams;
          });
        };
        
        peerManagerRef.current.onStreamReceived = (stream, peerId) => {
          setRemoteStreams(prev => new Map(prev).set(peerId, stream));
        };
        
        peerManagerRef.current.onDataReceived = (peerId, data) => {
          handleIncomingData(peerId, data);
        };
        
        peerManagerRef.current.onConnectionError = (error) => {
          console.error('Connection error:', error);
          setConnectionStatus('error');
        };
      }

      const peerId_ = await peerManagerRef.current.initialize(peerId);
      setLocalPeerId(peerId_);
      setIsConnected(true);
      setIsInitialized(true);
      
      // Generate QR code for sharing
      if (peerManagerRef.current) {
        const qrData = peerManagerRef.current.generateQRCode();
        setQrCodeData(qrData);
      }
      
      return peerId_;
    } catch (error) {
      console.error('Failed to initialize peer:', error);
      setConnectionStatus('error');
      throw error;
    }
  }, []);

  // Connect to a specific peer
  const connectToPeer = useCallback(async (remotePeerId, userName = '') => {
    if (!peerManagerRef.current || !localPeerId) {
      throw new Error('Peer not initialized');
    }

    setConnectionStatus('connecting');
    
    try {
      await peerManagerRef.current.connectToPeer(remotePeerId, {
        userName,
        joinedAt: Date.now(),
      });
      
      setConnectionStatus('connected');
      return true;
    } catch (error) {
      console.error('Failed to connect to peer:', error);
      setConnectionStatus('error');
      throw error;
    }
  }, [localPeerId]);

  // Disconnect from all peers
  const disconnect = useCallback(() => {
    if (peerManagerRef.current) {
      peerManagerRef.current.disconnect();
    }
    
    // Reset state
    setPeers(new Map());
    setRemoteStreams(new Map());
    setLocalStream(null);
    setIsConnected(false);
    setIsInitialized(false);
    setLocalPeerId(null);
    setConnectionStatus('disconnected');
  }, []);

  // Send data to a specific peer
  const sendData = useCallback((peerId, data) => {
    if (peerManagerRef.current) {
      peerManagerRef.current.sendData(peerId, data);
    }
  }, []);

  // Send canvas state to all peers
  const broadcastCanvasState = useCallback((state, source = 'local') => {
    if (!isConnected || !peerManagerRef.current) return;
    
    const message = {
      type: 'canvas-state',
      payload: state,
      source,
      timestamp: Date.now(),
    };
    
    // Add to sync history
    setSyncHistory(prev => [...prev, message].slice(-50)); // Keep last 50 messages
    
    // Send to all connected peers
    peers.forEach((peer, peerId) => {
      sendData(peerId, message);
    });
  }, [isConnected, peers, sendData]);

  // Update local canvas state
  const updateCanvasState = useCallback((newState) => {
    setCanvasState(prev => {
      const updated = { ...prev, ...newState };
      broadcastCanvasState(updated);
      return updated;
    });
  }, [broadcastCanvasState]);

  // Handle incoming data from peers
  const handleIncomingData = useCallback((peerId, data) => {
    try {
      if (typeof data === 'string') {
        const message = JSON.parse(data);
        handleIncomingMessage(peerId, message);
      } else {
        handleIncomingMessage(peerId, data);
      }
    } catch (error) {
      console.error('Failed to parse incoming data:', error);
    }
  }, []);

  // Handle incoming messages
  const handleIncomingMessage = useCallback((peerId, message) => {
    switch (message.type) {
      case 'canvas-state':
        // Receive canvas state from another peer
        if (message.source !== localPeerId) {
          setIsSyncing(true);
          setCanvasState(message.payload);
          
          // Schedule sync to complete
          setTimeout(() => setIsSyncing(false), 1000);
        }
        break;
      
      case 'cursor-position':
        // Handle cursor position sharing
        break;
      
      case 'element-action':
        // Handle element operations from other peers
        break;
      
      default:
        console.log(`Unknown message type: ${message.type}`);
    }
  }, [localPeerId]);

  // Control audio/video
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const enabled = !isAudioEnabled;
      localStream.getAudioTracks().forEach(track => track.enabled = enabled);
      setIsAudioEnabled(enabled);
    }
  }, [localStream, isAudioEnabled]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      const enabled = !isVideoEnabled;
      localStream.getVideoTracks().forEach(track => track.enabled = enabled);
      setIsVideoEnabled(enabled);
    }
  }, [localStream, isVideoEnabled]);

  // Export connection info for sharing
  const getConnectionInfo = useCallback(() => {
    if (!peerManagerRef.current) return null;
    
    return {
      peerId: localPeerId,
      peerName,
      qrCode: qrCodeData,
      connectionStatus,
      peersCount: peers.size,
      isConnected,
    };
  }, [localPeerId, peerName, qrCodeData, connectionStatus, peers.size, isConnected]);

  // Expose methods and state
  const value = {
    // State
    isInitialized,
    isConnected,
    localPeerId,
    peerName,
    setPeerName,
    connectionStatus,
    peers: Array.from(peers.values()),
    localStream,
    remoteStreams: Array.from(remoteStreams.values()),
    canvasState,
    syncHistory,
    isSyncing,
    isAudioEnabled,
    isVideoEnabled,
    showQRModal,
    setShowQRModal,
    qrCodeData,
    
    // Methods
    initializePeer,
    connectToPeer,
    disconnect,
    sendData,
    updateCanvasState,
    toggleAudio,
    toggleVideo,
    getConnectionInfo,
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
}