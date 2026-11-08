# Ali Saber System v1.5.9 — Unified Staging & Tenant Isolation

نسخة تجريبية لتجهيز إدارة الورش على Firebase Spark دون Cloud Functions.

- لوحة إدارة المنصة: `platform/public/platform-admin.html`
- تسجيل أصحاب الورش: `platform/public/workshop-register.html`
- قواعد Staging: `platform/database.rules.spark.json`
- إعداد Firebase الموحد لكل الواجهات: `assets/js/firebase-config.js`
- فهرس ربط المستخدم بالورشة: `userTenantIndex/{uid}`
- بيانات كل ورشة: `tenants/{tenantId}/workshopData`

اقرأ `platform/ZERO_COST_GUIDE_AR.md` قبل النشر. لا تنشر قواعد Staging على مشروع الإنتاج، ولا ترفع Service Account JSON إلى GitHub.


## واجهات الإدارة المحسّنة
- `platform/public/platform-admin.html`: لوحة إدارة متجاوبة بهوية موحدة.
- `platform/public/workshop-register.html`: بوابة تسجيل محسّنة ومتوافقة مع الهواتف.


## مركز النظام الرئيسي
- `index.html`: البوابة الرئيسية وروابط جميع مساحات النظام.
- `workshop.html`: تطبيق إدارة الورشة الحالي (تم نقله من index.html للحفاظ على وظائفه وملفاته).
- `catalog.html`: إدارة الكتالوج والمخزون.
- `platform/public/platform-admin.html`: لوحة مدير المنصة.
- `platform/public/workshop-register.html`: تسجيل حساب صاحب ورشة.
- `print_images.html`: أداة الطباعة.


### v1.5.8
تم تحديث واجهة إدارة المنصة إلى تصميم فاتح، مع تكبير الخطوط والبطاقات وإضافة شريط جانبي قابل للطي على الكمبيوتر وقائمة جانبية منزلقة على الهاتف.


### v1.5.9 — إصلاح تسجيل الدخول وعزل بيانات الورش
- توحيد مشروع Firebase المستخدم في التطبيق ولوحة المنصة والتسجيل على `alisabersystem-staging`.
- اعتماد `userTenantIndex` و`tenantMemberships` للتحقق من عضوية صاحب الورشة بدلاً من نظام `userRoles` القديم.
- نقل مسار قراءة وكتابة بيانات التطبيق والكتالوج إلى مساحة خاصة بكل ورشة.
- إنشاء فهرس المالك تلقائياً عند إضافة ورشة، وإصلاح الفهرس للورش المسجلة سابقاً عند تحديث قائمة الورش من لوحة المنصة.
- تحديث قواعد Realtime Database لمنع القراءة والكتابة خارج عضوية الورشة النشطة.

**تنبيه ترحيل:** النسخة لا تنسخ بيانات مشروع الإنتاج القديم تلقائياً إلى Staging. بيانات الإنتاج لم يتم تعديلها. خذ نسخة احتياطية من النظام القديم، ثم استوردها داخل حساب الورشة المقصود بعد التأكد من الربط.


### v1.5.11 — توافق فهرس العضويات وأدوات Terminal
- أصبح تسجيل الدخول يدعم تنسيق `userTenantIndex` القديم الذي تكون فيه قيمة الورشة نصاً، والتنسيق الحالي الذي تكون فيه كائناً. يظل `tenantMemberships` هو المصدر المعتمد لحالة العضوية والدور.
- إضافة `FIREBASE-TOOLS.bat` لإجراء فحص وتهيئة إصلاح فهرس العضوية من Windows دون تعديل يدوي في Firebase Console.
- الإصلاح يبدأ بوضع معاينة، ويتطلب موافقة صريحة، ويتحقق من Staging وملكية الورشة وحالتها، ويحفظ نسخة محلية قبل الكتابة.
- مفاتيح Service Account والنسخ الاحتياطية و`node_modules` تبقى محلية ولا تُرفع إلى GitHub.
