#!/usr/bin/env node
'use strict';
// Build the curated UPSC figure library at figures.html.
//
// The auto-generated figure packs hotlink Wikimedia images and, despite the
// relevance gates, often surface photographs of monitoring equipment where a
// student needs a labelled diagram. This page is the opposite: a small,
// hand-built set of conceptual diagrams that a candidate can redraw from
// memory in the exam hall. Every diagram is inline SVG, so it loads instantly,
// prints cleanly and cannot rot into a 404.
//
//   node scripts/build-upsc-figures-page.js

var fs = require('fs');
var path = require('path');

var OUT = path.join(__dirname, '..', 'figures.html');

var FIGLIB = require('./lib/upsc-svg-figures.js');
var PAPER = FIGLIB.PAPER;
var FIGURES = FIGLIB.FIGURES;
var svg = FIGLIB.svg;
var esc = FIGLIB.esc;


function renderCard(f, i) {
  var meta = PAPER[f.paper] || PAPER.GS1;
  return '<article class="fig-card" data-paper="' + f.paper + '" id="fig-' + f.id + '">' +
    '<div class="fig-head"><span class="paper" style="--pc:' + meta.color + '">' + esc(meta.label) + '</span>' +
    '<span class="tag">' + esc(f.tag) + '</span></div>' +
    '<h2>' + esc(f.title) + '</h2>' +
    '<p class="intro">' + esc(f.intro) + '</p>' +
    '<div class="canvas">' + svg({ id: f.id, w: 760, h: 420, aria: f.title, items: f.items }) + '</div>' +
    '</article>';
}

var cards = FIGURES.map(renderCard).join('\n');

var html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n' +
'<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
'<title>UPSC Figure Library — Hand-Drawn Diagrams & Flowcharts | vlymbooq</title>\n' +
'<meta name="description" content="Free hand-drawn UPSC diagrams and flowcharts: monsoon, plate boundaries, rock cycle, soil profile, El Niño, law-making, federal lists, monetary transmission, inflation, carbon cycle and ethics.">\n' +
'<link rel="canonical" href="https://vlymbooq.qzz.io/figures.html">\n' +
'<style>\n' +
':root{--bg:#09090b;--card:#111113;--border:rgba(255,255,255,.08);--text:#fafafa;--muted:#a1a1aa;--faint:#71717a;--purple:#a78bfa;--emerald:#34d399;--amber:#fbbf24;--blue:#60a5fa;--rose:#fb7185}\n' +
'*{margin:0;padding:0;box-sizing:border-box}\n' +
'body{font-family:Inter,-apple-system,Segoe UI,Roboto,sans-serif;background:var(--bg);color:var(--text);line-height:1.55}\n' +
'a{color:inherit;text-decoration:none}\n' +
'.nav{position:sticky;top:0;z-index:20;background:rgba(9,9,11,.9);backdrop-filter:blur(12px);border-bottom:1px solid var(--border)}\n' +
'.nav-inner{max-width:1120px;margin:0 auto;padding:14px 20px;display:flex;align-items:center;gap:18px;flex-wrap:wrap}\n' +
'.brand{font-weight:900;letter-spacing:-.02em;margin-right:auto}\n' +
'.brand span{color:var(--purple)}\n' +
'.nav a{font-size:13px;color:var(--muted)}\n' +
'.nav a:hover{color:var(--text)}\n' +
'header.hero{max-width:1120px;margin:0 auto;padding:56px 20px 20px}\n' +
'.kicker{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--purple);font-weight:800}\n' +
'h1{font-size:clamp(30px,5vw,48px);line-height:1.08;letter-spacing:-.035em;margin:10px 0 14px;max-width:900px}\n' +
'.lede{color:var(--muted);max-width:760px;font-size:16px}\n' +
'.stats{display:flex;gap:22px;flex-wrap:wrap;margin-top:22px;color:var(--faint);font-size:12px}\n' +
'.stats b{display:block;color:var(--text);font-size:20px;letter-spacing:-.02em}\n' +
'.filters{max-width:1120px;margin:26px auto 0;padding:0 20px;display:flex;gap:8px;flex-wrap:wrap}\n' +
'.chip{border:1px solid var(--border);background:var(--card);color:var(--muted);border-radius:100px;padding:8px 14px;font-size:12.5px;font-weight:650;cursor:pointer}\n' +
'.chip[aria-pressed="true"]{background:rgba(167,139,250,.14);border-color:rgba(167,139,250,.45);color:#ddd6fe}\n' +
'main{max-width:1120px;margin:0 auto;padding:26px 20px 60px;display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:20px}\n' +
'.fig-card{background:var(--card);border:1px solid var(--border);border-radius:18px;padding:18px;display:flex;flex-direction:column;gap:10px}\n' +
'.fig-card[hidden]{display:none}\n' +
'.fig-head{display:flex;gap:8px;align-items:center}\n' +
'.paper{font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--pc);border:1px solid color-mix(in srgb,var(--pc) 40%,transparent);background:color-mix(in srgb,var(--pc) 12%,transparent);padding:4px 9px;border-radius:100px}\n' +
'.tag{font-size:11px;color:var(--faint);text-transform:uppercase;letter-spacing:.08em;font-weight:700}\n' +
'.fig-card h2{font-size:18px;letter-spacing:-.02em;line-height:1.25}\n' +
'.intro{font-size:13px;color:var(--muted);min-height:38px}\n' +
'.canvas{background:#fbf7ec;border-radius:12px;overflow:hidden;border:1px solid rgba(0,0,0,.12)}\n' +
'.canvas svg{display:block;width:100%;height:auto}\n' +
'footer{max-width:1120px;margin:0 auto;padding:26px 20px 60px;border-top:1px solid var(--border);color:var(--faint);font-size:12.5px}\n' +
'footer a{color:var(--blue)}\n' +
'@media(max-width:560px){main{grid-template-columns:1fr}.canvas svg{min-height:230px}}\n' +
'@media print{.nav,.filters,footer{display:none}body{background:#fff;color:#111}main{display:block}.fig-card{break-inside:avoid;border:1px solid #ddd;margin-bottom:18px}.canvas{border:1px solid #ddd}}\n' +
'</style>\n</head>\n<body>\n' +
'<nav class="nav"><div class="nav-inner"><a class="brand" href="index.html">vlymbooq<span>.</span></a>' +
'<a href="upsc/">UPSC</a><a href="mains.html">Mains</a><a href="archive.html">Archive</a><a href="current-affairs.html">Current Affairs</a><a href="figures.html" style="color:var(--text)">Figures</a></div></nav>\n' +
'<header class="hero"><div class="kicker">UPSC Figure Library</div>' +
'<h1>Hand-drawn diagrams you can reproduce in the exam hall.</h1>' +
'<p class="lede">These are deliberately small, label-first sketches: the monsoon seesaw, plate boundaries, the rock cycle, soil horizons, El Niño, the law-making flowchart, federal lists, monetary transmission, inflation, the carbon cycle and a GS4 decision frame. Each one is inline SVG, so it prints cleanly and does not depend on a stock photo.</p>' +
'<div class="stats"><div><b>' + FIGURES.length + '</b>core diagrams</div><div><b>GS1–GS4</b>papers covered</div><div><b>100%</b>inline, printable</div></div></header>\n' +
'<div class="filters" role="group" aria-label="Filter figures by paper">' +
'<button class="chip" data-filter="all" aria-pressed="true">All papers</button>' +
'<button class="chip" data-filter="GS1" aria-pressed="false">GS1 · Geography & Society</button>' +
'<button class="chip" data-filter="GS2" aria-pressed="false">GS2 · Polity & Governance</button>' +
'<button class="chip" data-filter="GS3" aria-pressed="false">GS3 · Economy & Environment</button>' +
'<button class="chip" data-filter="GS4" aria-pressed="false">GS4 · Ethics</button>' +
'</div>\n<main id="grid">\n' + cards + '\n</main>\n' +
'<footer><p><strong>How to use these in an answer:</strong> draw the skeleton in the first minute, label only what the question asks, and write one sentence explaining the arrow that matters. A diagram earns marks when it carries an argument — not when it decorates a page.</p>' +
'<p style="margin-top:10px">Looking for maps and photographs? <a href="figures/index.html">Browse the subject figure packs</a> · <a href="subject-figures-index.html">Subject-wise index</a> · <a href="upsc/">UPSC course</a></p></footer>\n' +
'<script>\n' +
'(function(){var chips=document.querySelectorAll(".chip");var cards=document.querySelectorAll(".fig-card");chips.forEach(function(c){c.addEventListener("click",function(){var f=c.getAttribute("data-filter");chips.forEach(function(x){x.setAttribute("aria-pressed",x===c?"true":"false")});cards.forEach(function(card){card.hidden=f!=="all"&&card.getAttribute("data-paper")!==f})})})})();\n' +
'</script>\n</body>\n</html>\n';

fs.writeFileSync(OUT, html, 'utf8');
console.log('Wrote ' + OUT + ' (' + FIGURES.length + ' figures, ' + Math.round(html.length / 1024) + ' KB)');
