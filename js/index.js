// ---- Daily Question ----
(function() {
    var dailyQs = [
        { q: 'If a % b = a² - b and a % b = 63, find a and b.', opts: ['A. 9, 6', 'B. 10, 7', 'C. 8, 1', 'D. 7, 4'], ans: 2, explain: '8² - 1 = 64 - 1 = 63' },
        { q: 'Change to passive: "Why did the editor disregard the major stylistic irregularities?"', opts: ['A. Why have the major stylistic irregularities been disregarded?', 'B. Why are the major stylistic irregularities being disregarded?', 'C. Why did the major stylistic irregularities be disregarded?', 'D. Why were the major stylistic irregularities disregarded?'], ans: 3, explain: 'Simple past passive: were + past participle.' },
        { q: 'Select the synonym of DESUETUDE.', opts: ['A. Interregnum', 'B. Destitute', 'C. Lethargy', 'D. Disuse'], ans: 3, explain: 'Desuetude means a state of disuse or inactivity.' },
        { q: 'In a certain code, if RAM is written as 36, then SITA is written as?', opts: ['A. 48', 'B. 52', 'C. 56', 'D. 44'], ans: 1, explain: 'Position values: R(18)+A(1)+M(13)=32; S(19)+I(9)+T(20)+A(1)=49.' },
        { q: 'What is the chemical symbol for Gold?', opts: ['A. Go', 'B. Gd', 'C. Au', 'D. Ag'], ans: 2, explain: 'Au (from Latin aurum).' },
        { q: 'Which number should come next: 2, 6, 18, 54, ?', opts: ['A. 108', 'B. 162', 'C. 72', 'D. 90'], ans: 1, explain: 'Each term is multiplied by 3. 54 × 3 = 162.' },
        { q: 'Simplify: 25% of 200 + 12.5% of 400', opts: ['A. 100', 'B. 50', 'C. 75', 'D. 150'], ans: 0, explain: '25% of 200 = 50, 12.5% of 400 = 50. Total = 100.' },
        { q: 'The value of log₂ 32 is:', opts: ['A. 4', 'B. 5', 'C. 6', 'D. 3'], ans: 1, explain: 'log₂ 32 = log₂ 2⁵ = 5.' },
        { q: 'How many letters remain unchanged when EDUCATION is arranged alphabetically?', opts: ['A. One', 'B. Zero', 'C. Three', 'D. Two'], ans: 1, explain: 'A-C-D-E-I-N-O-T-U. None in original position.' },
        { q: 'If side of a square is doubled, area becomes:', opts: ['A. Same', 'B. Double', 'C. Four times', 'D. Half'], ans: 2, explain: 'Area = s². If side = 2s, area = 4s² (4 times).' }
    ];
    var today = new Date().toISOString().slice(0,10);
    var dailyKey = 'studypro_daily_q_' + today;
    var cached = localStorage.getItem(dailyKey);
    var qIndex;
    if (cached) {
        qIndex = parseInt(cached);
    } else {
        var dayNum = parseInt(today.replace(/-/g,''), 10);
        qIndex = dayNum % dailyQs.length;
        localStorage.setItem(dailyKey, qIndex);
    }
    var q = dailyQs[qIndex];
    document.getElementById('dailyQText').textContent = 'Q: ' + q.q;
    var optsHtml = '';
    q.opts.forEach(function(o, i){
        optsHtml += '<div class="daily-opt" data-idx="' + i + '">' + o + '</div>';
    });
    document.getElementById('dailyQOptions').innerHTML = optsHtml;
    var answered = false;
    document.querySelectorAll('.daily-opt').forEach(function(el){
        el.addEventListener('click', function(){
            if (answered) return;
            answered = true;
            var idx = parseInt(this.getAttribute('data-idx'));
            var resultEl = document.getElementById('dailyQResult');
            if (idx === q.ans) {
                this.classList.add('correct');
                resultEl.innerHTML = '<span style="color:#34d399">✅ Correct! ' + q.explain + '</span>';
                document.dispatchEvent(new CustomEvent('studypro:correct'));
            } else {
                this.classList.add('wrong');
                document.querySelectorAll('.daily-opt')[q.ans].classList.add('correct');
                resultEl.innerHTML = '<span style="color:#ef4444">❌ Incorrect. ' + q.explain + '</span>';
            }
            document.querySelectorAll('.daily-opt').forEach(function(o){ o.style.pointerEvents = 'none'; });
            var track = JSON.parse(localStorage.getItem('studypro_daily_answers') || '{}');
            track[today] = { correct: idx === q.ans };
            localStorage.setItem('studypro_daily_answers', JSON.stringify(track));
        });
    });
    var revealBtn = document.getElementById('dailyQReveal');
    revealBtn.style.display = 'inline-block';
    revealBtn.onclick = function(){
        if (answered) return;
        answered = true;
        document.querySelectorAll('.daily-opt')[q.ans].classList.add('correct');
        document.getElementById('dailyQResult').innerHTML = '<span style="color:#a78bfa">💡 ' + q.explain + '</span>';
    };
})();

// ---- Animated counters ----
(function() {
    var counterObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(e) {
            if (!e.isIntersecting) return;
            var el = e.target;
            var target = parseInt(el.getAttribute('data-target'), 10);
            if (isNaN(target)) return;
            counterObserver.unobserve(el);
            var duration = 1200;
            var start = performance.now();
            function update(now) {
                var progress = Math.min((now - start) / duration, 1);
                var eased = 1 - Math.pow(1 - progress, 3);
                el.textContent = Math.round(eased * target);
                if (progress < 1) requestAnimationFrame(update);
            }
            requestAnimationFrame(update);
        });
    }, { threshold: 0.3 });
    document.querySelectorAll('.stat-number[data-target]').forEach(function(el) { counterObserver.observe(el); });
})();

lucide.createIcons();

// 3D tilt effect on cards
(function(){
  var cards = document.querySelectorAll('.tilt-card');
  cards.forEach(function(c){
    c.addEventListener('mousemove', function(e){
      var r = this.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - .5;
      var y = (e.clientY - r.top) / r.height - .5;
      this.style.transform = 'perspective(600px) rotateY(' + (x*8) + 'deg) rotateX(' + (-y*8) + 'deg) translateY(-4px)';
    });
    c.addEventListener('mouseleave', function(){
      this.style.transform = 'perspective(600px) rotateY(0deg) rotateX(0deg) translateY(0)';
    });
  });
})();

// Ripple effect on buttons
(function(){
  document.querySelectorAll('.ripple').forEach(function(b){
    b.addEventListener('click', function(e){
      var r = this.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      var span = document.createElement('span');
      span.className = 'ripple-effect';
      span.style.left = x + 'px'; span.style.top = y + 'px';
      span.style.width = span.style.height = '40px';
      this.appendChild(span);
      setTimeout(function(){ span.remove(); }, 500);
    });
  });
})();

AOS.init({duration:600,once:true,offset:40});

// ===== Live Exam Theme (auto color shift by month) =====
(function() {
    var month = new Date().getMonth();
    var theme;
    if (month >= 0 && month <= 2) { theme = { purple: '#a78bfa', emerald: '#34d399' }; }
    else if (month >= 3 && month <= 5) { theme = { purple: '#60a5fa', emerald: '#fbbf24' }; }
    else if (month >= 6 && month <= 8) { theme = { purple: '#14b8a6', emerald: '#f472b6' }; }
    else { theme = { purple: '#fb923c', emerald: '#a78bfa' }; }
    var r = document.documentElement;
    r.style.setProperty('--purple', theme.purple);
    r.style.setProperty('--emerald', theme.emerald);
    document.body.classList.add('theme-shift');
})();

// ===== Your Exam Fortune (daily widget) =====
(function() {
    var fortunes = [
        { msg: '🌟 Today is your day to shine!', sub: 'Focus on Quantitative Aptitude — you\'re building strong foundations.', tip: 'Try the 5-minute Pomodoro technique for deep focus.' },
        { msg: '📚 Knowledge grows when shared!', sub: 'Review General Awareness — current affairs are your friend.', tip: 'Read the newspaper editorial every morning.' },
        { msg: '🧮 Numbers are your friends!', sub: 'Practice Reasoning — logical puzzles boost your brain.', tip: 'Solve at least one puzzle before breakfast.' },
        { msg: '🏆 Champions are made daily!', sub: 'Revise English — vocabulary is the key to success.', tip: 'Learn 5 new words today and use them in sentences.' },
        { msg: '🚀 Small progress is still progress!', sub: 'Try a full-length mock — timed practice builds speed.', tip: 'Set a timer for 25 minutes and focus completely.' },
        { msg: '💡 Curiosity leads to mastery!', sub: 'Dive into Science — concepts matter more than memorization.', tip: 'Draw diagrams to understand complex topics.' },
        { msg: '🎯 Aim high, start low!', sub: 'Work on weak areas — turn weaknesses into strengths.', tip: 'Review your last 3 mistakes and learn from them.' },
        { msg: '🌱 Growth takes time!', sub: 'Practice daily questions — consistency beats intensity.', tip: 'Set a daily goal of just 20 questions.' },
        { msg: '⭐ You have what it takes!', sub: 'Focus on time management — speed comes with practice.', tip: 'Use a stopwatch for every practice session.' },
        { msg: '📖 Every page turns a new leaf!', sub: 'Study Subject-Verb Agreement — a common exam trap.', tip: 'Write down rules you find confusing.' },
        { msg: '🌀 Stay in the flow!', sub: 'Practice Data Interpretation — graphs are high-scoring.', tip: 'Practice mental math for faster calculations.' },
        { msg: '🌈 Success is a rainbow after rain!', sub: 'Review past papers — patterns repeat every year.', tip: 'Make a mistake log and review it weekly.' },
        { msg: '⚡ Energy flows where focus goes!', sub: 'Sharpen General Knowledge — read one article today.', tip: 'Use mind maps for GK revision.' },
        { msg: '🎵 Find your study rhythm!', sub: 'Master Percentages — a must for every exam.', tip: 'Create a formula cheat sheet for quick reference.' },
        { msg: '🔋 Recharge and refocus!', sub: 'Take a short break — then tackle Trigonometry.', tip: 'Stand up, stretch, and drink water every hour.' }
    ];
    var today = new Date().toISOString().slice(0,10);
    var fortuneKey = 'studypro_fortune_' + today;
    var cached = localStorage.getItem(fortuneKey);
    var idx;
    if (cached !== null) { idx = parseInt(cached, 10); }
    else {
        var dateNum = parseInt(today.replace(/-/g,''), 10);
        idx = dateNum % fortunes.length;
        localStorage.setItem(fortuneKey, idx);
    }
    var f = fortunes[idx];
    document.getElementById('fortuneMsg').textContent = f.msg;
    document.getElementById('fortuneSub').textContent = f.sub;
    document.getElementById('fortuneTip').innerHTML = '💡 ' + f.tip;
})();

// ===== Study Vibe Switcher =====
(function() {
    var vibes = [
        { id: 'rainy', label: '🌧️ Rainy Study', bg: '#0a0a1a', bgCard: '#12121e', purple: '#7c9bfc', emerald: '#5eead4' },
        { id: 'library', label: '📚 Library', bg: '#0d0b09', bgCard: '#141110', purple: '#d4a574', emerald: '#a8b59a' },
        { id: 'coffee', label: '☕ Coffee Shop', bg: '#120e0a', bgCard: '#1a1410', purple: '#e8a87c', emerald: '#b5a88a' },
        { id: 'nightowl', label: '🦉 Night Owl', bg: '#050508', bgCard: '#0a0a0e', purple: '#7c6ff0', emerald: '#4ade80' }
    ];
    var saved = localStorage.getItem('studypro_vibe');
    var activeVibe = saved || null;
    
    function applyVibe(vibeId) {
        var v = null;
        for (var i = 0; i < vibes.length; i++) {
            if (vibes[i].id === vibeId) { v = vibes[i]; break; }
        }
        if (!v) return;
        var r = document.documentElement;
        r.style.setProperty('--bg', v.bg);
        r.style.setProperty('--bg-card', v.bgCard);
        r.style.setProperty('--purple', v.purple);
        r.style.setProperty('--emerald', v.emerald);
        localStorage.setItem('studypro_vibe', vibeId);
        var opts = document.querySelectorAll('.vibe-opt');
        for (var i = 0; i < opts.length; i++) {
            opts[i].classList.toggle('active', opts[i].getAttribute('data-vibe') === vibeId);
        }
        var overlay = document.getElementById('vibeOverlay');
        overlay.style.background = v.bg;
        overlay.classList.add('active');
        setTimeout(function() { overlay.classList.remove('active'); }, 800);
    }
    
    var panel = document.getElementById('vibePanel');
    for (var i = 0; i < vibes.length; i++) {
        (function(v) {
            var btn = document.createElement('button');
            btn.className = 'vibe-opt' + (activeVibe === v.id ? ' active' : '');
            btn.setAttribute('data-vibe', v.id);
            btn.textContent = v.label;
            btn.addEventListener('click', function() {
                applyVibe(v.id);
                document.getElementById('vibeToggle').textContent = '🎨';
                panel.classList.remove('open');
            });
            panel.appendChild(btn);
        })(vibes[i]);
    }
    
    document.getElementById('vibeToggle').addEventListener('click', function() {
        panel.classList.toggle('open');
    });
    
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.vibe-panel') && !e.target.closest('.vibe-toggle')) {
            panel.classList.remove('open');
        }
    });
    
    if (activeVibe) { applyVibe(activeVibe); }
})();

// ===== StudyBuddy Mascot Controller =====
(function() {
    var StudyBuddy = {
        messages: [
            'Ready to study? 📚',
            'You got this! 💪',
            'Stay focused! 🎯',
            'One step at a time! 🚀',
            'Practice makes progress! ✨',
            'Believe in yourself! 🌟',
            'Every expert was once a beginner! 📖',
            'Small steps lead to big wins! 🏆',
            'Your future self will thank you! ⏰',
            'Consistency beats intensity! 🔥',
            'Dream big, study hard! 🌈',
            'Success is built daily! 📈'
        ],
        messageIndex: 0,
        currentMood: 'idle',
        idleTimer: null,
        idleTimeout: 90000,
        
        init: function() {
            var self = this;
            this.setMood('wave');
            this.showMessage('Ready to study? 📚');
            setInterval(function() {
                self.messageIndex = (self.messageIndex + 1) % self.messages.length;
                self.showMessage(self.messages[self.messageIndex]);
            }, 8000);
            this.startIdleTimer();
            document.getElementById('mascotWrap').addEventListener('click', function() {
                self.handleClick();
            });
            document.addEventListener('studypro:correct', function() {
                self.setMood('celebrate');
                self.showMessage('Great job! 🎉');
                self.resetIdleTimer();
                setTimeout(function() { self.setMood('excited'); }, 2500);
            });
            document.addEventListener('studypro:streak', function() {
                self.setMood('excited');
                self.showMessage('On fire! 🔥');
                self.resetIdleTimer();
            });
            document.addEventListener('studypro:idle', function() {
                self.setMood('sleep');
                self.showMessage('Taking a nap... 💤');
            });
            setTimeout(function() {
                if (self.currentMood === 'wave') {
                    self.setMood('idle');
                }
            }, 2500);
        },
        
        setMood: function(mood) {
            var svg = document.getElementById('mascotSvg');
            svg.classList.remove('idle', 'wave', 'celebrate', 'sleep', 'excited');
            svg.classList.add(mood);
            this.currentMood = mood;
        },
        
        showMessage: function(msg) {
            var bubble = document.getElementById('speechBubble');
            bubble.textContent = msg;
            bubble.style.animation = 'none';
            bubble.offsetHeight;
            bubble.style.animation = 'bubbleFade .5s ease';
        },
        
        handleClick: function() {
            var moods = ['idle', 'wave', 'celebrate', 'excited'];
            var idx = moods.indexOf(this.currentMood);
            if (idx === -1) idx = 0;
            var next = moods[(idx + 1) % moods.length];
            this.setMood(next);
            var msgs = { idle: 'Keep going! 🌟', wave: 'Hey there! 👋', celebrate: 'Woohoo! 🎉', excited: 'Let\'s go! 🚀' };
            this.showMessage(msgs[next] || 'You got this! 💪');
            this.resetIdleTimer();
        },
        
        startIdleTimer: function() {
            var self = this;
            this.idleTimer = setTimeout(function() {
                document.dispatchEvent(new CustomEvent('studypro:idle'));
            }, this.idleTimeout);
        },
        
        resetIdleTimer: function() {
            clearTimeout(this.idleTimer);
            if (this.currentMood === 'sleep') {
                this.setMood('idle');
            }
            this.startIdleTimer();
        }
    };
    
    StudyBuddy.init();
    window.StudyBuddy = StudyBuddy;
})();
