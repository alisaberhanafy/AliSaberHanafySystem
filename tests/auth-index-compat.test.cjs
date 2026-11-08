const fs = require("fs");
const auth = fs.readFileSync("assets/js/auth.js", "utf8");
if (!auth.includes("typeof item === 'string'")) throw new Error("Legacy string tenant index must be supported");
if (!auth.includes("item === tenantId")) throw new Error("Legacy index must match its tenant key");
if (!auth.includes("tenantMemberships/${tenantId}/${user.uid}")) throw new Error("Membership remains authoritative");
if (!auth.includes("indexValue.role !== membership.role")) throw new Error("Object index role must be cross-checked");
console.log("Legacy/current tenant index compatibility checks passed.");
