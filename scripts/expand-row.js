// Shared helper: expand a scraped row into additional factual question variants.
// Each fetcher already emits one or two question templates per row. This module
// lets it derive MORE variants from the SAME row cells, e.g.:
//   - year reverse lookups ("In which year was X launched?" -> year)
//   - attribute lookups ("Which ministry launched scheme X?" -> ministry)
//   - distinct-value lookups ("Which missile has a range of 4000 km?" -> name)
//
// Callers pass explicit templates so wording stays natural; this helper only
// handles value cleaning, distinctness, and answer validation.

var normalize = function(s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
};

var firstYear = function(s) {
  var m = String(s || '').match(/\b(19|20)\d{2}\b/);
  return m ? m[0] : '';
};

function cleanCell(v, max) {
  var s = normalize(v).replace(/^[\u2020\u2032^]+/, '').replace(/\([^)]*\)/g, '');
  s = s.replace(/[\s,;]+$/g, '').trim();
  if (s.length < 2 || s.length > (max || 60)) return '';
  if (/^(the|a|an|--|\u2014|n\/a|na|nil|none|-)$/i.test(s)) return '';
  return s;
}

// variants: array of specs:
//   { tpl: string with {name} and {value}, answer: 'name' | 'value', value, max, only, fact }
// answer 'name' -> question asks for the entity; answer 'value' -> asks for the attribute.
function expandRow(opts) {
  var out = [];
  var name = normalize(opts.name);
  if (!name || name.length < 2) return out;
  var seen = opts.seen || {};
  (opts.variants || []).forEach(function(v) {
    if (v.only === 'distinct' && v.answer === 'name') {
      var key = normalize(v.value);
      if (seen[key]) return;
      seen[key] = true;
    }
    var val = v.answer === 'name' ? normalize(v.value) : cleanCell(v.value, v.max);
    if (!val) return;
    var tpl = (v.tpl || '').replace(/\{name\}/g, name).replace(/\{value\}/g, val);
    if (tpl.length < 8) return;
    var ans = v.answer === 'name' ? name : val;
    var q = opts.makeQ(tpl, ans, v.fact || (name + ' ' + val + '.'));
    if (q) out.push(q);
  });
  return out;
}

module.exports = { expandRow: expandRow, normalize: normalize, firstYear: firstYear, cleanCell: cleanCell };
