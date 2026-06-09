import React, { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { mockProducts } from '../data/mockData';
import { productsApi } from '../supabase/products.js';
import { ordersApi } from '../supabase/orders.js';
import { chatApi } from '../supabase/chat.js';
import { authApi } from '../supabase/auth.js';
import { staffApi } from '../supabase/staff.js';
import { customersApi } from '../supabase/customers.js';
import { supabase } from '../supabase/client';
import { showToast } from '../components/Toast.jsx';
import { cleanProductImages } from '../utils/constants.js';
import { usePersistence, useAuthListener, useLocalStorageSave } from './usePersistence.js';
import { useRealtimeChat, useRealtimeOrders, useTypingIndicator, useMessageStatus, useMarkRead } from './useRealtime.js';
import { subscribePush, unsubscribePush } from '../utils/pushNotifications.js';

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

  const [typingUsers, setTypingUsers] = useState({});
  const { sendTyping, typingTimeouts } = useTypingIndicator({ hasSupabase, supabaseReady, user, setTypingUsers });
  useMessageStatus({ hasSupabase, supabaseReady, setChatMessages });
  const { markMessagesAsRead } = useMarkRead({ hasSupabase, supabaseReady, setChatMessages });

  useLocalStorageSave({ supabaseReady, products, orders, chatMessages, cart });

  // Push notification subscription — auto subscribe on login, unsubscribe on logout
  useEffect(() => {
    if (!user || !supabaseReady) return;
    if (typeof Notification === 'undefined') return;
    const email = user.email;
    const role = staffRole || 'customer';
    if (!email) return;

    if (Notification.permission === 'default') {
      Notification.requestPermission().then((perm) => {
        if (perm === 'granted') subscribePush(email, role).catch(() => {});
      }).catch(() => {});
    } else if (Notification.permission === 'granted') {
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
  const getProductPrice = (p) => p.isOffer && p.offerPrice != null ? p.offerPrice : p.price;

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
        showToast(`الكمية المطلوبة تتجاوز المتوفر (المتوفر: ${stock})`, 'warning');
        return prev;
      }
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: newQty } : item);
      }
      window.dispatchEvent(new CustomEvent('cart-install-trigger'));
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
          showToast(`الكمية المطلوبة تتجاوز المتوفر (المتوفر: ${stock})`, 'warning');
          return item;
        }
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => total + ((item.currentPrice ?? 0) * (item.qty ?? 0)), 0);
  }, [cart]);

  // --- Loyalty Points ---
  const addLoyaltyPoints = useCallback(async (total) => {
    if (!user || !hasSupabase) return;
    const points = Math.floor(total);
    if (points <= 0) return;
    try {
      const updated = await customersApi.addPoints(user.email, points);
      if (updated) setCustomerProfile(updated);
    } catch (err) { console.error('[addLoyaltyPoints]', err); }
  }, [user, hasSupabase]);

  // --- Order Actions ---
  const loadOrders = useCallback(async () => {
    if (!hasSupabase || !supabaseReady) return;
    try {
      const supaOrders = await ordersApi.list();
      // Always sync — even an empty array must clear stale local orders.
      if (Array.isArray(supaOrders)) setOrders(supaOrders);
    } catch (err) { console.error('[loadOrders]', err); showToast('تعذر تحميل الطلبات', 'error'); }
  }, [hasSupabase, supabaseReady]);

  const placeOrder = useCallback(async (orderData, deliveryFee = 0) => {
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
      total: cartTotal + deliveryFee,
      status: 'جديد',
      customerEmail: user?.email || null,
      deliveryFee: deliveryFee,
      ...orderData
    };

    if (hasSupabase && supabaseReady) {
      try {
        const createdOrder = await ordersApi.create(newOrder);
        setOrders(prev => [createdOrder, ...prev]);
        setCart([]);
        addLoyaltyPoints(newOrder.total);
        const updatedProducts = await productsApi.list().catch(() => null);
        if (updatedProducts) setProducts(cleanProductImages(updatedProducts));
        return createdOrder;
      } catch (err) {
        throw err;
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

  const STATUS_ORDER = ['جديد', 'قيد التحضير', 'جاهز للتوصيل', 'في الطريق', 'تم التوصيل', 'مكتمل'];

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
    const isAccepting = order && order.status === 'جديد' && newStatus === 'قيد التحضير';
    let updatedFromServer = null;
    if (hasSupabase && supabaseReady) {
      try {
        updatedFromServer = await ordersApi.updateStatus(orderId, newStatus, eta);
      } catch (err) {
        throw err;
      }
    }
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      const base = updatedFromServer ? { ...o, ...updatedFromServer } : { ...o };
      base.status = newStatus;
      if (eta !== undefined && eta !== null) base.estimatedDelivery = Number(eta);
      if (isAccepting && currentStaff && !base.acceptedBy) {
        base.acceptedBy = { id: currentStaff.id, name: currentStaff.name, email: currentStaff.email };
      }
      return base;
    }));
  }, [hasSupabase, supabaseReady, orders, currentStaff]);

  const archiveOrder = useCallback(async (orderId) => {
    if (hasSupabase && supabaseReady) {
      try {
        const archived = await ordersApi.archiveOrder(orderId);
        setOrders(prev => prev.filter(o => o.id !== orderId));
        setArchivedOrders(prev => archived ? [archived, ...prev] : prev);
      } catch (err) {
        throw err;
      }
    }
  }, [hasSupabase, supabaseReady]);

  const restoreOrder = useCallback(async (orderId) => {
    if (hasSupabase && supabaseReady) {
      try {
        const restored = await ordersApi.restoreOrder(orderId);
        setArchivedOrders(prev => prev.filter(o => o.id !== orderId));
        if (restored) setOrders(prev => [restored, ...prev]);
      } catch (err) {
        throw err;
      }
    }
  }, [hasSupabase, supabaseReady]);

  const loadArchivedOrders = useCallback(async () => {
    if (!hasSupabase || !supabaseReady) return;
    try {
      const archived = await ordersApi.listArchived();
      if (Array.isArray(archived)) setArchivedOrders(archived);
    } catch (err) { console.error('[loadArchivedOrders]', err); }
  }, [hasSupabase, supabaseReady]);

  // --- Driver assignment (admin/manager) ---
  const loadDrivers = useCallback(async () => {
    if (!hasSupabase || !supabaseReady) return;
    try {
      const list = await staffApi.listDrivers();
      setDrivers(Array.isArray(list) ? list : []);
    } catch (err) { console.error('[loadDrivers]', err); showToast('تعذر تحميل قائمة الكباتن', 'error'); }
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
    let newProduct = { ...product };
    if (hasSupabase && supabaseReady) {
      try {
        const created = await productsApi.create(product);
        newProduct = created;
      } catch (err) {
        showToast('فشل إضافة المنتج لقاعدة البيانات: ' + (err.message || err), 'error');
        throw err;
      }
    } else {
      newProduct.id = Date.now().toString();
    }
    setProducts(prev => [newProduct, ...prev]);
    return newProduct;
  }, [hasSupabase, supabaseReady]);

  const updateProduct = useCallback(async (id, updated) => {
    if (hasSupabase && supabaseReady) {
      try {
        await productsApi.update(id, updated);
      } catch (err) {
        showToast('فشل تعديل المنتج في قاعدة البيانات: ' + (err.message || err), 'error');
        throw err;
      }
    }
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
  }, [hasSupabase, supabaseReady]);

  const deleteProduct = useCallback(async (id) => {
    if (hasSupabase && supabaseReady) {
      try {
        await productsApi.remove(id);
      } catch (err) {
        showToast('فشل حذف المنتج من قاعدة البيانات: ' + (err.message || err), 'error');
        throw err;
      }
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
      } catch (err) {
        showToast('فشل استيراد المنتجات لقاعدة البيانات: ' + (err.message || err), 'error');
        throw err;
      }
    }
    const localProducts = products.map(p => ({ ...p, id: Date.now().toString() + Math.random() }));
    setProducts(prev => [...localProducts, ...prev]);
    return localProducts;
  }, [hasSupabase, supabaseReady]);

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
  const login = useCallback(async (email, password) => {
    if (!hasSupabase) throw new Error('Supabase غير مهيأ');
    const normalizedEmail = String(email || '').trim().toLowerCase();
    try {
      const data = await authApi.signIn(normalizedEmail, password);
      setUser(data.user);
      return data;
    } catch (err) {
      // Handle "Invalid Refresh Token" - clear session and retry
      if (err?.message?.includes('Invalid Refresh Token') || err?.message?.includes('Refresh Token Not Found')) {
        try { await authApi.signOut(); } catch (e) { console.error('[login] signOut after invalid token', e); }
        setUser(null);
        setStaffRole(null);
        setCurrentStaff(null);
        setCustomerProfile(null);
      }
      if (supabase) {
        try {
          const { data: fixResult, error: rpcError } = await supabase.rpc('ensure_staff_auth_user', {
            p_email: normalizedEmail, p_password: password
          });
          if (rpcError) {
            console.warn('ensure_staff_auth_user RPC failed:', rpcError.message);
          } else if (fixResult?.fixed) {
            return await authApi.signIn(normalizedEmail, password).then(data => {
              setUser(data.user);
              return data;
            });
          }
        } catch (e) { console.error('[login] ensure_staff_auth_user', e); }
      }
      throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }
  }, []);

  const logout = useCallback(async () => {
    if (hasSupabase) await authApi.signOut();
    setUser(null);
    setStaffRole(null);
    setCurrentStaff(null);
    setCustomerProfile(null);
  }, []);

  // --- Customers Management ---
  const loadCustomers = useCallback(async () => {
    if (!hasSupabase) return;
    try {
      const list = await customersApi.list();
      setAllCustomers(list);
    } catch (err) { console.error('[loadCustomers]', err); showToast('تعذر تحميل قائمة العملاء', 'error'); }
  }, []);

  // Load customers list on init if staff
  useEffect(() => {
    const canLoadCustomers = staffRole === 'admin' || staffRole === 'manager' || staffRole === 'employee';
    if (!supabaseReady || !canLoadCustomers) return;
    loadCustomers();
  }, [supabaseReady, staffRole, loadCustomers]);

  // --- Staff Management ---
  const loadStaff = useCallback(async () => {
    if (!hasSupabase) return;
    try {
      const list = await staffApi.list();
      setStaffList(list);
    } catch (err) { console.error('[loadStaff]', err); showToast('تعذر تحميل قائمة الموظفين', 'error'); }
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
    } catch (err) { console.error('[updateCustomerProfile]', err); showToast('تعذر تحديث الملف الشخصي', 'error'); return null; }
  }, [user]);

  return (
    <StoreContext.Provider value={{
      user, loading, login, logout,
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
      chatMessages, sendMessage, typingUsers, sendTyping, markMessagesAsRead, retrySendMessage, refreshOrders: loadOrders, setOrders
    }}>
      {children}
    </StoreContext.Provider>
  );
};
