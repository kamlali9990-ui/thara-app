import React, { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { mockProducts } from '../data/mockData';
import { chatApi } from '../supabase/chat.js';
import { supabase } from '../supabase/client';
import { cleanProductImages } from '../utils/constants.js';
import { usePersistence, useAuthListener, useLocalStorageSave } from './usePersistence.js';
import { useRealtimeChat, useRealtimeOrders, useTypingIndicator, useMessageStatus, useMarkRead, useRealtimeProducts, useRealtimeSettings } from './useRealtime.js';
import { subscribePush, unsubscribePush } from '../utils/pushNotifications.js';
import { usePermissions } from './usePermissions.js';
import { getProductPrice } from './storeHelpers.js';
import { useCartActions } from './useCartActions.js';
import { useOrderActions } from './useOrderActions.js';
import { useProductActions } from './useProductActions.js';
import { useStaffActions } from './useStaffActions.js';
import { useCustomerActions } from './useCustomerActions.js';
import { useAuthActions } from './useAuthActions.js';

export const StoreContext = createContext();

export function useStore() {
  return useContext(StoreContext);
}

export const StoreProvider = ({ children }) => {
  // --- Auth ---
  const [user, setUser] = useState(null);
  const [staffRole, setStaffRole] = useState(null);
  const [currentStaff, setCurrentStaff] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [customerProfile, setCustomerProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- Data ---
  const [products, setProducts] = useState(() => {
    try { const saved = localStorage.getItem('thara_products'); if (saved) return cleanProductImages(JSON.parse(saved)); } catch {}
    return cleanProductImages(mockProducts);
  });
  const [orders, setOrders] = useState(() => {
    try { const saved = localStorage.getItem('thara_orders'); if (saved) return JSON.parse(saved); } catch {}
    return [];
  });
  const [archivedOrders, setArchivedOrders] = useState([]);
  const [chatMessages, setChatMessages] = useState(() => {
    try { const saved = localStorage.getItem('thara_chat'); if (saved) return JSON.parse(saved); } catch {}
    return [];
  });

  // --- Session ---
  const [cart, setCart] = useState(() => {
    try { const saved = localStorage.getItem('thara_cart'); if (saved) return JSON.parse(saved); } catch {}
    return [];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [supabaseReady, setSupabaseReady] = useState(false);

  const hasSupabase = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;

  // --- Extracted hooks ---
  usePersistence({ hasSupabase, setProducts, setOrders, setChatMessages, setCart, setUser, setStaffRole, setCurrentStaff, setCustomerProfile, setSupabaseReady, setLoading });
  useAuthListener({ hasSupabase, setUser, setStaffRole, setCurrentStaff, setCustomerProfile, setLoading });
  useRealtimeChat({ hasSupabase, supabaseReady, staffRole, user, setChatMessages });
  useRealtimeOrders({ hasSupabase, supabaseReady, staffRole, setOrders });
  useRealtimeProducts({ hasSupabase, supabaseReady, setProducts });
  useRealtimeSettings({ hasSupabase, supabaseReady });

  const [typingUsers, setTypingUsers] = useState({});
  const { sendTyping, typingTimeouts } = useTypingIndicator({ hasSupabase, supabaseReady, user, setTypingUsers });
  useMessageStatus({ hasSupabase, supabaseReady, setChatMessages });
  const { markMessagesAsRead } = useMarkRead({ hasSupabase, supabaseReady, setChatMessages });

  const { permissions: userPermissions, hasPermission, refreshPermissions } = usePermissions(staffRole, user);
  useLocalStorageSave({ supabaseReady, products, orders, chatMessages, cart });

  // Save user info for notification prompt
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

  // Push notification subscription — auto subscribe on login, unsubscribe on logout
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

  const prevUserRef = useRef(null);
  useEffect(() => {
    if (prevUserRef.current && !user && supabaseReady) {
      const prevEmail = prevUserRef.current.email;
      if (prevEmail) unsubscribePush(prevEmail);
    }
    prevUserRef.current = user;
  }, [user, supabaseReady]);

  // ─── Site Stats (visitor/member counter) ───
  const [siteStats, setSiteStats] = useState({ member_count: 0, visit_count: 0 });
  useEffect(() => {
    if (!supabaseReady) return;
    supabase.rpc('get_site_stats').then(({ data, error }) => {
      if (!error && data) setSiteStats(data);
    });
    const seen = sessionStorage.getItem('thara_visit_counted');
    if (!seen) {
      supabase.rpc('increment_visit_count').then(({ data }) => {
        if (data != null) setSiteStats(prev => ({ ...prev, visit_count: data }));
      });
      try { sessionStorage.setItem('thara_visit_counted', '1'); } catch {}
    }
  }, [supabaseReady]);

  // Most requested products (from order history)
  const mostRequested = useMemo(() => {
    const counts = {};
    orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const id = item.id || item.product_id;
          if (id) counts[id] = (counts[id] || 0) + (item.qty || 1);
        });
      }
    });
    return counts;
  }, [orders]);

  // Debounce search (300ms)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // --- Filtered Products ---
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

  // Instant search — no debounce, fires from the first character
  const instantResults = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q));
  }, [searchQuery, products]);

  // --- Cart Actions ---
  const { addToCart, removeFromCart, updateCartQty, cartTotal } = useCartActions({ products, cart, setCart });

  // --- Customer & Loyalty ---
  const { loadCustomers, updateCustomerProfile, addLoyaltyPoints } = useCustomerActions({ hasSupabase, user, setAllCustomers, setCustomerProfile });

  // --- Order Actions ---
  const { loadOrders, placeOrder, updateOrderStatus, archiveOrder, restoreOrder, loadArchivedOrders, loadDrivers, assignDriverToOrder, claimOrder } = useOrderActions({ hasSupabase, supabaseReady, staffRole, user, currentStaff, products, cart, cartTotal, setOrders, setCart, setProducts, setArchivedOrders, setDrivers, addLoyaltyPoints });

  // Load drivers list when an admin/manager is ready
  useEffect(() => {
    if (!supabaseReady) return;
    if (staffRole === 'admin' || staffRole === 'manager') loadDrivers();
  }, [supabaseReady, staffRole, loadDrivers]);

  // --- Product CRUD ---
  const { addProduct, updateProduct, deleteProduct, bulkImportProducts } = useProductActions({ hasSupabase, supabaseReady, setProducts });

  // --- Chat ---
  const sendMessage = useCallback(async (sender, text, orderId, customerEmail, senderName, customerPhone) => {
    const emailToUse = customerEmail || (sender === 'customer' ? user?.email : null);
    const nameToUse = senderName || (sender === 'admin' || sender === 'driver' ? currentStaff?.name : null);
    const phoneToUse = customerPhone || (sender === 'customer' ? customerProfile?.phone : null);
    const tempId = Date.now().toString();
    const msg = { 
      id: tempId, 
      sender, 
      text, 
      orderId: orderId || null, 
      customerEmail: emailToUse || null,
      customerPhone: phoneToUse || null,
      senderName: nameToUse || null,
      time: new Date().toLocaleTimeString() 
    };
    setChatMessages(prev => {
      if (prev.some(m => m.id === tempId)) return prev;
      return [...prev, msg];
    });
    if (hasSupabase && supabaseReady) {
      try {
        const sent = await chatApi.send(sender, text, orderId, emailToUse, nameToUse, phoneToUse);
        setChatMessages(prev => prev.map(m => m.id === tempId ? { ...m, ...sent } : m));
      } catch {
        setChatMessages(prev => prev.map(m => m.id === tempId ? { ...m, _failed: true } : m));
      }
    }
  }, [hasSupabase, supabaseReady, user, currentStaff, customerProfile]);

  const retrySendMessage = useCallback(async (tempId) => {
    const msg = chatMessages.find(m => m.id === tempId);
    if (!msg || !msg._failed) return;
    setChatMessages(prev => prev.map(m => m.id === tempId ? { ...m, _failed: false } : m));
    try {
      const sent = await chatApi.send(msg.sender, msg.text, msg.orderId, msg.customerEmail, msg.senderName, msg.customerPhone);
      setChatMessages(prev => prev.map(m => m.id === tempId ? { ...m, ...sent } : m));
    } catch {
      setChatMessages(prev => prev.map(m => m.id === tempId ? { ...m, _failed: true } : m));
    }
  }, [chatMessages]);

  // --- Auth Actions ---
  const { login, logout } = useAuthActions({ hasSupabase, setUser, setStaffRole, setCurrentStaff, setCustomerProfile, setLoading });

  // Load customers list on init if staff
  useEffect(() => {
    const canLoadCustomers = staffRole === 'admin' || staffRole === 'manager' || staffRole === 'employee';
    if (!supabaseReady || !canLoadCustomers) return;
    loadCustomers();
  }, [supabaseReady, staffRole, loadCustomers]);

  // --- Staff Management ---
  const { loadStaff, addStaff, updateStaff, removeStaff } = useStaffActions({ hasSupabase, setStaffList });

  return (
    <StoreContext.Provider value={{
      user, loading, login, logout,
      setUser, setStaffRole, setCurrentStaff, setCustomerProfile,
      staffRole, currentStaff, staffList, loadStaff, addStaff, updateStaff, removeStaff,
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
      drivers, loadDrivers, assignDriverToOrder, claimOrder,
      addProduct, updateProduct, deleteProduct, bulkImportProducts,
      chatMessages, sendMessage, typingUsers, sendTyping, markMessagesAsRead, retrySendMessage, refreshOrders: loadOrders, setOrders,
      userPermissions, hasPermission, refreshPermissions,
      siteStats
    }}>
      {children}
    </StoreContext.Provider>
  );
};
