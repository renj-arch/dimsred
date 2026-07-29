var fs = require('fs');
var path = require('path');

var DATA_PATH = path.resolve(__dirname, '..', 'data/questions/disaster-management.json');
var CAT_KEY = 'Disaster Management';
var SUB_KEY = 'Disaster management in India';

function pad(n) { return n < 10 ? '0' + n : '' + n; }
function makeQuestion(qText, answer, seq, fact) {
  if (!answer || answer.length < 2) return null;
  var now = new Date();
  var pubDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T12:00:00.000Z';
  return {
    id: 'dm_' + pad(seq), type: 'fill_blank', category: CAT_KEY, region: '',
    source: 'Reference Data', pubDate: pubDate, subject: CAT_KEY,
    subSubject: SUB_KEY, emoji: '\uD83D\uDEA8',
    question: qText, answer: answer, hint: '', fact: fact || ''
  };
}

function eventKey(q) {
  return (q.question || '').substring(0, 80) + '|' + (q.answer || '');
}

var QUESTIONS = [
  // --- Legal Framework ---
  {q: 'The Disaster Management Act of India was enacted in the year _____', a: '2005', f: 'The Disaster Management Act 2005 provides the legal framework for disaster management in India, replacing the earlier ad-hoc approach.'},
  {q: 'The National Disaster Management Authority (NDMA) was established in the year _____', a: '2005', f: 'NDMA was established on 27 September 2005 under Section 3(1) of the Disaster Management Act 2005.'},
  {q: 'The National Disaster Management Authority (NDMA) is chaired by the _____ of India', a: 'Prime Minister', f: 'The NDMA is chaired by the Prime Minister of India. It has nine other members including a Vice-Chairperson.'},
  {q: 'The State Disaster Management Authority (SDMA) is chaired by the _____ of the respective state', a: 'Chief Minister', f: 'SDMA is chaired by the Chief Minister of the state, with a minimum of eight members.'},
  {q: 'The District Disaster Management Authority (DDMA) is chaired by the _____ of the district', a: 'District Collector', f: 'DDMA is chaired by the District Collector/District Magistrate, with the elected head of the local body as co-chairperson.'},
  {q: 'The National Disaster Response Force (NDRF) was established in the year _____', a: '2006', f: 'NDRF was established in 2006 under the Disaster Management Act 2005, initially with 8 battalions, now expanded to 16 battalions.'},
  {q: 'The National Institute of Disaster Management (NIDM) is under the Ministry of _____', a: 'Home Affairs', f: 'NIDM functions under the Ministry of Home Affairs and is responsible for training, research, and capacity building in disaster management.'},
  {q: 'The _____ (SDRF) is constituted by each state for meeting expenses on disaster response', a: 'State Disaster Response Fund', f: 'SDRF is constituted under Section 48 of the DM Act 2005, with contributions from the central government (75%) and state government (25%).'},
  {q: 'The _____ (NDRF) is the primary fund for emergency response by the central government during disasters', a: 'National Disaster Response Fund', f: 'NDRF is managed by the central government and is used when a disaster is of severe nature requiring central assistance.'},

  // --- Types of natural disasters ---
  {q: 'The _____ is the most flood-prone river basin in India', a: 'Ganga-Brahmaputra', f: 'The Ganga-Brahmaputra basin accounts for about 60% of Indias total flood-prone area. Bihar, Uttar Pradesh, and Assam are the most affected states.'},
  {q: 'Indias most cyclone-prone coast is the _____ Coast, particularly Odisha, Andhra Pradesh, and West Bengal', a: 'eastern', f: 'The eastern coast of India (Bay of Bengal) is more prone to cyclones than the western coast (Arabian Sea). Odisha is the most cyclone-affected state.'},
  {q: 'The _____ region of India is the most seismically active zone (Zone V) as per the seismic zoning map', a: 'northeastern', f: 'Zone V includes the entire northeastern region, parts of Jammu and Kashmir, Himachal Pradesh, Uttarakhand, and the Rann of Kutch in Gujarat.'},
  {q: 'The _____ drought-prone area of India includes parts of Rajasthan, Gujarat, and adjoining regions', a: 'Aravalli', f: 'The Aravalli region and the rain-shadow areas of the Western Ghats (parts of Maharashtra, Karnataka, Tamil Nadu) are the most drought-prone.'},
  {q: 'The _____ is the most landslide-prone region in India', a: 'Himalayas', f: 'The Himalayan region accounts for about 30% of landslides in India. The Western Ghats are also highly prone to landslides.'},
  {q: 'The state of _____ is the most tsunami-prone region of India', a: 'Tamil Nadu', f: 'Tamil Nadu and the Andaman & Nicobar Islands were the worst affected by the 2004 Indian Ocean tsunami. The eastern coast is more vulnerable than the western.'},

  // --- Major disasters in India ---
  {q: 'The 2004 Indian Ocean tsunami was caused by a massive earthquake off the coast of _____', a: 'Sumatra', f: 'The 9.1 magnitude earthquake off Sumatra triggered the 2004 tsunami that killed over 2,30,000 people across 14 countries, including 10,749 in India.'},
  {q: 'The 2013 Uttarakhand floods (Kedarnath disaster) were primarily caused by _____ and cloudburst', a: 'glacial lake outburst', f: 'The 2013 Uttarakhand floods killed over 5,700 people. The disaster was exacerbated by glacial lake outbursts, cloudbursts, and the Char Dham yatra season.'},
  {q: 'The 2018 Kerala floods (the worst in a century) were caused by unusually heavy _____ rainfall', a: 'monsoon', f: 'The 2018 Kerala floods killed over 483 people. Kerala received 164% more rainfall than normal during the monsoon season.'},
  {q: 'The 1993 Latur earthquake in Maharashtra measured _____ on the Richter scale', a: '6.4', f: 'The 1993 Latur earthquake (6.4 magnitude) killed about 9,748 people. It was one of the deadliest earthquakes in India.'},
  {q: 'The 2001 Gujarat (Bhuj) earthquake measured _____ on the Richter scale', a: '7.7', f: 'The 2001 Gujarat earthquake (7.7 magnitude) on 26 January 2001 killed over 20,000 people and destroyed over 400,000 homes.'},
  {q: 'The 1999 Odisha super cyclone (Paradip cyclone) had wind speeds exceeding _____ km/h', a: '260', f: 'The 1999 Odisha Super Cyclone (Category 5) with winds of 260 km/h killed over 10,000 people and devastated coastal Odisha.'},

  // --- International frameworks ---
  {q: 'The _____ Framework for Disaster Risk Reduction (2015-2030) was adopted at the 3rd UN World Conference on DRR', a: 'Sendai', f: 'The Sendai Framework was adopted in March 2015 in Sendai, Japan. Its four priorities include understanding risk, strengthening governance, investing in resilience, and enhancing preparedness.'},
  {q: 'The _____ was adopted in 2015 as part of the SDGs, with targets related to reducing disaster mortality and economic losses', a: 'Sustainable Development Goals', f: 'SDG Target 1.5 aims to build resilience of the poor and reduce their exposure to climate-related extreme events. Target 11.5 focuses on reducing disaster losses.'},
  {q: 'The _____ Convention aims to combat desertification and mitigate the effects of drought', a: 'UNCCD', f: 'The United Nations Convention to Combat Desertification (UNCCD), adopted in 1994, is one of the three Rio Conventions along with UNFCCC and CBD.'},
  {q: 'The _____ (IPCC) provides scientific assessments on climate change and its impacts, including disaster risks', a: 'Intergovernmental Panel on Climate Change', f: 'The IPCC was established in 1988 by WMO and UNEP. Its assessment reports provide scientific basis for climate-related disaster risk management.'},

  // --- Disaster types and classification ---
  {q: 'The term _____ refers to a sudden, calamitous event that seriously disrupts the functioning of a community or society', a: 'disaster', f: 'Disaster is defined as a serious disruption of community functioning involving widespread human, material, economic, or environmental losses.'},
  {q: '_____ disasters are caused by natural phenomena such as earthquakes, floods, cyclones, and droughts', a: 'Natural', f: 'Natural disasters are classified into meteorological (cyclones, storms), hydrological (floods), climatological (droughts), and geophysical (earthquakes, volcanoes).'},
  {q: '_____ disasters are caused by human activities such as industrial accidents, nuclear leaks, and chemical spills', a: 'Man-made', f: 'Man-made disasters include Bhopal gas tragedy (1984), chemical/industrial accidents, nuclear accidents, transport accidents, and biological/terrorist events.'},
  {q: 'The Bhopal Gas Tragedy (1984) involved the leakage of _____ gas from the Union Carbide plant', a: 'methyl isocyanate', f: 'The Bhopal disaster is the worlds worst industrial disaster. Over 3,000 people died immediately and thousands more were affected by the toxic MIC gas leak.'},
  {q: 'The _____ of a disaster refers to actions taken to reduce or eliminate the long-term risk of hazards', a: 'mitigation', f: 'Mitigation includes structural measures (dams, cyclone shelters) and non-structural measures (land-use planning, building codes, public awareness).'},
  {q: '_____ refers to the process of preparing communities to respond effectively to disasters before they occur', a: 'preparedness', f: 'Preparedness includes early warning systems, mock drills, stockpiling of relief supplies, and community training programs.'},
  {q: '_____ refers to the immediate actions taken during or immediately after a disaster to save lives and property', a: 'response', f: 'Response includes search and rescue, medical aid, food and water distribution, and temporary shelter provision.'},
  {q: '_____ refers to the phase of restoring normalcy after a disaster, including reconstruction and rehabilitation', a: 'recovery', f: 'Recovery includes short-term relief, long-term reconstruction of infrastructure, livelihood restoration, and psychological counseling.'},
  {q: 'The _____ cycle includes four phases: Mitigation, Preparedness, Response, and Recovery', a: 'disaster management', f: 'The disaster management cycle is a continuous process of planning, implementing, and evaluating measures to prevent, prepare for, respond to, and recover from disasters.'},

  // --- Early warning systems ---
  {q: 'The _____ (IMD) is responsible for issuing cyclone warnings in India', a: 'India Meteorological Department', f: 'IMD issues cyclone forecasts and warnings through its Cyclone Warning Directorate and regional cyclone warning centers.'},
  {q: 'The _____ System (ITWS) provides real-time weather information including warnings for severe weather events', a: 'Integrated Weather Warning', f: 'The ITWS integrates data from satellites, radars, and automatic weather stations for accurate and timely weather warnings.'},
  {q: 'The _____ (INCOIS) provides tsunami early warnings for the Indian Ocean region', a: 'Indian National Centre for Ocean Information Services', f: 'INCOIS, based in Hyderabad, operates the Indian Tsunami Early Warning System (ITEWS) with real-time seismic and sea-level monitoring.'},
  {q: 'The _____ Warning System (FFWS) is operated by the Central Water Commission for flood forecasting', a: 'Flood Forecasting', f: 'The CWC operates 330 flood forecasting stations across 20 river basins, issuing flood warnings up to 48 hours in advance.'},
  {q: 'The National Disaster Management Plan (NDMP) was first prepared in the year _____', a: '2016', f: 'The NDMP was released on 1 June 2016 by Prime Minister Narendra Modi. It follows the Sendai Framework and covers all phases of disaster management.'},
];

function main() {
  var existing = {};
  if (fs.existsSync(DATA_PATH)) {
    try { existing = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')); } catch (e) { console.error('Error reading file, starting fresh'); }
  }
  if (!existing[CAT_KEY]) existing[CAT_KEY] = { subSubjects: {} };
  if (!existing[CAT_KEY].subSubjects[SUB_KEY]) existing[CAT_KEY].subSubjects[SUB_KEY] = [];

  var existingKeys = {};
  existing[CAT_KEY].subSubjects[SUB_KEY].forEach(function(q) { existingKeys[eventKey(q)] = true; });
  var newQuestions = [];
  var seq = existing[CAT_KEY].subSubjects[SUB_KEY].length + 1;

  QUESTIONS.forEach(function(item) {
    var q = makeQuestion(item.q, item.a, seq++, item.f);
    if (q && !existingKeys[eventKey(q)]) { newQuestions.push(q); existingKeys[eventKey(q)] = true; }
  });

  newQuestions.forEach(function(q) { existing[CAT_KEY].subSubjects[SUB_KEY].push(q); });
  fs.writeFileSync(DATA_PATH, JSON.stringify(existing, null, 2), 'utf8');
  console.error('Disaster Management: ' + existing[CAT_KEY].subSubjects[SUB_KEY].length + ' total, ' + newQuestions.length + ' new');
}

try { main(); } catch (err) { console.error('Fatal:', err.message); process.exit(1); }
