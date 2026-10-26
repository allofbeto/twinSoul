import axios from 'axios';

// In production, set REACT_APP_API_URL at build time (e.g. https://api.example.com/api/v1).
const API_URL = process.env.REACT_APP_API_URL ?? 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;