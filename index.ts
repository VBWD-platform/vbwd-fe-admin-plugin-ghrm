/**
 * GHRM Admin Plugin
 *
 * Extends the tariff plan edit page with a "Software" tab.
 * The tab appears only when the plan belongs to a software category.
 */

import type { IPlugin } from 'vbwd-view-component';
import { extensionRegistry } from '../../vue/src/plugins/extensionRegistry';
import GhrmSoftwareTab from './src/components/GhrmSoftwareTab.vue';

const SOFTWARE_CATEGORY_SLUGS = ['backend', 'fe-user', 'fe-admin'];

export const ghrmAdminPlugin: IPlugin = {
  name: 'ghrm-admin',
  version: '1.0.0',
  description: 'GitHub Repo Manager — software tab on tariff plan edit page',

  install() {
    extensionRegistry.register('ghrm-admin', {
      planTabSections: [
        {
          label: 'Software',
          component: GhrmSoftwareTab,
          requiredCategorySlugs: SOFTWARE_CATEGORY_SLUGS,
        },
      ],
    });
  },

  activate() {
    extensionRegistry.register('ghrm-admin', {
      planTabSections: [
        {
          label: 'Software',
          component: GhrmSoftwareTab,
          requiredCategorySlugs: SOFTWARE_CATEGORY_SLUGS,
        },
      ],
    });
  },

  deactivate() {
    extensionRegistry.unregister('ghrm-admin');
  },
};

export default ghrmAdminPlugin;
