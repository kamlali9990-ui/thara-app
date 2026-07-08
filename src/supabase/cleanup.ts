import { supabase } from './client';

export const cleanupApi = {
  async run(entities: string[]) {
    const { data, error } = await supabase.rpc('admin_cleanup_rpc', {
      p_entities: entities
    });
    if (error) throw error;
    return data;
  }
};
