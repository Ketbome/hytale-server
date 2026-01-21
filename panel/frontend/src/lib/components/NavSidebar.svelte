<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { activeSection, sidebarCollapsed } from '$lib/stores/ui';
  import { serverStatus } from '$lib/stores/server';
  import { activeServer, leaveServer } from '$lib/stores/servers';
  import type { SectionId } from '$lib/types';

  interface NavItem {
    id: SectionId;
    icon: string;
    label: string;
  }

  const navItems: NavItem[] = [
    { id: 'console', icon: '⌨', label: 'console' },
    { id: 'control', icon: '⚡', label: 'control' },
    { id: 'files', icon: '📁', label: 'files' },
    { id: 'mods', icon: '🧩', label: 'mods' },
    { id: 'config', icon: '⚙', label: 'config' },
    { id: 'setup', icon: '📥', label: 'setup' }
  ];

  function setSection(id: SectionId): void {
    activeSection.set(id);
  }

  function toggleCollapse(): void {
    sidebarCollapsed.update(v => !v);
  }

  function handleBack(): void {
    leaveServer();
  }
</script>

<nav class="nav-sidebar" class:collapsed={$sidebarCollapsed}>
  <div class="nav-header">
    <button class="nav-back" onclick={handleBack} title={$_('dashboard')}>
      ←
    </button>
    {#if !$sidebarCollapsed}
      <div class="nav-server-info">
        <span class="nav-server-name">{$activeServer?.name || 'Server'}</span>
        <span class="nav-server-status" class:online={$serverStatus.running}>
          {$serverStatus.running ? $_('online') : $_('offline')}
        </span>
      </div>
    {/if}
  </div>

  <div class="nav-items">
    {#each navItems as item}
      <button
        class="nav-item"
        class:active={$activeSection === item.id}
        onclick={() => setSection(item.id)}
        title={$_(item.label)}
      >
        <span class="nav-icon">{item.icon}</span>
        {#if !$sidebarCollapsed}
          <span class="nav-label">{$_(item.label)}</span>
        {/if}
      </button>
    {/each}
  </div>

  <div class="nav-footer">
    <button class="nav-collapse-btn" onclick={toggleCollapse} title="Toggle sidebar">
      {$sidebarCollapsed ? '→' : '←'}
    </button>
  </div>
</nav>
