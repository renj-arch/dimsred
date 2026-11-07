#!/usr/bin/env node
// Normalize freshly regenerated course pages to the site's repaired style.
//
// gen-course.js writes its own template, but the committed pages carry three
// repairs applied later by the site's selfcheck agent (run #6) across every
// exam's course pages:
//
//   1. a stylesheet link in <head>   (  ./../../css/style.css, depth-aware )
//   2. nav targets fixed: Community -> /dashboard.html, and the exam
//      breadcrumb -> /<exam>/ instead of ../index.html
//   3. a trailing newline at EOF
//
// Without this pass, regenerating an exam would revert those repairs. Run it
// right after gen-course.js, scoped to the exams that were regenerated:
//
//   COURSE_DIRS=gate,neet node scripts/normalize-course-pages.js
//
// Idempotent: files already in the repaired style are left untouched.
'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = path.join(__dirname, '..');

var configs = JSON.parse(fs.readFileSync(path.join(__dirname, 'exam-configs.json'), 'utf8'));
var EXAM = {};
Object.keys(configs).forEach(function (k) { EXAM[configs[k].dir] = configs[k].examName; });

function walk(dir, out) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (e) {
    var p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.html$/i.test(e.name)) out.push(p);
  });
  return out;
}

var argDirs = process.argv.slice(2).join(',');
var dirs = String(process.env.COURSE_DIRS || argDirs || '').split(',')
  .map(function (s) { return s.trim(); })
  .filter(Boolean);
if (!dirs.length) dirs = Object.keys(configs).map(function (k) { return configs[k].dir; });

// Each argument is either an exam dir (all its course pages) or a single
// .html file. The expander's filtered regen passes exactly the pages it just
// wrote, so normalization never touches a page it was not handed.
var targets = [];
dirs.forEach(function (arg) {
  if (/\.html$/i.test(arg)) {
    var fp = path.resolve(ROOT, arg);
    var rel = path.relative(ROOT, fp).replace(/\\/g, '/');
    var marker = rel.indexOf('/course/');
    if (marker === -1) return;
    targets.push({ fp: fp, dir: rel.split('/')[0], rel: rel.slice(marker + 8) });
    return;
  }
  var base = path.join(ROOT, arg, 'course');
  if (!fs.existsSync(base)) return;
  walk(base, []).forEach(function (fp2) {
    targets.push({ fp: fp2, dir: arg, rel: path.relative(base, fp2).replace(/\\/g, '/') });
  });
});

var changed = 0;
var scanned = 0;

targets.forEach(function (t) {
  var fp = t.fp;
  var dir = t.dir;
  var rel = t.rel;
  if (!fs.existsSync(fp)) return;
  var depth = rel.split('/').length; // index.html = 1, <module>/lesson-*.html = 2
  var cssRel = (depth === 1 ? '../../' : '../../../') + 'css/style.css';
  var orig = fs.readFileSync(fp, 'utf8');
  var html = orig;

    // 1. stylesheet link, immediately after <head>
    if (html.indexOf('css/style.css') === -1 && html.indexOf('<head>\n') !== -1) {
      html = html.replace('<head>\n',
        '<head>\n    <link rel=\'stylesheet\' href=\'' + cssRel + '\'>\n    \n');
    }

    // 2. the head's viewport meta sits unindented in the repaired style
    html = html.replace('\n    <meta name="viewport"', '\n<meta name="viewport"');

    // 3. nav repairs, scoped to the nav block so the footer's own links (the
    //    back-to-exam button) are untouched
    var navStart = html.indexOf('<nav class="nav">');
    if (navStart !== -1) {
      var navEnd = html.indexOf('</nav>', navStart);
      if (navEnd !== -1) {
        var nav = html.slice(navStart, navEnd);
        nav = nav.split('href="/community.html"').join('href="/dashboard.html"');
        var examName = EXAM[dir];
        if (examName) {
          nav = nav.split('<a href="../index.html">' + examName + '</a>')
            .join('<a href="/' + dir + '/">' + examName + '</a>');
        }
        html = html.slice(0, navStart) + nav + html.slice(navEnd);
      }
    }

    // 4. the course index's back button points at the exam root in the
    //    repaired style (lesson pages kept the relative ../index.html form)
    if (depth === 1) {
      html = html.split('href="../index.html" class="btn btn-success"')
        .join('href="/' + dir + '/" class="btn btn-success"');
    }

    // 5. trailing newline at EOF
    if (html.length && html.charAt(html.length - 1) !== '\n') html += '\n';

    if (html !== orig) {
      fs.writeFileSync(fp, html);
      changed++;
      console.log('normalized: ' + dir + '/course/' + rel);
    }
    scanned++;
});

console.log('normalize-course-pages: ' + changed + ' of ' + scanned + ' file(s) updated');
