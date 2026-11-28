'use strict';
// Shared contracts for the news wire and the magazine.
//
// Both pages are fed by deterministic aggregation: the fetchers never write
// prose about events, they only carry a publisher's own title, link, source
// and timestamp. These validators are the fail-closed gate. A data file that
// breaks any rule here must never be committed, and the fetchers call the same
// functions before writing, so a regression is caught twice.

var HTML_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', hellip: '…'
};

function decodeEntities(text) {
  return String(text == null ? '' : text).replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, function (m, body) {
    if (body.charAt(0) === '#') {
      var code = body.charAt(1) === 'x' || body.charAt(1) === 'X'
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      if (isFinite(code) && code > 0 && code <= 0x10ffff) {
        try { return String.fromCodePoint(code); } catch (e) { return ' '; }
      }
      return ' ';
    }
    return Object.prototype.hasOwnProperty.call(HTML_ENTITIES, body.toLowerCase())
      ? HTML_ENTITIES[body.toLowerCase()]
      : m;
  });
}

function stripHtml(text) {
  return decodeEntities(String(text == null ? '' : text)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTitle(title) {
  return stripHtml(title)
    // Google News appends " - Publisher" to every headline. Strip only the
    // final separator so publishers that use a dash in their own title keep it.
    .replace(/\s+[-–—]\s+[^-–—]{2,60}$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isHttpUrl(value) {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) return false;
  try { new URL(value); return true; } catch (e) { return false; }
}

function hostOf(url) {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch (e) { return ''; }
}

function hostAllowed(host, allowDomains) {
  var h = String(host || '').toLowerCase().replace(/^www\./, '');
  if (!h) return false;
  return (allowDomains || []).some(function (domain) {
    var d = String(domain || '').toLowerCase().replace(/^www\./, '');
    return d && (h === d || h.endsWith('.' + d));
  });
}

function validDate(value, now) {
  if (typeof value !== 'string' || !value.trim()) return false;
  var t = Date.parse(value);
  if (!isFinite(t)) return false;
  var ts = now == null ? Date.now() : now;
  if (t > ts + 24 * 60 * 60 * 1000) return false; // clock skew, not the future
  if (t < ts - 30 * 24 * 60 * 60 * 1000) return false; // stale
  return true;
}

function itemProblems(item, allowDomains, now, label) {
  var problems = [];
  var at = label || 'item';
  if (!item || typeof item !== 'object') return [at + ' is not an object'];
  if (typeof item.title !== 'string' || stripHtml(item.title).length < 8) problems.push(at + ' has no usable title');
  if (!isHttpUrl(item.link)) problems.push(at + ' has no absolute http(s) link');
  else if (!hostAllowed(hostOf(item.link), allowDomains)) problems.push(at + ' links to a non-allowlisted host: ' + hostOf(item.link));
  if (typeof item.source !== 'string' || !item.source.trim()) problems.push(at + ' has no named source');
  if (!validDate(item.publishedAt, now)) problems.push(at + ' has no valid recent date: ' + item.publishedAt);
  if (item.image && !isHttpUrl(item.image)) problems.push(at + ' has an invalid image url');
  if (typeof item.section !== 'string' || !item.section) problems.push(at + ' has no section');
  return problems;
}

function validateNewsData(data, sources, now) {
  var problems = [];
  if (!data || typeof data !== 'object') return ['news data is not an object'];
  if (!data.generatedAt || !isFinite(Date.parse(data.generatedAt))) problems.push('news generatedAt is missing or invalid');
  if (!Array.isArray(data.sections) || data.sections.length === 0) {
    problems.push('news has no sections');
    return problems;
  }
  var allow = (sources && sources.allowDomains) || data.allowDomains || [];
  var total = 0;
  data.sections.forEach(function (section, si) {
    if (!section || typeof section.id !== 'string' || !section.id) { problems.push('section ' + si + ' has no id'); return; }
    if (typeof section.label !== 'string' || !section.label) problems.push('section ' + section.id + ' has no label');
    if (!Array.isArray(section.items)) { problems.push('section ' + section.id + ' has no items array'); return; }
    // Links may legitimately recur across sections (a national story can be
    // relevant to more than one state). Within a section they must be unique.
    var ids = new Set();
    var links = new Set();
    section.items.forEach(function (item, ii) {
      total++;
      var label = 'section ' + section.id + ' item ' + ii;
      itemProblems(item, allow, now, label).forEach(function (p) { problems.push(p); });
      if (item && item.id) {
        if (ids.has(item.id)) problems.push(label + ' repeats id ' + item.id);
        ids.add(item.id);
      }
      if (item && item.link) {
        if (links.has(item.link)) problems.push(label + ' repeats link ' + item.link);
        links.add(item.link);
      }
    });
  });
  if (total === 0 && data.ok !== false) problems.push('news has no items at all');
  return problems;
}

function validateMagazineData(data, now) {
  var problems = [];
  if (!data || typeof data !== 'object') return ['magazine data is not an object'];
  if (!data.generatedAt || !isFinite(Date.parse(data.generatedAt))) problems.push('magazine generatedAt is missing or invalid');
  if (!data.issue || typeof data.issue.label !== 'string' || !data.issue.label) problems.push('magazine has no issue label');
  if (!Array.isArray(data.sections) || data.sections.length === 0) {
    problems.push('magazine has no sections');
    return problems;
  }
  var allow = data.allowDomains || [];
  var stories = 0;
  data.sections.forEach(function (section, si) {
    if (!section || typeof section.id !== 'string' || !section.id) { problems.push('magazine section ' + si + ' has no id'); return; }
    if (!Array.isArray(section.items)) { problems.push('magazine section ' + section.id + ' has no items array'); return; }
    section.items.forEach(function (item, ii) {
      var label = 'magazine section ' + section.id + ' item ' + ii;
      if (!item || typeof item !== 'object') { problems.push(label + ' is not an object'); return; }
      if (section.kind === 'photos') {
        if (!isHttpUrl(item.image)) problems.push(label + ' has no image url');
        if (!isHttpUrl(item.link)) problems.push(label + ' has no source page');
        if (!item.credit) problems.push(label + ' has no credit');
        if (!item.license) problems.push(label + ' has no license');
      } else if (section.kind === 'books') {
        if (typeof item.title !== 'string' || !item.title.trim()) problems.push(label + ' has no book title');
        if (!isHttpUrl(item.link)) problems.push(label + ' has no book link');
        if (!item.author) problems.push(label + ' has no author');
      } else {
        stories++;
        itemProblems(item, allow, now, label).forEach(function (p) { problems.push(p); });
      }
    });
  });
  void stories;
  return problems;
}

module.exports = {
  decodeEntities: decodeEntities,
  stripHtml: stripHtml,
  cleanTitle: cleanTitle,
  isHttpUrl: isHttpUrl,
  hostOf: hostOf,
  hostAllowed: hostAllowed,
  validDate: validDate,
  validateNewsData: validateNewsData,
  validateMagazineData: validateMagazineData
};
