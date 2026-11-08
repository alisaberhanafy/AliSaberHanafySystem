const fs=require('fs');
const admin=fs.readFileSync('platform/public/platform-admin.js','utf8');
if(!admin.includes('userTenantIndex/${ownerUid}/${tenantId}')) throw new Error('New tenant creation must create owner index');
if(!admin.includes('userTenantIndex/${row.t.ownerUid}/${row.id}')) throw new Error('Existing tenant owner index repair is missing');
if(!admin.includes('userTenantIndex/${row.t.ownerUid}/${id}/active')) throw new Error('Tenant activation must update owner index');
console.log('Tenant owner index checks passed.');
