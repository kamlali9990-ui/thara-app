import { supabase } from './client';
import type { StaffMember } from '../types';

interface StaffCache {
  list: StaffMember[];
  byEmail: Record<string, StaffMember>;
}

interface CreateStaffResult {
  id?: number;
  name?: string;
  email?: string;
  role?: string;
  phone?: string | null;
  tempPassword?: string;
  [key: string]: any;
}

const CACHE_KEY = 'thara_staff_cache';

function getCache(): StaffCache {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : { list: [], byEmail: {} };
  } catch (e) { console.error('[staff cache read]', e); return { list: [], byEmail: {} }; }
}

function updateCache(data: StaffMember | StaffMember[]): void {
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
  } catch (e) { console.error('[staff cache write]', e); }
}

function removeFromCache(id: number): void {
  try {
    const cache = getCache();
    const removed = cache.list.find(s => s.id === id);
    cache.list = cache.list.filter(s => s.id !== id);
    if (removed) delete cache.byEmail[removed.email];
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) { console.error('[staff cache remove]', e); }
}

async function rpc(method: string, args: Record<string, any>): Promise<any> {
  const { data, error } = await supabase.rpc(method, args);
  if (error && error.code === 'PGRST116') return null;
  if (error) { console.error(`RPC ${method} failed:`, error.message, error.details, error.hint, error.code); throw error; }
  return data;
}

export const staffApi = {
  async list(): Promise<StaffMember[]> {
    try {
      const data = await rpc('list_staff_rpc', {});
      if (data) {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        updateCache(parsed);
        return parsed;
      }
    } catch (e) { console.error('[staff list]', e); }
    const cache = getCache();
    return cache.list;
  },

  async getByEmail(email: string): Promise<StaffMember | null> {
    try {
      const data = await rpc('get_staff_by_email_rpc', { target_email: email });
      if (data) {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        if (parsed) { updateCache(parsed); return parsed; }
      }
    } catch (e) { console.error('[staff getByEmail]', e); }
    const cache = getCache();
    return cache.byEmail[email] || null;
  },

  async create(staffMember: Partial<StaffMember>): Promise<CreateStaffResult> {
    const normalizedEmail = String(staffMember.email || '').trim().toLowerCase();
    try {
      const data = await rpc('create_staff_rpc', {
        p_email: normalizedEmail,
        p_name: staffMember.name,
        p_role: staffMember.role,
        p_phone: staffMember.phone || null
      });
      if (data) {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        updateCache(parsed.staff || parsed);
        return { ...(parsed.staff || parsed), tempPassword: parsed.password || '' };
      }
    } catch (err) { console.error('create staff error:', err); throw err; }
    const temp: CreateStaffResult = { id: Date.now(), ...staffMember, created_at: new Date().toISOString() };
    updateCache(temp as StaffMember);
    return temp;
  },

  async update(id: number, updates: Partial<StaffMember>): Promise<Partial<StaffMember>> {
    try {
      const data = await rpc('update_staff_rpc', {
        p_id: id,
        p_name: updates.name,
        p_role: updates.role,
        ...(updates.email ? { p_email: updates.email } : {}),
        ...(updates.phone !== undefined ? { p_phone: updates.phone || null } : {})
      });
      if (data) {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        updateCache(parsed);
        return parsed;
      }
    } catch (e) { console.error('[staff update]', e); }
    const merged = { id, ...updates };
    updateCache(merged as StaffMember);
    return merged;
  },

  async remove(id: number): Promise<void> {
    try {
      await rpc('delete_staff_rpc', { p_id: id });
    } catch (e) { console.error('[staff remove]', e); }
    removeFromCache(id);
  },

  async resetPassword(email: string, newPassword: string): Promise<{ success: boolean; message?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { email, newPassword }
      });
      if (error) throw error;
      return data;
    } catch (e: any) {
      console.error('[staff resetPassword]', e);
      throw new Error(e.message || 'فشل تغيير كلمة المرور');
    }
  },

  async listDrivers(): Promise<StaffMember[]> {
    try {
      const data = await rpc('list_drivers_rpc', {});
      if (data) {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) { console.error('[staff listDrivers]', e); }
    const cache = getCache();
    return cache.list.filter(s => s.role === 'driver');
  }
};
