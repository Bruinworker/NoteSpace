/**
 * API configuration and axios instance setup.
 * 
 * This module creates a configured axios instance with interceptors
 * for authentication token handling and error management.
 */
import axios from 'axios';
import { API_BASE_URL } from './constants';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_BASE_URL
});

// Add token to requests automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    // Ensure token doesn't have extra quotes or whitespace
    const cleanToken = token.trim().replace(/^["']|["']$/g, '');
    config.headers.Authorization = `Bearer ${cleanToken}`;
  } else {
    console.warn('No token found in localStorage');
  }
  return config;
});

// Handle token errors in responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 422) {
      // Token might be invalid, clear it
      if (error.response?.data?.error?.includes('token')) {
        localStorage.removeItem('token');
        console.error('Token invalid, cleared from storage');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_BASE_URL };

