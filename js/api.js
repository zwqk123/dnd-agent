const API_BASE = '/api/dnd';

const TokenManager = {
  get() { return localStorage.getItem('dnd_agent_token'); },
  set(token) { localStorage.setItem('dnd_agent_token', token); },
  remove() { localStorage.removeItem('dnd_agent_token'); },
};

async function apiRequest(endpoint, options = {}) {
  const token = TokenManager.get();
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...(options.headers || {})
    }
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || '璇锋眰澶辫触');
    return data;
  } catch (error) {
    console.error('API閿欒:', endpoint, error);
    throw error;
  }
}

// DND 涓撳睘 API
const DNDAPI = {
  greet() { return apiRequest('/greet'); },
  analyzeModule(formData) {
    return fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: { ...(TokenManager.get() && { 'Authorization': `Bearer ${TokenManager.get()}` }) },
      body: formData
    }).then(r => r.json());
  },
  createMonster(data) {
    return apiRequest('/create_monster', { method: 'POST', body: JSON.stringify(data) });
  },
  validateMonster(data) {
    return apiRequest('/validate_monster', { method: 'POST', body: JSON.stringify(data) });
  },
  buildEncounter(data) {
    return apiRequest('/build_encounter', { method: 'POST', body: JSON.stringify(data) });
  },
  generateGuide() { return apiRequest('/generate_guide'); },
  quickRef() { return apiRequest('/quick_ref'); },
  rules() { return apiRequest('/rules'); },
  setting() { return apiRequest('/setting'); },
  monsterKnowledge() { return apiRequest('/monster_knowledge'); },
  monsterTemplates() { return apiRequest('/monster_templates'); },
  getImmersion() { return apiRequest('/immersion'); },
};
