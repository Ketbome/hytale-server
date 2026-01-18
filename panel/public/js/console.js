// Console module
const ConsoleManager = {
  el: null,
  socket: null,
  loadedCount: 0,
  isLoadingMore: false,
  autoScroll: true,
  hasMoreHistory: true,

  init(elementId, socket) {
    this.el = $(elementId);
    this.socket = socket;
    this.loadedCount = 0;
    this.hasMoreHistory = true;
    this.bindControls();
    this.bindSocketHandlers();
  },

  bindControls() {
    const self = this;
    const clearBtn = $('console-clear');

    // Lazy load on scroll up
    this.el.addEventListener('scroll', function() {
      if (this.scrollTop < 50 && !self.isLoadingMore && self.hasMoreHistory) {
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

  bindSocketHandlers() {
    const self = this;
    
    this.socket.on('logs:history', function(data) {
      if (data.error) {
        console.error('Failed to load logs:', data.error);
        return;
      }
      
      if (data.initial) {
        self.el.innerHTML = '';
        self.loadedCount = 0;
      }
      
      const oldScrollHeight = self.el.scrollHeight;
      const wasAtBottom = self.autoScroll;
      
      // Parse and add logs
      const fragment = document.createDocumentFragment();
      data.logs.forEach(line => {
        const cleaned = cleanLog(line).trim();
        if (!cleaned) return;
        fragment.appendChild(self.createLogElement(cleaned));
      });
      
      if (data.initial) {
        self.el.appendChild(fragment);
        self.el.scrollTop = self.el.scrollHeight;
      } else {
        self.el.insertBefore(fragment, self.el.firstChild);
        self.el.scrollTop = self.el.scrollHeight - oldScrollHeight;
      }
      
      self.loadedCount += data.logs.length;
      self.isLoadingMore = false;
      
      // If we got fewer logs than expected, no more history
      if (data.logs.length < 100) {
        self.hasMoreHistory = false;
      }
    });
  },

  loadMore() {
    if (this.isLoadingMore || !this.hasMoreHistory) return;
    this.isLoadingMore = true;
    this.socket.emit('logs:more', { count: this.loadedCount + 200 });
  },

  createLogElement(text) {
    const div = document.createElement('div');
    div.className = 'log-line ' + getLogType(text);

    const timeSpan = document.createElement('span');
    timeSpan.className = 'log-time';
    timeSpan.textContent = this.getTimestamp() + ' ';

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
    this.loadedCount = 0;
    this.hasMoreHistory = true;
  }
};
