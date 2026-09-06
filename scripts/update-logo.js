const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const BASE = 'https://vlymbooq.qzz.io';

function getAllHtmlFiles(dir) {
  var results = [];
  var list = fs.readdirSync(dir);
  for (var i = 0; i < list.length; i++) {
    var file = path.join(dir, list[i]);
    var stat = fs.statSync(file);
    if (stat.isDirectory() && file.indexOf('node_modules') === -1) {
      results = results.concat(getAllHtmlFiles(file));
    } else if (file.endsWith('.html')) {
      results.push(file);
    }
  }
  return results;
}

var files = getAllHtmlFiles(root).filter(function(f) {
  return f.indexOf('node_modules') === -1;
});

var changes = { favicon: 0, ogimage: 0, navlogo: 0 };

for (var fi = 0; fi < files.length; fi++) {
  var filePath = files[fi];
  var relPath = path.relative(root, filePath);
  var depth = relPath.split(path.sep).length - 1;
  var prefix = depth === 0 ? '' : Array(depth).fill('..').join('/');
  var imgPrefix = prefix ? prefix + '/' : '';
  var html = fs.readFileSync(filePath, 'utf-8');
  var original = html;

  // 1. Add PNG favicon after SVG favicon
  var faviconSvg = '<link rel="icon" type="image/svg+xml" href="' + imgPrefix + 'favicon.svg">';
  var faviconPng = '<link rel="icon" type="image/png" href="' + imgPrefix + 'logo.png">';
  if (html.indexOf(faviconPng) === -1 && html.indexOf(faviconSvg) !== -1) {
    html = html.replace(faviconSvg, faviconSvg + '\n    ' + faviconPng);
    changes.favicon++;
  }

  // 2. Add og:image meta tag if not present
  var ogImageTag = '<meta property="og:image" content="' + BASE + '/logo.png">';
  if (html.indexOf('og:image') === -1) {
    var ogTags = html.match(/<meta property="og:[^"]*"[^>]*>/g);
    if (ogTags && ogTags.length > 0) {
      var lastOg = ogTags[ogTags.length - 1];
      html = html.replace(lastOg, lastOg + '\n    ' + ogImageTag);
      changes.ogimage++;
    } else {
      var descMatch = html.match(/<meta name="description"[^>]*>/);
      if (descMatch) {
        html = html.replace(descMatch[0], descMatch[0] + '\n    ' + ogImageTag);
        changes.ogimage++;
      }
    }
  }

  // 3. Replace brand logo SVG with img tag pointing to logo.png
  // Pattern 1: Standard V-shape brand SVG (28x28) used in most pages
  // These have the distinctive path: M6 5 L14 24 L22 5
  var vSvgRegex = /<svg[^>]*viewBox="0 0 28 28"[^>]*>[\s\S]*?M6\s*5\s*L14\s*24\s*L22\s*5[\s\S]*?<\/svg>/;
  var imgTag = '<img src="' + imgPrefix + 'logo.png" alt="vlymbooq" style="height:28px;width:28px;border-radius:6px;flex-shrink:0">';

  // Pattern 2: Lab page SVG (40x40 heart logo)
  var labSvgRegex = /<svg[^>]*viewBox="0 0 40 40"[^>]*>[\s\S]*?M20\s*36\s*C17[\s\S]*?<\/svg>/;
  var labImgTag = '<img src="' + imgPrefix + 'logo.png" alt="vlymbooq" style="height:28px;width:28px;border-radius:6px;flex-shrink:0">';

  if (vSvgRegex.test(html)) {
    html = html.replace(vSvgRegex, imgTag);
    changes.navlogo++;
  } else if (labSvgRegex.test(html)) {
    html = html.replace(labSvgRegex, labImgTag);
    changes.navlogo++;
  }

  if (html !== original) {
    fs.writeFileSync(filePath, html, 'utf-8');
  }
}

console.log('Done!');
console.log('  Favicon PNG added: ' + changes.favicon + ' files');
console.log('  og:image added: ' + changes.ogimage + ' files');
console.log('  Nav logo replaced: ' + changes.navlogo + ' files');
