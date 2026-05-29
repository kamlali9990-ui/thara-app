const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

const oldHeader = `const AppHeader = memo(({ cartCount, user, onCartOpen, tab, searchQuery, setSearchQuery }) => (
  <header className="app-header">
    <div className="app-header-inner">
      <div className="app-logo">
        <img src={\`\${BASE}LOGO.jpg\`} alt="" className="app-logo-img"
          onError={(e) => { e.target.src = imgFallback(36, 36, '#127443', '#FFFFFF', 'ث'); }} />
        <div>
          <div className="app-title">ثراء الشرق ون</div>
          <div className="app-subtitle">توصيل الخفجي</div>
        </div>
      </div>
      <div className="app-header-actions">
        {user ? <span className="app-user-badge">{user.email?.split('@')[0]}</span>
          : <Link to="/login" className="app-login-link">دخول</Link>}
        <button className="app-cart-btn" onClick={onCartOpen}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          {cartCount > 0 && <span className="app-cart-badge">{cartCount}</span>}
        </button>
      </div>
    </div>
    {tab === 'home' && (
      <div className="app-search">
        <svg className="app-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input type="text" className="app-search-input" placeholder="ابحث عن المنتجات..." value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)} />
      </div>
    )}
  </header>
));`;

const newHeader = `const AppHeader = memo(({ tab, searchQuery, setSearchQuery }) => (
  <header className="app-header">
    <div className="app-header-inner">
      <button className="app-header-icon-btn">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
      </button>

      <div className="app-logo app-logo-centered">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="app-logo-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
        <div className="app-logo-text-group">
          <div className="app-logo-thsm">THSM1</div>
          <div className="app-title">ثراء الشرق</div>
          <div className="app-subtitle">Thara Al Sharq One Markets</div>
        </div>
      </div>

      <button className="app-header-icon-btn">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
      </button>
    </div>
    {tab === 'home' && (
      <div className="app-search app-search-bottom">
        <svg className="app-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input type="text" className="app-search-input" placeholder="ابحث عن منتج..." value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)} />
      </div>
    )}
  </header>
));`;

const oldTabbar = `const AppTabbar = memo(({ tab, onTabChange, cartCount }) => (
  <nav className="app-tabbar">
    <button className={\`app-tab \${tab === 'home' ? 'active' : ''}\`} onClick={() => onTabChange('home')}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill={tab === 'home' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      <span className="app-tab-label">الرئيسية</span>
    </button>
    <button className={\`app-tab \${tab === 'orders' ? 'active' : ''}\`} onClick={() => onTabChange('orders')}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill={tab === 'orders' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
      <span className="app-tab-label">طلباتي</span>
    </button>
    <button className={\`app-tab \${tab === 'account' ? 'active' : ''}\`} onClick={() => onTabChange('account')}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill={tab === 'account' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      <span className="app-tab-label">حسابي</span>
    </button>
  </nav>
));`;

const newTabbar = `const AppTabbar = memo(({ tab, onTabChange, cartCount, onCartOpen }) => (
  <nav className="app-tabbar">
    <button className={\`app-tab \${tab === 'home' ? 'active' : ''}\`} onClick={() => onTabChange('home')}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill={tab === 'home' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      <span className="app-tab-label">الرئيسية</span>
    </button>
    <button className={\`app-tab \${tab === 'categories' ? 'active' : ''}\`} onClick={() => { onTabChange('home'); onTabChange('categories'); }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill={tab === 'categories' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
      <span className="app-tab-label">الأقسام</span>
    </button>
    <button className={\`app-tab \${tab === 'offers' ? 'active' : ''}\`} onClick={() => { onTabChange('home'); onTabChange('offers'); }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill={tab === 'offers' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
      <span className="app-tab-label">العروض</span>
    </button>
    <button className="app-tab" onClick={onCartOpen}>
      <div className="app-tab-icon-wrap">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        {cartCount > 0 && <span className="app-cart-badge">{cartCount}</span>}
      </div>
      <span className="app-tab-label">السلة</span>
    </button>
    <button className={\`app-tab \${tab === 'account' ? 'active' : ''}\`} onClick={() => onTabChange('account')}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill={tab === 'account' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      <span className="app-tab-label">حسابي</span>
    </button>
  </nav>
));`;

content = content.replace(oldHeader.replace(/\r/g, ''), newHeader.replace(/\r/g, ''));
content = content.replace(oldTabbar.replace(/\r/g, ''), newTabbar.replace(/\r/g, ''));
content = content.replace(
  '<AppHeader cartCount={cartCount} user={user} logout={logout}\r\n        onCartOpen={() => setIsCartOpen(true)} tab={tab} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />',
  '<AppHeader tab={tab} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />'
).replace(
  '<AppHeader cartCount={cartCount} user={user} logout={logout}\n        onCartOpen={() => setIsCartOpen(true)} tab={tab} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />',
  '<AppHeader tab={tab} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />'
);

fs.writeFileSync('src/App.jsx', content);
console.log('App.jsx updated');
