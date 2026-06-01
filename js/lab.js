var PAPERS = {
    cgl: [
        { id:'12-sep-2025-s3', title:'CGL 12 Sep 2025 S3', path:'cgl/papers/12-sep-2025-s3.html' },
        { id:'13-sep-2025-s1', title:'CGL 13 Sep 2025 S1', path:'cgl/papers/13-sep-2025-s1.html' },
        { id:'13-sep-2025-s2', title:'CGL 13 Sep 2025 S2', path:'cgl/papers/13-sep-2025-s2.html' }
    ],
    rbi: [
        { id:'2025-phase1', title:'RBI 2025 Phase 1', path:'rbi/papers/2025-phase1.html' },
        { id:'2024-phase1', title:'RBI 2024 Phase 1', path:'rbi/papers/2024-phase1.html' },
        { id:'2023-phase1', title:'RBI 2023 Phase 1', path:'rbi/papers/2023-phase1.html' },
        { id:'2022-phase1', title:'RBI 2022 Phase 1', path:'rbi/papers/2022-phase1.html' },
        { id:'2021-phase1', title:'RBI 2021 Phase 1', path:'rbi/papers/2021-phase1.html' }
    ],
    jee: [
        { id:'2025-jan-s1', title:'JEE 2025 Jan S1', path:'jee/papers/2025-jan-s1.html' },
        { id:'2025-apr-s1', title:'JEE 2025 Apr S1', path:'jee/papers/2025-apr-s1.html' },
        { id:'2025-apr-s2', title:'JEE 2025 Apr S2', path:'jee/papers/2025-apr-s2.html' }
    ],
    neet: [
        { id:'2025-paper1', title:'NEET 2025', path:'neet/papers/2025-paper1.html' },
        { id:'2024-paper1', title:'NEET 2024', path:'neet/papers/2024-paper1.html' },
        { id:'2023-paper1', title:'NEET 2023', path:'neet/papers/2023-paper1.html' }
    ],
    gate: [
        { id:'2025-cs', title:'GATE 2025 CS', path:'gate/papers/2025-cs.html' },
        { id:'2025-ec', title:'GATE 2025 EC', path:'gate/papers/2025-ec.html' },
        { id:'2025-me', title:'GATE 2025 ME', path:'gate/papers/2025-me.html' },
        { id:'2025-ce', title:'GATE 2025 CE', path:'gate/papers/2025-ce.html' }
    ],
    upsc: [
        { id:'practice-01', title:'UPSC Practice 01', path:'upsc/papers/practice-set-01.html' },
        { id:'practice-02', title:'UPSC Practice 02', path:'upsc/papers/practice-set-02.html' },
        { id:'practice-03', title:'UPSC Practice 03', path:'upsc/papers/practice-set-03.html' },
        { id:'practice-04', title:'UPSC Practice 04', path:'upsc/papers/practice-set-04.html' }
    ],
    'ibps-po': [
        { id:'practice-01', title:'IBPS PO Practice 01', path:'ibps-po/papers/practice-set-01.html' },
        { id:'practice-02', title:'IBPS PO Practice 02', path:'ibps-po/papers/practice-set-02.html' },
        { id:'practice-03', title:'IBPS PO Practice 03', path:'ibps-po/papers/practice-set-03.html' },
        { id:'practice-04', title:'IBPS PO Practice 04', path:'ibps-po/papers/practice-set-04.html' }
    ],
    'sbi-clerk': [
        { id:'practice-01', title:'SBI Clerk Practice 01', path:'sbi-clerk/papers/practice-set-01.html' },
        { id:'practice-02', title:'SBI Clerk Practice 02', path:'sbi-clerk/papers/practice-set-02.html' },
        { id:'practice-03', title:'SBI Clerk Practice 03', path:'sbi-clerk/papers/practice-set-03.html' },
        { id:'practice-04', title:'SBI Clerk Practice 04', path:'sbi-clerk/papers/practice-set-04.html' }
    ],
    'ssc-gd': [
        { id:'practice-01', title:'SSC GD Practice 01', path:'ssc-gd/papers/practice-set-01.html' },
        { id:'practice-02', title:'SSC GD Practice 02', path:'ssc-gd/papers/practice-set-02.html' },
        { id:'practice-03', title:'SSC GD Practice 03', path:'ssc-gd/papers/practice-set-03.html' },
        { id:'practice-04', title:'SSC GD Practice 04', path:'ssc-gd/papers/practice-set-04.html' },
        { id:'practice-05', title:'SSC GD Practice 05', path:'ssc-gd/papers/practice-set-05.html' }
    ],
    ctet: [
        { id:'practice-01', title:'CTET Practice 01', path:'ctet/papers/practice-set-01.html' },
        { id:'practice-02', title:'CTET Practice 02', path:'ctet/papers/practice-set-02.html' },
        { id:'practice-03', title:'CTET Practice 03', path:'ctet/papers/practice-set-03.html' },
        { id:'practice-04', title:'CTET Practice 04', path:'ctet/papers/practice-set-04.html' }
    ],
    agniveer: [
        { id:'practice-01', title:'Agniveer Practice 01', path:'agniveer/papers/practice-set-01.html' },
        { id:'practice-02', title:'Agniveer Practice 02', path:'agniveer/papers/practice-set-02.html' },
        { id:'practice-03', title:'Agniveer Practice 03', path:'agniveer/papers/practice-set-03.html' },
        { id:'practice-04', title:'Agniveer Practice 04', path:'agniveer/papers/practice-set-04.html' }
    ]
};

var SECTIONS = {
    cgl: ['General Intelligence & Reasoning','General Awareness','Quantitative Aptitude','English Comprehension'],
    rbi: ['General Awareness','Quantitative Aptitude','Reasoning','English'],
    jee: ['Physics','Chemistry','Mathematics'],
    neet: ['Physics','Chemistry','Botany','Zoology'],
    gate: ['General Aptitude','Core Subject'],
    upsc: ['General Studies','CSAT','Current Affairs'],
    'ibps-po': ['Reasoning','Quantitative Aptitude','English','General Awareness'],
    'sbi-clerk': ['Reasoning','Quantitative Aptitude','English','General Awareness'],
    'ssc-gd': ['General Knowledge','Mathematics','Reasoning','English'],
    ctet: ['Child Development & Pedagogy','Mathematics','Environmental Studies','Language'],
    agniveer: ['General Knowledge','Mathematics','Science','Reasoning']
};

var TOPICS = {
    gate: {
        'General Aptitude': ['Aptitude', 'General Aptitude'],
        'Core Subject': ['Structural', 'Geotechnical', 'Water', 'Thermodynamics', 'Thermo', 'Strength of Materials', 'Strength', 'Production', 'Networks', 'Analog', 'Digital', 'DS & Algo', 'DS & Algorithms', 'Data Structures & Algorithms', 'CO & OS', 'Computer Organization & OS', 'Theory of Computation', 'Theory'],
        'Engineering Mathematics': ['Engineering Mathematics']
    }
};

function esc(s) { return String(s).replace(/[&<>"']/g, function(c) { return '&#' + c.charCodeAt(0) + ';'; }); }

var currentTab = 'drill';
var drillQuestions = [];
var mockQuestions = [];
var mockTimer = null;
var mockTimeLeft = 0;
var mockAnswered = 0;
var mockCorrect = 0;

document.querySelectorAll('.lab-tab').forEach(function(tab){
    tab.addEventListener('click', function(){
        document.querySelectorAll('.lab-tab').forEach(function(t){ t.classList.remove('active'); });
        document.querySelectorAll('.tab-content').forEach(function(tc){ tc.classList.remove('active'); });
        this.classList.add('active');
        var target = this.getAttribute('data-tab');
        document.getElementById('tab-' + target).classList.add('active');
        currentTab = target;
    });
});

// === TOPIC DRILL ===
function showSectionTopics(section, active, containerId, updateFn){
    var topicContainer = document.getElementById(containerId);
    var exam = document.getElementById(containerId === 'drill-topics' ? 'drill-exam' : 'mock-exam').value;
    var examTopics = TOPICS[exam];
    if (!examTopics || !examTopics[section]) return;
    if (active) {
        var existing = topicContainer.querySelector('.chip-group-label[data-section="' + section + '"]');
        if (!existing) {
            var label = document.createElement('div');
            label.className = 'chip-group-label';
            label.style.cssText = 'font-size:.78em;color:#71717a;margin:6px 0 2px;width:100%';
            label.textContent = section + ' topics:';
            label.dataset.section = section;
            topicContainer.appendChild(label);
            examTopics[section].forEach(function(t){
                var tc = document.createElement('span');
                tc.className = 'chip green';
                tc.textContent = t;
                tc.dataset.section = section;
                tc.dataset.topic = t;
                tc.addEventListener('click', function(){ this.classList.toggle('active'); if (updateFn) updateFn(); });
                topicContainer.appendChild(tc);
            });
        }
        topicContainer.style.display = 'block';
    } else {
        var toRemove = topicContainer.querySelectorAll('[data-section="' + section + '"]');
        toRemove.forEach(function(el){ el.remove(); });
        if (topicContainer.children.length === 0) topicContainer.style.display = 'none';
    }
}

function getSelectedTopics(){
    var topics = [];
    document.querySelectorAll('#drill-sections .chip.active').forEach(function(c){
        var sec = c.getAttribute('data-section') || c.textContent;
        var exam = document.getElementById('drill-exam').value;
        var examTopics = TOPICS[exam];
        if (examTopics && examTopics[sec]) {
            var selectedTopics = document.querySelectorAll('#drill-topics .chip[data-section="' + sec + '"].active');
            if (selectedTopics.length > 0) {
                selectedTopics.forEach(function(t){ topics.push(t.getAttribute('data-topic') || t.textContent); });
            } else {
                examTopics[sec].forEach(function(t){ topics.push(t); });
            }
        } else {
            topics.push(sec);
        }
    });
    return topics;
}

document.getElementById('drill-exam').addEventListener('change', function(){
    var exam = this.value;
    var container = document.getElementById('drill-sections');
    container.innerHTML = '';
    document.getElementById('drill-topics').innerHTML = '';
    document.getElementById('drill-area').innerHTML = '';
    document.getElementById('drill-start').disabled = true;
    if (!exam) return;
    var secs = SECTIONS[exam] || [];
    secs.forEach(function(s, i){
        var chip = document.createElement('span');
        chip.className = 'chip' + (i === 0 ? ' active' : '');
        chip.textContent = s;
        chip.dataset.section = s;
        chip.addEventListener('click', function(){
            this.classList.toggle('active');
            showSectionTopics(s, this.classList.contains('active'), 'drill-topics', updateDrillStart);
            updateDrillStart();
        });
        container.appendChild(chip);
        if (i === 0 && TOPICS[exam] && TOPICS[exam][s]) {
            showSectionTopics(s, true, 'drill-topics', updateDrillStart);
        }
    });
    updateDrillStart();
});

function updateDrillStart(){
    var exam = document.getElementById('drill-exam').value;
    var active = document.querySelectorAll('#drill-sections .chip.active');
    document.getElementById('drill-start').disabled = !exam || active.length === 0;
}

document.getElementById('drill-start').addEventListener('click', async function(){
    var exam = document.getElementById('drill-exam').value;
    var activeTopics = getSelectedTopics();
    var papers = PAPERS[exam] || [];
    if (papers.length === 0) return;
    var randomPaper = papers[Math.floor(Math.random() * papers.length)];
    this.textContent = 'Loading...';
    this.disabled = true;
    try {
        var r = await fetch(randomPaper.path);
        var html = await r.text();
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');
        var allQs = doc.querySelectorAll('.question');
        drillQuestions = [];
        allQs.forEach(function(q){
            var secBadge = q.querySelector('.section-badge');
            var section = secBadge ? secBadge.textContent.trim() : '';
            if (activeTopics.some(function(t){ return section.indexOf(t) >= 0 || t.indexOf(section) >= 0; })) {
                drillQuestions.push(parseQuestion(q, randomPaper.id));
            }
        });
        renderDrill();
    } catch(e) {
        document.getElementById('drill-area').innerHTML = '<div class="empty-state"><p>? Failed to load paper. Try again.</p></div>';
    }
    this.textContent = 'Start Drill';
    this.disabled = false;
});

function parseQuestion(qEl, paperId){
    var num = qEl.getAttribute('data-q') || '?';
    var text = qEl.querySelector('.q-text') ? qEl.querySelector('.q-text').textContent.trim() : '';
    var opts = [];
    qEl.querySelectorAll('.q-option').forEach(function(o, i){
        opts.push({
            text: o.textContent.trim(),
            correct: o.hasAttribute('data-correct')
        });
    });
    var solEl = qEl.querySelector('.solution-box');
    var solution = solEl ? solEl.textContent.trim() : '';
    var secBadge = qEl.querySelector('.section-badge');
    var section = secBadge ? secBadge.textContent.trim() : 'General';
    return { num: num, text: text, options: opts, solution: solution, section: section, paperId: paperId };
}

function renderDrill(){
    var area = document.getElementById('drill-area');
    if (drillQuestions.length === 0) {
        area.innerHTML = '<div class="empty-state"><div class="icon">??</div><p>No questions found for this topic in the selected paper.</p></div>';
        return;
    }
    var html = '<div style="font-size:.82em;color:#71717a;margin-bottom:10px">' + drillQuestions.length + ' questions found. Click to answer.</div>';
    drillQuestions.forEach(function(q, i){
        html += '<div class="q-block" data-idx="' + i + '">';
        html += '<div class="q-num"><span class="weak-section">' + esc(q.section) + '</span> Q' + esc(q.num) + '</div>';
        html += '<div class="q-text">' + esc(q.text) + '</div>';
        html += '<div class="q-opts">';
        q.options.forEach(function(o, oi){
            html += '<div class="q-opt" data-opt="' + oi + '" data-correct="' + o.correct + '">' + esc(o.text) + '</div>';
        });
        html += '</div>';
        html += '<div class="q-soln">' + esc(q.solution) + '</div>';
        html += '</div>';
    });
    area.innerHTML = html;

    area.querySelectorAll('.q-opt').forEach(function(el){
        el.addEventListener('click', function(){
            var block = this.closest('.q-block');
            if (block.classList.contains('answered')) return;
            block.classList.add('answered');
            var isCorrect = this.getAttribute('data-correct') === 'true';
            if (isCorrect) {
                this.classList.add('correct');
            } else {
                this.classList.add('wrong');
                block.querySelector('.q-opt[data-correct="true"]').classList.add('correct');
            }
            block.querySelectorAll('.q-opt').forEach(function(o){ o.style.pointerEvents = 'none'; });
            var sol = block.querySelector('.q-soln');
            if (sol) sol.classList.add('show');
        });
    });
}

// === CUSTOM MOCK ===
function getMockSelectedTopics(){
    var topics = [];
    document.querySelectorAll('#mock-sections .chip.active').forEach(function(c){
        var sec = c.getAttribute('data-section') || c.textContent;
        var exam = document.getElementById('mock-exam').value;
        var examTopics = TOPICS[exam];
        if (examTopics && examTopics[sec]) {
            var selectedTopics = document.querySelectorAll('#mock-topics .chip[data-section="' + sec + '"].active');
            if (selectedTopics.length > 0) {
                selectedTopics.forEach(function(t){ topics.push(t.getAttribute('data-topic') || t.textContent); });
            } else {
                examTopics[sec].forEach(function(t){ topics.push(t); });
            }
        } else {
            topics.push(sec);
        }
    });
    return topics;
}

document.getElementById('mock-exam').addEventListener('change', function(){
    var exam = this.value;
    var container = document.getElementById('mock-sections');
    container.innerHTML = '';
    document.getElementById('mock-topics').innerHTML = '';
    document.getElementById('mock-area').innerHTML = '';
    document.getElementById('mock-start').disabled = true;
    if (!exam) return;
    var secs = SECTIONS[exam] || [];
    secs.forEach(function(s, i){
        var chip = document.createElement('span');
        chip.className = 'chip' + (i === 0 ? ' active' : '');
        chip.textContent = s;
        chip.dataset.section = s;
        chip.addEventListener('click', function(){
            this.classList.toggle('active');
            showSectionTopics(s, this.classList.contains('active'), 'mock-topics', updateMockStart);
            updateMockStart();
        });
        container.appendChild(chip);
        if (i === 0 && TOPICS[exam] && TOPICS[exam][s]) {
            showSectionTopics(s, true, 'mock-topics', updateMockStart);
        }
    });
    updateMockStart();
});

function updateMockStart(){
    var exam = document.getElementById('mock-exam').value;
    var active = document.querySelectorAll('#mock-sections .chip.active');
    document.getElementById('mock-start').disabled = !exam || active.length === 0;
}

function checkMockAllowed(){
    var pre = JSON.parse(localStorage.getItem('studypro_premium') || '{}');
    if (pre.active) return true;
    var monthKey = 'studypro_mock_month_' + new Date().getFullYear() + '-' + (new Date().getMonth()+1);
    var c = parseInt(localStorage.getItem(monthKey) || '0');
    return c < 5;
}

function incrementMockCount(){
    var monthKey = 'studypro_mock_month_' + new Date().getFullYear() + '-' + (new Date().getMonth()+1);
    var c = parseInt(localStorage.getItem(monthKey) || '0');
    localStorage.setItem(monthKey, c + 1);
}

document.getElementById('mock-start').addEventListener('click', async function(){
    if (!checkMockAllowed()) { alert('You have used all 5 free mocks this month. Go Premium for unlimited mocks!'); this.textContent='Go Premium ?'; this.onclick=function(){location.href='premium.html'}; return; }
    if (mockTimer) { clearInterval(mockTimer); mockTimer = null; }
    var exam = document.getElementById('mock-exam').value;
    var activeTopics = getMockSelectedTopics();
    var count = parseInt(document.getElementById('mock-count').value);
    var diff = document.getElementById('mock-difficulty').value;
    var timeLimit = parseInt(document.getElementById('mock-time').value);

    var allQuestions = [];
    var papers = PAPERS[exam] || [];
    this.textContent = 'Loading...';
    this.disabled = true;

    try {
        for (var pi = 0; pi < papers.length; pi++) {
            var r = await fetch(papers[pi].path);
            var html = await r.text();
            var parser = new DOMParser();
            var doc = parser.parseFromString(html, 'text/html');
            doc.querySelectorAll('.question').forEach(function(q){
                var secBadge = q.querySelector('.section-badge');
                var section = secBadge ? secBadge.textContent.trim() : '';
                if (activeTopics.some(function(t){ return section.indexOf(t) >= 0 || t.indexOf(section) >= 0; })) {
                    var parsed = parseQuestion(q, papers[pi].id);
                    if (diff === 'all' || parsed.difficulty === diff) {
                        allQuestions.push(parsed);
                    }
                }
            });
        }

        shuffle(allQuestions);
        mockQuestions = allQuestions.slice(0, Math.min(count, allQuestions.length));

        if (mockQuestions.length === 0) {
            document.getElementById('mock-area').innerHTML = '<div class="empty-state"><p>No questions match your criteria. Try different sections.</p></div>';
            this.textContent = 'Generate Mock';
            this.disabled = false;
            return;
        }

        mockAnswered = 0;
        mockCorrect = 0;
        incrementMockCount();
        renderMock(timeLimit);
        if (timeLimit > 0) startMockTimer(timeLimit);
    } catch(e) {
        document.getElementById('mock-area').innerHTML = '<div class="empty-state"><p>? Failed to load papers. Try again.</p></div>';
    }
    this.textContent = 'Generate Mock';
    this.disabled = false;
});

function shuffle(arr){
    for (var i = arr.length - 1; i > 0; i--){
        var j = Math.floor(Math.random() * (i + 1));
        var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
}

function startMockTimer(seconds){
    mockTimeLeft = seconds;
    var el = document.getElementById('mock-timer-display');
    if (el) el.style.display = 'block';
    mockTimer = setInterval(function(){
        mockTimeLeft--;
        var m = Math.floor(mockTimeLeft / 60);
        var s = mockTimeLeft % 60;
        var display = document.getElementById('mock-timer-display');
        if (display) display.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
        if (mockTimeLeft <= 0) {
            clearInterval(mockTimer);
            mockTimer = null;
            finishMock();
        }
    }, 1000);
}

function renderMock(timeLimit){
    var area = document.getElementById('mock-area');
    var html = '<div class="mock-header">';
    html += '<div style="font-size:.85em;color:#71717a">' + mockQuestions.length + ' questions</div>';
    if (timeLimit > 0) html += '<div id="mock-timer-display" class="mock-timer" style="font-size:1.3em;padding:0">' + formatTime(timeLimit) + '</div>';
    html += '<button class="btn btn-sm btn-danger" id="mock-finish-early">Finish & See Results</button>';
    html += '</div>';

    mockQuestions.forEach(function(q, i){
        html += '<div class="q-block" data-idx="' + i + '">';
        html += '<div class="q-num"><span class="weak-section">' + esc(q.section) + '</span> Q' + esc(i+1) + '</div>';
        html += '<div class="q-text">' + esc(q.text) + '</div>';
        html += '<div class="q-opts">';
        q.options.forEach(function(o, oi){
            html += '<div class="q-opt" data-opt="' + oi + '" data-correct="' + o.correct + '">' + esc(o.text) + '</div>';
        });
        html += '</div>';
        html += '<div class="q-soln">' + esc(q.solution) + '</div>';
        html += '</div>';
    });
    area.innerHTML = html;

    area.querySelectorAll('.q-opt').forEach(function(el){
        el.addEventListener('click', function(){
            var block = this.closest('.q-block');
            if (block.classList.contains('answered')) return;
            block.classList.add('answered');
            mockAnswered++;
            var isCorrect = this.getAttribute('data-correct') === 'true';
            if (isCorrect) { mockCorrect++; this.classList.add('correct'); }
            else {
                this.classList.add('wrong');
                block.querySelector('.q-opt[data-correct="true"]').classList.add('correct');
            }
            block.querySelectorAll('.q-opt').forEach(function(o){ o.style.pointerEvents = 'none'; });
            var sol = block.querySelector('.q-soln');
            if (sol) sol.classList.add('show');

            var total = mockQuestions.length;
            if (mockAnswered === total) {
                setTimeout(finishMock, 600);
            }
        });
    });

    document.getElementById('mock-finish-early').addEventListener('click', finishMock);
}

function formatTime(s){
    var m = Math.floor(s / 60);
    var sec = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (sec < 10 ? '0' : '') + sec;
}

function finishMock(){
    if (mockTimer) { clearInterval(mockTimer); mockTimer = null; }
    var total = mockQuestions.length;
    var wrong = mockAnswered - mockCorrect;
    var pct = mockAnswered > 0 ? Math.round(mockCorrect / mockAnswered * 100) : 0;

    var overlay = document.createElement('div');
    overlay.className = 'result-overlay';
    overlay.innerHTML =
        '<div class="result-modal">' +
        '<div style="font-size:1em;color:#a1a1aa;margin-bottom:4px">Mock Complete!</div>' +
        '<div class="score" style="color:' + (pct >= 60 ? '#34d399' : '#ef4444') + '">' + mockCorrect + '/' + mockAnswered + '</div>' +
        '<div class="detail">' + pct + '% accuracy</div>' +
        '<div class="stat-row">' +
        '<div class="stat-item"><div class="stat-val" style="color:#34d399">' + mockCorrect + '</div><div class="stat-lbl">Correct</div></div>' +
        '<div class="stat-item"><div class="stat-val" style="color:#ef4444">' + wrong + '</div><div class="stat-lbl">Wrong</div></div>' +
        '<div class="stat-item"><div class="stat-val">' + (total - mockAnswered) + '</div><div class="stat-lbl">Unanswered</div></div>' +
        '</div>' +
        '<button class="btn btn-primary btn-sm" id="mockCloseBtn">Close</button>' +
        '</div>';
    document.body.appendChild(overlay);
    document.getElementById('mockCloseBtn').addEventListener('click', function() { overlay.remove(); });

    saveMockResult({ correct: mockCorrect, wrong: wrong, total: total, answered: mockAnswered, pct: pct });
}

function saveMockResult(r){
    var key = 'studypro_mock_results';
    var list = JSON.parse(localStorage.getItem(key) || '[]');
    list.unshift({ date: new Date().toISOString(), correct: r.correct, wrong: r.wrong, total: r.total, answered: r.answered, pct: r.pct });
    if (list.length > 20) list = list.slice(0, 20);
    localStorage.setItem(key, JSON.stringify(list));
}

// === WEAK AREA FIXER ===
function renderWeak(filter){
    var list = JSON.parse(localStorage.getItem('studypro_wrong') || '[]');
    var area = document.getElementById('weak-list');
    if (filter && filter !== 'all') {
        list = list.filter(function(item){
            var sec = item.section || '';
            return sec.indexOf(filter) >= 0 || filter.indexOf(sec) >= 0;
        });
    }
    if (list.length === 0) {
        area.innerHTML = '<div class="empty-state"><div class="icon">?</div><p>No mistakes yet. Keep practicing!</p></div>';
        return;
    }
    var html = '';
    list.forEach(function(item, i){
        html += '<div class="weak-item" data-idx="' + i + '">';
        html += '<div style="font-size:.85em;color:#a78bfa;font-weight:600;min-width:36px">' + (i+1) + '.</div>';
        html += '<div class="weak-q">' + (item.qText ? item.qText.slice(0, 80) + '...' : 'Question') + '</div>';
        html += '<span class="weak-section">' + (item.section || 'General') + '</span>';
        html += '<span class="weak-date">' + (item.date ? item.date.slice(0,10) : '') + '</span>';
        html += '</div>';
    });
    area.innerHTML = html;
    area.querySelectorAll('.weak-item').forEach(function(el){
        el.addEventListener('click', function(){
            var idx = parseInt(this.getAttribute('data-idx'));
            showWeakDetail(list[idx]);
        });
    });
}

function showWeakDetail(item){
    var overlay = document.createElement('div');
    overlay.className = 'result-overlay';
    var html = '<div class="result-modal" style="max-width:500px;text-align:left">';
    html += '<div style="font-size:.78em;color:#71717a;margin-bottom:8px">' + (item.exam || '') + ' \u2014 ' + (item.section || 'General') + '</div>';
    html += '<div style="font-weight:600;margin-bottom:12px">' + (item.qText || 'Question') + '</div>';
    html += '<div style="font-size:.85em;margin-bottom:6px"><strong style="color:#34d399">Correct:</strong> ' + (item.correct || '') + '</div>';
    html += '<div style="font-size:.85em;margin-bottom:6px"><strong style="color:#ef4444">Your Answer:</strong> ' + (item.chosen || '') + '</div>';
    if (item.paperId) {
        html += '<div style="margin-top:14px;font-size:.82em;color:#a78bfa">?? ' + item.paperId + '</div>';
    }
    html += '<button class="btn btn-primary btn-sm" style="width:100%;margin-top:16px" id="weakCloseBtn">Close</button>';
    html += '</div>';
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
    document.getElementById('weakCloseBtn').addEventListener('click', function() { overlay.remove(); });
}

function loadWeakFilters(){
    var wrong = JSON.parse(localStorage.getItem('studypro_wrong') || '[]');
    var sections = {};
    wrong.forEach(function(item){
        var sec = item.section || 'General';
        sections[sec] = (sections[sec] || 0) + 1;
    });
    var container = document.getElementById('weak-filters');
    container.innerHTML = '<span class="chip active" data-filter="all">All (' + wrong.length + ')</span>';
    Object.keys(sections).sort().forEach(function(sec){
        var chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = sec + ' (' + sections[sec] + ')';
        chip.dataset.filter = sec;
        chip.addEventListener('click', function(){
            document.querySelectorAll('#weak-filters .chip').forEach(function(c){ c.classList.remove('active'); });
            this.classList.add('active');
            renderWeak(this.getAttribute('data-filter'));
        });
        container.appendChild(chip);
    });
    renderWeak('all');
}

loadWeakFilters();
