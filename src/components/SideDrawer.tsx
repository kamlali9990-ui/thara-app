import { memo, useState } from 'react';
import { BASE, imgFallback, WHATSAPP_NUM, PHONE, EMAIL_1, SNAPCHAT, logoPath, logoPathDark } from '../utils/constants';
import TermsOfServiceModal from './TermsOfServiceModal';
import ThemeToggle from './ThemeToggle';
import InstallGuide from './InstallGuide';

const SideDrawer = memo(({ isOpen, onClose, user, logout, tab, selectedCategory, onTabChange, setSelectedCategory, theme, onThemeChange }: {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  logout: () => void;
  tab: string;
  selectedCategory: string | null;
  onTabChange: (tab: string) => void;
  setSelectedCategory: (cat: string | null) => void;
  theme: string;
  onThemeChange: (theme: string) => void;
}) => {
  const [showTerms, setShowTerms] = useState(false);
  return (
  <>
    <div className={`side-drawer-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
    <div className={`side-drawer ${isOpen ? 'open' : ''}`}>
      <div className="side-drawer-header">
        <div className="side-drawer-logo-wrap">
          <img src={theme === 'dark' ? logoPathDark : logoPath} alt="ثرا" className={`side-drawer-logo ${theme === 'dark' ? 'logo-dark' : 'logo-light'}`} onError={(e: any) => { e.target.src = imgFallback(80, 80, '#127443', theme === 'dark' ? '#020f08' : '#ffffff', 'ث'); }} />
        </div>
        <button className="side-drawer-close" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div className="side-drawer-items">
        <button className={`side-drawer-item ${tab === 'home' && !selectedCategory ? 'active' : ''}`} onClick={() => { onTabChange('home'); setSelectedCategory(null); onClose(); }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span>الرئيسية</span>
        </button>
        <button className={`side-drawer-item ${selectedCategory ? 'active' : ''}`} onClick={() => { onTabChange('categories'); onClose(); }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
          <span>تصفح الأقسام</span>
        </button>
        <button className="side-drawer-item" onClick={() => { onTabChange('home'); setSelectedCategory('العروض'); onClose(); }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <span>العروض</span>
        </button>
        <button className={`side-drawer-item ${tab === 'orders' ? 'active' : ''}`} onClick={() => { onTabChange('orders'); onClose(); }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          <span>طلباتي</span>
        </button>
        <div className="side-drawer-divider" />
        <div className="side-drawer-item" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <ThemeToggle currentTheme={theme} onThemeChange={onThemeChange} inline />
        </div>
        <div className="side-drawer-divider" />
        <button className="side-drawer-item" onClick={() => { onClose(); if (navigator.share) { navigator.share({ title: 'أسواق ثراء الشرق ون', text: '🛒 أسواق ثراء الشرق ون — توصيل طلبات السوبرماركت لباب بيتك في الخفجي\n🚀 أهل الخفجي يستاهلون أكثر\nhttps://tharasharqone.com', url: 'https://tharasharqone.com' }).catch(() => window.open('/qr-code.html', '_blank')); } else { window.open('/qr-code.html', '_blank'); } }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          <span>مشاركة التطبيق</span>
        </button>
        <div className="side-drawer-item" style={{ cursor: 'pointer' }} onClick={() => { onClose(); window.dispatchEvent(new CustomEvent('show-pwa-install-prompt')); }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>تثبيت التطبيق</span>
        </div>
        <a href={`${BASE}thara-app.apk`} download className="side-drawer-item" style={{ textDecoration: 'none' }} onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>📦 تحميل تطبيق أندرويد APK</span>
        </a>
        <div className="side-drawer-install-guide-wrap">
          <InstallGuide />
        </div>
        <button className="side-drawer-item" onClick={() => setShowTerms(true)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          <span>اتفاقية المستخدم</span>
        </button>
        <div className="side-drawer-divider" />
        <div className="side-drawer-contact-label">وسائل التواصل</div>
        <div className="side-drawer-contacts">
          <a href={`https://wa.me/${WHATSAPP_NUM}`} target="_blank" rel="noopener noreferrer" className="side-drawer-contact-item" title="واتساب">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
            <span className="side-drawer-contact-label-text">واتساب</span>
          </a>
          <a href={`tel:${PHONE}`} className="side-drawer-contact-item" title="اتصال">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            <span className="side-drawer-contact-label-text">اتصال</span>
          </a>
          <a href={`mailto:${EMAIL_1}`} className="side-drawer-contact-item" title="بريد">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            <span className="side-drawer-contact-label-text">بريد</span>
          </a>
          <a href={`https://www.snapchat.com/add/${SNAPCHAT}`} target="_blank" rel="noopener noreferrer" className="side-drawer-contact-item" title="سناب شات">
            <svg width="22" height="22" viewBox="0 0 512 512" fill="currentColor"><path d="M510.846 392.673c-5.211 12.157-27.239 21.089-67.36 27.318-2.064 2.786-3.775 14.686-6.507 23.956-1.625 5.566-5.623 8.869-12.128 8.869l-.297-.005c-9.395 0-19.203-4.323-38.852-4.323-26.521 0-35.662 6.043-56.254 20.588-21.832 15.438-42.771 28.764-74.027 27.399-31.646 2.334-58.025-16.908-72.871-27.404-20.714-14.643-29.828-20.582-56.241-20.582-18.864 0-30.736 4.72-38.852 4.72-8.073 0-11.213-4.922-12.422-9.04-2.703-9.189-4.404-21.263-6.523-24.13-20.679-3.209-67.31-11.344-68.498-32.15a10.627 10.627 0 0 1 8.877-11.069c69.583-11.455 100.924-82.901 102.227-85.934.074-.176.155-.344.237-.515 3.713-7.537 4.544-13.849 2.463-18.753-5.05-11.896-26.872-16.164-36.053-19.796-23.715-9.366-27.015-20.128-25.612-27.504 2.437-12.836 21.725-20.735 33.002-15.453 8.919 4.181 16.843 6.297 23.547 6.297 5.022 0 8.212-1.204 9.96-2.171-2.043-35.936-7.101-87.29 5.687-115.969C158.122 21.304 229.705 15.42 250.826 15.42c.944 0 9.141-.089 10.11-.089 52.148 0 102.254 26.78 126.723 81.643 12.777 28.65 7.749 79.792 5.695 116.009 1.582.872 4.357 1.942 8.599 2.139 6.397-.286 13.815-2.389 22.069-6.257 6.085-2.846 14.406-2.461 20.48.058l.029.01c9.476 3.385 15.439 10.215 15.589 17.87.184 9.747-8.522 18.165-25.878 25.018-2.118.835-4.694 1.655-7.434 2.525-9.797 3.106-24.6 7.805-28.616 17.271-2.079 4.904-1.256 11.211 2.46 18.748.087.168.166.342.239.515 1.301 3.03 32.615 74.46 102.23 85.934 6.427 1.058 11.163 7.877 7.725 15.859z"/></svg>
            <span className="side-drawer-contact-label-text">سناب</span>
          </a>
        </div>
      </div>
      {user && (
        <div className="side-drawer-footer">
          <button className="side-drawer-logout" onClick={() => { logout(); onClose(); }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>تسجيل الخروج</span>
          </button>
        </div>
      )}
    </div>
      <TermsOfServiceModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
    </>
  );
});

export default SideDrawer;
