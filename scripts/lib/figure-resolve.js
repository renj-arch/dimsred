/*
 * figure-resolve.js -- automatic figure resolution for curated UPSC topics.
 *
 * v1 matched topic words against file DESCRIPTION text. Fails: substring
 * coincidence ("india" inside "west india") produced historic maps of North
 * America. v2 used Wikimedia structured data (P180 depicts / P373 category),
 * which is correct but sparse -- a full CI run resolved only 13 of 126 topics,
 * because most syllabus topics have no Wikidata item, so the loop exited empty.
 *
 * v3 keeps the structured assertions as the top tier and adds the route that
 * actually carries coverage: the concept's own Wikipedia article already lists
 * the canonical figure in its image list. "computer network topology" -> article
 * "Network topology" -> NetworkTopologies.svg. Correctness does not come from
 * guessing at free text; it comes from two independent constraints:
 *
 *   1. the file must be attached to the article about THIS concept, and
 *   2. the filename must share the concept's distinctive tokens with the title.
 *
 * Either constraint alone is unsafe (an article carries 20 unrelated images; a
 * filename match alone is v1 again). Together they are tight. Nothing is ever
 * returned that fails both, and a topic with no survivor is SKIPPED -- skipping
 * is a correct outcome, not a failure.
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
var PHOTO_RE=/\b(photo|photos|photograph|photographs|picture|pictures|image of|view of|scene|panorama|sunset|sunrise|night|portrait|selfie|aerial|satellite photo|cropped|inception date)\b/;
// A raster file counts as a figure only when its NAME says so. The earlier
// broad list let prose words do the work -- "Dudhwa National Park, Lucknow
// division, Uttar Pradesh...jpg" was called a diagram because "division" was
// in it, and that photograph then answered "national parks india map".
var DIAGRAM_RE=/\b(map|maps|chart|charts|diagram|diagrams|outline|topolog(y|ies)|hierarchy|flowchart|schematics?|layers?|pyramid|timeline|cross section|anatomy|structure|graph|grid|blueprint|skeleton|cladogram|phylogenetic|sequence|distribution|density|projection|framework|mechanism|network|route|routes|table|template|spectrum|formula)\b/;
var JUNK_RE=/^(commons logo|wikidata|wikimedia|wiktionary|wikibooks|wikinews|wikiquote|wikiversity|wikivoyage|wikisource|wiki(pedia|voyage) logo|oojs ui|question book|edit clear|edit-pencil|search icon|symbol |vte |nuvola|ambox|cscr-|editthis|font-|yes check|snowflake|crystal|padlock|information icon|arrow |chevron|barnstar|portal |folder|icon )/;
// National/organisational identifiers appear inside almost every India article as
// an SVG, so the SVG preference would otherwise crown Flag of India.svg as the
// answer for "tiger reserves india", "ports map", "judicial hierarchy" alike.
var SYMBOL_RE=/\b(flag|flags|emblem|logo|logos|coat of arms|arms of|seal of|anthem|insignia|wordmark|banner)\b/;

function isSymbol(f){ return SYMBOL_RE.test(contentTokens(f).join(' ')); }
function isJunk(f){ return JUNK_RE.test(contentTokens(f).join(' ')); }

function isDiagramish(title, desc){
  if(NON_IMAGE_RE.test(title))return false;
  if(/\.svg$/i.test(title))return true;
  var t=norm(title)+' '+norm(desc||'');
  if(PHOTO_RE.test(t))return false;
  return DIAGRAM_RE.test(t);
}

var API_CALLS = 0;
var API_FAIL = 0;

// jget used to return null on any non-2xx, which made a Wikimedia rate-limit
// (429) or a 5xx indistinguishable from "this concept has no figure". The first
// CI run then wrote 95 fake gaps from a single throttled burst. Failures are
// retried with backoff, counted, and reported so a throttled run fails loudly
// instead of committing silence.
async function jget(url){
  for(var attempt=0;attempt<3;attempt++){
    var ctl=new AbortController(); var to=setTimeout(function(){ctl.abort();},20000);
    try{
      var r=await fetch(url,{signal:ctl.signal,headers:{'User-Agent':UA}});
      if(r.ok){ API_CALLS++; return await r.json(); }
      API_CALLS++;
      if(r.status===429||r.status>=500){
        var ra=parseInt(r.headers.get('retry-after')||'0',10);
        await new Promise(function(res){setTimeout(res,(ra>0?ra*1000:0)+(attempt+1)*1500);});
        continue;
      }
      API_FAIL++; // 4xx other than 429: permanent, do not retry
      return null;
    }catch(e){
      API_CALLS++;
      await new Promise(function(res){setTimeout(res,(attempt+1)*1500);});
    } finally{ clearTimeout(to); }
  }
  API_FAIL++;
  return null;
}
function apiStats(){ return { calls: API_CALLS, fail: API_FAIL }; }

// Figure-words describe the KIND of figure wanted, not the concept, so they are
// removed before the concept lookup. The subject noun is deliberately kept:
// stripping "india" from "india population density map" resolves to a generic
// "population density" item and returns a map of Spain.
var FIGURE_WORD_RE=/\b(diagram|diagrams|map|maps|chart|charts|outline|flowchart|schematic|anatomy|cladogram|phylogenetic|skeleton|blank|graph|flow|table|block diagram)\b/gi;
var STOPWORD_RE=/^(of|the|a|an|for|to|in|on|and|or|vs|with|by|from|into|wise|related|features|system|systems|types|type|forms|form|process|major|how|what|why|based|new|old)$/;

function conceptQuery(topic){
  var t=String(topic).toLowerCase()
    .replace(FIGURE_WORD_RE,' ')
    .replace(/[^a-z0-9\s]/g,' ')
    .replace(/\s+/g,' ')
    .trim();
  return t;
}

function contentTokens(s){
  // Split CamelCase before normalising: "NetworkTopologies.svg" is a single
  // lowercase blob to norm(), so "topology" would never match it and the topic's
  // own figure was rejected.
  var raw=String(s==null?'':s).replace(/([a-z0-9])([A-Z])/g,'$1 $2').replace(/[_\-]+/g,' ');
  var seen={};
  return norm(raw).split(' ').filter(function(w){
    if(!w||STOPWORD_RE.test(w))return false;
    if(seen[w])return false;
    seen[w]=1; return true;
  });
}

// Derivation only: one token must be a true prefix of the other, with at least
// 4 characters on the short side. The looser shared-prefix form this replaced
// scored "ganga" ~ "gangwar" as a match and returned a politician's photo for
// "river ganga tributaries".
function tokMatch(a,b){
  if(!a||!b)return false;
  if(a===b)return true;
  if(a.length<4||b.length<4)return false;
  return (a.indexOf(b)===0||b.indexOf(a)===0);
}

function stemMatch(tok,list){ return list.some(function(x){return tokMatch(tok,x);}); }

// ---------- article resolution ----------

async function searchArticles(concept){
  // Strip leftover filler before querying: conceptQuery can leave a query of
  // "of cpu" (after "block diagram" is removed), which ranks disambiguation
  // pages for CPU above the real article.
  var query=contentTokens(concept).join(' ')||concept;
  var j=await jget(WAPI+'?action=query&list=search&srsearch='+encodeURIComponent(query)+'&srlimit=8&format=json');
  return ((j&&j.query&&j.query.search)||[]).map(function(s){return s.title;});
}

// Choose the article about the concept. Coverage dominates: an article that
// names the whole concept beats a higher-ranked narrow one ("Cattle slaughter
// in India" for "india major cattle breeds" must lose to "Indigenous cattle
// breeds of India"), and shorter titles stay preferred when coverage ties.
function pickArticle(titles, concept){
  var ctoks=contentTokens(concept);
  var best=null,bestScore=-1;
  titles.forEach(function(title,rank){
    // A disambiguation page lists concepts; it never carries their figures.
    if(/disambiguation/i.test(title))return;
    var ttoks=contentTokens(title);
    var covered=ctoks.filter(function(c){return stemMatch(c,ttoks);}).length;
    var cov=ctoks.length?covered/ctoks.length:0;
    if(cov<0.5)return;
    var score=cov*3+0.2*(1-rank/8)-(ttoks.length>ctoks.length+1?0.3:0);
    if(score>bestScore){bestScore=score;best=title;}
  });
  return best;
}

function articleCoverage(title,concept){
  var ctoks=contentTokens(concept);
  var ttoks=contentTokens(title);
  if(!ctoks.length||!ttoks.length)return 0;
  return ctoks.filter(function(c){return stemMatch(c,ttoks);}).length/ctoks.length;
}

async function articleImages(title){
  var j=await jget(WAPI+'?action=query&format=json&prop=images&imlimit=50&titles='+encodeURIComponent(title));
  var p=j&&j.query&&j.query.pages;
  if(!p)return [];
  var imgs=[];
  Object.keys(p).forEach(function(k){ (p[k].images||[]).forEach(function(x){imgs.push(x.title.replace(/^File:/,''));}); });
  return imgs;
}

// The article's pageimage (infobox/lead file) is the one editors chose to
// represent the page, e.g. the ports article's seaports map. prop=images is
// alphabetical, so this must be fetched separately to get the preference.
async function leadFile(title){
  var j=await jget(WAPI+'?action=query&format=json&prop=pageimages&piprop=name&titles='+encodeURIComponent(title));
  var p=j&&j.query&&j.query.pages;
  if(!p)return null;
  var v=null;
  Object.keys(p).forEach(function(k){ if(p[k].pageimage)v=p[k].pageimage; });
  return v;
}

function stripExt(f){return f.replace(/\.(svg|png|jpe?g|gif|webp)$/i,'');}

// How many of the concept's own words appear in this filename. Zero means the
// file is only related through some other record (an article, a category, a
// depicts statement) and is therefore not safe to publish on its own.
function nameHitCount(f, ctoks){
  if(!ctoks||!ctoks.length)return 0;
  var ftoks=contentTokens(stripExt(f));
  return ctoks.filter(function(c){return stemMatch(c,ftoks);}).length;
}

// Like conceptQuery(), but the stopwords stay. "laser types diagram" must not
// collapse to the single token "laser", or every laser file in
// Category:Laser printers reads as full coverage of the topic.
function topicGateTokens(topic){
  var t=String(topic==null?'':topic).toLowerCase()
    .replace(FIGURE_WORD_RE,' ')
    .replace(/[^a-z0-9\s]/g,' ')
    .replace(/\s+/g,' ').trim();
  var seen={};
  return t.split(' ').filter(function(w){
    w=norm(w);
    if(!w||seen[w])return false;
    seen[w]=1; return true;
  });
}

// Pick the article image that is demonstrably about the concept.
// Gate 1 (safety): concept tokens must be covered by title+filename together,
//   so an unrelated picture inside the right article cannot pass on title alone.
// Gate 2 (specificity): the FILENAME itself must carry the concept's tokens --
//   two of them when the concept has three or more. One token is not enough:
//   that is how "Flag of India.svg" passed for "tiger reserves india".
// Gate 3 (form): if the topic asked for a map/diagram/hierarchy, the file must
//   actually be one; a photograph cannot answer a request for a diagram.
function pickImage(imgs, articleTitle, concept, opts){
  opts=opts||{};
  var ctoks=contentTokens(concept);
  if(!ctoks.length)return null;
  var atoks=contentTokens(articleTitle);
  var needName=ctoks.length>=3?2:1;
  var best=null,bestScore=-1;
  // Skip figures this run has already used. The builder marks each accepted
  // file so the same image cannot serve two topics, but that set was only ever
  // consulted by fileOK() in the caller -- pickImage never saw it, so two topics
  // mapped to the same article both received the identical picture
  // ("India film clapperboard (variant).svg" under two different cinema topics).
  var excl=opts.exclude||{};
  imgs.forEach(function(f){
    if(excl[f])return;
    if(isJunk(f))return;
    if(NON_IMAGE_RE.test(f))return;
    if(isSymbol(f))return;
    var diagram=isDiagramish(f,'');
    if(opts.wantsDiagram&&!diagram)return;
    var ftoks=contentTokens(stripExt(f));
    var nameHit=ctoks.filter(function(c){return stemMatch(c,ftoks);});
    // pageimage names use underscores ("Airports_and_seaports_map.png") while
    // the image list uses spaces, so the raw equality this replaces never fired.
    var isLead=!!opts.lead&&norm(opts.lead)===norm(f);
    // The filename must carry the concept's words. A photograph needs strict
    // coverage on its own -- only a real figure may lean on the article title
    // to supply the missing words, which is what rejected "Megalithic burial
    // mound, India.jpg" for "stupas india". The pageimage is exempt: it was
    // chosen to represent the whole article.
    var ncov=ctoks.length?nameHit.length/ctoks.length:0;
    // No concept word in the filename at all -> never acceptable, however
    // complete the article title is. This is what rejected "PD-icon.svg" for
    // "writs types", where the one-word article title alone read as full cover.
    //
    // A curated article is the one exception: when the mapping names the
    // article outright, the lead image represents that article by construction,
    // so requiring its filename to repeat the concept rejects correct figures.
    // "Taj_Mahal.jpg" carries neither "indo" nor "islamic" nor "architecture"
    // yet is the canonical image for Indo-Islamic architecture. Only the lead
    // image is exempt, and only for curated mappings -- isJunk, NON_IMAGE_RE,
    // isSymbol and wantsDiagram all still apply to it, and every non-lead image
    // is judged exactly as before.
    var curatedLead=!!opts.curated&&isLead;
    if(!nameHit.length&&!curatedLead)return;
    if(!isLead){
      if(!diagram&&!nameHit.length)return;
      if(!diagram&&ncov<0.66)return;
      // A raster only counts as a diagram because its name says "map" or
      // "chart", which says nothing about the subject it draws: that let
      // "India location map 3.png" serve as the figure for "india major ports
      // map". Line drawings (SVG) keep the looser rule, because a labelled
      // schematic often names only part of the concept.
      if(diagram&&!/\.svg$/i.test(f)&&ncov<0.66)return;
      // When the article's own title names the WHOLE concept, any real figure
      // inside it is about that concept by construction -- a map in "List of
      // national parks of India" is a parks map -- so the filename may be loose.
      if(!opts.titleCoversAll&&nameHit.length<needName)return;
    }
    var allTok=atoks.concat(ftoks);
    var covered=ctoks.filter(function(c){return stemMatch(c,allTok);}).length;
    var cov=covered/ctoks.length;
    if(cov<0.66&&!curatedLead)return;
    if(isLead&&cov<1&&!curatedLead)return;
    var svg=/\.svg$/i.test(f);
    var photo=PHOTO_RE.test(norm(f))&&!svg&&!diagram;
    var score=cov*2+(nameHit.length/ctoks.length)+(svg?0.5:0)-(photo?0.7:0)
      +(nameHit.length===ctoks.length?0.3:0)+(isLead?0.6:0)
      -(ftoks.length>ctoks.length+3?0.15:0);
    if(score>bestScore){bestScore=score;best=f;}
  });
  return best;
}

// ---------- structured-data tiers ----------

var COMMON_NOUN={population:1,density:1,distribution:1,growth:1,rate:1,index:1,
  system:1,structure:1,process:1,flow:1,cycle:1,layer:1,region:1,area:1,change:1,
  map:1,form:1,change_:1,form_:1};

function headTokens(concept){
  return contentTokens(concept).filter(function(w){return !COMMON_NOUN[w];});
}
function qidIsAbout(q,concept){
  var head=headTokens(concept);
  if(!head.length)return true;
  var label=norm(q.label);
  return head.some(function(w){return wholeWord(label,w)||stemMatch(w,[norm(q.label)]);});
}

async function topicQids(topic){
  var concept=conceptQuery(topic);
  var j=await jget(WD+'?action=wbsearchentities&search='+encodeURIComponent(concept)+'&language=en&uselang=en&format=json&limit=8&type=item');
  var res=(j&&j.search)||[];
  return res.filter(function(r){return /^Q\d+$/.test(r.id);})
            .filter(function(r){return qidIsAbout(r,concept);})
            .map(function(r){return {qid:r.id,label:r.label,desc:r.description||''};});
}

async function filesDepicting(qid){
  var j=await jget(CAPI+'?action=query&list=search&srnamespace=6&srlimit=50&format=json&srsearch='+encodeURIComponent('haswbstatement:P180='+qid));
  return ((j&&j.query&&j.query.search)||[]).map(function(s){return s.title.replace(/^File:/,'');});
}

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

// Commons filename search restricted to the concept's own words. intitle: checks
// the filename only, never the free-text description that broke v1.
async function commonsIntitle(concept){
  var c=conceptQuery(concept);
  var phrases=[c];
  var parts=c.split(' ').filter(Boolean);
  if(parts.length>2)phrases.push(parts.slice(0,Math.max(2,parts.length-1)).join(' '));
  var out=[];
  for(var i=0;i<phrases.length;i++){
    var j=await jget(CAPI+'?action=query&list=search&srnamespace=6&srlimit=30&format=json&srsearch='+encodeURIComponent('intitle:"'+phrases[i]+'"'));
    var r=(j&&j.query&&j.query.search)||[];
    r.forEach(function(s){var f=s.title.replace(/^File:/,''); if(out.indexOf(f)<0)out.push(f);});
    if(out.length)break;
  }
  return out;
}

// Existence + mime check, batched. Rejects files that are not renderable images.
async function verifyFiles(files){
  if(!files.length)return [];
  var ok=[];
  for(var i=0;i<files.length;i+=25){
    var chunk=files.slice(i,i+25);
    var j=await jget(CAPI+'?action=query&format=json&prop=imageinfo&iiprop=url|mime|size&titles='+encodeURIComponent(chunk.map(function(f){return 'File:'+f;}).join('|')));
    var p=j&&j.query&&j.query.pages;
    if(!p)continue;
    Object.keys(p).forEach(function(k){
      var pg=p[k]; if(pg.missing)return;
      var ii=pg.imageinfo&&pg.imageinfo[0];
      if(!ii)return;
      if(NON_IMAGE_RE.test(pg.title))return;
      if(!/^image\//.test(ii.mime||''))return;
      ok.push(pg.title.replace(/^File:/,''));
    });
  }
  return ok;
}

function bySvgThenName(a,b){
  var av=/\.svg$/i.test(a)?1:0,bv=/\.svg$/i.test(b)?1:0;
  if(av!==bv)return bv-av;
  return a.length-b.length;
}

/**
 * Resolve a topic to a high-confidence figure, or null.
 * @returns {Promise<{file,tier,conf,method,qid?,article?}|null>}
 */
async function resolve(topic,opts){
  opts=opts||{};
  var concept=conceptQuery(topic);
  // The topic itself says what FORM the figure must take; conceptQuery strips
  // those words to find the concept, so the requirement is read before stripping.
  var wantsDiagram=FIGURE_WORD_RE.test(String(topic))||/\b(hierarchy|structure|layers|topology|types)\b/i.test(String(topic));
  FIGURE_WORD_RE.lastIndex=0;

  // Tier 1: Wikimedia's own assertion that a file depicts this concept.
  // Both structured tiers are still name-gated: "Siddha medicine" resolving to
  // "1 Om.svg" (depicts) and "laser types" to Corona charging.svg (category
  // Laser printers) passed because membership alone was treated as proof.
  var ctoks1 = contentTokens(concept);
  // A curated qid skips the search entirely. topicQids() has to guess an entity
  // from the topic string, and the UPSC syllabus phrases that reach this file
  // are not entity names: "indo-islamic architecture features" and "gandhara
  // and mathura school art" match no Wikidata label, so the search returned
  // nothing and the topic stayed unmatched forever. A qid names the concept
  // outright. Every gate below still runs -- this replaces the lookup, not the
  // verification.
  var qids=opts.qid?[{qid:String(opts.qid)}]:await topicQids(topic);
  for(var i=0;i<Math.min(qids.length,3);i++){
    var q=qids[i];
    var dep=(await filesDepicting(q.qid)).filter(function(f){
      return isDiagramish(f,'') && !isSymbol(f) && nameHitCount(f,ctoks1)>=1;
    });
    if(dep.length){
      dep.sort(bySvgThenName);
      var v=await verifyFiles([dep[0]]);
      if(v.length)return {file:v[0],tier:1,conf:0.97,method:'depicts:'+q.qid,qid:q.qid};
    }
    var cat=await p373(q.qid);
    if(cat){
      var catToks=contentTokens(cat);
      // Category membership alone is not proof: Category:Day would otherwise
      // vouch for a twilight photo under "earth day". The category name and
      // the filename together must cover most of the topic, and a photo (which
      // has no diagram structure to identify it) must at least open with the
      // concept instead of a brand ("Alcoa Earth Day").
      var gToks=topicGateTokens(topic);
      var cf=(await filesInCategory('Category:'+cat)).filter(function(f){
        if(!gToks.length)return false;
        var ft=contentTokens(stripExt(f));
        var hit=gToks.filter(function(c){return stemMatch(c,catToks)||stemMatch(c,ft);}).length;
        if(hit/gToks.length<0.66)return false;
        if(isDiagramish(f,''))return true;
        // Captions often open with a year ("1962 World Health Day poster").
        var li=0;
        while(ft[li]&&/^\d+$/.test(ft[li]))li++;
        var lead=ft[li];
        return !!lead&&gToks.some(function(c){return tokMatch(c,lead);});
      });
      var cpick=pickImage(cf,concept,concept,{wantsDiagram:wantsDiagram,exclude:opts.exclude});
      if(cpick){
        var v2=await verifyFiles([cpick]);
        if(v2.length)return {file:v2[0],tier:1,conf:0.9,method:'category:'+cat,qid:q.qid};
      }
    }
  }

  // Tier 2: the figure the Wikipedia article about this concept actually carries.
  // opts.article pins the article instead of searching for it. A curated
  // mapping is authoritative about WHICH article, so the search and its
  // coverage-driven retry are skipped -- but the image gates are not skipped:
  // pickImage() still rejects non-diagrams and symbols, and still requires the
  // filename to cover the concept.
  //
  // Coverage is judged against the article's own tokens rather than the topic.
  // That distinction is the whole point: the topic is a syllabus phrase that
  // can never cover an article title ("temple architecture map south india" vs
  // "Hindu temple architecture"), so judging coverage on the topic would
  // reject every correct mapping handed in here.
  var forced=opts.article||null;
  var titles=forced?[]:await searchArticles(concept);
  var article=forced||pickArticle(titles,concept);
  // If no result names the whole concept, search again without the filler words
  // ("india major cattle breeds" -> "india cattle breeds"), which is what
  // surfaces "Indigenous cattle breeds of India" instead of the article about
  // cattle-slaughter law that ranks for the original phrasing.
  if(!forced&&(!article||articleCoverage(article,concept)<1)){
    var alt=await searchArticles(contentTokens(concept).join(' '));
    var merged=titles.slice();
    alt.forEach(function(t){if(merged.indexOf(t)<0)merged.push(t);});
    var better=pickArticle(merged,concept);
    if(better&&(!article||articleCoverage(better,concept)>articleCoverage(article,concept))){
      article=better;
    }
  }
  if(article){
    var imgs=await articleImages(article);
    var lead=await leadFile(article);
    // If figure-word stripping left a thin concept ("block diagram of cpu" ->
    // "of cpu"), coverage is judged against the full topic instead, or a
    // one-word concept would score every article as a perfect match.
    var coverToks=forced?contentTokens(article):contentTokens(concept);
    var pick=pickImage(imgs,article,forced?article:concept,{wantsDiagram:wantsDiagram,lead:lead,curated:!!forced,exclude:opts.exclude,
      titleCoversAll:forced?true:articleCoverage(article,coverToks.length>=2?concept:topic)>=1});
    if(pick){
      var v3=await verifyFiles([pick]);
      if(v3.length){
        var svg=/\.svg$/i.test(v3[0]);
        // A search-derived pick scores 0.8 for a photo because nothing pinned
        // the subject -- the article was guessed from the topic string. A
        // curated mapping pins it, so a photo is worth the same 0.9 as an SVG
        // here. Without this every curated PHOTO match is silently discarded
        // downstream: AUTO_MIN_CONF is 0.85, so "Stupa 1, Sanchi 02.jpg" and
        // "GandharaFrieze.JPG" were both correct and both rejected, while only
        // the SVG picks could ever land. This does not weaken the gate for
        // uncurated topics, which keep 0.8/0.9 exactly as before.
        var c=forced?0.9:(svg?0.9:0.8);
        return {file:v3[0],tier:svg?2:3,conf:c,method:(forced?'curated:':'article:')+article,article:article,curated:!!forced};
      }
    }
  }

  // Tier 3: Commons files whose NAME is the concept phrase (all surviving
  // candidates are still name-checked against the concept before returning).
  var byName=await commonsIntitle(concept);
  var ctoks=contentTokens(concept);
  var named=byName.filter(function(f){
    if(isJunk(f)||NON_IMAGE_RE.test(f)||isSymbol(f))return false;
    if(!isDiagramish(f,''))return false;
    var ftoks=contentTokens(stripExt(f));
    // Full coverage only. This tier has no article to fall back on, so partial
    // matches here are how "fundamental rights india" reached the EU charter.
    return ctoks.length>0&&ctoks.every(function(c){return stemMatch(c,ftoks);});
  });
  if(named.length){
    named.sort(bySvgThenName);
    var v4=await verifyFiles([named[0]]);
    if(v4.length)return {file:v4[0],tier:3,conf:0.8,method:'intitle',article:article||null};
  }

  return null;
}

module.exports={resolve:resolve,isDiagramish:isDiagramish,norm:norm,topicQids:topicQids,
  filesDepicting:filesDepicting,filesInCategory:filesInCategory,apiStats:apiStats,
  conceptQuery:conceptQuery,pickArticle:pickArticle,pickImage:pickImage};
