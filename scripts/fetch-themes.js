var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var PIB_PATH = path.resolve(__dirname, '..', 'data/questions/pib-archive.json');
var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url, retries) {
  if (retries === undefined) retries = 3;
  return new Promise(function(resolve, reject) {
    https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'ThemesBot/2.0' } }, function(res) {
      var data = '';
      res.on('data', function(c) { data += c; });
      res.on('end', function() {
        if (res.statusCode === 429 && retries > 0) {
          var wait = Math.pow(2, 4 - retries) * 3000;
          console.error('HTTP 429, retrying in ' + (wait / 1000) + 's... (' + retries + ' left)');
          return setTimeout(function() { fetchJSON(url, retries - 1).then(resolve, reject); }, wait);
        }
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function delay(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function stripHtml(html) { return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&#(\d+);/g,function(m,c){return String.fromCharCode(c);}).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\[.*?\]/g,'').replace(/\s+/g,' ').trim(); }

var THEMES_2026 = [
  ['International Yoga Day', '21 June', '\uD83E\uDDD8', 'International Day of Yoga', 'Yoga for Healthy Ageing', ''],
  ['World Environment Day', '5 June', '\uD83C\uDF33', 'World Environment Day', 'Climate Action', 'Azerbaijan'],
  ['World Health Day', '7 April', '\uD83C\uDFE5', 'World Health Day', 'Together for health', ''],
  ['World Water Day', '22 March', '\uD83D\uDCA7', 'World Water Day', 'Water and Gender', ''],
  ['International Women\'s Day', '8 March', '\uD83D\uDC69', 'International Women\'s Day', 'Rights. Justice. Action.', ''],
  ['World No Tobacco Day', '31 May', '\uD83D\uDEAB', 'World No Tobacco Day', 'Unmasking the appeal: countering nicotine and tobacco addiction', ''],
  ['World Malaria Day', '25 April', '\uD83E\uDDDF', 'World Malaria Day', 'Driven to End Malaria: Now we can', ''],
  ['World Tuberculosis Day', '24 March', '\uD83E\uDD12', 'World Tuberculosis Day', 'Yes! We Can End TB', ''],
  ['World Food Day', '16 October', '\uD83C\uDF5B', 'World Food Day', 'TBD', ''],
  ['World Tourism Day', '27 September', '\uD83C\uDF0D', 'World Tourism Day', 'TBD', ''],
  ['World Wildlife Day', '3 March', '\uD83E\uDD81', 'World Wildlife Day', 'TBD', ''],
  ['International Day of Peace', '21 September', '\uD83D\uDD4A', 'International Day of Peace', 'TBD', ''],
  ['World AIDS Day', '1 December', '\uD83D\uDC8A', 'World AIDS Day', 'TBD', ''],
  ['International Day for Biological Diversity', '22 May', '\uD83E\uDDA6', 'International Day for Biological Diversity', 'Acting locally for global impact', ''],
  ['World Telecommunication and Information Society Day', '17 May', '\uD83D\uDCF6', 'World Telecommunication and Information Society Day', 'Strengthening digital lifelines for a resilient and connected world', ''],
  ['World Population Day', '11 July', '\uD83D\uDC65', 'World Population Day', 'Realizing the hopes and aspirations of young people \u2013 today and for the future', ''],
  ['International Literacy Day', '8 September', '\uD83D\uDCD6', 'International Literacy Day', 'TBD', ''],
  ['Human Rights Day', '10 December', '\u270C', 'Human Rights Day', 'TBD', ''],
  ['International Day of Persons with Disabilities', '3 December', '\u267F', 'International Day of Persons with Disabilities', 'TBD', ''],
  ['World Day against Child Labour', '12 June', '\uD83D\uDE4B', 'World Day Against Child Labour', 'TBD', ''],
  ['International Day of Forests', '21 March', '\uD83C\uDF33', 'International Day of Forests', 'TBD', ''],
  ['World Radio Day', '13 February', '\uD83D\uDCFB', 'World Radio Day', 'TBD', ''],
  ['World Post Day', '9 October', '\u2709', 'World Post Day', 'TBD', ''],
  ['International Day for Disaster Risk Reduction', '13 October', '\uD83C\uDF0A', 'International Day for Disaster Risk Reduction', 'TBD', ''],
  ['World Habitat Day', '7 October', '\uD83C\uDFE0', 'World Habitat Day', 'TBD', ''],
  ['World Met Day', '23 March', '\u2601', 'World Meteorological Day', 'TBD', ''],
  ['International Day of the World\'s Indigenous People', '9 August', '\uD83C\uDFF4', 'International Day of the World\'s Indigenous People', 'TBD', ''],
  ['United Nations Day', '24 October', '\uD83C\uDFF4', 'United Nations Day', 'TBD', ''],
  ['International Day for the Eradication of Poverty', '17 October', '\uD83E\uDD1D', 'International Day for the Eradication of Poverty', 'TBD', ''],
  ['World Heart Day', '29 September', '\u2764', 'World Heart Day', 'TBD', ''],
  ['World Mental Health Day', '10 October', '\uD83E\uDD1E', 'World Mental Health Day', 'TBD', ''],
  ['International Day of Light', '16 May', '\uD83D\uDCA1', 'International Day of Light', 'TBD', ''],
  ['World Braille Day', '4 January', '\uD83D\uDD0D', 'World Braille Day', 'TBD', ''],
  ['International Asteroid Day', '30 June', '\u2604', 'International Asteroid Day', 'TBD', ''],
  ['National Voters\' Day', '25 January', '\uD83D\uDDF3', 'National Voters\' Day (India)', 'TBD', ''],
  ['National Science Day', '28 February', '\uD83D\uDD2C', 'National Science Day (India)', 'TBD', ''],
  ['National Sports Day', '29 August', '\uD83C\uDFC3', 'National Sports Day (India)', 'TBD', ''],
  ['National Youth Day', '12 January', '\uD83E\uDDD1\u200D\uD83C\uDFEB', 'National Youth Day (India)', 'TBD', ''],
  ['National Technology Day', '11 May', '\uD83D\uDCBB', 'National Technology Day (India)', 'TBD', ''],
  ['National Education Day', '11 November', '\uD83D\uDCD6', 'National Education Day (India)', 'TBD', ''],
  ['Constitution Day (India)', '26 November', '\uD83D\uDCDC', 'Constitution Day (India)', 'TBD', ''],
  ['National Mathematics Day', '22 December', '\uD83D\uDD22', 'National Mathematics Day (India)', 'TBD', ''],
  ['National Statistics Day', '29 June', '\uD83D\uDCCA', 'National Statistics Day (India)', 'TBD', ''],
  ['National Panchayati Raj Day', '24 April', '\uD83C\uDFDB', 'National Panchayati Raj Day (India)', 'TBD', ''],
  ['National Maritime Day', '5 April', '\u26F5', 'National Maritime Day (India)', 'TBD', ''],
  ['National Farmers\' Day', '23 December', '\uD83C\uDF3E', 'National Farmers\' Day (India)', 'TBD', ''],
  ['National Unity Day', '31 October', '\uD83E\uDD1D', 'National Unity Day (India)', 'TBD', ''],
  ['National Doctors\' Day', '1 July', '\uD83E\uDD12', 'National Doctors\' Day (India)', 'TBD', ''],
  ['National Postal Day', '10 October', '\u2709', 'National Postal Day (India)', 'TBD', ''],
];

async function fetchWikiTheme(pageName) {
  try {
    var data = await fetchJSON(API + '?action=parse&page=' + encodeURIComponent(pageName) + '&prop=text&format=json');
    if (!data || !data.parse || !data.parse.text) return null;
    var h = data.parse.text['*'];
    var text = stripHtml(h);

    var textLower = text.toLowerCase();
    var themeMatch = null;

    var m1 = textLower.match(/2026[^.]{0,80}theme[:\s\u2013-]+([^.]{10,300}\.)/);
    if (m1) themeMatch = m1[1];

    if (!themeMatch) {
      var m2 = textLower.match(/theme\s+(?:for|of)\s+2026[:\s\u2013-]+([^.]{10,300}\.)/);
      if (m2) themeMatch = m2[1];
    }

    if (!themeMatch) {
      var m3 = textLower.match(/theme[:\s\u2013-]+([^.]{10,300}\.)/);
      if (m3 && m3[1].indexOf('2026') >= 0) themeMatch = m3[1];
    }

    if (themeMatch) {
      themeMatch = themeMatch.replace(/^["'\u201C\u201D]+/, '').replace(/["'\u201C\u201D]+$/, '').trim();
      themeMatch = themeMatch.charAt(0).toUpperCase() + themeMatch.slice(1);
      var badPrefixes = ['for', 'the', 'a ', 'an ', 'has yet', 'to be', 'see also', 'this is'];
      for (var bi = 0; bi < badPrefixes.length; bi++) {
        if (themeMatch.toLowerCase().indexOf(badPrefixes[bi]) === 0) return null;
      }
      if (themeMatch.length < 5 || themeMatch.length > 200) return null;
      return themeMatch;
    }

    var patterns = [
      /theme\s+(?:for\s+)?2026\s*(?:\u2013|:|\u2014)\s*["']?([^"'\n]{10,200})["']?/i,
      /2026\s+(?:theme|slogan|topic)\s*(?:\u2013|:|\u2014)\s*["']?([^"'\n]{10,200})["']?/i
    ];
    for (var pi = 0; pi < patterns.length; pi++) {
      var m = text.match(patterns[pi]);
      if (m) {
        var ft = m[1].trim();
        if (ft.length > 5 && ft.length < 200) return ft;
      }
    }

    return null;
  } catch (e) {
    return null;
  }
}

function makeThemeQuestion(item, seq) {
  var now = new Date();
  var pubDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T12:00:00.000Z';
  var id = 'theme_' + pad(seq);
  var theme = item[4];
  var host = item[5];

  if (!theme || theme === 'TBD') return null;

  var blankText = 'The theme of ' + item[0] + ' 2026 is "' + theme + '".';
  var answer = theme;

  return {
    id: id,
    type: 'fill_blank',
    category: 'Current Affairs',
    region: '',
    source: 'UN',
    pubDate: pubDate,
    subject: 'Current Affairs',
    subSubject: 'Important Days & Themes',
    emoji: item[2],
    question: 'What is the theme of ' + item[0] + ' 2026?',
    answer: theme,
    hint: '',
    fact: 'The theme of ' + item[0] + ' 2026 is "' + theme + '". ' + item[0] + ' is observed on ' + item[1] + ' annually.' + (host ? ' Host country: ' + host + '.' : '')
  };
}

function eventKey(q) {
  var n = function(s) { return (s || '').replace(/&#91;/g,'[').replace(/&#93;/g,']').replace(/&#160;/g,' ').replace(/&amp;/g,'&').replace(/\[.*?\]/g,''); };
  return n(q.question || '').substring(0, 80) + '|' + n(q.answer || '');
}

async function main() {
  var existing = {};
  if (fs.existsSync(PIB_PATH)) {
    try {
      existing = JSON.parse(fs.readFileSync(PIB_PATH, 'utf8'));
      console.error('Read existing pib-archive.json');
    } catch (e) {
      console.error('Error reading pib-archive.json: ' + e.message);
    }
  }

  var CA_KEY = 'Current Affairs';
  if (!existing[CA_KEY]) existing[CA_KEY] = { subSubjects: {} };
  if (!existing[CA_KEY].subSubjects['Important Days & Themes']) existing[CA_KEY].subSubjects['Important Days & Themes'] = [];

  var existingKeys = {};
  existing[CA_KEY].subSubjects['Important Days & Themes'].forEach(function(q) {
    existingKeys[eventKey(q)] = true;
  });

  var newQuestions = [];
  var seq = existing[CA_KEY].subSubjects['Important Days & Themes'].length + 1;

  for (var ti = 0; ti < THEMES_2026.length; ti++) {
    var item = THEMES_2026[ti];
    process.stdout.write('  ' + item[0] + '... ');

    var wikiTheme = await fetchWikiTheme(item[3]);
    if (wikiTheme && wikiTheme.length > 3 && wikiTheme.length < 200) {
      item[4] = wikiTheme;
      process.stdout.write('Wiki: "' + wikiTheme.substring(0, 60) + '..."');
    } else {
      process.stdout.write('Known: "' + (item[4] !== 'TBD' ? item[4].substring(0, 60) : 'TBD') + '"');
    }

    var q = makeThemeQuestion(item, seq);
    if (q) {
      var key = eventKey(q);
      if (!existingKeys[key]) {
        newQuestions.push(q);
        existingKeys[key] = true;
        seq++;
        process.stdout.write(' \u2713');
      } else {
        process.stdout.write(' (dup)');
      }
    } else {
      process.stdout.write(' (skipped - TBD)');
    }
    process.stdout.write('\n');

    await delay(400);
  }

  newQuestions.forEach(function(q) {
    existing[CA_KEY].subSubjects['Important Days & Themes'].push(q);
  });

  var total = existing[CA_KEY].subSubjects['Important Days & Themes'].length;
  fs.writeFileSync(PIB_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('\nImportant Days & Themes: ' + total + ' total questions, ' + newQuestions.length + ' new');
}

main().catch(function(err) {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
