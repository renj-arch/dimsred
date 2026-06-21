var fs = require('fs');
var path = require('path');

var dataDir = path.resolve(__dirname, '..', 'data');
var feedPath = path.join(dataDir, 'pib-feed.json');
var quizPath = path.join(dataDir, 'quiz.json');

// Extract numbered entities with their units
function extractNumber(text) {
  var m = text.match(/(\d[\d,]*)\s*(lakh|crore|million|billion|thousand|GW|MW|KW|KV|%)\b/i) ||
          text.match(/₹\s*(\d[\d,]*)\s*(lakh|crore|billion|thousand)?/i) ||
          text.match(/(\d+(?:th|rd|nd|st))\b/i) ||
          text.match(/(\d[\d,]*)\s*(?:rupees?|houses?|beneficiaries?|students?|farmers?|posts?|villages?|districts?|states?|lakh|crore)/i) ||
          text.match(/(\d[\d,]*)/);
  return m ? { num: m[1], unit: (m[2] || '').toLowerCase() } : null;
}

function extractNamedEntity(text) {
  // Ministry
  var stop = text.search(/\s+(?:has|announced|launched|approved|sanctioned|notified|prohibited|reviews|chairs|organises|partners|holds|releases|facilitates|issues|signs|takes|introduces|inaugurates|rolls|marks|invites|extends|addresses|says|stated|met|visited|flags)\s/);
  if (stop > 0) {
    var prefix = text.substring(0, stop);
    var m = prefix.match(/(?:Union\s+)?(Ministry of [\w\s&]+)/i);
    if (m) return { value: m[1].trim(), type: 'ministry' };
  }

  // Person with title
  var personStop = text.search(/\s+(?:said|addressed|launched|inaugurated|announced|reviewed|visited|chairs|addresses|holds|reviews|commissions|sanctions|disburses|graces|flags|met|exchanges|discusses|highlights|condoles|expresses|pays|offers|shares|participates|leads|observes)\s/);
  if (personStop > 0) {
    var personPrefix = text.substring(0, personStop);
    m = personPrefix.match(/(Raksha Mantri|Home Minister|Finance Minister|Defence Minister|Health Minister|Education Minister|Commerce Secretary|Cabinet Secretary|Prime Minister|President|Vice President|Attorney General|CJI|Chief Justice)\s+(?:Shri|Smt|Dr|Shri\.)?\s*([A-Z][\w\s.]+)/i);
    if (m) return { value: (m[1] + ' ' + m[2]).trim(), type: 'person' };
  }

  // Scheme
  m = text.match(/((?:Pradhan Mantri|PM|National|Bharat|Ayushman|Jan|Digital|Smart|Skill|Swachh)\s+[\w\s]{2,40}?(?:Yojana|Scheme|Mission|Abhiyan|Programme|Policy|Vision|Niryat|Rozgar|Kisan|Awas|Bank|Suraksha|Shakti|Seva|Sathi))/i);
  if (m) return { value: m[1].trim(), type: 'scheme' };

  return null;
}

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function determineSubject(text, category, source) {
  var t = text + ' ' + (category || '');
  if (/(?:Constitution|Amendment|Article\s+\d+|Fundamental\s+(?:Right|Duty)|Directive\s+Principle|Scheduled\s+(?:Caste|Tribe)|Panchayati\s+Raj|73rd|74th\s+Amendment)/i.test(t))
    return { subject: 'Constitution', emoji: '⚖️' };
  if (/ISRO|Chandrayaan|Mangalyaan|Gaganyaan|Aditya|NASA|Space\s+Station|Satellite|Orbit|Rocket|Launch\s+Vehicle/i.test(t))
    return { subject: 'ISRO & Space', emoji: '🚀' };
  if (/Defence|Army|Navy|Air\s+Force|Missile|Exercise|Raksha\s+Mantri|Indigenous\s+Weapon|DRDO|BEML|Warship|Submarine|INS\s+\w+/i.test(t))
    return { subject: 'Defence', emoji: '⚔️' };
  if (/Olympics|Asian\s+Games|Commonwealth|Cricket|World\s+Cup|Medal|Tournament|Championship|Athlete|Saina|Koneru|Grandmaster/i.test(t))
    return { subject: 'Sports', emoji: '🏆' };
  if (/National\s+Park|Tiger\s+Reserve|Wildlife\s+Sanctuary|Biosphere|Ramsar|UNESCO\s+World\s+Heritage|Elephant|Leopard|Endangered\s+Species/i.test(t))
    return { subject: 'National Parks & Wildlife', emoji: '🌲' };
  if (/Dance|Folk\s+Dance|Classical\s+Dance|Kathak|Bharatanatyam|Odissi|Kuchipudi|Manipuri|Mohiniyattam|Sattriya/i.test(t))
    return { subject: 'Dance Forms', emoji: '💃' };
  if (/Bharat\s+Ratna|Padma\s+(?:Shri|Bhushan|Vibhushan)|Nobel|Oscar|Grammy|Booker|Dadasaheb|National\s+Film\s+Award|Arjuna|Khel\s+Ratna|Dronacharya/i.test(t))
    return { subject: 'Awards & Honours', emoji: '🎖️' };
  if (/Dam|River\s+Project|Hydroelectric|Irrigation\s+Project|Bhakra|Hirakud|Tehri|Sardar\s+Sarovar|Narmada|Godavari|Krishna|Cauvery/i.test(t))
    return { subject: 'Dams & Rivers', emoji: '🌊' };
  if (/Important\s+Day|World\s+\w+\s+Day|National\s+\w+\s+Day|International\s+Day|Observance/i.test(t))
    return { subject: 'Important Days', emoji: '📅' };
  if (/Ancient|Medieval|Mughal|Maurya|Gupta|Indus\s+Valley|Vedic|Freedom\s+Struggle|Independence|1857|Jallianwala|Satyagraha|Quit\s+India/i.test(t))
    return { subject: 'Indian History', emoji: '📜' };
  if (/Climate|Environment|Pollution|Emissions|Greenhouse|Global\s+Warming|Carbon|Renewable\s+Energy|Solar\s+Energy|Wind\s+Energy|Electric\s+Vehicle|Green\s+Hydrogen/i.test(t))
    return { subject: 'Environment & Ecology', emoji: '🌿' };
  if (/Foreign|Embassy|Diplomatic|Consulate|Envoy|Ambassador|High\s+Commissioner/i.test(t))
    return { subject: 'International Relations', emoji: '🤝' };
  if (/\bUN\b|United\s+Nations|BRICS|SAARC|WTO|IMF|World\s+Bank|G20|\bQUAD\b|Indo-Pacific|Bilateral|Foreign\s+Policy|Summit|Treaty|Pact/i.test(t))
    return { subject: 'International', emoji: '🌐' };
  if (/Computer|\bAI\b|Artificial\s+Intelligence|Cyber|Digital|Internet|Software|\bIT\b|Blockchain|Data\s+Protection|Semiconductor|5G/i.test(t))
    return { subject: 'Computer & IT', emoji: '💻' };
  if (/Science|Research|Innovation|Patent|Invention|Discovery|Laboratory|Nuclear|Biotechnology|Nanotechnology|Gene|Genome|Vaccine/i.test(t))
    return { subject: 'General Science', emoji: '🔬' };
  if (/Economy|GDP|Inflation|Budget|Fiscal|Monetary|Banking|\bRBI\b|\bSEBI\b|Market|Stock|Investment|GST|Tax|Tariff|Trade|Export|Import/i.test(t))
    return { subject: 'Indian Economy', emoji: '💰' };
  if (/Geography|Climate|Monsoon|Crop|Soil|Mineral|Map|Latitude|Longitude|Physiographic|Himalaya|Peninsula|Coast|Island/i.test(t))
    return { subject: 'Geography', emoji: '🌍' };
  if (/Ayushman|PM-KISAN|Jal\s+Jeevan|Ujjwala|Awas|Rozgar|Jan\s+Dhan|Mudra|Skill\s+India|Digital\s+India|Make\s+in\s+India|Mission|Yojana|Abhiyan|Scheme|Policy/i.test(t))
    return { subject: 'Govt Schemes', emoji: '🏛️' };
  if (/Education|School|College|University|NEP|Scholarship|Student|Teacher|Faculty|National\s+Education/i.test(t))
    return { subject: 'Govt Schemes', emoji: '🏛️' };
  if (/Health|Hospital|Medicine|Drug|Pharma|Medical|Ayurveda|Disease|Epidemic|Pandemic/i.test(t))
    return { subject: 'Govt Schemes', emoji: '🏛️' };
  if (/Agriculture|Farmer|Crop|Kisan|Mandi|Food|Fertilizer|Seed|Irrigation|Organic|FPO|Horticulture/i.test(t))
    return { subject: 'Geography', emoji: '🌍' };
  if (/Culture|Heritage|Museum|Painting|Sculpture|Music|Festival|Theatre|Cinema|Film|Monument|Temple|Mosque|Church|Architecture/i.test(t))
    return { subject: 'Art & Culture', emoji: '🎭' };
  if (/Country|Capital|Currency|Wonders|Continent|Ocean|Sea|Mountain|Desert/i.test(t))
    return { subject: 'World Geography', emoji: '🗺️' };
  if (/Parliament|Election|Bill|Legislation|Judiciary|Supreme\s+Court|Governor|Chief\s+Minister|Election\s+Commission|Appointment|Assumes\s+Charge|Takes\s+Over\s+as|Oath|Sworn|Secretary|Commissioner|Committee/i.test(t))
    return { subject: 'Polity', emoji: '🏛️' };
  if (source === 'RBI' || source === 'SEBI') return { subject: 'Indian Economy', emoji: '💰' };
  if (source === 'ISRO') return { subject: 'ISRO & Space', emoji: '🚀' };
  if (source === 'MEA') return { subject: 'International Relations', emoji: '🤝' };
  return { subject: 'Govt Schemes', emoji: '🏛️' };
}

function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

function generateQuiz(items) {
  var questions = [];
  var used = new Set();

  // Collect all entities for distractor pools
  var allNumbers = [];
  var allMinistries = [];
  var allSchemes = [];
  var allPersons = [];

  items.forEach(function(item) {
    var t = item.title + ' ' + (item.description || '');
    var ne = extractNumber(t);
    if (ne && ne.num) allNumbers.push(ne);
    var named = extractNamedEntity(t);
    if (named) {
      if (named.type === 'ministry') allMinistries.push(named.value);
      else if (named.type === 'scheme') allSchemes.push(named.value);
      else if (named.type === 'person') allPersons.push(named.value);
    }
  });

  items.forEach(function(item) {
    if (used.has(item.id)) return;
    var t = item.title;
    var d = item.description || '';

    // Try number-based fill-blank first
    var ne = extractNumber(t);
    if (ne && ne.num && ne.num.length > 1) {
      var displayNum = ne.num + (ne.unit ? ' ' + ne.unit : '');
      var blankText = t.replace(new RegExp(ne.num.replace(',', '\\,'), ''), '_____');
      if (blankText !== t && blankText.length > 20) {
        var pool = allNumbers.filter(function(n) { return n.num !== ne.num; });
        var dist = [];
        // Find numbers with same unit first (same scale)
        var sameUnit = pool.filter(function(n) { return n.unit === ne.unit; });
        var candidates = sameUnit.length >= 3 ? sameUnit : pool;
        // Sort by numeric closeness
        var target = parseFloat(ne.num.replace(/,/g, ''));
        candidates.sort(function(a, b) {
          var da = parseFloat(a.num.replace(/,/g, ''));
          var db = parseFloat(b.num.replace(/,/g, ''));
          return Math.abs(da - target) - Math.abs(db - target);
        });
        for (var i = 0; i < candidates.length && dist.length < 3; i++) {
          var v = candidates[i].num + (candidates[i].unit ? ' ' + candidates[i].unit : '');
          if (dist.indexOf(v) === -1) dist.push(v);
        }
        while (dist.length < 3) { dist.push('None'); }
        var subj = determineSubject(t, item.category, item.source);
        questions.push({
          id: item.id + '-num', type: 'fill_blank', category: item.category,
          region: item.region || '', source: item.source, pubDate: item.pubDate,
          subject: subj.subject, emoji: subj.emoji,
          question: blankText, answer: displayNum,
          options: shuffle([displayNum].concat(dist.slice(0, 3)))
        });
        used.add(item.id);
        return;
      }
    }

    // Try named entity (ministry/person/scheme) based question
    var named = extractNamedEntity(t);
    if (named) {
      var answer = named.value;
      var pool = named.type === 'ministry' ? allMinistries : named.type === 'scheme' ? allSchemes : allPersons;
      var dist = shuffle(pool.filter(function(v) { return v !== answer; }));
      if (named.type === 'ministry') {
        var subj = determineSubject(t, item.category, item.source);
        questions.push({
          id: item.id + '-min', type: 'who', category: item.category,
          region: item.region || '', source: item.source, pubDate: item.pubDate,
          subject: subj.subject, emoji: subj.emoji,
          question: 'Which ministry/organisation is associated with this news?\n"' + t.substring(0, 120) + '"',
          answer: answer, options: shuffle([answer].concat(dist.slice(0, 3)).concat(['None']))
        });
        used.add(item.id);
        return;
      }
      if (named.type === 'scheme' || named.type === 'person') {
        var blankQ = t.replace(named.value, '_____');
        if (blankQ !== t) {
          var subj = determineSubject(t, item.category, item.source);
          questions.push({
            id: item.id + '-ent', type: 'fill_blank', category: item.category,
            region: item.region || '', source: item.source, pubDate: item.pubDate,
            subject: subj.subject, emoji: subj.emoji,
            question: blankQ, answer: answer,
            options: shuffle([answer].concat(dist.slice(0, 3)).concat(['None']))
          });
          used.add(item.id);
          return;
        }
      }
    }

    // Fallback: true/false for remaining items (limit to avoid too many T/F)
    if (questions.filter(function(q) { return q.type === 'true_false'; }).length < 10) {
      var isTrue = Math.random() > 0.5;
      var text = t.substring(0, 120);
      if (isTrue) {
        var subj = determineSubject(t, item.category, item.source);
        questions.push({
          id: item.id + '-tf', type: 'true_false', category: item.category,
          region: item.region || '', source: item.source, pubDate: item.pubDate,
          subject: subj.subject, emoji: subj.emoji,
          question: 'True or False: ' + text.replace(/\.$/, '') + '.',
          answer: 'True', options: ['True', 'False']
        });
      } else {
        // Create plausible false version: swap entity
        var swapped = t;
        var ne2 = extractNumber(t);
        if (ne2 && ne2.num) {
          var wrongNum = (parseInt(ne2.num.replace(/,/g, '')) + Math.floor(Math.random() * 5) + 1).toString();
          swapped = t.replace(new RegExp(ne2.num.replace(',', '\\,'), ''), wrongNum);
        } else if (/approved|launched|sanctioned/i.test(t)) {
          swapped = t.replace(/approved|launched|sanctioned/i, 'delayed');
        } else if (/inaugurated|commissioned|opened/i.test(t)) {
          swapped = t.replace(/inaugurated|commissioned|opened/i, 'postponed');
        } else {
          // Generic: add "Not" before key verb
          swapped = t.replace(/\b(will|has|is|was)\s+(announced|approved|launched|sanctioned|released|inaugurated|notified|introduced|partners|facilitates|reviews|commissions|disburses|chairs|holds|organises|signs|flags|marks|invites|addresses)/i, '$1 NOT $2');
        }
        if (swapped === t) return;
        var subj = determineSubject(t, item.category, item.source);
        questions.push({
          id: item.id + '-tf', type: 'true_false', category: item.category,
          region: item.region || '', source: item.source, pubDate: item.pubDate,
          subject: subj.subject, emoji: subj.emoji,
          question: 'True or False: ' + swapped.substring(0, 120).replace(/\.$/, '') + '.',
          answer: 'False', options: ['True', 'False']
        });
      }
      used.add(item.id);
    }
  });

  // Shuffle and take top 25
  return shuffle(questions).slice(0, 25);
}

function main() {
  if (!fs.existsSync(feedPath)) { console.error('Feed not found'); return; }
  var feed = JSON.parse(fs.readFileSync(feedPath, 'utf-8'));
  var items = feed.items || [];
  if (items.length === 0) { console.error('No items'); return; }

  var questions = generateQuiz(items);

  var existing = [];
  if (fs.existsSync(quizPath)) {
    try { existing = JSON.parse(fs.readFileSync(quizPath, 'utf-8')); } catch(e) { existing = []; }
    if (existing.questions) existing = existing.questions;
  }

  var todayKey = new Date().toISOString().substring(0, 10);
  existing = existing.filter(function(q) { return q.pubDate.substring(0, 10) !== todayKey; });
  // Re-evaluate subject for all existing questions (in case subject logic improved)
  existing = existing.map(function(q) {
    var subj = determineSubject(q.question, q.category, q.source);
    q.subject = subj.subject; q.emoji = subj.emoji;
    return q;
  });
  existing = questions.concat(existing);
  if (existing.length > 100) existing = existing.slice(0, 100);

  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(quizPath, JSON.stringify({ questions: existing, updatedAt: new Date().toISOString() }, null, 2));
  console.log('Quiz saved: ' + questions.length + ' new questions (total: ' + existing.length + ')');
}

main();
