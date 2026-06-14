/**
 * S77 — the GHRM software tab mounts the generic Tags + Custom-fields editors
 * with entity_type=ghrm_software_package, once a package exists for the plan
 * (the package id is needed to address values). Reuses the shared host editors.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

vi.mock('@/api', () => ({ api: { get: vi.fn(async () => ({})), put: vi.fn(), post: vi.fn() } }));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));

import GhrmSoftwareTab from '../../src/components/GhrmSoftwareTab.vue';
import TagPicker from '@/components/TagPicker.vue';
import CustomFieldsEditor from '@/components/CustomFieldsEditor.vue';

function jsonResponse(payload: unknown): Response {
  return { ok: true, status: 200, json: () => Promise.resolve(payload) } as unknown as Response;
}

const EXISTING_PACKAGE = {
  id: 'pkg-1', slug: 'widget', name: 'Widget', github_owner: 'acme', github_repo: 'widget',
  collaborator_permission: 'pull', package_kind: 'single', bundle_repos: [],
};

function stubFetch(items: unknown[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (typeof url === 'string' && url.includes('/ghrm/config')) {
        return Promise.resolve(jsonResponse({ allow_extensive_github_permissions: true }));
      }
      return Promise.resolve(jsonResponse({ items }));
    }),
  );
}

function mountTab() {
  return mount(GhrmSoftwareTab, {
    props: { planId: 'plan-1', assignedCategories: [] },
    global: { mocks: { $t: (key: string) => key } },
  });
}

describe('GhrmSoftwareTab — S77 tags + custom fields', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mounts the editors with entity_type=ghrm_software_package once a package exists', async () => {
    stubFetch([EXISTING_PACKAGE]);
    const wrapper = mountTab();
    await flushPromises();

    expect(wrapper.find('[data-testid="ghrm-package-tags-custom-fields"]').exists()).toBe(true);
    const tagPicker = wrapper.findComponent(TagPicker);
    expect(tagPicker.exists()).toBe(true);
    expect(tagPicker.props('entityType')).toBe('ghrm_software_package');
    expect(tagPicker.props('entityId')).toBe('pkg-1');
    expect(wrapper.findComponent(CustomFieldsEditor).props('entityType')).toBe('ghrm_software_package');
  });

  it('does not show the block when no package exists yet for the plan', async () => {
    stubFetch([]);
    const wrapper = mountTab();
    await flushPromises();

    expect(wrapper.find('[data-testid="ghrm-package-tags-custom-fields"]').exists()).toBe(false);
  });
});
