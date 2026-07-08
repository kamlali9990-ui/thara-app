import { supabase } from './client';

interface ProductRow {
  id: number;
  name: string;
  category?: string;
  price: number;
  offer_price?: number | null;
  is_offer?: boolean;
  image_url?: string;
  stock_quantity: number;
  unit?: string;
}

interface MappedProduct {
  id: string;
  name: string;
  category?: string;
  price: number;
  offerPrice?: number;
  isOffer: boolean;
  imageUrl?: string;
  stock_quantity: number;
  unit?: string;
}

interface ProductInput {
  name?: string;
  category?: string;
  price?: number;
  offerPrice?: number;
  offer_price?: number;
  isOffer?: boolean;
  is_offer?: boolean;
  imageUrl?: string;
  image_url?: string;
  stock_quantity?: number;
  unit?: string;
}

function toProductRow(product: ProductInput): Record<string, any> {
  const row: Record<string, any> = {};
  if ('name' in product) row.name = product.name;
  if ('category' in product) row.category = product.category;
  if ('price' in product) row.price = Number(product.price) || 0;
  if ('offerPrice' in product) row.offer_price = product.offerPrice || null;
  if ('offer_price' in product) row.offer_price = product.offer_price || null;
  if ('isOffer' in product) row.is_offer = !!product.isOffer;
  if ('is_offer' in product) row.is_offer = !!product.is_offer;
  if ('imageUrl' in product) row.image_url = product.imageUrl;
  if ('image_url' in product) row.image_url = product.image_url;
  if ('stock_quantity' in product) row.stock_quantity = Number(product.stock_quantity) || 0;
  if ('unit' in product) row.unit = product.unit;
  return row;
}

export function mapProduct(p: ProductRow): MappedProduct {
  return {
    id: String(p.id),
    name: p.name,
    category: p.category,
    price: Number(p.price),
    offerPrice: p.offer_price != null ? Number(p.offer_price) : undefined,
    isOffer: p.is_offer || false,
    imageUrl: p.image_url,
    stock_quantity: p.stock_quantity ?? 0,
    unit: p.unit
  };
}

export const productsApi = {
  async list({ limit, offset }: { limit?: number; offset?: number } = {}): Promise<MappedProduct[]> {
    if (limit != null) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('id', { ascending: true })
        .range(offset ?? 0, (offset ?? 0) + limit - 1);
      if (error) throw error;
      return (data || []).map(mapProduct);
    }
    const PAGE_SIZE = 1000;
    let all: ProductRow[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      all = all.concat(data);
      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
    return all.map(mapProduct);
  },

  async get(id: number): Promise<MappedProduct> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return mapProduct(data);
  },

  async create(product: ProductInput): Promise<MappedProduct> {
    const { data, error } = await supabase
      .from('products')
      .insert([toProductRow(product)])
      .select()
      .single();
    if (error) throw error;
    return mapProduct(data);
  },

  async update(id: number, updates: ProductInput): Promise<MappedProduct> {
    const { data, error } = await supabase
      .from('products')
      .update(toProductRow(updates))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapProduct(data);
  },

  async remove(id: number): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async bulkCreate(products: ProductInput[]): Promise<MappedProduct[]> {
    if (!products.length) return [];
    const rows = products.map(p => toProductRow(p));
    const { data, error } = await supabase
      .from('products')
      .insert(rows)
      .select();
    if (error) throw error;
    return (data || []).map(mapProduct);
  },

  subscribe(onChange: (payload: any) => void) {
    try {
      return supabase
        .channel('products-stream')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
          onChange(payload);
        })
        .subscribe();
    } catch (e) {
      console.warn('products subscribe failed:', e);
      return { unsubscribe: () => {} };
    }
  }
};
