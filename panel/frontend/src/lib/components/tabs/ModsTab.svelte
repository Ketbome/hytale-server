<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { installedMods, searchResults, availableUpdates, currentView, currentPage, hasMore, apiConfigured, isModsLoading, type ModView } from '$lib/stores/mods';
  import { emit } from '$lib/services/socketClient';
  import { showToast } from '$lib/stores/ui';
  import { formatNumber } from '$lib/utils/formatters';
  import type { InstalledMod, ModProject, ModUpdate } from '$lib/types';

  let searchQuery = $state('');
  let classificationFilter = $state('');
  let isCheckingUpdates = $state(false);
  let initialBrowseLoad = $state(true);

  function switchView(view: ModView): void {
    currentView.set(view);
    if (view === 'installed') {
      loadInstalledMods();
    } else if ($searchResults.length === 0 || initialBrowseLoad) {
      searchMods();
    }
  }

  function loadInstalledMods(): void {
    isModsLoading.set(true);
    emit('mods:list');
  }

  function checkConfig(): void {
    emit('mods:check-config');
  }

  function checkForUpdates(): void {
    if (!$apiConfigured) {
      showToast($_('configureApiFirst'), 'error');
      return;
    }
    isCheckingUpdates = true;
    emit('mods:check-updates');
    setTimeout(() => { isCheckingUpdates = false; }, 5000);
  }

  function searchMods(page = 1): void {
    if (!$apiConfigured) {
      showToast($_('configureApiFirst'), 'error');
      return;
    }
    isModsLoading.set(true);
    initialBrowseLoad = false;
    emit('mods:search', {
      query: searchQuery,
      classification: classificationFilter || undefined,
      page,
      pageSize: 20
    });
  }

  function changePage(delta: number): void {
    const newPage = $currentPage + delta;
    if (newPage < 1) return;
    if (delta > 0 && !$hasMore) return;
    searchMods(newPage);
  }

  function installMod(mod: ModProject): void {
    if (!$apiConfigured) {
      showToast($_('configureApiFirst'), 'error');
      return;
    }
    const latestVersion = mod.latestVersion || mod.versions?.[0];
    if (!latestVersion?.id) {
      // Need to fetch project details first
      emit('mods:get', mod.id);
      return;
    }
    emit('mods:install', {
      projectId: mod.id,
      versionId: latestVersion.id,
      metadata: {
        projectTitle: mod.title,
        projectSlug: mod.slug,
        projectIconUrl: mod.iconUrl,
        versionName: latestVersion.version,
        classification: mod.classification,
        fileName: latestVersion.fileName
      }
    });
  }

  function uninstallMod(modId: string): void {
    if (confirm($_('confirmUninstall'))) {
      emit('mods:uninstall', modId);
    }
  }

  function toggleMod(mod: InstalledMod): void {
    if (mod.enabled) {
      emit('mods:disable', mod.id);
    } else {
      emit('mods:enable', mod.id);
    }
  }

  function updateMod(mod: InstalledMod, updateInfo: ModUpdate): void {
    emit('mods:update', {
      modId: mod.id,
      versionId: updateInfo.latestVersionId,
      metadata: {
        versionName: updateInfo.latestVersion,
        fileName: updateInfo.latestFileName
      }
    });
  }

  function isModInstalled(projectId: string): boolean {
    return $installedMods.some(m => m.projectId === projectId);
  }

  function getUpdateInfo(modId: string): ModUpdate | undefined {
    return $availableUpdates.find(u => u.modId === modId);
  }

  function getModtaleUrl(mod: InstalledMod): string | null {
    if (mod.projectId && mod.projectSlug) {
      return `https://modtale.net/mod/${mod.projectSlug}-${mod.projectId}`;
    }
    return null;
  }
</script>

<div class="mods-view-toggle">
  <span class="mods-api-dot" class:ok={$apiConfigured} title="Modtale API"></span>
  <button class="mc-btn small" class:active={$currentView === 'installed'} onclick={() => switchView('installed')}>
    {$_('local')}
  </button>
  <button class="mc-btn small" class:active={$currentView === 'browse'} onclick={() => switchView('browse')}>
    {$_('browse')}
  </button>
  <button class="mc-btn small" onclick={checkForUpdates} disabled={isCheckingUpdates}>
    ⟳ {$_('checkUpdates')}
  </button>
</div>

{#if $currentView === 'browse'}
  <div class="mods-search">
    <input
      type="text"
      class="mods-search-input"
      placeholder={$_('searchForMods')}
      bind:value={searchQuery}
      onkeypress={(e: KeyboardEvent) => e.key === 'Enter' && searchMods()}
    />
    <select class="mods-filter-select" bind:value={classificationFilter} onchange={() => searchMods()}>
      <option value="">{$_('allTypes')}</option>
      <option value="PLUGIN">{$_('typePlugin')}</option>
      <option value="DATA">{$_('typeData')}</option>
      <option value="ART">{$_('typeArt')}</option>
      <option value="SAVE">{$_('typeSave')}</option>
      <option value="MODPACK">{$_('typeModpack')}</option>
    </select>
    <button class="mc-btn small" onclick={() => searchMods()}>{$_('search')}</button>
  </div>
{/if}

{#if $currentView === 'installed'}
  <div class="mods-list">
    {#if $isModsLoading}
      <div class="mods-empty mods-loader">{$_('loading')}</div>
    {:else if $installedMods.length === 0}
      <div class="mods-empty">{$_('noModsInstalled')}</div>
    {:else}
      {#each $installedMods as mod}
        {@const updateInfo = getUpdateInfo(mod.id)}
        {@const modtaleUrl = getModtaleUrl(mod)}
        <div class="mod-card" class:has-update={updateInfo}>
          <div class="mod-icon">
            {#if mod.projectIconUrl}
              <img src={mod.projectIconUrl} alt="" onerror={(e: Event) => (e.target as HTMLImageElement).style.display='none'} />
            {:else}
              ?
            {/if}
          </div>
          <div class="mod-info">
            <div class="mod-title">
              {#if modtaleUrl}
                <a href={modtaleUrl} target="_blank" class="mod-link">{mod.projectTitle}</a>
              {:else}
                {mod.projectTitle}
              {/if}
              <span class="mod-classification {mod.classification}">{mod.classification}</span>
              {#if updateInfo}
                <span class="mod-update-badge">{$_('updateAvailable')}</span>
              {/if}
            </div>
            <div class="mod-meta">
              <span>v{mod.versionName}</span>
              {#if updateInfo}
                <span class="update-version">→ v{updateInfo.latestVersion}</span>
              {/if}
              <span style="color: var(--{mod.enabled ? 'success' : 'error'})">{mod.enabled ? 'Enabled' : 'Disabled'}</span>
              {#if mod.isLocal}
                <span class="mod-local-badge">Local</span>
              {/if}
            </div>
          </div>
          <div class="mod-actions">
            {#if updateInfo}
              <button class="mod-btn update" onclick={() => updateMod(mod, updateInfo)}>{$_('update')}</button>
            {/if}
            <div class="mod-toggle" class:enabled={mod.enabled} role="button" tabindex="0" onclick={() => toggleMod(mod)} onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && toggleMod(mod)} title={mod.enabled ? $_('disable') : $_('enable')}></div>
            <button class="mod-btn danger" onclick={() => uninstallMod(mod.id)}>{$_('remove')}</button>
          </div>
        </div>
      {/each}
    {/if}
  </div>
{:else}
  <div class="mods-list">
    {#if $isModsLoading}
      <div class="mods-empty mods-loader">{$_('loading')}</div>
    {:else if $searchResults.length === 0}
      <div class="mods-empty">{$_('noModsFound')}</div>
    {:else}
      {#each $searchResults as mod}
        {@const alreadyInstalled = isModInstalled(mod.id)}
        {@const latestVersion = mod.latestVersion || mod.versions?.[0]}
        <div class="mod-card">
          <div class="mod-icon">
            {#if mod.iconUrl}
              <img src={mod.iconUrl} alt="" onerror={(e: Event) => (e.target as HTMLImageElement).style.display='none'} />
            {:else}
              ?
            {/if}
          </div>
          <div class="mod-info">
            <div class="mod-title">
              <a href="https://modtale.net/mod/{mod.slug}-{mod.id}" target="_blank" class="mod-link">{mod.title}</a>
              <span class="mod-classification {mod.classification}">{mod.classification}</span>
            </div>
            <div class="mod-meta">
              <span>{mod.author}</span>
              {#if mod.downloads}
                <span>{formatNumber(mod.downloads)} downloads</span>
              {/if}
              {#if latestVersion?.version}
                <span>v{latestVersion.version}</span>
              {/if}
            </div>
            {#if mod.shortDescription}
              <div class="mod-description">{mod.shortDescription}</div>
            {/if}
          </div>
          <div class="mod-actions">
            <button class="mod-btn install" onclick={() => installMod(mod)} disabled={alreadyInstalled}>
              {alreadyInstalled ? $_('installed') : $_('install')}
            </button>
          </div>
        </div>
      {/each}
    {/if}
  </div>

  {#if $searchResults.length > 0}
    <div class="mods-pagination">
      <button class="mc-btn small" onclick={() => changePage(-1)} disabled={$currentPage <= 1}>
        &lt; {$_('prev')}
      </button>
      <span class="mods-page-info">{$_('page')} {$currentPage}</span>
      <button class="mc-btn small" onclick={() => changePage(1)} disabled={!$hasMore}>
        {$_('next')} &gt;
      </button>
    </div>
  {/if}
{/if}
