import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

import GhrmSoftwareTab from '../../src/components/GhrmSoftwareTab.vue'

interface FetchCall {
  url: string
  method: string
  body: Record<string, unknown> | null
}

const fetchCalls: FetchCall[] = []

function jsonResponse(payload: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(payload),
  } as unknown as Response
}

function mountTab() {
  return mount(GhrmSoftwareTab, {
    props: { planId: 'plan-1', assignedCategories: [] },
    global: { mocks: { $t: (key: string) => key } },
  })
}

function recordFetch(impl: (call: FetchCall) => unknown) {
  return vi.fn((url: string, options: { method?: string; body?: string } = {}) => {
    const call: FetchCall = {
      url,
      method: options.method || 'GET',
      body: options.body ? (JSON.parse(options.body) as Record<string, unknown>) : null,
    }
    fetchCalls.push(call)
    return Promise.resolve(jsonResponse(impl(call)))
  })
}

function stubCreateMode() {
  vi.stubGlobal(
    'fetch',
    recordFetch((call) => {
      if (call.url.includes('/ghrm/config')) {
        return { allow_extensive_github_permissions: true }
      }
      if (call.method === 'GET') return { items: [] }
      return { id: 'pkg-new', slug: 'repo', collaborator_permission: 'pull' }
    })
  )
}

function stubEditMode(pkgOverrides: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    recordFetch((call) => {
      if (call.url.includes('/ghrm/config')) {
        return { allow_extensive_github_permissions: true }
      }
      if (call.method === 'GET') {
        return {
          items: [
            {
              id: 'pkg-1',
              slug: 'repo',
              name: 'Repo',
              github_owner: 'acme',
              github_repo: 'repo',
              sync_api_key: 'key',
              collaborator_permission: 'pull',
              ...pkgOverrides,
            },
          ],
        }
      }
      return { id: 'pkg-1', slug: 'repo', collaborator_permission: 'pull' }
    })
  )
}

describe('GhrmSoftwareTab — bundle mode switch', () => {
  beforeEach(() => {
    fetchCalls.length = 0
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the package-kind mode switch and defaults to single', async () => {
    stubCreateMode()
    const wrapper = mountTab()
    await flushPromises()

    const modeSwitch = wrapper.find<HTMLSelectElement>('[data-testid="ghrm-package-kind"]')
    expect(modeSwitch.exists()).toBe(true)
    expect(modeSwitch.element.value).toBe('single')
  })

  it('shows owner/repo only and no bundle editor in single mode', async () => {
    stubCreateMode()
    const wrapper = mountTab()
    await flushPromises()

    expect(wrapper.find('[data-testid="ghrm-github-owner"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="ghrm-github-repo"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="ghrm-bundle-add-repo"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="ghrm-bundle-repo-row-0"]').exists()).toBe(false)
  })

  it('reveals the bundle repo-list editor when switching to bundle', async () => {
    stubCreateMode()
    const wrapper = mountTab()
    await flushPromises()

    await wrapper.find('[data-testid="ghrm-package-kind"]').setValue('bundle')

    // Representative owner/repo stays.
    expect(wrapper.find('[data-testid="ghrm-github-owner"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="ghrm-github-repo"]').exists()).toBe(true)
    // The bundle editor appears.
    expect(wrapper.find('[data-testid="ghrm-bundle-add-repo"]').exists()).toBe(true)
  })

  it('adds and removes bundle repo rows mutating form.bundle_repos', async () => {
    stubCreateMode()
    const wrapper = mountTab()
    await flushPromises()

    await wrapper.find('[data-testid="ghrm-package-kind"]').setValue('bundle')
    await wrapper.find('[data-testid="ghrm-bundle-add-repo"]').trigger('click')
    await wrapper.find('[data-testid="ghrm-bundle-add-repo"]').trigger('click')

    expect(wrapper.find('[data-testid="ghrm-bundle-repo-row-0"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="ghrm-bundle-repo-row-1"]').exists()).toBe(true)

    await wrapper.find('[data-testid="ghrm-bundle-repo-row-0-owner"]').setValue('org')
    await wrapper.find('[data-testid="ghrm-bundle-repo-row-0-repo"]').setValue('one')
    await wrapper.find('[data-testid="ghrm-bundle-repo-row-1-owner"]').setValue('org')
    await wrapper.find('[data-testid="ghrm-bundle-repo-row-1-repo"]').setValue('two')

    // Remove the first row.
    await wrapper.find('[data-testid="ghrm-bundle-repo-row-0-remove"]').trigger('click')
    expect(wrapper.find('[data-testid="ghrm-bundle-repo-row-1"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="ghrm-bundle-repo-row-0"]').exists()).toBe(true)

    const ownerInput = wrapper.find<HTMLInputElement>('[data-testid="ghrm-bundle-repo-row-0-owner"]')
    const repoInput = wrapper.find<HTMLInputElement>('[data-testid="ghrm-bundle-repo-row-0-repo"]')
    expect(ownerInput.element.value).toBe('org')
    expect(repoInput.element.value).toBe('two')
  })

  it('sends package_kind:bundle and bundle_repos on create in bundle mode', async () => {
    stubCreateMode()
    const wrapper = mountTab()
    await flushPromises()

    await wrapper.find('[data-testid="ghrm-github-owner"]').setValue('acme')
    await wrapper.find('[data-testid="ghrm-github-repo"]').setValue('repo')
    await wrapper.find('[data-testid="ghrm-package-kind"]').setValue('bundle')
    await wrapper.find('[data-testid="ghrm-bundle-add-repo"]').trigger('click')
    await wrapper.find('[data-testid="ghrm-bundle-repo-row-0-owner"]').setValue('org')
    await wrapper.find('[data-testid="ghrm-bundle-repo-row-0-repo"]').setValue('one')

    await wrapper.find('[data-testid="ghrm-save-btn"]').trigger('click')
    await flushPromises()

    const createCall = fetchCalls.find((call) => call.method === 'POST')
    expect(createCall).toBeDefined()
    expect(createCall!.body).toMatchObject({
      package_kind: 'bundle',
      bundle_repos: [{ owner: 'org', repo: 'one' }],
    })
  })

  it('always sends package_kind and bundle_repos:[] on create in single mode', async () => {
    stubCreateMode()
    const wrapper = mountTab()
    await flushPromises()

    await wrapper.find('[data-testid="ghrm-github-owner"]').setValue('acme')
    await wrapper.find('[data-testid="ghrm-github-repo"]').setValue('repo')
    await wrapper.find('[data-testid="ghrm-save-btn"]').trigger('click')
    await flushPromises()

    const createCall = fetchCalls.find((call) => call.method === 'POST')
    expect(createCall).toBeDefined()
    expect(createCall!.body).toMatchObject({ package_kind: 'single', bundle_repos: [] })
  })

  it('preselects bundle mode and pre-fills rows when editing a bundle package', async () => {
    stubEditMode({
      package_kind: 'bundle',
      bundle_repos: [
        { owner: 'org', repo: 'one' },
        { owner: 'org', repo: 'two' },
      ],
    })
    const wrapper = mountTab()
    await flushPromises()

    const modeSwitch = wrapper.find<HTMLSelectElement>('[data-testid="ghrm-package-kind"]')
    expect(modeSwitch.element.value).toBe('bundle')

    expect(
      wrapper.find<HTMLInputElement>('[data-testid="ghrm-bundle-repo-row-0-owner"]').element.value
    ).toBe('org')
    expect(
      wrapper.find<HTMLInputElement>('[data-testid="ghrm-bundle-repo-row-0-repo"]').element.value
    ).toBe('one')
    expect(
      wrapper.find<HTMLInputElement>('[data-testid="ghrm-bundle-repo-row-1-repo"]').element.value
    ).toBe('two')
  })

  it('blocks save when bundle mode has an empty repo list', async () => {
    stubCreateMode()
    const wrapper = mountTab()
    await flushPromises()

    await wrapper.find('[data-testid="ghrm-github-owner"]').setValue('acme')
    await wrapper.find('[data-testid="ghrm-github-repo"]').setValue('repo')
    await wrapper.find('[data-testid="ghrm-package-kind"]').setValue('bundle')

    await wrapper.find('[data-testid="ghrm-save-btn"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="ghrm-bundle-empty-error"]').exists()).toBe(true)
    expect(fetchCalls.find((call) => call.method === 'POST')).toBeUndefined()
  })

  it('blocks save when a bundle row has a blank owner or repo', async () => {
    stubCreateMode()
    const wrapper = mountTab()
    await flushPromises()

    await wrapper.find('[data-testid="ghrm-github-owner"]').setValue('acme')
    await wrapper.find('[data-testid="ghrm-github-repo"]').setValue('repo')
    await wrapper.find('[data-testid="ghrm-package-kind"]').setValue('bundle')
    await wrapper.find('[data-testid="ghrm-bundle-add-repo"]').trigger('click')
    await wrapper.find('[data-testid="ghrm-bundle-repo-row-0-owner"]').setValue('org')
    // repo left blank

    await wrapper.find('[data-testid="ghrm-save-btn"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="ghrm-bundle-empty-error"]').exists()).toBe(true)
    expect(fetchCalls.find((call) => call.method === 'POST')).toBeUndefined()
  })

  it('clears bundle_repos when switching back to single before save', async () => {
    stubCreateMode()
    const wrapper = mountTab()
    await flushPromises()

    await wrapper.find('[data-testid="ghrm-github-owner"]').setValue('acme')
    await wrapper.find('[data-testid="ghrm-github-repo"]').setValue('repo')
    await wrapper.find('[data-testid="ghrm-package-kind"]').setValue('bundle')
    await wrapper.find('[data-testid="ghrm-bundle-add-repo"]').trigger('click')
    await wrapper.find('[data-testid="ghrm-bundle-repo-row-0-owner"]').setValue('org')
    await wrapper.find('[data-testid="ghrm-bundle-repo-row-0-repo"]').setValue('one')

    // Switch back to single — bundle editor disappears, list cleared.
    await wrapper.find('[data-testid="ghrm-package-kind"]').setValue('single')
    expect(wrapper.find('[data-testid="ghrm-bundle-add-repo"]').exists()).toBe(false)

    await wrapper.find('[data-testid="ghrm-save-btn"]').trigger('click')
    await flushPromises()

    const createCall = fetchCalls.find((call) => call.method === 'POST')
    expect(createCall).toBeDefined()
    expect(createCall!.body).toMatchObject({ package_kind: 'single', bundle_repos: [] })
  })
})
