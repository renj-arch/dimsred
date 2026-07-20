var https = require('https');
var fs = require('fs');
var path = require('path');

var API = 'https://en.wikipedia.org/w/api.php';
var PIB_PATH = path.resolve(__dirname, '..', 'data/questions/pib-archive.json');
var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
var DAYS_BACK = 30;

var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function fetchJSON(url) {
  return new Promise(function(resolve, reject) {
    https.get(url + '&origin=*', { agent: AGENT, headers: { 'User-Agent': 'StateNewsFill/3.0' } }, function(res) {
      var data = '';
      res.on('data', function(c) { data += c; });
      res.on('end', function() {
        if (res.statusCode === 429) return reject(new Error('HTTP 429'));
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function delay(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }
function stripHtml(html) { return html.replace(/<[^>]+>/g, '').trim(); }
function pad(n) { return n < 10 ? '0' + n : '' + n; }

var INDIAN_STATE_NAMES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu and Kashmir','Ladakh','Puducherry'];
var INDIAN_STATE_RE = new RegExp('\\b(?:' + INDIAN_STATE_NAMES.join('|') + ')\\b', 'i');

var STATE_ABBREVIATIONS = {
  AP:'Andhra Pradesh',AR:'Arunachal Pradesh',AS:'Assam',BR:'Bihar',CG:'Chhattisgarh',
  GA:'Goa',GJ:'Gujarat',HR:'Haryana',HP:'Himachal Pradesh',JH:'Jharkhand',
  KA:'Karnataka',KL:'Kerala',MP:'Madhya Pradesh',MH:'Maharashtra',MN:'Manipur',
  ML:'Meghalaya',MZ:'Mizoram',NL:'Nagaland',OD:'Odisha',PB:'Punjab',
  RJ:'Rajasthan',SK:'Sikkim',TN:'Tamil Nadu',TG:'Telangana',TR:'Tripura',
  UP:'Uttar Pradesh',UK:'Uttarakhand',WB:'West Bengal',DL:'Delhi',
  JK:'Jammu and Kashmir',LA:'Ladakh',PY:'Puducherry'
};

var CITY_TO_STATE = {
  mumbai:'Maharashtra',pune:'Maharashtra',nagpur:'Maharashtra',thane:'Maharashtra',navi_mumbai:'Maharashtra',
  delhi:'Delhi',new_delhi:'Delhi',
  bengaluru:'Karnataka',bangalore:'Karnataka',mysuru:'Karnataka',mysore:'Karnataka',mangaluru:'Karnataka',mangalore:'Karnataka',
  chennai:'Tamil Nadu',madras:'Tamil Nadu',coimbatore:'Tamil Nadu',madurai:'Tamil Nadu',
  hyderabad:'Telangana',secunderabad:'Telangana',
  kolkata:'West Bengal',calcutta:'West Bengal',howrah:'West Bengal',
  ahmedabad:'Gujarat',surat:'Gujarat',vadodara:'Gujarat',rajkot:'Gujarat',gandhinagar:'Gujarat',
  jaipur:'Rajasthan',jodhpur:'Rajasthan',udaipur:'Rajasthan',
  lucknow:'Uttar Pradesh',kanpur:'Uttar Pradesh',varanasi:'Uttar Pradesh',agra:'Uttar Pradesh',prayagraj:'Uttar Pradesh',allahabad:'Uttar Pradesh',noida:'Uttar Pradesh',ghaziabad:'Uttar Pradesh',
  patna:'Bihar',gaya:'Bihar',
  bhopal:'Madhya Pradesh',indore:'Madhya Pradesh',gwalior:'Madhya Pradesh',ujjain:'Madhya Pradesh',
  chandigarh:'Chandigarh',mohali:'Chandigarh',
  thiruvananthapuram:'Kerala',kochi:'Kerala',kozhikode:'Kerala',
  guwahati:'Assam',
  bhubaneswar:'Odisha',cuttack:'Odisha',puri:'Odisha',
  ranchi:'Jharkhand',jamshedpur:'Jharkhand',
  dehradun:'Uttarakhand',haridwar:'Uttarakhand',
  srinagar:'Jammu and Kashmir',jammu:'Jammu and Kashmir',
  shimla:'Himachal Pradesh',dharamshala:'Himachal Pradesh',
  imphal:'Manipur',itanagar:'Arunachal Pradesh',kohima:'Nagaland',shillong:'Meghalaya',agartala:'Tripura',
  gangtok:'Sikkim',aizawl:'Mizoram',panaji:'Goa',pondicherry:'Puducherry',puducherry:'Puducherry',
  amritsar:'Punjab',ludhiana:'Punjab',vijayawada:'Andhra Pradesh',visakhapatnam:'Andhra Pradesh'
};

var ABBREV_RE = new RegExp('\\b(' + Object.keys(STATE_ABBREVIATIONS).join('|') + ')\\b', 'i');
var CITY_RE = new RegExp('\\b(' + Object.keys(CITY_TO_STATE).join('|') + ')\\b', 'i');
var SHORT_NAMES = ['Bengal','Mizo','Naga','Bodo','Garhwal','Kumaon','Marathwada','Vidarbha','Konkan','Saurashtra','Kutch','Malabar','Kannada','Telugu','Tamil','Gujarati','Punjabi','Assamese','Oriya','Odia','Bihari','Haryanvi','Rajasthani','Goan','Manipuri'];

function makeShortRe() {
  var esc = SHORT_NAMES.map(function(s) { return s.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); });
  return new RegExp('\\b(?:' + esc.join('|') + ')\\b', 'i');
}
var SHORT_RE = makeShortRe();

function textAlias(text) {
  var t = text.toLowerCase();
  var m = t.match(CITY_RE);
  if (m) return CITY_TO_STATE[m[1].toLowerCase().replace(/\s+/g,'_')];
  if (SHORT_RE.test(t)) return true;
  return false;
}

function entityAlias(entity) {
  var e = entity.toLowerCase();
  var m = e.match(ABBREV_RE);
  if (m) return STATE_ABBREVIATIONS[m[1].toUpperCase()];
  if (SHORT_RE.test(e)) return true;
  return false;
}

function detectState(text, entity) {
  var t = text.toLowerCase();
  var e = entity.toLowerCase();
  if (INDIAN_STATE_RE.test(t)) return true;
  for (var i = 0; i < INDIAN_STATE_NAMES.length; i++) {
    var esc = INDIAN_STATE_NAMES[i].toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp('\\b' + esc + '\\b').test(e)) return true;
  }
  if (textAlias(t)) return true;
  if (entityAlias(e)) return true;
  return false;
}

function extractEntity(eventHtml) {
  var linkRe = /<a[^>]*href="\/wiki\/([^"#]+?)(?:#[^"]*)?"[^>]*>/g;
  var links = [], m;
  while ((m = linkRe.exec(eventHtml)) !== null) {
    var title = decodeURIComponent(m[1].replace(/_/g, ' '));
    if (title.length > 2 && title.length < 80 && title.indexOf(':') === -1 && title.indexOf('/') === -1) {
      links.push(title);
    }
  }
  return links.length > 0 ? links[0] : '';
}

function scoreStateEvent(text, entity) {
  var t = text.toLowerCase();
  var e = entity.toLowerCase();
  var score = 0;

  var body = t.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  var hasIndia = /\bindia\b/i.test(body) || /\bindian\b/i.test(body) || /\bindia\b/i.test(e);
  var stateMatch = t.match(INDIAN_STATE_RE) || detectState(t, e);

  if (!hasIndia && !stateMatch) return -100;

  if (stateMatch) score += 4;
  if (hasIndia) score += 2;

  if (/chief minister|cm\b|governor|deputy cm/i.test(t)) score += 6;
  if (/state\s+(budget|election|finance|scheme|policy|initiative|project|mission|minister|department|secretary|assembly|vidhan sabha)/i.test(t)) score += 5;
  if (/appointed|sworn\s+in|takes\s+charge|assumes\s+charge|elected|nominated/i.test(t)) score += 4;
  if (/resigns|resigned|sacked|dismissed|removed|replaced/i.test(t)) score += 4;
  if (/high\s+court/i.test(t)) score += 3;
  if (/launch(?:ed|es)\s+(?:scheme|portal|mission|policy|incentive|subsidy|programme)/i.test(t)) score += 4;
  if (/inau.gurat(?:ed|es)\s+(?:project|bridge|road|highway|railway|airport|hospital|school|college|stadium|park)/i.test(t)) score += 3;
  if (/flood|cyclone|earthquake|landslide|drought|heatwave/i.test(t) && hasIndia) score += 3;
  if (/budget/i.test(t) && stateMatch) score += 4;
  if (/scheme|yojana|mission|abhiyan/i.test(t) && (stateMatch || hasIndia)) score += 3;
  if (/appoint|nominated/i.test(t) && stateMatch) score += 3;
  if (/electric\s+vehicle|renewable|solar|wind|green|hydrogen/i.test(t) && stateMatch) score += 2;
  if (/road|highway|bridge|metro|railway|airport|port/i.test(t) && stateMatch) score += 2;
  if (/agriculture|farmer|crop|kisan|mandi|irrigation/i.test(t) && (stateMatch || hasIndia)) score += 2;
  if (/education|school|college|university|nep/i.test(t) && (stateMatch || hasIndia)) score += 2;
  if (/health|hospital|ayushman|vaccine|medic/i.test(t) && (stateMatch || hasIndia)) score += 2;
  if (/industry|investment|manufacturing|export|startup|msme/i.test(t) && stateMatch) score += 2;
  if (/MoU|memorandum|agreement|collaboration|partnership|tie.up/i.test(t) && (stateMatch || hasIndia)) score += 3;
  if (/award(?:ed|s)?|receives|honour|recogni.tion|felicitat/i.test(t) && (stateMatch || hasIndia)) score += 3;
  if (/ranking|ranked|index|survey|report|released\s+(?:data|report|figures|statistics)/i.test(t) && (stateMatch || hasIndia)) score += 3;
  if (/digital|technology|innovation|startup|incubation|fintech|edtech/i.test(t) && stateMatch) score += 2;
  if (/tourism|heritage|culture|festival|pilgrimage/i.test(t) && stateMatch) score += 2;
  if (/women|child|social\s+welfare|empowerment|pension|subsidy|entitlement/i.test(t) && (stateMatch || hasIndia)) score += 3;
  if (/infrastructure|development|project|contract|tender|bid/i.test(t) && stateMatch) score += 2;
  if (/legislative|council|mla|mp|by.election|byepoll|bypoll|byelection|election\s+commission/i.test(t) && stateMatch) score += 4;
  if (/judge|chief\s+justice|justice\s+appointed|tribunal|ombudsman|lokayukta/i.test(t) && (stateMatch || hasIndia)) score += 3;
  if (/defence|army|navy|air\s+force|paramilitary|bsf|crpf|itbp|assam\s+rifles/i.test(t) && (stateMatch || hasIndia)) score += 2;
  if (/national\s+anthem|flag|constitution|republic\s+day|independence\s+day|gandhi\s+jayanti/i.test(t) && (stateMatch || hasIndia)) score += 2;
  if (/foreign\s+direct\s+investment|fdi|gdp|gsdp|economic\s+(?:growth|survey|development)/i.test(t) && stateMatch) score += 3;
  if (/sports\s+university|khelo\s+india|stadium|olympi|youth\s+(?:affairs|services)/i.test(t) && (stateMatch || hasIndia)) score += 2;
  if (/skill\s+development|vocational|employment|job\s+fair|placement|training/i.test(t) && (stateMatch || hasIndia)) score += 2;
  if (/(?:police|crime|naxal|militant|insurgency)\s+(?:firing|encounter|kill|death|custody|allegation|corruption|scam|fraud|arrest|charge)/i.test(t) && (stateMatch || hasIndia)) score -= 3;

  if (/\b(killed|killing|kill|dead|die|died|death|deaths|murder|murdered|shooting|shot|explosion|blast|bomb|bombing|casualty|massacre|riots?|clash|firing|gunfire|lynching|drown|drowned|drowning|suicide|stabbed|stabbing|beheaded|executed|ambush|massacre|bloodshed)\b/i.test(t)) return -100;
  if (/\b(bus|car|truck|train|plane|vehicle)\s+(crash|collision|accident|overturn|plunge|ram|hit|struck|collided|overturns?|plunges?)\b/i.test(t)) return -100;
  if (/\b(actress|actor|singer|film|movie|album|concert|song|musician|director)\b/i.test(entity) && !/died|award|nobel|funeral/i.test(t)) score -= 5;
  if (/\b(sport|cricket|football|hockey|tennis|badminton|chess|medal|championship|tournament|olympi|match|goal|score(?:s|d)?\s+(?:twice|hat-trick|brace))\b/i.test(t)) return -100;
  if (/\b(usa|united states|china|russia|uk|britain|germany|france|japan|australia|canada|brazil|pakistan|bangladesh|nepal|sri lanka)\b/i.test(e) && !/india/i.test(t)) score -= 8;
  if (text.length < 60) score -= 2;

  return score;
}

function parseDaySections(html) {
  var sections = [];
  var dayBlockRe = /<div[^>]*role="region"[^>]*aria-label="([^"]+)"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
  var m;
  while ((m = dayBlockRe.exec(html)) !== null) {
    var dayLabel = m[1].trim();
    var dayContent = m[2];
    var events = [];
    var liRe = /<li>(.*?)<\/li>/g;
    var lm;
    while ((lm = liRe.exec(dayContent)) !== null) {
      var txt = stripHtml(lm[1]);
      if (txt.length > 40 && txt.length < 400) {
        var entity = extractEntity(lm[1]);
        if (entity) {
          events.push({ text: txt, entity: entity });
        }
      }
    }
    if (events.length > 0) {
      sections.push({ label: dayLabel, events: events });
    }
  }
  if (sections.length === 0) {
    var altRe = /<div class="current-events[^"]*">[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
    while ((m = altRe.exec(html)) !== null) {
      var content = m[1];
      var labelMatch = content.match(/<b>\s*([A-Z][a-z]+ \d+)/);
      var dayLabel = labelMatch ? labelMatch[1] : '';
      if (!dayLabel) continue;
      var events = [];
      var liRe = /<li>(.*?)<\/li>/g;
      var lm;
      while ((lm = liRe.exec(content)) !== null) {
        var txt = stripHtml(lm[1]);
        if (txt.length > 40 && txt.length < 400) {
          var entity = extractEntity(lm[1]);
          if (entity) {
            events.push({ text: txt, entity: entity });
          }
        }
      }
      if (events.length > 0) {
        sections.push({ label: dayLabel, events: events });
      }
    }
  }
  return sections;
}

function parseDateFromLabel(label) {
  var parts = label.replace(/,.*$/, '').trim().split(' ');
  var day = parseInt(parts[parts.length - 1], 10);
  if (isNaN(day)) day = parseInt(parts[0], 10);
  return day;
}

function makeQuestion(event, seq) {
  var id = 'state_' + event.year + '_' + pad(event.month) + '_' + pad(seq);
  var pubDate = event.year + '-' + pad(event.month) + '-' + pad(event.day) + 'T12:00:00.000Z';

  var qText = event.text;
  var answer = event.entity;
  if (qText.length > 250) qText = qText.substring(0, 247) + '...';

  var blankText = qText;
  var finalAnswer = answer;
  var answerEscaped = answer.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  var wordRe = new RegExp('\\b' + answerEscaped + '\\b', 'i');
  var m = wordRe.exec(blankText);
  if (m) {
    blankText = blankText.substring(0, m.index) + '_____' + blankText.substring(m.index + m[0].length);
  } else {
    var stemRe = new RegExp('\\b' + answerEscaped + '\\w*\\b', 'i');
    var m2 = stemRe.exec(blankText);
    if (m2) {
      blankText = blankText.substring(0, m2.index) + '_____' + blankText.substring(m2.index + m2[0].length);
      finalAnswer = m2[0];
    }
  }

  return {
    id: id,
    type: 'fill_blank',
    category: 'PIB',
    region: '',
    source: 'Wikipedia State Events',
    pubDate: pubDate,
    subject: 'PIB Releases',
    subSubject: 'State Affairs',
    emoji: '\uD83C\uDFDB\uFE0F',
    question: blankText,
    answer: finalAnswer,
    hint: '',
    fact: event.text.substring(0, 500)
  };
}

function eventKey(q) {
  return (q.question || q.text || '').substring(0, 80) + '|' + (q.answer || q.entity || '');
}

async function fetchMonthEvents(year, month) {
  var page = 'Portal:Current_events/' + MONTHS[month - 1] + '_' + year;
  var url = API + '?action=parse&page=' + encodeURIComponent(page) + '&prop=text&format=json';
  var data;
  try { data = await fetchJSON(url); } catch (e) { return null; }
  if (!data || !data.parse || !data.parse.text) return null;
  var html = data.parse.text['*'] || '';
  var sections = parseDaySections(html);
  return { html: html, sections: sections };
}

function generateSeedQuestions(seqCounter) {
  var now = new Date();
  var pubDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T12:00:00.000Z';
  var monthLabel = MONTHS[now.getMonth()] + ' ' + now.getFullYear();
  var qs = [];

  var stateCMs = {
    'Andhra Pradesh': 'N. Chandrababu Naidu',
    'Arunachal Pradesh': 'Pema Khandu',
    'Assam': 'Himanta Biswa Sarma',
    'Bihar': 'Samrat Choudhary',
    'Chhattisgarh': 'Vishnu Deo Sai',
    'Delhi': 'Rekha Gupta',
    'Goa': 'Pramod Sawant',
    'Gujarat': 'Bhupendra Patel',
    'Haryana': 'Nayab Singh Saini',
    'Himachal Pradesh': 'Sukhvinder Singh Sukhu',
    'Jammu and Kashmir': 'Omar Abdullah',
    'Jharkhand': 'Hemant Soren',
    'Karnataka': 'Siddaramaiah',
    'Kerala': 'V. D. Satheesan',
    'Madhya Pradesh': 'Mohan Yadav',
    'Maharashtra': 'Devendra Fadnavis',
    'Manipur': 'Yumnam Khemchand Singh',
    'Meghalaya': 'Conrad Sangma',
    'Mizoram': 'Lalduhoma',
    'Nagaland': 'Neiphiu Rio',
    'Odisha': 'Mohan Charan Majhi',
    'Puducherry': 'N. Rangaswamy',
    'Punjab': 'Bhagwant Mann',
    'Rajasthan': 'Bhajan Lal Sharma',
    'Sikkim': 'Prem Singh Tamang',
    'Tamil Nadu': 'C Joseph Vijay',
    'Telangana': 'Revanth Reddy',
    'Tripura': 'Manik Saha',
    'Uttar Pradesh': 'Yogi Adityanath',
    'Uttarakhand': 'Pushkar Singh Dhami',
    'West Bengal': 'Suvendu Adhikari'
  };
  var stateGovs = {
    'Andhra Pradesh': 'S. Abdul Nazeer',
    'Arunachal Pradesh': 'Kaiwalya Trivikram Parnaik',
    'Assam': 'Lakshman Prasad Acharya',
    'Bihar': 'Syed Ata Hasnain',
    'Chhattisgarh': 'Ramen Deka',
    'Goa': 'Pusapati Ashok Gajapathi Raju',
    'Gujarat': 'Acharya Devvrat',
    'Haryana': 'Ashim Kumar Ghosh',
    'Himachal Pradesh': 'Kavinder Gupta',
    'Jharkhand': 'Santosh Kumar Gangwar',
    'Karnataka': 'Thawar Chand Gehlot',
    'Kerala': 'Rajendra Vishwanath Arlekar',
    'Madhya Pradesh': 'Mangubhai C. Patel',
    'Maharashtra': 'Jishnu Dev Varma',
    'Manipur': 'Ajay Kumar Bhalla',
    'Meghalaya': 'C. H. Vijayashankar',
    'Mizoram': 'V. K. Singh',
    'Nagaland': 'Nand Kishore Yadav',
    'Odisha': 'Kambhampati Hari Babu',
    'Punjab': 'Gulab Chand Kataria',
    'Rajasthan': 'Haribhau Kisanrao Bagade',
    'Sikkim': 'Om Prakash Mathur',
    'Tamil Nadu': 'Rajendra Vishwanath Arlekar',
    'Telangana': 'Shiv Pratap Shukla',
    'Tripura': 'N. Indrasena Reddy',
    'Uttar Pradesh': 'Anandiben Patel',
    'Uttarakhand': 'Gurmit Singh',
    'West Bengal': 'R. N. Ravi'
  };

  Object.keys(stateCMs).forEach(function(state) {
    seqCounter.seed = (seqCounter.seed || 0) + 1;
    qs.push({
      id: 'state_cm_' + seqCounter.seed,
      type: 'fill_blank',
      category: 'PIB',
      region: '',
      source: 'Wikipedia',
      pubDate: pubDate,
      subject: 'PIB Releases',
      subSubject: 'State Affairs',
      emoji: '\uD83C\uDFDB\uFE0F',
      question: 'The Chief Minister of ' + state + ' as of ' + monthLabel + ' is _____.',
      answer: stateCMs[state],
      hint: '',
      fact: 'The Chief Minister of ' + state + ' is ' + stateCMs[state] + ' (as of ' + monthLabel + '). The CM is the head of the state government.'
    });
  });

  Object.keys(stateGovs).forEach(function(state) {
    seqCounter.seed = (seqCounter.seed || 0) + 1;
    qs.push({
      id: 'state_gov_' + seqCounter.seed,
      type: 'fill_blank',
      category: 'PIB',
      region: '',
      source: 'Wikipedia',
      pubDate: pubDate,
      subject: 'PIB Releases',
      subSubject: 'State Affairs',
      emoji: '\uD83C\uDFDB\uFE0F',
      question: 'The Governor of ' + state + ' as of ' + monthLabel + ' is _____.',
      answer: stateGovs[state],
      hint: '',
      fact: 'The Governor of ' + state + ' is ' + stateGovs[state] + ' (as of ' + monthLabel + '). The Governor is the constitutional head of the state.'
    });
  });

  return qs;
}

async function main() {
  var existing = {};
  if (fs.existsSync(PIB_PATH)) {
    try {
      existing = JSON.parse(fs.readFileSync(PIB_PATH, 'utf8'));
      console.error('Read existing pib-archive.json');
    } catch (e) {
      console.error('Error reading, starting fresh: ' + e.message);
    }
  }

  var PIB_KEY = 'PIB Releases';
  if (!existing[PIB_KEY]) existing[PIB_KEY] = { subSubjects: {} };
  if (!existing[PIB_KEY].subSubjects['State Affairs']) existing[PIB_KEY].subSubjects['State Affairs'] = [];

  var seqCounter = { event: 0, seed: 0 };
  existing[PIB_KEY].subSubjects['State Affairs'].forEach(function(q) {
    var parts = q.id.split('_');
    var seq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(seq)) {
      if (q.id.indexOf('_cm_') >= 0 || q.id.indexOf('_gov_') >= 0) {
        if (seq > (seqCounter.seed || 0)) seqCounter.seed = seq;
      } else if (seq > (seqCounter.event || 0)) seqCounter.event = seq;
    }
  });

  // Remove outdated seed (CM/Gov) questions before regenerating
  var eventQuestions = existing[PIB_KEY].subSubjects['State Affairs'].filter(function(q) {
    return q.id.indexOf('_cm_') < 0 && q.id.indexOf('_gov_') < 0;
  });
  var removedCount = existing[PIB_KEY].subSubjects['State Affairs'].length - eventQuestions.length;

  var existingKeys = {};
  eventQuestions.forEach(function(q) {
    existingKeys[eventKey(q)] = true;
  });

  // Phase 1: Generate fresh CM and Governor questions
  var seedQuestions = generateSeedQuestions(seqCounter);
  var newQuestions = [];
  seedQuestions.forEach(function(q) {
    var key = eventKey(q);
    if (!existingKeys[key]) {
      newQuestions.push(q);
      existingKeys[key] = true;
    }
  });

  console.error('Removed ' + removedCount + ' outdated seed questions');

  // Phase 2: Check Wikipedia current events for Indian state content
  var now = new Date();
  var cy = now.getFullYear();
  var cm = now.getMonth() + 1;
  var cd = now.getDate();
  var cutoff = new Date(cy, cm - 1, cd - DAYS_BACK + 1);

  var monthsToFetch = {};
  for (var d = new Date(cutoff); d <= now; d.setDate(d.getDate() + 1)) {
    var key = d.getFullYear() + '-' + pad(d.getMonth() + 1);
    monthsToFetch[key] = { year: d.getFullYear(), month: d.getMonth() + 1 };
  }

  var monthlySections = {};
  var monthKeys = Object.keys(monthsToFetch).sort();
  for (var i = 0; i < monthKeys.length; i++) {
    var mk = monthKeys[i];
    var my = monthsToFetch[mk].year;
    var mm = monthsToFetch[mk].month;
    var result = await fetchMonthEvents(my, mm);
    if (result) monthlySections[mk] = result.sections;
    if (i < monthKeys.length - 1) await delay(500);
  }

  for (var d = new Date(cutoff); d <= now; d.setDate(d.getDate() + 1)) {
    var y = d.getFullYear();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    var mk = y + '-' + pad(m);
    if (!monthlySections[mk]) continue;
    var daySections = monthlySections[mk].filter(function(s) { return parseDateFromLabel(s.label) === day; });
    if (daySections.length === 0) continue;

    daySections[0].events.forEach(function(ev) {
      var score = scoreStateEvent(ev.text, ev.entity);
      if (score < 0) return;
      var key = eventKey(ev);
      if (!existingKeys[key]) {
        seqCounter.event = (seqCounter.event || 0) + 1;
        newQuestions.push(makeQuestion({ year: y, month: m, day: day, text: ev.text, entity: ev.entity }, seqCounter.event));
        existingKeys[key] = true;
      }
    });
  }

  existing[PIB_KEY].subSubjects['State Affairs'] = eventQuestions;
  newQuestions.forEach(function(q) { existing[PIB_KEY].subSubjects['State Affairs'].push(q); });

  var total = existing[PIB_KEY].subSubjects['State Affairs'].length;
  fs.writeFileSync(PIB_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('State Affairs: ' + total + ' total questions, ' + newQuestions.length + ' new');
}

main().catch(function(err) {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
