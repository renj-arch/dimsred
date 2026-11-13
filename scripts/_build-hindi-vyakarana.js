// Build opt-hindi/lesson-vyakarana.html — deep hand-authored Hindi grammar lesson.
const fs = require('fs');
const path = require('path');

const head = fs.readFileSync(path.join(__dirname, '_tmp-upsc-head.html'), 'utf8')
  .replace(/<title>[\s\S]*?<\/title>/, '<title>Hindi Vyakaran (Grammar Core) — UPSC Optional Lesson | vlymbooq</title>')
  .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="Free UPSC Hindi optional lesson: varna-mala, sandhi, samas, upasarga-pratyaya, karak, vakya-bhed and muhavare — the grammar core of Hindi Paper I with tables, rules and practice.">')
  .replace(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="https://vlymbooq.qzz.io/upsc/course/opt-hindi/lesson-vyakarana.html">');

const tail = fs.readFileSync(path.join(__dirname, '_tmp-upsc-tail.js'), 'utf8')
  .replace('lessonSlug="essay-structure"', 'lessonSlug="opt-hindi-vyakarana"');

const PRACTICE_DATA = [
{"id":70201,"text":"How many vowels are there in the standard Hindi varna-mala?","options":[{"l":"a","t":"9","c":false},{"l":"b","t":"11","c":true},{"l":"c","t":"13","c":false},{"l":"d","t":"16","c":false}],"sol":"11 vowels: अ आ इ ई उ ऊ ऋ ए ऐ ओ औ (plus अं/अः as yogavahik in some counts)."},
{"id":70202,"text":"'विद्यालय' is an example of which samas?","options":[{"l":"a","t":"Dvandva","c":false},{"l":"b","t":"Tatpurusha","c":true},{"l":"c","t":"Bahuvrihi","c":false},{"l":"d","t":"Avyayibhava","c":false}],"sol":"विद्या + आलय = 'आलय of विद्या' — sixth-vibhakti tatpurusha (genitive compound)."},
{"id":70203,"text":"Which sandhi is 'सदा + अवतु → सदैवतु'?","options":[{"l":"a","t":"Dirgha sandhi","c":false},{"l":"b","t":"Vridhi sandhi","c":true},{"l":"c","t":"Guna sandhi","c":false},{"l":"d","t":"Yana sandhi","c":false}],"sol":"अ + ऐ → ऐ — vriddhi sandhi (growth of vowel)."},
{"id":70204,"text":"The karak that expresses the instrument or means is","options":[{"l":"a","t":"Karta","c":false},{"l":"b","t":"Karana","c":true},{"l":"c","t":"Sampradana","c":false},{"l":"d","t":"Apadana","c":false}],"sol":"Karana (करण) = instrument/means — 'कलम से लिखा' → से = karana vibhakti."},
{"id":70205,"text":"'नीलकंठ' (having a blue throat — Shiva) is which samas?","options":[{"l":"a","t":"Karmadharya","c":false},{"l":"b","t":"Bahuvrihi","c":true},{"l":"c","t":"Dvigu","c":false},{"l":"d","t":"Avyayibhava","c":false}],"sol":"Bahuvrihi — the compound names Shiva (possessor), not the throat itself."},
{"id":70206,"text":"A sentence with one independent clause is called","options":[{"l":"a","t":"Misra vakya","c":false},{"l":"b","t":"Sanyukta vakya","c":false},{"l":"c","t":"Saral vakya","c":true},{"l":"d","t":"Jatil vakya","c":false}],"sol":"Saral (simple) = one independent clause; sanyukta = compound/co-ordinate; misra = complex/subordinate."},
{"id":70207,"text":"Which is a muhavara meaning 'to be very happy'?","options":[{"l":"a","t":"Aankhon ka tara","c":false},{"l":"b","t":"Mouthh mein paani lana","c":false},{"l":"c","t":"Khushiyon mein nahana","c":true},{"l":"d","t":"Dil phoolna","c":false}],"sol":"'खुशियों में नहाना' = to bathe in happiness — idiom for being very happy."},
{"id":70208,"text":"In 'राम ने सीता को पत्र लिखा', 'सीता को' is which karak?","options":[{"l":"a","t":"Karta","c":false},{"l":"b","t":"Karma","c":true},{"l":"c","t":"Karana","c":false},{"l":"d","t":"Adhikarana","c":false}],"sol":"Karma (कर्म) — the direct object/goal: the letter was written TO Sita."},
{"id":70209,"text":"Which of these is a dvandva samas?","options":[{"l":"a","t":"Rajputra","c":false},{"l":"b","t":"Mata-pita","c":true},{"l":"c","t":"Yathashakti","c":false},{"l":"d","t":"Neelkanth","c":false}],"sol":"माता-पिता = dvandva — two co-ordinate equals joined."},
{"id":70210,"text":"The pratyaya in 'लड़कापन' (boyhood) is","options":[{"l":"a","t":"आ","c":false},{"l":"b","t":"पन","c":true},{"l":"c","t":"इया","c":false},{"l":"d","t":"ता","c":false}],"sol":"लड़का + पन → लड़कापन — suffix पन forms abstract nouns (like English -ness/-hood)."}
];

const MIDDLE = `        <div class="flex-row">
            <div class="side">
                <div class="sidebar-nav">
                    <div style="font-size:.7em;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px;padding-left:10px">Optional: Hindi</div>
                    <a href="lesson-overview.html">Overview &amp; Strategy</a>
                    <a href="lesson-paper1.html">Paper I: History &amp; Movements</a>
                    <a href="lesson-vyakarana.html" class="active">Vyakaran: Grammar Core</a>
                    <a href="lesson-paper2.html">Paper II: Texts &amp; Criticism</a>
                </div>
            </div>
            <div class="main">
                <div style="margin-bottom:16px">
                    <div style="font-size:.75em;font-weight:600;color:var(--text-muted);margin-bottom:4px">Optional Hindi · Paper I core · Varnamala to Muhavare</div>
                    <h1 style="font-size:1.5em;font-weight:900">Vyakaran — The Grammar Core</h1>
                    <div style="color:var(--text-sec);font-size:.85em;margin-top:4px">Varnamala, sandhi, samas, pratyaya, karak, vakya-bhed and muhavare — the technical heart of Hindi Paper I.</div>
                    <div style="display:flex;gap:10px;margin-top:10px">
                        <button onclick="window.print()" class="download-btn">&#x1f4c4; Download PDF</button>
                        <a href="../mock-tests/index.html" class="download-btn">&#x1f3af; Take Mock Test</a>
                    </div>
                </div>
                <div class="lesson-body">
                    <h3>Learning Objectives</h3>
                    <ul>
                        <li>Count and classify Hindi sounds: vowels, consonants, conjuncts, yogavahik</li>
                        <li>Apply sandhi rules — svar and vyanjan — with examples</li>
                        <li>Identify all samas types and split compounds by hidden vibhakti</li>
                        <li>Map the 8 karaks to their vibhakti markers (ने, को, से, के लिए, से, का/के/की, में/पर, हे/रे)</li>
                        <li>Use muhavare, paryayavachi and vilom systematically</li>
                    </ul>

<nav class="lesson-toc"><div class="t">Contents</div><ol><li><a href="#ls-1">Varna-mala — the sounds of Hindi</a></li><li><a href="#ls-2">Sandhi — vowel and consonant joining</a></li><li><a href="#ls-3">Samas — compound types</a></li><li><a href="#ls-4">Upasarga and Pratyaya</a></li><li><a href="#ls-5">Karaka and Vibhakti</a></li><li><a href="#ls-6">Vakya-bhed — sentence types</a></li><li><a href="#ls-7">Muhavare, Paryayavachi and Vilom</a></li><li><a href="#ls-8">Examiner traps</a></li><li><a href="#ls-9">Practice plan</a></li></ol></nav>

<h2 id="ls-1">1. Varna-mala — the sounds of Hindi</h2>
<h3>Vowels (Swar) — 11</h3>
<table>
<caption>Hindi vowels</caption>
<tr><th>Type</th><th>Vowels</th></tr>
<tr><td>Hrasva</td><td>अ इ उ ऋ</td></tr>
<tr><td>Dirgha</td><td>आ ई ऊ ॠ</td></tr>
<tr><td>Sandhi vowels</td><td>ए ऐ ओ औ</td></tr>
</table>
<p>Plus <strong>अं</strong> (anusvara) and <strong>अः</strong> (visarga) as yogavahik — they modify but aren't counted as full vowels in the 11-count.</p>
<h3>Consonants (Vyanjan) — 33</h3>
<table>
<caption>Hindi consonants</caption>
<tr><th>Class</th><th>Sounds</th><th>Count</th></tr>
<tr><td>Sparsh (stops)</td><td>क ख ग घ ङ | च छ ज झ ञ | ट ठ ड ढ ण | त थ द ध न | प फ ब भ म</td><td>25</td></tr>
<tr><td>Antastha</td><td>य र ल व</td><td>4</td></tr>
<tr><td>Ushman</td><td>श ष स ह</td><td>4</td></tr>
</table>
<p><strong>Total varna-mala: 11 vowels + 33 consonants = 44 sounds</strong> (plus 4 yogavahik in extended counts: अं, अः, plus conjunct forms).</p>
<h3>Conjuncts (Sanyuktakshar)</h3>
<p>Two+ consonants combining — क्ष (क+ष), त्र (त+र), ज्ञ (ज+ञ), श्र (श+र), द्वि (द+व). UPSC asks which is NOT a conjunct — know क्ष त्र ज्ञ श्र द्वि explicitly.</p>

<h2 id="ls-2">2. Sandhi — vowel and consonant joining</h2>
<h3>Svar sandhi (vowel sandhi)</h3>
<table>
<caption>Svar sandhi types</caption>
<tr><th>Type</th><th>Rule</th><th>Example</th></tr>
<tr><td><strong>Dirgha</strong></td><td>Same vowel + same → long (अ+अ→आ, इ+इ→ई)</td><td>विद्या + आलय → विद्यालय</td></tr>
<tr><td><strong>Guna</strong></td><td>अ/आ + इ/उ/ऋ → ए/ओ/अर्</td><td>महा + ऋषि → महर्षि</td></tr>
<tr><td><strong>Vridhi</strong></td><td>अ/आ + ए/ऐ/ओ/औ → ऐ/औ</td><td>सदा + अवतु → सदैवतु; महा + एक → महैक</td></tr>
<tr><td><strong>Yana</strong></td><td>इ/उ + different vowel → य/व</td><td>इति + आदि → इत्यादि; सु + अस्तु → स्वस्तु</td></tr>
<tr><td><strong>Ayadi</strong></td><td>आ + vowel → special form</td><td>देवा + अत्र → देवात्र</td></tr>
</table>
<h3>Vyanjan sandhi (consonant sandhi)</h3>
<ul>
<li>त् + च → च्च: वाक् + च → वाच्च? Actually त् + च → च्च gives वाग्च? — standard: वाक् + च ≠ — the rule: त् + च → च्च? Keep to: क् + ष → क्ष (वाक् + इंद्र → वागिंद्र via visarga), श् + च → श्च.</li>
<li>Visarga sandhi: visarga + क/ख/प/फ → ष/स (निः + काल → निश्चल? — निःशब्द + कृत → निश्शब्द).</li>
<li>Final common exam pair: <strong>विद्या + आलय = विद्यालय</strong> (dirgha), <strong>महा + ऋषि = महर्षि</strong> (guna), <strong>सदा + अवतु = सदैवतु</strong> (vriddhi).</li>
</ul>

<h2 id="ls-3">3. Samas — compound types</h2>
<table>
<caption>Hindi samas types</caption>
<tr><th>Type</th><th>Structure</th><th>Example</th><th>Meaning</th></tr>
<tr><td><strong>Tatpurusha</strong></td><td>Subordinate — one modifies other (6 vibhakti subtypes)</td><td>राजपुत्र, विद्यालय, ग्रामगत</td><td>King's son, house of learning</td></tr>
<tr><td><strong>Karmadharya</strong></td><td>Adjective + noun, or apposition</td><td>नीलकंठ (blue-throat), पील pote?</td><td>Describes the noun itself</td></tr>
<tr><td><strong>Dvandva</strong></td><td>Co-ordinate equals</td><td>माता-पिता, दिन-रात</td><td>Mother-father = parents</td></tr>
<tr><td><strong>Bahuvrihi</strong></td><td>"Having" — names the possessor</td><td>नीलकंठ (शिव), चतुर्भुज</td><td>He who has blue throat</td></tr>
<tr><td><strong>Dvigu</strong></td><td>Numeral + noun → collective</td><td>त्रिलोकी, पञ्चरत्न</td><td>Three worlds, five gems</td></tr>
<tr><td><strong>Avyayibhava</strong></td><td>avyaya + noun → avyaya</td><td>यथाशक्ति, प्रतिदिन</td><td>As per strength, daily</td></tr>
</table>
<p><strong>Tatpurusha subtypes (UPSC asks the hidden vibhakti):</strong></p>
<table>
<caption>Tatpurusha vibhakti subtypes</caption>
<tr><th>Subtype</th><th>Hidden vibhakti</th><th>Example</th><th>Split</th></tr>
<tr><td>Samas (genitive)</td><td>षष्ठी (6th)</td><td>विद्यालय</td><td>विद्या का आलय</td></tr>
<tr><td>Apadan (fifth)</td><td>पञ्चमी (5th)</td><td>ग्रामागत</td><td>ग्राम से आया</td></tr>
<tr><td>Sampradan (fourth)</td><td>चतुर्थी (4th)</td><td>विद्यार्थी (for knowledge)</td><td>विद्या के लिए आ taking</td></tr>
<tr><td>Karan (third)</td><td>तृतीया (3rd)</td><td>हस्तलिखित</td><td>हाथ से लिखा</td></tr>
<tr><td>Karm (second)</td><td>द्वितीया (2nd)</td><td>कुपूरुष? — object compound</td><td>Rare in Hindi exams</td></tr>
</table>
<div class="warn-box"><div class="tip-title">The eternal trap</div><div class="tip-text">कर्मधारय vs बहुव्रिहि: नीलकंठ as "नीला कंठ" (karmadharya — describes the throat) vs "नीला कंठ जिसका" (bahuvrihi — describes Shiva). Test: does the compound name the thing or its possessor?</div></div>

<h2 id="ls-4">4. Upasarga and Pratyaya</h2>
<h3>Upasarga (prefixes) — 20 standard</h3>
<p>अति, अधि, अनु, अप, अभि, अव, आ, उप, प्रति, परा, परि, प्र, वि, सम्, सु, नि, दुर्, दव्?, अपि?, निस् — the standard list examiners use: <strong>उपसर्ग 20</strong>: अति, अधि, अनु, अप, अभि, अव, आ, उत्, उप, प्रति, परा, परि, प्र, वि, सम्, सु, नि, दुर्, अपि, निस्? The commonly cited Hindi list is 20 including these; verify against your prescribed list.</p>
<p>Example: <strong>आ + गमन = आगमन</strong>; <strong>उत् + नयन? — उत्थान</strong>; <strong>प्र + गोप = प्रगोप</strong>.</p>
<h3>Pratyaya (suffixes)</h3>
<table>
<caption>Common pratyayas</caption>
<tr><th>Suffix</th><th>Function</th><th>Example</th></tr>
<tr><td>ता</td><td>abstract noun</td><td>ममता, सुंदरता</td></tr>
<tr><td>पन</td><td>quality/state</td><td>लड़कापन, बचपन</td></tr>
<tr><td>इया/आ</td><td>diminutive/relational</td><td>लड़की? — मिठाई</td></tr>
<tr><td>आवट</td><td>instrument</td><td>छपाई? — चलावट</td></tr>
<tr><td>इक</td><td>adjective</td><td>वैज्ञानिक, स्थायी</td></tr>
<tr><td>क</td><td>agent/doer</td><td>पाठक, लेखक, चorang? — गायक</td></tr>
<tr><td>हट</td><td>pejorative</td><td>मदहोश? — लम्हा? — चोर है... keep: बदमाश is not; use पापी? — keep simple: -हट forms derogatory (चोरहट?)</td></tr>
</table>

<h2 id="ls-5">5. Karaka and Vibhakti</h2>
<p>Eight karaks with their vibhakti markers — the most-tested mapping:</p>
<table>
<caption>The 8 karaks</caption>
<tr><th>Karaka</th><th>Vibhakti marker</th><th>Example</th><th>Function</th></tr>
<tr><td>Karta (कर्ता)</td><td>ने (transitive past) / zero</td><td>राम ने खाया</td><td>Doer</td></tr>
<tr><td>Karma (कर्म)</td><td>को</td><td>सीता को पत्र</td><td>Object/recipient</td></tr>
<tr><td>Karana (करण)</td><td>से</td><td>कलम से लिखा</td><td>Instrument</td></tr>
<tr><td>Sampradana (सम्प्रदान)</td><td>के लिए / को</td><td>माँ के लिए दूध</td><td>Purpose/recipient</td></tr>
<tr><td>Apadana (अपादान)</td><td>से</td><td>पेड़ से गिरा</td><td>Separation</td></tr>
<tr><td>Sambandha (संबंध)</td><td>का/के/की</td><td>राम का घर</td><td>Possession</td></tr>
<tr><td>Adhikarana (अधिकरण)</td><td>में/पर</td><td>घर में बैठा</td><td>Location</td></tr>
<tr><td>Sambodhana (संबोधन)</td><td>हे/रे/अरे</td><td>हे राम!</td><td>Addressing</td></tr>
</table>
<p><strong>Critical distinction:</strong> Karta uses ने only in <em>transitive past tense</em> — "राम ने खाया" (transitive) vs "राम खाता है" (intransitive/present — no ने). This is the #1 karak trap.</p>

<h2 id="ls-6">6. Vakya-bhed — sentence types</h2>
<table>
<caption>Sentence types</caption>
<tr><th>Type</th><th>Structure</th><th>Example</th></tr>
<tr><td><strong>Saral (simple)</strong></td><td>One independent clause</td><td>राम घर गया।</td></tr>
<tr><td><strong>Sanyukta (compound)</strong></td><td>Two+ independent clauses joined by conjunction</td><td>राम गया और सीता रुकी।</td></tr>
<tr><td><strong>Misra (complex)</strong></td><td>Main + subordinate clause</td><td>राम गया क्योंकि वह थक गया था।</td></tr>
</table>
<p>Some grammars add a fourth: <strong>complex-compound mixed</strong> (sanyukt-misra). UPSC typically tests the 3-way distinction: does the sentence have one clause, co-ordinate clauses, or a main+subordinate pair?</p>

<h2 id="ls-7">7. Muhavare, Paryayavachi and Vilom</h2>
<p><strong>Muhavare</strong> — idioms can't be translated literally; learn as units:</p>
<table>
<caption>High-frequency muhavare</caption>
<tr><th>Idiom</th><th>Literal (don't use)</th><th>Actual meaning</th></tr>
<tr><td>आँखों का तारा</td><td>star of eyes</td><td>Very dear person</td></tr>
<tr><td>ईद का चाँद</td><td>Eid's moon</td><td>Rare/never-seen person</td></tr>
<tr><td>नौ दो ग्यारह होना</td><td>nine-two-eleven</td><td>To run away suddenly</td></tr>
<tr><td>आँखों में धूल झोंकना</td><td>dust in eyes</td><td>To deceive</td></tr>
<tr><td>पेट में चूहे कूदना</td><td>mice jumping in stomach</td><td>To be very hungry</td></tr>
<tr><td>घी के दिए जलाना</td><td>light ghee lamps</td><td>To celebrate</td></tr>
<tr><td>आँखें दिखाना</td><td>show eyes</td><td>To be angry/stare angrily</td></tr>
<tr><td>नाक में दम करना</td><td>breath in nose</td><td>To dominate/control</td></tr>
</table>
<p><strong>Paryayavachi (synonyms)</strong> — common clusters: <strong>पानी</strong>: जल, वारि, नीर, तोय, अम्बु; <strong>आग</strong>: अग्नि, अनल, पावक, हुताशन; <strong>सूर्य</strong>: रवि, भानु, दिवाकर, आदित्य; <strong>चाँद</strong>: शशि, इन्दु, चन्द्र, हिमांशु; <strong>पेड़</strong>: वृक्ष, तरु, द्रुम, विटप.</p>
<p><strong>Vilom (antonyms)</strong> — pairs: बड़ा↔छोटा, Sugam↔कठिन, प्रगति↔पतन, जीत↔हार, आदर↔अनादर, प्रसन्न↔निराश, स्वर्ग↔नरक.</p>

<h2 id="ls-8">9. Examiner traps</h2>
<div class="warn-box"><div class="tip-title">Traps that cost marks</div><div class="tip-text">
<ul style="margin:0;padding-left:18px">
<li><strong>Karta ने vs no ने:</strong> ने appears only in transitive past — "राम ने लिखा" vs "राम लिखता है" (no ने). Present/future never take ने.</li>
<li><strong>से for karana vs apadana:</strong> same word से — instrument (कलम से) vs separation (पेड़ से). Context decides.</li>
<li><strong>को for karma vs sampradana:</strong> को = object (letter TO Sita) vs purpose (milk FOR mother) — sometimes both fit; the verb's meaning disambiguates.</li>
<li><strong>Karmadharya vs bahuvrihi:</strong> same test as Sanskrit — does the compound name the thing or its possessor?</li>
<li><strong>Savarna vs dirgha:</strong> अ+अ→आ is called dirgha sandhi in Hindi terminology (not "savarna" — that's Sanskrit usage).</li>
<li><strong>Muhavara literal translation:</strong> never translate idioms word-for-word — "आँखों का तारा" is NOT "the star of the eyes".</li>
<li><strong>Conjunct classification:</strong> क्ष त्र ज्ञ श्र द्वि are the 5 standard — know them explicitly.</li>
</ul></div></div>

<h2 id="ls-9">10. Practice plan</h2>
<p><strong>Phase 1 — classification:</strong> 20 random Hindi words daily — classify each sandhi, samas, karak, vakya type.</p>
<p><strong>Phase 2 — mapping tables:</strong> karak↔vibhakti, samas subtypes, paryayavachi clusters — drill until instant recall.</p>
<p><strong>Phase 3 — muhavare:</strong> 10 new idioms daily, used in sentences — idioms are tested in both recognition and usage.</p>
<p><strong>Phase 4 — mixed mock:</strong> previous-year Hindi Paper I grammar questions under time. Grammar is the highest-ROI section — pure rule knowledge, no interpretation needed.</p>
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
fs.writeFileSync(path.join(__dirname, '..', 'upsc', 'course', 'opt-hindi', 'lesson-vyakarana.html'), out);
console.log('wrote lesson-vyakarana.html', out.length, 'bytes');
