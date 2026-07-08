import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../supabase/client', () => {
  const mockRpc = vi.fn();
  return {
    supabase: { rpc: mockRpc, from: vi.fn(), channel: vi.fn() },
    __mockRpc: mockRpc,
  };
});

const mockRpc = (await import('../../supabase/client')).__mockRpc;
const { staffApi } = await import('../../supabase/staff');

describe('staffApi', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('returns staff from RPC and updates cache', async () => {
      mockRpc.mockResolvedValue({ data: [{ id: 1, email: 'a@a.com', name: 'A', role: 'admin' }], error: null });
      const result = await staffApi.list();
      expect(result).toBeDefined();
      const cached = JSON.parse(localStorage.getItem('thara_staff_cache'));
      expect(cached.list).toBeDefined();
    });

    it('falls back to cache when RPC fails', async () => {
      const cachedData = { list: [{ id: 1, email: 'b@b.com', name: 'B', role: 'driver' }], byEmail: { 'b@b.com': { id: 1 } } };
      localStorage.setItem('thara_staff_cache', JSON.stringify(cachedData));
      mockRpc.mockRejectedValue(new Error('network'));
      const result = await staffApi.list();
      expect(result).toEqual(cachedData.list);
    });
  });

  describe('getByEmail', () => {
    it('returns staff member by email from RPC', async () => {
      mockRpc.mockResolvedValue({ data: { id: 2, email: 'x@x.com', name: 'X', role: 'employee' }, error: null });
      const result = await staffApi.getByEmail('x@x.com');
      expect(result).toBeDefined();
    });

    it('falls back to cache when RPC fails', async () => {
      const cachedData = { list: [{ id: 3, email: 'c@c.com', name: 'C', role: 'driver' }], byEmail: { 'c@c.com': { id: 3, email: 'c@c.com', name: 'C', role: 'driver' } } };
      localStorage.setItem('thara_staff_cache', JSON.stringify(cachedData));
      mockRpc.mockRejectedValue(new Error('fail'));
      const result = await staffApi.getByEmail('c@c.com');
      expect(result.id).toBe(3);
    });
  });

  describe('create', () => {
    it('calls RPC with normalized email', async () => {
      mockRpc.mockResolvedValue({ data: { staff: { id: 4, email: 'new@a.com', name: 'New', role: 'employee' }, password: 'abc123' }, error: null });
      await staffApi.create({ email: '  NEW@A.COM ', name: 'New', role: 'employee' });
      expect(mockRpc).toHaveBeenCalledWith('create_staff_rpc', {
        p_email: 'new@a.com',
        p_name: 'New',
        p_role: 'employee',
        p_phone: null,
      });
    });

    it('re-throws error from RPC', async () => {
      mockRpc.mockRejectedValue(new Error('DB error'));
      await expect(staffApi.create({ email: 'e@e.com', name: 'E', role: 'admin' })).rejects.toThrow('DB error');
    });
  });

  describe('update', () => {
    it('sends optional email when provided', async () => {
      mockRpc.mockResolvedValue({ data: { id: 5, email: 'u@u.com' }, error: null });
      await staffApi.update(5, { name: 'Updated', role: 'admin', email: 'u@u.com' });
      expect(mockRpc).toHaveBeenCalledWith('update_staff_rpc', { p_id: 5, p_name: 'Updated', p_role: 'admin', p_email: 'u@u.com' });
    });

    it('omits p_email when not provided', async () => {
      mockRpc.mockResolvedValue({ data: { id: 5, name: 'NoEmail' }, error: null });
      await staffApi.update(5, { name: 'NoEmail', role: 'driver' });
      const args = mockRpc.mock.calls[0][1];
      expect(args).not.toHaveProperty('p_email');
    });
  });

  describe('remove', () => {
    it('calls RPC and removes from cache', async () => {
      localStorage.setItem('thara_staff_cache', JSON.stringify({ list: [{ id: 6, email: 'd@d.com' }], byEmail: { 'd@d.com': { id: 6 } } }));
      mockRpc.mockResolvedValue({ data: null, error: null });
      await staffApi.remove(6);
      expect(mockRpc).toHaveBeenCalledWith('delete_staff_rpc', { p_id: 6 });
      const cache = JSON.parse(localStorage.getItem('thara_staff_cache'));
      expect(cache.list.find(s => s.id === 6)).toBeUndefined();
    });
  });

  describe('listDrivers', () => {
    it('returns drivers from RPC', async () => {
      mockRpc.mockResolvedValue({ data: [{ id: 7, email: 'dr@d.com', role: 'driver' }], error: null });
      const result = await staffApi.listDrivers();
      expect(Array.isArray(result)).toBe(true);
    });

    it('filters from cache on RPC failure', async () => {
      const cachedData = { list: [{ id: 8, role: 'driver', email: 'd1@d.com' }, { id: 9, role: 'admin', email: 'a@a.com' }], byEmail: {} };
      localStorage.setItem('thara_staff_cache', JSON.stringify(cachedData));
      mockRpc.mockRejectedValue(new Error('fail'));
      const result = await staffApi.listDrivers();
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('driver');
    });
  });
});
