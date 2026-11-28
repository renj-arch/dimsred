const express = require('express');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(compression());
app.use(morgan('dev'));
app.use(express.json());

// ========== AI Mistake Analysis ==========
// Pattern definitions for client-side analysis
// This data helps the client-side engine classify errors
var AI_PATTERNS = {
  negation_keywords: ['except','not ','incorrect','false','wrong','never','least','excluding'],
  section_synonyms: {
    'Reasoning': ['logical','puzzle','analogy','syllogism','coding','blood','direction','order'],
    'Quantitative Aptitude': ['math','percentage','ratio','profit','loss','interest','speed','time','work','average'],
    'General Awareness': ['gk','current','history','polity','geography','science','economy','sports'],
    'English Comprehension': ['grammar','vocab','passage','comprehension','error','sentence']
  }
};

app.get('/api/ai/patterns', function(req, res) {
  res.json(AI_PATTERNS);
});

// ========== Guest token ==========
var GUEST_TOKEN = process.env.GUEST_TOKEN || null;

// API: Verify a guest access token (POST with JSON body)
app.post('/api/verify-guest', (req, res) => {
  const token = req.body?.token;
  if (!token || !GUEST_TOKEN) {
    return res.json({ valid: false });
  }
  if (token === GUEST_TOKEN) {
    return res.json({ valid: true });
  }
  res.json({ valid: false });
});

// Custom file resolver:
// /dashboard -> dashboard.html
// /cgl       -> cgl/index.html
// /cgl/      -> cgl/index.html
// /cgl/papers/12-sep-2025-s3 -> cgl/papers/12-sep-2025-s3.html
// Existing .html links also work.
function resolveFile(p) {
  if (p === '' || p === '/') p = 'index.html';
  else p = p.replace(/^\//, '').replace(/\/$/, '');

  let candidates = [];

  // If it already ends with .html, try as-is
  if (p.endsWith('.html')) {
    candidates.push(p);
  } else {
    candidates.push(p + '.html');
    candidates.push(p + '/index.html');
  }

  for (let c of candidates) {
    let fp = path.join(__dirname, c);
    if (fs.existsSync(fp) && fs.statSync(fp).isFile()) return fp;
  }
  return null;
}

// Intercept all GET requests
app.get('*', (req, res, next) => {
  let fp = resolveFile(req.path);
  if (fp) return res.sendFile(fp);
  next();
});

// Block script/download files that Google flags as harmful/uncommon
app.use(function(req, res, next) {
  var ext = require('path').extname(req.path).toLowerCase();
  if (['.ps1','.bat','.sh','.exe','.msi','.zip','.jar','.dmg'].indexOf(ext) !== -1) {
    return res.status(404).end();
  }
  next();
});

// Serve static assets (CSS, JS, images) — no directory redirects
app.use(express.static(__dirname, {
  redirect: false,
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0
}));

// Final: 404 if nothing matched
app.use((req, res) => {
  let notFound = path.join(__dirname, '404.html');
  if (fs.existsSync(notFound)) {
    res.status(404).sendFile(notFound);
  } else {
    res.status(404).send(`
      <!DOCTYPE html><html lang="en"><head>
      <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
      <title>404 — StudyPro</title>
      <style>body{font-family:Inter,sans-serif;background:#09090b;color:#fafafa;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px}
      h1{font-size:4em;font-weight:900;background:linear-gradient(135deg,#a78bfa,#34d399);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
      p{color:#a1a1aa;margin:12px 0 24px}a{color:#a78bfa;text-decoration:none;padding:12px 24px;border:1px solid rgba(255,255,255,.1);border-radius:100px;display:inline-block}</style>
      </head><body><div><h1>404</h1><p>Page not found</p><a href="/">← Go Home</a></div></body></html>
    `);
  }
});

app.listen(PORT, '0.0.0.0', () => {
  
});
