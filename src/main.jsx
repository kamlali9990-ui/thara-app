import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import App from './App.jsx'
import Login from './pages/Login.jsx'
import CustomerLogin from './pages/CustomerLogin.jsx'
import Register from './pages/Register.jsx'
import './index.css'
import { StoreProvider, useStore } from './context/StoreContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// A helper to automatically retry lazy imports by forcing a page reload when a chunk 404s (e.g. after a new deployment)
const lazyWithRetry = (componentImport) => {
  return lazy(async () => {
    const hasReloaded = sessionStorage.getItem('thara_chunk_reload');
    try {
      const component = await componentImport();
      sessionStorage.removeItem('thara_chunk_reload');
      return component;
    } catch (error) {
      console.error("Failed to load chunk, forcing reload...", error);
      if (!hasReloaded) {
        sessionStorage.setItem('thara_chunk_reload', 'true');
        window.location.reload();
      }
      throw error;
    }
  });
};

const Admin = lazyWithRetry(() => import('./Admin.jsx'))

const BASENAME = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' }).then((reg) => {
      window.__swRegistration = reg;
      // Proactively check for new deployments.
      reg.update().catch(() => {});
      setInterval(() => reg.update().catch(() => {}), 60 * 1000);
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
    }).catch(() => {});
  });
}

const ADMIN_EMAIL = 'yaser.haroon79@gmail.com';

function LeaveGuard() {
  const location = useLocation();

  React.useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  React.useEffect(() => {
    window.history.pushState({ tharaGuard: true }, '', window.location.href);

    const handlePopState = () => {
      const shouldLeave = window.confirm('هل تريد المغادرة؟');
      if (!shouldLeave) {
        window.history.pushState({ tharaGuard: true }, '', window.location.href);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [location.pathname]);

  return null;
}

function ProtectedRoute({ children }) {
  const { user, loading, staffRole } = useStore();
  if (loading) return <div className="loading-screen"><div className="loading-spinner" /><p>جاري التحميل...</p></div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  const isAdmin = staffRole === 'admin' || staffRole === 'manager' || staffRole === 'driver' || user.email === ADMIN_EMAIL;
  if (!isAdmin) return <Navigate to="/admin/login" replace />;
  return children;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <StoreProvider>
        <BrowserRouter basename={BASENAME}>
          <LeaveGuard />
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/login" element={<CustomerLogin />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin/login" element={<Login />} />
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
    </ErrorBoundary>
  </React.StrictMode>,
)
