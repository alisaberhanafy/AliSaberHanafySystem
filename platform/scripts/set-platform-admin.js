#!/usr/bin/env node
/**
 * Assigns platformAdmin to one Firebase Auth user in the STAGING project only.
 * The service-account JSON stays on the operator's computer and is never copied
 * into this repository or sent to a remote service by this script.
 */
const fs = require("node:fs");
// The setup BAT installs dependencies in platform/functions. This script lives
// in platform/scripts, so resolve firebase-admin from that sibling package.
const admin = require("../functions/node_modules/firebase-admin");

const uid = process.argv[2];
const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const EXPECTED_PROJECT_ID = "alisabersystem-staging";

async function main() {
  if (!uid) throw new Error("لم يتم تحديد UID لحساب مدير المنصة.");
  if (!keyPath || !fs.existsSync(keyPath)) {
    throw new Error("ملف Service Account غير موجود في المسار المحدد.");
  }

  const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));
  if (serviceAccount.project_id !== EXPECTED_PROJECT_ID) {
    throw new Error(
      `رفض التنفيذ: المفتاح ليس لمشروع Staging المتوقع (${EXPECTED_PROJECT_ID}).`
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: EXPECTED_PROJECT_ID
  });

  const user = await admin.auth().getUser(uid);
  const claims = { ...(user.customClaims || {}), platformAdmin: true };
  await admin.auth().setCustomUserClaims(uid, claims);

  const verified = await admin.auth().getUser(uid);
  if (verified.customClaims?.platformAdmin !== true) {
    throw new Error("تعذر التحقق من حفظ صلاحية platformAdmin.");
  }

  console.log("");
  console.log("نجاح: تم تعيين صلاحية مدير المنصة لحساب Firebase.");
  console.log(`UID: ${uid}`);
  console.log(`Project: ${EXPECTED_PROJECT_ID}`);
  console.log("الخطوة التالية: سجّل الخروج من التطبيق ثم سجّل الدخول مرة أخرى.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("");
    console.error("فشل التنفيذ:", error.message);
    process.exit(1);
  });
