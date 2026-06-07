import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { showToast } from './Toast.jsx';

const AccountTab = memo(({ user, logout, customerProfile, updateCustomerProfile, theme, toggleTheme, staffRole }) => {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const displayName = customerProfile?.name || user?.email?.split('@')[0] || '';
  const displayPhone = customerProfile?.phone || '';
  const avatarLetter = (customerProfile?.name || user?.email || '?').charAt(0).toUpperCase();

  const startEdit = () => {
    setEditName(customerProfile?.name || '');
    setEditPhone(customerProfile?.phone || '');
    setEditing(true);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await updateCustomerProfile(editName, editPhone);
      setEditing(false);
    } catch { /* ignore */ }
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
    } catch (err) {
      showToast('فشل تغيير كلمة المرور: ' + (err.message || ''), 'error');
    }
  };

  if (!user) return (
    <div className="account-tab">
      <div className="empty-tab">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <h3>تسجيل الدخول</h3>
        <p>سجل دخولك لمتابعة طلباتك والمزيد</p>
        <Link to="/login" className="btn" style={{ marginTop: '1rem' }}>تسجيل الدخول</Link>
        <Link to="/register" className="btn btn-ghost" style={{ marginTop: '0.5rem' }}>إنشاء حساب جديد</Link>
      </div>

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
            <div className="acc-name">{displayName}</div>
            <div className="acc-phone">{displayPhone || 'رقم الجوال غير مضاف'}</div>
            <div className="acc-email">{user.email}</div>
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
            <div className="acc-info-row">
              <span className="acc-info-label">تاريخ التسجيل</span>
              <span className="acc-info-value">
                {customerProfile?.created_at && !isNaN(new Date(customerProfile.created_at))
                  ? new Date(customerProfile.created_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
                  : 'غير متاح'}
              </span>
            </div>
          </div>

          <div className="acc-theme-card" onClick={toggleTheme} role="button" tabIndex={0}>
            <div className="acc-theme-left">
              <div className="acc-theme-icon">{theme === 'light' ? '🌙' : '☀️'}</div>
              <div className="acc-theme-text">
                <span className="acc-theme-label">{theme === 'light' ? 'المظهر الداكن' : 'المظهر الفاتح'}</span>
                <span className="acc-theme-sub">{theme === 'light' ? 'بطاقات زجاجية داكنة' : 'المظهر الأبيض الافتراضي'}</span>
              </div>
            </div>
            <div className="acc-toggle-wrap">
              <div className="acc-toggle-track">
                <div className="acc-toggle-thumb" />
                <span className="acc-toggle-icon acc-toggle-sun">☀️</span>
                <span className="acc-toggle-icon acc-toggle-moon">🌙</span>
              </div>
            </div>
          </div>


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
