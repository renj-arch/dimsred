var fs = require('fs');
var path = require('path');

var DATA = path.resolve(__dirname, '..', 'data');
var ARCHIVE = path.join(DATA, 'questions', 'pib-archive.json');
var FEED = path.join(DATA, 'pib-feed.json');

var PIB_KEY = 'PIB Releases';
var SUBJECT = 'PIB Releases';
var EMOJI = '\uD83D\uDCF0';

function norm(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function bigramSimilarity(a, b) {
  if (a.length < 2 || b.length < 2) return 0;
  function gramSet(s) {
    var set = {};
    for (var i = 0; i < s.length - 1; i++) set[s.substring(i, i + 2)] = true;
    return set;
  }
  var setA = gramSet(a), setB = gramSet(b);
  var inter = 0, allKeys = {};
  Object.keys(setA).forEach(function(k) { allKeys[k] = true; });
  Object.keys(setB).forEach(function(k) { allKeys[k] = true; });
  Object.keys(allKeys).forEach(function(k) {
    if (setA[k] && setB[k]) inter++;
  });
  var total = Object.keys(allKeys).length;
  return total === 0 ? 0 : inter / total;
}

function titleInFact(title, fact) {
  var tn = norm(title);
  var fn = norm(fact);
  if (fn.indexOf(tn) >= 0) return true;
  if (tn.length > 60 && fn.indexOf(tn.slice(0, 60)) >= 0) return true;
  if (tn.length > 40 && fn.indexOf(tn.slice(0, 40)) >= 0) return true;
  if (bigramSimilarity(tn, fn) > 0.3) return true;
  return false;
}

function extractNumber(text) {
  var m = text.match(/(\d[\d,]*)\s*(lakh|crore|million|billion|thousand|GW|MW|KW|KV|%)\b/i) ||
          text.match(/₹\s*(\d[\d,]*)\s*(lakh|crore|billion|thousand)?/i) ||
          text.match(/(\d+(?:th|rd|nd|st))\b/i) ||
          text.match(/(\d[\d,]*)\s*(?:rupees?|houses?|beneficiaries?|students?|farmers?|posts?|villages?|districts?|states?|lakh|crore)/i) ||
          text.match(/(\d[\d,]*)/);
  return m ? { num: m[1], unit: (m[2] || '').toLowerCase() } : null;
}

function extractNamedEntity(text) {
  var stop = text.search(/\s+(?:has|announced|launched|approved|sanctioned|notified|prohibited|reviews|chairs|organises|partners|holds|releases|facilitates|issues|signs|takes|introduces|inaugurates|rolls|marks|invites|extends|addresses|says|stated|met|visited|flags)\s/);
  if (stop > 0) {
    var prefix = text.substring(0, stop);
    var m = prefix.match(/(?:Union\s+)?(Ministry of [\w\s&]+)/i);
    if (m) return { value: m[1].trim(), type: 'ministry' };
  }
  var personStop = text.search(/\s+(?:said|addressed|launched|inaugurated|announced|reviewed|visited|chairs|addresses|holds|reviews|commissions|sanctions|disburses|graces|flags|met|exchanges|discusses|highlights|condoles|expresses|pays|offers|shares|participates|leads|observes)\s/);
  if (personStop > 0) {
    var personPrefix = text.substring(0, personStop);
    m = personPrefix.match(/(Raksha Mantri|Home Minister|Finance Minister|Defence Minister|Health Minister|Education Minister|Commerce Secretary|Cabinet Secretary|Prime Minister|President|Vice President|Attorney General|CJI|Chief Justice)\s+(?:Shri|Smt|Dr|Shri\.)?\s*([A-Z][\w\s.]+)/i);
    if (m) return { value: (m[1] + ' ' + m[2]).trim(), type: 'person' };
  }
  var awardMatch = text.match(/(?:present(?:s|ed)?|confer(?:s|red)?|award(?:s|ed)?|honour(?:s|ed)?|receives?|gets?|selected\s+for|chosen\s+for)\s+(?:the\s+)?(?:Bharat\s+Ratna|Padma\s+(?:Vibhushan|Bhushan|Shri))\s+(?:upon|to|on)\s+(?:Shri|Smt|Dr|Prof)\.?\s*([A-Z][\w\s.]+?)(?:\s+(?:for|in|by|,|$)|$)/i);
  if (!awardMatch) awardMatch = text.match(/(?:Bharat\s+Ratna|Padma\s+(?:Vibhushan|Bhushan|Shri))\s+(?:award(?:ed|ee)?|recipient|conferred)\s+(?:upon|to|on|is\s+)(?:Shri|Smt|Dr|Prof)\.?\s*([A-Z][\w\s.]+?)(?:\s+(?:for|in|by|,|$)|$)/i);
  if (awardMatch) return { value: awardMatch[1].trim(), type: 'person' };
  m = text.match(/((?:Pradhan Mantri|PM|National|Bharat|Ayushman|Jan|Digital|Smart|Skill|Swachh)\s+[\w\s]{2,40}?(?:Yojana|Scheme|Mission|Abhiyan|Programme|Policy|Vision|Niryat|Rozgar|Kisan|Awas|Bank|Suraksha|Shakti|Seva|Sathi))/i);
  if (m) return { value: m[1].trim(), type: 'scheme' };
  return null;
}

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

function determineSubject(text, category, source) {
  var t = text + ' ' + (category || '');
  if (/(?:Constitution|Amendment|Article\s+\d+|Fundamental\s+(?:Right|Duty)|Directive\s+Principle|Scheduled\s+(?:Caste|Tribe)|Panchayati\s+Raj|73rd|74th\s+Amendment)/i.test(t))
    return { subject: 'Constitution', emoji: '\u2696\uFE0F' };
  if (/ISRO|Chandrayaan|Mangalyaan|Gaganyaan|Aditya|NASA|Space\s+Station|Satellite|Orbit|Rocket|Launch\s+Vehicle/i.test(t))
    return { subject: 'ISRO & Space', emoji: '\uD83D\uDE80' };
  if (/Defence|Army|Navy|Air\s+Force|Missile|Exercise|Raksha\s+Mantri|Indigenous\s+Weapon|DRDO|BEML|Warship|Submarine|INS\s+\w+/i.test(t))
    return { subject: 'Defence', emoji: '\u2694\uFE0F' };
  if (/Olympics|Asian\s+Games|Commonwealth|Cricket|World\s+Cup|Medal|Tournament|Championship|Athlete|Saina|Koneru|Grandmaster/i.test(t))
    return { subject: 'Sports', emoji: '\uD83C\uDFC6' };
  if (/National\s+Park|Tiger\s+Reserve|Wildlife\s+Sanctuary|Biosphere|Ramsar|UNESCO\s+World\s+Heritage|Elephant|Leopard|Endangered\s+Species/i.test(t))
    return { subject: 'National Parks & Wildlife', emoji: '\uD83C\uDF32' };
  if (/Dance|Folk\s+Dance|Classical\s+Dance|Kathak|Bharatanatyam|Odissi|Kuchipudi|Manipuri|Mohiniyattam|Sattriya/i.test(t))
    return { subject: 'Dance Forms', emoji: '\uD83D\uDC83' };
  if (/Bharat\s+Ratna|Padma\s+(?:Shri|Bhushan|Vibhushan)|Nobel|Oscar|Grammy|Booker|Dadasaheb|National\s+Film\s+Award|Arjuna|Khel\s+Ratna|Dronacharya/i.test(t))
    return { subject: 'Awards & Honours', emoji: '\uD83C\uDF96\uFE0F' };
  if (/Dam|River\s+Project|Hydroelectric|Irrigation\s+Project|Bhakra|Hirakud|Tehri|Sardar\s+Sarovar|Narmada|Godavari|Krishna|Cauvery/i.test(t))
    return { subject: 'Dams & Rivers', emoji: '\uD83C\uDF0A' };
  if (/Important\s+Day|World\s+\w+\s+Day|National\s+\w+\s+Day|International\s+Day|Observance/i.test(t))
    return { subject: 'Important Days', emoji: '\uD83D\uDCC5' };
  if (/Ancient|Medieval|Mughal|Maurya|Gupta|Indus\s+Valley|Vedic|Freedom\s+Struggle|Independence|1857|Jallianwala|Satyagraha|Quit\s+India/i.test(t))
    return { subject: 'Indian History', emoji: '\uD83D\uDCDC' };
  if (/Climate|Environment|Pollution|Emissions|Greenhouse|Global\s+Warming|Carbon|Renewable\s+Energy|Solar\s+Energy|Wind\s+Energy|Electric\s+Vehicle|Green\s+Hydrogen/i.test(t))
    return { subject: 'Environment & Ecology', emoji: '\uD83C\uDF3F' };
  if (/Foreign|Embassy|Diplomatic|Consulate|Envoy|Ambassador|High\s+Commissioner/i.test(t))
    return { subject: 'International Relations', emoji: '\uD83E\uDD1D' };
  if (/\bUN\b|United\s+Nations|BRICS|SAARC|WTO|IMF|World\s+Bank|G20|\bQUAD\b|Indo-Pacific|Bilateral|Foreign\s+Policy|Summit|Treaty|Pact/i.test(t))
    return { subject: 'International', emoji: '\uD83C\uDF10' };
  if (/Computer|\bAI\b|Artificial\s+Intelligence|Cyber|Digital|Internet|Software|\bIT\b|Blockchain|Data\s+Protection|Semiconductor|5G/i.test(t))
    return { subject: 'Computer & IT', emoji: '\uD83D\uDCBB' };
  if (/Science|Research|Innovation|Patent|Invention|Discovery|Laboratory|Nuclear|Biotechnology|Nanotechnology|Gene|Genome|Vaccine/i.test(t))
    return { subject: 'General Science', emoji: '\uD83D\uDD2C' };
  if (/Economy|GDP|Inflation|Budget|Fiscal|Monetary|Banking|\bRBI\b|\bSEBI\b|Market|Stock|Investment|GST|Tax|Tariff|Trade|Export|Import/i.test(t))
    return { subject: 'Indian Economy', emoji: '\uD83D\uDCB0' };
  if (/Geography|Climate|Monsoon|Crop|Soil|Mineral|Map|Latitude|Longitude|Physiographic|Himalaya|Peninsula|Coast|Island/i.test(t))
    return { subject: 'Geography', emoji: '\uD83C\uDF0D' };
  if (/Ayushman|PM-KISAN|Jal\s+Jeevan|Ujjwala|Awas|Rozgar|Jan\s+Dhan|Mudra|Skill\s+India|Digital\s+India|Make\s+in\s+India|Mission|Yojana|Abhiyan|Scheme|Policy/i.test(t))
    return { subject: 'Govt Schemes', emoji: '\uD83C\uDFDB\uFE0F' };
  if (/Education|School|College|University|NEP|Scholarship|Student|Teacher|Faculty|National\s+Education/i.test(t))
    return { subject: 'Govt Schemes', emoji: '\uD83C\uDFDB\uFE0F' };
  if (/Health|Hospital|Medicine|Drug|Pharma|Medical|Ayurveda|Disease|Epidemic|Pandemic/i.test(t))
    return { subject: 'Govt Schemes', emoji: '\uD83C\uDFDB\uFE0F' };
  if (/Agriculture|Farmer|Crop|Kisan|Mandi|Food|Fertilizer|Seed|Irrigation|Organic|FPO|Horticulture/i.test(t))
    return { subject: 'Geography', emoji: '\uD83C\uDF0D' };
  if (/Culture|Heritage|Museum|Painting|Sculpture|Music|Festival|Theatre|Cinema|Film|Monument|Temple|Mosque|Church|Architecture/i.test(t))
    return { subject: 'Art & Culture', emoji: '\uD83C\uDFAD' };
  if (/Country|Capital|Currency|Wonders|Continent|Ocean|Sea|Mountain|Desert/i.test(t))
    return { subject: 'World Geography', emoji: '\uD83D\uDDFA\uFE0F' };
  if (/Parliament|Election|Bill|Legislation|Judiciary|Supreme\s+Court|Governor|Chief\s+Minister|Election\s+Commission|Appointment|Assumes\s+Charge|Takes\s+Over\s+as|Oath|Sworn|Secretary|Commissioner|Committee/i.test(t))
    return { subject: 'Polity', emoji: '\uD83C\uDFDB\uFE0F' };
  if (source === 'RBI' || source === 'SEBI') return { subject: 'Indian Economy', emoji: '\uD83D\uDCB0' };
  if (source === 'ISRO') return { subject: 'ISRO & Space', emoji: '\uD83D\uDE80' };
  if (source === 'MEA') return { subject: 'International Relations', emoji: '\uD83E\uDD1D' };
  return { subject: 'Govt Schemes', emoji: '\uD83C\uDFDB\uFE0F' };
}

function smartCase(str) {
  if (str !== str.toUpperCase()) return str;
  var words = str.split(/\s+/);
  var result = [];
  for (var w = 0; w < words.length; w++) {
    var word = words[w];
    if (word.length <= 3 && /^[A-Z]+$/.test(word)) { result.push(word); continue; }
    if (/^[A-Z]{2,}[s]?$/.test(word)) { result.push(word); continue; }
    result.push(word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  }
  return result.join(' ');
}

var TEMPLATES = {
  'Agriculture': [ 'In a key development for the farm sector, ', '. This move aims to strengthen agricultural productivity and farmer welfare.' ],
  'Awards': [ 'In recognition of outstanding contributions, ', '. The honour underscores excellence in the respective field.' ],
  'Appointments': [ 'In a significant administrative move, ', '. The appointment is expected to bring fresh leadership to the position.' ],
  'Business & Economy': [ 'In a major economic development, ', '. The decision is set to impact the broader economic landscape.' ],
  'Defence & Security': [ 'On the defence and security front, ', '. The move reinforces India\'s preparedness and strategic capabilities.' ],
  'Disasters': [ 'In a concerning development, ', '. Relief and rescue operations are underway.' ],
  'Education': [ 'In the education sector, ', '. The initiative aims to enhance learning outcomes and access to quality education.' ],
  'Energy': [ 'In the energy sector, ', '. This contributes to India\'s energy security and sustainability goals.' ],
  'Entertainment': [ 'In the world of arts and culture, ', '. The development highlights India\'s vibrant creative landscape.' ],
  'Environment & Climate': [ 'On the environmental front, ', '. This step aligns with India\'s commitment to sustainable development.' ],
  'Health': [ 'In the healthcare domain, ', '. The measure is expected to benefit public health outcomes.' ],
  'Obituaries': [ 'It is with deep sorrow that, ', '. The nation mourns the loss.' ],
  'Sports': [ 'In the world of sports, ', '. The achievement celebrates India\'s sporting spirit.' ],
  'Tech & Science': [ 'In science and technology, ', '. The advancement marks a significant step in India\'s technological progress.' ],
  'World: Defence & Conflict': [ 'On the global security front, ', '. The development has drawn international attention.' ],
  'World: Politics': [ 'In a significant global political development, ', '. The move has implications for international relations.' ],
  'World: Economy': [ 'In a major global economic development, ', '. The development is expected to impact markets worldwide.' ],
  'World: Environment': [ 'On the global environmental front, ', '. The development highlights pressing environmental challenges.' ],
  'World: Health': [ 'In a global health development, ', '. The update has implications for public health worldwide.' ],
  'World: Science & Tech': [ 'In a global scientific breakthrough, ', '. The achievement advances human knowledge and capability.' ],
  'World: Sports': [ 'In international sports, ', '. The achievement marks a significant milestone in the sporting world.' ],
  'World: Disaster': [ 'In a tragic development, ', '. Emergency response efforts are underway in the affected region.' ],
  'World: Culture': [ 'In the global cultural scene, ', '. The development enriches the world\'s cultural landscape.' ],
  'World: General': [ 'In a global development, ', '. The news has attracted international interest.' ],
  'default': [ 'In a recent development, ', '.' ]
};

var TEMPLATE_SOURCE = {
  'PIB': 'According to the Press Information Bureau (PIB), ',
  'PIB_RSS': 'As per the Press Information Bureau, ',
  'RBI': 'The Reserve Bank of India (RBI) has announced that ',
  'SEBI': 'The Securities and Exchange Board of India (SEBI) has ',
  'ISRO': 'The Indian Space Research Organisation (ISRO) has ',
  'MEA': 'The Ministry of External Affairs (MEA) has ',
  'SC': 'The Supreme Court of India has '
};

function handWriteSummary(title, source, category) {
  var t = title;
  var cat = category || 'default';
  if (t === t.toUpperCase() && t.length > 15) {
    t = smartCase(t);
  }
  t = t.replace(/^["\u201C\u201D\u2018\u2019]+|["\u201C\u201D\u2018\u2019]+$/g, '').trim();
  t = t.replace(/\s*:\s*[A-Z][A-Za-z\s.&]+\s*\([^)]+\)\s*$/g, '').trim();
  t = t.replace(/\s*:\s*[A-Z][A-Za-z\s.&]+\s*$/g, '').trim();
  var tmpl = TEMPLATES[cat] || TEMPLATES['default'];
  var src = TEMPLATE_SOURCE[source];
  var lead = src || tmpl[0];
  var body = t;
  body = body.replace(/^(Prime Minister|PM|President|President of India|Vice President|Union Minister|Home Minister|Finance Minister|Defence Minister|Education Minister|Health Minister)\s+(Shri|Smt|Dr)\s+/i, '').trim();
  body = body.replace(/^(Shri|Smt|Dr)\s+/i, '').trim();
  body = body.replace(/^of\s+/i, '').trim();
  var summary = lead + body + '.';
  if (summary.length > 200) summary = summary.slice(0, 197) + '...';
  return summary;
}

function categorizeItem(title, desc) {
  var t = (title + ' ' + (desc || '')).toLowerCase();
  if (/(?:passes away|demise |condolence|cremated|mortal remains|funeral |tributes |death |departed|last rites|state funeral)/.test(t)) return 'Obituaries';
  if (/(?:sport|athlete|olympi|medal |khelo|hockey|football|cricket|badminton|wrestl|fencing|rower|runner|championship|asian games|world cup|player |coach |fitness|fit india|sports minister|youth affairs|sports board|dope|anti.?doping|stadium|yogasana|world championship|tournament|national games)/.test(t)) return 'Sports';
  if (/(?:award|padma|honou|felicitat|recognition|prize |puraskar|gallantry|decorated|honored)/.test(t)) return 'Awards';
  if (/(?:appointed|takes charge|assumes charge|assumes office|sworn in|oath |secretary|chairperson|chairman|board of|committee formed|nominated)/.test(t)) return 'Appointments';
  if (/(?:flood|earthquake|cyclone|disaster|relief |rescue |emergency|landslide|storm |drought|tsunami|avalanche|heatwave|havoc|devastat)/.test(t)) return 'Disasters';
  if (/(?:film |cinema|movie |festival|culture |cultural|music |dance |drama |art |museum|heritage|exhibition|theatre|actor|actress|entertainment|folk |tribal art|handicraft)/.test(t)) return 'Entertainment';
  if (/(?:technology|digital |it\s|computer|software|ai\s|artificial intelli|space |satellite|innovation|internet|cyber |drone |semiconductor|5g |startup |electronic|robotics|supercomputer|quantum)/.test(t)) return 'Tech & Science';
  if (/(?:economy|gdp |gva |trade |budget |investment|commerce|industry|market|finance|tax |gst |banking|manufacturing|export |import |economic|fdi |inflation|fiscal|monetary|revenue)/.test(t)) return 'Business & Economy';
  if (/(?:health |hospital|medical |doctor |patient|disease|ayushman|medicine|vaccine|pharma|drug |nutrition|wellness|healthcare|ayush|dengue|malaria|tuberculosis)/.test(t)) return 'Health';
  if (/(?:defence|defense|army |navy |air force|drdo|military|soldier|border |missile|submarine|warship|security|terrorism|insurgency|coast guard|paramilitary|peacekeeping)/.test(t)) return 'Defence & Security';
  if (/(?:education|school |college|university|student |teacher |exam |scholarship|fellowship|ncert|nep |new education|skill development|vocational)/.test(t)) return 'Education';
  if (/(?:agriculture|farmer|kisan|crop |food grain|wheat|rice |paddy|fertiliser|irrigation|soil health|msp |minimum support|horticulture|dairy |fisher)/.test(t)) return 'Agriculture';
  if (/(?:energy|electricity|coal |oil |petroleum|natural gas|solar |wind |renewable|hydrogen|biofuel|ethanol|power project|power plant|power sector|power generation|power capacity)/.test(t)) return 'Energy';
  if (/(?:environment|climate|forest|wildlife|pollution|ecology|green |emission|carbon |biodiversity|conservation|wetland|river |ganga |swachh)/.test(t)) return 'Environment & Climate';
  return 'Announcements';
}

function generateQuestion(item, idx) {
  var t = item.title || '';
  var d = item.description || '';
  var cat = item.category || categorizeItem(t, d);
  var fact = handWriteSummary(t, item.source, cat);
  var subj = determineSubject(t, cat, item.source);

  var q = {
    id: 'pib-' + idx,
    type: 'mcq',
    category: 'PIB',
    region: '',
    source: 'PIB',
    pubDate: item.pubDate,
    subject: SUBJECT,
    subSubject: cat,
    emoji: EMOJI,
    _feedId: item.id
  };

  var ne = extractNumber(t);
  if (ne && ne.num && ne.num.length > 1) {
    var displayNum = ne.num + (ne.unit ? ' ' + ne.unit : '');
    var blankText = t.replace(new RegExp(ne.num.replace(',', '\\,'), ''), '_____');
    if (blankText !== t && blankText.length > 20) {
      var numVal = parseFloat(ne.num.replace(/,/g, ''));
      var distractors = [];
      for (var delta = 1; distractors.length < 3; delta++) {
        var vals = [numVal + delta, numVal - delta, numVal + delta * 2, numVal - delta * 2];
        for (var vi = 0; vi < vals.length && distractors.length < 3; vi++) {
          if (vals[vi] > 0) {
            var v = vals[vi].toString() + (ne.unit ? ' ' + ne.unit : '');
            if (distractors.indexOf(v) === -1 && v !== displayNum) distractors.push(v);
          }
        }
      }
      while (distractors.length < 3) distractors.push('None');
      q.question = blankText.length > 120 ? blankText.substring(0, 117) + '...' : blankText;
      q.answer = displayNum;
      q.options = shuffle([displayNum].concat(distractors.slice(0, 3)));
      q.type = 'fill_blank';
      q.hint = 'PIB: ' + cat + ' - Number';
      q.fact = fact;
      return q;
    }
  }

  var named = extractNamedEntity(t);
  if (named) {
    var answer = named.value;
    var pool = (named.type === 'ministry' ? ['Ministry of Finance', 'Ministry of Defence', 'Ministry of Home Affairs', 'Ministry of Health', 'Ministry of Education', 'Ministry of Agriculture', 'Ministry of External Affairs', 'Ministry of Commerce', 'Ministry of Power', 'Ministry of Environment'] :
                named.type === 'scheme' ? ['Pradhan Mantri Awas Yojana', 'Ayushman Bharat', 'PM-KISAN', 'Jal Jeevan Mission', 'Digital India', 'Make in India', 'Skill India', 'Swachh Bharat Mission'] :
                ['Prime Minister', 'President', 'Home Minister', 'Finance Minister', 'Defence Minister', 'Raksha Mantri', 'Vice President', 'Cabinet Secretary']);
    var dist = shuffle(pool.filter(function(v) { return v !== answer; }));
    var questionText = (named.type === 'ministry' ? 'Which ministry/organisation is associated with this news?\n"' : 'Who is associated with this news?\n"') + t.substring(0, 120) + '"';
    q.question = questionText;
    q.answer = answer;
    q.options = shuffle([answer].concat(dist.slice(0, 3)).concat(['None']));
    q.type = named.type === 'ministry' ? 'who' : 'who';
    q.hint = 'PIB: ' + cat;
    q.fact = fact;
    return q;
  }

  q.question = 'What is the key highlight of this PIB release?';
  q.answer = cat === 'Announcements' ? t.substring(0, 100) : cat;
  q.options = shuffle([q.answer, 'Policy Change', 'Budget Allocation', 'International Agreement', 'None']);
  q.type = 'mcq';
  q.hint = 'PIB: ' + cat;
  q.fact = fact;
  return q;
}

function main() {
  if (!fs.existsSync(ARCHIVE)) { console.error('Archive not found: ' + ARCHIVE); process.exit(1); }
  if (!fs.existsSync(FEED)) { console.error('Feed not found: ' + FEED); process.exit(1); }

  var archive = JSON.parse(fs.readFileSync(ARCHIVE, 'utf-8'));
  var feed = JSON.parse(fs.readFileSync(FEED, 'utf-8'));

  var subs = archive[PIB_KEY] && archive[PIB_KEY].subSubjects || {};
  var allQuestions = [];
  var existingFeedIds = new Set();

  Object.keys(subs).forEach(function(cat) {
    (subs[cat] || []).forEach(function(q) {
      allQuestions.push(q);
      if (q._feedId) existingFeedIds.add(q._feedId);
      if (q._extraFeedIds) q._extraFeedIds.forEach(function(id) { existingFeedIds.add(id); });
    });
  });

  var pibItems = (feed.items || []).filter(function(i) {
    return i.source === 'PIB' || i.source === 'PIB_RSS';
  });

  console.log('PIB items in feed: ' + pibItems.length);
  console.log('Existing archive questions: ' + allQuestions.length);
  console.log('Existing _feedIds: ' + existingFeedIds.size);

  var backfillCount = 0;
  var newItems = [];

  pibItems.forEach(function(item) {
    if (existingFeedIds.has(item.id)) return;

    var matched = false;
    for (var i = 0; i < allQuestions.length; i++) {
      if (allQuestions[i]._feedId) continue;
      if (titleInFact(item.title, allQuestions[i].fact || '')) {
        allQuestions[i]._feedId = item.id;
        existingFeedIds.add(item.id);
        matched = true;
        backfillCount++;
        break;
      }
    }

    if (!matched) {
      newItems.push(item);
    }
  });

  console.log('Backfilled _feedId: ' + backfillCount);
  console.log('Truly new items: ' + newItems.length);

  if (backfillCount > 0) {
    subs = {};
    allQuestions.forEach(function(q) {
      var cat = q.subSubject || 'Announcements';
      if (!subs[cat]) subs[cat] = [];
      subs[cat].push(q);
    });
    archive[PIB_KEY].subSubjects = subs;
  }

  if (newItems.length > 0) {
    var maxId = allQuestions.reduce(function(m, q) {
      var n = parseInt(q.id.replace('pib-', ''), 10);
      return isNaN(n) ? m : Math.max(m, n);
    }, -1);

    // Collect all entities for distractor pools
    var allNumbers = [], allMinistries = [], allSchemes = [], allPersons = [];
    newItems.forEach(function(item) {
      var text = item.title + ' ' + (item.description || '');
      var ne = extractNumber(text);
      if (ne && ne.num) allNumbers.push(ne);
      // For distractors, also include entities from feed
    });

    var generated = [];
    newItems.forEach(function(item) {
      maxId++;
      var q = generateQuestion(item, maxId);
      generated.push(q);
    });

    console.log('Generated ' + generated.length + ' new questions');

    generated.forEach(function(q) {
      var cat = q.subSubject || 'Announcements';
      if (!subs[cat]) subs[cat] = [];
      subs[cat].push(q);
    });

    archive[PIB_KEY].subSubjects = subs;
  }

  // Final dedup: remove questions with identical fact (in case content matching missed some)
  var seenFacts = {};
  var dedupCount = 0;
  var idsToAdd = [];
  Object.keys(archive[PIB_KEY].subSubjects).forEach(function(cat) {
    var list = archive[PIB_KEY].subSubjects[cat];
    archive[PIB_KEY].subSubjects[cat] = list.filter(function(q) {
      var key = norm(q.fact || q.question || '');
      if (!key || seenFacts[key]) {
        if (q._feedId) idsToAdd.push(q._feedId);
        dedupCount++;
        return false;
      }
      seenFacts[key] = true;
      return true;
    });
  });
  // Persist feed IDs from deduped questions into existing questions as _extraFeedIds
  if (idsToAdd.length > 0) {
    Object.keys(archive[PIB_KEY].subSubjects).forEach(function(cat) {
      archive[PIB_KEY].subSubjects[cat].forEach(function(q) {
        for (var i = idsToAdd.length - 1; i >= 0; i--) {
          if (q._feedId === idsToAdd[i]) { idsToAdd.splice(i, 1); continue; }
          if (q._extraFeedIds && q._extraFeedIds.indexOf(idsToAdd[i]) >= 0) { idsToAdd.splice(i, 1); continue; }
        }
      });
    });
    if (idsToAdd.length > 0) {
      var firstQ = null;
      Object.keys(archive[PIB_KEY].subSubjects).some(function(cat) {
        if (archive[PIB_KEY].subSubjects[cat].length > 0) {
          firstQ = archive[PIB_KEY].subSubjects[cat][0];
          return true;
        }
        return false;
      });
      if (firstQ) {
        firstQ._extraFeedIds = (firstQ._extraFeedIds || []).concat(idsToAdd);
        console.log('Stored ' + idsToAdd.length + ' extra feed IDs on first question');
      }
    }
  }
  if (dedupCount > 0) console.log('Final dedup removed: ' + dedupCount);

  fs.writeFileSync(ARCHIVE, JSON.stringify(archive), 'utf-8');

  var totalQuestions = 0;
  Object.keys(archive[PIB_KEY].subSubjects).forEach(function(cat) {
    totalQuestions += archive[PIB_KEY].subSubjects[cat].length;
  });
  console.log('Total PIB archive questions: ' + totalQuestions);
  console.log('Updated: ' + ARCHIVE);
}

main();
