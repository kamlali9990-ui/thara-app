import { useEffect, useRef } from 'react';
import { productsApi } from '../supabase/products';
import { ordersApi } from '../supabase/orders';
import { chatApi } from '../supabase/chat';
import { authApi } from '../supabase/auth';
import { staffApi } from '../supabase/staff';
import { customersApi } from '../supabase/customers';
import { cleanProductImages } from '../utils/constants';
import type { Order, Product, CartItem, ChatMessage, StaffMember, Customer, StaffRole } from '../types';

export function usePersistence({ hasSupabase, setProducts, setOrders, setChatMessages, setCart, setUser, setStaffRole, setCurrentStaff, setCustomerProfile, setSupabaseReady, setLoading }: {
  hasSupabase: boolean;
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  setUser: React.Dispatch<React.SetStateAction<any>>;
  setStaffRole: React.Dispatch<React.SetStateAction<StaffRole | null>>;
  setCurrentStaff: React.Dispatch<React.SetStateAction<StaffMember | null>>;
  setCustomerProfile: React.Dispatch<React.SetStateAction<Customer | null>>;
  setSupabaseReady: React.Dispatch<React.SetStateAction<boolean>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}) {
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

          let currentUser: any = null;
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
              if (supaChat && supaChat.length > 0) setChatMessages(supaChat as any);
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
    const handler = (e: StorageEvent) => {
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

export function useAuthListener({ hasSupabase, setUser, setStaffRole, setCurrentStaff, setCustomerProfile, setLoading }: {
  hasSupabase: boolean;
  setUser: React.Dispatch<React.SetStateAction<any>>;
  setStaffRole: React.Dispatch<React.SetStateAction<StaffRole | null>>;
  setCurrentStaff: React.Dispatch<React.SetStateAction<StaffMember | null>>;
  setCustomerProfile: React.Dispatch<React.SetStateAction<Customer | null>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const savedCallback = useRef<((event: string, u: any) => void) | null>(null);
  useEffect(() => {
    if (!hasSupabase) return;
    const sub = authApi.onAuthChange((event, u) => {
      try { savedCallback.current?.(event, u); } catch (e) { console.error('[auth]', e); }
    });
    savedCallback.current = async (event, u) => {
      if (event === 'PASSWORD_RECOVERY') {
        return;
      }
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
      const s: any = sub;
      if (typeof s.unsubscribe === 'function') s.unsubscribe();
      else if (s.data?.subscription?.unsubscribe) s.data.subscription.unsubscribe();
    };
  }, [hasSupabase, setUser, setStaffRole, setCurrentStaff, setCustomerProfile, setLoading]);
}

function safeSet(key: string, val: any) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { console.error('safeSet ' + key, e); } }

export function useLocalStorageSave({ supabaseReady, products, orders, chatMessages, cart }: {
  supabaseReady: boolean;
  products: Product[];
  orders: Order[];
  chatMessages: ChatMessage[];
  cart: CartItem[];
}) {
  useEffect(() => { if (!supabaseReady) safeSet('thara_products', products); }, [products, supabaseReady]);
  useEffect(() => { if (!supabaseReady) safeSet('thara_orders', orders); }, [orders, supabaseReady]);
  useEffect(() => { if (!supabaseReady) safeSet('thara_chat', chatMessages); }, [chatMessages, supabaseReady]);
  useEffect(() => { safeSet('thara_products', products); }, [products]);
  useEffect(() => { safeSet('thara_orders', orders); }, [orders]);
  useEffect(() => { safeSet('thara_chat', chatMessages); }, [chatMessages]);
  useEffect(() => { safeSet('thara_cart', cart); }, [cart]);
}
