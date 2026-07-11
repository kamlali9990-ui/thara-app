import React, { lazy, useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'

import './index.css'
import { StoreProvider, useStore } from './context/StoreContext'
import { useForceUpdate } from './context/useForceUpdate'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'
import MaintenancePage from './components/MaintenancePage'
import MaintenancePanel from './pages/MaintenancePanel'
import { supabase } from './supabase/client'

import * as Sentry from '@sentry/react'

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || '';
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    environment: import.meta.env.MODE || 'production',
  });
}

const MAX_CHUNK_RELOADS = 2;
function lazyWithRetry(importFn: () => Promise<any>, name: string) {
  let retries = 0;
  return lazy(() =>
    importFn().catch((err: any) => {
      if (
        retries < MAX_CHUNK_RELOADS &&
        err?.name === 'ChunkLoadError'
      ) {
        retries++;
        window.location.reload();
      }
      throw err;
    })
  );
}

const App = lazyWithRetry(() => import('./App'), 'App')
const Login = lazyWithRetry(() => import('./pages/Login'), 'Login')
const CustomerLogin = lazyWithRetry(() => import('./pages/CustomerLogin'), 'CustomerLogin')
const Register = lazyWithRetry(() => import('./pages/Register'), 'Register')
const ForgotPassword = lazyWithRetry(() => import('./pages/ForgotPassword'), 'ForgotPassword')
const ResetPassword = lazyWithRetry(() => import('./pages/ResetPassword'), 'ResetPassword')
const Admin = lazyWithRetry(() => import('./Admin'), 'Admin')

function AppRoutes() {
  useForceUpdate();
  const { user, staffRole } = useStore();
  const location = useLocation();
  const isHidden = (['/login', '/register', '/forgot-password', '/reset-password', '/customer/login', '/panel', '/admin'].some(p => location.pathname.startsWith(p)));

  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    prevPathRef.current = location.pathname;
  }, [location.pathname]);

  return (
    <>
      <Routes>
        <Route path="/" element={user ? <App /> : <App />} />
        <Route path="/login" element={<Login />} />
        <Route path="/customer/login" element={<CustomerLogin />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/panel" element={<MaintenancePanel />} />
        <Route path="/admin/*" element={
          user && staffRole ? <Admin /> : <Login />
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AddToHomeScreen />
      {!isHidden && <CustomerHelp />}
    </>
  );
}

function Root() {
  const [maintenance, setMaintenance] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'maintenance_mode')
          .maybeSingle();
        if (!error && data?.value === 'true') setMaintenance(true);
      } catch {}
    };
    check();
    const ch = supabase
      .channel('maintenance')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: 'key=eq.maintenance_mode' }, () => check())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  if (maintenance) return <MaintenancePage />;

  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL || '/'}>
          <StoreProvider>
            <AppRoutes />
          </StoreProvider>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {});
  });
}

import AddToHomeScreen from './components/AddToHomeScreen';
import CustomerHelp from './components/CustomerHelp';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
