#!/usr/bin/env node
"use strict";

// Local-only Firebase RTDB diagnostics and narrowly-scoped index repair.
// Never place the Service Account JSON inside this repository.
const fs = require("node:fs");
const path = require("node:path");
const admin = require("firebase-admin");

const PROJECT_ID = "alisabersystem-staging";
const DATABASE_URL = "https://alisabersystem-staging-default-rtdb.europe-west1.firebasedatabase.app";
const args = process.argv.slice(2);
const command = args[0] || "check";
const uid = readArg("--uid");
const tenantId = readArg("--tenant");
const apply = args.includes("--apply");
const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || readArg("--key");

function readArg(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : "";
}
function fail(message) { throw new Error(message); }
function safeSegment(value, label) {
  if (!value || !/^[A-Za-z0-9_-]{10,128}$/.test(value)) fail(`${label} غير صالح.`);
}
function stamp() { return new Date().toISOString().replace(/[:.]/g, "-"); }

async function main() {
  if (!['check', 'repair'].includes(command)) {
    fail('الأمر غير معروف. استخدم check أو repair.');
  }
  safeSegment(uid, 'UID');
  safeSegment(tenantId, 'Tenant ID');
  if (!keyPath || !fs.existsSync(keyPath)) {
    fail('ملف Service Account غير موجود. عيّن GOOGLE_APPLICATION_CREDENTIALS أو استخدم --key "مسار الملف".');
  }

  const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  if (serviceAccount.project_id !== PROJECT_ID) {
    fail(`رفض التنفيذ: المفتاح تابع للمشروع ${serviceAccount.project_id || 'غير معروف'} وليس ${PROJECT_ID}.`);
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: PROJECT_ID,
    databaseURL: DATABASE_URL
  });
  const db = admin.database();
  const refs = {
    membership: db.ref(`tenantMemberships/${tenantId}/${uid}`),
    index: db.ref(`userTenantIndex/${uid}/${tenantId}`),
    directory: db.ref(`platform/tenantDirectory/${tenantId}`),
    billing: db.ref(`platformBilling/${tenantId}`),
    profile: db.ref(`tenants/${tenantId}/profile`)
  };
  const [membershipSnap, indexSnap, directorySnap, billingSnap, profileSnap] = await Promise.all([
    refs.membership.get(), refs.index.get(), refs.directory.get(), refs.billing.get(), refs.profile.get()
  ]);
  const membership = membershipSnap.val();
  const indexValue = indexSnap.val();
  const directory = directorySnap.val();
  const billing = billingSnap.val();
  const profile = profileSnap.val();

  const report = {
    projectId: PROJECT_ID,
    uid,
    tenantId,
    checks: {
      membershipExists: membershipSnap.exists(),
      membershipActive: membership?.active === true,
      membershipRole: membership?.role || null,
      indexExists: indexSnap.exists(),
      indexFormat: typeof indexValue === 'string' ? 'legacy-string' : (indexValue && typeof indexValue === 'object' ? 'object' : typeof indexValue),
      indexValue,
      directoryExists: directorySnap.exists(),
      directoryOwnerMatches: directory?.ownerUid === uid,
      directoryStatus: directory?.status || null,
      billingStatus: billing?.status || null,
      profileExists: profileSnap.exists()
    }
  };

  const membershipValid = membership?.active === true && ['owner','admin','editor','viewer'].includes(membership?.role);
  const directoryValid = directory?.ownerUid === uid && directory?.status === 'active';
  const billingValid = billing?.status === 'trial' || billing?.status === 'active';
  const profileValid = profileSnap.exists();
  const indexMatches = indexValue === tenantId || (
    indexValue && typeof indexValue === 'object' && indexValue.tenantId === tenantId &&
    indexValue.active === membership?.active && indexValue.role === membership?.role
  );
  report.checks.indexMatchesMembership = Boolean(indexMatches);
  report.checks.readyForLogin = Boolean(membershipValid && directoryValid && billingValid && profileValid);

  if (command === 'check') {
    console.log(JSON.stringify(report, null, 2));
    if (!report.checks.readyForLogin) process.exitCode = 2;
    return;
  }

  // Repair is intentionally restricted to a verified owner record and an active tenant.
  if (!membershipValid) fail('رفض الإصلاح: سجل العضوية غير موجود أو غير نشط أو دوره غير صالح. لم يتم تغيير أي بيانات.');
  if (membership.role !== 'owner' || directory?.ownerUid !== uid) fail('رفض الإصلاح: UID المحدد ليس مالك الورشة المسجل في tenantDirectory.');
  if (!directoryValid || !billingValid || !profileValid) fail('رفض الإصلاح: حالة الورشة أو الاشتراك أو ملف الورشة غير جاهز. لم يتم تغيير أي بيانات.');
  if (indexValue !== null && indexValue !== tenantId && !(indexValue && typeof indexValue === 'object' && indexValue.tenantId === tenantId)) {
    fail('رفض الإصلاح: قيمة الفهرس الحالية لا تطابق Tenant ID المحدد. راجع النسخة الاحتياطية قبل أي تعديل.');
  }

  const desired = { tenantId, active: true, role: membership.role };
  report.repair = { path: `userTenantIndex/${uid}/${tenantId}`, before: indexValue, after: desired, applied: false };
  if (!apply) {
    console.log('وضع المعاينة فقط — لم يتم تعديل Firebase.');
    console.log(JSON.stringify(report, null, 2));
    console.log('للتنفيذ الفعلي أعد الأمر مع --apply بعد مراجعة التقرير.');
    return;
  }

  const backupDir = path.join(__dirname, 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `tenant-index-${uid}-${tenantId}-${stamp()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify({
    exportedAt: new Date().toISOString(), projectId: PROJECT_ID, uid, tenantId,
    membership, indexValue, directory, billing, profile
  }, null, 2), { flag: 'wx' });

  await refs.index.set(desired);
  const verifySnap = await refs.index.get();
  const verified = verifySnap.val();
  if (!verified || verified.tenantId !== tenantId || verified.active !== true || verified.role !== membership.role) {
    fail('تم تنفيذ الكتابة لكن فشل التحقق اللاحق. احتفظ بالنسخة الاحتياطية وراجع قاعدة البيانات.');
  }
  report.repair.applied = true;
  report.repair.backupFile = path.relative(__dirname, backupFile);
  report.repair.verified = true;
  console.log('تم إصلاح فهرس العضوية والتحقق منه بنجاح.');
  console.log(JSON.stringify(report, null, 2));
}

main().catch(error => {
  console.error(`\nفشل التنفيذ: ${error.message}`);
  process.exitCode = 1;
}).finally(async () => {
  try { await admin.app().delete(); } catch (_) {}
});
