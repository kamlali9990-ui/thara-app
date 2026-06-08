import React, { lazy, Suspense, useState, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'


import './index.css'
import { StoreProvider, useStore } from './context/StoreContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { ToastProvider } from './components/Toast.jsx'
import MaintenancePage from './components/MaintenancePage.jsx'
import { supabase } from './supabase/client.js'
import * as Sentry from '@sentry/react'

const MAINTENANCE_SECRET = 'm1s0c4r3t0k3y0xz7k9m2p4q8r1w3n5b6v0c9x1y2z3a4b5c6d7e8f9g0h1i2j3k4l5m6n7o8p';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || '';
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    })],
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    environment: import.meta.env.MODE || 'production',
  });
}

// A helper to automatically retry lazy imports by forcing a page reload when a chunk 404s
// SECURITY: This provides a better UX for transient network failures
const MAX_CHUNK_RELOADS = 2;
const lazyWithRetry = (componentImport, componentName) => {
  return lazy(async () => {
    // Use component-specific key to avoid collision between different lazy components
    const buildId = import.meta.env.MODE || 'dev';
    const storageKey = `thara_chunk_reload_${buildId}_${componentName || 'unknown'}`;
    const reloadCount = parseInt(sessionStorage.getItem(storageKey) || '0', 10);
    
    try {
      const component = await componentImport();
      sessionStorage.removeItem(storageKey);
      return component;
    } catch (error) {
      // Store reload count before reload to persist across navigation
      if (reloadCount < MAX_CHUNK_RELOADS) {
        sessionStorage.setItem(storageKey, String(reloadCount + 1));
        // Prevent rapid successive reloads by checking timestamp
        const lastReload = sessionStorage.getItem('thara_last_reload') || '0';
        const now = Date.now();
        if (now - parseInt(lastReload) > 2000) { // Minimum 2 seconds between reloads
          sessionStorage.setItem('thara_last_reload', String(now));
          window.location.reload();
        } else {
          // Too fast - just throw the error instead of reloading
          sessionStorage.removeItem(storageKey);
          throw new Error('فشل تحميل الصفحة. يرجى مسح ذاكرة المتصفح.');
        }
      }
      // Max retries exceeded - clear storage and show error
      sessionStorage.removeItem(storageKey);
      throw new Error('فشل تحميل الصفحة. يرجى مسح ذاكرة المتصفح.');
    }
  });
};

const App = lazyWithRetry(() => import('./App.jsx'), 'App')
const Login = lazyWithRetry(() => import('./pages/Login.jsx'), 'Login')
const CustomerLogin = lazyWithRetry(() => import('./pages/CustomerLogin.jsx'), 'CustomerLogin')
const Register = lazyWithRetry(() => import('./pages/Register.jsx'), 'Register')
const Admin = lazyWithRetry(() => import('./Admin.jsx'), 'Admin')

const PageLoader = <div className="loading-screen"><div className="loading-spinner" /><p>جاري التحميل...</p></div>;

const BASENAME = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

// Service Worker registration with proper error handling
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
      .then((reg) => {
        window.__swRegistration = reg;
        
        // Store interval ID to prevent overlapping checks
        let updateIntervalId = null;
        
        const checkForUpdates = () => {
          if (reg.active) {
            reg.update().catch((err) => {
              // Log error for debugging - don't silently swallow in development
              if (import.meta.env.DEV) {
                console.warn('Service Worker update check failed:', err);
              }
            });
          }
        };
        
        // Initial check
        checkForUpdates();
        
        // Clear existing interval before setting new one
        if (updateIntervalId) clearInterval(updateIntervalId);
        updateIntervalId = setInterval(checkForUpdates, 5 * 60 * 1000);
        
        if (reg.waiting && navigator.serviceWorker.controller) {
          window.dispatchEvent(new CustomEvent('sw-update'));
        }
        
        reg.addEventListener('updatefound', () => {
          const newSW = reg.installing;
          newSW.addEventListener('statechange', () => {
            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
              window.dispatchEvent(new CustomEvent('sw-update'));
            }
          });
        });
      })
      .catch((err) => {
        // Log SW registration failure - don't silently swallow
        console.error('Service Worker registration failed:', err);
      });
  });
}

function LeaveGuard() {
  const location = useLocation();
  const { cart } = useStore();

  React.useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (cart && cart.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [cart]);

  // FIXED: Proper cleanup of popstate listener on pathname change
  React.useEffect(() => {
    if (!cart || cart.length === 0) return;

    // Push initial state when component mounts and cart is not empty
    window.history.pushState({ tharaGuard: true }, '', window.location.href);

    const handlePopState = () => {
      const shouldLeave = window.confirm('هل تريد المغادرة؟ سيتم إفراغ سلتك.');
      if (!shouldLeave) {
        window.history.pushState({ tharaGuard: true }, '', window.location.href);
      }
    };

    // Add listener
    window.addEventListener('popstate', handlePopState);
    
    // FIXED: Cleanup listener when pathname changes or component unmounts
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [location.pathname, cart]);

  return null;
}

const MAINTENANCE_STORAGE_KEY = 'thara_maintenance';

function MaintenanceToggle() {
  const { action, secret } = useParams();
  const [status, setStatus] = useState('checking');

  const performAction = useCallback(async () => {
    if (secret !== MAINTENANCE_SECRET) { setStatus('invalid'); return; }
    if (action !== 'on' && action !== 'off') { setStatus('invalid'); return; }
    const next = action === 'on';
    try {
      await supabase.from('settings').upsert({ key: 'maintenance_mode', value: next ? 'true' : 'false' }, { onConflict: 'key' });
      localStorage.setItem(MAINTENANCE_STORAGE_KEY, next ? 'true' : 'false');
      setStatus(next ? 'activated' : 'deactivated');
      window.dispatchEvent(new CustomEvent('thara:maintenance-change', { detail: { maintenance: next } }));
    } catch { setStatus('error'); }
  }, [action, secret]);

  useEffect(() => { performAction(); }, [performAction]);

  const containerStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', background: '#06190e', direction: 'rtl',
    fontFamily: 'system-ui, sans-serif', padding: '1rem'
  };
  const cardStyle = {
    background: '#0d3d24', padding: '2.5rem', borderRadius: '20px',
    textAlign: 'center', maxWidth: '400px', width: '100%',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
  };

  if (status === 'checking') return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
        <p style={{ color: '#94a3b8' }}>جاري التبديل...</p>
      </div>
    </div>
  );
  if (status === 'invalid') return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚫</div>
        <h2 style={{ color: '#ef4444', margin: '0 0 0.5rem' }}>رابط غير صالح</h2>
        <p style={{ color: '#94a3b8' }}>هذا الرابط غير معروف. يرجى التحقق من الرابط والمحاولة مرة أخرى.</p>
      </div>
    </div>
  );
  if (status === 'error') return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
        <h2 style={{ color: '#ef4444', margin: '0 0 0.5rem' }}>حدث خطأ</h2>
        <p style={{ color: '#94a3b8' }}>تعذر تبديل وضع الصيانة. يرجى المحاولة مرة أخرى لاحقاً.</p>
      </div>
    </div>
  );
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{status === 'activated' ? '🔧' : '✅'}</div>
        <h2 style={{ color: status === 'activated' ? '#fbbf24' : '#22c55e', margin: '0 0 0.5rem' }}>
          {status === 'activated' ? 'وضع الصيانة مفعّل' : 'وضع الصيانة معطّل'}
        </h2>
        <p style={{ color: '#94a3b8', marginBottom: '1.5rem', lineHeight: '1.7' }}>
          {status === 'activated'
            ? 'تم تفعيل وضع الصيانة. الزوار سيشاهدون صفحة الصيانة.'
            : 'تم إلغاء وضع الصيانة. الموقع يعمل بشكل طبيعي الآن.'}
        </p>
        <a href="/" style={{
          display: 'inline-block', padding: '0.7rem 2rem', borderRadius: '12px',
          background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', color: '#451a03',
          fontWeight: 800, textDecoration: 'none', fontSize: '0.95rem'
        }}>العودة للمتجر</a>
      </div>
    </div>
  );
}

function MaintenanceGate({ children }) {
  const loc = useLocation();
  const [maintenance, setMaintenance] = useState(() => {
    try { return localStorage.getItem(MAINTENANCE_STORAGE_KEY) === 'true'; } catch { return false; }
  });

  useEffect(() => {
    supabase.from('settings').select('value').eq('key', 'maintenance_mode').maybeSingle()
      .then(({ data }) => {
        const val = data?.value === 'true';
        setMaintenance(val);
        try { localStorage.setItem(MAINTENANCE_STORAGE_KEY, val ? 'true' : 'false'); } catch {}
      })
      .catch(() => {});
  }, [loc.pathname]);

  useEffect(() => {
    const handler = (e) => {
      setMaintenance(e.detail.maintenance);
      try { localStorage.setItem(MAINTENANCE_STORAGE_KEY, e.detail.maintenance ? 'true' : 'false'); } catch {}
    };
    window.addEventListener('thara:maintenance-change', handler);
    return () => window.removeEventListener('thara:maintenance-change', handler);
  }, []);

  if (maintenance && (loc.pathname.startsWith('/toggle/on/') || loc.pathname.startsWith('/toggle/off/'))) {
    return children;
  }
  if (maintenance) {
    return <MaintenancePage />;
  }
  return children;
}

const ADMIN_EMAIL = 'yaser.haroon79@gmail.com';

function ProtectedRoute({ children }) {
  const { user, loading, currentStaff } = useStore();
  if (loading) return <div className="loading-screen"><div className="loading-spinner" /><p>جاري التحميل...</p></div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (!currentStaff || currentStaff.email !== ADMIN_EMAIL) return <Navigate to="/admin/login" replace />;
  return children;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <StoreProvider>
          <BrowserRouter basename={BASENAME}>
            <MaintenanceGate>
              <LeaveGuard />
              <Routes>
                <Route path="/" element={<Suspense fallback={PageLoader}><App /></Suspense>} />
                <Route path="/login" element={<Suspense fallback={PageLoader}><CustomerLogin /></Suspense>} />
                <Route path="/register" element={<Suspense fallback={PageLoader}><Register /></Suspense>} />
                <Route path="/toggle/:action/:secret" element={<MaintenanceToggle />} />
                <Route path="/admin/login" element={<Suspense fallback={PageLoader}><Login /></Suspense>} />
                <Route path="/admin/*" element={
                <ProtectedRoute>
                  <Suspense fallback={<div className="loading-screen"><div className="loading-spinner" /><p>جاري تحميل لوحة التحكم...</p></div>}>
                    <Admin />
                  </Suspense>
                </ProtectedRoute>
                } />
              </Routes>
            </MaintenanceGate>
          </BrowserRouter>
        </StoreProvider>
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
