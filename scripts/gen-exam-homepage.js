var fs = require('fs');
var path = require('path');
var ROOT = path.resolve(__dirname, '..');

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/'/g,'&#39;').replace(/"/g,'&quot;');
}

var configs = {
  nda: {
    name: 'NDA', full: 'NDA (National Defence Academy)',
    desc: 'Free NDA practice papers with answers. Mathematics and General Ability Test for National Defence Academy entrance exam.',
    badge: '🎯 Defence Aspirant Hub',
    topics: ['Mathematics Paper 1', 'General Ability Test', 'English', 'GK', 'Science', 'Current Affairs', 'Defence Exams'],
    modules: ['Mathematics (Paper 1)', 'General Ability Test (Paper 2)'],
    mockLabel: 'NDA Mock Test',
    why: [
      { title: 'Complete Coverage', desc: 'Both Mathematics and General Ability Test sections with topic-wise lessons.' },
      { title: 'Defence-Focused', desc: 'Content tailored to NDA exam pattern and difficulty level.' },
      { title: 'Free Resources', desc: 'All study material, mock tests, and practice questions are completely free.' },
      { title: 'Mobile Friendly', desc: 'Study anywhere. Works perfectly on phone, tablet, or desktop.' }
    ],
    about: 'NDA (National Defence Academy) exam is conducted by UPSC twice a year for admission into the Army, Navy, and Air Force wings of NDA. The written exam consists of Mathematics (300 marks) and General Ability Test (600 marks). Candidates must be 16.5-19.5 years old and unmarried. Successful candidates undergo 3 years of training at NDA, Khadakwasla, Pune.',
    canonical: 'nda/'
  },
  cds: {
    name: 'CDS', full: 'CDS (Combined Defence Services)',
    desc: 'Free CDS practice papers with answers. English, General Knowledge and Elementary Mathematics for defence exams.',
    badge: '🎯 Defence Aspirant Hub',
    topics: ['English', 'General Knowledge', 'Elementary Mathematics', 'History', 'Polity', 'Geography', 'Defence Exams'],
    modules: ['English', 'General Knowledge', 'Elementary Mathematics'],
    mockLabel: 'CDS Mock Test',
    why: [
      { title: 'All 3 Subjects', desc: 'English, General Knowledge, and Elementary Mathematics covered comprehensively.' },
      { title: 'UPSC Pattern', desc: 'Content designed to match the official UPSC CDS exam pattern.' },
      { title: 'Detailed Solutions', desc: 'Every question comes with clear explanations to help you learn.' },
      { title: 'Free & Accessible', desc: 'No paywalls. Access all content for free on any device.' }
    ],
    about: 'CDS (Combined Defence Services) exam is conducted by UPSC twice a year for recruitment into IMA, INA, AFA, and OTA. The written exam includes English (100 marks), General Knowledge (100 marks), and Elementary Mathematics (100 marks) for IMA/INA/AFA. OTA candidates need only English and GK. Candidates must be 19-25 years old (varies by academy).',
    canonical: 'cds/'
  },
  clat: {
    name: 'CLAT', full: 'CLAT (Common Law Admission Test)',
    desc: 'Free CLAT practice papers with answers. English, Current Affairs, Legal Reasoning, Logical Reasoning & Quantitative Techniques for law entrance.',
    badge: '⚖️ Law Aspirant Hub',
    topics: ['English Language', 'Current Affairs & GK', 'Legal Reasoning', 'Logical Reasoning', 'Quantitative Techniques', 'Law Exams'],
    modules: ['English Language', 'Current Affairs & GK', 'Legal Reasoning', 'Logical Reasoning', 'Quantitative Techniques'],
    mockLabel: 'CLAT Mock Test',
    why: [
      { title: 'All 5 Sections', desc: 'Complete coverage of English, CA/GK, Legal Reasoning, Logical Reasoning, and Quantitative Techniques.' },
      { title: 'Legal Aptitude Focus', desc: 'Legal principles, maxims, case studies, and application-based questions.' },
      { title: 'Detailed Solutions', desc: 'Every question includes a clear explanation for better understanding.' },
      { title: 'Free & Mobile Friendly', desc: 'No registration required. Study on any device, anywhere.' }
    ],
    about: 'CLAT (Common Law Admission Test) is a centralized national-level entrance exam for admission to 22 NLUs (National Law Universities). The 2-hour test has 120 MCQs covering English Language (28), Current Affairs & GK (35), Legal Reasoning (35), Logical Reasoning (12), and Quantitative Techniques (10). Candidates must have 45% marks in 12th standard (40% for SC/ST). No age limit.',
    canonical: 'clat/'
  }
};

function genHead(key, cfg) {
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta http-equiv="Content-Security-Policy" content="default-src \'self\' https:; style-src \'self\' \'unsafe-inline\' https://fonts.googleapis.com https://unpkg.com; font-src https://fonts.gstatic.com https://unpkg.com; script-src \'self\' https://pagead2.googlesyndication.com https://www.gstatic.com https://apis.google.com https://unpkg.com https://static.cloudflareinsights.com https://ep2.adtrafficquality.google https://*.adtrafficquality.google; connect-src \'self\' https://krvlufonfbcabgcjomvs.supabase.co https://pagead2.googlesyndication.com https://ep2.adtrafficquality.google https://static.cloudflareinsights.com https://apis.google.com https://www.gstatic.com https://www.google.com https://googleads.g.doubleclick.net; frame-src \'self\' https://googleads.g.doubleclick.net https://ep2.adtrafficquality.google https://www.google.com; upgrade-insecure-requests">\n    <script src="js/redirect.js" async></script>\n    <meta charset="UTF-8">\n    <script src="../js/auth-guard.js"></script>\n    <meta name="viewport" content="width=device-width,initial-scale=1.0">\n    <title>' + esc(cfg.full) + ' Practice Papers with Answers  vlymbooq</title>\n    <meta name="description" content="' + esc(cfg.desc) + '">\n    <link rel="icon" type="image/svg+xml" href="../favicon.svg">\n    <link rel="icon" type="image/png" href="../logo.png">\n    <link rel="canonical" href="https://vlymbooq.qzz.io/' + cfg.canonical + '">\n    <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage","name":"' + esc(cfg.full) + ' Practice Papers with Answers  vlymbooq","description":"' + esc(cfg.desc) + '","url":"https://vlymbooq.qzz.io/' + cfg.canonical + '","educationalLevel":"Competitive Exam","audience":{"@type":"EducationalAudience","educationalRole":"student"},"publisher":{"@type":"Organization","name":"vlymbooq","url":"https://vlymbooq.qzz.io"}}</script>\n    <meta property="og:title" content="' + esc(cfg.full) + ' Practice Papers with Answers">\n    <meta property="og:description" content="' + esc(cfg.desc) + '">\n    <meta property="og:image" content="https://vlymbooq.qzz.io/logo.png">\n    <meta name="twitter:card" content="summary_large_image">\n    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7363013795551054" crossorigin="anonymous"></script>\n    <style>\n        @import url(\'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap\');\n        *{margin:0;padding:0;box-sizing:border-box}\n        :root{--bg:#09090b;--bg-elevated:#0c0c0f;--bg-card:#111113;--bg-hover:#18181b;--border:rgba(255,255,255,.06);--border-hover:rgba(255,255,255,.1);--text:#fafafa;--text-secondary:#a1a1aa;--text-muted:#52525b;--purple:#a78bfa;--purple-dark:#8b5cf6;--emerald:#34d399;--radius:12px;--radius-lg:16px;--radius-full:100px}\n        html{scroll-behavior:smooth}\n        body{font-family:\'Inter\',-apple-system,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;-webkit-font-smoothing:antialiased;overflow-x:hidden}\n        a{color:var(--text);text-decoration:none}\n        ::selection{background:rgba(139,92,246,.3);color:#fff}\n        .bg-grid{position:fixed;inset:0;z-index:0;pointer-events:none;background-image:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);background-size:60px 60px}\n        .bg-glow{position:fixed;border-radius:50%;filter:blur(120px);pointer-events:none;z-index:0}\n        .bg-glow.purple{width:500px;height:500px;background:rgba(139,92,246,.08);top:-200px;right:-150px}\n        .bg-glow.emerald{width:400px;height:400px;background:rgba(16,185,129,.05);bottom:-180px;left:-120px}\n        .nav{position:sticky;top:0;z-index:100;padding:14px 24px;background:rgba(9,9,11,.85);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border-bottom:1px solid var(--border)}\n        .nav-inner{max-width:1100px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}\n        .brand{display:flex;align-items:center;gap:8px;text-decoration:none}\n        .brand-icon{width:26px;height:26px;flex-shrink:0}\n        .brand-text{font-weight:800;font-size:1.05em;background:linear-gradient(135deg,var(--purple),var(--emerald));-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:-.02em}\n        .container{max-width:800px;margin:0 auto;padding:0 24px;position:relative;z-index:1}\n        .page-hero{text-align:center;padding:64px 0 48px}\n        .page-hero .badge{display:inline-flex;align-items:center;gap:6px;padding:5px 14px;border-radius:var(--radius-full);font-size:.75em;font-weight:600;background:rgba(139,92,246,.08);color:var(--purple);border:1px solid rgba(139,92,246,.15);margin-bottom:24px}\n        .page-hero h1{font-size:clamp(2rem,5vw,3.2rem);font-weight:900;line-height:1.1;letter-spacing:-.04em;margin-bottom:14px}\n        .page-hero h1 span{background:linear-gradient(135deg,var(--purple),var(--emerald));-webkit-background-clip:text;-webkit-text-fill-color:transparent}\n        .page-hero p{font-size:1.05em;color:var(--text-secondary);max-width:600px;margin:0 auto 28px;line-height:1.6}\n        .page-hero .stats{display:flex;justify-content:center;gap:16px;flex-wrap:wrap;margin-bottom:28px}\n        .page-hero .stats span{padding:6px 16px;border-radius:var(--radius-full);background:rgba(255,255,255,.06);font-size:.82em;color:var(--text-secondary)}\n        .page-hero .cta-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}\n        .btn{padding:10px 24px;border-radius:var(--radius-full);font-weight:600;font-size:.9em;transition:all .2s;display:inline-block;border:none;cursor:pointer}\n        .btn-primary{background:rgba(139,92,246,.15);color:var(--purple);border:1px solid rgba(139,92,246,.2)}\n        .btn-primary:hover{background:rgba(139,92,246,.25)}\n        .btn-success{background:rgba(52,211,153,.15);color:var(--emerald);border:1px solid rgba(52,211,153,.2)}\n        .btn-success:hover{background:rgba(52,211,153,.25)}\n        .topics{display:flex;justify-content:center;gap:6px;flex-wrap:wrap;margin-bottom:32px}\n        .topics span{padding:4px 12px;border-radius:var(--radius-full);background:rgba(255,255,255,.04);border:1px solid var(--border);font-size:.72em;color:var(--text-secondary)}\n        .section{margin:32px 0}\n        .section-title{font-size:1.3em;font-weight:800;margin-bottom:6px;letter-spacing:-.02em}\n        .section-title span{background:linear-gradient(135deg,var(--purple),var(--emerald));-webkit-background-clip:text;-webkit-text-fill-color:transparent}\n        .section-sub{color:var(--text-secondary);font-size:.85em;margin-bottom:16px}\n        .feat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}\n        .feat-card{padding:20px;border-radius:var(--radius);border:1px solid var(--border);background:var(--bg-card);transition:border-color .2s}\n        .feat-card:hover{border-color:var(--border-hover)}\n        .feat-card .icon{font-size:1.6em;display:block;margin-bottom:8px}\n        .feat-card .ftitle{font-weight:700;font-size:.88em;margin-bottom:4px}\n        .feat-card .fdesc{font-size:.78em;color:var(--text-secondary);line-height:1.5}\n        .paper-card{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-radius:var(--radius);border:1px solid var(--border);margin-bottom:8px;background:var(--bg-card);transition:border-color .2s}\n        .paper-card:hover{border-color:var(--border-hover)}\n        .paper-card .title{font-weight:600;font-size:.85em}\n        .paper-card .meta{font-size:.75em;color:var(--text-secondary);margin-top:2px}\n        .paper-card .btn{padding:6px 14px;font-size:.78em;background:rgba(139,92,246,.12);color:var(--purple);border-radius:var(--radius-full);font-weight:500}\n        .paper-card .btn:hover{background:rgba(139,92,246,.22)}\n        .about-text{color:var(--text-secondary);font-size:.88em;line-height:1.7}\n        .site-footer{text-align:center;padding:32px 24px;border-top:1px solid var(--border);margin-top:32px}\n        .site-footer p{font-size:.78em;color:var(--text-muted);margin-bottom:12px}\n        .site-footer .links{display:flex;gap:16px;justify-content:center;flex-wrap:wrap}\n        .site-footer .links a{font-size:.78em;color:var(--text-secondary)}\n        .site-footer .links a:hover{color:var(--text)}\n        @media(max-width:600px){.page-hero{padding:40px 0 32px}}\n    </style>\n</head>\n<body>\n    <div class="bg-grid"></div>\n    <div class="bg-glow purple"></div>\n    <div class="bg-glow emerald"></div>\n    <nav class="nav"><div class="nav-inner"><a href="../index.html" class="brand"><img src="../logo.png" alt="" class="brand-icon"><span class="brand-text">vlymbooq</span></a><div class="nav-links"><a href="../index.html">Home</a><a href="../dashboard.html">Dashboard</a><a href="../community.html">Community</a><a href="index.html" class="active">' + esc(cfg.name) + '</a></div></div></nav>\n';
}

function genBody(key, cfg) {
  var h = '';
  h += '    <div class="container">\n';
  // Hero
  h += '        <section class="page-hero">\n';
  h += '            <div class="badge">' + cfg.badge + '</div>\n';
  h += '            <h1>' + esc(cfg.full) + '<br><span>Practice &amp; Study</span></h1>\n';
  h += '            <p>' + esc(cfg.desc) + '</p>\n';
  h += '            <div class="stats">\n';
  h += '                <span>📝 ' + (key === 'nda' ? '180' : '120') + ' Practice Questions</span>\n';
  h += '                <span>📖 ' + cfg.modules.length + ' Sections</span>\n';
  h += '                <span>🎯 Full Mock Tests</span>\n';
  h += '            </div>\n';
  h += '            <div class="cta-btns">\n';
  h += '                <a href="course/index.html" class="btn btn-primary">📖 Start Course</a>\n';
  h += '                <a href="mock-tests/index.html" class="btn btn-success">🎯 Take Mock Test</a>\n';
  h += '            </div>\n';
  h += '            <div class="topics">\n';
  cfg.topics.forEach(function(t){ h += '                <span>' + esc(t) + '</span>\n'; });
  h += '            </div>\n';
  h += '        </section>\n';

  // Why section
  h += '        <section class="section">\n';
  h += '            <h2 class="section-title">Why <span>' + esc(cfg.name) + ' Pro?</span></h2>\n';
  h += '            <div class="feat-grid">\n';
  cfg.why.forEach(function(w) {
    h += '                <div class="feat-card"><span class="icon">📘</span><div class="ftitle">' + esc(w.title) + '</div><div class="fdesc">' + esc(w.desc) + '</div></div>\n';
  });
  h += '            </div>\n';
  h += '        </section>\n';

  // Quick Links
  h += '        <section class="section">\n';
  h += '            <h2 class="section-title">Quick <span>Links</span></h2>\n';
  h += '            <div class="feat-grid">\n';
  h += '                <a href="exam-info.html" class="feat-card" style="text-decoration:none"><span class="icon">📋</span><div class="ftitle">Exam Info</div><div class="fdesc">Pattern, eligibility &amp; dates.</div></a>\n';
  h += '                <a href="course/index.html" class="feat-card" style="text-decoration:none"><span class="icon">📖</span><div class="ftitle">Full Course</div><div class="fdesc">Topic-wise lessons with practice MCQs.</div></a>\n';
  h += '                <a href="mock-tests/index.html" class="feat-card" style="text-decoration:none"><span class="icon">🎯</span><div class="ftitle">Mock Tests</div><div class="fdesc">Full-length mock tests with timer.</div></a>\n';
  h += '                <a href="../dashboard.html" class="feat-card" style="text-decoration:none"><span class="icon">📊</span><div class="ftitle">Dashboard</div><div class="fdesc">Track progress &amp; performance.</div></a>\n';
  h += '            </div>\n';
  h += '        </section>\n';

  // About
  h += '        <section class="section">\n';
  h += '            <h2 class="section-title">About <span>' + esc(cfg.name) + '</span></h2>\n';
  h += '            <p class="about-text">' + esc(cfg.about) + '</p>\n';
  h += '        </section>\n';

  h += '    </div>\n';

  // Footer
  h += '<footer class="site-footer">\n';
  h += '    <p>Free practice resources for ' + esc(cfg.full) + '. Not affiliated with UPSC or any examination body.</p>\n';
  h += '    <div class="links"><a href="../privacy.html">Privacy</a><a href="../lab.html">Lab</a><a href="../dashboard.html">Dashboard</a></div>\n';
  h += '</footer>\n';
  h += '<script src="js/main.js"></script>\n';
  h += '<script src="../js/supabase.js?v=20260529b"></script>\n';
  h += '<script src="../js/shared.js?v=20260529b"></script>\n';
  h += '</body>\n</html>\n';

  return h;
}

Object.keys(configs).forEach(function(key) {
  var cfg = configs[key];
  var dir = path.join(ROOT, key);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive:true});
  var html = genHead(key, cfg) + genBody(key, cfg);
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf-8');
  console.log(key + ': index.html');
});
