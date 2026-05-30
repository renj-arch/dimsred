var fs = require('fs');
var path = require('path');

var root = path.resolve(__dirname, '..');
var EXAMS = ['cgl', 'rbi', 'jee', 'neet', 'gate', 'agniveer', 'upsc', 'ibps-po', 'sbi-clerk', 'ssc-gd', 'ctet'];

// Also handle the lab page
EXAMS.push('');
var LAB_PATH = path.join(root, 'lab.html');

var CAL_CSS = '\n        .cal-wrap{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-top:16px}\n' +
'        .cal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}\n' +
'        .cal-title{font-weight:700;font-size:.92em;color:var(--text)}\n' +
'        .cal-prev,.cal-next{background:rgba(255,255,255,.04);border:1px solid var(--border);color:var(--text-secondary);padding:4px 10px;border-radius:6px;cursor:pointer;font-size:.82em;transition:all .2s}\n' +
'        .cal-prev:hover,.cal-next:hover{background:rgba(255,255,255,.08);color:var(--text)}\n' +
'        .cal-days{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;text-align:center}\n' +
'        .cal-day-label{font-size:.7em;color:var(--text-muted);padding:6px 0;font-weight:600}\n' +
'        .cal-cell{padding:8px 0;font-size:.8em;border-radius:8px;color:var(--text-secondary);cursor:default;transition:all .2s}\n' +
'        .cal-cell.cal-has-paper{background:rgba(139,92,246,.12);color:var(--purple);font-weight:600;cursor:pointer}\n' +
'        .cal-cell.cal-has-paper:hover{background:rgba(139,92,246,.2);transform:scale(1.1)}\n' +
'        .cal-empty{background:0 0}\n' +
'        .cal-legend{display:flex;align-items:center;gap:6px;margin-top:12px;font-size:.75em;color:var(--text-muted)}\n' +
'        .cal-dot{width:8px;height:8px;border-radius:50%;background:rgba(139,92,246,.5);display:inline-block}\n';

var CAL_HTML = '\n        <section class="section">\n            <h2 class="section-title">Practice <span>Calendar</span></h2>\n            <p class="section-sub">Click a highlighted date to open that day\u2019s paper.</p>\n            <div class="cal-wrap" id="exam-calendar" data-src="papers/calendar-data.json"></div>\n        </section>';

var CAL_SCRIPT = '\n    <script src="../js/calendar.js"></script>';

EXAMS.forEach(function(folder) {
  var fp = folder ? path.join(root, folder, 'index.html') : LAB_PATH;
  if (!fs.existsSync(fp)) { console.log((folder || 'lab') + ': not found'); return; }

  var content = fs.readFileSync(fp, 'utf-8');
  var original = content;

  // 1. Add calendar CSS before closing </style>
  if (content.indexOf('cal-header') === -1) {
    content = content.replace('</style>', CAL_CSS + '\n    </style>');
  }

  // 2. Add calendar section after papers section (before Why section)
  var whyIdx = content.indexOf('Why');
  if (whyIdx > 0) {
    // Find the <section class="section"> that starts the Why section
    var whySectionStart = content.lastIndexOf('<section', whyIdx);
    if (whySectionStart > 0) {
      // Find the </section> that closes the PREVIOUS section (papers section)
      var prevEnd = content.lastIndexOf('</section>', whySectionStart - 1);
      if (prevEnd > 0) {
        var insertAt = prevEnd + 11; // after '</section>'
        content = content.substring(0, insertAt) + CAL_HTML + '\n\n        ' + content.substring(insertAt);
      }
    }
  }

  // 3. Add calendar script before </body>
  if (content.indexOf('calendar.js') === -1) {
    content = content.replace('</body>', CAL_SCRIPT + '\n</body>');
  }

  if (content !== original) {
    fs.writeFileSync(fp, content, 'utf-8');
    console.log((folder || 'lab') + ': updated');
  } else {
    console.log((folder || 'lab') + ': already has calendar');
  }
});

console.log('Done.');
