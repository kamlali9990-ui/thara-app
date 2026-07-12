import React, { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef, ReactNode } from 'react';
import { mockProducts } from '../data/mockData';
import { chatApi } from '../supabase/chat';
import { supabase } from '../supabase/client';
import { cleanProductImages } from '../utils/constants';
import { usePersistence, useAuthListener, useLocalStorageSave } from './usePersistence';
import { useRealtimeChat, useRealtimeOrders, useTypingIndicator, useMessageStatus, useMarkRead, useRealtimeProducts, useRealtimeSettings, useRealtimeStaff, useRealtimeCustomers, useRealtimePermissions } from './useRealtime';
import { subscribePush, unsubscribePush } from '../utils/pushNotifications';
import { usePermissions } from './usePermissions';
import { getProductPrice } from './storeHelpers';
import { useCartActions } from './useCartActions';
import { useOrderActions } from './useOrderActions';
import { useProductActions } from './useProductActions';
import { useStaffActions } from './useStaffActions';
import { useCustomerActions } from './useCustomerActions';
import { useAuthActions } from './useAuthActions';
import type { Order, Product, CartItem, StaffMember, Customer, ChatMessage, StaffRole } from '../types';

interface StoreContextType {
  user: any;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: React.Dispatch<any>;
  setStaffRole: React.Dispatch<React.SetStateAction<StaffRole | null>>;
  setCurrentStaff: React.Dispatch<React.SetStateAction<StaffMember | null>>;
  setCustomerProfile: React.Dispatch<any>;
  staffRole: StaffRole | null;
  currentStaff: StaffMember | null;
  staffList: StaffMember[];
  loadStaff: () => Promise<void>;
  addStaff: (staffMember: Partial<StaffMember>) => Promise<any>;
  updateStaff: (id: number, updates: Partial<StaffMember>) => Promise<any>;
  removeStaff: (id: number) => Promise<any>;
  resetStaffPassword: (email: string, newPassword: string) => Promise<any>;
  allCustomers: Customer[];
  loadCustomers: () => Promise<void>;
  customerProfile: any;
  updateCustomerProfile: (name: string, phone: string, username: string, realEmail: string) => Promise<any>;
  products: Product[];
  instantResults: Product[];
  mostRequested: Record<string | number, number>;
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string | number) => void;
  updateCartQty: (productId: string | number, qty: number) => void;
  cartTotal: number;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  selectedCategory: string;
  setSelectedCategory: React.Dispatch<React.SetStateAction<string>>;
  placeOrder: (orderData: any, deliveryFee?: number) => Promise<any>;
  getProductPrice: (product: Product) => number;
  allProducts: Product[];
  orders: Order[];
  updateOrderStatus: (orderId: string | number, newStatus: Order['status'], eta?: number) => Promise<void>;
  archiveOrder: (orderId: string | number) => Promise<void>;
  restoreOrder: (orderId: string | number) => Promise<void>;
  loadOrders: () => Promise<void>;
  archivedOrders: Order[];
  loadArchivedOrders: () => Promise<void>;
  drivers: StaffMember[];
  loadDrivers: () => Promise<void>;
  assignDriverToOrder: (orderId: string | number, driverId: string | number) => Promise<void>;
  claimOrder: (orderId: string | number) => Promise<void>;
  updateDriverLocation: (orderId: string | number, lat: number, lng: number) => Promise<void>;
  addProduct: (product: any) => Promise<void>;
  updateProduct: (productId: string | number, updates: any) => Promise<void>;
  deleteProduct: (productId: string | number) => Promise<void>;
  bulkImportProducts: (products: any[]) => Promise<void>;
  chatMessages: ChatMessage[];
  sendMessage: (sender: string, text: string, orderId?: string | number, customerEmail?: string, senderName?: string, customerPhone?: string) => Promise<void>;
  typingUsers: Record<string, boolean>;
  sendTyping: (orderId: string | number, customerEmail?: string) => Promise<void>;
  markMessagesAsRead: (orderId: string | number, customerEmail: string) => Promise<void>;
  retrySendMessage: (tempId: string) => Promise<void>;
  refreshOrders: () => Promise<void>;
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  userPermissions: string[];
  hasPermission: (perm: string) => boolean;
  refreshPermissions: () => void;
  siteStats: { member_count: number; visit_count: number };
}

export const StoreContext = createContext<StoreContextType>(null as any);

export function useStore(): StoreContextType {
  return useContext(StoreContext);
}

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [staffRole, setStaffRole] = useState<StaffRole | null>(null);
  const [currentStaff, setCurrentStaff] = useState<StaffMember | null>(null);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [drivers, setDrivers] = useState<StaffMember[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [customerProfile, setCustomerProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [products, setProducts] = useState<Product[]>(() => {
    try { const saved = localStorage.getItem('thara_products'); if (saved) return cleanProductImages(JSON.parse(saved)); } catch {}
    return cleanProductImages(mockProducts);
  });
  const [orders, setOrders] = useState<Order[]>(() => {
    try { const saved = localStorage.getItem('thara_orders'); if (saved) return JSON.parse(saved); } catch {}
    return [];
  });
  const [archivedOrders, setArchivedOrders] = useState<Order[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try { const saved = localStorage.getItem('thara_chat'); if (saved) return JSON.parse(saved); } catch {}
    return [];
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    try { const saved = localStorage.getItem('thara_cart'); if (saved) return JSON.parse(saved); } catch {}
    return [];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [supabaseReady, setSupabaseReady] = useState(false);

  const hasSupabase = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

  usePersistence({ hasSupabase, setProducts, setOrders, setChatMessages, setCart, setUser, setStaffRole, setCurrentStaff, setCustomerProfile, setSupabaseReady, setLoading });
  useAuthListener({ hasSupabase, setUser, setStaffRole, setCurrentStaff, setCustomerProfile, setLoading });
  useRealtimeChat({ hasSupabase, supabaseReady, staffRole, _user: user, setChatMessages });
  useRealtimeOrders({ hasSupabase, supabaseReady, staffRole, setOrders });
  useRealtimeProducts({ hasSupabase, supabaseReady, setProducts });
  useRealtimeSettings({ hasSupabase, supabaseReady });
  useRealtimeStaff({ hasSupabase, supabaseReady, setStaffList });
  useRealtimeCustomers({ hasSupabase, supabaseReady, setAllCustomers });
  useRealtimePermissions({ hasSupabase, supabaseReady, currentStaff, refreshPermissions });

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (customerProfile && user?.email && detail.email === user.email) {
        setCustomerProfile((prev: any) => prev ? { ...prev, ...detail } : prev);
      }
    };
    window.addEventListener('thara:customer-updated', handler);
    return () => window.removeEventListener('thara:customer-updated', handler);
  }, [user?.email, customerProfile]);

  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const { sendTyping, typingTimeouts } = useTypingIndicator({ hasSupabase, supabaseReady, user, setTypingUsers });
  useMessageStatus({ hasSupabase, supabaseReady, setChatMessages });
  const { markMessagesAsRead } = useMarkRead({ hasSupabase, supabaseReady, setChatMessages });

  const { permissions: userPermissions, hasPermission, refreshPermissions } = usePermissions(staffRole, user);
  useLocalStorageSave({ supabaseReady, products, orders, chatMessages, cart });

  useEffect(() => {
    if (user?.email) {
      try { localStorage.setItem('thara_user_email', user.email); } catch {}
    }
    if (staffRole) {
      try { localStorage.setItem('thara_staff_role', staffRole); } catch {}
    } else {
      try { localStorage.removeItem('thara_staff_role'); } catch {}
    }
  }, [user?.email, staffRole]);

  useEffect(() => {
    if (!user || !supabaseReady) return;
    if (typeof Notification === 'undefined') return;
    const email = user.email;
    const role = staffRole || 'customer';
    if (!email) return;

    if (Notification.permission === 'granted') {
      subscribePush(email, role).catch(() => {});
    }
  }, [user?.id, supabaseReady]);

  const prevUserRef = useRef<any>(null);
  useEffect(() => {
    if (prevUserRef.current && !user && supabaseReady) {
      const prevEmail = prevUserRef.current.email;
      if (prevEmail) unsubscribePush(prevEmail);
    }
    prevUserRef.current = user;
  }, [user, supabaseReady]);

  const [siteStats, setSiteStats] = useState({ member_count: 0, visit_count: 0 });
  useEffect(() => {
    if (!supabaseReady) return;
    supabase.rpc('get_site_stats').then(({ data, error }: { data: any; error: any }) => {
      if (!error && data) setSiteStats(data);
    });
    const seen = sessionStorage.getItem('thara_visit_counted');
    if (!seen) {
      supabase.rpc('increment_visit_count').then(({ data }: { data: any }) => {
        if (data != null) setSiteStats(prev => ({ ...prev, visit_count: data }));
      });
      try { sessionStorage.setItem('thara_visit_counted', '1'); } catch {}
    }
  }, [supabaseReady]);

  const mostRequested = useMemo(() => {
    const counts: Record<string | number, number> = {};
    orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const id = item.id || item.product_id;
          if (id) counts[id] = (counts[id] || 0) + (item.qty || 1);
        });
      }
    });
    return counts;
  }, [orders]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (selectedCategory === 'العروض') {
        if (!p.isOffer) return false;
      } else if (selectedCategory !== 'الكل' && selectedCategory !== 'بحث سريع') {
        if (p.category !== selectedCategory) return false;
      }

      if (!debouncedSearch) return true;
      return p.name.toLowerCase().includes(debouncedSearch.toLowerCase());
    });
  }, [debouncedSearch, selectedCategory, products]);

  const instantResults = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q));
  }, [searchQuery, products]);

  const { addToCart, removeFromCart, updateCartQty, cartTotal } = useCartActions({ products, cart, setCart });

  const { loadCustomers, updateCustomerProfile, addLoyaltyPoints } = useCustomerActions({ hasSupabase, user, setAllCustomers, setCustomerProfile });

  const { loadOrders, placeOrder, updateOrderStatus, archiveOrder, restoreOrder, loadArchivedOrders, loadDrivers, assignDriverToOrder, claimOrder, updateDriverLocation } = useOrderActions({ hasSupabase, supabaseReady, staffRole, user, currentStaff, products, orders, cart, cartTotal, setOrders, setCart, setProducts, setArchivedOrders, setDrivers, addLoyaltyPoints });

  useEffect(() => {
    if (!supabaseReady) return;
    if (staffRole === 'admin' || staffRole === 'manager') loadDrivers();
  }, [supabaseReady, staffRole, loadDrivers]);

  const { addProduct, updateProduct, deleteProduct, bulkImportProducts } = useProductActions({ hasSupabase, supabaseReady, setProducts });

  const sendMessage = useCallback(async (sender: string, text: string, orderId?: string | number, customerEmail?: string, senderName?: string, customerPhone?: string) => {
    const emailToUse = customerEmail || (sender === 'customer' ? user?.email : null);
    const nameToUse = senderName || (sender === 'admin' || sender === 'driver' ? currentStaff?.name : null);
    const phoneToUse = customerPhone || (sender === 'customer' ? customerProfile?.phone : null);
    const tempId = Date.now().toString();
    const msg: ChatMessage = {
      id: tempId,
      sender: sender as ChatMessage['sender'],
      text,
      orderId: orderId ? String(orderId) : undefined,
      customerEmail: emailToUse || null,
      customerPhone: phoneToUse || null,
      senderName: nameToUse || undefined,
      time: new Date().toLocaleTimeString()
    };
    setChatMessages(prev => {
      if (prev.some(m => m.id === tempId)) return prev;
      return [...prev, msg];
    });
    if (hasSupabase && supabaseReady) {
      try {
        const sent: any = await chatApi.send(sender, text, orderId ? String(orderId) : null, emailToUse, nameToUse, phoneToUse);
        setChatMessages(prev => prev.map(m => m.id === tempId ? { ...m, ...sent } : m));
      } catch {
        setChatMessages(prev => prev.map(m => m.id === tempId ? { ...m, _failed: true } : m));
      }
    }
  }, [hasSupabase, supabaseReady, user, currentStaff, customerProfile]);

  const retrySendMessage = useCallback(async (tempId: string) => {
    const msg = chatMessages.find(m => m.id === tempId);
    if (!msg || !(msg as any)._failed) return;
    setChatMessages(prev => prev.map(m => m.id === tempId ? { ...m, _failed: false } : m));
    try {
      const sent: any = await chatApi.send(msg.sender, msg.text, msg.orderId, msg.customerEmail, msg.senderName, msg.customerPhone);
      setChatMessages(prev => prev.map(m => m.id === tempId ? { ...m, ...sent } : m));
    } catch {
      setChatMessages(prev => prev.map(m => m.id === tempId ? { ...m, _failed: true } : m));
    }
  }, [chatMessages]);

  const { login, logout } = useAuthActions({ hasSupabase, setUser, setStaffRole, setCurrentStaff, setCustomerProfile, setLoading });

  useEffect(() => {
    const canLoadCustomers = staffRole === 'admin' || staffRole === 'manager' || staffRole === 'employee';
    if (!supabaseReady || !canLoadCustomers) return;
    loadCustomers();
  }, [supabaseReady, staffRole, loadCustomers]);

  const { loadStaff, addStaff, updateStaff, removeStaff, resetStaffPassword } = useStaffActions({ hasSupabase, setStaffList });

  return (
    <StoreContext.Provider value={{
      user, loading, login, logout,
      setUser, setStaffRole, setCurrentStaff, setCustomerProfile,
      staffRole, currentStaff, staffList, loadStaff, addStaff, updateStaff, removeStaff, resetStaffPassword,
      allCustomers, loadCustomers,
      customerProfile, updateCustomerProfile,
      products: filteredProducts,
      instantResults,
      mostRequested,
      cart, addToCart, removeFromCart, updateCartQty, cartTotal,
      searchQuery, setSearchQuery,
      selectedCategory, setSelectedCategory,
      placeOrder, getProductPrice,
      allProducts: products,
      orders, updateOrderStatus, archiveOrder, restoreOrder, loadOrders,
      archivedOrders, loadArchivedOrders,
      drivers, loadDrivers, assignDriverToOrder, claimOrder, updateDriverLocation,
      addProduct, updateProduct, deleteProduct, bulkImportProducts,
      chatMessages, sendMessage, typingUsers, sendTyping, markMessagesAsRead, retrySendMessage, refreshOrders: loadOrders, setOrders,
      userPermissions, hasPermission, refreshPermissions,
      siteStats
    } as unknown as StoreContextType}>
      {children}
    </StoreContext.Provider>
  );
};
