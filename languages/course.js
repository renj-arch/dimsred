/* vlymbooq Languages — shared course engine.
   Adds Google-translate pronunciation buttons, flip-card decks, and quizzes.
   Page defines: window.COURSE = { lang:'xx', decks:{ id:{title, cards:[{f,b,sayF}] } }, quizzes:{ id:{title, qs:[{q,o,a,fill,listen,say}] } } }
   Auto-voice: any element with class "nat"/"kana"/"letter" or [data-tts] gets a speaker button (data-tts="0" opts out). */
(function () {
    var C = {
        ttl: "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=",
        cache: {},
        lru: [],
        speaking: null,
        lang: "en"
    };

    function play(text, lang) {
        text = (text || "").trim();
        if (!text) return;
        lang = lang || C.lang;
        var url = C.ttl + encodeURIComponent(lang) + "&q=" + encodeURIComponent(text);
        var a = C.cache[url];
        if (a) { stop(); a.currentTime = 0; a.play(); return; }
        a = new Audio(url);
        a.addEventListener("error", function () { console.warn("TTS unavailable for", lang, text); });
        stop();
        a.play();
        C.cache[url] = a;
        C.lru.push(url);
        if (C.lru.length > 40) { delete C.cache[C.lru.shift()]; }
        C.speaking = a;
    }
    function stop() { if (C.speaking) { try { C.speaking.pause(); } catch (e) {} } }

    function iconHTML() {
        return '<svg class="tts-icon" viewBox="0 0 20 20" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="M6 4h8M6 4v12M14 4v12M6 4l4 2.5v9L6 16M6 4L2 6v8l4 2"/><path fill="currentColor" d="M10 6.5l4 2.5v9l-4 2.5z"/></svg>';
    }

    function skip(text) {
        text = (text || "").trim();
        if (!text) return true;
        if (/^[-—–*+]*$/.test(text)) return true;
        if (text.length > 240) return true;
        return false;
    }

    function colLang(el) {
        var row = el.parentNode, tds = row ? Array.prototype.slice.call(row.children) : [];
        var idx = tds.indexOf(el);
        if (idx < 0) return null;
        var table = el.closest ? el.closest("table") : null;
        if (!table) return null;
        var trs = table.querySelectorAll("tr");
        for (var h = 0; h < trs.length; h++) {
            var ths = trs[h].children;
            if (ths.length && ths[0].tagName === "TH" && ths[idx] && ths[idx].getAttribute && ths[idx].getAttribute("data-lang")) {
                return ths[idx].getAttribute("data-lang");
            }
        }
        return null;
    }

    function wire() {
        document.querySelectorAll(".nat, .kana, .letter, [data-tts]").forEach(function (el) {
            if (el.closest ? el.closest(".no-tts") : false) return;
            if (el.getAttribute("data-tts") === "0") return;
            if (el.querySelector(".tts-btn")) return;
            var text = el.getAttribute("data-tts") || el.textContent;
            if (skip(text)) return;
            var lang = el.getAttribute("data-lang") || colLang(el) || (el.closest && el.closest("[data-lang]") ? el.closest("[data-lang]").getAttribute("data-lang") : C.lang) || C.lang;
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "tts-btn";
            btn.setAttribute("aria-label", "Play pronunciation");
            btn.innerHTML = iconHTML();
            btn.addEventListener("click", function (e) { e.stopPropagation(); play(text, lang); });
            el.appendChild(btn);
        });
    }

    function esc(s) { return String(s).replace(/[&<>"']/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]; }); }

    function norm(s) { return String(s || "").trim().toLowerCase().replace(/\s+/g, " "); }

    function renderDeck(id, cfg) {
        var host = document.getElementById(id);
        if (!host || !cfg) return;
        var html = '<div class="deck"><div class="deck-toolbar"><button type="button" class="deck-prev">‹</button>';
        html += '<span class="deck-count"></span><button type="button" class="deck-next">›</button></div>';
        html += '<div class="deck-grid"></div></div>';
        host.innerHTML = html;
        var grid = host.querySelector(".deck-grid");
        cfg.cards.forEach(function (card, i) {
            var f = esc(card.f), b = esc(card.b);
            var fb = card.sayF ? '<button type="button" class="tts-btn" data-t="' + i + '">' + iconHTML() + "</button>" : "";
            grid.insertAdjacentHTML("beforeend",
                '<div class="flip" data-i="' + i + '"><div class="flip-inner">' +
                '<div class="flip-face flip-front">' + f + fb + "</div>" +
                '<div class="flip-face flip-back">' + b + "</div>" +
                "</div></div>");
        });
        var cards = grid.querySelectorAll(".flip"), idx = 0, total = cfg.cards.length;
        var countEl = host.querySelector(".deck-count");
        function show(n) {
            idx = (n + total) % total;
            cards.forEach(function (c, i) { c.classList.toggle("hide", i !== idx); });
            countEl.textContent = (idx + 1) + " / " + total;
        }
        grid.addEventListener("click", function (e) { if (e.target.closest(".tts-btn")) { cardSay(e.target.getAttribute("data-t")); return; } cards[idx].classList.toggle("flipped"); });
        host.querySelector(".deck-prev").addEventListener("click", function () { show(idx - 1); });
        host.querySelector(".deck-next").addEventListener("click", function () { show(idx + 1); });
        function cardSay(i) { play(cfg.cards[+i].f, C.lang); }
        show(0);
    }

    function renderQuiz(id, cfg) {
        var host = document.getElementById(id);
        if (!host || !cfg) return;
        var html = '<div class="quiz"><div class="quiz-score">Score: <b>0</b> / <span>' + cfg.qs.length + "</span></div>";
        cfg.qs.forEach(function (q, qi) {
            html += '<div class="quiz-q" data-q="' + qi + '"><p class="quiz-prompt">' + esc(q.q);
            if (q.listen) html += ' <button type="button" class="tts-btn q-listen"></button>';
            if (q.say) html += ' <button type="button" class="tts-btn q-say"></button>';
            html += "</p>";
            if (q.fill) {
                html += '<div class="quiz-answer"><input type="text" data-fill="' + qi + '" placeholder="Type your answer…"></div><div class="quiz-fb"></div>';
            } else {
                html += '<div class="quiz-opts">';
                q.o.forEach(function (opt, oi) {
                    html += '<button type="button" data-opt="' + qi + "-" + oi + '">' + esc(opt) + "</button>";
                });
                html += '</div><div class="quiz-fb"></div>';
            }
            html += "</div>";
        });
        html += '<button type="button" class="quiz-reset">Reset</button></div>';
        host.innerHTML = html;
        host.querySelectorAll(".q-listen").forEach(function (b, qi) {
            b.innerHTML = iconHTML();
            b.addEventListener("click", function () { play(cfg.qs[qi].listen, C.lang); });
        });
        host.querySelectorAll(".q-say").forEach(function (b, qi) {
            b.innerHTML = iconHTML();
            b.addEventListener("click", function () { play(cfg.qs[qi].say, C.lang); });
        });
        var score = 0, scoreEl = host.querySelector(".quiz-score b"), answered = {};
        function mark(qi, ok, msg) {
            var fb = host.querySelector('[data-q="' + qi + '"] .quiz-fb');
            fb.textContent = ok ? "✓ " + msg : "✗ " + msg;
            fb.className = "quiz-fb " + (ok ? "good" : "bad");
            if (!(qi in answered)) { answered[qi] = 1; if (ok) score++; scoreEl.textContent = score; }
        }
        host.querySelectorAll("[data-opt]").forEach(function (b) {
            b.addEventListener("click", function () {
                var p = b.getAttribute("data-opt").split("-"), qi = +p[0], oi = +p[1];
                var q = cfg.qs[qi];
                b.parentElement.querySelectorAll("button").forEach(function (x) { x.classList.remove("sel"); x.disabled = true; });
                b.classList.add("sel");
                if (oi === q.a) mark(qi, true, q.ex || "Correct!");
                else { b.classList.add("bad-sel"); mark(qi, false, (q.ex || "Correct answer:") + (q.o[q.a] !== undefined ? " " + q.o[q.a] : "")); markSelCorrect(qi); }
                function markSelCorrect(qi2) { host.querySelectorAll('[data-opt^="' + qi2 + '-"]')[q.a].classList.add("good-sel"); }
            });
        });
        host.querySelectorAll("[data-fill]").forEach(function (inp) {
            inp.addEventListener("keydown", function (e) { if (e.key !== "Enter") return; var qi = +inp.getAttribute("data-fill"); var q = cfg.qs[qi]; var ok = norm(inp.value) === norm(q.a); mark(qi, ok, ok ? (q.ex || "Correct!") : (q.ex || "Expected: the space-separated form")); });
        });
        host.querySelector(".quiz-reset").addEventListener("click", function () { renderQuiz(id, cfg); });
    }

    function storeGet(key) { try { return JSON.parse(localStorage.getItem(key) || "null") || {}; } catch (e) { return {}; } }
    function storeSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }

    function renderWords(id, cfg) {
        var host = document.getElementById(id);
        if (!host || !cfg || !cfg.words) return;
        var lang = cfg.lang || C.lang;
        var base = "vlymbooq_words_" + (lang || "xx");
        var st = storeGet(base), mastered = {};
        (st.inds || []).forEach(function (i) { mastered[i] = 1; });
        var total = cfg.words.length;
        var html = '<div class="wtr"><div class="wtr-head"><div class="wtr-progress"><div class="wtr-bar"><div class="wtr-fill"></div></div>';
        html += '<div class="wtr-count">' + Object.keys(mastered).length + " / " + (total > 200 ? total : total) + " mastered</div></div>";
        html += '<input class="wtr-search" type="search" placeholder="Search…"></div><div class="wtr-quick"><button type="button" class="wtr-quizbtn">🎯 Quick recall (speak & pick)</button></div>';
        html += '<table class="wtr-table"><thead><tr><th>Word</th><th>Meaning</th><th></th></tr></thead><tbody></tbody></table></div>';
        host.innerHTML = html;
        var tbody = host.querySelector(".wtr-table tbody");
        function word(i) { return cfg.words[i]; }
        function rowHTML(i) {
            var w = word(i), m = mastered[i];
            return '<tr data-w="' + i + '"><td><button type="button" class="tts-btn wtr-speak"></button><span class="wtr-tok">' + esc(w[0]) + "</span></td>" +
                '<td class="wtr-w">' + esc(w[1]) + (w[2] ? '<span class="wtr-note"> · ' + esc(w[2]) + "</span>" : "") + "</td>" +
                '<td><button type="button" class="wtr-save">' + (m ? "✓ Mastered" : "Learn") + "</button></td></tr>";
        }
        cfg.words.forEach(function (_, i) { tbody.insertAdjacentHTML("beforeend", rowHTML(i)); });
        function paint() {
            var n = Object.keys(mastered).length;
            host.querySelector(".wtr-count").textContent = n + " / " + total + " mastered";
            host.querySelector(".wtr-fill").style.width = Math.round(100 * n / total) + "%";
            tbody.querySelectorAll("[data-w]").forEach(function (tr) {
                var i = +tr.getAttribute("data-w");
                var b = tr.querySelector(".wtr-save");
                b.textContent = mastered[i] ? "✓ Mastered" : "Learn";
                b.classList.toggle("on", !!mastered[i]);
            });
        }
        function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
        function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
        tbody.addEventListener("click", function (e) {
            var tr = e.target.closest("[data-w]");
            if (!tr) return;
            var i = +tr.getAttribute("data-w");
            if (e.target.closest(".wtr-speak")) { play(word(i)[0], lang); return; }
            if (e.target.closest(".wtr-save")) {
                if (mastered[i]) delete mastered[i]; else mastered[i] = 1;
                st.inds = Object.keys(mastered).map(Number);
                storeSet(base, st); paint();
            }
        });
        host.querySelector(".wtr-search").addEventListener("input", function (e) {
            var q = norm(e.target.value);
            tbody.querySelectorAll("[data-w]").forEach(function (tr) {
                var i = +tr.getAttribute("data-w");
                tr.style.display = (norm(word(i)[0] + " " + word(i)[1]).indexOf(q) >= 0) ? "" : "none";
            });
        });
        host.querySelector(".wtr-quizbtn").addEventListener("click", function () {
            var pool = [];
            cfg.words.forEach(function (_, i) { if (!mastered[i]) pool.push(i); });
            if (!pool.length) { pool = cfg.words.map(function (_, i) { return i; }); }
            pool = shuffle(pool).slice(0, 8);
            var score = 0, qn = 0;
            function nextQ(spoken) {
                if (qn >= pool.length) {
                    pool.forEach(function (i) { if (!mastered[i]) { mastered[i] = 1; st.inds = Object.keys(mastered).map(Number); } });
                    storeSet(base, st); paint();
                    host.querySelector(".wtr-quick").insertAdjacentHTML("beforeend",
                        '<div class="wtr-res ' + (score === pool.length ? "good" : "") + '">Round done — ' + score + "/" + pool.length + (score === pool.length ? " perfect! All reviewed words mastered." : " words marked mastered.") + "</div>");
                    return;
                }
                var ci = pool[qn], cw = word(ci);
                var opts = [cw[1]];
                var guards = 0;
                while (opts.length < 4 && guards++ < 200) { var o = pick(cfg.words)[1]; if (opts.indexOf(o) < 0) opts.push(o); }
                opts = shuffle(opts);
                var qbox = host.querySelector(".wtr-quick");
                qbox.insertAdjacentHTML("beforeend", '<div class="wtr-q" data-c="' + ci + '"><p><span class="wtr-q-note">' + (qn + 1) + "/" + pool.length + "</span> What does this mean? <button type=\"button\" class=\"tts-btn\" data-qsay=\"1\"></button></p><div class=\"quiz-opts\">" +
                    opts.map(function (o, k) { return '<button type="button" data-q="' + k + '">' + esc(o) + "</button>"; }).join("") + "</div><div class=\"quiz-fb\"></div></div>");
                var qel = qbox.querySelector(".wtr-q:last-child");
                qel.querySelector("[data-qsay]").innerHTML = iconHTML();
                qel.querySelector("[data-qsay]").addEventListener("click", function () { play(cw[0], lang); });
                play(cw[0], lang);
                QUIZOPTS(qel).forEach(function (b) {
                    b.addEventListener("click", function () {
                        QUIZOPTS(qel).forEach(function (x) { x.disabled = true; });
                        var ok = b.getAttribute("data-q") === String(opts.indexOf(cw[1]));
                        if (ok) { b.classList.add("good-sel"); score++; } else b.classList.add("bad-sel");
                        qel.querySelector(".quiz-fb").textContent = ok ? "✓ " + cw[1] : "✗ " + cw[1];
                        qel.querySelector(".quiz-fb").className = "quiz-fb " + (ok ? "good" : "bad");
                        qn++; nextQ();
                    });
                });
            }
            function QUIZOPTS(el) { return el.querySelectorAll("[data-q]"); }
            nextQ();
        });
        paint();
        st.last = new Date().toDateString(); storeSet(base, st);
    }

    function renderListen(id, cfg) {
        var host = document.getElementById(id);
        if (!host || !cfg) return;
        var lang = cfg.lang || C.lang, i = 0, score = 0, done = 0;
        var html = '<div class="ltd"><div class="ltd-hint"></div><div class="ltd-ftr"><button type="button" class="ltd-play"></button>';
        html += '<span class="ltd-count"></span></div><div class="ltd-answer"><input type="text" placeholder="Type what you hear…"></div>';
        html += '<div class="quiz-fb"></div><div class="ltd-actions"><button type="button" class="ltd-show" disabled>Reveal</button><button type="button" class="ltd-next" disabled>Next →</button></div></div>';
        host.innerHTML = html;
        var inp = host.querySelector("input"), fb = host.querySelector(".quiz-fb"), plc = host.querySelector(".ltd-play");
        function item() { return cfg.items[i]; }
        function show() {
            var it = item();
            host.querySelector(".ltd-hint").textContent = it.trans;
            host.querySelector(".ltd-count").textContent = (i + 1) + " / " + cfg.items.length;
            inp.value = ""; fb.textContent = ""; fb.className = "quiz-fb"; inp.disabled = false; inp.focus();
            host.querySelector(".ltd-show").disabled = false; host.querySelector(".ltd-next").disabled = true;
        }
        plc.addEventListener("click", function () { play(item().say, lang); });
        function check() {
            var ok = norm(inp.value) === norm(item().say);
            if (ok) score++;
            done++;
            inp.disabled = true; host.querySelector(".ltd-show").disabled = true;
            fb.textContent = ok ? "✓ Perfect. " + item().say : "You heard: “" + item().say + "”";
            fb.className = "quiz-fb " + (ok ? "good" : "bad");
            if (i >= cfg.items.length - 1) {
                host.querySelector(".ltd-next").textContent = "Finish";
                host.querySelector(".ltd-actions").insertAdjacentHTML("beforeend", '<button type="button" class="ltd-restart">Restart</button>');
                host.querySelector(".ltd-restart").addEventListener("click", function () { host.querySelector(".ltd-actions .ltd-restart").remove(); renderListen(id, cfg); });
            }
            host.querySelector(".ltd-next").disabled = false;
        }
        inp.addEventListener("keydown", function (e) { if (e.key !== "Enter" && e.keyCode !== 13) return; if (inp.disabled) return; check(); });
        host.querySelector(".ltd-next").addEventListener("click", function () {
            if (i >= cfg.items.length - 1) {
                fb.textContent = "Round complete — you got " + score + "/" + done + " exactly right. Replay the ones you missed!";
                fb.className = "quiz-fb " + (score === done ? "good" : "bad");
                inp.disabled = true; host.querySelector(".ltd-next").disabled = true; host.querySelector(".ltd-play").disabled = true;
                return;
            }
            i++; show();
        });
        host.querySelector(".ltd-show").addEventListener("click", function () { fb.textContent = "It was: “" + item().say + "” (" + (item().hint || "") + ")"; fb.className = "quiz-fb"; });
        show();
    }

    function renderReview(id, cfg) {
        var host = document.getElementById(id);
        if (!host || !cfg) return;
        var base = "vlymbooq_words_" + (cfg.lang || C.lang);
        var st = storeGet(base), inds = st.inds || [], total = cfg.total || 0;
        var doneToday = (st.last || "") === new Date().toDateString();
        var allDone = total > 0 && inds.length >= total;
        if (doneToday || allDone) return;
        host.innerHTML = '<div class="rev"><div><b>📅 Daily review</b> — <span class="rev-count">' + inds.length + '/' + total + ' words</span> mastered so far. A few minutes a day beats a marathon.</div><button type="button" class="rev-go">Review the word list</button></div>';
        host.querySelector(".rev-go").addEventListener("click", function () {
            var t = document.getElementById(cfg.target);
            if (t && t.scrollIntoView) t.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    }

    function css() {
        var s = document.createElement("style");
        s.id = "course-css";
        s.textContent = [
            ".tts-btn{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;margin-left:8px;padding:0;border:1px solid rgba(167,139,250,.35);border-radius:50%;background:rgba(167,139,250,.12);color:var(--purple);cursor:pointer;transition:all .15s;vertical-align:middle;flex-shrink:0}",
            ".tts-btn:hover{background:rgba(167,139,250,.28);color:#fff}",
            ".tts-btn:active{transform:scale(.9)}",
            ".card .tts-btn{margin:0 0 0 8px}",
            ".no-tts .tts-btn{display:none}",
            ".deck{max-width:560px;margin:14px auto 0}",
            ".deck-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}",
            ".deck-toolbar button{background:rgba(255,255,255,.05);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:5px 14px;font-size:1em;cursor:pointer}",
            ".deck-toolbar button:hover{background:rgba(255,255,255,.1)}",
            ".deck-count{font-size:.8em;color:var(--text-sec)}",
            ".deck-grid{min-height:180px;perspective:1000px}",
            ".flip{width:100%;height:180px;cursor:pointer}",
            ".flip.hide{display:none}",
            ".flip-inner{position:relative;width:100%;height:100%;transition:transform .5s;transform-style:preserve-3d}",
            ".flip.flipped .flip-inner{transform:rotateY(180deg)}",
            ".flip-face{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;padding:16px;border-radius:12px;border:1px solid var(--border);backface-visibility:hidden;font-size:1.15em;color:var(--text);background:linear-gradient(145deg,#151519,#0d0d10);text-align:center}",
            ".flip-face .tts-btn{position:absolute;bottom:12px;right:12px}",
            ".flip-back{transform:rotateY(180deg);background:linear-gradient(145deg,#151a1a,#0d0d10);color:var(--emerald)}",
            ".quiz{margin-top:6px}",
            ".quiz-score{font-size:.85em;color:var(--text-sec);margin-bottom:10px}",
            ".quiz-score b{color:var(--purple)}",
            ".quiz-q{border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin:12px 0;background:rgba(255,255,255,.02)}",
            ".quiz-prompt{font-size:.9em;color:var(--text);margin-bottom:10px;display:flex;align-items:center;gap:4px;flex-wrap:wrap}",
            ".quiz-opts{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px}",
            ".quiz-opts button,.quiz-answer input{background:rgba(255,255,255,.04);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:8px 12px;font-size:.86em;cursor:pointer;text-align:left}",
            ".quiz-opts button:hover{background:rgba(255,255,255,.09)}",
            ".quiz-opts button.sel{outline:2px solid var(--purple)}",
            ".quiz-opts button.good-sel{outline:2px solid var(--emerald)}",
            ".quiz-opts button.bad-sel{outline:2px solid #f87171}",
            ".quiz-answer input{width:100%;margin-top:8px;font-family:inherit}",
            ".quiz-fb{margin-top:10px;font-size:.82em;min-height:1.2em}",
            ".quiz-fb.good{color:var(--emerald)}",
            ".quiz-fb.bad{color:#f87171}",
            ".quiz-q .q-listen,.quiz-q .q-say{width:24px;height:24px;margin-left:6px}",
            ".quiz-reset{background:rgba(255,255,255,.05);border:1px solid var(--border);color:var(--text-sec);border-radius:8px;padding:6px 16px;font-size:.82em;cursor:pointer;margin-top:6px}",
            ".quiz-reset:hover{color:var(--text);background:rgba(255,255,255,.1)}",
            ".wtr-head{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:12px}",
            ".wtr-progress{flex:1;min-width:200px}",
            ".wtr-bar{height:8px;border-radius:100px;background:rgba(255,255,255,.06);overflow:hidden}",
            ".wtr-fill{height:100%;width:0%;background:linear-gradient(90deg,var(--purple),var(--emerald));transition:width .3s}",
            ".wtr-count{font-size:.78em;color:var(--text-sec);margin-top:5px}",
            ".wtr-search{flex:0 0 180px;background:rgba(255,255,255,.04);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:7px 12px;font-size:.82em;font-family:inherit}",
            ".wtr-quick{margin:6px 0 12px}",
            ".wtr-quick .wtr-quizbtn,.rev-go{background:linear-gradient(135deg,rgba(167,139,250,.16),rgba(52,211,153,.16));border:1px solid rgba(167,139,250,.35);color:var(--text);border-radius:8px;padding:7px 14px;font-size:.82em;cursor:pointer}",
            ".wtr-quick .wtr-quizbtn:hover,.rev-go:hover{filter:brightness(1.15)}",
            ".wtr-table{font-size:.82em;margin-top:4px}",
            ".wtr-table td,.wtr-table th{padding:6px 10px}",
            ".wtr-tok{font-size:1.15em;color:var(--text)}",
            ".wtr-w{font-size:.9em}",
            ".wtr-note{color:var(--text-muted);font-size:.82em}",
            ".wtr-save{background:rgba(255,255,255,.05);border:1px solid var(--border);color:var(--text-sec);border-radius:8px;padding:4px 12px;font-size:.76em;cursor:pointer;white-space:nowrap}",
            ".wtr-save.on{background:rgba(52,211,153,.15);border-color:rgba(52,211,153,.4);color:var(--emerald)}",
            ".wtr-save:hover{color:var(--text)}",
            ".wtr-q{border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-top:10px;background:rgba(255,255,255,.02)}",
            ".wtr-q-note{font-weight:700;color:var(--purple);margin-right:8px}",
            ".wtr-q .quiz-opts{margin-top:8px}",
            ".wtr-res{font-size:.82em;color:var(--text-sec);margin-top:10px;padding:8px 12px;border:1px solid var(--border);border-radius:8px}",
            ".wtr-res.good{color:var(--emerald);border-color:rgba(52,211,153,.35)}",
            ".ltd-hint{font-size:.95em;color:var(--text);margin-bottom:6px}",
            ".ltd-ftr{display:flex;align-items:center;gap:14px;margin-bottom:8px}",
            ".ltd-count{font-size:.78em;color:var(--text-sec)}",
            ".ltd-play{background:rgba(167,139,250,.14);border:1px solid rgba(167,139,250,.4);color:var(--purple);border-radius:100px;padding:6px 18px;font-size:.82em;cursor:pointer}",
            ".ltd-play:hover{background:rgba(167,139,250,.26);color:#fff}",
            ".ltd-answer input{width:100%;background:rgba(255,255,255,.04);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:9px 12px;font-size:.92em;font-family:inherit}",
            ".ltd-actions{display:flex;gap:10px;margin-top:10px}",
            ".ltd-actions button{background:rgba(255,255,255,.05);border:1px solid var(--border);color:var(--text-sec);border-radius:8px;padding:6px 16px;font-size:.8em;cursor:pointer}",
            ".ltd-actions button:not([disabled]):hover{color:var(--text);background:rgba(255,255,255,.1)}",
            ".ltd-actions button:disabled{opacity:.4;cursor:default}",
            ".rev{display:flex;align-items:center;gap:14px;flex-wrap:wrap;background:rgba(251,191,36,.05);border:1px solid rgba(251,191,36,.18);border-radius:10px;padding:12px 16px;font-size:.84em;color:var(--text)}",
            ".rev .rev-count{color:var(--amber)}"
        ].join("\n");
        document.head.appendChild(s);
    }

    document.addEventListener("DOMContentLoaded", function () {
        if (window.COURSE) C.lang = COURSE.lang || C.lang;
        css();
        wire();
        if (window.COURSE) {
            Object.keys(COURSE.decks || {}).forEach(function (id) { renderDeck(id, COURSE.decks[id]); });
            Object.keys(COURSE.quizzes || {}).forEach(function (id) { renderQuiz(id, COURSE.quizzes[id]); });
            Object.keys(COURSE.wordTrainers || {}).forEach(function (id) { renderWords(id, COURSE.wordTrainers[id]); });
            Object.keys(COURSE.listenDrills || {}).forEach(function (id) { renderListen(id, COURSE.listenDrills[id]); });
            Object.keys(COURSE.reviews || {}).forEach(function (id) { renderReview(id, COURSE.reviews[id]); });
        }
    });
})();