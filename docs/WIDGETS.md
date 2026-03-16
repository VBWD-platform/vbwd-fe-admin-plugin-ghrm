# GHRM Widgets — Developer Reference

GHRM has its own widget system, **separate from the CMS widget system**, for configuring
how GHRM-specific UI elements (breadcrumbs, version tables, install blocks) look and behave.
Widget configs are stored in the GHRM plugin config JSON — not in the CMS database.

---

## GHRM widget vs CMS widget — they are the same thing

GHRM widgets **are** CMS widgets. They are stored in the `cms_widget` table, managed via
the CMS admin UI (CMS → Widgets), and assigned to layout areas via `CmsLayoutWidget` exactly
like any other CMS widget.

The only difference is that GHRM widgets are **seeded by GHRM's own populate script**
(`populate_ghrm.py`) rather than `populate_cms.py`. This is proven by `populate_ghrm.py`:

```python
# vbwd-backend/plugins/ghrm/src/bin/populate_ghrm.py — line 30
from plugins.cms.src.models.cms_widget import CmsWidget

# line 521 — creates CmsWidget DB records directly
widget, created = get_or_create(
    session, CmsWidget, slug=w["slug"],
    name=w["name"],
    widget_type=w["widget_type"],
    ...
)
```

GHRM also queries shared CMS widgets (header-nav, footer-nav) created by `populate_cms.py`
and assigns them to its own layouts:

```python
# line 552
header_nav = session.query(CmsWidget).filter_by(slug="header-nav").first()
```

**Summary:** GHRM widgets are CMS entities populated by GHRM. The GHRM-specific admin
config panel (3-tab General/CSS/Preview) is the editing UI, but the underlying record lives
in `cms_widget` and is accessible from CMS → Widgets like any other widget.

| Aspect | Standard CMS Widget | GHRM Widget |
|--------|---------------------|-------------|
| Stored in | `cms_widget` DB table | `cms_widget` DB table (same) |
| Seeded by | `populate_cms.py` | `populate_ghrm.py` |
| Admin editor | `CmsWidgetEditor.vue` | `CmsWidgetEditor.vue` + `GhrmBreadcrumbWidgetConfig.vue` (3-tab, for GHRM-specific config UX) |
| Layout assignment | Via `CmsLayoutWidget` | Via `CmsLayoutWidget` (same) |
| Scope | Any CMS layout | GHRM layouts (by convention, not enforcement) |

---

## Current GHRM widgets

| Widget ID | Component | Pages |
|-----------|-----------|-------|
| `breadcrumb` | `GhrmBreadcrumb.vue` | `GhrmCategoryList`, `GhrmPackageDetail` |

---

## Breadcrumb widget — config schema

Config stored in `admin-config.json` under `breadcrumb_widgets`:

```json
{
  "breadcrumb_widgets": {
    "catalogue": {
      "separator":        "/",
      "root_name":        "Home",
      "root_slug":        "/",
      "show_category":    true,
      "max_label_length": 40,
      "custom_css":       ""
    },
    "detail": {
      "separator":        "/",
      "root_name":        "Home",
      "root_slug":        "/",
      "show_category":    true,
      "max_label_length": 40,
      "custom_css":       ""
    }
  }
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `separator` | string | `/` | Character between crumbs. E.g. `>`, `›`, `»`, `·` |
| `root_name` | string | `Home` | Label for the first (root) breadcrumb |
| `root_slug` | string | `/` | URL for the root crumb |
| `show_category` | boolean | `true` | Show category crumb on detail page |
| `max_label_length` | number | `40` | Truncate long labels (append `…`) |
| `custom_css` | string | `""` | Scoped CSS applied to `.ghrm-breadcrumb` wrapper |

---

## Admin UI — 3-tab pattern

Every GHRM widget config panel uses the **General / CSS / Preview** 3-tab layout.
This is the standard for all future GHRM layout widgets.

```
┌────────────┬─────────────────────────────────┐
│ General    │ [Tab content]                    │
│ CSS        │                                  │
│ Preview    │                                  │
└────────────┴─────────────────────────────────┘
```

### General tab
Form fields matching the config schema. Each field has a label, input, and description.
Changes are held in local state until "Save" is clicked.

### CSS tab
CodeMirror editor (CSS mode) editing `custom_css`. The CSS is scoped to the widget's
wrapper class at save time:

```css
/* Stored as custom_css — scoped to .ghrm-breadcrumb--<page> at render time */
.ghrm-breadcrumb { font-size: 14px; }
.ghrm-breadcrumb a { color: #e74c3c; }
```

The component applies `custom_css` via a `<style scoped>` block or a dynamic `<style>` tag
injection keyed by widget ID.

### Preview tab
An `<iframe>` pointed at the live `fe-user` app with the current (unsaved) config injected
via query parameters:

```
http://localhost:8080/category?__ghrm_breadcrumb_preview=1&separator=%2F&root_name=Home&...
```

The `GhrmBreadcrumb.vue` component checks for `__ghrm_breadcrumb_preview` in the route query
and uses those values instead of the API-fetched config.

---

## `GhrmBreadcrumb.vue` — component contract

```typescript
interface BreadcrumbConfig {
  separator:        string
  root_name:        string
  root_slug:        string
  show_category:    boolean
  max_label_length: number
  custom_css:       string
}

// Props
const props = defineProps<{
  config:   BreadcrumbConfig
  context:  'catalogue' | 'detail'
  category?: { slug: string; name: string }
  package?:  { slug: string; name: string }
}>()
```

Crumb logic:
- `catalogue`: `<root_name>` / `<category.name>`
- `detail`: `<root_name>` / `<category.name>` (if `show_category`) / `<package.name>`

---

## Adding a new GHRM widget

Follow this checklist when adding a widget beyond `breadcrumb`:

1. **Define config schema** — add key to `admin-config.json` under `breadcrumb_widgets`
   (or a new top-level key like `install_block_widgets`)
2. **Backend API** — add GET + PUT routes to `plugins/ghrm/src/routes.py`:
   - `GET /api/v1/admin/ghrm/widgets/<widget_id>` → returns config
   - `PUT /api/v1/admin/ghrm/widgets/<widget_id>` → saves config to plugin config
3. **Admin component** — create `Ghrm<WidgetName>WidgetConfig.vue` with 3-tab pattern
4. **Register in `GhrmWidgets.vue`** — add to the widgets list page
5. **Frontend component** — create `Ghrm<WidgetName>.vue` in `vbwd-fe-user/plugins/ghrm/src/components/`
6. **Inject into GHRM views** — add widget to the relevant view (`GhrmCategoryList.vue`, etc.)
7. **Tests** — unit tests for component rendering + config fetch/save
8. **Docs** — update this file with the new widget's schema and behaviour

---

## Backend config persistence

GHRM widget rendering config (separator, root_name, etc.) is stored in **two places**:

1. **`CmsWidget.config`** (JSON column in `cms_widget` table) — the widget's structural
   config (component name, props). For the breadcrumb: `{"component": "GhrmBreadcrumb", "props": {...}}`

2. **`plugins/ghrm/admin-config.json`** — GHRM-specific UX settings that are not widget
   props but affect how the 3-tab admin panel behaves (e.g. preview URL base, default CSS template)

The **primary** store is `cms_widget.config`. Admin saves via:

```
PUT /api/v1/admin/cms/widgets/:id
Body: { "config": { "component": "GhrmBreadcrumb", "props": { "separator": "›", ... } } }
```

The fe-user fetches the widget as part of the page's layout response:

```
GET /api/v1/cms/pages/ghrm-software-catalogue
→ { layout: { widgets: [{ area_name: "breadcrumb", widget: { config: { ... } } }] } }
```

No separate `GET /api/v1/ghrm/widgets/breadcrumb` endpoint is needed — the config travels
with the page layout response.
