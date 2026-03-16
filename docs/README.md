# GHRM Admin Plugin — Developer Reference

The `ghrm-admin` plugin is the backoffice UI for the **GitHub Repo Manager (GHRM)** plugin.
It extends existing admin pages with GHRM-specific management tabs and provides dedicated
views for software catalogue administration.

---

## Plugin identity

```typescript
// vbwd-fe-admin/plugins/ghrm-admin/index.ts
export const ghrmAdminPlugin: IPlugin
```

Plugin ID: `ghrm-admin`
Backend counterpart: `vbwd-backend/plugins/ghrm/`
Frontend (user) counterpart: `vbwd-fe-user/plugins/ghrm/`

---

## What this plugin manages

| Feature | Where | Route / endpoint |
|---------|-------|-----------------|
| Software package assignment to tariff plans | Plan edit page tab | `PUT /api/v1/admin/ghrm/packages/:id` |
| Software package CRUD | Dedicated admin page | `/admin/ghrm/packages` |
| Sync status + manual sync trigger | Package detail tab | `POST /api/v1/admin/ghrm/packages/:id/sync` |
| Breadcrumb widget config | Widget settings page | `PUT /api/v1/admin/ghrm/widgets/breadcrumb` |
| Deploy token management | Package access tab | `GET/POST /api/v1/admin/ghrm/packages/:id/tokens` |
| Collaborator management | Package access tab | `GET/POST /api/v1/admin/ghrm/packages/:id/collaborators` |

---

## Architecture

```
vbwd-fe-admin/plugins/ghrm-admin/
├── index.ts                        ← plugin entry: tab extension + routes
├── config.json
├── admin-config.json               ← editable settings (GitHub App credentials, etc.)
├── locales/en.json
├── src/
│   ├── components/
│   │   └── GhrmSoftwareTab.vue    ← tariff plan tab: link plan → software package
│   └── views/
│       ├── GhrmPackageList.vue    ← software catalogue admin (CRUD)
│       ├── GhrmPackageEditor.vue  ← create/edit package + sync fields
│       ├── GhrmPackageSync.vue    ← sync status, manual sync, field-level sync
│       ├── GhrmWidgets.vue        ← GHRM widget config management
│       └── GhrmBreadcrumbWidgetConfig.vue ← 3-tab config (General / CSS / Preview)
└── docs/                           ← this directory
```

---

## Extension pattern

The `ghrm-admin` plugin **extends** the existing tariff plan edit page rather than creating
a new page for plan-package linking. This is the VBWD extension pattern via `extensionRegistry`:

```typescript
// ghrm-admin/index.ts — install()
extensionRegistry.register('planTabSections', {
  id:        'software',
  label:     t('ghrm.softwareTab'),
  component: GhrmSoftwareTab,
  condition: (plan) => GHRM_CATEGORY_SLUGS.includes(plan.category_slug),
})
```

The tab only appears when the plan belongs to a software-related category (`backend`,
`fe-user`, `fe-admin`). This keeps the plan editor uncluttered for non-GHRM plans.

---

## Plugin boundary

- **Does not** modify `cms-admin`, `taro-admin`, or any other admin plugin
- **Does not** modify the core admin layout or sidebar directly — uses `extensionRegistry`
- Communicates with backend exclusively via `/api/v1/admin/ghrm/...` routes
- The fe-user `ghrm` plugin and fe-admin `ghrm-admin` plugin are independent — neither imports from the other

---

## Key backend APIs

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/admin/ghrm/packages` | List all packages (paginated) |
| POST | `/api/v1/admin/ghrm/packages` | Create package |
| GET | `/api/v1/admin/ghrm/packages/:id` | Get package detail |
| PUT | `/api/v1/admin/ghrm/packages/:id` | Update package |
| DELETE | `/api/v1/admin/ghrm/packages/:id` | Delete package |
| POST | `/api/v1/admin/ghrm/packages/:id/sync` | Full sync (readme/changelog/releases) |
| POST | `/api/v1/admin/ghrm/packages/:id/sync-field` | Sync single field |
| GET | `/api/v1/admin/ghrm/packages/:id/preview-readme` | Live GitHub readme preview |
| GET | `/api/v1/admin/ghrm/packages/:id/preview-changelog` | Live GitHub changelog preview |
| POST | `/api/v1/admin/ghrm/packages/:id/rotate-key` | Regenerate sync API key |
| GET | `/api/v1/admin/ghrm/widgets` | List widget configs |
| PUT | `/api/v1/admin/ghrm/widgets/:widget_id` | Save widget config |

---

## Further reading

- [WIDGETS.md](./WIDGETS.md) — GHRM widget system, breadcrumb widget, 3-tab config pattern
- [LAYOUT.md](./LAYOUT.md) — GHRM page layouts and CMS integration
- [PAGES.md](./PAGES.md) — GHRM CMS pages (catalogue, detail, slug structure)
- [VUE-COMPONENT-PLUGINS.md](./VUE-COMPONENT-PLUGINS.md) — registering GHRM components into CMS
- [PROMPTS.md](./PROMPTS.md) — AI agent prompts for GHRM-specific development
- Backend reference: `vbwd-backend/plugins/ghrm/README.md`
- GitX extensions: `vbwd-backend/plugins/ghrm/docs/gitx.md`
