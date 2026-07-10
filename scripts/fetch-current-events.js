const https = require('https');
const fs = require('fs');

const API = 'https://en.wikipedia.org/w/api.php';
const OUTPUT = 'data/questions/current-events.json';
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url + '&origin=*', { headers: { 'User-Agent': 'CurrentEventsFill/1.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 429) return reject(new Error('HTTP 429'));
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function stripHtml(html) { return html.replace(/<[^>]+>/g, '').trim(); }

function extractEntity(eventHtml) {
  var linkRe = /<a[^>]*href="\/wiki\/([^"#]+?)(?:#[^"]*)?"[^>]*>/g;
  var links = [];
  var m;
  while ((m = linkRe.exec(eventHtml)) !== null) {
    var title = decodeURIComponent(m[1].replace(/_/g, ' '));
    if (title.length > 2 && title.length < 80 && title.indexOf(':') === -1 && title.indexOf('/') === -1) {
      links.push(title);
    }
  }
  return links.length > 0 ? links[0] : '';
}

function scoreEvent(ev) {
  var text = ev.text.toLowerCase();
  var entity = ev.entity.toLowerCase();
  var score = 0;

  // --- India content ---
  if (/india/i.test(text)) {
    score += 4;
    if (/government|pm|modi|minist|scheme|policy|budget|parliament|election|bill|act|rupee|rupees|billion|crore/i.test(text)) score += 3;
    if (/sign|deal|agreement|visit|summit|meeting|bilateral/i.test(text)) score += 3;
    if (/defence|defense|missile|navy|air force|army|border|drdo|isro|space/i.test(text)) score += 3;
    if (/supreme court|high court|verdict|judgment|ruling/i.test(text)) score += 3;
  }
  if (/indian/i.test(entity)) score += 3;

  // --- Major global orgs (abbrev + full names) ---
  if (/\b(united nations|who|world bank|imf|wto|nato|eu|brics|g20|scos?|oecd|opec|aib|adb|ndb|unicef|unesco|icj|icc|fao|ilo|iaea|wipo|international atomic energy agency|international monetary fund|world health organization|world trade organization|united nations children.s fund|united nations educational|international court of justice|international criminal court)\b/i.test(text)) score += 4;
  if (/\b(who|united nations|world bank|imf|brics|g20|nato)\b/i.test(entity)) score += 3;

  // --- Countries (in entity or text) ---
  // Entity starts with major country
  if (/^(usa|united states|china|russia|uk|japan|germany|france|iran|israel|pakistan|australia|canada|south korea|north korea|indonesia|turkey|italy|spain)\b/i.test(entity)) score += 2;
  if (/^(bangladesh|nepal|sri lanka|afghanistan|myanmar|ukraine|taiwan)\b/i.test(entity)) score += 2;
  // Text mentions key countries (for events where entity is an institution, not the country)
  if (/\b(usa|united states|china|russia|uk|japan|germany|france|iran|israel|pakistan|australia|canada|south korea|north korea|turkey|ukraine|taiwan)\b/i.test(text)) score += 1;

  // --- Exam-relevant topics ---
  // Treaties, agreements, summits, ceasefire
  if (/treaty|summit|agreement|pact|accord|memorandum|protocol|convention|ceasefire|truce|prisoner\s+exchange/i.test(text)) score += 3;
  // Elections, referendums, appointments
  if (/election|elected|appointed|re-elected|sworn\s+in|referendum|president|prime minister\b/i.test(text)) score += 3;
  // Economy
  if (/gdp|inflation|budget|fiscal|monetary|deficit|tariff|sanctions|trade\s+(war|deal)/i.test(text)) score += 3;
  // Science & tech
  if (/launch(?:ed|es)?\s+(?:satellite|mission|rocket|spacecraft)|isro|nasa|space\s+(?:station|mission)|discover(?:y|ed)|clinical\s+trial|vaccine|gene|dna|quantum|ai\s+|artificial\s+intelligence/i.test(text)) score += 3;
  // Defence, nuclear
  if (/exercise|drill|missile|warship|submarine|fighter\s+jet|defence|defense|military\s+(?:exercise|drill|aid)|nuclear\s+(?:weapon|test|program|facility)/i.test(text)) score += 2;
  // Environment
  if (/climate|emissions|carbon|renewable|conservation|endangered|species|habitat|deforestation|paris\s+agreement|cop\d+/i.test(text)) score += 2;
  // Awards & obituaries
  if (/nobel|prize|award(?:ed)?|died|death|passed\s+away|obituary|cremation|funeral/i.test(text)) score += 3;
  // Legal/Judicial (broad)
  if (/supreme\s+court|verdict|judgment|ruling|amendment|bill|legislation|law|enact|enacted|cleared|approved|court\s+rules|court\s+sentence|war\s+crime|war\s+crimes|genocide|crimes\s+against\s+humanity/i.test(text)) score += 2;
  // Health
  if (/outbreak|pandemic|epidemic|ebola|marburg|virus|disease|clinical|trial/i.test(text)) score += 2;
  // Major disasters (>10 dead)
  if (/(\d{2,})\s+(?:people|persons|killed?|dead|die|death)/i.test(text) && parseInt(RegExp.$1) >= 10) score += 2;

  // --- HEAVY penalties for low-value content ---
  // Transportation accidents
  if (/\b(bus|car|truck|van|train|plane|vehicle|lorry|ambulance)\s+(crash|collision|accident|overturn|plunge|ram|hit|struck|collided|plows?|ploughs?)\b/i.test(text)) score -= 8;
  if (/\b(collides?|collided?|collision)\s+with\s+(a\s+)?(bus|car|truck|van|train|tractor)\b/i.test(text)) score -= 8;
  // Routine fires
  if (/fire\s+(?:at|in|kills|destroys?|gut)/i.test(text) && !/government|investigation|compensation/i.test(text) && !/industry/i.test(text)) score -= 3;
  // Sports
  if (/\b(tennis|football|cricket|basketball|golf|hockey|baseball|badminton|swimming|athletics|auto racing)\b/i.test(entity) && !/\b(world\s+(?:cup|championship)|olympic|asian\s+games|grand\s+slam|super\s+(?:bowl|league))\b/i.test(text)) score -= 6;
  if (/ipl|indian premier league/i.test(text) && !/award|ban|scandal|investigation/i.test(text)) score -= 6;
  // Entertainment
  if (/\b(actress|actor|singer|film|movie|album|concert|song|musician|director|producer)\b/i.test(entity) && !/died|award|nobel|funeral/i.test(text)) score -= 6;
  // Local crime
  if (/(?:shooting|stabbing|robbery|murder)\s+(?:at|in|near|of|kills)/i.test(text) && !/terroris|militant|government|police\s+(?:operation|action|kill)/i.test(text)) score -= 5;
  // Routine business
  if (/acquire|merger|stocks?|shares?|bought|purchased|sold/i.test(text) && !/india|regulator|approved|ban|government|policy/i.test(text)) score -= 3;
  // Routine weather
  if (/\b(storm|rain|snow|heatwave?|hail)\b/i.test(entity) && !/india|die|killed|destroy|flood/i.test(text)) score -= 3;
  // Very short events
  if (text.length < 60) score -= 2;
  // Missing country context
  if (entity.split(' ').length > 3 && !/india|united nations|who|world|international|china|russia|usa|uk|iran|israel/i.test(text)) score -= 2;

  return score;
}

async function fetchMonthEvents(year, month) {
  var page = 'Portal:Current_events/' + MONTHS[month - 1] + '_' + year;
  var url = API + '?action=parse&page=' + encodeURIComponent(page) + '&prop=text&format=json';

  var data;
  try {
    data = await fetchJSON(url);
  } catch (e) {
    console.error('  Error fetching ' + page + ': ' + e.message);
    return [];
  }

  if (!data || !data.parse || !data.parse.text) {
    console.error('  No data for ' + page);
    return [];
  }

  var html = data.parse.text['*'] || '';
  var results = [];
  var liRe = /<li>(.*?)<\/li>/g;
  var m;
  while ((m = liRe.exec(html)) !== null) {
    var txt = stripHtml(m[1]);
    if (txt.length > 40 && txt.length < 400) {
      var entity = extractEntity(m[1]);
      if (entity) {
        results.push({
          text: txt,
          entity: entity,
          date: { year: year, month: month }
        });
      }
    }
  }

  console.error('  ' + page + ': ' + results.length + ' raw events');
  return results;
}

function pad(n) { return n < 10 ? '0' + n : '' + n; }

function makeQuestion(event, index) {
  var d = event.date;
  var id = 'ce_' + d.year + '_' + pad(d.month) + '_' + pad(index + 1);
  var pubDate = d.year + '-' + pad(d.month) + '-15T12:00:00.000Z';
  var monthLabel = MONTHS[d.month - 1] + ' ' + d.year;

  var qText = event.text;
  if (qText.length > 250) qText = qText.substring(0, 247) + '...';

  return {
    id: id,
    type: 'fill_blank',
    category: 'Current Affairs',
    region: '',
    source: 'Wikipedia Current Events',
    pubDate: pubDate,
    subject: 'Current Affairs',
    subSubject: monthLabel,
    emoji: '',
    question: qText,
    answer: event.entity,
    hint: '',
    fact: event.text.substring(0, 500)
  };
}

async function main() {
  var now = new Date();
  var cy = now.getFullYear();
  var cm = now.getMonth() + 1;

  var allEvents = [];

  for (var i = 0; i < 6; i++) {
    var m = cm - i;
    var y = cy;
    if (m <= 0) { m += 12; y--; }

    console.error('Fetching ' + MONTHS[m - 1] + ' ' + y + '...');
    var events = await fetchMonthEvents(y, m);

    events.forEach(function(ev) { ev.score = scoreEvent(ev); });
    events.sort(function(a, b) { return b.score - a.score; });

    var kept = events.filter(function(ev) { return ev.score >= 2; });
    kept = kept.slice(0, 25);

    console.error('  -> ' + kept.length + ' kept (scores ' + (kept.length > 0 ? kept[kept.length-1].score : 'N/A') + '–' + (kept.length > 0 ? kept[0].score : 'N/A') + ')');
    allEvents = allEvents.concat(kept);

    if (i < 5) await delay(2500);
  }

  console.error('Total kept: ' + allEvents.length);

  if (allEvents.length === 0) {
    console.error('No events fetched. Skipping write.');
    process.exit(1);
  }

  allEvents.sort(function(a, b) {
    if (a.date.year !== b.date.year) return b.date.year - a.date.year;
    if (a.date.month !== b.date.month) return b.date.month - a.date.month;
    return b.score - a.score;
  });

  var output = { 'Current Affairs': { subSubjects: {} } };
  var counter = {};

  allEvents.forEach(function(ev) {
    var monthKey = MONTHS[ev.date.month - 1] + ' ' + ev.date.year;
    if (!output['Current Affairs'].subSubjects[monthKey]) {
      output['Current Affairs'].subSubjects[monthKey] = [];
      counter[monthKey] = 0;
    }
    counter[monthKey]++;
    output['Current Affairs'].subSubjects[monthKey].push(makeQuestion(ev, counter[monthKey]));
  });

  fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2), 'utf8');
  console.error('Wrote ' + OUTPUT);

  var total = 0;
  for (var sk in output['Current Affairs'].subSubjects) {
    var count = output['Current Affairs'].subSubjects[sk].length;
    console.error('  ' + sk + ': ' + count + ' events');
    total += count;
  }
  console.error('Total: ' + total + ' events');
}

main().catch(function(err) {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
