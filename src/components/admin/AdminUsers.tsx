import React, { useState } from 'react';
import { supabase } from '../../supabase/client';
import { showToast } from '../Toast';
import type { Customer } from '../../types';

const PAGE_SIZE = 50;

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pwd = '';
  for (let i = 0; i < 8; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  return pwd;
}

export default function AdminUsers({ staffRole, customers, loadCustomers }: { staffRole: string; customers: Customer[]; loadCustomers?: () => void }) {
  const isAdmin = staffRole === 'admin';
  const [resettingEmail, setResettingEmail] = useState<string | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [showResetDialog, setShowResetDialog] = useState<Customer | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(0);

  const openResetDialog = (customer: Customer) => {
    setShowResetDialog(customer);
    setResetPasswordInput(generateTempPassword());
    setGeneratedPassword('');
  };

  const handleResetPassword = async () => {
    if (!showResetDialog) return;
    if (!resetPasswordInput || resetPasswordInput.length < 6) {
      showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
      return;
    }
    setResettingEmail(showResetDialog.email);
    try {
      const { data, error } = await supabase.rpc('admin_reset_customer_password_rpc', {
        p_customer_email: showResetDialog.email,
        p_new_password: resetPasswordInput
      });
      if (error) throw error;
      if ((data as any)?.success) {
        setGeneratedPassword(resetPasswordInput);
        showToast('تم إعادة تعيين كلمة المرور بنجاح', 'success');
      } else {
        throw new Error((data as any)?.message || 'فشل إعادة التعيين');
      }
    } catch (err: any) {
      showToast('فشل إعادة تعيين كلمة المرور: ' + err.message, 'error');
    }
    setResettingEmail(null);
  };

  const closeResetDialog = () => {
    setShowResetDialog(null);
    setResetPasswordInput('');
    setGeneratedPassword('');
  };

  const q = searchQ.trim().toLowerCase();
  const filtered = q
    ? customers.filter((c: any) => (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.phone || '').includes(q))
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
        {pageCustomers.map((c: any) => (
          <div key={c.id} className="admin-card">
            <div className="admin-card-header" style={{ alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <strong style={{ fontSize: '1rem', color: 'var(--admin-text)' }}>{c.name || 'بدون اسم'}</strong>
                  <span style={{ color: 'var(--admin-text-muted)', fontSize: '0.75rem', background: 'var(--admin-highlight-bg)', padding: '0.1rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>#{c.id}</span>
                </div>
                <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem', marginTop: '0.2rem', fontWeight: 700 }}>{c.email}</div>
                {c.real_email && <div style={{ color: 'var(--admin-accent, #10b981)', fontSize: '0.8rem', fontWeight: 700 }}>📧 {c.real_email}</div>}
                {c.username && <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.8rem', fontWeight: 700 }}>@{c.username}</div>}
              </div>
              <div style={{ textAlign: 'left', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div>
                  <span style={{ color: 'var(--admin-text-muted)', fontSize: '0.8rem', fontWeight: 700 }}>نقاط الولاء</span><br/>
                  <strong style={{ color: 'var(--admin-warning)', fontSize: '1.2rem' }}>{c.loyalty_points ?? 0}</strong>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => openResetDialog(c)}
                    disabled={resettingEmail === c.email}
                    className="btn"
                    style={{ fontSize: '0.8rem', padding: '0.5rem 0.8rem', whiteSpace: 'nowrap', fontWeight: 700 }}
                  >
                    {resettingEmail === c.email ? 'جاري...' : 'إعادة تعيين كلمة المرور'}
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

      {showResetDialog && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }} onClick={closeResetDialog}>
          <div style={{
            background: 'var(--admin-card-bg, #0d3d24)', padding: '2rem', borderRadius: 16,
            maxWidth: 420, width: '90%', border: '0.5px solid var(--admin-border, rgba(255,255,255,0.12))'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 1rem', color: 'var(--admin-text, #f1f5f9)' }}>
              إعادة تعيين كلمة المرور
            </h3>
            <p style={{ color: 'var(--admin-text-soft, #94a3b8)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              العميل: <strong style={{ color: 'var(--admin-text, #f1f5f9)' }}>{showResetDialog.name || showResetDialog.email}</strong>
            </p>
            <p style={{ color: 'var(--admin-text-soft, #94a3b8)', fontSize: '0.8rem', marginBottom: '1rem' }}>
              أدخل كلمة مرور مؤقتة للعميل. سيتمكن العميل من تسجيل الدخول بها ثم تغييرها من صفحة الحساب.
            </p>
            <div className="auth-field">
              <label style={{ color: 'var(--admin-text, #f1f5f9)' }}>كلمة المرور الجديدة</label>
              <input type="text" value={resetPasswordInput}
                onChange={e => setResetPasswordInput(e.target.value)}
                className="auth-input" dir="ltr"
                style={{ background: 'var(--admin-input-bg, rgba(0,0,0,0.35))', color: 'var(--admin-text, #e2e8f0)', border: '0.5px solid var(--admin-border, rgba(255,255,255,0.12))' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button onClick={handleResetPassword} disabled={resettingEmail === showResetDialog.email}
                className="btn" style={{ flex: 1, fontWeight: 700, padding: '0.6rem' }}>
                {resettingEmail === showResetDialog.email ? 'جاري...' : 'حفظ كلمة المرور'}
              </button>
              <button onClick={() => setResetPasswordInput(generateTempPassword())}
                style={{ padding: '0.6rem 0.8rem', borderRadius: 8, border: '0.5px solid var(--admin-border, rgba(255,255,255,0.12))', background: 'var(--admin-highlight-bg, rgba(255,255,255,0.06))', color: 'var(--admin-text, #e2e8f0)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.8rem' }}>
                توليد عشوائي
              </button>
            </div>
            {generatedPassword && (
              <div style={{
                marginTop: '1rem', padding: '0.75rem', borderRadius: 8,
                background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)'
              }}>
                <p style={{ color: '#4ade80', fontWeight: 700, margin: '0 0 0.3rem', fontSize: '0.85rem' }}>
                  تم إعادة التعيين بنجاح
                </p>
                <p style={{ color: '#e2e8f0', fontSize: '0.8rem', margin: 0 }}>
                  كلمة المرور الجديدة: <strong dir="ltr" style={{ color: '#fbbf24', fontSize: '1rem' }}>{generatedPassword}</strong>
                </p>
                <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.3rem' }}>
                  شارك كلمة المرور مع العميل عبر واتساب أو الاتصال.
                </p>
                <button onClick={closeResetDialog} className="btn" style={{ marginTop: '0.5rem', width: '100%', fontWeight: 700 }}>
                  تم
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
