import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { authApi } from '../supabase/auth';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && (hash.includes('type=recovery') || hash.includes('access_token'))) {
      supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
          setReady(true);
        }
      });
      supabase.auth.initialize?.();
    } else {
      setError('رابط إعادة التعيين غير صالح أو منتهي الصلاحية');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (password !== confirm) {
      setError('كلمة المرور غير متطابقة');
      return;
    }
    setLoading(true);
    try {
      await authApi.updatePassword(password);
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message || 'فشل إعادة تعيين كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <img src={`${import.meta.env.BASE_URL || '/'}logo222.jpg`} alt="" className="auth-logo" />
            <h1>تم بنجاح</h1>
            <p>أسواق ثراء الشرق ون</p>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#127443" strokeWidth="1.5" style={{ marginBottom: '1rem' }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <p style={{ color: '#1e293b', fontSize: '1rem' }}>تم إعادة تعيين كلمة المرور بنجاح</p>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.5rem' }}>سيتم تحويلك إلى صفحة تسجيل الدخول...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <img src={`${import.meta.env.BASE_URL || '/'}logo222.jpg`} alt="" className="auth-logo" />
          <h1>إعادة تعيين كلمة المرور</h1>
          <p>أدخل كلمة المرور الجديدة</p>
        </div>

        {!ready && !error && (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: '#64748b' }}>
            جاري التحقق من الرابط...
          </div>
        )}

        {error && !ready && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div className="auth-error">{error}</div>
            <div className="auth-back" style={{ marginTop: '1rem' }}>
              <Link to="/login">← العودة لتسجيل الدخول</Link>
            </div>
          </div>
        )}

        {ready && (
          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label>كلمة المرور الجديدة</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required className="auth-input" autoComplete="new-password" />
            </div>
            <div className="auth-field">
              <label>تأكيد كلمة المرور</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••" required className="auth-input" autoComplete="new-password" />
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'جاري الحفظ...' : 'حفظ كلمة المرور الجديدة'}
            </button>
          </form>
        )}

        {ready && (
          <div className="auth-back" style={{ marginTop: '1rem' }}>
            <Link to="/login">← العودة لتسجيل الدخول</Link>
          </div>
        )}
      </div>
    </div>
  );
}
