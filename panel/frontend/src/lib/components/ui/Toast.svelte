<script lang="ts">
  import { toasts } from '$lib/stores/ui';
</script>

{#each $toasts as toast (toast.id)}
  <div class="toast {toast.type}">
    {toast.message}
  </div>
{/each}
