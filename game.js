--- game.js
+++ game.js
@@
     var bar = p.querySelector('#dl-bar');
     var stats = p.querySelector('#dl-stats');
     var msg = p.querySelector('#dl-msg');
     var pct = 0;
     var totalSize = parseFloat(gb) * 1024; // in MB
+    var startTime = Date.now();
+    var canFinish = Math.random() < 0.3;
     
     var iv = setInterval(function() {
         if (!p.parentNode) { clearInterval(iv); return; }
         pct += Math.random() * 0.1;
-        if (pct > 99) pct = 99;
+        var elapsed = (Date.now() - startTime) / 1000;
+        if (pct > 99) {
+            if (elapsed > 15 && canFinish) {
+                pct = 100;
+            } else {
+                pct = 99;
+            }
+        }
         bar.style.width = pct + '%';
+        
+        if (pct >= 100) {
+            clearInterval(iv);
+            stats.textContent = 'Complete.';
+            msg.textContent = 'Fragment extracted.';
+            setTimeout(function() {
+                p.remove();
+                windowMaker6000('<div style="background:#000;color:#0f0;padding:10px;text-align:center">Fragment: <b>cmFuZHkg</b></div>', { title: 'Fragmented Identity' });
+                getBonus('heavy_download_fragment');
+            }, 1000);
+            return;
+        }
         
         var msgs = [
             'Requesting chunk 0x' + Math.floor(Math.random()*9999).toString(16) + '...',
@@
         if (Math.random() > 0.8) msg.textContent = msgs[Math.floor(Math.random()*msgs.length)];
         stats.textContent = 'Downloaded: ' + (pct * totalSize / 100).toFixed(1) + ' MB / ' + (totalSize/1024).toFixed(1) + ' GB (' + pct.toFixed(2) + '%)';
     }, 1000);
 }
+
+// TASK: Engine Restoration - spawnNestingDolls
+function spawnNestingDolls(callback) {
+    var dolls = 5;
+    function nextDoll() {
+        if (dolls <= 0) {
+            if (callback) callback();
+            return;
+        }
+        var w = windowMaker6000('<div style="text-align:center;padding:15px"><p style="font-size:14px;color:red;margin-bottom:10px">SECURITY LAYER ' + dolls + '</p><button class="doll-btn">BYPASS</button></div>', { title: '🔒 SYSTEM LOCK', autoClose: 0 });
+        var closeDoll = function() { w.remove(); dolls--; nextDoll(); };
+        w.querySelector('.win-x').onclick = closeDoll;
+        w.querySelector('.doll-btn').onclick = closeDoll;
+    }
+    nextDoll();
+}
+
+function ghostFlicker() {
+    var co = document.querySelector('.chaos-overlay');
+    if (co) {
+        co.style.opacity = (Math.random() > 0.5) ? '0.1' : '0.4';
+        co.style.transform = 'translate(' + (Math.random()*4-2) + 'px, ' + (Math.random()*4-2) + 'px)';
+    }
+}
+
+// PHP & SQL Search overrides
+window.searchUser = function(query) {
+    if (query && (query.toLowerCase() === 'randy' || query.toLowerCase() === 'render')) {
+        getBonus('php_name_fragment');
+        windowMaker6000('<p style="color:#0f0">Matches found: 1<br>ID: user4<br>Status: FRAGMENTED IDENTITY</p>', {title: 'PHP Search Result'});
+    }
+};
+
+window.sqlRowClick = function(rowId, data) {
+    if (data && (data.toLowerCase().includes('randy') || data.toLowerCase().includes('render'))) {
+        getBonus('sql_name_fragment');
+        windowMaker6000('<p style="color:#0f0">Row ' + rowId + ' decrypted.<br>Content: Fragment [' + data + ']</p>', {title: 'SQL Row Decrypted'});
+    }
+};
 
 // TASK: Kitsch Spam Pop-ups
@@
     // TASK 10: Progressive CSS Degradation
     var level = c.cluesFound.length;
     document.documentElement.style.setProperty('--degrade-gap', (level * 2) + 'px');
     document.documentElement.style.setProperty('--degrade-opacity', Math.max(0.4, 1 - (level * 0.05)));
+    
+    // TASK: Ghost Mutters and Chaos Overlay
+    if (level > 4) {
+        var co = document.querySelector('.chaos-overlay');
+        if (co && co.style.display !== 'block') {
+            co.style.display = 'block';
+            if (!window._flicker) window._flicker = setInterval(ghostFlicker, 150);
+        }
+        
+        if (Math.random() > 0.95) {
+            var frags = ['R...', 'Ran...', '...der', 'cmFuZHkg', 'cmVuZGVy', 'user4=Randy?'];
+            var gMsg = frags[Math.floor(Math.random() * frags.length)];
+            var m = document.createElement('div');
+            m.style.cssText = 'position:fixed;top:'+(Math.random()*90)+'vh;left:'+(Math.random()*90)+'vw;color:#fff;background:#000;font-family:monospace;font-size:14px;padding:4px;z-index:99999;pointer-events:none;';
+            m.textContent = gMsg;
+            document.body.appendChild(m);
+            setTimeout(function(){ m.remove(); }, 800);
+        }
+    }
 
     // Aggressive background colors