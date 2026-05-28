(function(){
  var STORAGE_KEY = 'studypro_wrong';
  var RESULTS_KEY = 'studypro_results';
  var examName = document.title.replace(/[^a-zA-Z0-9]/g,'_');

  // ========== 1. DIFFICULTY TAGS ==========
  var difficulties = ['Easy','Medium','Hard'];
  function assignDifficulty(){
    document.querySelectorAll('.question').forEach(function(q,i){
      if(q.getAttribute('data-difficulty')) return;
      var idx = i % 3;
      q.setAttribute('data-difficulty',difficulties[idx].toLowerCase());
    });
  }
  assignDifficulty();

  document.querySelectorAll('.question').forEach(function(q){
    var d = q.getAttribute('data-difficulty');
    if(!d) return;
    var dot = document.createElement('span');
    dot.className = 'diff-dot diff-'+d;
    var label = d.charAt(0).toUpperCase()+d.slice(1);
    dot.textContent = label;
    var num = q.querySelector('.q-number');
    if(num) num.appendChild(dot);
  });

  // ========== 2. KEYBOARD SHORTCUTS ==========
  document.addEventListener('keydown', function(e){
    var key = parseInt(e.key);
    if(key >= 1 && key <= 4){
      var answered = document.querySelectorAll('.question.answered');
      var unanswered = document.querySelectorAll('.question:not(.answered)');
      if(unanswered.length === 0) return;
      var opts = unanswered[0].querySelectorAll('.q-option');
      if(opts[key-1]) opts[key-1].click();
    }
    if(e.key === 's' || e.key === 'S'){
      var unanswered = document.querySelectorAll('.question:not(.answered)');
      if(unanswered.length > 0){
        var btn = unanswered[0].querySelector('.show-soln');
        if(btn) btn.click();
      }
    }
    if(e.key === 'f' || e.key === 'F'){
      toggleFlashcard();
    }
  });

  // ========== 3. WRONG ANSWER BANK ==========
  function saveWrong(qEl){
    var qNum = qEl.querySelector('.q-number') ? qEl.querySelector('.q-number').textContent.trim() : 'Q?';
    var qText = qEl.querySelector('.q-text') ? qEl.querySelector('.q-text').textContent.trim() : '';
    var correctEl = qEl.querySelector('.q-option[data-correct]');
    var correct = correctEl ? correctEl.textContent.trim() : '';
    var wrongEl = qEl.querySelector('.q-option.wrong');
    var chosen = wrongEl ? wrongEl.textContent.trim() : '';
    var diff = qEl.getAttribute('data-difficulty') || 'medium';
    var section = qEl.querySelector('.section-badge') ? qEl.querySelector('.section-badge').textContent.trim() : 'General';
    var item = {
      id: STORAGE_KEY+'_'+examName+'_'+Date.now(),
      exam: document.title,
      qNum: qNum,
      qText: qText,
      correct: correct,
      chosen: chosen,
      difficulty: diff,
      section: section,
      date: new Date().toISOString()
    };
    var list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    list.unshift(item);
    if(list.length > 200) list = list.slice(0,200);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  // hook into existing click handler
  document.addEventListener('click', function(e){
    var opt = e.target.closest('.q-option');
    if(!opt) return;
    var q = opt.closest('.question');
    if(!q || q.classList.contains('answered')) return;
    setTimeout(function(){
      if(q.classList.contains('answered') && q.querySelector('.q-option.wrong')){
        saveWrong(q);
      }
    }, 50);
  });

  // ========== 4. PERFORMANCE DASHBOARD ==========
  var timerEl = document.getElementById('timer');
  var totalQs = document.querySelectorAll('.question').length;
  var startTime = Date.now();

  function showDashboard(forced){
    var answered = document.querySelectorAll('.question.answered').length;
    var correct = 0;
    var wrong = 0;
    var sectionData = {};
    document.querySelectorAll('.question.answered').forEach(function(q){
      var hasWrong = q.querySelector('.q-option.wrong');
      var sec = q.querySelector('.section-badge') ? q.querySelector('.section-badge').textContent.trim() : 'General';
      if(!sectionData[sec]) sectionData[sec] = {correct:0,wrong:0,total:0};
      sectionData[sec].total++;
      if(hasWrong){
        wrong++;
        sectionData[sec].wrong++;
      } else {
        correct++;
        sectionData[sec].correct++;
      }
    });

    var elapsed = Math.floor((Date.now() - startTime)/1000);
    var em = Math.floor(elapsed/60);
    var es = elapsed%60;
    var timeStr = (em<10?'0':'')+em+':'+(es<10?'0':'')+es;
    var pct = answered > 0 ? Math.round(correct/answered*100) : 0;

    // save result
    var result = {exam:document.title,date:new Date().toISOString(),correct:correct,wrong:wrong,total:totalQs,answered:answered,time:timeStr,pct:pct};
    var hist = JSON.parse(localStorage.getItem(RESULTS_KEY) || '[]');
    hist.unshift(result);
    if(hist.length > 50) hist = hist.slice(0,50);
    localStorage.setItem(RESULTS_KEY, JSON.stringify(hist));

    // build dashboard HTML
    var html = '<div class="dash-overlay"><div class="dash-modal">';
    html += '<h2 style="margin:0 0 8px;font-size:1.2em">📊 Performance</h2>';
    html += '<div class="dash-grid">';
    html += '<div class="dash-stat"><span class="dash-num">'+correct+'/'+answered+'</span><span class="dash-label">Correct</span></div>';
    html += '<div class="dash-stat"><span class="dash-num">'+pct+'%</span><span class="dash-label">Accuracy</span></div>';
    html += '<div class="dash-stat"><span class="dash-num">'+wrong+'</span><span class="dash-label">Wrong</span></div>';
    html += '<div class="dash-stat"><span class="dash-num">'+timeStr+'</span><span class="dash-label">Time</span></div>';
    html += '</div>';

    if(Object.keys(sectionData).length > 1){
      html += '<div style="margin-top:16px;font-size:.85em;font-weight:600;color:#a1a1aa">By Topic</div>';
      html += '<div class="dash-topics">';
      for(var s in sectionData){
        var sp = sectionData[s].total > 0 ? Math.round(sectionData[s].correct/sectionData[s].total*100) : 0;
        html += '<div class="dash-topic"><span>'+s+'</span><span class="dash-topic-pct" style="color:'+(sp>=60?'#34d399':'#ef4444')+'">'+sp+'%</span></div>';
      }
      html += '</div>';
    }

    html += '<div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap">';
    html += '<a href="../../mistakes.html" class="pc-btn" style="text-decoration:none">❌ Review Mistakes</a>';
    html += '<button class="pc-btn dash-close" style="background:#52525b">Close</button>';
    html += '</div></div></div>';

    var div = document.createElement('div');
    div.innerHTML = html;
    document.body.appendChild(div);
    div.querySelector('.dash-close').addEventListener('click',function(){ div.remove(); });
  }

  // auto-show when all answered
  document.addEventListener('click',function checkAllAnswered(){
    var all = document.querySelectorAll('.question');
    var answered = document.querySelectorAll('.question.answered');
    if(all.length > 0 && answered.length === all.length){
      setTimeout(showDashboard, 600);
    }
  });

  // auto-show when timer hits 0
  if(timerEl){
    var origTimer = window.setInterval;
    var origFn = timerEl.textContent;
    var checkTimer = setInterval(function(){
      if(timerEl.textContent === '00:00' || timerEl.textContent === '0:00'){
        clearInterval(checkTimer);
        setTimeout(showDashboard, 800);
      }
    }, 1000);
  }

  // ========== 5. FLASHCARD MODE ==========
  var flashActive = false;
  function toggleFlashcard(){
    flashActive = !flashActive;
    var all = document.querySelectorAll('.question');
    var hint = document.getElementById('flash-hint');
    if(flashActive){
      all.forEach(function(q,i){
        if(i > 0) q.style.display = 'none';
        q.style.cursor = 'pointer';
        var sol = q.querySelector('.solution-box');
        if(sol) sol.style.display = 'none';
      });
      if(!hint){
        hint = document.createElement('div');
        hint.id = 'flash-hint';
        hint.style.cssText = 'text-align:center;padding:12px;background:rgba(139,92,246,.1);border:1px solid rgba(139,92,246,.2);border-radius:10px;margin-bottom:16px;font-size:.9em;color:#a78bfa';
        hint.innerHTML = '🃏 Flashcard Mode: Tap to reveal answer &nbsp;|&nbsp; <b>F</b> to exit';
        var paper = document.querySelector('.paper-page');
        if(paper) paper.insertBefore(hint, paper.firstChild);
      }
      hint.style.display = 'block';
      if(document.querySelector('.question')) showFlashcard(0);
    } else {
      all.forEach(function(q){ q.style.display = ''; q.style.cursor = ''; });
      if(hint) hint.style.display = 'none';
      // hide all solutions
      document.querySelectorAll('.solution-box').forEach(function(s){ s.classList.remove('show'); });
    }
  }

  var flashIdx = 0;
  function showFlashcard(idx){
    var all = document.querySelectorAll('.question');
    all.forEach(function(q,i){ q.style.display = i === idx ? '' : 'none'; });
    var q = all[idx];
    if(!q) return;
    q.style.cursor = flashActive ? 'pointer' : '';
    // hide solution
    var sol = q.querySelector('.solution-box');
    if(sol) sol.style.display = 'none';
    // show q-number, q-text, options
    var opts = q.querySelectorAll('.q-option');
    // make clickable to reveal
    q.onclick = function(e){
      if(!flashActive) return;
      if(e.target.closest('.q-option') || e.target.closest('.show-soln')) return;
      var sol = q.querySelector('.solution-box');
      if(sol){
        sol.style.display = 'block';
        // highlight correct answer
        q.querySelectorAll('.q-option').forEach(function(o){ o.style.pointerEvents = 'none'; });
        var correct = q.querySelector('.q-option[data-correct]');
        if(correct) correct.classList.add('correct');
        q.classList.add('answered');
      }
    };
  }

  document.addEventListener('keydown', function(e){
    if(e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' '){
      if(flashActive){
        e.preventDefault();
        var all = document.querySelectorAll('.question');
        flashIdx = Math.min(flashIdx+1, all.length-1);
        showFlashcard(flashIdx);
      }
    }
    if(e.key === 'ArrowLeft' || e.key === 'ArrowUp'){
      if(flashActive){
        e.preventDefault();
        flashIdx = Math.max(flashIdx-1, 0);
        showFlashcard(flashIdx);
      }
    }
  });

  // ========== 6. DASHBOARD ACCESS BUTTON ==========
  var timerWrap = document.querySelector('.timer-bar');
  if(timerWrap){
    var dbBtn = document.createElement('span');
    dbBtn.textContent = '📊 Stats';
    dbBtn.style.cssText = 'cursor:pointer;font-size:.85em;color:#a78bfa;font-weight:600';
    dbBtn.onclick = showDashboard;
    timerWrap.appendChild(document.createTextNode(' '));
    timerWrap.appendChild(dbBtn);
  }

  // ========== 7. REVIEW BADGE ON NAV ==========
  var wrongCount = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]').length;
  if(wrongCount > 0){
    document.querySelectorAll('.site-nav a, .nav-links a').forEach(function(a){
      if(a.getAttribute('href') && a.getAttribute('href').includes('mistakes')){
        var badge = document.createElement('sup');
        badge.textContent = wrongCount;
        badge.style.cssText = 'background:#ef4444;color:#fff;font-size:.65em;padding:1px 6px;border-radius:100px;margin-left:4px';
        a.appendChild(badge);
      }
    });
  }
})();
