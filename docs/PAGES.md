# GHRM CMS Pages — Developer Reference

---

## Page architecture decision

**Category pages are CMS-managed. Package detail pages are not.**

This is a deliberate architectural choice:

> GHRM categories need their own CMS pages while individual packages do not.
> This is deliberately done to enhance content flexibility and SEO efficiency
> for the catalogue pages.

Category pages benefit from CMS management because each category is a distinct editorial
unit — it can have a custom hero, promotional copy, featured packages section, and
category-specific SEO metadata. A content editor can update the `ghrm/category/backend`
page's description, OG image, and hero text without developer involvement.

Package detail pages are driven by GitHub-synced data (readme, changelog, releases,
screenshots). Their content is dynamic and package-specific by design. Creating a
dedicated CMS page per package would create an N×maintenance burden with no editorial
benefit — the package's own `meta_title`, `meta_description`, and readme are the
canonical SEO surface.

---

## CMS pages seeded by GHRM

| Slug | Name | Layout | Notes |
|------|------|--------|-------|
| `ghrm/catalogue` | Software Catalogue | `ghrm-catalogue` | Root `/category` page |
| `ghrm/category/backend` | Backend Plugins | `ghrm-catalogue` | `/category/backend` |
| `ghrm/category/fe-user` | Frontend User Plugins | `ghrm-catalogue` | `/category/fe-user` |
| `ghrm/category/fe-admin` | Frontend Admin Plugins | `ghrm-catalogue` | `/category/fe-admin` |

All seeded by `vbwd-backend/plugins/ghrm/src/bin/populate_ghrm.py`.

---

## How category pages work end-to-end

```
User visits /category/backend
  └─► Vue Router: no explicit route matches /category/backend
        └─► CMS catch-all /:slug(.+) fires with slug="category/backend"
  └─► CmsPage.vue fetches GET /api/v1/cms/pages/category/backend
        ← but this returns 404 because the CMS slug is "ghrm/category/backend"!
```

Wait — how does `/category/backend` map to the CMS page `ghrm/category/backend`?

The GHRM plugin registers an **explicit Vue route** that takes priority over the catch-all:

```typescript
// vbwd-fe-user/plugins/ghrm/index.ts
sdk.addRoute({
  path: '/category/:category_slug',
  name: 'GhrmCategoryList',
  component: () => import('./src/views/GhrmCategoryList.vue'),
})
```

`GhrmCategoryList.vue` then fetches the CMS page by a computed slug:

```typescript
// GhrmCategoryList.vue
const cmsSlug = computed(() => `ghrm/category/${route.params.category_slug}`)
const { page } = useCmsPage(cmsSlug)
```

This means:
- URL stays `/category/backend` (human-friendly, SEO-clean)
- CMS page `ghrm/category/backend` provides the layout, hero content, and metadata
- The `GhrmCatalogueContent` vue-component in the layout fetches packages by `category_slug`

---

## Adding a new category

1. Create the category in `GhrmSoftwareCategory` table (via populate_ghrm.py or admin UI)
2. Add a CMS page in `populate_ghrm.py`:

```python
_get_or_create_page(
    "ghrm/category/my-category",
    "My Category Title",
    layout_map["ghrm-catalogue"],
    style_map["light-clean"],
    content_html="<h2>My Category</h2><p>Description of this category.</p>",
    meta_description="Browse My Category plugins for VBWD.",
    meta_title="My Category — VBWD Software",
    sort_order=50,
)
```

3. The Vue route `/category/my-category` is handled automatically by the existing
   `/category/:category_slug` route — no frontend changes needed.

---

## Package detail SEO

Package detail pages have no CMS page. SEO is set dynamically in `GhrmPackageDetail.vue`:

```typescript
// GhrmPackageDetail.vue
useHead({
  title: computed(() => pkg.value?.meta_title || pkg.value?.name || 'Software'),
  meta: [
    { name: 'description', content: computed(() => pkg.value?.meta_description || '') },
    { property: 'og:title', content: computed(() => pkg.value?.og_title || pkg.value?.name) },
    { property: 'og:image', content: computed(() => pkg.value?.og_image_url || '') },
  ],
})
```

The `meta_title`, `meta_description`, and `og_image_url` fields are managed via the
GHRM admin package editor (`GhrmPackageEditor.vue`).

---

## SEO best practices for GHRM pages

**Category pages:**
- Set `meta_title` to `"<Category Name> — VBWD Plugins"` format
- Set `meta_description` to describe the category and target developer audience
- Set `og_image_url` to a category-specific preview image
- Set `robots` to `"index,follow"` (default)
- Use `content_html` for the category hero to include keyword-rich copy

**Package detail pages:**
- Admin fills `meta_title` and `meta_description` in the package editor
- `og_image_url` is auto-set from `cached_screenshots[0]` if not explicitly overridden
- Canonical URL defaults to `https://yourhost.com/category/<cat>/<pkg>`
- Package readme is rendered as HTML — ensure headings and structured content are present

---

## Populate script reference

```bash
# Seed/update all GHRM CMS pages and packages
docker compose exec api python plugins/ghrm/src/bin/populate_ghrm.py

# Check which CMS pages GHRM has seeded
docker compose exec postgres psql -U vbwd -d vbwd \
  -c "SELECT slug, is_published FROM cms_page WHERE slug LIKE 'ghrm/%' ORDER BY slug;"
```
