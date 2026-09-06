// src/api/endpoints.js
// Typed and organized API services mapped to backend routes

import { api } from './client';

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const authApi = {
  login: (phone, password) => api.post('/api/auth/login', { phone, password }),
};

// ---------------------------------------------------------------------------
// Routes & Live Telemetry
// ---------------------------------------------------------------------------
export const routesApi = {
  getAll: () => api.get('/api/routes'),
  getById: (id) => api.get(`/api/routes/${id}`),
  getLiveBuses: (id) => api.get(`/api/routes/${id}/live`),
};

// ---------------------------------------------------------------------------
// Driver Operations
// ---------------------------------------------------------------------------
export const driverApi = {
  startTrip: () => api.post('/api/driver/trip/start'),
  endTrip: () => api.post('/api/driver/trip/end'),
  sendLocation: ({ bus_id, lat, lng, speed, timestamp }) =>
    api.post('/api/driver/location', { bus_id, lat, lng, speed, timestamp }),
};

// ---------------------------------------------------------------------------
// Issues & Flags
// ---------------------------------------------------------------------------
export const issuesApi = {
  submit: ({ bus_number, category, description }) =>
    api.post('/api/issues', { bus_number, category, description }),
  getSummary: () => api.get('/api/issues'), // Admin only
  resolve: (busId, category) =>
    api.patch(`/api/issues/${busId}/${category}/resolve`), // Admin only
};

// ---------------------------------------------------------------------------
// Lost & Found
// ---------------------------------------------------------------------------
export const lostFoundApi = {
  submit: ({ type, route_id, bus_id, description, approx_time, contact_phone }) =>
    api.post('/api/lostfound', {
      type,
      route_id: route_id ? Number(route_id) : null,
      bus_id: bus_id ? Number(bus_id) : null,
      description,
      approx_time,
      contact_phone,
    }),
  getAll: () => api.get('/api/lostfound'), // Public gets found items; Admin gets all + phones
  updateStatus: (id, status) => api.patch(`/api/lostfound/${id}`, { status }), // Admin only
};

// ---------------------------------------------------------------------------
// Admin CRUD
// ---------------------------------------------------------------------------
export const adminApi = {
  // Routes CRUD
  createRoute: ({ name, start_point, end_point, city_code }) =>
    api.post('/api/admin/routes', { name, start_point, end_point, city_code }),
  updateRoute: (id, data) => api.patch(`/api/admin/routes/${id}`, data),
  deleteRoute: (id) => api.delete(`/api/admin/routes/${id}`),

  // Stops CRUD
  createStop: ({ route_id, name, lat, lng, sequence_number }) =>
    api.post('/api/admin/stops', {
      route_id: Number(route_id),
      name,
      lat: Number(lat),
      lng: Number(lng),
      sequence_number: Number(sequence_number),
    }),
  updateStop: (id, data) => api.patch(`/api/admin/stops/${id}`, data),
  deleteStop: (id) => api.delete(`/api/admin/stops/${id}`),

  // Buses CRUD
  getBuses: () => api.get('/api/admin/buses'),
  createBus: ({ route_id, bus_number, driver_phone }) =>
    api.post('/api/admin/buses', {
      route_id: route_id ? Number(route_id) : null,
      bus_number,
      driver_phone: driver_phone || null,
    }),
  updateBus: (id, data) => api.patch(`/api/admin/buses/${id}`, data),
  deleteBus: (id) => api.delete(`/api/admin/buses/${id}`),
};

// ---------------------------------------------------------------------------
// Chat Assistant (Gemini)
// ---------------------------------------------------------------------------
export const chatApi = {
  sendMessage: (message, lang = 'en') => api.post('/api/chat', { message, lang }),
};
