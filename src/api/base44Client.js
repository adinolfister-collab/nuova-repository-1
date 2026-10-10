import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { demoSymptoms, demoFoods, demoMeds, demoRecords } from '@/lib/demoData';
import { demoAssistantReply, demoExtractedRecord } from '@/lib/demoResponses';
import { computeWeeklyReportDemo } from '@/lib/guestData';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

const isStandalone = !appId || appId === 'undefined' || appId === 'null';

// In-memory / LocalStorage entity store for standalone preview mode
function getStore(name) {
  const key = `ibd_store_${name}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  
  // Initial seed data from rich demo fixtures
  if (name === 'SymptomEntry') return [...demoSymptoms];
  if (name === 'FoodEntry') return [...demoFoods];
  if (name === 'Medication') return [...demoMeds];
  if (name === 'MedicalRecord') return [...demoRecords];
  return [];
}

function saveStore(name, items) {
  try {
    localStorage.setItem(`ibd_store_${name}`, JSON.stringify(items));
  } catch {}
}

function createEntityMock(name) {
  return {
    list: async (sortOrder, limit) => {
      const items = getStore(name);
      return typeof limit === 'number' ? items.slice(0, limit) : items;
    },
    filter: async (criteria = {}, sortOrder, limit) => {
      let items = getStore(name);
      if (criteria && typeof criteria === 'object') {
        items = items.filter(item => {
          return Object.entries(criteria).every(([k, v]) => item[k] === v);
        });
      }
      return typeof limit === 'number' ? items.slice(0, limit) : items;
    },
    get: async (id) => {
      const items = getStore(name);
      return items.find(item => item.id === id || item.slug === id) || null;
    },
    create: async (data) => {
      const items = getStore(name);
      const entry = {
        ...data,
        id: data.id || `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        created_date: data.created_date || new Date().toISOString()
      };
      items.unshift(entry);
      saveStore(name, items);
      return entry;
    },
    update: async (id, data) => {
      const items = getStore(name);
      const idx = items.findIndex(item => item.id === id);
      if (idx >= 0) {
        items[idx] = { ...items[idx], ...data, updated_date: new Date().toISOString() };
        saveStore(name, items);
        return items[idx];
      }
      return { id, ...data };
    },
    delete: async (id) => {
      const items = getStore(name);
      const filtered = items.filter(item => item.id !== id);
      saveStore(name, filtered);
      return { id, ok: true };
    },
    deleteMany: async () => ({ ok: true }),
    bulkCreate: async (newItems = []) => {
      const items = getStore(name);
      const created = newItems.map(item => ({
        ...item,
        id: item.id || `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        created_date: item.created_date || new Date().toISOString()
      }));
      items.unshift(...created);
      saveStore(name, items);
      return created;
    },
    bulkUpdate: async () => [],
    count: async () => getStore(name).length,
    aggregate: async () => ({}),
    upsert: async (data) => data,
    subscribe: () => () => {},
  };
}

const mockEntities = new Proxy({}, {
  get: (target, prop) => {
    if (typeof prop !== 'string') return undefined;
    if (!target[prop]) {
      target[prop] = createEntityMock(prop);
    }
    return target[prop];
  }
});

const mockFunctions = {
  invoke: async (name, payload = {}) => {
    if (name === 'trackPageView') return { ok: true };
    if (name === 'appFeaturesAdvisor') {
      return { reply: demoAssistantReply.it };
    }
    if (name === 'estimateFoodNutrition') {
      try {
        const res = await fetch('/api/gemini/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{
              role: 'user',
              content: `Calcola i valori nutrizionali medi per 100g o una porzione standard di "${payload?.name || 'alimento'}". Rispondi ESCLUSIVAMENTE con un JSON: {"kcal": 160, "proteine": 4.5, "carboidrati": 22, "note": "Valori stimati per porzione standard"}`
            }],
            mode: 'general',
            systemPrompt: 'Rispondi rigorosamente solo con un oggetto JSON con le proprietà: kcal (number), proteine (number), carboidrati (number), note (string).'
          })
        });
        const d = await res.json();
        const jsonMatch = d.reply.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch {}
      return { kcal: 150, proteine: 5, carboidrati: 20, note: 'Stima nutrizionale media' };
    }
    if (name === 'scanMedicalDocument' || name === 'classifyAndExtractImport') {
      return demoExtractedRecord(payload?.file_name);
    }
    if (name === 'getSubscriptionStatus') {
      try {
        const stored = localStorage.getItem('ibd_mock_user');
        if (stored) {
          const u = JSON.parse(stored);
          const endMs = u.free_until ? new Date(u.free_until).getTime() : 0;
          const active = endMs > Date.now();
          const daysLeft = active ? Math.ceil((endMs - Date.now()) / (24 * 3600 * 1000)) : 0;
          return {
            status: active ? 'trialing' : (['active', 'lifetime'].includes(u.subscription_status) ? 'active' : 'expired'),
            is_subscribed: active || ['active', 'lifetime'].includes(u.subscription_status),
            trialRemaining: daysLeft,
            trialEnd: u.free_until,
            plan: 'trial'
          };
        }
      } catch {}
      return { status: 'trialing', is_subscribed: true, trialRemaining: 45, plan: 'annual' };
    }
    if (name === 'createSubscriptionCheckout') {
      return { url: '/abbonamento' };
    }
    if (name === 'createBillingPortalSession') {
      return { url: '/abbonamento' };
    }
    if (name === 'generateWeeklyReport') {
      return computeWeeklyReportDemo();
    }
    return { ok: true, data: {} };
  }
};

const mockAuth = {
  me: async () => {
    try {
      const stored = localStorage.getItem('ibd_mock_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },
  logout: async () => {
    try {
      localStorage.removeItem('ibd_mock_user');
      localStorage.removeItem('base44_access_token');
      localStorage.removeItem('token');
    } catch {}
    window.location.href = '/';
  },
  redirectToLogin: () => {
    window.location.href = '/login';
  },
  loginViaEmailPassword: async (email) => {
    const user = {
      id: 'user_' + Date.now().toString(36),
      email: email || 'utente@esempio.it',
      full_name: (email || 'utente').split('@')[0],
      role: 'user',
      subscription_status: 'trial',
      free_until: new Date(Date.now() + 45 * 24 * 3600 * 1000).toISOString(),
    };
    try { localStorage.setItem('ibd_mock_user', JSON.stringify(user)); } catch {}
    return user;
  },
  register: async ({ email }) => {
    const user = {
      id: 'user_' + Date.now().toString(36),
      email: email || 'utente@esempio.it',
      full_name: (email || 'utente').split('@')[0],
      role: 'user',
      subscription_status: 'trial',
      free_until: new Date(Date.now() + 45 * 24 * 3600 * 1000).toISOString(),
    };
    try { localStorage.setItem('ibd_mock_user', JSON.stringify(user)); } catch {}
    return user;
  },
  updateMe: async (updates = {}) => {
    let current = null;
    try {
      const stored = localStorage.getItem('ibd_mock_user');
      current = stored ? JSON.parse(stored) : { id: 'demo_user', role: 'user' };
      const updated = { ...current, ...updates };
      localStorage.setItem('ibd_mock_user', JSON.stringify(updated));
      return updated;
    } catch {
      return updates;
    }
  },
  verifyOtp: async () => ({ access_token: 'local_token' }),
  resendOtp: async () => ({ ok: true }),
  resetPassword: async () => ({ ok: true }),
  loginWithProvider: () => { window.location.href = '/'; },
  setToken: () => {},
};

const mockAnalytics = {
  track: () => {}
};

const mockIntegrations = {
  Core: {
    UploadFile: async ({ file }) => ({
      file_url: file?.name ? URL.createObjectURL(file) : ''
    }),
    ExtractDataFromUploadedFile: async () => ({ data: [] })
  }
};

let rawClient = null;
if (!isStandalone) {
  try {
    rawClient = createClient({
      appId,
      token,
      functionsVersion,
      serverUrl: '',
      requiresAuth: false,
      appBaseUrl
    });
  } catch {
    rawClient = null;
  }
}

// In standalone mode, use the responsive mock client.
// If a real appId is configured, use the rawClient.
export const base44 = (!isStandalone && rawClient) ? rawClient : {
  entities: mockEntities,
  functions: mockFunctions,
  auth: mockAuth,
  analytics: mockAnalytics,
  integrations: mockIntegrations,
};

