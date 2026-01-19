<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { isAuthenticated, checkStatus, isLoading } from '$lib/stores/auth';
  import { sidebarHidden, panelExpanded } from '$lib/stores/ui';
  import { connectSocket, disconnectSocket } from '$lib/services/socketClient';
  import LoginScreen from '$lib/components/LoginScreen.svelte';
  import Header from '$lib/components/Header.svelte';
  import Console from '$lib/components/Console.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
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

  function showSidebar(): void {
    sidebarHidden.set(false);
  }

  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      if ($panelExpanded) {
        panelExpanded.set(false);
      }
      if ($sidebarHidden) {
        sidebarHidden.set(false);
      }
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if $isLoading}
  <div class="loading-screen">
    <div class="loading-spinner"></div>
  </div>
{:else if !$isAuthenticated}
  <LoginScreen />
{:else}
  <div class="container" class:sidebar-hidden={$sidebarHidden} class:panel-expanded={$panelExpanded}>
    <Header />
    <div class="grid">
      <div class="main">
        <Console />
        <button class="btn-show-sidebar" title="Show Panel" onclick={showSidebar}>☰</button>
      </div>
      <Sidebar />
    </div>
  </div>
{/if}

<Toast />
