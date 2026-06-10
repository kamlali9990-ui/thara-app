import { useEffect, useRef } from 'react';
import { storage } from '../utils/storage.js';
import { productsApi } from '../supabase/products.js';
import { ordersApi } from '../supabase/orders.js';
import { chatApi } from '../supabase/chat.js';
import { authApi } from '../supabase/auth.js';
import { staffApi } from '../supabase/staff.js';
import { customersApi } from '../supabase/customers.js';
import { cleanProductImages } from '../utils/constants.js';

export function usePersistence({ hasSupabase, setProducts, setOrders, setChatMessages, setCart, setUser, setStaffRole, setCurrentStaff, setCustomerProfile, setSupabaseReady, setLoading }) {
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
          } catch (e) {
            console.error('authApi.getUser', e);
            localStorage.removeItem('thara_user');
            localStorage.removeItem('thara_session');
          }
          setUser(currentUser);
          if (currentUser) {
            const staff = await staffApi.getByEmail(currentUser.email).catch(() => null);
            if (staff) {
              setStaffRole(staff.role);
              setCurrentStaff(staff);
            }
            if (staff) {
              const supaChat = await chatApi.list().catch(() => null);
              if (supaChat && supaChat.length > 0) setChatMessages(supaChat);
            }
            if (!staff) {
              try {
                const p = await customersApi.get(currentUser.email);
                if (p) setCustomerProfile(p);
              } catch (e) { console.error('customersApi.get', e); }
            }
          }
          setSupabaseReady(true);
        } catch (e) { console.error('usePersistence init', e); }
      }
      setLoading(false);
    };
    init();
  }, []);

  // Cross-tab sync via localStorage events
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'thara_products' && e.newValue) {
        try { setProducts(JSON.parse(e.newValue)); } catch (e) { console.error('cross-tab products parse', e); }
      }
      if (e.key === 'thara_orders' && e.newValue) {
        try { setOrders(JSON.parse(e.newValue)); } catch (e) { console.error('cross-tab orders parse', e); }
      }
      if (e.key === 'thara_cart' && e.newValue) {
        try { setCart(JSON.parse(e.newValue)); } catch (e) { console.error('cross-tab cart parse', e); }
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [setProducts, setOrders, setCart]);
}

export function useAuthListener({ hasSupabase, setUser, setStaffRole, setCurrentStaff, setCustomerProfile, setLoading }) {
  const savedCallback = useRef(null);
  useEffect(() => {
    if (!hasSupabase) return;
    const sub = authApi.onAuthChange((event, u) => {
      savedCallback.current?.(event, u);
    });
    savedCallback.current = async (event, u) => {
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
          } else {
            setStaffRole(null);
            setCurrentStaff(null);
          }
          if (!staff) {
              try {
                const p = await customersApi.get(u.email);
                if (p) setCustomerProfile(p);
              } catch (e) { console.error('authListener customersApi.get', e); }
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
    };
    return () => {
      savedCallback.current = null;
      if (typeof sub.unsubscribe === 'function') sub.unsubscribe();
      else if (sub.data?.subscription?.unsubscribe) sub.data.subscription.unsubscribe();
    };
  }, [hasSupabase, setUser, setStaffRole, setCurrentStaff, setCustomerProfile, setLoading]);
}

function safeSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { console.error('safeSet ' + key, e); } }

export function useLocalStorageSave({ supabaseReady, products, orders, chatMessages, cart }) {
  useEffect(() => { if (!supabaseReady) safeSet('thara_products', products); }, [products, supabaseReady]);
  useEffect(() => { if (!supabaseReady) safeSet('thara_orders', orders); }, [orders, supabaseReady]);
  useEffect(() => { if (!supabaseReady) safeSet('thara_chat', chatMessages); }, [chatMessages, supabaseReady]);
  useEffect(() => { safeSet('thara_products', products); }, [products]);
  useEffect(() => { safeSet('thara_orders', orders); }, [orders]);
  useEffect(() => { safeSet('thara_chat', chatMessages); }, [chatMessages]);
  useEffect(() => { safeSet('thara_cart', cart); }, [cart]);
}
