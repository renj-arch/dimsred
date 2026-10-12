$port = 3000
Write-Host "Starting server at http://localhost:$port/3d-globe.html" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
node -e "
const http = require('http'), fs = require('fs'), path = require('path');
const mime = { '.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon' };
http.createServer((req,res)=>{
  let f = req.url.split('?')[0];
  if (f === '/') f = '/3d-globe.html';
  f = path.join('.', f);
  if (!fs.existsSync(f)) { res.writeHead(req.url.includes('favicon')?204:404); res.end(); return; }
  const ext = path.extname(f);
  res.writeHead(200, { 'Content-Type': mime[ext]||'text/plain','Access-Control-Allow-Origin':'*' });
  fs.createReadStream(f).pipe(res);
}).listen($port, ()=>console.log('http://localhost:'+$port+'/3d-globe.html'));
"