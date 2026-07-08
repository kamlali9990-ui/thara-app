import { useState, useEffect } from 'react';

const NOTIF_KEY = 'thara_notif_prompt_dismissed';

export default function NotificationPermissionPrompt() {
  const [visible, setVisible] = useState(false);
  const [staffRole, setStaffRole] = useState<string | null>(null);

  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'default') return;
    if (localStorage.getItem(NOTIF_KEY) === '1') return;
    const timer = setTimeout(() => {
      try {
        const roleStr = localStorage.getItem('thara_staff_role') || 'customer';
        setStaffRole(roleStr);
        setVisible(true);
      } catch {}
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleAllow = async () => {
    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        const { subscribePush } = await import('../utils/pushNotifications');
        const email = localStorage.getItem('thara_user_email');
        const role = localStorage.getItem('thara_staff_role') || 'customer';
        if (email) subscribePush(email, role).catch(() => {});
      }
    } catch {}
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(NOTIF_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  const isStaff = staffRole && staffRole !== 'customer';
  const icon = isStaff ? '🔔' : '🛒';
  const title = isStaff ? 'تنبيهات الطلبات' : 'تنبيهات الطلب';
  const desc = isStaff
    ? 'فعل الإشعارات ليصلك تنبيه فوري عند وصول طلب جديد وتحديثات الحالة'
    : 'فعل الإشعارات ليصلك تنبيه عند تحديث حالة طلبك والرد على رسائلك';

  return (
    <div className="notif-prompt-overlay" onClick={handleDismiss}>
      <div className="notif-prompt-card" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <div className="notif-prompt-icon">{icon}</div>
        <h3 className="notif-prompt-title">{title}</h3>
        <p className="notif-prompt-desc">{desc}</p>
        <div className="notif-prompt-actions">
          <button className="notif-prompt-btn notif-prompt-btn-allow" onClick={handleAllow}>
            تفعيل الإشعارات
          </button>
          <button className="notif-prompt-btn notif-prompt-btn-skip" onClick={handleDismiss}>
            لاحقاً
          </button>
        </div>
      </div>
    </div>
  );
}
