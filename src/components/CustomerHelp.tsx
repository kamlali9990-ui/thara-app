import { useState } from 'react';

export default function CustomerHelp() {
  const [open, setOpen] = useState(false);

  return (
    <div className="customer-help">
      <button className="customer-help-toggle" onClick={() => setOpen(!open)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span>تعليمات الاستخدام</span>
        <svg className={`customer-help-arrow ${open ? 'open' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div className="customer-help-content">
          <div className="customer-help-section">
            <h4>📲 تثبيت التطبيق</h4>
            <ul>
              <li>عند فتح الموقع لأول مرة، سيظهر إعلان تثبيت — اضغط "تثبيت التطبيق" لإضافته للشاشة الرئيسية</li>
              <li>إذا لم يظهر الإعلان: افتح قائمة المتصفح <b>⋮</b> ← اختَر <b>"تثبيت التطبيق"</b> أو <b>"إضافة للشاشة الرئيسية"</b></li>
              <li>لأجهزة الأندرويد يمكنك تحميل ملف APK مباشر من الرابط <b>"تحميل تطبيق الاندرويد"</b> في الإعلان</li>
              <li>بعد التثبيت، ستجد أيقونة التطبيق على شاشتك الرئيسية — استخدمها للدخول السريع</li>
            </ul>
          </div>
          <div className="customer-help-section">
            <h4>📍 السماح بتحديد الموقع</h4>
            <ul>
              <li>لتتمكن من إدخال عنوان التوصيل بسهولة، سيُطلب منك السماح بتحديد الموقع</li>
              <li>اضغط <b>"السماح"</b> أو <b>"Allow"</b> عند ظهور طلب الإذن من المتصفح</li>
              <li>يمكنك تغيير الإعداد لاحقاً من إعدادات المتصفح ← إعدادات الموقع ← تشغيل تحديد الموقع</li>
              <li>الموقع يُستخدم فقط لتسهيل إدخال العنوان ولا يُشارك مع أي جهة خارجية</li>
            </ul>
          </div>
          <div className="customer-help-section">
            <h4>🔔 السماح بالإشعارات</h4>
            <ul>
              <li>لتلقي تنبيهات الطلبات (تجهيز، شحن، توصيل)، سيُطلب منك السماح بالإشعارات</li>
              <li>اضغط <b>"السماح"</b> أو <b>"Allow"</b> عند ظهور طلب الإذن — ويفضل اختيار <b>"استمرار"</b> (Persistent)</li>
              <li>إذا رفضت، يمكنك تفعيلها لاحقاً من إعدادات المتصفح ← الإشعارات ← السماح للموقع</li>
              <li>الإشعارات تضمن وصول تحديثات الطلب فوراً حتى لو كان التطبيق مغلقاً</li>
            </ul>
          </div>
          <div className="customer-help-section">
            <h4>🛍️ التسوق</h4>
            <ul>
              <li>تصفح المنتجات من الصفحة الرئيسية أو الأقسام</li>
              <li>استخدم البحث للعثور على منتج معين</li>
              <li>أضف المنتجات إلى السلة بالضغط على أيقونة +</li>
              <li>يمكنك تعديل الكميات في السلة قبل الطلب</li>
            </ul>
          </div>
          <div className="customer-help-section">
            <h4>📦 الطلبات</h4>
            <ul>
              <li>بعد تأكيد الطلب، يمكنك متابعته من تبويب "طلباتي"</li>
              <li>ستتلقى إشعاراً عند تجهيز الطلب وشحنه</li>
              <li>يمكنك رؤية وقت التوصيل المقدر</li>
              <li>في حالة وجود مشكلة، يمكنك إلغاء الطلب قبل تجهيزه</li>
            </ul>
          </div>
          <div className="customer-help-section">
            <h4>💬 المحادثة</h4>
            <ul>
              <li>يمكنك التواصل مع المتجر عبر أيقونة الدعم في الشاشة الرئيسية</li>
              <li>لمتابعة طلب معين، استخدم "محادثة الطلب" من تبويب طلباتي</li>
              <li>يمكنك إرسال رسائل نصية وصوتية</li>
              <li>ستظهر لك إشعارات عند رد المتجر أو الكابتن</li>
            </ul>
          </div>
          <div className="customer-help-section">
            <h4>📍 التوصيل</h4>
            <ul>
              <li>أدخل عنوان التوصيل بدقة عند تقديم الطلب</li>
              <li>يمكن تحديد الموقع عبر الخريطة أو إدخال العنوان يدوياً</li>
              <li>عند بدء التوصيل، يمكنك تتبع الطلب عبر الخريطة</li>
              <li>سيتم إعلامك عند وصول الطلب</li>
            </ul>
          </div>
          <div className="customer-help-section">
            <h4>👤 الحساب</h4>
            <ul>
              <li>يمكنك تعديل اسمك ورقم جوالك من الملف الشخصي</li>
              <li>نقاط الولاء تتراكم مع كل طلب</li>
              <li>يمكنك تغيير كلمة المرور من الإعدادات</li>
              <li>للاستفسارات العامة، تواصل معنا عبر واتساب</li>
            </ul>
          </div>
          <div className="customer-help-footer">
            <hr />
            <p>تم تطويره بواسطة <strong>فريق SYN</strong></p>
            <p>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              yaser.haroon79@gmail.com
            </p>
            <p>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
              00966558570889
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
