var fs = require('fs');
var path = require('path');

var rootDir = path.resolve(__dirname, '..');
var jsonPath = path.join(rootDir, 'data', 'knowledge-base.json');
var dataDir = path.join(rootDir, 'data');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Read and validate existing knowledge base
if (fs.existsSync(jsonPath)) {
  var existing = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  var keys = Object.keys(existing);
  if (keys.length > 0) {
    console.log('Knowledge base validated: ' + keys.length + ' categories');
    // Re-write for consistent formatting
    fs.writeFileSync(jsonPath, JSON.stringify(existing, null, 2));
    return;
  }
}

// If not seeded yet, try to extract from current-affairs.html
try {
  var vm = require('vm');
  var html = fs.readFileSync(path.join(rootDir, 'current-affairs.html'), 'utf-8');
  var lines = html.split('\n');

  var startIdx = -1, endIdx = -1;
  var braceDepth = 0;
  var inGKLEARN = false;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (!inGKLEARN && /var\s+GK_LEARN\s*=/.test(line)) {
      startIdx = i;
      inGKLEARN = true;
      for (var c = 0; c < line.length; c++) {
        if (line[c] === '{') braceDepth++;
        if (line[c] === '}') braceDepth--;
      }
      continue;
    }
    if (inGKLEARN) {
      for (var c = 0; c < line.length; c++) {
        if (line[c] === '{') braceDepth++;
        if (line[c] === '}') braceDepth--;
      }
      if (braceDepth === 0) {
        endIdx = i;
        break;
      }
    }
  }

  if (startIdx !== -1 && endIdx !== -1) {
    var block = lines.slice(startIdx, endIdx + 1).join('\n');
    if (!/^\s*var\s+GK_LEARN\s*=\s*\{\s*\}\s*;?\s*$/.test(block)) {
      var script = new vm.Script('globalThis.__gk = ' + block.replace(/^\s*var\s+GK_LEARN\s*=\s*/, ''));
      var sandbox = {};
      var context = vm.createContext(sandbox);
      script.runInContext(context);
      var gkData = sandbox.__gk;

      if (gkData && Object.keys(gkData).length > 0) {
        var clean = {};
        Object.keys(gkData).forEach(function(key) {
          var entry = gkData[key];
          if (entry && typeof entry === 'object' && entry.title && entry.content) {
            clean[key] = { title: entry.title, icon: entry.icon || '', content: entry.content };
          }
        });
        fs.writeFileSync(jsonPath, JSON.stringify(clean, null, 2));
        console.log('Knowledge base extracted from HTML: ' + Object.keys(clean).length + ' categories');
        return;
      }
    }
  }
} catch (e) {
  // Silently fail — file is likely already seeded
}

console.log('Knowledge base: no new data to generate');
