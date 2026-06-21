import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

const sendOtp = async (phone) => {
  const res = await api.post('/auth/send-otp', { phone });
  return res; // { success, devOtp? }
};

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = localStorage.getItem('safora_admin_user');
    if (user) {
      const parsed = JSON.parse(user);
      if (parsed.role === 'admin') {
        // Verify the token is still valid against the backend
        api.get('/auth/me')
          .then(() => setAdmin(parsed))
          .catch((err) => {
            // Token expired or invalid — clear and show login
            localStorage.removeItem('safora_admin_user');
            setAdmin(null);
          })
          .finally(() => setLoading(false));
        return;
      } else {
        logout();
      }
    }
    setLoading(false);
  }, []);

  const verifyOtp = async (phone, otp) => {
    const res = await api.post('/auth/verify-otp', { phone, otp });
    if (!res.success) throw new Error(res.message || 'Verification failed');
    if (res.user?.role !== 'admin') throw new Error('Access denied — not an admin account');
    localStorage.setItem('safora_admin_user', JSON.stringify(res.user));
    setAdmin(res.user);
    return res;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.warn('Backend logout failed, clearing local state anyway');
    }
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
