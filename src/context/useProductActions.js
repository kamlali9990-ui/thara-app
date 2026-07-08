import { useCallback } from 'react';
import { productsApi } from '../supabase/products.js';
import { showToast } from '../components/Toast.jsx';

export function useProductActions({ hasSupabase, supabaseReady, setProducts }) {
  const addProduct = useCallback(async (product) => {
    let newProduct = { ...product };
    if (hasSupabase && supabaseReady) {
      try {
        const created = await productsApi.create(product);
        newProduct = created;
      } catch (err) {
        showToast('فشل إضافة المنتج لقاعدة البيانات: ' + (err.message || err), 'error');
        throw err;
      }
    } else {
      newProduct.id = Date.now().toString();
    }
    setProducts(prev => [newProduct, ...prev]);
    return newProduct;
  }, [hasSupabase, supabaseReady, setProducts]);

  const updateProduct = useCallback(async (id, updated) => {
    if (hasSupabase && supabaseReady) {
      try {
        await productsApi.update(id, updated);
      } catch (err) {
        showToast('فشل تعديل المنتج في قاعدة البيانات: ' + (err.message || err), 'error');
        throw err;
      }
    }
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
  }, [hasSupabase, supabaseReady, setProducts]);

  const deleteProduct = useCallback(async (id) => {
    if (hasSupabase && supabaseReady) {
      try {
        await productsApi.remove(id);
      } catch (err) {
        showToast('فشل حذف المنتج من قاعدة البيانات: ' + (err.message || err), 'error');
        throw err;
      }
    }
    setProducts(prev => prev.filter(p => p.id !== id));
  }, [hasSupabase, supabaseReady, setProducts]);

  const bulkImportProducts = useCallback(async (products) => {
    if (!products.length) return [];
    if (hasSupabase && supabaseReady) {
      try {
        const created = await productsApi.bulkCreate(products);
        setProducts(prev => [...created, ...prev]);
        return created;
      } catch (err) {
        showToast('فشل استيراد المنتجات لقاعدة البيانات: ' + (err.message || err), 'error');
        throw err;
      }
    }
    const localProducts = products.map(p => ({ ...p, id: Date.now().toString() + Math.random() }));
    setProducts(prev => [...localProducts, ...prev]);
    return localProducts;
  }, [hasSupabase, supabaseReady, setProducts]);

  return { addProduct, updateProduct, deleteProduct, bulkImportProducts };
}
