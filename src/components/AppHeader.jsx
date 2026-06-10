import { memo } from 'react';
import { BASE, imgFallback, logoPath, logoPathDark } from '../utils/constants';

const AppHeader = memo(({ cartCount, user, onCartOpen, tab, searchQuery, setSearchQuery, unreadNotifs, onMenuClick, onNotifClick, theme, onThemeToggle }) => (
  <header className="app-header-new">
    <div className="app-header-new-inner">
      <button className="app-header-icon-btn" onClick={onMenuClick} aria-label="القائمة">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
      </button>

      <div className="app-logo-new">
        <img src={theme === 'dark' ? logoPathDark : logoPath} alt="أسواق ثراء الشرق ون" className={`app-logo-img-new ${theme === 'dark' ? 'logo-dark' : 'logo-light'}`} onError={(e) => { e.target.src = imgFallback(90, 90, '#127443', theme === 'dark' ? '#020f08' : '#ffffff', 'ث'); }} />
      </div>

      <div className="app-header-actions">
        <button className="app-header-icon-btn" onClick={onThemeToggle} aria-label="تغيير المظهر" style={{ color: 'var(--primary)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {theme === 'light' ? (
              <><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></>
            ) : (
              <><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></>
            )}
          </svg>
        </button>
        <button className="app-header-icon-btn app-header-notif-btn" onClick={onNotifClick} aria-label="الإشعارات">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          {unreadNotifs > 0 && (
            <span className="app-header-badge">{unreadNotifs > 9 ? '9+' : unreadNotifs}</span>
          )}
        </button>
      </div>
    </div>
  </header>
));

export default AppHeader;
