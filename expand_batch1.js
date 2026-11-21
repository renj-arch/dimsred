// Expands remaining 16 functions to ~18 variants each
var fs = require('fs');
var s = fs.readFileSync('js/mental-training.js','utf8');

// For each function: [functionName, [newVariantStrings]]
// newVariantStrings will be joined with '' and inserted before ];
var expansions = [];

// Helper: create a variant entry (no trailing comma on last one)
function v(body, last) {
  return '    function(){ ' + body + ' }' + (last ? '' : ',');
}

// ============ NUMBER SENSE (12 -> 18) ============
expansions.push({
  func: 'generateNumberSenseQuestion',
  insert: [
    v("var p=rand(12,85), n=rand(50,500); return { q:'Find '+p+'% of '+n, a:Math.round(p*n/100), hint:'= '+p+'/100\u00d7'+n };"),
    v("var t=rand(1,9), n=t*10+5; return { q:n+'\u00b2', a:n*n, hint:'('+t+'5)\u00b2 = '+t+'\u00d7'+(t+1)+'|25' };"),
    v("var a=[2,3,4,5,6,7,8,9][rand(0,7)], p=rand(2,7); var c=[[],[],[2,4,8,6],[3,9,7,1],[4,6],[5],[6],[7,9,3,1],[8,4,2,6],[9,1]]; return { q:'Unit digit of '+a+'^'+p, a:c[a][(p-1)%c[a].length], hint:'Cyclicity of '+a+' is '+c[a].length };"),
    v("var n=rand(10,50); return { q:'Sum of first '+n+' naturals', a:n*(n+1)/2, hint:'n(n+1)/2 = '+n+'\u00d7'+(n+1)+'/2' };"),
    v("var n=rand(4,7), x=rand(50,99); var s=0; for(var i=0;i<n-1;i++)s+=rand(10,40); return { q:'Avg of '+n+' nos = '+((s+x)/n).toFixed(1)+'. Sum given='+s+'. Missing?', a:x, hint:'Total='+(s+x)+', missing='+(s+x)+'-'+s };"),
    v("var n=rand(4,12); var d=n*n/100; return { q:'\u221a'+d, a:n/10, hint:'\u221a'+d+' = \u221a('+n+'\u00b2/100) = '+n+'/10' };", true)
  ]
});

// ============ TIME & WORK (12 -> 18) ============
expansions.push({
  func: 'generateWorkQuestion',
  insert: [
    v("var a=rand(4,10), b=rand(6,15); return { q:'Pipe A fills in '+a+'h, B in '+b+'h. Both together?', a:Math.round(a*b/(a+b)), hint:'=a\u00d7b/(a+b)' };"),
    v("var a=rand(4,10), b=rand(a+2,14), w=rand(3000,15000); return { q:'A='+a+'d, B='+b+'d. Wage \u20b9'+w+'. A share?', a:Math.round(w*b/(a+b)), hint:'Eff A:B='+b+':'+a+'. A=\u20b9'+b+'\u00d7'+w+'/'+(a+b) };"),
    v("var a=rand(7,15); return { q:'A twice as fast as B. Together '+a+'d. B alone?', a:Math.round(3*a), hint:'1/x+1/(2x)=1/'+a+', x=3'+a+'/2, B=2x' };"),
    v("var a=rand(5,12), b=rand(a+3,18); return { q:'A='+a+'d, B='+b+'d. A works 2d, then B joins. Total?', a:Math.ceil(2+(1-2/a)/(1/a+1/b)), hint:'A does 2/'+a+', rem='+(1-2/a).toFixed(2)+', rate='+(1/a+1/b).toFixed(4) };"),
    v("var a=rand(6,12), p=rand(20,80); return { q:'A='+a+'d. B is '+p+'% more efficient. B alone?', a:Math.round(a*100/(100+p)), hint:'B time = '+a+'\u00d7100/'+(100+p) };"),
    v("var m=rand(3,7), w=rand(m+2,10), d=rand(8,18); return { q:m+' men = '+w+' women. '+m+' men in '+d+'d. '+w+' women alone?', a:d, hint:'Men=women efficiency, same time' };", true)
  ]
});

// ============ ALGEBRA (12 -> 18) ============
expansions.push({
  func: 'generateAlgebraQuestion',
  insert: [
    v("var a=rand(2,5), b=rand(3,7); return { q:'If x+1/x='+a+', find x\u00b2+1/x\u00b2', a:a*a-2, hint:'x\u00b2+1/x\u00b2=(x+1/x)\u00b2-2' };"),
    v("var a=rand(1,4), b=rand(2,6); return { q:'Expand (x-'+a+')(x-'+b+')', a:'x\u00b2-'+(a+b)+'x+'+(a*b), hint:'=x\u00b2-(a+b)x+ab' };"),
    v("var a=rand(1,4), b=rand(1,5); if(a===b)b++; return { q:'Simplify ('+a+'x\u00b2+'+b+'x)/'+a+'x', a:'x+'+b+'/'+a, hint:'Factor x: x('+a+'x+'+b+')/'+a+'x = ('+a+'x+'+b+')/'+a };"),
    v("var a=rand(2,5), b=rand(2,6); return { q:'Solve: '+a+'/(x+'+b+') = '+(a-1)+'/x', a:Math.round(a*(a-1)*b/(a-(a-1))), hint:'Cross-multiply: '+a+'x = '+(a-1)+'(x+'+b+')' };"),
    v("var a=rand(2,5); return { q:'If 2^{x} = '+Math.pow(2,a)+', find x', a:a, hint:'2^'+a+' = '+Math.pow(2,a)+', so x='+a };"),
    v("var a=rand(2,5), b=rand(3,7); return { q:'If x\u00b2+1/x\u00b2='+(a*a-2)+', find x+1/x', a:a, hint:'x\u00b2+1/x\u00b2=(x+1/x)\u00b2-2' };"),
    v("var a=rand(1,4), b=rand(2,5); return { q:'If a='+a+', b='+b+', find (a+b)\u00b2-(a-b)\u00b2', a:4*a*b, hint:'(a+b)\u00b2-(a-b)\u00b2=4ab' };", true)
  ]
});

// Apply ALL expansions
var s2 = s;
var errors = [];
expansions.forEach(function(exp) {
  var funcStart = s2.indexOf('function ' + exp.func);
  if (funcStart === -1) { errors.push(exp.func + ': NOT FOUND'); return; }
  
  var arrStart = -1;
  ['var ty = [','var types = [','var comps = ['].forEach(function(v){
    var idx = s2.indexOf(v, funcStart);
    if(idx > 0 && (arrStart === -1 || idx < arrStart)) arrStart = idx;
  });
  if (arrStart === -1) { errors.push(exp.func + ': NO ARRAY'); return; }
  
  var depth = 0, arrEnd = -1;
  for (var i = arrStart; i < s2.length; i++) {
    if (s2[i] === '[') depth++;
    else if (s2[i] === ']') { depth--; if (depth === 0) { arrEnd = i; break; } }
  }
  if (arrEnd === -1) { errors.push(exp.func + ': NO END'); return; }
  
  // Find last closing brace before ]
  var lastBrace = arrEnd;
  for (var i = arrEnd; i >= arrStart; i--) { if (s2[i] === '}') { lastBrace = i; break; } }
  
  var before = s2.substring(0, lastBrace + 1);
  var after = s2.substring(lastBrace + 1);
  
  var insertStr = ',\n    // SBI PO Hard: new variants\n' + exp.insert.join('\n');
  s2 = before + insertStr + after;
  console.log('Expanded ' + exp.func);
});

if (errors.length > 0) {
  console.log('ERRORS:');
  errors.forEach(function(e) { console.log('  ' + e); });
}

try {
  new Function(s2);
  console.log('SYNTAX OK');
  fs.writeFileSync('js/mental-training.js', s2);
  console.log('Written ' + s2.length + ' bytes');
} catch(e) {
  console.log('SYNTAX ERROR:', e.message.substring(0, 200));
}
