import axios from 'axios';

/**
 * Axios client instance for HealthVault API
 */
const api = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL) 
    ? `${import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL}/api` 
    : 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor to automatically attach JWT token
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('healthvault_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Helper to check API server health status
 */
export const checkApiHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

export default api;