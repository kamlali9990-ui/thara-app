import { useCallback } from 'react';
import { staffApi } from '../supabase/staff';
import { showToast } from '../components/Toast';
import type { StaffMember } from '../types';

export function useStaffActions({ hasSupabase, setStaffList }: { hasSupabase: boolean; setStaffList: React.Dispatch<React.SetStateAction<StaffMember[]>> }) {
  const loadStaff = useCallback(async () => {
    if (!hasSupabase) return;
    try {
      const list = await staffApi.list();
      setStaffList(list);
    } catch (err) { console.error('[loadStaff]', err); showToast('تعذر تحميل قائمة الموظفين', 'error'); }
  }, [hasSupabase, setStaffList]);

  const addStaff = useCallback(async (staffMember: Partial<StaffMember>) => {
    const created: any = await staffApi.create(staffMember);
    setStaffList(prev => [created, ...prev]);
    return created;
  }, [setStaffList]);

  const updateStaff = useCallback(async (id: number, updates: Partial<StaffMember>) => {
    const updated: any = await staffApi.update(id, updates);
    setStaffList(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
    return updated;
  }, [setStaffList]);

  const removeStaff = useCallback(async (id: number) => {
    await staffApi.remove(id);
    setStaffList(prev => prev.filter(s => s.id !== id));
  }, [setStaffList]);

  const resetStaffPassword = useCallback(async (email: string, newPassword: string) => {
    return await staffApi.resetPassword(email, newPassword);
  }, []);

  return { loadStaff, addStaff, updateStaff, removeStaff, resetStaffPassword };
}
