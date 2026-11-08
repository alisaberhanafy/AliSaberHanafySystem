# Easy Mode and Workspace Personalization

## Delivered in v1.5.5

- Added Easy Mode and Advanced Mode switching.
- Added a workspace personalization dialog.
- Added independent visibility controls for dashboard cards and the daily chart.
- Added per-authenticated-UID browser persistence. Preferences do not modify workshop records, invoices, payments, or catalog data.
- Added IBM Plex Sans Arabic and IBM Plex Sans as the primary UI typefaces.
- Added responsive settings controls and keyboard dismissal.

## Important persistence boundary

The current workshop application still reads and writes the legacy shared root `ali_saber_system_data` and authenticates users through `userRoles/{uid}`. The multi-tenant staging rules and `tenants/{tenantId}` schema exist separately; the current `index.html` application is not yet tenant-aware and still points to the production Firebase web configuration.

For that reason, this release intentionally stores display preferences in localStorage under a key namespaced by the authenticated UID. This prevents one signed-in account's preferences from being mixed with another account on the same browser, but preferences do not yet synchronize across devices. Do not write preferences into a guessed tenant path until tenant resolution, application data migration, and deployed security rules are implemented and verified.

## Next architecture phase

1. Resolve a signed-in user's active tenant through `tenantMemberships`.
2. Move workshop data from the legacy shared root into `tenants/{tenantId}/...` using a verified migration and backup.
3. Point the application at the staging project for acceptance testing, then explicitly configure production.
4. Add tenant-scoped `settings/ui` read/write rules and cloud-sync preferences.
5. Migrate modules incrementally to TypeScript and a component-based UI; retain regression tests for financial calculations and invoice operations.

No Firebase rules, database paths, authentication roles, or financial formulas were changed in this release.
