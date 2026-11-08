const fs = require('fs');
const auth = fs.readFileSync('assets/js/auth.js', 'utf8');
const config = fs.readFileSync('assets/js/firebase-config.js', 'utf8');
for (const code of ['auth/invalid-login-credentials','auth/invalid-api-key','auth/app-not-authorized','auth/unauthorized-domain','PERMISSION_DENIED']) {
  if (!auth.includes(code)) throw new Error(`Missing actionable auth diagnostic for ${code}`);
}
if (!auth.includes('window.AliFirebaseConfig?.projectId')) throw new Error('Firebase project diagnostic is missing');
if (!auth.includes('describeLoginFailure')) throw new Error('Centralized login error handling is missing');
if (!config.includes('alisabersystem-staging')) throw new Error('Workshop auth must point to staging project');
console.log('Auth diagnostics checks passed.');
