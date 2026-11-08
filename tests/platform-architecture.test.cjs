const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const platform = path.join(root, "platform");
const rules = JSON.parse(fs.readFileSync(path.join(platform, "database.rules.spark.json"), "utf8")).rules;
const html = fs.readFileSync(path.join(platform, "public/platform-admin.html"), "utf8");
const js = fs.readFileSync(path.join(platform, "public/platform-admin.js"), "utf8");
const config = fs.readFileSync(path.join(platform, "public/firebase-config.staging.js"), "utf8");

if (fs.existsSync(path.join(platform, "functions"))) throw new Error("Zero-cost edition must not contain Cloud Functions");
if (!js.includes("token.claims.platformAdmin")) throw new Error("Platform console must verify platformAdmin custom claim");
if (!js.includes("db.ref().update(updates)")) throw new Error("Tenant creation must use an atomic database update");
if (!html.includes("owner-uid")) throw new Error("Platform console must link tenant owner by UID");
if (!config.includes("alisabersystem-staging")) throw new Error("Staging Firebase config missing");
if (rules[".read"] !== false || rules[".write"] !== false) throw new Error("Database root must deny public access");
if (!rules.platform[".write"].includes("auth.token.platformAdmin")) throw new Error("Platform writes must require platformAdmin");
if (!rules.tenants.$tenantId[".read"].includes("tenantMemberships")) throw new Error("Tenant reads must verify membership");
if (!rules.tenantMemberships.$tenantId.$memberUid[".read"].includes("auth.uid")) throw new Error("Membership reads must be scoped to member or platform admin");
console.log("Zero-cost platform architecture checks passed.");
