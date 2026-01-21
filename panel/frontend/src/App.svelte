<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { isAuthenticated, checkStatus, isLoading } from '$lib/stores/auth';
  import { activeServerId } from '$lib/stores/servers';
  import { connectSocket, disconnectSocket } from '$lib/services/socketClient';
  import LoginScreen from '$lib/components/LoginScreen.svelte';
  import Dashboard from '$lib/components/Dashboard.svelte';
  import ServerView from '$lib/components/ServerView.svelte';
  import Toast from '$lib/components/ui/Toast.svelte';

  onMount(async () => {
    const authenticated = await checkStatus();
    isLoading.set(false);
    if (authenticated) {
      connectSocket();
    }
  });

  onDestroy(() => {
    disconnectSocket();
  });

  // Connect after login (when user logs in after page load)
  let prevAuth = false;
  isAuthenticated.subscribe(authenticated => {
    if (authenticated && !prevAuth) {
      connectSocket();
    }
    prevAuth = authenticated;
  });
</script>

{#if $isLoading}
  <div class="loading-screen">
    <div class="loading-spinner"></div>
  </div>
{:else if !$isAuthenticated}
  <LoginScreen />
{:else if !$activeServerId}
  <Dashboard />
{:else}
  <ServerView />
{/if}

<Toast />
