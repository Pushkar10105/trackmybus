// src/App.jsx
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import CommuterPage from './pages/CommuterPage';
import DriverPage from './pages/DriverPage';
import AdminPage from './pages/AdminPage';
import { api } from './api/client';

export default function App() {
  useEffect(() => {
    api.get('/api/health')
      .then(res => console.log('✅ Connected to Fleet Service:', res))
      .catch(err => console.warn('Transit API Health Check:', err?.message || err));
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-surface text-ink flex flex-col font-sans selection:bg-black selection:text-white">
          <Navbar />
          <main className="flex-1 flex flex-col relative overflow-hidden">
            <Routes>
              <Route path="/" element={<CommuterPage />} />
              <Route path="/commuter" element={<CommuterPage />} />
              <Route path="/driver" element={<DriverPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
