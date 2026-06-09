import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../supabase/client', () => {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(() => builder),
    upsert: vi.fn(() => builder),
  };
  Object.assign(builder, {
    then(onFulfilled) { return Promise.resolve(builder._resolveValue).then(onFulfilled); },
    catch(onRejected) { return Promise.resolve(builder._resolveValue).catch(onRejected); },
    _resolveValue: { data: null, error: null },
  });
  return {
    supabase: { from: vi.fn(() => builder) },
    __mockBuilder: builder,
  };
});

const { supabase } = await import('../../supabase/client');
const builder = supabase.from();

describe('settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    builder._resolveValue = { data: null, error: null };
  });

  describe('getSetting', () => {
    it('returns value when found', async () => {
      builder._resolveValue = { data: { value: 'https://example.com/banner.jpg' }, error: null };
      const { getSetting } = await import('../../supabase/settings');
      const result = await getSetting('banner_url');
      expect(result).toBe('https://example.com/banner.jpg');
    });

    it('returns null when not found', async () => {
      builder._resolveValue = { data: null, error: null };
      const { getSetting } = await import('../../supabase/settings');
      const result = await getSetting('missing');
      expect(result).toBeNull();
    });

    it('returns null on error', async () => {
      builder._resolveValue = { data: null, error: new Error('db fail') };
      const { getSetting } = await import('../../supabase/settings');
      const result = await getSetting('banner_url');
      expect(result).toBeNull();
    });
  });

  describe('setSetting', () => {
    it('returns true on success', async () => {
      builder._resolveValue = { error: null };
      const { setSetting } = await import('../../supabase/settings');
      const result = await setSetting('banner_url', 'new.jpg');
      expect(result).toBe(true);
      expect(builder.upsert).toHaveBeenCalledWith({ key: 'banner_url', value: 'new.jpg' }, { onConflict: 'key' });
    });

    it('returns false on error', async () => {
      builder._resolveValue = { error: new Error('upsert fail') };
      const { setSetting } = await import('../../supabase/settings');
      const result = await setSetting('banner_url', 'x.jpg');
      expect(result).toBe(false);
    });
  });
});
