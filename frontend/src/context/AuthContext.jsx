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
      // data: { token, role, user_id, bus_id }
      const userInfo = {
        user_id: data.user_id,
        role: data.role,
        bus_id: data.bus_id,
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

  const signup = async (name, phone, password) => {
    setLoading(true);
    try {
      const data = await authApi.signup(name, phone, password);
      // data: { token, role, user_id, bus_id } — same shape as login
      const userInfo = {
        user_id: data.user_id,
        role: data.role,
        bus_id: data.bus_id,
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
        signup,
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