# GHRM Page Layouts — Developer Reference

GHRM pages use the CMS layout system. GHRM-specific layouts are seeded by
`plugins/ghrm/src/bin/populate_ghrm.py` and follow the namespacing convention:
all GHRM layout slugs are prefixed with `ghrm-`.

---

## Design decision: category pages vs package pages

**GHRM category pages have their own CMS pages; individual package detail pages do not.**

Category pages (e.g. `/category/backend`) are CMS-managed because:
- Each category needs distinct SEO metadata (title, description, OG image)
- Category pages can have custom hero content, featured packages, or promotional HTML
- Content editors can customise each category page independently without code changes
- This gives the catalogue editorial control and full CMS content flexibility

Package detail pages (e.g. `/category/backend/loopai-core`) do **not** have dedicated CMS
pages because:
- Package content is synced from GitHub (readme, changelog, releases, screenshots)
- Each package already has its own metadata (name, description) in `ghrm_software_package`
- Creating a CMS page per package would require manual duplication for every new package
- SEO is served via dynamic meta tags generated from the package's sync data at render time

This split maximises content flexibility for catalogue-level pages while keeping package
detail maintenance low-overhead and automated.

---

## GHRM layouts

| Slug | Areas | Used for |
|------|-------|---------|
| `ghrm-catalogue` | header, breadcrumb, hero, main, footer | Category list page (`/category/:cat`) |
| `ghrm-detail` | header, breadcrumb, content, sidebar, footer | Package detail (rendered by Vue, no CMS page) |
| `ghrm-search` | header, main, footer | Search results page |

---

## `ghrm-catalogue` layout — area definitions

```json
[
  { "name": "header",     "type": "header",       "label": "Header Navigation" },
  { "name": "breadcrumb", "type": "vue-component", "label": "Breadcrumb" },
  { "name": "hero",       "type": "hero",          "label": "Category Hero" },
  { "name": "main",       "type": "vue-component", "label": "Package Catalogue Grid" },
  { "name": "footer",     "type": "footer",        "label": "Footer Navigation" }
]
```

Default widget assignments:

| Area | Widget slug | Widget type |
|------|-------------|-------------|
| `header` | `header-nav` | `menu` |
| `breadcrumb` | `ghrm-breadcrumb-catalogue` | `vue-component` |
| `hero` | (none — CMS page provides `content_html`) | — |
| `main` | `ghrm-catalogue-grid` | `vue-component` |
| `footer` | `footer-nav` | `menu` |

The `hero` area has no default widget. Each CMS category page provides its own `content_html`
(customisable per-category in the admin). The `main` area always uses the catalogue grid
component (`GhrmCatalogueContent`) regardless of which category is shown.

---

## Category CMS pages — slug convention

Each category has a dedicated CMS page:

| Category | CMS page slug | Route |
|----------|--------------|-------|
| All software | `ghrm/catalogue` | `/category` |
| Backend plugins | `ghrm/category/backend` | `/category/backend` |
| Frontend (user) | `ghrm/category/fe-user` | `/category/fe-user` |
| Frontend (admin) | `ghrm/category/fe-admin` | `/category/fe-admin` |

The Vue route `/:slug(.+)` in the CMS plugin catches `/category/backend` and fetches
the CMS page `ghrm/category/backend`. The page's layout is `ghrm-catalogue`. The
`GhrmCatalogueContent` vue-component widget uses the current route's `category_slug`
param to fetch and display the right packages from `GET /api/v1/ghrm/packages?category=backend`.

---

## Package detail — dynamic rendering without a CMS page

Package detail pages use **Vue Router dynamic params** — not CMS pages:

```typescript
// vbwd-fe-user/plugins/ghrm/index.ts
sdk.addRoute({
  path: '/category/:category_slug/:package_slug',
  name: 'GhrmPackageDetail',
  component: () => import('./src/views/GhrmPackageDetail.vue'),
})
```

`GhrmPackageDetail.vue` handles its own layout by composing GHRM components directly.
It fetches the package from `GET /api/v1/ghrm/packages/:slug` and renders the synced
readme/changelog/releases/screenshots without a CMS page record.

SEO for detail pages is handled by `useHead()` (or `useSeoMeta()`) inside `GhrmPackageDetail.vue`
using the package's `meta_title`, `meta_description`, and `og_image_url` fields.

---

## Adding a new GHRM layout

1. Add to `populate_ghrm.py` (not `populate_cms.py`):

```python
GHRM_LAYOUTS = [
    {
        "slug": "ghrm-my-new-layout",
        "name": "GHRM — My New Layout",
        "areas": [
            {"name": "header", "type": "header", "label": "Header"},
            {"name": "main",   "type": "vue-component", "label": "Main Content"},
            {"name": "footer", "type": "footer", "label": "Footer"},
        ],
        "widget_assignments": [
            ("header", "header-nav"),
            ("main",   "ghrm-my-component"),
            ("footer", "footer-nav"),
        ],
    }
]
```

2. Register the vue-component widget for `ghrm-my-component` (see `WIDGETS.md`)
3. Create the CMS page that uses this layout:

```python
_get_or_create_page(
    "ghrm/my-page",
    "GHRM — My Page",
    layout_map["ghrm-my-new-layout"],
    style_map["light-clean"],
    meta_description="...",
)
```

4. If this is a category-style page, add a Vue route that maps the URL to this CMS slug:

```typescript
sdk.addRoute({
  path: '/my-ghrm-section',
  name: 'GhrmMyPage',
  component: () => import('./src/views/CmsPage.vue'),
  // CmsPage.vue will fetch slug "ghrm/my-page" based on the path
})
```
