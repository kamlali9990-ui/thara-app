import React, { ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo?: React.ErrorInfo | null;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    this.setState({ errorInfo: info });
    try { localStorage.setItem('thara_last_error', JSON.stringify({ msg: error?.message, stack: error?.stack?.slice(0, 500), ts: Date.now() })); } catch {}
  }

  render() {
    if (this.state.hasError) {
      const isStorageError = this.state.error?.message?.includes('localStorage') || this.state.error?.message?.includes('QuotaExceededError') || this.state.error?.message?.includes('storage');
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', padding: '2rem', textAlign: 'center', background: '#f8fafc',
          fontFamily: "'Tajawal', sans-serif"
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌿</div>
          <h1 style={{ color: '#1e293b', marginBottom: '0.5rem' }}>عذراً منك</h1>
          <p style={{ color: '#64748b', marginBottom: '2rem', lineHeight: 1.7 }}>
            {isStorageError ? 'يبدو أن هناك مشكلة في التخزين المحلي — يرجى تعطيل التصفح الخاص أو السماح للتخزين المحلي والمحاولة مرة أخرى' : 'واجهنا خللاً بسيطاً أثناء تصفحك، يرجى إعادة تحميل الصفحة للمتابعة'}
          </p>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>نحن نعمل على تحسين تجربتك — شكراً لصبرك ❤️</p>
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
