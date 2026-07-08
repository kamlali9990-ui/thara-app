import { useState } from 'react';
import { supabase } from '../../supabase/client';
import { cleanupApi } from '../../supabase/cleanup';
import { showToast } from '../Toast';

const ENTITIES = [
  { id: 'orders', label: 'الطلبات', icon: '📋', desc: 'حذف جميع الطلبات (سيحذف المحادثات المرتبطة)' },
  { id: 'chat_messages', label: 'الرسائل', icon: '💬', desc: 'حذف جميع محادثات العملاء' },
  { id: 'customers', label: 'المستخدمين', icon: '👤', desc: 'حذف جميع حسابات العملاء' },
  { id: 'staff', label: 'الموظفين', icon: '👥', desc: 'حذف جميع الموظفين (ما عدا حسابك)' },
  { id: 'products', label: 'المنتجات', icon: '📦', desc: 'حذف جميع المنتجات (لإعادة الاستيراد)' },
];

export default function AdminCleanup({ currentStaff }: { currentStaff: any }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    setResult(null);
  };

  const handleCleanup = async () => {
    if (selected.length === 0) { showToast('اختر على الأقل عنصرًا واحدًا للحذف', 'warning'); return; }
    if (confirmText !== 'حذف') { showToast('اكتب "حذف" لتأكيد العملية', 'warning'); return; }
    if (!password) { showToast('الرجاء إدخال كلمة المرور لتأكيد الهوية', 'warning'); return; }
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (user?.email) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password });
        if (signInError) { showToast('كلمة المرور غير صحيحة', 'error'); return; }
      }
    } catch { showToast('فشل التحقق من الهوية', 'error'); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await cleanupApi.run(selected);
      setResult(res);
      showToast('تم التنظيف بنجاح', 'success');
      setConfirmText('');
      setPassword('');
      localStorage.removeItem('thara_chat');
      localStorage.removeItem('thara_orders');
      localStorage.removeItem('thara_cart');
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) {
      showToast('فشل التنظيف: ' + (e.message || e), 'error');
    } finally {
      setLoading(false);
    }
  };

  const ready = confirmText === 'حذف' && selected.length > 0 && password.length > 0;

  return (
    <div>
      <h2 className="admin-section-title">🧹 تنظيف النظام</h2>
      <div className="admin-card" style={{ padding: '1.5rem', marginTop: '1rem' }}>
        <p style={{ color: 'var(--admin-danger)', fontSize: '0.85rem', marginBottom: '1rem', lineHeight: '1.5' }}>
          ⚠️ هذه العملية نهائية ولا يمكن التراجع عنها. سيتم حذف البيانات المحددة بشكل دائم.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {ENTITIES.map(e => {
            const checked = selected.includes(e.id);
            return (
              <label key={e.id} className={`admin-cleanup-item${checked ? ' checked' : ''}`}>
                <input type="checkbox" checked={checked} onChange={() => toggle(e.id)}
                  className="admin-cleanup-checkbox" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--admin-text)' }}>
                    {e.icon} {e.label}
                  </div>
                  <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.75rem' }}>{e.desc}</div>
                </div>
              </label>
            );
          })}
        </div>

        {selected.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: 'var(--admin-danger)', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
              اكتب "حذف" لتأكيد حذف {selected.map(id => ENTITIES.find(e => e.id === id)?.label).join('، ')}
            </label>
            <input type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)}
              placeholder='اكتب "حذف" هنا'
              className={`admin-cleanup-input${confirmText === 'حذف' ? ' confirmed' : ''}`} />
            <label style={{ display: 'block', color: 'var(--admin-danger)', fontSize: '0.85rem', marginBottom: '0.4rem', marginTop: '0.75rem' }}>
              أدخل كلمة مرور حسابك لتأكيد الهوية
            </label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="كلمة المرور"
              className={`admin-cleanup-input${password.length > 0 ? ' confirmed' : ''}`} />
          </div>
        )}

        <button onClick={handleCleanup} disabled={loading || !ready}
          className={`admin-cleanup-btn${ready ? ' active' : ''}`}>
          {loading ? 'جاري الحذف...' : '🧹 تنفيذ الحذف'}
        </button>

        {result && (
          <div className="admin-cleanup-result">
            <div className="admin-cleanup-result-title">✅ تم الحذف بنجاح</div>
            <div className="admin-cleanup-result-detail">
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
