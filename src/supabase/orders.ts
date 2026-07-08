import { supabase } from './client';
import type { Order, OrderStatus } from '../types';

interface OrderRow {
  id: number;
  created_at: string;
  items: string | any[];
  total: number;
  status: string;
  payment_method?: string;
  phone?: string;
  notes?: string;
  location?: string;
  customer_email?: string;
  estimated_delivery?: number | null;
  assigned_driver_id?: number | null;
  delivery_fee?: number;
  delivery_address?: string | null;
  accepted_by_id?: number | null;
  archived?: boolean;
  archived_at?: string | null;
  driver_lat?: number | null;
  driver_lng?: number | null;
}

function mapOrder(o: OrderRow | null): Order | null {
  if (!o) return null;
  return {
    id: String(o.id),
    date: o.created_at,
    items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
    total: Number(o.total),
    status: o.status as OrderStatus,
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
    archivedAt: o.archived_at || null,
    driverLat: o.driver_lat ?? null,
    driverLng: o.driver_lng ?? null
  };
}

interface OrderInput {
  items: { id: number; qty: number }[];
  paymentMethod: string;
  location: string;
  phone?: string;
  notes?: string;
  deliveryFee?: number;
  deliveryAddress?: string;
}

type SubscribeCallback = (payload: { eventType: string; new: Order | null; old: Order | null }) => void;

export const ordersApi = {
  async getDeliveryFee(lat: number, lng: number, cartTotal: number): Promise<number> {
    const { data, error } = await supabase.rpc('get_delivery_fee_rpc', {
      p_lat: Number(lat), p_lng: Number(lng), p_cart_total: Number(cartTotal)
    });
    if (error) throw error;
    return Number(data) || 0;
  },

  async list(includeArchived = false, { limit, offset }: { limit?: number; offset?: number } = {}): Promise<Order[]> {
    let query = supabase.from('orders').select('*');
    if (!includeArchived) query = query.eq('archived', false);
    query = query.order('created_at', { ascending: false });
    if (limit != null) {
      query = query.range(offset ?? 0, (offset ?? 0) + limit - 1);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((o: OrderRow) => mapOrder(o)!);
  },

  async listArchived(): Promise<Order[]> {
    const { data, error } = await supabase.rpc('list_archived_orders_rpc');
    if (error) throw error;
    return (data || []).map((o: OrderRow) => mapOrder(o)!);
  },

  async create(order: OrderInput): Promise<Order> {
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
    if (error) throw error;
    return mapOrder(data)!;
  },

  async updateStatus(id: string | number, status: string, eta?: number | null): Promise<Order> {
    const { data, error } = await supabase.rpc('update_order_status_rpc', {
      p_order_id: Number(id),
      p_status: status,
      p_eta: (eta === undefined || eta === null) ? null : Number(eta)
    });
    if (error) {
      if (import.meta.env.DEV && (error.message?.toLowerCase().includes('function') || error.code === 'PGRST202')) {
        const patch: Record<string, any> = { status };
        if (eta !== undefined && eta !== null) patch.estimated_delivery = Number(eta);
        const { data: legacyData, error: legacyErr } = await supabase
          .from('orders')
          .update(patch)
          .eq('id', id)
          .select()
          .single();
        if (legacyErr) throw legacyErr;
        return mapOrder(legacyData)!;
      }
      throw error;
    }
    return mapOrder(typeof data === 'string' ? JSON.parse(data) : data)!;
  },

  async archiveOrder(id: string | number): Promise<Order> {
    const { data, error } = await supabase.rpc('archive_order_rpc', {
      p_order_id: Number(id)
    });
    if (error) throw error;
    return mapOrder(typeof data === 'string' ? JSON.parse(data) : data)!;
  },

  async restoreOrder(id: string | number): Promise<Order> {
    const { data, error } = await supabase.rpc('restore_order_rpc', {
      p_order_id: Number(id)
    });
    if (error) throw error;
    return mapOrder(typeof data === 'string' ? JSON.parse(data) : data)!;
  },

  async assignDriver(orderId: string | number, driverId: number | null): Promise<Order> {
    const { data, error } = await supabase.rpc('assign_driver_to_order', {
      p_order_id: Number(orderId),
      p_driver_id: driverId == null ? null : Number(driverId)
    });
    if (error) throw error;
    return mapOrder(typeof data === 'string' ? JSON.parse(data) : data)!;
  },

  async updateDriverLocation(orderId: string | number, lat: number, lng: number): Promise<Order> {
    const { data, error } = await supabase.rpc('update_driver_location_rpc', {
      p_order_id: Number(orderId),
      p_lat: Number(lat),
      p_lng: Number(lng)
    });
    if (error) throw error;
    return mapOrder(typeof data === 'string' ? JSON.parse(data) : data)!;
  },

  async claim(orderId: string | number): Promise<Order> {
    const { data, error } = await supabase.rpc('claim_order_rpc', {
      p_order_id: Number(orderId)
    });
    if (error) throw error;
    return mapOrder(typeof data === 'string' ? JSON.parse(data) : data)!;
  },

  subscribe(onChange: SubscribeCallback) {
    try {
      const channel = supabase
        .channel('orders-stream')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload: any) => {
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
