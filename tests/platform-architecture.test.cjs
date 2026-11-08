const fs = require("fs");
const path = require("path");
const base = path.join(__dirname, "..", "platform");
const fn = fs.readFileSync(path.join(base, "functions/index.js"), "utf8");
const rules = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "architecture/firebase/database.rules.multitenant.draft.json"), "utf8"));
const html = fs.readFileSync(path.join(base, "public/platform-admin.html"), "utf8");
const js = fs.readFileSync(path.join(base, "public/platform-admin.js"), "utf8");
for (const name of ["createTenant", "listPlatformTenants", "setTenantStatus", "addTenantMember", "setTenantMember"]) {
  if (!fn.includes(`exports.${name} = onCall`)) throw new Error(`Missing callable: ${name}`);
}
if (!rules.rules.tenants.$tenantId[".read"].includes("tenantMemberships")) throw new Error("Tenant read rule must verify membership");
if (rules.rules.tenantMemberships.$tenantId.$uid[".write"] !== false) throw new Error("Membership must not be writable by clients");
if (rules.rules.platformBilling.$tenantId[".write"] !== false) throw new Error("Billing must not be writable by clients");
if (!html.includes("owner-email") || !js.includes("ownerEmail")) throw new Error("Platform console must assign a tenant owner");
if (fn.includes("REPLACE_WITH_OWNER_UID")) throw new Error("Do not use hard-coded placeholder UID");
console.log("Platform architecture checks passed.");
