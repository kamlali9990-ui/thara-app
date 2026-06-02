import { memo } from 'react';

const AppTabbar = memo(({ tab, onTabChange, cartCount, onCartOpen }) => (
  <nav className="app-tabbar">
    <button className={`app-tab ${tab === 'home' ? 'active' : ''}`} onClick={() => onTabChange('home')}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill={tab === 'home' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      <span className="app-tab-label">الرئيسية</span>
    </button>
    <button className={`app-tab ${tab === 'categories' ? 'active' : ''}`} onClick={() => onTabChange('categories')}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill={tab === 'categories' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
      <span className="app-tab-label">الأقسام</span>
    </button>
    <button className={`app-tab ${tab === 'orders' ? 'active' : ''}`} onClick={() => onTabChange('orders')}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill={tab === 'orders' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
      <span className="app-tab-label">طلباتي</span>
    </button>
    <button className="app-tab" onClick={onCartOpen}>
      <div className="app-tab-icon-wrap">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        {cartCount > 0 && <span className="app-cart-badge">{cartCount}</span>}
      </div>
      <span className="app-tab-label">السلة</span>
    </button>
    <button className={`app-tab ${tab === 'account' ? 'active' : ''}`} onClick={() => onTabChange('account')}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill={tab === 'account' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      <span className="app-tab-label">حسابي</span>
    </button>
  </nav>
));

export default AppTabbar;
