// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/endpoints';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  const login = async (phone, password) => {
    setLoading(true);
    try {
      const data = await authApi.login(phone, password);
      // data: { token, role, user_id, bus_id, bus_number, route_id, route_name, name }
      const userInfo = {
        user_id: data.user_id,
        role: data.role,
        bus_id: data.bus_id,
        bus_number: data.bus_number || null,
        route_id: data.route_id || null,
        route_name: data.route_name || null,
        name: data.name || null,
        phone,
      };

      setToken(data.token);
      setUser(userInfo);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(userInfo));
      return { success: true, user: userInfo };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        role: user?.role || null,
        isAuthenticated: !!token,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
