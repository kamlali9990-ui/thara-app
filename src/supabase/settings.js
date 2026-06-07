import { supabase } from './client';

const SETTINGS_KEYS = {
  BANNER_URL: 'banner_url',
};

export async function getSetting(key) {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) return null;
  return data?.value || null;
}

export async function setSetting(key, value) {
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value }, { onConflict: 'key' });
  return !error;
}

export { SETTINGS_KEYS };
