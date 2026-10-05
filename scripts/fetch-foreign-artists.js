const fs = require('fs');
const path = require('path');
const https = require('https');

const API = 'https://en.wikipedia.org/w/api.php';

const AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

function wikiFetch(params, retries) {
  if (retries === undefined) retries = 3;
  const qs = Object.entries(params).map(([k,v]) => k + '=' + encodeURIComponent(v)).join('&');
  return new Promise((resolve, reject) => {
    const req = https.get(API + '?' + qs + '&origin=*&format=json', { agent: AGENT, headers: { 'User-Agent': 'studypro-wiki/1.0' } }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode === 429 && retries > 0) {
          const wait = Math.pow(2, 4 - retries) * 3000;
          console.error('HTTP 429, retrying in ' + (wait / 1000) + 's... (' + retries + ' left)');
          return setTimeout(() => wikiFetch(params, retries - 1).then(resolve, reject), wait);
        }
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
        try { resolve(JSON.parse(d)); } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, function() { req.destroy(new Error('Request timeout')); });
  });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// Known foreign artists who depicted Indian subjects / Taj Mahal
const SEED_ARTISTS = [
  'Hiroshi Yoshida',
  'Thomas Daniell',
  'William Daniell',
  'William Simpson (Scottish artist)',
  'Samuel Prout',
  'Edwin Lord Weeks',
  'Colin Campbell Cooper',
  'Georges Gasté',
  'Constance Villiers-Stuart',
  'Marianne North',
  'Alexander Scott (painter)'
];

async function getArtistInfo(title) {
  const r = await wikiFetch({ action: 'query', titles: title, prop: 'extracts|categories', exintro: 1, explaintext: 1, cllimit: 30 });
  const pages = r.query.pages;
  for (const id in pages) {
    const p = pages[id];
    if (id === '-1') return null;
    const cats = (p.categories || []).map(c => c.title);
    const isPainter = cats.some(c => /painter|artist|illustrator|printmaker/i.test(c)) || /painter|artist|printmaker/i.test(p.extract || '');
    return { title: p.title, extract: p.extract || '', cats, isPainter };
  }
  return null;
}

async function searchTajArtists() {
  const r = await wikiFetch({ action: 'query', list: 'search', srsearch: '"Taj Mahal" (paint*|sketch*|watercolour*|woodblock*|watercolor*)', srlimit: 50 });
  return (r.query.search || []).map(p => p.title);
}

async function main() {
  console.log('Gathering foreign artists connected to Taj Mahal / Indian subjects...\n');

  // 1. Process known seed artists
  const artists = [];
  for (const name of SEED_ARTISTS) {
    await delay(2000);
    const info = await getArtistInfo(name);
    if (info) {
      console.log((info.isPainter ? '  ✓' : '  ?') + ' ' + info.title);
      if (info.isPainter) artists.push(info);
    } else {
      console.log('  ✗ ' + name + ' (not found)');
    }
  }

  // 2. Search for more
  console.log('\nSearching for more artists...');
  const searchHits = await searchTajArtists();
  for (const hit of searchHits) {
    if (artists.some(a => a.title === hit)) continue;
    await delay(2000);
    const info = await getArtistInfo(hit);
    if (info && info.isPainter) {
      console.log('  + ' + info.title);
      artists.push(info);
    }
  }

  // 3. Add to art-culture.json
  const outputFile = path.join(__dirname, '..', 'data/questions/art-culture.json');
  let data = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
  const tajSub = data['Art & Culture'].subSubjects['Taj Mahal'];
  const existing = new Set();
  tajSub.forEach(q => existing.add(q.question.replace(/\s+/g, ' ').toLowerCase().trim()));

  let added = 0;
  for (const a of artists) {
    const extract = a.extract || '';
    const firstSentence = extract.split(/\.\s+/).slice(0, 2).join('. ') || a.title + ' is an artist.';
    const q = {
      id: 'fa_' + a.title.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, ''),
      type: 'fill_blank',
      category: 'Art & Culture',
      region: '',
      source: 'General Knowledge',
      pubDate: new Date().toISOString(),
      subject: 'Art & Culture',
      subSubject: 'Taj Mahal',
      emoji: '',
      question: '_____ ' + firstSentence,
      answer: a.title,
      hint: '',
      fact: extract || a.title + ' is an artist known for works depicting Indian landmarks.'
    };
    const key = q.question.replace(/\s+/g, ' ').toLowerCase().trim();
    if (!existing.has(key)) {
      tajSub.push(q);
      existing.add(key);
      added++;
    }
  }

  if (added > 0) {
    fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), 'utf8');
    console.log('\nAdded ' + added + ' foreign artists to Art & Culture > Taj Mahal');
  } else {
    console.log('\nNo new artists to add');
  }
}

main().catch(e => console.error(e));
