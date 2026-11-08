# إصدار Zero-Cost — دليل التشغيل

## ما الذي تغير؟
- لا يستخدم Cloud Functions أو أي endpoint مدفوع.
- لوحة مدير المنصة تستخدم Firebase Web SDK مباشرة.
- ملف Firebase Web config منفصل ومحدد لمشروع `alisabersystem-staging`.
- قواعد RTDB خاصة بـ Spark محفوظة في `platform/database.rules.spark.json`.
- تم حذف مسار نشر Cloud Functions من هذا الإصدار.
- إعداد الإنتاج `assets/js/firebase-config.js` لم يتغير.

## خطوات تجهيز Spark
1. في مشروع `AliSaberSystem-Staging` افتح Realtime Database > Rules.
2. استبدل القواعد بمحتوى `platform/database.rules.spark.json` ثم Publish.
3. لا تنشر هذا الملف في مشروع الإنتاج.
4. ارفع مجلد المشروع إلى GitHub كما تفعل عادةً، وفعّل GitHub Pages.
5. افتح `platform/public/workshop-register.html` من رابط GitHub Pages ليُنشئ مالك الورشة حسابه.
6. يرسل صاحب الورشة UID الظاهر له إلى مدير المنصة.
7. افتح `platform/public/platform-admin.html` وسجّل الدخول بحساب المنصة الذي يحمل Custom Claim `platformAdmin`.
8. أنشئ الورشة باستخدام اسمها وUID المالك.

## ملاحظات أمنية وحدود النسخة المجانية
- Custom Claim `platformAdmin` لا يمكن للمستخدم تعيينه بنفسه؛ تم تعيينه مسبقاً باستخدام Admin SDK.
- قواعد RTDB تتحقق من Custom Claim وتمنح صلاحيات إدارة المنصة.
- مالك الورشة لا يستطيع إضافة مالك آخر أو تغيير عضويته بنفسه. يمكنه إضافة/تعديل عضويات غير المالكين عبر قواعد العضوية.
- في هذه النسخة، إنشاء حساب صاحب الورشة يتم بنفسه من صفحة التسجيل؛ لا يمكن للمتصفح إنشاء حسابات Auth للآخرين أو إرسال روابط إعادة تعيين نيابة عنهم بأمان دون Admin SDK.
- بيانات الورش لا تزال بحاجة إلى ترحيل تطبيق الورشة الحالي من `/ali_saber_system_data` إلى `/tenants/{tenantId}`. هذه الحزمة لا تنفذ ذلك الترحيل.
- لا توجد رسوم Functions، لكن Spark له حدود استخدام وقد تتغير شروطه. GitHub Pages وFirebase Authentication/Realtime Database ضمن حدود الخطط المجانية الحالية، وليست ضماناً لاستخدام غير محدود.
- لا تضع Service Account JSON أو مفاتيح Admin SDK داخل GitHub أو ملفات الموقع.

## إصلاح قواعد الأمان v1.5.4.1
تم إصلاح القوس الناقص في شرط كتابة عضويات الورش. استخدم ملف `platform/database.rules.spark.json` من هذه النسخة بدلاً من الملف السابق.
