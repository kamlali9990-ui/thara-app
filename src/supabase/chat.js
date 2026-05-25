import { supabase } from './client';

export const chatApi = {
  async list() {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data.map(mapMessage);
  },

  async send(sender, text) {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert([{ sender, text }])
      .select()
      .single();
    if (error) throw error;
    return mapMessage(data);
  },

  subscribe(onMessage) {
    return supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          onMessage(mapMessage(payload.new));
        }
      )
      .subscribe();
  }
};

function mapMessage(m) {
  return {
    id: String(m.id),
    sender: m.sender,
    text: m.text,
    time: new Date(m.created_at).toLocaleTimeString('ar-SA')
  };
}
