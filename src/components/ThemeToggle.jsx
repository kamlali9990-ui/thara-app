import { useState, useRef, useEffect } from 'react';
import { THEMES } from '../utils/theme';

export default function ThemeToggle({ currentTheme, onThemeChange, className = '', inline = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

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
        aria-label="تغيير المظهر">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor"/>
          <circle cx="17.5" cy="10.5" r="0.5" fill="currentColor"/>
          <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor"/>
          <circle cx="6.5" cy="12.5" r="0.5" fill="currentColor"/>
          <circle cx="12.5" cy="12.5" r="0.5" fill="currentColor"/>
          <circle cx="16.5" cy="14.5" r="0.5" fill="currentColor"/>
          <circle cx="10.5" cy="16.5" r="0.5" fill="currentColor"/>
          <circle cx="7.5" cy="17.5" r="0.5" fill="currentColor"/>
          <circle cx="14.5" cy="18.5" r="0.5" fill="currentColor"/>
          <circle cx="19.5" cy="13.5" r="0.5" fill="currentColor"/>
        </svg>
      </button>
    </div>
  );
}
