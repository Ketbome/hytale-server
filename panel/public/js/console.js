// Console module
const ConsoleManager = {
  el: null,
  maxLines: 500,

  init(elementId) {
    this.el = $(elementId);
    this.bindControls();
  },

  bindControls() {
    const filter = $('console-filter');
    const clearBtn = $('console-clear');

    if (filter) {
      filter.addEventListener('change', () => {
        this.maxLines = parseInt(filter.value, 10);
        this.trimLines();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clear());
    }
  },

  trimLines() {
    while (this.el.children.length > this.maxLines) {
      this.el.removeChild(this.el.firstChild);
    }
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

    this.el.scrollTop = this.el.scrollHeight;
    this.trimLines();
  },

  clear() {
    this.el.innerHTML = '';
  }
};
