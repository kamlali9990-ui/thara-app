import React, { useState } from 'react';
import { supabase } from '../../supabase/client';
import { showToast } from '../Toast.jsx';

const PAGE_SIZE = 50;

export default function AdminUsers({ staffRole, customers }) {
  const isAdmin = staffRole === 'admin';
  const [resettingEmail, setResettingEmail] = useState(null);
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(0);

  const handleResetPassword = async (email) => {
    if (!window.confirm(`إرسال رابط إعادة تعيين كلمة المرور إلى ${email}؟`)) return;
    setResettingEmail(email);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + (import.meta.env.BASE_URL || '/')
      });
      if (error) throw error;
      showToast('تم إرسال رابط إعادة تعيين كلمة المرور إلى البريد الإلكتروني', 'success');
    } catch (err) {
      showToast('فشل إرسال الرابط: ' + err.message, 'error');
    }
    setResettingEmail(null);
  };

  const q = searchQ.trim().toLowerCase();
  const filtered = q
    ? customers.filter(c => (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.phone || '').includes(q))
    : customers;
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const safePage = Math.min(page, totalPages - 1);
  const pageCustomers = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  if (!customers.length) return <div><h2 className="admin-section-title users-title">المستخدمين</h2><p style={{ color: 'var(--admin-text-muted)', fontWeight: 700 }}>لا يوجد مستخدمين مسجلين.</p></div>;

  return (
    <div>
      <h2 className="admin-section-title users-title">المستخدمين ({filtered.length})</h2>

      <input value={searchQ} onChange={e => { setSearchQ(e.target.value); setPage(0); }}
        placeholder="🔍 ابحث بالاسم أو البريد أو الجوال..."
        style={{ width: '100%', maxWidth: 400, padding: '0.5rem 0.75rem', borderRadius: 8, border: '0.5px solid var(--admin-border)', background: 'var(--admin-input-bg)', color: 'var(--admin-text)', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none', marginBottom: '1rem', display: 'block' }} />

      <div className="admin-orders-list">
        {pageCustomers.map(c => (
          <div key={c.id} className="admin-card">
            <div className="admin-card-header" style={{ alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <strong style={{ fontSize: '1rem', color: 'var(--admin-text)' }}>{c.name || 'بدون اسم'}</strong>
                  <span style={{ color: 'var(--admin-text-muted)', fontSize: '0.75rem', background: 'var(--admin-highlight-bg)', padding: '0.1rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>#{c.id}</span>
                </div>
                <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem', marginTop: '0.2rem', fontWeight: 700 }}>{c.email}</div>
                {c.username && <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.8rem', fontWeight: 700 }}>@{c.username}</div>}
              </div>
              <div style={{ textAlign: 'left', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div>
                  <span style={{ color: 'var(--admin-text-muted)', fontSize: '0.8rem', fontWeight: 700 }}>نقاط الولاء</span><br/>
                  <strong style={{ color: 'var(--admin-warning)', fontSize: '1.2rem' }}>{c.loyalty_points ?? 0}</strong>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleResetPassword(c.email)}
                    disabled={resettingEmail === c.email}
                    className="btn"
                    style={{ fontSize: '0.8rem', padding: '0.5rem 0.8rem', whiteSpace: 'nowrap', fontWeight: 700 }}
                  >
                    {resettingEmail === c.email ? 'جاري الإرسال...' : 'إعادة تعيين كلمة المرور'}
                  </button>
                )}
              </div>
            </div>
            <div className="admin-card-info" style={{ fontWeight: 700 }}>
              <strong style={{ color: 'var(--admin-text)' }}>رقم الجوال:</strong> <span dir="ltr" style={{ color: 'var(--admin-text-soft)' }}>{c.phone || 'غير محدد'}</span> |
              <strong style={{ color: 'var(--admin-text)' }}> تاريخ التسجيل:</strong> <span style={{ color: 'var(--admin-text-soft)' }}>{c.created_at ? new Date(c.created_at).toLocaleDateString('ar-SA') : '—'}</span>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem', alignItems: 'center' }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={safePage === 0}
            style={{ padding: '0.4rem 0.8rem', borderRadius: 6, border: '0.5px solid var(--admin-border)', background: 'var(--admin-highlight-bg)', color: 'var(--admin-text)', cursor: 'pointer', fontFamily: 'inherit' }}>
            السابق
          </button>
          <span style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>{safePage + 1} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1}
            style={{ padding: '0.4rem 0.8rem', borderRadius: 6, border: '0.5px solid var(--admin-border)', background: 'var(--admin-highlight-bg)', color: 'var(--admin-text)', cursor: 'pointer', fontFamily: 'inherit' }}>
            التالي
          </button>
        </div>
      )}
    </div>
  );
}
