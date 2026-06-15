/**
 * GHRM Admin Plugin
 *
 * Extends the tariff plan edit page with a "Software" tab.
 * The tab appears only when the plan belongs to a software category.
 *
 * The set of "software" categories is NOT hardcoded here — it is read from the
 * backend GHRM plugin config (`software_category_slugs`), the single source of
 * truth shared by the backend, the catalogue pages (populate-ghrm) and this tab.
 * The extension registry is reactive, so re-registering once the config loads
 * makes the plan form recompute tab visibility automatically.
 */

import type { IPlugin, IPlatformSDK } from 'vbwd-view-component';
import { extensionRegistry } from '../../vue/src/plugins/extensionRegistry';
import { api } from '../../vue/src/api';
import GhrmSoftwareTab from './src/components/GhrmSoftwareTab.vue';
import en from './locales/en.json';
import de from './locales/de.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import ja from './locales/ja.json';
import ru from './locales/ru.json';
import th from './locales/th.json';
import zh from './locales/zh.json';

// Fallback used only until the backend config is fetched, or if the plugin has
// never been configured (key absent). An explicitly-saved empty list is honored.
const DEFAULT_SOFTWARE_CATEGORY_SLUGS = ['backend', 'fe-user', 'fe-admin'];

/** Coerce the stored config value to a slug array (tolerates a legacy CSV string). */
function toSlugArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    return value.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

function registerSoftwareTab(requiredCategorySlugs: string[]): void {
  extensionRegistry.register('ghrm-admin', {
    planTabSections: [
      {
        label: 'Software',
        component: GhrmSoftwareTab,
        requiredCategorySlugs,
      },
    ],
  });
}

/**
 * Fetch `software_category_slugs` from the backend GHRM config and re-register
 * the Software tab with it. Best-effort: on failure we keep the defaults that
 * were registered synchronously. The backend plugin is named `ghrm`.
 */
async function syncSoftwareCategorySlugs(): Promise<void> {
  // Don't probe before the user is authenticated. An unauthenticated
  // GET /admin/plugins/ghrm returns 401, and the shared ApiClient's 401
  // handler treats ANY 401 as a session expiry → it logs the user out and
  // redirects to /admin/login. Plugins install/activate on boot (pre-login),
  // so without this guard the boot-time probe's 401 silently logs the admin
  // out moments after they sign in. The plugin set re-activates after login,
  // so this runs again with a token and the configured slugs still load.
  if (!api.getToken()) {
    return;
  }
  try {
    const data = await api.get('/admin/plugins/ghrm') as { savedConfig?: Record<string, unknown> };
    const saved = data?.savedConfig ?? {};
    // Distinguish "never configured" (absent → defaults) from "configured empty"
    // (present → honor the empty list, hiding the tab everywhere).
    const slugs = 'software_category_slugs' in saved
      ? toSlugArray(saved.software_category_slugs)
      : DEFAULT_SOFTWARE_CATEGORY_SLUGS;
    registerSoftwareTab(slugs);
  } catch {
    // Keep the synchronously-registered defaults.
  }
}

export const ghrmAdminPlugin: IPlugin = {
  name: 'ghrm-admin',
  version: '1.0.0',
  description: 'GitHub Repo Manager — software tab on tariff plan edit page',

  install(sdk: IPlatformSDK) {
    sdk.addTranslations('en', { ghrm: (en as Record<string, unknown>)['ghrm'] });
    sdk.addTranslations('de', { ghrm: (de as Record<string, unknown>)['ghrm'] });
    sdk.addTranslations('es', { ghrm: (es as Record<string, unknown>)['ghrm'] });
    sdk.addTranslations('fr', { ghrm: (fr as Record<string, unknown>)['ghrm'] });
    sdk.addTranslations('ja', { ghrm: (ja as Record<string, unknown>)['ghrm'] });
    sdk.addTranslations('ru', { ghrm: (ru as Record<string, unknown>)['ghrm'] });
    sdk.addTranslations('th', { ghrm: (th as Record<string, unknown>)['ghrm'] });
    sdk.addTranslations('zh', { ghrm: (zh as Record<string, unknown>)['ghrm'] });

    registerSoftwareTab(DEFAULT_SOFTWARE_CATEGORY_SLUGS);
    void syncSoftwareCategorySlugs();
  },

  activate() {
    registerSoftwareTab(DEFAULT_SOFTWARE_CATEGORY_SLUGS);
    void syncSoftwareCategorySlugs();
  },

  deactivate() {
    extensionRegistry.unregister('ghrm-admin');
  },
};

export default ghrmAdminPlugin;
