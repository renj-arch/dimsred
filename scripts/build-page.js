const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const ROOT_DIR = path.join(__dirname, '..');

function readPartial(name) {
  const p = path.join(TEMPLATES_DIR, 'partials', name);
  if (!fs.existsSync(p)) {
    console.error('Warning: partial not found: ' + name);
    return '';
  }
  return fs.readFileSync(p, 'utf-8');
}

function buildPage(opts) {
  opts = opts || {};
  const root = opts.root || '';
  const homeLabel = opts.homeLabel || 'Home';

  let html = fs.readFileSync(path.join(TEMPLATES_DIR, 'layout.html'), 'utf-8');

  const head = readPartial('_head.html');
  const nav = readPartial('_nav.html');
  const examLinks = readPartial('_exam-links.html');
  const footer = readPartial('_footer.html');
  const scripts = readPartial('_scripts.html');

  // Build nav exam links with active state
  let activeExam = opts.activeExam || '';
  let navExams = examLinks;
  const exams = ['rbi', 'upsc', 'jee', 'neet', 'gate', 'cgl', 'sbi-clerk', 'ibps-po', 'ssc-gd', 'ctet', 'agniveer', 'cds', 'clat', 'nda'];
  exams.forEach(function(ex) {
    var token = '<!--' + ex.toUpperCase() + '_ACTIVE-->';
    var replacement = ex === activeExam ? 'class="active"' : '';
    navExams = navExams.split(token).join(replacement);
  });
  navExams = navExams.replace(/<!--[A-Z_]+-->/g, '');

  // Assemble
  html = html.replace('<!--#include partials/_head.html-->', head);
  html = html.replace('<!--#include partials/_nav.html-->', nav);
  html = html.replace('<!--#include partials/_footer.html-->', footer);
  html = html.replace('<!--#include partials/_scripts.html-->', scripts);

  // Replace content tokens
  html = html.split('<!--ROOT-->').join(root);
  html = html.replace('<!--NAV_EXAMS-->', navExams);
  html = html.replace('<!--HOME_LABEL-->', homeLabel);
  html = html.replace('<!--PAGE_TITLE-->', opts.title || 'vlymbooq');
  html = html.replace('<!--PAGE_CONTENT-->', opts.content || '');
  html = html.replace('<!--PAGE_STYLES-->', opts.styles || '');
  html = html.replace('<!--PAGE_SCRIPTS-->', opts.scripts || '');
  html = html.replace('<!--EXTRA_HEAD-->', opts.extraHead || '');
  html = html.replace('<!--EXTRA_SCRIPTS-->', opts.extraScripts || '');
  html = html.replace('<!--DECORATIVE_BG-->', opts.decorativeBg || '');
  html = html.replace('<!--CANONICAL-->', opts.canonical || '');
  html = html.replace('<!--STUDY_BUNDLE-->', opts.includeStudy ? '<script src="' + root + 'js/bundles/study.js"></script>' : '');
  html = html.replace('<!--EXAM_BUNDLE-->', opts.includeExam ? '<script src="' + root + 'js/bundles/exam.js"></script>' : '');

  const metaDesc = opts.description ? '<meta name="description" content="' + opts.description + '">' : '';
  html = html.replace('<!--PAGE_META-->', metaDesc);

  return html;
}

function writePage(filePath, html) {
  const fullPath = path.join(ROOT_DIR, filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, html, 'utf-8');
  console.log('Wrote ' + filePath);
}

// CLI mode
if (require.main === module) {
  const configPath = process.argv[2];
  if (!configPath) {
    console.error('Usage: node build-page.js <config.json>');
    console.error('Config format: { pages: [ { ...opts, outputPath: "..." } ] }');
    process.exit(1);
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  config.pages.forEach(function(page) {
    const opts = Object.assign({}, page);
    const outPath = opts.outputPath;
    delete opts.outputPath;
    const html = buildPage(opts);
    writePage(outPath, html);
  });
  console.log('Done. ' + config.pages.length + ' page(s) built.');
}

module.exports = { buildPage, writePage };
