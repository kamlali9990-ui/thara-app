import { supabase } from './client';

export const authApi = {
  async signIn(email, password) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    if (error) throw error;
    return data;
  },

  async signUp(email, password) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({ email: normalizedEmail, password });
    if (error) throw error;
    return data;
  },

  async signUpDirect(email, password, username) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const { data, error } = await supabase.rpc('create_customer_auth_rpc', {
      p_email: normalizedEmail,
      p_password: password,
      p_username: username || null
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getUser() {
    const { data } = await supabase.auth.getUser();
    return data?.user || null;
  },

  async resetPassword(email, redirectTo) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const { data, error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: redirectTo || (window.location.origin + (import.meta.env.BASE_URL || '/') + 'reset-password')
    });
    if (error) throw error;
    return data;
  },

  async updatePassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return data;
  },

  onAuthChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session?.user || null);
    });
  }
};
