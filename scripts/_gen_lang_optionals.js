// Generates the three lesson pages for each language/literature optional
// from a compact data file. Usage:
//   node scripts/_gen_lang_optionals.js scripts/_langdata_a.js
const fs = require('fs');
const path = require('path');

const dataPath = process.argv[2];
if (!dataPath) {
  console.error('Usage: node scripts/_gen_lang_optionals.js <langdata.js>');
  process.exit(1);
}
const languages = require(path.resolve(dataPath));
const DATA = path.join(__dirname, 'course-data.json');
const PRACTICE = path.join(__dirname, 'course-practice.json');
const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const practice = JSON.parse(fs.readFileSync(PRACTICE, 'utf8'));

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function mcq(text, correct, distractors, sol) {
  // Rotate the correct answer position by a deterministic hash of the text.
  const pos = text.length % 4;
  const opts = [];
  let d = 0;
  for (let i = 0; i < 4; i++) {
    if (i === pos) opts.push(correct);
    else opts.push(distractors[d++]);
  }
  return { text, options: opts, correct: pos, sol };
}

function list(items, render) {
  return '<ul>\n' + items.map(render).join('\n') + '\n</ul>';
}

function sampleBlock(lang) {
  if (!lang.sample) return '';
  return `<div class="example-box"><div class="ex-title">Model-generated practice passage (${esc(lang.script)})</div><div class="ex-text" style="font-size:1.05em;line-height:2">${esc(lang.sample.passage)}</div><div class="ex-soln">English meaning: ${esc(lang.sample.english)}</div></div>
<div class="tip-box"><div class="tip-title">Provenance</div><div class="tip-text">Model-generated practice passage, script-verified with scripts/lib/language-verify.js; native-speaker review pending. It is not an official UPSC passage and carries no PYQ claim.</div></div>`;
}

function overview(lang) {
  const periods = lang.periods.map(p => `<li><strong>${esc(p.name)}:</strong> ${esc(p.desc)}</li>`).join('\n');
  const sources = lang.sources.map(s => `<li>${esc(s)}</li>`).join('\n');
  return `<h3>${esc(lang.name)} Optional — Syllabus Map &amp; Strategy</h3>
<p>${esc(lang.name)} is ${esc(lang.family)} and is written in ${esc(lang.script)}. It is spoken mainly in ${esc(lang.region)}. ${esc(lang.status)}. The optional has two papers of 250 marks each.</p>
<h3>Paper I — History of the Language and Literature</h3>
<ul>
<li><strong>History of the language:</strong> origin, stages of development, dialect variation and standardisation.</li>
<li><strong>Literary movements:</strong> ${esc(lang.movements.join(', '))}.</li>
<li><strong>Major authors and works:</strong> period-wise study of representative writers and texts.</li>
</ul>
<h3>Paper II — Prescribed Texts, Criticism and Answer Writing</h3>
<ul>
<li><strong>Prescribed texts:</strong> close reading of canonical texts and prescribed extracts.</li>
<li><strong>Literary criticism:</strong> ${esc(lang.criticism)}</li>
<li><strong>Explanation and essays:</strong> paraphrase, context, theme, form and critical evaluation.</li>
</ul>
<h3>Periods at a Glance</h3>
<ul>
${periods}
</ul>
<div class="example-box"><div class="ex-title">Solved Example: Period-wise Answer</div><div class="ex-text">Question: Trace the main stages of ${esc(lang.name)} literature.</div><div class="ex-soln">Answer: ${esc(lang.periods.map(p => p.name + ' — ' + p.desc).join('; '))}.</div></div>
<h3>Standard Sources</h3>
<ul>
${sources}
</ul>
<h3>Common Traps</h3>
<ul>
<li>Writing a general Indian-literature answer without naming ${esc(lang.name)} authors and texts.</li>
<li>Confusing periods and movements; give approximate centuries, not exact years you are unsure of.</li>
<li>Quoting a translation as if it were the original; mention the translator when you quote.</li>
<li>Ignoring the script and dialect question in Paper I.</li>
<li>Writing plot summaries instead of critical analysis in Paper II.</li>
</ul>
<div class="tip-box"><div class="tip-title">Mains strategy</div><div class="tip-text">Build a one-page timeline of ${esc(lang.name)} literature with period, movement, authors and works. For Paper I, answer in three layers: origin and development → movement → representative authors. For Paper II, use the structure: context → theme → form and language → critical evaluation. Quote short phrases with the original term and an English gloss.</div></div>`;
}

function paper1(lang) {
  const periods = lang.periods.map(p => `<li><strong>${esc(p.name)}:</strong> ${esc(p.desc)}</li>`).join('\n');
  const authors = lang.authors.map(a => `<li><strong>${esc(a.name)}:</strong> ${esc(a.note)}</li>`).join('\n');
  const works = lang.works.map(w => `<li><strong>${esc(w.title)}</strong> — ${esc(w.author)}: ${esc(w.note)}</li>`).join('\n');
  return `<h3>${esc(lang.name)} Paper I — History of the Language, Movements, Authors and Works</h3>
<h3>History of the Language</h3>
<p>${esc(lang.origin)}</p>
<h3>Literary Periods and Movements</h3>
<ul>
${periods}
</ul>
<h3>Major Authors</h3>
<ul>
${authors}
</ul>
<h3>Major Works</h3>
<ul>
${works}
</ul>
${sampleBlock(lang)}
<div class="example-box"><div class="ex-title">Solved Example: Author and Period</div><div class="ex-text">Question: Place ${esc(lang.authors[0].name)} in the literary history of ${esc(lang.name)} and assess their contribution.</div><div class="ex-soln">Answer: ${esc(lang.authors[0].name)} belongs to the ${esc(lang.periods[0].name)} phase. ${esc(lang.authors[0].note)} The contribution should be assessed through language, theme and form, and through influence on later writers.</div></div>
<h3>Memory Tricks</h3>
<ul>
<li><strong>Timeline:</strong> ${esc(lang.periods.map(p => p.name).join(' → '))}.</li>
<li><strong>Authors:</strong> ${esc(lang.authors.map(a => a.name).join(', '))}.</li>
<li><strong>Works:</strong> ${esc(lang.works.map(w => w.title).join(', '))}.</li>
</ul>
<div class="tip-box"><div class="tip-title">Mains strategy</div><div class="tip-text">For Paper I, use the sequence: language origin → period → movement → author → work. Add one short quotation or native term per answer. Draw a timeline in the margin if the question asks for development. Avoid unverified dates; approximate centuries are safer.</div></div>`;
}

function paper2(lang) {
  const works = lang.works.map(w => `<li><strong>${esc(w.title)}</strong> — ${esc(w.author)}: ${esc(w.note)}</li>`).join('\n');
  return `<h3>${esc(lang.name)} Paper II — Prescribed Texts, Criticism, Explanation and Essays</h3>
<h3>Prescribed Texts and Close Reading</h3>
<ul>
${works}
</ul>
<h3>Literary Criticism</h3>
<p>${esc(lang.criticism)}</p>
<h3>Explanation (Vyakhya) Strategy</h3>
<ul>
<li><strong>Context:</strong> identify the text, author, period and speaker.</li>
<li><strong>Literal meaning:</strong> paraphrase the passage in simple ${esc(lang.name)} or English.</li>
<li><strong>Theme:</strong> state the central idea and the emotional tone.</li>
<li><strong>Form:</strong> comment on metre, imagery, diction and figures of speech.</li>
<li><strong>Evaluation:</strong> link the passage to the author’s larger concerns and the period.</li>
</ul>
<h3>Essay Questions</h3>
<ul>
<li>Define the literary issue in the question, then take a clear position.</li>
<li>Support the argument with at least three texts or authors.</li>
<li>Include one counter-argument and respond to it.</li>
<li>Conclude with the significance of the issue for ${esc(lang.name)} literature.</li>
</ul>
${sampleBlock(lang)}
<div class="example-box"><div class="ex-title">Solved Example: Explanation</div><div class="ex-text">Question: Explain a prescribed passage from ${esc(lang.works[0].title)}.</div><div class="ex-soln">Answer: Identify the speaker and situation, paraphrase the lines, state the theme, comment on imagery and form, and connect the passage to the work’s central concern. A good explanation moves from literal meaning to literary evaluation.</div></div>
<h3>Common Traps</h3>
<ul>
<li>Retelling the plot instead of analysing the passage.</li>
<li>Using a translation without naming the translator.</li>
<li>Ignoring the prescribed text and writing general remarks.</li>
<li>Mixing authors and works from different periods.</li>
<li>Making claims about influence without evidence.</li>
</ul>
<div class="tip-box"><div class="tip-title">Mains strategy</div><div class="tip-text">For explanation questions, use the five-step structure: context → literal meaning → theme → form → evaluation. For essay questions, write a thesis statement in the first paragraph, use three body paragraphs with textual evidence, and end with a balanced conclusion. Keep quotations short and accurate.</div></div>`;
}

function makeQs(lang) {
  const base = [
    mcq(`${lang.name} belongs to which language family?`, lang.family, ['Dravidian', 'Austroasiatic', 'Tibeto-Burman'].filter(x => x !== lang.family).slice(0, 3), `${lang.name} is ${lang.family}.`),
    mcq(`Which script is used for ${lang.name}?`, lang.script, ['Devanagari', 'Perso-Arabic', 'Roman'].filter(x => x !== lang.script).slice(0, 3), `${lang.name} is written in ${lang.script}.`),
    mcq(`When was ${lang.name} included in the Eighth Schedule?`, lang.scheduleShort, ['1950', '1967', '1992', '2003'].filter(x => x !== lang.scheduleShort).slice(0, 3), `${lang.name}: ${lang.status}.`),
    mcq(`Who wrote ${lang.works[0].title}?`, lang.works[0].author, lang.authors.filter(a => a.name !== lang.works[0].author).slice(0, 3).map(a => a.name), `${lang.works[0].title} is by ${lang.works[0].author}.`),
    mcq(`Which of the following is a major period or movement in ${lang.name} literature?`, lang.movements[0], ['Romanticism', 'Modernism', 'Post-modernism'].filter(x => x !== lang.movements[0]).slice(0, 3), `${lang.movements[0]} is a major movement/period in ${lang.name} literature.`),
    mcq(`The earliest phase of ${lang.name} literature is best described as:`, lang.periods[0].name, ['Modern period', 'Colonial period', 'Post-independence period'].filter(x => x !== lang.periods[0].name).slice(0, 3), `${lang.periods[0].name}: ${lang.periods[0].desc}`),
    mcq(`Which work is associated with ${lang.authors[0].name}?`, lang.works.find(w => w.author === lang.authors[0].name) ? lang.works.find(w => w.author === lang.authors[0].name).title : lang.works[0].title, lang.works.filter(w => w.author !== lang.authors[0].name).slice(0, 3).map(w => w.title), `The work is associated with ${lang.authors[0].name}.`),
    mcq(`Which of the following is a major author of ${lang.name}?`, lang.authors[1].name, ['William Wordsworth', 'Rabindranath Tagore', 'Kalidasa'].filter(x => x !== lang.authors[1].name).slice(0, 3), `${lang.authors[1].name} is a major ${lang.name} author.`),
    mcq(`The language ${lang.name} is mainly spoken in:`, lang.region, ['Kerala', 'Punjab', 'Odisha'].filter(x => x !== lang.region).slice(0, 3), `${lang.name} is mainly spoken in ${lang.region}.`),
    mcq(`Which statement about ${lang.name} is correct?`, lang.status, ['It is not recognised by the Constitution.', 'It is a classical language only.', 'It has no written literature.'], `${lang.name}: ${lang.status}.`),
    mcq(`In a Paper II explanation question on ${lang.name}, the first step is to:`, 'identify the text, author and context', ['summarise the plot', 'list all characters', 'give a personal opinion'], 'Explanation begins with context: text, author, period and speaker.'),
    mcq(`Which approach is best for a ${lang.name} literary essay?`, 'thesis, textual evidence, counter-argument, conclusion', ['plot summary only', 'biography of the author only', 'quotation collection without argument'], 'A literary essay needs a thesis, evidence, a counter-argument and a conclusion.'),
    mcq(`When quoting a ${lang.name} text in an English answer, you should:`, 'give the original term with a translation and translator', ['quote a translation without credit', 'invent a quotation', 'avoid all quotations'], 'Quote accurately, give the original term and credit the translator.'),
    mcq(`Literary criticism of ${lang.name} should focus on:`, lang.criticism, ['only the author’s life', 'only the price of the book', 'only the number of pages'], `Criticism focuses on ${lang.criticism}`),
    mcq(`The safest way to handle uncertain dates in ${lang.name} literary history is to:`, 'use approximate centuries and avoid precise unverified years', ['invent exact years', 'skip all chronology', 'use only foreign dates'], 'Approximate centuries are safer than unverified exact dates.')
  ];
  const merged = base.map((q, i) => {
    const o = lang.mcqOverrides && lang.mcqOverrides[i];
    return o ? mcq(o.text, o.correct, o.distractors, o.sol) : q;
  });
  return {
    qs1: merged.slice(0, 5),
    qs2: merged.slice(5, 10),
    qs3: merged.slice(10, 15)
  };
}

let count = 0;
languages.forEach(lang => {
  const q = makeQs(lang);
  const entries = {
    [`opt-${lang.slug}/overview`]: { html: overview(lang), qs: q.qs1 },
    [`opt-${lang.slug}/paper1`]: { html: paper1(lang), qs: q.qs2 },
    [`opt-${lang.slug}/paper2`]: { html: paper2(lang), qs: q.qs3 }
  };
  Object.keys(entries).forEach(key => {
    data[key] = entries[key].html;
    practice[key] = entries[key].qs.map((x, i) => ({
      id: 7001 + count * 10 + i,
      text: x.text,
      options: x.options.map((o, j) => ({ l: String.fromCharCode(97 + j), t: o, c: j === x.correct })),
      sol: x.sol
    }));
    count++;
    console.log('Generated ' + key);
  });
});

fs.writeFileSync(DATA, JSON.stringify(data, null, 2) + '\n', 'utf8');
fs.writeFileSync(PRACTICE, JSON.stringify(practice, null, 2) + '\n', 'utf8');
console.log('Done: ' + languages.length + ' languages, ' + (languages.length * 3) + ' lessons.');
