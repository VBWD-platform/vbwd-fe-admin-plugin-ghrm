# GHRM Vue Component Plugins — CMS Integration Guide

GHRM registers several Vue components into the CMS `vueComponentRegistry` so they can be
placed into CMS layout areas as `vue-component` widgets. This document explains which
components are registered, how they work, and how to add new ones.

---

## Registered components

| Component name | Registered by | Used in |
|---------------|---------------|---------|
| `GhrmCatalogueContent` | `ghrm/index.ts` install() | Category list pages — `ghrm-catalogue` layout |
| `GhrmPackageDetail` | `ghrm/index.ts` install() | (Not used in CMS pages — rendered via Vue route) |
| `NativePricingPlans` | `ghrm/index.ts` install() | Native pricing CMS page — `native-pricing-page` layout |

---

## `GhrmCatalogueContent` — catalogue grid widget

This component renders the paginated software package grid for a given category.

**Config schema** (`CmsWidget.config`):

```json
{
  "component": "GhrmCatalogueContent",
  "props": {
    "page_size":    12,
    "show_search":  true,
    "show_filters": true
  }
}
```

The component reads `route.params.category_slug` directly — the `category_slug` does not
need to be passed as a prop. This keeps the CMS widget config minimal.

**CMS widget slug:** `ghrm-catalogue-grid`

---

## `NativePricingPlans` — native pricing widget

Renders VBWD subscription plans fetched from `/api/v1/tarif-plans`.

**Config schema:**

```json
{
  "component": "NativePricingPlans",
  "props": {
    "category":                "root",
    "plan_count":              3,
    "show_billing_toggle":     true,
    "default_billing_period":  "monthly"
  }
}
```

| Prop | Type | Description |
|------|------|-------------|
| `category` | string | Plan category slug to filter by. `"root"` = all plans. |
| `plan_count` | number | Max plans to display (1–6). |
| `show_billing_toggle` | boolean | Show monthly/yearly billing switcher. |
| `default_billing_period` | `"monthly"` \| `"yearly"` | Initial billing period. |

**CMS widget slug:** `pricing-native-plans`

---

## Adding a new GHRM vue-component widget — step by step

### 1. Create the Vue component

```vue
<!-- vbwd-fe-user/plugins/ghrm/src/components/GhrmMyFeature.vue -->
<template>
  <div class="ghrm-my-feature">
    <!-- ...component content... -->
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
  show_extras?: boolean
}>()
</script>
```

Export the widget schema:

```typescript
export const WIDGET_SCHEMA = {
  component:   'GhrmMyFeature',
  description: 'GHRM feature block — describe what this renders.',
  props: {
    title:       { type: 'string',  required: false, description: 'Section heading' },
    show_extras: { type: 'boolean', required: false, default: true, description: 'Show extended content' },
  },
}
```

### 2. Register in `ghrm/index.ts` install()

```typescript
import('./src/components/GhrmMyFeature.vue').then(({ default: component, WIDGET_SCHEMA }) => {
  vueComponentRegistry.register('GhrmMyFeature', component, WIDGET_SCHEMA)
})
```

Deregister in `deactivate()`:

```typescript
vueComponentRegistry.unregister('GhrmMyFeature')
```

### 3. Seed the CMS widget in `populate_ghrm.py`

```python
widget_map["ghrm-my-feature"] = _get_or_create_widget(
    "ghrm-my-feature",
    "GHRM — My Feature Block",
    "vue-component",
    config={
        "component": "GhrmMyFeature",
        "props": {
            "title": "Default Title",
            "show_extras": True,
        },
    },
)
```

### 4. Add to a layout's widget assignments

```python
# In GHRM_LAYOUTS, add to widget_assignments for the relevant layout:
("my-area", "ghrm-my-feature"),
```

### 5. Write tests

```typescript
// vbwd-fe-user/plugins/ghrm/tests/unit/components/GhrmMyFeature.spec.ts
import { mount } from '@vue/test-utils'
import GhrmMyFeature from '@/plugins/ghrm/src/components/GhrmMyFeature.vue'

describe('GhrmMyFeature', () => {
  it('renders title prop', () => {
    const wrapper = mount(GhrmMyFeature, { props: { title: 'Hello' } })
    expect(wrapper.text()).toContain('Hello')
  })

  it('renders without optional props', () => {
    const wrapper = mount(GhrmMyFeature)
    expect(wrapper.exists()).toBe(true)
  })
})
```

---

## `checkoutContextRegistry` — a different pattern

The `GhrmCheckoutContext` component is injected into the **checkout page** (not a CMS page)
via a separate registry:

```typescript
// ghrm/index.ts — install()
import('./src/components/GhrmCheckoutContext.vue').then(({ default: component }) => {
  checkoutContextRegistry.register(component)
})
```

This uses `checkoutContextRegistry` (not `vueComponentRegistry`) because the checkout page
is not a CMS layout — it is a dedicated Vue view. The checkout plugin owns the registry with
zero knowledge of GHRM. This is the same zero-coupling pattern, applied to a non-CMS page.

See `vbwd-fe-user/plugins/checkout/checkoutContextRegistry.ts` for the registry API.

---

## Plugin boundary — enforced rules

When adding GHRM vue-component widgets:

1. The component file lives in `vbwd-fe-user/plugins/ghrm/src/components/` — never in CMS
2. The registration call is in `ghrm/index.ts` install() — never in CMS code
3. The component reads its own stores and route params — the CMS passes only `config.props`
4. The CMS `widget.config` is the **only** data channel from admin → component
5. The GHRM admin plugin (`ghrm-admin`) configures widget placements — never the CMS admin

If a component needs data beyond what's in `config.props`, it fetches it via its own store
or composable. The CMS does not proxy GHRM data.
