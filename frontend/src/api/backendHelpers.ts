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

export const getCampaignCharacters = (campaignId: string) => api.get(`/campaigns/${campaignId}/characters`);
export const getCampaignItems = (campaignId: string) => api.get(`/campaigns/${campaignId}/items`);
/** Name search: non-DMs get nothing until the query has 4+ characters, and only names back. */
export const searchCampaignItems = (campaignId: string, q: string) => api.get(`/campaigns/${campaignId}/items`, { params: { q } });
export const createCampaignItem = (campaignId: string, data: object) => api.post(`/campaigns/${campaignId}/items`, data);

// Characters
export const getCharacters = () => api.get('/characters');
export const getCharacter = (id: string) => api.get(`/characters/${id}`);
export const createCharacter = (data: object) => api.post('/characters', data);
export const updateCharacter = (id: string, data: object) => api.patch(`/characters/${id}`, data);
export const deleteCharacter = (id: string) => api.delete(`/characters/${id}`);

// Classes (shared SRD rules reference)
export const getCharClasses = (game: string = 'dnd_5e') => api.get(`/char_classes?game=${game}`);
export const getCharClass = (index: string, game: string = 'dnd_5e') => api.get(`/char_classes/${index}?game=${game}`);

// Races (shared SRD rules reference)
export const getCharRaces = (game: string = 'dnd_5e') => api.get(`/char_races?game=${game}`);
export const getCharRace = (index: string, game: string = 'dnd_5e') => api.get(`/char_races/${index}?game=${game}`);

// Homebrew races/classes (same endpoints as the SRD data; writes only touch your own)
export const createHomebrewRace = (data: object) => api.post('/char_races', data);
export const updateHomebrewRace = (index: string, data: object) => api.patch(`/char_races/${index}`, data);
export const deleteHomebrewRace = (index: string) => api.delete(`/char_races/${index}`);
export const createHomebrewClass = (data: object) => api.post('/char_classes', data);
export const updateHomebrewClass = (index: string, data: object) => api.patch(`/char_classes/${index}`, data);
export const deleteHomebrewClass = (index: string) => api.delete(`/char_classes/${index}`);
/** Has Claude draft an NPC from a one-line concept. Nothing is saved. */
export const draftNpc = (data: { concept: string; cr?: string; role?: string }) => api.post('/npcs/draft', data);

export const importHomebrew = (url: string, kind: 'race' | 'class') => api.post('/homebrew/import', { url, kind });
export const getHomebrewReviews = (campaignId: string) => api.get(`/campaigns/${campaignId}/homebrew_reviews`);
export const reviewCharacterHomebrew = (characterId: string, decision: 'approve' | 'reject', note?: string) =>
  api.post(`/characters/${characterId}/homebrew_review`, { decision, note });

// Character classes (per-character multiclass entries) & leveling
export const addCharacterClass = (characterId: string, data: object) => api.post(`/characters/${characterId}/character_classes`, data);
export const updateCharacterClass = (characterId: string, id: string, data: object) => api.patch(`/characters/${characterId}/character_classes/${id}`, data);
export const removeCharacterClass = (characterId: string, id: string) => api.delete(`/characters/${characterId}/character_classes/${id}`);
// Feats (shared reference catalog)
export const getFeats = (game: string = 'dnd_5e') => api.get('/feats', { params: { game } });
export const getSpells = (game: string = 'dnd_5e') => api.get('/spells', { params: { game } });

export const levelUpCharacter = (characterId: string, data: object) => api.post(`/characters/${characterId}/level_up`, data);

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

// Monsters (shared SRD bestiary)
export const getMonsters = () => api.get('/monsters');
/** Name, CR, AC, HP and DEX only: for search pickers. */
export const getMonsterOptions = () => api.get('/monsters', { params: { slim: 1 } });
export const getMonster = (id: string) => api.get(`/monsters/${id}`);

// Encounters
export const getEncounters = (params?: { campaignId?: string; sessionId?: string }) => {
  const query = new URLSearchParams();
  if (params?.campaignId) query.set('campaign_id', params.campaignId);
  if (params?.sessionId) query.set('session_id', params.sessionId);
  const qs = query.toString();
  return api.get(`/encounters${qs ? `?${qs}` : ''}`);
};
export const getEncounter = (id: string) => api.get(`/encounters/${id}`);
export const createEncounter = (data: object) => api.post('/encounters', data);
export const updateEncounter = (id: string, data: object) => api.patch(`/encounters/${id}`, data);
export const deleteEncounter = (id: string) => api.delete(`/encounters/${id}`);

// Battle maps (DM only)
export const getBattleMaps = (campaignId: string, params?: { sessionId?: string }) =>
  api.get(`/campaigns/${campaignId}/battle_maps`, { params: params?.sessionId ? { session_id: params.sessionId } : undefined });
export const getBattleMap = (id: string) => api.get(`/battle_maps/${id}`);
export const createBattleMap = (campaignId: string, data: object) => api.post(`/campaigns/${campaignId}/battle_maps`, data);
export const updateBattleMap = (id: string, data: object) => api.patch(`/battle_maps/${id}`, data);
export const deleteBattleMap = (id: string) => api.delete(`/battle_maps/${id}`);
/** The dungeon helper reading what the DM typed. */
export const interpretMapText = (data: { text: string; answers: object; asking: string | null }) => api.post('/battle_maps/interpret', data);

// Players
export const getPlayers = (campaignId: string) => api.get(`/campaigns/${campaignId}/players`);
export const addPlayer = (campaignId: string, data: object) => api.post(`/campaigns/${campaignId}/players`, data);
export const updatePlayer = (campaignId: string, playerId: string, data: object) => api.patch(`/campaigns/${campaignId}/players/${playerId}`, data);
export const removePlayer = (campaignId: string, playerId: string) => api.delete(`/campaigns/${campaignId}/players/${playerId}`);
export const getPlayerProfile = (campaignId: string, playerId: string) => api.get(`/campaigns/${campaignId}/players/${playerId}/profile`);

export const getJoinedCampaigns = () => api.get('/campaigns/joined');

// Sessions
export const getSessions = (campaignId?: string) => campaignId ? api.get(`/sessions?campaign_id=${campaignId}`) : api.get('/sessions');
export const createSession = (data: object) => api.post('/sessions', data);
export const updateSession = (sessionId: string, data: object) => api.patch(`/sessions/${sessionId}`, data);
export const deleteSession = (sessionId: string) => api.delete(`/sessions/${sessionId}`);

// User
export const getUser = () => api.get('/user');
export const updateUser = (data: object) => api.patch('/user', data);
export const deactivateUser = () => api.patch('/user/deactivate');
export const closeUser = () => api.patch('/user/close');
export const deleteUser = () => api.delete('/user');

export const searchUser = (email: string) => api.get(`/users/search?email=${email}`);

// Soundtrack
export const getCampaignTracks = (campaignId: string) => api.get(`/campaigns/${campaignId}/tracks`);
export const createTrack = (campaignId: string, data: object) => api.post(`/campaigns/${campaignId}/tracks`, data);
export const updateTrack = (id: string, data: object) => api.patch(`/tracks/${id}`, data);
export const deleteTrack = (id: string) => api.delete(`/tracks/${id}`);
