import { useCallback } from 'react';
import { customersApi } from '../supabase/customers.js';
import { showToast } from '../components/Toast.jsx';

export function useCustomerActions({ hasSupabase, user, setAllCustomers, setCustomerProfile }) {
  const loadCustomers = useCallback(async () => {
    if (!hasSupabase) return;
    try {
      const list = await customersApi.list();
      setAllCustomers(list);
    } catch (err) { console.error('[loadCustomers]', err); showToast('تعذر تحميل قائمة العملاء', 'error'); }
  }, [hasSupabase, setAllCustomers]);

  const updateCustomerProfile = useCallback(async (name, phone, username, realEmail) => {
    if (!user) return;
    try {
      const updated = await customersApi.update(user.email, name, phone, null, null, null, username, realEmail);
      setCustomerProfile(updated);
      return updated;
    } catch (err) { console.error('[updateCustomerProfile]', err); showToast('تعذر تحديث الملف الشخصي', 'error'); return null; }
  }, [user, setCustomerProfile]);

  const addLoyaltyPoints = useCallback(async (total) => {
    if (!user || !hasSupabase) return;
    const points = Math.floor(total);
    if (points <= 0) return;
    try {
      const updated = await customersApi.addPoints(user.email, points);
      if (updated) setCustomerProfile(updated);
    } catch (err) { console.error('[addLoyaltyPoints]', err); }
  }, [user, hasSupabase, setCustomerProfile]);

  return { loadCustomers, updateCustomerProfile, addLoyaltyPoints };
}
