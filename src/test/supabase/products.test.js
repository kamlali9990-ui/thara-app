import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../supabase/client', () => {
  const mockBuilder = {
    select: vi.fn(() => mockBuilder),
    order: vi.fn(() => mockBuilder),
    range: vi.fn(() => mockBuilder),
    eq: vi.fn(() => mockBuilder),
    single: vi.fn(() => mockBuilder),
    insert: vi.fn(() => mockBuilder),
    update: vi.fn(() => mockBuilder),
    delete: vi.fn(() => mockBuilder),
  };
  Object.assign(mockBuilder, {
    then(onFulfilled) { return Promise.resolve(mockBuilder._resolveValue).then(onFulfilled); },
    catch(onRejected) { return Promise.resolve(mockBuilder._resolveValue).catch(onRejected); },
    _resolveValue: { data: [], error: null },
  });
  return {
    supabase: {
      from: vi.fn(() => mockBuilder),
      rpc: vi.fn(),
      channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
      removeChannel: vi.fn(),
    },
    __mockBuilder: mockBuilder,
  };
});

const { __mockBuilder: builder } = await import('../../supabase/client');
const { productsApi } = await import('../../supabase/products');

describe('productsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    builder._resolveValue = { data: [], error: null };
  });

  describe('list', () => {
    it('fetches all products', async () => {
      builder._resolveValue = { data: [{ id: 1, name: 'P1', price: 10 }], error: null };
      const result = await productsApi.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it('throws on error', async () => {
      builder._resolveValue = { data: null, error: new Error('fail') };
      await expect(productsApi.list()).rejects.toThrow('fail');
    });
  });

  describe('get', () => {
    it('fetches a single product by id', async () => {
      builder._resolveValue = { data: { id: 5, name: 'P5', price: 25 }, error: null };
      const result = await productsApi.get(5);
      expect(result.id).toBe('5');
      expect(builder.eq).toHaveBeenCalledWith('id', 5);
    });
  });

  describe('create', () => {
    it('inserts and returns the new product', async () => {
      builder._resolveValue = { data: { id: 10, name: 'New', category: 'food', price: 15, image_url: '' }, error: null };
      const result = await productsApi.create({ name: 'New', category: 'food', price: 15 });
      expect(result.name).toBe('New');
    });
  });

  describe('update', () => {
    it('updates product and returns result', async () => {
      builder._resolveValue = { data: { id: 10, name: 'Updated', price: 20 }, error: null };
      const result = await productsApi.update(10, { name: 'Updated', price: 20 });
      expect(result.name).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('deletes product by id', async () => {
      builder._resolveValue = { data: null, error: null };
      await expect(productsApi.remove(10)).resolves.toBeUndefined();
      expect(builder.eq).toHaveBeenCalledWith('id', 10);
    });
  });

  describe('bulkCreate', () => {
    it('returns empty array for empty input', async () => {
      const result = await productsApi.bulkCreate([]);
      expect(result).toEqual([]);
    });

    it('inserts multiple products', async () => {
      builder._resolveValue = { data: [{ id: 20, name: 'B1' }, { id: 21, name: 'B2' }], error: null };
      const result = await productsApi.bulkCreate([{ name: 'B1' }, { name: 'B2' }]);
      expect(result).toHaveLength(2);
    });
  });

  describe('product mapping', () => {
    it('maps offer fields correctly', async () => {
      builder._resolveValue = { data: { id: 30, name: 'Offer', offer_price: 8, price: 10, is_offer: true }, error: null };
      const result = await productsApi.get(30);
      expect(result.offerPrice).toBe(8);
      expect(result.isOffer).toBe(true);
    });

    it('handles stock_quantity and unit', async () => {
      builder._resolveValue = { data: { id: 40, name: 'Unit', price: 5, stock_quantity: 100, unit: 'kg', image_url: '' }, error: null };
      const result = await productsApi.get(40);
      expect(result.stock_quantity).toBe(100);
      expect(result.unit).toBe('kg');
    });
  });
});
