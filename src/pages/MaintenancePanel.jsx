import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';

const ADMIN_EMAIL = 'yaser.haroon79@gmail.com';
const MAINTENANCE_STORAGE_KEY = 'thara_maintenance';

export default function MaintenancePanel() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [maintenance, setMaintenance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || user.email !== ADMIN_EMAIL) {
          navigate('/admin/login', { replace: true });
          return;
        }
        setAuthorized(true);
        const { data } = await supabase.from('settings').select('value').eq('key', 'maintenance_mode').maybeSingle();
        setMaintenance(data?.value === 'true');
      } catch { navigate('/admin/login', { replace: true }); }
      setChecking(false);
    };
    init();
  }, [navigate]);

  const toggle = async () => {
    setLoading(true);
    setError('');
    const next = !maintenance;
    try {
      await supabase.from('settings').upsert({ key: 'maintenance_mode', value: next ? 'true' : 'false' }, { onConflict: 'key' });
      localStorage.setItem(MAINTENANCE_STORAGE_KEY, next ? 'true' : 'false');
      setMaintenance(next);
    } catch { setError('فشل التبديل. حاول مرة أخرى.'); }
    setLoading(false);
  };

  if (checking) return (
    <div style={styles.container}>
      <div style={styles.card}><p style={{ color: '#94a3b8' }}>جاري التحقق...</p></div>
    </div>
  );
  if (!authorized) return null;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <img src="/newicon.jpg" alt="" style={styles.logo} />
        <h1 style={styles.title}>🔧 صفحة الصيانة</h1>
        <p style={styles.subtitle}>التحكم في وضع الصيانة للمتجر</p>

        <div style={{
          ...styles.badge,
          background: maintenance ? 'rgba(220,38,38,0.15)' : 'rgba(18,116,67,0.15)',
          color: maintenance ? '#ef4444' : '#22c55e',
        }}>
          {maintenance ? '🟡 وضع الصيانة مفعّل' : '🟢 الموقع يعمل طبيعي'}
        </div>

        <p style={styles.desc}>
          {maintenance
            ? 'الزوار يرون صفحة "الموقع قيد الصيانة". أنت فقط تستطيع الدخول إلى هذه الصفحة.'
            : 'الموقع متاح للجميع. اضغط للتفعيل عند الحاجة.'}
        </p>

        {error && <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>{error}</p>}

        <button onClick={toggle} disabled={loading} style={{
          ...styles.btn,
          background: maintenance ? '#dc2626' : '#127443',
          boxShadow: maintenance ? '0 4px 15px rgba(220,38,38,0.3)' : '0 4px 15px rgba(18,116,67,0.3)',
          opacity: loading ? 0.6 : 1,
        }}>
          {loading ? 'جاري...' : (maintenance ? '🔴 إيقاف الصيانة وتشغيل الموقع' : '🟢 تفعيل وضع الصيانة')}
        </button>

        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <a href="/" style={styles.link}>العودة للمتجر</a>
          <a href="/admin" style={styles.link}>لوحة التحكم</a>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', background: '#06190e', direction: 'rtl',
    fontFamily: 'system-ui, sans-serif', padding: '1rem'
  },
  card: {
    background: '#0d3d24', padding: '2.5rem 2rem', borderRadius: '20px',
    textAlign: 'center', maxWidth: '420px', width: '100%',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
  },
  logo: {
    width: '72px', height: '72px', borderRadius: '50%', marginBottom: '0.5rem'
  },
  title: {
    color: '#fbbf24', margin: '0 0 0.25rem', fontSize: '1.4rem', fontWeight: 800
  },
  subtitle: {
    color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem'
  },
  badge: {
    display: 'inline-block', padding: '0.4rem 1.2rem', borderRadius: '20px',
    fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem'
  },
  desc: {
    color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.7', marginBottom: '1.5rem'
  },
  btn: {
    color: '#fff', border: 'none', padding: '0.9rem 2rem', borderRadius: '14px',
    fontSize: '1rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
    transition: 'all 0.15s', width: '100%'
  },
  link: {
    color: '#94a3b8', textDecoration: 'none', fontSize: '0.85rem'
  }
};
