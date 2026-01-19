<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { logs, autoScroll, clearLogs, hasMoreHistory, loadedCount, initialLoadDone, isLoadingMore, addLog } from '$lib/stores/console';
  import { emit } from '$lib/services/socketClient';
  import { tick } from 'svelte';

  let consoleEl: HTMLDivElement | undefined = $state();
  let cmdInput = $state('');
  let lastCmdTime = 0;

  function handleScroll(): void {
    if (!consoleEl) return;

    const nearTop = consoleEl.scrollTop < 100;
    const canScroll = consoleEl.scrollHeight > consoleEl.clientHeight;
    const nearBottom = consoleEl.scrollHeight - consoleEl.scrollTop - consoleEl.clientHeight < 50;

    autoScroll.set(nearBottom);

    if (nearTop && canScroll && $initialLoadDone && !$isLoadingMore && $hasMoreHistory && $loadedCount > 0) {
      isLoadingMore.set(true);
      emit('logs:more', {
        currentCount: $loadedCount,
        batchSize: 200
      });
    }
  }

  function handleClear(): void {
    clearLogs();
  }

  function sendCommand(): void {
    const cmd = cmdInput.trim();
    if (!cmd) return;

    if (Date.now() - lastCmdTime < 300) return;
    lastCmdTime = Date.now();

    addLog('> ' + cmd, 'cmd');
    emit('command', cmd);
    cmdInput = '';
  }

  function handleKeypress(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      sendCommand();
    }
  }

  $effect(() => {
    // Track logs changes
    $logs;
    // Scroll to bottom after DOM update
    tick().then(() => {
      if ($autoScroll && consoleEl) {
        consoleEl.scrollTop = consoleEl.scrollHeight;
      }
    });
  });
</script>

<div class="card">
  <div class="card-header">
    <span>{$_('console')}</span>
    <button class="console-clear-btn" title={$_('clearConsole')} onclick={handleClear}>✕</button>
  </div>
  <div class="console" bind:this={consoleEl} onscroll={handleScroll}>
    {#each $logs as log}
      <div class="log-line {log.type}">
        <span class="log-time">{log.timestamp} </span>{log.text}
      </div>
    {/each}
  </div>
  <div class="command-bar">
    <input
      type="text"
      placeholder={$_('enterCommand')}
      autocomplete="off"
      bind:value={cmdInput}
      onkeypress={handleKeypress}
    />
    <button onclick={sendCommand}>{$_('send')}</button>
  </div>
</div>
