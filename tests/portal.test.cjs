const fs = require('node:fs');
const assert = require('node:assert/strict');
const root = process.cwd();
const portal = fs.readFileSync(`${root}/index.html`, 'utf8');
const workshop = fs.readFileSync(`${root}/workshop.html`, 'utf8');
for (const route of ['workshop.html','catalog.html','platform/public/platform-admin.html','platform/public/workshop-register.html','print_images.html','CHANGELOG.md','README.md']) {
  assert.ok(portal.includes(`href=\"${route}\"`), `Portal must link to ${route}`);
}
assert.match(portal, /id=\"link-search\"/);
assert.match(portal, /data-search=/);
assert.match(workshop, /href=\"index.html\"/);
assert.match(workshop, /assets\/js\/auth\.js/);
assert.match(workshop, /backup: \(\) => openBackupOptionsModal\(\)/);
assert.match(workshop, /AuthModule\.init\(\)/);
console.log('Central portal navigation checks passed.');
