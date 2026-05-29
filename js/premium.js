(function(){
  var KEY_PREMIUM = 'studypro_premium';
  var KEY_VAULT = 'vlymbooq_codevault';

  var KEY_CONSUMED = 'vlymbooq_consumed';
  var API = '/api/validate-code';

  function consumed() {
    return JSON.parse(localStorage.getItem(KEY_CONSUMED) || '[]');
  }

  function markConsumed(code) {
    var c = consumed();
    c.push(code);
    localStorage.setItem(KEY_CONSUMED, JSON.stringify(c));
  }

  function vault() {
    var v = JSON.parse(localStorage.getItem(KEY_VAULT) || '{}');
    return v;
  }

  function saveVault(v) {
    localStorage.setItem(KEY_VAULT, JSON.stringify(v));
  }

  function getPremium() {
    var raw = localStorage.getItem(KEY_PREMIUM);
    if (!raw) return null;
    try {
      var p = JSON.parse(raw);
      if (!p || !p.active || !p.plan || !p.expiresAt) return null;
      if (typeof p.active !== 'boolean' || typeof p.plan !== 'string' || typeof p.expiresAt !== 'string') return null;
      if (['Monthly','Yearly'].indexOf(p.plan) === -1) return null;
      return p;
    } catch(e) {
      return null;
    }
  }

  function setPremium(data) {
    localStorage.setItem(KEY_PREMIUM, JSON.stringify(data));
    updateUI();
  }

  function esc(s) { return String(s).replace(/[&<>"']/g, function(c) { return '&#' + c.charCodeAt(0) + ';'; }); }

  var EXAM_LABELS = { cgl: 'SSC CGL', rbi: 'RBI Grade B', jee: 'JEE Main', neet: 'NEET UG', gate: 'GATE', agniveer: 'Agniveer' };
  var EXAM_ICONS = { cgl: '\uD83D\uDCD6', rbi: '\uD83C\uDFE6', jee: '\uD83D\uDD2C', neet: '\u2695\uFE0F', gate: '\uD83D\uDEE0\uFE0F', agniveer: '\uD83C\uDF93' };

  function loadPDFs() {
    var p = getPremium();
    var code = (p && p.code) || '';
    var allowedExams = (p && p.exams) || [];
    var allAccess = allowedExams.length === 0;
    var list = document.getElementById('pdfList');
    var loading = document.getElementById('pdfLoading');
    var ds = document.getElementById('downloadsSection');
    if (!list || !loading || !ds) return;

    if (allowedExams.length > 0 && !allAccess) {
      var examNames = allowedExams.map(function(e) { return EXAM_LABELS[e] || e.toUpperCase(); }).join(', ');
      ds.innerHTML = '<h2>\uD83D\uDCE5 <span>Weekly PDF</span> Downloads</h2><p style="margin-bottom:12px;font-size:.82em;color:var(--text-secondary)">Your code covers: <strong>' + esc(examNames) + '</strong></p><div id="pdfList"></div><div id="pdfLoading" style="text-align:center;padding:16px;color:var(--text-secondary);font-size:.82em">Loading available PDFs...</div>';
      list = document.getElementById('pdfList');
      loading = document.getElementById('pdfLoading');
    }

    fetch('/pdfs/latest.json?_=' + Date.now())
      .then(function(r) {
        if (!r.ok) throw new Error('No PDFs yet');
        return r.json();
      })
      .then(function(data) {
        loading.style.display = 'none';
        var html = '';

        for (var exam in data) {
          if (!allAccess && allowedExams.indexOf(exam) === -1) continue;
          var entry = data[exam];
          var label = EXAM_LABELS[exam] || exam.toUpperCase();
          var icon = EXAM_ICONS[exam] || '\uD83D\uDCC4';
          var dlUrl = '/api/serve-pdf?code=' + encodeURIComponent(code) + '&file=' + encodeURIComponent(entry.filename);
          html += '<div class="feature-item" style="text-align:left;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px">' +
            '<div><div class="label" style="margin-bottom:2px">' + icon + ' ' + esc(label) + '</div><div class="desc">' + esc(entry.date) + ' \u2014 Weekly Digest</div></div>' +
            '<a href="' + dlUrl + '" style="background:linear-gradient(135deg,var(--purple),var(--purple-dark));color:#fff;padding:8px 20px;border-radius:var(--radius);font-size:.78em;font-weight:600;text-decoration:none;white-space:nowrap">Download</a>' +
            '</div>';
        }

        if (!html) {
          loading.textContent = 'No PDFs available for your exams yet. Check back after Monday!';
          return;
        }
        list.innerHTML = html;
        ds.style.display = '';
      })
      .catch(function() {
        loading.textContent = 'No weekly PDFs available yet. Check back after Monday!';
      });
  }

  function updateUI() {
    var p = getPremium();
    var card = document.getElementById('statusCard');
    if (p && p.active) {
      var expiry = new Date(p.expiresAt);
      var daysLeft = Math.ceil((expiry - new Date()) / 86400000);
      if (daysLeft <= 0) {
        localStorage.removeItem(KEY_PREMIUM);
        location.reload(); return;
      }
      card.innerHTML = '<span class="icon">👑</span><h3>You\'re a Premium member!</h3><p style="margin:6px 0">Plan: '+esc(p.plan)+' · Expires: '+expiry.toLocaleDateString()+' ('+daysLeft+' days left)</p><button id="premiumLogoutBtn" style="background:var(--bg-hover);border:1px solid var(--border);color:var(--text-secondary);padding:8px 24px;border-radius:var(--radius-full);font-size:.78em;cursor:pointer;transition:all .2s">Logout</button>';
      document.getElementById('codeBox').style.display = 'none';
      document.getElementById('howToGet').style.display = 'none';
      document.getElementById('premiumLogoutBtn').onclick = function() { localStorage.removeItem(KEY_PREMIUM); location.reload(); };
      var ds = document.getElementById('downloadsSection');
      if (ds) ds.style.display = '';
      loadPDFs();
    }
  }

  function redeemCode() {
    var input = document.getElementById('codeInput');
    var msg = document.getElementById('codeMsg');
    var code = input.value.trim().toUpperCase();

    if (!code || code.length < 9) {
      msg.className = 'code-msg error';
      msg.textContent = code ? 'That code looks incomplete.' : 'Type your code first.';
      input.focus(); return;
    }

    var cons = consumed();
    if (cons.indexOf(code) !== -1) {
      msg.className = 'code-msg error';
      msg.textContent = 'That code was already used.';
      return;
    }

    msg.className = 'code-msg';
    msg.textContent = 'Checking...';

    fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: code }) })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!data.valid) {
          var fails = parseInt(sessionStorage.getItem('vlym_fails') || '0') + 1;
          sessionStorage.setItem('vlym_fails', fails);
          var taunts = ['Nope.', 'Not today.', 'Invalid.', 'Wrong. Try again, champ.', 'That code belongs to a parallel universe.'];
          msg.className = 'code-msg error';
          msg.textContent = taunts[fails % taunts.length];
          return;
        }
        setPremium({ active: true, plan: data.plan, expiresAt: data.expiresAt, code: code, exams: data.exams || [] });
        markConsumed(code);
        msg.className = 'code-msg success';
        msg.textContent = 'Boom. Premium unlocked. You\'re officially a vlymbooq legend.';
        input.value = '';
        sessionStorage.removeItem('vlym_fails');
      })
      .catch(function() {
        msg.className = 'code-msg error';
        msg.textContent = 'Could not reach server. Try again.';
      });
  };

  updateUI();

  document.getElementById('redeemBtn').addEventListener('click', redeemCode);

  document.getElementById('copyUpiBtn').addEventListener('click', function() {
    var b = this;
    navigator.clipboard.writeText('vlymbooq@upi').then(function() {
      b.textContent = 'Copied!';
      setTimeout(function() { b.textContent = 'Copy'; }, 2000);
    });
  });

  document.getElementById('copyDonateBtn').addEventListener('click', function() {
    var b = this;
    navigator.clipboard.writeText('vlymbooq@upi').then(function() {
      b.textContent = 'Copied!';
      setTimeout(function() { b.textContent = 'Copy'; }, 2000);
    }).catch(function() {
      var i = document.getElementById('donateUpiInput');
      i.select();
      i.setSelectionRange(0, i.value.length);
      b.textContent = 'Select & Copy';
    });
  });

  var waLink = document.getElementById('whatsAppLink');
  if (waLink) {
    waLink.addEventListener('mouseover', function() { this.style.opacity = '0.85'; });
    waLink.addEventListener('mouseout', function() { this.style.opacity = '1'; });
  }
})();
