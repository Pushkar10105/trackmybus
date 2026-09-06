// src/socket.js
// Shared Socket.io client instance. Import this wherever real-time
// updates are needed (AdminPage, commuter map, etc.) instead of creating
// a new connection per component.

import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL; // same backend URL used for the REST API

const socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ['websocket'],
});

export default socket;