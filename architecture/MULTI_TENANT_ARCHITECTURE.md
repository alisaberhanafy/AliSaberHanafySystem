# Ali Saber System — Multi-tenant / Hybrid SaaS Architecture

**Decision:** Hybrid distribution model + recurring subscription and one-time license sales.  
**Backend baseline:** Firebase Authentication + Realtime Database.  
**Status:** Architecture and migration blueprint only. It is intentionally NOT deployed to the live Firebase project.

## 1. Product modes

### A. Shared SaaS (recommended default)
- One application deployment and one Firebase project.
- Every workshop is a tenant with a stable `tenantId`.
- Users authenticate with Firebase Authentication.
- A user can belong to one or more tenants through membership records.
- Every business record is stored below `/tenants/{tenantId}/...`.
- Realtime Database Rules enforce tenant membership and role permissions.
- Subscription and entitlement records are managed by trusted server code (Cloud Functions/Admin SDK), never by the browser.

### B. Independent / dedicated edition
- A separate Firebase project (and optionally separate Hosting site) per workshop.
- Same application code, but a different Firebase configuration.
- A dedicated workshop database root can be used; cross-tenant isolation is naturally strengthened by project separation.
- License status is provisioned by the platform operator. Do not put a reusable service-account key in the browser or GitHub repository.

### C. Hybrid commercial model
- SaaS customers pay monthly/yearly.
- Dedicated customers pay a one-time license or negotiated maintenance plan.
- A one-time payment does not mean lifetime free cloud infrastructure. Firebase usage, backups, domain, support, and upgrades still have operating costs.
- Keep commercial billing separate from workshop accounting data.

## 2. Proposed Realtime Database tree

```text
/
├── platform/
│   ├── tenantDirectory/{tenantId}             # Minimal directory; server-managed
│   ├── plans/{planId}                         # Plan definitions; server-managed
│   └── releases/{releaseId}                   # Optional release/maintenance metadata
│
├── platformBilling/{tenantId}
│   ├── mode                                   # saas | dedicated
│   ├── billingModel                           # subscription | one_time | both
│   ├── planId
│   ├── status                                 # trial | active | past_due | suspended | cancelled
│   ├── startsAt
│   ├── currentPeriodEndsAt
│   └── providerReference                      # No card/bank secrets
│
├── tenantMemberships/{tenantId}/{uid}
│   ├── active
│   ├── role                                   # owner | admin | editor | viewer
│   └── joinedAt
│
└── tenants/{tenantId}
    ├── profile
    │   ├── workshopName
    │   ├── phone
    │   ├── address
    │   └── logoUrl
    ├── settings
    │   ├── currency
    │   ├── timezone
    │   └── invoicePrefix
    ├── clients/{clientId}
    ├── invoices/{invoiceId}
    ├── payments/{paymentId}
    ├── catalogItems/{itemId}
    ├── inventoryMovements/{movementId}
    ├── categories/{categoryId}
    ├── auditLog/{eventId}
    └── backups/{backupId}
```

### Key invariants
1. `tenantId`, `clientId`, `invoiceId`, `paymentId`, and `itemId` are stable IDs, not array positions or display names.
2. Every invoice stores `tenantId` and `clientId`; every payment stores `tenantId`, `clientId`, and optionally `invoiceId`.
3. Every write must be authorized against `/tenantMemberships/{tenantId}/{auth.uid}`.
4. `tenantMemberships`, `platform`, and `platformBilling` are not writable by browser clients.
5. Never trust a `tenantId`, role, plan, subscription status, or license expiry supplied by the client.
6. The subscription/entitlement check for SaaS access must be server-controlled. The database rules shown here enforce tenant membership and role, not payment collection or automatic suspension by themselves.
7. Do not duplicate the same authoritative balance in multiple writable locations. Calculate balances from invoices/payments or maintain server-verified projections.

## 3. Roles

| Role | Read tenant data | Edit operational data | Manage members | Change billing |
|---|---:|---:|---:|---:|
| owner | Yes | Yes | Via trusted backend | Via platform billing portal/backend |
| admin | Yes | Yes | Via trusted backend, scoped | No |
| editor | Yes | Yes | No | No |
| viewer | Yes | No | No | No |

Member invitations and role changes must be performed by a trusted backend endpoint/Cloud Function using Firebase Admin SDK after verifying the caller's owner/admin membership. Never allow a browser to write its own role or `active=true`.

## 4. Data model examples

### Client
```json
{
  "id": "cl_01J...",
  "name": "اسم العميل",
  "phone": "01xxxxxxxxx",
  "address": "العنوان",
  "createdAt": 1794000000000,
  "updatedAt": 1794000000000,
  "createdBy": "firebase-auth-uid"
}
```

### Invoice
```json
{
  "id": "inv_01J...",
  "clientId": "cl_01J...",
  "invoiceNumber": "INV-000123",
  "status": "open",
  "deliveryStatus": "pending",
  "items": {
    "line_01": {
      "itemId": "item_01J...",
      "nameSnapshot": "اسم الصنف وقت البيع",
      "codeSnapshot": "ABC",
      "qty": 2,
      "unitPrice": 150,
      "unitCostSnapshot": 90
    }
  },
  "discount": { "type": "amount", "value": 20 },
  "createdAt": 1794000000000,
  "updatedAt": 1794000000000,
  "createdBy": "firebase-auth-uid"
}
```

### Payment (immutable ledger entry)
```json
{
  "id": "pay_01J...",
  "clientId": "cl_01J...",
  "invoiceId": "inv_01J...",
  "amount": 100,
  "method": "cash",
  "direction": "in",
  "occurredAt": 1794000000000,
  "createdAt": 1794000000000,
  "createdBy": "firebase-auth-uid",
  "note": ""
}
```

A payment should be reversed by a compensating/reversal record, not silently overwritten or deleted. Edits/deletions to financial records should be audited and restricted.

## 5. Migration from the existing workshop

Current live path: `/ali_saber_system_data` with `catalogItems` and `clientsList` arrays. Do not rename or delete it during this architecture phase.

Recommended migration sequence:
1. Export a JSON backup from the current app and download a second backup from Firebase Console.
2. Create a staging Firebase project, separate from production.
3. Provision the first tenant `workshop_ali_saber` in staging.
4. Transform each client array entry into `/tenants/{tenantId}/clients/{clientId}`.
5. Transform nested invoices into `/tenants/{tenantId}/invoices/{invoiceId}`; preserve original invoice IDs in `legacyId`.
6. Transform payment line items into immutable payment records while preserving source invoice, amount, date, and legacy identifiers. Reconcile totals before cutover.
7. Transform catalog arrays into keyed catalog records.
8. Run reconciliation: client count, invoice count, line count, payment count, total invoice net, total receipts, total outstanding, and advance balances.
9. Test two separate tenant accounts and prove cross-tenant reads/writes are denied.
10. Only after sign-off, deploy production rules and switch application reads/writes.
11. Keep the original `/ali_saber_system_data` read-only for a defined rollback period; do not delete it until backups and reconciliation are verified.

**No automatic migration is included in this release.** The live schema is still used by the current app.

## 6. Security and deployment notes

- Use Firebase Authentication Email/Password initially.
- Enforce membership in Realtime Database Rules.
- Keep admin operations and payment-provider webhooks in Cloud Functions or another trusted server.
- Do not store private API keys, service-account JSON, or payment secrets in GitHub Pages/browser code.
- Firebase client config is not a secret; Security Rules are the security boundary.
- Configure App Check as an additional abuse-reduction measure, not as a replacement for Authentication or Rules.
- Configure backup/export and retention policies before onboarding paying customers.
- Use a separate Firebase project for staging and automated tests.
- For a dedicated edition, use a separate Firebase project and its own rules/configuration; never let a customer paste your platform owner's Firebase credentials.

## 7. Commercial entitlement model

Suggested server-managed record:
```json
{
  "mode": "saas",
  "billingModel": "subscription",
  "planId": "workshop-standard",
  "status": "active",
  "startsAt": 1794000000000,
  "currentPeriodEndsAt": 1796592000000,
  "licenseKeyHash": null
}
```

For dedicated one-time licenses:
- `mode = dedicated`
- `billingModel = one_time`
- `status = active`
- Track support/maintenance expiry separately from license ownership.
- Do not equate a paid one-time license with free cloud usage forever.

A payment provider integration is a separate phase. The browser must never mark an invoice or subscription as paid solely because a success URL was opened; verify payment server-side.

## 8. Implementation status in this repository

- This document and a draft multi-tenant RTDB rules file are architecture assets.
- The current app still reads/writes the legacy root path and is not yet multi-tenant.
- Do not deploy the draft rules file to production.
- The next implementation phase is staging tenant provisioning + data migration tooling + automated cross-tenant authorization tests.
