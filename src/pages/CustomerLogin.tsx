import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { customersApi } from '../supabase/customers';
import { supabase } from '../supabase/client';
import { staffApi } from '../supabase/staff';

const ADMIN_STORAGE_KEY = 'thara-auth-admin';

export default function CustomerLogin() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setupError, setSetupError] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupSuccess, setSetupSuccess] = useState(false);
  const navigate = useNavigate();

  const isPhoneOnlyEmail = (email: string) =>
    /^p\d{10}@thara\.app$/.test(email) || email.endsWith('@thara.app');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await customersApi.login(identifier, password);
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const staff = await staffApi.getByEmail(user.email).catch(() => null);
        if (staff) {
          const storeSession = localStorage.getItem('thara-auth-store');
          if (storeSession) {
            localStorage.setItem(ADMIN_STORAGE_KEY, storeSession);
          }
          navigate('/admin');
          return;
        }
        if (isPhoneOnlyEmail(user.email)) {
          setShowSetup(true);
          setLoading(false);
          return;
        }
      }
      navigate('/');
    } catch (err: any) {
      setError('بيانات الدخول غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async () => {
    setSetupError('');
    if (!newEmail || !newEmail.includes('@')) {
      setSetupError('يرجى إدخال بريد إلكتروني صحيح');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setSetupError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      setSetupError('كلمة المرور غير متطابقة');
      return;
    }
    setSetupLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const customer = await customersApi.get(user.email);
        if (customer) {
          await customersApi.update(
            customer.email, customer.name, customer.phone,
            customer.delivery_address, customer.neighborhood,
            customer.location, customer.username, newEmail
          );
        }
        const { error: pwErr } = await supabase.functions.invoke('admin-reset-password', {
          body: { email: user.email, newPassword }
        });
        if (pwErr) throw pwErr;
      }
      setSetupSuccess(true);
    } catch (err: any) {
      setSetupError(err.message || 'حدث خطأ، حاول مرة أخرى');
    } finally {
      setSetupLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {setupSuccess ? (
          <div className="auth-setup-box">
            <div className="auth-header">
              <img src={`${import.meta.env.BASE_URL || '/'}logo222.jpg`} alt="" className="auth-logo" />
              <h1>تم التفعيل</h1>
              <p style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
                تم حفظ بريدك الإلكتروني <strong style={{ direction: 'ltr', display: 'inline-block' }}>{newEmail}</strong>.
                <br /><br />
                يمكنك تسجيل الدخول برقم جوالك وكلمة المرور الجديدة.
              </p>
            </div>
            <button className="auth-btn" onClick={() => navigate('/')}>
              الذهاب للمتجر
            </button>
          </div>
        ) : !showSetup ? (
          <>
            <div className="auth-header">
              <img src={`${import.meta.env.BASE_URL || '/'}logo222.jpg`} alt="" className="auth-logo" />
              <h1>تسجيل الدخول</h1>
              <p>أسواق ثراء الشرق ون</p>
            </div>

            <form onSubmit={handleLogin}>
              <div className="auth-field">
                <label>رقم الجوال أو اسم المستخدم</label>
                <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)}
                  placeholder="05xxxxxxxx أو username_123" required className="auth-input" dir="ltr" autoComplete="username" />
              </div>

              <div className="auth-field">
                <label>كلمة المرور</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required className="auth-input" autoComplete="current-password" />
              </div>

              {error && <div className="auth-error">{error}</div>}

              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                <Link to="/forgot-password" style={{
                  color: 'var(--auth-link, #127443)', textDecoration: 'none',
                  fontSize: '0.85rem', fontWeight: 600
                }}>
                  نسيت كلمة المرور؟
                </Link>
              </div>
            </form>

            <div className="auth-footer">
              ليس لديك حساب؟ <Link to="/register">إنشاء حساب جديد</Link>
            </div>
          </>
        ) : (
          <div className="auth-setup-box">
            <div className="auth-header">
              <img src={`${import.meta.env.BASE_URL || '/'}logo222.jpg`} alt="" className="auth-logo" />
              <h1>مرحباً بك!</h1>
              <p style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
                يرجى إدخال بريدك الإلكتروني الحقيقي وكلمة مرور جديدة لتفعيل حسابك
              </p>
            </div>

            <div className="auth-field">
              <label>البريد الإلكتروني الحقيقي</label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                placeholder="name@example.com" required className="auth-input" autoComplete="email" />
            </div>

            <div className="auth-field">
              <label>كلمة المرور الجديدة</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                placeholder="6 أحرف على الأقل" required className="auth-input" minLength={6} autoComplete="new-password" />
            </div>

            <div className="auth-field">
              <label>تأكيد كلمة المرور</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                placeholder="أعد كتابة كلمة المرور" required className="auth-input" autoComplete="new-password" />
            </div>

            {setupError && <div className="auth-error">{setupError}</div>}

            <button className="auth-btn" onClick={handleSetup} disabled={setupLoading}>
              {setupLoading ? 'جاري الحفظ...' : 'حفظ ومتابعة'}
            </button>
          </div>
        )}
        <div className="auth-back">
          <Link to="/">← العودة للمتجر</Link>
        </div>
      </div>
    </div>
  );
}
