import { supabase } from './client';

interface ChatMessageRow {
  id: number;
  sender: string;
  text: string;
  order_id?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  sender_name?: string | null;
  status?: string;
  read_at?: string | null;
  created_at: string;
}

interface TypingEventRow {
  user_email: string;
  order_id?: string | null;
  is_typing: boolean;
}

interface MappedMessage {
  id: string;
  sender: string;
  text: string;
  orderId: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  senderName: string | null;
  status: string;
  readAt: string | null;
  time: string;
  timestamp: string;
}

interface MappedTypingEvent {
  userEmail: string;
  orderId: string | null;
  isTyping: boolean;
}

function mapMessage(m: ChatMessageRow): MappedMessage {
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

export const chatApi = {
  async list(orderId: string | null = null, customerEmail: string | null = null, customerPhone: string | null = null, { limit = 100, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<MappedMessage[]> {
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

  async send(sender: string, text: string, orderId: string | null = null, customerEmail: string | null = null, senderName: string | null = null, customerPhone: string | null = null): Promise<MappedMessage> {
    const payload: Record<string, any> = { sender, text, status: 'sent' };
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

  async markAsRead(messageIds: string[]): Promise<void> {
    if (!messageIds || messageIds.length === 0) return;
    const { error } = await supabase
      .from('chat_messages')
      .update({ status: 'read', read_at: new Date().toISOString() })
      .in('id', messageIds)
      .eq('status', 'sent');
    if (error) throw error;
  },

  subscribe(orderId: string | null = null, customerEmail: string | null = null, onMessage: (msg: MappedMessage) => void) {
    const filter: { event: 'INSERT'; schema: string; table: string; filter?: string } = { event: 'INSERT', schema: 'public', table: 'chat_messages' };
    if (orderId) {
      filter.filter = `order_id=eq.${orderId}`;
    } else if (customerEmail) {
      filter.filter = `customer_email=eq.${customerEmail}`;
    }
    try {
      return supabase
        .channel('chat_messages' + (orderId ? `_${orderId}` : customerEmail ? `_${customerEmail.replace(/[@.]/g, '_')}` : ''))
        .on('postgres_changes', filter, (payload: any) => {
          onMessage(mapMessage(payload.new));
        })
        .subscribe();
    } catch (e) {
      console.warn('chat subscribe failed:', e);
      return { unsubscribe: () => {} };
    }
  },

  subscribeTyping(orderId: string, customerEmail: string, onTyping: (event: MappedTypingEvent) => void) {
    const filter: { event: 'INSERT'; schema: string; table: string; filter?: string } = { event: 'INSERT', schema: 'public', table: 'typing_events' };
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

  async sendTyping(userEmail: string, orderId: string | null = null, isTyping = true): Promise<void> {
    try {
      await supabase.from('typing_events').insert({
        user_email: userEmail,
        order_id: orderId,
        is_typing: isTyping
      });
    } catch (e) {
      console.warn('sendTyping failed:', e);
    }
  },

  async subscribeUpdates(onUpdate: (msg: MappedMessage) => void) {
    const filter: { event: 'UPDATE'; schema: string; table: string } = { event: 'UPDATE', schema: 'public', table: 'chat_messages' };
    try {
      return supabase
        .channel('chat_updates')
        .on('postgres_changes', filter, (payload: any) => {
          onUpdate(mapMessage(payload.new));
        })
        .subscribe();
    } catch (e) {
      console.warn('chat updates subscribe failed:', e);
      return { unsubscribe: () => {} };
    }
  }
};
