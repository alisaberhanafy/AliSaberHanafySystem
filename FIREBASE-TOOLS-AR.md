# أدوات Firebase من التيرمنال — Staging فقط

## التشغيل السريع على Windows

1. فك ضغط المشروع بالكامل في مجلد عادي.
2. تأكد أن مفتاح Service Account الخاص بمشروع `alisabersystem-staging` موجود محلياً في:
   `C:\FirebaseSecrets\staging-service-account.json`
3. شغّل `FIREBASE-TOOLS.bat`.
4. أدخل UID صاحب الورشة وTenant ID.
5. اختر `1` للفحص فقط. هذا الخيار لا يغيّر أي بيانات.
6. اختر `2` لمعاينة الإصلاح. هذا الخيار لا يغيّر أي بيانات.
7. بعد مراجعة التقرير، اختر `3` واكتب `APPLY` للموافقة على الإصلاح.

## القيم الحالية التي كنا نفحصها

- Owner UID: `S2aoVoKEwYNXDcOJQBm2gdtq0ge2`
- Tenant ID: `ws_76f0c9493172475b8a`

الأداة لا تفترض هذه القيم تلقائياً؛ أدخلها عند التشغيل حتى لا يتم تعديل ورشة أخرى بالخطأ.

## ما الذي تفعله الأداة؟

- تتأكد أن Service Account تابع حصراً لمشروع `alisabersystem-staging`.
- تقرأ العضوية، وفهرس المستخدم، ومالك الورشة، وحالة الورشة والاشتراك، وملف الورشة.
- الإصلاح مسموح فقط إذا كان UID هو المالك الفعلي، والعضوية نشطة، والورشة والاشتراك بحالة تسمح بالدخول.
- قبل الكتابة تنشئ نسخة JSON محلية من السجلات التي فحصتها داخل `platform/admin-tools/backups/`.
- تصلح مساراً واحداً فقط: `userTenantIndex/{uid}/{tenantId}`، ثم تعيد قراءته للتحقق.
- لا تنشئ مستخدمين، ولا تغيّر كلمات المرور، ولا تعدّل بيانات الورشة أو الفواتير.

## أوامر مباشرة (اختياري)

من مجلد المشروع:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\FirebaseSecrets\staging-service-account.json'
cd platform/admin-tools
npm install
node tenant-access.js check --uid 'S2aoVoKEwYNXDcOJQBm2gdtq0ge2' --tenant 'ws_76f0c9493172475b8a'
node tenant-access.js repair --uid 'S2aoVoKEwYNXDcOJQBm2gdtq0ge2' --tenant 'ws_76f0c9493172475b8a'
# بعد مراجعة المعاينة فقط، نفّذ الإصلاح بإضافة --apply
node tenant-access.js repair --uid 'S2aoVoKEwYNXDcOJQBm2gdtq0ge2' --tenant 'ws_76f0c9493172475b8a' --apply
```

**أمان:** لا ترسل ملف Service Account في المحادثة ولا ترفعه إلى GitHub. الأداة مخصصة لمشروع Staging المحدد، وترفض أي مفتاح تابع لمشروع آخر.
