<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { emit } from '$lib/services/socketClient';
  import { addLog } from '$lib/stores/console';

  let lastCmdTime = 0;

  interface Command {
    label: string;
    cmd: string;
  }

  function sendCommand(cmd: string): void {
    if (Date.now() - lastCmdTime < 300) return;
    lastCmdTime = Date.now();
    addLog('> ' + cmd, 'cmd');
    emit('command', cmd);
  }

  const authCommands: Command[] = [
    { label: 'login', cmd: '/auth login device' },
    { label: 'status', cmd: '/auth status' },
    { label: 'saveCreds', cmd: '/auth persistence Encrypted' }
  ];

  const serverCommands: Command[] = [
    { label: 'allCommands', cmd: '/help' },
    { label: 'stop', cmd: '/stop' }
  ];
</script>

<div class="cmd-section">
  <div class="cmd-label">{$_('auth')}</div>
  {#each authCommands as item}
    <button class="quick-btn" onclick={() => sendCommand(item.cmd)}>
      <span>{$_(item.label)}</span>
      <span class="cmd">{item.cmd}</span>
    </button>
  {/each}
</div>

<div class="cmd-section">
  <div class="cmd-label">{$_('server')}</div>
  {#each serverCommands as item}
    <button class="quick-btn" onclick={() => sendCommand(item.cmd)}>
      <span>{$_(item.label)}</span>
      <span class="cmd">{item.cmd}</span>
    </button>
  {/each}
</div>
