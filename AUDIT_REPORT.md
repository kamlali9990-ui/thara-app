# تقرير الفحص الشامل — أسواق ثراء الشرق ون
**تاريخ التقرير:** 7 يونيو 2026  
**الحالة العامة:** ✅ جاهز للإطلاق التجريبي (Beta)

---

## 🟢 الميزات الجاهزة (85+ ميزة)

### واجهة العميل
| الميزة | الحالة |
|--------|--------|
| شاشة البداية (Splash Screen) | ✅ |
| شريط التبويب السفلي (5 تبويبات) | ✅ |
| القائمة الجانبية | ✅ |
| الوضع الليلي/الفاتح | ✅ |
| شريط البحث الفوري | ✅ |
| البانر الإعلاني (من Supabase) | ✅ |
| الأقسام (شريط متحرك) | ✅ |
| العروض (شريط متحرك) | ✅ |
| قسم الاتصال (واتساب/جوال/بريد/سناب) | ✅ |
| تصفح الأقسام مع البحث | ✅ |
| عرض منتجات القسم (شكل مربع متجدد) | ✅ |
| عرض الكل (عروض/أفضل مبيعات) | ✅ |
| بطاقة المنتج مع التفاصيل (مودال) | ✅ |
| سلة التسوق (Bottom Sheet) | ✅ |
| إتمام الطلب (الموقع + الهاتف + الدفع) | ✅ |
| خريطة الخفجي (Leaflet + Nominatim) | ✅ |
| حساب التوصيل (مسافة) | ✅ |
| سجل الطلبات | ✅ |
| الدردشة المباشرة لكل طلب | ✅ |
| حساب المستخدم (تعديل الملف + تغيير كلمة المرور) | ✅ |
| تسجيل الدخول/إنشاء حساب | ✅ |
| إشعارات المتصفح | ✅ |

### لوحة الأدمن
| الميزة | الحالة |
|--------|--------|
| لوحة تحكم حسب الصلاحية (مدير/موظف/سائق) | ✅ |
| إدارة الطلبات (حالة + تعيين سائق + ETA) | ✅ |
| محادثات الطلبات والدعم | ✅ |
| إدارة المنتجات (إضافة/تعديل/حذف/بحث) | ✅ |
| استيراد المنتجات (Excel/Large Paste) | ✅ |
| إدارة العروض (تفعيل/تعديل سعر) | ✅ |
| إدارة المستخدمين (عرض + إعادة تعيين كلمة مرور) | ✅ |
| إدارة الموظفين (إضافة/تعديل/حذف مع إنشاء حساب) | ✅ |
| إدارة الإعدادات (البانر) | ✅ |
| طباعة الفاتورة | ✅ |

### البنية التحتية
| الميزة | الحالة |
|--------|--------|
| PWA (Service Worker + Manifest كامل) | ✅ |
| التثبيت على الشاشة الرئيسية (Android/iOS) | ✅ |
| Error Boundary | ✅ |
| Toast Notifications | ✅ |
| تحديث SW تلقائي | ✅ |
| Lazy Loading لجميع الصفحات | ✅ |
| ربط Supabase (23 RPC, RLS كامل) | ✅ |
| Realtime (طلبات + محادثات + كتابة) | ✅ |
| Dashboard Vercel + نطاق | ✅ |

---

## 🔴 يجب الإصلاح قبل الإطلاق

### 1. جدول `settings` غير موجود في قاعدة البيانات
- **الملف:** `src/supabase/settings.js` — يستدعي `supabase.from('settings')`
- **الخطر:** إعدادات البانر في لوحة الأدمن ستتعطل
- **الحل:** إنشاء جدول `settings` في Supabase (SQL بسيط):
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY settings_all ON settings FOR ALL TO authenticated USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE settings;
```

### 2. كلمة المرور الافتراضية `123456` مكشوفة
- **الملف:** `.env` — `VITE_STAFF_DEFAULT_PASSWORD=123456`
- **الخطر:** أي موظف جديد كلمة مروره `123456` — المخترق يحتاج فقط البريد الإلكتروني
- **الحل:** تغييرها في `.env` إلى كلمة آمنة (مثلاً `Thara@2026$`) وإجبار الموظف على تغييرها عند أول دخول

### 3. `GRANT ALL ON ALL TABLES TO authenticated` خطر
- **الملف:** `src/supabase/schema.sql` السطر 1161
- **الخطر:** أي مستخدم مسجل لديه صلاحية كاملة على كل الجداول (الـ RLS فقط يحميك)
- **الحل:** تطبيق الـ migration الموجود (`0008_harden_rls_and_grants.sql`) الذي يضبط الصلاحيات بشكل دقيق

### 4. صور ضخمة تبطئ التحميل (4.2 MB!)
- **الملف:** `dist/cat_canned.png` (4.2 MB) وفئات أخرى 500KB+
- **الخطر:** زمن تحميل الصفحة الرئيسية طويل جداً على الإنترنت البطيء
- **الحل:** ضغط الصور باستخدام [TinyPNG](https://tinypng.com) أو إضافة `vite-plugin-imagemin`

### 5. `pg` package في الـ dependencies
- **الخطر:** `pg` (مكتبة PostgreSQL) حجمها كبير (~300KB) وهذا تطبيق متصفح!
- **الحل:** `npm uninstall pg` إذا كنت لا تستخدمه مباشرة في المتصفح

### 6. خطأ RTL في CSS
- **الملف:** `src/styles/auth-pages.css` — عدة أماكن تستخدم `left` و `margin-left` بدلاً من `right` و `margin-right`
- **المواقع:** `.admin-offer-img` (سطر 570)، أزرار المسح في البحث (سطور 692، 1026)
- **الحل:** تغيير `left` ← `right` و `margin-left` ← `margin-right`

---

## 🟡 يجب الإصلاح قريباً

### الأداء
| المشكلة | التفاصيل | الحل |
|---------|----------|------|
| Leaflet CSS محمل بشكل ثابت | `import 'leaflet/dist/leaflet.css'` في `main.jsx` يمنع تحميل الصفحة (189KB) | نقله إلى lazy import مع الخريطة |
| `chunkSizeWarningLimit` عالي جداً | 2200KB — يخفي مشاكل الأحجام | تغييره إلى 500KB |
| لا يوجد تحسين للصور | 19.5MB حجم الـ dist ككل (معظمه صور) | إضافة ضغط تلقائي للصور في Vite |
| Bundle كبير (1.15MB JS) | xlsx (419KB) + supabase (206KB) + leaflet (146KB) + vendor (175KB) | مقبول حالياً مع الـ lazy loading |

### قاعدة البيانات
| المشكلة | التفاصيل | الحل |
|---------|----------|------|
| لا يوجد Index على `customers(email)` | RLS يسأل بـ `auth.jwt() ->> 'email' = email` بدون Index | `CREATE INDEX idx_customers_email ON customers(email);` |
| لا يوجد Index على `chat_messages(customer_email)` | يستخدم في التصفية | إضافة Index |
| No FK constraint | `orders.customer_email` ليس Foreign Key | إضافة `REFERENCES customers(email)` |
| `claim_order_rpc` في الـ Migration القديم يفتقد `FOR UPDATE` | سباق بين سائقين على نفس الطلب | تطبيق الـ schema.sql المحدث |

### الأمان
| المشكلة | التفاصيل | الحل |
|---------|----------|------|
| Cloudinary Upload Preset بدون توقيع | `UPLOAD_PRESET = 'thara_banners'` غير موقّع | تفعيل signed upload preset في لوحة Cloudinary |
| `VITE_ADMIN_EMAIL` في الـ Bundle | `yaser.haroon79@gmail.com` مكشوف في كود JavaScript | نقله إلى التحقق من جهة السيرفر |
| `create_customer_auth_rpc` متاح لـ `anon` | أي زائر يمكنه إنشاء حساب بدون تأكيد البريد | إضافة rate limiting أو CAPTCHA |
| لا يوجد `Content-Security-Policy` | في `vercel.json` | إضافة CSP header |

### تجربة المستخدم
| المشكلة | التفاصيل | الحل |
|---------|----------|------|
| `alert()` في CloudinaryUpload | بدلاً من Toast | تغيير `alert()` إلى `showToast()` |
| لا يوجد validation للجوال في التسجيل | المستخدم يمكنه التسجيل برقم خاطئ | إضافة pattern `^05\d{8}$` في Register.jsx |
| Splash مدته 4.4 ثانية | طويل جداً | تقليله إلى 2-3 ثوانٍ |
| زر الإضافة في العروض صغير | 24px — أصغر من الموصى به (44px) | تكبيره |
| `getStock` يصفي من `products` وليس `allProducts` | قد يظهر مخزون خاطئ عند التصفية | تغيير إلى `allProducts` |

---

## 🟢 تحسينات مستقبلية

### ميزات مفقودة
- إلغاء الطلب من جهة العميل
- سلة مفضلة (Wishlist)
- دفتر عناوين (حفظ المواقع)
- كوبونات خصم
- جدولة التوصيل
- تقييم المنتجات
- دفع إلكتروني (Mada, STC Pay)
- دعم لغات متعددة

### تقنية
- إضافة `vite-plugin-pwa` لإدارة SW تلقائياً
- إضافة Bundle Analyzer
- استبدال network-first بـ stale-while-revalidate في SW
- إضافة Background Sync للطلبات خارج التغطية
- إضافة Skeleton Loaders بدلاً من Spinners
- توحيد `InstallPrompt.jsx` و `AddToHomeScreen.jsx` في مكون واحد
- إزالة/de-duplicate تثبيت Cloudinary (package + CDN معاً)

---

## ✅ خلاصة — هل التطبيق جاهز؟

| المجال | التقييم | ملاحظة |
|--------|---------|--------|
| **الميزات** | 95% جاهز | ~85 ميزة عاملة، المفقودة غير حرجة (كوبونات، دفع إلكتروني) |
| **قاعدة البيانات** | 90% جاهز | المطلوب: إنشاء جدول `settings` + 2 Indexes |
| **الأمان** | 70% جاهز 🔴 | كلمة المرور `123456` و GRANT ALL خطران يجب حلهما فوراً |
| **الأداء** | 75% جاهز 🟡 | الصور 4.2MB و Leaflet CSS يمنعان التحميل |
| **تجربة المستخدم** | 90% جاهز | أخطاء RTL بسيطة + splash طويل |
| **PWA** | 95% جاهز | SW ممتاز، manifest كامل، install prompt شامل |
| **Supabase Backend** | 85% جاهز | الـ RPCs و RLS ممتازة، الـ indexes ناقصة |

### توصية: **جاهز للإطلاق التجريبي (Beta)** بعد إصلاح الـ 6 نقاط الحمراء

---

## خطة العمل المقترحة

### الأسبوع 1 (أساسيات)
1. إنشاء جدول `settings` في Supabase ✅ (دقيقة واحدة)
2. تغيير `VITE_STAFF_DEFAULT_PASSWORD` في `.env` ✅ (دقيقة واحدة)
3. تطبيق migration الصلاحيات `0008_harden_rls_and_grants.sql` ✅ (دقيقة واحدة)

### الأسبوع 2 (صور + أداء)
4. ضغط `cat_canned.png` من 4.2MB إلى ~200KB ✅
5. `npm uninstall pg` ✅
6. إضافة Indexes في Supabase ✅ (5 دقائق)
7. إصلاح RTL bugs في CSS ✅ (10 دقائق)

### الأسبوع 3 (تحسينات)
8. إضافة CSP header في `vercel.json` ✅
9. تغيير `alert()` إلى Toast في CloudinaryUpload ✅
10. إضافة validation للجوال في Register.jsx ✅
11. تقليل مدة Splash ✅

### بعد الإطلاق
12. إضافة الدفع الإلكتروني
13. كوبونات الخصم
14. دفع عناوين
