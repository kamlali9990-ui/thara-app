import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../supabase/auth';

export default function CustomerLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.signIn(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
        : 'حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <img src={`${import.meta.env.BASE_URL || '/'}LOGO.jpg`} alt="" className="auth-logo" />
          <h1>تسجيل الدخول</h1>
          <p>ثراء الشرق ون</p>
        </div>

        <form onSubmit={handleLogin}>
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
