import { useState } from 'react';

const ROLE_MAP = { admin: 'admin', manager: 'manager', employee: 'employee', driver: 'driver' };

const ROLES = [
  {
    id: 'admin', label: 'المدير', icon: '👑',
    access: 'جميع الصلاحيات — وصول كامل للنظام',
    tasks: [
      'إدارة جميع الطلبات (تعديل، حذف، تغيير الحالة)',
      'إدارة المنتجات (إضافة، تعديل، حذف)',
      'إدارة العروض والأسعار',
      'إدارة الموظفين والكباتن (إضافة، تعديل، حذف)',
      'تحديد الصلاحيات لكل موظف',
      'محادثة العملاء والدعم',
      'عرض الإحصائيات الكاملة',
      'تنظيف النظام (حذف الطلبات / الرسائل / المستخدمين / الموظفين)',
      'إدارة الإعدادات العامة',
    ],
    notes: [
      'حساب المدير لا يمكن حذفه من النظام.',
      'جميع التبويبات متاحة: الطلبات، العملاء، المتجر، الإعدادات، الموظفين، التنظيف، التعليمات.',
    ]
  },
  {
    id: 'manager', label: 'مدير عام', icon: '🌟',
    access: 'جميع الصلاحيات ما عدا إدارة الموظفين والتنظيف',
    tasks: [
      'إدارة جميع الطلبات (تعديل، تغيير الحالة)',
      'إدارة المنتجات (إضافة، تعديل، حذف)',
      'إدارة العروض والأسعار',
      'محادثة العملاء والدعم',
      'عرض الإحصائيات',
      'إدارة الإعدادات العامة',
    ],
    notes: [
      'لا يمكن للمدير العام إضافة أو حذف الموظفين أو الكباتن.',
      'لا يمكن للمدير العام استخدام أداة التنظيف.',
    ]
  },
  {
    id: 'employee', label: 'موظف', icon: '👨‍💼',
    access: 'صلاحيات محددة حسب ما يمنحه المدير',
    tasks: [
      'إدارة الطلبات حسب الصلاحية الممنوحة',
      'محادثة العملاء إذا كان لديه صلاحية manage_chat',
      'إدارة المنتجات إذا كان لديه صلاحية manage_products',
      'إدارة العروض إذا كان لديه صلاحية manage_offers',
    ],
    notes: [
      'الصلاحيات يحددها المدير من تبويب "الصلاحيات" ضمن الإعدادات.',
      'إذا لم تظهر لك أي صلاحية، تواصل مع المدير.',
      'الموظف لا يرى تبويب الموظفين أو الإعدادات أو التنظيف.',
    ]
  },
  {
    id: 'driver', label: 'الكابتن (مندوب التوصيل)', icon: '🏍️',
    access: 'لوحة الكابتن — الطلبات الموكلة إليه فقط',
    tasks: [
      'عرض الطلبات المتاحة واستلامها (قبول الطلب)',
      'تحديث حالة الطلب: تجهيز ← بدء التوصيل ← تم التوصيل',
      'إدخال وقت التوصيل المقدر عند بدء التوصيل',
      'عرض موقع العميل على الخريطة',
      'محادثة العميل عبر شات الطلب',
      'عرض نشاطه (إحصائياته الشخصية)',
    ],
    notes: [
      'الكابتن يرى فقط الطلبات التي كلف بها أو المتاحة للتوصيل.',
      'يمكن للكابتن قبول الطلب من تبويب "متاحة".',
      'بعد قبول الطلب يظهر في تبويب "مكلف بها".',
      'عند الضغط على "بدء التوصيل" يجب إدخال وقت التوصيل بالدقائق.',
      'يمكن للكابتن محادثة العميل عبر أيقونة 💬 في بطاقة الطلب.',
    ]
  },
  {
    id: 'customer', label: 'المستخدم (العميل)', icon: '👤',
    access: 'التطبيق الرئيسي — تقديم الطلبات ومتابعتها',
    tasks: [
      'تصفح المنتجات والفئات',
      'إضافة منتجات إلى سلة التسوق',
      'تقديم طلبات جديدة',
      'متابعة حالة الطلب (استلام، تجهيز، توصيل)',
      'محادثة المتجر والدعم عبر شات الطلب',
      'عرض الملف الشخصي والفواتير السابقة',
      'إرسال رسائل صوتية',
    ],
    notes: [
      'المستخدم لا يدخل لوحة التحكم.',
      'يمكن للعميل تتبع طلبه عبر تبويب "طلباتي".',
      'يمكن للعميل التواصل مع الكابتن عبر محادثة الطلب.',
      'في حالة وجود مشكلة، يمكن استخدام واتساب أو شات الدعم.',
    ]
  },
];

const ROLE_LABELS = { admin: 'مدير', manager: 'مدير عام', employee: 'موظف', driver: 'كابتن' };

export default function AdminInstructions({ staffRole }) {
  const defaultRole = ROLE_MAP[staffRole] || 'admin';
  const [activeRole, setActiveRole] = useState(defaultRole);

  return (
    <div className="admin-instructions">
      <h2 className="admin-section-title">📖 تعليمات النظام</h2>
      <p className="admin-section-desc">مرحباً! أنت حالياً <strong>{ROLE_LABELS[staffRole] || staffRole}</strong> — اختر دوراً أدناه لمعرفة المهام والصلاحيات.</p>

      <div className="admin-instructions-tabs">
        {ROLES.map(r => (
          <button key={r.id}
            className={`admin-instructions-tab ${activeRole === r.id ? 'active' : ''}`}
            onClick={() => setActiveRole(r.id)}
          >
            {r.icon} {r.label}
          </button>
        ))}
      </div>

      {ROLES.filter(r => r.id === activeRole).map(r => (
        <div key={r.id} className="admin-instructions-content">
          <div className="admin-instructions-header">
            <span className="admin-instructions-role-icon">{r.icon}</span>
            <div>
              <h3>{r.label}</h3>
              <span className="admin-instructions-access">{r.access}</span>
            </div>
          </div>

          <h4>📋 المهام</h4>
          <ul className="admin-instructions-list">
            {r.tasks.map((t, i) => <li key={i}>{t}</li>)}
          </ul>

          <h4>💡 ملاحظات</h4>
          <ul className="admin-instructions-notes">
            {r.notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </div>
      ))}

      <div className="admin-instructions-footer">
        <hr />
        <p className="admin-instructions-dev">
          تم تطويره بواسطة <strong>فريق SYN</strong>
        </p>
        <p className="admin-instructions-contact">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          yaser.haroon79@gmail.com
        </p>
        <p className="admin-instructions-contact">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
          00966558570889
        </p>
      </div>
    </div>
  );
}
