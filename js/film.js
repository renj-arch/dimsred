(function () {
  'use strict';

  var params = new URLSearchParams(location.search);
  var filmId = params.get('film') || 'salt-march';
  var timelineUrl = params.get('timeline') || ('out/film/' + filmId + '/timeline.json');
  var filmUrl = 'data/films/' + filmId + '.json';
  var posterMode = params.get('poster') === '1';
  var captureMode = params.get('capture') === '1' || posterMode;
  if (captureMode) document.body.classList.add('capture');
  if (posterMode) document.body.classList.add('poster');

  var el = function (id) { return document.getElementById(id); };
  var stage = el('stage');
  var media = el('media');
  var mapLayer = el('mapLayer');
  var titleLayer = el('titleLayer');
  var chapter = el('chapter');
  var chapterNum = el('chapterNum');
  var chapterTitle = el('chapterTitle');
  var statement = el('statement');
  var meta = el('meta');
  var fade = el('fade');
  var flash = el('flash');
  var ghost = el('ghost');
  var dip = el('dip');
  var ghostActive = false;
  var atmos = el('atmos');
  var motes = el('motes');
  var shaft = atmos ? atmos.querySelector('.shaft') : null;
  var glow = atmos ? atmos.querySelector('.glow') : null;
  var moteData = [];

  function initMotes() {
    if (!motes || moteData.length) return;
    var seed = 17;
    var rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (var i = 0; i < 24; i++) {
      var s = document.createElement('span');
      s.className = 'mote';
      var d = {
        x: rnd() * 100,
        y: rnd() * 100,
        z: 0.35 + rnd() * 0.9,
        speed: 0.4 + rnd() * 1.2,
        sway: 0.5 + rnd() * 1.8,
        phase: rnd() * 6.28
      };
      s.style.width = s.style.height = (1 + d.z * 2.4).toFixed(2) + 'px';
      s.style.opacity = (0.18 + d.z * 0.42).toFixed(2);
      motes.appendChild(s);
      d.el = s;
      moteData.push(d);
    }
  }

  function drawAtmos(t, shot) {
    if (!atmos) return;
    if (motes) motes.style.opacity = shot.render === 'title' ? '0' : '1';
    var plate = String(shot.plate || '');
    var warm = /lamp|memorial|report-desk|notice-desk/.test(plate);
    var exterior = /bagh|well|wall-scar/.test(plate);
    var flicker = 0.72 + 0.28 * Math.sin(t * 7.1) * Math.sin(t * 2.3 + 0.8);
    if (shaft) {
      shaft.style.opacity = shot.render === 'title' ? '0'
        : exterior ? (0.20 + 0.08 * Math.sin(t * 0.45)).toFixed(3)
        : warm ? (0.10 * flicker).toFixed(3) : '0.045';
      shaft.style.transform = 'translateX(' + ((shot.framing && (shot.framing.x[0] - 50) * 0.10) || 0).toFixed(2) +
        'vw) rotate(' + (exterior ? 8 : 3) + 'deg) scaleX(' + (0.8 + 0.08 * Math.sin(t * 0.27)).toFixed(3) + ')';
    }
    if (glow) {
      glow.style.opacity = warm ? (0.18 * flicker).toFixed(3) : (exterior ? '0.07' : '0');
      glow.style.transform = 'translate(-50%,-50%) scale(' + (0.9 + 0.05 * Math.sin(t * 0.33)).toFixed(3) + ')';
    }
    for (var i = 0; i < moteData.length; i++) {
      var d = moteData[i];
      var y = ((d.y - t * d.speed * 1.4) % 108 + 108) % 108;
      var x = d.x + Math.sin(t * d.sway + d.phase) * 1.7;
      d.el.style.transform = 'translate3d(' + x.toFixed(2) + 'vw,' + y.toFixed(2) + 'vh,0)';
      d.el.style.opacity = (0.10 + d.z * 0.30).toFixed(3);
    }
  }

  var FALLBACK = {
    'salt-march': {
      titleLines: ['SALT'],
      subtitle: "The Empire's Smallest Fear",
      titleSize: '13vw',
      debate: 'debates.html?film=salt-march'
    },
    'jallianwala-bagh': {
      titleLines: ['JALLIANWALA', 'BAGH'],
      subtitle: 'The Garden the Empire Could Not Bury',
      titleSize: '10.2vw',
      debate: 'debates.html?film=jallianwala-bagh'
    }
  };

  var film = null;
  var timeline = null;
  var mapData = null;
  var mapSvg = null;
  var routeEl = null;
  var dotEl = null;
  var routeLen = 0;
  var currentShot = null;
  var currentScene = null;

  function clamp(x) { return Math.max(0, Math.min(1, x)); }
  function smooth(x) { x = clamp(x); return x * x * (3 - 2 * x); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function fmt(n) { return String(n).padStart(2, '0'); }

  function withJson(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + url);
      return r.json();
    });
  }

  function preload(url) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(url); };
      img.onerror = function () { reject(new Error('Could not load plate ' + url)); };
      img.src = url;
    });
  }

  function htmlPlate(name, shot) {
    var vignette = '<div class="plate-vignette"></div>';
    if (name === 'type-card') {
      var lines = (shot && Array.isArray(shot.cardLines)) ? shot.cardLines : [];
      var long = lines.length > 2 ? ' long' : '';
      return '<div class="html-plate type-card' + long + '">' +
        '<div class="tc-rule"></div>' +
        '<div class="tc-kicker">' + esc((shot && shot.cardKicker) || '') + '</div>' +
        '<div class="tc-main">' + lines.map(esc).join('<br>') + '</div>' +
        '<div class="tc-sub">' + esc((shot && shot.cardSub) || '') + '</div>' +
        '<div class="tc-rule bottom"></div>' + vignette + '</div>';
    }
    if (name === 'ledger') {
      return '<div class="html-plate ledger"><div class="desk"></div>' +
        '<div class="paper"><h3>The Salt Act</h3><p>An Act for the collection and manufacture of salt</p>' +
        '<div class="rule"></div><p>Monopoly · depot · tax</p><p>Every pound belongs to the Raj.</p>' +
        '<div class="rule"></div><p>Penalty: confiscation and imprisonment</p></div>' +
        '<div class="stamp">1882 · MONOPOLY</div>' +
        '<div class="scale"><div class="beam"></div><div class="pan l"></div><div class="pan r"></div></div>' +
        '<div class="pile"></div>' + vignette + '</div>';
    }
    if (name === 'kitchen') {
      return '<div class="html-plate kitchen"><div class="fire"></div><div class="table"></div>' +
        '<div class="bowl"></div><div class="bread"></div><div class="saltdish"></div>' +
        '<div class="steam"></div>' + vignette + '</div>';
    }
    if (name === 'letter') {
      return '<div class="html-plate letter"><div class="sheet"><h2>Eleven<br>demands</h2>' +
        '<div class="line"></div><div class="line"></div><div class="line short"></div>' +
        '<div class="line"></div><div class="line short"></div><div class="line"></div>' +
        '<div class="line"></div><div class="line short"></div></div>' +
        '<div class="wheel"><span class="spoke"></span><span class="spoke b"></span><span class="spoke c"></span></div>' +
        '<div class="seal"></div>' + vignette + '</div>';
    }
    if (name === 'viceroy') {
      return '<div class="html-plate viceroy"><div class="col l"></div><div class="col r"></div>' +
        '<div class="window"></div><div class="desk"></div><div class="letterwhite"></div>' +
        '<div class="figure"></div>' + vignette + '</div>';
    }
    if (name === 'headlines') {
      return '<div class="html-plate headlines">' +
        '<div class="paper"><h4>Salt law<br>broken</h4><div class="rule"></div><p>Dandi · 6 April 1930</p></div>' +
        '<div class="paper"><h4>60,000<br>jailed</h4><div class="rule"></div><p>The Raj answers</p></div>' +
        '<div class="paper"><h4>Millions<br>march</h4><div class="rule"></div><p>Across India</p></div>' +
        '<div class="paper"><h4>The world<br>watches</h4><div class="rule"></div><p>1,350 newspapers</p></div>' +
        '<div class="paper"><h4>Empire<br>exposed</h4><div class="rule"></div><p>Dharasana · May 1930</p></div>' +
        vignette + '</div>';
    }
    return '<div class="html-plate"><div class="plate-vignette"></div></div>';
  }

  function titleLines() {
    if (film && Array.isArray(film.titleLines) && film.titleLines.length) return film.titleLines;
    return [film && film.title ? film.title : 'SALT'];
  }

  function titleCard(t, p) {
    var main = titleLines().map(esc).join('<br>');
    var sub = esc((film && film.subtitle) || '');
    var size = film && /^\d+(\.\d+)?(vw|vh|px|rem)$/.test(String(film.titleSize || ''))
      ? 'font-size:' + film.titleSize + ';' : '';
    return '<div class="title-card">' +
      '<div class="title-kicker">A vlymbooq film</div>' +
      '<div class="title-main" style="' + size + 'transform:scale(' + (1 + 0.025 * p) + ')">' + main + '</div>' +
      '<div class="title-rule"></div>' +
      '<div class="title-sub">' + sub + '</div>' +
      '</div>';
  }

  function buildMap() {
    if (!mapData) return;
    mapSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    mapSvg.setAttribute('viewBox', '0 0 1000 1000');
    mapSvg.setAttribute('class', 'route-map-svg');
    var labels = (mapData.labels || []).map(function (l) {
      return '<text x="' + l.x.toFixed(1) + '" y="' + l.y.toFixed(1) +
        '" text-anchor="' + (l.anchor || 'middle') + '" class="map-label' +
        (l.muted ? ' muted' : '') + '">' + esc(l.text) + '</text>';
    }).join('');
    mapSvg.innerHTML =
      '<defs>' +
      '<filter id="mapGlow" x="-30%" y="-30%" width="160%" height="160%">' +
      '<feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<linearGradient id="routeGold" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#f4d38a"/><stop offset="1" stop-color="#b46b25"/></linearGradient>' +
      '</defs>' +
      '<rect x="0" y="0" width="1000" height="1000" fill="none"/>' +
      '<g opacity=".20">' +
      '<path d="M0 200H1000M0 400H1000M0 600H1000M0 800H1000M200 0V1000M400 0V1000M600 0V1000M800 0V1000" stroke="#8aa3a3" stroke-width="1"/>' +
      '</g>' +
      '<path d="' + mapData.indiaPath + '" fill="rgba(18,48,55,.86)" stroke="rgba(214,161,74,.46)" stroke-width="1.6"/>' +
      '<path id="routeLine" d="' + mapData.routePath + '" fill="none" stroke="url(#routeGold)" stroke-width="7" stroke-linecap="round" filter="url(#mapGlow)"/>' +
      '<circle id="routeDot" r="10" fill="#f7e3b0" filter="url(#mapGlow)"/>' +
      labels +
      '<text x="54" y="930" class="map-caption">THE SALT MARCH · 1930</text>';
    mapLayer.innerHTML = '';
    mapLayer.appendChild(mapSvg);
    routeEl = mapSvg.querySelector('#routeLine');
    dotEl = mapSvg.querySelector('#routeDot');
    routeLen = routeEl.getTotalLength();
    routeEl.style.strokeDasharray = String(routeLen);
    routeEl.style.strokeDashoffset = String(routeLen);
  }

  function transitionDuration(kind) {
    var tight = timeline && timeline.pacing === 'tight';
    if (/whip/i.test(kind)) return tight ? 0.22 : 0.36;
    if (/mask/i.test(kind)) return tight ? 0.30 : 0.52;
    if (/cross|match/i.test(kind)) return tight ? 0.34 : 0.62;
    if (/dip/i.test(kind)) return tight ? 0.24 : 0.52;
    return tight ? 0.10 : 0.22;
  }

  function prepareGhost(previous, shot) {
    if (!ghost) return;
    var kind = String(shot.transition || 'cut');
    var keepsFrame = previous && previous.render === 'blender' && shot.render === 'blender' &&
      /whip|mask|cross|match|dip/i.test(kind);
    if (!keepsFrame) {
      ghostActive = false;
      ghost.style.opacity = '0';
      ghost.style.backgroundImage = 'none';
      return;
    }
    ghostActive = true;
    var src = timeline.plateBase + previous.plate + '.png';
    ghost.style.backgroundImage = 'url("' + String(src).replace(/"/g, '%22') + '")';
    ghost.style.backgroundSize = 'cover';
    ghost.style.backgroundPosition = 'center';
    ghost.style.opacity = '1';
    ghost.style.transform = 'none';
    ghost.style.clipPath = 'none';
    ghost.style.filter = 'none';
  }

  function applyTransition(shot, local) {
    var kind = String(shot.transition || 'cut');
    var p = clamp(local / transitionDuration(kind));
    var e = smooth(p);
    media.style.transform = '';
    media.style.filter = '';
    media.style.opacity = '1';
    dip.style.opacity = '0';
    if (!ghost) return;
    if (!ghostActive) {
      ghost.style.opacity = '0';
      return;
    }
    if (/whip/i.test(kind)) {
      var dir = /left/i.test(kind) ? -1 : 1;
      ghost.style.opacity = p < 1 ? '1' : '0';
      ghost.style.clipPath = 'none';
      ghost.style.transform = 'translateX(' + (dir * e * 100).toFixed(3) + '%) scale(1.04)';
      ghost.style.filter = 'blur(' + (e * 10).toFixed(2) + 'px)';
      media.style.transform = 'translateX(' + (-dir * (1 - e) * 100).toFixed(3) + '%) scale(1.03)';
      media.style.filter = 'blur(' + ((1 - e) * 9).toFixed(2) + 'px)';
    } else if (/mask/i.test(kind)) {
      var fromLeft = /left/i.test(kind);
      ghost.style.opacity = p < 1 ? '1' : '0';
      ghost.style.transform = 'none';
      ghost.style.filter = 'none';
      ghost.style.clipPath = fromLeft
        ? 'inset(0 0 0 ' + (e * 100).toFixed(2) + '%)'
        : 'inset(0 ' + (e * 100).toFixed(2) + '% 0 0)';
    } else if (/cross|match/i.test(kind)) {
      ghost.style.opacity = String(1 - e);
      ghost.style.clipPath = 'none';
      ghost.style.transform = 'scale(' + (1 + e * (kind.match(/match/i) ? 0.06 : 0.015)).toFixed(4) + ')';
      ghost.style.filter = 'none';
    } else if (/dip/i.test(kind)) {
      ghost.style.opacity = '0';
      dip.style.opacity = String(Math.sin(Math.PI * p));
    } else {
      ghost.style.opacity = '0';
    }
  }

  function setShot(scene, shot) {
    var previous = currentShot;
    prepareGhost(previous, shot);
    currentShot = shot;
    currentScene = scene;
    chapterNum.textContent = fmt((timeline.scenes.indexOf(scene) || 0) + 1);
    chapterTitle.textContent = scene.title || '';
    if (shot.impact) {
      statement.className = 'statement impact' + (String(shot.text || '').length > 8 ? ' wide' : '');
      statement.innerHTML = '<span class="impact-value">' + esc(shot.text || '') + '</span>' +
        (shot.impactSub ? '<span class="impact-label">' + esc(shot.impactSub) + '</span>' : '');
    } else {
      statement.textContent = shot.text || '';
      statement.className = 'statement' + (String(shot.text || '').length > 96 ? ' small' : '');
    }
    media.className = 'hidden';
    mapLayer.className = 'hidden';
    titleLayer.className = 'hidden';

    if (shot.render === 'blender') {
      media.className = '';
      media.innerHTML = '<img id="plateImg" alt="" src="' + esc(timeline.plateBase + shot.plate + '.png') + '">';
    } else if (shot.render === 'html') {
      media.className = 'html';
      media.innerHTML = htmlPlate(shot.plate, shot);
    } else if (shot.render === 'map') {
      mapLayer.className = '';
      if (!mapSvg) buildMap();
    } else if (shot.render === 'title') {
      titleLayer.className = '';
      titleLayer.innerHTML = titleCard(scene, 0);
    }
  }

  function renderFilmAt(t) {
    if (!timeline) throw new Error('timeline not ready');
    t = Math.max(0, Math.min(Number(t) || 0, timeline.duration - 0.001));
    var changed = false;
    var scene = timeline.scenes[timeline.scenes.length - 1];
    for (var i = 0; i < timeline.scenes.length; i++) {
      var s = timeline.scenes[i];
      if (t >= s.start && t < s.start + s.duration) { scene = s; break; }
    }
    var shot = scene.shots[scene.shots.length - 1];
    for (var j = 0; j < scene.shots.length; j++) {
      var h = scene.shots[j];
      if (t >= h.start && t < h.start + h.duration) { shot = h; break; }
    }
    if (!currentShot || currentShot.id !== shot.id) { setShot(scene, shot); changed = true; }

    var sceneLocal = t - scene.start;
    var shotLocal = t - shot.start;
    var hp = clamp(shotLocal / Math.max(0.01, shot.duration));
    var sp = clamp(sceneLocal / Math.max(0.01, scene.duration));
    var ease = smooth(hp);

    var img = el('plateImg');
    if (img) {
      var f = shot.framing || { zoom: [1.02, 1.08], x: [50, 50], y: [50, 50] };
      var z = f.zoom[0] + (f.zoom[1] - f.zoom[0]) * ease;
      var px = (f.x[0] + (f.x[1] - f.x[0]) * ease - 50) * 0.55;
      var py = (f.y[0] + (f.y[1] - f.y[0]) * ease - 50) * 0.55;
      // Tiny gate weave and breathing: the frame feels photographed, not a
      // static JPEG being zoomed by a slide projector.
      var wx = Math.sin(t * 0.73 + 0.4) * 0.045;
      var wy = Math.cos(t * 0.51 + 1.2) * 0.030;
      var rot = Math.sin(t * 0.37) * 0.028;
      img.style.transform = 'scale(' + z.toFixed(4) + ') translate(' +
        (px + wx).toFixed(3) + '%,' + (py + wy).toFixed(3) + '%) rotate(' + rot.toFixed(3) + 'deg)';
    }

    if (shot.render === 'map' && routeEl) {
      var mp = ease;
      routeEl.style.strokeDashoffset = String(routeLen * (1 - mp));
      var pt = routeEl.getPointAtLength(routeLen * mp);
      dotEl.setAttribute('cx', pt.x.toFixed(1));
      dotEl.setAttribute('cy', pt.y.toFixed(1));
      dotEl.style.opacity = mp > 0.01 ? '1' : '0';
    }

    if (shot.render === 'title') {
      var tc = titleLayer.querySelector('.title-card');
      if (tc) {
        tc.style.opacity = String(smooth(shotLocal / 0.8));
        var tm = titleLayer.querySelector('.title-main');
        if (tm) tm.style.transform = 'scale(' + (1 + 0.025 * ease).toFixed(4) + ')';
      }
    }

    var tight = timeline.pacing === 'tight';
    var inS = smooth(shotLocal / (tight ? 0.34 : 0.55));
    var outS = smooth((shot.duration - shotLocal) / (tight ? 0.28 : 0.50));
    var statementAlpha = shot.text && shot.render !== 'title' ? Math.min(inS, outS) : 0;
    if (shot.impact) {
      var pop = smooth(Math.min(1, shotLocal / 0.34));
      statementAlpha = Math.min(pop, outS);
      statement.style.transform = 'translateY(-50%) scale(' + (0.84 + 0.16 * pop).toFixed(4) + ')';
    } else {
      statement.style.transform = 'translateY(' + ((1 - inS) * 12).toFixed(2) + 'px)';
    }
    statement.style.opacity = String(statementAlpha);

    var chapterIn = smooth(sceneLocal / (tight ? 0.30 : 0.45));
    var chapterOut = smooth((scene.duration - sceneLocal) / (tight ? 0.32 : 0.55));
    var chapterAlpha = shot.render === 'title' ? 0 : Math.min(chapterIn, chapterOut);
    chapter.style.opacity = String(chapterAlpha);

    if (tight) {
      // A tight cut does not fade to black at every scene boundary. Only the
      // film itself opens and closes from black; transitions carry the rest.
      var filmIn = smooth(t / 0.20);
      var filmOut = smooth((timeline.duration - t) / 0.30);
      fade.style.opacity = String(1 - Math.min(filmIn, filmOut));
    } else {
      var edge = Math.min(smooth(sceneLocal / 0.22), smooth((scene.duration - sceneLocal) / 0.22));
      fade.style.opacity = String(1 - edge);
    }

    var flashAlpha = 0;
    if (/flash/i.test(shot.transition || '')) flashAlpha = clamp(1 - shotLocal / 0.22) * 0.92;
    flash.style.opacity = String(flashAlpha);
    applyTransition(shot, shotLocal);

    drawAtmos(t, shot);
    var grain = el('grain');
    if (grain) {
      grain.style.backgroundPosition = (Math.floor(t * 19) % 220) + 'px ' +
        (Math.floor(t * 13) % 220) + 'px';
    }

    if (shot.render === 'title') {
      chapter.style.opacity = '0';
      statement.style.opacity = '0';
    }
    return changed;
  }

  function renderPoster(t) {
    if (!timeline) throw new Error('timeline not ready');
    // A poster uses the film's chosen hero plate even if the requested time
    // lands in another scene. Fall back to the first 3D shot.
    var poster = null;
    var wanted = (film && film.posterPlate) || 'march-wide';
    timeline.scenes.forEach(function (s) {
      s.shots.forEach(function (h) {
        if (h.plate === wanted && !poster) poster = { scene: s, shot: h };
      });
    });
    if (!poster) {
      timeline.scenes.forEach(function (s) {
        s.shots.forEach(function (h) {
          if (h.render === 'blender' && !poster) poster = { scene: s, shot: h };
        });
      });
    }
    if (!poster) return renderFilmAt(t);
    setShot(poster.scene, poster.shot);
    var img = el('plateImg');
    if (img) img.style.transform = 'scale(1.12) translate(-1.2%,1.4%)';
    chapter.style.opacity = '0';
    statement.style.opacity = '0';
    meta.style.opacity = '0';
    fade.style.opacity = '0';
    flash.style.opacity = '0';
    if (ghost) ghost.style.opacity = '0';
    if (dip) dip.style.opacity = '0';
    ghostActive = false;
    media.style.transform = '';
    media.style.filter = '';
    var posterSize = film && /^\d+(\.\d+)?(vw|vh|px|rem)$/.test(String(film.posterTitleSize || ''))
      ? ' style="font-size:' + film.posterTitleSize + '"' : '';
    var overlay = document.createElement('div');
    overlay.className = 'poster-overlay';
    overlay.innerHTML = '<div class="poster-kicker">A VLYMBOOQ FILM</div>' +
      '<div class="poster-title"' + posterSize + '>' + titleLines().map(esc).join('<br>') + '</div>' +
      '<div class="poster-sub">' + esc(film.subtitle || '') + '</div>' +
      '<div class="poster-meta">' + esc(film.posterMeta || '1930 · THE MARCH THAT BROKE A LAW') + '</div>';
    stage.appendChild(overlay);
  }

  function renderInProduction() {
    media.classList.add('hidden');
    mapLayer.classList.add('hidden');
    titleLayer.classList.remove('hidden');
    chapter.style.opacity = '0';
    statement.style.opacity = '0';
    meta.style.opacity = '0';
    fade.style.opacity = '0';
    flash.style.opacity = '0';
    if (ghost) ghost.style.opacity = '0';
    if (dip) dip.style.opacity = '0';
    ghostActive = false;
    media.style.transform = '';
    media.style.filter = '';
    var base = film || FALLBACK[filmId] || FALLBACK['salt-march'];
    if (base && base.titleLines) {
      document.title = base.titleLines.join(' ') + ' — ' + (base.subtitle || 'A vlymbooq film');
    }
    var comingLines = Array.isArray(base.titleLines) && base.titleLines.length
      ? base.titleLines : [base.title || 'SALT'];
    var comingSize = /^\d+(\.\d+)?(vw|vh|px|rem)$/.test(String(base.titleSize || ''))
      ? ' style="font-size:' + base.titleSize + '"' : '';
    var debateUrl = base.debate || ('debates.html?film=' + filmId);
    titleLayer.innerHTML = '<div class="title-card coming-card">' +
      '<div class="title-kicker">A VLYMBOOQ FILM</div>' +
      '<div class="title-main"' + comingSize + '>' + comingLines.map(esc).join('<br>') + '</div>' +
      '<div class="title-sub">' + esc(base.subtitle || '') + '</div>' +
      '<div class="title-rule"></div>' +
      '<p class="coming-note">The film is in production. The argument is already open.</p>' +
      '<div class="coming-links">' +
        '<a href="' + esc(debateUrl) + '#context">Explore the political context</a>' +
        '<a class="strong" href="' + esc(debateUrl) + '#debate">Open the argument &rarr;</a>' +
      '</div></div>';
    var wm = document.querySelector('.watermark');
    if (wm) wm.textContent = 'vlymbooq · film in production';
    window.FILM_DURATION = 0;
  }

  function debateHref() {
    var base = film || FALLBACK[filmId];
    return (base && base.debate) || ('debates.html?film=' + filmId);
  }

  function boot() {
    initMotes();
    var making = document.getElementById('makingLink');
    if (making) making.href = 'production.html?film=' + encodeURIComponent(filmId);
    var contextLink = document.querySelector('#filmNav a[data-nav="context"]');
    var debateLink = document.querySelector('#filmNav a[data-nav="debate"]');
    if (contextLink) contextLink.href = debateHref() + '#context';
    if (debateLink) debateLink.href = debateHref() + '#debate';
    meta.innerHTML = 'A VLYMBOOQ FILM<br>3D &middot; SOUND &middot; HISTORY';
    Promise.all([withJson(timelineUrl), withJson(filmUrl), withJson('out/film/' + filmId + '/map.json').catch(function () { return null; })])
      .then(function (res) {
        timeline = res[0];
        film = res[1];
        mapData = res[2];
        if (film && film.title) {
          document.title = film.title + ' — ' + (film.subtitle || 'A vlymbooq film');
        }
        if (!timeline || !timeline.scenes || !timeline.scenes.length) throw new Error('timeline has no scenes');
        if (!timeline.plateBase) timeline.plateBase = 'out/film/' + filmId + '/plates/';
        var needsMap = timeline.scenes.some(function (s) {
          return s.shots.some(function (h) { return h.render === 'map'; });
        });
        if (needsMap && !mapData) throw new Error('map shot exists but out/film/' + filmId + '/map.json is missing');
        var blenders = [];
        timeline.scenes.forEach(function (s) {
          s.shots.forEach(function (h) {
            if (h.render === 'blender' && blenders.indexOf(h.plate) === -1) blenders.push(h.plate);
          });
        });
        return Promise.all(blenders.map(function (p) { return preload(timeline.plateBase + p + '.png'); }));
      })
      .then(function () {
        if (posterMode) renderPoster(0);
        else renderFilmAt(Number(params.get('t') || 0));
        window.FILM_READY = true;
        window.FILM_DURATION = timeline.duration;
      })
      .catch(function (err) {
        window.FILM_ERROR = err.message;
        console.warn('Film timeline is not published yet:', err.message);
        renderInProduction();
      });
  }

  window.renderFilmAt = renderFilmAt;
  window.renderPoster = renderPoster;
  window.FILM_READY = false;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
