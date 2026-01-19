<script lang="ts">
  import { login, authError, isUsingDefaults, checkDefaults } from '$lib/stores/auth';
  import { onMount } from 'svelte';

  let username = $state('');
  let password = $state('');
  let isLoggingIn = $state(false);

  onMount(() => {
    checkDefaults();
  });

  async function handleSubmit(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    isLoggingIn = true;
    await login(username, password);
    isLoggingIn = false;
  }
</script>

<div class="login-screen">
  <div class="login-box">
    <div class="login-header">
      <div class="login-logo">
        <div class="login-logo-block">H</div>
        <div class="login-title">HYTALE</div>
      </div>
      <div class="login-subtitle">Server Panel</div>
    </div>
    <form class="login-form" onsubmit={handleSubmit}>
      {#if $isUsingDefaults}
        <div class="login-warning visible">
          ⚠️ Using default credentials! Set PANEL_USER and PANEL_PASS.
        </div>
      {/if}
      {#if $authError}
        <div class="login-error visible">{$authError}</div>
      {/if}
      <div class="login-field">
        <label class="login-label" for="username">Username</label>
        <input
          id="username"
          type="text"
          class="login-input"
          placeholder="admin"
          autocomplete="username"
          bind:value={username}
        />
      </div>
      <div class="login-field">
        <label class="login-label" for="password">Password</label>
        <input
          id="password"
          type="password"
          class="login-input"
          placeholder="********"
          autocomplete="current-password"
          bind:value={password}
        />
      </div>
      <button type="submit" class="login-btn" disabled={isLoggingIn}>
        {isLoggingIn ? '...' : 'LOGIN'}
      </button>
    </form>
  </div>
</div>
