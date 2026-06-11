import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../supabase/auth';
import { customersApi } from '../supabase/customers';

export default function Register() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('كلمة المرور غير متطابقة');
      return;
    }
    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (!phone) {
      setError('رقم الجوال مطلوب');
      return;
    }
    if (username && username.length < 3) {
      setError('اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
      return;
    }
    if (username && !/^[a-zA-Z0-9_.]+$/.test(username)) {
      setError('اسم المستخدم: أحرف إنجليزية وأرقام و _ . فقط');
      return;
    }
    setLoading(true);
    try {
      const cleanPhone = phone.trim();
      const cleanUsername = username ? username.trim().toLowerCase() : null;
      const authEmail = `p${cleanPhone.replace(/[^0-9]/g, '')}@thara.app`;
      await authApi.signUpDirect(authEmail, password, cleanUsername);
      await authApi.signIn(authEmail, password);
      try {
        await customersApi.create(authEmail, name, phone, cleanUsername);
      } catch {
        console.warn('تم إنشاء الحساب ولكن فشل إنشاء سجل العميل');
      }
      navigate('/');
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('رقم الجوال مستخدم مسبقاً') || msg.includes('already registered')) {
        setError('رقم الجوال مستخدم مسبقاً من حساب آخر');
      } else if (msg.includes('اسم المستخدم مستخدم مسبقاً')) {
        setError('اسم المستخدم مستخدم مسبقاً من حساب آخر');
      } else if (msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('rate limit')) {
        setError('تم تجاوز عدد محاولات التسجيل المسموحة، الرجاء المحاولة لاحقاً');
      } else {
        setError('حدث خطأ أثناء إنشاء الحساب');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <img src={`${import.meta.env.BASE_URL || '/'}logo222.jpg`} alt="" className="auth-logo" />
          <h1>إنشاء حساب جديد</h1>
          <p>انضم إلى أسواق ثراء الشرق ون</p>
        </div>

        <form onSubmit={handleRegister}>
          <div className="auth-field">
            <label>الاسم الكامل</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="محمد أحمد" required className="auth-input" />
          </div>

          <div className="auth-field">
            <label>رقم الجوال</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="05xxxxxxxx" required className="auth-input" dir="ltr" />
          </div>

          <div className="auth-field">
            <label>اسم المستخدم (اختياري)</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
              placeholder="my_username" className="auth-input" dir="ltr" />
          </div>

          <div className="auth-field">
            <label>كلمة المرور</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required className="auth-input" />
          </div>

          <div className="auth-field">
            <label>تأكيد كلمة المرور</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="••••••••" required className="auth-input" />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب'}
          </button>
        </form>

        <div className="auth-footer">
          لديك حساب بالفعل؟ <Link to="/login">تسجيل الدخول</Link>
        </div>
        <div className="auth-back">
          <Link to="/">← العودة للمتجر</Link>
        </div>
      </div>
    </div>
  );
}
