// File Manager module
const FileManager = {
  currentPath: '/',
  currentEditingFile: null,
  socket: null,

  FILE_ICONS: {
    folder: 'DIR', java: 'JAR', archive: 'ZIP', json: 'JSON',
    yaml: 'YML', config: 'CFG', text: 'TXT', log: 'LOG', image: 'IMG',
    script: 'SCR', data: 'DAT', audio: 'SND', file: 'FILE'
  },

  init(socket) {
    this.socket = socket;
    this.bindEvents();
    this.bindSocketHandlers();
  },

  bindEvents() {
    $('btn-refresh').addEventListener('click', () => this.navigateTo(this.currentPath));
    $('btn-new-folder').addEventListener('click', () => this.createFolder());
    $('btn-upload').addEventListener('click', () => this.toggleUploadZone());
    $('btn-save').addEventListener('click', () => this.saveFile());
    $('btn-close-editor').addEventListener('click', () => this.closeEditor());

    // Upload zone
    const uploadZone = $('upload-zone');
    const fileInput = $('file-input');

    uploadZone.addEventListener('click', e => {
      if (e.target === uploadZone || e.target.closest('.upload-content')) {
        fileInput.click();
      }
    });

    uploadZone.addEventListener('dragover', e => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', e => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      this.handleUpload(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', () => {
      this.handleUpload(fileInput.files);
      fileInput.value = '';
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      const modal = $('editor-modal');
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && modal.classList.contains('visible')) {
        e.preventDefault();
        this.saveFile();
      }
      if (e.key === 'Escape' && modal.classList.contains('visible')) {
        this.closeEditor();
      }
    });

    // Load files when tab is clicked
    document.querySelector('[data-tab="files"]').addEventListener('click', () => {
      if ($('file-list-body').textContent.includes('Loading')) {
        this.navigateTo('/');
      }
    });
  },

  bindSocketHandlers() {
    this.socket.on('files:list-result', result => {
      if (result.success) {
        this.updateBreadcrumb(result.path);
        this.renderFileList(result.files);
      } else {
        showToast(t('error') + ': ' + result.error, 'error');
        $('file-list-body').innerHTML = '<div class="file-empty">' + t('errorLoading') + '</div>';
      }
    });

    this.socket.on('files:read-result', result => {
      if (result.success) {
        $('editor-content').value = result.content;
        $('editor-status').textContent = t('ready');
        $('editor-status').className = 'editor-status';
      } else if (result.binary) {
        $('editor-status').textContent = t('cannotEditBinary');
        $('editor-status').className = 'editor-status error';
      } else {
        $('editor-status').textContent = t('error') + ': ' + result.error;
        $('editor-status').className = 'editor-status error';
      }
    });

    this.socket.on('files:save-result', result => {
      if (result.success) {
        $('editor-status').textContent = result.backup?.success ? t('savedWithBackup') : t('saved');
        $('editor-status').className = 'editor-status saved';
        showToast(t('fileSaved'));
      } else {
        $('editor-status').textContent = t('error') + ': ' + result.error;
        $('editor-status').className = 'editor-status error';
        showToast(t('saveFailed'), 'error');
      }
    });

    this.socket.on('files:mkdir-result', result => {
      if (result.success) {
        showToast(t('folderCreated'));
        this.navigateTo(this.currentPath);
      } else {
        showToast(t('error') + ': ' + result.error, 'error');
      }
    });

    this.socket.on('files:delete-result', result => {
      if (result.success) {
        showToast(t('deleted'));
        this.navigateTo(this.currentPath);
      } else {
        showToast(t('error') + ': ' + result.error, 'error');
      }
    });

    this.socket.on('files:rename-result', result => {
      if (result.success) {
        showToast(t('renamed'));
        this.navigateTo(this.currentPath);
      } else {
        showToast(t('error') + ': ' + result.error, 'error');
      }
    });
  },

  navigateTo(pathStr) {
    this.currentPath = pathStr;
    $('file-list-body').innerHTML = '<div class="file-empty">' + t('loading') + '</div>';
    this.socket.emit('files:list', pathStr);
  },

  updateBreadcrumb(pathStr) {
    const parts = pathStr.split('/').filter(p => p);
    let html = '<span class="breadcrumb-item" data-path="/">/opt/hytale</span>';
    let accumulated = '';

    for (const part of parts) {
      accumulated += '/' + part;
      html += `<span class="breadcrumb-item" data-path="${accumulated}">${part}</span>`;
    }

    const breadcrumb = $('file-breadcrumb');
    breadcrumb.innerHTML = html;
    breadcrumb.querySelectorAll('.breadcrumb-item').forEach(item => {
      item.addEventListener('click', () => this.navigateTo(item.dataset.path));
    });
  },

  renderFileList(files) {
    let html = '';

    // Back button
    if (this.currentPath !== '/') {
      html += `
        <div class="file-item file-item-back" data-name=".." data-is-dir="true">
          <div class="file-name">
            <span class="file-icon folder">..</span>
            <span>${t('back')}</span>
          </div>
          <span class="file-size">-</span>
          <div class="file-actions"></div>
        </div>
      `;
    }

    if (!files || files.length === 0) {
      if (this.currentPath === '/') {
        $('file-list-body').innerHTML = '<div class="file-empty">' + t('emptyDir') + '</div>';
        return;
      }
    }

    for (const file of files) {
      const icon = this.FILE_ICONS[file.icon] || 'FILE';
      html += `
        <div class="file-item" data-name="${file.name}" data-is-dir="${file.isDirectory}" data-editable="${file.editable}">
          <div class="file-name">
            <span class="file-icon ${file.icon}">${icon}</span>
            <span>${file.name}</span>
          </div>
          <span class="file-size">${formatSize(file.size)}</span>
          <div class="file-actions">
            ${file.editable ? '<button class="file-action-btn" data-action="edit">' + t('edit') + '</button>' : ''}
            <button class="file-action-btn danger" data-action="del">X</button>
          </div>
        </div>
      `;
    }

    $('file-list-body').innerHTML = html;
    this.bindFileItemEvents();
  },

  bindFileItemEvents() {
    $('file-list-body').querySelectorAll('.file-item').forEach(item => {
      const name = item.dataset.name;
      const isDir = item.dataset.isDir === 'true';

      item.addEventListener('click', () => {
        if (name === '..') {
          const parts = this.currentPath.split('/').filter(p => p);
          parts.pop();
          this.navigateTo(parts.length ? '/' + parts.join('/') : '/');
        } else if (isDir) {
          this.navigateTo(this.currentPath === '/' ? '/' + name : this.currentPath + '/' + name);
        }
      });

      item.addEventListener('dblclick', () => {
        if (!isDir && item.dataset.editable === 'true') {
          this.openEditor(this.currentPath === '/' ? '/' + name : this.currentPath + '/' + name);
        }
      });

      item.querySelectorAll('.file-action-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          const action = btn.dataset.action;
          const filePath = this.currentPath === '/' ? '/' + name : this.currentPath + '/' + name;

          if (action === 'edit') {
            this.openEditor(filePath);
          } else if (action === 'del') {
            if (confirm(t('confirmDelete') + ` "${name}"?`)) {
              this.socket.emit('files:delete', filePath);
            }
          }
        });
      });
    });
  },

  openEditor(filePath) {
    this.currentEditingFile = filePath;
    $('editor-filename').textContent = filePath;
    $('editor-status').textContent = t('loading');
    $('editor-status').className = 'editor-status';
    $('editor-content').value = '';
    $('editor-modal').classList.add('visible');
    this.socket.emit('files:read', filePath);
  },

  closeEditor() {
    $('editor-modal').classList.remove('visible');
    this.currentEditingFile = null;
  },

  saveFile() {
    if (!this.currentEditingFile) return;
    $('editor-status').textContent = t('saving');
    $('editor-status').className = 'editor-status saving';

    this.socket.emit('files:save', {
      path: this.currentEditingFile,
      content: $('editor-content').value,
      createBackup: $('editor-backup').checked
    });
  },

  createFolder() {
    const name = prompt(t('folderName'));
    if (name) {
      this.socket.emit('files:mkdir', this.currentPath === '/' ? '/' + name : this.currentPath + '/' + name);
    }
  },

  toggleUploadZone() {
    $('upload-zone').classList.toggle('visible');
  },

  async handleUpload(files) {
    const uploadProgress = $('upload-progress');
    const uploadProgressFill = $('upload-progress-fill');
    const uploadProgressText = $('upload-progress-text');

    uploadProgress.classList.add('visible');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      uploadProgressText.textContent = t('uploading') + ` ${file.name}...`;
      uploadProgressFill.style.width = '10%';

      const formData = new FormData();
      formData.append('file', file);
      formData.append('targetDir', this.currentPath);

      try {
        const response = await fetch('/api/files/upload', { method: 'POST', body: formData });
        const result = await response.json();

        if (result.success) {
          uploadProgressFill.style.width = '100%';
          showToast(t('uploaded') + `: ${file.name}`);
        } else {
          showToast(t('uploadFailed') + `: ${result.error}`, 'error');
        }
      } catch (e) {
        showToast(t('uploadError') + `: ${e.message}`, 'error');
      }
    }

    setTimeout(() => {
      uploadProgress.classList.remove('visible');
      $('upload-zone').classList.remove('visible');
      this.navigateTo(this.currentPath);
    }, 500);
  }
};
