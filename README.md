# Ali Saber System v1.5.4.3 — Zero-Cost UI Refresh

نسخة تجريبية لتجهيز إدارة الورش على Firebase Spark دون Cloud Functions.

- لوحة إدارة المنصة: `platform/public/platform-admin.html`
- تسجيل أصحاب الورش: `platform/public/workshop-register.html`
- قواعد Staging: `platform/database.rules.spark.json`
- إعداد Staging منفصل: `platform/public/firebase-config.staging.js`

اقرأ `platform/ZERO_COST_GUIDE_AR.md` قبل النشر. لا تنشر قواعد Staging على مشروع الإنتاج، ولا ترفع Service Account JSON إلى GitHub.


## واجهات الإدارة المحسّنة
- `platform/public/platform-admin.html`: لوحة إدارة متجاوبة بهوية موحدة.
- `platform/public/workshop-register.html`: بوابة تسجيل محسّنة ومتوافقة مع الهواتف.
