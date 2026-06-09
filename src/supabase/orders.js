import { supabase } from './client';

export const ordersApi = {
  async list(includeArchived = false) {
    let query = supabase.from('orders').select('*');
    if (!includeArchived) query = query.eq('archived', false);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(mapOrder);
  },

  async listArchived() {
    const { data, error } = await supabase.rpc('list_archived_orders_rpc');
    if (error) throw error;
    return (data || []).map(mapOrder);
  },

  async create(order) {
    const { data, error } = await supabase.rpc('create_order_secure', {
      cart_items: order.items.map(item => ({
        id: item.id,
        qty: item.qty
      })),
      payment_method: order.paymentMethod,
      delivery_location: order.location,
      customer_phone: order.phone || null,
      order_notes: order.notes || null,
      delivery_fee: order.deliveryFee ?? null,
      delivery_address: order.deliveryAddress || null
    });
    if (error) {
      if (import.meta.env.DEV && error.message?.includes('create_order_secure')) {
        return this.createLegacy(order);
      }
      throw error;
    }
    return mapOrder(data);
  },

  async createLegacy(order) {
    const { data, error } = await supabase
      .from('orders')
      .insert([{
        items: JSON.stringify(order.items),
        total: order.total,
        payment_method: order.paymentMethod,
        phone: order.phone || null,
        notes: order.notes || null,
        location: order.location,
        customer_email: order.customerEmail || null,
        delivery_address: order.deliveryAddress || null
      }])
      .select()
      .single();
    if (error) throw error;
    return mapOrder(data);
  },

  /**
   * Update status (and optional ETA). Uses secure RPC that enforces:
   *   admin/manager/employee → any order
   *   driver → only their assigned orders
   * Falls back to a plain UPDATE if the RPC is missing (older DBs).
   */
  async updateStatus(id, status, eta) {
    const { data, error } = await supabase.rpc('update_order_status_rpc', {
      p_order_id: Number(id),
      p_status: status,
      p_eta: (eta === undefined || eta === null) ? null : Number(eta)
    });
    if (error) {
      if (import.meta.env.DEV && (error.message?.toLowerCase().includes('function') || error.code === 'PGRST202')) {
        const patch = { status };
        if (eta !== undefined && eta !== null) patch.estimated_delivery = Number(eta);
        const { data: legacyData, error: legacyErr } = await supabase
          .from('orders')
          .update(patch)
          .eq('id', id)
          .select()
          .single();
        if (legacyErr) throw legacyErr;
        return mapOrder(legacyData);
      }
      throw error;
    }
    return mapOrder(typeof data === 'string' ? JSON.parse(data) : data);
  },

  /** Soft-delete: move order to archive. */
  async archiveOrder(id) {
    const { data, error } = await supabase.rpc('archive_order_rpc', {
      p_order_id: Number(id)
    });
    if (error) throw error;
    return mapOrder(typeof data === 'string' ? JSON.parse(data) : data);
  },

  /** Restore an archived order back to active. */
  async restoreOrder(id) {
    const { data, error } = await supabase.rpc('restore_order_rpc', {
      p_order_id: Number(id)
    });
    if (error) throw error;
    return mapOrder(typeof data === 'string' ? JSON.parse(data) : data);
  },

  /** Admin/manager assigns a driver to an order (pass null to unassign). */
  async assignDriver(orderId, driverId) {
    const { data, error } = await supabase.rpc('assign_driver_to_order', {
      p_order_id: Number(orderId),
      p_driver_id: driverId == null ? null : Number(driverId)
    });
    if (error) throw error;
    return mapOrder(typeof data === 'string' ? JSON.parse(data) : data);
  },

  /** Driver self-claims an available order. */
  async claim(orderId) {
    const { data, error } = await supabase.rpc('claim_order_rpc', {
      p_order_id: Number(orderId)
    });
    if (error) throw error;
    return mapOrder(typeof data === 'string' ? JSON.parse(data) : data);
  },

  /**
   * Realtime subscription on the orders table.
   * onChange({ eventType, new, old }) — RLS filters apply server-side.
   * Returns the channel object; call .unsubscribe() (or supabase.removeChannel) to stop.
   */
  subscribe(onChange) {
    try {
      const channel = supabase
        .channel('orders-stream')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
          try {
            const mapped = payload.new ? mapOrder(payload.new) : null;
            const mappedOld = payload.old ? mapOrder(payload.old) : null;
            onChange({ eventType: payload.eventType, new: mapped, old: mappedOld });
          } catch (e) {
            console.error('orders subscribe map error', e);
          }
        })
        .subscribe();
      return channel;
    } catch (e) {
      console.warn('orders subscribe failed (realtime may be unavailable):', e);
      return { unsubscribe: () => {} };
    }
  }
};

function mapOrder(o) {
  if (!o) return null;
  return {
    id: String(o.id),
    date: o.created_at,
    items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
    total: Number(o.total),
    status: o.status,
    paymentMethod: o.payment_method,
    phone: o.phone,
    notes: o.notes,
    location: o.location,
    customerEmail: o.customer_email,
    estimatedDelivery: o.estimated_delivery ?? null,
    assignedDriverId: o.assigned_driver_id ?? null,
    deliveryFee: Number(o.delivery_fee) || 0,
    deliveryAddress: o.delivery_address || null,
    acceptedBy: o.accepted_by_id ? { id: o.accepted_by_id } : null,
    archived: !!o.archived,
    archivedAt: o.archived_at || null
  };
}
