import { useCallback } from 'react';
import { staffApi } from '../supabase/staff.js';
import { showToast } from '../components/Toast.jsx';

export function useStaffActions({ hasSupabase, setStaffList }) {
  const loadStaff = useCallback(async () => {
    if (!hasSupabase) return;
    try {
      const list = await staffApi.list();
      setStaffList(list);
    } catch (err) { console.error('[loadStaff]', err); showToast('تعذر تحميل قائمة الموظفين', 'error'); }
  }, [hasSupabase, setStaffList]);

  const addStaff = useCallback(async (staffMember) => {
    const created = await staffApi.create(staffMember);
    setStaffList(prev => [created, ...prev]);
    return created;
  }, [setStaffList]);

  const updateStaff = useCallback(async (id, updates) => {
    const updated = await staffApi.update(id, updates);
    setStaffList(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
    return updated;
  }, [setStaffList]);

  const removeStaff = useCallback(async (id) => {
    await staffApi.remove(id);
    setStaffList(prev => prev.filter(s => s.id !== id));
  }, [setStaffList]);

  return { loadStaff, addStaff, updateStaff, removeStaff };
}
