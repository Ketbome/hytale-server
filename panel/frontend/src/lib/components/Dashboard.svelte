<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { servers, serversLoading, type Server } from '$lib/stores/servers';
  import { fetchServers, deleteServer as apiDeleteServer, startServer, stopServer } from '$lib/services/api';
  import { joinServer } from '$lib/services/socketClient';
  import { showToast } from '$lib/stores/ui';
  import ServerCard from './ServerCard.svelte';
  import CreateServerModal from './CreateServerModal.svelte';

  let showCreateModal = $state(false);

  async function loadServers(): Promise<void> {
    serversLoading.set(true);
    const result = await fetchServers();
    serversLoading.set(false);
    
    if (result.success && result.servers) {
      servers.set(result.servers);
    } else {
      showToast(result.error || 'Failed to load servers', 'error');
    }
  }

  function handleEnterServer(server: Server): void {
    joinServer(server.id);
  }

  async function handleStartServer(server: Server): Promise<void> {
    const result = await startServer(server.id);
    if (result.success) {
      showToast($_('started'));
      await loadServers();
    } else {
      showToast(result.error || 'Failed to start', 'error');
    }
  }

  async function handleStopServer(server: Server): Promise<void> {
    const result = await stopServer(server.id);
    if (result.success) {
      showToast($_('stopped'));
      await loadServers();
    } else {
      showToast(result.error || 'Failed to stop', 'error');
    }
  }

  async function handleDeleteServer(server: Server): Promise<void> {
    if (!confirm($_('confirmDeleteServer'))) return;
    
    const result = await apiDeleteServer(server.id);
    if (result.success) {
      showToast($_('serverDeleted'));
      await loadServers();
    } else {
      showToast(result.error || 'Failed to delete', 'error');
    }
  }

  function handleServerCreated(): void {
    showCreateModal = false;
    loadServers();
  }

  $effect(() => {
    loadServers();
  });
</script>

<div class="dashboard">
  <header class="dashboard-header">
    <div class="dashboard-brand">
      <img src="/images/logo.png" alt="HytalePanel" class="brand-logo" />
      <div class="brand-text">
        <h1 class="brand-title">HYTALEPANEL</h1>
        <span class="brand-subtitle">{$_('serverPanel')}</span>
      </div>
    </div>
    <nav class="dashboard-nav">
      <a href="https://hytalepanel.ketbome.com/" target="_blank" class="nav-link" title={$_('documentation')}>
        <span class="nav-link-icon">📚</span>
        <span class="nav-link-text">{$_('docs')}</span>
      </a>
      <a href="https://github.com/ketbome/hytalepanel/issues" target="_blank" class="nav-link" title={$_('reportIssue')}>
        <span class="nav-link-icon">🐛</span>
        <span class="nav-link-text">{$_('issues')}</span>
      </a>
    </nav>
  </header>

  <main class="dashboard-main">
    {#if $serversLoading}
      <div class="dashboard-loading">
        <div class="loading-spinner"></div>
        <p class="loading-text">{$_('loading')}</p>
      </div>
    {:else if $servers.length === 0}
      <div class="dashboard-empty-state">
        <div class="empty-icon-wrapper">
          <img src="/images/hytale.png" alt="Hytale" class="empty-icon" />
        </div>
        <h2 class="empty-title">{$_('noServers')}</h2>
        <p class="empty-description">{$_('createServerHint')}</p>
        <button class="mc-btn primary create-btn" onclick={() => showCreateModal = true}>
          <span class="btn-icon">+</span>
          {$_('createServer')}
        </button>
      </div>
    {:else}
      <div class="servers-section">
        <div class="servers-header">
          <h2 class="servers-title">{$_('dashboard')}</h2>
          <span class="servers-count">{$servers.length} server{$servers.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="servers-grid">
          {#each $servers as server (server.id)}
            <ServerCard
              {server}
              onEnter={() => handleEnterServer(server)}
              onStart={() => handleStartServer(server)}
              onStop={() => handleStopServer(server)}
              onDelete={() => handleDeleteServer(server)}
            />
          {/each}
        </div>
      </div>
      
      <button class="fab-create" onclick={() => showCreateModal = true} title={$_('createServer')}>
        <span class="fab-icon">+</span>
      </button>
    {/if}
  </main>
</div>

{#if showCreateModal}
  <CreateServerModal
    onClose={() => showCreateModal = false}
    onCreated={handleServerCreated}
  />
{/if}
