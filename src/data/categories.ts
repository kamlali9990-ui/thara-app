import { useState, useEffect } from 'react';
import { BASE } from '../utils/constants';

const CAT_IMG_PREFIX = 'thara_cat_img_';

export interface SectionCat {
  name: string;
  img: string;
  fallback: string;
  color: string;
  desc: string;
}

export const sectionCats: SectionCat[] = [
  { name: 'مواد غذائية', img: `${BASE}cat_canned.jpg`, fallback: '🥫', color: '#10b981', desc: 'معلبات ومواد غذائية أساسية لأطباقك اليومية' },
  { name: 'منظفات', img: `${BASE}cat_vegetables.jpg`, fallback: '🧹', color: '#fbbf24', desc: 'منظفات ومستلزمات العناية بالمنزل ونظافته' },
  { name: 'إلكترونيات', img: `${BASE}الكترونيات.jpg`, fallback: '📱', color: '#3b82f6', desc: 'أجهزة ذكية وإلكترونيات استهلاكية حديثة' },
  { name: 'أواني', img: `${BASE}اواني.jpg`, fallback: '🍳', color: '#ec4899', desc: 'أدوات ومعدات مطبخية متكاملة لطهي أسهل' },
  { name: 'مكسرات وبهارات', img: `${BASE}cat_canned.jpg`, fallback: '🥜', color: '#8b5cf6', desc: 'بهارات طازجة ومكسرات منوعة وعالية الجودة' },
  { name: 'خضروات وفواكه', img: `${BASE}Getty.webp`, fallback: '🥦', color: '#22c55e', desc: 'خضار وفواكه طازجة يومية من المزرعة إليك' },
  { name: 'ألعاب', img: `${BASE}العاب.jpg`, fallback: '🎮', color: '#f43f5e', desc: 'ألعاب أطفال ممتعة ومحفزة لجميع الأعمار' },
  { name: 'مجموعة الأصناف', img: `${BASE}cat_dairy.jpg`, fallback: '📦', color: '#64748b', desc: 'تشكيلة واسعة ومختلفة من المنتجات المتنوعة' },
  { name: 'ملابس', img: `${BASE}ملابس.jpg`, fallback: '👕', color: '#06b6d4', desc: 'ملابس رجالية ونسائية وأطفال بجودة منافسة' },
  { name: 'مواد البناء', img: `${BASE}cat_hardware.jpg`, fallback: '🔧', color: '#f97316', desc: 'أدوات بناء ومعدات صيانة منزلية أساسية' },
  { name: 'العطور', img: `${BASE}العطور.jpg`, fallback: '🧴', color: '#a855f7', desc: 'عطور ومستحضرات تجميل راقية ومتنوعة' }
];

export const specialSections: SectionCat[] = [
  { name: 'العروض', img: `${BASE}123.jpg`, fallback: '🔥', color: '#ef4444', desc: 'العروض المميزة اليومية' },
  { name: 'تشكيلة مميزة', img: `${BASE}123.jpg`, fallback: '⭐', color: '#f59e0b', desc: 'منتجات مختارة بعناية' },
];

export function getCategoryImg(cat: SectionCat): string {
  if (!cat) return '';
  try {
    const stored = localStorage.getItem(CAT_IMG_PREFIX + cat.name);
    if (stored) {
      const ver = localStorage.getItem(CAT_IMG_PREFIX + 'ver_' + cat.name);
      return ver ? stored + (stored.includes('?') ? '&' : '?') + 'v=' + ver : stored;
    }
  } catch {}
  return cat.img;
}

export function useCategoryImg(cat: SectionCat | null): string {
  const [url, setUrl] = useState(() => cat ? getCategoryImg(cat) : '');
  useEffect(() => {
    if (!cat) { setUrl(''); return; }
    const handler = () => setUrl(getCategoryImg(cat));
    window.addEventListener('thara:cat-img-changed', handler);
    return () => window.removeEventListener('thara:cat-img-changed', handler);
  }, [cat?.name]);
  return url;
}
