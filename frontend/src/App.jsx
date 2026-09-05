// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import CommuterPage from './pages/CommuterPage';
import DriverPage from './pages/DriverPage';
import AdminPage from './pages/AdminPage';
import { useEffect } from 'react';
import { api } from './api/client';


export default function App() {
  useEffect(() => {
    api.get('/api/health')
      .then(res => console.log('✅ Connected:', res))
      .catch(err => console.error('❌ Failed:', err));
  }, []);
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
          <Navbar />
          <main className="flex-1">
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
