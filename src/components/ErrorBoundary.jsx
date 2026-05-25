import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', padding: '2rem', textAlign: 'center', background: '#f8fafc',
          fontFamily: "'Tajawal', sans-serif"
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h1 style={{ color: '#1e293b', marginBottom: '0.5rem' }}>عذراً، حدث خطأ غير متوقع</h1>
          <p style={{ color: '#64748b', marginBottom: '2rem' }}>نعمل على حل المشكلة، يرجى إعادة تحميل الصفحة</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#127443', color: 'white', border: 'none', padding: '0.75rem 2rem',
              borderRadius: '12px', fontSize: '1rem', cursor: 'pointer', fontWeight: 600
            }}
          >
            إعادة تحميل
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
