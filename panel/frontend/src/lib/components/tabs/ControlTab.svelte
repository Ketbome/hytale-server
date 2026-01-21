<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { emit } from '$lib/services/socketClient';
  import { serverStatus } from '$lib/stores/server';
  import { activeServer } from '$lib/stores/servers';
  import { addLog } from '$lib/stores/console';

  function handleStart(): void {
    emit('start');
  }

  function handleRestart(): void {
    if (!$serverStatus.running) return;
    if (confirm($_('confirmRestart'))) {
      emit('restart');
    }
  }

  function handleStop(): void {
    if (!$serverStatus.running) return;
    if (confirm($_('confirmStop'))) {
      addLog('> /stop', 'cmd');
      emit('command', '/stop');
    }
  }

  function handleWipe(): void {
    if ($serverStatus.running) return;
    if (confirm($_('confirmWipe'))) {
      if (confirm($_('confirmWipeSure'))) {
        emit('wipe');
      }
    }
  }
</script>

<div class="control-grid">
  <button class="mc-btn primary small" onclick={handleStart} disabled={$serverStatus.running}>{$_('start')}</button>
  <button class="mc-btn small" onclick={handleRestart} disabled={!$serverStatus.running}>{$_('restart')}</button>
</div>
<button class="mc-btn danger small" onclick={handleStop} disabled={!$serverStatus.running}>{$_('stopServer')}</button>
<button class="mc-btn warning small" style="margin-top: 8px;" onclick={handleWipe} disabled={$serverStatus.running}>{$_('wipeData')}</button>

<div class="info-compact">
  <div class="info-row">
    <span class="info-label">{$_('status')}</span>
    <span class="info-value">{$serverStatus.status}</span>
  </div>
  <div class="info-row">
    <span class="info-label">{$_('game')}</span>
    <span class="info-value">{$activeServer?.port || 5520}/UDP</span>
  </div>
  <div class="info-row">
    <span class="info-label">{$_('panel')}</span>
    <span class="info-value">3000/TCP</span>
  </div>
</div>
