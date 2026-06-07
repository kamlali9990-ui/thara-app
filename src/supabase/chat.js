import { supabase } from './client';

export const chatApi = {
  async list(orderId = null, customerEmail = null, customerPhone = null, { limit = 100, offset = 0 } = {}) {
    let q = supabase.from('chat_messages').select('*').order('created_at', { ascending: true }).range(offset, offset + limit - 1);
    if (orderId) {
      q = q.eq('order_id', orderId);
    } else if (customerEmail) {
      q = q.eq('customer_email', customerEmail).is('order_id', null);
    } else if (customerPhone) {
      q = q.eq('customer_phone', customerPhone).is('order_id', null);
    }
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(mapMessage);
  },

  async send(sender, text, orderId = null, customerEmail = null, senderName = null, customerPhone = null) {
    const payload = { sender, text, status: 'sent' };
    if (orderId) payload.order_id = orderId;
    if (customerEmail) payload.customer_email = customerEmail;
    if (senderName) payload.sender_name = senderName;
    if (customerPhone) payload.customer_phone = customerPhone;
    const { data, error } = await supabase
      .from('chat_messages')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return mapMessage(data);
  },

  async markAsRead(messageIds) {
    if (!messageIds || messageIds.length === 0) return;
    const { error } = await supabase
      .from('chat_messages')
      .update({ status: 'read', read_at: new Date().toISOString() })
      .in('id', messageIds)
      .eq('status', 'sent');
    if (error) throw error;
  },

  subscribe(orderId = null, customerEmail = null, onMessage) {
    let filter = { event: 'INSERT', schema: 'public', table: 'chat_messages' };
    if (orderId) {
      filter.filter = `order_id=eq.${orderId}`;
    } else if (customerEmail) {
      filter.filter = `customer_email=eq.${customerEmail}`;
    }
    try {
      return supabase
        .channel('chat_messages' + (orderId ? `_${orderId}` : customerEmail ? `_${customerEmail.replace(/[@.]/g, '_')}` : ''))
        .on('postgres_changes', filter, (payload) => {
          onMessage(mapMessage(payload.new));
        })
        .subscribe();
    } catch (e) {
      console.warn('chat subscribe failed:', e);
      return { unsubscribe: () => {} };
    }
  },

  subscribeTyping(orderId, customerEmail, onTyping) {
    let filter = { event: 'INSERT', schema: 'public', table: 'typing_events' };
    if (orderId) {
      filter.filter = `order_id=eq.${orderId}`;
    } else if (customerEmail) {
      filter.filter = `user_email=eq.${customerEmail}`;
    }
    try {
      return supabase
        .channel('typing_' + (orderId || customerEmail?.replace(/[@.]/g, '_') || 'all'))
        .on('postgres_changes', filter, (payload) => {
          onTyping({ userEmail: payload.new.user_email, orderId: payload.new.order_id ? String(payload.new.order_id) : null, isTyping: payload.new.is_typing });
        })
        .subscribe();
    } catch (e) {
      console.warn('typing subscribe failed:', e);
      return { unsubscribe: () => {} };
    }
  },

  async subscribeUpdates(onUpdate) {
    let filter = { event: 'UPDATE', schema: 'public', table: 'chat_messages' };
    try {
      return supabase
        .channel('chat_updates')
        .on('postgres_changes', filter, (payload) => {
          onUpdate(mapMessage(payload.new));
        })
        .subscribe();
    } catch (e) {
      console.warn('chat updates subscribe failed:', e);
      return { unsubscribe: () => {} };
    }
  }
};

function mapMessage(m) {
  return {
    id: String(m.id),
    sender: m.sender,
    text: m.text,
    orderId: m.order_id ? String(m.order_id) : null,
    customerEmail: m.customer_email || null,
    customerPhone: m.customer_phone || null,
    senderName: m.sender_name || null,
    status: m.status || 'sent',
    readAt: m.read_at || null,
    time: new Date(m.created_at).toLocaleTimeString('ar-SA'),
    timestamp: m.created_at
  };
}
