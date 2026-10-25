import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Palette, 
  Wifi, 
  Users, 
  MessageCircle, 
  Share,
  ExternalLink,
  QrCode,
  X,
  CheckCircle,
  Loader2,
  Mic,
  Video,
} from 'lucide-react';

export default function ConnectionManager({ isInitialized, isConnected, connectionStatus, peers }) {
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [inputPeerId, setInputPeerId] = useState('');
  const [userName, setUserName] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  
  // Function to open the connection panel
  const openConnectModal = useCallback(() => {
    setShowConnectModal(true);
    setInputPeerId('');
    setUserName('');
  }, []);

  // Handle peer connection
  const handleConnect = useCallback(async (peerId) => {
    try {
      if (isConnected) {
        // Already connected to one peer
        if (peers.size > 0) {
          // Ask if they want to connect to another peer
          setInputPeerId(peerId);
          setShowConnectModal(true);
        }
      } else {
        // Connect to the specified peer
        await connectToPeerWithId(peerId);
      }
    } catch (error) {
      console.error('Connection error:', error);
    }
  }, [isConnected, peers]);

  // Actually connect to a peer by ID
  const connectToPeerWithId = useCallback(async (peerId) => {
    // This would integrate with the collaboration context
    // For now, show a message
    alert(`Connecting to peer: ${peerId}`);
    setShowConnectModal(false);
    setInputPeerId('');
  }, []);

  // Handle disconnect
  const handleDisconnect = useCallback(() => {
    setShowDisconnectConfirm(true);
  }, []);

  const confirmDisconnect = useCallback(async () => {
    // Disconnect from all peers
    setShowDisconnectConfirm(false);
    setShowConnectModal(false);
    inputPeerId && setInputPeerId('');
    // In real implementation, call collaborationContext.disconnect()
    alert('Disconnected from all peers');
  }, []);

  const cancelDisconnect = useCallback(() => {
    setShowDisconnectConfirm(false);
  }, []);

  // Generate QR code
  const generateQR = useCallback(() => {
    if (isInitialized) {
      setShowQrModal(true);
    }
  }, [isInitialized]);

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* Connection Status Button */}
      <button
        onClick={openConnectModal}
        title="Connect for live collaboration"
        className={`relative inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${isConnected
          ? 'bg-green-100 text-green-800 border-green-200'
          : 'bg-gray-200 text-gray-600 border-gray-300 hover:bg-gray-300'
        }`}
      >
        <Users className="mr-2 h-4 w-4" />
        {isConnected 
          ? `Connected with ${peers.size} user${peers.size !== 1 ? 's' : ''}`
          : 'Live Collaboration'
        }
        {isConnected && peers.size > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {peers.size}
          </span>
        )}
        {isInitialized && !isConnected && (
          <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            Connecting...
          </span>
        )}
      </button>

      {/* Connect Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={() => setShowConnectModal(false)}>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm sm:max-w-md rounded-2xl border p-6 shadow-xl bg-white backdrop-blur-md transform translate-y-0 transition-all duration-300 ease-out" style={{ opacity: 0 }}>
            <h3 className="text-lg font-semibold mb-4">Connect to Collaborator</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Peer ID or URL</label>
              <input
                type="text"
                value={inputPeerId}
                onChange={(e) => setInputPeerId(e.target.value)}
                placeholder="Enter peer ID or paste share link"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Your Name</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Your name for collaboration"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            
            <button
              onClick={handleConnect}
              className="w-full px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
              disabled={!inputPeerId}
            >
              Connect
            </button>
            
            <button
              onClick={() => setShowConnectModal(false)}
              className="w-full mt-3 px-4 py-2 rounded-lg border text-gray-700 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]">
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 sm:w-80 rounded-2xl border p-6 bg-white backdrop-blur-md shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Share this link</h3>
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
              Share this QR code or link with collaborators to join your whiteboard
            </p>
            
            <div className="mb-4">
              <QrCode className="w-24 h-24 mx-auto mb-3" />
              <p className="text-xs text-gray-500 text-center mb-2">QR Code</p>
              <p className="text-xs text-gray-500 text-center mb-4">Scan to join</p>
            </div>
            
            <div>
              <code className="block bg-gray-100 text-sm rounded px-3 py-2 overflow-x-auto select-none">
                {window.location.origin}/collab?peer={inputPeerId || 'generate'}
              </code>
            </div>
            
            <button
              onClick={() => setShowQrModal(false)}
              className="mt-4 w-full px-4 py-2 rounded-lg border text-gray-700 hover:text-gray-900 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Disconnect Confirm Modal */}
      {showDisconnectConfirm && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]">
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 rounded-2xl border p-6 bg-white backdrop-blur-md shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Disconnect</h3>
            <p className="text-sm text-gray-600 mb-6">Are you sure you want to disconnect all collaborators?</p>
            
            <div className="flex gap-3">
              <button
                onClick={cancelDisconnect}
                className="flex-1 px-4 py-2 rounded-lg border text-gray-700 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDisconnect}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}