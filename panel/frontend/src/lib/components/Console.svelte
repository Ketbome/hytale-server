<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { logs, autoScroll, clearLogs, hasMoreHistory, loadedCount, initialLoadDone, isLoadingMore, addLog } from '$lib/stores/console';
  import { serverStatus } from '$lib/stores/server';
  import { emit } from '$lib/services/socketClient';
  import { tick } from 'svelte';

  // Available commands for autocomplete
  const COMMANDS = [
    '/help',
    '/stop',
    '/auth login device',
    '/auth status',
    '/auth persistence Encrypted',
    '/auth persistence None',
    '/kick',
    '/ban',
    '/unban',
    '/whitelist add',
    '/whitelist remove',
    '/whitelist list',
    '/op',
    '/deop',
    '/say',
    '/tell',
    '/tp',
    '/give',
    '/time set',
    '/weather',
    '/gamemode',
    '/difficulty',
    '/seed',
    '/list',
    '/save-all',
    '/reload'
  ];

  let consoleEl: HTMLDivElement | undefined = $state();
  let inputEl: HTMLInputElement | undefined = $state();
  let cmdInput = $state('');
  let lastCmdTime = 0;
  
  // Autocomplete state
  let showAutocomplete = $state(false);
  let filteredCommands = $state<string[]>([]);
  let selectedIndex = $state(0);

  // Filter commands based on input
  $effect(() => {
    if (cmdInput.startsWith('/') && cmdInput.length > 0) {
      filteredCommands = COMMANDS.filter(cmd => 
        cmd.toLowerCase().startsWith(cmdInput.toLowerCase())
      ).slice(0, 8);
      showAutocomplete = filteredCommands.length > 0 && cmdInput !== filteredCommands[0];
      selectedIndex = 0;
    } else {
      showAutocomplete = false;
      filteredCommands = [];
    }
  });

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
    if (!$serverStatus.running) return;
    const cmd = cmdInput.trim();
    if (!cmd) return;

    if (Date.now() - lastCmdTime < 300) return;
    lastCmdTime = Date.now();

    addLog('> ' + cmd, 'cmd');
    emit('command', cmd);
    cmdInput = '';
    showAutocomplete = false;
  }

  function selectCommand(cmd: string): void {
    cmdInput = cmd;
    showAutocomplete = false;
    inputEl?.focus();
  }

  function handleKeydown(e: KeyboardEvent): void {
    if (!showAutocomplete) {
      if (e.key === 'Enter') {
        sendCommand();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, filteredCommands.length - 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        break;
      case 'Tab':
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          selectCommand(filteredCommands[selectedIndex]);
          if (e.key === 'Enter') {
            // Don't send immediately on Enter from autocomplete selection
          }
        }
        break;
      case 'Escape':
        showAutocomplete = false;
        break;
    }
  }

  function handleInput(): void {
    // Input handling is done via $effect
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

<div class="console-panel">
  <div class="console-header">
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
  <div class="command-bar-wrapper">
    {#if showAutocomplete}
      <div class="autocomplete-dropdown">
        {#each filteredCommands as cmd, i}
          <button
            class="autocomplete-item"
            class:selected={i === selectedIndex}
            onclick={() => selectCommand(cmd)}
            onmouseenter={() => selectedIndex = i}
          >
            {cmd}
          </button>
        {/each}
      </div>
    {/if}
    <div class="command-bar">
      <input
        type="text"
        placeholder={$serverStatus.running ? $_('enterCommand') : $_('offline')}
        autocomplete="off"
        bind:this={inputEl}
        bind:value={cmdInput}
        onkeydown={handleKeydown}
        oninput={handleInput}
        disabled={!$serverStatus.running}
      />
      <button onclick={sendCommand} disabled={!$serverStatus.running}>{$_('send')}</button>
    </div>
  </div>
</div>
