<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { filesReady, downloaderAuth, downloadProgress } from '$lib/stores/server';
  import { emit } from '$lib/services/socketClient';
  import type { DownloadStep } from '$lib/types';

  function handleDownload(): void {
    downloadProgress.update(p => ({ ...p, authUrl: null, authCode: null }));
    emit('download');
  }

  function getStepState(step: DownloadStep, currentStep: DownloadStep): 'active' | 'done' | '' {
    const steps: DownloadStep[] = ['auth', 'download', 'extract', 'complete'];
    const stepIndex = steps.indexOf(step);
    const currentIndex = steps.indexOf(currentStep);

    if (stepIndex === currentIndex) return 'active';
    if (stepIndex < currentIndex) return 'done';
    return '';
  }

  let stepStates = $derived({
    auth: getStepState('auth', $downloadProgress.step),
    download: getStepState('download', $downloadProgress.step),
    extract: getStepState('extract', $downloadProgress.step),
    complete: $downloadProgress.step === 'complete' ? 'done' : ''
  });
</script>

<div class="file-status" class:ready={$filesReady.ready} class:missing={!$filesReady.ready}>
  <span>{$filesReady.ready ? '✓' : '⚠'}</span>
  <span>{$filesReady.ready ? $_('filesReady') : $_('missingFiles')}</span>
</div>

<div class="file-checks">
  <div class="file-check">
    <span class="icon" class:ok={$filesReady.hasJar} class:missing={!$filesReady.hasJar}>
      {$filesReady.hasJar ? '✓' : '✗'}
    </span>
    <span>Server.jar</span>
  </div>
  <div class="file-check">
    <span class="icon" class:ok={$filesReady.hasAssets} class:missing={!$filesReady.hasAssets}>
      {$filesReady.hasAssets ? '✓' : '✗'}
    </span>
    <span>Assets.zip</span>
  </div>
</div>

<div class="auth-status" class:ok={$downloaderAuth} class:missing={!$downloaderAuth}>
  {$downloaderAuth ? $_('credentialsSaved') : $_('noCredentials')}
</div>

{#if $downloadProgress.authUrl || $downloadProgress.authCode}
  <div class="auth-box visible">
    <h3>{$_('authRequired')}</h3>
    {#if $downloadProgress.authUrl}
      <p>{$_('openLink')}</p>
      <a href={$downloadProgress.authUrl} target="_blank">{$downloadProgress.authUrl}</a>
    {/if}
    {#if $downloadProgress.authCode}
      <p style="margin-top: 8px">{$_('code')}</p>
      <div class="auth-code">{$downloadProgress.authCode}</div>
    {/if}
  </div>
{/if}

{#if $downloadProgress.active || $downloadProgress.percentage > 0}
  <div class="progress-section visible">
    <div class="progress-header">
      <span class="progress-status">{$downloadProgress.status}</span>
      <span class="progress-time">{$downloadProgress.time}</span>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" style="width: {$downloadProgress.percentage}%"></div>
    </div>
    <div class="progress-steps">
      <div class="progress-step {stepStates.auth}">
        <span>{stepStates.auth === 'done' ? '✓' : stepStates.auth === 'active' ? '●' : '○'}</span>
        <span>{$_('auth')}</span>
      </div>
      <div class="progress-step {stepStates.download}">
        <span>{stepStates.download === 'done' ? '✓' : stepStates.download === 'active' ? '●' : '○'}</span>
        <span>{$_('download')}</span>
      </div>
      <div class="progress-step {stepStates.extract}">
        <span>{stepStates.extract === 'done' ? '✓' : stepStates.extract === 'active' ? '●' : '○'}</span>
        <span>{$_('extract')}</span>
      </div>
      <div class="progress-step {stepStates.complete}">
        <span>{stepStates.complete === 'done' ? '✓' : stepStates.complete === 'active' ? '●' : '○'}</span>
        <span>{$_('done')}</span>
      </div>
    </div>
  </div>
{/if}

<button
  class="mc-btn primary"
  onclick={handleDownload}
  disabled={$downloadProgress.active && $downloadProgress.status !== 'waitingAuth'}
>
  {#if $downloadProgress.active}
    <span class="spinner"></span> {$downloadProgress.status}
  {:else}
    {$filesReady.ready ? $_('redownload') : $_('downloadFiles')}
  {/if}
</button>
<p class="hint">{$_('downloadHint')}</p>
