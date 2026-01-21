<script lang="ts">
  import { _ } from 'svelte-i18n';
  import type { Server } from '$lib/stores/servers';

  let { 
    server, 
    onEnter, 
    onStart,
    onStop,
    onDelete 
  }: { 
    server: Server; 
    onEnter: () => void;
    onStart: () => void;
    onStop: () => void;
    onDelete: () => void;
  } = $props();

  let isRunning = $derived(server.status === 'running');
</script>

<article class="server-card" class:running={isRunning}>
  <div class="card-status-bar" class:online={isRunning}></div>
  
  <div class="card-header">
    <div class="card-icon">
      <img src="/images/favicon.ico" alt="Server" />
    </div>
    <div class="card-info">
      <h3 class="card-name">{server.name}</h3>
      <div class="card-meta">
        <span class="meta-port">:{server.port}/UDP</span>
        <span class="meta-divider">•</span>
        <span class="meta-container">{server.containerName}</span>
      </div>
    </div>
    <div class="card-badge" class:online={isRunning}>
      <span class="badge-dot"></span>
      <span class="badge-text">{isRunning ? $_('online') : $_('offline')}</span>
    </div>
  </div>

  <div class="card-stats">
    <div class="stat-item">
      <span class="stat-icon">💾</span>
      <div class="stat-content">
        <span class="stat-label">RAM</span>
        <span class="stat-value">{server.config.javaXms} - {server.config.javaXmx}</span>
      </div>
    </div>
    <div class="stat-item">
      <span class="stat-icon">⚡</span>
      <div class="stat-content">
        <span class="stat-label">G1GC</span>
        <span class="stat-value" class:enabled={server.config.useG1gc}>{server.config.useG1gc ? 'ON' : 'OFF'}</span>
      </div>
    </div>
  </div>

  <div class="card-actions">
    <button class="action-btn primary" onclick={onEnter}>
      <span class="action-icon">→</span>
      {$_('enter')}
    </button>
    <div class="action-group">
      {#if isRunning}
        <button class="action-btn warning" onclick={onStop} title={$_('stop')}>
          ■
        </button>
      {:else}
        <button class="action-btn success" onclick={onStart} title={$_('start')}>
          ▶
        </button>
      {/if}
      <button class="action-btn danger" onclick={onDelete} title={$_('delete')}>
        ✕
      </button>
    </div>
  </div>
</article>
