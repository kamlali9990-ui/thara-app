import { supabase } from './client';

export const chatApi = {
  async list(orderId = null, customerEmail = null) {
    let q = supabase.from('chat_messages').select('*').order('created_at', { ascending: true });
    if (orderId) {
      q = q.eq('order_id', orderId);
    } else if (customerEmail) {
      q = q.eq('customer_email', customerEmail).is('order_id', null);
    }
    const { data, error } = await q;
    if (error) throw error;
    return data.map(mapMessage);
  },

  async send(sender, text, orderId = null, customerEmail = null) {
    const payload = { sender, text };
    if (orderId) payload.order_id = orderId;
    if (customerEmail) payload.customer_email = customerEmail;
    const { data, error } = await supabase
      .from('chat_messages')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return mapMessage(data);
  },

  subscribe(orderId = null, customerEmail = null, onMessage) {
    let filter = { event: 'INSERT', schema: 'public', table: 'chat_messages' };
    if (orderId) {
      filter.filter = `order_id=eq.${orderId}`;
    } else if (customerEmail) {
      filter.filter = `customer_email=eq.${customerEmail}`;
    }
    return supabase
      .channel('chat_messages' + (orderId ? `_${orderId}` : customerEmail ? `_${customerEmail.replace(/[@.]/g, '_')}` : ''))
      .on('postgres_changes', filter, (payload) => {
        onMessage(mapMessage(payload.new));
      })
      .subscribe();
  }
};

function mapMessage(m) {
  return {
    id: String(m.id),
    sender: m.sender,
    text: m.text,
    orderId: m.order_id ? String(m.order_id) : null,
    customerEmail: m.customer_email || null,
    time: new Date(m.created_at).toLocaleTimeString('ar-SA'),
    timestamp: m.created_at
  };
}
