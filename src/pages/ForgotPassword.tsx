import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../supabase/auth';
import { customersApi } from '../supabase/customers';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@')) {
        throw new Error('يرجى إدخال بريد إلكتروني صحيح');
      }
      const foundAuthEmail = await customersApi.findByRealEmail(cleanEmail);
      if (!foundAuthEmail) {
        setSent(true);
        return;
      }
      const redirectTo = window.location.origin + (import.meta.env.BASE_URL || '/') + 'reset-password';
      await authApi.resetPassword(foundAuthEmail, redirectTo);
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'فشل إرسال رابط إعادة التعيين');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <img src={`${import.meta.env.BASE_URL || '/'}logo222.jpg`} alt="" className="auth-logo" />
            <h1>تم الإرسال</h1>
            <p>أسواق ثراء الشرق ون</p>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#127443" strokeWidth="1.5" style={{ marginBottom: '1rem' }}>
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <p style={{ color: '#1e293b', fontSize: '1rem', lineHeight: 1.6 }}>
              إذا كان البريد الإلكتروني مسجلاً لدينا، ستتلقى رابط إعادة تعيين كلمة المرور خلال دقائق.
            </p>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.75rem' }}>
              إذا لم تستلم البريد، تأكد من صحة البريد الإلكتروني أو تواصل مع الإدارة.
            </p>
          </div>
          <div className="auth-back" style={{ marginTop: '1.5rem' }}>
            <Link to="/login">← العودة لتسجيل الدخول</Link>
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
          <h1>نسيت كلمة المرور</h1>
          <p>أدخل بريدك الإلكتروني المسجل لإعادة تعيين كلمة المرور</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>البريد الإلكتروني</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="example@email.com" required className="auth-input" dir="ltr" autoComplete="email" />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'جاري الإرسال...' : 'إرسال رابط إعادة التعيين'}
          </button>
        </form>

        <div className="auth-footer">
          تذكرت كلمة المرور؟ <Link to="/login">تسجيل الدخول</Link>
        </div>
        <div className="auth-back">
          <Link to="/">← العودة للمتجر</Link>
        </div>
      </div>
    </div>
  );
}
