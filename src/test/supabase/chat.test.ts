import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../supabase/client', () => {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    in: vi.fn(() => builder),
    single: vi.fn(() => builder),
  };
  Object.assign(builder, {
    then(onFulfilled: any) { return Promise.resolve(builder._resolveValue).then(onFulfilled); },
    catch(onRejected: any) { return Promise.resolve(builder._resolveValue).catch(onRejected); },
    _resolveValue: { data: [], error: null },
  });

  const mockChannel = vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() }));

  return {
    supabase: {
      from: vi.fn(() => builder),
      channel: mockChannel,
      removeChannel: vi.fn(),
      rpc: vi.fn(),
    },
    __mockBuilder: builder,
    __mockChannel: mockChannel,
  };
});

import { supabase } from '../../supabase/client';
const builder: any = (supabase as any).from();

describe('chatApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    builder._resolveValue = { data: [], error: null };
  });

  describe('list', () => {
    it('filters by orderId when provided', async () => {
      builder._resolveValue = { data: [{ id: 1, sender: 'customer', text: 'hi', created_at: new Date().toISOString() }], error: null };
      const { chatApi } = await import('../../supabase/chat');
      await chatApi.list('42');
      expect(builder.eq).toHaveBeenCalledWith('order_id', '42');
    });

    it('filters by customerEmail with null order_id', async () => {
      builder._resolveValue = { data: [], error: null };
      const { chatApi } = await import('../../supabase/chat');
      await chatApi.list(null, 'c@c.com');
      expect(builder.eq).toHaveBeenCalledWith('customer_email', 'c@c.com');
      expect(builder.is).toHaveBeenCalledWith('order_id', null);
    });

    it('throws on error', async () => {
      builder._resolveValue = { data: null, error: new Error('db') };
      const { chatApi } = await import('../../supabase/chat');
      await expect(chatApi.list()).rejects.toThrow('db');
    });
  });

  describe('send', () => {
    it('builds correct payload', async () => {
      builder._resolveValue = { data: { id: 10, sender: 'admin', text: 'hello', status: 'sent', created_at: new Date().toISOString() }, error: null };
      const { chatApi } = await import('../../supabase/chat');
      const result = await chatApi.send('admin', 'hello', '5', 'c@c.com', 'Admin', '966500000000');
      expect(builder.insert).toHaveBeenCalledWith([{
        sender: 'admin', text: 'hello', status: 'sent',
        order_id: '5', customer_email: 'c@c.com',
        sender_name: 'Admin', customer_phone: '966500000000',
      }]);
      expect(result.sender).toBe('admin');
    });
  });

  describe('markAsRead', () => {
    it('does nothing for empty array', async () => {
      const { chatApi } = await import('../../supabase/chat');
      await chatApi.markAsRead([]);
      expect(builder.update).not.toHaveBeenCalled();
    });

    it('updates status to read', async () => {
      builder._resolveValue = { data: null, error: null };
      const { chatApi } = await import('../../supabase/chat');
      await chatApi.markAsRead(['1', '2', '3']);
      expect(builder.update).toHaveBeenCalled();
      expect(builder.in).toHaveBeenCalledWith('id', ['1', '2', '3']);
      expect(builder.eq).toHaveBeenCalledWith('status', 'sent');
    });
  });

  describe('subscribe', () => {
    it('creates channel with order id filter', async () => {
      const { chatApi } = await import('../../supabase/chat');
      chatApi.subscribe('42', null, vi.fn());
      expect(supabase.channel).toHaveBeenCalled();
    });

    it('returns noop on error', async () => {
      (supabase.channel as any).mockImplementation(() => { throw new Error('fail'); });
      const { chatApi } = await import('../../supabase/chat');
      const ch = chatApi.subscribe(null, null, vi.fn());
      expect(typeof ch.unsubscribe).toBe('function');
    });
  });
});

describe('mapMessage', () => {
  it('maps fields correctly', async () => {
    builder._resolveValue = { data: [{ id: 5, sender: 'customer', text: 'مرحبا', order_id: 3, customer_email: 'c@c.com', customer_phone: '9665', sender_name: 'أحمد', status: 'read', read_at: '2025-01-01T00:00:00Z', created_at: '2025-01-01T00:00:00Z' }], error: null };
    const { chatApi } = await import('../../supabase/chat');
    const msgs = await chatApi.list('3');
    const m = msgs[0];
    expect(m.id).toBe('5');
    expect(m.sender).toBe('customer');
    expect(m.text).toBe('مرحبا');
    expect(m.orderId).toBe('3');
    expect(m.status).toBe('read');
    expect(m.senderName).toBe('أحمد');
  });
});
