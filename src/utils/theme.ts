import { useState, useEffect } from 'react';

export const THEMES: { id: string; name: string; color: string; metaColor: string }[] = [
  { id: 'emerald-light', name: 'زمردي فاتح', color: '#059669', metaColor: '#ecfdf5' },
  { id: 'green-dark', name: 'أخضر داكن', color: '#10b981', metaColor: '#020f08' },
  { id: 'navy', name: 'كحلي', color: '#1e40af', metaColor: '#1e3a5f' },
  { id: 'orange', name: 'برتقالي', color: '#ea580c', metaColor: '#fff7ed' },
  { id: 'pink', name: 'وردي', color: '#db2777', metaColor: '#fdf2f8' },
];

export function useTheme() {
  const [theme, setTheme] = useState<string>(() => {
    try { return localStorage.getItem('theme') || 'emerald-light'; }
    catch { return 'emerald-light'; }
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
