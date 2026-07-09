import React, { useContext, useState, useEffect } from 'react';
import { StoreContext } from '../context/StoreContext';
import { showToast } from './Toast';
import type { StaffMember, StaffRole } from '../types';

export default function StaffManager() {
  const { staffList, staffRole, loadStaff, addStaff, updateStaff, removeStaff, resetStaffPassword } = useContext(StoreContext);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<StaffRole>('employee');
  const [phone, setPhone] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<StaffRole>('employee');
  const [editPhone, setEditPhone] = useState('');
  const [resetPwEmail, setResetPwEmail] = useState('');
  const [resetPwNewPassword, setResetPwNewPassword] = useState('');
  const [showResetPw, setShowResetPw] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => { loadStaff(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !name.trim()) return;
    try {
      const added: any = await (addStaff as any)({ email: normalizedEmail, name: name.trim(), role, phone: phone.trim() || null });
      showToast(`تمت إضافة الموظف بنجاح. كلمة المرور المبدئية: ${added.tempPassword}`, 'success');
      setEmail(''); setName(''); setRole('employee'); setPhone('');
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('duplicate key')) {
        showToast(msg.includes('phone') ? 'رقم الجوال مستخدم مسبقاً' : 'هذا البريد مضاف مسبقاً', 'error');
      } else {
        showToast(msg || 'فشل إضافة الموظف', 'error');
      }
    }
  };

  const handleSave = async (id: number) => {
    const updates: any = { name: editName, role: editRole, phone: editPhone || null };
    if (editEmail) updates.email = editEmail.trim().toLowerCase();
    await (updateStaff as any)(id, updates);
    setEditingId(null);
  };

  const handleResetPassword = async () => {
    if (!resetPwEmail || !resetPwNewPassword) return;
    if (resetPwNewPassword.length < 6) {
      showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
      return;
    }
    setResetting(true);
    try {
      await (resetStaffPassword as any)(resetPwEmail.trim().toLowerCase(), resetPwNewPassword);
      showToast('تم تغيير كلمة المرور بنجاح', 'success');
      setShowResetPw(false);
      setResetPwEmail('');
      setResetPwNewPassword('');
    } catch (err: any) {
      showToast(err.message || 'فشل تغيير كلمة المرور', 'error');
    } finally {
      setResetting(false);
    }
  };

  const handleRemove = async (id: number) => {
    if (!window.confirm('تأكيد حذف هذا الموظف؟')) return;
    await (removeStaff as any)(id);
  };

  const isAdmin = staffRole === 'admin';

  return (
    <div className="staff-manager">
      <h2 className="admin-section-title staff-title">إدارة الموظفين</h2>

      {isAdmin && (
        <form onSubmit={handleAdd} className="staff-add-form">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="البريد الإلكتروني" required className="staff-input" />
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="الاسم" required className="staff-input" />
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="رقم الجوال (اختياري)" className="staff-input" />
          <select value={role} onChange={e => setRole(e.target.value as StaffRole)} className="staff-select">
            <option value="employee">موظف</option>
            <option value="driver">كابتن</option>
            <option value="manager">مدير</option>
            <option value="admin">مدير عام</option>
          </select>
          <button type="submit" className="btn">إضافة</button>
        </form>
      )}

      <div className="staff-list">
        {staffList.length === 0 && <p style={{ color: 'var(--admin-text-muted)' }}>لا يوجد موظفون بعد.</p>}
        {staffList.map((s: StaffMember) => (
          <div key={s.id} className="staff-card">
            {editingId === s.id ? (
              <>
                <input value={editName} onChange={e => setEditName(e.target.value)} className="staff-input"
                  placeholder="الاسم" />
                <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)}
                  placeholder="البريد الإلكتروني" className="staff-input" />
                <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)}
                  placeholder="رقم الجوال" className="staff-input" />
                <select value={editRole} onChange={e => setEditRole(e.target.value as StaffRole)} className="staff-select">
                  <option value="employee">موظف</option>
                  <option value="driver">كابتن</option>
                  <option value="manager">مدير</option>
                  <option value="admin">مدير عام</option>
                </select>
                <button className="btn" onClick={() => handleSave(s.id)}>حفظ</button>
                <button className="admin-delete-btn" onClick={() => setEditingId(null)}>إلغاء</button>
              </>
            ) : (
              <>
                <div className="staff-info">
                  <strong>{s.name}</strong>
                  <span className="staff-email">{s.email}</span>
                  {s.phone && <span className="staff-phone">{s.phone}</span>}
                  <span className={`staff-role staff-role-${s.role}`}>
                    {s.role === 'admin' ? 'مدير عام' : s.role === 'manager' ? 'مدير' : s.role === 'driver' ? 'كابتن' : 'موظف'}
                  </span>
                </div>
                {isAdmin && (
                  <div className="staff-actions">
                    <button className="btn"
                      onClick={() => { setEditingId(s.id); setEditName(s.name); setEditEmail(s.email || ''); setEditRole(s.role); setEditPhone(s.phone || ''); }}>
                      تعديل
                    </button>
                    <button className="btn staff-reset-pw-btn"
                      onClick={() => { setResetPwEmail(s.email); setShowResetPw(true); }}>
                      تغيير كلمة المرور
                    </button>
                    {s.role !== 'admin' && (
                      <button className="admin-delete-btn" onClick={() => handleRemove(s.id)}>حذف</button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      {showResetPw && (
        <div className="modal-overlay" onClick={() => setShowResetPw(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>تغيير كلمة المرور</h3>
            <p className="staff-reset-email">للموظف: {resetPwEmail}</p>
            <input type="password" value={resetPwNewPassword} onChange={e => setResetPwNewPassword(e.target.value)}
              placeholder="كلمة المرور الجديدة" className="staff-input" minLength={6} />
            <div className="staff-reset-actions">
              <button className="btn" onClick={handleResetPassword} disabled={resetting}>
                {resetting ? 'جاري التغيير...' : 'تأكيد'}
              </button>
              <button className="admin-delete-btn" onClick={() => { setShowResetPw(false); setResetPwNewPassword(''); }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
