
import axios from 'axios';
import { BASE_URL } from '@/lib/config';
import { loadingStateManager } from '@/lib/loadingState';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || BASE_URL;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Request interceptor for auth token and loading state
apiClient.interceptors.request.use(
  (config) => {
    // Start loading
    // loadingStateManager.startLoading();
    
    const token = sessionStorage.getItem('token') || sessionStorage.getItem('supplier_token') || sessionStorage.getItem('tender_dealership_token') ;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    // Stop loading on error
    // loadingStateManager.stopLoading();
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and loading state
apiClient.interceptors.response.use(
  (response) => {
    // Stop loading on success
    // loadingStateManager.stopLoading();
    return response;
  },
  (error) => {
    // Stop loading on error
    // loadingStateManager.stopLoading();
    
    if (error.response?.status === 401) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('supplier_token');
      sessionStorage.removeItem('tender_dealership_token');
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
