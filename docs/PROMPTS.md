# AI Agent Prompts — GHRM Admin Development

Prompts for AI coding agents working on the GHRM admin plugin (`vbwd-fe-admin/plugins/ghrm-admin/`)
and its backend counterpart (`vbwd-backend/plugins/ghrm/`).

---

## Prompt 1: Add a new tab to the GHRM software package admin page

```
You are working in the VBWD codebase (vbwd-sdk-2).
Reference: vbwd-fe-admin/plugins/ghrm-admin/index.ts + GhrmSoftwareTab.vue

Task: Add a new admin tab called "<TabName>" to the GHRM software package editor.

Context:
- The GHRM admin plugin extends the plan/package editor via extensionRegistry
- Tabs use the 'planTabSections' or 'ghrmPackageTabSections' extension point
- All GHRM admin code lives in vbwd-fe-admin/plugins/ghrm-admin/
- Backend GHRM routes are at vbwd-backend/plugins/ghrm/src/routes.py
- Plugin boundary: ghrm-admin never imports from cms-admin or any other plugin

Steps:
1. Create vbwd-fe-admin/plugins/ghrm-admin/src/components/Ghrm<TabName>Tab.vue
   - Props: receives current package/plan object
   - Calls GHRM API endpoints as needed
   - Handles loading/error states
2. Register in ghrm-admin/index.ts via extensionRegistry.register()
3. Add translation key to locales/en.json: "ghrm.<tabId>": "<Tab Label>"
4. If backend data is needed: add GET + PUT routes to plugins/ghrm/src/routes.py
   - Route naming: /api/v1/admin/ghrm/<resource>
   - Use factory functions for service injection (same pattern as existing routes)
5. Write unit tests:
   - Tab component renders correctly with mock data
   - Tab appears/hides based on condition
   - API call is made on mount
   - Error state displayed on API failure

Rules: TDD, DI, SOLID, no cross-plugin imports, mock all API calls in tests.
```

---

## Prompt 2: Add a new GHRM breadcrumb widget configuration option

```
You are working in the VBWD codebase (vbwd-sdk-2).

Task: Add a new configuration field "<field_name>" to the GHRM breadcrumb widget.

Context:
- Breadcrumb widget config is stored in vbwd-backend/plugins/ghrm/admin-config.json
- Admin UI: vbwd-fe-admin/plugins/ghrm-admin/src/components/GhrmBreadcrumbWidgetConfig.vue
- Frontend component: vbwd-fe-user/plugins/ghrm/src/components/GhrmBreadcrumb.vue
- Backend read: GET /api/v1/ghrm/widgets/breadcrumb (public)
- Backend write: PUT /api/v1/admin/ghrm/widgets/breadcrumb (admin)
- Config JSON lives in admin-config.json under "breadcrumb_widgets.catalogue" and "breadcrumb_widgets.detail"

Steps:
1. Add "<field_name>" to admin-config.json default config for both "catalogue" and "detail" sections
2. Add input field to GhrmBreadcrumbWidgetConfig.vue General tab
3. Update BreadcrumbConfig TypeScript interface in GhrmBreadcrumb.vue to include new field
4. Use the new field in GhrmBreadcrumb.vue rendering logic
5. Update backend validation in routes.py if field requires validation
6. Add translation key to locales/en.json
7. Write tests:
   - GhrmBreadcrumb.vue uses new field when provided
   - GhrmBreadcrumb.vue uses default when field is absent
   - Admin form saves new field correctly

Rules: TDD first, backward compatible defaults, no breaking changes to existing configs.
```

---

## Prompt 3: Add a new GHRM widget following the 3-tab pattern

```
You are working in the VBWD codebase (vbwd-sdk-2).
Reference implementation: GhrmBreadcrumbWidgetConfig.vue (3-tab: General/CSS/Preview)

Task: Create a new GHRM widget called "<WidgetName>" with admin configuration.

Context:
- GHRM widgets are plugin-local (not CMS db widgets) unless specified otherwise
- Config stored in vbwd-backend/plugins/ghrm/admin-config.json
- All GHRM widget admin code lives in vbwd-fe-admin/plugins/ghrm-admin/
- All GHRM widget frontend code lives in vbwd-fe-user/plugins/ghrm/src/components/
- Preview tab uses iframe to live fe-user app with query params for preview mode

Backend steps:
1. Add default config to plugins/ghrm/admin-config.json:
   "<widget_id>_widget": { ...fields... }
2. Add routes to plugins/ghrm/src/routes.py:
   GET  /api/v1/ghrm/widgets/<widget_id>        (public — fe-user reads config)
   PUT  /api/v1/admin/ghrm/widgets/<widget_id>  (admin — save config)
3. Write unit tests for both routes

Frontend fe-admin steps:
4. Create Ghrm<WidgetName>WidgetConfig.vue with 3 tabs:
   - General tab: form fields matching config schema
   - CSS tab: CodeMirror CSS editor for custom_css field
   - Preview tab: <iframe> to fe-user with ?__ghrm_<widget_id>_preview=1&...fields as query params
5. Register in GhrmWidgets.vue listing page
6. Write unit tests for each tab

Frontend fe-user steps:
7. Create Ghrm<WidgetName>.vue component
8. On mount: fetch config from GET /api/v1/ghrm/widgets/<widget_id>
9. In preview mode (route.query.__ghrm_<widget_id>_preview === '1'): use query params instead
10. Register in ghrm/index.ts if this is a vue-component widget
11. Inject into relevant GHRM views
12. Write unit tests for rendering with config + preview mode

Rules: TDD, DI (config fetched via composable), 3-tab admin pattern always, preview via iframe.
```

---

## Prompt 4: Create a new Git provider plugin on top of GHRM

```
You are working in the VBWD codebase (vbwd-sdk-2).
Reference: vbwd-backend/plugins/ghrm/src/services/github_app_client.py
Full guide: vbwd-backend/plugins/ghrm/docs/gitx.md

Task: Create a new plugin called "<provider>-ghrm" (e.g. "gitlab-ghrm" or "bitbucket-ghrm")
that implements the IGithubAppClient interface for <provider>.

Context:
- IGithubAppClient defines the contract: add_collaborator, create_deploy_token, fetch_readme, etc.
- MockGithubAppClient is the reference for testing
- The GHRM backend instantiates the client via _make_github_client() in routes.py
- The provider plugin must implement ALL methods of IGithubAppClient (Liskov Substitution)
- See gitx.md for API mapping between GitHub, GitLab, and Bitbucket

Steps:
1. Create vbwd-backend/plugins/<provider>-ghrm/src/services/<provider>_client.py
   - Implement IGithubAppClient protocol exactly
   - All method signatures must match (Liskov)
   - Constructor accepts provider-specific config (API token, base URL, etc.)
2. Create Mock<Provider>Client for testing (same pattern as MockGithubAppClient)
3. Add provider selection to GHRM _make_github_client() via env/config:
   if config["git_provider"] == "<provider>": return <Provider>Client(...)
4. Add config schema to plugins/ghrm/config.json:
   "git_provider": "<provider>",
   "<provider>_api_token": "",
   "<provider>_base_url": "https://<provider>.example.com"
5. Write unit tests using Mock<Provider>Client for all implemented methods
6. Write integration tests using the real <provider> API (behind feature flag)

Rules: TDD, Liskov (100% interface compatibility), DI, no modification to existing GHRM logic.
Reference gitx.md for OAuth, deploy token, and collaborator API differences per provider.
```

---

## Prompt 5: Fix a bug in GHRM package sync

```
You are working in the VBWD codebase (vbwd-sdk-2).

Task: Fix bug in the GHRM sync system. Bug description: <describe the bug>

Context:
- Sync service: vbwd-backend/plugins/ghrm/src/services/software_package_service.py
- GitHub client interface: plugins/ghrm/src/services/github_app_client.py
- Sync routes: plugins/ghrm/src/routes.py
- Unit tests: plugins/ghrm/tests/unit/services/test_software_package_service.py
- Integration tests: plugins/ghrm/tests/integration/

TDD approach:
1. First: write a failing unit test that reproduces the bug exactly
2. Then: fix the bug in software_package_service.py (or github_app_client.py if mock behavior)
3. Verify the test now passes
4. Run full test suite: make test-unit, make test-integration

Rules:
- Do not modify MockGithubAppClient to hide the bug — fix the actual service
- Do not add try/except to suppress errors — fix the root cause
- If the fix requires a new exception type, add it to software_package_service.py
  and handle it in routes.py with the correct HTTP status code
- If the fix requires a DB migration, create one in alembic/versions/
```
