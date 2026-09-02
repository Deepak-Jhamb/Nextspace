import axios from 'axios';

// Create base Axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

/**
 * Request Interceptor: Automatically attaches Authorization Bearer token from localStorage
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('nexushub_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Track the active response interceptor ID so we can eject & re-register without stacking
let _responseInterceptorId = null;

/**
 * Helper to setup Response Interceptor with Auth logout callback.
 * Ejects the previous interceptor before registering a new one to prevent stacking.
 */
export const setupResponseInterceptor = (logoutCallback) => {
  // Eject previous interceptor if it exists
  if (_responseInterceptorId !== null) {
    api.interceptors.response.eject(_responseInterceptorId);
  }

  _responseInterceptorId = api.interceptors.response.use(
    (response) => response,
    (error) => {
      // If server returns 401 Unauthorized, automatically handle token purge & logout
      if (error.response && error.response.status === 401) {
        console.warn('[Axios Interceptor] 401 Unauthorized detected. Executing session logout.');
        if (logoutCallback) {
          logoutCallback();
        } else {
          localStorage.removeItem('nexushub_token');
          if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
            window.location.href = '/login';
          }
        }
      }
      return Promise.reject(error);
    }
  );
};

export default api;
