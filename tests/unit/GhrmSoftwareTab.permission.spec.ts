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

const ALL_OTHER_VALUES = ['triage', 'push', 'maintain', 'admin']

function selectableOptionValues(wrapper: ReturnType<typeof mountTab>): string[] {
  return wrapper
    .find('[data-testid="ghrm-collaborator-permission"]')
    .findAll('option')
    .filter((option) => option.attributes('disabled') === undefined)
    .map((option) => option.attributes('value') as string)
}

describe('GhrmSoftwareTab — GitHub access level select', () => {
  beforeEach(() => {
    fetchCalls.length = 0
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders all five access-level options', async () => {
    // create mode: no existing package, extensive permissions enabled
    vi.stubGlobal(
      'fetch',
      recordFetch((call) => {
        if (call.url.includes('/ghrm/config')) {
          return { allow_extensive_github_permissions: true }
        }
        return { items: [] }
      })
    )
    const wrapper = mountTab()
    await flushPromises()

    const select = wrapper.find('[data-testid="ghrm-collaborator-permission"]')
    expect(select.exists()).toBe(true)
    const values = select.findAll('option').map((option) => option.attributes('value'))
    expect(values).toEqual(['pull', 'triage', 'push', 'maintain', 'admin'])
  })

  it('defaults the access level to pull and sends it on create', async () => {
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
    const wrapper = mountTab()
    await flushPromises()

    const select = wrapper.find<HTMLSelectElement>('[data-testid="ghrm-collaborator-permission"]')
    expect(select.element.value).toBe('pull')

    await wrapper.find('[data-testid="ghrm-github-repo"]').setValue('repo')
    await wrapper.find('[data-testid="ghrm-save-btn"]').trigger('click')
    await flushPromises()

    const createCall = fetchCalls.find((call) => call.method === 'POST')
    expect(createCall).toBeDefined()
    expect(createCall!.body).toMatchObject({ collaborator_permission: 'pull' })
  })

  it('preselects the existing collaborator_permission on edit', async () => {
    vi.stubGlobal(
      'fetch',
      recordFetch((call) => {
        if (call.url.includes('/ghrm/config')) {
          return { allow_extensive_github_permissions: true }
        }
        return {
          items: [
            {
              id: 'pkg-1',
              slug: 'repo',
              name: 'Repo',
              github_owner: 'acme',
              github_repo: 'repo',
              sync_api_key: 'key',
              collaborator_permission: 'maintain',
            },
          ],
        }
      })
    )
    const wrapper = mountTab()
    await flushPromises()

    const select = wrapper.find<HTMLSelectElement>('[data-testid="ghrm-collaborator-permission"]')
    expect(select.element.value).toBe('maintain')
  })

  it('sends the chosen collaborator_permission in the update payload', async () => {
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
              },
            ],
          }
        }
        return { id: 'pkg-1', slug: 'repo', collaborator_permission: 'push' }
      })
    )
    const wrapper = mountTab()
    await flushPromises()

    await wrapper.find('[data-testid="ghrm-collaborator-permission"]').setValue('push')
    await wrapper.find('[data-testid="ghrm-save-btn"]').trigger('click')
    await flushPromises()

    const updateCall = fetchCalls.find((call) => call.method === 'PUT')
    expect(updateCall).toBeDefined()
    expect(updateCall!.body).toMatchObject({ collaborator_permission: 'push' })
  })
})

describe('GhrmSoftwareTab — D3 extensive-permission gate', () => {
  beforeEach(() => {
    fetchCalls.length = 0
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('allows only Read when allow_extensive_github_permissions is false (the default)', async () => {
    vi.stubGlobal(
      'fetch',
      recordFetch((call) => {
        if (call.url.includes('/ghrm/config')) {
          return { allow_extensive_github_permissions: false }
        }
        return { items: [] }
      })
    )
    const wrapper = mountTab()
    await flushPromises()

    // Only Read (pull) is selectable; the write+ options are disabled.
    expect(selectableOptionValues(wrapper)).toEqual(['pull'])

    const disabledValues = wrapper
      .find('[data-testid="ghrm-collaborator-permission"]')
      .findAll('option')
      .filter((option) => option.attributes('disabled') !== undefined)
      .map((option) => option.attributes('value') as string)
    expect(disabledValues).toEqual(ALL_OTHER_VALUES)

    // A hint explains why write+ is disabled.
    expect(wrapper.find('[data-testid="ghrm-permission-hint"]').exists()).toBe(true)
  })

  it('defaults to a missing config flag as false (write+ not selectable)', async () => {
    vi.stubGlobal(
      'fetch',
      recordFetch((call) => {
        if (call.url.includes('/ghrm/config')) {
          return {} // flag absent => treated as false
        }
        return { items: [] }
      })
    )
    const wrapper = mountTab()
    await flushPromises()

    expect(selectableOptionValues(wrapper)).toEqual(['pull'])
    expect(wrapper.find('[data-testid="ghrm-permission-hint"]').exists()).toBe(true)
  })

  it('allows all five options and shows no hint when the flag is true', async () => {
    vi.stubGlobal(
      'fetch',
      recordFetch((call) => {
        if (call.url.includes('/ghrm/config')) {
          return { allow_extensive_github_permissions: true }
        }
        return { items: [] }
      })
    )
    const wrapper = mountTab()
    await flushPromises()

    expect(selectableOptionValues(wrapper)).toEqual(['pull', 'triage', 'push', 'maintain', 'admin'])
    expect(wrapper.find('[data-testid="ghrm-permission-hint"]').exists()).toBe(false)
  })

  it('still displays a stored write+ level when the flag is off but does not let the admin re-select write+', async () => {
    vi.stubGlobal(
      'fetch',
      recordFetch((call) => {
        if (call.url.includes('/ghrm/config')) {
          return { allow_extensive_github_permissions: false }
        }
        return {
          items: [
            {
              id: 'pkg-1',
              slug: 'repo',
              name: 'Repo',
              github_owner: 'acme',
              github_repo: 'repo',
              sync_api_key: 'key',
              collaborator_permission: 'push',
            },
          ],
        }
      })
    )
    const wrapper = mountTab()
    await flushPromises()

    // The stored value is preserved (not silently mutated on load).
    const select = wrapper.find<HTMLSelectElement>('[data-testid="ghrm-collaborator-permission"]')
    expect(select.element.value).toBe('push')

    // But write+ options remain disabled — only Read is selectable.
    expect(selectableOptionValues(wrapper)).toEqual(['pull'])
  })
})
