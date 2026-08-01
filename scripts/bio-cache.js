// Shared Wikipedia biography cache + explanation helper for the feed scripts.
//
// Cached in data/person-bios.json (git-tracked) so repeated runs do not re-fetch
// the same static lead summaries. Failures (non-200, missing page) are NOT cached,
// so a transient rate-limit hit is retried on the next run.
var https = require('https');
var fs = require('fs');
var path = require('path');

var BIO_CACHE_PATH = path.resolve(__dirname, '..', 'data', 'person-bios.json');
var AGENT = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000 });

// Disambiguation: force a specific Wikipedia page title for names that collide
// with a more famous unrelated person.
var PAGE_TITLE = {
  'Vijay': 'Vijay (actor)',
  'Lakshman Prasad Acharya': 'Lakshman Acharya',
  'Haribhau Kisanrao Bagade': 'Haribhau Bagade',
  'Gurmit Singh': 'Gurmit Singh (general)'
};

function fetchBioSummaryRaw(name, retries) {
  if (retries === undefined) retries = 3;
  var title = PAGE_TITLE[name] || name;
  var url = 'https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title.replace(/\s+/g, '_'));
  return new Promise(function(resolve) {
    https.get(url, { agent: AGENT, headers: { 'User-Agent': 'BioCacheFill/1.0' } }, function(res) {
      var data = '';
      res.on('data', function(c) { data += c; });
      res.on('end', function() {
        if (res.statusCode === 429 && retries > 0) {
          var wait = Math.pow(2, 4 - retries) * 2000;
          console.error('Bio 429, retrying in ' + (wait / 1000) + 's... (' + retries + ' left) for ' + name);
          return setTimeout(function() { fetchBioSummaryRaw(name, retries - 1).then(resolve); }, wait);
        }
        if (res.statusCode !== 200) return resolve('');
        try {
          var j = JSON.parse(data);
          var extract = (j.extract || '').replace(/\s+/g, ' ').trim();
          resolve(extract);
        } catch (e) { resolve(''); }
      });
    }).on('error', function() { resolve(''); });
  });
}

// Fetch a person's short biography (Wikipedia lead summary) with a persistent
// cache. Returns '' for disambiguation-style pages ("may refer to") or when no
// summary is available.
async function getBio(name, cache) {
  if (!name) return '';
  if (cache && cache[name] && cache[name].bio) return cache[name].bio;
  var bio = await fetchBioSummaryRaw(name);
  if (/may refer to/i.test(bio)) bio = '';
  if (bio && cache) cache[name] = { bio: bio, fetched: new Date().toISOString() };
  return bio;
}

function loadBioCache() {
  var cache = {};
  if (fs.existsSync(BIO_CACHE_PATH)) {
    try {
      cache = JSON.parse(fs.readFileSync(BIO_CACHE_PATH, 'utf8'));
      console.error('Read bio cache: ' + Object.keys(cache).length + ' people');
    } catch (e) {
      console.error('Error reading bio cache: ' + e.message);
    }
  }
  return cache;
}

// Merge on top of whatever is currently on disk so a run that only looked up a
// few names never drops entries added by an earlier script in the same cycle.
function saveBioCache(cache) {
  var merged = cache;
  try {
    if (fs.existsSync(BIO_CACHE_PATH)) {
      var disk = JSON.parse(fs.readFileSync(BIO_CACHE_PATH, 'utf8'));
      merged = disk;
      Object.keys(cache || {}).forEach(function(k) {
        if (!merged[k] || (cache[k] && cache[k].bio)) merged[k] = cache[k];
      });
    }
  } catch (e) { merged = cache; }
  fs.writeFileSync(BIO_CACHE_PATH, JSON.stringify(merged, null, 2), 'utf8');
  console.error('Bio cache: ' + Object.keys(merged).length + ' people');
}

// Heuristic: is an answer a single person's name (as opposed to a comma/& joined
// list of several people, e.g. multiple award recipients in one answer)?
function isSinglePerson(answer) {
  if (!answer) return false;
  var a = String(answer).replace(/\s+/g, ' ').trim();
  if (!a || a.length > 100) return false;
  if (/[,;]| and | & |;|\+/.test(a)) return false;
  return true;
}

module.exports = {
  BIO_CACHE_PATH: BIO_CACHE_PATH,
  getBio: getBio,
  loadBioCache: loadBioCache,
  saveBioCache: saveBioCache,
  isSinglePerson: isSinglePerson
};
