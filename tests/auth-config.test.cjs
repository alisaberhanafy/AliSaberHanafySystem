const fs = require('fs');
const assert = require('assert');
const rules = JSON.parse(fs.readFileSync('firebase/database.rules.json', 'utf8'));
const index = fs.readFileSync('workshop.html', 'utf8');
const catalog = fs.readFileSync('catalog.html', 'utf8');
const auth = fs.readFileSync('assets/js/auth.js', 'utf8');

assert.ok(rules.rules.ali_saber_system_data['.read'].includes('auth != null'));
assert.ok(rules.rules.ali_saber_system_data['.write'].includes('auth != null'));
assert.ok(rules.rules.userRoles['$uid']['.write'].includes('REPLACE_WITH_OWNER_UID'));
assert.ok(index.includes('firebase-auth-compat.js') && index.includes('assets/js/auth.js'));
assert.ok(catalog.includes('firebase-auth-compat.js') && catalog.includes('assets/js/auth.js'));
assert.ok(auth.includes('signInWithEmailAndPassword'));
assert.ok(!auth.includes('createUserWithEmailAndPassword'));
console.log('Authentication and rules-template checks passed.');
