import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import './index.css'
import { StoreProvider, useStore } from './context/StoreContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { ToastProvider } from './components/Toast.jsx'

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

/*
 * SECURITY NOTE:
 * The ADMIN_EMAIL is exposed in the client bundle (VITE_ prefix).
 * This is acceptable here because:
 * 1. Supabase RLS must be configured server-side to enforce authorization
 * 2. This email is just a fallback for edge cases, not the primary auth
 * 3. Client-side checks are for UX only; server validates everything
 */
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || '';

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

function ProtectedRoute({ children }) {
  const { user, loading, staffRole } = useStore();
  if (loading) return <div className="loading-screen"><div className="loading-spinner" /><p>جاري التحميل...</p></div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  
  /*
   * SECURITY NOTE (CRITICAL):
   * This authorization check is CLIENT-SIDE ONLY and can be bypassed.
   * 
   * REQUIRED FOR PRODUCTION:
   * 1. Configure Supabase Row Level Security (RLS) policies on ALL tables
   * 2. Never trust client-side role checks for sensitive operations
   * 3. Validate user role on every Supabase query using .eq('role', 'admin')
   * 4. The staffRole in StoreContext must come from server-validated session
   * 
   * This check provides UX only (redirect non-admins), not security.
   */
  const isAdmin = staffRole === 'admin' || staffRole === 'manager' || user.email === ADMIN_EMAIL;
  if (!isAdmin) return <Navigate to="/admin/login" replace />;
  
  return children;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <StoreProvider>
          <BrowserRouter basename={BASENAME}>
            <LeaveGuard />
            <Routes>
              <Route path="/" element={<Suspense fallback={PageLoader}><App /></Suspense>} />
              <Route path="/login" element={<Suspense fallback={PageLoader}><CustomerLogin /></Suspense>} />
              <Route path="/register" element={<Suspense fallback={PageLoader}><Register /></Suspense>} />
              <Route path="/admin/login" element={<Suspense fallback={PageLoader}><Login /></Suspense>} />
              <Route path="/admin/*" element={
              <ProtectedRoute>
                <Suspense fallback={<div className="loading-screen"><div className="loading-spinner" /><p>جاري تحميل لوحة التحكم...</p></div>}>
                  <Admin />
                </Suspense>
              </ProtectedRoute>
              } />
            </Routes>
          </BrowserRouter>
        </StoreProvider>
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
