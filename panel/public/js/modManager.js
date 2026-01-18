// Mod Manager module
const ModManager = {
  socket: null,
  installedMods: [],
  searchResults: [],
  availableUpdates: [], // Updates available for installed mods
  currentView: 'installed', // 'installed' or 'browse'
  currentPage: 1,
  pageSize: 20,
  hasMore: false,
  total: 0,
  apiConfigured: false,
  installingMods: new Set(),
  updatingMods: new Set(),

  init(socket) {
    this.socket = socket;
    this.bindEvents();
    this.bindSocketHandlers();
  },

  bindEvents() {
    // View toggle
    $('btn-view-installed').addEventListener('click', () => this.switchView('installed'));
    $('btn-view-browse').addEventListener('click', () => this.switchView('browse'));

    // Check updates button
    $('btn-check-updates').addEventListener('click', () => this.checkForUpdates());

    // Search
    $('btn-search-mods').addEventListener('click', () => this.searchMods());
    $('mods-search-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.searchMods();
    });
    $('mods-classification-filter').addEventListener('change', () => this.searchMods());

    // Pagination
    $('btn-prev-page').addEventListener('click', () => this.changePage(-1));
    $('btn-next-page').addEventListener('click', () => this.changePage(1));

    // Tab activation - load data when mods tab is clicked
    document.querySelector('[data-tab="mods"]').addEventListener('click', () => {
      this.checkConfig();
      this.loadInstalledMods();
    });
  },

  bindSocketHandlers() {
    // Config status
    this.socket.on('mods:config-status', (result) => {
      this.apiConfigured = result.configured;
      this.updateConfigUI();
    });

    // Installed mods list
    this.socket.on('mods:list-result', (result) => {
      if (result.success) {
        this.installedMods = result.mods;
        if (this.currentView === 'installed') {
          this.renderInstalledMods();
        }
      } else {
        showToast(t('error') + ': ' + result.error, 'error');
      }
    });

    // Search results
    this.socket.on('mods:search-result', (result) => {
      if (result.success) {
        this.searchResults = result.projects || [];
        this.total = result.total || 0;
        this.hasMore = result.hasMore || false;
        this.currentPage = result.page || 1;
        this.renderSearchResults();
        this.updatePagination();
      } else {
        showToast(t('error') + ': ' + result.error, 'error');
        $('search-mods-list').innerHTML = '<div class="mods-empty">' + t('searchError') + '</div>';
      }
    });

    // Project details (for install when versions not in search results)
    this.socket.on('mods:get-result', (result) => {
      if (result.success && result.project) {
        // Update the mod in search results with full details
        const index = this.searchResults.findIndex(m => m.id === result.project.id);
        if (index >= 0) {
          this.searchResults[index] = result.project;
          // Now proceed with installation
          this.doInstall(result.project);
        }
      } else {
        showToast(t('error') + ': ' + (result.error || 'Failed to get project details'), 'error');
        // Reset button
        const btns = document.querySelectorAll('.mod-btn.installing');
        btns.forEach(btn => {
          btn.textContent = t('install');
          btn.classList.remove('installing');
        });
      }
    });

    // Install status
    this.socket.on('mods:install-status', (status) => {
      const btn = document.querySelector(`[data-project-id="${status.projectId}"] .mod-btn.install`);
      if (btn) {
        btn.textContent = status.status === 'downloading' ? t('downloading') : t('installing');
        btn.classList.add('installing');
      }
    });

    // Install result
    this.socket.on('mods:install-result', (result) => {
      if (result.success) {
        showToast(t('modInstalled'));
        this.loadInstalledMods();
        // Update button in search results
        if (result.mod) {
          this.installingMods.delete(result.mod.projectId);
          const btn = document.querySelector(`[data-project-id="${result.mod.projectId}"] .mod-btn.install`);
          if (btn) {
            btn.textContent = t('installed');
            btn.disabled = true;
            btn.classList.remove('installing');
          }
        }
      } else {
        showToast(t('installFailed') + ': ' + result.error, 'error');
        // Reset button
        const btns = document.querySelectorAll('.mod-btn.installing');
        btns.forEach(btn => {
          btn.textContent = t('install');
          btn.classList.remove('installing');
        });
      }
    });

    // Uninstall result
    this.socket.on('mods:uninstall-result', (result) => {
      if (result.success) {
        showToast(t('modUninstalled'));
        this.loadInstalledMods();
      } else {
        showToast(t('error') + ': ' + result.error, 'error');
      }
    });

    // Enable result
    this.socket.on('mods:enable-result', (result) => {
      if (result.success) {
        showToast(t('modEnabled'));
        this.loadInstalledMods();
      } else {
        showToast(t('error') + ': ' + result.error, 'error');
      }
    });

    // Disable result
    this.socket.on('mods:disable-result', (result) => {
      if (result.success) {
        showToast(t('modDisabled'));
        this.loadInstalledMods();
      } else {
        showToast(t('error') + ': ' + result.error, 'error');
      }
    });

    // Check updates result
    this.socket.on('mods:check-updates-result', (result) => {
      $('btn-check-updates').disabled = false;
      $('btn-check-updates').textContent = '⟳ ' + t('updates');
      if (result.success) {
        this.availableUpdates = result.updates || [];
        if (this.availableUpdates.length > 0) {
          showToast(t('updatesAvailable').replace('{count}', this.availableUpdates.length));
        } else {
          showToast(t('noUpdates'));
        }
        if (this.currentView === 'installed') {
          this.renderInstalledMods();
        }
      } else {
        showToast(t('error') + ': ' + result.error, 'error');
      }
    });

    // Update status
    this.socket.on('mods:update-status', (status) => {
      const card = document.querySelector(`[data-mod-id="${status.modId}"]`);
      if (card) {
        const btn = card.querySelector('.mod-btn.update');
        if (btn) {
          btn.textContent = status.status === 'downloading' ? t('downloading') : t('installing');
          btn.classList.add('updating');
        }
      }
    });

    // Update result
    this.socket.on('mods:update-result', (result) => {
      if (result.success) {
        showToast(t('modUpdated'));
        if (result.mod) {
          this.updatingMods.delete(result.mod.id);
          // Remove from available updates
          this.availableUpdates = this.availableUpdates.filter(u => u.modId !== result.mod.id);
        }
        this.loadInstalledMods();
      } else {
        showToast(t('updateFailed') + ': ' + result.error, 'error');
        // Reset button
        const btns = document.querySelectorAll('.mod-btn.updating');
        btns.forEach(btn => {
          btn.textContent = t('update');
          btn.classList.remove('updating');
        });
      }
    });
  },

  checkConfig() {
    this.socket.emit('mods:check-config');
  },

  checkForUpdates() {
    if (!this.apiConfigured) {
      showToast(t('configureApiFirst'), 'error');
      return;
    }
    $('btn-check-updates').disabled = true;
    $('btn-check-updates').textContent = '⟳ ' + t('checking');
    this.socket.emit('mods:check-updates');
  },

  updateConfigUI() {
    const statusEl = $('mods-api-status');
    if (statusEl) {
      statusEl.classList.toggle('ok', this.apiConfigured);
      statusEl.title = this.apiConfigured ? 'Modtale API: OK' : 'Modtale API: Not configured';
    }
  },

  loadInstalledMods() {
    $('installed-mods-list').innerHTML = '<div class="mods-empty">' + t('loading') + '</div>';
    this.socket.emit('mods:list');
  },

  switchView(view) {
    this.currentView = view;

    // Update toggle buttons
    $('btn-view-installed').classList.toggle('active', view === 'installed');
    $('btn-view-browse').classList.toggle('active', view === 'browse');

    // Show/hide elements
    $('mods-search').classList.toggle('hidden', view === 'installed');
    $('installed-mods-list').classList.toggle('hidden', view === 'browse');
    $('search-mods-list').classList.toggle('hidden', view === 'installed');
    $('mods-pagination').classList.toggle('hidden', view === 'installed');

    if (view === 'installed') {
      this.loadInstalledMods();
    } else {
      // Auto-load popular mods when switching to browse
      if (this.searchResults.length === 0) {
        this.searchMods();
      }
    }
  },

  searchMods(page = 1) {
    if (!this.apiConfigured) {
      showToast(t('configureApiFirst'), 'error');
      return;
    }

    const query = $('mods-search-input').value.trim();
    const classification = $('mods-classification-filter').value;

    $('search-mods-list').innerHTML = '<div class="mods-empty">' + t('searching') + '</div>';

    this.socket.emit('mods:search', {
      query,
      classification: classification || undefined,
      page,
      pageSize: this.pageSize
    });
  },

  changePage(delta) {
    const newPage = this.currentPage + delta;
    if (newPage < 1) return;
    if (delta > 0 && !this.hasMore) return;
    this.searchMods(newPage);
  },

  updatePagination() {
    const paginationEl = $('mods-pagination');
    const pageInfo = $('mods-page-info');
    const prevBtn = $('btn-prev-page');
    const nextBtn = $('btn-next-page');

    if (this.currentView === 'browse' && this.searchResults.length > 0) {
      paginationEl.classList.remove('hidden');
      pageInfo.textContent = `${t('page')} ${this.currentPage}`;
      prevBtn.disabled = this.currentPage <= 1;
      nextBtn.disabled = !this.hasMore;
    } else {
      paginationEl.classList.add('hidden');
    }
  },

  renderInstalledMods() {
    const container = $('installed-mods-list');

    if (!this.installedMods || this.installedMods.length === 0) {
      container.innerHTML = '<div class="mods-empty">' + t('noModsInstalled') + '</div>';
      return;
    }

    let html = '';
    for (const mod of this.installedMods) {
      html += this.renderModCard(mod, true);
    }

    container.innerHTML = html;
    this.bindModCardEvents(container, true);
  },

  renderSearchResults() {
    const container = $('search-mods-list');

    if (!this.searchResults || this.searchResults.length === 0) {
      container.innerHTML = '<div class="mods-empty">' + t('noModsFound') + '</div>';
      return;
    }

    let html = '';
    for (const mod of this.searchResults) {
      // Check if already installed
      const isInstalled = this.installedMods.some(
        m => m.projectId === mod.id
      );
      html += this.renderModCard(mod, false, isInstalled);
    }

    container.innerHTML = html;
    this.bindModCardEvents(container, false);
  },

  renderModCard(mod, isInstalled, alreadyInstalled = false) {
    const iconHtml = mod.iconUrl || mod.projectIconUrl
      ? `<img src="${mod.iconUrl || mod.projectIconUrl}" alt="" onerror="this.style.display='none'">`
      : '?';

    const classification = mod.classification || 'PLUGIN';
    const title = mod.title || mod.projectTitle;
    const version = isInstalled ? mod.versionName : (mod.latestVersion?.version || '');
    const author = mod.author || 'Unknown';
    const downloads = mod.downloads ? formatNumber(mod.downloads) : '';

    if (isInstalled) {
      // Check if update is available
      const updateInfo = this.availableUpdates.find(u => u.modId === mod.id);
      const hasUpdate = !!updateInfo;
      const modtaleUrl = mod.projectId && mod.projectSlug ? `https://modtale.net/mod/${mod.projectSlug}-${mod.projectId}` : null;

      // Installed mod card
      return `
        <div class="mod-card ${hasUpdate ? 'has-update' : ''}" data-mod-id="${mod.id}" ${hasUpdate ? `data-update-version-id="${updateInfo.latestVersionId}" data-update-version="${updateInfo.latestVersion}" data-update-filename="${updateInfo.latestFileName || ''}"` : ''}>
          <div class="mod-icon">${iconHtml}</div>
          <div class="mod-info">
            <div class="mod-title">
              ${modtaleUrl ? `<a href="${modtaleUrl}" target="_blank" class="mod-link">${escapeHtml(title)}</a>` : escapeHtml(title)}
              <span class="mod-classification ${classification}">${classification}</span>
              ${hasUpdate ? `<span class="mod-update-badge">${t('updateAvailable')}</span>` : ''}
            </div>
            <div class="mod-meta">
              <span>v${escapeHtml(version)}</span>
              ${hasUpdate ? `<span class="update-version">→ v${escapeHtml(updateInfo.latestVersion)}</span>` : ''}
              ${mod.enabled ? '<span style="color: var(--success)">Enabled</span>' : '<span style="color: var(--error)">Disabled</span>'}
              ${mod.isLocal ? '<span class="mod-local-badge">Local</span>' : ''}
            </div>
          </div>
          <div class="mod-actions">
            ${hasUpdate ? `<button class="mod-btn update" data-action="update">${t('update')}</button>` : ''}
            <div class="mod-toggle ${mod.enabled ? 'enabled' : ''}" data-action="toggle" title="${mod.enabled ? t('disable') : t('enable')}"></div>
            <button class="mod-btn danger" data-action="uninstall">${t('remove')}</button>
          </div>
        </div>
      `;
    } else {
      // Search result card
      const description = mod.shortDescription || mod.description || '';
      const modtaleUrl = `https://modtale.net/mod/${mod.slug}-${mod.id}`;
      return `
        <div class="mod-card" data-project-id="${mod.id}">
          <div class="mod-icon">${iconHtml}</div>
          <div class="mod-info">
            <div class="mod-title">
              <a href="${modtaleUrl}" target="_blank" class="mod-link">${escapeHtml(title)}</a>
              <span class="mod-classification ${classification}">${classification}</span>
            </div>
            <div class="mod-meta">
              <span>${escapeHtml(author)}</span>
              ${downloads ? `<span>${downloads} downloads</span>` : ''}
              ${version ? `<span>v${escapeHtml(version)}</span>` : ''}
            </div>
            ${description ? `<div class="mod-description">${escapeHtml(description)}</div>` : ''}
          </div>
          <div class="mod-actions">
            <button class="mod-btn install" data-action="install" ${alreadyInstalled ? 'disabled' : ''}>
              ${alreadyInstalled ? t('installed') : t('install')}
            </button>
          </div>
        </div>
      `;
    }
  },

  bindModCardEvents(container, isInstalled) {
    container.querySelectorAll('.mod-card').forEach(card => {
      if (isInstalled) {
        const modId = card.dataset.modId;
        const toggle = card.querySelector('.mod-toggle');
        const uninstallBtn = card.querySelector('[data-action="uninstall"]');
        const updateBtn = card.querySelector('[data-action="update"]');

        toggle?.addEventListener('click', () => {
          const isEnabled = toggle.classList.contains('enabled');
          if (isEnabled) {
            this.socket.emit('mods:disable', modId);
          } else {
            this.socket.emit('mods:enable', modId);
          }
        });

        uninstallBtn?.addEventListener('click', () => {
          if (confirm(t('confirmUninstall'))) {
            this.socket.emit('mods:uninstall', modId);
          }
        });

        updateBtn?.addEventListener('click', () => {
          const versionId = card.dataset.updateVersionId;
          const versionName = card.dataset.updateVersion;
          const fileName = card.dataset.updateFilename;
          if (versionId) {
            this.updateMod(modId, versionId, versionName, fileName);
          }
        });
      } else {
        const projectId = card.dataset.projectId;
        const installBtn = card.querySelector('[data-action="install"]');

        installBtn?.addEventListener('click', () => {
          if (installBtn.disabled) return;
          this.installMod(projectId);
        });
      }
    });
  },

  installMod(projectId) {
    if (!this.apiConfigured) {
      showToast(t('configureApiFirst'), 'error');
      return;
    }

    const mod = this.searchResults.find(m => m.id === projectId);
    if (!mod) return;

    // If no latestVersion, we need to fetch project details first
    if (!mod.latestVersion || !mod.latestVersion.id) {
      // Request project details to get versions
      this.socket.emit('mods:get', projectId);
      // Mark as installing to show feedback
      const btn = document.querySelector(`[data-project-id="${projectId}"] .mod-btn.install`);
      if (btn) {
        btn.textContent = t('loading');
        btn.classList.add('installing');
      }
      return;
    }

    this.doInstall(mod);
  },

  doInstall(mod) {
    const latestVersion = mod.latestVersion;
    if (!latestVersion || !latestVersion.id) {
      showToast(t('noVersionAvailable'), 'error');
      return;
    }

    this.installingMods.add(mod.id);

    this.socket.emit('mods:install', {
      projectId: mod.id,
      versionId: latestVersion.id,
      metadata: {
        projectTitle: mod.title,
        projectSlug: mod.slug,
        projectIconUrl: mod.iconUrl,
        versionName: latestVersion.version,
        classification: mod.classification,
        fileName: latestVersion.fileName
      }
    });
  },

  updateMod(modId, versionId, versionName, fileName) {
    if (!this.apiConfigured) {
      showToast(t('configureApiFirst'), 'error');
      return;
    }

    this.updatingMods.add(modId);

    // Update button UI
    const btn = document.querySelector(`[data-mod-id="${modId}"] .mod-btn.update`);
    if (btn) {
      btn.textContent = t('downloading');
      btn.classList.add('updating');
    }

    this.socket.emit('mods:update', {
      modId,
      versionId,
      metadata: {
        versionName,
        fileName
      }
    });
  }
};

// Helper function for escaping HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Helper function for formatting numbers
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return String(num);
}
