const https = require('https');
const WIKI_API = 'https://en.wikipedia.org/w/api.php';
async function testQuery(q) {
  return new Promise((resolve, reject) => {
    const url = WIKI_API + '?action=query&list=search&srsearch=' + encodeURIComponent(q) + '&srlimit=5&format=json';
    https.get(url + '&origin=*', { headers: { 'User-Agent': 'Test/1.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) {
          console.log('RAW RESPONSE:', data.slice(0, 200));
          reject(e);
        }
      });
    }).on('error', reject);
  });
}
async function main() {
  const q = 'Indian geography physical climate river mountain soil forest resource';
  console.log('Testing:', q);
  try {
    const data = await testQuery(q);
    const results = (data.query ? data.query.search || [] : []);
    console.log('Results:', results.length);
    if (results.length > 0) console.log('First:', results[0].title);
    else console.log('Data keys:', Object.keys(data), 'query keys:', data.query ? Object.keys(data.query) : 'none');
  } catch(e) {
    console.log('Error:', e.message);
  }
}
main();
