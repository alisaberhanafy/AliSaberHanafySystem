# Changelog

## v1.5.10 — Authentication Diagnostics
- Replaced the generic login failure message with actionable Firebase Auth and Realtime Database diagnostics.
- Added explicit handling for invalid credentials, missing users, disabled users, unauthorized GitHub Pages domains, invalid API keys, and database permission failures.
- Displayed the active Firebase project ID in the login gate to expose staging/production mismatches.
- Preserved tenant membership checks and data isolation; no security rules were weakened.
- Added regression tests for auth diagnostics and ensured tenant-index tests run in CI.

## v1.5.9 — Unified Staging Authentication & Tenant Data Isolation
- Unified workshop, catalog, registration, and platform-admin client configuration on the same Staging Firebase project.
- Replaced legacy `userRoles/{uid}` login authorization with `userTenantIndex/{uid}` + `tenantMemberships/{tenantId}/{uid}` validation.
- Added a tenant-scoped data adapter at `tenants/{tenantId}/workshopData`; workshop and catalog reads/writes no longer target the shared legacy root.
- Added platform-admin index creation, status synchronization, and repair for existing tenant owners.
- Added RTDB rules for owner-index reads and tenant-scoped workshop data.
- Kept legacy production data untouched; migration requires an explicit verified backup/import.

## v1.5.8 — Platform Admin UI Refresh

- Reworked the platform administration interface into a bright white workspace with restrained violet accents, consistent card surfaces, and clearer visual hierarchy.
- Increased Arabic typography sizes, form control heights, spacing, and status readability.
- Added a collapsible desktop sidebar with saved preference and a mobile slide-in navigation drawer with scrim and Escape-to-close behavior.
- Made the platform navigation links functional and connected them to the relevant page sections.
- Preserved Firebase Authentication, Realtime Database operations, IDs, and existing tenant-isolation logic.
- Added automated responsive-navigation and typography checks.

## v1.5.7 — Central System Portal

- Added a modern responsive system homepage as the default `index.html` entry point.
- Moved the existing workshop application intact to `workshop.html` and added a clear return link to the portal.
- Organized working links into workshop operations, platform administration, tools, and documentation.
- Added global link search, quick-access cards, responsive navigation, and explicit staging environment labeling.
- Added authenticated deep links for backup, workspace personalization, client search, and quick payment.
- Updated automated checks for the new portal and preserved existing workshop authentication/preferences tests.

## v1.5.6 — Smart Workshop Management

- Replaced duplicate activate/stop controls with one context-aware action based on the combined workshop directory and billing state.
- Added explicit state badges for active, trial, suspended, closed, and review-required workshops.
- Added workshop search by name, tenant ID, or owner UID, plus state filters and live summary counters.
- Added confirmation before changing workshop access, disabled the action while saving, and refreshed authoritative Firebase state after success or failure.
- Added clearer permission-denied guidance and regression checks for the platform admin workflow.
- Kept the existing Firebase data model and tenant isolation rules unchanged.

## v1.5.5.1 — Platform billing read permission fix
- Fixed the platform admin workshop list returning `Permission denied`: the console reads `/platformBilling` as a collection, so the RTDB rules now grant collection-level read access only to authenticated users with the `platformAdmin` custom claim.
- Kept write permissions scoped to individual billing records and protected by the same platform-admin claim.
- Added a static regression check for the collection-level read rule.

# سجل التغييرات

## 1.2.0 — 2026-11-08
- إصلاح ربط ملفات JavaScript بعد إعادة التقسيم، وربط صفحة الكتالوج بالملف الخارجي فعلياً.
- إضافة وحدة حسابات مالية موحدة واختبارات آلية للخصم والمدفوع والمتبقي والعربون والتكلفة.
- منع الاستبدال الصامت لبيانات العملاء والكتالوج عند اكتشاف تعديل متزامن على جهاز آخر؛ يتم إيقاف الحفظ المتعارض بدلاً من الكتابة فوق بيانات أحدث.
- إضافة طابور للحفظ المتكرر أثناء استمرار عملية الحفظ.
- حفظ تكلفة الصنف وقت إضافته للفاتورة الجديدة، مع تمييز أرباح الفواتير القديمة غير مكتملة التكلفة.
- تصحيح التاريخ المحلي ومؤشرات آخر سبعة أيام، واستكمال حماية استيراد النسخ الاحتياطية.

## 1.1.0 — 2026-11-08
- تقسيم ملف JavaScript الرئيسي إلى وحدات وظيفية.
- فصل إعدادات Firebase المشتركة.
- استخراج منطق صفحة الكتالوج إلى ملف مستقل.
- استخدام تحديثات Firebase الجزئية بدلاً من استبدال جذر البيانات.
- تحسين إظهار حالة الاتصال ومعالجة الحفظ المحلي.
- استكمال واجهة الدفع السريع.
- إضافة توثيق هيكل المشروع وخطوات النشر والاختبار.

## 1.0.0
- النسخة الأصلية المستلمة.


## 1.3.0 — 2026-11-08
- إضافة Firebase Authentication بالبريد الإلكتروني وكلمة المرور.
- إضافة بوابة تسجيل دخول إلى لوحة النظام وصفحة الكتالوج.
- تعطيل التسجيل العام من واجهة المستخدم.
- إضافة أدوار owner/admin/editor/viewer مع صلاحيات كتابة مبدئية على مستوى قاعدة البيانات.
- إضافة قالب Realtime Database Security Rules ودليل إعداد المالك الأول.
- إضافة تسجيل الخروج.
- لم يتم نشر قواعد Firebase أو تعديل بيانات المشروع السحابي؛ يتطلب ذلك UID المالك وموافقة إعداد Firebase.


## 1.4.0 — 2026-11-08
- اعتماد نموذج البيع Hybrid: SaaS مركزي ونسخة مستقلة لكل ورشة.
- توثيق بنية Multi-Tenant وعزل بيانات الورش والأدوار.
- إضافة مسودة قواعد Realtime Database للتجربة فقط.
- إضافة مخططات JSON للورش وعضويات المستخدمين.
- توثيق نموذج الاشتراكات والتراخيص وخطة ترحيل آمنة من المسار القديم.

## v1.5.4.1
- Fixed missing closing parenthesis in tenant membership write security rule. Revalidated rule-expression delimiter balance.

## v1.5.4.3 — UI Refresh
- Rebuilt platform admin and workshop registration pages with a consistent responsive Arabic RTL design.
- Improved registration feedback, UID copy action, and pending-activation explanation.
- Kept Firebase authentication and tenant-management logic intact.

## v1.5.5 — Easy Mode & Workspace Personalization
- Added Easy Mode and Advanced Mode for workshop owners.
- Added per-account dashboard widget visibility settings.
- Added per-account local preference persistence without changing business data.
- Added IBM Plex Sans Arabic/Latin typography and responsive settings UI.
- Documented the current legacy data-path boundary and safe next steps for tenant-scoped cloud preferences.
- No Firebase rules, authentication roles, invoice calculations, or business data paths changed.


## v1.5.11
- Fix: accept legacy string and current object formats in `userTenantIndex` while validating the authoritative `tenantMemberships` record.
- Add local Windows Terminal toolkit for Staging membership diagnostics and guarded index repair.
- Add dry-run, explicit apply confirmation, project-ID guard, owner/status checks, post-write verification, and local pre-change backup.
