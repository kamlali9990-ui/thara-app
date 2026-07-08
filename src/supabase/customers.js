import { supabase } from './client';
import { authApi } from './auth';

export const customersApi = {
  async create(email, name, phone, username, realEmail) {
    const { data, error } = await supabase.rpc('create_customer_rpc', {
      p_email: email,
      p_name: name,
      p_phone: phone,
      p_username: username || null,
      p_real_email: realEmail || null
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

  async update(email, name, phone, deliveryAddress, neighborhood, location, username, realEmail) {
    const { data, error } = await supabase.rpc('update_customer_rpc', {
      p_email: email,
      p_name: name,
      p_phone: phone,
      p_delivery_address: deliveryAddress ?? null,
      p_neighborhood: neighborhood ?? null,
      p_location: location ?? null,
      p_username: username ?? null,
      p_real_email: realEmail ?? null
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
  },

  async resolveLogin(identifier) {
    const { data, error } = await supabase.rpc('resolve_customer_login', {
      p_identifier: identifier
    });
    if (error) throw error;
    return data;
  },

  async findByRealEmail(realEmail) {
    const { data, error } = await supabase.rpc('find_customer_by_real_email_rpc', {
      p_real_email: realEmail
    });
    if (error) throw error;
    return data;
  },

  async login(identifier, password) {
    const resolvedEmail = await this.resolveLogin(identifier);
    if (resolvedEmail) {
      return await authApi.signIn(resolvedEmail, password);
    }
    // If identifier is an email, try staff login
    if (typeof identifier === 'string' && identifier.includes('@')) {
      const { data, error } = await supabase.rpc('ensure_staff_auth_user', {
        p_identifier: identifier.trim().toLowerCase(),
        p_password: password
      });
      if (!error && data?.fixed) {
        const staffEmail = data.user?.email || identifier.trim().toLowerCase();
        return await authApi.signIn(staffEmail, password);
      }
    }
    throw new Error('بيانات الدخول غير صحيحة');
  }
};
