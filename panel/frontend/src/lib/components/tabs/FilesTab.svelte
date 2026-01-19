<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { currentPath, fileList, editorState, openEditor, closeEditor, uploadState, FILE_ICONS, setEditorStatus } from '$lib/stores/files';
  import { emit } from '$lib/services/socketClient';
  import { uploadFile } from '$lib/services/api';
  import { showToast } from '$lib/stores/ui';
  import { formatSize } from '$lib/utils/formatters';
  import type { FileEntry } from '$lib/types';

  let fileInput: HTMLInputElement | undefined = $state();
  let editorContent = $state('');
  let createBackup = $state(true);

  interface BreadcrumbPart {
    path: string;
    label: string;
  }

  function getBreadcrumbParts(path: string): BreadcrumbPart[] {
    const parts = path.split('/').filter(p => p);
    let accumulated = '';
    const result: BreadcrumbPart[] = [{ path: '/', label: '/opt/hytale' }];
    for (const part of parts) {
      accumulated += '/' + part;
      result.push({ path: accumulated, label: part });
    }
    return result;
  }

  let breadcrumbParts = $derived(getBreadcrumbParts($currentPath));

  $effect(() => {
    editorContent = $editorState.content;
  });

  function navigateTo(path: string): void {
    emit('files:list', path);
  }

  function goBack(): void {
    const parts = $currentPath.split('/').filter(p => p);
    parts.pop();
    navigateTo(parts.length ? '/' + parts.join('/') : '/');
  }

  function handleFileClick(file: FileEntry): void {
    if (file.isDirectory) {
      const newPath = $currentPath === '/' ? '/' + file.name : $currentPath + '/' + file.name;
      navigateTo(newPath);
    }
  }

  function handleFileDoubleClick(file: FileEntry): void {
    if (!file.isDirectory) {
      const filePath = $currentPath === '/' ? '/' + file.name : $currentPath + '/' + file.name;
      openEditor(filePath);
      emit('files:read', filePath);
    }
  }

  function handleEdit(file: FileEntry): void {
    const filePath = $currentPath === '/' ? '/' + file.name : $currentPath + '/' + file.name;
    openEditor(filePath);
    emit('files:read', filePath);
  }

  function handleDelete(file: FileEntry): void {
    if (confirm($_('confirmDelete') + ` "${file.name}"?`)) {
      const filePath = $currentPath === '/' ? '/' + file.name : $currentPath + '/' + file.name;
      emit('files:delete', filePath);
    }
  }

  function handleNewFolder(): void {
    const name = prompt($_('folderName'));
    if (name) {
      const folderPath = $currentPath === '/' ? '/' + name : $currentPath + '/' + name;
      emit('files:mkdir', folderPath);
    }
  }

  function toggleUploadZone(): void {
    uploadState.update(s => ({ ...s, isVisible: !s.isVisible }));
  }

  function handleDragOver(e: DragEvent): void {
    e.preventDefault();
  }

  function handleDrop(e: DragEvent): void {
    e.preventDefault();
    if (e.dataTransfer?.files) {
      handleUploadFiles(e.dataTransfer.files);
    }
  }

  function handleFileSelect(e: Event): void {
    const target = e.target as HTMLInputElement;
    if (target.files) {
      handleUploadFiles(target.files);
      target.value = '';
    }
  }

  async function handleUploadFiles(files: FileList): Promise<void> {
    uploadState.set({ isVisible: true, isUploading: true, progress: 10, text: $_('uploading') + '...' });

    for (const file of files) {
      uploadState.update(s => ({ ...s, text: $_('uploading') + ` ${file.name}...` }));
      try {
        const result = await uploadFile(file, $currentPath);
        if (result.success) {
          uploadState.update(s => ({ ...s, progress: 100 }));
          showToast($_('uploaded') + `: ${file.name}`);
        } else {
          showToast($_('uploadFailed') + `: ${result.error}`, 'error');
        }
      } catch (e) {
        const error = e as Error;
        showToast($_('uploadError') + `: ${error.message}`, 'error');
      }
    }

    setTimeout(() => {
      uploadState.set({ isVisible: false, isUploading: false, progress: 0, text: '' });
      navigateTo($currentPath);
    }, 500);
  }

  function handleSaveFile(): void {
    if (!$editorState.filePath) return;
    setEditorStatus($_('saving'), 'saving');
    emit('files:save', {
      path: $editorState.filePath,
      content: editorContent,
      createBackup
    });
  }

  function handleCloseEditor(): void {
    closeEditor();
  }

  function handleEditorKeydown(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSaveFile();
    }
    if (e.key === 'Escape') {
      handleCloseEditor();
    }
  }

  function isEditable(file: FileEntry): boolean {
    return file.editable;
  }

</script>

<div class="file-breadcrumb">
  {#each breadcrumbParts as part}
    <button type="button" class="breadcrumb-item" onclick={() => navigateTo(part.path)}>{part.label}</button>
  {/each}
</div>

<div class="file-toolbar">
  <button class="mc-btn small" title={$_('refresh')} onclick={() => navigateTo($currentPath)}>↻</button>
  <button class="mc-btn small" onclick={handleNewFolder}>{$_('newFolder')}</button>
  <button class="mc-btn small" onclick={toggleUploadZone}>{$_('upload')}</button>
</div>

{#if $uploadState.isVisible}
  <div class="upload-zone visible" role="button" tabindex="0" ondragover={handleDragOver} ondrop={handleDrop} onclick={() => fileInput?.click()} onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && fileInput?.click()}>
    <div class="upload-content">
      <div class="upload-icon">⬆</div>
      <div class="upload-text">{$_('dropFilesHere')}</div>
      <div class="upload-hint">{$_('uploadHint')}</div>
      <input type="file" bind:this={fileInput} style="display:none" multiple onchange={handleFileSelect} />
    </div>
    {#if $uploadState.isUploading}
      <div class="upload-progress visible">
        <div class="upload-progress-bar">
          <div class="upload-progress-fill" style="width: {$uploadState.progress}%"></div>
        </div>
        <div class="upload-progress-text">{$uploadState.text}</div>
      </div>
    {/if}
  </div>
{/if}

<div class="file-list">
  <div class="file-list-header">
    <span class="file-col-name">{$_('name')}</span>
    <span class="file-col-size">{$_('size')}</span>
    <span class="file-col-actions"></span>
  </div>
  <div class="file-list-body">
    {#if $currentPath !== '/'}
      <div class="file-item file-item-back" role="button" tabindex="0" onclick={goBack} onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && goBack()}>
        <div class="file-name">
          <span class="file-icon folder">..</span>
          <span>{$_('back')}</span>
        </div>
        <span class="file-size">-</span>
        <div class="file-actions"></div>
      </div>
    {/if}

    {#if $fileList.length === 0 && $currentPath === '/'}
      <div class="file-empty">{$_('emptyDir')}</div>
    {:else}
      {#each $fileList as file}
        <div
          class="file-item"
          role="button"
          tabindex="0"
          onclick={() => handleFileClick(file)}
          ondblclick={() => handleFileDoubleClick(file)}
          onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && handleFileDoubleClick(file)}
        >
          <div class="file-name">
            <span class="file-icon {file.icon}">{FILE_ICONS[file.icon] || 'FILE'}</span>
            <span>{file.name}</span>
          </div>
          <span class="file-size">{formatSize(file.size)}</span>
          <div class="file-actions">
            {#if isEditable(file)}
              <button class="file-action-btn" onclick={(e: MouseEvent) => { e.stopPropagation(); handleEdit(file); }}>{$_('edit')}</button>
            {/if}
            <button class="file-action-btn danger" onclick={(e: MouseEvent) => { e.stopPropagation(); handleDelete(file); }}>✕</button>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

{#if $editorState.isOpen}
  <div class="editor-modal visible">
    <div class="editor-container">
      <div class="editor-header">
        <span class="editor-filename">{$editorState.filePath}</span>
        <div class="editor-actions">
          <label class="editor-checkbox">
            <input type="checkbox" bind:checked={createBackup} /> {$_('backup')}
          </label>
          <button class="mc-btn small primary" onclick={handleSaveFile}>{$_('save')}</button>
          <button class="mc-btn small" onclick={handleCloseEditor}>{$_('close')}</button>
        </div>
      </div>
      <div class="editor-body">
        <textarea bind:value={editorContent} spellcheck="false" onkeydown={handleEditorKeydown}></textarea>
      </div>
      <div class="editor-status {$editorState.statusClass}">{$editorState.status}</div>
    </div>
  </div>
{/if}
