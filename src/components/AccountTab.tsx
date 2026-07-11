import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { showToast } from './Toast';
import InstallGuide from './InstallGuide';
import CustomerHelp from './CustomerHelp';
import ThemeToggle from './ThemeToggle';
import type { Customer, Order, StaffMember, StaffRole } from '../types';

const ROLE_LABELS: Record<StaffRole, string> = { admin: 'مدير', manager: 'مشرف', driver: 'كابتن', employee: 'موظف' };

interface AccountTabProps {
  user: any;
  logout: () => void;
  customerProfile: Customer | null;
  updateCustomerProfile: (name: string, phone: string, username: string | null, email: string | null) => Promise<void>;
  theme: string;
  onThemeChange: (t: string) => void;
  staffRole: StaffRole | null;
  currentStaff: StaffMember | null;
  orders: Order[];
}

const AccountTab = memo<AccountTabProps>(({ user, logout, customerProfile, updateCustomerProfile, theme, onThemeChange, staffRole, currentStaff, orders }) => {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const displayName = customerProfile?.name || user?.email?.split('@')[0] || '';
  const displayPhone = customerProfile?.phone || '';
  const displayUsername = customerProfile?.username || '';
  const displayEmail = customerProfile?.real_email || '';
  const isFakeEmail = user?.email?.includes('@thara.app');
  const avatarLetter = (customerProfile?.name || user?.email || '?').charAt(0).toUpperCase();

  const startEdit = () => {
    setEditName(customerProfile?.name || '');
    setEditPhone(customerProfile?.phone || '');
    setEditUsername(customerProfile?.username || '');
    setEditEmail(customerProfile?.real_email || '');
    setEditing(true);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await updateCustomerProfile(editName, editPhone, editUsername || null, editEmail || null);
      setEditing(false);
    } catch (err: any) {
      const m = err?.message || '';
      if (m.includes('اسم المستخدم مستخدم مسبقاً')) {
        showToast('اسم المستخدم مستخدم مسبقاً من حساب آخر', 'error');
      } else if (m.includes('رقم الجوال مستخدم مسبقاً')) {
        showToast('رقم الجوال مستخدم مسبقاً من حساب آخر', 'error');
      } else {
        showToast('فشل حفظ الملف الشخصي', 'error');
      }
    }
    setSaving(false);
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('يرجى ملء جميع الحقول', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('كلمة المرور الجديدة غير متطابقة', 'error');
      return;
    }
    try {
      const { supabase } = await import('../supabase/client');
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });
      if (signInError) {
        showToast('كلمة المرور الحالية غير صحيحة', 'error');
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      showToast('تم تغيير كلمة المرور بنجاح', 'success');
      setChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast('فشل تغيير كلمة المرور: ' + (err.message || ''), 'error');
    }
  };

  if (!user) return (
    <div className="account-tab">
      <div className="empty-tab">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <h3>تسجيل الدخول</h3>
        <p>سجل دخولك لمتابعة طلباتك والمزيد</p>
        <Link to="/customer/login" className="btn" style={{ marginTop: '1rem' }}>تسجيل الدخول</Link>
        <Link to="/register" className="btn btn-ghost" style={{ marginTop: '0.5rem' }}>إنشاء حساب جديد</Link>
      </div>
      <CustomerHelp />
      <InstallGuide />
    </div>
  );

  const points = customerProfile?.loyalty_points ?? 0;

  return (
    <div className="account-tab">
      {editing ? (
        <div className="acc-card acc-edit-card">
          <h3 className="acc-section-title">تعديل البيانات</h3>
          <div className="acc-field">
            <label>الاسم الكامل</label>
            <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
              placeholder="الاسم الكامل" className="acc-input" />
          </div>
          <div className="acc-field">
            <label>رقم الجوال</label>
            <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)}
              placeholder="05xxxxxxxx" className="acc-input ltr" dir="ltr" />
          </div>
          <div className="acc-field">
            <label>اسم المستخدم (اختياري)</label>
            <input type="text" value={editUsername} onChange={e => setEditUsername(e.target.value)}
              placeholder="my_username" className="acc-input ltr" dir="ltr" />
          </div>
          <div className="acc-field">
            <label>البريد الإلكتروني <span style={{ fontWeight: 400, color: '#94a3b8' }}>(لاستعادة كلمة المرور)</span></label>
            <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)}
              placeholder="example@email.com" className="acc-input ltr" dir="ltr" autoComplete="email" />
          </div>
          <div className="acc-edit-actions">
            <button className="acc-btn acc-btn-primary" onClick={saveProfile} disabled={saving}>
              {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
            <button className="acc-btn acc-btn-ghost" onClick={() => setEditing(false)}>إلغاء</button>
          </div>
        </div>
      ) : (
        <>
          <div className="acc-profile-header">
            <div className="acc-avatar-ring">
              <div className="acc-avatar">{avatarLetter}</div>
            </div>
            {staffRole ? (
              <Link to="/admin" className="acc-name" style={{ textDecoration: 'none', cursor: 'pointer' }}>{displayName}</Link>
            ) : (
              <div className="acc-name">{displayName}</div>
            )}
            <div className="acc-phone">{displayPhone || 'رقم الجوال غير مضاف'}</div>
            <div className="acc-email">{isFakeEmail ? (displayEmail || 'البريد الإلكتروني غير مضاف') : user.email}</div>
            {displayUsername && <div className="acc-username" style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '-0.25rem' }}>@{displayUsername}</div>}
            {staffRole && (
              <Link to="/admin" className="acc-staff-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span>{currentStaff?.name || ROLE_LABELS[staffRole] || staffRole}</span>
                <span className="acc-staff-role-tag">{ROLE_LABELS[staffRole] || staffRole}</span>
              </Link>
            )}
            <button className="acc-edit-btn" onClick={startEdit}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              تعديل
            </button>
          </div>

          <div className="acc-loyalty-card">
            <div className="acc-loyalty-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#b8860b" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span>نقاط الولاء</span>
            </div>
            <div className="acc-loyalty-body">
              <span className="acc-loyalty-points">{points.toLocaleString()}</span>
              <span className="acc-loyalty-unit">نقطة</span>
            </div>
            <div className="acc-loyalty-footer">
              كل ريال = نقطة • استخدم النقاط في الخصومات قريبًا
            </div>
          </div>

          {changingPassword ? (
            <div className="acc-card acc-edit-card">
              <h3 className="acc-section-title">تغيير كلمة المرور</h3>
              <div className="acc-field">
                <label>كلمة المرور الحالية</label>
                <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="كلمة المرور الحالية" className="acc-input" />
              </div>
              <div className="acc-field">
                <label>كلمة المرور الجديدة</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="كلمة المرور الجديدة" className="acc-input" />
              </div>
              <div className="acc-field">
                <label>تأكيد كلمة المرور</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="تأكيد كلمة المرور" className="acc-input" />
              </div>
              <div className="acc-edit-actions">
                <button className="acc-btn acc-btn-primary" onClick={handlePasswordChange}>حفظ</button>
                <button className="acc-btn acc-btn-ghost" onClick={() => { setChangingPassword(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }}>إلغاء</button>
              </div>
            </div>
          ) : (
            <button className="acc-btn acc-btn-primary" onClick={() => setChangingPassword(true)}>
              تغيير كلمة المرور
            </button>
          )}

          <div className="acc-card acc-info-card">
            {customerProfile ? (
              <>
                <div className="acc-info-row">
                  <span className="acc-info-label">رقم العميل</span>
                  <span className="acc-info-value">#{customerProfile.id}</span>
                </div>
                <div className="acc-info-row">
                  <span className="acc-info-label">تاريخ التسجيل</span>
                  <span className="acc-info-value">
                    {customerProfile.created_at && !isNaN(new Date(customerProfile.created_at).getTime())
                      ? new Date(customerProfile.created_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
                      : 'غير متاح'}
                  </span>
                </div>
              </>
            ) : staffRole && currentStaff ? (
              <>
                <div className="acc-info-row">
                  <span className="acc-info-label">رقم الموظف</span>
                  <span className="acc-info-value">#{currentStaff.id}</span>
                </div>
                <div className="acc-info-row">
                  <span className="acc-info-label">الدور</span>
                  <span className="acc-info-value">{ROLE_LABELS[staffRole] || staffRole}</span>
                </div>
                <div className="acc-info-row">
                  <span className="acc-info-label">البريد الإلكتروني</span>
                  <span className="acc-info-value">{currentStaff.email || '—'}</span>
                </div>
              </>
            ) : null}
          </div>

          {orders && orders.length > 0 && (
            <div className="acc-card" style={{ padding: '1rem' }}>
              <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', color: '#f1f5f9' }}>📋 طلباتي السابقة</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {orders.slice(-5).reverse().map(o => (
                  <div key={o.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.5rem 0.65rem', borderRadius: 8,
                    background: 'rgba(255,255,255,0.04)', fontSize: '0.8rem'
                  }}>
                    <div>
                      <div style={{ color: '#e2e8f0', fontWeight: 600 }}>طلب #{o.id.slice(-6)}</div>
                      <div style={{ color: '#64748b', fontSize: '0.7rem' }}>
                        {o.date ? new Date(o.date).toLocaleDateString('ar-SA') : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ color: '#fbbf24', fontWeight: 700 }}>{o.total?.toFixed(2)} ر.س</div>
                      <span className={`order-badge ${o.status === 'مكتمل' ? 'badge-done' : o.status === 'ملغي' ? 'badge-cancel' : 'badge-new'}`}
                        style={{
                          fontSize: '0.6rem', padding: '0.1rem 0.35rem', borderRadius: 4,
                          background: o.status === 'مكتمل' ? 'rgba(34,197,94,0.2)' : o.status === 'ملغي' ? 'rgba(239,68,68,0.2)' : 'rgba(251,191,36,0.2)',
                          color: o.status === 'مكتمل' ? '#4ade80' : o.status === 'ملغي' ? '#fca5a5' : '#fbbf24'
                        }}>
                        {o.status === 'مكتمل' ? 'تم التوصيل' : o.status === 'ملغي' ? 'ملغي' : o.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="acc-theme-card">
            <div className="acc-theme-left">
              <ThemeToggle currentTheme={theme} onThemeChange={onThemeChange} inline />
            </div>
          </div>

          <CustomerHelp />
          <InstallGuide />
        </>
      )}

      <button className="acc-logout-btn" onClick={logout}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        تسجيل الخروج
      </button>
    </div>
  );
});

export default AccountTab;
