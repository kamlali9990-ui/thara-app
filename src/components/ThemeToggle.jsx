import { useState, useRef, useEffect, useMemo } from 'react';
import { THEMES } from '../utils/theme';

const lightThemes = ['light', 'pearl-white'];

export default function ThemeToggle({ currentTheme, onThemeChange, className = '', inline = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const themeColor = useMemo(() => {
    const t = THEMES.find(t => t.id === currentTheme);
    return t ? t.color : '#f0f0f0';
  }, [currentTheme]);

  const isLight = lightThemes.includes(currentTheme);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const containerStyle = inline ? {} : {
    position: 'fixed',
    bottom: '90px',
    right: '16px',
    zIndex: 9000,
    display: 'flex',
    flexDirection: 'column-reverse',
    alignItems: 'center',
    gap: '10px',
  };

  return (
    <div ref={ref} className="theme-toggle-root" style={containerStyle}>
      {open && (
        <div className="theme-menu">
          {THEMES.map(t => (
            <div key={t.id}
              className={`theme-option ${currentTheme === t.id ? 'active' : ''}`}
              onClick={() => { onThemeChange(t.id); setOpen(false); }}>
              <span className="theme-dot" style={{ backgroundColor: t.color }} />
              <span>{t.name}</span>
              {currentTheme === t.id && <span className="theme-check">✓</span>}
            </div>
          ))}
        </div>
      )}
      <button className={`theme-toggle-btn ${className}`}
        onClick={() => setOpen(o => !o)}
        title="تغيير المظهر"
        aria-label="تغيير المظهر"
        style={{ color: themeColor }}>
        {isLight ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>
    </div>
  );
}
