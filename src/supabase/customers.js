import { supabase } from './client';

export const customersApi = {
  async create(email, name, phone) {
    const { data, error } = await supabase.rpc('create_customer_rpc', {
      p_email: email,
      p_name: name,
      p_phone: phone
    });
    if (error) throw error;
    return typeof data === 'string' ? JSON.parse(data) : data;
  },

  async get(email) {
    const { data, error } = await supabase.rpc('get_customer_rpc', {
      p_email: email
    });
    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    return data ? (typeof data === 'string' ? JSON.parse(data) : data) : null;
  },

  async update(email, name, phone, deliveryAddress, neighborhood, location) {
    const { data, error } = await supabase.rpc('update_customer_rpc', {
      p_email: email,
      p_name: name,
      p_phone: phone,
      p_delivery_address: deliveryAddress ?? null,
      p_neighborhood: neighborhood ?? null,
      p_location: location ?? null
    });
    if (error) throw error;
    return typeof data === 'string' ? JSON.parse(data) : data;
  },

  async addPoints(email, points) {
    const { data, error } = await supabase.rpc('add_loyalty_points_rpc', {
      p_email: email,
      p_points: points
    });
    if (error) throw error;
    return typeof data === 'string' ? JSON.parse(data) : data;
  },

  async list() {
    const { data, error } = await supabase.rpc('list_customers_rpc');
    if (error) throw error;
    const arr = typeof data === 'string' ? JSON.parse(data) : data;
    return Array.isArray(arr) ? arr : [];
  }
};
