// Build opt-sanskrit/lesson-vyakarana.html — deep hand-authored Sanskrit grammar lesson.
const fs = require('fs');
const path = require('path');

const head = fs.readFileSync(path.join(__dirname, '_tmp-upsc-head.html'), 'utf8')
  .replace(/<title>[\s\S]*?<\/title>/, '<title>Sanskrit Vyakarana (Grammar Core) — UPSC Optional Lesson | vlymbooq</title>')
  .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="Free UPSC Sanskrit optional lesson: varna-parichaya, sandhi, samasa, vibhakti-karaka, linga-vachana and number words — the grammar core of Sanskrit Paper I with tables, rules and practice.">')
  .replace(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="https://vlymbooq.qzz.io/upsc/course/opt-sanskrit/lesson-vyakarana.html">');

const tail = fs.readFileSync(path.join(__dirname, '_tmp-upsc-tail.js'), 'utf8')
  .replace('lessonSlug="essay-structure"', 'lessonSlug="opt-sanskrit-vyakarana"');

const PRACTICE_DATA = [
{"id":70101,"text":"How many vowels (svaras) does Sanskrit have in the standard varna classification?","options":[{"l":"a","t":"8","c":false},{"l":"b","t":"11","c":false},{"l":"c","t":"13","c":true},{"l":"d","t":"16","c":false}],"sol":"13 vowels: अ आ इ ई उ ऊ ऋ ॠ ऌ ॡ ए ओ ऐ औ (some counts include pluta forms)."},
{"id":70102,"text":"The guṇa sandhi of अ + इ produces","options":[{"l":"a","t":"ऐ","c":false},{"l":"b","t":"ए","c":true},{"l":"c","t":"ओ","c":false},{"l":"d","t":"आ","c":false}],"sol":"Guṇa: अ/आ + इ/ई/उ/ऊ/ऋ → ए/ओ/अर् respectively. अ+इ → ए."},
{"id":70103,"text":"Which samāsa type joins two words as equals (e.g., रामः + सीता = रामसीती)?","options":[{"l":"a","t":"Tatpuruṣa","c":false},{"l":"b","t":"Dvandva","c":true},{"l":"c","t":"Bahuvrīhi","c":false},{"l":"d","t":"Avyayībhāva","c":false}],"sol":"Dvandva joins co-ordinate/equals; tatpuruṣa is subordinate (one word modifies another)."},
{"id":70104,"text":"The vibhakti that expresses the doer (kartā) is","options":[{"l":"a","t":"Second case (dvitīyā)","c":false},{"l":"b","t":"First case (prathamā)","c":true},{"l":"c","t":"Third case (tṛtīyā)","c":false},{"l":"d","t":"Sixth case (ṣaṣṭhī)","c":false}],"sol":"Karta (agent/doer) takes prathama vibhakti (nominative)."},
{"id":70105,"text":"In 'rāmeṇa likhitam' (written by Rāma), rāma is in which vibhakti?","options":[{"l":"a","t":"Prathamā","c":false},{"l":"b","t":"Dvitīyā","c":false},{"l":"c","t":"Tṛtīyā","c":true},{"l":"d","t":"Pañcamī","c":false}],"sol":"Instrumental case (tṛtīyā) marks the instrument/agent in passive-like constructions — 'by Rāma'."},
{"id":70106,"text":"The number 'seven' in Sanskrit is","options":[{"l":"a","t":"ṣaṭ","c":false},{"l":"b","t":"sapta","c":true},{"l":"c","t":"aṣṭa","c":false},{"l":"d","t":"nava","c":false}],"sol":"sapta (7); ṣaṭ=6, aṣṭa=8, nava=9."},
{"id":70107,"text":"Which is NOT one of the three lingas?","options":[{"l":"a","t":"Pumliṅga","c":false},{"l":"b","t":"Strīliṅga","c":false},{"l":"c","t":"Napumsakaliṅga","c":false},{"l":"d","t":"Bahuvrīhi","c":true}],"sol":"Linga = gender: pum (masculine), strī (feminine), napumsaka (neuter). Bahuvrīhi is a samāsa type, not a linga."},
{"id":70108,"text":"The vṛddhi sandhi of अ + ए produces","options":[{"l":"a","t":"ए","c":false},{"l":"b","t":"ऐ","c":true},{"l":"c","t":"ओ","c":false},{"l":"d","t":"औ","c":false}],"sol":"Vṛddhi: अ/आ + ए/ऐ/ओ/औ → ऐ/ऐ/औ/औ. अ+ए → ऐ."},
{"id":70109,"text":"Karaṇa (instrument) karaka corresponds to which vibhakti?","options":[{"l":"a","t":"Dvitīyā","c":false},{"l":"b","t":"Tṛtīyā","c":true},{"l":"c","t":"Caturthī","c":false},{"l":"d","t":"Saptamī","c":false}],"sol":"Karaṇa (means/instrument) → tṛtīyā (third case)."},
{"id":70110,"text":"How many vibhaktis (cases) does Sanskrit have including sambodhana?","options":[{"l":"a","t":"6","c":false},{"l":"b","t":"7","c":false},{"l":"c","t":"8","c":true},{"l":"d","t":"10","c":false}],"sol":"8 vibhaktis: prathamā to saptamī + sambodhana (vocative)."}
];

const MIDDLE = `        <div class="flex-row">
            <div class="side">
                <div class="sidebar-nav">
                    <div style="font-size:.7em;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px;padding-left:10px">Optional: Sanskrit</div>
                    <a href="lesson-overview.html">Overview &amp; Strategy</a>
                    <a href="lesson-paper1.html">Paper I: History &amp; Movements</a>
                    <a href="lesson-vyakarana.html" class="active">Vyakarana: Grammar Core</a>
                    <a href="lesson-paper2.html">Paper II: Texts &amp; Criticism</a>
                </div>
            </div>
            <div class="main">
                <div style="margin-bottom:16px">
                    <div style="font-size:.75em;font-weight:600;color:var(--text-muted);margin-bottom:4px">Optional Sanskrit · Paper I core · Varna to Vibhakti</div>
                    <h1 style="font-size:1.5em;font-weight:900">Vyakarana — The Grammar Core</h1>
                    <div style="color:var(--text-sec);font-size:.85em;margin-top:4px">Sounds, sandhi, compounds, cases and karakas — the technical heart of Sanskrit Paper I, where marks are won by precision.</div>
                    <div style="display:flex;gap:10px;margin-top:10px">
                        <button onclick="window.print()" class="download-btn">&#x1f4c4; Download PDF</button>
                        <a href="../mock-tests/index.html" class="download-btn">&#x1f3af; Take Mock Test</a>
                    </div>
                </div>
                <div class="lesson-body">
                    <h3>Learning Objectives</h3>
                    <ul>
                        <li>Classify Sanskrit sounds: vowels, consonants, semi-vowels, sibilants and yogavahikas</li>
                        <li>Apply the five sandhi rules (savarna, guna, vriddhi, yan, ayadi) with examples</li>
                        <li>Identify all samasa types and split compounds correctly</li>
                        <li>Map the 8 vibhaktis to the 6 karakas — the single most-tested grammar link</li>
                        <li>Use number words, linga-vachana and basic dhatu-pratyaya tables</li>
                    </ul>

<nav class="lesson-toc"><div class="t">Contents</div><ol><li><a href="#ls-1">Varna-parichaya — the sounds of Sanskrit</a></li><li><a href="#ls-2">Sandhi — the five rules</a></li><li><a href="#ls-3">Samasa — compound types</a></li><li><a href="#ls-4">Vibhakti and Karaka</a></li><li><a href="#ls-5">Linga, Vachana and Samkhya</a></li><li><a href="#ls-6">Dhatu and Pratyaya basics</a></li><li><a href="#ls-7">Examiner traps</a></li><li><a href="#ls-8">Practice plan</a></li></ol></nav>

<h2 id="ls-1">1. Varna-parichaya — the sounds of Sanskrit</h2>
<p>Sanskrit phonology is the foundation — every sandhi and grammar rule assumes it. The UPSC syllabus asks direct questions on sound classification.</p>
<h3>Vowels (Svaras) — 13</h3>
<table>
<caption>The 13 Sanskrit vowels</caption>
<tr><th>Type</th><th>Vowels</th><th>Count</th></tr>
<tr><td>Hrasva (short)</td><td>अ इ उ ऋ ऌ</td><td>5</td></tr>
<tr><td>Dirgha (long)</td><td>आ ई ऊ ॠ ॡ</td><td>5</td></tr>
<tr><td>Sandhi vowels (guṇa-vṛddhi)</td><td>ए ओ ऐ औ</td><td>4 (one extra diphthong counted variously)</td></tr>
</table>
<p>Common exam framing: 9 basic vowels (अ through ऊ) + ऋ/ॠ group + 4 guṇa/vṛddhi = 13.</p>
<h3>Consonants (Vyanjaras) — 33</h3>
<table>
<caption>Consonant classification</caption>
<tr><th>Class</th><th>Sounds</th><th>Count</th><th>Example group</th></tr>
<tr><td>Sparśa (stops)</td><td>क ख ग घ ङ, च छ ज झ ञ, ट ठ ड ढ ण, त थ द ध न, प फ ब भ म</td><td>25</td><td>5 vargas × 5</td></tr>
<tr><td>Antastha (semivowels)</td><td>य र ल व</td><td>4</td><td>Approximants</td></tr>
<tr><td>Ūṣman (sibilants/h)</td><td>श ष स ह</td><td>4</td><td>Sibilants + glottal h</td></tr>
</table>
<h3>Yogavahikas — 4</h3>
<p>अं (anusvāra), ः (visarga), plus two others in extended counts. These are "yoga-joining" sounds that modify preceding vowels in sandhi.</p>
<div class="example-box"><div class="ex-title">Worked example</div><div class="ex-text">Classify: य, श, म, ए</div><div class="ex-soln"><strong>Solution:</strong> य = antastha (semivowel); श = ūṣman (dental sibilant); म = sparśa (labial, fifth varga); ए = guṇa vowel.</div></div>

<h2 id="ls-2">2. Sandhi — the five rules</h2>
<p>Sandhi = phonetic combination at word boundaries. UPSC asks both directions: apply the rule AND split a sandhi word.</p>
<table>
<caption>Sandhi types with examples</caption>
<tr><th>Type</th><th>Rule</th><th>Example</th></tr>
<tr><td><strong>Savarna</strong></td><td>Same vowel + same vowel → long vowel (अ+अ→आ, इ+इ→ई)</td><td>राम + अत्र → रामात्र</td></tr>
<tr><td><strong>Guṇa</strong></td><td>अ/आ + इ/ई/उ/ऊ/ऋ → ए/ओ/अर्</td><td>हर + इंद्र → हरेन्द्र; महा + ऋषि → महर्षि</td></tr>
<tr><td><strong>Vṛddhi</strong></td><td>अ/आ + ए/ऐ/ओ/औ → ऐ/औ/अर्</td><td>महा + एक → महैक; देव + औषधि → दैवौषधि</td></tr>
<tr><td><strong>Yan</strong></td><td>इ/ई/उ/ऊ + different vowel → य/व/र before vowel</td><td>इति + आदि → इत्यादि; सु + अस्तु → स्वस्तु</td></tr>
<tr><td><strong>Āyādi</strong></td><td>आ + vowel → special diphthong/doubling</td><td>देवा + अत्र → देवात्र (ā + a → ā)</td></tr>
</table>
<p><strong>Vyanjana sandhi:</strong> final consonant + initial consonant — e.g., त् + ज → ज्ज (वाक् + जी_arguments → वाग्जी); ष् + त → स्त. Also purva-rūpa (preceding form retained) and para- yoga (following form retained).</p>
<div class="example-box"><div class="ex-title">Worked example</div><div class="ex-text">Split: महोत्सव</div><div class="ex-soln"><strong>Solution:</strong> महा + उत्सव — ā + u → au (vṛddhi/āyādi). The word means "great festival".</div></div>

<h2 id="ls-3">3. Samasa — compound types</h2>
<p>Samāsa joins two+ words into one. UPSC asks to identify type and split.</p>
<table>
<caption>Samasa types</caption>
<tr><th>Type</th><th>Structure</th><th>Example</th><th>Meaning</th></tr>
<tr><td><strong>Avyayībhāva</strong></td><td>avyaya + noun → avyaya</td><td>यथाशक्ति (as per strength)</td><td>According to capacity</td></tr>
<tr><td><strong>Tatpuruṣa</strong></td><td>subordinate — one word modifies other (6 vibhakti subtypes)</td><td>राजपुत्र (son of king), दिनचर (day-walker)</td><td>King's son, one who walks by day</td></tr>
<tr><td><strong>Karmadhāraya</strong></td><td>adjective + noun, or apposition</td><td>नीलकंठ (blue-throat), नीलोत्पल</td><td>Neelkanth, blue lotus</td></tr>
<tr><td><strong>Dvandva</strong></td><td>co-ordinate equals</td><td>रामसीता, माता-पिता</td><td>Rāma and Sītā</td></tr>
<tr><td><strong>Bahuvrīhi</strong></td><td>"possessing" — neither word is the head</td><td>नीलकंठ (having blue throat = Śiva), चतुर्भुज</td><td>He who has blue throat</td></tr>
<tr><td><strong>Dvigu</strong></td><td>numeral + noun → collective</td><td>त्रिलोकी (three worlds), पञ्चरत्न</td><td>The three worlds</td></tr>
<tr><td><strong>Aluk</strong></td><td>vibhakti retained in compound</td><td>आत्मनेपद (ātman + ending retained)</td><td>Special case</td></tr>
</table>
<p><strong>Tatpuruṣa subtypes (by vibhakti):</strong> ṣaṣṭhī-tatpuruṣa (genitive — राजपुत्र), pañcamī (fifth — ग्रामात् आगतः → ग्रामागत), caturthī (fourth — purpose — student for knowledge), tṛtīyā (third — instrument —(done)by hand), dvandva-type. UPSC asks "which vibhakti is hidden in this compound" — identify the case relation.</p>
<div class="warn-box"><div class="tip-title">Karmadhāraya vs Bahuvrīhi trap</div><div class="tip-text">नीलकंठ: is it "blue throat" (karmadhāraya, describing the throat) or "he who has a blue throat" (bahuvrīhi, describing Śiva)? Test: does the compound name the thing itself or something else that possesses it? Nīlakaṇṭha = Śiva → bahuvrīhi. Nīlotpala = a blue lotus → karmadhāraya.</div></div>

<h2 id="ls-4">4. Vibhakti and Karaka</h2>
<p>The most-tested link in Sanskrit grammar: 8 cases ↔ 6 karakas.</p>
<table>
<caption>The 8 vibhaktis and 6 karakas</caption>
<tr><th>#</th><th>Vibhakti</th><th>Sanskrit name</th><th>Karaka</th><th>Function</th></tr>
<tr><td>1</td><td>Prathamā</td><td> nominative</td><td>Kartā</td><td>Doer/agent</td></tr>
<tr><td>2</td><td>Dvitīyā</td><td>accusative</td><td>Karma</td><td>Object/goal</td></tr>
<tr><td>3</td><td>Tṛtīyā</td><td>instrumental</td><td>Karaṇa</td><td>Instrument/means</td></tr>
<tr><td>4</td><td>Caturthī</td><td>dative</td><td>Sampradāna</td><td>Recipient/purpose</td></tr>
<tr><td>5</td><td>Pañcamī</td><td>ablative</td><td>Apādāna</td><td>Separation/source</td></tr>
<tr><td>6</td><td>Ṣaṣṭhī</td><td>genitive</td><td>— (no karaka)</td><td>Possession/relation</td></tr>
<tr><td>7</td><td>Saptamī</td><td>locative</td><td>Adhikaraṇa</td><td>Location/base</td></tr>
<tr><td>8</td><td>Sambodhana</td><td>vocative</td><td>— (address)</td><td>Calling/addressing</td></tr>
</table>
<p><strong>Key points:</strong></p>
<ul>
<li>Sixth case (ṣaṣṭhī) has NO karaka — it shows possession, not a semantic role.</li>
<li>Eighth (sambodhana) is vocative — used only for addressing.</li>
<li>Kartā → prathamā is the most-asked single mapping.</li>
<li>In "gacchati pathā" (goes by path), patha is tṛtīyā = karaṇa.</li>
</ul>

<h2 id="ls-5">5. Linga, Vachana and Samkhya</h2>
<h3>Linga (gender) — 3</h3>
<ul>
<li><strong>Pumliṅga:</strong> masculine — राम, सूर्य, बालक</li>
<li><strong>Strīliṅga:</strong> feminine — सीता, गंगा, बालिका</li>
<li><strong>Napumsakaliṅga:</strong> neuter — फलम्, जलम्, ् (jyotiḥ)</li>
</ul>
<p>Neuter nouns have identical nominative/accusative singular (e.g., फलम् both subject and object form).</p>
<h3>Vachana (number) — 3</h3>
<ul>
<li><strong>Ekavachana:</strong> singular — बालकः</li>
<li><strong>Dvivachana:</strong> dual — बालकौ</li>
<li><strong>Bahuvachana:</strong> plural — बालकाः</li>
</ul>
<h3>Samkhya (number words)</h3>
<table>
<caption>Sanskrit numerals 1–10</caption>
<tr><th>#</th><td>1 एक</td><td>2 द्वि</td><td>3 त्रि</td><td>4 चतुर्</td><td>5 पञ्च</td></tr>
<tr><th>#</th><td>6 षट्</td><td>7 सप्त</td><td>8 अष्ट</td><td>9 नव</td><td>10 दश</td></tr>
</table>

<h2 id="ls-6">6. Dhatu and Pratyaya basics</h2>
<p><strong>Dhatu</strong> = verbal root; <strong>Pratyaya</strong> = suffix forming tense/person/derivation.</p>
<h3>Key roots (10 gaṇa groups exist; learn the common ones)</h3>
<table>
<caption>Common dhatus</caption>
<tr><th>Root</th><th>Meaning</th><th>Gaṇa</th></tr>
<tr><td>भू</td><td>to be/exist</td><td>1st (अदि)</td></tr>
<tr><td>गम् (गच्छ्)</td><td>to go</td><td>1st</td></tr>
<tr><td>पच्</td><td>to cook</td><td>1st</td></tr>
<tr><td>कृ (कुर्/करोति)</td><td>to do/make</td><td>8th (tanadi)</td></tr>
<tr><td>दा (ददाति)</td><td>to give</td><td>3rd</td></tr>
<tr><td>अस् (अस्ति)</td><td>to be (exist)</td><td>irregular</td></tr>
<tr><td>जि (जयति)</td><td>to win/conquer</td><td>1st</td></tr>
<tr><td>वच् (वदति)</td><td>to speak</td><td>1st</td></tr>
<tr><td>पठ् (पठति)</td><td>to read/study</td><td>1st</td></tr>
<tr><td>रुध् (रोधति)</td><td>to obstruct</td><td>7th</td></tr>
</table>
<h3>Lakāra pratyayas (tense markers)</h3>
<table>
<caption>Ten lakāras</caption>
<tr><th>Lakāra</th><th>Tense</th><th>Example (भू)</th></tr>
<tr><td>लट्</td><td>Present</td><td>भवति</td></tr>
<tr><td>लिट्</td><td>Perfect</td><td>बभूव</td></tr>
<tr><td>लुट्</td><td>Future (periphrastic)</td><td>भविष्यति</td></tr>
<tr><td>लृट्</td><td>Future</td><td>भविष्यति</td></tr>
<tr><td>लोह्/लाम्</td><td>Conditional</td><td>भवेय/from</td></tr>
<tr><td>लाङ्</td><td>Past potential</td><td>अभवत्</td></tr>
<tr><td>लिङ्</td><td>Optative</td><td>भवेत्</td></tr>
<tr><td>लुङ्</td><td>Past (aorist-like)</td><td>अभूत्</td></tr>
<tr><td>लृङ्</td><td>Imperfect</td><td>अभवत्</td></tr>
<tr><td>लाट्</td><td>Vedic present</td><td>(rare)</td></tr>
</table>
<p><strong>Pratyaya types:</strong> tinka (tiṅanta — verb endings), taddhita (secondary derivation — e.g., -maya, -vat), krit (primary verbal noun — e.g., -aka, -ana, -ana).</p>

<h2 id="ls-7">8. Examiner traps</h2>
<div class="warn-box"><div class="tip-title">Traps that cost marks</div><div class="tip-text">
<ul style="margin:0;padding-left:18px">
<li><strong>Guṇa vs vṛddhi:</strong> guṇa raises to ए/ओ; vṛddhi raises further to ऐ/औ. अ+इ=ए (guṇa) but अ+ए=ऐ (vṛddhi) — test the second vowel's height.</li>
<li><strong>Karmadhāraya vs bahuvrīhi:</strong> same phonetic form, different meaning — check whether the compound denotes the thing or its possessor.</li>
<li><strong>Sixth case has no karaka:</strong> ṣaṣṭhī is genitive/possession only — don't force a karaka onto it.</li>
<li><strong>Sambodhana:</strong> vocative is the 8th vibhakti but has no karaka — it's for addressing only.</li>
<li><strong>Neuter singular:</strong> nominative = accusative for neuter nouns — "phalám" is both "fruit (subject)" and "fruit (object)".</li>
<li><strong>Dhatu classes:</strong> "gam" is 1st gaṇa but becomes "gacchati" (ch insertion) — memorize the present stem, not just the root.</li>
<li><strong>Samkhya vs vibhakti endings:</strong> tri (3) takes different endings by gender — त्रयः (m.pl), त्रीणि (n.pl), तिस्रः (f.pl) — gender agreement traps.</li>
</ul></div></div>

<h2 id="ls-8">9. Practice plan</h2>
<p><strong>Phase 1 — classification drill:</strong> 20 random Sanskrit words daily — classify each sound (vowel/consonant type), each compound (samasa type), each ending (vibhakti).</p>
<p><strong>Phase 2 — sandhi practice:</strong> 10 sandhi splits + 10 sandhi joins daily. Write both directions — examiners test both.</p>
<p><strong>Phase 3 — karaka-vibhakti mapping:</strong> the 8×6 table must be instant recall. Drill until you can fill the table from memory in under 60 seconds.</p>
<p><strong>Phase 4 — mixed mock:</strong> previous-year Sanskrit Paper I grammar questions under time pressure. Most candidates lose 15–20 marks here from weak grammar — this section is where an optional topper is made.</p>
<div class="tip-box"><div class="tip-title">Pro Tip</div><div class="tip-text">Sanskrit grammar is the highest-ROI section of the optional: it's pure rule-based knowledge, not interpretation. A student who masters varna→vibhakti can score 60–70% of Paper I's grammar marks reliably — the literature papers are where interpretation and textual knowledge matter more.</div></div>
                </div>
                <h3 style="margin-top:24px;margin-bottom:12px;font-size:1.1em">Practice Questions</h3>
                <div id="practice-qs"></div>
                <div style="display:flex;gap:10px;margin-top:10px">
                    <button onclick="resetPractice()" class="btn btn-primary">Reset</button>
                    <button onclick="markComplete()" class="btn btn-success" id="complete-btn">Mark Lesson Complete</button>
                </div>
                <div style="display:flex;justify-content:space-between;margin-top:30px;padding-top:16px;border-top:1px solid var(--border)">
                    <a href="lesson-paper1.html" class="btn btn-primary">&#x2190; Paper I: History</a>
                    <a href="lesson-paper2.html" class="btn btn-success">Paper II: Texts &#x2192;</a>
                </div>
            </div>
        </div>
        <script>
        var practiceQs = ${JSON.stringify(PRACTICE_DATA)};
`;

const out = head + MIDDLE + tail;
fs.writeFileSync(path.join(__dirname, '..', 'upsc', 'course', 'opt-sanskrit', 'lesson-vyakarana.html'), out);
console.log('wrote lesson-vyakarana.html', out.length, 'bytes');
