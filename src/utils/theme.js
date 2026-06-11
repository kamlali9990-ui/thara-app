import { useState, useEffect } from 'react';

export const THEMES = [
  { id: 'light', name: 'فاتح', color: '#f0f0f0', metaColor: '#f6f7f9' },
  { id: 'pearl-white', name: 'لؤلؤي', color: '#c9b097', metaColor: '#f0eae1' },
  { id: 'emerald', name: 'زمردي', color: '#059669', metaColor: '#022c1a' },
  { id: 'midnight', name: 'ليلي', color: '#38bdf8', metaColor: '#020617' },
  { id: 'dark', name: 'داكن', color: '#6366f1', metaColor: '#0c1220' },
];

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('theme') || 'light'; }
    catch { return 'light'; }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    const t = THEMES.find(t => t.id === theme) || THEMES[0];
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = t.metaColor;
  }, [theme]);

  return { theme, setTheme };
}
