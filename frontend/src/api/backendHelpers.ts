import api from './axios';

// Auth
export const registerUser = (data: object) => api.post('/auth/register', data);
export const loginUser = (data: object) => api.post('/auth/login', data);

// Assets
export const createImageAsset = (data: object) => api.post('/image_assets', data);

// Characters
export const getCharacters = () => api.get('/characters');
export const getCharacter = (id: string) => api.get(`/characters/${id}`);
export const createCharacter = (data: object) => api.post('/characters', data);
export const updateCharacter = (id: string, data: object) => api.patch(`/characters/${id}`, data);
export const deleteCharacter = (id: string) => api.delete(`/characters/${id}`);

// Inventory
export const getInventory = (characterId: string) => api.get(`/characters/${characterId}/inventory`);
export const getInventoryItems = (characterId: string) => api.get(`/characters/${characterId}/inventory/items`);
export const addInventoryItem = (characterId: string, data: object) => api.post(`/characters/${characterId}/inventory/items`, data);
export const updateInventoryItem = (characterId: string, itemId: string, data: object) => api.patch(`/characters/${characterId}/inventory/items/${itemId}`, data);
export const removeInventoryItem = (characterId: string, itemId: string) => api.delete(`/characters/${characterId}/inventory/items/${itemId}`);

// Items
export const getItems = () => api.get('/items');
export const getItem = (id: string) => api.get(`/items/${id}`);
export const createItem = (data: object) => api.post('/items', data);
export const updateItem = (id: string, data: object) => api.patch(`/items/${id}`, data);
export const deleteItem = (id: string) => api.delete(`/items/${id}`);

// User
export const getUser = () => api.get('/user');
export const updateUser = (data: object) => api.patch('/user', data);
export const deactivateUser = () => api.patch('/user/deactivate');
export const closeUser = () => api.patch('/user/close');
export const deleteUser = () => api.delete('/user');