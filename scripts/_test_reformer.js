const https = require('https');
function g(url) {
  return new Promise((r, j) => {
    https.get(url, { headers: { 'User-Agent': 'studypro-wiki/1.0' } }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { r(JSON.parse(d)); });
    }).on('error', j);
  });
}
async function main() {
  const url = 'https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:Indian_social_reformers&cmlimit=500&format=json&cmtype=page';
  const d = await g(url);
  console.log('Pages: ' + d.query.categorymembers.length);
  d.query.categorymembers.slice(0, 5).forEach(m => console.log('  ' + m.title));
}
main().catch(e => console.log('ERROR: ' + e.message));
