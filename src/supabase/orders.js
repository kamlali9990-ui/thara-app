import { supabase } from './client';

export const ordersApi = {
  async list() {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(mapOrder);
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
      order_notes: order.notes || null
    });
    if (error) {
      if (error.message?.includes('create_order_secure')) {
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
        customer_email: order.customerEmail || null
      }])
      .select()
      .single();
    if (error) throw error;
    return mapOrder(data);
  },

  async updateStatus(id, status) {
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapOrder(data);
  }
};

function mapOrder(o) {
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
    customerEmail: o.customer_email
  };
}
