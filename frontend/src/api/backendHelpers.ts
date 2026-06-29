import api from './axios';

// Auth
export const registerUser = (data: object) => api.post('/auth/register', data);
export const loginUser = (data: object) => api.post('/auth/login', data);

// Assets
export const createImageAsset = (data: object) => api.post('/image_assets', data);

// Campaigns
export const getCampaigns = () => api.get('/campaigns');
export const getCampaign = (id: string) => api.get(`/campaigns/${id}`);
export const createCampaign = (data: object) => api.post('/campaigns', data);
export const updateCampaign = (id: string, data: object) => api.patch(`/campaigns/${id}`, data);
export const deleteCampaign = (id: string) => api.delete(`/campaigns/${id}`);

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

export const migrateInventory = (characterId: string, actionType: string) => api.post(`/characters/${characterId}/migrate_inventory`, { action_type: actionType });

// Players
export const getPlayers = (campaignId: string) => api.get(`/campaigns/${campaignId}/players`);
export const addPlayer = (campaignId: string, data: object) => api.post(`/campaigns/${campaignId}/players`, data);
export const updatePlayer = (campaignId: string, playerId: string, data: object) => api.patch(`/campaigns/${campaignId}/players/${playerId}`, data);
export const removePlayer = (campaignId: string, playerId: string) => api.delete(`/campaigns/${campaignId}/players/${playerId}`);
export const getPlayerProfile = (campaignId: string, playerId: string) => api.get(`/campaigns/${campaignId}/players/${playerId}/profile`);

export const getJoinedCampaigns = () => api.get('/campaigns/joined');

// User
export const getUser = () => api.get('/user');
export const updateUser = (data: object) => api.patch('/user', data);
export const deactivateUser = () => api.patch('/user/deactivate');
export const closeUser = () => api.patch('/user/close');
export const deleteUser = () => api.delete('/user');

export const searchUser = (email: string) => api.get(`/users/search?email=${email}`);