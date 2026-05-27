import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App.jsx'
import Login from './pages/Login.jsx'
import CustomerLogin from './pages/CustomerLogin.jsx'
import Register from './pages/Register.jsx'
import './index.css'
import { StoreProvider, useStore } from './context/StoreContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

const Admin = lazy(() => import('./Admin.jsx'))

const BASENAME = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' }).then((reg) => {
      window.__swRegistration = reg;
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
