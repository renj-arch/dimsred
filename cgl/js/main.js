(function(){
    // Click-to-answer on options
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

    // Show answer button
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

    // Timer
    var timerEl = document.getElementById('timer');
    if(timerEl){
        var total = 60 * 60;
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
})();
