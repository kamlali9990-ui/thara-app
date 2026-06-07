import { memo } from 'react';

const STEPS = [
  {
    num: 1,
    label: 'افتح متصفح سفاري',
    desc: 'عشان تطبيق ثراء يشتغل بكامل ميزاته، لازم تستخدم Safari',
    svg: <svg viewBox="0 0 48 48" fill="none"><rect x="6" y="2" width="36" height="44" rx="6" fill="#007AFF" opacity="0.12"/><rect x="8" y="4" width="32" height="40" rx="5" fill="#007AFF" opacity="0.2"/><rect x="10" y="6" width="28" height="36" rx="4" fill="#007AFF"/><rect x="18" y="38" width="12" height="2" rx="1" fill="white" opacity="0.6"/><circle cx="24" cy="16" r="3" fill="white"/><rect x="18" y="20" width="12" height="12" rx="2" fill="white" opacity="0.8"/><rect x="21" y="24" width="6" height="6" rx="1" fill="#007AFF"/></svg>,
  },
  {
    num: 2,
    label: 'ادخل على موقعنا',
    desc: 'اكتب tharasharqone.com في شريط العنوان',
    svg: <svg viewBox="0 0 48 48" fill="none"><rect x="6" y="2" width="36" height="44" rx="6" fill="#127443" opacity="0.08"/><rect x="8" y="4" width="32" height="40" rx="5" fill="#127443" opacity="0.12"/><rect x="10" y="6" width="28" height="36" rx="4" fill="white"/><rect x="10" y="6" width="28" height="10" rx="4" fill="#127443"/><text x="24" y="12" text-anchor="middle" fill="white" font-size="4" font-weight="700" font-family="sans-serif">🛒 ثراء</text><line x1="14" y1="22" x2="34" y2="22" stroke="#e2e8f0" stroke-width="1.5" stroke-linecap="round"/><line x1="14" y1="27" x2="30" y2="27" stroke="#e2e8f0" stroke-width="1.5" stroke-linecap="round"/><line x1="14" y1="32" x2="26" y2="32" stroke="#e2e8f0" stroke-width="1.5" stroke-linecap="round"/></svg>,
  },
  {
    num: 3,
    label: 'اضغط زر المشاركة',
    desc: 'الزر المستطيل مع السهم لأعلى 🔽 في شريط السفاري السفلي',
    svg: <svg viewBox="0 0 48 48" fill="none"><rect y="8" width="48" height="40" rx="6" fill="#e2e8f0"/><rect x="4" y="12" width="40" height="32" rx="4" fill="white"/><rect x="4" y="12" width="40" height="8" rx="4" fill="#127443" opacity="0.9"/><text x="24" y="17.5" text-anchor="middle" fill="white" font-size="4" font-weight="700" font-family="sans-serif">ثـراء الـشـرق و ن</text><line x1="8" y1="26" x2="40" y2="26" stroke="#e2e8f0" stroke-width="1.5"/><line x1="8" y1="32" x2="36" y2="32" stroke="#e2e8f0" stroke-width="1.5"/><line x1="8" y1="38" x2="32" y2="38" stroke="#e2e8f0" stroke-width="1.5"/><rect x="34" y="4" width="10" height="10" rx="2" fill="#007AFF"/><path d="M39 6v6M36 9h6" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>,
  },
  {
    num: 4,
    label: 'اختر "إضافة للشاشة الرئيسية"',
    desc: 'الاسم راح يكون ثراء الشرق ون — تقدر تغيره',
    svg: <svg viewBox="0 0 48 48" fill="none"><rect x="2" y="2" width="44" height="44" rx="10" fill="#127443" opacity="0.06"/><rect x="2" y="2" width="20" height="20" rx="5" fill="#127443" opacity="0.15"/><rect x="4" y="4" width="16" height="16" rx="4" fill="#127443"/><path d="M12 8v8M8 12h8" stroke="white" stroke-width="1.5" stroke-linecap="round"/><rect x="26" y="2" width="20" height="20" rx="5" fill="#127443" opacity="0.15"/><rect x="28" y="4" width="16" height="16" rx="4" fill="#127443"/><path d="M36 8v8M32 12h8" stroke="white" stroke-width="1.5" stroke-linecap="round"/><rect x="2" y="26" width="20" height="20" rx="5" fill="#f59e0b" opacity="0.12"/><rect x="4" y="28" width="16" height="16" rx="4" fill="#f59e0b"/><path d="M12 32v8M8 36h8" stroke="white" stroke-width="1.5" stroke-linecap="round"/><rect x="26" y="26" width="20" height="20" rx="5" fill="#127443" opacity="0.15"/><rect x="28" y="28" width="16" height="16" rx="4" fill="#127443"/><text x="36" y="39" text-anchor="middle" fill="white" font-size="5" font-weight="800" font-family="sans-serif">+</text></svg>,
  },
  {
    num: 5,
    label: 'اضغط "إضافة"',
    desc: 'فوق من الزاوية اليمنى — خلاص التطبيق بينزّل على شاشتك 🎉',
    svg: <svg viewBox="0 0 48 48" fill="none"><rect x="2" y="2" width="44" height="44" rx="8" fill="#22c55e" opacity="0.08"/><rect x="8" y="10" width="32" height="6" rx="3" fill="#127443"/><rect x="8" y="20" width="32" height="6" rx="3" fill="#e2e8f0"/><rect x="8" y="30" width="32" height="6" rx="3" fill="#e2e8f0"/><rect x="34" y="10" width="6" height="6" rx="2" fill="#127443"/><path d="M37 11v4M35 13h4" stroke="white" stroke-width="1.2" stroke-linecap="round"/></svg>,
  },
  {
    num: 6,
    label: 'تمّ! افتح التطبيق من الشاشة الرئيسية',
    desc: 'إضغط على أيقونة ثراء — صار عندك تطبيق كامل بدون متصفح 🚀',
    svg: <svg viewBox="0 0 48 48" fill="none"><rect x="2" y="2" width="44" height="44" rx="10" fill="#127443" opacity="0.08"/><rect x="4" y="4" width="40" height="40" rx="8" fill="white"/><rect x="4" y="4" width="40" height="12" rx="8" fill="#127443"/><text x="24" y="12" text-anchor="middle" fill="white" font-size="5" font-weight="800" font-family="sans-serif">ثـراء</text><line x1="8" y1="22" x2="40" y2="22" stroke="#e2e8f0" stroke-width="1.5"/><line x1="8" y1="28" x2="36" y2="28" stroke="#e2e8f0" stroke-width="1.5"/><rect x="10" y="34" width="28" height="6" rx="3" fill="#127443" opacity="0.15"/><line x1="10" y1="37" x2="38" y2="37" stroke="#127443" stroke-width="1.5" stroke-dasharray="3" opacity="0.3"/></svg>,
  },
];

const InstallGuide = memo(({ onClose }) => {
  return (
    <div style={{
      maxWidth: 480, margin: '0 auto', padding: '0 0 1rem',
      fontFamily: "'Cairo', 'Tajawal', sans-serif",
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #127443, #1a9e5a, #127443)',
        borderRadius: 20, padding: '1.25rem 1rem', marginBottom: '0.75rem',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        {onClose && (
          <button onClick={onClose} style={{
            position: 'absolute', top: 8, left: 8, width: 28, height: 28,
            borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.2)',
            color: 'white', fontSize: 14, cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        )}
        <div style={{
          width: 48, height: 48, background: 'rgba(255,255,255,0.2)',
          borderRadius: 14, display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 0.6rem', fontSize: '1.4rem',
          border: '1px solid rgba(255,255,255,0.15)',
        }}>📱</div>
        <h2 style={{ margin: 0, color: 'white', fontSize: '1.3rem', fontWeight: 800 }}>
          كيف تثبّت التطبيق؟
        </h2>
        <p style={{ margin: '0.2rem 0 0', color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>
          على الآيفون — 6 خطوات بس!
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {STEPS.map((s) => (
          <div key={s.num} style={{
            background: 'white', borderRadius: 16, padding: '0.85rem 1rem',
            display: 'flex', alignItems: 'center', gap: '0.85rem',
            boxShadow: '0 2px 12px rgba(18,116,67,0.06)',
            border: '1px solid rgba(18,116,67,0.05)',
          }}>
            <div style={{
              width: 32, height: 32, background: 'linear-gradient(135deg,#127443,#1a9e5a)',
              color: 'white', borderRadius: '50%', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8rem', fontWeight: 800, flexShrink: 0,
            }}>{s.num}</div>
            <div style={{ width: 40, height: 40, flexShrink: 0, color: '#127443' }}>
              {s.svg}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>
                {s.label}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, lineHeight: 1.4 }}>
                {s.desc}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: '0.75rem', background: 'linear-gradient(135deg,#127443,#1a9e5a)',
        borderRadius: 16, padding: '1rem', textAlign: 'center', color: 'white',
      }}>
        <div style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>✅</div>
        <div style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.15rem' }}>
          تهانينا! التطبيق جاهز
        </div>
        <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>
          من الآن تقدر تطلب منتجات السوبرماركت وتوصلك لباب البيت مباشرة من شاشتك الرئيسية
        </div>
      </div>
    </div>
  );
});

export default InstallGuide;
