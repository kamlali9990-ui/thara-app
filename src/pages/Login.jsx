import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../utils/theme';
import { supabase } from '../supabase/client';

const STORAGE_KEY = 'thara_login_remember';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useStore();
  const { theme, setTheme } = useTheme();

  // Clear stale admin session on login page mount
  useEffect(() => {
    supabase.auth.signOut().catch(() => {});
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { email: savedEmail } = JSON.parse(saved);
        setEmail(savedEmail || '');
        setRememberMe(true);
      } catch {}
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      if (rememberMe) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ email }));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
      navigate('/admin');
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
          <img src={`${import.meta.env.BASE_URL || '/'}logo222.jpg`} alt="" className="auth-logo" />
          <h1>لوحة التحكم</h1>
          <p>أسواق ثراء الشرق ون</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="auth-field">
            <label>البريد الإلكتروني أو رقم الجوال</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com أو 05xxxxxxxx"
              required
              className="auth-input"
              autoComplete="username"
            />
          </div>

          <div className="auth-field">
            <label>كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="auth-input"
              autoComplete="current-password"
            />
          </div>

          <label className="auth-remember">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>تذكر بيانات الدخول</span>
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>

        <div className="auth-back">
          <Link to="/">← العودة للمتجر</Link>
        </div>
      </div>
      <ThemeToggle currentTheme={theme} onThemeChange={setTheme} />
    </div>
  );
}
