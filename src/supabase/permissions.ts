import { supabase } from './client';

const CACHE_KEY = 'thara_permissions_cache';

export const PERMISSIONS = {
  MANAGE_ORDERS: 'manage_orders',
  MANAGE_PRODUCTS: 'manage_products',
  MANAGE_OFFERS: 'manage_offers',
  MANAGE_CHAT: 'manage_chat',
  MANAGE_STAFF: 'manage_staff',
  MANAGE_SETTINGS: 'manage_settings',
  VIEW_STATS: 'view_stats',
  MANAGE_USERS: 'manage_users',
};

export const PERMISSION_LABELS: Record<string, string> = {
  manage_orders: 'إدارة الطلبات',
  manage_products: 'إدارة المنتجات',
  manage_offers: 'إدارة العروض',
  manage_chat: 'الرد على العملاء',
  manage_staff: 'إدارة الموظفين',
  manage_settings: 'الإعدادات',
  view_stats: 'عرض الإحصائيات',
  manage_users: 'إدارة المستخدمين',
};

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: Object.keys(PERMISSION_LABELS),
  manager: ['manage_orders', 'manage_products', 'manage_offers', 'manage_chat', 'manage_settings', 'view_stats'],
  employee: ['manage_orders', 'manage_chat'],
  driver: [],
};

async function getMyPermissions(): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_my_permissions');
  if (error) throw error;
  return data || [];
}

export async function loadMyPermissions(): Promise<string[]> {
  try {
    const perms = await getMyPermissions();
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(perms)); } catch {}
    return perms;
  } catch {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  }
}

export function clearPermissionsCache(): void {
  try { localStorage.removeItem(CACHE_KEY); } catch {}
}

export async function getStaffPermissions(staffId: string | number): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_staff_permissions', { p_staff_id: staffId });
  if (error) throw error;
  return data || [];
}

export async function setStaffPermissions(staffId: string | number, permissions: string[]): Promise<void> {
  const { error } = await supabase.rpc('set_staff_permissions', {
    p_staff_id: staffId,
    p_permissions: permissions,
  });
  if (error) throw error;
}

export async function listStaffPermissions(): Promise<any[]> {
  const { data, error } = await supabase.rpc('list_staff_permissions');
  if (error) throw error;
  return data || [];
}
