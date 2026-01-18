// Console module
const ConsoleManager = {
  el: null,
  socket: null,
  isLoadingMore: false,
  autoScroll: true,
  hasMoreHistory: true,
  loadedCount: 0,  // Track total logs loaded for offset pagination
  initialLoadDone: false,

  init(elementId, socket) {
    this.el = $(elementId);
    this.socket = socket;
    this.hasMoreHistory = true;
    this.loadedCount = 0;
    this.initialLoadDone = false;
    this.bindControls();
    this.bindSocketHandlers();
  },

  bindControls() {
    const self = this;
    const clearBtn = $('console-clear');

    // Lazy load on scroll up (only when user scrolls, not on initial load)
    this.el.addEventListener('scroll', function() {
      const nearTop = this.scrollTop < 100;
      const canScroll = this.scrollHeight > this.clientHeight;
      
      // Only load more if user manually scrolled up (not initial position)
      if (nearTop && canScroll && self.initialLoadDone) {
        self.loadMore();
      }
      
      const nearBottom = this.scrollHeight - this.scrollTop - this.clientHeight < 50;
      self.autoScroll = nearBottom;
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', function() {
        self.clear();
      });
    }
  },

  // Extract ISO timestamp from log line (e.g., "2026-01-18T16:28:07.087752320Z ...")
  extractTimestamp(line) {
    const match = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)/);
    return match ? match[1] : null;
  },

  // Format ISO timestamp to local time [DD/MM HH:MM:SS]
  formatTimestamp(isoString) {
    if (!isoString) return this.getTimestamp();
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return this.getTimestamp();
    
    const day = String(d.getDate()).padStart(2, '0');
    const mon = String(d.getMonth() + 1).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `[${day}/${mon} ${h}:${m}:${s}]`;
  },

  bindSocketHandlers() {
    const self = this;
    
    this.socket.on('logs:history', function(data) {
      if (data.error) {
        console.error('Failed to load logs:', data.error);
        self.isLoadingMore = false;
        return;
      }
      
      if (!data.logs || data.logs.length === 0) {
        self.hasMoreHistory = data.hasMore !== false;
        self.isLoadingMore = false;
        return;
      }
      
      if (data.initial) {
        self.el.innerHTML = '';
        self.loadedCount = 0;
        self.hasMoreHistory = true;
      }
      
      const oldScrollHeight = self.el.scrollHeight;
      
      // Parse and add logs
      const fragment = document.createDocumentFragment();
      data.logs.forEach(line => {
        const logTimestamp = self.extractTimestamp(line);
        const cleaned = cleanLog(line).trim();
        if (!cleaned) return;
        fragment.appendChild(self.createLogElement(cleaned, logTimestamp));
      });
      
      // Update count
      self.loadedCount += data.logs.length;
      
      // Check if more history available
      if (data.hasMore === false) {
        self.hasMoreHistory = false;
      }
      
      if (data.initial) {
        self.el.appendChild(fragment);
        self.el.scrollTop = self.el.scrollHeight;
        setTimeout(() => { self.initialLoadDone = true; }, 500);
      } else {
        // Prepend older logs
        self.el.insertBefore(fragment, self.el.firstChild);
        self.el.scrollTop = self.el.scrollHeight - oldScrollHeight;
      }
      
      self.isLoadingMore = false;
    });
  },

  loadMore() {
    if (this.isLoadingMore || !this.hasMoreHistory) return;
    if (this.loadedCount === 0) return;
    
    this.isLoadingMore = true;
    this.socket.emit('logs:more', { 
      currentCount: this.loadedCount,
      batchSize: 200
    });
  },

  createLogElement(text, isoTimestamp = null) {
    const div = document.createElement('div');
    div.className = 'log-line ' + getLogType(text);

    const timeSpan = document.createElement('span');
    timeSpan.className = 'log-time';
    // Use original timestamp for historical logs, current time for streaming
    timeSpan.textContent = this.formatTimestamp(isoTimestamp) + ' ';

    div.appendChild(timeSpan);
    div.appendChild(document.createTextNode(text));
    return div;
  },

  getTimestamp() {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    return `[${d}/${mo} ${h}:${m}:${s}]`;
  },

  addLog(text, type = '') {
    const timestamp = this.getTimestamp();

    cleanLog(text).split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const div = document.createElement('div');
      div.className = 'log-line ' + (type || getLogType(trimmed));

      const timeSpan = document.createElement('span');
      timeSpan.className = 'log-time';
      timeSpan.textContent = timestamp + ' ';

      div.appendChild(timeSpan);
      div.appendChild(document.createTextNode(trimmed));
      this.el.appendChild(div);
    });

    // Trim visible DOM if too large
    while (this.el.children.length > 1000) {
      this.el.removeChild(this.el.firstChild);
    }

    if (this.autoScroll) {
      this.el.scrollTop = this.el.scrollHeight;
    }
  },

  clear() {
    this.el.innerHTML = '';
    this.hasMoreHistory = true;
    this.loadedCount = 0;
    this.initialLoadDone = false;
  }
};
