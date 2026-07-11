import { useCallback } from 'react';
import { authApi } from '../supabase/auth';
import { staffApi } from '../supabase/staff';
import type { StaffRole } from '../types';

interface UseAuthActionsProps {
  hasSupabase: boolean;
  setUser: (user: any) => void;
  setStaffRole: (role: StaffRole | null) => void;
  setCurrentStaff: (staff: any) => void;
  setCustomerProfile: (profile: any) => void;
  setLoading: (loading: boolean) => void;
}

export function useAuthActions({ hasSupabase, setUser, setStaffRole, setCurrentStaff, setCustomerProfile, setLoading: _setLoading }: UseAuthActionsProps) {
  const login = useCallback(async (identifier: string, password: string): Promise<any> => {
    if (!hasSupabase) throw new Error('Supabase غير مهيأ');

    const normalized = String(identifier || '').trim();
    const isEmail = normalized.includes('@');

    if (isEmail) {
      try {
        const data = await authApi.signIn(normalized, password);
        setUser(data.user);
        const staff = await staffApi.getByEmail(normalized).catch(() => null);
        if (staff) { setStaffRole(staff.role); setCurrentStaff(staff); }
        return data;
      } catch (err: any) {
        if (err?.message?.includes('Invalid Refresh Token') || err?.message?.includes('Refresh Token Not Found')) {
          try { await authApi.signOut(); } catch (e) { console.error('[login] signOut after invalid token', e); }
          setUser(null); setStaffRole(null); setCurrentStaff(null); setCustomerProfile(null);
        }
        if (err?.message !== 'Invalid login credentials') throw err;
      }
    }

    throw new Error('المعرف أو كلمة المرور غير صحيحة');
  }, [hasSupabase, setUser, setStaffRole, setCurrentStaff, setCustomerProfile]);

  const logout = useCallback(async (): Promise<void> => {
    try { if (hasSupabase) await authApi.signOut(); } catch (e) { console.error('[logout]', e); }
    setUser(null);
    setStaffRole(null);
    setCurrentStaff(null);
    setCustomerProfile(null);
  }, [hasSupabase, setUser, setStaffRole, setCurrentStaff, setCustomerProfile]);

  return { login, logout };
}
