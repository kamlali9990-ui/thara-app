import { supabase } from './client';

export const STAFF_DEFAULT_PASSWORD = '123456';
const CACHE_KEY = 'thara_staff_cache';

function getCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : { list: [], byEmail: {} };
  } catch { return { list: [], byEmail: {} }; }
}

function updateCache(data) {
  try {
    const cache = getCache();
    if (Array.isArray(data)) {
      cache.list = data;
      data.forEach(s => { cache.byEmail[s.email] = s; });
    } else if (data && typeof data === 'object') {
      const existing = cache.list.find(s => s.id === data.id);
      if (!existing) cache.list.unshift(data);
      else Object.assign(existing, data);
      cache.byEmail[data.email] = data;
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* ignore */ }
}

function removeFromCache(id) {
  try {
    const cache = getCache();
    const removed = cache.list.find(s => s.id === id);
    cache.list = cache.list.filter(s => s.id !== id);
    if (removed) delete cache.byEmail[removed.email];
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* ignore */ }
}

async function rpc(method, args) {
  const { data, error } = await supabase.rpc(method, args);
  if (error && error.code === 'PGRST116') return null;
  if (error) { console.error(`RPC ${method} failed:`, error.message, error.details, error.hint, error.code); throw error; }
  return data;
}

export const staffApi = {
  async list() {
    try {
      const data = await rpc('list_staff_rpc', {});
      if (data) {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        updateCache(parsed);
        return parsed;
      }
    } catch { /* fallback */ }
    const cache = getCache();
    return cache.list;
  },

  async getByEmail(email) {
    try {
      const data = await rpc('get_staff_by_email_rpc', { target_email: email });
      if (data) {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        if (parsed) { updateCache(parsed); return parsed; }
      }
    } catch { /* fallback */ }
    const cache = getCache();
    return cache.byEmail[email] || null;
  },

  async create(staffMember) {
    const normalizedEmail = String(staffMember.email || '').trim().toLowerCase();
    // Use signUp to create auth user through GoTrue's proper API, then auto-confirm
    try {
      await supabase.auth.signUp({ email: normalizedEmail, password: STAFF_DEFAULT_PASSWORD });
    } catch { /* user might already exist */ }
    await rpc('confirm_auth_user', { p_email: normalizedEmail, p_password: STAFF_DEFAULT_PASSWORD });
    try {
      const data = await rpc('create_staff_rpc', {
        p_email: normalizedEmail,
        p_name: staffMember.name,
        p_role: staffMember.role
      });
      if (data) {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        updateCache(parsed);
        return parsed;
      }
    } catch (err) { console.error('create staff error:', err); throw err; }
    const temp = { id: Date.now(), ...staffMember, created_at: new Date().toISOString() };
    updateCache(temp);
    return temp;
  },

  async update(id, updates) {
    try {
      const data = await rpc('update_staff_rpc', {
        p_id: id,
        p_email: updates.email,
        p_name: updates.name,
        p_role: updates.role
      });
      if (data) {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        updateCache(parsed);
        return parsed;
      }
    } catch { /* fallback */ }
    const merged = { id, ...updates };
    updateCache(merged);
    return merged;
  },

  async remove(id) {
    try {
      await rpc('delete_staff_rpc', { p_id: id });
    } catch { /* fallback */ }
    removeFromCache(id);
  },

  async listDrivers() {
    try {
      const data = await rpc('list_drivers_rpc', {});
      if (data) {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch { /* fallback to cached list filter */ }
    const cache = getCache();
    return cache.list.filter(s => s.role === 'driver');
  }
};
