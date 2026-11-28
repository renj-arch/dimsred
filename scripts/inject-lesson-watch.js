// Tell a returning reader that a lesson changed, at deploy time.
//
// The expander enriches long lessons while people are reading them, and a new
// section can appear anywhere in the body. Server-side version stamps only
// cover pages the generator rewrites; the hand-built lessons (Indian Polity,
// for one) are intentionally never regenerated, and other agents also edit
// pages directly. So the reliable comparison is the one the reader can make:
// the headings they saw last time versus the headings on the page now.
//
// This injects a tiny, dependency-free watcher before </body> of every course
// lesson page. It:
//   - stores the visible h2/h3 list in localStorage under
//     "vlymbooq-lesson-seen:<pathname>" on the first visit;
//   - on later visits, if headings were added (or removed), shows a banner
//     naming the new sections and keeps the old snapshot until "Got it" is
//     pressed, so a reload cannot hide the notice;
//   - never invents a date; it only says the page changed since the reader's
//     own last visit.
//
// Idempotent: a page that already carries the marker is left alone. Run as
// `node scripts/inject-lesson-watch.js <root>` (the deploy tree).
const fs = require('fs');
const path = require('path');

const MARKER = 'vlymbooq-lesson-watch';
const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..'));

const SNIPPET = [
  '<script>',
  '/* ' + MARKER + ' */',
  '(function(){try{',
  '  var body=document.querySelector(".lesson-body");if(!body)return;',
  '  var heads=[].slice.call(body.querySelectorAll("h2,h3")).map(function(h){return (h.textContent||"").replace(/\\s+/g," ").trim();}).filter(Boolean);',
  '  if(!heads.length)return;',
  '  var key="vlymbooq-lesson-seen:"+location.pathname;',
  '  var prev=null;try{prev=JSON.parse(localStorage.getItem(key)||"null");}catch(e){}',
  '  var save=function(){try{localStorage.setItem(key,JSON.stringify({h:heads,at:Date.now()}));}catch(e){}};',
  '  var lower=function(a){return a.map(function(x){return String(x).toLowerCase();});};',
  '  if(!prev||!Array.isArray(prev.h)||!prev.h.length){save();return;}',
  '  var oldL=lower(prev.h),newL=lower(heads);',
  '  var added=heads.filter(function(x){return oldL.indexOf(x.toLowerCase())===-1;});',
  '  var gone=prev.h.filter(function(x){return newL.indexOf(String(x).toLowerCase())===-1;});',
  '  if(!added.length&&!gone.length){save();return;}',
  '  var box=document.createElement("div");',
  '  box.id="lesson-watch-banner";',
  '  box.style.cssText="margin:0 0 18px;background:#0b1220;border:1px solid #1e3a8a;border-radius:10px;padding:12px 14px;font-size:.88em;color:#dbeafe;line-height:1.5";',
  '  var html="<strong>This lesson changed since your last visit.</strong> ";',
  '  if(added.length){',
  '    html+="New sections:<ul style=\\"margin:6px 0 8px;padding-left:18px\\">";',
  '    added.slice(0,8).forEach(function(x){var d=document.createElement("div");d.textContent=x;html+="<li>"+d.innerHTML+"</li>";});',
  '    html+="</ul>";',
  '  }else{html+="Existing sections were revised.";}',
  '  html+="<button type=\\"button\\" style=\\"background:#1d4ed8;color:#fff;border:0;border-radius:7px;padding:5px 11px;font-size:.92em;cursor:pointer\\">Got it</button>";',
  '  box.innerHTML=html;',
  '  box.querySelector("button").onclick=function(){save();if(box.parentNode)box.parentNode.removeChild(box);};',
  '  body.insertBefore(box,body.firstChild);',
  '}catch(e){}})();',
  '</script>'
].join('\n');

function lessonPages(dir) {
  const out = [];
  (function walk(d) {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!/^lesson-.*\.html$/.test(e.name)) continue;
      if (p.split(path.sep).indexOf('course') === -1) continue;
      out.push(p);
    }
  })(dir);
  return out;
}

const pages = lessonPages(ROOT);
let changed = 0;
if (require.main === module) {
  for (const p of pages) {
    let s;
    try { s = fs.readFileSync(p, 'utf-8'); } catch (e) { continue; }
    if (s.indexOf(MARKER) !== -1) continue;
    if (s.indexOf('</body>') === -1) {
      console.warn('inject-lesson-watch: no </body>, skipped ' + p);
      continue;
    }
    s = s.replace(/<\/body>/i, SNIPPET + '\n</body>');
    fs.writeFileSync(p, s, 'utf-8');
    changed++;
  }
  console.log('inject-lesson-watch: ' + changed + ' of ' + pages.length + ' lesson page(s) instrumented');
}

module.exports = { MARKER, SNIPPET };
