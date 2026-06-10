import React, { lazy, Suspense, useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'


import './index.css'
import { StoreProvider, useStore } from './context/StoreContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { ToastProvider } from './components/Toast.jsx'
import MaintenancePage from './components/MaintenancePage.jsx'
import MaintenancePanel from './pages/MaintenancePanel.jsx'
import { supabase } from './supabase/client.js'
import { showToast } from './components/Toast.jsx'
import * as Sentry from '@sentry/react'

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
    let reloadCount = 0;
    try { reloadCount = parseInt(sessionStorage.getItem(storageKey) || '0', 10); } catch {}
    
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

function AuthErrorHandler() {
  const navigate = useNavigate();
  const { user, setUser, setStaffRole, setCurrentStaff, setCustomerProfile } = useStore();
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      try {
        if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
          if (userRef.current) {
            showToast('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى', 'warning');
            setUser(null);
            setStaffRole(null);
            setCurrentStaff(null);
            setCustomerProfile(null);
            navigate('/admin/login', { replace: true });
          }
        }
      } catch (e) { console.error('[AuthErrorHandler]', e); }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}

const MAINTENANCE_STORAGE_KEY = 'thara_maintenance';

function MaintenanceGate({ children }) {
  const loc = useLocation();
  const [maintenance, setMaintenance] = useState(() => {
    try { return localStorage.getItem(MAINTENANCE_STORAGE_KEY) === 'true'; } catch (e) { return false; }
  });

  useEffect(() => {
    supabase.from('settings').select('value').eq('key', 'maintenance_mode').maybeSingle()
      .then(({ data }) => {
        const val = data?.value === 'true';
        setMaintenance(val);
        try { localStorage.setItem(MAINTENANCE_STORAGE_KEY, val ? 'true' : 'false'); } catch (e) { console.error('maintenance write', e); }
      })
      .catch((e) => console.error('maintenance fetch', e));
  }, [loc.pathname]);

  if (maintenance && loc.pathname.startsWith('/maintenance')) {
    return children;
  }
  if (maintenance) {
    return <MaintenancePage />;
  }
  return children;
}

function ProtectedRoute({ children }) {
  const { user, loading, staffRole } = useStore();
  if (loading) return <div className="loading-screen"><div className="loading-spinner" /><p>جاري التحميل...</p></div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  const allowed = staffRole === 'admin' || staffRole === 'manager' || staffRole === 'driver';
  if (!allowed) return <Navigate to="/admin/login" replace />;
  return children;
}

function RouteErrorBoundary({ children }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <StoreProvider>
        <BrowserRouter basename={BASENAME}>
          <MaintenanceGate>
            <LeaveGuard />
            <AuthErrorHandler />
            <Routes>
              <Route path="/" element={<RouteErrorBoundary><Suspense fallback={PageLoader}><App /></Suspense></RouteErrorBoundary>} />
              <Route path="/login" element={<RouteErrorBoundary><Suspense fallback={PageLoader}><CustomerLogin /></Suspense></RouteErrorBoundary>} />
              <Route path="/register" element={<RouteErrorBoundary><Suspense fallback={PageLoader}><Register /></Suspense></RouteErrorBoundary>} />
              <Route path="/maintenance" element={<RouteErrorBoundary><MaintenancePanel /></RouteErrorBoundary>} />
              <Route path="/admin/login" element={<RouteErrorBoundary><Suspense fallback={PageLoader}><Login /></Suspense></RouteErrorBoundary>} />
              <Route path="/admin/*" element={
                <RouteErrorBoundary>
                  <ProtectedRoute>
                    <Suspense fallback={<div className="loading-screen"><div className="loading-spinner" /><p>جاري تحميل لوحة التحكم...</p></div>}>
                      <Admin />
                    </Suspense>
                  </ProtectedRoute>
                </RouteErrorBoundary>
              } />
            </Routes>
          </MaintenanceGate>
        </BrowserRouter>
      </StoreProvider>
    </ToastProvider>
  </React.StrictMode>,
)
