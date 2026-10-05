// Debug version - test each function individually
var fs = require('fs');
var base = fs.readFileSync('js/mental-training.js','utf8');

function testInsert(funcName, newVariants) {
  var s2 = base;
  var funcStart = s2.indexOf('function ' + funcName);
  if (funcStart === -1) { console.log(funcName + ': NOT FOUND'); return; }
  var arrStart = -1;
  ['var ty = [', 'var types = [', 'var comps = ['].forEach(function(v) {
    var idx = s2.indexOf(v, funcStart);
    if (idx > 0 && (arrStart === -1 || idx < arrStart)) { arrStart = idx; }
  });
  if (arrStart === -1) { console.log(funcName + ': NO ARRAY'); return; }
  var depth = 0, arrEnd = -1;
  for (var i = arrStart; i < s2.length; i++) {
    if (s2[i] === '[') depth++;
    else if (s2[i] === ']') { depth--; if (depth === 0) { arrEnd = i; break; } }
  }
  if (arrEnd === -1) { console.log(funcName + ': NO END'); return; }
  
  var lastCloseBrace = arrEnd;
  for (var i = arrEnd; i >= arrStart; i--) {
    if (s2[i] === '}') { lastCloseBrace = i; break; }
  }
  
  var before = s2.substring(0, lastCloseBrace + 1);
  var after = s2.substring(lastCloseBrace + 1);
  var insertText = ',\n    // SBI PO Hard: new variants\n' + newVariants.join('');
  var newS = before + insertText + after;
  
  try {
    new Function(newS);
    console.log(funcName + ': OK');
    // Actually write to file if all pass
    return newS;
  } catch(e) {
    console.log(funcName + ': SYNTAX ERROR');
    console.log('  ' + e.message.substring(0, 150));
    // Print the area around insertion
    var insStart = before.length;
    console.log('  Context: ...' + s2.substring(insStart-50, insStart+50).replace(/\n/g, '\\n') + '...');
    return null;
  }
}

var inserts = {
  generateQuadraticQuestion: [
    "    function(){ var a=rand(1,4), b=rand(2,6); return { q:'Form quadratic: roots '+a+' and '+b, a:'x\\u00b2-'+(a+b)+'x+'+(a*b), hint:'x\\u00b2-(sum)x+product=0' }; },\n" +
    "    function(){ var a=rand(1,4), b=rand(2,5); return { q:'Roots of x\\u00b2-'+(a+b)+'x+'+(a*b)+'=0. Find 1/\\u03b1 + 1/\\u03b2', a:Math.round((a+b)/(a*b)*100)/100, hint:'Sum/Product = '+(a+b)+'/'+(a*b) }; },\n" +
    "    // SBI PO Hard: discriminant nature\n" +
    "    function(){ var a=rand(1,3), b=rand(5,9), c=rand(2,4); var d=b*b-4*a*c; return { q:'Nature of roots: '+a+'x\\u00b2+'+b+'x+'+c+'=0', a:d>0?'Real & distinct':(d===0?'Real & equal':'Imaginary'), hint:'D='+b+'\\u00b2-4\\u00d7'+a+'\\u00d7'+c+'='+d }; },\n" +
    "    function(){ var a=rand(1,3), b=rand(3,8), c=rand(1,4); var d=b*b-4*a*c; if(d<0){c=1;d=b*b-4*a*c;} var r=Math.round((-b+Math.sqrt(d))/(2*a)*10)/10; return { q:'Solve: '+a+'x\\u00b2+'+b+'x+'+c+'=0 (larger root)', a:r, hint:'x = [-b \\u00b1 \\u221a(b\\u00b2-4ac)]/2a' }; },\n" +
    "    function(){ var a=rand(1,3), b=rand(4,8); return { q:'Find k: '+a+'x\\u00b2+'+b+'x+k=0 has equal roots', a:Math.round(b*b/(4*a)), hint:'D=0: '+b+'\\u00b2-4\\u00d7'+a+'\\u00d7k=0' }; },\n" +
    "    function(){ var a=rand(1,4), b=rand(2,5); return { q:'Sum='+(a+b)+', product='+(a*b)+'. Find quadratic', a:'x\\u00b2-'+(a+b)+'x+'+(a*b), hint:'x\\u00b2 - Sx + P = 0' }; },\n" +
    "    function(){ var a=rand(2,5), b=rand(1,4); var val=a*a+b*b-a*b; return { q:'Solve: '+a+'x\\u00b2+'+b+'x='+val+' (positive root)', a:Math.round((-b+Math.sqrt(b*b+4*a*val))/(2*a)*10)/10, hint:'Rearrange: '+a+'x\\u00b2+'+b+'x-'+val+'=0, apply formula' }; },\n" +
    "    function(){ var a=rand(1,3), b=rand(2,6); return { q:'If \\u03b1,\\u03b2 roots of x\\u00b2-'+(a+b)+'x+'+(a*b)+'=0, find \\u03b1\\u00b2+\\u03b2\\u00b2', a:(a+b)*(a+b)-2*a*b, hint:'\\u03b1\\u00b2+\\u03b2\\u00b2=(\\u03b1+\\u03b2)\\u00b2-2\\u03b1\\u03b2 = '+(a+b)+'\\u00b2-2\\u00d7'+(a*b) }; }"
  ],
  generatePipesCisternsQuestion: [
    "    function(){ var a=rand(3,8), b=rand(a+2,12); return { q:'Pipe A fills in '+a+'h, B empties in '+b+'h. Both open?', a:Math.round(a*b/(b-a)), hint:'Net = 1/a-1/b. Time = a*b/(b-a)' }; },\n" +
    "    function(){ var a=rand(4,8), b=rand(5,10), c=rand(12,20); return { q:'Fills: A='+a+'h, B='+b+'h. Empty: C='+c+'h. All open?', a:Math.round(1/(1/a+1/b-1/c)), hint:'1/t = 1/a+1/b-1/c' }; },\n" +
    "    function(){ var a=rand(4,10), b=rand(a+3,18); return { q:'Pipe fills in '+a+'h. Leak takes '+b+'h. Leak empties full tank?', a:Math.round(a*b/(b-a)), hint:'Leak rate = 1/'+a+'-1/'+b+' = '+(1/a-1/b).toFixed(4) }; },\n" +
    "    function(){ var a=rand(4,8), b=rand(6,12); return { q:'A fills in '+a+'h, B in '+b+'h. A open 1h, then B alone. Total?', a:Math.ceil(1+(1-1/a)*b), hint:'A fills 1/'+a+'. Remaining '+(1-1/a).toFixed(2)+' at 1/'+b+' per h' }; },\n" +
    "    function(){ var a=rand(4,10), b=rand(6,14), h=rand(2,4); return { q:'A fills in '+a+'h, B empties in '+b+'h. Both open '+h+'h. How full?', a:Math.round((1/a-1/b)*h*100)/100, hint:'Net fill rate = 1/'+a+'-1/'+b+', \\u00d7'+h }; },\n" +
    "    function(){ var a=rand(2,5), b=rand(a+1,7), c=rand(b+2,10); var r=Math.round(1/(1/a+1/b+1/c)); return { q:'A='+a+'h, B='+b+'h, C='+c+'h (fill). Time for 2 tanks?', a:r*2, hint:'1 tank = '+r+'h. 2 tanks = '+r+'\\u00d72' }; },\n" +
    "    function(){ var a=rand(5,12), b=rand(a+2,15); var d=rand(2,4); var rem=1-d/a; var net=1/a-1/b; return { q:'Pipe A in '+a+'h. '+d+'h later, B (empties '+b+'h) opened. Total fill time?', a:Math.ceil(d+rem/net), hint:'Done='+d+'/'+a+'. Remaining '+rem.toFixed(2)+' at net rate '+(net).toFixed(4) }; },\n" +
    "    function(){ var a=rand(3,7), b=rand(5,11); return { q:'Cistern has '+a+' inlets (each fills '+b+'h). Outlet empties in '+(a*b)+'h. Fill time?', a:Math.round(1/(a/b-1/(a*b))), hint:'Inlet rate='+a+'/'+b+', outlet=1/'+(a*b) }; }"
  ],
  generateHeightDistanceQuestion: [
    "    function(){ var a=rand(30,60), d=rand(50,200); return { q:'Angle of elevation='+a+'\\u00b0, distance='+d+'m. Height?', a:Math.round(d*Math.tan(a*Math.PI/180)), hint:'Height = d \\u00d7 tan('+a+'\\u00b0) = '+Math.round(d*Math.tan(a*Math.PI/180))+'m' }; },\n" +
    "    function(){ var h=rand(30,100), a=rand(30,60); return { q:'Tower height='+h+'m, angle='+a+'\\u00b0. Shadow length?', a:Math.round(h/Math.tan(a*Math.PI/180)), hint:'Shadow = h/tan(angle)' }; },\n" +
    "    function(){ var a=rand(20,50), b=rand(a+10,70), d=rand(20,80); var h=Math.round(d/(1/Math.tan(a*Math.PI/180)-1/Math.tan(b*Math.PI/180))); return { q:'From point A, angle='+a+'\\u00b0, from B ('+d+'m closer), angle='+b+'\\u00b0. Height?', a:h, hint:'h = d/(cot A - cot B)' }; },\n" +
    "    function(){ var h=rand(30,80), a=rand(30,60); return { q:'Height='+h+'m, angle of elevation of top from point='+a+'\\u00b0. Distance from foot?', a:Math.round(h/Math.tan(a*Math.PI/180)), hint:'Distance = h \\u00d7 cot(angle)' }; },\n" +
    "    function(){ var h=rand(20,60), d=rand(20,50); return { q:'Building height='+h+'m. Shadow='+d+'m shorter when sun angle changes from '+rand(30,45)+'\\u00b0 to '+rand(50,70)+'\\u00b0. Original shadow?', a:Math.round(h/Math.tan(rand(30,45)*Math.PI/180)), hint:'Shadow = h/tan(original angle)' }; },\n" +
    "    function(){ var a=rand(30,60), b=rand(a+10,75), d=rand(50,150); var h=Math.round(d*Math.tan(a*Math.PI/180)*Math.tan(b*Math.PI/180)/(Math.tan(b*Math.PI/180)-Math.tan(a*Math.PI/180))); return { q:'From two points '+d+'m apart, angles='+a+'\\u00b0 and '+b+'\\u00b0. Height?', a:h, hint:'h = d tanA tanB/(tanB-tanA)' }; },\n" +
    "    function(){ var a=rand(20,50), d=rand(100,300); return { q:'Angle of depression='+a+'\\u00b0. Horizontal distance='+d+'m. Height?', a:Math.round(d*Math.tan(a*Math.PI/180)), hint:'Height = distance \\u00d7 tan(angle of depression)' }; },\n" +
    "    function(){ var h=rand(40,80), a=rand(25,50), b=rand(30,55); return { q:'Two towers: heights '+h+'m and '+(h+rand(10,30))+'m. Angle to top of taller from shorter'+String.fromCharCode(39)+'s base='+a+'\\u00b0. Their distance?', a:Math.round((h+rand(10,30))/Math.tan(a*Math.PI/180)), hint:'Distance = height/tan(angle)' }; }"
  ]
};

var result = base;
var allOK = true;
Object.keys(inserts).forEach(function(funcName) {
  var newS = testInsert(funcName, inserts[funcName]);
  if (newS) {
    result = newS;
  } else {
    allOK = false;
  }
});

if (allOK) {
  // Run all insertions on original to get final result
  var final = base;
  Object.keys(inserts).forEach(function(funcName) {
    var funcStart = final.indexOf('function ' + funcName);
    var arrStart = -1;
    ['var ty = [', 'var types = [', 'var comps = ['].forEach(function(v) {
      var idx = final.indexOf(v, funcStart);
      if (idx > 0 && (arrStart === -1 || idx < arrStart)) { arrStart = idx; }
    });
    var depth = 0, arrEnd = -1;
    for (var i = arrStart; i < final.length; i++) {
      if (final[i] === '[') depth++;
      else if (final[i] === ']') { depth--; if (depth === 0) { arrEnd = i; break; } }
    }
    var lastCloseBrace = arrEnd;
    for (var i = arrEnd; i >= arrStart; i--) {
      if (final[i] === '}') { lastCloseBrace = i; break; }
    }
    var before = final.substring(0, lastCloseBrace + 1);
    var after = final.substring(lastCloseBrace + 1);
    var insertText = ',\n    // SBI PO Hard: new variants\n' + inserts[funcName].join('');
    final = before + insertText + after;
  });
  try {
    new Function(final);
    console.log('ALL SYNTAX OK - writing file');
    fs.writeFileSync('js/mental-training.js', final);
  } catch(e) {
    console.log('FINAL SYNTAX ERROR:', e.message.substring(0,200));
  }
}
