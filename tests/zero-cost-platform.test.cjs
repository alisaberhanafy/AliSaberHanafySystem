const fs=require("fs"),path=require("path");
const root=path.join(__dirname,"..");
const rules=JSON.parse(fs.readFileSync(path.join(root,"platform/database.rules.spark.json"),"utf8")).rules;
const admin=fs.readFileSync(path.join(root,"platform/public/platform-admin.js"),"utf8");
const html=fs.readFileSync(path.join(root,"platform/public/platform-admin.html"),"utf8");
const cfg=fs.readFileSync(path.join(root,"platform/public/firebase-config.staging.js"),"utf8");
if(!admin.includes("auth.token") && !html.includes("platformAdmin")) { /* claim check is performed in JS token */ }
if(!admin.includes("token.claims.platformAdmin")) throw new Error("Platform admin custom claim check missing");
if(!admin.includes("db.ref().update(updates)")) throw new Error("Atomic tenant creation missing");
if(!html.includes("owner-uid")) throw new Error("Owner UID workflow missing");
if(!cfg.includes("alisabersystem-staging")) throw new Error("Staging config missing");
if(rules.platform[".write"].indexOf("auth.token.platformAdmin")<0) throw new Error("Platform write must require platformAdmin");
if(rules.tenants["$tenantId"][".read"].indexOf("tenantMemberships")<0) throw new Error("Tenant reads must require membership");
if(fs.existsSync(path.join(root,"platform/functions"))) throw new Error("Functions must be absent in zero-cost edition");
console.log("Zero-cost platform static checks passed.");
