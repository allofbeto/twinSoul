import api from './axios';

// Auth
export const registerUser = (data: object) => api.post('/auth/register', data);
export const loginUser = (data: object) => api.post('/auth/login', data);

// Characters
export const getCharacters = () => api.get('/characters');
export const getCharacter = (id: string) => api.get(`/characters/${id}`);
export const createCharacter = (data: object) => api.post('/characters', data);
export const updateCharacter = (id: string, data: object) => api.patch(`/characters/${id}`, data);
export const deleteCharacter = (id: string) => api.delete(`/characters/${id}`);

// User
export const getUser = () => api.get('/user');
export const updateUser = (data: object) => api.patch('/user', data);
export const deactivateUser = () => api.patch('/user/deactivate');
export const closeUser = () => api.patch('/user/close');
export const deleteUser = () => api.delete('/user');