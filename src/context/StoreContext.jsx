import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { mockProducts } from '../data/mockData';
import { storage } from '../utils/storage.js';
import { productsApi } from '../supabase/products.js';
import { ordersApi } from '../supabase/orders.js';
import { chatApi } from '../supabase/chat.js';
import { authApi } from '../supabase/auth.js';
import { staffApi } from '../supabase/staff.js';

export const StoreContext = createContext();

export function useStore() {
  return useContext(StoreContext);
}

export const StoreProvider = ({ children }) => {
  // --- Auth ---
  const [user, setUser] = useState(null);
  const [staffRole, setStaffRole] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Data ---
  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem('thara_products');
    return saved ? JSON.parse(saved) : mockProducts;
  });
  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem('thara_orders');
    return saved ? JSON.parse(saved) : [];
  });
  const [chatMessages, setChatMessages] = useState(() => {
    const saved = localStorage.getItem('thara_chat');
    return saved ? JSON.parse(saved) : [];
  });

  // --- Session ---
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [supabaseReady, setSupabaseReady] = useState(false);

  // Check if Supabase is configured
  const hasSupabase = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;

  // --- Init: Load from Supabase or localStorage ---
  useEffect(() => {
    const init = async () => {
      if (hasSupabase) {
        try {
          const [supaProducts, supaOrders, supaChat] = await Promise.all([
            productsApi.list().catch(() => null),
            ordersApi.list().catch(() => null),
            chatApi.list().catch(() => null)
          ]);
          if (supaProducts) setProducts(supaProducts);
          if (supaOrders) setOrders(supaOrders);
          if (supaChat) setChatMessages(supaChat);

          // Load auth
          const currentUser = await authApi.getUser();
          setUser(currentUser);
          if (currentUser) {
            const staff = await staffApi.getByEmail(currentUser.email).catch(() => null);
            if (staff) setStaffRole(staff.role);
          }
          setSupabaseReady(true);
        } catch {
          // fallback to localStorage
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  // Listen for auth changes
  useEffect(() => {
    if (!hasSupabase) return;
    const sub = authApi.onAuthChange(async (event, u) => {
      setUser(u);
      if (u) {
        const staff = await staffApi.getByEmail(u.email).catch(() => null);
        setStaffRole(staff?.role || null);
      } else {
        setStaffRole(null);
      }
    });
    return () => {
      if (typeof sub.unsubscribe === 'function') sub.unsubscribe();
      else if (sub.data?.subscription?.unsubscribe) sub.data.subscription.unsubscribe();
    };
  }, []);

  // --- Real-time chat subscription ---
  useEffect(() => {
    if (!hasSupabase || !supabaseReady) return;
    const sub = chatApi.subscribe((msg) => {
      setChatMessages(prev => [...prev, msg]);
    });
    return () => sub.unsubscribe();
  }, [supabaseReady]);

  // --- localStorage fallback saves ---
  useEffect(() => { if (!supabaseReady) localStorage.setItem('thara_products', JSON.stringify(products)); }, [products, supabaseReady]);
  useEffect(() => { if (!supabaseReady) localStorage.setItem('thara_orders', JSON.stringify(orders)); }, [orders, supabaseReady]);
  useEffect(() => { if (!supabaseReady) localStorage.setItem('thara_chat', JSON.stringify(chatMessages)); }, [chatMessages, supabaseReady]);

  // Also save to IndexedDB as secondary backup
  useEffect(() => { storage.set('thara_products', products); }, [products]);
  useEffect(() => { storage.set('thara_orders', orders); }, [orders]);
  useEffect(() => { storage.set('thara_chat', chatMessages); }, [chatMessages]);

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
      } else if (selectedCategory !== 'الكل') {
        if (p.category !== selectedCategory) return false;
      }
      return p.name.toLowerCase().includes(debouncedSearch.toLowerCase());
    });
  }, [debouncedSearch, selectedCategory, products]);

  // --- Cart Actions ---
  const getProductPrice = (p) => p.isOffer && p.offerPrice ? p.offerPrice : p.price;

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1, currentPrice: getProductPrice(product) }];
    });
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(item => item.id !== id));

  const updateCartQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, qty: Math.max(1, item.qty + delta) };
      }
      return item;
    }));
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => total + (item.currentPrice * item.qty), 0);
  }, [cart]);

  // --- Order Actions ---
  const placeOrder = useCallback(async (orderData) => {
    const newOrder = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      items: [...cart],
      total: cartTotal + (cartTotal >= 100 ? 0 : 15),
      status: 'جديد',
      customerEmail: user?.email || null,
      ...orderData
    };

    // Try Supabase first
    if (hasSupabase && supabaseReady) {
      try {
        await ordersApi.create(newOrder);
      } catch { /* fallback to local */ }
    }

    setOrders(prev => [newOrder, ...prev]);
    setCart([]);
  }, [cart, cartTotal, hasSupabase, supabaseReady, user]);

  const updateOrderStatus = useCallback(async (orderId, newStatus) => {
    if (hasSupabase && supabaseReady) {
      try {
        await ordersApi.updateStatus(orderId, newStatus);
      } catch { /* fallback */ }
    }
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  }, [hasSupabase, supabaseReady]);

  // --- Product CRUD ---
  const addProduct = useCallback(async (product) => {
    const newProduct = { ...product, id: Date.now().toString() };
    if (hasSupabase && supabaseReady) {
      try {
        const created = await productsApi.create(product);
        newProduct.id = created.id;
      } catch { /* fallback */ }
    }
    setProducts(prev => [newProduct, ...prev]);
  }, [hasSupabase, supabaseReady]);

  const updateProduct = useCallback(async (id, updated) => {
    if (hasSupabase && supabaseReady) {
      try {
        await productsApi.update(id, updated);
      } catch { /* fallback */ }
    }
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
  }, [hasSupabase, supabaseReady]);

  const deleteProduct = useCallback(async (id) => {
    if (hasSupabase && supabaseReady) {
      try {
        await productsApi.remove(id);
      } catch { /* fallback */ }
    }
    setProducts(prev => prev.filter(p => p.id !== id));
  }, [hasSupabase, supabaseReady]);

  // --- Chat ---
  const sendMessage = useCallback(async (sender, text) => {
    const msg = { id: Date.now().toString(), sender, text, time: new Date().toLocaleTimeString() };
    if (hasSupabase && supabaseReady) {
      try {
        const sent = await chatApi.send(sender, text);
        msg.id = sent.id;
        msg.time = sent.time;
      } catch { /* fallback */ }
    }
    setChatMessages(prev => [...prev, msg]);
  }, [hasSupabase, supabaseReady]);

  // --- Auth Actions ---
  const login = useCallback(async (email, password) => {
    if (!hasSupabase) throw new Error('Supabase غير مهيأ');
    const data = await authApi.signIn(email, password);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    if (hasSupabase) await authApi.signOut();
    setUser(null);
  }, []);

  // --- Staff Management ---
  const loadStaff = useCallback(async () => {
    if (!hasSupabase) return;
    try {
      const list = await staffApi.list();
      setStaffList(list);
    } catch { /* ignore */ }
  }, []);

  const addStaff = useCallback(async (staffMember) => {
    const created = await staffApi.create(staffMember);
    setStaffList(prev => [created, ...prev]);
    return created;
  }, []);

  const updateStaff = useCallback(async (id, updates) => {
    const updated = await staffApi.update(id, updates);
    setStaffList(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
    return updated;
  }, []);

  const removeStaff = useCallback(async (id) => {
    await staffApi.remove(id);
    setStaffList(prev => prev.filter(s => s.id !== id));
  }, []);

  return (
    <StoreContext.Provider value={{
      user, loading, login, logout,
      staffRole, staffList, loadStaff, addStaff, updateStaff, removeStaff,
      products: filteredProducts,
      cart, addToCart, removeFromCart, updateCartQty, cartTotal,
      searchQuery, setSearchQuery,
      selectedCategory, setSelectedCategory,
      placeOrder, getProductPrice,
      allProducts: products,
      orders, updateOrderStatus,
      addProduct, updateProduct, deleteProduct,
      chatMessages, sendMessage
    }}>
      {children}
    </StoreContext.Provider>
  );
};
