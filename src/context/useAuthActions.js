import { useCallback } from 'react';
import { authApi } from '../supabase/auth.js';

export function useAuthActions({ hasSupabase, setUser, setStaffRole, setCurrentStaff, setCustomerProfile, setLoading: _setLoading }) {
  const login = useCallback(async (identifier, password) => {
    if (!hasSupabase) throw new Error('Supabase غير مهيأ');

    const normalized = String(identifier || '').trim();
    const isEmail = normalized.includes('@');

    if (isEmail) {
      try {
        const data = await authApi.signIn(normalized, password);
        setUser(data.user);
        return data;
      } catch (err) {
        if (err?.message?.includes('Invalid Refresh Token') || err?.message?.includes('Refresh Token Not Found')) {
          try { await authApi.signOut(); } catch (e) { console.error('[login] signOut after invalid token', e); }
          setUser(null); setStaffRole(null); setCurrentStaff(null); setCustomerProfile(null);
        }
        if (err?.message !== 'Invalid login credentials') throw err;
      }
    }

    throw new Error('المعرف أو كلمة المرور غير صحيحة');
  }, [hasSupabase, setUser, setStaffRole, setCurrentStaff, setCustomerProfile]);

  const logout = useCallback(async () => {
    try { if (hasSupabase) await authApi.signOut(); } catch (e) { console.error('[logout]', e); }
    setUser(null);
    setStaffRole(null);
    setCurrentStaff(null);
    setCustomerProfile(null);
  }, [hasSupabase, setUser, setStaffRole, setCurrentStaff, setCustomerProfile]);

  return { login, logout };
}
