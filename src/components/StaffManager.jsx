import React, { useContext, useState, useEffect } from 'react';
import { StoreContext } from '../context/StoreContext';

export default function StaffManager() {
  const { staffList, staffRole, loadStaff, addStaff, updateStaff, removeStaff } = useContext(StoreContext);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('employee');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');

  useEffect(() => { loadStaff(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) return;
    try {
      await addStaff({ email: email.trim(), name: name.trim(), role });
      setEmail(''); setName(''); setRole('employee');
    } catch (err) {
      alert(err.message === 'duplicate key value violates unique constraint "staff_email_key"'
        ? 'هذا البريد مضاف مسبقاً' : 'فشل إضافة الموظف');
    }
  };

  const handleSave = async (id) => {
    await updateStaff(id, { name: editName, role: editRole });
    setEditingId(null);
  };

  const handleRemove = async (id) => {
    if (!window.confirm('تأكيد حذف هذا الموظف؟')) return;
    await removeStaff(id);
  };

  const isAdmin = staffRole === 'admin';

  return (
    <div>
      <h2 className="admin-section-title">إدارة الموظفين</h2>

      {isAdmin && (
        <form onSubmit={handleAdd} className="staff-add-form">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="البريد الإلكتروني" required className="staff-input" />
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="الاسم" required className="staff-input" />
          <select value={role} onChange={e => setRole(e.target.value)} className="staff-select">
            <option value="employee">موظف</option>
            <option value="manager">مدير</option>
            <option value="admin">مدير عام</option>
          </select>
          <button type="submit" className="btn">إضافة</button>
        </form>
      )}

      <div className="staff-list">
        {staffList.length === 0 && <p style={{ color: 'var(--text-light)' }}>لا يوجد موظفون بعد.</p>}
        {staffList.map(s => (
          <div key={s.id} className="staff-card">
            {editingId === s.id ? (
              <>
                <input value={editName} onChange={e => setEditName(e.target.value)} className="staff-input" />
                <select value={editRole} onChange={e => setEditRole(e.target.value)} className="staff-select">
                  <option value="employee">موظف</option>
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
                  <span className={`staff-role staff-role-${s.role}`}>
                    {s.role === 'admin' ? 'مدير عام' : s.role === 'manager' ? 'مدير' : 'موظف'}
                  </span>
                </div>
                {isAdmin && (
                  <div className="staff-actions">
                    <button className="btn" style={{ background: '#f2a900' }}
                      onClick={() => { setEditingId(s.id); setEditName(s.name); setEditRole(s.role); }}>
                      تعديل
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
    </div>
  );
}
