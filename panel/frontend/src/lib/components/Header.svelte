<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { locale } from '$lib/i18n';
  import { serverStatus } from '$lib/stores/server';
  import { logout } from '$lib/stores/auth';
  import { disconnectSocket } from '$lib/services/socketClient';
  import { formatUptime } from '$lib/utils/formatters';
  import StatusBadge from './ui/StatusBadge.svelte';
  import { onMount, onDestroy } from 'svelte';

  let clockTime = $state('--:--:--');
  let uptime = $state('00:00:00');
  let clockTimer: ReturnType<typeof setInterval> | undefined;
  let uptimeTimer: ReturnType<typeof setInterval> | undefined;

  function updateClock(): void {
    const now = new Date();
    clockTime = [
      now.getHours(),
      now.getMinutes(),
      now.getSeconds()
    ].map(n => String(n).padStart(2, '0')).join(':');
  }

  function updateUptime(): void {
    uptime = formatUptime($serverStatus.startedAt);
  }

  onMount(() => {
    updateClock();
    clockTimer = setInterval(updateClock, 1000);
    uptimeTimer = setInterval(updateUptime, 1000);
  });

  onDestroy(() => {
    if (clockTimer) clearInterval(clockTimer);
    if (uptimeTimer) clearInterval(uptimeTimer);
  });

  function handleLogout(): void {
    disconnectSocket();
    logout();
  }

  function handleLangChange(e: Event): void {
    const target = e.target as HTMLSelectElement;
    locale.set(target.value);
  }
</script>

<header>
  <div class="logo">
    <div class="logo-block">H</div>
    <div>
      <h1>HYTALE</h1>
      <div class="logo-subtitle">{$_('serverPanel')}</div>
    </div>
  </div>
  <div class="header-right">
    <div class="lang-selector">
      <select class="lang-dropdown" value={$locale} onchange={handleLangChange}>
        <option value="en">English</option>
        <option value="es">Español</option>
        <option value="uk">Українська</option>
      </select>
    </div>
    <div class="server-clock" title={$_('serverTime')}>
      <span class="clock-label">🕐</span>
      <span class="clock-time">{clockTime}</span>
    </div>
    <span class="uptime-display">{uptime}</span>
    <StatusBadge running={$serverStatus.running} />
    <button class="logout-btn" onclick={handleLogout}>{$_('logout')}</button>
  </div>
</header>
