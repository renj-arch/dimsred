'use strict';
// Topic-level relevance for the figure library.
//
// The harvester is deliberately broad: a Commons category like "Category:Film
// awards" or "Category:2010 Asian Games" is crawled because the seed string
// looked exam-ish. That produced a 30,000-image gallery where film awards,
// cricket world cups, commemorative days and airport photos outnumbered
// maps and architecture. The per-file guards in build-figure-pages.js cannot
// fix that: the file really is a cricket photo and the topic really is a
// cricket topic, so the only correct decision is made here, at the TOPIC.
//
// One shared classifier is used by:
//   - scripts/build-figure-pages.js (gallery + published order)
//   - scripts/build-ask-figures.js  (the compact index Mains/Ask read)
//   - scripts/rebuild-figure-gallery.js (one-off regeneration)
//
// A topic is kept when it maps to a UPSC GS paper. The deny list is explicit
// and auditable; adding a new theme is one regex line, not a model run.

// Themes that are not part of the UPSC GS syllabus no matter how the harvest
// phrased them. Sports, cinema, award ceremonies and "international day of X"
// are the four repeat offenders in this corpus.
var OFF_SYLLABUS = [
  /\b(film|films|cinema|bollywood|kollywood|tollywood|movie|movies|oscar|oscars|phalke|pather panchali|actor|actress|song|album|grammy)\b/i,
  /\b(sport|sports|cricket|football|hockey|kabaddi|olympiad|olympic|olympics|tournament|league|world cup)\b/i,
  /\b(games?)\b/i,
  /\baward(s)?\b/i,
  /\b(children'?s day|earth day|human rights day|independence day india|international womens day|international yoga day|national science day|republic day india|world environment day|world health day|world population day|world water day)\b/i,
  /\b(yoga ashtanga|traditional chinese medicine|turmeric curcumin)\b/i,
  /\b(airport|airways)\b/i
];

// Subject buckets, used to group the gallery index. Order matters: the first
// match wins, so put narrow themes before broad words. This is presentation
// only; a topic that matches no bucket is still kept and shown under "Other".
var BUCKETS = [
  ['Polity & Governance', /\b(constitution|polity|judicial|court|parliament|panchayat|president|governor|election|reservation|separation of powers|public interest litigation|najac|official languages|states union territories|posh act|women rights|mahila panchayat|beti bachao|communalism|secularism|human rights|minority|federalism|governance)\b/i],
  ['Economy & Infrastructure', /\b(economy|budget|gdp|trade|wto|bank|banking|finance|gender budget|gender pay gap|female labour|labour force|postal savings|telecom regulator|trai|internet penetration|port|shipping|canal|strait|infrastructure|industry|msme|tax|gst|inflation|poverty|employment|sericulture|handicrafts|geographical indications|census of india process)\b/i],
  ['Geography & Climate', /\b(monsoon|cyclone|jet stream|western disturbance|air masses|ocean dipole|el nino|map|atlas|river|mountain|soil|mineral|ocean|glacier|desert|plateau|delta|coast|weather|climate|tornado|rainfall|watershed)\b/i],
  ['Environment & Ecology', /\b(national park|wildlife|sanctuary|biosphere|mangrove|ramsar|biodiversity|hotspot|carbon cycle|nitrogen cycle|water cycle|ozone|greenhouse|pollution|conservation|ecological pyramid|food chain|food web|endangered|tiger|elephant|lion|sundarbans|kaziranga|gir|corbett|forest|wetland|renewable|solar|wind turbine|paris climate)\b/i],
  ['History & Culture', /\b(harappa|mohenjo|indus valley|maurya|ashokan|edict|coin|numismatic|rock art|cave|temple|stupa|sanchi|sarnath|khajuraho|ellora|ajanta|meenakshi|gopuram|architecture|dance|music|raga|painting|art|craft|textile|folk|kumbh|buddhist|jain|colonial|indo-islamic|indo-saracenic|chola|bronze|miniature|pattachitra|madhubani|kalamkari|bidriware|sitar|tabla|instrument|heritage|script|language)\b/i],
  ['Science & Technology', /\b(space|satellite|launch vehicle|rocket|nuclear|reactor|semiconductor|diode|doping|computer|network|data|encryption|internet|telecom|optical fibre|electromagnetic|machine learning|neural|artificial intelligence|blockchain|cloud computing|gps|thermal power|solar cell|fission|propulsion|osi model|tcp ip|packet switching)\b/i],
  ['Society & Social Justice', /\b(census|population|literacy|gender|child marriage|sex selective|caste|scheduled castes|scheduled tribes|urban|migration|family|social change|women empowerment|demographic dividend|religion|middle class|child|health|education|welfare|scheme|yojana|disability|tribe)\b/i],
  ['International Relations', /\b(brics|bimstec|quad|quadrilateral|united nations|security council|non-proliferation|npt|indo pacific|foreign policy|commonwealth of nations|diplomacy|summit|g20|sco|asean)\b/i],
  ['Agriculture & Rural', /\b(cattle|dairy|fisheries|fodder|poultry|livestock|beekeeping|apiary|agriculture|farming|crop|irrigation|rural|village|amul)\b/i],
  ['Health & Medicine', /\b(ayurveda|siddha|herbal|medicine|doshas|drug|vaccine|nutrition|disease)\b/i]
];

function topic(t) {
  return String(t == null ? '' : t).trim();
}

function isOffSyllabus(t) {
  var s = topic(t);
  if (!s) return true;
  for (var i = 0; i < OFF_SYLLABUS.length; i++) {
    if (OFF_SYLLABUS[i].test(s)) return true;
  }
  return false;
}

function keep(t) {
  return !isOffSyllabus(t);
}

// Presentation bucket for the gallery index. "Other" is a legitimate answer:
// an unfamiliar but on-syllabus topic must not be hidden.
function subject(t) {
  var s = topic(t);
  for (var i = 0; i < BUCKETS.length; i++) {
    if (BUCKETS[i][1].test(s)) return BUCKETS[i][0];
  }
  return 'Other';
}

module.exports = {
  keep: keep,
  isOffSyllabus: isOffSyllabus,
  subject: subject,
  OFF_SYLLABUS: OFF_SYLLABUS,
  BUCKETS: BUCKETS
};
