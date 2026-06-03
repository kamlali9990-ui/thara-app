import { useEffect } from 'react';
import { storage } from '../utils/storage.js';
import { productsApi } from '../supabase/products.js';
import { ordersApi } from '../supabase/orders.js';
import { chatApi } from '../supabase/chat.js';
import { authApi } from '../supabase/auth.js';
import { staffApi } from '../supabase/staff.js';
import { customersApi } from '../supabase/customers.js';
import { cleanProductImages } from '../utils/constants.js';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || '';

export function usePersistence({ hasSupabase, setProducts, setOrders, setChatMessages, setUser, setStaffRole, setCurrentStaff, setCustomerProfile, setSupabaseReady, setLoading }) {
  useEffect(() => {
    const init = async () => {
      if (hasSupabase) {
        try {
          const [supaProducts, supaOrders] = await Promise.all([
            productsApi.list().catch(() => null),
            ordersApi.list().catch(() => null)
          ]);
          if (supaProducts && supaProducts.length > 0) setProducts(cleanProductImages(supaProducts));
          if (supaOrders && supaOrders.length > 0) setOrders(supaOrders);

          let currentUser = null;
          try {
            currentUser = await authApi.getUser();
          } catch {
            localStorage.removeItem('thara_user');
            localStorage.removeItem('thara_session');
          }
          setUser(currentUser);
          if (currentUser) {
            const staff = await staffApi.getByEmail(currentUser.email).catch(() => null);
            if (staff) {
              setStaffRole(staff.role);
              setCurrentStaff(staff);
            } else if (ADMIN_EMAIL && currentUser.email === ADMIN_EMAIL) {
              setStaffRole('admin');
              setCurrentStaff({ email: currentUser.email, name: 'مدير', role: 'admin' });
            }
            if (staff || (ADMIN_EMAIL && currentUser.email === ADMIN_EMAIL)) {
              const supaChat = await chatApi.list().catch(() => null);
              if (supaChat && supaChat.length > 0) setChatMessages(supaChat);
            }
            if (!staff && !(ADMIN_EMAIL && currentUser.email === ADMIN_EMAIL)) {
              try {
                const p = await customersApi.get(currentUser.email);
                if (p) setCustomerProfile(p);
              } catch {}
            }
          }
          setSupabaseReady(true);
        } catch {}
      }
      setLoading(false);
    };
    init();
  }, []);

  // Cross-tab sync via localStorage events
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'thara_products' && e.newValue) {
        try { setProducts(JSON.parse(e.newValue)); } catch {}
      }
      if (e.key === 'thara_orders' && e.newValue) {
        try { setOrders(JSON.parse(e.newValue)); } catch {}
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [setProducts, setOrders]);
}

export function useAuthListener({ hasSupabase, setUser, setStaffRole, setCurrentStaff, setCustomerProfile, setLoading }) {
  useEffect(() => {
    if (!hasSupabase) return;
    const sub = authApi.onAuthChange(async (event, u) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setStaffRole(null);
        setCurrentStaff(null);
        setCustomerProfile(null);
        localStorage.removeItem('thara_user');
        localStorage.removeItem('thara_session');
        return;
      }
      setLoading(true);
      setUser(u);
      if (u) {
        try {
          const staff = await staffApi.getByEmail(u.email).catch(() => null);
          if (staff) {
            setStaffRole(staff.role);
            setCurrentStaff(staff);
          } else if (ADMIN_EMAIL && u.email === ADMIN_EMAIL) {
            setStaffRole('admin');
            setCurrentStaff({ email: u.email, name: 'مدير', role: 'admin' });
          } else {
            setStaffRole(null);
            setCurrentStaff(null);
          }
          if (!staff && !(ADMIN_EMAIL && u.email === ADMIN_EMAIL)) {
            try {
              const p = await customersApi.get(u.email);
              if (p) setCustomerProfile(p);
            } catch {}
          }
        } finally {
          setLoading(false);
        }
      } else {
        setStaffRole(null);
        setCurrentStaff(null);
        setCustomerProfile(null);
        setLoading(false);
      }
    });
    return () => {
      if (typeof sub.unsubscribe === 'function') sub.unsubscribe();
      else if (sub.data?.subscription?.unsubscribe) sub.data.subscription.unsubscribe();
    };
  }, [hasSupabase, setUser, setStaffRole, setCurrentStaff, setCustomerProfile, setLoading]);
}

export function useLocalStorageSave({ supabaseReady, products, orders, chatMessages, cart }) {
  useEffect(() => { if (!supabaseReady) localStorage.setItem('thara_products', JSON.stringify(products)); }, [products, supabaseReady]);
  useEffect(() => { if (!supabaseReady) localStorage.setItem('thara_orders', JSON.stringify(orders)); }, [orders, supabaseReady]);
  useEffect(() => { if (!supabaseReady) localStorage.setItem('thara_chat', JSON.stringify(chatMessages)); }, [chatMessages, supabaseReady]);
  useEffect(() => { storage.set('thara_products', products); }, [products]);
  useEffect(() => { storage.set('thara_orders', orders); }, [orders]);
  useEffect(() => { storage.set('thara_chat', chatMessages); }, [chatMessages]);
  useEffect(() => { localStorage.setItem('thara_cart', JSON.stringify(cart)); }, [cart]);
}
