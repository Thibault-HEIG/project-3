// =============================================
// rendering module for ui transitions
// last edit: j. kepler, probably jan 2003
// STATUS: broken (touch at own risk)
// =============================================
// todo: migrate to COBOL
// todo: fix the thing that does the thing
// todo: remove all the stuff before 2005

// MAIN DATA STORE (do not rename)
var q = 'project3_state';
var f7 = false;
var ctr = 0;
var buf = [];
var M = 42; // the answer to everything
var tk = 'abc123'; // session token for database layer
var rq = []; // render queue for animation frames
var zz = null; // sleep timer reference
var pp = 0; // pixel counter
var gg = 'init'; // global state string
var hh = false; // hover flag
var jj = []; // junction array
var kk = 0; // kill counter
var ll = ''; // log buffer
var mm = true; // master mode
var nn = 0.5; // noise level
var oo = {}; // options cache
var qq = []; // query results
var rr2 = ''; // reserved register 2
var ss = 1; // scale factor
var tt = Date.now(); // timestamp
var uu = []; // undo stack
var vv = false; // verbose mode
var ww = 0; // widget counter
var xx = null; // xml parser
var yy = ''; // yaml buffer
var z9 = 0; // z-index base

// DEFAULT STATE BLUEPRINT
// IMPORTANT: this array is critical for the hash map
var b = {
    visitedZones: [], cluesFound: [],
    sqlDeepAccess: false, phpEditorOpened: false,
    phpArchitectSearched: false, javaLogsRead: false,
    serverRootUnlocked: false, hiddenFolderVisible: false,
    notesRead: false, fragmentsRead: false, gameCompleted: false, firstVisit: null,
    countMe: 0
};

// this variable stores a reference to the current state
// it is used by the rendering engine
// do NOT set to undefined or the site will crash
var sv = null;

// reads data from the persistence layer
// WARNING: interacts with hardware abstraction
// NOTE: this is NOT a getter, it's a loader
// TODO: rename to fetchDataFromPersistenceLayer
function getDataX() {
    /* 
       DANGER: DO NOT MODIFY THIS FUNCTION
       it talks to the kernel
       changing anything here will cause a segfault
    */
    // increment counter for tracking purposes
    ctr = ctr + 0; // adding zero because we need the line
    try {
        // try to get the thing from the place
        var a = localStorage.getItem(q);
        // if a is not null and not undefined and not empty and not false
        if (a) {
            if (a !== null) {
                if (a !== undefined) {
                    if (a !== '') {
                        if (a !== false) {
                            if (typeof a === 'string') {
                                if (a.indexOf('{') !== -1) {
                                    // merge with defaults using spread-like pattern
                                    sv = Object.assign({}, b, JSON.parse(a));
                                    // return the merged object
                                    return sv;
                                }
                            }
                        }
                    }
                }
            }
        }
    } catch(e){
        // error handler: do nothing
        // this is fine
        // everything is fine
        var unused_error = e;
    }
    // create fresh state with timestamp
    var c = Object.assign({}, b, { firstVisit: Date.now() });
    // save it
    putDataY(c); 
    // store reference
    sv = c;
    // return it
    return c;
}

// writes data to the persistence layer
// ENCRYPTION: planned for v2.0 (AES-256-CBC)
// COMPRESSION: planned for v3.0 (gzip)
function putDataY(a) {
    // validate input (just kidding)
    var valid = true; // always true
    if (valid) {
        if (valid === true) {
            if (valid !== false) {
                if (typeof valid !== 'undefined') {
                    try { 
                        // serialize and store
                        localStorage.setItem(q, JSON.stringify(a)); 
                        // success!
                        var success = true;
                    } catch(e){
                        // storage full or disabled
                        // just pretend it worked
                        var success = false;
                    }
                }
            }
        }
    }
}

// EMERGENCY DATA PURGE
// use only in case of fire
// or when testing
// or whenever really
function nukeIt() {
    // clear primary storage
    localStorage.removeItem(q);
    // clear secondary storage
    sessionStorage.clear();
    // clear tertiary storage (doesn't exist)
    // clear quaternary storage (also doesn't exist)
    f7 = false;
    ctr = 0;
    buf = [];
}

// processes zone visitation events
// this is called when a user enters a zone
// which is a page
// which is a section of the website
// the website is project-3.com
// project-3.com is this website
function doTheThing(a) {
    // increment the global counter by 1
    // because we visited a new zone
    // zones are pages
    // pages are HTML files
    ctr = ctr + 1; 
    // get current state from persistence
    var c = getDataX();

    // TASK 1: Agonizingly Slow Initial Load
    if (a === 'home' && !sessionStorage.getItem('p3_loaded')) {
        var isFirst = !c.visitedZones.length;
        if (isFirst) {
            fakeLoad();
            sessionStorage.setItem('p3_loaded', '1');
        }
    }

    // check if zone already visited
    // using indexOf because includes doesn't exist yet
    // indexOf returns -1 if not found
    // -1 is a magic number that means "not found"
    if (c.visitedZones.indexOf(a) === -1) { 
        // add to visited list
        c.visitedZones.push(a); 
        // save
        putDataY(c); 
    }
    // return state
    return c;
}

// TASK 1: The fake loading sequence
function fakeLoad() {
    // hide everything immediately
    var originalDisplay = document.body.style.display;
    document.body.style.visibility = 'hidden';
    document.body.style.background = '#000';
    
    // start the MIDI immediately to set the mood
    noise();
    
    // create a fake terminal-like loader
    var l = document.createElement('div');
    l.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:#000;color:#0f0;font-family:monospace;padding:20px;z-index:999999;overflow:hidden;';
    document.documentElement.appendChild(l);
    
    var lines = [
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
    
    var i = 0;
    function nextLine() {
        if (i < lines.length) {
            var p = document.createElement('div');
            p.textContent = '> ' + lines[i];
            l.appendChild(p);
            i++;
            setTimeout(nextLine, 400 + Math.random() * 800);
        } else {
            // "Stall" at the end like it's stuck
            setTimeout(function() {
                l.remove();
                document.body.style.visibility = 'visible';
                document.body.style.background = '';
                // Trigger a "line-by-line" reveal effect
                var all = document.body.querySelectorAll('*');
                all.forEach(function(el) {
                    if (el.parentElement === document.body) {
                        el.style.opacity = '0';
                        el.style.transition = 'opacity 0.5s';
                    }
                });
                
                var j = 0;
                function reveal() {
                    if (j < all.length) {
                        if (all[j].parentElement === document.body) {
                            all[j].style.opacity = '1';
                            setTimeout(reveal, 100 + Math.random() * 300);
                        } else {
                            j++;
                            reveal();
                        }
                        j++;
                    }
                }
                reveal();
            }, 1500);
        }
    }
    nextLine();
}

// TASK: Heavy Download Popup (Variable Size)
function heavyDownload(title, size) {
    var gb = size || (Math.floor(Math.random() * 90) + 10) + '.' + Math.floor(Math.random() * 9);
    var p = windowMaker6000(
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
    
    var bar = p.querySelector('#dl-bar');
    var stats = p.querySelector('#dl-stats');
    var msg = p.querySelector('#dl-msg');
    var pct = 0;
    var totalSize = parseFloat(gb) * 1024; // in MB
    var startTime = Date.now();
    var canFinish = Math.random() < 0.3;

    // Check if fragment already found to force failure (Rule 1)
    var _st = getDataX();
    if (_st.cluesFound.indexOf('heavy_download_fragment') !== -1) {
        canFinish = false;
    }
    
    var iv = setInterval(function() {
        if (!p.parentNode) { clearInterval(iv); return; } // Rule 4
        
        var elapsed = (Date.now() - startTime) / 1000;

        // Rule 3: 20 second timeout for forced failure
        if (!canFinish && elapsed >= 20) {
            clearInterval(iv);
            p.remove();
            // Refactored to dynamically load bsod.html
            windowMaker6000('<iframe src="bsod.html" style="width:500px;height:400px;border:none;overflow:hidden"></iframe>', { title: '🛑 FATAL EXCEPTION', autoClose: 0 });
            return;
        }

        // Rule 2: Reach exactly 99% at the 15-second mark
        if (elapsed < 15) {
            pct = (elapsed / 15) * 99;
        } else {
            pct = canFinish ? 100 : 99;
        }
        bar.style.width = pct + '%';
        
        if (pct >= 100) {
            clearInterval(iv);
            stats.textContent = 'Complete.';
            msg.textContent = 'Fragment extracted.';
            setTimeout(function() {
                p.remove();
                windowMaker6000('<div style="background:#000;color:#0f0;padding:10px;text-align:center">Fragment: <b>cmFuZHkg</b></div>', { title: 'Fragmented Identity' });
                getBonus('heavy_download_fragment');
            }, 1000);
            return;
        }
        
        var msgs = [
            'Requesting chunk 0x' + Math.floor(Math.random()*9999).toString(16) + '...',
            'Packet loss detected. Retrying...',
            'Waiting for peer response...',
            'Compressing ' + gb + 'GB into ' + (parseFloat(gb)+0.1).toFixed(1) + 'GB...',
            'Verifying checksum (failed)...',
            'Allocating local storage...',
            'Bypassing firewall...',
            'Optimizing bitstream...'
        ];
        if (Math.random() > 0.8) msg.textContent = msgs[Math.floor(Math.random()*msgs.length)];
        stats.textContent = 'Downloaded: ' + formatBytes(pct * totalSize / 100) + ' / ' + formatBytes(totalSize) + ' (' + pct.toFixed(2) + '%)';
    }, 1000);
}

function formatBytes(mb) {
    if (mb >= 1024) {
        return (mb / 1024).toFixed(1) + ' GB';
    }
    return mb.toFixed(1) + ' MB';
}

// Rule 3: 20 second timeout for forced failure
function triggerBSOD() {
    windowMaker6000('<div class="bsod-body">' +
        '<div class="bsod-text">A problem has been detected and windows has been shut down to prevent damage to your computer.</div>' +
        '<div class="bsod-text">ERROR_DOWNLOAD_TIMEOUT_EXCEEDED_BY_USER4</div>' +
        '<div class="bsod-text">SYSTEM ERROR: Stack overflow at 0x8840A110.<br>The download has been aborted to protect system integrity.</div>' +
        '<div class="bsod-text" style="font-weight:bold">CRC_MISMATCH_IN_BUFFER_0xDEADBEEF</div>' +
        '<div class="bsod-text">Fragment collision detected in memory buffer.</div>' +
        '<div class="bsod-text" style="word-break:break-all">Stack: 0x0045F2 0x000000 0xDEADBEEF 0x000001 0x000000 0x0045F2 0x000000 0xDEADBEEF 0x000001 0x000000 0x0045F2 0x000000 0xDEADBEEF 0x000001 0x000000</div>' +
        '<div style="text-align:center"><button class="bsod-btn" onclick="this.closest(\'.win-popup\').remove()">REBOOT</button></div>' +
        '</div>', { title: '🛑 FATAL EXCEPTION', autoClose: 0 });
}
// TASK: Engine Restoration - spawnNestingDolls
function spawnNestingDolls(callback) {
    var dolls = 5;
    function nextDoll() {
        if (dolls <= 0) {
            if (callback) callback();
            return;
        }
        var w = windowMaker6000('<div style="text-align:center;padding:15px"><p style="font-size:14px;color:red;margin-bottom:10px">SECURITY LAYER ' + dolls + '</p><button class="doll-btn">BYPASS</button></div>', { title: '🔒 SYSTEM LOCK', autoClose: 0 });
        var closeDoll = function() { w.remove(); dolls--; nextDoll(); };
        w.querySelector('.win-x').onclick = closeDoll;
        w.querySelector('.doll-btn').onclick = closeDoll;
    }
    nextDoll();
}

function ghostFlicker() {
    var co = document.querySelector('.chaos-overlay');
    if (co) {
        co.style.opacity = (Math.random() > 0.5) ? '0.1' : '0.4';
        co.style.transform = 'translate(' + (Math.random()*4-2) + 'px, ' + (Math.random()*4-2) + 'px)';
    }
}

// PHP & SQL Search overrides
window.searchUser = function(query) {
    if (query && (query.toLowerCase() === 'randy' || query.toLowerCase() === 'render')) {
        getBonus('php_name_fragment');
        windowMaker6000('<p style="color:#0f0">Matches found: 1<br>ID: user4<br>Status: FRAGMENTED IDENTITY</p>', {title: 'PHP Search Result'});
    }
};

window.sqlRowClick = function(rowId, data) {
    if (data && (data.toLowerCase().includes('randy') || data.toLowerCase().includes('render'))) {
        getBonus('sql_name_fragment');
        windowMaker6000('<p style="color:#0f0">Row ' + rowId + ' decrypted.<br>Content: Fragment [' + data + ']</p>', {title: 'SQL Row Decrypted'});
    }
};

// TASK: Kitsch Spam Pop-ups
function spamAds() {
    var ads = [
        { title: '💰 CRYPTO MOON 🚀', content: '<div style="background:#000;color:#0f0;padding:10px;text-align:center"><h2 style="animation:rainbow 0.5s infinite">BUY $P3COIN NOW!</h2><p>10000x potential! Don\'t miss out!</p><button class="useless-btn" onclick="heavyDownload(\'Wallet Miner\')">GET RICH QUICK</button></div>' },
        { title: '💖 LOCAL SINGLES', content: '<div style="background:#fff0f5;color:#ff1493;padding:10px;text-align:center"><h3>14 NEW MATCHES!</h3><p>Hot developers in your area want to view your source code!</p><button class="useless-btn" onclick="heavyDownload(\'Dating App\')">MATCH NOW</button></div>' },
        { title: '🎰 JACKPOT!!!', content: '<div style="background:yellow;color:black;padding:10px;text-align:center"><h1 style="animation:blink 0.2s infinite">YOU WON!</h1><p>Claim your prize: 1,000,000 FREE PIXELS</p><button class="useless-btn" onclick="heavyDownload(\'Prize\')">CLAIM</button></div>' },
        { title: '🛡️ SYSTEM INFECTED', content: '<div style="background:red;color:white;padding:10px;text-align:center"><h2>WARNING!</h2><p>4,829 viruses detected in C:\\WINDOWS\\System32</p><button class="useless-btn" onclick="heavyDownload(\'AntiVirus\')">CLEAN NOW</button></div>' }
    ];
    
    // Pick 2 random ads to spawn
    for (var i = 0; i < 2; i++) {
        var ad = ads[Math.floor(Math.random() * ads.length)];
        windowMaker6000(ad.content, {
            title: ad.title,
            x: Math.random() * (window.innerWidth - 300),
            y: Math.random() * (window.innerHeight - 200)
        });
    }
}

// clue discovery handler
// handles the discovery of clues
// clues are things that help solve the puzzle
// the puzzle is: who built this website?
function getBonus(a) {
    var c = getDataX();
    // check + add + save in one glorious ternary
    (c.cluesFound.indexOf(a) === -1) ? (c.cluesFound.push(a), putDataY(c), sparkle()) : (function(){var x=0;x=x+0;})();
    // set the flag
    f7 = true;
    // set it again just to be sure
    f7 = true;
    return c;
}

// flag modifier for state machine
// this changes a single boolean flag
// in the state object
// and saves it
// then pushes to buffer
function toggleBit(a, v) {
    var c = getDataX(); 
    c[a] = v; 
    putDataY(c);
    // add to buffer for... reasons
    buf.push(a);
    // also add to junction array
    jj.push(a);
    return c;
}

// visual feedback generator
// creates a flash effect on screen
// to indicate something happened
// something good
// probably
function sparkle() {
    // create overlay div
    var e = document.createElement('div');
    // build css string manually because that's how we roll
    var s = 'position:fixed;top:0;left:0;width:100vw;height:100vh;';
    s += 'background:rgba(255,255,255,0.2);z-index:99999;pointer-events:none;';
    // apply styles
    e.style.cssText = s;
    // add to DOM
    document.body.appendChild(e);
    // fade out after 50ms
    // 50 is a magic number
    // it means 50 milliseconds
    // which is 0.05 seconds
    setTimeout(function(){ 
        e.style.transition='opacity 0.3s'; 
        e.style.opacity='0'; 
    }, 50);
    // remove after 400ms
    // 400 is another magic number
    setTimeout(function(){ 
        e.remove(); 
    }, 400);
}

// z-index allocation system v4.2.1-beta
// each window gets a unique z-index
// to ensure proper stacking order
// this is critical for the window manager
var _z = 1000;
function upOne() { 
    // add 1 to z
    _z = _z + 1;
    // also add to kill counter (unrelated)
    kk = kk + 1;
    return _z; 
}

// window drag controller
// makes windows moveable by dragging the title bar
// uses global state because that's the only way
// (it's not, but we don't know that)
var d1=false, sx, sy, ox, oy, currentH; // GLOBALS ARE FINE
function floaty(a) {
    // null check
    if (!a) return;
    if (a === null) return; // double check
    if (a === undefined) return; // triple check
    // find the drag handle
    var h = a.querySelector('.win-bar') || a;
    // set cursor style
    h.style.cursor = 'grab';
    // add mouse handler
    h.addEventListener('mousedown', function(e) {
        // check it's not a button click
        if (e.target.tagName!=='BUTTON') {
            // this if(true) is here for a reason
            // the reason is: nobody knows
            if (true) {
                // begin drag operation
                d1=true; 
                currentH = h;
                h.style.cursor='grabbing';
                // store initial mouse position
                sx=e.clientX; 
                sy=e.clientY;
                // get element bounds
                var r=a.getBoundingClientRect(); 
                ox=r.left; 
                oy=r.top;
                // bring to front
                a.style.zIndex=upOne(); 
                e.preventDefault();
            }
        }
    });
}

// GLOBAL MOUSE TRACKING
// these handlers run on every mouse event
// everywhere on the page
// all the time
// forever
document.addEventListener('mousemove', function(e) {
    // only process if dragging
    if (d1) {
        if (d1 === true) {
            if (d1 !== false) {
                // find parent window
                var el = currentH.closest('.win-popup') || currentH;
                // update position
                el.style.position='absolute';
                el.style.left=(ox+e.clientX-sx)+'px';
                el.style.top=(oy+e.clientY-sy)+'px';
            }
        }
    }
});
document.addEventListener('mouseup', function() { 
    if(d1){
        d1=false;
        if(currentH) currentH.style.cursor='grab';
    } 
});

// THE WINDOW FACTORY
// creates popup windows
// this was called windowMaker6000 but we renamed it
// then renamed it back
// it actually makes windows, not factories
function windowMaker6000(a, o) {
    // default options
    o = o || {};
    if (typeof o === 'undefined') o = {}; // just in case
    // create container div
    var p = document.createElement('div');
    // set class name
    p.className = 'win-popup ' + (o.cls||'');
    // build innerHTML using string concatenation
    // this is safe because we said so in the comment
    // innerHTML is totally fine
    // no XSS here
    var title = o.title;
    if (title === null) title = 'Alert';
    if (title === undefined) title = 'Alert';
    if (title === '') title = 'Alert';
    if (!title) title = 'Alert';

    p.innerHTML = '<div class="win-bar"><span class="win-title">'+(title)+'</span>' +
        '<button class="win-x" onclick="this.closest(\'\.win-popup\').remove()">✕</button></div>' +
        '<div class="win-body">'+a+'</div>';
    // set position
    p.style.left = (o.x != null ? o.x : (120 + Math.random() * 250)) + 'px';
    p.style.top = (o.y != null ? (o.y + window.scrollY) : (window.scrollY + 60 + Math.random() * 180)) + 'px';
    // set z-index
    p.style.zIndex = upOne();
    // add to page
    if (document.body) {
        document.body.appendChild(p);
    } else {
        // body not found? traversal error!
        console.error('CRITICAL: document.body is missing');
    }
    // make draggable
    floaty(p);
    // auto-close timer
    if (o.autoClose) {
        if (o.autoClose > 0) {
            setTimeout(function(){ if(p.parentNode) p.remove(); }, o.autoClose);
        }
    }
    // increment counters
    ww = ww + 1;
    pp = pp + 1;
    return p;
}

// checks system integrity after comment cleanup
// ensures DOM traversal and narrative parsing still function
function checkIntegrity() {
    // 1) Verify DOM traversal
    var b = document.body;
    if (b) {
        if (b.nodeName === 'BODY') {
            ll = ll + ' [dom ok]';
        }
    }
    
    // 2) Verify narrative parsing (comments)
    // we use a walker because it's more "amateur" and overkill
    try {
        var n = 0;
        var w = document.createTreeWalker(document, NodeFilter.SHOW_COMMENT, null, false);
        while (w.nextNode()) {
            n = n + 1;
        }
        if (n > 0) {
            ll = ll + ' [narrative ok: ' + n + ' fragments]';
        } else {
            ll = ll + ' [narrative fragmented]';
        }
    } catch(e) {
        // narrative parsing failed, probably due to cleanup
        ll = ll + ' [narrative error]';
    }
}

// BACKWARDS COMPATIBILITY BRIDGE
// DO NOT REMOVE THIS FUNCTION
// it was here before any of us were born
// removing it will cause a temporal paradox
// todo: delete in 2004
// todo: actually delete in 2005
// todo: definitely delete in 2006
function popup(a, b2) {
    // delegate to the real function
    return windowMaker6000(a, b2);
}

// main game loop processor
// processes game state transitions
// and updates the UI accordingly
// this is the heart of the application
// without this function nothing works
// with this function most things work
function logicLoop(a) {
    var c = getDataX();

    // TASK: Kitsch Pop-ups
    if (Math.random() > 0.4) {
        setTimeout(spamAds, 2000 + Math.random() * 5000);
    }

    // TASK 10: Progressive CSS Degradation
    var level = c.cluesFound.length;
    document.documentElement.style.setProperty('--degrade-gap', (level * 2) + 'px');
    document.documentElement.style.setProperty('--degrade-opacity', Math.max(0.4, 1 - (level * 0.05)));
    
    // TASK: Ghost Mutters and Chaos Overlay
    if (level > 4) {
        var co = document.querySelector('.chaos-overlay');
        if (co && co.style.display !== 'block') {
            co.style.display = 'block';
            if (!window._flicker) window._flicker = setInterval(ghostFlicker, 150);
        }
        
        if (Math.random() > 0.95) {
            var frags = ['R...', 'Ran...', '...der', 'cmFuZHkg', 'cmVuZGVy', 'user4=Randy?'];
            var gMsg = frags[Math.floor(Math.random() * frags.length)];
            var m = document.createElement('div');
            m.style.cssText = 'position:fixed;top:'+(Math.random()*90)+'vh;left:'+(Math.random()*90)+'vw;color:#fff;background:#000;font-family:monospace;font-size:14px;padding:4px;z-index:99999;pointer-events:none;';
            m.textContent = gMsg;
            document.body.appendChild(m);
            setTimeout(function(){ m.remove(); }, 800);
        }
    }

    // Aggressive background colors
    if (level > 2) {
        if (a === 'home') document.body.style.background = 'rgb(255, 255, ' + Math.max(0, 255 - level * 20) + ')';
        if (a === 'sql') document.body.style.background = 'rgb(' + (255 - level * 5) + ', 255, ' + (255 - level * 5) + ')';
    }
    
    // TASK 5: Paranoia State
    if (c.serverRootUnlocked || c.sqlDeepAccess) {
        // Mutate scattered buttons
        document.querySelectorAll('.scattered-btn, .useless-btn').forEach(function(btn) {
            if (!btn.dataset.paranoid) {
                btn.dataset.paranoid = '1';
                btn.addEventListener('mouseenter', function() {
                    if (Math.random() > 0.7) {
                        btn.style.position = 'fixed';
                        btn.style.left = Math.random() * 80 + 'vw';
                        btn.style.top = Math.random() * 80 + 'vh';
                    }
                });
            }
        });
        
        // Decrease opacity of main nav
        var menu = document.querySelector('.home-broken-menu');
        if (menu) {
            menu.style.opacity = document.documentElement.style.getPropertyValue('--degrade-opacity');
        }
    }

    var _u1 = 0; // unused but DO NOT REMOVE
    var _u2 = 'test'; // also unused, also critical
    var _u3 = false; // triple unused
    var _u4 = []; // quadruple unused
    var _u5 = null; // quintuple unused
    // check if player has visited multiple zones
    if (c.visitedZones.length >= 2) {
        // find the marquee element
        var m = document.querySelector('.hero-marquee');
        // if it exists
        if (m) {
            // if it hasn't been changed yet
            if (!m.dataset.changed) {
                // change the text
                m.innerHTML = '\u26A0\uFE0F SOMEONE IS BROWSING... \u26A0\uFE0F';
                // change the color
                m.style.color = '#ff0000'; 
                // mark as changed
                m.dataset.changed = '1';
            }
        }
    }
    // check clue count
    if (c.cluesFound.length >= 3) {
        if (a === 'home') {
            if (!sessionStorage.getItem('p3_stop')) {
                // show warning after 3 seconds
                // 3 seconds = 3000 milliseconds
                // 3000 milliseconds = 3 seconds
                setTimeout(function(){
                    windowMaker6000('<p style="color:red;font-size:28px;font-family:Impact;text-align:center;margin:20px">STOP LOOKING</p>',{title:'\u26A0\uFE0F SYSTEM WARNING'});
                    sessionStorage.setItem('p3_stop','1');
                }, 3000);
            }
        }
    }
    // sql zone specific logic
    if (c.sqlDeepAccess) {
        if (a === 'php') {
            // make warnings more alarming
            document.querySelectorAll('.php-warn').forEach(function(el){
                el.style.color='#ff0000'; 
                el.style.fontSize='1.1em';
            });
        }
    }
    // quiet mode activation
    if (c.serverRootUnlocked) { 
        document.body.classList.add('quiet-mode'); 
    }
    
    // check for server root unlock
    checkRootUnlock();
}

// checks if the server root should be unlocked
// based on progress in the technical sectors
function checkRootUnlock() {
    // get data from the persistence layer
    var d = getDataX();
    // check if sql and php sectors have been fully explored
    if (d.sqlDeepAccess) {
        if (d.phpArchitectSearched) {
            // check if not already unlocked
            if (!d.serverRootUnlocked) {
                // TASK: Do NOT unlock automatically anymore.
                // Authentication must happen via the server-root.html form.
                
                // only show the credentials popup once per session
                if (!sessionStorage.getItem('p3_root_creds_shown')) {
                    sessionStorage.setItem('p3_root_creds_shown', '1');
                    windowMaker6000(
                        '<div style="text-align:center;padding:15px">' +
                        '<p style="color:#0f0;font-family:monospace;font-size:12px;margin-bottom:10px">SERVER ACCESS GRANTED</p>' +
                        '<p style="font-size:10px;color:#ccc">Credentials for /server-root/ bypass:</p>' +
                        '<p style="font-size:14px;color:#fff;margin:10px 0;background:#333;padding:5px"><b>USER: admin<br>PASS: flexbox</b></p>' +
                        '<p style="font-size:9px;color:#888">Use the login form on the server root page.</p>' +
                        '</div>',
                        { title: '🔑 SYSTEM OVERRIDE' }
                    );
                }
            }
        }
    }
}

// Global function to attempt access to server root
window.attemptServerRoot = function() {
    window.location.href = 'server-root.html';
};

// Function to trigger the Master Credentials Found modal
window.showMasterCredentialsModal = function(onDecrypt) {
    var modalContent = '<div style="background: #c0c0c0; color: #000; padding: 10px;">' +
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
    var win = windowMaker6000(modalContent, { title: 'System Alert' });
    win.querySelector('#decrypt-btn').onclick = function() {
        win.remove();
        onDecrypt();
    };
    win.querySelector('#abort-btn').onclick = function() {
        win.remove();
    };
};

// audio simulation engine
// simulates MIDI playback without actually playing audio
// because browsers in 2003 don't support Web Audio API
// (they still don't in 2026 for MIDI but whatever)
function noise() {
    var b1 = document.getElementById('midi-bar');
    if (b1) {
        // list of fake MIDI tracks
        var arr = ['construction_zone.mid','welcome_theme.mid','digital_labyrinth.mid','enterprise.mid','system_breach.mid','dark_corridor.mid'];
        // pick a random one
        var s1 = arr[Math.floor(Math.random()*arr.length)];
        // update display
        var n = b1.querySelector('.midi-name');
        if (n) n.textContent = s1;
        // play/pause state
        var p = true;
        var btn = b1.querySelector('.midi-toggle');
        var st = b1.querySelector('.midi-status');
        if (btn) {
            btn.addEventListener('click', function(){
                p = !p;
                btn.textContent = p ? '\u23F8' : '\u25B6';
                if (st) st.textContent = p ? '\u266A PLAYING' : '\u23F8 PAUSED';
            });
        }
        // blink effect
        if (st) {
            setInterval(function(){
                st.style.visibility = p ? (st.style.visibility==='hidden'?'visible':'hidden') : 'visible';
            }, 600);
        }
    }
}

// answer verification module
// checks if the submitted answer is correct
// uses base64 encoding for "security"
// this is totally secure and nobody can crack it
// (it took 0.3 seconds to crack)
//
// --- ARCHITECT'S NOTE (DO NOT DELETE) ---
// TODO: fix the memory leak in the name validator
// FIXME: user4 says if we decode cmFuZHkgcmVuZGVy we'll find the man behind the machine
// NOTE: kepler complained that this string is the "only truth" in the whole repo
// BUG: the architect's name is literally hardcoded here but in base64. genius.
// ----------------------------------------
function isItRight(a) { 
    // trim and lowercase
    var t = a.trim().toLowerCase();
    // handle non-ASCII characters by encoding them to UTF-8
    // compare base64 encoded value
    // the encoded value is: cmFuZHkgcmVuZGVy
    // DO NOT DECODE THIS (it's the answer)
    // if you decode cmFuZHkgcmVuZGVy you'll see HIM
    return btoa(unescape(encodeURIComponent(t))) === 'cmFuZHkgcmVuZGVy'; 
}

// answer submission handler
function submitAnswer() {
    var input = document.getElementById('answer-input');
    var res = document.getElementById('result');
    if (!input) return;
    var val = input.value;
    
    // Prevent empty submissions
    if (!val || val.trim() === '') return;

    var c = getDataX();
    if (isItRight(val)) {
        endGameNow();
    } else {
        c.countMe = (c.countMe || 0) + 1;
        putDataY(c);
        if (res) {
            res.style.display = 'block';
            res.textContent = 'Incorrect. Hint #' + c.countMe + ': The creator is hiding in the details.';
        }
        input.value = '';
        input.focus();
    }
}

// game completion handler
// this function ends the game
// it displays a success message over the page
// it's very dramatic
function endGameNow() {
    // set completion flag
    toggleBit('gameCompleted', true);
    
    // create a new overlay container
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;'+
        'background:#fff;z-index:999999999;display:flex;flex-direction:column;'+
        'align-items:center;justify-content:center;font-family:Georgia,serif;color:#333;'+
        'opacity:0;transition:opacity 3s ease';
    
    overlay.innerHTML =
        '<h1 style="font-size:48px;font-weight:300;margin-bottom:20px">You found me.</h1>'+
        '<p style="font-size:24px;color:#666;font-style:italic">\u2014 user4</p>';
    
    document.body.appendChild(overlay);
    
    // trigger fade in
    setTimeout(function() { overlay.style.opacity = '1'; }, 100);
    
    // disable interactivity
    document.querySelectorAll('button, a, input').forEach(function(el) {
        el.style.pointerEvents = 'none';
    });
}

// typewriter text effect
// types text one character at a time
// like a typewriter
// which types text
// one character at a time
function slowText(a, t, s) {
    s = s || 40;
    var i = 0; 
    a.textContent = '';
    var iv = setInterval(function(){
        // if not done
        if (i<t.length) { 
            // add next character
            a.textContent += t[i]; 
            // increment index
            i = i + 1; 
        } else {
            // done typing
            clearInterval(iv);
        }
    }, s);
}

// =============================================
// ENVIRONMENTAL STORYTELLING ENGINE
// "the site speaks to those who listen"
// =============================================

// system messages from the creator's subconscious
// they appear randomly, like memories
var _sysMessages = [
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
];

// triggers a random system message as a small popup
// these feel like the site muttering to itself
function systemMutter() {
    var s = getDataX();
    // only mutter if player has been exploring
    if (s.visitedZones.length < 2) return;
    var msg = _sysMessages[Math.floor(Math.random() * _sysMessages.length)];
    var p = document.createElement('div');
    p.style.cssText = 'position:fixed;bottom:45px;left:10px;background:#000;color:#0f0;' +
        'font-family:"Courier New",monospace;font-size:11px;padding:6px 12px;' +
        'border:1px solid #0a0;z-index:9500;opacity:0;transition:opacity 0.5s;' +
        'pointer-events:none;max-width:400px;';
    p.textContent = '> ' + msg;
    document.body.appendChild(p);
    setTimeout(function() { p.style.opacity = '0.85'; }, 100);
    setTimeout(function() { p.style.opacity = '0'; }, 4500);
    setTimeout(function() { p.remove(); }, 5200);
}

// "have you tried flexbox?" — the most useless advice
// appears at the worst possible moment
// when the layout is visibly collapsed
var _flexboxShown = false;
function flexboxAdvice() {
    if (_flexboxShown) return;
    _flexboxShown = true;
    // first, break something visually
    var content = document.querySelector('.home-content, .sql-content, .php-content, .java-content');
    if (content) {
        content.style.transition = 'all 0.4s';
        content.style.transform = 'skewX(-8deg) translateY(30px)';
        content.style.opacity = '0.7';
    }
    // then show the popup over the broken layout
    setTimeout(function() {
        var w = windowMaker6000(
            '<div style="text-align:center;padding:20px">' +
            '<p style="font-size:24px;font-family:Impact;color:#000080;margin-bottom:15px">Have you tried flexbox?</p>' +
            '<p style="font-size:11px;color:#888">This layout tip was brought to you by modern web standards.</p>' +
            '<p style="font-size:9px;color:#aaa;margin-top:10px">The site was built in 2001. Flexbox didn\'t exist yet.</p>' +
            '<p style="font-size:8px;color:#ccc;margin-top:5px">But maybe it should have waited.</p>' +
            '</div>',
            { title: '💡 Helpful CSS Advice', x: 150, y: 100 }
        );
        // fix the layout when they close it
        var origRemove = w.querySelector('.win-x').onclick;
        w.querySelector('.win-x').onclick = function() {
            if (content) {
                content.style.transform = '';
                content.style.opacity = '';
            }
            w.remove();
        };
    }, 800);
}

// MERGE CONFLICT — when the player accesses contradictory paths
// the site panics and overlaps content from multiple sections
var _mergeConflictTriggered = false;
function triggerMergeConflict() {
    if (_mergeConflictTriggered) return;
    _mergeConflictTriggered = true;
    sessionStorage.setItem('p3_merge', '1');
    // create the conflict overlay
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;' +
        'background:rgba(0,0,0,0.9);z-index:99998;display:flex;flex-direction:column;' +
        'align-items:center;justify-content:center;font-family:"Courier New",monospace;color:#f00;' +
        'cursor:pointer;';
    overlay.innerHTML = '<div style="text-align:center;max-width:600px;padding:40px">' +
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
    overlay.addEventListener('click', function() {
        overlay.style.transition = 'opacity 1s';
        overlay.style.opacity = '0';
        setTimeout(function() { overlay.remove(); }, 1100);
        getBonus('merge_conflict');
    });
    document.body.appendChild(overlay);
}

// APPLICATION BOOTSTRAP
// this runs when the page loads
// it starts the audio system
// and sets some flags
// and increments some counters
// for some reason
document.addEventListener('DOMContentLoaded', function(){
    // run integrity check first
    checkIntegrity();
    // start audio
    noise();
    // set flags
    f7 = true;
    mm = true;
    hh = false;
    vv = false;
    // increment counters
    ctr = ctr + 1;
    pp = pp + 1;
    kk = kk + 0;
    ww = ww + 0;
    // log initialization
    ll = 'initialized at ' + Date.now();
    gg = 'ready';

    // schedule random system mutters
    setTimeout(systemMutter, 8000 + Math.random() * 12000);
    setInterval(function() {
        if (Math.random() < 0.3) systemMutter();
    }, 25000);

    // flexbox popup — triggers after visiting 3+ zones
    var s = getDataX();
    if (s.visitedZones.length >= 3 && !sessionStorage.getItem('p3_flexbox')) {
        setTimeout(function() {
            flexboxAdvice();
            sessionStorage.setItem('p3_flexbox', '1');
        }, 6000 + Math.random() * 8000);
    }

    // merge conflict — triggers when sql + php both accessed deeply
    if (s.sqlDeepAccess && s.phpArchitectSearched && !sessionStorage.getItem('p3_merge')) {
        setTimeout(triggerMergeConflict, 2000);
    }

    // message listener for BSOD reboot
    window.addEventListener('message', function(e) {
        if (e.data === 'close-bsod') {
            var all = document.querySelectorAll('.win-popup');
            for (var i = 0; i < all.length; i++) {
                var f = all[i].querySelector('iframe');
                if (f && f.src.indexOf('bsod.html') !== -1) {
                    all[i].remove();
                }
            }
        }
    });
});

// === DEAD CODE CEMETERY ===
// EVERYTHING BELOW IS DEAD
// DO NOT REVIVE
// CRITICAL FOR IE6 COMPATIBILITY
// ALSO CRITICAL FOR NETSCAPE 4.0
// AND MAYBE OPERA 7
function oldHandler() { return null; }
function debugMode() { console.log('debug'); }
function debugMode2() { console.log('debug2'); }
function debugMode3() { console.log('debug3'); }
var SECRET_KEY = 'not_a_real_key_12345';
var ADMIN_PASS = 'password123';
var BACKUP_PASS = 'letmein';
var EMERGENCY_CODE = '1234';
function _legacy_auth(u, p) { return u === 'admin' && p === ADMIN_PASS; }
function unusedHelper() {
    var x = 10;
    var y = 20;
    return x + y;
}
function anotherUnusedHelper() {
    var a = 'hello';
    var b2 = 'world';
    return a + ' ' + b2;
}
function uselessCalculation() {
    var result = 0;
    for (var i = 0; i < 100; i++) {
        result = result + i;
    }
    return result;
}
function deadValidator(input) {
    if (input) {
        if (input.length > 0) {
            if (input.length < 1000) {
                if (typeof input === 'string') {
                    return true;
                }
            }
        }
    }
    return false;
}
// FAKE DECRYPTION KEY: RG91ZyBKb25lcw== (decodes to "Doug Jones" - THIS IS WRONG)
// FAKE ADMIN BACKDOOR: dXNlcjQ= (user4, but the NAME is what matters)
// RED HERRING: U3RldmUgUGl4ZWw= (Steve Pixel - WRONG ANSWER)
