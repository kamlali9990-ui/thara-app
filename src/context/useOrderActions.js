import { useCallback } from 'react';
import { ordersApi } from '../supabase/orders.js';
import { staffApi } from '../supabase/staff.js';
import { productsApi } from '../supabase/products.js';
import { cleanProductImages } from '../utils/constants.js';
import { isValidStatusTransition } from './storeHelpers.js';
import { showToast } from '../components/Toast.jsx';

export function useOrderActions({ hasSupabase, supabaseReady, staffRole, user, currentStaff, products, cart, cartTotal, setOrders, setCart, setProducts, setArchivedOrders, setDrivers, addLoyaltyPoints }) {
  const loadOrders = useCallback(async () => {
    if (!hasSupabase || !supabaseReady) return;
    try {
      const supaOrders = await ordersApi.list();
      if (Array.isArray(supaOrders)) {
        const filtered = !staffRole && user?.email
          ? supaOrders.filter(o => o.customerEmail === user.email)
          : supaOrders;
        setOrders(prev => {
          const map = new Map(prev.map(o => [o.id, o]));
          for (const o of filtered) map.set(o.id, { ...map.get(o.id), ...o });
          return Array.from(map.values());
        });
      }
    } catch (err) { console.error('[loadOrders]', err); showToast('تعذر تحميل الطلبات', 'error'); }
  }, [hasSupabase, supabaseReady, staffRole, user?.email, setOrders]);

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
      const createdOrder = await ordersApi.create(newOrder);
      setOrders(prev => [createdOrder, ...prev]);
      setCart([]);
      addLoyaltyPoints(newOrder.total);
      const updatedProducts = await productsApi.list().catch(() => null);
      if (updatedProducts) setProducts(cleanProductImages(updatedProducts));
      return createdOrder;
    }

    setOrders(prev => [newOrder, ...prev]);
    setCart([]);
    addLoyaltyPoints(newOrder.total);
    setProducts(prev => prev.map(p => {
      const inCart = cart.find(c => c.id === p.id);
      return inCart ? { ...p, stock_quantity: Math.max(0, p.stock_quantity - inCart.qty) } : p;
    }));
    return newOrder;
  }, [cart, cartTotal, hasSupabase, supabaseReady, user, addLoyaltyPoints, products, setOrders, setCart, setProducts]);

  const updateOrderStatus = useCallback(async (orderId, newStatus, eta) => {
    const order = orders.find(o => o.id === orderId);
    if (order && !isValidStatusTransition(order.status, newStatus)) {
      throw new Error('لا يمكن إرجاع الطلب أكثر من خطوة واحدة');
    }
    const isAccepting = order && order.status === 'جديد' && newStatus === 'قيد التحضير';
    let updatedFromServer = null;
    if (hasSupabase && supabaseReady) {
      updatedFromServer = await ordersApi.updateStatus(orderId, newStatus, eta);
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
  }, [hasSupabase, supabaseReady, orders, currentStaff, setOrders]);

  const archiveOrder = useCallback(async (orderId) => {
    if (hasSupabase && supabaseReady) {
      const archived = await ordersApi.archiveOrder(orderId);
      setOrders(prev => prev.filter(o => o.id !== orderId));
      setArchivedOrders(prev => archived ? [archived, ...prev] : prev);
    }
  }, [hasSupabase, supabaseReady, setOrders, setArchivedOrders]);

  const restoreOrder = useCallback(async (orderId) => {
    if (hasSupabase && supabaseReady) {
      const restored = await ordersApi.restoreOrder(orderId);
      setArchivedOrders(prev => prev.filter(o => o.id !== orderId));
      if (restored) setOrders(prev => [restored, ...prev]);
    }
  }, [hasSupabase, supabaseReady, setOrders, setArchivedOrders]);

  const loadArchivedOrders = useCallback(async () => {
    if (!hasSupabase || !supabaseReady) return;
    try {
      const archived = await ordersApi.listArchived();
      if (Array.isArray(archived)) setArchivedOrders(archived);
    } catch (err) { console.error('[loadArchivedOrders]', err); }
  }, [hasSupabase, supabaseReady, setArchivedOrders]);

  const loadDrivers = useCallback(async () => {
    if (!hasSupabase || !supabaseReady) return;
    try {
      const list = await staffApi.listDrivers();
      setDrivers(Array.isArray(list) ? list : []);
    } catch (err) { console.error('[loadDrivers]', err); showToast('تعذر تحميل قائمة الكباتن', 'error'); }
  }, [hasSupabase, supabaseReady, setDrivers]);

  const assignDriverToOrder = useCallback(async (orderId, driverId) => {
    if (!hasSupabase || !supabaseReady) throw new Error('Supabase غير مهيأ');
    const updated = await ordersApi.assignDriver(orderId, driverId);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updated } : o));
    return updated;
  }, [hasSupabase, supabaseReady, setOrders]);

  const claimOrder = useCallback(async (orderId) => {
    if (!hasSupabase || !supabaseReady) throw new Error('Supabase غير مهيأ');
    const updated = await ordersApi.claim(orderId);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updated } : o));
    return updated;
  }, [hasSupabase, supabaseReady, setOrders]);

  return { loadOrders, placeOrder, updateOrderStatus, archiveOrder, restoreOrder, loadArchivedOrders, loadDrivers, assignDriverToOrder, claimOrder };
}
