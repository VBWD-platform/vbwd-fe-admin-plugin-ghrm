<template>
  <div class="ghrm-software-tab">
    <div
      v-if="loading"
      class="ghrm-loading"
    >
      {{ $t('ghrm.softwareTab.loading') }}
    </div>

    <div
      v-else-if="error"
      class="ghrm-error"
    >
      {{ error }}
    </div>

    <template v-else>
      <!-- Display Name -->
      <div class="ghrm-field">
        <label class="ghrm-label">{{ $t('ghrm.softwareTab.labelPackageName') }}</label>
        <input
          v-model="form.name"
          class="ghrm-input"
          type="text"
          :placeholder="$t('ghrm.softwareTab.placeholderPackageName')"
          data-testid="ghrm-name"
        >
      </div>

      <!-- Package kind: Single repo vs Bundle -->
      <div class="ghrm-field">
        <label class="ghrm-label">{{ $t('ghrm.softwareTab.labelMode') }}</label>
        <select
          v-model="form.package_kind"
          class="ghrm-input"
          data-testid="ghrm-package-kind"
          @change="onModeChange"
        >
          <option value="single">
            {{ $t('ghrm.softwareTab.modeSingle') }}
          </option>
          <option value="bundle">
            {{ $t('ghrm.softwareTab.modeBundle') }}
          </option>
        </select>
      </div>

      <!-- GitHub Repo (representative / showcase repo) -->
      <div class="ghrm-field-row">
        <div class="ghrm-field">
          <label class="ghrm-label">{{ isBundle ? $t('ghrm.softwareTab.labelShowcaseRepo') : $t('ghrm.softwareTab.labelGithubOwner') }}</label>
          <input
            v-model="form.github_owner"
            class="ghrm-input"
            type="text"
            :placeholder="$t('ghrm.softwareTab.placeholderGithubOwner')"
            data-testid="ghrm-github-owner"
          >
        </div>
        <div class="ghrm-field">
          <label class="ghrm-label">{{ $t('ghrm.softwareTab.labelGithubRepo') }}</label>
          <input
            v-model="form.github_repo"
            class="ghrm-input"
            type="text"
            :placeholder="$t('ghrm.softwareTab.placeholderGithubRepo')"
            data-testid="ghrm-github-repo"
          >
        </div>
      </div>

      <!-- Bundle repo list editor -->
      <div
        v-if="isBundle"
        class="ghrm-field"
      >
        <label class="ghrm-label">{{ $t('ghrm.softwareTab.labelBundleRepos') }}</label>
        <p class="ghrm-hint">
          {{ $t('ghrm.softwareTab.bundleReposHint') }}
          <a
            :href="bundleSearchUrl"
            target="_blank"
            rel="noopener noreferrer"
          >{{ bundleSearchUrl }}</a>
        </p>
        <div
          v-for="(repo, index) in form.bundle_repos"
          :key="index"
          class="ghrm-field-row ghrm-bundle-row"
          :data-testid="`ghrm-bundle-repo-row-${index}`"
        >
          <input
            v-model="repo.owner"
            class="ghrm-input"
            type="text"
            :placeholder="$t('ghrm.softwareTab.placeholderGithubOwner')"
            :data-testid="`ghrm-bundle-repo-row-${index}-owner`"
          >
          <input
            v-model="repo.repo"
            class="ghrm-input"
            type="text"
            :placeholder="$t('ghrm.softwareTab.placeholderGithubRepo')"
            :data-testid="`ghrm-bundle-repo-row-${index}-repo`"
          >
          <button
            type="button"
            class="ghrm-icon-btn ghrm-icon-btn--warn"
            :title="$t('ghrm.softwareTab.removeBundleRepo')"
            :aria-label="$t('ghrm.softwareTab.removeBundleRepo')"
            :data-testid="`ghrm-bundle-repo-row-${index}-remove`"
            @click="removeBundleRepo(index)"
          >
            &times;
          </button>
        </div>
        <button
          type="button"
          class="ghrm-btn"
          data-testid="ghrm-bundle-add-repo"
          @click="addBundleRepo"
        >
          {{ $t('ghrm.softwareTab.addBundleRepo') }}
        </button>
        <p
          v-if="bundleError"
          class="ghrm-error-inline"
          data-testid="ghrm-bundle-empty-error"
        >
          {{ $t('ghrm.softwareTab.bundleEmptyError') }}
        </p>
      </div>

      <!-- Description -->
      <div class="ghrm-field">
        <label class="ghrm-label">{{ $t('ghrm.softwareTab.labelDescription') }}</label>
        <textarea
          v-model="form.description"
          class="ghrm-input ghrm-textarea"
          rows="3"
          :placeholder="$t('ghrm.softwareTab.placeholderDescription')"
          data-testid="ghrm-description"
        />
      </div>

      <!-- GitHub Access Level -->
      <div class="ghrm-field">
        <label class="ghrm-label">{{ $t('ghrm.softwareTab.labelCollaboratorPermission') }}</label>
        <select
          v-model="form.collaborator_permission"
          class="ghrm-input"
          data-testid="ghrm-collaborator-permission"
        >
          <option
            v-for="level in collaboratorPermissionLevels"
            :key="level.value"
            :value="level.value"
            :disabled="isPermissionOptionDisabled(level.value)"
          >
            {{ $t(level.labelKey) }}
          </option>
        </select>
        <p
          v-if="!allowExtensivePermissions"
          class="ghrm-hint ghrm-hint--warn"
          data-testid="ghrm-permission-hint"
        >
          {{ $t('ghrm.softwareTab.permissionGatedHint') }}
        </p>
        <p
          v-if="isBundle"
          class="ghrm-hint"
          data-testid="ghrm-permission-bundle-hint"
        >
          {{ $t('ghrm.softwareTab.permissionBundleHint') }}
        </p>
      </div>

      <!-- Author -->
      <div class="ghrm-field">
        <label class="ghrm-label">{{ $t('ghrm.softwareTab.labelAuthor') }}</label>
        <input
          v-model="form.author_name"
          class="ghrm-input"
          type="text"
          :placeholder="$t('ghrm.softwareTab.placeholderAuthor')"
          data-testid="ghrm-author-name"
        >
      </div>

      <!-- Icon URL -->
      <div class="ghrm-field">
        <label class="ghrm-label">{{ $t('ghrm.softwareTab.labelIconUrl') }}</label>
        <input
          v-model="form.icon_url"
          class="ghrm-input"
          type="text"
          :placeholder="$t('ghrm.softwareTab.placeholderIconUrl')"
          data-testid="ghrm-icon-url"
        >
        <img
          v-if="form.icon_url"
          :src="form.icon_url"
          class="ghrm-icon-preview"
          :alt="$t('ghrm.softwareTab.iconAlt')"
        >
      </div>

      <!-- Save button -->
      <div class="ghrm-actions">
        <button
          type="button"
          class="ghrm-btn ghrm-btn--primary"
          :disabled="saving"
          data-testid="ghrm-save-btn"
          @click="save"
        >
          {{ saving ? $t('ghrm.softwareTab.saving') : (pkg ? $t('ghrm.softwareTab.updatePackage') : $t('ghrm.softwareTab.createPackage')) }}
        </button>
      </div>

      <!-- Sync API Key (read-only, only after package is created) -->
      <template v-if="pkg">
        <div class="ghrm-divider" />

        <div class="ghrm-field">
          <label class="ghrm-label">{{ $t('ghrm.softwareTab.labelSyncApiKey') }}</label>
          <p class="ghrm-hint">
            {{ $t('ghrm.softwareTab.syncApiKeyHint', { secretName: 'VBWD_SYNC_KEY' }) }}
            <code>curl "{{ apiBase }}/api/v1/ghrm/sync?package={{ pkg.slug }}&amp;key=$VBWD_SYNC_KEY"</code>
          </p>
          <div class="ghrm-key-row">
            <input
              :value="pkg.sync_api_key"
              class="ghrm-input ghrm-input--mono"
              readonly
              data-testid="ghrm-sync-api-key"
            >
            <button
              type="button"
              class="ghrm-btn"
              data-testid="ghrm-copy-key-btn"
              @click="copyKey"
            >
              {{ keyCopied ? $t('ghrm.softwareTab.copied') : $t('ghrm.softwareTab.copy') }}
            </button>
            <button
              type="button"
              class="ghrm-btn ghrm-btn--warn"
              :disabled="rotatingKey"
              data-testid="ghrm-rotate-key-btn"
              @click="rotateKey"
            >
              {{ rotatingKey ? $t('ghrm.softwareTab.rotating') : $t('ghrm.softwareTab.regenerate') }}
            </button>
          </div>
        </div>

        <!-- Last synced + Sync Now + Partial Sync buttons -->
        <div class="ghrm-field">
          <label class="ghrm-label">{{ $t('ghrm.softwareTab.labelLastSynced') }}</label>
          <div class="ghrm-sync-row">
            <span
              class="ghrm-sync-time"
              data-testid="ghrm-last-synced"
            >
              {{ lastSyncedLabel }}
            </span>
            <button
              type="button"
              class="ghrm-btn"
              :disabled="syncing"
              data-testid="ghrm-sync-now-btn"
              @click="syncNow"
            >
              {{ syncing ? $t('ghrm.softwareTab.syncing') : $t('ghrm.softwareTab.syncNow') }}
            </button>
            <button
              v-for="field in partialSyncFields"
              :key="field"
              type="button"
              class="ghrm-btn"
              :disabled="previewState[field].fetching"
              :data-testid="`ghrm-sync-${field}-btn`"
              @click="fetchPreview(field)"
            >
              {{ previewState[field].fetching ? $t('ghrm.softwareTab.fetching') : $t('ghrm.softwareTab.syncField', { field: $t('ghrm.softwareTab.fieldLabel.' + field) }) }}
            </button>
          </div>
          <p
            v-if="syncSuccess"
            class="ghrm-success"
          >
            {{ $t('ghrm.softwareTab.syncSuccess') }}
          </p>
          <p
            v-if="syncError"
            class="ghrm-error-inline"
          >
            {{ syncError }}
          </p>

          <!-- Preview panels -->
          <template
            v-for="field in partialSyncFields"
            :key="`preview-${field}`"
          >
            <div
              v-if="previewState[field].visible"
              class="ghrm-preview-panel"
              :data-testid="`ghrm-preview-panel-${field}`"
            >
              <div class="ghrm-preview-header">
                <strong>{{ $t('ghrm.softwareTab.previewLabel', { field: $t('ghrm.softwareTab.fieldLabel.' + field) }) }}</strong>
              </div>

              <!-- README / Changelog: raw markdown in <pre> -->
              <template v-if="field === 'readme' || field === 'changelog'">
                <pre
                  v-if="previewState[field].content !== null"
                  class="ghrm-preview-pre"
                >{{ previewState[field].content }}</pre>
                <p
                  v-else
                  class="ghrm-hint"
                >
                  {{ $t('ghrm.softwareTab.noContent') }}
                </p>
              </template>

              <!-- Screenshots: thumbnail list -->
              <template v-else-if="field === 'screenshots'">
                <div
                  v-if="previewState[field].urls && previewState[field].urls!.length"
                  class="ghrm-preview-screenshots"
                >
                  <img
                    v-for="(url, idx) in previewState[field].urls"
                    :key="idx"
                    :src="url"
                    class="ghrm-preview-img"
                    :alt="$t('ghrm.softwareTab.screenshotAlt')"
                  >
                </div>
                <p
                  v-else
                  class="ghrm-hint"
                >
                  {{ $t('ghrm.softwareTab.noScreenshots') }}
                </p>
              </template>

              <div class="ghrm-preview-actions">
                <button
                  type="button"
                  class="ghrm-btn ghrm-btn--primary"
                  :disabled="previewState[field].applying"
                  :data-testid="`ghrm-apply-${field}-btn`"
                  @click="applyField(field)"
                >
                  {{ previewState[field].applying ? $t('ghrm.softwareTab.applying') : $t('ghrm.softwareTab.apply') }}
                </button>
                <button
                  type="button"
                  class="ghrm-btn"
                  :data-testid="`ghrm-dismiss-${field}-btn`"
                  @click="dismissPreview(field)"
                >
                  {{ $t('ghrm.softwareTab.dismiss') }}
                </button>
                <span
                  v-if="previewState[field].applySuccess"
                  class="ghrm-success"
                >
                  {{ $t('ghrm.softwareTab.appliedSuccess') }}
                </span>
                <span
                  v-if="previewState[field].applyError"
                  class="ghrm-error-inline"
                >
                  {{ previewState[field].applyError }}
                </span>
              </div>
            </div>
          </template>
        </div>
      </template>

      <p
        v-if="saveError"
        class="ghrm-error-inline"
      >
        {{ saveError }}
      </p>

      <!-- Tags + Custom fields (S77, generic editors) — shown once a package
           exists (its id addresses the values). -->
      <div
        v-if="pkg && pkg.id"
        class="ghrm-field"
        data-testid="ghrm-package-tags-custom-fields"
      >
        <TagPicker
          entity-type="ghrm_software_package"
          :entity-id="pkg.id"
        />
        <CustomFieldsEditor
          entity-type="ghrm_software_package"
          :entity-id="pkg.id"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import TagPicker from '@/components/TagPicker.vue';
import CustomFieldsEditor from '@/components/CustomFieldsEditor.vue';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('admin_token') || '';
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface BundleRepo {
  owner: string;
  repo: string;
}

interface GhrmPackage {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  author_name: string | null;
  icon_url: string | null;
  github_owner: string;
  github_repo: string;
  sync_api_key: string;
  last_synced_at: string | null;
  collaborator_permission: string;
  package_kind?: string;
  bundle_repos?: BundleRepo[];
}

const DEFAULT_COLLABORATOR_PERMISSION = 'pull';
const PACKAGE_KIND_SINGLE = 'single';
const PACKAGE_KIND_BUNDLE = 'bundle';

const collaboratorPermissionLevels: { value: string; labelKey: string }[] = [
  { value: 'pull', labelKey: 'ghrm.softwareTab.permissionRead' },
  { value: 'triage', labelKey: 'ghrm.softwareTab.permissionTriage' },
  { value: 'push', labelKey: 'ghrm.softwareTab.permissionWrite' },
  { value: 'maintain', labelKey: 'ghrm.softwareTab.permissionMaintain' },
  { value: 'admin', labelKey: 'ghrm.softwareTab.permissionAdmin' },
];

type PartialSyncField = 'readme' | 'changelog' | 'screenshots';

interface FieldPreviewState {
  fetching: boolean;
  visible: boolean;
  content: string | null;
  urls: string[] | null;
  applying: boolean;
  applySuccess: boolean;
  applyError: string | null;
}

const props = defineProps<{
  planId: string;
  assignedCategories: { id: string; slug: string; name: string }[];
}>();

const loading = ref(false);
const saving = ref(false);
const syncing = ref(false);
const rotatingKey = ref(false);
const keyCopied = ref(false);
const error = ref<string | null>(null);
const saveError = ref<string | null>(null);
const syncSuccess = ref(false);
const syncError = ref<string | null>(null);

const pkg = ref<GhrmPackage | null>(null);

// D3 security guardrail: write+ levels are only offered when the backend flag
// `allow_extensive_github_permissions` is true. Default false => only Read.
const allowExtensivePermissions = ref(false);

function isPermissionOptionDisabled(value: string): boolean {
  if (allowExtensivePermissions.value) return false;
  return value !== DEFAULT_COLLABORATOR_PERMISSION;
}

const form = ref({
  name: '',
  description: '',
  github_owner: '',
  github_repo: '',
  author_name: '',
  icon_url: '',
  collaborator_permission: DEFAULT_COLLABORATOR_PERMISSION,
  package_kind: PACKAGE_KIND_SINGLE,
  bundle_repos: [] as BundleRepo[],
});

const bundleError = ref(false);

const isBundle = computed(() => form.value.package_kind === PACKAGE_KIND_BUNDLE);

const bundleSearchUrl = computed(() => {
  const owner = form.value.github_owner.trim();
  const query = form.value.github_repo.trim();
  if (!owner) return 'https://github.com';
  const base = `https://github.com/orgs/${owner}/repositories`;
  return query ? `${base}?q=${encodeURIComponent(query)}` : base;
});

function onModeChange(): void {
  bundleError.value = false;
  if (form.value.package_kind === PACKAGE_KIND_SINGLE) {
    form.value.bundle_repos = [];
  }
}

function addBundleRepo(): void {
  form.value.bundle_repos.push({ owner: '', repo: '' });
}

function removeBundleRepo(index: number): void {
  form.value.bundle_repos.splice(index, 1);
}

function bundleReposValid(): boolean {
  if (form.value.bundle_repos.length === 0) return false;
  return form.value.bundle_repos.every(
    (entry) => entry.owner.trim() !== '' && entry.repo.trim() !== ''
  );
}

const partialSyncFields: PartialSyncField[] = ['readme', 'changelog', 'screenshots'];

function _makeFieldState(): FieldPreviewState {
  return {
    fetching: false,
    visible: false,
    content: null,
    urls: null,
    applying: false,
    applySuccess: false,
    applyError: null,
  };
}

const previewState = ref<Record<PartialSyncField, FieldPreviewState>>({
  readme: _makeFieldState(),
  changelog: _makeFieldState(),
  screenshots: _makeFieldState(),
});

const apiBase = computed(() => window.location.origin);

const lastSyncedLabel = computed(() => {
  if (!pkg.value?.last_synced_at) return 'Never';
  return new Date(pkg.value.last_synced_at).toLocaleString();
});

async function apiFetch<T>(url: string, options: { method?: string; headers?: Record<string, string>; body?: string } = {}): Promise<T> {
  const resp = await fetch(url, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${resp.status}`);
  }
  return resp.json();
}

async function loadConfig(): Promise<void> {
  try {
    const config = await apiFetch<{ allow_extensive_github_permissions?: boolean }>(
      '/api/v1/ghrm/config'
    );
    allowExtensivePermissions.value = config.allow_extensive_github_permissions === true;
  } catch {
    // On failure default to the safe (locked-down) state: Read only.
    allowExtensivePermissions.value = false;
  }
}

async function loadPackage(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const data = await apiFetch<{ items: GhrmPackage[] }>(
      `/api/v1/admin/ghrm/packages?tariff_plan_id=${props.planId}`
    );
    const found = (data.items || []).find((p: GhrmPackage) => p.id);
    if (found) {
      pkg.value = found;
      form.value = {
        name: found.name || '',
        description: found.description || '',
        github_owner: found.github_owner || '',
        github_repo: found.github_repo || '',
        author_name: found.author_name || '',
        icon_url: found.icon_url || '',
        collaborator_permission: found.collaborator_permission || DEFAULT_COLLABORATOR_PERMISSION,
        package_kind: found.package_kind === PACKAGE_KIND_BUNDLE ? PACKAGE_KIND_BUNDLE : PACKAGE_KIND_SINGLE,
        bundle_repos: (found.bundle_repos || []).map((entry) => ({ owner: entry.owner, repo: entry.repo })),
      };
    }
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}


async function save(): Promise<void> {
  bundleError.value = false;
  if (isBundle.value && !bundleReposValid()) {
    bundleError.value = true;
    return;
  }
  saving.value = true;
  saveError.value = null;
  try {
    const bundleRepos = isBundle.value
      ? form.value.bundle_repos.map((entry) => ({
          owner: entry.owner.trim(),
          repo: entry.repo.trim(),
        }))
      : [];
    const body = {
      tariff_plan_id: props.planId,
      name: form.value.name || form.value.github_repo,
      slug: form.value.github_repo.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      description: form.value.description || null,
      github_owner: form.value.github_owner,
      github_repo: form.value.github_repo,
      author_name: form.value.author_name || null,
      icon_url: form.value.icon_url || null,
      collaborator_permission: form.value.collaborator_permission || DEFAULT_COLLABORATOR_PERMISSION,
      package_kind: form.value.package_kind,
      bundle_repos: bundleRepos,
    };
    const jsonHeaders = { 'Content-Type': 'application/json' };
    if (pkg.value) {
      pkg.value = await apiFetch<GhrmPackage>(`/api/v1/admin/ghrm/packages/${pkg.value.id}`, {
        method: 'PUT',
        headers: jsonHeaders,
        body: JSON.stringify(body),
      });
    } else {
      pkg.value = await apiFetch<GhrmPackage>('/api/v1/admin/ghrm/packages', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(body),
      });
    }
  } catch (e) {
    saveError.value = (e as Error).message;
  } finally {
    saving.value = false;
  }
}

async function rotateKey(): Promise<void> {
  if (!pkg.value) return;
  rotatingKey.value = true;
  try {
    const data = await apiFetch<{ sync_api_key: string }>(
      `/api/v1/admin/ghrm/packages/${pkg.value.id}/rotate-key`,
      { method: 'POST' }
    );
    pkg.value = { ...pkg.value, sync_api_key: data.sync_api_key };
  } catch {
    // silently ignore
  } finally {
    rotatingKey.value = false;
  }
}

async function syncNow(): Promise<void> {
  if (!pkg.value) return;
  syncing.value = true;
  syncSuccess.value = false;
  syncError.value = null;
  try {
    await apiFetch(`/api/v1/admin/ghrm/packages/${pkg.value.id}/sync`, { method: 'POST' });
    syncSuccess.value = true;
    setTimeout(() => { syncSuccess.value = false; }, 3000);
  } catch (e) {
    syncError.value = (e as Error).message;
  } finally {
    syncing.value = false;
  }
}

async function fetchPreview(field: PartialSyncField): Promise<void> {
  if (!pkg.value) return;
  const state = previewState.value[field];
  state.fetching = true;
  state.visible = false;
  state.applySuccess = false;
  state.applyError = null;
  try {
    if (field === 'screenshots') {
      const data = await apiFetch<{ urls: string[] }>(
        `/api/v1/admin/ghrm/packages/${pkg.value.id}/preview/${field}`
      );
      state.urls = data.urls;
      state.content = null;
    } else {
      const data = await apiFetch<{ content: string | null }>(
        `/api/v1/admin/ghrm/packages/${pkg.value.id}/preview/${field}`
      );
      state.content = data.content;
      state.urls = null;
    }
    state.visible = true;
  } catch (e) {
    state.applyError = (e as Error).message;
    state.visible = true;
  } finally {
    state.fetching = false;
  }
}

async function applyField(field: PartialSyncField): Promise<void> {
  if (!pkg.value) return;
  const state = previewState.value[field];
  state.applying = true;
  state.applySuccess = false;
  state.applyError = null;
  try {
    await apiFetch(
      `/api/v1/admin/ghrm/packages/${pkg.value.id}/sync/${field}`,
      { method: 'POST' }
    );
    state.applySuccess = true;
    setTimeout(() => { state.applySuccess = false; }, 3000);
  } catch (e) {
    state.applyError = (e as Error).message;
  } finally {
    state.applying = false;
  }
}

function dismissPreview(field: PartialSyncField): void {
  const state = previewState.value[field];
  state.visible = false;
  state.content = null;
  state.urls = null;
  state.applySuccess = false;
  state.applyError = null;
}

async function copyKey(): Promise<void> {
  if (!pkg.value) return;
  await navigator.clipboard.writeText(pkg.value.sync_api_key);
  keyCopied.value = true;
  setTimeout(() => { keyCopied.value = false; }, 2000);
}

onMounted(() => {
  loadConfig();
  loadPackage();
});
</script>

<style scoped>
.ghrm-software-tab {
  font-size: 14px;
}

.ghrm-field {
  margin-bottom: 18px;
}

.ghrm-field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 18px;
}

/* Bundle repo rows: owner + repo inputs flex, small icon button on the right. */
.ghrm-bundle-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.ghrm-bundle-row .ghrm-input {
  flex: 1;
  min-width: 0;
}

.ghrm-icon-btn {
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 20px;
  line-height: 1;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: #f9fafb;
  color: #6b7280;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.ghrm-icon-btn:hover:not(:disabled) {
  background: #e9ecef;
}

.ghrm-icon-btn--warn:hover:not(:disabled) {
  background: #e74c3c;
  border-color: #c0392b;
  color: #fff;
}

.ghrm-label {
  display: block;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
  font-size: 13px;
}

.ghrm-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.ghrm-textarea {
  resize: vertical;
  min-height: 72px;
  line-height: 1.5;
}

.ghrm-input--mono {
  font-family: monospace;
  font-size: 12px;
  flex: 1;
}

.ghrm-input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

.ghrm-icon-preview {
  margin-top: 8px;
  width: 48px;
  height: 48px;
  object-fit: contain;
  border: 1px solid #e9ecef;
  border-radius: 4px;
}

.ghrm-btn {
  padding: 8px 14px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: #f9fafb;
  color: #374151;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
  transition: background 0.15s;
}

.ghrm-btn:hover:not(:disabled) {
  background: #e9ecef;
}

.ghrm-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ghrm-btn--primary {
  background: #3498db;
  color: #fff;
  border-color: #2980b9;
}

.ghrm-btn--primary:hover:not(:disabled) {
  background: #2980b9;
}

.ghrm-btn--warn {
  background: #e74c3c;
  color: #fff;
  border-color: #c0392b;
}

.ghrm-btn--warn:hover:not(:disabled) {
  background: #c0392b;
}

.ghrm-actions {
  margin-top: 8px;
}

.ghrm-divider {
  border: none;
  border-top: 1px solid #e9ecef;
  margin: 24px 0;
}

.ghrm-key-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.ghrm-sync-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.ghrm-sync-time {
  color: #6b7280;
  font-size: 13px;
}

.ghrm-hint {
  color: #6b7280;
  font-size: 12px;
  margin: 4px 0 8px;
  line-height: 1.5;
}

.ghrm-hint code {
  background: #f3f4f6;
  padding: 1px 4px;
  border-radius: 3px;
  font-family: monospace;
}

.ghrm-hint--warn {
  color: var(--vbwd-color-warning, #b45309);
}

.ghrm-success {
  color: #059669;
  font-size: 13px;
  margin-top: 4px;
}

.ghrm-error {
  color: #dc2626;
  padding: 12px;
  background: #fef2f2;
  border-radius: 4px;
  border: 1px solid #fecaca;
}

.ghrm-error-inline {
  color: #dc2626;
  font-size: 13px;
  margin-top: 6px;
}

.ghrm-loading {
  color: #6b7280;
  font-size: 13px;
}

.ghrm-preview-panel {
  margin-top: 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 14px;
  background: #f9fafb;
}

.ghrm-preview-header {
  margin-bottom: 10px;
  font-size: 13px;
  color: #374151;
}

.ghrm-preview-pre {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
  line-height: 1.5;
  overflow-x: auto;
  max-height: 320px;
  white-space: pre-wrap;
  word-break: break-word;
}

.ghrm-preview-screenshots {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
}

.ghrm-preview-img {
  max-height: 100px;
  border-radius: 4px;
  border: 1px solid #e9ecef;
  object-fit: contain;
}

.ghrm-preview-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  flex-wrap: wrap;
}
</style>
