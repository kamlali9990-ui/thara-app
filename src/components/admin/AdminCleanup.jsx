import { useState } from 'react';
import { cleanupApi } from '../../supabase/cleanup';
import { showToast } from '../Toast';

const ENTITIES = [
  { id: 'orders', label: 'الطلبات', icon: '📋', desc: 'حذف جميع الطلبات (سيحذف المحادثات المرتبطة)' },
  { id: 'chat_messages', label: 'الرسائل', icon: '💬', desc: 'حذف جميع محادثات العملاء' },
  { id: 'customers', label: 'المستخدمين', icon: '👤', desc: 'حذف جميع حسابات العملاء' },
  { id: 'staff', label: 'الموظفين', icon: '👥', desc: 'حذف جميع الموظفين (ما عدا حسابك)' },
];

export default function AdminCleanup({ currentStaff }) {
  const [selected, setSelected] = useState([]);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const toggle = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    setResult(null);
  };

  const handleCleanup = async () => {
    if (selected.length === 0) { showToast('اختر على الأقل عنصرًا واحدًا للحذف', 'warning'); return; }
    if (confirmText !== 'حذف') { showToast('اكتب "حذف" لتأكيد العملية', 'warning'); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await cleanupApi.run(selected);
      setResult(res);
      showToast('تم التنظيف بنجاح', 'success');
      setConfirmText('');
      localStorage.removeItem('thara_chat');
      localStorage.removeItem('thara_orders');
      localStorage.removeItem('thara_cart');
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      showToast('فشل التنظيف: ' + (e.message || e), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="admin-section-title">🧹 تنظيف النظام</h2>
      <div className="admin-card" style={{ padding: '1.5rem', marginTop: '1rem' }}>
        <p style={{ color: '#fca5a5', fontSize: '0.85rem', marginBottom: '1rem', lineHeight: '1.5' }}>
          ⚠️ هذه العملية نهائية ولا يمكن التراجع عنها. سيتم حذف البيانات المحددة بشكل دائم.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {ENTITIES.map(e => {
            const checked = selected.includes(e.id);
            return (
              <label key={e.id} className="admin-cleanup-item" style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                borderRadius: 12, cursor: 'pointer', userSelect: 'none',
                background: checked ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${checked ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`,
                transition: 'all 0.15s'
              }}>
                <input type="checkbox" checked={checked} onChange={() => toggle(e.id)}
                  style={{ width: '18px', height: '18px', accentColor: '#ef4444' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '0.9rem' }}>
                    {e.icon} {e.label}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{e.desc}</div>
                </div>
              </label>
            );
          })}
        </div>

        {selected.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#ef4444', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
              اكتب "حذف" لتأكيد حذف {selected.map(id => ENTITIES.find(e => e.id === id)?.label).join('، ')}
            </label>
            <input type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)}
              placeholder='اكتب "حذف" هنا'
              style={{
                width: '100%', padding: '0.6rem 0.75rem', borderRadius: 10,
                border: `1px solid ${confirmText === 'حذف' ? '#ef4444' : 'rgba(255,255,255,0.12)'}`,
                background: 'rgba(0,0,0,0.35)', color: '#e2e8f0',
                fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none',
                boxSizing: 'border-box'
              }} />
          </div>
        )}

        <button onClick={handleCleanup} disabled={loading || selected.length === 0 || confirmText !== 'حذف'}
          style={{
            width: '100%', padding: '0.7rem', borderRadius: 10, cursor: 'pointer',
            background: confirmText === 'حذف' && selected.length > 0
              ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
              : 'rgba(239,68,68,0.15)',
            border: `1px solid ${confirmText === 'حذف' && selected.length > 0 ? 'rgba(220,38,38,0.5)' : 'rgba(239,68,68,0.15)'}`,
            color: confirmText === 'حذف' && selected.length > 0 ? '#fff' : '#fca5a5',
            fontWeight: 700, fontSize: '0.95rem', fontFamily: 'inherit',
            opacity: loading ? 0.6 : 1, transition: 'all 0.15s'
          }}>
          {loading ? 'جاري الحذف...' : '🧹 تنفيذ الحذف'}
        </button>

        {result && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: 12,
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <div style={{ color: '#4ade80', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              ✅ تم الحذف بنجاح
            </div>
            <div style={{ color: '#e2e8f0', fontSize: '0.85rem', lineHeight: '1.6' }}>
              {result.orders > 0 && <div>📋 الطلبات: {result.orders}</div>}
              {result.chat_messages > 0 && <div>💬 الرسائل: {result.chat_messages}</div>}
              {result.customers > 0 && <div>👤 المستخدمين: {result.customers}</div>}
              {result.staff > 0 && <div>👥 الموظفين: {result.staff}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
