<script lang="ts">
  import { _ } from 'svelte-i18n';

  interface Props {
    running: boolean;
  }

  let { running }: Props = $props();
</script>

<div class="status-badge">
  <div class="status-dot" class:online={running}></div>
  <span class="status-text">{running ? $_('online') : $_('offline')}</span>
</div>
