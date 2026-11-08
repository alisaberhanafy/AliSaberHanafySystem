# Platform implementation — staging first

## What is included
- Callable Cloud Functions for platform tenant creation, tenant listing, tenant status changes, and tenant member provisioning/role updates.
- A separate platform admin console at `platform/public/platform-admin.html`.
- A local-only bootstrap script to set the `platformAdmin` custom claim.
- A staging Firebase CLI config and a draft multi-tenant RTDB rules file.
- The existing production app and its legacy `/ali_saber_system_data` path are not modified to use tenant paths in this phase.

## Required Firebase staging setup
Create a NEW Firebase project for staging, separate from the existing live `AliSaberSystem` project. In that staging project:
1. Add a Web App and place its Firebase client config in `assets/js/firebase-config.js` only in your local staging copy (do not commit credentials you consider private; Firebase web config itself is public, but never commit service-account keys).
2. Enable Authentication → Email/Password.
3. Create a Realtime Database in the same region and start in locked mode.
4. Enable Cloud Functions billing as required by Firebase for deployment. Cloud Functions deployment may require the Blaze plan; do not upgrade the live project without reviewing expected cost.
5. Create the initial platform operator account under Authentication → Users.
6. Copy its Auth UID.

## Bootstrap the platform administrator
Use a service-account key downloaded securely from the staging project's IAM service account page. Keep it outside the repository and never upload it to GitHub.

From `platform/`:
```bash
cd functions
npm install
cd ..
GOOGLE_APPLICATION_CREDENTIALS="/secure/path/staging-service-account.json" \
  node scripts/set-platform-admin.js "AUTH_UID_HERE"
```
Then sign out and sign in again so the ID token refreshes the custom claim.

## Deploy to staging only

**Billing prerequisite:** the Firebase project currently shown as Spark must be upgraded to the Blaze (pay-as-you-go) plan to deploy Cloud Functions. Review the current Firebase pricing and set budget alerts before upgrading. Do not upgrade the production project for this staging test.

The deployment helper `DEPLOY-STAGING-FUNCTIONS.bat` deploys only Cloud Functions to the explicit project ID `alisabersystem-staging`; it does not deploy Realtime Database rules. It uses Firebase CLI user login and does not require the service-account JSON file.
From the repository root, after selecting the staging project explicitly:
```bash
firebase use STAGING_PROJECT_ID
cd platform
firebase --config firebase.staging.json deploy --only functions --project alisabersystem-staging
```
Do not run this against the production project. Confirm the active project ID before deployment.

## Platform admin console
Host `platform/public/` as a static site under a path that preserves the relative links to `../../assets/js/firebase-config.js` and `platform-admin.js`, or adjust those references if using a separate Hosting public directory. The console uses `public/firebase-config.staging.js`, which points only to `alisabersystem-staging`; the production `assets/js/firebase-config.js` is left unchanged.

The console supports:
- listing tenants
- creating SaaS tenants and assigning a designated owner by email
- activating/suspending tenants

The console intentionally does not expose billing payment capture or direct Firebase project provisioning. Dedicated Firebase projects are provisioned manually per customer and then registered through a separate controlled provisioning workflow.

## Tenant members
`addTenantMember` creates a Firebase Auth user if needed and returns a password reset link for newly created users. `createTenant` similarly accepts `ownerEmail`, creates or finds that account, and assigns it the `owner` membership. Treat that link as a secret: copy it to the invited person privately and do not log or publish it. Existing accounts are added to the tenant without resetting their password.
`setTenantMember` can change a non-owner member's role and active state. Owner transfer is intentionally not supported in this initial backend.

## Security model
- `platformAdmin` is a Firebase custom claim, assigned only with Admin SDK by the local bootstrap script.
- Tenant membership records are written by Cloud Functions/Admin SDK, not browser clients.
- Browser access to tenant data is checked against `/tenantMemberships/{tenantId}/{uid}`.
- Billing metadata and platform directories are server-managed.
- The rules file is a staging draft. Run emulator tests and cross-tenant negative tests before any production deployment.
- Cloud Functions Admin SDK bypasses RTDB rules; each callable validates the caller's custom claim or membership explicitly.

## Current known gap (do not overlook)
The existing workshop app still reads/writes the legacy root `/ali_saber_system_data`, and its Auth gate still checks legacy `/userRoles/{uid}`. It has not yet been migrated to `tenants/{tenantId}` or `tenantMemberships`. Therefore:
- Do not deploy the multitenant rules to the current live Firebase project.
- Do not expect the existing `index.html` workshop screen to load a tenant created by this console.
- Next step after staging deployment is to build the tenant-aware application data adapter, then migrate the legacy workshop into the first tenant and reconcile all financial totals before cutover.

## Dedicated edition
The dedicated option is deliberately a separate Firebase project per workshop. Provision the project, Authentication, RTDB, rules, hosting and backups separately. The same application build can be configured for that project's Web App. One-time license state and support/maintenance expiry must be provisioned by trusted platform tooling, not by browser local storage.
