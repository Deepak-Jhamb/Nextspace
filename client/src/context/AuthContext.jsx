import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import api, { setupResponseInterceptor } from '../services/api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('nexushub_token'));
  const [loading, setLoading] = useState(true);

  // Stable ref so the interceptor always calls the latest logout without re-registering
  const logoutRef = useRef(null);

  // Logout handler (stable — does not depend on token state directly)
  const logout = useCallback(async () => {
    try {
      const storedToken = localStorage.getItem('nexushub_token');
      if (storedToken) {
        await api.post('/auth/logout').catch(() => {});
      }
    } finally {
      localStorage.removeItem('nexushub_token');
      setToken(null);
      setCurrentUser(null);
    }
  }, []);

  // Keep the ref in sync with the latest logout
  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  // Register the interceptor only ONCE on mount, using the ref to always get latest logout
  useEffect(() => {
    setupResponseInterceptor((...args) => logoutRef.current?.(...args));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore authenticated session on page refresh via GET /api/auth/me
  const checkAuth = useCallback(async () => {
    const storedToken = localStorage.getItem('nexushub_token');
    if (!storedToken) {
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      if (response.data && response.data.success) {
        setCurrentUser(response.data.user);
        setToken(storedToken);
      } else {
        await logout();
      }
    } catch (error) {
      console.error('[Auth Restoration Failed]:', error.response?.data?.message || error.message);
      await logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Login action
  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: newToken, user } = response.data;
      
      localStorage.setItem('nexushub_token', newToken);
      setToken(newToken);
      setCurrentUser(user);
      return { success: true, user };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed. Please check your credentials.';
      const errors = error.response?.data?.errors || null;
      return { success: false, message, errors };
    } finally {
      setLoading(false);
    }
  };

  // Register action
  const register = async (name, email, password) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/register', { name, email, password });
      const { token: newToken, user } = response.data;

      localStorage.setItem('nexushub_token', newToken);
      setToken(newToken);
      setCurrentUser(user);
      return { success: true, user };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed. Please try again.';
      const errors = error.response?.data?.errors || null;
      return { success: false, message, errors };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    currentUser,
    token,
    loading,
    isAuthenticated: !!currentUser,
    login,
    register,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
