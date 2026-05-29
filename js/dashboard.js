(function() {
    var app = document.getElementById('app');
    var supabaseUserCached = null;
    function esc(s) { return String(s).replace(/[&<>"']/g, function(c) { return '&#' + c.charCodeAt(0) + ';'; }); }

    function loadData() {
        var results = JSON.parse(localStorage.getItem('studypro_results') || '[]');
        var streak = JSON.parse(localStorage.getItem('studypro_streak') || '{"current":0,"longest":0,"lastDate":null}');
        var badges = JSON.parse(localStorage.getItem('studypro_badges') || '[]');
        var goals = JSON.parse(localStorage.getItem('studypro_goals') || '{}');
        var wrongList = JSON.parse(localStorage.getItem('studypro_wrong') || '[]');
        var lastPaper = JSON.parse(localStorage.getItem('studypro_last_paper') || 'null');
        return { results: results, streak: streak, badges: badges, goals: goals, wrongCount: wrongList.length, lastPaper: lastPaper };
    }

    function mergeData(supabaseData) {
        var local = loadData();
        if (supabaseData) {
            if (supabaseData.profile) {
                local.streak = { current: supabaseData.profile.streak_current || 0, longest: supabaseData.profile.streak_longest || 0, lastDate: supabaseData.profile.streak_last_date };
                local.badges = supabaseData.profile.badges || [];
                local.goals = supabaseData.profile.goals || {};
            }
            if (supabaseData.results && supabaseData.results.length > 0) {
                local.results = supabaseData.results;
            }
            if (supabaseData.wrongAnswers) local.wrongCount = supabaseData.wrongAnswers.length;
        }
        return local;
    }

    function render(d) {
        var r = d.results;
        var streak = d.streak;
        var badges = d.badges;
        var goals = d.goals;
        var wrongCount = d.wrongCount;
        var lastPaper = d.lastPaper;
        var isLoggedIn = !!(supabaseUserCached || window.supabaseUser);

        var totalPapers = r.length;
        var totalCorrect = 0, totalAnswered = 0;
        r.forEach(function(x){ totalCorrect += x.correct || 0; totalAnswered += x.answered || 0; });
        var avgAccuracy = totalAnswered > 0 ? Math.round(totalCorrect / totalAnswered * 100) : 0;
        var bestPct = r.length > 0 ? Math.max.apply(null, r.map(function(x){ return x.pct || 0; })) : 0;

        var examMap = {};
        r.forEach(function(x){
            var exam = x.exam || 'Other';
            if (!examMap[exam]) examMap[exam] = { papers:0, correct:0, answered:0, total:0 };
            examMap[exam].papers++;
            examMap[exam].correct += x.correct || 0;
            examMap[exam].answered += x.answered || 0;
            examMap[exam].total += x.total || 0;
        });

        var sectionStats = {};
        r.forEach(function(x){
            if (x.pct < 60 && x.answered >= 5 && x.exam) {
                if (!sectionStats[x.exam]) sectionStats[x.exam] = { count: 0, pct: 0 };
                sectionStats[x.exam].count++;
                sectionStats[x.exam].pct = Math.max(sectionStats[x.exam].pct, x.pct);
            }
        });

        function pctClass(p) { return p >= 70 ? 'good' : p >= 40 ? 'ok' : 'bad'; }

        var hour = new Date().getHours();
        var greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

        var name = 'Student';
        var photo = '';
        var user = supabaseUserCached || window.supabaseUser;
        if (user) {
            name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Student';
            photo = user.user_metadata?.avatar_url || '';
        }

        var html = '';

        html += '<div class="dash-header">';
        html += '<div class="dash-greeting">';
        if (photo && photo.indexOf('https://') === 0) {
            html += '<div class="dash-avatar"><img src="' + esc(photo) + '" alt=""></div>';
        } else if (isLoggedIn) {
            html += '<div class="dash-avatar">' + esc(name[0].toUpperCase()) + '</div>';
        } else {
            html += '<div class="dash-avatar" style="background:rgba(255,255,255,.03);color:var(--text-muted)">?</div>';
        }
        html += '<div>';
        if (isLoggedIn) {
            html += '<h1>' + esc(greeting) + ', ' + esc(name.split(' ')[0]) + '</h1>';
        } else {
            html += '<h1>📊 My Dashboard</h1>';
        }
        html += '<div class="sub">' + totalPapers + ' papers completed · ' + totalCorrect + ' correct answers</div>';
        html += '</div></div>';
        html += '<div style="display:flex;gap:8px;align-items:center">';
        if (streak.current > 0) {
            html += '<div class="streak-chip">🔥 ' + streak.current + (streak.current === 1 ? ' day' : ' days') + '</div>';
        }
        html += '<a href="index.html" class="btn btn-ghost btn-sm">← Home</a>';
        html += '</div></div>';

        if (!isLoggedIn && r.length === 0) {
            html += '<div class="dash-login-prompt">';
            html += '<span class="empty-state icon">🔐</span>';
            html += '<h2>Track Your Progress</h2>';
            html += '<p>Sign in with Google to sync your practice data across devices and unlock personalized insights.</p>';
            html += '<a class="btn btn-primary" href="#" id="signInBtn">🚀 Sign in with Google</a>';
            html += '</div>';
            app.innerHTML = html;
            document.getElementById('signInBtn').addEventListener('click', function(e) {
                e.preventDefault();
                window.supabaseLogin && window.supabaseLogin();
            });
            return;
        }

        html += '<div class="stats-row">';
        html += '<div class="stat-card"><div class="num" style="color:var(--purple)">' + totalPapers + '</div><div class="label">Papers Done</div></div>';
        html += '<div class="stat-card"><div class="num" style="color:' + (avgAccuracy >= 60 ? 'var(--emerald)' : '#ef4444') + '">' + avgAccuracy + '%</div><div class="label">Avg Accuracy</div></div>';
        html += '<div class="stat-card"><div class="num" style="color:var(--emerald)">' + bestPct + '%</div><div class="label">Best Score</div></div>';
        html += '<div class="stat-card"><div class="num" style="color:#fbbf24">' + totalCorrect + '</div><div class="label">Correct</div></div>';
        html += '</div>';

        if (lastPaper && lastPaper.url) {
            html += '<div class="section"><div class="section-header"><h2>▶ Continue <span>Where You Left Off</span></h2></div>';
            html += '<div class="resume-card">';
            html += '<div class="info"><h3>' + (lastPaper.title || 'Last Paper') + '</h3>';
            html += '<p>' + (lastPaper.date ? lastPaper.date.slice(0,10) : '') + '</p>';
            var paperId = lastPaper.url.split('/').pop().replace('.html','');
            var progress = JSON.parse(localStorage.getItem('studypro_progress') || '{}');
            var pData = progress[paperId];
            if (pData && pData.data) {
                var ans = pData.data.filter(function(q){ return q.answered; }).length;
                var total = pData.data.length;
                var pct2 = total > 0 ? Math.round(ans/total*100) : 0;
                html += '<div class="resume-bar"><div class="resume-fill" style="width:' + pct2 + '%"></div></div>';
                html += '<p style="font-size:.72em;color:var(--text-muted);margin-top:4px">' + ans + '/' + total + ' questions answered (' + pct2 + '%)</p>';
            }
            html += '</div>';
            html += '<a href="' + lastPaper.url + '" class="btn btn-primary btn-sm">Resume →</a>';
            html += '</div></div>';
        }

        html += '<div class="section"><div class="section-header"><h2>📈 Recent <span>Activity</span></h2>';
        if (r.length > 10) html += '<span class="action">Last 10 of ' + r.length + '</span>';
        html += '</div>';
        if (r.length === 0) {
            html += '<div class="empty-state"><span class="icon">📝</span><p>Complete a paper to see your activity here</p><a href="lab.html" class="btn btn-primary btn-sm">Start Practicing</a></div>';
        } else {
            var recent = r.slice(0, 10);
            var maxPct = Math.max.apply(null, recent.map(function(x){ return x.pct || 0; })) || 1;
            html += '<div class="history-list">';
            recent.forEach(function(item){
                var p = item.pct || 0;
                var w = Math.round(p / maxPct * 100);
                var cls = pctClass(p);
                html += '<div class="history-row">';
                html += '<span class="history-date">' + (item.date ? item.date.slice(5,10) : '??-??') + '</span>';
                html += '<div class="history-bar-wrapper"><div class="history-bar-fill ' + cls + '" style="width:' + w + '%"></div></div>';
                html += '<span class="history-pct ' + cls + '">' + p + '%</span>';
                html += '</div>';
            });
            html += '</div>';
        }
        html += '</div>';

        var examKeys = Object.keys(examMap);
        if (examKeys.length > 0) {
            html += '<div class="section"><div class="section-header"><h2>📊 Performance <span>by Exam</span></h2></div>';
            html += '<div class="exam-breakdown">';
            examKeys.forEach(function(exam){
                var s = examMap[exam];
                var acc = s.answered > 0 ? Math.round(s.correct / s.answered * 100) : 0;
                html += '<div class="exam-stat">';
                html += '<div class="name">' + exam.replace(/[_-]/g,' ') + '</div>';
                html += '<div class="stat-line"><span>Papers</span><span class="val">' + s.papers + '</span></div>';
                html += '<div class="stat-line"><span>Accuracy</span><span class="val" style="color:' + (acc >= 60 ? 'var(--emerald)' : '#ef4444') + '">' + acc + '%</span></div>';
                html += '<div class="stat-line"><span>Correct</span><span class="val" style="color:var(--emerald)">' + s.correct + '</span></div>';
                html += '<div class="stat-line"><span>Wrong</span><span class="val" style="color:#ef4444">' + (s.answered - s.correct) + '</span></div>';
                html += '</div>';
            });
            html += '</div></div>';
        }

        var weakKeys = Object.keys(sectionStats);
        if (weakKeys.length > 0) {
            html += '<div class="section"><div class="section-header"><h2>⚠ Areas <span>to Improve</span></h2></div>';
            html += '<div class="weak-grid">';
            weakKeys.forEach(function(exam){
                html += '<div class="weak-card">';
                html += '<div class="w-title">' + exam.replace(/[_-]/g,' ') + '</div>';
                html += '<div class="w-detail">' + sectionStats[exam].count + ' paper(s) below 60% · Best: ' + sectionStats[exam].pct + '%</div>';
                html += '</div>';
            });
            html += '</div></div>';
        } else if (r.length > 0) {
            html += '<div class="section"><div class="section-header"><h2>✅ Looking <span>Good</span></h2></div>';
            html += '<div class="resume-card" style="border-color:rgba(52,211,153,.12);background:rgba(52,211,153,.02)">';
            html += '<div><span style="font-size:1.5em">🎉</span></div>';
            html += '<div class="info"><h3>No weak areas detected!</h3><p>All your papers scored above 60%. Keep it up!</p></div>';
            html += '</div></div>';
        }

        html += '<div class="quick-actions" style="margin-top:8px;margin-bottom:40px">';
        html += '<a href="lab.html" class="btn btn-primary">🧪 Study Lab</a>';
        html += '<a href="leaderboard.html" class="btn btn-ghost">🏆 Leaderboard</a>';
        if (wrongCount > 0) {
            html += '<a href="mistakes.html" class="btn btn-ghost">❌ Review Mistakes (' + wrongCount + ')</a>';
        }
        html += '</div>';

        app.innerHTML = html;
    }

    function init() {
        supabaseUserCached = window.supabaseUser || null;
        if (typeof window.loadUserData === 'function' && supabaseUserCached) {
            window.loadUserData(function(data) {
                var d = mergeData(data);
                render(d);
            });
        } else {
            var d = mergeData(null);
            render(d);
        }
    }

    var tries = 0;
    function poll() {
        if (typeof window.supabaseUser !== 'undefined' || tries > 20) {
            init();
        } else {
            tries++;
            setTimeout(poll, 100);
        }
    }
    poll();

    var checkUser = setInterval(function() {
        var current = window.supabaseUser || null;
        if (current !== supabaseUserCached) {
            supabaseUserCached = current;
            if (typeof window.loadUserData === 'function' && current) {
                window.loadUserData(function(data) {
                    var d = mergeData(data);
                    render(d);
                });
            } else {
                var d = mergeData(null);
                render(d);
            }
        }
    }, 500);
})();
