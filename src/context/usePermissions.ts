import { useState, useEffect, useCallback, useRef } from 'react';
import { loadMyPermissions, clearPermissionsCache } from '../supabase/permissions';

let globalPermissions: string[] = [];
let globalLoaded = false;
const listeners = new Set<(perms: string[]) => void>();

function notifyListeners() {
  listeners.forEach(fn => fn(globalPermissions));
}

export function usePermissions(staffRole: string | null, user: any) {
  const [permissions, setPermissions] = useState<string[]>(globalPermissions);
  const prevRoleRef = useRef<string | null>(staffRole);

  useEffect(() => {
    const listener = (perms: string[]) => setPermissions([...perms]);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  useEffect(() => {
    if (!user || !staffRole) {
      if (globalLoaded) {
        globalPermissions = [];
        globalLoaded = false;
        notifyListeners();
      }
      return;
    }

    if (staffRole === 'admin') {
      const allPerms = ['manage_orders', 'manage_products', 'manage_offers', 'manage_chat', 'manage_staff', 'manage_settings', 'view_stats', 'manage_users'];
      if (JSON.stringify(globalPermissions) !== JSON.stringify(allPerms)) {
        globalPermissions = allPerms;
        globalLoaded = true;
        notifyListeners();
      }
      return;
    }

    if (prevRoleRef.current !== staffRole || !globalLoaded) {
      loadMyPermissions().then(perms => {
        globalPermissions = perms;
        globalLoaded = true;
        notifyListeners();
      }).catch(() => {
        globalPermissions = [];
        globalLoaded = true;
        notifyListeners();
      });
    }
    prevRoleRef.current = staffRole;
  }, [user?.id, staffRole]);

  const hasPermission = useCallback((perm: string) => {
    if (staffRole === 'admin') return true;
    return globalPermissions.includes(perm);
  }, [staffRole]);

  const refreshPermissions = useCallback(() => {
    clearPermissionsCache();
    globalLoaded = false;
    if (staffRole !== 'admin' && user) {
      loadMyPermissions().then(perms => {
        globalPermissions = perms;
        globalLoaded = true;
        notifyListeners();
      });
    }
  }, [staffRole, user]);

  return { permissions, hasPermission, refreshPermissions };
}
