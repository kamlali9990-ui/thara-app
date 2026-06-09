import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../supabase/client', () => {
  const mockRpc = vi.fn();
  return { supabase: { rpc: mockRpc, from: vi.fn(), channel: vi.fn() }, __mockRpc: mockRpc };
});

const { customersApi } = await import('../../supabase/customers');
const { supabase } = await import('../../supabase/client');
const mockRpc = supabase.rpc;

describe('customersApi', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('create', () => {
    it('calls create_customer_rpc', async () => {
      mockRpc.mockResolvedValue({ data: { id: 1, email: 'a@a.com' }, error: null });
      const result = await customersApi.create('a@a.com', 'A', '966500000');
      expect(mockRpc).toHaveBeenCalledWith('create_customer_rpc', { p_email: 'a@a.com', p_name: 'A', p_phone: '966500000' });
      expect(result.email).toBe('a@a.com');
    });
  });

  describe('get', () => {
    it('returns customer when found', async () => {
      mockRpc.mockResolvedValue({ data: { id: 2, email: 'b@b.com' }, error: null });
      const result = await customersApi.get('b@b.com');
      expect(result.email).toBe('b@b.com');
    });

    it('returns null for PGRST116 (not found)', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
      const result = await customersApi.get('missing@m.com');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('calls update_customer_rpc with basic fields', async () => {
      mockRpc.mockResolvedValue({ data: { id: 3, name: 'Updated' }, error: null });
      const result = await customersApi.update('c@c.com', 'Updated', '966511111');
      expect(mockRpc).toHaveBeenCalledWith('update_customer_rpc', {
        p_email: 'c@c.com', p_name: 'Updated', p_phone: '966511111',
        p_delivery_address: null, p_neighborhood: null, p_location: null
      });
    });

    it('calls update_customer_rpc with all fields', async () => {
      mockRpc.mockResolvedValue({ data: { id: 3, name: 'Updated', delivery_address: 'شارع ١', neighborhood: 'العزيزية', location: '{"lat":28.42,"lng":48.5}' }, error: null });
      const result = await customersApi.update('c@c.com', 'Updated', '966511111', 'شارع ١', 'العزيزية', '{"lat":28.42,"lng":48.5}');
      expect(mockRpc).toHaveBeenCalledWith('update_customer_rpc', {
        p_email: 'c@c.com', p_name: 'Updated', p_phone: '966511111',
        p_delivery_address: 'شارع ١', p_neighborhood: 'العزيزية', p_location: '{"lat":28.42,"lng":48.5}'
      });
    });
  });

  describe('addPoints', () => {
    it('calls add_loyalty_points_rpc', async () => {
      mockRpc.mockResolvedValue({ data: { points: 50 }, error: null });
      const result = await customersApi.addPoints('d@d.com', 50);
      expect(mockRpc).toHaveBeenCalledWith('add_loyalty_points_rpc', { p_email: 'd@d.com', p_points: 50 });
    });
  });

  describe('list', () => {
    it('returns array of customers', async () => {
      mockRpc.mockResolvedValue({ data: [{ id: 10 }, { id: 11 }], error: null });
      const result = await customersApi.list();
      expect(result).toHaveLength(2);
    });

    it('returns empty array on null data', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });
      const result = await customersApi.list();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });
});
