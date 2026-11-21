// One-off builder: UPSC Mains Answer-Writing Masterclass page.
const fs = require('fs');
const path = require('path');

const head = fs.readFileSync(path.join(__dirname, '_tmp-upsc-head.html'), 'utf8')
  .replace(/<title>[\s\S]*?<\/title>/, '<title>Mains Answer Writing Masterclass — UPSC CSE Lesson | vlymbooq</title>')
  .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="Free UPSC CSE Mains answer-writing masterclass: question decoding, introduction formulas, paragraph architecture, value-add points, diagrams, word economy and the examiner\'s marking rubric — with worked examples.">')
  .replace(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="https://vlymbooq.qzz.io/upsc/course/mains-answer-writing/lesson-masterclass.html">');

const tail = fs.readFileSync(path.join(__dirname, '_tmp-upsc-tail.js'), 'utf8')
  .replace('lessonSlug="essay-structure"', 'lessonSlug="mains-answer-writing-masterclass"');

const MIDDLE = `        <div class="flex-row">
            <div class="side">
                <div class="sidebar-nav">
                    <div style="font-size:.7em;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px;padding-left:10px">Mains Answer Writing</div>
                    <a href="lesson-masterclass.html" class="active">The Masterclass</a>
                    <a href="../mains-gs1/index.html">GS Paper 1</a>
                    <a href="../mains-gs2/index.html">GS Paper 2</a>
                    <a href="../mains-gs3/index.html">GS Paper 3</a>
                    <a href="../mains-gs4/index.html">GS Paper 4</a>
                    <a href="../mains-essay/index.html">Essay</a>
                </div>
            </div>
            <div class="main">
                <div style="margin-bottom:16px">
                    <div style="font-size:.75em;font-weight:600;color:var(--text-muted);margin-bottom:4px">Mains Craft · Applies to GS Papers 1–4 · 20 questions × 12.5 marks each</div>
                    <h1 style="font-size:1.5em;font-weight:900">Answer Writing Masterclass</h1>
                    <div style="color:var(--text-sec);font-size:.85em;margin-top:4px">How a 125-word answer becomes a 250-word high-scoring answer — the craft that multiplies every GS paper.</div>
                    <div style="display:flex;gap:10px;margin-top:10px">
                        <button onclick="window.print()" class="download-btn">&#x1f4c4; Download PDF</button>
                        <a href="../../mock-tests/index.html" class="download-btn">&#x1f3af; Take Mock Test</a>
                    </div>
                </div>
                <div class="lesson-body">
                    <h3>Learning Objectives</h3>
                    <ul>
                        <li>Decode any mains question into its demand — definition, dimensions, examples, way forward</li>
                        <li>Structure every answer with introduction → body dimensions → conclusion</li>
                        <li>Add value: current examples, data, constitutional provisions, committees, schemes</li>
                        <li>Write within word limits without losing depth — the 150/250-word discipline</li>
                        <li>Self-evaluate answers against the examiner's marking rubric</li>
                    </ul>

<nav class="lesson-toc"><div class="t">Contents</div><ol><li><a href="#ls-1">What the examiner actually marks</a></li><li><a href="#ls-2">Decoding the question</a></li><li><a href="#ls-3">The answer architecture</a></li><li><a href="#ls-4">The value-add toolkit</a></li><li><a href="#ls-5">Word economy — 150 vs 250 words</a></li><li><a href="#ls-6">Diagrams, flowcharts and maps</a></li><li><a href="#ls-7">The self-evaluation rubric</a></li><li><a href="#ls-8">A worked 250-word answer, dissected</a></li><li><a href="#ls-9">Practice plan</a></li></ol></nav>

<h2 id="ls-1">1. What the examiner actually marks</h2>
<p>Every mains answer is read by an examiner processing hundreds of scripts in days. They are not looking for prose beauty — they are scanning for <strong>coverage of the demand dimensions</strong>. A 250-word answer that hits all dimensions scores higher than a 400-word answer that wanders.</p>
<p>The implicit rubric per question (12.5 marks ≈ 150–250 words):</p>
<table>
<caption>What earns marks in a mains answer</caption>
<tr><th>Component</th><th>Weight</th><th>What it looks like</th></tr>
<tr><td><strong>Demand coverage</strong></td><td>~50%</td><td>Every part of the question addressed — definition AND dimensions AND examples</td></tr>
<tr><td><strong>Accuracy</strong></td><td>~25%</td><td>Correct facts, right constitutional provisions, correct data, no contradictions</td></tr>
<tr><td><strong>Structure</strong></td><td>~15%</td><td>Intro → dimensions → conclusion; paragraph breaks; logical flow</td></tr>
<tr><td><strong>Value-add</strong></td><td>~10%</td><td>Current example, scheme, committee, data point, diagram — the "plus" that separates 9 from 12</td></tr>
</table>
<div class="warn-box"><div class="tip-title">The brutal truth</div><div class="tip-text">Most students lose marks not from ignorance but from <em>partial answers</em>: writing a beautiful essay on one dimension while ignoring the question's second demand. Decode the question before writing — always.</div></div>

<h2 id="ls-2">2. Decoding the question</h2>
<p>Every mains question has 2–4 hidden demands. Underline them before writing:</p>
<ul>
<li><strong>"Discuss"</strong> → present multiple dimensions + balanced view. Not one-sided argument.</li>
<li><strong>"Examine"</strong> → analyse critically — strengths AND weaknesses, causes AND consequences.</li>
<li><strong>"Evaluate"</strong> → judge with criteria — what works, what doesn't, verdict.</li>
<li><strong>"Critically examine"</strong> → examine + take a position. The "critically" demands judgement, not neutrality.</li>
<li><strong>"Suggest measures"</strong> → solutions only — but must be specific, actionable, multi-level.</li>
<li><strong>"Elucidate with examples"</strong> → explanation + concrete instances. Abstract theory alone loses marks.</li>
<li><strong>"In the context of" / "With reference to"</strong> → the topic is anchored to a specific recent event or statement — address that anchor explicitly.</li>
<li><strong>Two-part questions</strong> ("…and suggest measures") → split the word budget roughly 60/40 between parts.</li>
</ul>
<div class="example-box"><div class="ex-title">Decoding example</div><div class="ex-text">"Examine the impact of climate change on agriculture in India and suggest measures to make farming resilient."</div><div class="ex-soln"><strong>Demands:</strong> (1) impacts — multi-dimensional (crop yield, water, pests, farmer income); (2) measures — specific, multi-level (policy, technology, insurance). Word split: ~140 words impacts, ~110 measures.</div></div>

<h2 id="ls-3">3. The answer architecture</h2>
<p>The universal mains structure — works for every GS question:</p>
<h3>Introduction (2–3 sentences, ~30 words)</h3>
<ul>
<li>Restate the question's core in your own words (shows you understood it).</li>
<li>Give a framing definition or context (one line).</li>
<li>Signal your structure: "This answer examines X through its economic, social and environmental dimensions."</li>
</ul>
<h3>Body — dimension paragraphs (~180–190 words)</h3>
<p>Each dimension gets ONE paragraph following <strong>IDEA</strong>:</p>
<ul>
<li><strong>I</strong>dea/topic sentence — the dimension's claim.</li>
<li><strong>D</strong>evelopment — explain the mechanism (why/how it works).</li>
<li><strong>E</strong>xample — one concrete instance (scheme, event, data, place).</li>
<li><strong>A</strong>nalysis — significance, consequence, or limitation.</li>
</ul>
<p>3–4 dimensions typical. Order dimensions logically: most important first, or chronological, or cause→effect.</p>
<h3>Conclusion (~30–40 words)</h3>
<ul>
<li>Synthesis, not summary: state the overall assessment or way forward.</li>
<li>For "suggest measures" questions, end with the most important measure or a balanced verdict.</li>
<li>Never introduce new arguments in the conclusion.</li>
</ul>

<h2 id="ls-4">4. The value-add toolkit</h2>
<p>Value-add = one line that signals deeper preparation. Stock these per GS paper:</p>
<table>
<caption>Value-add items by paper</caption>
<tr><th>Paper</th><th>High-value additions</th></tr>
<tr><td>GS1</td><td>Constitutional articles, historical dates/movements, geographic data (rivers, peaks, soils), schemes (PM-KISAN, MGNREGA), committee reports</td></tr>
<tr><td>GS2</td><td>Constitutional provisions (Art 21, 32, 226, 368), landmark cases, institutions (EC, CAG, NHRC), bills/acts with years</td></tr>
<tr><td>GS3</td><td>Scheme names + ministries, data points (ranks, indices, targets), international frameworks (SDGs, Paris Agreement), acts (RTI, NFSA, EIA)</td></tr>
<tr><td>GS4</td><td>Thinkers (Aristotle, Kant, Gandhi, Ambedkar), constitutional values, committee recommendations (2nd ARC, Punchhi), real/illustrative examples</td></tr>
</table>
<p><strong>The rule:</strong> one accurate value-add beats three vague generalities. A wrong fact costs more than no fact — accuracy first, always.</p>

<h2 id="ls-5">5. Word economy — 150 vs 250 words</h2>
<p>The word limit is a <em>range</em>, not a target:</p>
<ul>
<li><strong>150-word questions:</strong> intro 2 sentences, 2–3 tight dimensions (~35 words each), conclusion 1 sentence. No examples unless they're one-liners.</li>
<li><strong>250-word questions:</strong> intro 3 sentences, 3–4 dimensions (~45 words each), conclusion 2 sentences. Room for one example per dimension.</li>
</ul>
<p><strong>Compression techniques:</strong></p>
<ul>
<li>Convert clauses to participles: "which was launched in 2015 and aims at" → "launched 2015, aiming at".</li>
<li>Use arrows in rough notes → expand only in final.</li>
<li>Cut filler: "It is important to note that", "In today's world", "As we all know" — zero marks, pure waste.</li>
<li>Numbers and names carry density: "MGNREGA (2005) guarantees 100 days" beats "a scheme guarantees days".</li>
</ul>

<h2 id="ls-6">6. Diagrams, flowcharts and maps</h2>
<p>For map-based and process questions, a diagram can replace 80 words of prose:</p>
<ul>
<li><strong>Maps:</strong> only for geography questions asking locations — label rivers, passes, peaks, soil regions. Practice drawing from memory.</li>
<li><strong>Flowcharts:</strong> policy cycles, disaster management cycles, election process — boxes + arrows.</li>
<li><strong>Diagrams:</strong> nitrogen cycle, food chain, court hierarchy, federal structure.</li>
<li><strong>Rule:</strong> diagram must be <em>labelled and explained</em> in one line — a bare diagram earns nothing.</li>
</ul>

<h2 id="ls-7">7. The self-evaluation rubric</h2>
<p>After writing any practice answer, score it out of 12.5:</p>
<table>
<caption>Self-evaluation checklist</caption>
<tr><th>Check</th><th>Marks</th><th>Question to ask</th></tr>
<tr><td>Demand fully covered</td><td>6</td><td>Did I address every part of the question?</td></tr>
<tr><td>Facts accurate</td><td>3</td><td>Any wrong article, date, scheme name, or data point?</td></tr>
<tr><td>Structure clear</td><td>2</td><td>Intro → dimensions → conclusion, paragraphs broken?</td></tr>
<tr><td>Value-add present</td><td>1.5</td><td>At least one example/scheme/data point?</td></tr>
</table>
<p>Target: 9+ consistently before the exam. Below 7 = rewrite the answer focusing only on demand coverage.</p>

<h2 id="ls-8">8. A worked 250-word answer, dissected</h2>
<p><strong>Question:</strong> "Digital India has transformed governance delivery. Discuss."</p>
<p><strong>Intro (~30w):</strong> "Digital India, launched 2015, aims to transform governance through technology. Its impact spans efficiency, inclusion and transparency — this answer examines each."</p>
<p><strong>Dimension 1 — Efficiency (~50w):</strong> e-governance reduced paperwork (DigiLocker, UMANG); DBT eliminated leakages (₹X lakh saved); online services cut queues. Example: land records digitisation in 10+ states.</p>
<p><strong>Dimension 2 — Inclusion (~50w):</strong> CSCs extend services to rural areas; UPI enabled financial inclusion (100+ crore accounts); PM-KISAN payments direct to farmers' accounts. Example: ONDC for rural commerce.</p>
<p><strong>Dimension 3 — Transparency (~50w):</strong> Online portals enable tracking (RTI, court cases); geo-tagged MGNREGA workers reduce corruption; Aadhaar-enabled verification prevents duplicates. Limitation: digital divide excludes elderly/rural without connectivity.</p>
<p><strong>Conclusion (~30w):</strong> "Digital India is a governance revolution whose benefits are real but unevenly distributed; bridging the digital divide is the remaining challenge."</p>
<p><strong>Why it scores:</strong> all demands covered, specific schemes named, balanced view (benefits + limitation), clean structure, ~230 words.</p>

<h2 id="ls-9">9. Practice plan</h2>
<p><strong>Phase 1 (weeks 1–2):</strong> Write 5 answers daily from previous-year questions. Score each with the rubric. Focus ONLY on demand coverage — ignore style.</p>
<p><strong>Phase 2 (weeks 3–4):</strong> Same, but add value-add items deliberately — one scheme, one article, one data point per answer.</p>
<p><strong>Phase 3 (last month):</strong> Timed full papers — 20 questions in 3 hours. No peeking at notes. Review only your weakest 5 answers per paper.</p>
<p><strong>The compounding effect:</strong> answer-writing is a skill, not knowledge. 100 rewritten answers teach more than 100 read answers. Start today.</p>
                </div>
                <h3 style="margin-top:24px;margin-bottom:12px;font-size:1.1em">Practice Questions</h3>
                <div id="practice-qs"></div>
                <div style="display:flex;gap:10px;margin-top:10px">
                    <button onclick="resetPractice()" class="btn btn-primary">Reset</button>
                    <button onclick="markComplete()" class="btn btn-success" id="complete-btn">Mark Lesson Complete</button>
                </div>
                <div style="display:flex;justify-content:space-between;margin-top:30px;padding-top:16px;border-top:1px solid var(--border)">
                    <a href="../mains-gs4/index.html" class="btn btn-primary">&#x2190; GS Paper 4</a>
                    <a href="../mains-essay/index.html" class="btn btn-success">Essay Module &#x2192;</a>
                </div>
            </div>
        </div>
        <script>
        var practiceQs = [
{"id":60101,"text":"In UPSC Mains, a 250-word answer should ideally contain approximately how many body dimensions?","options":[{"l":"a","t":"1–2","c":false},{"l":"b","t":"3–4","c":true},{"l":"c","t":"6–8","c":false},{"l":"d","t":"10+","c":false}],"sol":"3–4 dimensions at ~45 words each is the standard structure for 250-word answers."},
{"id":60102,"text":"The word 'Examine' in a mains question primarily demands","options":[{"l":"a","t":"A one-sided argument","c":false},{"l":"b","t":"Critical analysis of multiple aspects","c":true},{"l":"c","t":"A definition only","c":false},{"l":"d","t":"Historical narration","c":false}],"sol":"'Examine' = analyse critically — strengths, weaknesses, causes, consequences."},
{"id":60103,"text":"Which is the best value-add for a GS2 answer on federalism?","options":[{"l":"a","t":"A vague statement about unity","c":false},{"l":"b","t":"Article 1 and 246 plus a Sarkaria Commission reference","c":true},{"l":"c","t":"A quote from a movie","c":false},{"l":"d","t":"Repeating the question","c":false}],"sol":"Constitutional provisions (Art 1, 246) + institutional references (Sarkaria, Punchhi Commissions) are high-value GS2 additions."},
{"id":60104,"text":"For a 150-word answer, the recommended structure is","options":[{"l":"a","t":"Long introduction + short body","c":false},{"l":"b","t":"2-sentence intro, 2–3 tight dimensions, 1-sentence conclusion","c":true},{"l":"c","t":"No conclusion needed","c":false},{"l":"d","t":"5 paragraphs of equal length","c":false}],"sol":"150 words = compressed version of the standard architecture."},
{"id":60105,"text":"'Critically examine' differs from 'examine' in that it requires","options":[{"l":"a","t":"No judgement","c":false},{"l":"b","t":"A position or verdict","c":true},{"l":"c","t":"Only criticism","c":false},{"l":"d","t":"Shorter answers","c":false}],"sol":"'Critically' demands judgement — you must take a position, not stay neutral."},
{"id":60106,"text":"Which should be avoided in a mains answer conclusion?","options":[{"l":"a","t":"Synthesis of dimensions","c":false},{"l":"b","t":"Way forward","c":false},{"l":"c","t":"Introducing new arguments","c":true},{"l":"d","t":"Balanced assessment","c":false}],"sol":"New arguments belong in the body — conclusions synthesise, not introduce."},
{"id":60107,"text":"A diagram in a mains answer earns marks only if","options":[{"l":"a","t":"It is colourful","c":false},{"l":"b","t":"It is labelled and explained in one line","c":true},{"l":"c","t":"It replaces all text","c":false},{"l":"d","t":"It is very large","c":false}],"sol":"Diagrams must be labelled + explained — bare diagrams earn nothing."},
{"id":60108,"text":"The approximate weight of 'demand coverage' in a mains answer's marks is","options":[{"l":"a","t":"10%","c":false},{"l":"b","t":"50%","c":true},{"l":"c","t":"90%","c":false},{"l":"d","t":"25%","c":false}],"sol":"~50% of marks come from covering every part of the question's demand."},
{"id":60109,"text":"For 'suggest measures' questions, the word budget should split roughly","options":[{"l":"a","t":"50/50 between context and measures","c":false},{"l":"b","t":"60/40 favouring the measures","c":true},{"l":"c","t":"90/10 favouring context","c":false},{"l":"d","t":"Equal thirds","c":false}],"sol":"Measures are the deliverable — allocate more words to them (~60/40)."},
{"id":60110,"text":"Which is a compression technique for word economy?","options":[{"l":"a","t":"Adding filler phrases","c":false},{"l":"b","t":"Converting clauses to participles","c":true},{"l":"c","t":"Repeating key terms","c":false},{"l":"d","t":"Using passive voice everywhere","c":false}],"sol":"Participles ('launched 2015, aiming at') compress without losing meaning."}
        ];
`;

const PRACTICE_DATA = [
{"id":60101,"text":"In UPSC Mains, a 250-word answer should ideally contain approximately how many body dimensions?","options":[{"l":"a","t":"1–2","c":false},{"l":"b","t":"3–4","c":true},{"l":"c","t":"6–8","c":false},{"l":"d","t":"10+","c":false}],"sol":"3–4 dimensions at ~45 words each is the standard structure for 250-word answers."},
{"id":60102,"text":"The word 'Examine' in a mains question primarily demands","options":[{"l":"a","t":"A one-sided argument","c":false},{"l":"b","t":"Critical analysis of multiple aspects","c":true},{"l":"c","t":"A definition only","c":false},{"l":"d","t":"Historical narration","c":false}],"sol":"'Examine' = analyse critically — strengths, weaknesses, causes, consequences."},
{"id":60103,"text":"Which is the best value-add for a GS2 answer on federalism?","options":[{"l":"a","t":"A vague statement about unity","c":false},{"l":"b","t":"Article 1 and 246 plus a Sarkaria Commission reference","c":true},{"l":"c","t":"A quote from a movie","c":false},{"l":"d","t":"Repeating the question","c":false}],"sol":"Constitutional provisions (Art 1, 246) + institutional references (Sarkaria, Punchhi Commissions) are high-value GS2 additions."},
{"id":60104,"text":"For a 150-word answer, the recommended structure is","options":[{"l":"a","t":"Long introduction + short body","c":false},{"l":"b","t":"2-sentence intro, 2–3 tight dimensions, 1-sentence conclusion","c":true},{"l":"c","t":"No conclusion needed","c":false},{"l":"d","t":"5 paragraphs of equal length","c":false}],"sol":"150 words = compressed version of the standard architecture."},
{"id":60105,"text":"'Critically examine' differs from 'examine' in that it requires","options":[{"l":"a","t":"No judgement","c":false},{"l":"b","t":"A position or verdict","c":true},{"l":"c","t":"Only criticism","c":false},{"l":"d","t":"Shorter answers","c":false}],"sol":"'Critically' demands judgement — you must take a position, not stay neutral."},
{"id":60106,"text":"Which should be avoided in a mains answer conclusion?","options":[{"l":"a","t":"Synthesis of dimensions","c":false},{"l":"b","t":"Way forward","c":false},{"l":"c","t":"Introducing new arguments","c":true},{"l":"d","t":"Balanced assessment","c":false}],"sol":"New arguments belong in the body — conclusions synthesise, not introduce."},
{"id":60107,"text":"A diagram in a mains answer earns marks only if","options":[{"l":"a","t":"It is colourful","c":false},{"l":"b","t":"It is labelled and explained in one line","c":true},{"l":"c","t":"It replaces all text","c":false},{"l":"d","t":"It is very large","c":false}],"sol":"Diagrams must be labelled + explained — bare diagrams earn nothing."},
{"id":60108,"text":"The approximate weight of 'demand coverage' in a mains answer's marks is","options":[{"l":"a","t":"10%","c":false},{"l":"b","t":"50%","c":true},{"l":"c","t":"90%","c":false},{"l":"d","t":"25%","c":false}],"sol":"~50% of marks come from covering every part of the question's demand."},
{"id":60109,"text":"For 'suggest measures' questions, the word budget should split roughly","options":[{"l":"a","t":"50/50 between context and measures","c":false},{"l":"b","t":"60/40 favouring the measures","c":true},{"l":"c","t":"90/10 favouring context","c":false},{"l":"d","t":"Equal thirds","c":false}],"sol":"Measures are the deliverable — allocate more words to them (~60/40)."},
{"id":60110,"text":"Which is a compression technique for word economy?","options":[{"l":"a","t":"Adding filler phrases","c":false},{"l":"b","t":"Converting clauses to participles","c":true},{"l":"c","t":"Repeating key terms","c":false},{"l":"d","t":"Using passive voice everywhere","c":false}],"sol":"Participles ('launched 2015, aiming at') compress without losing meaning."}
];

const PRACTICE = `        var practiceQs = ${JSON.stringify(PRACTICE_DATA)};\n`;

const out = head + MIDDLE + PRACTICE + tail;
fs.mkdirSync(path.join(__dirname, '..', 'upsc', 'course', 'mains-answer-writing'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '..', 'upsc', 'course', 'mains-answer-writing', 'lesson-masterclass.html'), out);
console.log('wrote lesson-masterclass.html', out.length, 'bytes');
