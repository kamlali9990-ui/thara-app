import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../supabase/client', () => {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    single: vi.fn(() => builder),
    order: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
  };
  Object.assign(builder, {
    then(onFulfilled: any) { return Promise.resolve((builder as any)._resolveValue).then(onFulfilled); },
    catch(onRejected: any) { return Promise.resolve((builder as any)._resolveValue).catch(onRejected); },
    _resolveValue: { data: [], error: null },
  });

  const mockRpc = vi.fn();
  const mockChannel = vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })) }));

  return {
    supabase: {
      from: vi.fn(() => builder),
      rpc: mockRpc,
      channel: mockChannel,
      removeChannel: vi.fn(),
    },
    __mockBuilder: builder,
    __mockRpc: mockRpc,
    __mockChannel: mockChannel,
  };
});

const { supabase } = await import('../../supabase/client');
const builder = supabase.from('') as any;
const mockRpc = supabase.rpc as any;
const mockChannel = supabase.channel as any;

describe('ordersApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    builder._resolveValue = { data: [], error: null };
  });

  describe('list', () => {
    it('filters archived=false by default', async () => {
      builder._resolveValue = { data: [mockOrderRow(1)], error: null };
      const { ordersApi } = await import('../../supabase/orders');
      await ordersApi.list();
      expect(builder.eq).toHaveBeenCalledWith('archived', false);
    });

    it('includes archived when requested', async () => {
      builder._resolveValue = { data: [mockOrderRow(2)], error: null };
      const { ordersApi } = await import('../../supabase/orders');
      await ordersApi.list(true);
      expect(builder.eq).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('calls secure RPC with order data', async () => {
      mockRpc.mockResolvedValue({ data: mockOrderRow(3), error: null });
      const { ordersApi } = await import('../../supabase/orders');
      const result = await ordersApi.create({ items: [{ id: 1, qty: 2 }], paymentMethod: 'cash', location: 'test' });
      expect(supabase.rpc).toHaveBeenCalledWith('create_order_secure', expect.objectContaining({
        cart_items: [{ id: 1, qty: 2 }],
        payment_method: 'cash',
      }));
      expect(result).toBeDefined();
    });
  });

  describe('updateStatus', () => {
    it('calls RPC with status and optional ETA', async () => {
      mockRpc.mockResolvedValue({ data: mockOrderRow(4), error: null });
      const { ordersApi } = await import('../../supabase/orders');
      await ordersApi.updateStatus(4, 'completed');
      expect(supabase.rpc).toHaveBeenCalledWith('update_order_status_rpc', { p_order_id: 4, p_status: 'completed', p_eta: null });
    });
  });

  describe('assignDriver', () => {
    it('assigns a driver to order', async () => {
      mockRpc.mockResolvedValue({ data: { ...mockOrderRow(5), assigned_driver_id: 10 }, error: null });
      const { ordersApi } = await import('../../supabase/orders');
      await ordersApi.assignDriver(5, 10);
      expect(supabase.rpc).toHaveBeenCalledWith('assign_driver_to_order', { p_order_id: 5, p_driver_id: 10 });
    });

    it('unassigns driver when id is null', async () => {
      mockRpc.mockResolvedValue({ data: mockOrderRow(6), error: null });
      const { ordersApi } = await import('../../supabase/orders');
      await ordersApi.assignDriver(6, null);
      expect(supabase.rpc).toHaveBeenCalledWith('assign_driver_to_order', { p_order_id: 6, p_driver_id: null });
    });
  });

  describe('claim', () => {
    it('driver claims an order', async () => {
      mockRpc.mockResolvedValue({ data: mockOrderRow(7), error: null });
      const { ordersApi } = await import('../../supabase/orders');
      await ordersApi.claim(7);
      expect(supabase.rpc).toHaveBeenCalledWith('claim_order_rpc', { p_order_id: 7 });
    });
  });

  describe('subscribe', () => {
    it('returns a channel object', async () => {
      const { ordersApi } = await import('../../supabase/orders');
      const channel = ordersApi.subscribe(vi.fn());
      expect(channel).toBeDefined();
      expect(typeof channel.unsubscribe).not.toBe('undefined');
    });

    it('returns noop on error', async () => {
      mockChannel.mockImplementation(() => { throw new Error('no rt'); });
      const { ordersApi } = await import('../../supabase/orders');
      const channel = ordersApi.subscribe(vi.fn());
      expect(typeof channel.unsubscribe).toBe('function');
    });
  });
});

describe('mapOrder', () => {
  it('maps all fields correctly', async () => {
    builder._resolveValue = { data: [{
      id: 99, created_at: '2025-01-01T00:00:00Z',
      items: JSON.stringify([{ id: 1, qty: 2 }]),
      total: 50, status: 'delivered', payment_method: 'card',
      phone: '966500000000', notes: 'thanks',
      location: 'test', customer_email: 'c@c.com',
      estimated_delivery: 30, assigned_driver_id: 7,
      delivery_fee: 5, delivery_address: 'addr',
      accepted_by_id: 3, archived: false, archived_at: null,
    }], error: null };
    const { ordersApi } = await import('../../supabase/orders');
    const result = await ordersApi.list();
    const o = result[0];
    expect(o.id).toBe('99');
    expect(Array.isArray(o.items)).toBe(true);
    expect(o.total).toBe(50);
    expect(o.status).toBe('delivered');
    expect(o.paymentMethod).toBe('card');
    expect(o.deliveryFee).toBe(5);
    expect(o.deliveryAddress).toBe('addr');
    expect(o.assignedDriverId).toBe(7);
  });

  it('handles null order items gracefully', async () => {
    builder._resolveValue = { data: [{
      id: 100, created_at: '2025-01-01T00:00:00Z',
      items: null, total: 0, status: 'pending', payment_method: 'cash',
    }], error: null };
    const { ordersApi } = await import('../../supabase/orders');
    const result = await ordersApi.list();
    expect(result[0].items).toBeNull();
  });
});

function mockOrderRow(id: number) {
  return { id, created_at: new Date().toISOString(), items: '[]', total: 0, status: 'pending', payment_method: 'cash' };
}
