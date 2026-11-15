#!/usr/bin/env node
'use strict';
// figures.html is a redirect, not a second gallery.
//
// The figure surface used to exist twice: /figures served this gallery and
// /figures/ served the subject-pack index. Search engines and bookmarks split
// between them, and a fix to one page left the other stale. The gallery now
// lives in figures/index.html, next to the packs, and this script writes the
// tiny redirect that catches the old URL on hosts that ignore _redirects.
//
//   node scripts/build-upsc-figures-page.js
//
// The gallery itself is assembled by scripts/build-figure-pages.js from
// scripts/lib/figure-gallery.js.

var fs = require('fs');
var path = require('path');
var gallery = require('./lib/figure-gallery.js');

var OUT = path.join(__dirname, '..', 'figures.html');

fs.writeFileSync(OUT, gallery.redirect(), 'utf8');
console.log('Wrote ' + OUT + ' (redirect to figures/)');
