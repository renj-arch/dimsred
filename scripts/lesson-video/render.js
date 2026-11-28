'use strict';
/**
 * render.js — turn planned slides into an MP4 lecture.
 *
 * For each slide we build an animated HTML panel and drive it deterministically:
 * `window.__seek(p)` sets every reveal/cartoon element for progress p in 0..1, so
 * Playwright can screenshot exact frames instead of waiting in real time. The
 * cartoon SVG is "drawn" (stroke-dashoffset) and its labels fade in, which is how
 * a static diagram is brought to life.
 *
 * Narration: piper (CI), sapi (Windows dev), or none. The video length of a slide
 * is the narration length, so the spoken word and the picture stay together.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function sh(cmd, args, opts) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...(opts || {}) });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(cmd + ' failed (' + r.status + '): ' + (r.stderr || '').slice(-600));
  return (r.stdout || '').trim();
}
function have(cmd) { try { const r = spawnSync(cmd, ['-version'], { encoding: 'utf8' }); return !r.error && r.status === 0; } catch (e) { return false; } }
function ffprobeDuration(file) {
  try {
    return parseFloat(sh('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file])) || 0;
  } catch (e) { return 0; }
}
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;overflow:hidden;background:#0b0b10;color:#f4f4f5;
  font-family:Inter,'Segoe UI',system-ui,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.stage{position:absolute;inset:0;padding:56px 64px 70px;display:flex;flex-direction:column;
  background:
    radial-gradient(900px 500px at 100% 0%,rgba(167,139,250,.14),transparent 60%),
    radial-gradient(700px 420px at 0% 100%,rgba(34,211,238,.10),transparent 60%),
    #0b0b10}
.top{display:flex;justify-content:space-between;align-items:center;color:#a1a1aa;font-size:15px;
  font-weight:700;letter-spacing:.14em;text-transform:uppercase;margin-bottom:26px}
.top .sec{color:#c4b5fd}
h1{font-size:44px;line-height:1.12;letter-spacing:-.02em;margin-bottom:18px;max-width:24ch}
h1.small{font-size:34px}
.rule{width:74px;height:5px;border-radius:99px;background:linear-gradient(90deg,#a78bfa,#22d3ee);margin:0 0 26px}
.body{display:flex;gap:44px;flex:1;min-height:0}
.text{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center}
.bullets{list-style:none;display:flex;flex-direction:column;gap:20px}
.bullets li{position:relative;padding-left:34px;font-size:25px;line-height:1.45;color:#e7e7ea}
.bullets li:before{content:'';position:absolute;left:0;top:.55em;width:14px;height:14px;border-radius:4px;
  background:linear-gradient(135deg,#a78bfa,#22d3ee)}
.bullets.numbered{counter-reset:n}
.bullets.numbered li{padding-left:46px}
.bullets.numbered li:before{counter-increment:n;content:counter(n);background:none;color:#22d3ee;
  font-weight:800;font-size:22px;width:auto;height:auto;top:0}
.art{flex:0 0 44%;display:flex;flex-direction:column;justify-content:center;min-width:0}
.card{background:#fbf7ec;border-radius:18px;padding:14px;box-shadow:0 24px 70px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.06)}
.card svg{width:100%;height:auto;display:block}
.cap{margin-top:12px;color:#a1a1aa;font-size:15px;text-align:center;font-style:italic}
.title-stage{align-items:center;justify-content:center;text-align:center}
.title-stage h1{font-size:56px;max-width:20ch}
.kicker{color:#22d3ee;font-weight:800;letter-spacing:.22em;text-transform:uppercase;font-size:15px;margin-bottom:18px}
.sub{color:#a1a1aa;font-size:19px;margin-top:8px}
.progress{position:absolute;left:64px;right:64px;bottom:34px;height:6px;border-radius:99px;background:rgba(255,255,255,.09)}
.progress>i{display:block;height:100%;width:0;border-radius:99px;background:linear-gradient(90deg,#a78bfa,#22d3ee)}
table.t{width:100%;border-collapse:collapse;font-size:20px}
table.t th,table.t td{text-align:left;padding:9px 12px;border-bottom:1px solid rgba(255,255,255,.10)}
table.t th{color:#c4b5fd;font-size:16px;text-transform:uppercase;letter-spacing:.08em}
.reveal{opacity:0}
`;

function cartoonSvg(svg) {
  // Keep the model/lesson SVG but strip fixed pixel sizing so it scales in the card.
  return String(svg || '')
    .replace(/<svg\b([^>]*)>/i, (m, a) => '<svg' + a.replace(/\s(width|height)="[^"]*"/gi, '') + '>');
}

function slideHtml(slide, meta) {
  const n = meta.index + 1, total = meta.total;
  const secLabel = 'SECTION ' + n + ' / ' + total;
  const crumb = meta.breadcrumb || '';
  if (slide.kind === 'title') {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<div class="stage title-stage">
  <div class="kicker">${esc(slide.subtitle || 'Lecture')}</div>
  <h1 class="reveal" data-at="0.05" data-dur="0.5">${esc(slide.heading)}</h1>
  <div class="sub reveal" data-at="0.35" data-dur="0.4">vlymbooq · ${esc(crumb)}</div>
  <div class="progress"><i></i></div>
</div>
<script>
function seek(p){
  document.querySelectorAll('.reveal').forEach(function(el){
    var at=parseFloat(el.dataset.at||'0'), d=parseFloat(el.dataset.dur||'0.4');
    var lp=Math.max(0,Math.min(1,(p-at)/d)); el.style.opacity=lp;
    el.style.transform='translateY('+((1-lp)*16)+'px)';
  });
  var bar=document.querySelector('.progress>i'); if(bar) bar.style.width=(p*100)+'%';
}
window.__seek=seek; seek(0);
</script></body></html>`;
  }
  const bullets = (slide.bullets || []);
  const hasArt = !!slide.svg;
  let art = '';
  if (hasArt) {
    art = `<div class="art reveal" data-at="0.08" data-dur="0.4">
      <div class="card">${cartoonSvg(slide.svg)}</div>
      ${slide.caption ? `<div class="cap">${esc(slide.caption)}</div>` : ''}
    </div>`;
  }
  let textInner;
  if (slide.kind === 'table' && slide.table) {
    const h = slide.table.header || [];
    const rows = slide.table.rows || [];
    textInner = `<table class="t reveal" data-at="0.1" data-dur="0.4">` +
      (h.length ? '<thead><tr>' + h.map((c) => '<th>' + esc(c) + '</th>').join('') + '</tr></thead>' : '') +
      '<tbody>' + rows.map((r) => '<tr>' + r.map((c) => '<td>' + esc(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
  } else {
    const cls = slide.ordered ? 'bullets numbered' : 'bullets';
    textInner = `<ul class="${cls}">` + bullets.map((b, i) =>
      `<li class="reveal" data-at="${(0.12 + i * 0.11).toFixed(2)}" data-dur="0.34">${esc(b)}</li>`).join('') + '</ul>';
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<div class="stage">
  <div class="top"><span>${esc(crumb)}</span><span class="sec">${esc(secLabel)}</span></div>
  <h1 class="${hasArt ? '' : 'small'} reveal" data-at="0.02" data-dur="0.35">${esc(slide.heading)}</h1>
  <div class="rule reveal" data-at="0.06" data-dur="0.3"></div>
  <div class="body">
    <div class="text">${textInner}</div>
    ${art}
  </div>
  <div class="progress"><i></i></div>
</div>
<script>
(function(){
  var svg=document.querySelector('.card svg');
  var shapes=[];
  if(svg){
    svg.querySelectorAll('path,line,polyline,polygon,circle,ellipse,rect').forEach(function(s){
      if(s.tagName.toLowerCase()==='rect'){ var w=parseFloat(s.getAttribute('width')||'0'); if(w>420) return; }
      var len=0; try{ len=s.getTotalLength?s.getTotalLength():0; }catch(e){ len=0; }
      shapes.push({el:s,len:len});
    });
  }
  function seek(p){
    document.querySelectorAll('.reveal').forEach(function(el){
      var at=parseFloat(el.dataset.at||'0'), d=parseFloat(el.dataset.dur||'0.4');
      var lp=Math.max(0,Math.min(1,(p-at)/d)); el.style.opacity=lp;
      el.style.transform='translateY('+((1-lp)*14)+'px)';
    });
    var draw=Math.max(0,Math.min(1,(p-0.05)/0.55));
    shapes.forEach(function(o){
      if(o.len>1){ o.el.style.strokeDasharray=o.len; o.el.style.strokeDashoffset=o.len*(1-draw); }
      else { o.el.style.opacity=draw; }
    });
    if(svg){ svg.querySelectorAll('text').forEach(function(t,i){
      var at=0.34+Math.min(0.48,i*0.05); var lp=Math.max(0,Math.min(1,(p-at)/0.3)); t.style.opacity=lp;
    }); }
    var bar=document.querySelector('.progress>i'); if(bar) bar.style.width=(p*100)+'%';
  }
  window.__seek=seek; seek(0);
})();
</script></body></html>`;
}

// -------- narration --------
function sapi(text, outWav) {
  const script = 'Add-Type -AssemblyName System.Speech; ' +
    '$s=New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Rate=0; ' +
    '$s.SetOutputToWaveFile(' + JSON.stringify(outWav) + '); ' +
    '$t=[Console]::In.ReadToEnd(); $s.Speak($t); $s.Dispose()';
  sh('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], { input: String(text || '') });
}
function piper(text, outWav, model) {
  if (!model) throw new Error('piper needs --piper-model / PIPER_MODEL');
  fs.writeFileSync(outWav + '.txt', String(text || ''), 'utf8');
  sh('piper', ['--model', model, '--output_file', outWav], { input: String(text || '') });
  try { fs.unlinkSync(outWav + '.txt'); } catch (e) {}
}
function silentWav(outWav, seconds) {
  sh('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-t', String(Math.max(1, seconds)), '-q:a', '9', outWav]);
}

/**
 * Render all slides to a single MP4. Returns { video, durationSec, slides }.
 * opts: { outDir, width, height, fps, animSec, tts: 'none'|'sapi'|'piper',
 *         piperModel, onProgress }
 */
async function renderVideo(slides, opts) {
  const { chromium } = require('playwright');
  const outDir = opts.outDir;
  const framesRoot = path.join(outDir, 'frames');
  const clipsDir = path.join(outDir, 'clips');
  fs.mkdirSync(framesRoot, { recursive: true });
  fs.mkdirSync(clipsDir, { recursive: true });
  const width = opts.width || 1280, height = opts.height || 720;
  const fps = opts.fps || 12, animSec = opts.animSec || 2.6;
  const animFrames = Math.max(2, Math.round(fps * animSec));

  const browser = await chromium.launch(Object.assign({ headless: true },
    (opts.chromiumPath || process.env.PW_CHROMIUM) ? { executablePath: opts.chromiumPath || process.env.PW_CHROMIUM } : {}));
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const clips = [];
  let total = 0;
  try {
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const dir = path.join(framesRoot, String(i).padStart(4, '0'));
      fs.mkdirSync(dir, { recursive: true });
      const html = slideHtml(slide, { index: i, total: slides.length, breadcrumb: opts.breadcrumb });
      await page.setContent(html, { waitUntil: 'load' });

      // Narration (before frames so duration is known).
      let wav = null, audioDur = 0;
      const nar = String(slide.narration || '').trim();
      if (opts.audioFiles && opts.audioFiles[i] && opts.audioFiles[i].duration > 0) {
        wav = opts.audioFiles[i].file;
        audioDur = opts.audioFiles[i].duration;
      } else if (opts.tts !== 'none' && nar) {
        wav = path.join(dir, 'voice.wav');
        try {
          if (opts.tts === 'piper') piper(nar, wav, opts.piperModel);
          else sapi(nar, wav);
          audioDur = ffprobeDuration(wav);
        } catch (e) { console.error('  tts failed on slide ' + i + ': ' + e.message); wav = null; audioDur = 0; }
      }
      const est = Math.max(3, (nar.split(/\s+/).filter(Boolean).length || 0) / 2.5);
      const duration = Math.max(animSec + 0.5, audioDur ? audioDur + 0.45 : est);

      for (let f = 0; f < animFrames; f++) {
        const p = animFrames === 1 ? 1 : f / (animFrames - 1);
        await page.evaluate((x) => window.__seek(x), p);
        await page.screenshot({ path: path.join(dir, String(f).padStart(5, '0') + '.png') });
      }
      // Hold the fully revealed frame for the rest of the slide.
      const hold = Math.max(0, duration - animSec);
      const clip = path.join(clipsDir, 'clip-' + String(i).padStart(4, '0') + '.mp4');
      const vf = 'tpad=stop_mode=clone:stop_duration=' + hold.toFixed(3) + ',format=yuv420p';
      const args = ['-y', '-framerate', String(fps), '-i', path.join(dir, '%05d.png')];
      if (wav) args.push('-i', wav);
      else args.push('-f', 'lavfi', '-t', duration.toFixed(3), '-i', 'anullsrc=r=44100:cl=stereo');
      args.push('-filter_complex', '[0:v]' + vf + '[v]', '-map', '[v]', '-map', '1:a',
        '-t', duration.toFixed(3), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22',
        '-c:a', 'aac', '-b:a', '128k', '-shortest', clip);
      sh('ffmpeg', args);
      clips.push(clip);
      total += duration;
      if (opts.onProgress) opts.onProgress(i + 1, slides.length, slide);
      // Free the PNGs as we go; only the clip is needed from here.
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
    }
  } finally {
    await browser.close();
  }

  const listFile = path.join(outDir, 'clips.txt');
  fs.writeFileSync(listFile, clips.map((c) => "file '" + path.resolve(c).replace(/'/g, "'\\''") + "'").join('\n') + '\n', 'utf8');
  const video = opts.outFile || path.join(outDir, 'lecture.mp4');
  sh('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', video]);
  return { video, durationSec: Math.round(total), slides: slides.length };
}

module.exports = { renderVideo, slideHtml, sapi, piper, silentWav, ffprobeDuration, have };