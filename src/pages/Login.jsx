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
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a5c34, #127443, #1a9e5c)',
      fontFamily: "'Tajawal', sans-serif"
    }}>
      <div style={{
        background: 'white', padding: '2.5rem', borderRadius: '20px', width: '100%',
        maxWidth: '400px', margin: '1rem', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src={`${import.meta.env.BASE_URL || '/'}LOGO.jpg`} alt="" style={{
            width: '80px', height: '80px', borderRadius: '16px',
            objectFit: 'contain', background: 'white', padding: '4px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginBottom: '1rem'
          }} />
          <h1 style={{ color: '#127443', fontSize: '1.5rem', fontWeight: 900 }}>لوحة التاجر</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>أسواق ثرا الشرق ون</p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#1e293b' }}>
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="yaser.haroon79@gmail.com"
              required
              style={{
                width: '100%', padding: '0.75rem 1rem', border: '2px solid #e2e8f0',
                borderRadius: '12px', fontSize: '1rem', fontFamily: 'inherit',
                outline: 'none', transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#127443'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#1e293b' }}>
              كلمة المرور
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%', padding: '0.75rem 1rem', border: '2px solid #e2e8f0',
                borderRadius: '12px', fontSize: '1rem', fontFamily: 'inherit',
                outline: 'none', transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#127443'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          {error && (
            <div style={{
              background: '#fef2f2', color: '#dc2626', padding: '0.75rem',
              borderRadius: '8px', marginBottom: '1rem', textAlign: 'center',
              fontSize: '0.9rem', fontWeight: 500
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            style={{
              width: '100%', padding: '0.85rem', background: '#127443', color: 'white',
              border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 4px 12px rgba(18, 116, 67, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = '';
              e.target.style.boxShadow = '';
            }}
          >
            تسجيل الدخول
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>
          <Link to="/" style={{ color: '#127443', textDecoration: 'none', fontWeight: 600 }}>العودة للمتجر</Link>
        </p>
      </div>
    </div>
  );
}
