import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../supabase/auth';
import { customersApi } from '../supabase/customers';

export default function Register() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
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
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      await authApi.signUpDirect(normalizedEmail, password);
      await authApi.signIn(normalizedEmail, password);
      try {
        await customersApi.create(normalizedEmail, name, phone);
      } catch {
        console.warn('تم إنشاء الحساب ولكن فشل إنشاء سجل العميل');
      }
      navigate('/');
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('already registered') || msg.includes('already exists')) {
        setError('هذا البريد مسجل مسبقاً');
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
          <img src={`${import.meta.env.BASE_URL || '/'}LOGO.jpg`} alt="" className="auth-logo" />
          <h1>إنشاء حساب جديد</h1>
          <p>انضم إلى ثراء الشرق ون</p>
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
            <label>البريد الإلكتروني</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" required className="auth-input" />
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
