/*
 * figure-resolve.js -- automatic figure resolution via Wikimedia STRUCTURED DATA.
 *
 * WHY (stronger than the previous version)
 * ---------------------------------------
 * v1 validated by matching topic words in a file's description text. That is
 * INFERENCE and it fails: "national parks india map" matched a historic map of
 * North America because "india" occurs inside "west india". No amount of text
 * tuning fixes substring coincidence.
 *
 * v2 uses assertions Wikimedia itself has made, not inference:
 *
 *   P180 "depicts"  Every Commons file can carry a machine-readable statement
 *                   "this file depicts <concept>", where <concept> is a Wikidata
 *                   Q-item. The Commons search operator haswbstatement:P180=Qxx
 *                   returns exactly the files asserted to depict that concept.
 *                   This is ground truth from the structured-data layer, not a
 *                   guess. If Wikidata says the Greenhouse-effect article's
 *                   subject is Q-something and a file asserts depicts=Q-something,
 *                   that file IS a greenhouse-effect figure.
 *
 *   P373 category   A Wikidata item often names its exact Commons category
 *                   ("Category:Greenhouse effect"). Category membership is a
 *                   curated human assertion that the file belongs to that topic.
 *
 *   Lead image      The infobox image of a Wikipedia article, chosen by editors
 *                   to be the canonical depiction. Strong but not a hard claim.
 *
 * ORDER: structured-data (depicts/category) first, lead image second, keyword a
 * distant last resort and badge-only. A concept with no confident file is
 * SKIPPED -- skipping is a correct outcome, not a failure.
 */
'use strict';

var UA = 'dimsred-figure-resolver/2.0 (https://github.com/renj-arch/dimsred; educational)';
var WD = 'https://www.wikidata.org/w/api.php';
var CAPI = 'https://commons.wikimedia.org/w/api.php';
var WAPI = 'https://en.wikipedia.org/w/api.php';

function norm(s){return String(s==null?'':s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function escRe(s){return String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function wholeWord(h,w){return new RegExp('\\b'+escRe(w)+'\\b').test(h);}

var NON_IMAGE_RE=/\.(pdf|djvu|ogg|ogv|webm|mid|tif|tiff|mp3|wav|zip|epub|doc|docx|xls|ppt)\b/i;
var PHOTO_RE=/\b(photo|photos|photograph|photographs|picture|pictures|image of|view of|scene|panorama|sunset|sunrise|night|portrait|selfie|aerial|satellite photo)\b/;
var DIAGRAM_RE=/\b(map|maps|locator|topograph|topographic|outline|projection|chart|charts|diagram|diagrams|structure|scheme|schematic|schematics|anatomy|graph|flowchart|flow|network|cycle|layer|architecture|evolution|timeline|taxonomy|classification|division|distribution|composition|blank|skeleton|phylogenetic|cladogram|sequence|hierarchy|framework|mechanism|cross.section|profile|process|transmission|spectrum|cycle)\b/;

function isDiagramish(title, desc){
  var t=norm(title)+' '+norm(desc||'');
  if(NON_IMAGE_RE.test(title))return false;
  if(/\.svg$/i.test(title))return true;
  if(PHOTO_RE.test(t))return false;
  return DIAGRAM_RE.test(t);
}

async function jget(url){
  var ctl=new AbortController(); var to=setTimeout(function(){ctl.abort();},14000);
  try{ var r=await fetch(url,{signal:ctl.signal,headers:{'User-Agent':UA}}); if(!r.ok)return null; return await r.json(); }
  catch(e){ return null; } finally{ clearTimeout(to); }
}

// Figure-words appended to a syllabus topic describe the KIND of figure we want,
// not the concept itself. Wikidata is searched for the CONCEPT, so these are
// stripped first, or "greenhouse effect diagram" misses Q41560 "greenhouse
// effect". But the country / subject noun must be KEPT: stripping "india" from
// "india population density map" resolves to a generic "population density"
// item and returns a map of Spain. So this list is figure-nouns only.
var FIGURE_WORD_RE = /\b(diagram|diagrams|map|maps|chart|charts|outline|flowchart|schematic|anatomy|cladogram|phylogenetic|skeleton|blank|graph|flow|table)\b/gi;
function conceptQuery(topic) {
  var t = String(topic).toLowerCase()
    .replace(FIGURE_WORD_RE, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return t;
}

// Head-relevance guard. Wikidata search for a multi-word concept often returns an
// item for a DIFFERENT entity that shares the generic words: "india population
// density" returns "Population density of Spain", whose figures depict Spain.
// Accepting that would be a high-confidence wrong answer, which is worse than
// skipping. So a candidate Q-item is only usable when its own label is about the
// concept's distinctive token -- here the first content word ("india" for
// "india population density", "greenhouse" for "greenhouse effect"). This keeps
// genuinely-specific items ("greenhouse effect" -> Q41560) and drops off-entity
// ones ("population density of Spain").
var COMMON_NOUN = {
  population:1, density:1, map:1, density_:1, distribution:1, growth:1, rate:1, index:1,
  system:1, structure:1, process:1, network:1, model:1, type:1, types:1, list:1,
  effects:1, effect:1, energy:1, flow:1, cycle:1, layer:1, region:1, area:1, change:1
};
function headTokens(concept) {
  return concept.split(' ').filter(function (w) { return w.length > 2 && !COMMON_NOUN[w]; });
}
function qidIsAbout(q, concept) {
  var head = headTokens(concept);
  if (!head.length) return true; // nothing distinctive to require
  var label = norm(q.label);
  // The Q-item must mention the concept's distinctive head word.
  return head.some(function (w) { return wholeWord(label, w); });
}

// 1) topic -> candidate Wikidata Q-items (prefer the most-used/most-central).
async function topicQids(topic){
  var concept = conceptQuery(topic);
  var queries = [concept];
  if (concept !== String(topic).toLowerCase().trim()) queries.push(String(topic).toLowerCase().trim());
  var seen = {};
  var out = [];
  for (var qi = 0; qi < queries.length; qi++) {
    var q = queries[qi];
    if (!q || seen[q]) continue;
    seen[q] = 1;
    var j = await jget(WD + '?action=wbsearchentities&search=' + encodeURIComponent(q) + '&language=en&uselang=en&format=json&limit=8&type=item');
    var res = (j && j.search) || [];
    res.forEach(function (r) {
      if (!/^Q\d+$/.test(r.id) || out.some(function (o) { return o.qid === r.id; })) return;
      // Drop off-entity results (e.g. a specific country's item for a generic
      // concept) before they can yield a confident-but-wrong figure.
      if (!qidIsAbout(r, concept)) return;
      out.push({ qid: r.id, label: r.label, desc: r.description || '' });
    });
  }
  return out;
}

// 2) Commons files that assert depicts = QID  (the strong signal).
async function filesDepicting(qid){
  var j=await jget(CAPI+'?action=query&list=search&srnamespace=6&srlimit=50&format=json&srsearch='+encodeURIComponent('haswbstatement:P180='+qid));
  return ((j&&j.query&&j.query.search)||[]).map(function(s){return s.title.replace(/^File:/,'');});
}

// 2b) Commons category members for the exact category (P373 or "Category:label").
async function filesInCategory(cat){
  var j=await jget(CAPI+'?action=query&list=categorymembers&cmtype=file&cmlimit=50&format=json&cmtitle='+encodeURIComponent(cat));
  return ((j&&j.query&&j.query.categorymembers)||[]).map(function(s){return s.title.replace(/^File:/,'');});
}

async function p373(qid){
  var j=await jget(WD+'?action=wbgetclaims&entity='+qid+'&property=P373&format=json');
  var c=j&&j.claims&&j.claims.P373;
  if(!c||!c.length)return null;
  var v=c[0].mainsnak&&c[0].mainsnak.datavalue&&c[0].mainsnak.datavalue.value;
  return v||null;
}

// 3) Wikipedia lead/infobox image for a concept article.
async function leadImage(qid){
  var s=await jget(WD+'?action=wbgetentities&ids='+qid+'&props=sitelinks&sitefilter=enwiki&format=json');
  var ent=s&&s.entities&&s.entities[qid];
  var title=ent&&ent.sitelinks&&ent.sitelinks.enwiki&&ent.sitelinks.enwiki.title;
  if(!title)return null;
  var pj=await jget(WAPI+'?action=query&format=json&prop=pageimages&piprop=original&titles='+encodeURIComponent(title));
  var p=pj&&pj.query&&pj.query.pages&&Object.values(pj.query.pages)[0];
  if(p&&p.original&&p.original.source){
    var m=p.original.source.match(/\/wiki\/File:(.+)$/);
    if(m)return {file:decodeURIComponent(m[1]),article:title};
  }
  return null;
}

async function describe(file){
  var j=await jget(CAPI+'?action=query&format=json&prop=imageinfo&iiprop=extmetadata&titles='+encodeURIComponent('File:'+file));
  var p=j&&j.query&&j.query.pages&&Object.values(j.query.pages)[0];
  var d='';
  if(p&&p.imageinfo&&p.imageinfo[0]&&p.imageinfo[0].extmetadata){
    var em=p.imageinfo[0].extmetadata;
    d=[em.ImageDescription&&em.ImageDescription.value,em.ObjectName&&em.ObjectName.value,em.Categories&&em.Categories.value].filter(Boolean).join(' ');
  }
  return d;
}

/**
 * Resolve a topic to a high-confidence figure, or null.
 * @returns {Promise<{file,tier,conf,method,qid,article?}|null>}
 */
async function resolve(topic, opts){
  opts=opts||{};
  var qids=await topicQids(topic);
  for(var i=0;i<qids.length;i++){
    var q=qids[i];

    // Tier 1a: files that assert "depicts this Q-item".
    var dep=await filesDepicting(q.qid);
    var depDiag=dep.filter(function(f){return isDiagramish(f,'');});
    if(depDiag.length){
      // prefer svg, then any
      depDiag.sort(function(a,b){return (/\.svg$/i.test(b)?1:0)-(/\.svg$/i.test(a)?1:0);});
      return {file:depDiag[0],tier:1,conf:0.97,method:'depicts:'+q.qid,qid:q.qid};
    }

    // Tier 1b: exact Commons category named by the item.
    var cat=await p373(q.qid);
    if(cat){
      var catFiles=(await filesInCategory('Category:'+cat)).filter(function(f){return isDiagramish(f,'');});
      if(catFiles.length){
        catFiles.sort(function(a,b){return (/\.svg$/i.test(b)?1:0)-(/\.svg$/i.test(a)?1:0);});
        return {file:catFiles[0],tier:1,conf:0.93,method:'category:'+cat,qid:q.qid};
      }
    }

    // Tier 2: lead image, validated as diagram-ish.
    var lead=await leadImage(q.qid);
    if(lead&&isDiagramish(lead.file,'')){
      return {file:lead.file,tier:2,conf:0.85,method:'lead',qid:q.qid,article:lead.article};
    }
    if(lead){
      // lead exists but is a photo/unknown -> return it low-confidence so caller can decide
      return {file:lead.file,tier:3,conf:0.5,method:'lead-photo',qid:q.qid,article:lead.article};
    }
  }
  return null;
}

module.exports={resolve:resolve,isDiagramish:isDiagramish,norm:norm,topicQids:topicQids,filesDepicting:filesDepicting,filesInCategory:filesInCategory,leadImage:leadImage};
