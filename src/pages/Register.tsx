import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { customersApi } from '../supabase/customers';
import { supabase } from '../supabase/client';

export default function Register() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
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
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!/^05\d{8}$/.test(cleanPhone)) {
      setError('رقم الجوال غير صحيح. يجب أن يبدأ بـ 05 ويتكون من 10 أرقام');
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
    if (!email || !email.includes('@')) {
      setError('البريد الإلكتروني مطلوب لاستعادة كلمة المرور');
      return;
    }
    setLoading(true);
    try {
      const cleanPhone = phone.trim();
      const cleanUsername = username ? username.trim().toLowerCase() : null;
      const cleanEmail = email.trim().toLowerCase();
      const { data: userData, error: rpcErr } = await supabase.rpc('create_customer_auth_rpc', {
        p_email: cleanEmail, p_password: password, p_username: cleanUsername
      });
      if (rpcErr) throw rpcErr;
      if (userData?.existing) {
        setError('لديك حساب بالفعل، سجل دخول');
        setLoading(false);
        return;
      }
      await customersApi.create(cleanEmail, name, cleanPhone, cleanUsername, cleanEmail);
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (signInErr) {
        const { data: sessData, error: sessErr } = await supabase.rpc('create_customer_session_rpc', { p_email: cleanEmail });
        if (!sessErr && sessData?.refresh_token) {
          await supabase.auth.refreshSession({ refresh_token: sessData.refresh_token });
        }
      }
      navigate('/');
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('تكرار اسم المستخدم')) {
        setError('اسم المستخدم مستخدم مسبقاً من حساب آخر');
      } else if (msg.includes('رقم الجوال')) {
        setError('رقم الجوال مستخدم مسبقاً من حساب آخر');
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
            <label>البريد الإلكتروني <span style={{ fontWeight: 400, color: '#ef4444' }}>*</span></label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="example@email.com" required className="auth-input" dir="ltr" autoComplete="email" />
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
          لديك حساب بالفعل؟ <Link to="/customer/login">تسجيل الدخول</Link>
        </div>
        <div className="auth-back">
          <Link to="/">← العودة للمتجر</Link>
        </div>
      </div>
    </div>
  );
}
