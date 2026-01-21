<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { activeSection, sidebarCollapsed } from '$lib/stores/ui';
  import { serverStatus } from '$lib/stores/server';
  import { activeServer } from '$lib/stores/servers';
  import NavSidebar from './NavSidebar.svelte';
  import Console from './Console.svelte';
  import SetupTab from './tabs/SetupTab.svelte';
  import FilesTab from './tabs/FilesTab.svelte';
  import ModsTab from './tabs/ModsTab.svelte';
  import ControlTab from './tabs/ControlTab.svelte';
  import ConfigTab from './tabs/ConfigTab.svelte';
</script>

<div class="server-view" class:sidebar-collapsed={$sidebarCollapsed}>
  <NavSidebar />
  
  <div class="server-content">
    <header class="server-header">
      <div class="header-info">
        <h1 class="header-title">{$activeServer?.name || 'Server'}</h1>
        <div class="header-meta">
          <span class="header-port">:{$activeServer?.port || 5520}/UDP</span>
          <span class="header-container">{$activeServer?.containerName}</span>
        </div>
      </div>
      <div class="header-status">
        <span class="status-indicator" class:online={$serverStatus.running}></span>
        <span class="status-label">{$serverStatus.running ? $_('online') : $_('offline')}</span>
      </div>
    </header>

    <main class="server-main">
      {#if $activeSection === 'console'}
        <Console />
      {:else if $activeSection === 'control'}
        <div class="section-panel">
          <div class="section-header">{$_('control')}</div>
          <div class="section-content">
            <ControlTab />
          </div>
        </div>
      {:else if $activeSection === 'files'}
        <div class="section-panel">
          <div class="section-header">{$_('files')}</div>
          <div class="section-content">
            <FilesTab />
          </div>
        </div>
      {:else if $activeSection === 'mods'}
        <div class="section-panel">
          <div class="section-header">{$_('mods')}</div>
          <div class="section-content">
            <ModsTab />
          </div>
        </div>
      {:else if $activeSection === 'config'}
        <div class="section-panel">
          <div class="section-header">{$_('config')}</div>
          <div class="section-content">
            <ConfigTab />
          </div>
        </div>
      {:else if $activeSection === 'setup'}
        <div class="section-panel">
          <div class="section-header">{$_('setup')}</div>
          <div class="section-content">
            <SetupTab />
          </div>
        </div>
      {/if}
    </main>
  </div>
</div>
