const API_BASE = '/api';

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
    if (!response.ok) throw new Error(data.error || data.message || '请求失败');
    return data;
  } catch (error) {
    console.error('API错误:', endpoint, error);
    throw error;
  }
}

// DND 专属 API
const DNDAPI = {
  greet() { return apiRequest('/greet'); },
  analyzeModule(formData) {
    const opts = { method: 'POST', body: formData };
    const token = TokenManager.get();
    if (token) opts.headers = { 'Authorization': `Bearer ${token}` };
    return fetch(`/api/analyze`, opts).then(r => {
      return r.json().catch(() => { throw new Error(`服务器返回了非JSON响应 (HTTP ${r.status})，请检查PDF大小或重试`); });
    });
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
