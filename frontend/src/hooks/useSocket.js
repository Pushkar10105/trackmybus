// src/hooks/useSocket.js
// Socket.io connection hook and route room subscription

import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const rawSocketUrl = import.meta.env.VITE_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : '');
const SOCKET_URL = rawSocketUrl.replace(/\/+$/, '');

export function useSocket(routeId) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [liveBuses, setLiveBuses] = useState({}); // keyed by bus_id

  useEffect(() => {
    // Initialize single socket connection
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('🔌 Connected to Socket.io server:', socket.id);
      if (routeId) {
        socket.emit('join_route', { route_id: routeId });
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('🔌 Disconnected from Socket.io server');
    });

    // Handle live bus movement and ETAs
    socket.on('location_update', (payload) => {
      console.log('📍 Received location_update:', payload);
      setLiveBuses((prev) => ({
        ...prev,
        [payload.bus_id]: {
          ...payload,
          lastUpdated: Date.now(),
          status: 'active',
        },
      }));
    });

    // Handle bus inactive notifications
    socket.on('bus_inactive', ({ bus_id }) => {
      console.log('⚠️ Received bus_inactive for bus:', bus_id);
      setLiveBuses((prev) => {
        if (!prev[bus_id]) return prev;
        return {
          ...prev,
          [bus_id]: {
            ...prev[bus_id],
            status: 'inactive',
          },
        };
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // When routeId changes, join the corresponding room and reset route-specific state
  useEffect(() => {
    if (socketRef.current && socketRef.current.connected && routeId) {
      console.log(`Subscribing to route room: route:${routeId}`);
      socketRef.current.emit('join_route', { route_id: routeId });
      setLiveBuses({});
    }
  }, [routeId]);

  return {
    socket: socketRef.current,
    isConnected,
    liveBuses,
    setLiveBuses,
  };
}
