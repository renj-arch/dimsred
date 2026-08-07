var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var PIB_PATH = path.resolve(__dirname, '..', 'data/questions/pib-archive.json');
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    var req = https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'CultureBot/1.0' } }, function(res) {
      var d = '';
      res.on('data', function(c) { d += c; });
      res.on('end', function() {
        if (res.statusCode === 429 && retries > 0) {
          var wait = Math.pow(2, 4 - retries) * 3000;
          console.error('HTTP 429, retrying in ' + (wait / 1000) + 's... (' + retries + ' left)');
          return setTimeout(function() { fetchJSON(url, retries - 1).then(resolve, reject); }, wait);
        }
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, function() { req.destroy(new Error('Request timeout')); });
  });
}

function delay(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function strip(html) { return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&#(\d+);/g,function(m,c){return String.fromCharCode(c);}).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\[.*?\]/g,'').replace(/\s+/g,' ').trim(); }

function fetchPageText(title) {
  return fetchJSON(API + '?action=parse&page=' + encodeURIComponent(title) + '&prop=text&format=json').then(function(d) {
    if (d && d.parse && d.parse.text) return d.parse.text['*'];
    return '';
  });
}

function extractWikiTables(html) {
  var tables = [];
  var tRegex = /<table[^>]*class="[^"]*(wikitable|sortable)[^"]*"[^>]*>([\s\S]*?)<\/table>/gi;
  var m;
  while ((m = tRegex.exec(html)) !== null) {
    var rows = [];
    var rRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    var rm;
    while ((rm = rRegex.exec(m[2])) !== null) {
      var cells = [];
      var cRegex = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
      var cm;
      while ((cm = cRegex.exec(rm[1])) !== null) cells.push(strip(cm[1]));
      if (cells.length > 0) rows.push(cells);
    }
    if (rows.length > 1) tables.push(rows);
  }
  return tables;
}

function makeQuestion(qText, answer, seq, source, emoji, fact) {
  if (!answer || answer.length < 2) return null;
  var now = new Date();
  var pubDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T12:00:00.000Z';
  var id = 'cul_' + pad(seq);
  return {
    id: id, type: 'fill_blank', category: 'Current Affairs', region: '',
    source: source, pubDate: pubDate, subject: 'Current Affairs',
    subSubject: 'Art & Culture', emoji: emoji,
    question: qText, answer: answer, hint: '', fact: fact || ''
  };
}

function eventKey(q) {
  var n = function(s) { return (s || '').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,''); };
  return n(q.question || '').substring(0, 80) + '|' + n(q.answer || '');
}

async function fetchUnescoSites(existingKeys, newQuestions, seqObj) {
  console.error('\n--- UNESCO World Heritage Sites ---');
  try {
    var html = await fetchPageText('List_of_World_Heritage_Sites_in_India');
    var tables = extractWikiTables(html);
    var count = 0;
    tables.forEach(function(t) {
      for (var ri = 1; ri < t.length; ri++) {
        var row = t[ri];
        if (row.length < 3) continue;
        var name = strip(row[1]);
        var state = row.length > 3 ? strip(row[3]) : '';
        if (!name || name.length < 4 || name === 'Name' || name === 'Site' || name.indexOf('Total') >= 0) continue;
        if (state) {
          var qText = 'Which UNESCO World Heritage Site is located in ' + state + '?';
          var q = makeQuestion(qText, name, seqObj.seq++, 'UNESCO Sites', '\uD83C\uDFF0', name + ' is a UNESCO World Heritage Site in ' + state + '.');
          if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
        }
      }
    });
    console.error('  ' + count + ' UNESCO site questions added');

    if (count === 0) {
      var unescoSites = [
        { site: 'Agra Fort', state: 'Uttar Pradesh' },
        { site: 'Ajanta Caves', state: 'Maharashtra' },
        { site: 'Ellora Caves', state: 'Maharashtra' },
        { site: 'Taj Mahal', state: 'Uttar Pradesh' },
        { site: 'Group of Monuments at Mahabalipuram', state: 'Tamil Nadu' },
        { site: 'Sun Temple, Konark', state: 'Odisha' },
        { site: 'Churches and Convents of Goa', state: 'Goa' },
        { site: 'Fatehpur Sikri', state: 'Uttar Pradesh' },
        { site: 'Hampi', state: 'Karnataka' },
        { site: 'Khajuraho Group of Monuments', state: 'Madhya Pradesh' },
        { site: 'Elephanta Caves', state: 'Maharashtra' },
        { site: 'Great Living Chola Temples', state: 'Tamil Nadu' },
        { site: 'Pattadakal', state: 'Karnataka' },
        { site: 'Sanchi Stupa', state: 'Madhya Pradesh' },
        { site: 'Humayun\'s Tomb, Delhi', state: 'Delhi' },
        { site: 'Qutb Minar and its Monuments', state: 'Delhi' },
        { site: 'Mountain Railways of India', state: 'Multiple states' },
        { site: 'Mahabodhi Temple Complex', state: 'Bihar' },
        { site: 'Rock Shelters of Bhimbetka', state: 'Madhya Pradesh' },
        { site: 'Champaner-Pavagadh Archaeological Park', state: 'Gujarat' },
        { site: 'Red Fort Complex', state: 'Delhi' },
        { site: 'Jaipur City, Rajasthan', state: 'Rajasthan' },
        { site: 'Dholavira: a Harappan City', state: 'Gujarat' },
        { site: 'Kakatiya Rudreshwara (Ramappa) Temple', state: 'Telangana' },
        { site: 'Sacred Ensembles of the Hoysalas', state: 'Karnataka' },
        { site: 'Kaziranga National Park', state: 'Assam' },
        { site: 'Keoladeo National Park', state: 'Rajasthan' },
        { site: 'Sundarbans National Park', state: 'West Bengal' },
        { site: 'Western Ghats', state: 'Multiple states' },
        { site: 'Great Himalayan National Park', state: 'Himachal Pradesh' },
      ];
      unescoSites.forEach(function(s) {
        var qText = 'Which UNESCO World Heritage Site is located in ' + s.state + '?';
        var q = makeQuestion(qText, s.site, seqObj.seq++, 'Reference - UNESCO Sites', '\uD83C\uDFF0', s.site + ' is a UNESCO World Heritage Site in ' + s.state + '.');
        if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
      });
      console.error('  (fallback added ' + unescoSites.length + ' UNESCO site questions)\n');
    }
  } catch (e) { console.error('  Error: ' + e.message + '\n'); }
}

async function fetchClassicalDances(existingKeys, newQuestions, seqObj) {
  console.error('--- Classical Dances ---');
  try {
    var html = await fetchPageText('Classical_dance');
    var tables = extractWikiTables(html);
    var count = 0;
    tables.forEach(function(t) {
      for (var ri = 1; ri < t.length; ri++) {
        var row = t[ri];
        if (row.length < 2) continue;
        var name = strip(row[0]);
        var origin = row.length > 1 ? strip(row[1]) : '';
        if (!name || name.length < 3 || name === 'Name' || name.indexOf('Total') >= 0) continue;
        if (origin) {
          var qText = 'The classical dance ' + name + ' originates from which Indian state?';
          var q = makeQuestion(qText, origin, seqObj.seq++, 'Classical Dance', '\uD83D\uDC83', name + ' is a classical dance form from ' + origin + '.');
          if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
        }
      }
    });
    if (count === 0) {
      var danceData = [
        { name: 'Bharatanatyam', state: 'Tamil Nadu' },
        { name: 'Kathak', state: 'Uttar Pradesh' },
        { name: 'Kathakali', state: 'Kerala' },
        { name: 'Kuchipudi', state: 'Andhra Pradesh' },
        { name: 'Odissi', state: 'Odisha' },
        { name: 'Manipuri', state: 'Manipur' },
        { name: 'Mohiniyattam', state: 'Kerala' },
        { name: 'Sattriya', state: 'Assam' }
      ];
      danceData.forEach(function(d) {
        var qText = 'The classical dance ' + d.name + ' originates from which Indian state?';
        var q = makeQuestion(qText, d.state, seqObj.seq++, 'Classical Dance', '\uD83D\uDC83', d.name + ' is a classical dance form from ' + d.state + '.');
        if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
      });
    }
    console.error('  ' + count + ' dance questions added\n');
  } catch (e) { console.error('  Error: ' + e.message + '\n'); }
}

async function fetchClassicalDances(existingKeys, newQuestions, seqObj) {
  console.error('--- Classical Dances ---');
  try {
    var html = await fetchPageText('Classical_dance');
    var tables = extractWikiTables(html);
    var count = 0;
    tables.forEach(function(t) {
      for (var ri = 1; ri < t.length; ri++) {
        var row = t[ri];
        if (row.length < 2) continue;
        var name = strip(row[0]);
        var origin = row.length > 1 ? strip(row[1]) : '';
        if (!name || name.length < 3 || name === 'Name' || name.indexOf('Total') >= 0) continue;
        if (origin) {
          var qText = 'The classical dance ' + name + ' originates from which Indian state?';
          var q = makeQuestion(qText, origin, seqObj.seq++, 'Classical Dance', '\uD83D\uDC83', name + ' is a classical dance form from ' + origin + '.');
          if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
        }
      }
    });
    if (count === 0) {
      var danceData = [
        { name: 'Bharatanatyam', state: 'Tamil Nadu' },
        { name: 'Kathak', state: 'Uttar Pradesh' },
        { name: 'Kathakali', state: 'Kerala' },
        { name: 'Kuchipudi', state: 'Andhra Pradesh' },
        { name: 'Odissi', state: 'Odisha' },
        { name: 'Manipuri', state: 'Manipur' },
        { name: 'Mohiniyattam', state: 'Kerala' },
        { name: 'Sattriya', state: 'Assam' }
      ];
      danceData.forEach(function(d) {
        var qText = 'The classical dance ' + d.name + ' originates from which Indian state?';
        var q = makeQuestion(qText, d.state, seqObj.seq++, 'Classical Dance', '\uD83D\uDC83', d.name + ' is a classical dance form from ' + d.state + '.');
        if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
      });
    }
    console.error('  ' + count + ' dance questions added\n');
  } catch (e) { console.error('  Error: ' + e.message + '\n'); }
}

// Discover members of a Wikipedia category (grows as category fills up).
async function categoryMembers(category) {
  var out = [];
  var url = API + '?action=query&list=categorymembers&cmtitle=Category:' + encodeURIComponent(category) + '&cmlimit=300&format=json';
  var d;
  try { d = await fetchJSON(url); } catch (e) { return out; }
  var mems = d && d.query && d.query.categorymembers ? d.query.categorymembers : [];
  mems.forEach(function(m) { if (m && m.title) out.push(m.title); });
  return out;
}

async function fetchFolkDances(existingKeys, newQuestions, seqObj) {
  console.error('--- Folk Dances ---');
  var count = 0;
  // Primary: iterate a spread of state/regional dance categories so each run
  // can surface new/unlisted forms rather than one fixed "Folk_dance" page.
  var CATS = [
    'Indian folk dances', 'Folk dances of India', 'Indian dances',
    'Dances of Rajasthan', 'Dances of Gujarat', 'Dances of Kerala',
    'Dances of Tamil Nadu', 'Dances of Andhra Pradesh', 'Dances of Odisha',
    'Dances of West Bengal', 'Dances of Maharashtra', 'Dances of Karnataka'
  ];
  var danceMap = {};
  try {
    var html = await fetchPageText('Folk_dance');
    if (html) {
      var seen = {};
      // Try to read the "India" section even if header split differs.
      var qm = html.match(/<h2[^>]*>[\s\S]*?India[\s\S]*?(?=<h2)/i);
      (qm ? [qm[0]] : []).concat(html.match(/<ul>[\s\S]*?<\/ul>/gi) || []).forEach(function(blk) {
        (blk.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || []).forEach(function(li) {
          var txt = strip(li);
          var m = txt.match(/^(.+?)[\s\u2013\u2014-]\s*([A-Z][A-Za-z ]+)$/);
          if (m) {
            danceMap[m[1].trim()] = m[2].trim();
            seen[m[1].trim()] = true;
          } else if (txt.length > 3 && txt.length < 40) {
            // Single item; record name only, state resolved later via fetch if possible.
          }
        });
      });
    }
  } catch (e) {}

  // Category membership auto-discovery for new dance forms/states.
  for (var ci = 0; ci < CATS.length; ci++) {
    var members = await categoryMembers(CATS[ci]);
    for (var mj = 0; mj < members.length; mj++) {
      var asDance = members[mj].replace(/^Category:/, '').trim();
      if (asDance && asDance.length > 3 && asDance.indexOf('India') < 0) {
        // Store as a dance form; state will be mapped best-effort from category name.
        var inferred = CATS[ci].replace(/^Dances of /, '');
        if (inferred === 'Indian folk dances' || inferred === 'Indian dances' || /Categories/.test(inferred)) inferred = '';
        if (inferred) { if (!danceMap[asDance]) danceMap[asDance] = inferred; }
        else if (!seen[asDance] && !danceMap[asDance]) danceMap[asDance] = 'Refer regional list'; // placeholders replaced below
      }
    }
    await delay(400);
  }

  // Turn collected dance->state pairs into questions; drop placeholders with no real state.
  var FINAL_PLACEHOLDER = 'Refer regional list';
  Object.keys(danceMap).forEach(function(dance) {
    var state = danceMap[dance];
    if (!state || state === FINAL_PLACEHOLDER) return;
    if (state.length > 40) return;
    var qText = 'The folk dance "' + dance + '" is associated with which state?';
    var q = qText.indexOf('Refer') >= 0 ? null : makeQuestion(qText, state, seqObj.seq++, 'Folk Dance', '\uD83D\uDC83', dance + ' is a folk dance from ' + state + '.');
    if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; count++; }
  });

  console.error('  ' + count + ' folk dance questions added\n');
  if (count < 10) {
    var folkData = [
      { dance: 'Bhangra', state: 'Punjab' },
      { dance: 'Garba', state: 'Gujarat' },
      { dance: 'Dandiya Raas', state: 'Gujarat' },
      { dance: 'Ghoomar', state: 'Rajasthan' },
      { dance: 'Bihu', state: 'Assam' },
      { dance: 'Lavani', state: 'Maharashtra' },
      { dance: 'Chhau', state: 'West Bengal' },
      { dance: 'Kalbelia', state: 'Rajasthan' },
      { dance: 'Rouf', state: 'Jammu and Kashmir' },
      { dance: 'Yakshagana', state: 'Karnataka' },
      { dance: 'Dollu Kunitha', state: 'Karnataka' },
      { dance: 'Theyyam', state: 'Kerala' },
      { dance: 'Thiruvathira', state: 'Kerala' },
      { dance: 'Koli', state: 'Maharashtra' },
      { dance: 'Pung Cholom', state: 'Manipur' },
      { dance: 'Nati', state: 'Himachal Pradesh' },
      { dance: 'Bardo Chham', state: 'Arunachal Pradesh' },
      { dance: 'Gaur Maria', state: 'Chhattisgarh' },
      { dance: 'Charkula', state: 'Uttar Pradesh' },
      { dance: 'Karma', state: 'Madhya Pradesh' },
    ];
    var added = 0;
    folkData.forEach(function(f) {
      var qText = 'The folk dance "' + f.dance + '" is associated with which state?';
      var q = makeQuestion(qText, f.state, seqObj.seq++, 'Reference - Folk Dance', '\uD83D\uDC83', f.dance + ' is a folk dance from ' + f.state + '.');
      if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; added++; }
    });
    count += added;
    console.error('  (fallback added ' + added + ' folk dance questions, total ' + count + ')\n');
  }
}

async function main() {
  var existing = {};
  if (fs.existsSync(PIB_PATH)) {
    try { existing = JSON.parse(fs.readFileSync(PIB_PATH, 'utf8')); } catch (e) {}
  }
  console.error('Read existing pib-archive.json');

  var CA_KEY = 'Current Affairs';
  if (!existing[CA_KEY]) existing[CA_KEY] = { subSubjects: {} };
  var subKey = 'Art & Culture';
  if (!existing[CA_KEY].subSubjects[subKey]) existing[CA_KEY].subSubjects[subKey] = [];

  var existingKeys = {};
  existing[CA_KEY].subSubjects[subKey].forEach(function(q) { existingKeys[eventKey(q)] = true; });
  var newQuestions = [];
  var seqObj = { seq: existing[CA_KEY].subSubjects[subKey].length + 1 };

  await fetchUnescoSites(existingKeys, newQuestions, seqObj);
  await delay(800);
  await fetchClassicalDances(existingKeys, newQuestions, seqObj);
  await delay(800);
  await fetchFolkDances(existingKeys, newQuestions, seqObj);

  newQuestions.forEach(function(q) { existing[CA_KEY].subSubjects[subKey].push(q); });
  fs.writeFileSync(PIB_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('\nArt & Culture: ' + existing[CA_KEY].subSubjects[subKey].length + ' total questions, ' + newQuestions.length + ' new');
}

main().catch(function(err) { console.error('Fatal:', err.message); process.exit(1); });
