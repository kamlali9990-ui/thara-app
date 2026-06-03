import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PHONE, WHATSAPP_NUM, EMAIL_1, SNAPCHAT } from '../utils/constants';
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
      <div className="acc-contact-card">
        <div className="acc-contact-title">اتصل بنا</div>
        <div className="acc-contact-row">
          <a href={`tel:${PHONE}`} className="acc-contact-btn acc-contact-phone">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          </a>
          <a href={`https://wa.me/${WHATSAPP_NUM}`} target="_blank" rel="noopener noreferrer" className="acc-contact-btn acc-contact-whatsapp">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
          </a>
          <a href={`mailto:${EMAIL_1}`} className="acc-contact-btn" style={{ background: '#ea4335', color: '#fff' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
          </a>
          <a href={`https://www.snapchat.com/add/${SNAPCHAT}`} target="_blank" rel="noopener noreferrer" className="acc-contact-btn acc-contact-snap">
            <svg width="20" height="20" viewBox="0 0 512 512" fill="currentColor"><path d="M510.846 392.673c-5.211 12.157-27.239 21.089-67.36 27.318-2.064 2.786-3.775 14.686-6.507 23.956-1.625 5.566-5.623 8.869-12.128 8.869l-.297-.005c-9.395 0-19.203-4.323-38.852-4.323-26.521 0-35.662 6.043-56.254 20.588-21.832 15.438-42.771 28.764-74.027 27.399-31.646 2.334-58.025-16.908-72.871-27.404-20.714-14.643-29.828-20.582-56.241-20.582-18.864 0-30.736 4.72-38.852 4.72-8.073 0-11.213-4.922-12.422-9.04-2.703-9.189-4.404-21.263-6.523-24.13-20.679-3.209-67.31-11.344-68.498-32.15a10.627 10.627 0 0 1 8.877-11.069c69.583-11.455 100.924-82.901 102.227-85.934.074-.176.155-.344.237-.515 3.713-7.537 4.544-13.849 2.463-18.753-5.05-11.896-26.872-16.164-36.053-19.796-23.715-9.366-27.015-20.128-25.612-27.504 2.437-12.836 21.725-20.735 33.002-15.453 8.919 4.181 16.843 6.297 23.547 6.297 5.022 0 8.212-1.204 9.96-2.171-2.043-35.936-7.101-87.29 5.687-115.969C158.122 21.304 229.705 15.42 250.826 15.42c.944 0 9.141-.089 10.11-.089 52.148 0 102.254 26.78 126.723 81.643 12.777 28.65 7.749 79.792 5.695 116.009 1.582.872 4.357 1.942 8.599 2.139 6.397-.286 13.815-2.389 22.069-6.257 6.085-2.846 14.406-2.461 20.48.058l.029.01c9.476 3.385 15.439 10.215 15.589 17.87.184 9.747-8.522 18.165-25.878 25.018-2.118.835-4.694 1.655-7.434 2.525-9.797 3.106-24.6 7.805-28.616 17.271-2.079 4.904-1.256 11.211 2.46 18.748.087.168.166.342.239.515 1.301 3.03 32.615 74.46 102.23 85.934 6.427 1.058 11.163 7.877 7.725 15.859z"/></svg>
          </a>
        </div>
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

          <div className="acc-contact-card">
            <div className="acc-contact-title">اتصل بنا</div>
            <div className="acc-contact-row">
              <a href={`tel:${PHONE}`} className="acc-contact-btn acc-contact-phone">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              </a>
              <a href={`https://wa.me/${WHATSAPP_NUM}`} target="_blank" rel="noopener noreferrer" className="acc-contact-btn acc-contact-whatsapp">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
              </a>
              <a href={`mailto:${EMAIL_1}`} className="acc-contact-btn" style={{ background: '#ea4335', color: '#fff' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              </a>
              <a href={`https://www.snapchat.com/add/${SNAPCHAT}`} target="_blank" rel="noopener noreferrer" className="acc-contact-btn acc-contact-snap">
                <svg width="20" height="20" viewBox="0 0 512 512" fill="currentColor"><path d="M510.846 392.673c-5.211 12.157-27.239 21.089-67.36 27.318-2.064 2.786-3.775 14.686-6.507 23.956-1.625 5.566-5.623 8.869-12.128 8.869l-.297-.005c-9.395 0-19.203-4.323-38.852-4.323-26.521 0-35.662 6.043-56.254 20.588-21.832 15.438-42.771 28.764-74.027 27.399-31.646 2.334-58.025-16.908-72.871-27.404-20.714-14.643-29.828-20.582-56.241-20.582-18.864 0-30.736 4.72-38.852 4.72-8.073 0-11.213-4.922-12.422-9.04-2.703-9.189-4.404-21.263-6.523-24.13-20.679-3.209-67.31-11.344-68.498-32.15a10.627 10.627 0 0 1 8.877-11.069c69.583-11.455 100.924-82.901 102.227-85.934.074-.176.155-.344.237-.515 3.713-7.537 4.544-13.849 2.463-18.753-5.05-11.896-26.872-16.164-36.053-19.796-23.715-9.366-27.015-20.128-25.612-27.504 2.437-12.836 21.725-20.735 33.002-15.453 8.919 4.181 16.843 6.297 23.547 6.297 5.022 0 8.212-1.204 9.96-2.171-2.043-35.936-7.101-87.29 5.687-115.969C158.122 21.304 229.705 15.42 250.826 15.42c.944 0 9.141-.089 10.11-.089 52.148 0 102.254 26.78 126.723 81.643 12.777 28.65 7.749 79.792 5.695 116.009 1.582.872 4.357 1.942 8.599 2.139 6.397-.286 13.815-2.389 22.069-6.257 6.085-2.846 14.406-2.461 20.48.058l.029.01c9.476 3.385 15.439 10.215 15.589 17.87.184 9.747-8.522 18.165-25.878 25.018-2.118.835-4.694 1.655-7.434 2.525-9.797 3.106-24.6 7.805-28.616 17.271-2.079 4.904-1.256 11.211 2.46 18.748.087.168.166.342.239.515 1.301 3.03 32.615 74.46 102.23 85.934 6.427 1.058 11.163 7.877 7.725 15.859z"/></svg>
              </a>
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
