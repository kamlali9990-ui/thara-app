import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../supabase/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await authApi.signIn(email, password);
      navigate('/admin');
    } catch (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
        : 'حدث خطأ أثناء تسجيل الدخول');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at center, #0d3d24 0%, #06190e 100%)',
      fontFamily: "'Tajawal', sans-serif",
      position: 'relative',
      overflow: 'hidden',
      padding: '1rem'
    }}>
      {/* Decorative Blur Blobs */}
      <div style={{
        position: 'absolute', width: '300px', height: '300px',
        background: 'rgba(16, 185, 129, 0.15)', borderRadius: '50%',
        filter: 'blur(80px)', top: '10%', left: '10%', pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', width: '300px', height: '300px',
        background: 'rgba(245, 158, 11, 0.1)', borderRadius: '50%',
        filter: 'blur(80px)', bottom: '10%', right: '10%', pointerEvents: 'none'
      }} />

      <div style={{
        background: 'rgba(255, 255, 255, 0.04)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '3rem 2rem',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 30px 60px rgba(0, 0, 0, 0.4)',
        textAlign: 'center',
        zIndex: 10
      }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <img src={`${import.meta.env.BASE_URL || '/'}LOGO.jpg`} alt="" style={{
            width: '88px', height: '88px', borderRadius: '20px',
            objectFit: 'contain', background: 'white', padding: '4px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)', marginBottom: '1.25rem',
            border: '2px solid rgba(255, 255, 255, 0.1)'
          }} />
          <h1 style={{ color: '#ffffff', fontSize: '1.75rem', fontWeight: 900, margin: '0 0 0.5rem' }}>لوحة التحكم</h1>
          <p style={{ color: '#a7f3d0', fontSize: '0.95rem', fontWeight: 500, margin: 0 }}>أسواق ثرا الشرق ون</p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1.25rem', textAlign: 'right' }}>
            <label style={{ display: 'block', marginBottom: '0.6rem', fontWeight: 600, color: '#e2e8f0', fontSize: '0.9rem' }}>
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              style={{
                width: '100%',
                padding: '0.85rem 1.1rem',
                border: '1.5px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '14px',
                fontSize: '1rem',
                fontFamily: 'inherit',
                background: 'rgba(0, 0, 0, 0.35)',
                color: '#ffffff',
                outline: 'none',
                transition: 'all 0.25s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#fbbf24';
                e.target.style.boxShadow = '0 0 0 4px rgba(251, 191, 36, 0.15)';
                e.target.style.background = 'rgba(0, 0, 0, 0.45)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.target.style.boxShadow = 'none';
                e.target.style.background = 'rgba(0, 0, 0, 0.35)';
              }}
            />
          </div>

          <div style={{ marginBottom: '1.75rem', textAlign: 'right' }}>
            <label style={{ display: 'block', marginBottom: '0.6rem', fontWeight: 600, color: '#e2e8f0', fontSize: '0.9rem' }}>
              كلمة المرور
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                padding: '0.85rem 1.1rem',
                border: '1.5px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '14px',
                fontSize: '1rem',
                fontFamily: 'inherit',
                background: 'rgba(0, 0, 0, 0.35)',
                color: '#ffffff',
                outline: 'none',
                transition: 'all 0.25s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#fbbf24';
                e.target.style.boxShadow = '0 0 0 4px rgba(251, 191, 36, 0.15)';
                e.target.style.background = 'rgba(0, 0, 0, 0.45)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.target.style.boxShadow = 'none';
                e.target.style.background = 'rgba(0, 0, 0, 0.35)';
              }}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              padding: '0.85rem',
              borderRadius: '12px',
              marginBottom: '1.25rem',
              textAlign: 'center',
              fontSize: '0.9rem',
              fontWeight: 500
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '0.95rem',
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              color: '#451a03',
              border: 'none',
              borderRadius: '14px',
              fontSize: '1.1rem',
              fontWeight: 800,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.25s ease',
              boxShadow: '0 4px 20px rgba(251, 191, 36, 0.2)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 25px rgba(251, 191, 36, 0.35)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = '';
              e.target.style.boxShadow = '0 4px 20px rgba(251, 191, 36, 0.2)';
            }}
          >
            تسجيل الدخول
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.9rem', marginBottom: 0 }}>
          <Link to="/" style={{ color: '#a7f3d0', textDecoration: 'none', fontWeight: 600, transition: 'color 0.2s' }}
            onMouseEnter={(e) => e.target.style.color = '#ffffff'}
            onMouseLeave={(e) => e.target.style.color = '#a7f3d0'}>
            ← العودة للمتجر
          </Link>
        </p>
      </div>
    </div>
  );
}
