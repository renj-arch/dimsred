'use strict';
// Add the UPSC chapter map to scripts/exam-configs.json.
//
// The four mains papers had 5-7 lessons each: one lesson carried an entire
// syllabus section ("Indian Society, Diversity & Social Issues" was a single
// 45,000-word page). A candidate cannot work through that chapter by chapter,
// and the expander cannot deepen a chapter that was never declared. This adds
// 60 chapters across Prelims GS and Mains GS I-IV, inserted BEFORE the
// answer-writing lesson so the practice chapter stays last in the nav.
//
// Every new slug starts with no entry in course-data.json, which is exactly
// what makes it an empty slot: gen-course.js renders the filler page now and
// the expansion lanes fill it at the depth target on the next runs.
var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var FILE = path.join(ROOT, 'scripts', 'exam-configs.json');

var CHAPTERS = {
  gs: [
    { slug: 'ancient-medieval-india', title: 'Ancient & Medieval India', desc: 'Indus Valley, Vedic age, Mauryas, Guptas, Delhi Sultanate, Vijayanagara and the Mughals.', topics: 'Prehistory, Ancient Empires, Sultanate, Mughal India' },
    { slug: 'art-culture-prelims', title: 'Art & Culture for Prelims', desc: 'Dance, music, architecture, painting, festivals, UNESCO sites and classical literature.', topics: 'Performing Arts, Architecture, Painting, Literature' },
    { slug: 'modern-india-prelims', title: 'Modern India & Freedom Struggle', desc: '1757 to 1947: Company rule, revolts, the Congress, Gandhian movements and partition.', topics: 'Company Rule, Nationalism, Mass Movements, Partition' },
    { slug: 'polity-prelims', title: 'Polity & Constitution', desc: 'Constitutional framework, fundamental rights, union and state organs, federalism and amendments.', topics: 'Constitution, Rights, Organs of State, Federalism' },
    { slug: 'governance-prelims', title: 'Governance & Social Justice', desc: 'Welfare schemes, transparency, e-governance and the constitutional safeguards for vulnerable sections.', topics: 'Schemes, RTI, E-Governance, Vulnerable Sections' },
    { slug: 'geography-physical-prelims', title: 'Physical Geography', desc: 'Geomorphology, climatology, oceanography and biogeography with diagram practice.', topics: 'Landforms, Climate, Oceans, Biomes' },
    { slug: 'geography-india-prelims', title: 'Indian Geography', desc: 'Physiography, drainage, soils, vegetation, agriculture, minerals and industries of India.', topics: 'Physiography, Drainage, Soils, Resources' },
    { slug: 'economy-prelims', title: 'Economy for Prelims', desc: 'Growth, budget, money and banking, inflation, the external sector and inclusive growth.', topics: 'Growth, Budget, Banking, External Sector' },
    { slug: 'science-tech-prelims', title: 'Science & Technology', desc: 'Space, defence, biotechnology, IT, artificial intelligence, energy and health technology.', topics: 'Space, Biotech, IT & AI, Energy' },
    { slug: 'environment-prelims', title: 'Environment & Ecology', desc: 'Ecosystems, biodiversity, conservation law, climate change and pollution control.', topics: 'Ecology, Biodiversity, Climate, Pollution' },
    { slug: 'ir-prelims', title: 'International Relations', desc: 'Neighbourhood, major powers, groupings, international institutions and the diaspora.', topics: 'Neighbourhood, Major Powers, Groupings, Diaspora' }
  ],
  'mains-gs1': [
    { slug: 'art-forms', title: 'Indian Art Forms: Dance, Music, Theatre & Painting', desc: 'Classical and folk dance, Hindustani and Carnatic music, theatre traditions and the schools of Indian painting.', topics: 'Classical Dance, Music, Theatre, Painting' },
    { slug: 'architecture-heritage', title: 'Indian Architecture & Built Heritage', desc: 'Harappan town planning, rock-cut caves, temple styles, Indo-Islamic architecture and colonial building.', topics: 'Harappan, Rock-Cut, Temple Styles, Indo-Islamic' },
    { slug: 'literature-philosophy', title: 'Indian Literature, Religion & Philosophy', desc: 'Sanskrit, Prakrit and Tamil literature, Bhakti and Sufi movements, and the six schools of Indian philosophy.', topics: 'Literature, Bhakti-Sufi, Philosophy, Buddhism & Jainism' },
    { slug: 'ancient-india', title: 'Ancient India: Prehistory to the Guptas', desc: 'Stone age cultures, the Indus Valley, Vedic society, the Mahajanapadas, Mauryan administration and Gupta classicism.', topics: 'Prehistory, Indus Valley, Vedic Age, Mauryas, Guptas' },
    { slug: 'medieval-india', title: 'Medieval India: Delhi Sultanate to the Marathas', desc: 'The five dynasties of Delhi, Vijayanagara, the Mughal empire, regional kingdoms and the rise of the Marathas.', topics: 'Delhi Sultanate, Vijayanagara, Mughals, Marathas' },
    { slug: 'modern-india-1757-1885', title: 'Modern India I: Company Rule to the Congress', desc: 'Battle of Plassey to 1885: land revenue, deindustrialisation, the 1857 revolt, social reform and the foundation of the Congress.', topics: 'Company Rule, 1857, Social Reform, Congress' },
    { slug: 'modern-india-1885-1919', title: 'Modern India II: Moderates, Extremists and Home Rule', desc: 'Moderate petitioning, the extremist critique, Partition of Bengal, revolutionary nationalism and the Home Rule movement.', topics: 'Moderates, Extremists, Swadeshi, Home Rule' },
    { slug: 'modern-india-1919-1947', title: 'Modern India III: Mass Movements to Partition', desc: 'Rowlatt Satyagraha, Non-Cooperation, Civil Disobedience, Quit India, the constitutional negotiations and Partition.', topics: 'Gandhian Movements, Constitutional Talks, Partition' },
    { slug: 'post-independence', title: 'Post-Independence India: Integration and Consolidation', desc: 'Princely state integration, linguistic reorganisation, the early elections, land reform and the consolidation of democracy.', topics: 'Integration, States Reorganisation, Elections, Land Reform' },
    { slug: 'world-history-early-modern', title: 'World History I: Renaissance to Industrial Revolution', desc: 'Renaissance, Reformation, the age of exploration, the Enlightenment and the Industrial Revolution.', topics: 'Renaissance, Reformation, Enlightenment, Industrialisation' },
    { slug: 'world-history-modern', title: 'World History II: World Wars to the Cold War', desc: 'Imperial rivalries, the two world wars, decolonisation, the Cold War and the post-1991 order.', topics: 'World Wars, Decolonisation, Cold War, New Order' },
    { slug: 'society-diversity', title: 'Indian Society: Diversity, Family, Caste and Tribe', desc: 'Unity in diversity, family and marriage, caste dynamics, tribal society and the effects of globalisation.', topics: 'Diversity, Family, Caste, Tribe' },
    { slug: 'social-issues-gs1', title: 'Social Issues: Women, Urbanisation, Poverty and Globalisation', desc: 'Gender inequality, urbanisation and its problems, poverty and deprivation, and the social impact of globalisation.', topics: 'Gender, Urbanisation, Poverty, Globalisation' },
    { slug: 'geography-world-physical', title: 'World Physical Geography: Landforms, Climate and Oceans', desc: 'Plate tectonics, denudation, atmospheric circulation, ocean currents and the world biomes.', topics: 'Tectonics, Landforms, Climate, Oceans' },
    { slug: 'geography-india-mapping', title: 'Indian Geography: Physiography, Drainage and Mapping', desc: 'Himalaya and peninsula, river systems, monsoon behaviour, resource distribution and map-based practice.', topics: 'Physiography, Drainage, Monsoon, Mapping' }
  ],
  'mains-gs2': [
    { slug: 'constitution-basics', title: 'Constitutional Framework: Making, Features, Preamble', desc: 'Constituent Assembly, the sources of the Constitution, its salient features and the significance of the Preamble.', topics: 'Constituent Assembly, Features, Preamble, Basic Structure' },
    { slug: 'fundamental-rights', title: 'Fundamental Rights, DPSP and Fundamental Duties', desc: 'Articles 12-35, the directive principles, fundamental duties, and the tension and balance between them.', topics: 'Rights, DPSP, Duties, Judicial Interpretation' },
    { slug: 'union-executive', title: 'Union Executive: President, Prime Minister and Cabinet', desc: 'Election and powers of the President, the Prime Minister\'s office, the Cabinet and the bureaucracy.', topics: 'President, PM, Cabinet, Civil Services' },
    { slug: 'parliament-legislature', title: 'Parliament: Structure, Procedures and Committees', desc: 'Lok Sabha and Rajya Sabha, the legislative process, money bills, committees and parliamentary privilege.', topics: 'Structure, Procedure, Committees, Privileges' },
    { slug: 'judiciary', title: 'Judiciary: Supreme Court, High Courts and Review', desc: 'Appointment and independence, jurisdiction, judicial review, judicial activism and the collegium debate.', topics: 'Appointment, Jurisdiction, Review, Activism' },
    { slug: 'federalism', title: 'Federalism: Centre-State Relations and Devolution', desc: 'Legislative, administrative and financial relations, the Inter-State Council, and cooperative and competitive federalism.', topics: 'Relations, Finance Commission, Devolution, Disputes' },
    { slug: 'local-government', title: 'Local Government: Panchayati Raj and Urban Bodies', desc: 'The 73rd and 74th Amendments, three-tier structures, finance and function devolution, and urban governance.', topics: 'Panchayati Raj, Municipalities, Devolution, Finance' },
    { slug: 'constitutional-bodies', title: 'Constitutional and Statutory Bodies', desc: 'Election Commission, CAG, UPSC, Finance Commission, NHRC, NCW and the debate on appointments and autonomy.', topics: 'EC, CAG, UPSC, NHRC, Autonomy' },
    { slug: 'governance-accountability', title: 'Governance: Transparency, RTI and Citizen Charters', desc: 'Right to Information, e-governance, citizen charters, grievance redress and the civil-services reform agenda.', topics: 'RTI, E-Governance, Charters, Redress' },
    { slug: 'welfare-schemes', title: 'Welfare Schemes and Social Sector Delivery', desc: 'The design of welfare schemes, targeting and leakage, DBT, food security and the social sector expenditure debate.', topics: 'Schemes, Targeting, DBT, Food Security' },
    { slug: 'ir-bilateral', title: 'India\'s Bilateral Relations: Neighbourhood and Major Powers', desc: 'Pakistan, China, Nepal, Bangladesh and Sri Lanka; the United States, Russia, the EU, Japan and the Gulf.', topics: 'Neighbourhood, China, US, Russia, EU' },
    { slug: 'ir-institutions', title: 'International Institutions, Groupings and Global Governance', desc: 'UN reform, WTO, IMF and World Bank, QUAD, BRICS, G20, SCO and the rules-based order.', topics: 'UN, WTO, IFIs, Groupings, Global Order' }
  ],
  'mains-gs3': [
    { slug: 'economy-basics', title: 'Economic Growth, Development and National Income', desc: 'Growth versus development, national income accounting, human development and the measurement debates.', topics: 'Growth, National Income, HDI, Measurement' },
    { slug: 'fiscal-policy', title: 'Fiscal Policy, Budget and Public Finance', desc: 'Budget structure, deficits, FRBM, taxation and GST, subsidies and public debt sustainability.', topics: 'Budget, Deficits, FRBM, GST, Debt' },
    { slug: 'monetary-policy', title: 'Money, Banking and Monetary Policy', desc: 'Money supply, the RBI\'s toolkit, the monetary transmission mechanism, NPAs and financial inclusion.', topics: 'Money, RBI, Transmission, NPAs, Inclusion' },
    { slug: 'inflation-prices', title: 'Inflation, Price Indices and the Business Cycle', desc: 'Types and measurement of inflation, WPI and CPI, the Phillips curve critique and the output gap.', topics: 'Inflation, CPI, WPI, Business Cycle' },
    { slug: 'external-sector', title: 'External Sector: Trade, BoP and Exchange Rate', desc: 'Trade policy, the balance of payments, reserves, exchange-rate regimes and capital account management.', topics: 'Trade, BoP, Reserves, Exchange Rate' },
    { slug: 'financial-markets', title: 'Financial Markets, SEBI and Capital Flows', desc: 'Primary and secondary markets, SEBI\'s mandate, the bond market, NBFCs and foreign capital.', topics: 'Markets, SEBI, Bonds, NBFCs, Capital Flows' },
    { slug: 'agriculture-msp', title: 'Agriculture: Cropping, MSP and Procurement', desc: 'Cropping patterns, irrigation, MSP and procurement, food subsidy and the terms-of-trade debate.', topics: 'Cropping, Irrigation, MSP, Procurement' },
    { slug: 'food-processing', title: 'Food Processing, Storage and Supply Chains', desc: 'Value chains, cold storage, food parks, the Essential Commodities framework and export potential.', topics: 'Value Chain, Storage, Food Parks, Exports' },
    { slug: 'infrastructure', title: 'Infrastructure: Energy, Transport and Logistics', desc: 'Power, roads, railways, ports, aviation, the National Logistics Policy and infrastructure financing.', topics: 'Energy, Transport, Ports, Logistics, Financing' },
    { slug: 'investment-models', title: 'Investment Models, PPP and Industrial Policy', desc: 'Public, private and hybrid models, PPP structures and disputes, PLI and industrial corridors.', topics: 'PPP, PLI, Corridors, Financing' },
    { slug: 'science-tech-space', title: 'Science & Technology: Space, Nuclear and Defence', desc: 'ISRO missions, nuclear technology, defence indigenisation and the dual-use technology debate.', topics: 'Space, Nuclear, Defence, Indigenisation' },
    { slug: 'science-tech-digital', title: 'Digital India, AI and Emerging Technologies', desc: 'Digital public infrastructure, AI governance, semiconductors, quantum and biotechnology regulation.', topics: 'DPI, AI, Semiconductors, Quantum, Biotech' },
    { slug: 'environment-climate', title: 'Environment: Climate Change, Conservation and Pollution', desc: 'Climate commitments, conservation law and institutions, pollution control and environmental finance.', topics: 'Climate, Conservation, Pollution, Finance' },
    { slug: 'disaster-management', title: 'Disaster Management: Hazard, Vulnerability and Response', desc: 'Hazard profiles, vulnerability and capacity, the DM Act and NDMA, and Sendai-aligned practice.', topics: 'Hazards, Vulnerability, NDMA, Sendai' },
    { slug: 'internal-security', title: 'Internal Security: Extremism, Terrorism and Cyber', desc: 'Left-wing extremism, terrorism in Jammu and Kashmir, cyber security, money laundering and organised crime.', topics: 'LWE, Terrorism, Cyber, Money Laundering' },
    { slug: 'border-management', title: 'Border Management and Security Forces', desc: 'Border infrastructure, the security forces and their mandates, coastal security and border-area development.', topics: 'Borders, Forces, Coastal Security, Development' }
  ],
  'mains-gs4': [
    { slug: 'ethics-foundations', title: 'Ethics: Concepts, Determinants and Consequences', desc: 'The meaning of ethics, determinants of ethical behaviour, and the consequences of actions for self and society.', topics: 'Concepts, Determinants, Consequences' },
    { slug: 'human-values', title: 'Human Values: Lessons from Leaders and Administrators', desc: 'Values drawn from Indian and global thinkers, administrators and social reformers, with case evidence.', topics: 'Thinkers, Reformers, Administrators, Values' },
    { slug: 'attitude-aptitude', title: 'Attitude, Aptitude and Moral Thinkers', desc: 'Structure of attitude, its influence on behaviour, aptitude for civil service, and the moral thinkers syllabus.', topics: 'Attitude, Behaviour, Aptitude, Moral Thinkers' },
    { slug: 'emotional-intelligence-gs4', title: 'Emotional Intelligence: Concepts and Application', desc: 'Models of emotional intelligence and its application in administration, conflict and crisis.', topics: 'Models, Self-Awareness, Empathy, Application' },
    { slug: 'public-service-values', title: 'Public Service Values and Ethics in Administration', desc: 'Integrity, objectivity, impartiality and dedication, and the ethical dilemmas of a public servant.', topics: 'Integrity, Impartiality, Dilemmas, Accountability' },
    { slug: 'probity-governance', title: 'Probity in Governance: Codes, Conflicts and Corruption', desc: 'Codes of conduct, conflict of interest, corruption and its remedies, and the RTI and whistleblower framework.', topics: 'Codes, Conflict of Interest, Corruption, Whistleblowing' },
    { slug: 'ethics-international', title: 'Ethics in International Relations and Funding', desc: 'Ethical issues in international relations, corporate governance and the ethics of funding political and public activity.', topics: 'International Ethics, Corporate Governance, Funding' },
    { slug: 'case-studies-gs4', title: 'Case Studies: Framework and Practice', desc: 'A repeatable method for GS4 case studies: stakeholders, options, tests and a defensible decision.', topics: 'Method, Stakeholders, Options, Decision' }
  ]
};

function die(msg) { console.error('add-upsc-chapters: ' + msg); process.exit(1); }

var raw = fs.readFileSync(FILE, 'utf8');
var crlf = raw.indexOf('\r\n') !== -1;
var bom = raw.charCodeAt(0) === 0xFEFF;
var body = bom ? raw.slice(1) : raw;
var cfg = JSON.parse(body);
var upsc = cfg.upsc;
if (!upsc || !upsc.modules) die('upsc.upsc.modules missing');

var added = 0;
Object.keys(CHAPTERS).forEach(function (mk) {
  var mod = upsc.modules[mk];
  if (!mod) die('no module ' + mk);
  var existing = {};
  (mod.lessons || []).forEach(function (l) { existing[l.slug] = 1; });

  var fresh = CHAPTERS[mk].filter(function (l) { return !existing[l.slug]; });
  if (!fresh.length) { console.log(mk + ': already has every chapter'); return; }

  // Keep the answer-writing chapter last: it is the practice page and a reader
  // should reach it after the content chapters, not in the middle.
  var lessons = mod.lessons || [];
  var tail = lessons.filter(function (l) { return /^answer-writing-/.test(l.slug); });
  var head = lessons.filter(function (l) { return !/^answer-writing-/.test(l.slug); });
  mod.lessons = head.concat(fresh, tail);
  added += fresh.length;
  console.log(mk + ': ' + head.length + ' existing + ' + fresh.length + ' new + ' + tail.length + ' practice = ' + mod.lessons.length);
});

if (!added) { console.log('nothing to do'); process.exit(0); }

var out = JSON.stringify(cfg, null, 2) + '\n';
if (crlf) out = out.replace(/\n/g, '\r\n');
if (bom) out = '\uFEFF' + out;
fs.writeFileSync(FILE, out, 'utf8');
console.log('added ' + added + ' UPSC chapters');