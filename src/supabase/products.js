import { supabase } from './client';

export const productsApi = {
  async list() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(mapProduct);
  },

  async get(id) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return mapProduct(data);
  },

  async create(product) {
    const { data, error } = await supabase
      .from('products')
      .insert([product])
      .select()
      .single();
    if (error) throw error;
    return mapProduct(data);
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapProduct(data);
  },

  async remove(id) {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

function mapProduct(p) {
  return {
    id: String(p.id),
    name: p.name,
    category: p.category,
    price: Number(p.price),
    offerPrice: p.offer_price ? Number(p.offer_price) : undefined,
    isOffer: p.is_offer || false,
    imageUrl: p.image_url,
    stock_quantity: p.stock_quantity,
    unit: p.unit
  };
}
