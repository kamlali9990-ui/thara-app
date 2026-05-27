import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { mockProducts } from '../data/mockData';
import { storage } from '../utils/storage.js';
import { productsApi } from '../supabase/products.js';
import { ordersApi } from '../supabase/orders.js';
import { chatApi } from '../supabase/chat.js';
import { authApi } from '../supabase/auth.js';
import { staffApi } from '../supabase/staff.js';
import { customersApi } from '../supabase/customers.js';

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
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('thara_cart');
    return saved ? JSON.parse(saved) : [];
  });
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
          if (supaProducts && supaProducts.length > 0) setProducts(supaProducts);
          if (supaOrders && supaOrders.length > 0) setOrders(supaOrders);
          if (supaChat && supaChat.length > 0) setChatMessages(supaChat);

          // Load auth
          let currentUser = null;
          try {
            currentUser = await authApi.getUser();
          } catch {
            // Invalid session — clean up
            localStorage.removeItem('thara_user');
            localStorage.removeItem('thara_session');
          }
          setUser(currentUser);
          if (currentUser) {
            const staff = await staffApi.getByEmail(currentUser.email).catch(() => null);
            if (staff) {
              setStaffRole(staff.role);
              setCurrentStaff(staff);
            } else if (currentUser.email === 'yaser.haroon79@gmail.com') {
              setStaffRole('admin');
              setCurrentStaff({ email: currentUser.email, name: 'ياسر', role: 'admin' });
            }
            if (!staff) {
              try {
                const p = await customersApi.get(currentUser.email);
                if (p) setCustomerProfile(p);
              } catch { /* no profile yet */ }
            }
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

  // Sync orders & products across tabs via localStorage events
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
  }, []);

  // Listen for auth changes
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
          } else if (u.email === 'yaser.haroon79@gmail.com') {
            setStaffRole('admin');
            setCurrentStaff({ email: u.email, name: 'ياسر', role: 'admin' });
          } else {
            setStaffRole(null);
            setCurrentStaff(null);
          }
          if (!staff) {
            try {
              const p = await customersApi.get(u.email);
              if (p) setCustomerProfile(p);
            } catch { /* no profile yet */ }
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
  }, []);

  // Helper to play premium synthesized chime sound via Web Audio API
  const playNotificationSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
      setTimeout(() => { try { ctx.close(); } catch {} }, 700);
    } catch (e) {
      console.error('Audio play failed:', e);
    }
  };

  // --- Real-time chat subscription ---
  useEffect(() => {
    if (!hasSupabase || !supabaseReady) return;
    const sub = chatApi.subscribe(null, null, (msg) => {
      setChatMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;

        // Play chime and trigger notification if message received from others
        const isSelf = (msg.sender === 'admin' && staffRole) || (msg.sender === 'customer' && !staffRole);
        if (!isSelf) {
          playNotificationSound();
          try {
            window.dispatchEvent(new CustomEvent('thara:new-message', { detail: msg }));
          } catch {}
        }

        return [...prev, msg];
      });
    });
    return () => sub.unsubscribe();
  }, [supabaseReady, staffRole]);

  // --- Real-time orders subscription (replaces 20s polling) ---
  useEffect(() => {
    if (!hasSupabase || !supabaseReady) return;
    const channel = ordersApi.subscribe(({ eventType, new: nextOrder, old: prevOrder }) => {
      setOrders(prev => {
        if (eventType === 'DELETE') {
          const id = String(prevOrder?.id || '');
          return prev.filter(o => o.id !== id);
        }
        if (!nextOrder) return prev;
        const exists = prev.find(o => o.id === nextOrder.id);
        if (exists) {
          return prev.map(o => o.id === nextOrder.id ? { ...o, ...nextOrder } : o);
        }
        // INSERT — fire a window event so the UI (admin) can play sound/notify
        if (eventType === 'INSERT') {
          if (staffRole) playNotificationSound();
          try { window.dispatchEvent(new CustomEvent('thara:new-order', { detail: nextOrder })); } catch { /* ignore */ }
        }
        return [nextOrder, ...prev];
      });
      // Fire status-change event for the customer notification layer
      if (eventType === 'UPDATE' && prevOrder && nextOrder && prevOrder.status !== nextOrder.status) {
        try { window.dispatchEvent(new CustomEvent('thara:order-status', { detail: nextOrder })); } catch { /* ignore */ }
      }
    });
    return () => {
      try { channel.unsubscribe(); } catch { /* ignore */ }
    };
  }, [supabaseReady, staffRole]);

  // --- localStorage fallback saves ---
  useEffect(() => { if (!supabaseReady) localStorage.setItem('thara_products', JSON.stringify(products)); }, [products, supabaseReady]);
  useEffect(() => { if (!supabaseReady) localStorage.setItem('thara_orders', JSON.stringify(orders)); }, [orders, supabaseReady]);
  useEffect(() => { if (!supabaseReady) localStorage.setItem('thara_chat', JSON.stringify(chatMessages)); }, [chatMessages, supabaseReady]);

  // Also save to IndexedDB as secondary backup
  useEffect(() => { storage.set('thara_products', products); }, [products]);
  useEffect(() => { storage.set('thara_orders', orders); }, [orders]);
  useEffect(() => { storage.set('thara_chat', chatMessages); }, [chatMessages]);

  // Persist cart to localStorage
  useEffect(() => { localStorage.setItem('thara_cart', JSON.stringify(cart)); }, [cart]);

  // Debounce search (300ms)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // --- Filtered Products ---
  const categoryGroupMap = {
    'المؤن': 'بقالة وجاهز',
    'المخبوزات': 'بقالة وجاهز',
    'التسالي': 'مشروبات وحلويات',
    'المشروبات': 'مشروبات وحلويات',
    'الألبان': 'ثلاجة ومجمدات',
    'اللحوم والدواجن': 'ثلاجة ومجمدات',
    'الخضروات والفواكه': 'ثلاجة ومجمدات',
    'المنظفات': 'منظفات ومنزل',
    'العناية الشخصية': 'منظفات ومنزل'
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const group = categoryGroupMap[p.category] || p.category;

      if (selectedCategory === 'العروض') {
        if (!p.isOffer) return false;
      } else if (selectedCategory !== 'الكل' && selectedCategory !== 'بحث سريع') {
        if (group !== selectedCategory) return false;
      }

      if (!debouncedSearch) return true;
      return p.name.toLowerCase().includes(debouncedSearch.toLowerCase());
    });
  }, [debouncedSearch, selectedCategory, products]);

  // --- Cart Actions ---
  const getProductPrice = (p) => p.isOffer && p.offerPrice ? p.offerPrice : p.price;

  const getStock = (productId) => {
    const p = products.find(x => x.id === productId);
    return p ? p.stock_quantity : 999;
  };

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      const newQty = existing ? existing.qty + 1 : 1;
      const stock = getStock(product.id);
      if (newQty > stock) {
        alert(`الكمية المطلوبة تتجاوز المتوفر (المتوفر: ${stock})`);
        return prev;
      }
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: newQty } : item);
      }
      return [...prev, { ...product, qty: 1, currentPrice: getProductPrice(product) }];
    });
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(item => item.id !== id));

  const updateCartQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.qty + delta);
        const stock = getStock(id);
        if (newQty > stock) {
          alert(`الكمية المطلوبة تتجاوز المتوفر (المتوفر: ${stock})`);
          return item;
        }
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => total + (item.currentPrice * item.qty), 0);
  }, [cart]);

  // --- Loyalty Points ---
  const addLoyaltyPoints = useCallback(async (total) => {
    if (!user || !hasSupabase) return;
    const points = Math.floor(total);
    if (points <= 0) return;
    try {
      const updated = await customersApi.addPoints(user.email, points);
      if (updated) setCustomerProfile(updated);
    } catch { /* ignore */ }
  }, [user, hasSupabase]);

  // --- Order Actions ---
  const loadOrders = useCallback(async () => {
    if (!hasSupabase || !supabaseReady) return;
    try {
      const supaOrders = await ordersApi.list();
      // Always sync — even an empty array must clear stale local orders.
      if (Array.isArray(supaOrders)) setOrders(supaOrders);
    } catch { /* ignore */ }
  }, [hasSupabase, supabaseReady]);

  const placeOrder = useCallback(async (orderData) => {
    if (cart.length === 0) {
      throw new Error('لا يمكن إرسال طلب بدون منتجات');
    }
    const overStock = cart.filter(item => {
      const p = products.find(x => x.id === item.id);
      return p && item.qty > p.stock_quantity;
    });
    if (overStock.length > 0) {
      throw new Error(`بعض المنتجات غير متوفرة بالكمية المطلوبة: ${overStock.map(i => i.name || i.id).join('، ')}`);
    }

    const newOrder = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      items: [...cart],
      total: cartTotal + (cartTotal >= 100 ? 0 : 15),
      status: 'جديد',
      customerEmail: user?.email || null,
      ...orderData
    };

    if (hasSupabase && supabaseReady) {
      try {
        const createdOrder = await ordersApi.create(newOrder);
        setOrders(prev => [createdOrder, ...prev]);
        setCart([]);
        addLoyaltyPoints(newOrder.total);
        const updatedProducts = await productsApi.list().catch(() => null);
        if (updatedProducts) setProducts(updatedProducts);
        return createdOrder;
      } catch (err) {
        if (err?.message?.includes('غير متوفرة')) throw err;
      }
    }

    setOrders(prev => [newOrder, ...prev]);
    setCart([]);
    addLoyaltyPoints(newOrder.total);
    setProducts(prev => prev.map(p => {
      const inCart = cart.find(c => c.id === p.id);
      return inCart ? { ...p, stock_quantity: Math.max(0, p.stock_quantity - inCart.qty) } : p;
    }));
    return newOrder;
  }, [cart, cartTotal, hasSupabase, supabaseReady, user, addLoyaltyPoints, products]);

  const STATUS_ORDER = ['جديد', 'قيد التحضير', 'جاهز للتوصيل', 'في الطريق', 'مكتمل'];

  const getStatusIndex = (s) => STATUS_ORDER.indexOf(s);

  const isValidStatusTransition = (current, next) => {
    if (next === 'ملغي') return true;
    const ci = getStatusIndex(current);
    const ni = getStatusIndex(next);
    if (ci === -1 || ni === -1) return false;
    // Allow forward moves and one step backward (manager corrections).
    return ni >= ci - 1;
  };

  const updateOrderStatus = useCallback(async (orderId, newStatus, eta) => {
    const order = orders.find(o => o.id === orderId);
    if (order && !isValidStatusTransition(order.status, newStatus)) {
      throw new Error('لا يمكن إرجاع الطلب أكثر من خطوة واحدة');
    }
    let updatedFromServer = null;
    if (hasSupabase && supabaseReady) {
      try {
        updatedFromServer = await ordersApi.updateStatus(orderId, newStatus, eta);
      } catch (err) {
        // Surface RPC errors (unauthorized / etc.) so the UI can show them.
        throw err;
      }
    }
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      if (updatedFromServer) return { ...o, ...updatedFromServer };
      const updated = { ...o, status: newStatus };
      if (eta !== undefined && eta !== null) updated.estimatedDelivery = Number(eta);
      return updated;
    }));
  }, [hasSupabase, supabaseReady, orders]);

  // --- Driver assignment (admin/manager) ---
  const loadDrivers = useCallback(async () => {
    if (!hasSupabase || !supabaseReady) return;
    try {
      const list = await staffApi.listDrivers();
      setDrivers(Array.isArray(list) ? list : []);
    } catch { /* ignore */ }
  }, [hasSupabase, supabaseReady]);

  const assignDriverToOrder = useCallback(async (orderId, driverId) => {
    if (!hasSupabase || !supabaseReady) throw new Error('Supabase غير مهيأ');
    const updated = await ordersApi.assignDriver(orderId, driverId);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updated } : o));
    return updated;
  }, [hasSupabase, supabaseReady]);

  const claimOrder = useCallback(async (orderId) => {
    if (!hasSupabase || !supabaseReady) throw new Error('Supabase غير مهيأ');
    const updated = await ordersApi.claim(orderId);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updated } : o));
    return updated;
  }, [hasSupabase, supabaseReady]);

  // Load drivers list when an admin/manager is ready
  useEffect(() => {
    if (!supabaseReady) return;
    if (staffRole === 'admin' || staffRole === 'manager') loadDrivers();
  }, [supabaseReady, staffRole, loadDrivers]);

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

  const bulkImportProducts = useCallback(async (products) => {
    if (!products.length) return [];
    if (hasSupabase && supabaseReady) {
      try {
        const created = await productsApi.bulkCreate(products);
        setProducts(prev => [...created, ...prev]);
        return created;
      } catch { /* fallback */ }
    }
    const localProducts = products.map(p => ({ ...p, id: Date.now().toString() + Math.random() }));
    setProducts(prev => [...localProducts, ...prev]);
    return localProducts;
  }, [hasSupabase, supabaseReady]);

  // --- Chat ---
  const sendMessage = useCallback(async (sender, text, orderId, customerEmail) => {
    const emailToUse = customerEmail || (sender === 'customer' ? user?.email : null);
    const msg = { 
      id: Date.now().toString(), 
      sender, 
      text, 
      orderId: orderId || null, 
      customerEmail: emailToUse || null,
      time: new Date().toLocaleTimeString() 
    };
    if (hasSupabase && supabaseReady) {
      try {
        const sent = await chatApi.send(sender, text, orderId, emailToUse);
        msg.id = sent.id;
        msg.time = sent.time;
      } catch { /* fallback */ }
    }
    setChatMessages(prev => {
      if (prev.some(m => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, [hasSupabase, supabaseReady, user]);

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

  // --- Customers Management ---
  const loadCustomers = useCallback(async () => {
    if (!hasSupabase) return;
    try {
      const list = await customersApi.list();
      setAllCustomers(list);
    } catch { /* ignore */ }
  }, []);

  // Load customers list on init if staff
  useEffect(() => {
    const canLoadCustomers = staffRole === 'admin' || staffRole === 'manager' || staffRole === 'employee';
    if (!supabaseReady || !canLoadCustomers) return;
    loadCustomers();
  }, [supabaseReady, staffRole]);

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

  const updateCustomerProfile = useCallback(async (name, phone) => {
    if (!user) return;
    try {
      const updated = await customersApi.update(user.email, name, phone);
      setCustomerProfile(updated);
      return updated;
    } catch { return null; }
  }, [user]);

  return (
    <StoreContext.Provider value={{
      user, loading, login, logout,
      staffRole, currentStaff, staffList, loadStaff, addStaff, updateStaff, removeStaff,
      allCustomers, loadCustomers,
      customerProfile, updateCustomerProfile,
      products: filteredProducts,
      cart, addToCart, removeFromCart, updateCartQty, cartTotal,
      searchQuery, setSearchQuery,
      selectedCategory, setSelectedCategory,
      placeOrder, getProductPrice,
      allProducts: products,
      orders, updateOrderStatus, loadOrders,
      drivers, loadDrivers, assignDriverToOrder, claimOrder,
      addProduct, updateProduct, deleteProduct, bulkImportProducts,
      chatMessages, sendMessage, refreshOrders: loadOrders, setOrders
    }}>
      {children}
    </StoreContext.Provider>
  );
};
