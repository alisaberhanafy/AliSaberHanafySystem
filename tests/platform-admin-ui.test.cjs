const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'platform/public/platform-admin.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'platform/public/platform-admin.html'), 'utf8');
for (const token of ['function tenantState(', 'stateMeta', 'data-status="${meta.action}"', 'window.confirm(', 'btn.disabled = true', 'await db.ref().update(updates)', 'await loadTenants()', 'tenant-search', 'tenant-filter']) {
  if (!js.includes(token)) throw new Error(`Missing smart workshop-management behavior: ${token}`);
}
for (const id of ['tenant-total', 'tenant-active', 'tenant-suspended', 'tenant-review', 'tenant-search', 'tenant-filter']) {
  if (!html.includes(`id="${id}"`)) throw new Error(`Missing workshop management UI control: ${id}`);
}
if (!html.includes('state-active') || !html.includes('state-suspended')) throw new Error('Workshop status styles missing');
console.log('Platform admin smart-state UI checks passed.');
