import { useState, useEffect, useCallback } from 'react';
import { listStaffPermissions, setStaffPermissions, PERMISSION_LABELS, PERMISSIONS } from '../../supabase/permissions';
import { showToast } from '../Toast';

interface StaffPermissionsEntry {
  staff_id: number;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

export default function PermissionManager() {
  const [staffList, setStaffList] = useState<StaffPermissionsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedStaff, setExpandedStaff] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listStaffPermissions();
      setStaffList(data);
    } catch (err) {
      showToast('فشل تحميل بيانات الصلاحيات', 'error');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleTogglePermission = async (staffId: number, permission: string) => {
    const staff = staffList.find(s => s.staff_id === staffId);
    if (!staff) return;
    if (staff.role === 'admin') {
      showToast('لا يمكن تعديل صلاحيات المدير العام', 'warning');
      return;
    }
    const currentPerms = staff.permissions || [];
    const newPerms = currentPerms.includes(permission)
      ? currentPerms.filter(p => p !== permission)
      : [...currentPerms, permission];
    setSavingId(staffId);
    try {
      await setStaffPermissions(staffId, newPerms);
      setStaffList(prev => prev.map(s =>
        s.staff_id === staffId ? { ...s, permissions: newPerms } : s
      ));
      showToast('تم تحديث الصلاحيات', 'success');
    } catch (err) {
      showToast('فشل تحديث الصلاحيات', 'error');
    }
    setSavingId(null);
  };

  const handleSetDefaults = async (staffId: number, role: string) => {
    if (role === 'admin') {
      showToast('لا يمكن تعديل صلاحيات المدير العام', 'warning');
      return;
    }
    const defaults: Record<string, string[]> = {
      manager: ['manage_orders', 'manage_products', 'manage_offers', 'manage_chat', 'manage_settings', 'view_stats'],
      employee: ['manage_orders', 'manage_chat'],
      driver: [],
    };
    const perms = defaults[role] || [];
    setSavingId(staffId);
    try {
      await setStaffPermissions(staffId, perms);
      setStaffList(prev => prev.map(s =>
        s.staff_id === staffId ? { ...s, permissions: perms } : s
      ));
      showToast('تم تعيين الصلاحيات الافتراضية', 'success');
    } catch (err) {
      showToast('فشل تعيين الصلاحيات', 'error');
    }
    setSavingId(null);
  };

  const allPermissions = Object.entries(PERMISSION_LABELS);

  if (loading) {
    return <div className="permission-loading">جاري التحميل...</div>;
  }

  return (
    <div className="permission-manager">
      <div className="permission-header">
        <h2 className="admin-section-title">🔐 صلاحيات الموظفين</h2>
        <button className="permission-refresh-btn" onClick={loadData}>🔄 تحديث</button>
      </div>
      <p className="permission-subtitle">حدد صلاحيات كل موظف. المدير العام (admin) لديه جميع الصلاحيات ولا يمكن تعديلها.</p>

      <div className="permission-staff-list">
        {staffList.map(staff => (
          <div key={staff.staff_id} className={`permission-staff-card ${expandedStaff === staff.staff_id ? 'expanded' : ''}`}>
            <div className="permission-staff-header" onClick={() => setExpandedStaff(expandedStaff === staff.staff_id ? null : staff.staff_id)}>
              <div className="permission-staff-info">
                <span className="permission-staff-name">{staff.name || '—'}</span>
                <span className="permission-staff-email">{staff.email}</span>
              </div>
              <span className={`permission-staff-role role-${staff.role}`}>
                {staff.role === 'admin' ? 'مدير عام' : staff.role === 'manager' ? 'مدير' : staff.role === 'employee' ? 'موظف' : 'كابتن'}
              </span>
              <span className="permission-expand-icon">{expandedStaff === staff.staff_id ? '▲' : '▼'}</span>
            </div>

            {expandedStaff === staff.staff_id && (
              <div className="permission-staff-body">
                <div className="permission-defaults-row">
                  <button
                    className="permission-defaults-btn"
                    onClick={() => handleSetDefaults(staff.staff_id, staff.role)}
                    disabled={savingId === staff.staff_id || staff.role === 'admin'}
                  >
                    ⚡ تعيين الصلاحيات الافتراضية ({staff.role === 'admin' ? 'جميع الصلاحيات' : staff.role === 'manager' ? 'مدير' : staff.role === 'employee' ? 'موظف' : 'كابتن'})
                  </button>
                </div>
                <div className="permission-toggles">
                  {allPermissions.map(([key, label]) => {
                    const isAdmin = staff.role === 'admin';
                    const isOn = isAdmin || (staff.permissions || []).includes(key);
                    return (
                      <label key={key} className={`permission-toggle ${isOn ? 'on' : 'off'}`}>
                        <input
                          type="checkbox"
                          checked={isOn}
                          disabled={isAdmin || savingId === staff.staff_id}
                          onChange={() => handleTogglePermission(staff.staff_id, key)}
                        />
                        <span className="permission-toggle-label">{label}</span>
                        <span className="permission-toggle-switch" />
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
