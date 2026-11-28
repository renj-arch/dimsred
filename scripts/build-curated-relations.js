'use strict';
// Builds data/relations.json — the hand-curated relation layer flowchart.html
// draws as arrows. Every triple is authored (src: "authored") or carries the
// evidence sentence that supports it. No corpus co-mention is promoted here.
//
// Why this script exists: data/* is gitignored, and build-timeline.yml used to
// regenerate relations.json from corpus edges without publishing it. The live
// flowchart therefore fetched a 404 and drew no arrows at all. This file is now
// tracked and is the single source of the relation layer; build-timeline no
// longer overwrites it.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'relations.json');

const FAMILIES = {
  historical: {
    label: 'Historical roles',
    color: '#d84f4f',
    verbs: ['part_of', 'led', 'founded', 'ruled', 'preceded', 'resulted_in',
      'participated_in', 'opposed', 'established', 'commanded', 'authored',
      'declared', 'succeeded_by']
  },
  institutional: {
    label: 'Institutions',
    color: '#4f7fd8',
    verbs: ['member_of', 'led_institution', 'contains', 'founded_by']
  },
  geographical: {
    label: 'Geography',
    color: '#4fae62',
    verbs: ['located_in', 'capital_of', 'borders', 'flows_into']
  },
  semantic: {
    label: 'Other relations',
    color: '#9aa4b8',
    verbs: ['associated_with', 'influenced', 'influenced_by', 'exemplifies', 'known_for']
  }
};

const INVERSE = {
  part_of: 'contains',
  led: 'led_by',
  founded: 'founded_by',
  founded_by: 'founded',
  ruled: 'ruled_by',
  preceded: 'followed_by',
  resulted_in: 'resulted_from',
  participated_in: 'involved',
  opposed: 'opposed_by',
  established: 'established_by',
  commanded: 'commanded_by',
  authored: 'written_by',
  declared: 'declared_by',
  succeeded_by: 'predecessor_of',
  member_of: 'includes_member',
  led_institution: 'led_by',
  contains: 'part_of',
  located_in: 'contains_place',
  capital_of: 'has_capital',
  borders: 'borders',
  flows_into: 'fed_by',
  associated_with: 'associated_with',
  influenced: 'influenced_by',
  influenced_by: 'influenced',
  exemplifies: 'exemplified_by',
  known_for: 'known_for'
};

// Each entry: [topicKey, from, verb, to, evidence?]
// topicKey only decides which curated spine the arrow hangs from; it does not
// change the endpoints. Keep it to a key that exists in data/topic-layers.json
// where possible so the arrow sits in the right lane.
const EDGES = [
  // ---- Indian independence movement --------------------------------------
  ['indian independence movement', 'Indian National Congress', 'led', 'Indian Independence Movement',
    'The Indian National Congress, founded in 1885, became the principal organisation of the independence movement.'],
  ['indian independence movement', 'Mahatma Gandhi', 'led', 'Indian Independence Movement',
    'Gandhi returned to India in 1915 and led the mass phase of the freedom struggle from 1919.'],
  ['indian independence movement', 'Jawaharlal Nehru', 'led', 'Indian Independence Movement',
    'Nehru was a principal leader of the Congress and became India\u2019s first prime minister in 1947.'],
  ['indian independence movement', 'Sardar Vallabhbhai Patel', 'led', 'Indian Independence Movement',
    'Patel organised the Bardoli Satyagraha and later led the integration of the princely states.'],
  ['indian independence movement', 'Subhas Chandra Bose', 'led', 'Azad Hind Fauj',
    'Bose took command of the Azad Hind Fauj and its campaign against British rule in 1943.'],
  ['indian independence movement', 'Non-Cooperation Movement', 'part_of', 'Indian Independence Movement',
    'The Non-Cooperation Movement of 1920\u201322 was the first nationwide Gandhian mass campaign.'],
  ['indian independence movement', 'Civil Disobedience Movement', 'part_of', 'Indian Independence Movement',
    'The Civil Disobedience Movement began with the Dandi March in 1930.'],
  ['indian independence movement', 'Quit India Movement', 'part_of', 'Indian Independence Movement',
    'The Quit India Movement was launched in August 1942 demanding an end to British rule.'],
  ['indian independence movement', 'Khilafat Movement', 'associated_with', 'Non-Cooperation Movement',
    'Gandhi linked the Khilafat issue to non-cooperation in 1920, and the two campaigns ran together.'],
  ['indian independence movement', 'Swadeshi Movement', 'preceded', 'Non-Cooperation Movement',
    'The Swadeshi Movement of 1905\u201308 preceded the Gandhian mass campaigns.'],
  ['indian independence movement', 'Dandi March', 'part_of', 'Civil Disobedience Movement',
    'The Dandi March of March\u2013April 1930 opened the Civil Disobedience Movement.'],
  ['indian independence movement', 'Simon Commission', 'preceded', 'Civil Disobedience Movement',
    'The all-British Simon Commission arrived in 1928 and intensified the demand for self-rule.'],
  ['indian independence movement', 'Jallianwala Bagh Massacre', 'preceded', 'Non-Cooperation Movement',
    'The Jallianwala Bagh massacre of 13 April 1919 turned public opinion against British rule.'],
  ['indian independence movement', 'Revolt of 1857', 'preceded', 'Indian Independence Movement',
    'The Revolt of 1857 is regarded as the first major challenge to British rule in India.'],
  ['indian independence movement', 'Champaran Satyagraha', 'preceded', 'Non-Cooperation Movement',
    'Gandhi\u2019s Champaran Satyagraha of 1917 was his first successful campaign in India.'],
  ['indian independence movement', 'Bardoli Satyagraha', 'preceded', 'Civil Disobedience Movement',
    'Vallabhbhai Patel led the Bardoli Satyagraha of 1928 against a revenue increase.'],
  ['indian independence movement', 'Indian Independence Movement', 'resulted_in', 'Partition of India',
    'Independence in August 1947 was accompanied by the partition of British India into India and Pakistan.'],
  ['indian independence movement', 'Government of India Act 1935', 'preceded', 'Quit India Movement',
    'The Government of India Act 1935 expanded provincial autonomy before the 1942 Quit India Movement.'],
  ['indian independence movement', 'Mahatma Gandhi', 'participated_in', 'Dandi March',
    'Gandhi walked from Sabarmati Ashram to Dandi in 1930 to make salt in defiance of the salt law.'],
  ['indian independence movement', 'Sarojini Naidu', 'participated_in', 'Dandi March',
    'Sarojini Naidu joined the Dandi March and addressed public meetings along the route.'],
  ['indian independence movement', 'Bal Gangadhar Tilak', 'led', 'Swadeshi Movement',
    'Tilak was a leader of the extremist wing that drove the Swadeshi Movement after 1905.'],
  ['indian independence movement', 'Bhagat Singh', 'participated_in', 'Indian Independence Movement',
    'Bhagat Singh was executed in 1931 for his role in the revolutionary struggle against British rule.'],

  // ---- Congress and the Constituent Assembly ----------------------------
  ['indian national congress', 'Mahatma Gandhi', 'member_of', 'Indian National Congress',
    'Gandhi joined the Indian National Congress and led it during the mass phase.'],
  ['indian national congress', 'Jawaharlal Nehru', 'member_of', 'Indian National Congress',
    'Nehru served as Congress president and led the party into independence.'],
  ['indian national congress', 'Sardar Vallabhbhai Patel', 'member_of', 'Indian National Congress',
    'Patel was a senior Congress leader and organiser of the Bardoli Satyagraha.'],
  ['indian national congress', 'Bal Gangadhar Tilak', 'member_of', 'Indian National Congress',
    'Tilak was a Congress leader of the extremist wing before 1920.'],
  ['constituent assembly of india', 'B. R. Ambedkar', 'member_of', 'Constituent Assembly of India',
    'Ambedkar was a member of the Constituent Assembly and chaired its Drafting Committee.'],
  ['constituent assembly of india', 'Jawaharlal Nehru', 'member_of', 'Constituent Assembly of India',
    'Nehru was a member of the Constituent Assembly and moved the Objectives Resolution in 1946.'],
  ['constituent assembly of india', 'Sardar Vallabhbhai Patel', 'member_of', 'Constituent Assembly of India',
    'Patel was a member of the Constituent Assembly and chaired the advisory committee on fundamental rights.'],
  ['constituent assembly of india', 'Rajendra Prasad', 'member_of', 'Constituent Assembly of India',
    'Rajendra Prasad was president of the Constituent Assembly.'],
  ['constituent assembly of india', 'B. R. Ambedkar', 'authored', 'Constitution of India',
    'Ambedkar chaired the Drafting Committee that produced the draft Constitution of India.'],
  ['constituent assembly of india', 'Constituent Assembly of India', 'established', 'Constitution of India',
    'The Constituent Assembly adopted the Constitution of India on 26 November 1949.'],

  // ---- Economy ----------------------------------------------------------
  ['economic liberalisation in india', 'Lpg Reforms', 'part_of', 'Economic liberalisation in India',
    'The 1991 liberalisation, privatisation and globalisation reforms opened the Indian economy.'],
  ['economic liberalisation in india', 'Five-Year Plans (India)', 'preceded', 'Lpg Reforms',
    'India\u2019s Five-Year Plans preceded the 1991 shift to liberalisation.'],
  ['goods and services tax india', 'Goods and Services Tax (India)', 'part_of', 'Economic liberalisation in India',
    'GST, introduced in 2017, continued the post-1991 reform of indirect taxation.'],
  ['73rd constitutional amendment', '73rd Constitutional Amendment', 'part_of', 'Constitution of India',
    'The 73rd Constitutional Amendment inserted Part IX on panchayats into the Constitution.'],

  // ---- Ancient and medieval India ---------------------------------------
  ['maurya empire', 'Chandragupta Maurya', 'founded', 'Maurya Empire',
    'Chandragupta Maurya founded the Maurya Empire around 321 BCE.'],
  ['maurya empire', 'Ashoka', 'ruled', 'Maurya Empire',
    'Ashoka ruled the Maurya Empire from about 268 to 232 BCE.'],
  ['maurya empire', 'Chandragupta Maurya', 'preceded', 'Bindusara',
    'Bindusara succeeded his father Chandragupta Maurya as ruler.'],
  ['maurya empire', 'Bindusara', 'preceded', 'Ashoka',
    'Ashoka succeeded his father Bindusara as Maurya ruler.'],
  ['mughal empire', 'Babur', 'founded', 'Mughal Empire',
    'Babur founded the Mughal Empire after the First Battle of Panipat in 1526.'],
  ['mughal empire', 'Akbar', 'ruled', 'Mughal Empire',
    'Akbar ruled the Mughal Empire from 1556 to 1605.'],
  ['mughal empire', 'Aurangzeb', 'ruled', 'Mughal Empire',
    'Aurangzeb ruled the Mughal Empire from 1658 to 1707.'],
  ['mughal empire', 'First Battle of Panipat', 'resulted_in', 'Mughal Empire',
    'Babur\u2019s victory at Panipat in 1526 established Mughal rule in north India.'],
  ['mughal empire', 'Second Battle of Panipat', 'resulted_in', 'Mughal Empire',
    'Akbar\u2019s victory at the Second Battle of Panipat in 1556 consolidated Mughal power.'],
  ['maratha empire', 'Shivaji', 'founded', 'Maratha Empire',
    'Shivaji founded an independent Maratha kingdom in the seventeenth century.'],
  ['battle of plassey', 'Battle of Plassey', 'preceded', 'British Raj',
    'The Battle of Plassey in 1757 established Company political power in Bengal.'],
  ['battle of buxar', 'Battle of Buxar', 'preceded', 'British Raj',
    'The Battle of Buxar in 1764 confirmed Company control over Bengal and Bihar.'],
  ['revolt of 1857', 'Revolt of 1857', 'resulted_in', 'British Raj',
    'After the Revolt of 1857 the British Crown took direct control of India in 1858.']
];

const families = {};
const topics = {};
for (const fam of Object.keys(FAMILIES)) {
  families[fam] = {
    label: FAMILIES[fam].label,
    color: FAMILIES[fam].color,
    verbs: FAMILIES[fam].verbs.slice()
  };
}
for (const [topic, a, rel, b, ev] of EDGES) {
  const T = topics[topic] || (topics[topic] = { edges: [] });
  const edge = { a, b, rel, src: 'authored' };
  if (ev) edge.ev = ev;
  T.edges.push(edge);
}

const store = {
  authoredAt: '2026-11-14',
  note: 'Hand-curated relation layer. Every edge is authored; no corpus co-mention is promoted. Regenerate with node scripts/build-curated-relations.js.',
  families,
  inverse: INVERSE,
  topics
};

fs.writeFileSync(OUT, JSON.stringify(store, null, 1) + '\n');
const n = EDGES.length;
console.log('curated relations: ' + n + ' edges across ' + Object.keys(topics).length + ' topics -> ' + path.relative(ROOT, OUT));