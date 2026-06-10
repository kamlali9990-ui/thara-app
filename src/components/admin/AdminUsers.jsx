import React, { useState } from 'react';
import { supabase } from '../../supabase/client';
import { showToast } from '../Toast.jsx';

export default function AdminUsers({ staffRole, customers, loadCustomers }) {
  const isAdmin = staffRole === 'admin';
  const [resettingEmail, setResettingEmail] = useState(null);

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

  React.useEffect(() => { loadCustomers(); }, [loadCustomers]);

  if (!customers.length) return <div><h2 className="admin-section-title users-title">المستخدمين</h2><p>لا يوجد مستخدمين مسجلين.</p></div>;

  return (
    <div>
      <h2 className="admin-section-title users-title">المستخدمين ({customers.length})</h2>
      <div className="admin-orders-list">
        {customers.map(c => (
          <div key={c.id} className="admin-card">
            <div className="admin-card-header" style={{ alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <strong style={{ fontSize: '1rem' }}>{c.name || 'بدون اسم'}</strong>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>#{c.id}</span>
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.2rem' }}>{c.email}</div>
                {c.username && <div style={{ color: '#64748b', fontSize: '0.8rem' }}>@{c.username}</div>}
              </div>
              <div style={{ textAlign: 'left', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>نقاط الولاء</span><br/>
                  <strong style={{ color: '#fbbf24', fontSize: '1.2rem' }}>{c.loyalty_points ?? 0}</strong>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleResetPassword(c.email)}
                    disabled={resettingEmail === c.email}
                    className="btn"
                    style={{ fontSize: '0.8rem', padding: '0.5rem 0.8rem', whiteSpace: 'nowrap' }}
                  >
                    {resettingEmail === c.email ? 'جاري الإرسال...' : 'إعادة تعيين كلمة المرور'}
                  </button>
                )}
              </div>
            </div>
            <div className="admin-card-info">
              <strong>رقم الجوال:</strong> <span dir="ltr">{c.phone || 'غير محدد'}</span> |
              <strong> تاريخ التسجيل:</strong> {c.created_at ? new Date(c.created_at).toLocaleDateString('ar-SA') : '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
