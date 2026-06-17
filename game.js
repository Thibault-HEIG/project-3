// =============================================
// PROJECT-3 GAME ENGINE v2.0 (REFACTORED 2012)
// =============================================

class GameStateManager {
  /** @private */ #storageKey = 'project3_state';

  /** @private — frozen blueprint for fresh state */
  #defaults = Object.freeze({
    visitedZones: [],
    cluesFound: [],
    sqlDeepAccess: false,
    phpEditorOpened: false,
    phpArchitectSearched: false,
    javaLogsRead: false,
    serverRootUnlocked: false,
    hiddenFolderVisible: false,
    notesRead: false,
    fragmentsRead: false,
    gameCompleted: false,
    firstVisit: null,
    countMe: 0,
    anger: 0
  });

  /** @private */ #state = null;
  /** @private */ #counter = 0;
  /** @private */ #clueFlag = false;
  /** @private */ #buffer = [];
  /** @private */ #junctions = [];

  get storageKey() { return this.#storageKey; }
  get defaults() { return Object.assign({}, this.#defaults); }
  get state() { return this.#state; }
  get counter() { return this.#counter; }
  set counter(v) { this.#counter = v; }
  get clueFlag() { return this.#clueFlag; }
  set clueFlag(v) { this.#clueFlag = v; }
  get buffer() { return this.#buffer; }
  set buffer(v) { this.#buffer = v; }
  get junctions() { return this.#junctions; }

  /**
   * Load state from localStorage, merging with defaults.
   * Creates and persists a fresh state if none exists or parse fails.
   * Always syncs to window.sv for legacy compatibility.
   * @returns {Object} The current game state
   */
  load() {
    try {
      const raw = localStorage.getItem(this.#storageKey);
      if (raw && typeof raw === 'string' && raw.includes('{')) {
        const parsed = JSON.parse(raw);
        
        // Strict Enforcement: serverRootUnlocked is invalid if prerequisites are missing.
        // This prevents stale localStorage payloads from injecting unauthorized access.
        if (parsed.serverRootUnlocked && (!parsed.sqlDeepAccess || !parsed.phpArchitectSearched)) {
          parsed.serverRootUnlocked = false;
        }

        this.#state = Object.assign({}, this.#defaults, parsed);
        this.#syncLegacyGlobals();
        return this.#state;
      }
    } catch (e) {
      // Storage read or JSON parse failed — create fresh state
    }

    const fresh = Object.assign({}, this.#defaults, { firstVisit: Date.now() });
    this.save(fresh);
    this.#state = fresh;
    this.#syncLegacyGlobals();
    return this.#state;
  }

  /**
   * Persist state to localStorage.
   * @param {Object} state - The state object to save
   * @returns {boolean} True on success, false if storage is full/disabled
   */
  save(state) {
    try {
      localStorage.setItem(this.#storageKey, JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Nuclear reset — clears all stored state and resets internals.
   */
  reset() {
    localStorage.removeItem(this.#storageKey);
    sessionStorage.clear();
    this.#clueFlag = false;
    this.#counter = 0;
    this.#buffer = [];
    this.#state = null;
    this.#syncLegacyGlobals();
  }

  /**
   * Register a zone visit. Handles first-visit fake boot sequence on home.
   * Deduplicates zone entries before persisting.
   * @param {string} zone - The zone identifier (e.g. 'home', 'sql', 'php')
   * @returns {Object} The current game state
   */
  visitZone(zone) {
    this.#counter++;
    const state = this.load();

    // First-time home visit triggers the dial-up boot sequence
    if (zone === 'home' && !sessionStorage.getItem('p3_loaded')) {
      if (!state.visitedZones.length) {
        VisualEffects.fakeBootSequence();
        sessionStorage.setItem('p3_loaded', '1');
      }
    }

    // Track unique zone visits
    if (state.visitedZones.indexOf(zone) === -1) {
      state.visitedZones.push(zone);
      this.save(state);
    }

    this.#syncLegacyGlobals();
    return state;
  }

  /**
   * Discover a clue. Deduplicates, persists, and triggers visual feedback.
   * @param {string} clue - The clue identifier
   * @returns {Object} The current game state
   */
  addClue(clue) {
    const state = this.load();
    if (state.cluesFound.indexOf(clue) === -1) {
      state.cluesFound.push(clue);
      this.save(state);
      VisualEffects.flash();
    }
    this.#clueFlag = true;
    this.#syncLegacyGlobals();
    return state;
  }

  /**
   * Update a single state flag and persist.
   * Also logs the key to the buffer and junction arrays.
   * @param {string} key - The state property to update
   * @param {*} value - The new value
   * @returns {Object} The current game state
   */
  update(key, value) {
    const state = this.load();
    state[key] = value;
    this.save(state);
    this.#buffer.push(key);
    this.#junctions.push(key);
    this.#syncLegacyGlobals();
    return state;
  }

  /**
   * @private Sync internal state to legacy window globals.
   * Called after every state mutation to keep the chaotic
   * frontend's global variable expectations satisfied.
   */
  #syncLegacyGlobals() {
    window.sv = this.#state;
    window.f7 = this.#clueFlag;
    window.ctr = this.#counter;
    window.buf = this.#buffer;
    window.jj = this.#junctions;
  }
}

const stateManager = new GameStateManager();


// =============================================
// LAYER 2: MODULE OBJECTS
// Each module encapsulates a single concern.
// Cross-module references are resolved at call
// time (not definition time), so order of
// definition does not create circular deps.
// =============================================


// -------------------------------------------
// MODULE: WindowManager
// Replaces: windowMaker6000, popup, floaty,
//           upOne, _z, d1/sx/sy/ox/oy/currentH
// -------------------------------------------

const WindowManager = {
  _zIndex: 1000,
  _killCount: 0,
  _widgetCount: 0,
  _pixelCount: 0,

  // Drag state (encapsulates former globals d1, sx, sy, ox, oy, currentH)
  _dragging: false,
  _startX: 0,
  _startY: 0,
  _offsetX: 0,
  _offsetY: 0,
  _currentHandle: null,

  /**
   * Allocate the next z-index for window stacking.
   * @returns {number} The new z-index value
   */
  nextZIndex() {
    this._zIndex++;
    this._killCount++;
    // Sync legacy globals
    window._z = this._zIndex;
    window.kk = this._killCount;
    return this._zIndex;
  },

  /**
   * Create a draggable popup window and append it to the DOM.
   * Replaces the original windowMaker6000 and popup functions.
   * @param {string} content - HTML content for the window body
   * @param {Object} [options] - Configuration options
   * @param {string} [options.title='Alert'] - Window title
   * @param {string} [options.cls=''] - Additional CSS class
   * @param {number} [options.x] - Explicit left position (px)
   * @param {number} [options.y] - Explicit top position (px, before scroll offset)
   * @param {number} [options.autoClose=0] - Auto-close delay in ms (0 = disabled)
   * @returns {HTMLElement} The created popup element
   */
  create(content, options = {}) {
    const title = options.title || 'Alert';

    const popup = document.createElement('div');
    popup.className = 'win-popup ' + (options.cls || '');

    popup.innerHTML =
      '<div class="win-bar"><span class="win-title">' + title + '</span>' +
      '<button class="win-x" onclick="this.closest(\'.win-popup\').remove()">✕</button></div>' +
      '<div class="win-body">' + content + '</div>';

    // Position: use explicit coords or randomized defaults
    popup.style.left = (options.x != null ? options.x : (120 + Math.random() * 250)) + 'px';
    popup.style.top = (options.y != null ? (options.y + window.scrollY) : (window.scrollY + 60 + Math.random() * 180)) + 'px';
    popup.style.zIndex = this.nextZIndex();

    if (document.body) {
      document.body.appendChild(popup);
    } else {
      console.error('CRITICAL: document.body is missing');
    }

    this.makeDraggable(popup);

    if (options.autoClose && options.autoClose > 0) {
      setTimeout(() => { if (popup.parentNode) popup.remove(); }, options.autoClose);
    }

    this._widgetCount++;
    this._pixelCount++;
    window.ww = this._widgetCount;
    window.pp = this._pixelCount;

    return popup;
  },

  /**
   * Make an element draggable by its title bar (or itself).
   * @param {HTMLElement} element - The element to make draggable
   */
  makeDraggable(element) {
    if (!element) return;

    const handle = element.querySelector('.win-bar') || element;
    handle.style.cursor = 'grab';

    handle.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;

      this._dragging = true;
      this._currentHandle = handle;
      handle.style.cursor = 'grabbing';
      this._startX = e.clientX;
      this._startY = e.clientY;

      const rect = element.getBoundingClientRect();
      this._offsetX = rect.left;
      this._offsetY = rect.top;

      // Lock position to absolute coordinates
      element.style.left = this._offsetX + 'px';
      element.style.top = this._offsetY + 'px';
      element.style.bottom = 'auto';
      element.style.right = 'auto';

      element.style.zIndex = this.nextZIndex();
      e.preventDefault();

      // Sync legacy drag flag
      window.d1 = true;
    });
  },

  /**
   * @private Initialize document-level drag listeners.
   * Called once at load time.
   */
  _initDragListeners() {
    document.addEventListener('mousemove', (e) => {
      if (!this._dragging) return;
      const el = this._currentHandle.closest('.win-popup') || this._currentHandle;
      el.style.position = 'absolute';
      el.style.left = (this._offsetX + e.clientX - this._startX) + 'px';
      el.style.top = (this._offsetY + e.clientY - this._startY) + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (this._dragging) {
        this._dragging = false;
        if (this._currentHandle) this._currentHandle.style.cursor = 'grab';
        window.d1 = false;
      }
    });
  }
};

// Set up global drag listeners immediately
WindowManager._initDragListeners();


// -------------------------------------------
// MODULE: VisualEffects
// Replaces: sparkle, ghostFlicker, fakeLoad,
//           slowText
// -------------------------------------------

const VisualEffects = {
  /**
   * Full-screen white flash to indicate a clue discovery.
   * Replaces the original sparkle() function.
   */
  flash() {
    const overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;top:0;left:0;width:100vw;height:100vh;' +
      'background:rgba(255,255,255,0.2);z-index:99999;pointer-events:none;';
    document.body.appendChild(overlay);
    setTimeout(() => {
      overlay.style.transition = 'opacity 0.3s';
      overlay.style.opacity = '0';
    }, 50);
    setTimeout(() => overlay.remove(), 400);
  },

  /**
   * Randomize the chaos overlay's opacity and position.
   * Called on an interval when clue count exceeds threshold.
   */
  flicker() {
    const overlay = document.querySelector('.chaos-overlay');
    if (!overlay) return;
    overlay.style.opacity = (Math.random() > 0.5) ? '0.1' : '0.4';
    overlay.style.transform =
      'translate(' + (Math.random() * 4 - 2) + 'px, ' + (Math.random() * 4 - 2) + 'px)';
  },

  /**
   * Simulate a 56K dial-up boot sequence on first home visit.
   * Hides the page, shows terminal lines, then reveals content.
   */
  fakeBootSequence() {
    document.body.style.visibility = 'hidden';
    document.body.style.background = '#000';

    // Start MIDI immediately to set the mood
    AudioSim.initMidiPlayer();

    const loader = document.createElement('div');
    loader.style.cssText =
      'position:fixed;top:0;left:0;width:100vw;height:100vh;background:#000;' +
      'color:#0f0;font-family:monospace;padding:20px;z-index:999999;overflow:hidden;';
    document.documentElement.appendChild(loader);

    const lines = [
      'CONNECT 56000 / V.90 / RELIABLE',
      '--- Protocol Negotiation ---',
      'Sending credentials...',
      'OK',
      'Requesting /index.html...',
      'Receiving data (0.4 KB/s)...',
      'Rendering layout...',
      'Warning: table has no width',
      'Warning: missing alt attribute',
      'Initializing MIDI player...',
      'Finalizing construction zone...'
    ];

    let i = 0;
    function nextLine() {
      if (i < lines.length) {
        const p = document.createElement('div');
        p.textContent = '> ' + lines[i];
        loader.appendChild(p);
        i++;
        setTimeout(nextLine, 400 + Math.random() * 800);
      } else {
        // Stall at the end like it's stuck
        setTimeout(function() {
          loader.remove();
          document.body.style.visibility = 'visible';
          document.body.style.background = '';

          // Line-by-line reveal effect
          const all = document.body.querySelectorAll('*');
          const topLevel = Array.from(all).filter(el => el.parentElement === document.body);
          
          topLevel.forEach((el) => {
            el.style.opacity = '0';
            el.style.transition = 'opacity 0.5s';
          });

          let j = 0;
          const reveal = () => {
            if (j < topLevel.length) {
              topLevel[j].style.opacity = '1';
              j++;
              setTimeout(reveal, 100 + Math.random() * 300);
            }
          };
          reveal();
        }, 1500);
      }
    }
    nextLine();
  },

  /**
   * Typewriter text effect — types characters one at a time.
   * @param {HTMLElement} element - Target element
   * @param {string} text - Text to type
   * @param {number} [speed=40] - Milliseconds per character
   */
  typewrite(element, text, speed = 40) {
    let i = 0;
    element.textContent = '';
    const iv = setInterval(() => {
      if (i < text.length) {
        element.textContent += text[i];
        i++;
      } else {
        clearInterval(iv);
      }
    }, speed);
  }
};


// -------------------------------------------
// MODULE: AudioSim
// Replaces: noise()
// Simulates MIDI playback without actual audio.
// -------------------------------------------

const AudioSim = {
  _tracks: [
    'construction_zone.mid', 'welcome_theme.mid', 'digital_labyrinth.mid',
    'enterprise.mid', 'system_breach.mid', 'dark_corridor.mid'
  ],

  /**
   * Initialize the fake MIDI player bar with track name,
   * play/pause toggle, and blinking status indicator.
   */
  initMidiPlayer() {
    const bar = document.getElementById('midi-bar');
    if (!bar) return;

    const trackName = this._tracks[Math.floor(Math.random() * this._tracks.length)];
    const nameEl = bar.querySelector('.midi-name');
    if (nameEl) nameEl.textContent = trackName;

    let playing = true;
    const btn = bar.querySelector('.midi-toggle');
    const status = bar.querySelector('.midi-status');

    if (btn) {
      btn.addEventListener('click', () => {
        playing = !playing;
        btn.textContent = playing ? '\u23F8' : '\u25B6';
        if (status) status.textContent = playing ? '\u266A PLAYING' : '\u23F8 PAUSED';
      });
    }

    if (status) {
      setInterval(() => {
        status.style.visibility = playing
          ? (status.style.visibility === 'hidden' ? 'visible' : 'hidden')
          : 'visible';
      }, 600);
    }
  }
};


// -------------------------------------------
// MODULE: Integrity
// Replaces: checkIntegrity, formatBytes
// -------------------------------------------

const Integrity = {
  _log: '',

  get log() { return this._log; },
  set log(v) { this._log = v; },

  /**
   * Verify DOM traversal and narrative comment integrity.
   * Results are appended to the internal log buffer.
   */
  verify() {
    if (document.body && document.body.nodeName === 'BODY') {
      this._log += ' [dom ok]';
    }

    try {
      let count = 0;
      const walker = document.createTreeWalker(document, NodeFilter.SHOW_COMMENT, null, false);
      while (walker.nextNode()) count++;
      this._log += count > 0
        ? ' [narrative ok: ' + count + ' fragments]'
        : ' [narrative fragmented]';
    } catch (e) {
      this._log += ' [narrative error]';
    }
  },

  /**
   * Format a size in MB to a human-readable string.
   * @param {number} mb - Size in megabytes
   * @returns {string} Formatted string (e.g. "1.5 GB" or "512.0 MB")
   */
  formatBytes(mb) {
    return mb >= 1024
      ? (mb / 1024).toFixed(1) + ' GB'
      : mb.toFixed(1) + ' MB';
  }
};


// -------------------------------------------
// MODULE: Interactions
// Replaces: spawnDesktopPet, spamAds,
//           heavyDownload, spawnNestingDolls,
//           triggerBSOD, searchUser, sqlRowClick
// -------------------------------------------

const Interactions = {
  /**
   * Spawn the desktop pet assistant.
   * Cycles advice or glitch messages. Gets angry if closed.
   * @param {boolean} [isAngry=false] - Whether the pet respawns angry
   */
  pet(isAngry) {
    const state = stateManager.load();

    // Avoid duplicates
    if (document.getElementById('p3-pet-win')) return;

    let msg = isAngry ? "WHY DID YOU CLOSE ME???" : "Hello! I am your web assistant!";
    const advice = [
      'Have you tried adding more marquee tags?',
      'I think the site needs more flames.',
      'Try clicking everything twice!',
      'Is that a dead link? How vintage!',
      'Have you found all the fragments yet?',
      'The guestbook is currently on fire. Please wait.'
    ];
    const glitch = [
      'user4 is watching you...',
      'Randy Render knows your location.',
      'cmFuZHkgcmVuZGVy',
      'SYSTEM ERROR: ARCHITECT NOT FOUND',
      'Who is Randy?'
    ];

    // Corrupted state for server root
    if (state.serverRootUnlocked) {
      msg = "CRITICAL_ERROR: IDENTITY_OVERWRITE";
    }

    const content =
      '<div id="pet-container" style="text-align:center;padding:10px;font-family:\'Comic Sans MS\',cursive;font-size:12px;">' +
      '<img id="pet-img" src="img/assistant.png" style="width:50px;cursor:pointer;' + '">' +
      '<p class="pet-dialogue" style="margin-top:10px;">' + msg + '</p>' +
      '</div>';

    const popup = WindowManager.create(content, {
      title: isAngry ? '💢 SYSTEM DISTURBANCE' : '🐾 Assistant',
      cls: 'desktop-pet'
    });
    popup.id = 'p3-pet-win';
    WindowManager.makeDraggable(popup);

    // Corrupted visual state
    if (state.serverRootUnlocked) {
      popup.classList.add('corrupted');
      popup.querySelector('.win-title').textContent = "⚠ CORRUPTED ⚠";
    }

    // Cycle dialogue messages
    const dialogueEl = popup.querySelector('.pet-dialogue');
    if (!state.serverRootUnlocked && !isAngry) {
      const iv = setInterval(() => {
        if (!popup.parentNode) { clearInterval(iv); return; }
        const st = stateManager.load();
        if (st.serverRootUnlocked) { clearInterval(iv); return; }
        let pool = advice;
        if (st.cluesFound.length > 2) {
          pool = advice.concat(glitch);
        }
        dialogueEl.textContent = pool[Math.floor(Math.random() * pool.length)];
      }, 5000);
    }

    // Handle closing — increment anger and respawn
    const closeBtn = popup.querySelector('.win-x');
    closeBtn.onclick = () => {
      const st = stateManager.load();
      st.anger = (st.anger || 0) + 1;
      stateManager.save(st);
      popup.remove();
      if (!st.serverRootUnlocked) {
        setTimeout(() => Interactions.pet(true), 15000);
      }
    };
  },

  /**
   * Spawn 2 random kitsch spam ad popups.
   */
  ads() {
    const adTemplates = [
      { title: '💰 CRYPTO MOON 🚀', content: '<div style="background:#000;color:#0f0;padding:10px;text-align:center"><h2 style="animation:rainbow 0.5s infinite">BUY $P3COIN NOW!</h2><p>10000x potential! Don\'t miss out!</p><button class="useless-btn" onclick="heavyDownload(\'Wallet Miner\')">GET RICH QUICK</button></div>' },
      { title: '💖 LOCAL SINGLES', content: '<div style="background:#fff0f5;color:#ff1493;padding:10px;text-align:center"><h3>14 NEW MATCHES!</h3><p>Hot developers in your area want to view your source code!</p><button class="useless-btn" onclick="heavyDownload(\'Dating App\')">MATCH NOW</button></div>' },
      { title: '🎰 JACKPOT!!!', content: '<div style="background:yellow;color:black;padding:10px;text-align:center"><h1 style="animation:blink 0.2s infinite">YOU WON!</h1><p>Claim your prize: 1,000,000 FREE PIXELS</p><button class="useless-btn" onclick="heavyDownload(\'Prize\')">CLAIM</button></div>' },
      { title: '🛡️ SYSTEM INFECTED', content: '<div style="background:red;color:white;padding:10px;text-align:center"><h2>WARNING!</h2><p>4,829 viruses detected in C:\\\\WINDOWS\\\\System32</p><button class="useless-btn" onclick="heavyDownload(\'AntiVirus\')">CLEAN NOW</button></div>' }
    ];

    for (let i = 0; i < 2; i++) {
      const ad = adTemplates[Math.floor(Math.random() * adTemplates.length)];
      WindowManager.create(ad.content, {
        title: ad.title,
        x: Math.random() * (window.innerWidth - 300),
        y: Math.random() * (window.innerHeight - 200)
      });
    }
  },

  /**
   * Simulate a heavy file download with progress bar.
   * 30% chance of success; otherwise BSODs at 20s.
   * Reaches 99% at the 15-second mark.
   * @param {string} [title] - Download file name
   * @param {string|number} [size] - Download size in GB
   */
  download(title, size) {
    const gb = size || (Math.floor(Math.random() * 90) + 10) + '.' + Math.floor(Math.random() * 9);
    const popup = WindowManager.create(
      '<div style="width:300px">' +
      '<p style="font-size:11px">Downloading: <b>' + (title || 'system_update.bin') + '</b></p>' +
      '<p style="font-size:10px;color:#666">Size: ' + gb + ' GB</p>' +
      '<div class="load-bar-outer" style="height:15px;margin:10px 0;width:100%;background:#fff;border:1px solid #888;overflow:hidden">' +
      '<div class="load-bar-inner" id="dl-bar" style="width:0%;height:100%;background:linear-gradient(180deg,#4488cc,#336699)"></div>' +
      '</div>' +
      '<p id="dl-stats" style="font-size:9px;color:#888">Estimated time: 47 years 12 days...</p>' +
      '<p id="dl-msg" style="font-size:10px;margin-top:5px;font-style:italic">Connecting to mirrors...</p>' +
      '</div>',
      { title: '📦 Heavy Download — ' + gb + 'GB', autoClose: 0 }
    );

    const bar = popup.querySelector('#dl-bar');
    const stats = popup.querySelector('#dl-stats');
    const msg = popup.querySelector('#dl-msg');
    let pct = 0;
    const totalSize = parseFloat(gb) * 1024; // in MB
    const startTime = Date.now();
    let canFinish = Math.random() < 0.3;

    // Force failure if fragment already discovered
    const currentState = stateManager.load();
    if (currentState.cluesFound.indexOf('heavy_download_fragment') !== -1) {
      canFinish = false;
    }

    const statusMsgs = [
      'Requesting chunk 0x',
      'Packet loss detected. Retrying...',
      'Waiting for peer response...',
      'Compressing ' + gb + 'GB into ' + (parseFloat(gb) + 0.1).toFixed(1) + 'GB...',
      'Verifying checksum (failed)...',
      'Allocating local storage...',
      'Bypassing firewall...',
      'Optimizing bitstream...'
    ];

    const iv = setInterval(() => {
      // Window was closed by user
      if (!popup.parentNode) { clearInterval(iv); return; }

      const elapsed = (Date.now() - startTime) / 1000;

      // 20-second timeout for forced failure → BSOD
      if (!canFinish && elapsed >= 20) {
        clearInterval(iv);
        popup.remove();
        WindowManager.create(
          '<iframe src="bsod.html" style="width:500px;height:400px;border:none;overflow:hidden"></iframe>',
          { title: '🛑 FATAL EXCEPTION', autoClose: 0 }
        );
        return;
      }

      // Reach exactly 99% at the 15-second mark
      if (elapsed < 15) {
        pct = (elapsed / 15) * 99;
      } else {
        pct = canFinish ? 100 : 99;
      }
      bar.style.width = pct + '%';

      // Successful completion
      if (pct >= 100) {
        clearInterval(iv);
        stats.textContent = 'Complete.';
        msg.textContent = 'Fragment extracted.';
        setTimeout(() => {
          popup.remove();
          WindowManager.create(
            '<div style="background:#000;color:#0f0;padding:10px;text-align:center">Fragment: <b>cmFuZHkg</b></div>',
            { title: 'Fragmented Identity' }
          );
          stateManager.addClue('heavy_download_fragment');
        }, 1000);
        return;
      }

      // Random status messages
      if (Math.random() > 0.8) {
        const m = statusMsgs[Math.floor(Math.random() * statusMsgs.length)];
        msg.textContent = m === statusMsgs[0]
          ? m + Math.floor(Math.random() * 9999).toString(16) + '...'
          : m;
      }
      stats.textContent = 'Downloaded: ' + Integrity.formatBytes(pct * totalSize / 100) +
        ' / ' + Integrity.formatBytes(totalSize) + ' (' + pct.toFixed(2) + '%)';
    }, 1000);
  },

  /**
   * Trigger a Blue Screen of Death popup.
   */
  blueScreen() {
    WindowManager.create(
      '<div class="bsod-body">' +
      '<div class="bsod-text">A problem has been detected and windows has been shut down to prevent damage to your computer.</div>' +
      '<div class="bsod-text">ERROR_DOWNLOAD_TIMEOUT_EXCEEDED_BY_USER4</div>' +
      '<div class="bsod-text">SYSTEM ERROR: Stack overflow at 0x8840A110.<br>The download has been aborted to protect system integrity.</div>' +
      '<div class="bsod-text" style="font-weight:bold">CRC_MISMATCH_IN_BUFFER_0xDEADBEEF</div>' +
      '<div class="bsod-text">Fragment collision detected in memory buffer.</div>' +
      '<div class="bsod-text" style="word-break:break-all">Stack: 0x0045F2 0x000000 0xDEADBEEF 0x000001 0x000000 0x0045F2 0x000000 0xDEADBEEF 0x000001 0x000000 0x0045F2 0x000000 0xDEADBEEF 0x000001 0x000000</div>' +
      '<div style="text-align:center"><button class="bsod-btn" onclick="this.closest(\'.win-popup\').remove()">REBOOT</button></div>' +
      '</div>',
      { title: '🛑 FATAL EXCEPTION', autoClose: 0 }
    );
  },

  /**
   * 5-layer nesting doll security bypass sequence.
   * @param {Function} [callback] - Called after all layers are bypassed
   */
  nestingDolls(callback) {
    let remaining = 5;
    function nextDoll() {
      if (remaining <= 0) {
        if (callback) callback();
        return;
      }
      const popup = WindowManager.create(
        '<div style="text-align:center;padding:15px">' +
        '<p style="font-size:14px;color:red;margin-bottom:10px">SECURITY LAYER ' + remaining + '</p>' +
        '<button class="doll-btn">BYPASS</button></div>',
        { title: '🔒 SYSTEM LOCK', autoClose: 0 }
      );
      const closeDoll = () => { popup.remove(); remaining--; nextDoll(); };
      popup.querySelector('.win-x').onclick = closeDoll;
      popup.querySelector('.doll-btn').onclick = closeDoll;
    }
    nextDoll();
  },

  /**
   * PHP user search handler.
   * Discovers a clue if the query matches the architect's identity.
   * @param {string} query - Search query
   */
  searchUser(query) {
    if (query && (query.toLowerCase() === 'randy' || query.toLowerCase() === 'render')) {
      stateManager.addClue('php_name_fragment');
      WindowManager.create(
        '<p style="color:#0f0">Matches found: 1<br>ID: user4<br>Status: FRAGMENTED IDENTITY</p>',
        { title: 'PHP Search Result' }
      );
    }
  },

  /**
   * SQL row click handler.
   * Discovers a clue if the row data references the architect.
   * @param {string|number} rowId - The row identifier
   * @param {string} data - The row content
   */
  sqlRowClick(rowId, data) {
    if (data && (data.toLowerCase().includes('randy') || data.toLowerCase().includes('render'))) {
      stateManager.addClue('sql_name_fragment');
      WindowManager.create(
        '<p style="color:#0f0">Row ' + rowId + ' decrypted.<br>Content: Fragment [' + data + ']</p>',
        { title: 'SQL Row Decrypted' }
      );
    }
  },

  /**
   * Spawn the AI Chat Assistant.
   * Enforces single-instance behavior.
   */
  chatAssistant() {
    return new Interactions.AIChatAssistant();
  },

  /**
   * AIChatAssistant class
   * Handles the AI Assistant chat interface and logic.
   */
  AIChatAssistant: class AIChatAssistant {
    static #instance = null;
    static #templates = null;
    #popup = null;
    #isLoading = false;

    constructor() {
      if (AIChatAssistant.#instance) {
        AIChatAssistant.#instance.focus();
        return AIChatAssistant.#instance;
      }
      AIChatAssistant.#instance = this;
      this.#init();
    }

    async #init() {
      if (!AIChatAssistant.#templates) {
        try {
          const response = await fetch('ai-chat-assets.html');
          const html = await response.text();
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          AIChatAssistant.#templates = {
            main: doc.querySelector('.ai-chat-container').outerHTML,
            typing: doc.querySelector('.ai-typing').outerHTML,
            error: doc.querySelector('.ai-error').outerHTML
          };
        } catch (e) {
          console.error('AI Assistant: Failed to load assets.', e);
          return;
        }
      }
      this.render();
    }

    focus() {
      if (this.#popup && this.#popup.parentNode) {
        this.#popup.style.zIndex = WindowManager.nextZIndex();
      }
    }

    render() {
      if (!AIChatAssistant.#templates) return;

      this.#popup = WindowManager.create(AIChatAssistant.#templates.main, {
        title: 'Neural Interface v4.0.2',
        cls: 'ai-chat-popup'
      });
      this.#popup.id = 'p3-ai-chat-win';

      const input = this.#popup.querySelector('.ai-chat-input');
      const sendBtn = this.#popup.querySelector('.ai-send-btn');

      if (sendBtn) sendBtn.onclick = () => this.handleSend();
      if (input) input.onkeydown = (e) => { if (e.key === 'Enter') this.handleSend(); };

      stateManager.update('aiChatOpened', true);

      const closeBtn = this.#popup.querySelector('.win-x');
      if (closeBtn) {
        const originalClose = closeBtn.onclick;
        closeBtn.onclick = () => {
          AIChatAssistant.#instance = null;
          if (originalClose) originalClose.call(closeBtn);
          else this.#popup.remove();
        };
      }
    }

    handleSend() {
      if (this.#isLoading) return;
      const input = this.#popup.querySelector('.ai-chat-input');
      const text = input ? input.value.trim() : '';
      if (!text) return;

      this.addMessage('User', text);
      input.value = '';
      this.setLoading(true);

      setTimeout(() => {
        this.setLoading(false);
        this.triggerCrash();
      }, 2000 + Math.random() * 1000);
    }

    addMessage(sender, text) {
      if (!this.#popup || !this.#popup.parentNode) return;
      const log = this.#popup.querySelector('.ai-chat-messages');
      if (!log) return;
      
      const msg = document.createElement('div');
      msg.className = 'ai-message ' + (sender === 'User' ? 'user' : 'bot');
      msg.innerHTML = text;
      log.appendChild(msg);
      log.scrollTop = log.scrollHeight;
    }

    setLoading(loading) {
      this.#isLoading = loading;
      if (!this.#popup || !this.#popup.parentNode) return;
      const log = this.#popup.querySelector('.ai-chat-messages');
      if (!log) return;

      if (loading) {
        const typingContainer = document.createElement('div');
        typingContainer.innerHTML = AIChatAssistant.#templates.typing;
        const typingEl = typingContainer.firstChild;
        typingEl.id = 'ai-typing-indicator';
        log.appendChild(typingEl);
        log.scrollTop = log.scrollHeight;
      } else {
        const typingEl = log.querySelector('#ai-typing-indicator');
        if (typingEl) typingEl.remove();
      }

      const input = this.#popup.querySelector('.ai-chat-input');
      const sendBtn = this.#popup.querySelector('.ai-send-btn');
      if (input) input.disabled = loading;
      if (sendBtn) sendBtn.disabled = loading;
    }

    triggerCrash() {
      if (!this.#popup || !this.#popup.parentNode) return;
      const log = this.#popup.querySelector('.ai-chat-messages');
      if (!log) return;

      const errorContainer = document.createElement('div');
      errorContainer.innerHTML = AIChatAssistant.#templates.error;
      log.appendChild(errorContainer.firstChild);
      log.scrollTop = log.scrollHeight;

      setTimeout(() => {
        const crashSteps = [
          'Attempting emergency buffer flush...',
          'Unauthorized identity probe detected.',
          'WARNING: user4_credentials leakage...',
          'Connection terminated by remote host.',
          'FATAL: Assistant service is now offline.'
        ];
        let i = 0;
        const iv = setInterval(() => {
          if (!this.#popup || !this.#popup.parentNode) {
            clearInterval(iv);
            return;
          }
          if (i >= crashSteps.length) {
            clearInterval(iv);
            this.finalizeCrash();
            return;
          }
          this.addMessage('SYSTEM', '<span style="color:#600;">' + crashSteps[i] + '</span>');
          i++;
        }, 600);
      }, 800);
    }

    finalizeCrash() {
      if (!this.#popup || !this.#popup.parentNode) return;
      this.#popup.classList.add('corrupted');
      const titleEl = this.#popup.querySelector('.win-title');
      if (titleEl) titleEl.textContent = '⚠ API LIMIT REACHED ⚠';
      
      const input = this.#popup.querySelector('.ai-chat-input');
      const sendBtn = this.#popup.querySelector('.ai-send-btn');
      if (input) {
        input.placeholder = 'OFFLINE';
        input.disabled = true;
      }
      if (sendBtn) sendBtn.disabled = true;
      
      stateManager.update('aiChatCrashed', true);
      stateManager.addClue('ai_crash_fragment');
    }
  }
};


// -------------------------------------------
// MODULE: GameLogic
// Replaces: logicLoop, checkRootUnlock,
//           isItRight, submitAnswer, endGameNow,
//           showMasterCredentialsModal
// -------------------------------------------

const GameLogic = {
  // --- ARCHITECT'S NOTE (DO NOT DELETE) ---
  // Verified: No memory leak detected in current validator.
  // The architect's name remains protected by base64 obfuscation.
  // ----------------------------------------
  _ENCODED_ANSWER: 'cmFuZHkgcmVuZGVy',

  /**
   * Main game loop — processes zone-specific UI mutations,
   * environmental effects, and state-driven triggers.
   * Called from each page's inline script after doTheThing().
   *
   * NOTE: Calls window.checkRootUnlock() (not the internal method)
   * because server-root.html overrides it at runtime.
   *
   * @param {string} zone - The current zone identifier
   */
  processZone(zone) {
    const state = stateManager.load();

    // Kitsch spam pop-ups (60% chance, random delay)
    if (Math.random() > 0.4) {
      setTimeout(() => Interactions.ads(), 2000 + Math.random() * 5000);
    }

    // Progressive CSS degradation based on clue progress
    const level = state.cluesFound.length;
    document.documentElement.style.setProperty('--degrade-gap', (level * 2) + 'px');
    document.documentElement.style.setProperty('--degrade-opacity', Math.max(0.4, 1 - (level * 0.05)));

    // Ghost mutters and chaos overlay (level > 4)
    if (level > 4) {
      const chaosOverlay = document.querySelector('.chaos-overlay');
      if (chaosOverlay && chaosOverlay.style.display !== 'block') {
        chaosOverlay.style.display = 'block';
        if (!window._flicker) {
          window._flicker = setInterval(() => VisualEffects.flicker(), 150);
        }
      }

      // Random ghost text fragments
      if (Math.random() > 0.95) {
        const fragments = ['R...', 'Ran...', '...der', 'cmFuZHkg', 'cmVuZGVy', 'user4=Randy?'];
        const ghostMsg = fragments[Math.floor(Math.random() * fragments.length)];
        const el = document.createElement('div');
        el.style.cssText =
          'position:fixed;top:' + (Math.random() * 90) + 'vh;left:' + (Math.random() * 90) + 'vw;' +
          'color:#fff;background:#000;font-family:monospace;font-size:14px;padding:4px;' +
          'z-index:99999;pointer-events:none;';
        el.textContent = ghostMsg;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 800);
      }
    }

    // Aggressive background colors (level > 2)
    if (level > 2) {
      if (zone === 'home') {
        document.body.style.background = 'rgb(255, 255, ' + Math.max(0, 255 - level * 20) + ')';
      }
      if (zone === 'sql') {
        document.body.style.background = 'rgb(' + (255 - level * 5) + ', 255, ' + (255 - level * 5) + ')';
      }
    }

    // Paranoia state — buttons flee on hover, nav fades
    if (state.serverRootUnlocked || state.sqlDeepAccess) {
      document.querySelectorAll('.scattered-btn, .useless-btn').forEach((btn) => {
        if (!btn.dataset.paranoid) {
          btn.dataset.paranoid = '1';
          btn.addEventListener('mouseenter', () => {
            if (Math.random() > 0.7) {
              btn.style.position = 'fixed';
              btn.style.left = Math.random() * 80 + 'vw';
              btn.style.top = Math.random() * 80 + 'vh';
            }
          });
        }
      });

      const menu = document.querySelector('.home-broken-menu');
      if (menu) {
        menu.style.opacity = document.documentElement.style.getPropertyValue('--degrade-opacity');
      }
    }

    // Marquee mutation after 2+ zones visited
    if (state.visitedZones.length >= 2) {
      const marquee = document.querySelector('.hero-marquee');
      if (marquee && !marquee.dataset.changed) {
        marquee.innerHTML = '\u26A0\uFE0F SOMEONE IS BROWSING... \u26A0\uFE0F';
        marquee.style.color = '#ff0000';
        marquee.dataset.changed = '1';
      }
    }

    // "STOP LOOKING" warning after 3+ clues on home page
    if (state.cluesFound.length >= 3 && zone === 'home') {
      if (!sessionStorage.getItem('p3_stop')) {
        setTimeout(() => {
          WindowManager.create(
            '<p style="color:red;font-size:28px;font-family:Impact;text-align:center;margin:20px">STOP LOOKING</p>',
            { title: '\u26A0\uFE0F SYSTEM WARNING' }
          );
          sessionStorage.setItem('p3_stop', '1');
        }, 3000);
      }
    }

    // SQL deep access makes PHP warnings more alarming
    if (state.sqlDeepAccess && zone === 'php') {
      document.querySelectorAll('.php-warn').forEach((el) => {
        el.style.color = '#ff0000';
        el.style.fontSize = '1.1em';
      });
    }

    // Quiet mode when server root is unlocked
    if (state.serverRootUnlocked) {
      document.body.classList.add('quiet-mode');
    }

    // Check server root unlock conditions
    // MUST call through window.* to allow server-root.html override
    window.checkRootUnlock();

    // Desktop pet trigger (2+ zones or 15s on home)
    if (!window._petTriggered) {
      if (!state.serverRootUnlocked || zone === 'server-root') {
        if (state.visitedZones.length >= 2) {
          window._petTriggered = true;
          Interactions.pet();
        } else if (zone === 'home') {
          window._petTriggered = true;
          setTimeout(() => {
            if (!document.getElementById('p3-pet-win')) {
              Interactions.pet();
            }
          }, 15000);
        }
      }
    }
  },

  /**
   * Check if the server root should be unlockable.
   * Shows credentials popup if SQL + PHP sectors are fully explored.
   * NOTE: This function is overridden by server-root.html.
   *       DO NOT call directly — use window.checkRootUnlock().
   */
  checkUnlockConditions() {
    const state = stateManager.load();
    if (!state.sqlDeepAccess || !state.phpArchitectSearched || state.serverRootUnlocked) return;

    if (!sessionStorage.getItem('p3_root_creds_shown')) {
      sessionStorage.setItem('p3_root_creds_shown', '1');
      WindowManager.create(
        '<div style="text-align:center;padding:15px">' +
        '<p style="color:#0f0;font-family:monospace;font-size:12px;margin-bottom:10px">SERVER ACCESS GRANTED</p>' +
        '<p style="font-size:10px;color:#ccc">Credentials for /server-root/ bypass:</p>' +
        '<p style="font-size:14px;color:#fff;margin:10px 0;background:#333;padding:5px"><b>USER: admin<br>PASS: flexbox</b></p>' +
        '<p style="font-size:9px;color:#888">Use the login form on the server root page.</p>' +
        '</div>',
        { title: '🔑 SYSTEM OVERRIDE' }
      );
    }
  },

  /**
   * Verify the submitted answer against the encoded architect identity.
   * @param {string} input - The user's answer
   * @returns {boolean} True if correct
   */
  verifyAnswer(input) {
    const normalized = input.trim().toLowerCase();
    return btoa(unescape(encodeURIComponent(normalized))) === this._ENCODED_ANSWER;
  },

  /**
   * Handle answer form submission on report.html.
   * Triggers endgame on correct answer, shows hints on incorrect.
   */
  handleSubmission() {
    const input = document.getElementById('answer-input');
    const result = document.getElementById('result');
    if (!input) return;

    const val = input.value;
    if (!val || val.trim() === '') return;

    const state = stateManager.load();
    if (this.verifyAnswer(val)) {
      this.triggerEndgame();
    } else {
      state.countMe = (state.countMe || 0) + 1;
      stateManager.save(state);
      if (result) {
        result.style.display = 'block';
        result.textContent = 'Incorrect. Hint #' + state.countMe + ': The creator is hiding in the details.';
      }
      input.value = '';
      input.focus();
    }
  },

  /**
   * End the game — display the final "You found me." overlay.
   * Disables all interactive elements.
   */
  triggerEndgame() {
    stateManager.update('gameCompleted', true);

    const overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;top:0;left:0;width:100vw;height:100vh;' +
      'background:#fff;z-index:999999999;display:flex;flex-direction:column;' +
      'align-items:center;justify-content:center;font-family:Georgia,serif;color:#333;' +
      'opacity:0;transition:opacity 3s ease';

    overlay.innerHTML =
      '<h1 style="font-size:48px;font-weight:300;margin-bottom:20px">You found me.</h1>' +
      '<p style="font-size:24px;color:#666;font-style:italic">\u2014 user4</p>';

    document.body.appendChild(overlay);
    setTimeout(() => { overlay.style.opacity = '1'; }, 100);

    document.querySelectorAll('button, a, input').forEach((el) => {
      el.style.pointerEvents = 'none';
    });
  },

  /**
   * Show the Master Credentials Found modal.
   * @param {Function} onDecrypt - Callback invoked when user clicks DECRYPT
   */
  showCredentialsModal(onDecrypt) {
    const modalContent =
      '<div style="background: #c0c0c0; color: #000; padding: 10px;">' +
      '<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">' +
      '<img src="img/spiderman-png.png" alt="System Icon" style="width: 32px; height: 32px; filter: grayscale(100%);">' +
      '<strong>Master Credentials Found!</strong>' +
      '</div>' +
      '<p style="font-size: 11px; margin-bottom: 10px;">The system has identified valid ARCHITECT credentials in the session buffer. Do you wish to proceed with full decryption?</p>' +
      '<div style="background: #000; color: #0f0; padding: 5px; font-family: monospace; font-size: 10px; border: 1px inset #fff; margin-bottom: 15px;">' +
      'TARGET: user4_logs.crypt<br>' +
      'STATUS: READY_FOR_DECRYPTION' +
      '</div>' +
      '<div style="text-align: center; display: flex; gap: 5px; justify-content: center;">' +
      '<button class="java-btn" id="decrypt-btn" style="flex: 1;">DECRYPT</button>' +
      '<button class="java-btn" id="abort-btn" style="flex: 1;">ABORT</button>' +
      '</div></div>';

    const win = WindowManager.create(modalContent, { title: 'System Alert' });
    win.querySelector('#decrypt-btn').onclick = () => { win.remove(); onDecrypt(); };
    win.querySelector('#abort-btn').onclick = () => { win.remove(); };
  }
};


// -------------------------------------------
// MODULE: Storytelling
// Replaces: systemMutter, flexboxAdvice,
//           triggerMergeConflict, _sysMessages
// "The site speaks to those who listen."
// -------------------------------------------

const Storytelling = {
  _messages: [
    'ERROR: too much CSS',
    'Loading innovation...',
    'Warning: z-index overflow at layer 2147483647',
    'Notice: style.css exceeds recommended line count (by 400%)',
    'Compiling regret...',
    'Fatal: cannot resolve merge conflict in identity.html',
    'Loading innovation... failed. Retrying with more CSS.',
    'Warning: developer has mass-renamed 14 files today',
    'Notice: backup_backup_backup.zip is 0 bytes',
    'ACCESS_LOG: unauthorized identity probe detected',
    'SYSTEM_ERR: CORE_RESISTANCE_DETECTED',
    'SECURITY_ALERT: ARCHITECT_HASH_MISMATCH'
  ],

  _flexboxShown: false,
  _mergeConflictTriggered: false,

  /**
   * Show a random system message as a small terminal-style toast.
   * Only triggers if the player has visited 2+ zones.
   */
  mutter() {
    const state = stateManager.load();
    if (state.visitedZones.length < 2) return;

    const msg = this._messages[Math.floor(Math.random() * this._messages.length)];
    const el = document.createElement('div');
    el.style.cssText =
      'position:fixed;bottom:45px;left:10px;background:#000;color:#0f0;' +
      'font-family:"Courier New",monospace;font-size:11px;padding:6px 12px;' +
      'border:1px solid #0a0;z-index:9500;opacity:0;transition:opacity 0.5s;' +
      'pointer-events:none;max-width:400px;';
    el.textContent = '> ' + msg;
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0.85'; }, 100);
    setTimeout(() => { el.style.opacity = '0'; }, 4500);
    setTimeout(() => { el.remove(); }, 5200);
  },

  /**
   * "Have you tried flexbox?" — breaks the layout, then shows the popup.
   * Fixes the layout when the popup is closed. One-shot.
   */
  flexboxPopup() {
    if (this._flexboxShown) return;
    this._flexboxShown = true;

    const content = document.querySelector('.home-content, .sql-content, .php-content, .java-content');
    if (content) {
      content.style.transition = 'all 0.4s';
      content.style.transform = 'skewX(-8deg) translateY(30px)';
      content.style.opacity = '0.7';
    }

    setTimeout(() => {
      const popup = WindowManager.create(
        '<div style="text-align:center;padding:20px">' +
        '<p style="font-size:24px;font-family:Impact;color:#000080;margin-bottom:15px">Have you tried flexbox?</p>' +
        '<p style="font-size:11px;color:#888">This layout tip was brought to you by modern web standards.</p>' +
        '<p style="font-size:9px;color:#aaa;margin-top:10px">The site was built in 2001. Flexbox didn\'t exist yet.</p>' +
        '<p style="font-size:8px;color:#ccc;margin-top:5px">But maybe it should have waited.</p>' +
        '</div>',
        { title: '💡 Helpful CSS Advice', x: 150, y: 100 }
      );

      popup.querySelector('.win-x').onclick = () => {
        if (content) {
          content.style.transform = '';
          content.style.opacity = '';
        }
        popup.remove();
      };
    }, 800);
  },

  /**
   * Full-screen merge conflict overlay.
   * Click to dismiss and discover a clue. One-shot.
   */
  mergeConflict() {
    if (this._mergeConflictTriggered) return;
    this._mergeConflictTriggered = true;
    sessionStorage.setItem('p3_merge', '1');

    const overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;top:0;left:0;width:100vw;height:100vh;' +
      'background:rgba(0,0,0,0.9);z-index:99998;display:flex;flex-direction:column;' +
      'align-items:center;justify-content:center;font-family:"Courier New",monospace;color:#f00;' +
      'cursor:pointer;';
    overlay.innerHTML =
      '<div style="text-align:center;max-width:600px;padding:40px">' +
      '<h1 style="font-size:36px;animation:blink 0.5s infinite;margin-bottom:20px">⚠ MERGE CONFLICT ⚠</h1>' +
      '<div style="text-align:left;font-size:12px;color:#ff6;line-height:1.8;margin:20px 0">' +
      '&lt;&lt;&lt;&lt;&lt;&lt; HEAD (home/index.html)<br>' +
      '&nbsp;&nbsp;creator = "unknown";<br>' +
      '=======<br>' +
      '&nbsp;&nbsp;creator = "user4";<br>' +
      '&gt;&gt;&gt;&gt;&gt;&gt; branch: dont_touch_pls<br>' +
      '</div>' +
      '<p style="color:#888;font-size:11px">Conflicting identity records detected across sections.</p>' +
      '<p style="color:#555;font-size:10px;margin-top:15px">Click anywhere to resolve conflict.</p>' +
      '<p style="color:#333;font-size:9px;margin-top:30px">commit: "small changes" — user4, 2003-03-14 23:58</p>' +
      '</div>';

    overlay.addEventListener('click', () => {
      overlay.style.transition = 'opacity 1s';
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 1100);
      stateManager.addClue('merge_conflict');
    });

    document.body.appendChild(overlay);
  },

  /**
   * Schedule environmental storytelling events.
   * Called once from the DOMContentLoaded bootstrap.
   * @param {Object} state - The current game state
   */
  scheduleRandom(state) {
    // Random system mutters
    setTimeout(() => Storytelling.mutter(), 8000 + Math.random() * 12000);
    setInterval(() => {
      if (Math.random() < 0.3) Storytelling.mutter();
    }, 25000);

    // Flexbox popup after visiting 3+ zones
    if (state.visitedZones.length >= 3 && !sessionStorage.getItem('p3_flexbox')) {
      setTimeout(() => {
        Storytelling.flexboxPopup();
        sessionStorage.setItem('p3_flexbox', '1');
      }, 6000 + Math.random() * 8000);
    }

    // Merge conflict after both SQL and PHP deep access
    if (state.sqlDeepAccess && state.phpArchitectSearched && !sessionStorage.getItem('p3_merge')) {
      setTimeout(() => Storytelling.mergeConflict(), 2000);
    }
  }
};


// =============================================
// LAYER 3: APPLICATION BOOTSTRAP
// Runs when the DOM is ready. Initializes all
// subsystems and schedules environmental events.
// =============================================

document.addEventListener('DOMContentLoaded', () => {
  // Run integrity check
  Integrity.verify();

  // Start fake MIDI player
  AudioSim.initMidiPlayer();

  // Initialize legacy flags and counters
  stateManager.clueFlag = true;
  window.f7 = true;
  window.mm = true;
  window.hh = false;
  window.vv = false;
  window.ctr++;
  window.pp++;
  window.ll = 'initialized at ' + Date.now();
  window.gg = 'ready';

  // Schedule environmental storytelling
  const state = stateManager.load();
  Storytelling.scheduleRandom(state);

  // Listen for BSOD iframe reboot messages
  window.addEventListener('message', (e) => {
    if (e.data === 'close-bsod') {
      document.querySelectorAll('.win-popup').forEach((popup) => {
        const iframe = popup.querySelector('iframe');
        if (iframe && iframe.src.indexOf('bsod.html') !== -1) {
          popup.remove();
        }
      });
    }
  });
});


// =============================================
// LAYER 4: LEGACY GLOBAL ADAPTER
// Maps the clean internal architecture to the
// exact global names expected by inline HTML scripts.
// =============================================
// DO NOT RENAME. DO NOT REMOVE. DO NOT FREEZE.
// The HTML files depend on these exact names.
// =============================================

// --- State API ---
window.getDataX       = () => stateManager.load();
window.putDataY       = (a) => stateManager.save(a);
window.nukeIt         = () => stateManager.reset();

// --- Game API ---
window.doTheThing     = (a) => stateManager.visitZone(a);
window.logicLoop      = (a) => GameLogic.processZone(a);
window.getBonus       = (a) => stateManager.addClue(a);
window.toggleBit      = (a, v) => stateManager.update(a, v);
window.submitAnswer   = () => GameLogic.handleSubmission();

// --- Window API ---
window.windowMaker6000 = (a, o) => WindowManager.create(a, o);
window.popup           = (a, o) => WindowManager.create(a, o);
window.floaty          = (el) => WindowManager.makeDraggable(el);

// --- Interaction API ---
window.heavyDownload       = (t, s) => Interactions.download(t, s);
window.spawnAIChatAssistant = () => Interactions.chatAssistant();
window.spawnNestingDolls   = (cb) => Interactions.nestingDolls(cb);
window.sparkle             = () => VisualEffects.flash();
window.triggerBSOD         = () => Interactions.blueScreen();

// --- Overridable functions ---
// server-root.html overrides checkRootUnlock at runtime.
// DO NOT seal or freeze these assignments.
window.checkRootUnlock            = () => GameLogic.checkUnlockConditions();
window.attemptServerRoot          = () => { window.location.href = 'server-root.html'; };
window.showMasterCredentialsModal = (cb) => GameLogic.showCredentialsModal(cb);
window.searchUser                 = (q) => Interactions.searchUser(q);
window.sqlRowClick                = (id, data) => Interactions.sqlRowClick(id, data);

// --- Internal-only functions (exposed for console debugging) ---
window.isItRight         = (a) => GameLogic.verifyAnswer(a);
window.slowText          = (a, t, s) => VisualEffects.typewrite(a, t, s);
window.noise             = () => AudioSim.initMidiPlayer();
window.spawnDesktopPet   = (angry) => Interactions.pet(angry);
window.spamAds           = () => Interactions.ads();
window.endGameNow        = () => GameLogic.triggerEndgame();
window.fakeLoad          = () => VisualEffects.fakeBootSequence();
window.ghostFlicker      = () => VisualEffects.flicker();
window.checkIntegrity    = () => Integrity.verify();
window.formatBytes       = (mb) => Integrity.formatBytes(mb);
window.systemMutter      = () => Storytelling.mutter();
window.flexboxAdvice     = () => Storytelling.flexboxPopup();
window.triggerMergeConflict = () => Storytelling.mergeConflict();
window.upOne             = () => WindowManager.nextZIndex();

// --- Legacy variables (exposed for backward compatibility) ---
// No HTML files reference these directly, but they are
// exposed for console access and defensive compatibility.
window.sv   = null;
window.f7   = false;
window.ctr  = 0;
window.buf  = [];
window.q    = 'project3_state';
window.b    = stateManager.defaults;
window.M    = 42;        // the answer to everything
window.tk   = 'abc123';  // session token for database layer
window.rq   = [];        // render queue for animation frames
window.zz   = null;      // sleep timer reference
window.pp   = 0;         // pixel counter
window.gg   = 'init';    // global state string
window.hh   = false;     // hover flag
window.jj   = [];        // junction array
window.kk   = 0;         // kill counter
window.ll   = '';        // log buffer
window.mm   = true;      // master mode
window.nn   = 0.5;       // noise level
window.oo   = {};        // options cache
window.qq   = [];        // query results
window.rr2  = '';        // reserved register 2
window.ss   = 1;         // scale factor
window.tt   = Date.now(); // timestamp
window.uu   = [];        // undo stack
window.vv   = false;     // verbose mode
window.ww   = 0;         // widget counter
window.xx   = null;      // xml parser
window.yy   = '';        // yaml buffer
window.z9   = 0;         // z-index base
window._z   = 1000;      // z-index counter
window.d1   = false;     // drag flag


// =============================================
// DEAD CODE CEMETERY
// =============================================
// EVERYTHING BELOW IS DEAD
// DO NOT REVIVE
// CRITICAL FOR IE6 COMPATIBILITY
// ALSO CRITICAL FOR NETSCAPE 4.0
// AND MAYBE OPERA 7
const oldHandler = () => null;
const debugMode = () => console.log('debug');
const debugMode2 = () => console.log('debug2');
const debugMode3 = () => console.log('debug3');

const SECRET_KEY = 'not_a_real_key_12345';
const ADMIN_PASS = 'password123';
const BACKUP_PASS = 'letmein';
const EMERGENCY_CODE = '1234';

const _legacy_auth = (u, p) => u === 'admin' && p === ADMIN_PASS;

const unusedHelper = () => {
  const x = 10;
  const y = 20;
  return x + y;
};

const anotherUnusedHelper = () => {
  const a = 'hello';
  const b2 = 'world';
  return a + ' ' + b2;
};

const uselessCalculation = () => {
  let result = 0;
  for (let i = 0; i < 100; i++) {
    result += i;
  }
  return result;
};

const deadValidator = (input) => {
  if (input && typeof input === 'string' && input.length > 0 && input.length < 1000) {
    return true;
  }
  return false;
};
// FAKE DECRYPTION KEY: RG91ZyBKb25lcw== (decodes to "Doug Jones" - THIS IS WRONG)
// FAKE ADMIN BACKDOOR: dXNlcjQ= (user4, but the NAME is what matters)
// RED HERRING: U3RldmUgUGl4ZWw= (Steve Pixel - WRONG ANSWER)
