// Main Application
const App = {
  socket: null,
  lastCmdTime: 0,
  dlStartTime: null,
  dlTimer: null,
  clockTimer: null,
  initialized: false,

  elements: {},

  init() {
    if (this.initialized) return;
    this.initialized = true;

    // Connect with auth token
    this.socket = io({
      auth: { token: Auth.getToken() }
    });

    // Handle auth errors
    this.socket.on('connect_error', err => {
      if (err.message === 'Authentication required' || err.message === 'Invalid or expired token') {
        console.error('Socket auth failed:', err.message);
        this.initialized = false;
        Auth.showLogin();
        Auth.showError('Session expired. Please login again.');
      }
    });

    this.cacheElements();
    this.bindEvents();
    this.bindSocketHandlers();
    this.initLanguage();
    this.startClock();

    ConsoleManager.init('console', this.socket);
    FileManager.init(this.socket);
    ModManager.init(this.socket);

    this.socket.emit('check-files');
  },

  cacheElements() {
    this.elements = {
      cmdInput: $('cmd-input'),
      statusDot: $('status-dot'),
      statusText: $('status-text'),
      infoStatus: $('info-status'),
      uptimeEl: $('uptime'),
      clockTime: $('clock-time'),
      fileStatus: $('file-status'),
      setupIcon: $('setup-icon'),
      setupText: $('setup-text'),
      checkJar: $('check-jar'),
      checkAssets: $('check-assets'),
      downloadBtn: $('download-btn'),
      authStatus: $('auth-status'),
      authBox: $('auth-box'),
      authLink: $('auth-link'),
      authCode: $('auth-code'),
      progressSection: $('progress-section'),
      progressStatus: $('progress-status'),
      progressTime: $('progress-time'),
      progressFill: $('progress-fill')
    };
  },

  bindEvents() {
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        $('tab-' + btn.dataset.tab).classList.add('active');
      });
    });

    // Commands
    $('send-btn').addEventListener('click', () => this.sendInputCommand());
    this.elements.cmdInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') this.sendInputCommand();
    });

    // Quick commands
    document.querySelectorAll('.quick-btn').forEach(btn => {
      btn.addEventListener('click', () => this.sendCommand(btn.dataset.cmd));
    });

    // Server controls
    this.elements.downloadBtn.addEventListener('click', () => {
      this.elements.authBox.classList.remove('visible');
      this.elements.progressSection.classList.remove('visible');
      this.socket.emit('download');
    });

    $('start-btn').addEventListener('click', () => this.socket.emit('start'));
    $('restart-btn').addEventListener('click', () => {
      if (confirm(t('confirmRestart'))) this.socket.emit('restart');
    });
    $('stop-btn').addEventListener('click', () => {
      if (confirm(t('confirmStop'))) this.sendCommand('/stop');
    });
    $('wipe-btn').addEventListener('click', () => {
      if (confirm(t('confirmWipe'))) {
        if (confirm(t('confirmWipeSure'))) this.socket.emit('wipe');
      }
    });

    // Language selector
    $('lang-select').addEventListener('change', e => setLanguage(e.target.value));

    // Expand panel button
    $('btn-expand-panel').addEventListener('click', () => {
      document.body.classList.toggle('panel-expanded');
      $('btn-expand-panel').textContent = document.body.classList.contains('panel-expanded') ? '✕' : '⤢';
    });

    // Hide sidebar button
    $('btn-hide-sidebar').addEventListener('click', () => {
      document.body.classList.add('sidebar-hidden');
    });

    // Show sidebar button
    $('btn-show-sidebar').addEventListener('click', () => {
      document.body.classList.remove('sidebar-hidden');
    });

    // Close expanded panel on Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (document.body.classList.contains('panel-expanded')) {
          document.body.classList.remove('panel-expanded');
          $('btn-expand-panel').textContent = '⤢';
        }
        if (document.body.classList.contains('sidebar-hidden')) {
          document.body.classList.remove('sidebar-hidden');
        }
      }
    });
  },

  bindSocketHandlers() {
    this.socket.on('log', msg => ConsoleManager.addLog(msg.trim()));

    this.socket.on('status', s => {
      this.elements.statusDot.className = 'status-dot' + (s.running ? ' online' : '');
      this.elements.statusText.textContent = s.running ? t('online') : t('offline');
      this.elements.infoStatus.textContent = s.status || t('unknown');
      this.elements.uptimeEl.textContent = formatUptime(s.startedAt);
    });

    this.socket.on('files', f => this.updateFiles(f));

    this.socket.on('downloader-auth', a => {
      this.elements.authStatus.className = 'auth-status ' + (a ? 'ok' : 'missing');
      this.elements.authStatus.textContent = a ? t('credentialsSaved') : t('noCredentials');
    });

    this.socket.on('download-status', d => this.handleDownloadStatus(d));

    this.socket.on('command-result', r => {
      if (r.error) {
        ConsoleManager.addLog('Error: ' + r.error, 'error');
        showToast('Failed', 'error');
      }
    });

    this.socket.on('action-status', s => {
      const msgs = {
        restart: t('restarted'),
        stop: t('stopped'),
        start: t('started'),
        wipe: t('dataWiped')
      };
      if (s.success) showToast(msgs[s.action] || t('done'));
      else if (s.error) showToast(s.action + ' ' + t('failed'), 'error');
    });

    this.socket.on('error', m => {
      ConsoleManager.addLog(m, 'error');
      showToast(m, 'error');
    });
  },

  sendInputCommand() {
    const cmd = this.elements.cmdInput.value.trim();
    if (cmd) {
      this.sendCommand(cmd);
      this.elements.cmdInput.value = '';
    }
  },

  sendCommand(cmd) {
    if (Date.now() - this.lastCmdTime < 300) return;
    this.lastCmdTime = Date.now();
    if (cmd) {
      ConsoleManager.addLog('> ' + cmd, 'cmd');
      this.socket.emit('command', cmd);
    }
  },

  updateFiles(f) {
    const ji = this.elements.checkJar.querySelector('.icon');
    const ai = this.elements.checkAssets.querySelector('.icon');

    ji.textContent = f.hasJar ? '✓' : '✗';
    ji.className = 'icon ' + (f.hasJar ? 'ok' : 'missing');
    ai.textContent = f.hasAssets ? '✓' : '✗';
    ai.className = 'icon ' + (f.hasAssets ? 'ok' : 'missing');

    this.elements.fileStatus.className = 'file-status ' + (f.ready ? 'ready' : 'missing');
    this.elements.setupIcon.textContent = f.ready ? '✓' : '!';
    this.elements.setupText.textContent = f.ready ? t('filesReady') : t('missingFiles');
    this.elements.downloadBtn.textContent = f.ready ? t('redownload') : t('downloadFiles');
  },

  handleDownloadStatus(d) {
    this.elements.progressSection.classList.add('visible');

    switch (d.status) {
      case 'starting':
        this.elements.downloadBtn.disabled = true;
        this.elements.downloadBtn.innerHTML = '<span class="spinner"></span> ' + t('starting');
        this.startDlTimer();
        this.elements.progressStatus.textContent = t('starting');
        this.elements.progressFill.style.width = '5%';
        this.setStep('step-auth', 'active');
        break;

      case 'auth-required':
        ConsoleManager.addLog(d.message, 'auth');
        this.parseAuth(d.message);
        this.elements.progressStatus.textContent = t('waitingAuth');
        this.elements.progressFill.style.width = '10%';
        this.elements.downloadBtn.disabled = false;
        this.elements.downloadBtn.textContent = t('waiting');
        break;

      case 'output':
        ConsoleManager.addLog(d.message);
        if (d.message.toLowerCase().includes('download')) {
          this.setStep('step-auth', 'done');
          this.setStep('step-download', 'active');
          this.elements.progressStatus.textContent = t('downloading');
          this.elements.progressFill.style.width = '30%';
          this.elements.downloadBtn.innerHTML = '<span class="spinner"></span> ' + t('downloading');
        }
        const p = d.message.match(/(\d+)%/);
        if (p) {
          this.elements.progressFill.style.width = (30 + parseInt(p[1]) * 0.5) + '%';
          this.elements.progressStatus.textContent = p[1] + '%';
        }
        break;

      case 'extracting':
        ConsoleManager.addLog(d.message, 'info');
        this.setStep('step-download', 'done');
        this.setStep('step-extract', 'active');
        this.elements.progressStatus.textContent = t('extracting');
        this.elements.progressFill.style.width = '85%';
        this.elements.downloadBtn.innerHTML = '<span class="spinner"></span> ' + t('extracting');
        break;

      case 'complete':
        this.stopDlTimer();
        ['step-auth', 'step-download', 'step-extract', 'step-complete'].forEach(s => this.setStep(s, 'done'));
        this.elements.progressStatus.textContent = t('done');
        this.elements.progressFill.style.width = '100%';
        this.elements.downloadBtn.disabled = false;
        this.elements.downloadBtn.textContent = t('redownload');
        this.elements.authBox.classList.remove('visible');
        showToast(t('downloadComplete'));
        ConsoleManager.addLog(t('filesReadyMsg'), 'info');
        break;

      case 'done':
      case 'error':
        this.stopDlTimer();
        this.elements.downloadBtn.disabled = false;
        this.elements.downloadBtn.textContent = t('downloadFiles');
        if (d.status === 'error') {
          this.elements.progressStatus.textContent = t('error');
          showToast(d.message, 'error');
          ConsoleManager.addLog('✗ ' + d.message, 'error');
        }
        break;
    }
  },

  parseAuth(text) {
    const u = text.match(/https:\/\/oauth\.accounts\.hytale\.com\S+/);
    const c = text.match(/(?:user_code[=:]\s*|code:\s*)([A-Za-z0-9]+)/i);

    if (u || c) {
      this.elements.authBox.classList.add('visible');
      if (u) {
        this.elements.authLink.href = u[0];
        this.elements.authLink.textContent = u[0];
      }
      if (c) this.elements.authCode.textContent = c[1];
    }
  },

  setStep(id, state) {
    const step = $(id);
    const icon = step.querySelector('span');
    step.className = 'progress-step ' + state;
    icon.textContent = state === 'done' ? '✓' : state === 'active' ? '●' : '○';
  },

  startDlTimer() {
    this.dlStartTime = Date.now();
    this.dlTimer = setInterval(() => {
      this.elements.progressTime.textContent = formatSec(
        Math.floor((Date.now() - this.dlStartTime) / 1000)
      );
    }, 1000);
  },

  stopDlTimer() {
    if (this.dlTimer) {
      clearInterval(this.dlTimer);
      this.dlTimer = null;
    }
  },

  startClock() {
    const updateClock = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      this.elements.clockTime.textContent = `${h}:${m}:${s}`;
    };
    updateClock();
    this.clockTimer = setInterval(updateClock, 1000);
  },

  initLanguage() {
    document.body.setAttribute('data-lang', getLang());
    $('lang-select').value = getLang();
    this.updateAllTranslations();
  },

  updateAllTranslations() {
    // Translate elements with data-i18n attributes
    translateDataAttributes();

    const el = this.elements;

    // Header
    document.querySelector('.logo-subtitle').textContent = t('serverPanel');
    $('server-clock').title = t('serverTime');

    // Status
    const isOnline = el.statusDot.classList.contains('online');
    el.statusText.textContent = isOnline ? t('online') : t('offline');

    // Console
    document.querySelector('.card-header > span').textContent = t('console');
    $('console-clear').title = t('clearConsole');
    el.cmdInput.placeholder = t('enterCommand');
    $('send-btn').textContent = t('send');

    // Tabs
    document.querySelector('[data-tab="setup"]').textContent = t('setup');
    document.querySelector('[data-tab="files"]').textContent = t('files');
    document.querySelector('[data-tab="mods"]').textContent = t('mods');
    document.querySelector('[data-tab="commands"]').textContent = t('commands');
    document.querySelector('[data-tab="control"]').textContent = t('control');

    // Setup tab
    const isReady = el.fileStatus.classList.contains('ready');
    el.setupText.textContent = isReady ? t('filesReady') : t('missingFiles');
    if (!el.downloadBtn.disabled) {
      el.downloadBtn.textContent = isReady ? t('redownload') : t('downloadFiles');
    }
    document.querySelector('.hint').textContent = t('downloadHint');

    // Auth box
    document.querySelector('.auth-box h3').textContent = t('authRequired');
    document.querySelectorAll('.auth-box p')[0].textContent = t('openLink');
    document.querySelectorAll('.auth-box p')[1].textContent = t('code');

    // Progress steps
    document.querySelector('#step-auth span:last-child').textContent = t('auth');
    document.querySelector('#step-download span:last-child').textContent = t('download');
    document.querySelector('#step-extract span:last-child').textContent = t('extract');
    document.querySelector('#step-complete span:last-child').textContent = t('done');

    // Commands tab
    document.querySelectorAll('.cmd-label')[0].textContent = t('auth');
    document.querySelectorAll('.cmd-label')[1].textContent = t('server');
    document.querySelectorAll('.quick-btn span:first-child')[0].textContent = t('login');
    document.querySelectorAll('.quick-btn span:first-child')[1].textContent = t('status');
    document.querySelectorAll('.quick-btn span:first-child')[2].textContent = t('saveCreds');
    document.querySelectorAll('.quick-btn span:first-child')[3].textContent = t('allCommands');
    document.querySelectorAll('.quick-btn span:first-child')[4].textContent = t('stop');

    // Control tab
    $('start-btn').textContent = t('start');
    $('restart-btn').textContent = t('restart');
    $('stop-btn').textContent = t('stopServer');
    $('wipe-btn').textContent = t('wipeData');

    // Info compact
    document.querySelectorAll('.info-label')[0].textContent = t('status');
    document.querySelectorAll('.info-label')[1].textContent = t('game');
    document.querySelectorAll('.info-label')[2].textContent = t('panel');

    // Files tab
    $('btn-refresh').title = t('refresh');
    $('btn-new-folder').textContent = t('newFolder');
    $('btn-upload').textContent = t('upload');
    document.querySelector('.upload-text').textContent = t('dropFilesHere');
    document.querySelector('.upload-hint').textContent = t('uploadHint');
    document.querySelector('.file-col-name').textContent = t('name');
    document.querySelector('.file-col-size').textContent = t('size');

    // Mods tab - select options need manual translation
    const classificationFilter = $('mods-classification-filter');
    if (classificationFilter) {
      classificationFilter.querySelectorAll('option').forEach(opt => {
        const key = opt.dataset.i18n;
        if (key) opt.textContent = t(key);
      });
    }

    // Editor
    const editorBackup = $('editor-backup');
    document.querySelector('.editor-checkbox').innerHTML = 
      `<input type="checkbox" id="editor-backup" ${editorBackup.checked ? 'checked' : ''}> ${t('backup')}`;
    $('btn-save').textContent = t('save');
    $('btn-close-editor').textContent = t('close');

    // Update file list back button
    const backItem = document.querySelector('.file-item-back span:nth-child(2)');
    if (backItem) backItem.textContent = t('back');
  }
};

// Global function for i18n to call
function updateAllTranslations() {
  if (App.initialized) {
    App.updateAllTranslations();
  }
}

// Note: App.init() is called by Auth module after successful authentication
