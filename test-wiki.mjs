import { writeFileSync } from 'fs';

const examTopics = ['India history','Geography of India','Indian Constitution','Indian economy','Indian culture','Indian art','Indian literature','Indian music','Indian dance','Indian architecture','Physics','Chemistry','Biology','World history','United Nations','Climate change','Computer science','Indian astronomy','Indian mathematics','Indian philosophy','Indian independence movement','Indian freedom fighters','World wars','Indian scientists','Indian Nobel laureates','Indian rivers','Himalayas','Indian agriculture','Indian defence','Indian space program','Indian democracy','Indian elections','Indian government','Indian judiciary','Indian education','Indian tribes','Biodiversity','Indian national parks','Indian states','Indian dance forms','Indian music instruments','Indian festivals','Indian temples','Indian monuments','Indian literature works','Indian authors','Indian sports','Olympics'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function classify(desc, extract) {
  var text = (desc + ' ' + extract).toLowerCase();
  var categories = [
    { id: 'history', keywords: ['history', 'historical', 'century', 'medieval', 'ancient', 'war', 'battle', 'kingdom', 'empire', 'dynasty', 'revolution', 'independence', 'colonial', 'freedom'] },
    { id: 'geography', keywords: ['geography', 'river', 'mountain', 'country', 'city', 'capital', 'ocean', 'sea', 'lake', 'island', 'desert', 'forest', 'climate', 'region', 'continent', 'national park'] },
    { id: 'polity', keywords: ['constitution', 'parliament', 'government', 'politics', 'election', 'president', 'prime minister', 'legislature', 'judiciary', 'law', 'amendment', 'federal', 'democracy'] },
    { id: 'economy', keywords: ['economy', 'economic', 'gdp', 'inflation', 'budget', 'tax', 'bank', 'finance', 'trade', 'market', 'industry', 'business', 'commerce', 'currency'] },
    { id: 'science', keywords: ['science', 'physics', 'chemistry', 'biology', 'scientist', 'invention', 'discovery', 'element', 'molecule', 'cell', 'gene', 'quantum', 'nuclear', 'laboratory'] },
    { id: 'space', keywords: ['space', 'satellite', 'rocket', 'isro', 'nasa', 'moon', 'mars', 'planet', 'astronomy', 'telescope', 'orbit', 'launch', 'astronaut', 'cosmos'] },
    { id: 'environment', keywords: ['environment', 'climate', 'pollution', 'forest', 'wildlife', 'species', 'endangered', 'conservation', 'ecology', 'biodiversity', 'greenhouse', 'emission'] },
    { id: 'culture', keywords: ['culture', 'art', 'music', 'dance', 'painting', 'architecture', 'temple', 'festival', 'heritage', 'tradition', 'classical', 'folk', 'literature'] },
    { id: 'sports', keywords: ['sport', 'game', 'olympic', 'cricket', 'football', 'tennis', 'athlete', 'champion', 'tournament', 'medal', 'world cup', 'stadium'] },
    { id: 'ir', keywords: ['international', 'foreign', 'diplomacy', 'treaty', 'alliance', 'united nations', 'bilateral', 'multilateral', 'embassy', 'global'] },
    { id: 'computers', keywords: ['computer', 'software', 'hardware', 'programming', 'internet', 'digital', 'cyber', 'data', 'algorithm', 'artificial intelligence', 'technology', 'electronic'] },
    { id: 'personalities', keywords: ['born', 'died', 'known for', 'biography', 'award', 'achievement', 'founder', 'leader', 'scientist', 'author', 'artist', 'philosopher'] },
  ];
  for (var i = 0; i < categories.length; i++) {
    var cat = categories[i];
    for (var j = 0; j < cat.keywords.length; j++) {
      if (text.indexOf(cat.keywords[j]) >= 0) return cat.id;
    }
  }
  return 'general';
}

function makeQuestions(data) {
  var title = data.title;
  var extract = data.extract || '';
  var desc = data.description || '';
  var firstSentence = extract.split('.')[0] || extract;

  if (extract.length < 100) return [];

  var category = classify(desc, extract);
  var catName = category === 'general' ? 'GK' : category.replace(/_/g, ' ');

  var sentences = extract.match(/[^.!?]+[.!?]/g) || [];
  var years = extract.match(/\b(1[0-9]{3}|20[0-9]{2})\b/g) || [];

  var results = [];
  function pushQ(q) {
    if (!q) return;
    var a = String(q.a);
    var aLower = a.toLowerCase();
    if (aLower.indexOf('various') >= 0 || aLower.indexOf('multiple') >= 0 || aLower.indexOf('unknown') >= 0 || aLower.indexOf('none') >= 0) return;
    if (a.length < 3) return;
    results.push(q);
  }

  var factSentences = [title];
  if (desc) factSentences.push(desc);
  for (var fi = 0; fi < Math.min(sentences.length, 10); fi++) {
    var sf = sentences[fi].trim();
    if (sf.length > 15) factSentences.push(sf);
  }
  var richFact = factSentences.join('. ');

  // What questions (always generated)
  pushQ({ q: 'What is ' + title + '?', a: desc || firstSentence.substr(0, 100), hint: 'General description', fact: richFact });
  pushQ({ q: 'What is ' + title + ' known for?', a: desc || firstSentence.substr(0, 120), hint: 'Main feature', fact: richFact });
  pushQ({ q: 'Why is ' + title + ' important?', a: desc || firstSentence.substr(0, 120), hint: 'Significance', fact: richFact });

  // Category questions (skip if general)
  if (category !== 'general') {
    pushQ({ q: 'What category does ' + title + ' fall under?', a: catName, hint: 'Subject field', fact: richFact });
    pushQ({ q: 'Which field is ' + title + ' associated with?', a: catName, hint: 'Subject area', fact: richFact });
  }

  // Year questions (skip for persons)
  for (var yi = 0; yi < Math.min(years.length, 2); yi++) {
    var y = years[yi];
    pushQ({ q: 'When was ' + title + ' established?', a: y, hint: 'Related year', fact: richFact });
  }

  // First sentence clue
  if (firstSentence.length >= 15) {
    var clue = firstSentence.length > 100 ? firstSentence.substr(0, 100) + '...' : firstSentence;
    pushQ({ q: 'Identify: "' + clue + '"', a: title, hint: desc || 'What does this describe?', fact: richFact });
  }

  return results;
}

var UA = 'Mozilla/5.0 GKQuiz/1.0';

async function searchAndGenerate(topic) {
  var res, json, data;
  try {
    res = await fetch('https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=' + encodeURIComponent(topic) + '&srlimit=50&format=json&origin=*', { headers: { 'User-Agent': UA } });
    json = await res.json();
  } catch(e) { return null; }
  var pages = json && json.query && json.query.search;
  if (!pages || pages.length === 0) return null;
  var selected = pick(pages);
  try {
    res = await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(selected.title), { headers: { 'User-Agent': UA } });
    if (!res.ok) return null;
    data = await res.json();
  } catch(e) { return null; }
  if (!data || !data.title) return null;
  var questions = makeQuestions(data);
  return { title: data.title, description: data.description, extract: (data.extract || '').substring(0, 200), category: classify(data.description || '', data.extract || ''), questions: questions };
}

async function main() {
  var output = [];
  var seen = new Set();
  for (var i = 0; i < 8; i++) {
    var topic = pick(examTopics);
    console.error('Fetching topic:', topic);
    var result = await searchAndGenerate(topic);
    if (result) {
      console.error('  Got:', result.title, '(' + result.questions.length + ' questions)');
    } else {
      console.error('  Failed');
    }
    if (result && !seen.has(result.title)) {
      seen.add(result.title);
      output.push(result);
    }
  }
  
  var lines = [];
  for (var i = 0; i < output.length; i++) {
    var r = output[i];
    lines.push('═══════════════════════════════════════════════════');
    lines.push('Article: ' + r.title);
    lines.push('Category: ' + r.category);
    lines.push('Description: ' + (r.description || 'N/A'));
    lines.push('Extract: ' + r.extract + '...');
    lines.push('');
    lines.push('Generated Questions (' + r.questions.length + '):');
    r.questions.forEach(function(q, qi) {
      lines.push('  ' + (qi+1) + '. Q: ' + q.q);
      lines.push('     A: ' + q.a);
      lines.push('     Fact: ' + q.fact.substring(0, 150) + '...');
    });
    lines.push('');
  }
  lines.push('═══════════════════════════════════════════════════');
  lines.push('Total articles: ' + output.length + ', Total questions: ' + output.reduce(function(s, r) { return s + r.questions.length; }, 0));
  
  var path = 'C:\\Users\\Renjith\\Desktop\\icode (2)\\qns\\wiki-output.txt';
  writeFileSync(path, lines.join('\n'), 'utf8');
  console.log('Written to: ' + path);
  console.log(lines.join('\n'));
}

main().catch(console.error);
