var fs = require('fs'), path = require('path');
var dataDir = path.join(__dirname, '..', 'data');
function load(f) {
  try { return JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf8')); } catch (e) { return []; }
}
var out = {};
function add(name, img) {
  if (!name || !img) return;
  name = String(name).trim();
  if (!name) return;
  var nk = name.toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (!nk || nk.length < 3) return;
  var base = name.replace(/\(.*\)\s*$/, '').trim();
  var clean = /[a-z ]{3,}/i.test(base) && !/\(/.test(base);
  var prev = out[nk];
  if (!prev) { out[nk] = { name: name, img: img, clean: clean }; }
  else if (clean && !prev.clean) { out[nk] = { name: name, img: img, clean: clean }; }
  else if (clean === prev.clean && name.length < prev.name.length) { out[nk] = { name: name, img: img, clean: clean }; }
}
['wiki-ruler.json', 'wiki-w_politician.json', 'wiki-personality.json'].forEach(function (f) {
  var arr = load(f);
  if (!Array.isArray(arr)) return;
  arr.forEach(function (e) { if (e && e.n && e.img) add(e.n, e.img); });
});
// Curated current-affairs figures via Wikipedia lead-image resolution.
var curated = {
  'Narendra Modi': 'https://en.wikipedia.org/wiki/Special:FilePath/Narendra_Modi',
  'Droupadi Murmu': 'https://en.wikipedia.org/wiki/Special:FilePath/Droupadi_Murmu',
  'Jagdeep Dhankhar': 'https://en.wikipedia.org/wiki/Special:FilePath/Jagdeep_Dhankhar',
  'Rahul Gandhi': 'https://en.wikipedia.org/wiki/Special:FilePath/Rahul_Gandhi',
  'Amit Shah': 'https://en.wikipedia.org/wiki/Special:FilePath/Amit_Shah',
  'Rajnath Singh': 'https://en.wikipedia.org/wiki/Special:FilePath/Rajnath_Singh',
  'Nirmala Sitharaman': 'https://en.wikipedia.org/wiki/Special:FilePath/Nirmala_Sitharaman',
  'S. Jaishankar': 'https://en.wikipedia.org/wiki/Special:FilePath/S._Jaishankar',
  'Nitin Gadkari': 'https://en.wikipedia.org/wiki/Special:FilePath/Nitin_Gadkari',
  'Piyush Goyal': 'https://en.wikipedia.org/wiki/Special:FilePath/Piyush_Goyal',
  'Arvind Kejriwal': 'https://en.wikipedia.org/wiki/Special:FilePath/Arvind_Kejriwal',
  'Yogi Adityanath': 'https://en.wikipedia.org/wiki/Special:FilePath/Yogi_Adityanath',
  'Mamata Banerjee': 'https://en.wikipedia.org/wiki/Special:FilePath/Mamata_Banerjee',
  'M. K. Stalin': 'https://en.wikipedia.org/wiki/Special:FilePath/M._K._Stalin',
  'K. Chandrashekar Rao': 'https://en.wikipedia.org/wiki/Special:FilePath/K._Chandrashekar_Rao',
  'N. Chandrababu Naidu': 'https://en.wikipedia.org/wiki/Special:FilePath/N._Chandrababu_Naidu',
  'Hemant Soren': 'https://en.wikipedia.org/wiki/Special:FilePath/Hemant_Soren',
  'Pinarayi Vijayan': 'https://en.wikipedia.org/wiki/Special:FilePath/Pinarayi_Vijayan',
  'A. P. J. Abdul Kalam': 'https://en.wikipedia.org/wiki/Special:FilePath/A._P._J._Abdul_Kalam',
  'C. V. Raman': 'https://en.wikipedia.org/wiki/Special:FilePath/C._V._Raman',
  'Vikram Sarabhai': 'https://en.wikipedia.org/wiki/Special:FilePath/Vikram_Sarabhai',
  'Homi J. Bhabha': 'https://en.wikipedia.org/wiki/Special:FilePath/Homi_J._Bhabha',
  'S. Somanath': 'https://en.wikipedia.org/wiki/Special:FilePath/S._Somanath',
  'Virat Kohli': 'https://en.wikipedia.org/wiki/Special:FilePath/Virat_Kohli',
  'Rohit Sharma': 'https://en.wikipedia.org/wiki/Special:FilePath/Rohit_Sharma',
  'Sachin Tendulkar': 'https://en.wikipedia.org/wiki/Special:FilePath/Sachin_Tendulkar',
  'M. S. Dhoni': 'https://en.wikipedia.org/wiki/Special:FilePath/MS_Dhoni',
  'Neeraj Chopra': 'https://en.wikipedia.org/wiki/Special:FilePath/Neeraj_Chopra',
  'P. V. Sindhu': 'https://en.wikipedia.org/wiki/Special:FilePath/P._V._Sindhu',
  'Mary Kom': 'https://en.wikipedia.org/wiki/Special:FilePath/Mary_Kom',
  'Gukesh D': 'https://en.wikipedia.org/wiki/Special:FilePath/Gukesh_D',
  'Narayana Murthy': 'https://en.wikipedia.org/wiki/Special:FilePath/N._R._Narayana_Murthy',
  'Mukesh Ambani': 'https://en.wikipedia.org/wiki/Special:FilePath/Mukesh_Ambani',
  'Gautam Adani': 'https://en.wikipedia.org/wiki/Special:FilePath/Gautam_Adani',
  'Ratan Tata': 'https://en.wikipedia.org/wiki/Special:FilePath/Ratan_Tata',
  'Manmohan Singh': 'https://en.wikipedia.org/wiki/Special:FilePath/Manmohan_Singh',
  'Pranab Mukherjee': 'https://en.wikipedia.org/wiki/Special:FilePath/Pranab_Mukherjee',
  'Ram Nath Kovind': 'https://en.wikipedia.org/wiki/Special:FilePath/Ram_Nath_Kovind',
  'Pratibha Patil': 'https://en.wikipedia.org/wiki/Special:FilePath/Pratibha_Patil',
  'A. P. J. Abdul Kalam': 'https://en.wikipedia.org/wiki/Special:FilePath/A._P._J._Abdul_Kalam',
  'Atal Bihari Vajpayee': 'https://en.wikipedia.org/wiki/Special:FilePath/Atal_Bihari_Vajpayee',
  'Sonia Gandhi': 'https://en.wikipedia.org/wiki/Special:FilePath/Sonia_Gandhi',
  'Joe Biden': 'https://en.wikipedia.org/wiki/Special:FilePath/Joe_Biden',
  'Donald Trump': 'https://en.wikipedia.org/wiki/Special:FilePath/Donald_Trump',
  'Vladimir Putin': 'https://en.wikipedia.org/wiki/Special:FilePath/Vladimir_Putin',
  'Xi Jinping': 'https://en.wikipedia.org/wiki/Special:FilePath/Xi_Jinping',
  'Narendra Modi Stadium': null
};
for (var k in curated) { if (curated[k]) add(k, curated[k]); }
var finalObj = {};
for (var nk in out) { finalObj[out[nk].name] = out[nk].img; }
fs.writeFileSync(path.join(dataDir, 'person-images.json'), JSON.stringify(finalObj, null, 1));
console.log('person-images.json: ' + Object.keys(finalObj).length + ' persons');
