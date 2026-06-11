import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { customersApi } from '../supabase/customers';

export default function CustomerLogin() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await customersApi.login(identifier, password);
      navigate('/');
    } catch (err) {
      setError('بيانات الدخول غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <img src={`${import.meta.env.BASE_URL || '/'}logo222.jpg`} alt="" className="auth-logo" />
          <h1>تسجيل الدخول</h1>
          <p>أسواق ثراء الشرق ون</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="auth-field">
            <label>رقم الجوال أو اسم المستخدم</label>
            <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)}
              placeholder="05xxxxxxxx أو username_123" required className="auth-input" dir="ltr" />
          </div>

          <div className="auth-field">
            <label>كلمة المرور</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required className="auth-input" />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>

        <div className="auth-footer">
          ليس لديك حساب؟ <Link to="/register">إنشاء حساب جديد</Link>
        </div>
        <div className="auth-back">
          <Link to="/">← العودة للمتجر</Link>
        </div>
      </div>
    </div>
  );
}
