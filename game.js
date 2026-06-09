--- game.js
+++ game.js
@@
         if (!p.parentNode) { clearInterval(iv); return; }
         pct += Math.random() * 0.1;
         var elapsed = (Date.now() - startTime) / 1000;
-        if (pct > 99) {
-            if (elapsed > 15 && canFinish) {
-                pct = 100;
-            } else {
-                pct = 99;
-            }
-        }
+        if (elapsed > 15) {
+            pct = canFinish ? 100 : 99;
+        } else if (pct > 99) {
+            pct = 99;
+        }
         bar.style.width = pct + '%';
         
         if (pct >= 100) {