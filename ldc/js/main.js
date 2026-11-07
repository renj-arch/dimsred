(function(){
    document.querySelectorAll('.q-option').forEach(function(opt){
        opt.addEventListener('click', function(){
            var parent = this.closest('.question');
            if(parent.classList.contains('answered')) return;
            var isCorrect = this.hasAttribute('data-correct');
            parent.querySelectorAll('.q-option').forEach(function(o){ o.style.pointerEvents='none' });
            if(isCorrect){
                this.classList.add('correct');
            } else {
                this.classList.add('wrong');
                parent.querySelector('.q-option[data-correct]').classList.add('correct');
            }
            parent.classList.add('answered');
        });
    });

    document.querySelectorAll('.show-soln').forEach(function(btn){
        btn.addEventListener('click', function(){
            var box = this.nextElementSibling;
            if(box && box.classList.contains('solution-box')){
                box.classList.toggle('show');
                var parent = this.closest('.question');
                if(!parent.classList.contains('answered')){
                    parent.querySelector('.q-option[data-correct]').classList.add('correct');
                    parent.querySelectorAll('.q-option').forEach(function(o){ o.style.pointerEvents='none' });
                    parent.classList.add('answered');
                }
            }
        });
    });

    var timerEl = document.getElementById('timer');
    if(timerEl){
        var parts = timerEl.textContent.split(':');
        var total = parseInt(parts[0]) * 60 + parseInt(parts[1]);
        var tick = function(){
            var m = Math.floor(total / 60);
            var s = total % 60;
            timerEl.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
            if(total <= 300) timerEl.classList.add('warning');
            if(total > 0) total--;
        };
        tick();
        setInterval(tick, 1000);
    }

    // SUBMIT BUTTON
    var pp = document.querySelector('.paper-page');
    if(pp){
        var submitBtn = document.createElement('button');
        submitBtn.textContent = 'Submit & View Score';
        submitBtn.id = 'submitBtn';
        submitBtn.style.cssText = 'display:block;margin:32px auto;padding:14px 40px;border-radius:100px;font-size:1em;font-weight:700;border:none;cursor:pointer;background:linear-gradient(135deg,#a78bfa,#8b5cf6);color:#fff;box-shadow:0 4px 24px rgba(139,92,246,.3);transition:all .25s';
        pp.appendChild(submitBtn);

        // RESULT MODAL
        var overlay = document.createElement('div');
        overlay.id = 'resultOverlay';
        overlay.style.cssText = 'display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.7);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);justify-content:center;align-items:center';
        var modal = document.createElement('div');
        modal.id = 'resultModal';
        modal.style.cssText = 'background:#111113;border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:36px 40px;max-width:440px;width:90%;text-align:center;box-shadow:0 24px 80px rgba(0,0,0,.5)';
        modal.innerHTML = '<h2 style="font-size:1.5em;font-weight:800;margin-bottom:6px;background:linear-gradient(135deg,#a78bfa,#34d399);-webkit-background-clip:text;-webkit-text-fill-color:transparent">Test Result</h2><div id="scoreDisplay" style="font-size:3.2em;font-weight:900;margin:18px 0 6px;color:#fafafa">0</div><div style="font-size:.82em;color:#a1a1aa;margin-bottom:20px">Score (Correct &times; 1 &minus; Wrong &times; 0.25)</div><div id="statsGrid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:22px"></div><div id="percentBar" style="height:6px;border-radius:3px;background:rgba(255,255,255,.06);overflow:hidden;margin-bottom:6px"><div id="percentFill" style="height:100%;width:0%;border-radius:3px;background:linear-gradient(90deg,#a78bfa,#34d399);transition:width .6s"></div></div><div id="percentLabel" style="font-size:.8em;color:#a1a1aa;margin-bottom:22px">0%</div><button id="closeResult" style="padding:12px 28px;border-radius:100px;font-size:.88em;font-weight:600;border:1px solid rgba(255,255,255,.1);background:transparent;color:#fafafa;cursor:pointer;transition:all .2s">Close</button>';
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        submitBtn.addEventListener('click', function(){
            var questions = pp.querySelectorAll('.question');
            var correct = 0, wrong = 0, unanswered = 0;
            questions.forEach(function(q){
                var selected = q.querySelector('.q-option.correct, .q-option.wrong');
                if(!selected){
                    unanswered++;
                } else if(selected.classList.contains('correct') && selected.hasAttribute('data-correct')){
                    correct++;
                } else if(selected.classList.contains('wrong')){
                    wrong++;
                }
            });
            var totalQs = questions.length;
            var attempted = totalQs - unanswered;
            var score = (correct * 1) - (wrong * 0.25);
            var percent = totalQs > 0 ? Math.round((score / totalQs) * 100) : 0;

            document.getElementById('scoreDisplay').textContent = score.toFixed(2);
            document.getElementById('statsGrid').innerHTML = 
                '<div style="background:rgba(52,211,153,.1);border-radius:10px;padding:12px 6px"><div style="font-size:1.6em;font-weight:800;color:#34d399">'+correct+'</div><div style="font-size:.7em;color:#a1a1aa">Correct</div></div>' +
                '<div style="background:rgba(239,68,68,.1);border-radius:10px;padding:12px 6px"><div style="font-size:1.6em;font-weight:800;color:#ef4444">'+wrong+'</div><div style="font-size:.7em;color:#a1a1aa">Wrong</div></div>' +
                '<div style="background:rgba(161,161,170,.08);border-radius:10px;padding:12px 6px"><div style="font-size:1.6em;font-weight:800;color:#a1a1aa">'+unanswered+'</div><div style="font-size:.7em;color:#a1a1aa">Unanswered</div></div>' +
                '<div style="grid-column:span 3;background:rgba(139,92,246,.1);border-radius:10px;padding:10px 6px"><div style="font-size:1.1em;font-weight:700;color:#a78bfa">Attempted: '+attempted+' / '+totalQs+'</div></div>';

            document.getElementById('percentFill').style.width = percent + '%';
            document.getElementById('percentLabel').textContent = percent + '%';
            overlay.style.display = 'flex';
        });

        document.getElementById('closeResult').addEventListener('click', function(){
            overlay.style.display = 'none';
        });
        overlay.addEventListener('click', function(e){
            if(e.target === overlay) overlay.style.display = 'none';
        });
    }
})();
