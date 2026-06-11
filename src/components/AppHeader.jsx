import { memo } from 'react';
import { BASE, imgFallback, logoPath, logoPathDark } from '../utils/constants';
import ThemeToggle from './ThemeToggle';

const AppHeader = memo(({ cartCount, user, onCartOpen, tab, searchQuery, setSearchQuery, unreadNotifs, onMenuClick, onNotifClick, theme, onThemeChange, siteStats }) => (
  <header className="app-header-new">
    <div className="app-header-new-inner">
      <button className="app-header-icon-btn" onClick={onMenuClick} aria-label="القائمة">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
      </button>

      <div className="app-header-side-left">
        <ThemeToggle currentTheme={theme} onThemeChange={onThemeChange} inline />
      </div>

      <div className="app-logo-new">
        <img src={theme === 'dark' ? logoPathDark : logoPath} alt="أسواق ثراء الشرق ون" className={`app-logo-img-new ${theme === 'dark' ? 'logo-dark' : 'logo-light'}`} onError={(e) => { e.target.src = imgFallback(90, 90, '#127443', theme === 'dark' ? '#020f08' : '#ffffff', 'ث'); }} />
      </div>

      <div className="app-header-actions">
        {siteStats && (
          <div className="app-header-stats">
            <span className="app-header-stat-item">👥 {siteStats.member_count}</span>
            <span className="app-header-stat-divider">|</span>
            <span className="app-header-stat-item">👁️ {siteStats.visit_count}</span>
          </div>
        )}
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
