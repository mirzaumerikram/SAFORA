import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('safora_admin_token');
    const user  = localStorage.getItem('safora_admin_user');
    if (token && user) {
      const parsed = JSON.parse(user);
      if (parsed.role === 'admin') setAdmin(parsed);
      else logout();
    }
    setLoading(false);
  }, []);

  const sendOtp = async (phone) => {
    const res = await api.post('/auth/send-otp', { phone });
    return res; // { success, devOtp? }
  };

  const verifyOtp = async (phone, otp) => {
    const res = await api.post('/auth/verify-otp', { phone, otp });
    if (!res.success) throw new Error(res.message || 'Verification failed');
    if (res.user?.role !== 'admin') throw new Error('Access denied — not an admin account');
    localStorage.setItem('safora_admin_token', res.token);
    localStorage.setItem('safora_admin_user', JSON.stringify(res.user));
    setAdmin(res.user);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('safora_admin_token');
    localStorage.removeItem('safora_admin_user');
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ admin, loading, sendOtp, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
