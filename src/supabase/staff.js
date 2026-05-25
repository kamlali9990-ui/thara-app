import { supabase } from './client';

export const staffApi = {
  async list() {
    const { data, error } = await supabase.from('staff').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getByEmail(email) {
    const { data, error } = await supabase.from('staff').select('*').eq('email', email).maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(staffMember) {
    const { data, error } = await supabase.from('staff').insert(staffMember).select().single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase.from('staff').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async remove(id) {
    const { error } = await supabase.from('staff').delete().eq('id', id);
    if (error) throw error;
  }
};
