import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

const client = axios.create({
  baseURL: API_BASE,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('gdcreo_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('gdcreo_token');
      localStorage.removeItem('gdcreo_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default client;
