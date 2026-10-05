// Expands variant arrays in mental-training.js to ~18 variants each
var fs = require('fs');
var s = fs.readFileSync('js/mental-training.js','utf8');
var originalLen = s.length;

// --- New variant entries to insert (before closing ]; of each ty array) ---
// Format: function() { return { q:'...', a:..., hint:'...' }; },
// Note: NO trailing comma on the LAST new entry (the insertion puts it before existing ];

var inserts = {

  // PipesCisternsQuestion: 10 -> 18 (add 8)
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

  // HeightDistanceQuestion: 10 -> 18 (add 8)
  generateHeightDistanceQuestion: [
    "    function(){ var a=rand(30,60), d=rand(50,200); return { q:'Angle of elevation='+a+'\\u00b0, distance='+d+'m. Height?', a:Math.round(d*Math.tan(a*Math.PI/180)), hint:'Height = d \\u00d7 tan('+a+'\\u00b0) = '+Math.round(d*Math.tan(a*Math.PI/180))+'m' }; },\n" +
    "    function(){ var h=rand(30,100), a=rand(30,60); return { q:'Tower height='+h+'m, angle='+a+'\\u00b0. Shadow length?', a:Math.round(h/Math.tan(a*Math.PI/180)), hint:'Shadow = h/tan(angle)' }; },\n" +
    "    function(){ var a=rand(20,50), b=rand(a+10,70), d=rand(20,80); var h=Math.round(d/(1/Math.tan(a*Math.PI/180)-1/Math.tan(b*Math.PI/180))); return { q:'From point A, angle='+a+'\\u00b0, from B ('+d+'m closer), angle='+b+'\\u00b0. Height?', a:h, hint:'h = d/(cot A - cot B)' }; },\n" +
    "    function(){ var h=rand(30,80), a=rand(30,60); return { q:'Height='+h+'m, angle of elevation of top from point='+a+'\\u00b0. Distance from foot?', a:Math.round(h/Math.tan(a*Math.PI/180)), hint:'Distance = h \\u00d7 cot(angle)' }; },\n" +
    "    function(){ var h=rand(20,60), d=rand(20,50); return { q:'Building height='+h+'m. Shadow='+d+'m shorter when sun angle changes from '+rand(30,45)+'\\u00b0 to '+rand(50,70)+'\\u00b0. Original shadow?', a:Math.round(h/Math.tan(rand(30,45)*Math.PI/180)), hint:'Shadow = h/tan(original angle)' }; },\n" +
    "    function(){ var a=rand(30,60), b=rand(a+10,75), d=rand(50,150); var h=Math.round(d*Math.tan(a*Math.PI/180)*Math.tan(b*Math.PI/180)/(Math.tan(b*Math.PI/180)-Math.tan(a*Math.PI/180))); return { q:'From two points '+d+'m apart, angles='+a+'\\u00b0 and '+b+'\\u00b0. Height?', a:h, hint:'h = d tanA tanB/(tanB-tanA)' }; },\n" +
    "    function(){ var a=rand(20,50), d=rand(100,300); return { q:'Angle of depression='+a+'\\u00b0. Horizontal distance='+d+'m. Height?', a:Math.round(d*Math.tan(a*Math.PI/180)), hint:'Height = distance \\u00d7 tan(angle of depression)' }; },\n" +
    "    function(){ var h=rand(40,80), a=rand(25,50), b=rand(30,55); return { q:'Two towers: heights '+h+'m and '+(h+rand(10,30))+'m. Angle of elevation of top of taller from bottom of shorter='+a+'\\u00b0. Their distance?', a:Math.round((h+rand(10,30))/Math.tan(a*Math.PI/180)), hint:'Distance = height/tan(angle)' }; }"
  ]

};

// Apply: for each function, find the array and insert new variants before ]]
Object.keys(inserts).forEach(function(funcName) {
  var newVariants = inserts[funcName];
  var funcStart = s.indexOf('function ' + funcName);
  if (funcStart === -1) { console.log('NOT FOUND:', funcName); return; }

  // Find which array variable name is used
  var arrStart = -1;
  var arrVarName = '';
  ['var ty = [', 'var types = [', 'var comps = ['].forEach(function(v) {
    var idx = s.indexOf(v, funcStart);
    if (idx > 0 && (arrStart === -1 || idx < arrStart)) { arrStart = idx; arrVarName = v; }
  });
  if (arrStart === -1) { console.log('NO ARRAY:', funcName); return; }

  // Parse to find closing ];
  var depth = 0, arrEnd = -1;
  for (var i = arrStart; i < s.length; i++) {
    if (s[i] === '[') depth++;
    else if (s[i] === ']') { depth--; if (depth === 0) { arrEnd = i; break; } }
  }
  if (arrEnd === -1) { console.log('NO END:', funcName); return; }

  // Find the last '}' before ']' to insert after it with a comma
  var lastCloseBrace = arrEnd;
  for (var i = arrEnd; i >= arrStart; i--) {
    if (s[i] === '}') { lastCloseBrace = i; break; }
  }

  // Insert new variants after the last closing brace with a comma
  var before = s.substring(0, lastCloseBrace + 1);
  var after = s.substring(lastCloseBrace + 1);

  var insertText = ',\n    // SBI PO Hard: new variants\n' + newVariants.join('');
  s = before + insertText + after;
  console.log('Expanded ' + funcName);
});

// Verify syntax
try {
  new Function(s);
  console.log('SYNTAX OK');
  fs.writeFileSync('js/mental-training.js', s);
  console.log('Written: ' + s.length + ' bytes (was ' + originalLen + ')');
} catch(e) {
  console.log('SYNTAX ERROR:', e.message.substring(0, 300));
}
