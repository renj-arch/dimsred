const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const JS_DIR = path.join(__dirname, '..', 'js');
const OUT_DIR = path.join(__dirname, '..', 'js', 'bundles');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const bundles = [
  {
    name: 'core',
    entryPoints: [path.join(JS_DIR, 'theme.js'), path.join(JS_DIR, 'shared.js')],
  },
  {
    name: 'study',
    entryPoints: [path.join(JS_DIR, 'study-content.js'), path.join(JS_DIR, 'study-engine.js')],
  },
  {
    name: 'exam',
    entryPoints: [path.join(JS_DIR, 'calendar.js'), path.join(JS_DIR, 'pagination.js')],
  },
];

async function build() {
  for (const b of bundles) {
    // Concatenate source files (they use IIFE/global pattern, not ES modules)
    var combined = '';
    b.entryPoints.forEach(function(fp) {
      var src = fs.readFileSync(fp, 'utf-8');
      combined += src;
      if (!src.endsWith('\n')) combined += '\n';
    });

    // Minify the combined content
    var result = await esbuild.transform(combined, {
      minify: true,
      target: ['es2020'],
    });

    fs.writeFileSync(path.join(OUT_DIR, b.name + '.js'), result.code, 'utf-8');
    console.log('Built ' + b.name + '.js (' + result.code.length + ' bytes)');
  }
  console.log('Done. Bundles in js/bundles/');
}

build().catch(function(e) {
  console.error(e);
  process.exit(1);
});
