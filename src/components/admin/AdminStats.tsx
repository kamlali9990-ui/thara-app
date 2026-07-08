import { useMemo, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { showToast } from '../Toast';
import type { StaffMember } from '../../types';

const ROLE_NAMES: Record<string, string> = { admin: 'مدير', manager: 'مدير عام', employee: 'موظف', driver: 'كابتن' };

interface StaffStat {
  id: number;
  name: string;
  role: string;
  email: string;
  accepted: number;
  delivered: number;
  revenue: number;
  current: number;
}

interface ProductStat {
  id: string;
  name: string;
  category: string;
  totalQty: number;
  totalRevenue: number;
  orderCount: number;
}

function computeStaffStats(orders: any[], staffList: StaffMember[]): StaffStat[] {
  const map: Record<number, StaffStat> = {};
  for (const s of staffList) {
    map[s.id] = { id: s.id, name: s.name, role: s.role, email: s.email, accepted: 0, delivered: 0, revenue: 0, current: 0 };
  }
  for (const o of orders) {
    const acceptedId = o.acceptedBy?.id;
    const driverId = o.assignedDriverId;
    const isCompleted = o.status === 'مكتمل';
    const isCancelled = o.status === 'ملغي';
    const total = Number(o.total) || 0;
    if (acceptedId && map[acceptedId]) {
      map[acceptedId].accepted++;
      if (!isCancelled) map[acceptedId].revenue += total;
      if (!isCompleted && !isCancelled) map[acceptedId].current++;
    }
    if (driverId && map[driverId] && isCompleted) {
      map[driverId].delivered++;
    }
  }
  return Object.values(map).sort((a, b) => b.accepted - a.accepted);
}

function computeProductStats(orders: any[]): ProductStat[] {
  const map: Record<string, ProductStat> = {};
  for (const o of orders) {
    if (o.status === 'ملغي') continue;
    const items = Array.isArray(o.items) ? o.items : [];
    const seen = new Set<string>();
    for (const item of items) {
      const id = String(item.id ?? item.product_id);
      if (!map[id]) map[id] = { id, name: item.name || id, category: item.category || '', totalQty: 0, totalRevenue: 0, orderCount: 0 };
      map[id].totalQty += Number(item.qty) || 0;
      map[id].totalRevenue += (Number(item.currentPrice ?? item.price) || 0) * (Number(item.qty) || 0);
      if (!seen.has(id)) { seen.add(id); map[id].orderCount++; }
    }
  }
  return Object.values(map).sort((a, b) => b.totalQty - a.totalQty);
}

export default function AdminStats() {
  const { orders, staffList, allProducts } = useStore();
  const [sortBy, setSortBy] = useState('qty');

  const staffStats = useMemo(() => computeStaffStats(orders, staffList), [orders, staffList]);
  const productStats = useMemo(() => {
    const stats = computeProductStats(orders);
    if (sortBy === 'qty') return stats.sort((a, b) => b.totalQty - a.totalQty);
    if (sortBy === 'revenue') return stats.sort((a, b) => b.totalRevenue - a.totalRevenue);
    if (sortBy === 'orders') return stats.sort((a, b) => b.orderCount - a.orderCount);
    return stats;
  }, [orders, sortBy]);

  const overallRevenue = useMemo(() =>
    orders.filter((o: any) => o.status !== 'ملغي').reduce((s: number, o: any) => s + (Number(o.total) || 0), 0),
  [orders]);
  const completedCount = orders.filter((o: any) => o.status === 'مكتمل').length;
  const totalOrders = orders.length;

  const exportCSV = (type: string) => {
    let csv = '';
    if (type === 'staff') {
      csv = 'الاسم,الصلاحية,المقبولات,تم التوصيل,الإيرادات,الحالية\n';
      for (const s of staffStats) {
        csv += `${s.name},${ROLE_NAMES[s.role] || s.role},${s.accepted},${s.delivered},${s.revenue.toFixed(2)},${s.current}\n`;
      }
    } else {
      csv = 'المنتج,التصنيف,الكمية,الإيرادات,عدد الطلبات\n';
      for (const p of productStats) {
        csv += `${p.name},${p.category},${p.totalQty},${p.totalRevenue.toFixed(2)},${p.orderCount}\n`;
      }
    }
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = type === 'staff' ? 'احصائيات_الموظفين.csv' : 'الاصناف_الاكثر_مبيعا.csv';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    showToast('تم تصدير الملف', 'success');
  };

  return (
    <div>
      <h2 className="admin-section-title">📊 الإحصائيات</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'إجمالي الطلبات', value: totalOrders },
          { label: 'مكتملة', value: completedCount },
          { label: 'إجمالي الإيرادات', value: overallRevenue.toFixed(2) + ' ر.س' },
          { label: 'الموظفين', value: staffList.length },
        ].map(c => (
          <div key={c.label} className="stat-card" style={{
            background: 'var(--admin-highlight-bg)', borderRadius: 12, padding: '1rem',
            border: '1px solid var(--admin-border)', textAlign: 'center'
          }}>
            <div className="admin-stat-label" style={{ color: 'var(--admin-text-muted)', marginBottom: '0.35rem' }}>{c.label}</div>
            <div className="admin-stat-value" style={{ color: 'var(--admin-text)' }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="admin-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ color: 'var(--admin-text)', fontSize: '1rem', margin: 0, fontWeight: 800 }}>👥 إحصائيات الموظفين</h3>
          <button onClick={() => exportCSV('staff')} className="btn" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', fontWeight: 700 }}>تصدير CSV</button>
        </div>
        {staffStats.length === 0 ? (
          <p style={{ color: 'var(--admin-text-muted)', fontWeight: 700 }}>لا توجد بيانات</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="stats-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)', fontWeight: 700 }}>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>الموظف</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center' }}>الصلاحية</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center' }}>الطلبات المقبولة</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center' }}>تم التوصيل</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center' }}>الإيرادات</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center' }}>حالياً</th>
                </tr>
              </thead>
              <tbody>
                {staffStats.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--admin-border-subtle)' }}>
                    <td style={{ padding: '0.5rem', color: 'var(--admin-text-soft)', fontWeight: 700 }}>{s.name}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontWeight: 700 }}>{ROLE_NAMES[s.role] || s.role}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--admin-warning)', fontWeight: 700 }}>{s.accepted}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--admin-success)', fontWeight: 700 }}>{s.delivered}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--admin-text-soft)', fontWeight: 700 }}>{s.revenue.toFixed(2)}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', color: s.current > 0 ? 'var(--admin-info)' : 'var(--admin-text-muted)', fontWeight: 700 }}>{s.current}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="admin-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ color: 'var(--admin-text)', fontSize: '1rem', margin: 0, fontWeight: 800 }}>🏆 الأصناف الأكثر مبيعاً</h3>
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            <span style={{ color: 'var(--admin-text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>ترتيب حسب:</span>
            {['qty', 'revenue', 'orders'].map(key => (
              <button key={key} onClick={() => setSortBy(key)} style={{
                padding: '0.3rem 0.6rem', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.75rem', fontWeight: 700,
                border: `1px solid ${sortBy === key ? 'rgba(var(--admin-warning-rgb), 0.4)' : 'transparent'}`,
                background: sortBy === key ? 'rgba(var(--admin-warning-rgb), 0.15)' : 'transparent',
                color: sortBy === key ? 'var(--admin-warning)' : 'var(--admin-text-muted)'
              }}>
                {key === 'qty' ? 'الكمية' : key === 'revenue' ? 'الإيرادات' : 'الطلبات'}
              </button>
            ))}
            <button onClick={() => exportCSV('products')} className="btn" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', fontWeight: 700 }}>تصدير</button>
          </div>
        </div>
        {productStats.length === 0 ? (
          <p style={{ color: 'var(--admin-text-muted)', fontWeight: 700 }}>لا توجد بيانات</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {productStats.slice(0, 50).map((p, i) => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem',
                borderRadius: 10, background: i % 2 === 0 ? 'var(--admin-highlight-bg)' : 'transparent'
              }}>
                <span style={{
                  width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: i < 3 ? 'rgba(var(--admin-warning-rgb), 0.2)' : 'var(--admin-highlight-bg)',
                  color: i < 3 ? 'var(--admin-warning)' : 'var(--admin-text-muted)', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0
                }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--admin-text-soft)', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 700 }}>{p.name}</div>
                  <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.7rem', fontWeight: 700 }}>{p.category}</div>
                </div>
                <div style={{ textAlign: 'center', minWidth: 50 }}>
                  <div style={{ color: 'var(--admin-success)', fontSize: '0.85rem', fontWeight: 700 }}>{p.totalQty}</div>
                  <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.65rem', fontWeight: 700 }}>كمية</div>
                </div>
                <div style={{ textAlign: 'center', minWidth: 60 }}>
                  <div style={{ color: 'var(--admin-warning)', fontSize: '0.85rem', fontWeight: 700 }}>{p.totalRevenue.toFixed(0)}</div>
                  <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.65rem', fontWeight: 700 }}>ر.س</div>
                </div>
                <div style={{ textAlign: 'center', minWidth: 40 }}>
                  <div style={{ color: 'var(--admin-info)', fontSize: '0.85rem', fontWeight: 700 }}>{p.orderCount}</div>
                  <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.65rem', fontWeight: 700 }}>طلبات</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
