(function () {
  var STORAGE_KEY = 'science_training_data';
  var MISTAKE_KEY = 'science_mistakes';
  var SESSION_CACHE_KEY = 'science_session_cache';
  var activeLayer = 'instinct';
  var activeHardMode = false;
  var session = null;
  var timerId = null;
  var currentQuestion = null;
  var _recentQuestions = [];
  var _RECENT_MAX = 20;

  function _isRecent(qtext) { for (var i = 0; i < _recentQuestions.length; i++) { if (_recentQuestions[i] === qtext) return true; } return false; }
  function _addRecent(qtext) { _recentQuestions.push(qtext); if (_recentQuestions.length > _RECENT_MAX) _recentQuestions.shift(); }

  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function pick(arr) { return arr[rand(0, arr.length - 1)]; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = rand(0, i); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  var RANKS = [
    { name: 'Bronze Brains', minPoints: 0, icon: '🥉' },
    { name: 'Silver Thinker', minPoints: 50, icon: '🥈' },
    { name: 'Gold Mind', minPoints: 150, icon: '🥇' },
    { name: 'Platinum Processor', minPoints: 300, icon: '💎' },
    { name: 'Diamond Calculator', minPoints: 500, icon: '🔷' },
    { name: 'Master Genius', minPoints: 800, icon: '🏆' }
  ];

  var defaultState = {
    totalPoints: 0, rank: 0, sessions: [],
    streaks: { current: 0, best: 0 },
    stats: {}
  };

  var SCI_TOPICS = {
    physics: ['mechanics_kinematics','mechanics_laws','mechanics_energy','mechanics_rotational','mechanics_gravitation','mechanics_shm','waves','thermodynamics','optics_ray','optics_wave','electrostatics','current_electricity','magnetism','emi','modern_physics','semiconductors'],
    chemistry: ['mole_concept','atomic_structure','gaseous_state','chemical_thermodynamics','chemical_equilibrium','ionic_equilibrium','electrochemistry','chemical_kinetics','surface_chemistry','periodic_table','chemical_bonding','coordination','s_block','p_block','d_f_block','organic_goc','organic_hydrocarbons','organic_haloalkanes','organic_alcohols','organic_aldehydes','organic_acids','organic_amines','organic_biomolecules','organic_polymers'],
    biology: ['cell_biology','genetics','molecular_basis','evolution','plant_physiology','human_digestion','human_respiration','human_circulation','human_excretion','human_neural','human_endocrine','human_reproduction','ecology','biotechnology','diversity'],
    math: ['algebra_quadratic','algebra_sequences','algebra_binomial','algebra_pnc','algebra_matrices','calculus_limits','calculus_diff','calculus_application','calculus_integration','calculus_differential','coordinate_geometry','vectors','trigonometry','statistics','complex_numbers']
  };

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || JSON.parse(JSON.stringify(defaultState)); }
    catch(e) { return JSON.parse(JSON.stringify(defaultState)); }
  }
  function saveState(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

  function loadMistakes() {
    try { return JSON.parse(localStorage.getItem(MISTAKE_KEY)) || []; }
    catch(e) { return []; }
  }
  function saveMistakes(arr) { localStorage.setItem(MISTAKE_KEY, JSON.stringify(arr)); }

  function cacheSession(sess) {
    if (!sess) return;
    try { sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({ active:true, mode:sess.mode, subMode:sess.subMode, layer:sess.layer, hardMode:sess.hardMode, questionIndex:sess.questionIndex, totalQuestions:sess.totalQuestions, topic:sess.topic, subTopic:sess.subTopic, questions:sess.questions, correctCount:sess.correctCount, wrongCount:sess.wrongCount, pointsEarned:sess.pointsEarned, startTime:sess.startTime })); }
    catch(e) {}
  }
  function restoreCachedSession() {
    try { var d = JSON.parse(sessionStorage.getItem(SESSION_CACHE_KEY)); if (d && d.active) { sessionStorage.removeItem(SESSION_CACHE_KEY); return d; } } catch(e) {}
    return null;
  }
  function clearSessionCache() { try { sessionStorage.removeItem(SESSION_CACHE_KEY); } catch(e) {} }

  function getRank(points) {
    var r = RANKS[0];
    for (var i = RANKS.length - 1; i >= 0; i--) { if (points >= RANKS[i].minPoints) { r = RANKS[i]; break; } }
    return r;
  }

  function updateStreak(state) {
    var today = new Date().toISOString().slice(0, 10);
    var s = state.streaks;
    if (s.lastDate === today) return;
    var yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (s.lastDate === yesterday) { s.current++; } else { s.current = 1; }
    if (s.current > s.best) s.best = s.current;
    s.lastDate = today;
  }

  function addMistake(q, mode) {
    var arr = loadMistakes();
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].question === q.q) { arr[i].attempts = (arr[i].attempts || 0) + 1; arr[i].lastWrong = Date.now(); saveMistakes(arr); return; }
    }
    arr.push({ question: q.q, answer: q.a, options: q.options, solution: q.solution || '', hint: q.hint || '', topic: q.topic || '', subTopic: q.subTopic || '', mode: mode, attempts: 1, lastWrong: Date.now() });
    saveMistakes(arr);
  }

  function getMistakesForRetry(count) {
    var arr = loadMistakes();
    if (arr.length === 0) return [];
    var now = Date.now();
    for (var i = 0; i < arr.length; i++) {
      var m = arr[i];
      var hoursSince = (now - (m.lastWrong || 0)) / 3600000;
      var ideal = m.attempts === 1 ? 4 : (m.attempts === 2 ? 24 : 72);
      var urgency = Math.min(hoursSince / ideal, 3);
      m._score = urgency * (1 + (m.attempts - 1) * 0.5);
    }
    arr.sort(function(a, b) { return (b._score || 0) - (a._score || 0); });
    return arr.slice(0, Math.min(count, arr.length));
  }

  var GENERATORS = { physics: {}, chemistry: {}, biology: {}, math: {} };
  // ==================== PHYSICS ====================

  GENERATORS.physics.mechanics_kinematics = [
    function () { var u=rand(5,30); var a=rand(2,10); var t=rand(2,8); var v=u+a*t; return {q:'Body starts with '+u+' m/s, accelerates at '+a+' m/s^2 for '+t+' s. Final velocity?',a:v+' m/s',hint:'Use v = u + at',solution:'v = '+u+' + '+a+'*'+t+' = '+v+' m/s'}; },
    function () { var u=rand(0,20); var a=rand(2,8); var t=rand(3,10); return {q:'Particle accelerates from '+u+' m/s at '+a+' m/s^2 for '+t+' s. Distance?',a:(u*t+0.5*a*t*t)+' m',hint:'s = ut + 0.5at^2',solution:'s = '+u+'*'+t+' + 0.5*'+a+'*'+(t*t)+' = '+(u*t+0.5*a*t*t)+' m'}; },
    function () { var u=rand(10,40); var a=-rand(2,8); var t=Math.abs(u/a); return {q:'Car at '+u+' m/s decelerates at '+Math.abs(a)+' m/s^2. Time to stop?',a:t.toFixed(1)+' s',hint:'v = u + at, set v=0',solution:'0 = '+u+' + ('+a+')t -> t = '+t.toFixed(1)+' s'}; },
    function () { var u=rand(10,30); var a=rand(3,9); var s=rand(20,80); var v=Math.sqrt(u*u+2*a*s); return {q:'u='+u+' m/s, a='+a+' m/s^2, s='+s+' m. Final velocity?',a:v.toFixed(1)+' m/s',hint:'v^2 = u^2 + 2as',solution:'v^2 = '+(u*u)+' + 2*'+a+'*'+s+', v = '+v.toFixed(1)+' m/s'}; },
    function () { var h=rand(10,50); var g=10; return {q:'Stone dropped from '+h+' m. Time to reach ground? (g=10)',a:Math.sqrt(2*h/g).toFixed(2)+' s',hint:'s = 0.5gt^2',solution:'t = sqrt(2*'+h+'/10) = '+Math.sqrt(2*h/g).toFixed(2)+' s'}; },
    function () { var u=rand(10,40); var p30=30; var g=10; var R=u*u*Math.sin(2*p30*Math.PI/180)/g; return {q:'Projectile '+u+' m/s at 30^o. Range? (g=10)',a:R.toFixed(1)+' m',hint:'R = u^2 sin(2theta)/g',solution:'R = '+(u*u)+'*sin60/10 = '+R.toFixed(1)+' m'}; },
    function () { var u=rand(15,35); var g=10; var th=45; var H=u*u*Math.sin(th*Math.PI/180)*Math.sin(th*Math.PI/180)/(2*g); return {q:'Projectile u='+u+' m/s, angle 45^o. Max height?',a:H.toFixed(1)+' m',hint:'H = u^2 sin^2(theta)/2g',solution:'H = '+(u*u)+'*0.5/20 = '+H.toFixed(1)+' m'}; },
    function () { var u=rand(5,20); var a=rand(2,6); var n=rand(2,6); return {q:'u='+u+' m/s, a='+a+' m/s^2. Distance in '+n+'th second?',a:(u+a/2*(2*n-1))+' m',hint:'s_n = u + a(2n-1)/2',solution:'s_'+n+' = '+u+' + '+a+'/2*('+(2*n-1)+') = '+(u+a/2*(2*n-1))+' m'}; },
    function () { var u1=rand(10,30); var u2=rand(10,30); var a1=rand(2,5); var a2=rand(2,5); var t=rand(3,8); var s1=u1*t+0.5*a1*t*t; var s2=u2*t+0.5*a2*t*t; return {q:'A: u='+u1+', a='+a1+'; B: u='+u2+', a='+a2+'. Separation after '+t+' s?',a:Math.abs(s1-s2).toFixed(1)+' m',hint:'Find s for each, subtract'}; },
    function () { var h=rand(20,80); return {q:'Ball dropped from '+h+' m. Velocity on impact? (g=10)',a:Math.sqrt(2*10*h).toFixed(1)+' m/s',hint:'v^2 = 2gh',solution:'v = sqrt(2*10*'+h+') = '+Math.sqrt(2*10*h).toFixed(1)+' m/s'}; },
    function () { var u=rand(5,25); return {q:'Ball thrown up at '+u+' m/s. Time to max height? (g=10)',a:(u/10).toFixed(1)+' s',hint:'v = u - gt, v=0 at top'}; },
    function () { var vA=rand(20,60); var vB=rand(20,60); var d=rand(100,500); return {q:'Two cars approach at '+vA+' and '+vB+' m/s, distance '+d+' m. Meeting time?',a:(d/(vA+vB)).toFixed(2)+' s',hint:'Relative speed = sum'}; },
    function () { var v=rand(10,30); var d=rand(50,200); return {q:'Train at '+v+' m/s crosses '+d+' m platform. Time?',a:(d/v).toFixed(2)+' s',hint:'t = distance/speed'}; },
    function () { var a=rand(2,8); var t=rand(3,9); return {q:'From rest at '+a+' m/s^2 for '+t+' s. Distance?',a:(0.5*a*t*t)+' m',hint:'s = 0.5at^2',solution:'s = 0.5*'+a+'*'+(t*t)+' = '+(0.5*a*t*t)+' m'}; },
    function () { var u=rand(2,10); var a=rand(1,5); var s=rand(10,50); return {q:'Cyclist u='+u+' m/s, a='+a+' m/s^2, covers '+s+' m. Final speed?',a:Math.sqrt(u*u+2*a*s).toFixed(1)+' m/s',hint:'v^2 = u^2 + 2as'}; },
    function () { var u=rand(10,40); var g=10; var th=60; return {q:'Projectile u='+u+' m/s, angle 60^o. Time of flight?',a:(2*u*Math.sin(60*Math.PI/180)/10).toFixed(2)+' s',hint:'T = 2u sin(theta)/g'}; },
    function () { var u=rand(5,20); return {q:'Stone thrown up at '+u+' m/s. Max height? (g=10)',a:(u*u/20).toFixed(1)+' m',hint:'H = u^2/2g'}; },
    function () { var u1=rand(10,30); var u2=rand(2,8); var s0=rand(50,200); if(u1<=u2)u1+=10; return {q:'Car A at '+u1+' m/s chases B at '+u2+' m/s. Separation '+s0+' m. Catch time?',a:(s0/(u1-u2)).toFixed(2)+' s',hint:'Relative speed = u_A - u_B'}; },
    function () { var v=rand(5,20); var r=rand(10,50); return {q:'Circular motion r='+r+' m, v='+v+' m/s. Centripetal acceleration?',a:(v*v/r).toFixed(2)+' m/s^2',hint:'a_c = v^2/r'}; },
    function () { var v=rand(10,30); var r=rand(5,25); return {q:'v='+v+' m/s, r='+r+' m. Angular velocity?',a:(v/r).toFixed(2)+' rad/s',hint:'omega = v/r'}; },
    function () { var u=rand(10,30); var v=rand(0,10); var t=rand(2,6); return {q:'Body slows from '+u+' to '+v+' m/s in '+t+' s. Acceleration?',a:((v-u)/t).toFixed(2)+' m/s^2',hint:'a = (v-u)/t'}; }
  ];

  GENERATORS.physics.mechanics_laws = [
    function () { var m=rand(2,20); var a=rand(2,10); return {q:'Mass '+m+' kg, a='+a+' m/s^2. Force?',a:(m*a)+' N',hint:'F = ma'}; },
    function () { var m=rand(5,50); return {q:'Mass '+m+' kg. Weight on Earth? (g=10)',a:(m*10)+' N',hint:'W = mg'}; },
    function () { var F=rand(10,100); var m=rand(2,20); return {q:'F='+F+' N on m='+m+' kg. Acceleration?',a:(F/m).toFixed(2)+' m/s^2',hint:'a = F/m'}; },
    function () { var m=rand(2,10); var u=rand(5,20); var v=rand(0,5); var t=rand(2,6); return {q:'Mass '+m+' kg, u='+u+' to v='+v+' in '+t+' s. Force?',a:(m*(v-u)/t).toFixed(1)+' N',hint:'F = m(v-u)/t'}; },
    function () { var m=rand(1,5); var v=rand(5,20); return {q:'Mass '+m+' kg at '+v+' m/s. Momentum?',a:(m*v)+' kg m/s',hint:'p = mv'}; },
    function () { var m=rand(1,10); var v=rand(10,30); var t=(rand(1,10))/10; return {q:'Mass '+m+' kg hits wall at '+v+' m/s, stops in '+t+' s. Force?',a:(m*v/t).toFixed(1)+' N',hint:'F = dp/dt = mv/t'}; },
    function () { var m=rand(1,10); var g=10; var th=pick([30,37,45,53,60]); return {q:'Mass '+m+' kg on incline '+th+'^o. Normal reaction? (g=10)',a:(m*g*Math.cos(th*Math.PI/180)).toFixed(1)+' N',hint:'N = mg cos(theta)'}; },
    function () { var m1=rand(2,8); var m2=rand(2,8); var u1=rand(5,15); var u2=-rand(2,8); return {q:'m1='+m1+' u1='+u1+', m2='+m2+' u2='+u2+' m/s. Inelastic collision final v?',a:((m1*u1+m2*u2)/(m1+m2)).toFixed(2)+' m/s',hint:'m1u1+m2u2 = (m1+m2)v'}; },
    function () { var mu=pick([0.2,0.3,0.4,0.5]); var m=rand(5,30); return {q:'m='+m+' kg, mu='+mu+' on horizontal. Limiting friction? (g=10)',a:(mu*m*10)+' N',hint:'f = mu * mg'}; },
    function () { var F=rand(20,80); var mu=pick([0.2,0.3,0.4]); var m=rand(5,20); return {q:'F='+F+' N on m='+m+' kg, mu='+mu+'. Net acceleration? (g=10)',a:((F-mu*m*10)/m).toFixed(2)+' m/s^2',hint:'F - mu*mg = ma'}; },
    function () { var m=rand(1,5); var r=rand(2,8); var v=rand(5,15); return {q:'Mass '+m+' kg, v='+v+' m/s at bottom of vertical circle r='+r+' m. Tension?',a:(m*10+m*v*v/r).toFixed(1)+' N',hint:'T - mg = mv^2/r at bottom'}; },
    function () { var m=rand(1,5); var a=rand(2,6); return {q:'Lift mass '+m+' kg accelerates up at '+a+' m/s^2. Cable tension?',a:(m*(10+a))+' N',hint:'T - mg = ma'}; },
    function () { var m=rand(1,5); var a=rand(2,5); return {q:'Lift mass '+m+' kg accelerates down at '+a+' m/s^2. Tension?',a:(m*(10-a))+' N',hint:'mg - T = ma'}; },
    function () { var m1=rand(3,8); var m2=rand(1,4); if(m1<=m2){var t=m1;m1=m2;m2=t;} return {q:'Atwood m1='+m1+' kg, m2='+m2+' kg. Acceleration? (g=10)',a:((m1-m2)*10/(m1+m2)).toFixed(2)+' m/s^2',hint:'a = (m1-m2)g/(m1+m2)'}; },
    function () { var F=rand(10,50); var th=pick([30,37,45,53,60]); return {q:'F='+F+' N at '+th+'^o to horizontal. Horizontal component?',a:(F*Math.cos(th*Math.PI/180)).toFixed(1)+' N',hint:'F_x = F cos(theta)'}; },
    function () { var s=rand(10,30); var u=rand(5,15); var m=rand(2,10); return {q:'m='+m+' kg, u='+u+' m/s stops after '+s+' m. Friction force?',a:(m*u*u/(2*s)).toFixed(2)+' N',hint:'F*s = 0.5*m*u^2'}; },
    function () { var m=rand(5,25); var mu=pick([0.2,0.3,0.5]); var th=pick([15,20,25,30]); return {q:'m='+m+' kg, mu='+mu+', incline '+th+'^o. Acceleration down? (g=10)',a:(10*(Math.sin(th*Math.PI/180)-mu*Math.cos(th*Math.PI/180))).toFixed(2)+' m/s^2',hint:'a = g(sin(theta)-mu*cos(theta))'}; },
    function () { var m=rand(2,8); var r=rand(5,15); var v=rand(5,12); return {q:'Turn r='+r+' m at '+v+' m/s. Min mu for no skid? (g=10)',a:(v*v/(r*10)).toFixed(2),hint:'mu = v^2/rg'}; },
    function () { var F=rand(15,60); var m=rand(3,15); return {q:'F='+F+' N horizontally on m='+m+' kg. Acceleration? (no friction)',a:(F/m).toFixed(2)+' m/s^2',hint:'a = F/m'}; },
    function () { var m=rand(2,10); var g=10; var th=pick([30,45]); return {q:'m='+m+' kg sliding down '+th+'^o frictionless incline. Acceleration?',a:(g*Math.sin(th*Math.PI/180)).toFixed(2)+' m/s^2',hint:'a = g sin(theta)'}; }
  ];

  GENERATORS.physics.mechanics_energy = [
    function () { var m=rand(2,10); var v=rand(5,20); return {q:'m='+m+' kg, v='+v+' m/s. KE?',a:(0.5*m*v*v)+' J',hint:'KE = 0.5mv^2'}; },
    function () { var m=rand(2,20); var h=rand(5,30); return {q:'m='+m+' kg at h='+h+' m. PE? (g=10)',a:(m*10*h)+' J',hint:'PE = mgh'}; },
    function () { var m=rand(5,50); var h=rand(5,20); return {q:'m='+m+' kg dropped from '+h+' m. Speed at bottom? (g=10)',a:Math.sqrt(2*10*h).toFixed(1)+' m/s',hint:'mgh = 0.5mv^2, v = sqrt(2gh)'}; },
    function () { var F=rand(10,50); var s=rand(5,25); return {q:'F='+F+' N displaces by '+s+' m. Work?',a:(F*s)+' J',hint:'W = F*s (parallel)'}; },
    function () { var F=rand(10,40); var s=rand(5,20); var th=pick([30,45,60]); return {q:'F='+F+' N at '+th+'^o, displaces '+s+' m. Work?',a:(F*s*Math.cos(th*Math.PI/180)).toFixed(1)+' J',hint:'W = Fs cos(theta)'}; },
    function () { var m=rand(1,10); var v=rand(5,15); var h=rand(5,20); return {q:'m='+m+' kg, v='+v+' m/s, h='+h+' m. Total mechanical energy? (g=10)',a:(0.5*m*v*v+m*10*h)+' J',hint:'E = KE + PE'}; },
    function () { var m=rand(2,10); var u=rand(10,25); var v=rand(2,8); return {q:'m='+m+' kg slows from '+u+' to '+v+' m/s. Work by friction?',a:(0.5*m*(u*u-v*v))+' J',hint:'W = 0.5m(v^2-u^2)'}; },
    function () { var k=rand(100,500); var x=(rand(5,30))/100; return {q:'Spring k='+k+' N/m compressed '+(x*100)+' cm. PE stored?',a:(0.5*k*x*x).toFixed(2)+' J',hint:'PE = 0.5kx^2'}; },
    function () { var m=rand(1,5); var h=rand(10,30); return {q:'Mass '+m+' kg slides down frictionless ramp of height '+h+' m. Speed at bottom?',a:Math.sqrt(2*10*h).toFixed(1)+' m/s',hint:'mgh = 0.5mv^2'}; },
    function () { var m=rand(2,8); var v=rand(8,18); var t=rand(2,5); return {q:'m='+m+' kg accelerates to '+v+' m/s in '+t+' s. Avg power?',a:(0.5*m*v*v/t).toFixed(1)+' W',hint:'P = W/t = KE/t'}; },
    function () { var F=rand(20,80); var P=rand(100,500); return {q:'Force '+F+' N, power '+P+' W. Velocity?',a:(P/F).toFixed(2)+' m/s',hint:'P = F*v'}; },
    function () { var k=rand(200,800); var x=(rand(10,40))/100; return {q:'k='+k+' N/m stretched '+(x*100)+' cm. Restoring force?',a:(k*x).toFixed(1)+' N',hint:'F = kx'}; },
    function () { var F=rand(10,100); var k=rand(100,500); return {q:'F='+F+' N, k='+k+' N/m. Extension in cm?',a:((F/k)*100).toFixed(1)+' cm',hint:'x = F/k'}; },
    function () { var m=rand(1,5); var h=rand(5,15); var t=rand(2,5); return {q:'m='+m+' kg lifted '+h+' m in '+t+' s. Power? (g=10)',a:(m*10*h/t).toFixed(1)+' W',hint:'P = mgh/t'}; },
    function () { var m=rand(5,20); var a=rand(1,4); var s=rand(5,20); return {q:'m='+m+' kg, a='+a+' m/s^2 for '+s+' m. Work done?',a:(m*a*s)+' J',hint:'W = F*s = m*a*s'}; },
    function () { var m=rand(10,50); var h=rand(10,25); return {q:'Water m='+m+' kg at h='+h+' m. PE in kJ? (g=10)',a:(m*10*h/1000)+' kJ',hint:'PE = mgh (divide by 1000 for kJ)'}; },
    function () { var m=rand(0.5,2); var v=rand(10,30); return {q:'Ball m='+m+' kg at '+v+' m/s. KE?',a:(0.5*m*v*v).toFixed(1)+' J',hint:'KE = 0.5mv^2'}; },
    function () { var m=rand(2,8); var v=rand(5,12); return {q:'m='+m+' kg at '+v+' m/s. Work to stop?',a:(0.5*m*v*v)+' J',hint:'W = change in KE = 0.5mv^2'}; },
    function () { var m=rand(2,10); var h=rand(5,20); var s=rand(5,15); return {q:'m='+m+' kg falls '+h+' m then slides '+s+' m on rough surface (mu=0.3). Work by friction?',a:(0.3*m*10*s)+' J',hint:'W_f = mu*mg*d'}; },
    function () { var m=rand(1,5); var v=rand(5,15); return {q:'m='+m+' kg, v='+v+' m/s. KE in kJ?',a:(0.5*m*v*v/1000).toFixed(2)+' kJ',hint:'KE = 0.5mv^2 (divide by 1000)'}; }
  ];
  GENERATORS.physics.mechanics_rotational = [
    function () { var m=rand(1,5); var r=(rand(5,20))/10; return {q:'Point mass '+m+' kg at r='+r+' m. MI about perpendicular axis?',a:(m*r*r).toFixed(2)+' kg m^2',hint:'I = mr^2'}; },
    function () { var m=rand(2,10); var r=(rand(3,8))/10; return {q:'Solid sphere m='+m+' kg, r='+r+' m. MI about diameter?',a:(0.4*m*r*r).toFixed(3)+' kg m^2',hint:'I = 2/5 mr^2'}; },
    function () { var F=rand(10,50); var r=(rand(5,20))/10; return {q:'F='+F+' N at r='+r+' m perpendicular. Torque?',a:(F*r).toFixed(1)+' Nm',hint:'tau = F*r_perp'}; },
    function () { var m=rand(2,8); var r=(rand(2,6))/10; var w=rand(5,20); return {q:'Disc m='+m+' kg, r='+r+' m, omega='+w+' rad/s. Angular momentum?',a:(0.5*m*r*r*w).toFixed(2)+' kg m^2/s',hint:'L = I*omega, I = 0.5mr^2'}; },
    function () { var m=rand(1,6); var L=rand(1,3); return {q:'Rod m='+m+' kg, L='+L+' m. MI about center perpendicular?',a:(m*L*L/12).toFixed(3)+' kg m^2',hint:'I = ML^2/12'}; },
    function () { var m=rand(2,8); var R=(rand(2,5))/10; return {q:'Ring m='+m+' kg, r='+R+' m. MI about axis?',a:(m*R*R).toFixed(3)+' kg m^2',hint:'I = MR^2'}; },
    function () { var tau=rand(10,40); var I=rand(2,10); return {q:'tau='+tau+' Nm, I='+I+' kg m^2. Angular acceleration?',a:(tau/I).toFixed(2)+' rad/s^2',hint:'tau = I*alpha'}; },
    function () { var w0=rand(5,20); var a2=rand(2,6); var t=rand(2,5); return {q:'omega0='+w0+' rad/s, alpha='+a2+' rad/s^2, t='+t+' s. omega?',a:(w0+a2*t)+' rad/s',hint:'omega = omega0 + alpha*t'}; },
    function () { var m=rand(2,8); var v=rand(5,12); return {q:'Disc m='+m+' kg rolling at '+v+' m/s. Rotational KE?',a:(0.25*m*v*v).toFixed(1)+' J',hint:'KE_rot = 0.5*I*omega^2 = 0.25*m*v^2 for disc'}; },
    function () { var m=rand(1,5); var r=(rand(5,20))/10; var F=rand(5,20); return {q:'Disc m='+m+' kg, r='+r+' m, F='+F+' N tangential. alpha?',a:(F*r/(0.5*m*r*r)).toFixed(2)+' rad/s^2',hint:'alpha = tau/I = Fr/(0.5mr^2)'}; },
    function () { var m=rand(2,6); var L=rand(1,3); return {q:'Rod m='+m+' kg, L='+L+' m, axis at end. MI?',a:(m*L*L/3).toFixed(2)+' kg m^2',hint:'I = ML^2/3'}; },
    function () { var m=rand(2,8); var r=(rand(3,7))/10; return {q:'Sphere m='+m+' kg, r='+r+' m. MI about tangent?',a:(7*m*r*r/5).toFixed(3)+' kg m^2',hint:'Parallel axis: I = 2/5 MR^2 + MR^2 = 7/5 MR^2'}; },
    function () { var m=rand(2,10); var v=rand(5,15); return {q:'Hoop m='+m+' kg rolling at '+v+' m/s. Total KE?',a:(m*v*v).toFixed(1)+' J',hint:'KE_total = 0.5mv^2 + 0.5Iomega^2 = mv^2 for hoop'}; },
    function () { var w=rand(10,30); var a2=-rand(2,5); return {q:'omega0='+w+' rad/s, deceleration '+Math.abs(a2)+' rad/s^2. Time to stop?',a:Math.abs(w/a2).toFixed(1)+' s',hint:'omega = omega0 + alpha*t, set omega=0'}; },
    function () { var m=rand(2,8); var r=(rand(2,5))/10; return {q:'Solid cylinder m='+m+' kg, r='+r+' m. MI about axis?',a:(0.5*m*r*r).toFixed(3)+' kg m^2',hint:'I = 0.5MR^2'}; },
    function () { var m=rand(1,5); var R=(rand(5,15))/10; var r=(rand(1,3))/10; return {q:'Hollow cylinder m='+m+' kg, R='+R+' m, r='+r+' m. MI?',a:(0.5*m*(R*R+r*r)).toFixed(3)+' kg m^2',hint:'I = 0.5M(R^2+r^2)'}; },
    function () { var m=rand(1,5); var r=(rand(5,15))/10; return {q:'Hollow sphere m='+m+' kg, r='+r+' m. MI?',a:(2*m*r*r/3).toFixed(3)+' kg m^2',hint:'I = 2/3 MR^2'}; },
    function () { var F=rand(20,60); var d=(rand(3,10))/10; var th=pick([30,45,60,90]); return {q:'F='+F+' N, arm='+d+' m, angle='+th+'^o. Torque?',a:(F*d*Math.sin(th*Math.PI/180)).toFixed(2)+' Nm',hint:'tau = F*d*sin(theta)'}; },
    function () { var m=rand(2,6); var L=(rand(10,25))/10; return {q:'Rod m='+m+' kg, L='+L+' m pivoted at end, horizontal. alpha? (g=10)',a:(15/L).toFixed(2)+' rad/s^2',hint:'tau = mgL/2, I = mL^2/3, alpha = tau/I = 3g/(2L)'}; },
    function () { var m=rand(1,5); var r=(rand(5,20))/10; var t=rand(2,8); return {q:'Wheel m='+m+' kg, r='+r+' m, torque applied for '+t+' s. L=?',a:(m*r*r*t/2).toFixed(2)+' kg m^2/s (for unit torque)',hint:'L = tau*t for constant torque'}; }
  ];

  GENERATORS.physics.mechanics_gravitation = [
    function () { var g=rand(5,25); var R_e=6.4e6; return {q:'g='+g+' m/s^2 on planet, R='+(R_e/1000)+' km. Mass? (G=6.67e-11)',a:(g*R_e*R_e/6.67e-11).toExponential(1)+' kg',hint:'M = gR^2/G'}; },
    function () { var h=rand(100,500)*1000; return {q:'g at altitude '+(h/1000)+' km? (M_e=6e24, R_e=6400 km)',a:(6.67e-11*6e24/((6.4e6+h)*(6.4e6+h))).toFixed(2)+' m/s^2',hint:'g = GM/(R+h)^2'}; },
    function () { var T1=rand(100,300); var a1=rand(1,5); var a2=rand(2,6); if(a2<=a1)a2=a1+1; return {q:'Satellite T1='+T1+' min at a='+a1+' Re. T2 at a='+a2+' Re?',a:(T1*Math.pow(a2/a1,1.5)).toFixed(1)+' min',hint:'T^2 prop to a^3 (Kepler 3rd)'}; },
    function () { var M=rand(1,10)*Math.pow(10,rand(22,25)); var R=rand(1,10)*1e6; return {q:'M='+M.toExponential(1)+' kg, R='+(R/1000).toFixed(0)+' km. Escape velocity?',a:(Math.sqrt(2*6.67e-11*M/R)/1000).toFixed(2)+' km/s',hint:'v_e = sqrt(2GM/R)'}; },
    function () { var M1=rand(1,5)*1e24; var M2=rand(1,5)*1e24; var r=rand(5,20)*1e6; return {q:'M1='+(M1/1e24).toFixed(1)+'e24, M2='+(M2/1e24).toFixed(1)+'e24 kg, r='+(r/1000).toFixed(0)+' km. Gravitational force?',a:(6.67e-11*M1*M2/(r*r)).toExponential(1)+' N',hint:'F = GM1M2/r^2'}; },
    function () { var M=6e24; var R=6.4e6; var d=rand(1000,5000)*1000; return {q:'g at depth '+(d/1000)+' km below Earth surface?',a:(9.8*(R-d)/R).toFixed(2)+' m/s^2',hint:'g = g0(1-d/R)'}; },
    function () { return {q:'Sun M=2e30 kg, R=7e8 m. Surface gravity?',a:(6.67e-11*2e30/(7e8*7e8)).toFixed(0)+' m/s^2',hint:'g = GM/R^2'}; },
    function () { return {q:'Orbital velocity near Earth surface? (R=6400 km, g=9.8)',a:Math.sqrt(9.8*6.4e6/1000).toFixed(1)+' km/s',hint:'v_o = sqrt(gR)'}; },
    function () { var a=rand(2,5); return {q:'Satellite at '+a+' Earth radii. Orbital period?',a:(Math.sqrt(4*Math.PI*Math.PI*Math.pow(a*6.4e6,3)/(6.67e-11*6e24))/3600).toFixed(1)+' hours',hint:'T = 2pi*sqrt(a^3/GM)'}; },
    function () { var h=rand(200,1000)*1000; return {q:'Orbital speed at '+(h/1000)+' km altitude?',a:(Math.sqrt(6.67e-11*6e24/(6.4e6+h))/1000).toFixed(2)+' km/s',hint:'v = sqrt(GM/(R+h))'}; },
    function () { var r=rand(2,10)*1000; return {q:'g at '+r+' m depth? (R_e=6400 km, g=9.8)',a:(9.8*(1-r/6.4e6)).toFixed(4)+' m/s^2',hint:'g = g0(1-d/R)'}; },
    function () { var M=6e24; var m=rand(100,1000); return {q:'m='+m+' kg on Earth surface. Gravitational force?',a:(m*9.8).toFixed(0)+' N',hint:'F = mg = '+m+'*9.8'}; },
    function () { var T=rand(60,200); var R=6.4e6; return {q:'Satellite T='+T+' min. Orbital radius?',a:(Math.pow(6.67e-11*6e24*T*T*60*60/(4*Math.PI*Math.PI),1/3)/1000).toFixed(0)+' km',hint:'T = 2pi*sqrt(r^3/GM)'}; },
    function () { return {q:'Geostationary satellite orbital radius? (T=24h)',a:'~42000 km',hint:'r = (GMT^2/4pi^2)^(1/3) ~ 42000 km'}; },
    function () { var m=rand(1,5); var v=rand(5,15)*1000; return {q:'Ball '+m+' kg at '+v+' m/s upward. Max height? (g=9.8)',a:(v*v/(2*9.8)/1000).toFixed(2)+' km',hint:'v^2 = 2gh'}; },
    function () { var M1=6e24; var M2=7.3e22; var d=3.84e8; return {q:'Earth-Moon distance 384000 km. Gravitational force between them?',a:(6.67e-11*M1*M2/(d*d)).toExponential(1)+' N',hint:'F = GM1M2/r^2'}; },
    function () { var M=6e24; var R=6.4e6; return {q:'Escape velocity from Earth? (M=6e24, R=6400 km)',a:(Math.sqrt(2*6.67e-11*6e24/6.4e6)/1000).toFixed(2)+' km/s',hint:'v_e = sqrt(2GM/R)'}; },
    function () { var g=9.8; var R=6.4e6; return {q:'Ratio of g at depth R/2 to surface g?',a:'0.5',hint:'g/g0 = 1 - d/R = 1 - 0.5 = 0.5'}; },
    function () { var M=6e24; var R=6.4e6; var h=36000*1000; return {q:'g at geostationary orbit (h=36000 km)?',a:(6.67e-11*6e24/Math.pow(R+h,2)).toFixed(3)+' m/s^2',hint:'g = GM/(R+h)^2'}; },
    function () { var r=1.5e11; var M_s=2e30; return {q:'Earth orbital speed around Sun? (r=1.5e11 m, M_s=2e30 kg)',a:Math.sqrt(6.67e-11*2e30/1.5e11).toFixed(0)+' m/s',hint:'v = sqrt(GM_s/r)'}; }
  ];

  GENERATORS.physics.mechanics_shm = [
    function () { var k=rand(100,500); var m=rand(1,5); return {q:'k='+k+' N/m, m='+m+' kg. Time period?',a:(2*Math.PI*Math.sqrt(m/k)).toFixed(2)+' s',hint:'T = 2pi*sqrt(m/k)'}; },
    function () { var m=(rand(5,30))/10; var k=rand(50,300); return {q:'m='+m+' kg, k='+k+' N/m. Frequency?',a:(1/(2*Math.PI)*Math.sqrt(k/m)).toFixed(2)+' Hz',hint:'f = (1/2pi)*sqrt(k/m)'}; },
    function () { var A=(rand(5,20))/100; var k=rand(200,600); return {q:'A='+(A*100)+' cm, k='+k+' N/m. Max PE?',a:(0.5*k*A*A).toFixed(2)+' J',hint:'PE_max = 0.5kA^2'}; },
    function () { var A=(rand(10,30))/100; var T=rand(1,4); return {q:'A='+(A*100)+' cm, T='+T+' s. Max velocity?',a:(2*Math.PI*A/T).toFixed(3)+' m/s',hint:'v_max = omega*A = 2pi*A/T'}; },
    function () { var A=(rand(10,30))/100; var T=rand(1,3); return {q:'A='+(A*100)+' cm, T='+T+' s. Max acceleration?',a:(4*Math.PI*Math.PI*A/(T*T)).toFixed(2)+' m/s^2',hint:'a_max = omega^2*A = 4pi^2*A/T^2'}; },
    function () { var L=(rand(5,20))/10; return {q:'Pendulum L='+L+' m. Time period? (g=10)',a:(2*Math.PI*Math.sqrt(L/10)).toFixed(2)+' s',hint:'T = 2pi*sqrt(L/g)'}; },
    function () { var T=rand(1,3); return {q:'Pendulum T='+T+' s. Length? (g=10)',a:(10*T*T/(4*Math.PI*Math.PI)).toFixed(2)+' m',hint:'L = gT^2/4pi^2'}; },
    function () { var T=rand(1,3); var g2=rand(15,25); return {q:'Pendulum T='+T+' s on Earth. T on planet g='+g2+'?',a:(T*Math.sqrt(10/g2)).toFixed(2)+' s',hint:'T prop to 1/sqrt(g)'}; },
    function () { var k=rand(50,200); var A=(rand(10,30))/100; var x=A/2; var m=rand(1,5); return {q:'k='+k+' N/m, A='+(A*100)+' cm. Speed at x='+(x*100)+' cm? (m='+m+' kg)',a:Math.sqrt(k*(A*A-x*x)/m).toFixed(2)+' m/s',hint:'0.5mv^2+0.5kx^2 = 0.5kA^2'}; },
    function () { var A=rand(5,15); var T=rand(2,6); var x=A/Math.sqrt(2); return {q:'SHM A='+A+' cm, T='+T+' s. Time from mean to x=A/sqrt(2)?',a:(T*Math.asin(x/A)/(2*Math.PI)).toFixed(2)+' s',hint:'x = A sin(omega*t)'}; },
    function () { var L=rand(1,3); return {q:'Seconds pendulum length for T=2s? (g=10)',a:(10*4/(4*Math.PI*Math.PI)).toFixed(2)+' m',hint:'T = 2pi*sqrt(L/g), L = gT^2/4pi^2'}; },
    function () { var m=(rand(5,20))/10; var k=rand(50,300); var x0=(rand(5,15))/100; return {q:'Spring m='+m+' kg, k='+k+' N/m, stretched '+(x0*100)+' cm. Initial acceleration?',a:(k*x0/m).toFixed(2)+' m/s^2',hint:'a = -kx/m'}; },
    function () { var L=pick([0.25,0.5,1.0,1.5]); return {q:'Pendulum L='+L+' m. T? (g=10)',a:(2*Math.PI*Math.sqrt(L/10)).toFixed(2)+' s',hint:'T = 2pi*sqrt(L/g)'}; },
    function () { var A=(rand(10,30))/100; var k=rand(100,400); return {q:'SHM A='+(A*100)+' cm, k='+k+' N/m. Total energy?',a:(0.5*k*A*A).toFixed(3)+' J',hint:'E = 0.5kA^2'}; },
    function () { var m=rand(1,4); var L=0.5+rand(0,10)/10; return {q:'Pendulum L='+L+' m, mass '+m+' kg. Does T depend on mass?',a:'No',hint:'T independent of mass for small amplitude'}; },
    function () { var k1=rand(50,200); var k2=rand(50,200); var m=rand(1,3); return {q:'Springs k1='+k1+', k2='+k2+' parallel, m='+m+' kg. T?',a:(2*Math.PI*Math.sqrt(m/(k1+k2))).toFixed(2)+' s',hint:'k_eq = k1+k2 for parallel'}; },
    function () { var k1=rand(50,200); var k2=rand(50,200); var m=rand(1,3); return {q:'Springs k1='+k1+', k2='+k2+' series, m='+m+' kg. T?',a:(2*Math.PI*Math.sqrt(m*(k1+k2)/(k1*k2))).toFixed(2)+' s',hint:'1/k_eq = 1/k1+1/k2'}; },
    function () { var m=rand(2,8); var A=(rand(5,15))/100; var T=rand(1,4); return {q:'SHM m='+m+' kg, A='+(A*100)+' cm, T='+T+' s. Total energy?',a:(2*Math.PI*Math.PI*m*A*A/(T*T)).toFixed(3)+' J',hint:'E = 0.5*m*omega^2*A^2 = 2pi^2*m*A^2/T^2'}; },
    function () { var L=(rand(5,20))/10; var g=10; return {q:'Pendulum L='+L+' m on Moon (g=1.6). T?',a:(2*Math.PI*Math.sqrt(L/1.6)).toFixed(2)+' s',hint:'T = 2pi*sqrt(L/g_moon)'}; },
    function () { var k=rand(100,300); var m=rand(1,4); var A=(rand(5,15))/100; return {q:'m='+m+' kg, k='+k+' N/m, A='+(A*100)+' cm. KE at mean position?',a:(0.5*k*A*A).toFixed(2)+' J',hint:'At mean, KE = Total energy = 0.5kA^2'}; }
  ];

  GENERATORS.physics.waves = [
    function () { var f=rand(50,500); var lam=(rand(5,50))/10; return {q:'f='+f+' Hz, lambda='+lam+' m. Wave speed?',a:(f*lam)+' m/s',hint:'v = f*lambda'}; },
    function () { var v=rand(300,360); var f=rand(200,800); return {q:'v='+v+' m/s, f='+f+' Hz. Wavelength?',a:(v/f).toFixed(3)+' m',hint:'lambda = v/f'}; },
    function () { var T=rand(50,200); var mu=pick([0.01,0.02,0.05,0.1]); return {q:'String T='+T+' N, mu='+mu+' kg/m. Wave speed?',a:Math.sqrt(T/mu).toFixed(1)+' m/s',hint:'v = sqrt(T/mu)'}; },
    function () { var L=(rand(5,20))/10; var T=rand(50,200); var mu=pick([0.01,0.02,0.05]); return {q:'String L='+L+' m, T='+T+' N, mu='+mu+' kg/m. Fundamental?',a:(Math.sqrt(T/mu)/(2*L)).toFixed(1)+' Hz',hint:'f = v/2L, v=sqrt(T/mu)'}; },
    function () { var f0=rand(200,500); var vs=rand(10,30); return {q:'Source f='+f0+' Hz moving towards observer at '+vs+' m/s. Apparent f? (v=340)',a:(f0*340/(340-vs)).toFixed(1)+' Hz',hint:'f = f0*v/(v-vs)'}; },
    function () { var f0=rand(200,500); var vo=rand(10,25); return {q:'Observer moving towards stationary source at '+vo+' m/s. f='+f0+' Hz. Apparent f?',a:(f0*(340+vo)/340).toFixed(1)+' Hz',hint:'f = f0*(v+vo)/v'}; },
    function () { var f1=rand(250,350); var f2=rand(250,350); return {q:'Two forks '+f1+' Hz and '+f2+' Hz. Beat frequency?',a:Math.abs(f1-f2)+' Hz',hint:'Beat = |f1-f2|'}; },
    function () { var f=rand(200,500); var vs=rand(20,50); return {q:'Source moving away at '+vs+' m/s. f='+f+' Hz. Apparent f?',a:(f*340/(340+vs)).toFixed(1)+' Hz',hint:'f = f*v/(v+vs)'}; },
    function () { var L=rand(1,3); var v=rand(300,360); return {q:'Open organ pipe L='+L+' m. Fundamental? (v='+v+' m/s)',a:(v/(2*L)).toFixed(1)+' Hz',hint:'f = v/2L'}; },
    function () { var L=(rand(5,20))/10; var v=rand(320,360); return {q:'Closed organ pipe L='+L+' m. Fundamental? (v='+v+' m/s)',a:(v/(4*L)).toFixed(1)+' Hz',hint:'f = v/4L'}; },
    function () { var A=(rand(5,20))/10; return {q:'Amplitude '+A+' units. Intensity relative to A=1?',a:(A*A).toFixed(2)+' times',hint:'I prop to A^2'}; },
    function () { var I=Math.pow(10,-rand(8,12)); return {q:'Intensity '+I.toExponential(1)+' W/m^2. Sound level?',a:(10*Math.log10(I/1e-12)).toFixed(0)+' dB',hint:'beta = 10 log(I/I0)'}; },
    function () { var L=(rand(5,15))/10; var v=rand(300,360); return {q:'Open pipe L='+L+' m. 1st overtone? (v='+v+' m/s)',a:(v/L).toFixed(1)+' Hz',hint:'1st overtone = 2nd harmonic = v/L'}; },
    function () { var mu=pick([0.01,0.02,0.05]); var L=(rand(5,20))/10; var T=rand(50,200); return {q:'Wire L='+L+' m, T='+T+' N, mu='+mu+' kg/m. Fundamental?',a:(Math.sqrt(T/mu)/(2*L)).toFixed(1)+' Hz',hint:'f = sqrt(T/mu)/(2L)'}; },
    function () { var f0=rand(300,600); var vs=rand(5,20); return {q:'Both source+observer move toward each other at '+vs+' m/s. f='+f0+' Hz. Apparent f?',a:(f0*(340+vs)/(340-vs)).toFixed(1)+' Hz',hint:'f = f0(v+vo)/(v-vs)'}; },
    function () { var f=rand(256,440); var T=273+rand(10,30); return {q:'f='+f+' Hz at '+(T-273)+'^oC. Wavelength? (v prop to sqrt(T), v0=332 at 0^oC)',a:(332*Math.sqrt(T/273)/f).toFixed(2)+' m',hint:'v = v0*sqrt(T/273)'}; },
    function () { var I1=rand(1,10); var r=rand(2,5); return {q:'I1='+I1+' at r=1 m. I at r='+r+' m?',a:(I1/(r*r)).toFixed(2)+' units',hint:'I prop to 1/r^2'}; },
    function () { var A1=rand(2,5); var A2=rand(2,5); return {q:'Two waves A1='+A1+', A2='+A2+' in phase. Resultant amplitude?',a:(A1+A2)+' units',hint:'A = A1+A2 for constructive'}; },
    function () { var A1=rand(3,6); var A2=rand(3,6); return {q:'Two waves A1='+A1+', A2='+A2+' out of phase. Resultant amplitude?',a:Math.abs(A1-A2)+' units',hint:'A = |A1-A2| for destructive'}; },
    function () { var f=rand(100,500); var lam=(rand(5,20))/10; return {q:'Wave f='+f+' Hz, lambda='+lam+' m. Speed?',a:(f*lam)+' m/s',hint:'v = f*lambda'}; }
  ];

  GENERATORS.physics.thermodynamics = [
    function () { var P=rand(1,5)*101325; var V=(rand(1,5))/1000; return {q:'P='+(P/101325).toFixed(1)+' atm, V='+(V*1000)+' mL, T=300 K. Moles?',a:(P*V/(8.314*300)).toExponential(2)+' mol',hint:'PV = nRT'}; },
    function () { var n=rand(1,5); var T=rand(273,373); return {q:n+' mol at '+T+' K. Total translational KE?',a:(1.5*n*8.314*T/1000).toFixed(1)+' kJ',hint:'KE = 3/2 nRT'}; },
    function () { var m_kg=rand(2,10); var c=rand(200,900); var dT=rand(10,50); return {q:'m='+m_kg+' g, c='+c+' J/kgK, dT='+dT+' K. Heat?',a:(m_kg/1000*c*dT/1000).toFixed(2)+' kJ',hint:'Q = mc*dT (convert g to kg)'}; },
    function () { var Q=rand(100,500); var W=rand(30,80); return {q:'System absorbs '+Q+' J, does '+W+' J work. dU?',a:(Q-W)+' J',hint:'dU = Q - W'}; },
    function () { var Qh=rand(500,1500); var Qc=rand(200,600); return {q:'Heat engine Qh='+Qh+' J, Qc='+Qc+' J. Efficiency?',a:((1-Qc/Qh)*100).toFixed(1)+'%',hint:'eta = 1 - Qc/Qh'}; },
    function () { var T1=rand(500,1000); var T2=rand(300,499); return {q:'Carnot Th='+T1+' K, Tc='+T2+' K. Max efficiency?',a:((1-T2/T1)*100).toFixed(1)+'%',hint:'eta = 1 - Tc/Th'}; },
    function () { var V1=rand(1,5); var V2=V1*rand(2,5); return {q:'Isothermal expansion '+V1+' to '+V2+' L at 300 K. Work (1 mol)?',a:(2.303*8.314*300*Math.log10(V2/V1)).toFixed(0)+' J',hint:'W = nRT ln(V2/V1)'}; },
    function () { var n=rand(1,4); var dT=rand(50,150); return {q:n+' mol monatomic at const V, dT='+dT+' K. dU?',a:(1.5*n*8.314*dT).toFixed(0)+' J',hint:'dU = n*Cv*dT, Cv=3R/2'}; },
    function () { var V=rand(5,20); var P=rand(1,5); return {q:'Gas expands by '+V+' L at '+P+' atm. Work in J?',a:(P*101.325*V).toFixed(0)+' J',hint:'W = P*dV, 1 L.atm = 101.325 J'}; },
    function () { var T1=rand(300,400); var V1=rand(1,5); var V2=rand(2,10); return {q:'Adiabatic V1='+V1+' to V2='+V2+' L, T1='+T1+' K. T2? (gamma=5/3)',a:(T1*Math.pow(V1/V2,2/3)).toFixed(1)+' K',hint:'TV^(gamma-1)=constant'}; },
    function () { var T=rand(300,500); return {q:'O2 at '+T+' K. RMS speed? (M=32 g/mol)',a:Math.sqrt(3*8.314*T/0.032).toFixed(0)+' m/s',hint:'v_rms = sqrt(3RT/M)'}; },
    function () { var n=rand(2,8); var dT=rand(20,80); return {q:n+' mol diatomic at const P, dT='+dT+' K. Q?',a:(n*5*8.314/2*dT).toFixed(0)+' J',hint:'Q = n*Cp*dT, Cp=5R/2 for diatomic'}; },
    function () { var V=rand(10,50); var P=rand(1,3); return {q:'Gas compressed by '+V+' L at '+P+' atm. Work on gas?',a:(P*101.325*V).toFixed(0)+' J',hint:'W = -P*dV (compression)'}; },
    function () { var T=rand(300,600); return {q:'N2 at '+T+' K. Most probable speed? (M=28 g/mol)',a:Math.sqrt(2*8.314*T/0.028).toFixed(0)+' m/s',hint:'v_mp = sqrt(2RT/M)'}; },
    function () { var T1=rand(400,800); var T2=rand(300,399); return {q:'Carnot Th='+T1+' K, Tc='+T2+' K. Efficiency?',a:((1-T2/T1)*100).toFixed(1)+'%',hint:'eta = 1 - Tc/Th'}; },
    function () { var n=rand(1,3); var V=rand(5,20); return {q:n+' mol at 300 K, V='+V+' L. Pressure?',a:(n*8.314*300/(V/1000)/101325).toFixed(2)+' atm',hint:'P = nRT/V'}; },
    function () { var T=rand(300,500); return {q:'Temperature '+T+' K. Avg KE per molecule? (k=1.38e-23)',a:(1.5*1.38e-23*T).toExponential(2)+' J',hint:'KE_avg = 3/2 kT'}; },
    function () { var P=rand(1,5); var V=rand(1,10); return {q:'1 mol at P='+P+' atm, V='+V+' L. Temperature?',a:(P*V*101.325/8.314).toFixed(0)+' K',hint:'T = PV/nR'}; },
    function () { var V=rand(10,30); var dT=rand(20,60); var n=rand(1,4); return {q:n+' mol at const V, dT='+dT+' K. Heat absorbed? (monatomic)',a:(1.5*n*8.314*dT).toFixed(0)+' J',hint:'Q = n*Cv*dT, Cv=3R/2'}; },
    function () { var T1=rand(300,400); var T2=rand(500,800); return {q:'Engine Tc='+T1+' K, Th='+T2+' K. Max efficiency?',a:((1-T1/T2)*100).toFixed(1)+'%',hint:'eta = 1 - Tc/Th'}; }
  ];

  GENERATORS.physics.optics_ray = [
    function () { var i=rand(20,60); var r=rand(10,Math.floor(i*0.8)); return {q:'i='+i+'^o, r='+r+'^o. Refractive index?',a:(Math.sin(i*Math.PI/180)/Math.sin(r*Math.PI/180)).toFixed(2),hint:'n = sin i / sin r'}; },
    function () { var n=pick([1.33,1.5,1.6,2.0,2.4]); return {q:'n='+n+'. Speed of light in medium?',a:(''+(3e8/n/1e8).toFixed(2))+'e8 m/s',hint:'v = c/n'}; },
    function () { var f=-rand(10,30); var u=-rand(20,60); var v=1/(1/f-1/u); return {q:'Concave mirror f='+Math.abs(f)+' cm, u='+Math.abs(u)+' cm. Image distance?',a:Math.round(v)+' cm (real)',hint:'1/f = 1/v+1/u'}; },
    function () { var f=rand(10,30); var u=-rand(5,15); var v=1/(1/f-1/u); return {q:'Convex mirror f='+f+' cm, u='+Math.abs(u)+' cm. v?',a:(v>0?Math.round(v*10)/10+' cm (virtual)':Math.round(Math.abs(v))+' cm (virtual)'),hint:'1/f = 1/v+1/u'}; },
    function () { var f=rand(20,50); var u=-rand(30,80); var v=1/(1/f-1/u); return {q:'Convex lens f='+f+' cm, u='+Math.abs(u)+' cm. Magnification?',a:(-v/u).toFixed(2),hint:'1/f = 1/v-1/u, m = v/u'}; },
    function () { var mu=pick([1.5,1.6,1.7]); var A=pick([30,45,60,75]); return {q:'Prism mu='+mu+', A='+A+'^o. Min deviation?',a:(A*(mu-1)).toFixed(1)+'^o',hint:'delta_m = A(mu-1)'}; },
    function () { var R1=rand(10,30); var R2=-rand(10,30); var mu=pick([1.5,1.6]); return {q:'Lens R1='+R1+' cm, R2='+Math.abs(R2)+' cm, mu='+mu+'. Focal length?',a:(1/((mu-1)*(1/R1-1/R2))).toFixed(1)+' cm',hint:'1/f = (mu-1)(1/R1-1/R2)'}; },
    function () { var f=rand(10,30); var u=-rand(20,50); return {q:'Lens f='+f+' cm, u='+Math.abs(u)+' cm. v?',a:(1/(1/f-1/u)).toFixed(1)+' cm',hint:'1/f = 1/v - 1/u'}; },
    function () { var th_c=rand(25,50); return {q:'Critical angle '+th_c+'^o. Refractive index?',a:(1/Math.sin(th_c*Math.PI/180)).toFixed(2),hint:'mu = 1/sin C'}; },
    function () { var h=rand(2,10); var u=-rand(20,50); var f=rand(10,30); var m=f/(f+u); return {q:'Object h='+h+' cm at '+Math.abs(u)+' cm from lens f='+f+' cm. Image height?',a:(Math.abs(m)*h).toFixed(1)+' cm',hint:'m = f/(f+u), h = m*h'}; },
    function () { var n=pick([1.33,1.5,1.6]); var d=rand(2,10); return {q:'Shift by glass slab d='+d+' cm, n='+n+'?',a:(d*(1-1/n)).toFixed(2)+' cm',hint:'Shift = d(1-1/mu)'}; },
    function () { var f=rand(5,20); return {q:'Lens f='+f+' cm. Power in D?',a:(100/f).toFixed(1)+' D',hint:'P = 100/f(cm)'}; },
    function () { var P=rand(1,5); return {q:'Lens power '+P+' D. Focal length?',a:(100/P).toFixed(1)+' cm',hint:'f(cm) = 100/P'}; },
    function () { var i_c=rand(20,60); return {q:'TIR critical angle '+i_c+'^o. n of denser medium?',a:(1/Math.sin(i_c*Math.PI/180)).toFixed(2),hint:'n = 1/sin C'}; },
    function () { var f=rand(15,40); var u=-rand(10,20); var v=1/(1/f-1/u); return {q:'Convex lens f='+f+' cm, object at '+Math.abs(u)+' cm (u<f). Image?',a:(v<0?Math.abs(v).toFixed(1)+' cm (virtual)':'beyond infinity'),hint:'Virtual when u < f'}; },
    function () { var A=pick([30,45,60]); var mu=pick([1.5,1.6]); return {q:'Prism A='+A+'^o, mu='+mu+'. i at min deviation?',a:(Math.asin(mu*Math.sin(A/2*Math.PI/180))*180/Math.PI).toFixed(1)+'^o',hint:'i = arcsin(mu*sin(A/2))'}; },
    function () { var f1=rand(10,30); var f2=-rand(10,20); return {q:'Combination f1='+f1+' cm, f2='+f2+' cm. Effective f?',a:(1/(1/f1+1/f2)).toFixed(1)+' cm',hint:'1/F = 1/f1 + 1/f2'}; },
    function () { var d=rand(2,8); var n=pick([1.33,1.5]); return {q:'Apparent depth of '+d+' cm in water (n='+n+')?',a:(d/n).toFixed(2)+' cm',hint:'Apparent depth = real/n'}; },
    function () { var mu=1.5; var R1=rand(15,30); var R2=-rand(10,25); return {q:'Lens maker: mu='+mu+', R1='+R1+' cm, R2='+Math.abs(R2)+' cm. f?',a:(1/((mu-1)*(1/R1-1/R2))).toFixed(1)+' cm',hint:'1/f = (mu-1)(1/R1-1/R2)'}; },
    function () { var i=rand(30,60); var n=2; return {q:'Light from air to n=2, i='+i+'^o. r?',a:(Math.asin(Math.sin(i*Math.PI/180)/2)*180/Math.PI).toFixed(1)+'^o',hint:'n1 sin i = n2 sin r'}; }
  ];
  GENERATORS.physics.optics_wave = [
    function () { var d=(rand(1,5))/10000; var lam=rand(400,700)*1e-9; return {q:'d='+(d*1e6).toFixed(0)+' um, lambda='+(lam*1e9).toFixed(0)+' nm. Max orders in diffraction?',a:Math.floor(d/lam),hint:'d sin(theta)=n*lambda'}; },
    function () { var lam=rand(400,700)*1e-9; var D=rand(1,3); var d=(rand(1,5))/10000; return {q:'YDSE lambda='+(lam*1e9).toFixed(0)+' nm, D='+D+' m, d='+(d*1e6).toFixed(0)+' um. Fringe width?',a:(lam*D/d*1000).toFixed(2)+' mm',hint:'beta = lambda*D/d'}; },
    function () { var mu=pick([1.33,1.4,1.5]); var t=rand(200,600)*1e-9; return {q:'Thin film mu='+mu+', t='+(t*1e9).toFixed(0)+' nm. Lambda for max reflection?',a:(2*mu*t*1e9).toFixed(0)+' nm',hint:'2*mu*t = n*lambda for max'}; },
    function () { var lam=rand(500,700)*1e-9; var D=rand(1,2); var d=(rand(2,8))/10000; return {q:'YDSE: distance between 1st and 2nd bright? lambda='+(lam*1e9).toFixed(0)+' nm',a:(lam*D/d*1000).toFixed(2)+' mm',hint:'y_n = n*lambda*D/d, difference = lambda*D/d'}; },
    function () { var a=(rand(1,3))/10000; var lam=rand(400,700)*1e-9; return {q:'Single slit a='+(a*1e6).toFixed(0)+' um, lambda='+(lam*1e9).toFixed(0)+' nm. 1st minima angle?',a:(Math.asin(lam/a)*180/Math.PI).toFixed(2)+'^o',hint:'a*sin(theta) = lambda'}; },
    function () { var N=rand(300,600); var lam=500e-9; var d=1/(N*1000); return {q:'Grating '+N+' lines/mm, lambda=500 nm. 1st order angle?',a:(Math.asin(lam/d)*180/Math.PI).toFixed(2)+'^o',hint:'d*sin(theta) = n*lambda, d = 1/N'}; },
    function () { var I0=rand(1,10); var th=pick([30,45,60,90]); return {q:'I0='+I0+' through polarizer at '+th+'^o. Transmitted I?',a:(I0*Math.cos(th*Math.PI/180)*Math.cos(th*Math.PI/180)).toFixed(2)+' units',hint:'I = I0 cos^2(theta)'}; },
    function () { var mu=pick([1.5,1.6]); return {q:'Brewster angle for mu='+mu+'?',a:(Math.atan(mu)*180/Math.PI).toFixed(1)+'^o',hint:'tan(theta_B) = mu'}; },
    function () { var D=rand(1,3); var d=(rand(2,8))/10000; return {q:'YDSE D='+D+' m, d='+(d*1e6).toFixed(0)+' um. Fringe width for 589 nm?',a:(589e-9*D/d*1000).toFixed(2)+' mm',hint:'beta = lambda*D/d'}; },
    function () { var a=(rand(2,5))/1000; var lam=rand(400,700)*1e-9; return {q:'Circular aperture d='+(a*1000)+' mm, lambda='+(lam*1e9).toFixed(0)+' nm. Rayleigh angle?',a:(Math.asin(1.22*lam/a)*180/Math.PI).toFixed(3)+'^o',hint:'sin(theta) = 1.22*lambda/D'}; },
    function () { var I0=1; var th1=pick([15,30,45]); var th2=pick([45,60,90]); return {q:'Two polarizers at '+th1+'^o and '+th2+'^o. I/I0?',a:(Math.cos(th1*Math.PI/180)*Math.cos(th1*Math.PI/180)*Math.cos((th2-th1)*Math.PI/180)*Math.cos((th2-th1)*Math.PI/180)).toFixed(3),hint:'I = I0 cos^2(theta1) cos^2(delta)'}; },
    function () { var t=rand(1,5)*1e-6; var lam=rand(400,700)*1e-9; return {q:'Film t='+(t*1e6).toFixed(0)+' um, lambda='+(lam*1e9).toFixed(0)+' nm. Order for max?',a:(2*t/lam).toFixed(0),hint:'2t = n*lambda for max'}; },
    function () { var lam=500e-9; var D=rand(0.5,2); var d=(rand(1,4))/10000; return {q:'YDSE: 10 fringes width '+(10*lam*D/d*1000).toFixed(1)+' mm, D='+D+' m, d='+(d*1e6).toFixed(0)+' um. lambda?',a:'~500 nm',hint:'beta = lambda*D/d'}; },
    function () { var n1=pick([1.33,1.4,1.5]); var n2=pick([1.5,1.6,1.7]); return {q:'Light from n='+n1+' to n='+n2+'. Phase change on reflection?',a:'pi (180^o)',hint:'Phase change pi when n2 > n1'}; },
    function () { var d=(rand(1,3))/1000; var lam=589e-9; var th=Math.asin(lam/d)*180/Math.PI; return {q:'Diffraction grating d='+(d*1e6).toFixed(0)+' um, lambda=589 nm. 1st order angle?',a:th.toFixed(2)+'^o',hint:'d*sin(theta) = lambda'}; },
    function () { var mu=1.33; var lam=500e-9; var t=lam/(4*mu); return {q:'Min thickness of soap film (mu=1.33) for max reflection of 500 nm?',a:(t*1e9).toFixed(1)+' nm',hint:'t = lambda/4mu for min'}; },
    function () { var lam=500e-9; var a=(rand(1,3))/10000; return {q:'Single slit width '+(a*1e6).toFixed(0)+' um. Angular width of central max for 500 nm?',a:(2*Math.asin(lam/a)*180/Math.PI).toFixed(2)+'^o',hint:'Angular width = 2*theta_1'}; },
    function () { var N=rand(400,800); var lam=500e-9; var d=1/(N*1000); var th=Math.asin(lam/d)*180/Math.PI; return {q:'Grating '+N+' lines/mm, lambda=500 nm. Max possible order?',a:Math.floor(d/lam),hint:'n_max = d/lambda'}; },
    function () { var I0=1; var th=pick([0,30,45,60]); return {q:'Unpolarized light through polarizer at '+th+'^o. Transmitted intensity?',a:(I0/2*Math.cos(th*Math.PI/180)*Math.cos(th*Math.PI/180)).toFixed(2)+' I0',hint:'For unpolarized, I = I0/2 initially'}; },
    function () { var d=(rand(1,5))/10000; var lam=589e-9; var n=d*Math.sin(30*Math.PI/180)/lam; return {q:'Grating d='+(d*1e6).toFixed(0)+' um, lambda=589 nm. Order for 30^o?',a:Math.round(d*Math.sin(Math.PI/6)/lam),hint:'d*sin(theta) = n*lambda'}; }
  ];

  GENERATORS.physics.electrostatics = [
    function () { var q1=rand(1,5)*1e-6; var q2=rand(1,5)*1e-6; var r=(rand(5,20))/100; return {q:'q1='+(q1*1e6).toFixed(0)+' uC, q2='+(q2*1e6).toFixed(0)+' uC, r='+(r*100)+' cm. Force?',a:(9e9*q1*q2/(r*r)).toFixed(2)+' N',hint:'F = kq1q2/r^2'}; },
    function () { var q=rand(1,5)*1e-6; var r=(rand(10,50))/100; return {q:'q='+(q*1e6).toFixed(0)+' uC at r='+(r*100)+' cm. E?',a:(9e9*q/(r*r)).toFixed(1)+' N/C',hint:'E = kq/r^2'}; },
    function () { var q=rand(1,5)*1e-6; var V=rand(100,500); return {q:'q='+(q*1e6).toFixed(0)+' uC, V='+V+' V. Distance?',a:(9e9*q/V).toFixed(2)+' m',hint:'V = kq/r'}; },
    function () { var q=rand(1,3)*1e-6; var E=rand(100,500)*1000; return {q:'q='+(q*1e6).toFixed(1)+' uC in E='+(E/1000).toFixed(0)+' kN/C. Force?',a:(q*E).toFixed(2)+' N',hint:'F = qE'}; },
    function () { var C=rand(10,100)*1e-6; var V=rand(10,50); return {q:'C='+(C*1e6).toFixed(0)+' uF, V='+V+' V. Charge?',a:(C*V*1e6).toFixed(1)+' uC',hint:'Q = CV'}; },
    function () { var C=rand(10,100)*1e-6; var V=rand(10,50); return {q:'C='+(C*1e6).toFixed(0)+' uF, V='+V+' V. Energy stored?',a:(0.5*C*V*V).toFixed(3)+' J',hint:'E = 0.5CV^2'}; },
    function () { var C1=rand(10,50); var C2=rand(10,50); return {q:'C1='+C1+' uF, C2='+C2+' uF in series. Equivalent?',a:(C1*C2/(C1+C2)).toFixed(2)+' uF',hint:'1/Cs = 1/C1+1/C2'}; },
    function () { var C1=rand(10,50); var C2=rand(10,50); return {q:'C1='+C1+' uF, C2='+C2+' uF parallel. Equivalent?',a:(C1+C2)+' uF',hint:'Cp = C1+C2'}; },
    function () { var q=rand(1,5)*1e-6; var V=rand(100,500); return {q:'Charge '+(q*1e6).toFixed(0)+' uC at '+V+' V. Energy?',a:(0.5*q*V).toFixed(3)+' J',hint:'U = 0.5qV'}; },
    function () { var A=(rand(1,5))/100; var d=(rand(5,20))/10000; return {q:'A='+(A*1e4).toFixed(0)+' cm^2, d='+(d*1000).toFixed(1)+' mm. Parallel plate C?',a:(8.85e-12*A/d*1e12).toFixed(1)+' pF',hint:'C = epsilon0*A/d'}; },
    function () { var q=rand(1,5)*1e-6; var r=(rand(10,50))/100; return {q:'Sphere r='+(r*100)+' cm, q='+(q*1e6).toFixed(0)+' uC. Surface potential?',a:(9e9*q/r).toFixed(0)+' V',hint:'V = kq/r'}; },
    function () { var q1=rand(1,3)*1e-6; var q2=rand(1,3)*1e-6; var r=(rand(5,20))/100; return {q:'q1='+(q1*1e6).toFixed(0)+', q2='+(q2*1e6).toFixed(0)+' uC, r='+(r*100)+' cm. PE?',a:(9e9*q1*q2/r).toFixed(2)+' J',hint:'U = kq1q2/r'}; },
    function () { var E=rand(10,50)*1000; var d=(rand(1,10))/100; return {q:'E='+(E/1000).toFixed(0)+' kN/C, d='+(d*100).toFixed(0)+' cm. PD?',a:(E*d).toFixed(1)+' V',hint:'V = Ed'}; },
    function () { var C=rand(10,100)*1e-6; var V=rand(5,20); return {q:'Capacitor '+(C*1e6).toFixed(0)+' uF to '+V+' V. Charge stored?',a:(C*V*1e6).toFixed(1)+' uC',hint:'Q = CV'}; },
    function () { var q=rand(1,5)*1e-9; var E=rand(10,50)*1000; return {q:'q='+(q*1e9).toFixed(0)+' nC in E='+(E/1000).toFixed(0)+' kN/C. Force?',a:(q*E*1e6).toFixed(2)+' uN',hint:'F = qE'}; },
    function () { var r1=(rand(5,15))/100; var r2=(rand(15,30))/100; var Q=rand(1,5)*1e-6; return {q:'Q='+(Q*1e6).toFixed(0)+' uC from r1='+(r1*100).toFixed(0)+' to r2='+(r2*100).toFixed(0)+' cm. Work?',a:(9e9*Q*Q*(1/r1-1/r2)).toFixed(2)+' J',hint:'W = kQq(1/r1-1/r2)'}; },
    function () { var V=rand(100,500); var d=(rand(5,30))/1000; return {q:'V='+V+' V across d='+(d*1000).toFixed(0)+' mm. E?',a:(V/d/1000).toFixed(1)+' kN/C',hint:'E = V/d'}; },
    function () { var C1=rand(10,30); var C2=rand(10,30); var C3=rand(10,30); return {q:'Three '+C1+', '+C2+', '+C3+' uF in series. C_eq?',a:(1/(1/C1+1/C2+1/C3)).toFixed(2)+' uF',hint:'1/Cs = sum(1/Ci)'}; },
    function () { var C0=rand(10,50)*1e-6; var k=pick([2,3,4,5]); return {q:'Dielectric k='+k+' inserted in C0='+(C0*1e6).toFixed(0)+' uF. New C?',a:(k*C0*1e6).toFixed(0)+' uF',hint:'C = k*C0'}; },
    function () { var q=1e-6; var r=0.1; var V=9e9*q/r; return {q:'q=1 uC at r=10 cm. Potential?',a:V.toFixed(0)+' V',hint:'V = kq/r'}; },
    function () { var d1=(rand(2,8))/1000; var d2=(rand(2,8))/1000; var V=rand(100,300); var E1=V/d1; var E2=V/d2; return {q:'Same V='+V+' V, d1='+(d1*1000).toFixed(0)+' mm, d2='+(d2*1000).toFixed(0)+' mm. E1/E2?',a:(d2/d1).toFixed(2),hint:'E = V/d, so E1/E2 = d2/d1'}; }
  ];

  GENERATORS.physics.current_electricity = [
    function () { var V=rand(5,30); var R=rand(10,100); return {q:'V='+V+' V, R='+R+' ohm. Current?',a:(V/R).toFixed(2)+' A',hint:'I = V/R'}; },
    function () { var I=(rand(5,50))/10; var R=rand(20,200); return {q:'I='+I+' A, R='+R+' ohm. PD?',a:(I*R).toFixed(1)+' V',hint:'V = IR'}; },
    function () { var V=rand(5,20); var I=(rand(10,50))/10; return {q:'V='+V+' V, I='+I+' A. Resistance?',a:(V/I).toFixed(1)+' ohm',hint:'R = V/I'}; },
    function () { var R1=rand(10,50); var R2=rand(10,50); return {q:'R1='+R1+' ohm, R2='+R2+' ohm in series. Req?',a:(R1+R2)+' ohm',hint:'Rs = R1+R2'}; },
    function () { var R1=rand(10,50); var R2=rand(10,50); return {q:'R1='+R1+' ohm, R2='+R2+' ohm in parallel. Req?',a:(R1*R2/(R1+R2)).toFixed(2)+' ohm',hint:'1/Rp = 1/R1+1/R2'}; },
    function () { var I=rand(1,10); var t=rand(2,10); return {q:'I='+I+' A for '+t+' s. Charge?',a:(I*t)+' C',hint:'Q = It'}; },
    function () { var V=rand(10,50); var I=(rand(5,50))/10; return {q:'V='+V+' V, I='+I+' A. Power?',a:(V*I).toFixed(1)+' W',hint:'P = VI'}; },
    function () { var R=rand(20,100); var I=rand(1,5); return {q:'I='+I+' A, R='+R+' ohm. Power?',a:(I*I*R)+' W',hint:'P = I^2R'}; },
    function () { var E=rand(10,30); var r=rand(1,5); var R=rand(5,20); return {q:'E='+E+' V, r='+r+' ohm, R='+R+' ohm. Current?',a:(E/(R+r)).toFixed(2)+' A',hint:'I = E/(R+r)'}; },
    function () { var rho=pick([1.6,1.7,2.0,2.5])*1e-8; var L=rand(1,10); var A=(rand(5,20))/10*1e-6; return {q:'rho='+(rho*1e8).toFixed(1)+'e-8, L='+L+' m, A='+(A*1e6).toFixed(1)+' mm^2. R?',a:(rho*L/A).toFixed(2)+' ohm',hint:'R = rho*L/A'}; },
    function () { var R1=rand(10,30); var R2=rand(10,30); var R3=rand(10,30); return {q:'Three '+R1+', '+R2+', '+R3+' ohm in series. Req?',a:(R1+R2+R3)+' ohm',hint:'Rs = sum(Ri)'}; },
    function () { var V=rand(5,15); var R1=rand(10,30); var R2=rand(10,30); return {q:'V='+V+' V, R1='+R1+', R2='+R2+' series. V across R1?',a:(V*R1/(R1+R2)).toFixed(2)+' V',hint:'V1 = V*R1/(R1+R2)'}; },
    function () { var E=rand(5,20); var r=rand(1,3); var R=rand(5,15); return {q:'E='+E+' V, r='+r+' ohm, R='+R+' ohm. Terminal PD?',a:(E*R/(R+r)).toFixed(2)+' V',hint:'V = E - Ir = ER/(R+r)'}; },
    function () { var V=rand(220,240); var P=rand(40,200); return {q:'Bulb '+P+' W at '+V+' V. Resistance when glowing?',a:(V*V/P).toFixed(0)+' ohm',hint:'R = V^2/P'}; },
    function () { var R=rand(10,50); var L=rand(5,20); var A=(rand(5,20))/10*1e-6; return {q:'R='+R+' ohm, L='+L+' m, A='+(A*1e6).toFixed(1)+' mm^2. Resistivity?',a:(R*A/L*1e8).toFixed(2)+'e-8 ohm.m',hint:'rho = RA/L'}; },
    function () { var R0=rand(10,50); var alpha=pick([0.0039,0.004,0.0045]); var T=rand(50,200); return {q:'R0='+R0+' ohm at 0C, alpha='+alpha+'/K. R at '+T+'C?',a:(R0*(1+alpha*T)).toFixed(2)+' ohm',hint:'R = R0(1+alpha*dT)'}; },
    function () { var I=rand(1,10); var R=rand(10,50); var t=rand(60,300); return {q:'I='+I+' A, R='+R+' ohm, t='+t+' s. Heat produced?',a:(I*I*R*t/1000).toFixed(1)+' kJ',hint:'H = I^2Rt'}; },
    function () { var R1=rand(20,50); var R2=rand(20,50); var R3=rand(20,50); var V=rand(10,20); var Rp=1/(1/R1+1/R2+1/R3); return {q:'Three '+R1+', '+R2+', '+R3+' ohm parallel, V='+V+' V. Total current?',a:(V/Rp).toFixed(2)+' A',hint:'I = V/Req, 1/Rp = sum(1/Ri)'}; },
    function () { var V=rand(5,15); var R1=rand(10,30); var R2=rand(10,30); var R3=rand(10,30); var Req=R1+R2*R3/(R2+R3); return {q:'V='+V+' V, R1='+R1+' (series) with R2='+R2+', R3='+R3+' (parallel). Total current?',a:(V/Req).toFixed(2)+' A',hint:'Find Req: series+parallel combination'}; },
    function () { var W=rand(100,1000)*3600; var t=rand(30,120); return {q:'Heater uses '+(W/3600).toFixed(0)+' Wh in '+t+' s. Power?',a:(W/t).toFixed(0)+' W',hint:'P = W/t'}; }
  ];

  GENERATORS.physics.magnetism = [
    function () { var q=rand(1,5)*1e-6; var v=rand(1,5)*1e6; var B=(rand(5,20))/10; return {q:'q='+(q*1e6).toFixed(0)+' uC, v='+v/1e6+'e6 m/s, B='+B+' T. Force? (perp)',a:(q*v*B).toFixed(2)+' N',hint:'F = qvB (when perpendicular)'}; },
    function () { var I=rand(1,10); var L=(rand(1,5))/10; var B=(rand(5,20))/10; return {q:'I='+I+' A, L='+(L*100)+' cm, B='+B+' T, perpendicular. Force?',a:(I*L*B).toFixed(2)+' N',hint:'F = BIL'}; },
    function () { var I=rand(1,10); var r=(rand(1,5))/10; var B=2e-7*I/r; return {q:'I='+I+' A at r='+(r*100)+' cm. Magnetic field?',a:(B*1e5).toFixed(2)+' G (approx)',hint:'B = mu0*I/(2pi*r)'}; },
    function () { var n=rand(100,500); var I=rand(1,5); var B=4*Math.PI*1e-7*n*I; return {q:'Solenoid n='+n+' turns/m, I='+I+' A. B inside?',a:(B*1e4).toFixed(2)+' G',hint:'B = mu0*n*I'}; },
    function () { var q=rand(1,5)*1e-6; var v=rand(1,5)*1e6; var B=rand(1,5)/10; var r=q*v/B; return {q:'q='+(q*1e6).toFixed(0)+' uC, v='+v/1e6+'e6 m/s, B='+B*10+' T. Force?',a:r.toFixed(1)+' N (actually F = qvB)',hint:'F = qvB'}; },
    function () { var I=rand(1,10); var a=(rand(1,5))/10; var B=1e-7*2*I/a; return {q:'Long wire I='+I+' A, distance a='+(a*100)+' cm. B?',a:(B*1e5).toFixed(1)+' G',hint:'B = mu0*I/(2pi*a)'}; },
    function () { var q=1.6e-19; var B=rand(1,5)/10; var m=9.1e-31; var f=q*B/(2*Math.PI*m); return {q:'Electron in B='+B+' T. Cyclotron frequency?',a:(f/1e6).toFixed(2)+' MHz',hint:'f = qB/(2pi*m)'}; },
    function () { var I=rand(1,5); var N=rand(50,200); var A=(rand(1,5))/100; var tau=I*N*A*A*rand(1,5)/10; return {q:'N='+N+', I='+I+' A, area loop, B=0.5 T. Max torque?',a:(N*I*0.01*0.5).toFixed(3)+' Nm',hint:'tau = NIBAsin(theta)'}; },
    function () { var I1=rand(1,10); var I2=rand(1,10); var d=(rand(1,5))/10; return {q:'Two wires I1='+I1+', I2='+I2+' A, d='+(d*100)+' cm. Force per meter?',a:(2e-7*I1*I2/d).toExponential(1)+' N/m',hint:'F/L = mu0*I1*I2/(2pi*d)'}; },
    function () { var q=1.6e-19; var m=9.1e-31; var B=rand(1,5)/10; var r=rand(1,5)/100; var v=q*B*r/m; return {q:'Electron in B='+B+' T, r='+(r*100)+' cm. Velocity?',a:(v/1e6).toFixed(2)+'e6 m/s',hint:'r = mv/qB, so v = qBr/m'}; },
    function () { var I=rand(1,5); var r=(rand(2,8))/10; var B=4*Math.PI*1e-7*I/(2*r); return {q:'Circular loop I='+I+' A, r='+r+' m. B at center?',a:(B*1e5).toFixed(2)+' G',hint:'B = mu0*I/(2r)'}; },
    function () { var n=rand(500,2000); var I=rand(1,3); var L=rand(10,30)/100; var B=4*Math.PI*1e-7*n/L*I; return {q:'Solenoid L='+(L*100)+' cm, '+n+' turns, I='+I+' A. B?',a:(B*1e4).toFixed(2)+' G',hint:'B = mu0*(N/L)*I'}; },
    function () { var v=rand(1,5)*1e6; var B=rand(1,5)/10; var E=rand(1,5)*1000; return {q:'Velocity selector: v='+v/1e6+'e6 m/s, B='+B+' T. E for straight path?',a:(v*B).toFixed(0)+' N/C',hint:'qE = qvB, so E = vB'}; },
    function () { var I=rand(1,10); var d=(rand(1,5))/10; var B=2e-7*I/d; return {q:'Wire I='+I+' A. B at '+d*100+' cm?',a:(B*1e5).toFixed(1)+' G',hint:'B = mu0*I/(2pi*d)'}; },
    function () { var q=1.6e-19; var B=0.5; var m=1.67e-27; var f=q*B/(2*Math.PI*m); return {q:'Proton in B=0.5 T. Cyclotron frequency?',a:(f/1e6).toFixed(2)+' MHz',hint:'f = qB/(2pi*m)'}; },
    function () { var I=rand(1,5); var N=rand(10,50); var A=(rand(1,3))/100; var B=0.3; var tau=N*I*A*B; return {q:'Coil N='+N+', I='+I+' A, A='+(A*1e4).toFixed(0)+' cm^2, B='+B+' T. Max torque?',a:tau.toFixed(4)+' Nm',hint:'tau_max = N*I*A*B'}; },
    function () { var v=rand(1,5)*1e5; var B=rand(1,5)/10; var E=v*B; return {q:'Particle v='+v/1e5+'e5 m/s, B='+B+' T. E to balance?',a:E.toFixed(2)+' N/C',hint:'E = vB for velocity selector'}; },
    function () { var r=rand(1,5)/100; var I=rand(2,8); var B=4*Math.PI*1e-7*I/(2*r); return {q:'Loop r='+(r*100)+' cm, I='+I+' A. B at center?',a:(B*1e5).toFixed(1)+' G',hint:'B = mu0*I/(2r)'}; },
    function () { var I1=rand(1,5); var I2=rand(1,5); var d=rand(5,20)/100; return {q:'Parallel wires I1='+I1+', I2='+I2+' A, '+d*100+' cm apart. Force attractive/repulsive?',a:(I1*I2>0?'Attractive':'Repulsive'),hint:'Same direction = attract, opposite = repel'}; },
    function () { var q=1.6e-19; var m=9.1e-31; var v=rand(1,5)*1e6; var B=rand(1,5)/10; return {q:'Electron v='+v/1e6+'e6 m/s, B='+B+' T perpendicular. Radius?',a:(m*v/(q*B)*100).toFixed(1)+' cm',hint:'r = mv/qB'}; }
  ];
  GENERATORS.physics.emi = [
    function () { var B=rand(0.5,2); var A=(rand(1,5))/100; var phi=B*A; return {q:'B='+B+' T, A='+(A*1e4).toFixed(0)+' cm^2. Flux?',a:(phi*1e3).toFixed(2)+' mWb',hint:'phi = BA cos(theta)'}; },
    function () { var dphi=rand(10,50)*1e-3; var dt=rand(0.1,0.5)*10/10; return {q:'dphi='+(dphi*1000).toFixed(0)+' mWb in '+dt+' s. Induced emf?',a:(dphi/dt*1000).toFixed(1)+' mV',hint:'emf = -dphi/dt'}; },
    function () { var N=rand(50,200); var dphi=rand(10,50)*1e-3; var dt=rand(0.1,0.5)*10/10; return {q:'N='+N+', dphi='+(dphi*1000).toFixed(0)+' mWb in '+dt+' s. emf?',a:(N*dphi/dt*1000).toFixed(1)+' mV',hint:'emf = -N*dphi/dt'}; },
    function () { var L=rand(1,10)/1000; var dI=rand(1,5); var dt=rand(0.01,0.05)*100/100; return {q:'L='+(L*1000)+' mH, dI='+dI+' A in '+dt+' s. Self-induced emf?',a:(L*dI/dt).toFixed(2)+' V',hint:'emf = -L*dI/dt'}; },
    function () { var L=rand(1,5)/1000; var I=rand(1,5); return {q:'L='+(L*1000)+' mH, I='+I+' A. Energy stored?',a:(0.5*L*I*I*1000).toFixed(2)+' mJ',hint:'U = 0.5LI^2'}; },
    function () { var B=rand(0.5,2); var l=(rand(5,20))/100; var v=rand(5,20); return {q:'B='+B+' T, l='+(l*100)+' cm, v='+v+' m/s. Motional emf?',a:(B*l*v*1000).toFixed(1)+' mV',hint:'emf = B*l*v'}; },
    function () { var N=rand(50,200); var dI=rand(1,5); var dt=rand(0.01,0.05)*100/100; var L=N*dI/dt/10; return {q:'N='+N+', dI='+dI+' A in '+dt+' s. Self-inductance?',a:(N*(dI/dt)/dI*dt).toFixed(2)+' H (approx)',hint:'L = N*phi/I'}; },
    function () { var V=rand(100,240); var I=rand(1,5); var phi=pick([0,30,45,60]); return {q:'AC: V='+V+' V, I='+I+' A, theta='+phi+'^o. Power?',a:(V*I*Math.cos(phi*Math.PI/180)).toFixed(0)+' W',hint:'P = VI cos(phi)'}; },
    function () { var L=rand(1,10)/1000; var f=rand(50,60); var XL=2*Math.PI*f*L; return {q:'L='+(L*1000)+' mH, f='+f+' Hz. XL?',a:XL.toFixed(2)+' ohm',hint:'XL = 2pi*f*L'}; },
    function () { var C=rand(10,100)*1e-6; var f=rand(50,60); var XC=1/(2*Math.PI*f*C); return {q:'C='+(C*1e6).toFixed(0)+' uF, f='+f+' Hz. XC?',a:XC.toFixed(2)+' ohm',hint:'XC = 1/(2pi*f*C)'}; },
    function () { var N1=rand(100,500); var N2=rand(1000,5000); var V1=rand(100,240); return {q:'Transformer N1='+N1+', N2='+N2+', V1='+V1+' V. V2?',a:(V1*N2/N1).toFixed(0)+' V',hint:'V2/V1 = N2/N1'}; },
    function () { var R=rand(10,50); var L=rand(1,10)/1000; var f=rand(50,60); var Z=Math.sqrt(R*R+(2*Math.PI*f*L)*(2*Math.PI*f*L)); return {q:'RL: R='+R+' ohm, L='+(L*1000)+' mH, f='+f+' Hz. Impedance?',a:Z.toFixed(2)+' ohm',hint:'Z = sqrt(R^2+(2pi*f*L)^2)'}; },
    function () { var A=0.01; var N=100; var B=1; var w=rand(50,100); return {q:'Coil N='+N+', A='+(A*1e4).toFixed(0)+' cm^2, B='+B+' T, omega='+w+' rad/s. Max emf?',a:(N*A*B*w*1000).toFixed(0)+' mV',hint:'emf_max = N*A*B*omega'}; },
    function () { var V=rand(100,240); var R=rand(10,50); return {q:'AC V_rms='+V+' V, R='+R+' ohm. Peak current?',a:(V*Math.sqrt(2)/R).toFixed(2)+' A',hint:'I_peak = V_rms*sqrt(2)/R'}; },
    function () { var N=rand(100,500); var dphi=rand(1,10)*1e-3; var dt=rand(0.01,0.1)*10/10; return {q:'N='+N+', flux changes by '+(dphi*1000).toFixed(1)+' mWb in '+dt+' s. Avg emf?',a:(N*dphi/dt).toFixed(2)+' V',hint:'emf = N*dphi/dt'}; },
    function () { var L=rand(1,5)/1000; var I=rand(2,8); var U=0.5*L*I*I; return {q:'Inductor L='+(L*1000)+' mH with I='+I+' A. Energy?',a:(U*1000).toFixed(2)+' mJ',hint:'U = 0.5LI^2'}; },
    function () { var V=rand(100,240); var P=rand(40,100); return {q:'AC: '+P+' W bulb at '+V+' V. RMS current?',a:(P/V).toFixed(3)+' A',hint:'I = P/V'}; },
    function () { var B=rand(0.5,2); var A=(rand(1,5))/100; var w=rand(50,100); return {q:'Loop A='+(A*1e4).toFixed(0)+' cm^2, B='+B+' T, rotates at '+w+' rad/s. Max flux?',a:(B*A*1000).toFixed(2)+' mWb',hint:'phi_max = BA'}; },
    function () { var N=rand(50,200); var phi=rand(1,10)*1e-3; var I=rand(1,5); return {q:'N='+N+', phi='+(phi*1000).toFixed(1)+' mWb, I='+I+' A. L?',a:(N*phi/I*1000).toFixed(2)+' mH',hint:'L = N*phi/I'}; },
    function () { var V=rand(100,240); var f=rand(50,60); var C=rand(10,100)*1e-6; var I=V/(1/(2*Math.PI*f*C)); return {q:'Capacitive circuit: V='+V+' V, C='+(C*1e6).toFixed(0)+' uF, f='+f+' Hz. I?',a:(V*2*Math.PI*f*C*1000).toFixed(1)+' mA',hint:'I = V/XC = V*2pi*f*C'}; }
  ];

  GENERATORS.physics.modern_physics = [
    function () { var f=rand(5,15)*1e14; var h=6.63e-34; return {q:'f='+f/1e14+'e14 Hz. Photon energy in eV? (h=6.63e-34)',a:(h*f/1.6e-19).toFixed(2)+' eV',hint:'E = hf (divide by e for eV)'}; },
    function () { var lam=rand(200,600)*1e-9; var h=6.63e-34; var c=3e8; return {q:'lambda='+(lam*1e9).toFixed(0)+' nm. Photon energy in eV?',a:(h*c/(lam*1.6e-19)).toFixed(2)+' eV',hint:'E = hc/lambda'}; },
    function () { var W=rand(2,4); var f=rand(6,12)*1e14; var h=6.63e-34; var KE=h*f-W*1.6e-19; return {q:'Work function '+W+' eV, f='+f/1e14+'e14 Hz. Max KE of emitted e-?',a:(KE/1.6e-19).toFixed(2)+' eV',hint:'KE = hf - phi'}; },
    function () { var lam=rand(1,10)*1e-12; var h=6.63e-34; var c=3e8; return {q:'X-ray lambda='+(lam*1e12).toFixed(0)+' pm. Photon energy in keV?',a:(h*c/(lam*1.6e-19)/1000).toFixed(2)+' keV',hint:'E = hc/lambda'}; },
    function () { var m=9.1e-31; var v=rand(1,5)*1e6; var h=6.63e-34; var lam=h/(m*v); return {q:'Electron v='+v/1e6+'e6 m/s. de Broglie wavelength in nm?',a:(lam*1e9).toFixed(2)+' nm',hint:'lambda = h/p = h/mv'}; },
    function () { var V=rand(100,500); var h=6.63e-34; var m=9.1e-31; var e=1.6e-19; var lam=h/Math.sqrt(2*m*e*V); return {q:'Electron accelerated by '+V+' V. de Broglie wavelength in nm?',a:(lam*1e9).toFixed(2)+' nm',hint:'lambda = h/sqrt(2meV)'}; },
    function () { var N0=rand(1000,10000); var t=rand(10,50); var T=rand(10,30); var N=N0*Math.pow(0.5,t/T); return {q:'N0='+N0+', half-life '+T+' days, after '+t+' days. N remaining?',a:Math.round(N),hint:'N = N0*(0.5)^(t/T)'}; },
    function () { var lam=rand(0.1,0.5); var T=Math.LN2/lam; return {q:'Decay constant lambda='+lam+' s^-1. Half-life?',a:T.toFixed(2)+' s',hint:'T = ln(2)/lambda'}; },
    function () { var A=rand(100,1000); var T=rand(10,50); var N0=A*T/Math.LN2; return {q:'Activity '+A+' Bq, T='+T+' days. Number of atoms?',a:Math.round(N0),hint:'A = lambda*N = (ln2/T)*N'}; },
    function () { var lam=rand(0.1,0.5); var t=rand(2,8); return {q:'lambda='+lam+' s^-1, t='+t+' s. Fraction remaining?',a:Math.exp(-lam*t).toFixed(3),hint:'N/N0 = e^(-lambda*t)'}; },
    function () { var E=rand(1,10)*1e6*1.6e-19; var m=1.67e-27; var v=Math.sqrt(2*E/m); return {q:'Alpha particle KE='+E/1.6e-19/1e6+' MeV. Speed? (m_alpha=6.68e-27 kg)',a:(v/1e6).toFixed(2)+'e6 m/s',hint:'KE = 0.5mv^2'}; },
    function () { var n1=pick([1,2,3]); var n2=pick([2,3,4]); if(n2<=n1)n2=n1+1; var R=1.097e7; var wl=1/(R*(1/(n1*n1)-1/(n2*n2))); return {q:'H atom: n1='+n1+' to n2='+n2+'. Wavelength in nm? (R=1.097e7)',a:(wl*1e9).toFixed(2)+' nm',hint:'1/lambda = R(1/n1^2-1/n2^2)'}; },
    function () { var n=pick([2,3,4,5]); var E=-13.6/(n*n); return {q:'H atom n='+n+'. Energy in eV?',a:E.toFixed(2)+' eV',hint:'E_n = -13.6/n^2 eV'}; },
    function () { var m=rand(2,10); var c=3e8; return {q:'Mass defect '+m+' u. Energy released in MeV? (1u=931.5 MeV/c^2)',a:(m*931.5).toFixed(1)+' MeV',hint:'E = mc^2, 1u = 931.5 MeV'}; },
    function () { var W=rand(2,4); var lam=rand(200,400)*1e-9; var h=6.63e-34; var c=3e8; var KE=h*c/lam-W*1.6e-19; return {q:'Work function '+W+' eV, lambda='+(lam*1e9).toFixed(0)+' nm. Stopping potential?',a:(KE/1.6e-19).toFixed(2)+' V',hint:'eV_s = hf - phi'}; },
    function () { var N0=rand(1000,10000); var T=rand(10,30); var t=rand(20,60); var N=N0*Math.pow(0.5,t/T); return {q:'Half-life '+T+' days, N0='+N0+', after '+t+' days. N left?',a:Math.round(N),hint:'N = N0*(0.5)^(t/T)'}; },
    function () { var lams=rand(0.1,0.5); var t=rand(1,5); return {q:'Decay constant '+lams+' yr^-1, t='+t+' yr. Fraction decayed?',a:(1-Math.exp(-lams*t)).toFixed(3),hint:'Fraction decayed = 1 - e^(-lambda*t)'}; },
    function () { var n1=pick([1,2,3]); var n2=n1+pick([1,2,3]); return {q:'H atom: transition n='+n2+' to n='+n1+'. Spectral series?',a:n1==1?'Lyman':(n1==2?'Balmer':(n1==3?'Paschen':'Brackett')),hint:'Lyman (n=1), Balmer (n=2), Paschen (n=3)'}; },
    function () { var Z=rand(3,10); var n1=1; var n2=2; var R=1.097e7; var wl=1/(R*Z*Z*(1/(n1*n1)-1/(n2*n2))); return {q:'He+ ion Z='+Z+': n1 to n2. Wavelength ratio compared to H?',a:'1/'+(Z*Z),hint:'1/lambda prop to Z^2'}; },
    function () { var h=6.63e-34; var p=rand(1,10)*1e-22; var lam=h/p; return {q:'Particle p='+p+'e-22 kg m/s. de Broglie wavelength in nm?',a:(lam*1e9).toFixed(2)+' nm',hint:'lambda = h/p'}; }
  ];

  GENERATORS.physics.semiconductors = [
    function () { var V=rand(5,15); var I=rand(1,10)/1000; return {q:'Diode V='+V+' V, I='+(I*1000)+' mA. DC resistance?',a:(V/I).toFixed(0)+' ohm',hint:'R = V/I'}; },
    function () { var V_BE=rand(5,8)/10; var I_B=rand(10,50)*1e-6; return {q:'BJT V_BE='+V_BE.toFixed(1)+' V, I_B='+(I_B*1e6)+' uA. Input resistance?',a:(V_BE/I_B/1000).toFixed(1)+' kohm',hint:'r_i = V_BE/I_B'}; },
    function () { var beta=rand(50,200); var I_B=rand(10,50)*1e-6; return {q:'beta='+beta+', I_B='+(I_B*1e6)+' uA. I_C?',a:(beta*I_B*1000).toFixed(1)+' mA',hint:'I_C = beta*I_B'}; },
    function () { var V_CC=rand(5,15); var R_C=rand(1,5)*1000; var I_C=rand(1,10)/1000; return {q:'V_CC='+V_CC+' V, R_C='+(R_C/1000).toFixed(0)+' kohm, I_C='+(I_C*1000)+' mA. V_CE?',a:(V_CC-I_C*R_C).toFixed(2)+' V',hint:'V_CE = Vcc - Ic*Rc'}; },
    function () { var V=rand(2,5); var R=rand(100,1000); var I_z=(V-0.7)/R; return {q:'Zener V_z='+V+' V, R='+R+' ohm, input 10 V. I_z?',a:(I_z*1000).toFixed(1)+' mA',hint:'I_z = (Vin-Vz)/R'}; },
    function () { var A=pick(['AND','OR','NAND','NOR','XOR']); return {q:'Which gate: output 0 only when both inputs 1?',a:'NAND',hint:'Truth table: NAND gives 0 only for (1,1)'}; },
    function () { var A=pick(['AND','OR','NAND','NOR','XOR']); return {q:'Which gate: output 1 when any input is 1?',a:'OR',hint:'OR gate: Y = A+B'}; },
    function () { var V=rand(5,15); var R1=rand(10,100)*1000; var R2=rand(10,100)*1000; return {q:'Voltage divider: Vcc='+V+' V, R1='+(R1/1000).toFixed(0)+' k, R2='+(R2/1000).toFixed(0)+' k. V_out?',a:(V*R2/(R1+R2)).toFixed(2)+' V',hint:'Vout = Vcc*R2/(R1+R2)'}; },
    function () { var beta=rand(50,200); var I_C=rand(1,10)/1000; return {q:'beta='+beta+', I_C='+(I_C*1000)+' mA. I_B?',a:(I_C/beta*1e6).toFixed(0)+' uA',hint:'I_B = I_C/beta'}; },
    function () { var V_GS=rand(2,5); var V_T=pick([1,1.5,2,2.5]); var k=rand(1,5)/1000; return {q:'MOSFET V_GS='+V_GS+' V, V_T='+V_T+' V, k='+(k*1000).toFixed(1)+' mA/V^2. I_D in saturation?',a:(k*(V_GS-V_T)*(V_GS-V_T)*1000).toFixed(2)+' mA',hint:'I_D = k(V_GS-VT)^2'}; },
    function () { var V_CC=rand(5,15); var R_C=rand(1,5)*1000; var V_CE_sat=0.2; return {q:'V_CC='+V_CC+' V, R_C='+(R_C/1000).toFixed(0)+' k. Saturation I_C?',a:((V_CC-V_CE_sat)/R_C*1000).toFixed(1)+' mA',hint:'I_Csat = (Vcc-Vce)/Rc'}; },
    function () { var f=rand(100,1000); var C=rand(1,100)*1e-9; var T=1/f; return {q:'Astable: f='+f+' Hz, C='+(C*1e9).toFixed(0)+' nF. Approx R?',a:(T/(1.386*C)/1000).toFixed(0)+' kohm',hint:'f = 1/(1.386*R*C)'}; },
    function () { var Vin=rand(1,5); var Rf=rand(10,100)*1000; var Rin=rand(1,10)*1000; return {q:'Inverting op-amp: Vin='+Vin+' V, Rf='+(Rf/1000).toFixed(0)+' k, Rin='+(Rin/1000).toFixed(0)+' k. Vout?',a:(-Vin*Rf/Rin).toFixed(2)+' V',hint:'Vout = -(Rf/Rin)*Vin'}; },
    function () { var Vcc=rand(5,15); var R1=rand(10,100)*1000; var R2=rand(10,100)*1000; return {q:'Non-inverting: R1='+(R1/1000).toFixed(0)+' k, R2='+(R2/1000).toFixed(0)+' k. Gain?',a:(1+R2/R1).toFixed(1),hint:'Gain = 1 + R2/R1'}; },
    function () { var V=rand(0.5,3); var I=rand(10,50)/1000; return {q:'Diode V='+V+' V, I='+(I*1000).toFixed(0)+' mA. Dynamic resistance?',a:((0.026/I)/1).toFixed(2)+' ohm',hint:'r_d = VT/I, VT=26mV at room temp'}; },
    function () { var Vin=rand(2,5); var Vz=rand(3,6); return {q:'Zener regulator: Vin='+Vin+' V, Vz='+Vz+' V. Condition for regulation?',a:'Vin > Vz',hint:'Vin must exceed Vz for breakdown'}; },
    function () { var A=pick([0,0,1,1]); var B=pick([0,1,0,1]); return {q:'NAND: A='+A+', B='+B+'. Output?',a:'1'+(A==1&&B==1?' (since NAND of 1,1=0)':''),hint:'NAND = NOT(AND)'}; },
    function () { var R=rand(10,100); return {q:'Half-wave rectifier: R='+R+' ohm, Vm=10 V. DC output voltage?',a:(10/Math.PI).toFixed(2)+' V',hint:'Vdc = Vm/pi for half-wave'}; },
    function () { var V_CC=rand(5,15); var R=rand(1,10)*1000; var V_BE=0.7; return {q:'CE amp: Vcc='+V_CC+' V, Rc='+(R/1000).toFixed(0)+' k, no signal. V_CE if I_B=0?',a:V_CC+' V',hint:'If I_B=0, transistor is cut-off, V_CE=Vcc'}; },
    function () { var Vin=rand(1,5); var R=rand(10,100)*1000; return {q:'Op-amp buffer: Vin='+Vin+' V. Vout?',a:Vin+' V',hint:'Buffer (voltage follower): Vout = Vin'}; }
  ];
  // ==================== CHEMISTRY ====================

  GENERATORS.chemistry.mole_concept = [
    function () { var metals=[{n:"Fe",m:56},{n:"Cu",m:63.5},{n:"Zn",m:65},{n:"Ca",m:40},{n:"Mg",m:24},{n:"Al",m:27}]; var mt=pick(metals); var mass=rand(2,10)*mt.m; var moles=mass/mt.m; return {q:'Moles in '+mass+' g of '+mt.n+'? (AW='+mt.m+')',a:moles%1===0?moles+'':moles.toFixed(2),hint:'moles = mass/molar mass'}; },
    function () { var metals=[{n:"Fe",m:56},{n:"Cu",m:63.5},{n:"Zn",m:65},{n:"Ca",m:40}]; var mt=pick(metals); var M=rand(2,5); var mass=M*mt.m; return {q:'Mass of '+M+' mol of '+mt.n+'? (AW='+mt.m+')',a:mass+' g',hint:'mass = moles*molar mass'}; },
    function () { var N=6.022e23; var n=rand(1,5); return {q:'Number of atoms in '+n+' mol?',a:(n*N).toExponential(2),hint:'Atoms = n*NA'}; },
    function () { var C=12; var m=rand(12,60); return {q:'Moles of C in '+m+' g? (C=12)',a:(m/12).toFixed(2)+' mol',hint:'moles = mass/12'}; },
    function () { var n=rand(2,10); var N=6.022e23; return {q:'Atoms in '+n+' mol of oxygen?',a:(n*N).toExponential(2),hint:'Atoms = n*NA'}; },
    function () { var v=rand(1,10); return {q:'Volume of '+v+' mol ideal gas at STP?',a:(v*22.4).toFixed(1)+' L',hint:'1 mol = 22.4 L at STP'}; },
    function () { var v=rand(5,20); return {q:'Moles in '+v+' L gas at STP?',a:(v/22.4).toFixed(3)+' mol',hint:'moles = V/22.4'}; },
    function () { var n=rand(1,4); var m=n*18; return {q:'Mass of '+n+' mol water?',a:m+' g',hint:'M(H2O)=18 g/mol'}; },
    function () { var m=rand(18,90); return {q:'Moles in '+m+' g water?',a:(m/18).toFixed(2)+' mol',hint:'M(H2O)=18 g/mol'}; },
    function () { var n=rand(1,3); var N=6.022e23; return {q:'Molecules in '+n+' mol CO2?',a:(n*N).toExponential(2),hint:'Molecules = n*NA'}; },
    function () { var m=rand(5,50); var M=rand(2,10); var n=m/M; return {q:'Moles in '+m+' g (M='+M+')?',a:n.toFixed(2)+' mol',hint:'n = m/M'}; },
    function () { var m=rand(10,40); var n=m/40; return {q:'Moles NaOH in '+m+' g? (M=40)',a:n.toFixed(2)+' mol',hint:'M(NaOH)=40 g/mol'}; },
    function () { var m=rand(49,98); var n=m/98; return {q:'Moles H2SO4 in '+m+' g? (M=98)',a:n.toFixed(2)+' mol',hint:'M(H2SO4)=98 g/mol'}; },
    function () { var n=rand(1,5); var mass=n*100; return {q:'Mass of '+n+' mol CaCO3? (M=100)',a:mass+' g',hint:'M(CaCO3)=100 g/mol'}; },
    function () { var m=rand(5,50); var M_X=pick([12,14,16,23,24,27,31,32,35.5,39,40,56,63.5,65]); var n=m/M_X; return {q:'Moles in '+m+' g (M='+M_X+')?',a:n.toFixed(2)+' mol',hint:'n = m/M'}; }
  ];

  GENERATORS.chemistry.atomic_structure = [
    function () { var n=pick([1,2,3,4]); return {q:'Max electrons in n='+n+' shell?',a:(2*n*n)+'',hint:'2n^2'}; },
    function () { var l=pick([0,1,2,3]); return {q:'Max electrons in subshell l='+l+'?',a:(2*(2*l+1))+'',hint:'2(2l+1)'}; },
    function () { var Z=rand(1,20); var n=pick([1,2,3]); return {q:'Energy of H-like atom Z='+Z+', n='+n+'? (in eV)',a:(-13.6*Z*Z/(n*n)).toFixed(2)+' eV',hint:'E = -13.6Z^2/n^2'}; },
    function () { var Z=rand(3,20); var n=pick([1,2,3]); return {q:'Radius of Bohr orbit n='+n+', Z='+Z+'?',a:(0.529*n*n/Z).toFixed(3)+' A',hint:'r = 0.529*n^2/Z A'}; },
    function () { var Z=rand(1,10); var n1=1; var n2=2; return {q:'IP of H-like Z='+Z+'? (in eV)',a:(13.6*Z*Z).toFixed(1)+' eV',hint:'IP = 13.6Z^2 eV'}; },
    function () { var n=pick([2,3,4,5]); return {q:'Number of spectral lines when e- falls from n='+n+' to 1?',a:(n*(n-1)/2)+'',hint:'lines = n(n-1)/2'}; },
    function () { var lam=rand(100,500); return {q:'Energy of photon with lambda='+lam+' nm? (in eV)',a:(1240/lam).toFixed(2)+' eV',hint:'E(eV) = 1240/lambda(nm)'}; },
    function () { var n=pick([2,3,4]); var Z=rand(1,5); return {q:'Velocity of e- in n='+n+', Z='+Z+'? (m/s)',a:(2.18e6*Z/n).toExponential(2)+' m/s',hint:'v = 2.18e6*Z/n'}; },
    function () { var l=pick([0,1,2,3]); return {q:'Orbital with l='+l+'?',a:['s','p','d','f'][l],hint:'l=0:s, 1:p, 2:d, 3:f'}; },
    function () { var n=pick([3,4,5]); var l=pick([0,1,2]); if(l>=n)l=n-1; return {q:'Max electrons in n='+n+', l='+l+'?',a:(2*(2*l+1))+'',hint:'2(2l+1)'}; },
    function () { var Z=rand(2,10); var ion=Z>1?Z-1:1; return {q:'Ionization energy of H-like Z='+Z+'?',a:(13.6*Z*Z)+' eV',hint:'IE = 13.6Z^2 eV'}; },
    function () { var Z=pick([3,11,19,37]); return {q:'Outer electronic config of Z='+Z+'?',a:'ns1 (alkali metal)',hint:'Group 1: ns1'}; },
    function () { var Z=pick([2,10,18,36]); return {q:'Why is Z='+Z+' noble gas?',a:'Full octet/closed shell',hint:'ns^2 np^6'}; },
    function () { var Z=rand(1,30); return {q:'Number of unpaired e- in Z='+Z+'?',a:'Use Aufbau principle',hint:'Write config, count unpaired'}; },
    function () { var h=6.63e-34; var m=9.1e-31; var v=rand(1,5)*1e6; return {q:'de Broglie wavelength of e- at '+v/1e6+'e6 m/s? (nm)',a:(h/(m*v)*1e9).toFixed(2)+' nm',hint:'lambda = h/mv'}; }
  ];

  GENERATORS.chemistry.gaseous_state = [
    function () { var T=rand(273,373); var P=rand(1,5); var V=rand(1,10); var n=P*101325*V*0.001/(8.314*T); return {q:'P='+P+' atm, V='+V+' L, T='+T+' K. Moles?',a:n.toFixed(2)+' mol',hint:'PV = nRT'}; },
    function () { var n=rand(1,5); var T=rand(273,400); var P=n*0.0821*T/rand(1,10); return {q:'n='+n+' mol, T='+T+' K, V=10 L. Pressure?',a:(n*0.0821*T/10).toFixed(2)+' atm',hint:'P = nRT/V'}; },
    function () { var V1=rand(1,5); var T1=273; var T2=rand(300,400); return {q:'V1='+V1+' L at 273 K. V at '+T2+' K? (const P)',a:(V1*T2/273).toFixed(2)+' L',hint:'V1/T1 = V2/T2 (Charles)'}; },
    function () { var P1=rand(1,5); var V1=rand(1,5); var V2=rand(2,10); return {q:'P1='+P1+' atm, V1='+V1+' L, V2='+V2+' L. P2? (const T)',a:(P1*V1/V2).toFixed(2)+' atm',hint:'P1V1 = P2V2 (Boyle)'}; },
    function () { var T=rand(300,500); var M=pick([2,4,16,28,32,44]); return {q:'RMS speed of gas M='+M+' at '+T+' K?',a:Math.sqrt(3*8.314*T*1000/M).toFixed(0)+' m/s',hint:'v_rms = sqrt(3RT/M)'}; },
    function () { var T=rand(273,373); var M_H2=2; return {q:'RMS speed of H2 at '+T+' K?',a:Math.sqrt(3*8.314*T*1000/2).toFixed(0)+' m/s',hint:'v_rms = sqrt(3RT/M)'}; },
    function () { var T=rand(273,400); var d=pick([0.089,1.25,1.43,1.78,2.5]); var M=d*24.45; return {q:'Density '+d+' g/L at STP. Molar mass?',a:(d*22.4).toFixed(1)+' g/mol',hint:'M = d*22.4 at STP'}; },
    function () { var n=rand(1,5); var V=rand(1,10); var P=n*0.0821*300/V; return {q:'n='+n+' mol, V='+V+' L, 300 K. Pressure?',a:P.toFixed(2)+' atm',hint:'P = nRT/V'}; },
    function () { var T=rand(273,500); var M=pick([2,4,28,32]); var v=Math.sqrt(3*8.314*T*1000/M); return {q:'Temperature at which RMS speed of '+(M==2?'H2':(M==4?'He':(M==28?'N2':'O2')))+' is '+v.toFixed(0)+' m/s?',a:T+' K',hint:'T = M*v^2/(3R)'}; },
    function () { var P=rand(2,10); var T=rand(273,500); var d=P*M/pick([2,28,32,44])/rand(1,10); return {q:'Gas density at '+P+' atm, '+T+' K?',a:'d = PM/RT'}; },
    function () { var T=rand(273,400); var M=pick([2,4,28,32,44]); var v_mp=Math.sqrt(2*8.314*T*1000/M); return {q:'Most probable speed of M='+M+' at '+T+' K?',a:v_mp.toFixed(0)+' m/s',hint:'v_mp = sqrt(2RT/M)'}; },
    function () { var V=rand(5,20); var P=rand(1,3); var T=rand(273,373); var n=P*V/(0.0821*T); return {q:'P='+P+' atm, V='+V+' L, T='+T+' K. Moles?',a:n.toFixed(3)+' mol',hint:'n = PV/RT'}; },
    function () { var d=rand(1,5); var P=rand(1,3); var T=rand(273,350); return {q:'Density '+d+' g/L, P='+P+' atm, T='+T+' K. Molar mass?',a:(d*0.0821*T/P).toFixed(1)+' g/mol',hint:'M = dRT/P'}; },
    function () { var T=rand(273,500); var M=2; var v=Math.sqrt(3*8.314*T*1000/M); return {q:'RMS speed of H2 at '+T+' K. Ratio to O2 at same T?',a:Math.sqrt(32/2).toFixed(2)+' : 1',hint:'v_rms prop to 1/sqrt(M)'}; },
    function () { var n=rand(2,10); var T=rand(273,373); var KE=1.5*n*8.314*T; return {q:n+' mol gas at '+T+' K. Total KE?',a:(KE/1000).toFixed(1)+' kJ',hint:'KE = 3/2 nRT'}; }
  ];
  GENERATORS.chemistry.chemical_thermodynamics = [
    function () { var dH=rand(20,100); var dS=rand(20,80); var T=rand(300,500); var dG=dH-T*dS/1000; return {q:'dH='+dH+' kJ, dS='+dS+' J/K, T='+T+' K. dG?',a:dG.toFixed(1)+' kJ',hint:'dG = dH - T*dS'}; },
    function () { var dH=rand(-50,-10); var dS=rand(50,150); var T=Math.abs(dH*1000/dS); return {q:'dH='+dH+' kJ, dS='+dS+' J/K. Temp for spontaneity?',a:T.toFixed(0)+' K',hint:'T > dH/dS for spont when dH=-, dS=+'}; },
    function () { var n=rand(1,5); var dT=rand(20,80); var Cv=3*8.314/2; return {q:n+' mol monatomic gas, dT='+dT+' K. dU at const V?',a:(n*Cv*dT).toFixed(0)+' J',hint:'dU = n*Cv*dT, Cv=3R/2'}; },
    function () { var n=rand(1,4); var dH=rand(50,200); var dT=rand(10,50); return {q:n+' mol, dH='+dH+' kJ/mol, dT='+dT+' K. Cp?',a:(dH*1000/(n*dT)).toFixed(0)+' J/molK',hint:'Cp = dH/(n*dT)'}; },
    function () { var dH=rand(10,50); var dS=rand(10,50); var T=rand(300,400); var dG=dH*1000-T*dS; return {q:'dH='+dH+' kJ, dS='+dS+' J/K, T='+T+' K. dG?',a:(dG/1000).toFixed(1)+' kJ',hint:'dG = dH - T*dS'}; },
    function () { var r=rand(1,5); var Cp_mono=5*8.314/2; var Cp_dia=7*8.314/2; return {q:'Cp of monatomic / diatomic gas ratio?',a:'5/7',hint:'Cv_mono=3R/2, Cv_dia=5R/2, Cp=Cv+R'}; },
    function () { var dH_f=rand(-200,-50); return {q:'Standard enthalpy of formation of '+(dH_f<0?'H2O(l)':'CO2(g)')+' is '+(dH_f<0?-286:-393.5)+' kJ/mol. Sign?',a:''+(dH_f<0?'Negative (exothermic)':'Negative'),hint:'Most formation enthalpies are negative'}; },
    function () { var q=rand(100,500); var W=rand(30,80); return {q:'Q='+q+' J, W='+W+' J. dU for system?',a:(q-W)+' J',hint:'dU = Q - W'}; },
    function () { var n=rand(1,5); var dT=rand(20,60); var Cp=5*8.314/2; var Q=n*Cp*dT; return {q:n+' mol diatomic, dT='+dT+' K at const P. Q?',a:(Q/1000).toFixed(2)+' kJ',hint:'Q = n*Cp*dT, Cp=5R/2'}; },
    function () { var S_std=[{n:"H2O(l)",s:69.9},{n:"H2O(g)",s:188.8},{n:"CO2",s:213.6},{n:"O2",s:205},{n:"N2",s:191.5}]; var s=pick(S_std); return {q:'Standard entropy of '+s.n+'?',a:s.s+' J/molK',hint:'Entropy increases with complexity, phase'}; },
    function () { var dH=rand(50,200); var dS=rand(100,300); return {q:'dH='+dH+' kJ, dS='+dS+' J/K. Spontaneous above what T?',a:(dH*1000/dS).toFixed(0)+' K',hint:'dG<0 => T > dH/dS'}; },
    function () { var n=rand(1,4); var dT=rand(10,50); var Cv=5*8.314/2; return {q:n+' mol diatomic, dT='+dT+' K, const V. dU?',a:(n*Cv*dT).toFixed(0)+' J',hint:'dU = n*Cv*dT, Cv=5R/2 for diatomic'}; },
    function () { var dH_vap=pick([40.7,44.0,25.8,33.9]); var T_b=pick([373,353,308,334.5]); return {q:'dH_vap='+dH_vap+' kJ/mol, T_b='+T_b+' K. dS_vap?',a:(dH_vap*1000/T_b).toFixed(0)+' J/molK',hint:'dS_vap = dH_vap/T_b'}; },
    function () { var dH=rand(-100,-20); return {q:'Exothermic reaction: dH='+dH+' kJ. Sign of dS_surr?',a:'Positive (heat released to surroundings)',hint:'dS_surr = -dH/T > 0 for exo'}; },
    function () { var T=rand(273,373); var n=rand(1,5); var dS=rand(20,60); return {q:n+' mol, dS='+dS+' J/K, T='+T+' K. Heat absorbed (reversible)?',a:(n*dS*T/1000).toFixed(2)+' kJ',hint:'dS = Q_rev/T'}; }
  ];

  GENERATORS.chemistry.chemical_equilibrium = [
    function () { var Kc=rand(1,100)/1000; var a=rand(1,5); var x=Math.sqrt(Kc*a); return {q:'Kc='+Kc.toFixed(3)+', initial conc '+a+' M. Equilibrium conc of product?',a:x.toFixed(3)+' M',hint:'Kc = x^2/(a-x)'}; },
    function () { var Kc=rand(1,10); var Kp=Kc*Math.pow(0.0821*300,rand(0,2)-1); return {q:'Kc='+Kc+', dn='+(rand(0,2)-1)+', T=300 K. Kp?',a:Kp.toFixed(2),hint:'Kp = Kc*(RT)^dn'}; },
    function () { var K=rand(10,100)/10; return {q:'Kc='+K.toFixed(1)+'. Is reaction product-favored?',a:K>1?'Yes':'No',hint:'K>1 favors products'}; },
    function () { var a=rand(1,5); var x=rand(1,Math.floor(a-0.1)); var Kc=x*x/(a-x); return {q:'Initial '+a+' M, at eq '+(a-x).toFixed(1)+' M remains. Kc?',a:Kc.toFixed(2),hint:'Kc = [Product]^2/[Reactant]'}; },
    function () { var T=rand(400,1000); var K2=Math.exp(rand(-2,2)); var K1=Math.exp(rand(-2,2)); var dH=-8.314*Math.log(K2/K1)/(1/T-1/298); return {q:'K at 298 K='+K1.toFixed(2)+', at '+T+' K='+K2.toFixed(2)+'. Endo/exo?',a:dH>0?'Endothermic':'Exothermic',hint:'K increases with T for endo'}; },
    function () { var P=rand(2,10); var Kp=rand(1,10); var x=Math.sqrt(Kp*P/(1+Kp)); return {q:'A(g) = B(g) + C(g), Kp='+Kp.toFixed(1)+', P='+P+' atm. Fraction dissociated?',a:x.toFixed(2),hint:'Kp = x^2*P/(1-x^2)'}; },
    function () { var Kc=rand(1,100)/10; var n=rand(1,3); return {q:'Kc='+Kc.toFixed(1)+', initial conc of reactant '+n+' M. Approx extent?',a:Math.sqrt(Kc*n).toFixed(2)+' M',hint:'x ~ sqrt(Kc*initial) for small K'}; },
    function () { var K1=rand(0.1,10); var K2=rand(0.1,10); return {q:'K1='+K1.toFixed(1)+', K2='+K2.toFixed(1)+' for two steps. K_overall?',a:(K1*K2).toFixed(2),hint:'K_overall = K1*K2'}; },
    function () { var K=rand(1,100)/100; var a=rand(1,5); var x=(-K+Math.sqrt(K*K+4*K*a))/2; return {q:'Kc='+K.toFixed(3)+', initial '+a+' M. Degree of dissociation?',a:(x/a).toFixed(3),hint:'K = x^2/(a-x)'}; },
    function () { var T=rand(300,600); var dH=rand(20,100); var K_ratio=Math.exp(dH*1000/8.314*(1/300-1/T)); return {q:'dH='+dH+' kJ/mol. Ratio of K at '+T+' K to 300 K?',a:K_ratio.toFixed(1),hint:'ln(K2/K1) = -dH/R(1/T2-1/T1)'}; },
    function () { var Kc=rand(1,100)/10; var Qc=Kc*rand(2,5)/10; return {q:'Kc='+Kc.toFixed(1)+', Qc='+Qc.toFixed(2)+'. Direction?',a:Qc<Kc?'Forward':'Backward',hint:'Forward if Q < K'}; },
    function () { var N2=rand(1,5); var H2=rand(1,5); var NH3=rand(0,2); var Kc=NH3*NH3/(N2*H2*H2*H2); return {q:'N2='+N2+' M, H2='+H2+' M, NH3='+NH3+' M. Kc for N2+3H2=2NH3?',a:Kc.toFixed(3),hint:'Kc = [NH3]^2/([N2][H2]^3)'}; },
    function () { var Kc=rand(10,1000); return {q:'Kc='+Kc+'. Very large K indicates?',a:'Product favored (forward strongly)',hint:'Large K = nearly complete conversion'}; },
    function () { var P=rand(2,10); var alpha=rand(1,8)/10; var Kp=4*alpha*alpha*P/(1-alpha*alpha); return {q:'PCl5 dissociates with alpha='+alpha.toFixed(2)+' at P='+P+' atm. Kp?',a:Kp.toFixed(2)+' atm',hint:'Kp = 4a^2P/(1-a^2) for PCl5=PCl3+Cl2'}; },
    function () { var K=rand(1,100)/100; var a=rand(1,3); return {q:'Kc='+K.toFixed(3)+', initial '+a+' M. Approx final conc?',a:(a-Math.sqrt(K*a)).toFixed(2)+' M',hint:'x = (-K+sqrt(K^2+4Ka))/2'}; }
  ];

  GENERATORS.chemistry.ionic_equilibrium = [
    function () { var Ka=rand(1,100)/10000; var C=rand(0.1,1)*10/10; return {q:'Ka='+Ka.toExponential(1)+', C='+C.toFixed(1)+' M. [H+]?',a:Math.sqrt(Ka*C).toExponential(2)+' M',hint:'[H+] = sqrt(Ka*C)'}; },
    function () { var Kb=rand(1,100)/10000; var C=rand(0.1,1)*10/10; return {q:'Kb='+Kb.toExponential(1)+', C='+C.toFixed(1)+' M. [OH-]?',a:Math.sqrt(Kb*C).toExponential(2)+' M',hint:'[OH-] = sqrt(Kb*C)'}; },
    function () { var pH=rand(2,12); return {q:'[H+] if pH='+pH+'?',a:Math.pow(10,-pH).toExponential(1)+' M',hint:'[H+] = 10^(-pH)'}; },
    function () { var pOH=rand(2,12); return {q:'[OH-] if pOH='+pOH+'?',a:Math.pow(10,-pOH).toExponential(1)+' M',hint:'[OH-] = 10^(-pOH)'}; },
    function () { var C=rand(0.1,1)*10/10; var Ka=1.8e-5; return {q:'pH of '+C.toFixed(1)+' M acetic acid? (Ka=1.8e-5)',a:(-Math.log10(Math.sqrt(Ka*C))).toFixed(2),hint:'pH = 0.5(pKa - log C)'}; },
    function () { var C=rand(0.1,1)*10/10; var Kb=1.8e-5; return {q:'pOH of '+C.toFixed(1)+' M NH3? (Kb=1.8e-5)',a:(-Math.log10(Math.sqrt(Kb*C))).toFixed(2),hint:'pOH = 0.5(pKb - log C)'}; },
    function () { var pH=pick([1,2,3,4,5,6,7,8,9,10,11,12,13]); return {q:'A solution has pH='+pH+'. Is it acidic/basic/neutral?',a:pH<7?'Acidic':(pH>7?'Basic':'Neutral'),hint:'pH<7=acidic, pH=7=neutral, pH>7=basic'}; },
    function () { var Ka=rand(1,100)/10000; var C=rand(0.1,1)*10/10; return {q:'Degree of dissociation of weak acid Ka='+Ka.toExponential(1)+', C='+C.toFixed(1)+' M?',a:Math.sqrt(Ka/C).toFixed(3),hint:'alpha = sqrt(Ka/C)'}; },
    function () { var Ca=rand(0.1,1)*10/10; var Cb=rand(0.1,1)*10/10; var pKa=rand(3,6); return {q:'Buffer: [acid]='+Ca.toFixed(1)+', [salt]='+Cb.toFixed(1)+', pKa='+pKa+'. pH?',a:(pKa+Math.log10(Cb/Ca)).toFixed(2),hint:'pH = pKa + log([salt]/[acid])'}; },
    function () { var Ksp=rand(1,100)/1000000; return {q:'Ksp='+Ksp.toExponential(1)+'. Molar solubility for AB type?',a:Math.sqrt(Ksp).toExponential(2)+' M',hint:'s = sqrt(Ksp) for AB type'}; },
    function () { var Ksp=rand(1,100)/1000000; return {q:'Ksp='+Ksp.toExponential(1)+'. Solubility for AB2 type?',a:Math.pow(Ksp/4,1/3).toExponential(2)+' M',hint:'s = (Ksp/4)^(1/3) for AB2'}; },
    function () { var pH=rand(3,11); return {q:'pOH of solution with pH='+pH+'?',a:(14-pH)+'',hint:'pH + pOH = 14'}; },
    function () { var C=rand(0.001,0.1)*1000/1000; return {q:'pH of '+C.toExponential(1)+' M HCl?',a:(-Math.log10(C)).toFixed(2),hint:'Strong acid: [H+] = C'}; },
    function () { var C=rand(0.001,0.1)*1000/1000; return {q:'pOH of '+C.toExponential(1)+' M NaOH?',a:(-Math.log10(C)).toFixed(2),hint:'Strong base: [OH-] = C'}; },
    function () { var Ksp=1.8e-10; return {q:'Ksp(AgCl)=1.8e-10. Solubility in g/L? (M=143.5)',a:(Math.sqrt(Ksp)*143.5).toFixed(3)+' g/L',hint:'solubility(g/L) = sqrt(Ksp)*M'}; }
  ];

  GENERATORS.chemistry.electrochemistry = [
    function () { var E0=pick([0.34,-0.76,-0.44,-0.13,0.80,-0.25]); var n=2; var K=Math.exp(n*96500*E0/(8.314*298)); return {q:'E0cell='+E0+' V, n='+n+'. K_eq?',a:K.toExponential(1),hint:'log K = nE0/0.059'}; },
    function () { var E0=rand(0.5,2); return {q:'E0='+E0+' V, n=1. dG0?',a:(-n*96500*E0/1000).toFixed(1)+' kJ (n='+n+')',hint:'dG0 = -nFE0'}; },
    function () { var E0=rand(0.5,2); var n=rand(1,2); return {q:'E0='+E0+' V, n='+n+'. dG0 in kJ?',a:(-n*96500*E0/1000).toFixed(1)+' kJ',hint:'dG0 = -nFE0'}; },
    function () { var E0=rand(0.5,1.5); var n=2; var K=Math.pow(10,n*E0/0.059); return {q:'E0='+E0+' V, n='+n+'. Equilibrium constant?',a:K.toExponential(1),hint:'log10K = nE0/0.059'}; },
    function () { var metals=[{n:"Cu",e:0.34},{n:"Zn",e:-0.76},{n:"Fe",e:-0.44},{n:"Ag",e:0.80},{n:"Ni",e:-0.25}]; var m1=pick(metals); var m2=pick(metals); while(m2===m1)m2=pick(metals); return {q:'Cell: '+m1.n+'/'+m2.n+'. E0cell?',a:(m1.e-m2.e).toFixed(2)+' V',hint:'E0cell = E0_cathode - E0_anode'}; },
    function () { var I=rand(1,10); var t=rand(30,120); var m=107.9*I*t/96500; return {q:'I='+I+' A, t='+t+' min. Mass of Ag deposited? (M=107.9)',a:m.toFixed(2)+' g',hint:'m = M*I*t/(n*F)'}; },
    function () { var I=rand(1,5); var t=rand(10,60); var V=I*t*0.0821*298/(96500*1); return {q:'I='+I+' A, t='+t+' min. Volume of O2 at STP? (4OH- -> O2+2H2O+4e)',a:(I*t*60*22.4/(4*96500)).toFixed(2)+' L',hint:'V = I*t*22.4/(n*F)'}; },
    function () { var E0=rand(0.1,1); var n=rand(1,2); var C=rand(0.01,1)*100/100; var E=E0-0.059/n*Math.log10(C); return {q:'E0='+E0+' V, [ion]='+C.toFixed(2)+' M. Nernst E? (n='+n+')',a:E.toFixed(3)+' V',hint:'E = E0 - 0.059/n log(1/[ion])'}; },
    function () { return {q:'Standard hydrogen electrode potential?',a:'0.00 V',hint:'By definition, SHE = 0 V'}; },
    function () { var E0=rand(-0.5,0.5); var n=rand(1,2); var K=Math.pow(10,n*E0/0.059); return {q:'E0='+E0+' V. Is reaction spontaneous?',a:E0>0?'Yes (dG<0)':'No (dG>0)',hint:'Spontaneous if dG=-nFE0<0 => E0>0'}; },
    function () { var m=rand(1,10); var I=rand(1,5); var t=m*96500/(107.9*I); return {q:'m='+m+' g Ag deposited, I='+I+' A. Time? (M=107.9)',a:(t/60).toFixed(1)+' min',hint:'t = m*n*F/(M*I)'}; },
    function () { var C1=rand(0.1,1)*10/10; var C2=rand(0.1,1)*10/10; var E=0.059/2*Math.log10(C2/C1); return {q:'Concentration cell: C1='+C1.toFixed(1)+', C2='+C2.toFixed(2)+' M. E?',a:E.toFixed(3)+' V',hint:'E = 0.059/n log(C2/C1)'}; },
    function () { var E0=rand(0.5,2); var n=rand(1,3); return {q:'dG0 from E0='+E0+' V, n='+n+' in kJ?',a:(-n*96500*E0/1000).toFixed(0)+' kJ',hint:'dG0 = -nFE0'}; },
    function () { var I=rand(1,10); var t=rand(30,180); var m_H2=I*t*1.008/(96500*1); return {q:'I='+I+' A, t='+t+' s. Mass of H2?',a:(m_H2*1000).toFixed(1)+' mg',hint:'m = M*I*t/(n*F)'}; },
    function () { return {q:'Relationship between dG0 and K_eq?',a:'dG0 = -RT ln K',hint:'dG0 = -nFE0 = -RT ln K'}; }
  ];

  GENERATORS.chemistry.chemical_kinetics = [
    function () { var k=rand(1,10)/1000; var t=Math.log(2)/k; return {q:'k='+k+' s^-1. Half-life?',a:t.toFixed(1)+' s',hint:'t_1/2 = ln2/k for 1st order'}; },
    function () { var t=rand(100,500); var k=Math.log(2)/t; return {q:'t_1/2='+t+' s. Rate constant? (1st order)',a:k.toExponential(2)+' s^-1',hint:'k = ln2/t_1/2'}; },
    function () { var k=rand(1,10)/10000; var t=rand(60,600); var frac=Math.exp(-k*t); return {q:'k='+k.toExponential(1)+' s^-1, t='+t+' s. Fraction remaining?',a:frac.toFixed(3),hint:'[A]/[A]0 = e^(-kt)'}; },
    function () { var a=rand(100,1000); var k=rand(1,10)/1000; var t=rand(60,600); var x=a*(1-Math.exp(-k*t)); return {q:'[A]0='+a+', k='+k+' s^-1, t='+t+' s. Product formed?',a:x.toFixed(1),hint:'x = [A]0(1-e^(-kt))'}; },
    function () { var n=pick([0,1,2]); var k=rand(1,10)/100; var t12=n===0?'[A]0/(2k)':(n===1?'ln2/k':'1/(k[A]0)'); return {q:'Half-life expression for '+n+'th order?',a:t12,hint:'t_1/2 formula depends on order'}; },
    function () { var k1=rand(1,10)/1000; var Ea=rand(50,150)*1000; var T1=300; var T2=rand(310,350); var k2=k1*Math.exp(Ea/8.314*(1/T1-1/T2)); return {q:'k1='+k1+' at 300 K, Ea='+(Ea/1000).toFixed(0)+' kJ/mol. k at '+T2+' K?',a:k2.toExponential(2)+' s^-1',hint:'ln(k2/k1) = Ea/R(1/T1-1/T2)'}; },
    function () { var a=rand(0.5,2)*10/10; var t=rand(10,60); var k=1/t; return {q:'Zero order: [A]0='+a+' M. t='+t+' min. k? (80% consumed)',a:k.toFixed(3)+' M/min (approx)',hint:'k = [A]0/(2*t_1/2)'}; },
    function () { var k=rand(1,10)/100; var t=rand(10,100); var frac=Math.exp(-k*t); return {q:'Fraction after '+t+' min, k='+k.toFixed(2)+' min^-1? (1st order)',a:(1-frac).toFixed(3)+' reacted',hint:'[A]/[A]0 = e^(-kt)'}; },
    function () { var k=rand(1,10)/1000; return {q:'k='+k+' s^-1. Avg life of 1st order reaction?',a:(1/k).toFixed(0)+' s',hint:'tau = 1/k for 1st order'}; },
    function () { var Ea=rand(50,200)*1000; var T=rand(298,400); var A_f=rand(1,10)*Math.pow(10,rand(10,13)); var k=A_f*Math.exp(-Ea/(8.314*T)); return {q:'A='+A_f.toExponential(1)+', Ea='+(Ea/1000).toFixed(0)+' kJ/mol, T='+T+' K. k?',a:k.toExponential(2)+' s^-1',hint:'k = A*e^(-Ea/RT)'}; },
    function () { var m=pick([0,1,2]); var n=pick([0,1,2]); return {q:'Rate = k[A]^'+m+'[B]^'+n+'. Overall order?',a:(m+n)+'',hint:'Overall order = sum of exponents'}; },
    function () { var t=rand(5,60); var k=Math.log(2)/t; return {q:'t_1/2='+t+' min. Time for 90% completion? (1st order)',a:(Math.log(10)/k).toFixed(0)+' min',hint:'t = (1/k)ln([A]0/[A])'}; },
    function () { var a=rand(1,5); var t=rand(5,30); var k_s=1/t; var t12=Math.log(2)/k_s; return {q:'Initial rate = '+a+' M/s, t=5 min. Approx k? (1st order)',a:k_s.toFixed(3)+' min^-1',hint:'r0 = k[A]0'}; },
    function () { var T1=300; var T2=rand(310,330); var k_ratio=2; return {q:'Rate doubles from '+T1+' to '+T2+' K. Approx Ea?',a:(-8.314*Math.log(1/k_ratio)/(1/T2-1/T1)/1000).toFixed(0)+' kJ/mol',hint:'ln2 = Ea/R(1/T1-1/T2)'}; },
    function () { var t12=rand(10,100); var n_t=rand(2,5); return {q:'t_1/2='+t12+' min. Time for 1/'+(Math.pow(2,n_t))+' to remain?',a:(t12*n_t)+' min',hint:'Each half-life halves concentration'}; }
  ];

  GENERATORS.chemistry.surface_chemistry = [
    function () { return {q:'What is adsorption?',a:'Accumulation of molecules on surface',hint:'Surface phenomenon'}; },
    function () { var P=rand(1,10); var k=rand(1,10)/10; var n=rand(2,5)/10; var x_m=k*Math.pow(P,n); return {q:'Freundlich: k='+k+', n='+n.toFixed(1)+', P='+P+' atm. x/m?',a:x_m.toFixed(2),hint:'x/m = k*P^(1/n)'}; },
    function () { return {q:'Catalyst increases rate by?',a:'Lowering activation energy',hint:'Provides alternate path with lower Ea'}; },
    function () { return {q:'Example of heterogeneous catalyst?',a:'Fe in Haber process, V2O5 in Contact process',hint:'Different phase from reactants'}; },
    function () { var V_m=rand(100,500); var P=rand(1,10); var b=rand(0.1,1)*10/10; var V=V_m*b*P/(1+b*P); return {q:'Langmuir: Vm='+V_m+', b='+b.toFixed(1)+', P='+P+'. V adsorbed?',a:V.toFixed(1),hint:'V = Vm*b*P/(1+b*P)'}; },
    function () { return {q:'Shape selective catalyst: Zeolites?',a:'Yes - porous aluminosilicates',hint:'Zeolites have uniform pore sizes'}; },
    function () { return {q:'Colloid: particle size range?',a:'1-1000 nm',hint:'Between solution and suspension'}; },
    function () { return {q:'How does emulsifier work?',a:'Reduces interfacial tension',hint:'Surfactant stabilizes emulsion'}; },
    function () { return {q:'Tyndall effect is due to?',a:'Scattering of light by colloidal particles',hint:'Visible beam in colloids'}; },
    function () { return {q:'Physisorption vs chemisorption: stronger?',a:'Chemisorption',hint:'Chemisorption involves chemical bonds'}; },
    function () { return {q:'Brownian motion in colloids is due to?',a:'Constant bombardment by solvent molecules',hint:'Unidirectional motion not possible'}; },
    function () { return {q:'Gold number is a measure of?',a:'Protective power of lyophilic colloid',hint:'Minimum amount to prevent coagulation'}; },
    function () { return {q:'Haber process catalyst?',a:'Iron (Fe) with promoters',hint:'Fe + K2O, Al2O3 as promoters'}; },
    function () { return {q:'Enzyme catalyst: example?',a:'Invertase (sucrose -> glucose+fructose)',hint:'Biological catalysts'}; },
    function () { return {q:'Critical micelle concentration (CMC)?',a:'Concentration above which micelles form',hint:'Surfactants aggregate above CMC'}; }
  ];

  GENERATORS.chemistry.periodic_table = [
    function () { var Z=rand(1,20); return {q:'Electronic config of Z='+Z+'?',a:'Write using Aufbau principle',hint:'1s2 2s2 2p6 3s2 3p6...'}; },
    function () { var gr=pick([1,2,13,14,15,16,17,18]); return {q:'Group '+gr+' valence electrons?',a:['1','2','3','4','5','6','7','8'][gr-1],hint:'Group = valence e- (for main group)'}; },
    function () { var Z=pick([3,11,19,37,55]); return {q:'Z='+Z+' is alkali metal. Trend in IE down group?',a:'Decreases',hint:'IE decreases down group'}; },
    function () { var Z=pick([9,17,35,53]); return {q:'Z='+Z+' is halogen. Electronegativity trend?',a:'Decreases down group',hint:'F has highest EN'}; },
    function () { var Z=rand(3,10); return {q:'Z='+Z+'. Period?',a:Z<=2?'2':(Z<=10?'3':'4'),hint:'Period = n (highest n in config)'}; },
    function () { var per=rand(2,4); var gr=pick([1,2,13,14,15,16,17,18]); return {q:'Element in period '+per+', group '+gr+'?',a:'Use periodic table position',hint:'Period=rows, Group=columns'}; },
    function () { return {q:'Which element has highest electronegativity?',a:'Fluorine (4.0)',hint:'F is most electronegative'}; },
    function () { return {q:'Which element has largest atomic radius?',a:'Francium (Fr)',hint:'Radius increases down group'}; },
    function () { var Z=rand(1,20); return {q:'Z='+Z+'. Metal/nonmetal/metalloid?',a:Z<=2?'Nonmetal':(Z<=4?'Metal':(Z<=5?'Metalloid':(Z<=10?'Nonmetal':(Z<=14?'Metalloid':'Metal')))),hint:'Check position in periodic table'}; },
    function () { var Z=pick([3,12,20,30]); return {q:'Z='+Z+'. Block? (s/p/d/f)',a:Z<=2?'s':(Z<=10?'p':(Z<=18?'p':'d')),hint:'s-block (gr 1-2), p-block (13-18), d-block (3-12)'}; },
    function () { return {q:'First ionization energy trend across period?',a:'Generally increases left to right',hint:'Due to increasing nuclear charge'}; },
    function () { var Z=rand(1,10); return {q:'Z='+Z+'. Valence?',a:'Group number (1-8) for main group',hint:'Valence = group for main group elements'}; },
    function () { return {q:'Which period has 32 elements?',a:'Period 6 (Cs to Rn, including lanthanides)',hint:'f-block adds 14 more'}; },
    function () { var el=pick([{n:"O",e:3.5},{n:"F",e:4.0},{n:"Cl",e:3.0},{n:"N",e:3.0},{n:"C",e:2.5}]); return {q:'Electronegativity of '+el.n+'? (Pauling)',a:el.e.toFixed(1),hint:'EN values: F=4.0, O=3.5, Cl=3.0, N=3.0, C=2.5'}; },
    function () { return {q:'Anomalous behavior of first element in group?',a:'Due to small size, high EN, no d-orbitals',hint:'E.g. Li, Be, B differ from rest'}; }
  ];
  GENERATORS.chemistry.chemical_bonding = [
    function () { var el=pick(["NaCl","MgO","CaF2","Al2O3"]); return {q:'Bond type in '+el+'?',a:'Ionic',hint:'Metal + nonmetal = ionic'}; },
    function () { var el=pick(["H2","O2","N2","Cl2","CH4","NH3","CO2","H2O"]); return {q:'Bond type in '+el+'?',a:'Covalent',hint:'Nonmetal + nonmetal = covalent'}; },
    function () { var el=pick(["NH3","H2O","CH4","BF3","CO2","SF6"]); return {q:'Shape of '+el+'?',a:['Trigonal pyramidal','Bent/V-shaped','Tetrahedral','Trigonal planar','Linear','Octahedral'][["NH3","H2O","CH4","BF3","CO2","SF6"].indexOf(el)],hint:'Use VSEPR theory'}; },
    function () { var n=pick([2,3,4,5,6]); return {q:'Hybridization with '+n+' electron domains?',a:['sp','sp2','sp3','sp3d','sp3d2'][n-2],hint:'2=sp,3=sp2,4=sp3,5=sp3d,6=sp3d2'}; },
    function () { var els=[{f:"HCl",d:1.03},{f:"HF",d:1.91},{f:"HBr",d:0.78},{f:"HI",d:0.38}]; var el=pick(els); return {q:'Dipole moment of '+el.f+'?',a:el.d+' D',hint:'HF has highest dipole due to high EN diff'}; },
    function () { return {q:'Bond order of N2?',a:'3 (triple bond)',hint:'N2: sigma + 2 pi bonds'}; },
    function () { return {q:'Bond order of O2?',a:'2 (double bond)',hint:'O2: sigma + pi + 2 unpaired e-'}; },
    function () { var n=rand(1,5); var l=pick([0,1,2,3]); return {q:'Magnetic quantum number for l='+l+'? Range?',a:(-l)+' to '+l,hint:'ml = -l to +l'}; },
    function () { var mol=pick(["BeCl2","BF3","CH4","SF6"]); return {q:'Is '+mol+' non-polar?',a:'Yes (symmetrical)',hint:'Symmetrical molecules are non-polar'}; },
    function () { return {q:'Fajan\'s rule: more covalent character when?',a:'Small cation, large anion, high charge',hint:'Polarization of anion by cation'}; },
    function () { var A=pick([{n:"H2",o:1},{n:"O2",o:2},{n:"N2",o:3}]); return {q:'Bond order of '+A.n+'?',a:A.o,hint:'BO = (bonding-antibonding)/2'}; },
    function () { return {q:'Sigma bond vs pi bond: which is stronger?',a:'Sigma bond',hint:'Sigma bonds have greater overlap'}; },
    function () { var el=pick(["H2O","CO2","SO2"]); return {q:'Polar molecule: '+el+'?',a:el==="CO2"?"No":"Yes",hint:'CO2 is linear non-polar, H2O bent polar, SO2 bent polar'}; },
    function () { return {q:'Resonance: condition for valid structures?',a:'Same skeleton, same number of paired/unpaired e-',hint:'Only electron positions differ'}; },
    function () { var mol=pick(["XeF4","XeF2","XeO3","XeF6"]); return {q:'Shape of '+mol+'?',a:['Square planar','Linear','Trigonal pyramidal','Distorted octahedral'][["XeF4","XeF2","XeO3","XeF6"].indexOf(mol)],hint:'Xe has expanded octet'}; }
  ];

  GENERATORS.chemistry.coordination = [
    function () { var c=pick([{f:"[Co(NH3)6]3+",n:6},{f:"[Ni(CN)4]2-",n:4},{f:"[Fe(CN)6]3-",n:6},{f:"[Cu(NH3)4]2+",n:4}]); return {q:'Coordination number in '+c.f+'?',a:c.n,hint:'CN = number of donor atoms bonded'}; },
    function () { var c=pick([{f:"K3[Fe(CN)6]",n:"Potassium hexacyanoferrate(III)"},{f:"[Co(NH3)6]Cl3",n:"Hexaamminecobalt(III) chloride"},{f:"K4[Fe(CN)6]",n:"Potassium hexacyanoferrate(II)"}]); return {q:'IUPAC name of '+c.f+'?',a:c.n,hint:'Ligands named before metal, oxidation state in Roman'}; },
    function () { var c=pick([{f:"[Ni(CO)4]",os:0},{f:"[Fe(CN)6]3-",os:3},{f:"[Co(NH3)6]3+",os:3},{f:"K2[PtCl6]",os:4}]); return {q:'Oxidation state of metal in '+c.f+'?',a:c.os,hint:'Sum of charges = charge on complex'}; },
    function () { return {q:'Chelate effect: why more stable?',a:'Entropy factor (more species released)',hint:'Polydentate ligands form chelates'}; },
    function () { var geo=pick(["tetrahedral","square planar","octahedral"]); return {q:'Geometry with CN=4 (d8 high spin)?',a:'Tetrahedral (or square planar for low spin d8)',hint:'CN=4: tetrahedral or square planar'}; },
    function () { var c=pick([{f:"[Fe(CN)6]4-",m:"Low spin",u:0},{f:"[Fe(H2O)6]2+",m:"High spin",u:4}]); return {q:c.f+': high/low spin?',a:c.m,hint:'Strong field ligand (CN-) = low spin'}; },
    function () { var l=pick([{n:"NH3",t:"Neutral"},{n:"CN-",t:"Anionic"},{n:"CO",t:"Neutral"},{n:"H2O",t:"Neutral"},{n:"Cl-",t:"Anionic"}]); return {q:'Ligand type: '+l.n+'?',a:l.t,hint:'Charge on ligand determines type'}; },
    function () { return {q:'Which complex is colored? (d1-d9 generally colored)',a:'Most transition metal complexes are colored',hint:'d-d transitions cause color'}; },
    function () { var c=pick([{f:"[CoCl2(NH3)4]+",i:2},{f:"[PtCl2(NH3)2]",i:2},{f:"[Co(en)3]3+",i:2}]); return {q:'Number of isomers possible for '+c.f+'?',a:c.i,hint:'Geometric and optical isomerism'}; },
    function () { return {q:'Crystal field splitting: octahedral vs tetrahedral?',a:'Octahedral: larger splitting (delta_o > delta_t)',hint:'delta_t = 4/9 delta_o'}; },
    function () { var c=pick([{f:"[NiCl4]2-",p:"Paramagnetic"},{f:"[Ni(CN)4]2-",p:"Diamagnetic"}]); return {q:'Magnetic nature of '+c.f+'?',a:c.p,hint:'Unpaired e- cause paramagnetism'}; },
    function () { return {q:'Werner\'s coordination theory proposed?',a:'Primary and secondary valencies',hint:'Primary = oxidation state, secondary = CN'}; },
    function () { return {q:'Effective atomic number (EAN) rule?',a:'Metal + electrons from ligands = next noble gas config',hint:'EAN = Z(metal) - ox + 2*CN'}; },
    function () { return {q:'Ligand field theory vs CFT difference?',a:'LFT includes covalent character (M-L bonding)',hint:'CFT treats ligands as point charges'}; },
    function () { return {q:'Which ligand causes maximum splitting (spectrochemical series)?',a:'CO > CN- > en > NH3 > H2O > F- > Cl- > Br- > I-',hint:'Strong field: CN-, CO; Weak: I-, Br-'}; }
  ];

  GENERATORS.chemistry.s_block = [
    function () { var el=pick(["Li","Na","K","Rb","Cs"]); return {q:el+' reacts with water. Observation?',a:['Slow','Vigorous','Very vigorous','Explosive','Extremely explosive'][["Li","Na","K","Rb","Cs"].indexOf(el)],hint:'Reactivity increases down group 1'}; },
    function () { return {q:'Alkali metals: color of flame for Na?',a:'Golden yellow',hint:'Na gives yellow flame'}; },
    function () { return {q:'Alkaline earth metal: Be shows anomalous behavior due to?',a:'Small size, high ionization energy, no d-orbitals',hint:'Diagonal relationship with Al'}; },
    function () { var el=pick(["Li","Na","K"]); return {q:el+'OH: strong/weak base?',a:'Strong',hint:'All alkali metal hydroxides are strong bases'}; },
    function () { return {q:'Most abundant element in Earth\'s crust is?',a:'Oxygen (46.6%) by mass',hint:'Followed by Si (27.7%)'}; },
    function () { return {q:'Alkali metal with least density?',a:'Lithium (0.53 g/cm3)',hint:'Li is the lightest metal'}; },
    function () { return {q:'Be and Al show diagonal relationship. Similarity?',a:'Both form covalent compounds, oxides amphoteric',hint:'BeO and Al2O3 are amphoteric'}; },
    function () { var el=pick(["Na","K"]); return {q:el+' in liquid ammonia: color?',a:'Blue (due to solvated electrons)',hint:'Metal-ammonia solutions are blue'}; },
    function () { return {q:'Thermal stability of carbonates down group 2?',a:'Increases',hint:'BeCO3 unstable, BaCO3 very stable'}; },
    function () { return {q:'Solubility of hydroxides of group 2 down group?',a:'Increases',hint:'Be(OH)2 insoluble, Ba(OH)2 soluble'}; },
    function () { return {q:'Lithium shows similarities with Mg. Name two?',a:'Carbonates decompose, nitrides formed, no bicarbonates',hint:'Lithium is anomalous'}; },
    function () { var el=pick(["Be","Mg","Ca","Sr","Ba"]); return {q:'Color of flame for '+el+'?',a:['White','Brilliant white','Brick red','Crimson red','Apple green'][["Be","Mg","Ca","Sr","Ba"].indexOf(el)],hint:'Flame colors: Ca=brick red, Sr=crimson, Ba=green'}; },
    function () { return {q:'Sodium fusion test for N,S,X?',a:'Lassaigne\'s test for detection of elements',hint:'Na + organic compound -> NaCN, Na2S, NaX'}; },
    function () { return {q:'Anhydrous MgCl2 used in?',a:'Electrolysis to extract Mg',hint:'Mg is extracted from sea water'}; },
    function () { return {q:'CaOCl2 is?',a:'Bleaching powder',hint:'Ca(OCl)Cl - mixed salt'}; }
  ];

  GENERATORS.chemistry.p_block = [
    function () { var el=pick(["N","O","F","Cl","S","P"]); return {q:'Allotrope of '+el+'?',a:['N2 (dinitrogen)','O2,O3','F2','Cl2','S8','P4'][["N","O","F","Cl","S","P"].indexOf(el)],hint:'P has white/red/black, S has rhombic/monoclinic'}; },
    function () { return {q:'Ozone layer depletion caused by?',a:'CFCs (chlorofluorocarbons)',hint:'CFCs release Cl atoms that catalyze O3 breakdown'}; },
    function () { return {q:'Oxidation state of S in H2SO4?',a:'+6',hint:'H2SO4: 2(+1)+x+4(-2)=0 => x=+6'}; },
    function () { return {q:'Which is more acidic: HClO or HClO4?',a:'HClO4 (more O atoms, more electron withdrawal)',hint:'Acidity increases with oxidation number of Cl'}; },
    function () { return {q:'Structure of XeF4?',a:'Square planar',hint:'XeF4: sp3d2 hybridization, 2 lone pairs'}; },
    function () { return {q:'P4O10 is used as?',a:'Drying agent (dehydrating agent)',hint:'One of strongest drying agents'}; },
    function () { var el=pick(["PH3","NH3","AsH3","SbH3","BiH3"]); return {q:'Order of basic strength of '+el[0]+'H3 hydrides?',a:'NH3 > PH3 > AsH3 > SbH3 > BiH3',hint:'Basic strength decreases down group'}; },
    function () { return {q:'Sulphur shows +4 oxidation state in?',a:'SO2, H2SO3, sulfites',hint:'S in SO2 has +4 oxidation state'}; },
    function () { return {q:'Interhalogen compound: ClF3 structure?',a:'T-shaped',hint:'ClF3: sp3d, 2 lone pairs, T-shaped'}; },
    function () { return {q:'Nitrogen shows maximum catenation in group 15?',a:'No (P shows more catenation than N)',hint:'N forms N2H4, P forms P4, P4O6 etc'}; },
    function () { return {q:'Which is the strongest oxidizing agent among halogens?',a:'Fluorine (F2)',hint:'F2 has highest reduction potential'}; },
    function () { return {q:'Covalent radius of halogens: order?',a:'F < Cl < Br < I',hint:'Radius increases down group'}; },
    function () { return {q:'Sulphuric acid: used in lead-acid battery?',a:'Yes, as electrolyte',hint:'H2SO4 acts as electrolyte'}; },
    function () { return {q:'Oxygen shows -2 oxidation state. Exception?',a:'Peroxides (-1), superoxides (-0.5), OF2 (+2)',hint:'OF2: O has +2 (F more electronegative)'}; },
    function () { return {q:'NH3: shape and hybridization?',a:'Trigonal pyramidal, sp3',hint:'NH3: 3 bonds + 1 lone pair on N'}; }
  ];

  GENERATORS.chemistry.d_f_block = [
    function () { var el=pick(["Ti","V","Cr","Mn","Fe","Co","Ni","Cu","Zn"]); return {q:'Electronic config of '+el+' (Z='+[22,23,24,25,26,27,28,29,30][["Ti","V","Cr","Mn","Fe","Co","Ni","Cu","Zn"].indexOf(el)]+')?',a:'[Ar]3d^?4s^2',hint:'Exceptions: Cr (3d5 4s1), Cu (3d10 4s1)'}; },
    function () { var el=pick(["Cr2O7^2-","MnO4-","Fe3+","Cu2+"]); return {q:'Color of '+el+' in solution?',a:['Orange','Purple','Yellow/brown','Blue'][["Cr2O7^2-","MnO4-","Fe3+","Cu2+"].indexOf(el)],hint:'Colors due to d-d transitions'}; },
    function () { return {q:'Lanthanoid contraction: cause?',a:'Poor shielding of 4f electrons',hint:'Increase in Z, f-electrons don\'t shield well'}; },
    function () { return {q:'Which block has variable oxidation states?',a:'d-block (transition metals)',hint:'Unfilled d-orbitals allow multiple OS'}; },
    function () { return {q:'K2Cr2O7: color and oxidation state of Cr?',a:'Orange, Cr = +6',hint:'Dichromate ion is orange'}; },
    function () { return {q:'KMnO4: color and OS of Mn?',a:'Purple, Mn = +7',hint:'Permanganate is purple, strong oxidizing agent'}; },
    function () { var el=pick(["Sc","Ti","V","Cr","Mn","Fe","Co","Ni","Cu","Zn"]); return {q:'Magnetic property of '+el+'?',a:['Paramagnetic','Paramagnetic','Paramagnetic','Paramagnetic','Paramagnetic','Ferro/Ferri','Ferro/Ferri','Ferro/Ferri','Paramagnetic','Diamagnetic'][["Sc","Ti","V","Cr","Mn","Fe","Co","Ni","Cu","Zn"].indexOf(el)],hint:'Fe,Co,Ni are ferromagnetic'}; },
    function () { return {q:'Which transition metal is used in Haber process?',a:'Iron (Fe)',hint:'Fe with K2O, Al2O3 promoters'}; },
    function () { return {q:'Lanthanoids: most common oxidation state?',a:'+3',hint:'Ln^3+ is common for all lanthanoids'}; },
    function () { return {q:'Actinoids: most common oxidation state?',a:'+3 (also +4, +5, +6 for early ones)',hint:'Th:+4, U:+6, Np:+5, Pu:+4'}; },
    function () { return {q:'Cu2+ is blue, Zn2+ is colorless. Why?',a:'Cu2+ has d9 (unpaired), Zn2+ has d10 (filled)',hint:'d10 gives no d-d transitions = colorless'}; },
    function () { return {q:'Which d-block element has highest melting point?',a:'Tungsten (W, 3422 C)',hint:'Used in filaments'}; },
    function () { return {q:'Which lanthanoid is radioactive?',a:'Promethium (Pm)',hint:'All isotopes of Pm are radioactive'}; },
    function () { return {q:'Catalytic property of transition metals due to?',a:'Variable oxidation states, large surface area',hint:'Ability to form intermediate complexes'}; },
    function () { return {q:'Why are transition metal compounds colored?',a:'d-d transitions (unpaired electrons absorb visible light)',hint:'Energy gap between d-orbitals corresponds to visible'}; }
  ];
  GENERATORS.chemistry.organic_goc = [
    function () { var c=pick(["CH3CH2OH","CH3CHO","CH3COOH","CH3COCH3","CH3NH2"]); return {q:'Functional group in '+c+'?',a:['-OH (alcohol)','-CHO (aldehyde)','-COOH (carboxylic acid)','-CO- (ketone)','-NH2 (amine)'][["CH3CH2OH","CH3CHO","CH3COOH","CH3COCH3","CH3NH2"].indexOf(c)],hint:'Identify the characteristic group'}; },
    function () { return {q:'IUPAC name of CH3CH2CH2OH?',a:'Propan-1-ol',hint:'Parent: propane, suffix: -ol'}; },
    function () { return {q:'Inductive effect: -I groups withdraw electrons. Example?',a:'-Cl, -NO2, -CN, -F',hint:'Electronegative atoms have -I effect'}; },
    function () { return {q:'Resonance: stabilized by?',a:'Delocalization of pi electrons',hint:'Alternating single/double bonds'}; },
    function () { return {q:'Hyperconjugation: also known as?',a:'No-bond resonance (Baker-Nathan effect)',hint:'Involves sigma bond electrons adjacent to pi system'}; },
    function () { var n=pick(["meth","eth","prop","but","pent","hex"]); return {q:'Prefix for '+n+' carbon chain?',a:n,hint:'meth-1, eth-2, prop-3, but-4, pent-5, hex-6'}; },
    function () { return {q:'Electrophile example?',a:'H+, NO2+, Br+, Cl+',hint:'Electrophiles are electron-deficient'}; },
    function () { return {q:'Nucleophile example?',a:'OH-, CN-, NH3, H2O',hint:'Nucleophiles have lone pair/negative charge'}; },
    function () { return {q:'Carbocation stability order?',a:'3^o > 2^o > 1^o > methyl',hint:'More alkyl groups = more stable (hyperconjugation)'}; },
    function () { return {q:'Saytzeff rule: major product?',a:'More substituted alkene (more alkyl groups on C=C)',hint:'Thermodynamically more stable product'}; },
    function () { return {q:'Markovnikov rule for HX addition?',a:'H goes to C with more H atoms',hint:'Negative part goes to more substituted C'}; },
    function () { var c=pick(["CH3Cl","CHCl3","CCl4","CH3Br"]); return {q:'IUPAC name of '+c+'?',a:['Chloromethane','Trichloromethane','Tetrachloromethane','Bromomethane'][["CH3Cl","CHCl3","CCl4","CH3Br"].indexOf(c)],hint:'Halogen as prefix (halo-)'}; },
    function () { return {q:'Cahn-Ingold-Prelog priority: highest?',a:'Higher atomic number gets higher priority',hint:'Priority based on atomic number of directly attached atom'}; },
    function () { return {q:'Homolytic bond fission produces?',a:'Free radicals (each gets one electron)',hint:'Homolytic: equal sharing of bond e-'}; },
    function () { return {q:'Heterolytic bond fission produces?',a:'Carbocation and carbanion',hint:'One atom gets both electrons'}; }
  ];

  GENERATORS.chemistry.organic_hydrocarbons = [
    function () { var n=rand(1,6); return {q:'General formula of alkanes?',a:'CnH'+(2*n+2),hint:'Saturated hydrocarbons, single bonds'}; },
    function () { var n=rand(2,6); return {q:'General formula of alkenes?',a:'CnH'+(2*n),hint:'One double bond'}; },
    function () { var n=rand(2,6); return {q:'General formula of alkynes?',a:'CnH'+(2*n-2),hint:'One triple bond'}; },
    function () { return {q:'Which hydrocarbon gives Baeyer\'s test?',a:'Unsaturated (alkenes/alkynes) - purple KMnO4 turns brown',hint:'Test for unsaturation'}; },
    function () { return {q:'Wurtz reaction: 2CH3Br + 2Na -> ?',a:'CH3CH3 + 2NaBr',hint:'Coupling of alkyl halides with Na'}; },
    function () { return {q:'Ozonolysis of alkene gives?',a:'Carbonyl compounds (aldehydes/ketones)',hint:'O3 cleaves C=C bond'}; },
    function () { return {q:'Hydrogenation of alkenes: catalyst?',a:'Ni, Pt, or Pd',hint:'Raney Ni for Sabatier-Sendrens reaction'}; },
    function () { return {q:'Kolbe\'s electrolysis: product?',a:'Alkane (from carboxylate salt electrolysis)',hint:'2RCOO- -> R-R + 2CO2 + 2e-'}; },
    function () { return {q:'Which has highest boiling point: n-butane, isobutane?',a:'n-butane (straight chain, more surface area)',hint:'Boiling point increases with chain length'}; },
    function () { return {q:'Free radical chlorination of methane: step 1?',a:'Initiation: Cl2 -> 2Cl (hv)',hint:'Chain reaction: initiation, propagation, termination'}; },
    function () { return {q:'Markovnikov addition: HBr on propene?',a:'2-bromopropane (H adds to CH2, Br to CH)',hint:'H goes to C with more H atoms'}; },
    function () { return {q:'Electrophilic substitution in benzene: example?',a:'Nitration, halogenation, sulfonation, Friedel-Crafts',hint:'Benzene undergoes substitution, not addition'}; },
    function () { return {q:'Aromaticity: Huckel\'s rule?',a:'4n+2 pi electrons in planar cyclic conjugated system',hint:'n=0,1,2... gives aromatic stability'}; },
    function () { return {q:'Alkane preparation from Grignard reagent?',a:'RMgX + H2O -> RH + Mg(OH)X',hint:'Hydrolysis of Grignard gives alkane'}; },
    function () { return {q:'Cracking of hydrocarbons?',a:'Breaking larger alkanes into smaller ones (heat/catalyst)',hint:'Used in petroleum refining'}; }
  ];

  GENERATORS.chemistry.organic_haloalkanes = [
    function () { var c=pick(["CH3Cl","CH3CH2Br","CHCl3","CCl4"]); return {q:'IUPAC name of '+c+'?',a:['Chloromethane','Bromoethane','Trichloromethane','Tetrachloromethane'][["CH3Cl","CH3CH2Br","CHCl3","CCl4"].indexOf(c)],hint:'Haloalkane nomenclature'}; },
    function () { return {q:'SN1 reaction: carbocation intermediate. Which favors?',a:'Tertiary alkyl halides, polar protic solvents',hint:'SN1: 2 steps, carbocation intermediate'}; },
    function () { return {q:'SN2 reaction: inversion of configuration?',a:'Yes (Walden inversion, backside attack)',hint:'SN2 is concerted with inversion'}; },
    function () { return {q:'Elimination vs substitution: high temp favors?',a:'Elimination (Saytzeff product)',hint:'High T, strong bulky base favors elimination'}; },
    function () { return {q:'E2 elimination requires?',a:'Strong base, anti-periplanar geometry',hint:'H and X must be trans in E2'}; },
    function () { return {q:'Which is better for SN2: methyl or tert-butyl?',a:'Methyl (least steric hindrance)',hint:'SN2 rate: methyl > 1o > 2o > 3o'}; },
    function () { return {q:'Finkelstein reaction: example?',a:'R-Cl + NaI -> R-I + NaCl (in acetone)',hint:'Halogen exchange reaction'}; },
    function () { return {q:'Swarts reaction: for?',a:'Preparation of fluoroalkanes: R-X + AgF -> R-F + AgX',hint:'Hg2F2, CoF3 also used'}; },
    function () { return {q:'Haloform reaction: CHCl3 from?',a:'CH3CO-R or CH3CH2OH + NaOX',hint:'Trihalomethane formation'}; },
    function () { return {q:'Freons are?',a:'Chlorofluorocarbons (CFCs) - refrigerants',hint:'Cause ozone layer depletion'}; },
    function () { return {q:'DDT (dichlorodiphenyltrichloroethane) is?',a:'Insecticide',hint:'Banned in many countries due to persistence'}; },
    function () { return {q:'Reactivity order of C-X bond?',a:'R-I > R-Br > R-Cl > R-F',hint:'C-I bond weakest, most reactive'}; },
    function () { return {q:'Grignard reagent: R-Mg-X. Solvent?',a:'Dry ether (anhydrous)',hint:'Grignard reagents are very reactive with H2O'}; },
    function () { return {q:'Wurtz-Fittig reaction?',a:'Aryl halide + alkyl halide + Na -> alkylbenzene',hint:'Coupling of aryl and alkyl halides'}; },
    function () { return {q:'Nucleophilic substitution: OH- on CH3Br?',a:'CH3OH + Br- (SN2 mechanism)',hint:'Hydrolysis of haloalkane gives alcohol'}; }
  ];

  GENERATORS.chemistry.organic_alcohols = [
    function () { var c=pick(["CH3OH","C2H5OH","C3H7OH","C6H5OH"]); return {q:'Common name of '+c+'?',a:['Methyl alcohol','Ethyl alcohol','Propyl alcohol','Phenol'][["CH3OH","C2H5OH","C3H7OH","C6H5OH"].indexOf(c)],hint:'Alcohol nomenclature'}; },
    function () { return {q:'Primary alcohol on oxidation gives?',a:'Aldehyde -> carboxylic acid',hint:'Controlled oxidation gives aldehyde'}; },
    function () { return {q:'Secondary alcohol on oxidation gives?',a:'Ketone',hint:'Further oxidation not possible without C-C bond'}; },
    function () { return {q:'Tertiary alcohol: resistant to oxidation?',a:'Yes (no H on alpha carbon)',hint:'No H on C-OH carbon prevents oxidation'}; },
    function () { return {q:'Lucas test: H2SO4/ZnCl2, difference?',a:'3o: immediate turbidity, 2o: ~5min, 1o: no rxn',hint:'Test to distinguish alcohol classes'}; },
    function () { return {q:'Iodoform test: positive for?',a:'CH3CO- or CH3CHOH- compounds',hint:'Yellow precipitate of CHI3'}; },
    function () { return {q:'Phenol: acidic due to?',a:'Resonance stabilization of phenoxide ion',hint:'Phenol is more acidic than alcohols'}; },
    function () { return {q:'Reimer-Tiemann reaction: phenol + CHCl3 + NaOH?',a:'Salicylaldehyde (o-hydroxybenzaldehyde)',hint:'Formylation of phenol at ortho position'}; },
    function () { return {q:'Kolbe\'s reaction: phenol + CO2 + NaOH?',a:'Salicylic acid (o-hydroxybenzoic acid)',hint:'CO2 attacks at ortho position'}; },
    function () { return {q:'Ethanol: dehydration with H2SO4 at 170C?',a:'Ethene (elimination)',hint:'At 140C forms diethyl ether'}; },
    function () { return {q:'Victor Meyer test: distinguishes?',a:'1o, 2o, 3o alcohols',hint:'Different colors based on oxidation products'}; },
    function () { return {q:'Phenol + FeCl3 gives?',a:'Violet color (complex formation)',hint:'Characteristic test for phenol'}; },
    function () { return {q:'Glycerol: number of OH groups?',a:'3 (trihydric alcohol, 1,2,3-propanetriol)',hint:'Used in nitroglycerin, cosmetics'}; },
    function () { return {q:'Which alcohol is used in alcoholic beverages?',a:'Ethanol (CH3CH2OH)',hint:'Produced by fermentation'}; },
    function () { return {q:'Pinacol-pinacolone rearrangement?',a:'1,2-diol -> ketone (acid-catalyzed)',hint:'Migration of alkyl group'}; }
  ];

  GENERATORS.chemistry.organic_aldehydes = [
    function () { var c=pick(["HCHO","CH3CHO","C6H5CHO","CH3COCH3"]); return {q:'Name of '+c+'?',a:['Formaldehyde','Acetaldehyde','Benzaldehyde','Acetone'][["HCHO","CH3CHO","C6H5CHO","CH3COCH3"].indexOf(c)],hint:'Carbonyl compound nomenclature'}; },
    function () { return {q:'Tollens reagent: AgNO3 + NH4OH. Test for?',a:'Aldehydes (silver mirror)',hint:'Aldehydes reduce Ag+ to Ag metal'}; },
    function () { return {q:'Fehling test: positive for?',a:'Aldehydes (red ppt of Cu2O)',hint:'Not for aromatic aldehydes'}; },
    function () { return {q:'Wolf-Kishner reduction: C=O -> ?',a:'CH2 (NH2NH2, KOH, heat)',hint:'Clemmensen uses Zn-Hg/HCl'}; },
    function () { return {q:'Cannizzaro reaction: aldehydes without alpha-H?',a:'Disproportionation: alcohol + carboxylic acid',hint:'Concentrated base, HCHO gives CH3OH + HCOO-'}; },
    function () { return {q:'Aldol condensation: product?',a:'Beta-hydroxy aldehyde/ketone (aldol)',hint:'Two carbonyl compounds with alpha-H'}; },
    function () { return {q:'Crossed Cannizzaro: HCHO + ArCHO?',a:'ArCH2OH + HCOO- (HCHO is oxidized)',hint:'More reactive aldehyde is oxidized'}; },
    function () { return {q:'Clemmensen reduction: C=O -> CH2?',a:'Zn-Hg/HCl',hint:'Reduction under acidic conditions'}; },
    function () { return {q:'Oxidation of CH3CHO with K2Cr2O7?',a:'CH3COOH (acetic acid)',hint:'Aldehydes oxidize to carboxylic acids'}; },
    function () { return {q:'Benzaldehyde: does it give Fehling test?',a:'No (aromatic aldehydes don\'t)',hint:'Only aliphatic aldehydes give Fehling test'}; },
    function () { return {q:'Haloform reaction: CH3COCH3 + NaOI?',a:'CHI3 (iodoform) + CH3COONa',hint:'Methyl ketones give iodoform'}; },
    function () { return {q:'Perkin reaction: benzaldehyde + acetic anhydride?',a:'Cinnamic acid',hint:'Formation of alpha-beta unsaturated acid'}; },
    function () { return {q:'Keto-enol tautomerism: which form more stable?',a:'Keto form (for simple carbonyls)',hint:'Enol form stabilized by conjugation/H-bond'}; },
    function () { return {q:'Acetal formation: aldehyde + 2ROH?',a:'RCH(OR)2 + H2O',hint:'Protection of aldehyde group'}; },
    function () { return {q:'Schiff\'s base: aldehyde + primary amine?',a:'RCH=N-R (imine)',hint:'Condensation with -NH2 gives imine'}; }
  ];

  GENERATORS.chemistry.organic_acids = [
    function () { var c=pick(["HCOOH","CH3COOH","C6H5COOH","CH3CH2COOH"]); return {q:'Name of '+c+'?',a:['Formic acid','Acetic acid','Benzoic acid','Propionic acid'][["HCOOH","CH3COOH","C6H5COOH","CH3CH2COOH"].indexOf(c)],hint:'Carboxylic acid nomenclature'}; },
    function () { return {q:'Arrange: CH3COOH, ClCH2COOH, Cl2CHCOOH by acidity?',a:'Cl2CHCOOH > ClCH2COOH > CH3COOH',hint:'More Cl = more -I effect = stronger acid'}; },
    function () { return {q:'Hell-Volhard-Zelinsky (HVZ) reaction?',a:'Alpha-halogenation of carboxylic acids (P/Br2)',hint:'P + Br2 gives alpha-bromoacid'}; },
    function () { return {q:'Decarboxylation: RCOOH + CaO -> heat?',a:'RH + CaCO3',hint:'Soda lime decarboxylation'}; },
    function () { return {q:'Esterification: RCOOH + ROH -> ?',a:'RCOOR + H2O (conc H2SO4)',hint:'Reversible reaction, acid-catalyzed'}; },
    function () { return {q:'Which is stronger: formic acid or acetic acid?',a:'Formic acid (HCOOH) pKa=3.75, CH3COOH pKa=4.76',hint:'CH3 is +I group, reduces acidity'}; },
    function () { return {q:'Acid chloride: RCOCl + NH3 -> ?',a:'RCONH2 + NH4Cl (amide)',hint:'Nucleophilic acyl substitution'}; },
    function () { return {q:'Reduction of carboxylic acid with LiAlH4?',a:'Primary alcohol (RCH2OH)',hint:'LiAlH4 reduces -COOH to -CH2OH'}; },
    function () { return {q:'Arndt-Eistert synthesis?',a:'Homologation: RCOOH -> RCH2COOH',hint:'Increase carbon chain by one'}; },
    function () { return {q:'Benzene + CH3COCl + AlCl3?',a:'Acetophenone (Friedel-Crafts acylation)',hint:'Acylation of benzene'}; },
    function () { return {q:'Aspirin is?',a:'Acetylsalicylic acid (CH3CO-O-C6H4-COOH)',hint:'Ester of salicylic acid and acetic anhydride'}; },
    function () { return {q:'Soap is sodium salt of?',a:'Fatty acids (long chain carboxylic acids)',hint:'R-COONa (R=C12-C18)'}; },
    function () { return {q:'Hydrolysis of ester in base is called?',a:'Saponification',hint:'Base-catalyzed ester hydrolysis'}; },
    function () { return {q:'Oxalic acid: how many COOH groups?',a:'2 (dicarboxylic acid, HOOC-COOH)',hint:'Found in spinach, tomatoes'}; },
    function () { return {q:'Benzoic acid: solubility in water?',a:'Slightly soluble (non-polar benzene ring)',hint:'Less soluble than lower carboxylic acids'}; }
  ];

  GENERATORS.chemistry.organic_amines = [
    function () { var c=pick(["CH3NH2","C6H5NH2","(CH3)2NH","(CH3)3N"]); return {q:'Name of '+c+'?',a:['Methylamine (1o)','Aniline (1o aromatic)','Dimethylamine (2o)','Trimethylamine (3o)'][["CH3NH2","C6H5NH2","(CH3)2NH","(CH3)3N"].indexOf(c)],hint:'Amine classification based on N-substitution'}; },
    function () { return {q:'Basicity order: NH3, CH3NH2, C6H5NH2?',a:'CH3NH2 > NH3 > C6H5NH2',hint:'Alkyl +I increases basicity, aryl resonance decreases'}; },
    function () { return {q:'Hinsberg test: distinguishes 1o, 2o, 3o amines?',a:'1o: soluble (sulfonamide), 2o: ppt, 3o: no rxn',hint:'Benzenesulfonyl chloride test'}; },
    function () { return {q:'Carbylamine test: positive for?',a:'Primary amines (R-NC + H2O)',hint:'CHCl3 + KOH + RNH2 -> foul-smelling isocyanide'}; },
    function () { return {q:'Diazotization: aniline + NaNO2 + HCl at 0-5C?',a:'Benzenediazonium chloride (C6H5N2+Cl-)',hint:'Aromatic primary amine -> diazonium salt'}; },
    function () { return {q:'Coupling reaction: diazonium salt + amine/phenol?',a:'Azo dye (colored product)',hint:'N=N linkage gives color'}; },
    function () { return {q:'Sandmeyer reaction: C6H5N2Cl + CuCl?',a:'C6H5Cl + N2',hint:'Replacement of diazonium by Cl, Br, CN'}; },
    function () { return {q:'Gabriel phthalimide synthesis for?',a:'Primary amines from alkyl halides',hint:'K phthalimide + RX -> RNH2'}; },
    function () { return {q:'Hoffmann bromamide degradation?',a:'RCONH2 + Br2 + NaOH -> RNH2',hint:'Amide -> primary amine (C loss)'}; },
    function () { return {q:'Which is most basic: NH3, RNH2, R2NH, R3N?',a:'Usually R2NH > RNH2 > R3N > NH3 (in water)',hint:'Depends on solvation and +I effects'}; },
    function () { return {q:'Aniline: why less basic than NH3?',a:'Lone pair on N is conjugated with benzene ring',hint:'Resonance delocalization reduces basicity'}; },
    function () { return {q:'N-ethylation of aniline with C2H5Br?',a:'N-Ethylaniline (then N,N-diethylaniline)',hint:'Alkylation of amines'}; },
    function () { return {q:'Amines: lower bp than alcohols?',a:'Yes (N-H weaker H-bond than O-H)',hint:'Alcohols have stronger H-bonding'}; },
    function () { return {q:'Quaternary ammonium salts: properties?',a:'Cationic surfactants, phase transfer catalysts',hint:'R4N+X-: soluble in both phases'}; },
    function () { return {q:'Melamine is a triazine derivative. Uses?',a:'Synthetic resin, electric insulators',hint:'Polymer with formaldehyde'}; }
  ];

  GENERATORS.chemistry.organic_biomolecules = [
    function () { return {q:'Glucose: aldehyde or keto sugar?',a:'Aldohexose (has CHO group)',hint:'Glucose is an aldohexose, fructose is ketohexose'}; },
    function () { return {q:'Starch and cellulose are?',a:'Polysaccharides',hint:'Polymers of glucose'}; },
    function () { return {q:'Sucrose: reducing or non-reducing?',a:'Non-reducing (glycosidic bond links anomeric carbons)',hint:'No free aldehyde/ketone group'}; },
    function () { return {q:'Protein building blocks?',a:'Amino acids (20 standard, alpha-amino acids)',hint:'General: H2N-CHR-COOH'}; },
    function () { return {q:'Zwitterion form of amino acid at pH 7?',a:'NH3+ - CHR - COO-',hint:'Both acidic and basic groups ionized'}; },
    function () { return {q:'Enzymes: biological catalysts (protein nature). Example?',a:'Amylase, pepsin, trypsin',hint:'Enzymes are mostly proteins'}; },
    function () { return {q:'DNA double helix discovered by?',a:'Watson and Crick (1953)',hint:'Nobel Prize for DNA structure'}; },
    function () { return {q:'RNA: uracil replaces which base?',a:'Thymine (T in DNA, U in RNA)',hint:'RNA has A-U, C-G base pairs'}; },
    function () { return {q:'Vitamin C is?',a:'Ascorbic acid (water soluble)',hint:'Deficiency causes scurvy'}; },
    function () { return {q:'Vitamin A is?',a:'Retinol (fat soluble)',hint:'Deficiency causes night blindness'}; },
    function () { return {q:'Alpha-helix and beta-sheet are?',a:'Secondary structure of proteins (H-bonding)',hint:'Alpha: H-bond within chain, Beta: between chains'}; },
    function () { return {q:'Mutarotation: change in?',a:'Specific rotation of sugars (anomer interconversion)',hint:'Glucose shows mutarotation in solution'}; },
    function () { return {q:'Hormone: insulin function?',a:'Regulates blood glucose level',hint:'Protein hormone from pancreas'}; },
    function () { return {q:'Nucleoside vs nucleotide difference?',a:'Nucleoside = base + sugar, Nucleotide = base + sugar + PO4',hint:'Nucleotide includes phosphate'}; },
    function () { return {q:'Denaturation of protein: change in?',a:'Secondary/tertiary structure (loss of biological activity)',hint:'Coagulation of egg white on heating'}; }
  ];

  GENERATORS.chemistry.organic_polymers = [
    function () { return {q:'Polymer defined as?',a:'Large molecule of repeating monomer units',hint:'Monomers -> Polymers (polymerization)'}; },
    function () { return {q:'Addition polymer: monomer retains all atoms?',a:'Yes (e.g., polyethylene, PVC, Teflon)',hint:'No byproduct formed'}; },
    function () { return {q:'Condensation polymer: byproduct?',a:'Small molecule (H2O, NH3, HCl)',hint:'Nylon, polyester, bakelite'}; },
    function () { return {q:'Nylon-66: monomers?',a:'Adipic acid + Hexamethylenediamine',hint:'6C diacid + 6C diamine'}; },
    function () { return {q:'Teflon: monomer?',a:'Tetrafluoroethylene (CF2=CF2)',hint:'Non-stick coating, heat resistant'}; },
    function () { return {q:'PVC: monomer?',a:'Vinyl chloride (CH2=CHCl)',hint:'Used in pipes, wires insulation'}; },
    function () { return {q:'Polystyrene: monomer?',a:'Styrene (C6H5-CH=CH2)',hint:'Used in packaging, cups'}; },
    function () { return {q:'Natural rubber: polymer of?',a:'Isoprene (2-methyl-1,3-butadiene)',hint:'Cis-polyisoprene'}; },
    function () { return {q:'Vulcanization of rubber uses?',a:'Sulfur (cross-links polymer chains)',hint:'Improves strength, elasticity'}; },
    function () { return {q:'Bakelite: type of polymer?',a:'Thermosetting (formaldehyde + phenol)',hint:'Used for electrical switches'}; },
    function () { return {q:'Polyethylene terephthalate (PET): uses?',a:'Bottles, polyester fibers',hint:'Condensation polymer'}; },
    function () { return {q:'Kevlar: uses?',a:'Bulletproof vests (aramid fiber)',hint:'High strength, heat resistant'}; },
    function () { return {q:'Biodegradable polymer example?',a:'PHBV (polyhydroxybutyrate-valerate), PLA',hint:'Degraded by microorganisms'}; },
    function () { return {q:'Polymer tacticity: isotactic = ?',a:'All substituents on same side of chain',hint:'Atactic: random, Syndiotactic: alternating'}; },
    function () { return {q:'Polyacrylonitrile (PAN): uses?',a:'Acrylic fibers (wool substitute)',hint:'Orlon, Acrilan'}; }
  ];
  // ==================== BIOLOGY ====================

  function makeBioQ(text, answer, opts, hint, sol) {
    return { q: text, a: answer, hint: hint || "", options: opts, solution: sol || "" };
  }

  GENERATORS.biology.cell_biology = [
    function () { return makeBioQ("Powerhouse of the cell?","Mitochondria",["Nucleus","Mitochondria","Ribosome","Golgi body"],"Site of ATP production","Mitochondria produce ATP via oxidative phosphorylation"); },
    function () { return makeBioQ("Which organelle contains digestive enzymes?","Lysosome",["Ribosome","Lysosome","Peroxisome","Vacuole"],"Suicide bags of the cell","Lysosomes have hydrolytic enzymes for intracellular digestion"); },
    function () { return makeBioQ("Site of protein synthesis?","Ribosome",["RER","Ribosome","Golgi","Nucleolus"],"Reads mRNA to make proteins","Ribosomes are composed of rRNA and proteins"); },
    function () { return makeBioQ("Which cell organelle is involved in modification and packaging of proteins?","Golgi apparatus",["ER","Golgi apparatus","Lysosome","Peroxisome"],"Stacked membrane sacs","Golgi modifies, sorts, packages proteins"); },
    function () { return makeBioQ("The semifluid matrix inside the cell is called?","Cytosol/Cytoplasm",["Nucleoplasm","Cytosol","Stroma","Matrix"],"Fluid content of cell","Cytosol is the aqueous part of cytoplasm"); },
    function () { return makeBioQ("Chromatin is made of?","DNA + Histone proteins",["RNA+Protein","DNA only","DNA+Histones","Lipids+Protein"],"Genetic material packaging","Nucleosome: DNA wrapped around histone octamer"); },
    function () { return makeBioQ("Which organelle is semi-autonomous?","Mitochondria & Chloroplast",["Nucleus","ER","Mitochondria","Lysosome"],"Have own DNA and ribosomes","Mitochondria and chloroplasts have their own DNA"); },
    function () { return makeBioQ("Cell wall of plant cells is made of?","Cellulose",["Chitin","Cellulose","Peptidoglycan","Pectin"],"Structural polysaccharide","Cellulose provides structural support"); },
    function () { return makeBioQ("Nucleolus is site of?","rRNA synthesis",["mRNA","tRNA","rRNA","DNA replication"],"Produces ribosomal RNA","Nucleolus is where rRNA is transcribed"); },
    function () { return makeBioQ("Fluid mosaic model proposed by?","Singer & Nicolson",["Watson & Crick","Singer & Nicolson","Robert Hooke","Leeuwenhoek"],"Cell membrane structure","Integral and peripheral proteins in lipid bilayer"); },
    function () { return makeBioQ("Plasmodesmata in plant cells function?","Intercellular communication",["Transport water","Communication","Storage","Synthesis"],"Cytoplasmic bridges","Connect adjacent plant cells through cell walls"); },
    function () { return makeBioQ("Which organelle detoxifies hydrogen peroxide?","Peroxisome",["Lysosome","Peroxisome","Mitochondria","ER"],"Contains catalase enzyme","H2O2 is broken down to H2O + O2 by catalase"); },
    function () { return makeBioQ("Cytoskeleton elements include?","Microtubules, microfilaments, intermediate filaments",["Only actin","Only tubulin","Three types","Two types"],"Cell shape and movement","Provide structural support and enable movement"); },
    function () { return makeBioQ("Which cell lacks nucleus?","Mature RBC (erythrocyte)",["WBC","Neuron","RBC","Muscle cell"],"Enucleated in mammals","Mammalian RBCs lose nucleus for more Hb space"); },
    function () { return makeBioQ("Prokaryotic cell lacks?","Membrane-bound organelles and nucleus",["Cell wall","Ribosomes","Nucleus","DNA"],"Bacteria and archaea","Prokaryotes have 70S ribosomes, no nuclear membrane"); }
  ];

  GENERATORS.biology.genetics = [
    function () { return makeBioQ("Mendel: law of segregation states?","Alleles separate during gamete formation",["Alleles blend","Alleles separate","Genes linked","Dominance"],"Law of purity of gametes","Each gamete gets one allele from each gene pair"); },
    function () { return makeBioQ("Monohybrid cross F2 phenotypic ratio?","3:1",["1:2:1","3:1","9:3:3:1","1:1"],"Mendelian inheritance","3 dominant : 1 recessive phenotype"); },
    function () { return makeBioQ("Dihybrid cross F2 phenotypic ratio?","9:3:3:1",["3:1","9:3:3:1","1:2:1","1:1:1:1"],"Two traits simultaneously","9:3:3:1 in F2 for independent assortment"); },
    function () { return makeBioQ("Incomplete dominance example?","Snapdragon (Antirrhinum) flower color",["Pea plant","Snapdragon","Drosophila","Human"],"Both alleles express partially","RR=red, rr=white, Rr=pink"); },
    function () { return makeBioQ("Sex determination in humans: male genotype?","XY",["XX","XY","XO","XXY"],"Females XX, males XY","SRY gene on Y chromosome triggers male development"); },
    function () { return makeBioQ("Chromosome number in human?","46 (23 pairs)",["46","44","48","23"],"Diploid number","22 pairs autosomes + 1 pair sex chromosomes"); },
    function () { return makeBioQ("Punnett square shows?","Probable genotype combinations",["Phenotypes","Genotype combos","Pedigree","Linkage"],"Predict offspring genotypes","Grid showing all possible allele combinations"); },
    function () { return makeBioQ("Linkage refers to?","Genes on same chromosome inherited together",["Independent assortment","Linkage","Crossing over","Mutation"],"Violates independent assortment","Linked genes tend to stay together during meiosis"); },
    function () { return makeBioQ("Crossing over occurs in?","Prophase I of meiosis",["Mitosis","Meiosis I","Meiosis II","Interphase"],"Exchange of genetic material","Chiasmata formation between homologous chromosomes"); },
    function () { return makeBioQ("Colour blindness is?","X-linked recessive",["Autosomal","X-linked recessive","Y-linked","Dominant"],"Red-green vision deficiency","More common in males (only one X)"); },
    function () { return makeBioQ("Turner syndrome: karyotype?","45, XO",["XXY","XO","XXX","XYY"],"Female with one X","Short stature, webbed neck, sterile"); },
    function () { return makeBioQ("Klinefelter syndrome: karyotype?","47, XXY",["XXY","XO","XXX","XYY"],"Male with extra X","Tall, sterile, learning difficulties"); },
    function () { return makeBioQ("DNA replication is?","Semiconservative",["Conservative","Semiconservative","Dispersive","Random"],"Each new DNA has one old and one new strand","Meselson-Stahl experiment proved semiconservative"); },
    function () { return makeBioQ("Transcription: DNA to?","mRNA",["tRNA","rRNA","mRNA","Protein"],"RNA synthesis from DNA template","RNA polymerase catalyzes transcription"); },
    function () { return makeBioQ("Genetic code is?","Triplet, degenerate, universal, non-overlapping",["Doublet","Triplet","Quadruplet","Single"],"Codon = 3 nucleotides","64 codons, 61 code for amino acids, 3 stop"); }
  ];

  GENERATORS.biology.molecular_basis = [
    function () { return makeBioQ("Structure of DNA: double helix discovered by?","Watson & Crick",["Mendel","Watson & Crick","Darwin","Morgan"],"1953 Nature paper","Nobel Prize 1962 for DNA structure"); },
    function () { return makeBioQ("DNA backbone composed of?","Sugar-phosphate backbone",["Sugar-base","Phosphate-base","Sugar-phosphate","Amino acids"],"Deoxyribose + phosphate groups","Phosphodiester bonds connect nucleotides"); },
    function () { return makeBioQ("Base pairing: A pairs with?","Thymine (T) [A-T]",["G","C","T","U"],"Two hydrogen bonds","Adenine-Thymine: 2 H-bonds"); },
    function () { return makeBioQ("RNA has which base instead of thymine?","Uracil (U)",["A","G","C","U"],"Uracil pairs with Adenine in RNA","T is replaced by U in RNA"); },
    function () { return makeBioQ("Central dogma of molecular biology:?","DNA -> RNA -> Protein",["RNA->DNA","DNA->RNA->Protein","Protein->DNA","RNA->Protein"],"Flow of genetic information","Reverse transcription in retroviruses violates this"); },
    function () { return makeBioQ("Okazaki fragments: on which strand?","Lagging strand",["Leading","Lagging","Template","Coding"],"Discontinuous synthesis","DNA polymerase works 5' to 3' only"); },
    function () { return makeBioQ("DNA polymerase adds nucleotides to which end?","3'-OH end",["5' end","3'-OH","Both","Either"],"Synthesis direction 5'->3'","New strand elongates at 3' end"); },
    function () { return makeBioQ("Transcription: enzyme?","RNA polymerase",["DNA polymerase","RNA polymerase","Helicase","Ligase"],"RNA synthesizing enzyme","Binds to promoter region"); },
    function () { return makeBioQ("Translation: mRNA codons read by?","tRNA (anticodon)",["rRNA","tRNA","mRNA","snRNA"],"tRNA carries amino acids","Anticodon on tRNA pairs with mRNA codon"); },
    function () { return makeBioQ("Ribosome: site of?","Protein synthesis (translation)",["Transcription","Translation","Replication","Splicing"],"Ribosomes read mRNA","70S in prokaryotes, 80S in eukaryotes"); },
    function () { return makeBioQ("Restriction enzymes are?","Molecular scissors (cut DNA at specific sequences)",["Ligase","Restriction enzyme","Helicase","Polymerase"],"Protect bacteria from viruses","Recognize palindromic sequences"); },
    function () { return makeBioQ("PCR amplifies?","DNA (specific region)",["RNA","Protein","DNA","Lipids"],"Polymerase Chain Reaction","Denaturation -> Annealing -> Extension"); },
    function () { return makeBioQ("Nucleosome core particle has?","Histone octamer (H2A, H2B, H3, H4)x2",["4 histones","8 histones","6 histones","10 histones"],"DNA packaging unit","146 bp DNA wrapped around histone core"); },
    function () { return makeBioQ("Splicing removes?","Introns (non-coding regions)",["Exons","Introns","Both","Promoters"],"RNA processing in eukaryotes","Exons join to form mature mRNA"); },
    function () { return makeBioQ("Operon model proposed by?","Jacob & Monod",["Watson & Crick","Jacob & Monod","Mendel","Darwin"],"Regulation of gene expression","Lac operon: inducible system in E.coli"); }
  ];

  GENERATORS.biology.evolution = [
    function () { return makeBioQ("Darwin\'s book on evolution?","On the Origin of Species (1859)",["Descent of Man","Origin of Species","Voyage of Beagle","Principles of Geology"],"Natural selection theory","Darwin proposed natural selection as mechanism"); },
    function () { return makeBioQ("Natural selection: survival of?","Fittest (best adapted to environment)",["Strongest","Fittest","Largest","Fastest"],"Differential reproductive success","Organisms with advantageous traits survive more"); },
    function () { return makeBioQ("Homologous organs: example?","Human arm, whale flipper, bat wing",["Wing of bat and bird","Wings of bird and butterfly","Leg of horse and crab","Arm of human and leg of horse"],"Same structure, different function","Indicate common ancestry"); },
    function () { return makeBioQ("Analogous organs: example?","Wing of insect and wing of bird",["Arm and leg","Bird wing and insect wing","Whale flipper and human arm","Leaf and stem"],"Different origin, similar function","Convergent evolution"); },
    function () { return makeBioQ("Vestigial organ in humans?","Appendix, tailbone (coccyx)",["Heart","Liver","Appendix","Eyes"],"Reduced/non-functional remnants","Indicate evolutionary history"); },
    function () { return makeBioQ("Hugo de Vries: mutation theory based on?","Evening primrose (Oenothera lamarckiana)",["Pea plant","Primrose","Drosophila","E.coli"],"Mutations cause evolution","Saltation: sudden large changes"); },
    function () { return makeBioQ("Hardy-Weinberg principle assumes?","No mutation, gene flow, selection, large population, random mating",["Small population","Selection","Mutation","No evolutionary change"],"Equilibrium of allele frequencies","p^2 + 2pq + q^2 = 1"); },
    function () { return makeBioQ("Which era is known as Age of Reptiles?","Mesozoic",["Paleozoic","Mesozoic","Cenozoic","Precambrian"],"Dinosaurs dominated","Triassic, Jurassic, Cretaceous periods"); },
    function () { return makeBioQ("The first life forms appeared in?","Water (primordial soup)",["Land","Water","Air","Underground"],"Chemical evolution theory","Miller-Urey experiment simulated early Earth"); },
    function () { return makeBioQ("Industrial melanism in moths is?","Natural selection example (Biston betularia)",["Mutation","Migration","Selection","Genetic drift"],"Peppered moth color change","Dark moths survived better in polluted areas"); },
    function () { return makeBioQ("Biogenetic law: ontogeny recapitulates?","Phylogeny (Haeckel)",["Ontogeny","Phylogeny","Evolution","Development"],"Embryonic stages repeat evolution","Embryos show ancestral features"); },
    function () { return makeBioQ("Fossils: most informative evidence of?","Evolution (transitional forms)",["Evolution","Development","Behavior","Genetics"],"Preserved remains of organisms","Archaeopteryx: transitional bird-dinosaur"); },
    function () { return makeBioQ("Genetic drift: more significant in?","Small populations (founder effect, bottleneck)",["Large","Small","Medium","All"],"Random allele frequency change","Founder effect: new population from few individuals"); },
    function () { return makeBioQ("Coacervates: what are they?","Aggregates of organic molecules (protobionts)",["Fossils","Protobionts","Enzymes","Viruses"],"Prebiotic structures","Self-organized colloidal droplets"); },
    function () { return makeBioQ("Which scientist is associated with evolution of horse?","Othniel C. Marsh (fossil record evidence)",["Darwin","Marsh","Haeckel","Mendel"],"Horse evolution series","Showed gradual increase in size, digit reduction"); }
  ];

  GENERATORS.biology.plant_physiology = [
    function () { return makeBioQ("Photosynthetic pigment in plants?","Chlorophyll a (primary pigment)",["Chlorophyll a","Chlorophyll b","Xanthophyll","Carotene"],"Green pigment absorbs light","Chlorophyll a: blue-green, absorbs red and blue light"); },
    function () { return makeBioQ("Site of photosynthesis?","Chloroplast (thylakoid/grana)",["Mitochondria","Chloroplast","Nucleus","Vacuole"],"Contains chlorophyll","Chloroplasts have thylakoid membrane system"); },
    function () { return makeBioQ("Photolysis of water takes place in?","Light reaction (PS II)",["Light reaction","Dark reaction","Calvin cycle","Glycolysis"],"Water splitting to O2 + H+ + e-","Requires Mn cluster and Ca2+ ions"); },
    function () { return makeBioQ("C3 cycle discovered by?","Melvin Calvin (Calvin cycle)",["Calvin","Hatch & Slack","Hill","Ruben"],"Carbon fixation in C3 plants","3-PGA -> G3P -> Glucose"); },
    function () { return makeBioQ("C4 cycle discovered by?","Hatch & Slack (Kranz anatomy)",["Calvin","Hatch & Slack","Hill","Arnon"],"CO2 fixation in mesophyll","Oxaloacetate -> Malate -> CO2 release in bundle sheath"); },
    function () { return makeBioQ("CAM plants: example?","Cacti, succulents (Crassulacean acid metabolism)",["Rice","Cactus","Wheat","Soybean"],"Night-time CO2 fixation","Stomata open at night to conserve water"); },
    function () { return makeBioQ("Transpiration: loss of water as?","Water vapor from stomata",["Liquid water","Water vapor","Sap","Nectar"],"Evaporation from leaves","Cools plants, helps mineral transport"); },
    function () { return makeBioQ("Xylem transports?","Water and minerals (upward)",["Water/minerals","Sugars","Hormones","Amino acids"],"Unidirectional flow","Root pressure + transpiration pull"); },
    function () { return makeBioQ("Phloem transports?","Sugars (sucrose) - source to sink",["Water","Sugars","Minerals","Ions"],"Bidirectional flow","Sieved tubes with companion cells"); },
    function () { return makeBioQ("Plant hormone for cell elongation?","Auxin (IAA)",["Auxin","Gibberellins","Cytokinins","ABA"],"Apical meristem production","Promotes phototropism and gravitropism"); },
    function () { return makeBioQ("Gibberellins: effect on plants?","Stem elongation, seed germination",["Stem elongation","Ripening","Senescence","Stomatal closure"],"Produced in young tissues","GA3: induces bolting in rosette plants"); },
    function () { return makeBioQ("Abscisic acid (ABA): stress hormone?","Stomatal closure, dormancy",["Promotes growth","Stomatal closure","Fruit ripening","Cell division"],"Plant stress responses","Abscission and dormancy induction"); },
    function () { return makeBioQ("Ethylene: role in?","Fruit ripening",["Ripening","Growth","Dormancy","Flowering"],"Gaseous plant hormone","Triple response in seedlings"); },
    function () { return makeBioQ("Nitrogen fixation: symbiotic bacteria?","Rhizobium (legume root nodules)",["E.coli","Rhizobium","Azotobacter","Clostridium"],"N2 -> NH3 conversion","Nitrogenase enzyme (O2-sensitive)"); },
    function () { return makeBioQ("Essential element deficiency: chlorosis?","Lack of Mg, Fe, N, S (chlorophyll synthesis affected)",["N,P,K","Mg,Fe,N,S","Ca,B","Zn,Mn"],"Yellowing of leaves","Chlorophyll needs Mg, Fe, N for synthesis"); }
  ];

  GENERATORS.biology.human_digestion = [
    function () { return makeBioQ("Enzyme that digests starch in mouth?","Amylase (ptyalin)",["Pepsin","Amylase","Trypsin","Lipase"],"Secreted by salivary glands","Starch -> maltose"); },
    function () { return makeBioQ("Pepsinogen activated by?","HCl (pepsinogen -> pepsin)",["HCl","Bile","Trypsin","NaOH"],"Stomach proteolytic enzyme","Pepsin digests proteins to peptides"); },
    function () { return makeBioQ("Bile produced in?","Liver (stored in gall bladder)",["Liver","Pancreas","Stomach","Gall bladder"],"Emulsifies fats","No enzymes in bile; contains bile salts"); },
    function () { return makeBioQ("Pancreatic juice contains?","Trypsin, chymotrypsin, lipase, amylase",["Only lipase","Only amylase","Multiple enzymes","Only trypsin"],"Acinar cells secrete","Pancreatic enzymes digest all macromolecules"); },
    function () { return makeBioQ("Site of maximum absorption?","Small intestine (jejunum + ileum)",["Stomach","Small intestine","Large intestine","Mouth"],"Villi and microvilli increase SA","Small intestine absorbs 90% nutrients"); },
    function () { return makeBioQ("Vitamin B12 absorption requires?","Intrinsic factor (from stomach)",["HCl","Intrinsic factor","Bile","Trypsin"],"Parietal cells secrete IF","Lack of IF causes pernicious anemia"); },
    function () { return makeBioQ("Crypts of Lieberkuhn found in?","Small intestine (intestinal glands)",["Stomach","Small intestine","Large intestine","Pancreas"],"Secrete intestinal juice","Contains various digestive enzymes"); },
    function () { return makeBioQ("Enterokinase activates?","Trypsinogen -> Trypsin",["Pepsinogen","Trypsinogen","Amylase","Lipase"],"Duodenal brush border enzyme","Trypsin then activates other pancreatic enzymes"); },
    function () { return makeBioQ("Rennin (chymosin) in infants digests?","Milk proteins (casein)",["Lactose","Casein","Fat","Vitamins"],"Present in infants, not adults","Curdles milk for easier digestion"); },
    function () { return makeBioQ("Function of large intestine?","Water absorption, compaction of feces",["Digestion","Absorption","Water absorption","Secretion"],"Colon absorbs water, minerals","Houses gut microbiota"); },
    function () { return makeBioQ("Gastrin hormone: stimulates?","Gastric acid secretion",["Bile release","Acid secretion","Enzyme secretion","Insulin"],"G-cells in stomach","Stimulated by food, distension"); },
    function () { return makeBioQ("Secretin: produced by?","Duodenal wall (S-cells)",["Stomach","Liver","Duodenum","Pancreas"],"Stimulates HCO3- from pancreas","Neutralizes stomach acid"); },
    function () { return makeBioQ("CCK (cholecystokinin): stimulates?","Gall bladder contraction (bile release)",["Acid","Bile","Insulin","Enzymes"],"Also stimulates pancreatic enzymes","Released in response to fats"); },
    function () { return makeBioQ("Brush border enzymes of small intestine?","Maltase, lactase, sucrase, peptidases",["Only proteases","Only carbohydrases","Disaccharidases+peptidases","Only lipases"],"Final digestion step","Convert disaccharides to monosaccharides"); },
    function () { return makeBioQ("Lactose intolerance: deficiency of?","Lactase (enzyme)",["Maltase","Lactase","Sucrase","Amylase"],"Inability to digest lactose","Causes gas, bloating after milk consumption"); }
  ];

  GENERATORS.biology.human_respiration = [
    function () { return makeBioQ("Site of gas exchange in lungs?","Alveoli",["Bronchi","Alveoli","Trachea","Bronchioles"],"Thin-walled air sacs","Surrounded by capillaries for gas exchange"); },
    function () { return makeBioQ("Primary respiratory pigment in humans?","Hemoglobin (in RBC)",["Hemoglobin","Myoglobin","Chlorophyll","Hemocyanin"],"O2 carrying protein","Hb has 4 heme groups, each binds O2"); },
    function () { return makeBioQ("Oxyhemoglobin: O2 binds to?","Fe2+ in heme (cooperative binding)",["Fe2+","Fe3+","Globin","Prophyrin"],"Each Hb binds 4 O2","Cooperative binding: sigmoid dissociation curve"); },
    function () { return makeBioQ("Bohr effect: H+ and CO2 affect?","O2 affinity of Hb (decreased at low pH)",["O2-bind","CO2-bind","Hb-structure","Hb-synthesis"],"Increased CO2/H+ reduces O2 affinity","More O2 released to active tissues"); },
    function () { return makeBioQ("CO2 is transported mainly as?","Bicarbonate (HCO3-) in plasma",["HCO3-","Dissolved CO2","Carbamino Hb","H2CO3"],"~70% as bicarbonate","Carbonic anhydrase catalyzes CO2 + H2O -> H2CO3"); },
    function () { return makeBioQ("Trachea lined with?","Ciliated epithelium with mucus cells",["Squamous","Ciliated","Columnar","Stratified"],"Mucus traps particles, cilia sweep up","Prevents foreign particles from reaching lungs"); },
    function () { return makeBioQ("Diaphragm: function in breathing?","Contracts and flattens during inspiration",["Expands lungs","Contracts","Relaxes","Moves ribs"],"Main respiratory muscle","Contraction increases thoracic volume, air enters"); },
    function () { return makeBioQ("Respiratory center in brain?","Medulla oblongata",["Cerebellum","Medulla","Hypothalamus","Cortex"],"Controls breathing rate","Responds to CO2/H+ levels"); },
    function () { return makeBioQ("Vital capacity (VC) = ?","TV + IRV + ERV (~4800 mL)",["TV+IRV","TV+IRV+ERV","TV+ERV","RV"],"Max air exhaled after max inhale","Measures lung function"); },
    function () { return makeBioQ("Tidal volume (TV) normally?","~500 mL",["500","1000","300","200"],"Volume per normal breath","~500 mL in healthy adult"); },
    function () { return makeBioQ("Oxygen dissociation curve: right shift due to?","Increased CO2, H+, temperature, 2,3-BPG",["Low CO2","High pH","Low temp","Increased CO2"],"Right shift = easier O2 unloading","More O2 released to active tissues"); },
    function () { return makeBioQ("Pneumotaxic center located in?","Pons (limits inspiration)",["Medulla","Pons","Cortex","Hypothalamus"],"Regulates respiratory rate","Inhibits inspiratory center to prevent overinflation"); },
    function () { return makeBioQ("Emphysema: cause?","Destruction of alveolar walls (smoking)",["Infection","Smoking","Hereditary","Pollution"],"Loss of elastic recoil","Reduced surface area for gas exchange"); },
    function () { return makeBioQ("Partial pressure of O2 in atmosphere?","~159 mm Hg (21% of 760)",["159","100","40","760"],"760 mm Hg total, 21% O2","PO2 = 760 * 0.21 = 159.6 mm Hg"); },
    function () { return makeBioQ("Mouth-to-mouth respiration utilizes?","Expired air (~16% O2, 4% CO2)",["Fresh air","Expired air","Pure O2","Pure CO2"],"Still enough O2 to sustain life","Expired air has ~16% O2 sufficient for resuscitation"); }
  ];
  GENERATORS.biology.human_circulation = [
    function () { return makeBioQ("Heart chambers in mammals?","4 (2 atria + 2 ventricles)",["2","3","4","5"],"Double circulation","Left side oxygenated, right side deoxygenated"); },
    function () { return makeBioQ("Cardiac cycle: normal heart rate?","72 bpm (~0.8 sec per cycle)",["60","72","80","100"],"Rhythmic contraction/relaxation","Systole + Diastole = one cardiac cycle"); },
    function () { return makeBioQ("SA node is also called?","Pacemaker (natural pacemaker)",["Pacemaker","AV node","Bundle of His","Purkinje"],"Sets heart rhythm","SA node generates ~72 action potentials/min"); },
    function () { return makeBioQ("ECG: P wave represents?","Atrial depolarization",["Ventricular depol","Atrial depol","Repolarization","Septal depol"],"SAN initiates atrial contraction","PR interval: AV conduction time"); },
    function () { return makeBioQ("Blood pressure: normal systolic/diastolic?","120/80 mm Hg",["120/80","130/90","110/70","140/100"],"Measured with sphygmomanometer","Systolic: ventricular contraction, Diastolic: relaxation"); },
    function () { return makeBioQ("RBC production occurs in?","Red bone marrow",["Liver","Spleen","Bone marrow","Lymph nodes"],"Erythropoiesis regulated by EPO","Erythropoietin from kidney stimulates RBC production"); },
    function () { return makeBioQ("WBC: highest percentage?","Neutrophils (40-70%)",["Lymphocytes","Neutrophils","Eosinophils","Monocytes"],"Phagocytic white blood cells","First responders to infection"); },
    function () { return makeBioQ("Blood clotting: final step?","Fibrinogen -> Fibrin (by thrombin)",["Thrombin","Fibrin mesh","Prothrombin","Ca2+"],"Fibrin mesh traps platelets and RBCs","Thrombin converts fibrinogen to fibrin"); },
    function () { return makeBioQ("ABO blood group discovered by?","Karl Landsteiner",["Mendel","Landsteiner","Darwin","Koch"],"1901 discovery","Type O: universal donor, AB: universal recipient"); },
    function () { return makeBioQ("Rh factor: Rh+ individuals have?","D antigen on RBC surface",["A antigen","B antigen","D antigen","No antigen"],"85% population Rh+","Rh- mother with Rh+ baby: erythroblastosis fetalis"); },
    function () { return makeBioQ("Pulmonary artery carries?","Deoxygenated blood (heart to lungs)",["Oxygenated","Deoxygenated","Mixed","Nutrient-rich"],"Exception: artery with deoxy blood","Pulmonary vein carries oxygenated blood"); },
    function () { return makeBioQ("Coronary arteries supply?","Heart muscle (myocardium)",["Brain","Heart","Lungs","Kidneys"],"Supply O2 and nutrients to heart","Blockage causes myocardial infarction (heart attack)"); },
    function () { return makeBioQ("Lymph differs from blood: lacks?","RBCs and platelets",["WBC","RBCs","Plasma","Proteins"],"Lymphatic system","Lymph contains WBCs, flows in one direction"); },
    function () { return makeBioQ("Spleen function in circulation?","Removes old RBCs, produces lymphocytes",["Filters blood","Produces RBC","Produces platelets","Stores bile"],"Reservoir of blood","Largest lymphatic organ"); },
    function () { return makeBioQ("Hepatic portal system connects?","GI tract to liver",["Heart to lungs","GI tract to liver","Kidney to bladder","Brain to spine"],"Nutrient-rich blood to liver for processing","Liver detoxifies and metabolizes nutrients"); }
  ];

  GENERATORS.biology.human_excretion = [
    function () { return makeBioQ("Kidney: functional unit?","Nephron (~1 million per kidney)",["Glomerulus","Nephron","Ureter","Bladder"],"Filtration, reabsorption, secretion","Each nephron has renal corpuscle and tubule"); },
    function () { return makeBioQ("Glomerular filtration rate (GFR) normal?","~125 mL/min",["125","50","250","75"],"Volume filtered per minute","~180 L/day filtered, ~1.5 L urine formed"); },
    function () { return makeBioQ("Reabsorption: where are most solutes reabsorbed?","Proximal convoluted tubule (PCT)",["PCT","Loop of Henle","DCT","Collecting duct"],"65-70% of filtrate reabsorbed here","Glucose, amino acids, Na+, HCO3- reabsorbed"); },
    function () { return makeBioQ("Loop of Henle function?","Countercurrent multiplier (concentrates urine)",["Filtration","Concentration","Reabsorption","Secretion"],"Creates medullary osmotic gradient","Descending: water permeable, Ascending: salt permeable"); },
    function () { return makeBioQ("ADH (vasopressin): increases?","Water reabsorption in collecting duct",["Na+ reabsorption","H2O reabsorption","K+ secretion","H+ secretion"],"Antidiuretic hormone from posterior pituitary","Concentrates urine, conserves water"); },
    function () { return makeBioQ("Aldosterone: increases?","Na+ reabsorption (and H2O follows)",["Na+ reabsorption","H2O reabsorb","K+ reabsorb","Ca2+ reabsorb"],"From adrenal cortex","Na+/K+ ATPase in DCT and collecting duct"); },
    function () { return makeBioQ("Urea: where is it produced?","Liver (ornithine/urea cycle)",["Kidney","Liver","Pancreas","Lungs"],"NH3 -> urea (less toxic)","Urea cycle occurs in liver mitochondria/cytosol"); },
    function () { return makeBioQ("Juxtaglomerular apparatus (JGA) secretes?","Renin (regulates BP)",["Renin","ADH","Aldosterone","ANP"],"Renin-angiotensin system","Responds to low BP, low Na+"); },
    function () { return makeBioQ("Atrial natriuretic peptide (ANP): effect?","Decreases Na+ reabsorption (lowers BP)",["Increases Na+","Decreases Na+","Increases H2O","Decreases K+"],"From heart atria, opposes aldosterone","Promotes Na+ and water excretion"); },
    function () { return makeBioQ("Diabetes insipidus: deficiency of?","ADH (polidipsia, polyuria)",["Insulin","ADH","Glucagon","Thyroid"],"Excessive thirst and dilute urine","Not related to blood sugar"); },
    function () { return makeBioQ("Micturition: controlled by?","Both autonomic and voluntary nervous system",["Autonomic only","Voluntary only","Both","Somatic"],"Urination reflex","Posterior urethral sphincter voluntary"); },
    function () { return makeBioQ("Kidney stones (renal calculi): common type?","Calcium oxalate crystals",["Uric acid","Calcium oxalate","Phosphate","Cystine"],"Crystallization of minerals in urine","Dehydration, diet factors contribute"); },
    function () { return makeBioQ("Dialysis: used for?","Artificial kidney (remove wastes when kidneys fail)",["Kidney failure","Liver failure","Heart failure","Lung disease"],"Hemodialysis vs peritoneal dialysis","Blood filtered through semipermeable membrane"); },
    function () { return makeBioQ("Ureters connect?","Kidney to urinary bladder",["Bladder to urethra","Kidney to bladder","Kidney to urethra","Bladder to kidney"],"Carry urine from kidney","Peristaltic movement propels urine"); },
    function () { return makeBioQ("Glomerulus: afferent vs efferent arteriole?","Afferent wider (creates filtration pressure)",["Afferent wider","Efferent wider","Same size","No difference"],"High pressure for filtration","Afferent: blood in, Efferent: blood out"); }
  ];

  GENERATORS.biology.human_neural = [
    function () { return makeBioQ("Neuron: functional unit of?","Nervous system",["Muscle","Nervous system","Endocrine","Circulatory"],"Transmits electrical signals","~86 billion neurons in human brain"); },
    function () { return makeBioQ("Resting membrane potential of neuron?","-70 mV",["-70","+30","0","+70"],"Inside negative relative to outside","Na+/K+ ATPase maintains gradient (3 Na+ out, 2 K+ in)"); },
    function () { return makeBioQ("Action potential: initial depolarization due to?","Na+ influx (voltage-gated Na+ channels open)",["K+ out","Na+ in","Ca2+ in","Cl- in"],"Rapid depolarization from -70 to +30 mV","Na+ channels inactivate, then K+ channels open"); },
    function () { return makeBioQ("Synapse: neurotransmitter released from?","Presynaptic terminal (synaptic vesicles)",["Dendrite","Axon terminal","Cell body","Node of Ranvier"],"Chemical transmission","Ca2+ influx triggers vesicle fusion"); },
    function () { return makeBioQ("Myelin sheath produced by?","Oligodendrocytes (CNS) and Schwann cells (PNS)",["Astrocytes","Oligodendrocytes","Microglia","Ependymal"],"Insulates axons, speeds conduction","Saltatory conduction at nodes of Ranvier"); },
    function () { return makeBioQ("Cerebrum: largest part of brain, controls?","Voluntary actions, cognition, speech",["Vision","Balance","Voluntary actions","Heart rate"],"Divided into 4 lobes","Frontal, parietal, temporal, occipital lobes"); },
    function () { return makeBioQ("Cerebellum function?","Balance, coordination of movement",["Balance","Memory","Speech","Vision"],"Coordination of voluntary movements","Damage causes ataxia (loss of coordination)"); },
    function () { return makeBioQ("Medulla oblongata controls?","Autonomic functions (breathing, heart rate, BP)",["Voluntary movement","Autonomic functions","Memory","Coordination"],"Center for vital functions","Contains respiratory, cardiac, vasomotor centers"); },
    function () { return makeBioQ("Hypothalamus function?","Homeostasis, temperature regulation, hunger, thirst",["Memory","Homeostasis","Balance","Vision"],"Master endocrine regulator","Links nervous and endocrine systems via pituitary"); },
    function () { return makeBioQ("Reflex arc: monosynaptic example?","Knee-jerk reflex (patellar)",["Pain withdrawal","Knee-jerk","Eye blink","Salivation"],"No interneuron directly synapse","Sensory neuron -> motor neuron -> response"); },
    function () { return makeBioQ("Neurotransmitter for muscle contraction?","Acetylcholine (ACh)",["Dopamine","Serotonin","ACh","GABA"],"Neuromuscular junction","ACh binds to nicotinic receptors on muscle"); },
    function () { return makeBioQ("Dopamine: associated with?","Parkinson disease (deficiency), Schizophrenia (excess)",["Alzheimers","Parkinson","Huntingtons","Depression"],"Neurotransmitter in basal ganglia","Dopamine deficiency -> motor symptoms"); },
    function () { return makeBioQ("PNS: cranial nerves count in humans?","12 pairs",["8","12","31","24"],"Connect brain to periphery","Sensory, motor, mixed nerves"); },
    function () { return makeBioQ("PNS: spinal nerves count in humans?","31 pairs",["12","31","24","8"],"Connect spinal cord to body","8 cervical, 12 thoracic, 5 lumbar, 5 sacral, 1 coccygeal"); },
    function () { return makeBioQ("Autonomic nervous system: sympathetic = ?","Fight or flight (noradrenaline)",["Rest & digest","Fight & flight","Both","Neither"],"Prepares body for stress","Increases HR, BP, dilates pupils, inhibits digestion"); }
  ];

  GENERATORS.biology.human_endocrine = [
    function () { return makeBioQ("Master endocrine gland?","Pituitary (hypophysis)",["Thyroid","Pituitary","Adrenal","Pancreas"],"Controls other endocrine glands","Anterior pituitary: 6 hormones, Posterior: 2"); },
    function () { return makeBioQ("Growth hormone (GH) deficiency causes?","Dwarfism (normal proportions)",["Gigantism","Dwarfism","Acromegaly","Cretinism"],"GH from anterior pituitary","Excess causes gigantism in children, acromegaly in adults"); },
    function () { return makeBioQ("Thyroid hormone (T3, T4) deficiency in children?","Cretinism (stunted growth, mental retardation)",["Goiter","Myxedema","Cretinism","Hashimoto"],"Hypothyroidism in children","Iodine deficiency causes goiter and cretinism"); },
    function () { return makeBioQ("Parathyroid hormone (PTH): effect on blood Ca?","Increases Ca2+ (bone resorption, kidney reabsorption)",["Increases Ca","Decreases Ca","Has no effect","Decreases P"],"Regulates Ca2+ homeostasis","Opposite of calcitonin from thyroid"); },
    function () { return makeBioQ("Insulin: produced by?","Beta cells of pancreatic islets",["Alpha cells","Beta cells","Delta cells","PP cells"],"Lowers blood glucose","Promotes glucose uptake by cells, glycogenesis"); },
    function () { return makeBioQ("Glucagon: effect on blood glucose?","Increases glucose (glycogenolysis)",["Increases","Decreases","No effect","Regulates"],"From alpha cells of pancreas","Opposite action to insulin"); },
    function () { return makeBioQ("Adrenaline (epinephrine): effect?","Increases HR, BP, dilates airways (fight/flight)",["Decreases HR","Increases HR","Decreases BP","Constricts airways"],"From adrenal medulla","Also increases blood glucose for energy"); },
    function () { return makeBioQ("Cortisol: steroid hormone from?","Adrenal cortex (stress hormone)",["Adrenal cortex","Adrenal medulla","Thyroid","Pancreas"],"Increases blood sugar, suppresses immune","High levels: Cushing syndrome"); },
    function () { return makeBioQ("Testosterone: produced in?","Leydig cells of testes",["Sertoli cells","Leydig cells","Seminiferous","Prostate"],"Male sex hormone (androgen)","Responsible for male secondary sex characteristics"); },
    function () { return makeBioQ("Estrogen: produced by?","Ovarian follicles (theca/granulosa cells)",["Ovaries","Adrenal","Placenta","All"],"Female sex hormone","Responsible for female secondary sex characteristics"); },
    function () { return makeBioQ("Melatonin: produced by?","Pineal gland (regulates sleep-wake cycle)",["Pineal","Pituitary","Hypothalamus","Thyroid"],"Regulates circadian rhythm","High at night, low during day"); },
    function () { return makeBioQ("Oxytocin: role in?","Uterine contractions during childbirth, milk ejection",["Labor","Growth","Thyroid","Stress"],"Posterior pituitary hormone","Positive feedback mechanism in childbirth"); },
    function () { return makeBioQ("ACTH: target?","Adrenal cortex (stimulates cortisol release)",["Thyroid","Adrenal cortex","Gonads","Mammary"],"Adrenocorticotropic hormone","Pituitary responds to CRH from hypothalamus"); },
    function () { return makeBioQ("FSH in males: stimulates?","Spermatogenesis (Sertoli cells)",["Sperm production","Testosterone","Libido","Muscle growth"],"Follicle-stimulating hormone","Females: ovarian follicle development"); },
    function () { return makeBioQ("Prolactin: function?","Milk production (lactation)",["Milk ejection","Milk production","Growth","Metabolism"],"From anterior pituitary","Inhibited by dopamine (PIF)"); }
  ];

  GENERATORS.biology.human_reproduction = [
    function () { return makeBioQ("Male gamete produced in?","Seminiferous tubules of testes",["Epididymis","Seminiferous tubules","Vas deferens","Prostate"],"Spermatogenesis takes ~74 days","Takes place at 2-3 C lower than body temp"); },
    function () { return makeBioQ("Female gamete (ovum) released during?","Ovulation (day 14 of 28-day cycle)",["Menstruation","Ovulation","Luteal phase","Follicular phase"],"Mid-cycle LH surge triggers release","Released from Graafian follicle"); },
    function () { return makeBioQ("Fertilization typically occurs in?","Ampulla of fallopian tube",["Uterus","Fallopian tube","Ovary","Cervix"],"Sperm meets egg in ampulla","Zygote formation then travels to uterus"); },
    function () { return makeBioQ("Site of implantation?","Endometrium (uterine lining)",["Myometrium","Endometrium","Cervix","Ovary"],"Blastocyst attaches to uterine wall","Progesterone maintains endometrium for implantation"); },
    function () { return makeBioQ("Placenta: hormone it produces?","hCG, hPL, progesterone, estrogen",["hCG","FSH","LH","TSH"],"hCG detected in pregnancy tests","Human chorionic gonadotropin from syncytiotrophoblast"); },
    function () { return makeBioQ("Gametogenesis: process of?","Formation of gametes (sperm/ovum)",["Fertilization","Meiosis","Mitosis","Cleavage"],"Meiosis reduces chromosome number by half","Spermatogenesis: 4 sperm, Oogenesis: 1 ovum + 3 polar bodies"); },
    function () { return makeBioQ("Menstrual cycle: average length?","28 days",["21","28","35","30"],"Menstruation (days 1-5), Follicular (6-13), Ovulation (14), Luteal (15-28)","Varies from 21-35 days"); },
    function () { return makeBioQ("LH surge triggers?","Ovulation (release of secondary oocyte)",["Menstruation","Ovulation","Implantation","Lactation"],"Luteinizing hormone peak at day 14","Completes meiosis I of primary oocyte"); },
    function () { return makeBioQ("Corpus luteum secretes?","Progesterone (maintains pregnancy)",["Estrogen","Progesterone","Testosterone","hCG"],"Temporary endocrine gland","Degenerates if no pregnancy -> menstruation"); },
    function () { return makeBioQ("Acrosome of sperm contains?","Hydrolytic enzymes (to penetrate egg)",["DNA","Mitochondria","Enzymes","Nucleus"],"Enzymes digest zona pellucida","Acrosome reaction triggered by egg's chemical signals"); },
    function () { return makeBioQ("Tubectomy: what is cut?","Fallopian tubes (female sterilization)",["Fallopian tubes","Uterus","Ovaries","Vas deferens"],"Blocks egg transport","Prevents fertilization"); },
    function () { return makeBioQ("Vasectomy: what is cut?","Vas deferens (male sterilization)",["Epididymis","Vas deferens","Urethra","Testes"],"Blocks sperm transport","Does not affect testosterone production"); },
    function () { return makeBioQ("Lactation: hormone for milk production?","Prolactin (anterior pituitary)",["Oxytocin","Prolactin","Estrogen","Progesterone"],"Milk synthesis","Also requires cortisol, insulin, thyroid for full lactation"); },
    function () { return makeBioQ("Primary spermatocyte chromosome count?","46 (diploid, 2n)",["23","46","92","22"],"Undergoes meiosis I","-> secondary spermatocytes (23, haploid, n)"); },
    function () { return makeBioQ("Oogenesis: first polar body formed at?","Meiosis I completion (ovulation)",["Before birth","Ovulation","Fertilization","Puberty"],"Unequal division preserves cytoplasm in ovum","Second polar body formed at fertilization"); }
  ];
  GENERATORS.biology.ecology = [
    function () { return makeBioQ("Ecosystem: biotic + abiotic factors. Example?","Forest, pond, grassland, desert",["Forest","Population","Community","Biome"],"Interaction of living and non-living","Two components: biotic and abiotic"); },
    function () { return makeBioQ("Food chain: in an ecosystem, 10% energy?","Transferred to next trophic level (10% law)",["10%","50%","90%","1%"],"Lindeman trophic efficiency","~90% energy lost as heat at each level"); },
    function () { return makeBioQ("Primary producers in most ecosystems?","Plants (autotrophs - photosynthesis)",["Herbivores","Plants","Carnivores","Decomposers"],"Base of food chain","Convert solar energy to chemical energy"); },
    function () { return makeBioQ("Detritus food chain begins with?","Dead organic matter (detritus)",["Living plants","Dead matter","Herbivores","Carnivores"],"Decomposers break down detritus","Major energy flow in some ecosystems like mangroves"); },
    function () { return makeBioQ("Pyramid of biomass in seas?","Inverted (more zooplankton than phytoplankton)",["Upright","Inverted","Spindle","Same"],"Biomass per trophic level","Phytoplankton have rapid turnover but low standing crop"); },
    function () { return makeBioQ("Biogeochemical cycle: carbon cycle?","CO2 fixed -> organic -> respiration/decay -> CO2",["Carbon","Nitrogen","Phosphorous","Water"],"Atmospheric CO2 reservoir","Burning fossil fuels adds CO2"); },
    function () { return makeBioQ("Nitrogen cycle: nitrification?","NH4+ -> NO2- -> NO3- (Nitrosomonas, Nitrobacter)",["NH3->N2","N2->NH3","NH4->NO3","NO3->N2"],"Oxidation of ammonia to nitrate","Nitrifying bacteria are chemoautotrophs"); },
    function () { return makeBioQ("Ecological succession: climax community?","Final stable community (e.g., forest)",["Pioneer","Climax","Mid","All"],"Predictable sequence of community change","Hydrosere: pond -> forest; Xerosere: rock -> forest"); },
    function () { return makeBioQ("Biodiversity hotspot: criterion?",">1500 endemic plant species and >70% habitat loss",["High species count","Endemism+threat","Large area","Fossil records"],"34 hotspots globally","Western Ghats, Himalayas are Indian hotspots"); },
    function () { return makeBioQ("Keystone species: effect?","Disproportionate effect on ecosystem relative to abundance",["Predator","Keystone","Dominant","Indicator"],"Removal causes major changes","Example: Sea otters (control sea urchins)"); },
    function () { return makeBioQ("Biosphere reserves: zones?","Core + Buffer + Transition",["Core+Buffer","Core+Buffer+Transition","Only Core","Buffer+Core"],"Conservation + sustainable use","Core: strictly protected, Buffer: limited use"); },
    function () { return makeBioQ("Greenhouse gases: major?","CO2, CH4, N2O, CFCs, H2O vapor",["CO2 only","Multiple gases","O2","N2"],"CO2 biggest anthropogenic contributor","Enhanced greenhouse effect -> global warming"); },
    function () { return makeBioQ("Ozone depletion: main cause?","CFCs (release Cl atoms that catalyze O3 breakdown)",["CO2","CFCs","CH4","SO2"],"Each Cl can destroy ~100,000 O3 molecules","Montreal Protocol (1987) phased out CFCs"); },
    function () { return makeBioQ("Eutrophication: caused by?","Excess nutrients (N, P) from fertilizers -> algal blooms",["Oil spill","Fertilizers","Acid rain","Pesticides"],"Algal bloom -> deoxygenation -> dead zones","Hypoxic conditions kill aquatic life"); },
    function () { return makeBioQ("Biomagnification: example?","DDT concentration increases up food chain",["Mercury","DDT","CO2","SO2"],"Toxic substance concentration increases","Top predators affected most (birds: eggshell thinning)"); }
  ];

  GENERATORS.biology.biotechnology = [
    function () { return makeBioQ("Genetic engineering: cutting DNA with?","Restriction enzymes (endonucleases)",["Ligase","Restriction enzymes","Polymerase","Helicase"],"Recognize palindromic sequences","Sticky ends vs blunt ends"); },
    function () { return makeBioQ("rDNA technology: vector commonly used?","Plasmid (small circular DNA in bacteria)",["Virus","Plasmid","Chromosome","Phage"],"pBR322: one of first plasmids","Has ampicillin and tetracycline resistance genes"); },
    function () { return makeBioQ("PCR: each cycle doubles DNA. After 30 cycles?","~1 billion copies (2^30)",["1000","10^6","10^9","10^3"],"Denaturation-94C, Annealing-55C, Extension-72C","Taq polymerase from Thermus aquaticus"); },
    function () { return makeBioQ("Gene therapy: example?","SCID (severe combined immunodeficiency)",["Cancer","SCID","Diabetes","AIDS"],"ADA deficiency treated with retroviral vector","First successful gene therapy in 1990"); },
    function () { return makeBioQ("Bt cotton: resistance to?","Insect pests (bollworm)",["Virus","Fungi","Insects","Herbicides"],"Cry genes from Bacillus thuringiensis","Cry proteins toxic to specific insects"); },
    function () { return makeBioQ("Golden rice: enriched with?","Beta-carotene (Vitamin A precursor)",["Iron","Beta-carotene","Protein","Zinc"],"Prevent Vitamin A deficiency blindness","Created by Ingo Potrykus"); },
    function () { return makeBioQ("ELISA: used to detect?","Antibodies or antigens (HIV test)",["DNA","Proteins","Antibodies","Cells"],"Enzyme-Linked Immunosorbent Assay","Uses enzyme-substrate color change reaction"); },
    function () { return makeBioQ("Monoclonal antibodies: produced by?","Hybridoma technology (B cell + myeloma fusion)",["B cells","Hybridoma","T cells","Stem cells"],"Kohler & Milstein 1975","Used in diagnostics, targeted therapy"); },
    function () { return makeBioQ("DNA fingerprinting: used for?","Forensic identification (VNTR/STR analysis)",["Gene therapy","Identification","Cloning","Sequencing"],"Alec Jeffreys 1984","Highly variable regions in non-coding DNA"); },
    function () { return makeBioQ("Bioremediation: example?","Oil spill cleanup using microbes",["Oil clean","Fertilizer","Water treat","Waste"],"Pseudomonas putida degrades oil","Also used for heavy metal removal"); },
    function () { return makeBioQ("Genomic library: collection of?","Entire genome fragments cloned in vectors",["Genes","Genome fragments","Proteins","Cells"],"Represent all DNA sequences","cDNA library: from mRNA (no introns)"); },
    function () { return makeBioQ("RNA interference (RNAi): silences?","Gene expression (blocks mRNA translation)",["DNA","mRNA","Protein","Enzyme"],"dsRNA triggers degradation of target mRNA","Used in pest-resistant plants"); },
    function () { return makeBioQ("CRISPR-Cas9: what is it?","Gene editing technology (clustered regular interspaced palindromic repeats)",["Cloning","Gene editing","PCR","Sequencing"],"Cas9 nuclease cuts DNA at guide RNA target","Revolutionary for precise genome editing"); },
    function () { return makeBioQ("Stem cells: key property?","Self-renewal + differentiation potential",["Divide rapidly","Self-renew+differentiate","Produce antibodies","Kill pathogens"],"Embryonic stem cells are pluripotent","Induced pluripotent stem cells (iPS) from adult cells"); },
    function () { return makeBioQ("Biopiracy: what is it?","Misappropriation of indigenous biological resources/ knowledge",["Stealing genes","Bio theft","Patent piracy","All above"],"Unauthorized use of traditional knowledge","Neem, Turmeric patent controversies"); }
  ];

  GENERATORS.biology.diversity = [
    function () { return makeBioQ("Five kingdom classification by?","Whittaker (1969)",["Linnaeus","Whittaker","Haeckel","Woese"],"Monera, Protista, Fungi, Plantae, Animalia","Based on cell structure, body organization, nutrition, reproduction, phylogeny"); },
    function () { return makeBioQ("Binomial nomenclature: genus and species?","Systema Naturae by Linnaeus",["Darwin","Linnaeus","Mendel","Haeckel"],"Genus starts with capital, species lowercase, italicized","Homo sapiens: Homo=genus, sapiens=species"); },
    function () { return makeBioQ("Bacteria: prokaryotic. Shape?","Cocci (round), Bacilli (rod), Spirilla (spiral)",["Round only","Rod only","Round/Rod/Spiral","Variable"],"Prokaryotic, no nuclear membrane","Cell wall contains peptidoglycan"); },
    function () { return makeBioQ("Virus: living or non-living?","Inert outside host, replicate inside living cells",["Living","Non-living","Both","Neither"],"Obligate intracellular parasites","Have DNA or RNA, protein coat (capsid)"); },
    function () { return makeBioQ("Fungi: mode of nutrition?","Heterotrophic (saprophytic/parasitic/symbiotic)",["Autotrophic","Heterotrophic","Mixotrophic","Chemotrophic"],"Cell wall of chitin","Yeast (unicellular), Mushroom (multicellular)"); },
    function () { return makeBioQ("Plant kingdom classification: basis?","Thallus, vascular system, seeds, flowers",["Leaf shape","Complexity","Cell type","Size"],"Thallophyta, Bryophyta, Pteridophyta, Gymnosperms, Angiosperms","Increasing complexity from algae to flowering plants"); },
    function () { return makeBioQ("Animal kingdom: largest phylum?","Arthropoda (insects, crustaceans, arachnids)",["Mollusca","Arthropoda","Chordata","Annelida"],"Joint appendages, exoskeleton of chitin","~80% of all known animal species"); },
    function () { return makeBioQ("Chordata: key feature?","Notochord, dorsal hollow nerve cord, pharyngeal gill slits",["Backbone","Notochord","Brain","Limbs"],"At some life stage","Vertebrata: backbone present, Protochordata: absent"); },
    function () { return makeBioQ("Mammalia: unique feature?","Mammary glands, hair, 4-chambered heart",["Hair","Mammary glands","Warm-blooded","Live birth"],"Feed young with milk","Placental, marsupial, monotreme groups"); },
    function () { return makeBioQ("Aves: adaptations for flight?","Wings, feathers, hollow bones, air sacs",["Wings","Feathers","Hollow bones","All above"],"Endothermic (warm-blooded)","Beak without teeth, no urinary bladder"); },
    function () { return makeBioQ("Reptilia: characteristic?","Dry scaly skin, terrestrial, cold-blooded",["Moist skin","Scaly skin","Feathers","Fur"],"First fully terrestrial vertebrates","Snakes, lizards, turtles, crocodiles"); },
    function () { return makeBioQ("Amphibia: characteristic?","Moist skin, aquatic+terrestrial life cycle",["Dry skin","Moist skin","Feathers","Scales"],"Live in water and land","Frogs, toads, salamanders"); },
    function () { return makeBioQ("Pisces (fish): gas exchange via?","Gills",["Lungs","Gills","Skin","Trachea"],"Fins for locomotion, scales for protection","Cartilaginous vs bony fish"); },
    function () { return makeBioQ("Angiosperms: divided into?","Monocots and Dicots",["Gymnosperms","Monocots/Dicots","Algae/Bryophytes","Vascular/Non-vascular"],"Flowering plants","Monocot: 1 cotyledon, Dicot: 2 cotyledons"); },
    function () { return makeBioQ("Biodiversity: highest in?","Tropical rainforests (equatorial regions)",["Desert","Tropical rainforest","Temperate","Arctic"],"Species richness peaks in tropics","Latitudinal gradient of biodiversity"); }
  ];
  // ==================== MATH ====================

  GENERATORS.math.algebra_quadratic = [
    function () { var a=rand(1,5); var b=rand(-10,10); var c=rand(-10,10); var D=b*b-4*a*c; return {q:'Discriminant of '+a+'x^2+'+b+'x+'+c+'?',a:D+'',hint:'D = b^2 - 4ac',solution:'D = '+b+'^2 - 4*'+a+'*'+c+' = '+D}; },
    function () { var a=rand(1,5); var b=rand(-10,10); var c=rand(-10,10); var D=b*b-4*a*c; return {q:'Nature of roots of '+a+'x^2+'+b+'x+'+c+'?',a:D>0?'Real & distinct':(D===0?'Real & equal':'Imaginary'),hint:'Check discriminant'}; },
    function () { var r1=rand(-5,5); var r2=rand(-5,5); while(r2===r1)r2=rand(-5,5); return {q:'Quadratic with roots '+r1+', '+r2+'?',a:'x^2 - '+(r1+r2)+'x + '+(r1*r2),hint:'x^2 - Sx + P = 0',solution:'Sum='+(r1+r2)+', Product='+(r1*r2)}; },
    function () { var a=rand(1,5); var b=rand(-8,8); var c=rand(-8,8); var alpha=(-b+Math.sqrt(b*b-4*a*c))/(2*a); var beta=(-b-Math.sqrt(b*b-4*a*c))/(2*a); return {q:'Roots of '+a+'x^2+'+b+'x+'+c+'? (approx)',a:alpha.toFixed(2)+', '+beta.toFixed(2),hint:'x = [-b +/- sqrt(D)]/2a'}; },
    function () { var a=rand(1,3); var r=rand(1,5); return {q:'Sum of roots of '+a+'x^2 - '+(a*r)+'x + 2?',a:r+'',hint:'Sum = -b/a',solution:'Sum = -(-'+(a*r)+')/'+a+' = '+r}; },
    function () { var a=rand(1,4); var r1=rand(1,4); var r2=rand(-4,-1); return {q:'Product of roots of '+a+'x^2 + '+(a*-(r1+r2))+'x +'+(a*r1*r2)+'?',a:(r1*r2)+'',hint:'Product = c/a'}; },
    function () { var p=rand(1,5); var q=rand(1,5); return {q:'If alpha, beta roots of x^2 - '+p+'x + '+q+'=0. alpha+beta?',a:p+'',hint:'Sum of roots = -b/a'}; },
    function () { var p=rand(2,6); var q=rand(2,6); return {q:'If alpha, beta roots of x^2 - '+p+'x + '+q+'=0. alpha*beta?',a:q+'',hint:'Product = c/a'}; },
    function () { var a=rand(1,4); var b=rand(2,8); var c=rand(1,6); var D=b*b-4*a*c; return {q:'Equation '+a+'x^2+'+b+'x+'+c+'=0. D and nature?',a:D>0?'Real ('+D.toFixed(0)+')':(D===0?'Real & equal':'Imaginary'),hint:'D = b^2-4ac'}; },
    function () { var k=rand(1,5); return {q:'x^2 + '+k+'x + 1 = 0. For equal roots, condition?',a:'D=0 => '+k+'^2 = 4 => k=+/-2',hint:'b^2 = 4ac always for equal roots'}; },
    function () { var a=rand(1,3); var b=rand(1,5); return {q:'Roots of '+a+'x^2+'+(a*b)+'x=0?',a:'0 and -'+b,hint:'Factor x common',solution:'x('+a+'x+'+(a*b)+')=0 => x=0 or x=-'+b}; },
    function () { var r=rand(2,5); return {q:'Quadratic with double root '+r+'?',a:'x^2 - '+(2*r)+'x + '+(r*r),hint:'(x-r)^2 = x^2 - 2rx + r^2'}; },
    function () { var a=rand(1,4); var b=rand(1,6); var c=rand(1,8); return {q:'For '+a+'x^2+'+b+'x+'+c+'=0, sum & product of reciprocals?',a:'Sum='+(-b/c)+', Prod='+(a/c),hint:'New roots: 1/alpha+1/beta = (alpha+beta)/alpha*beta'}; },
    function () { var a=rand(1,4); var b=rand(2,8); var c=rand(1,5); return {q:'Minimum value of '+a+'x^2+'+b+'x+'+c+'?',a:((4*a*c-b*b)/(4*a)).toFixed(2),hint:'Min at x=-b/2a, value = -D/4a'}; },
    function () { var a=rand(1,3); var r=rand(1,5); var s=rand(1,5); while(s===r)s=rand(1,5); return {q:'Quadratic with sum '+r+' and product '+s+'?',a:'x^2 - '+r+'x + '+s+' = 0',hint:'x^2 - Sx + P = 0'}; }
  ];

  GENERATORS.math.algebra_sequences = [
    function () { var a=rand(1,10); var d=rand(2,8); var n=rand(5,15); return {q:'AP: first term '+a+', common diff '+d+'. '+n+'th term?',a:(a+(n-1)*d)+'',hint:'an = a + (n-1)d',solution:'a'+n+' = '+a+' + ('+(n-1)+')*'+d+' = '+(a+(n-1)*d)}; },
    function () { var a=rand(1,10); var d=rand(2,8); var n=rand(5,15); return {q:'AP: a='+a+', d='+d+'. Sum of first '+n+' terms?',a:((n/2)*(2*a+(n-1)*d))+'',hint:'Sn = n/2[2a+(n-1)d]',solution:'Sn = '+n+'/2[2*'+a+' + ('+(n-1)+')*'+d+'] = '+(n/2*(2*a+(n-1)*d))}; },
    function () { var a=rand(1,5); var r=rand(2,4); var n=rand(4,8); return {q:'GP: a='+a+', r='+r+'. '+n+'th term?',a:(a*Math.pow(r,n-1))+'',hint:'an = a*r^(n-1)'}; },
    function () { var a=rand(1,5); var r=rand(2,4); var n=rand(4,8); return {q:'GP: a='+a+', r='+r+', n='+n+'. Sum?',a:Math.round(a*(Math.pow(r,n)-1)/(r-1))+'',hint:'Sn = a(r^n-1)/(r-1)'}; },
    function () { var a=rand(1,10); var d=rand(1,5); var n=rand(5,12); return {q:'AP: sum of first '+n+' terms = '+(n/2*(2*a+(n-1)*d))+'. Find a?',a:a+'',hint:'Sn = n/2[2a+(n-1)d]'}; },
    function () { var a=rand(1,5); var r=rand(2,4); return {q:'Infinite GP: a='+a+', r='+(1/r).toFixed(2)+'. S_inf?',a:(a/(1-1/r)).toFixed(1),hint:'S_inf = a/(1-r) for |r|<1'}; },
    function () { var a=rand(1,6); var d=rand(2,5); var n=rand(4,10); return {q:'AP: '+(a)+', '+(a+d)+', '+(a+2*d)+', ... Which term = '+(a+(n-1)*d)+'?',a:n+'th',hint:'an = a+(n-1)d'}; },
    function () { var a=rand(2,8); var d=rand(2,5); var A=a+d; return {q:'AM of '+a+' and '+(a+2*d)+'?',a:A+'',hint:'AM = (a+b)/2',solution:'AM = ('+a+'+'+(a+2*d)+')/2 = '+A}; },
    function () { var a=rand(1,5); var b=rand(16,25); return {q:'GM of '+a+' and '+b+'?',a:Math.round(Math.sqrt(a*b))+'',hint:'GM = sqrt(a*b)'}; },
    function () { var a=rand(1,5); var d=rand(1,4); var n=rand(5,10); return {q:'AP: a='+a+', d='+d+'. Sum from '+rand(2,4)+'th to '+n+'th term?',a:(n/2*(2*a+(n-1)*d)-(rand(2,4)-1)/2*(2*a+(rand(2,4)-2)*d))+'',hint:'Use Sn - Sm'}; },
    function () { var a=rand(1,5); var r=rand(2,4); return {q:'GP: a='+a+', r='+r+'. Which term = '+(a*Math.pow(r,4))+'?',a:'5th',hint:'an = a*r^(n-1)'}; },
    function () { var n=rand(5,15); return {q:'Sum of first '+n+' natural numbers?',a:(n*(n+1)/2)+'',hint:'Sum = n(n+1)/2'}; },
    function () { var n=rand(5,15); return {q:'Sum of squares of first '+n+' natural numbers?',a:(n*(n+1)*(2*n+1)/6)+'',hint:'Sum = n(n+1)(2n+1)/6'}; },
    function () { var n=rand(5,12); return {q:'Sum of cubes of first '+n+' natural numbers?',a:Math.pow(n*(n+1)/2,2)+'',hint:'Sum = [n(n+1)/2]^2'}; },
    function () { var a=rand(1,10); return {q:'Sequence: '+a+', '+(a+3)+', '+(a+6)+', ... Type?',a:'AP (common diff = 3)',hint:'Check difference between consecutive terms'}; }
  ];

  GENERATORS.math.algebra_binomial = [
    function () { var n=rand(2,6); return {q:'Number of terms in expansion of (x+y)^'+n+'?',a:(n+1)+'',hint:'Terms = n+1'}; },
    function () { var n=rand(3,6); return {q:'Middle term(s) in (x+y)^'+n+'?',a:n%2===0?'One (term '+(n/2+1)+')':'Two (terms '+(Math.floor(n/2)+1)+' & '+(Math.ceil(n/2)+1)+')',hint:'One middle if n even, two if odd'}; },
    function () { var n=rand(2,5); var k=rand(0,n); return {q:'C('+n+','+k+')?',a:''+function(n,k){var r=1;for(var i=1;i<=k;i++)r=r*(n-i+1)/i;return r}(n,k),hint:'nCk = n!/(k!(n-k)!)'}; },
    function () { var n=rand(2,5); return {q:'Sum of binomial coefficients of (1+x)^'+n+'?',a:Math.pow(2,n)+'',hint:'Sum nCr = 2^n'}; },
    function () { var n=rand(3,6); return {q:'Coefficient of x^2 in (1+x)^'+n+'?',a:function(n,k){var r=1;for(var i=1;i<=k;i++)r=r*(n-i+1)/i;return r}(n,2),hint:'C(n,2) * 1^(n-2)'}; },
    function () { var n=rand(2,5); return {q:'C('+n+',0) + C('+n+',1) + ... + C('+n+','+n+')?',a:Math.pow(2,n)+'',hint:'Sum nCr = 2^n'}; },
    function () { var n=rand(3,6); return {q:'Coefficient of x^'+rand(1,n-1)+' in (1+x)^'+n+'?',a:'nCk = '+(function(n,k){var r=1;for(var i=1;i<=k;i++)r=r*(n-i+1)/i;return r})(n,rand(1,n-1)),hint:'Use binomial theorem: C(n,k)'}; },
    function () { var n=rand(3,7); return {q:'Constant term in (x + 1/x)^'+n+'?',a:n%2!==0?'No constant term':''+function(n,k){var r=1;for(var i=1;i<=k;i++)r=r*(n-i+1)/i;return r}(n,n/2),hint:'General term: C(n,r)*x^(n-2r). Set n-2r=0 => r=n/2'}; },
    function () { var n=rand(3,6); var a=rand(1,3); return {q:'Coefficient of x^2 in ('+a+'x+1)^'+n+'?',a:function(n,k,v){var r=1;for(var i=1;i<=k;i++)r=r*(n-i+1)/i;return r*Math.pow(v,k)}(n,2,a)+'',hint:'C(n,2)*a^2'}; },
    function () { var n=rand(4,8); return {q:'Largest binomial coefficient in (1+x)^'+n+'?',a:'C('+n+','+Math.floor(n/2)+')',hint:'Middle term has max coefficient'}; },
    function () { var n=rand(3,6); return {q:'C('+n+',0) - C('+n+',1) + C('+n+',2) - ... +/- C('+n+','+n+')?',a:'0',hint:'Alternating sum of nCr = 0'}; },
    function () { var n=rand(3,6); return {q:'(1+x)^'+n+': sum of even-positioned coefficients?',a:Math.pow(2,n-1)+'',hint:'Sum_{even} nCr = 2^(n-1)'}; },
    function () { var n=rand(2,5); return {q:'C('+n+',1) + C('+n+',2) + ... + C('+n+','+n+')?',a:(Math.pow(2,n)-1)+'',hint:'Sum = 2^n - C(n,0) = 2^n - 1'}; },
    function () { var n=rand(3,6); return {q:'Number of terms in (a+b+c)^'+n+'?',a:((n+1)*(n+2)/2)+'',hint:'Number of terms = C(n+2,2)'}; },
    function () { var n=rand(3,6); return {q:'General term of (x+y)^'+n+'?',a:'T_(r+1) = C('+n+',r)*x^('+(n)+'-r)*y^r',hint:'T_(r+1) = C(n,r)*x^(n-r)*y^r'}; }
  ];

  GENERATORS.math.algebra_pnc = [
    function () { var n=rand(3,6); return {q:'P('+n+',2)?',a:(n*(n-1))+'',hint:'P(n,r) = n!/(n-r)!'}; },
    function () { var n=rand(3,6); return {q:'C('+n+',2)?',a:(n*(n-1)/2)+'',hint:'C(n,r) = n!/(r!(n-r)!)'}; },
    function () { var n=rand(4,7); return {q:'Number of ways to arrange '+n+' distinct items?',a:function(n){var f=1;for(var i=2;i<=n;i++)f*=i;return f}(n)+'',hint:'n! ways'}; },
    function () { var n=rand(4,6); return {q:'Number of 2-letter words from '+n+' distinct letters?',a:(n*(n-1))+'',hint:'P(n,2) = n*(n-1)'}; },
    function () { var n=rand(4,8); return {q:'Number of subsets of a set with '+n+' elements?',a:Math.pow(2,n)+'',hint:'2^n subsets (including empty set)'}; },
    function () { var n=rand(5,8); return {q:'From '+n+' people, choose 3 for committee. Ways?',a:(function(n,k){var r=1;for(var i=1;i<=k;i++)r=r*(n-i+1)/i;return r})(n,3)+'',hint:'C(n,3)'}; },
    function () { var n=rand(4,6); return {q:'Arrange '+n+' books on a shelf. If 2 books must be together?',a:(function(n){var f=1;for(var i=2;i<=n-1;i++)f*=i;return f*2})(n)+'',hint:'Treat 2 books as 1 unit, then arrange'}; },
    function () { var n=rand(5,8); return {q:'In how many ways can '+'ABCDEFGH'.slice(0,n)+' be arranged?',a:function(n){var f=1;for(var i=2;i<=n;i++)f*=i;return f}(n)+'',hint:'n! ways'}; },
    function () { var n=rand(4,7); return {q:'C('+n+',0)+C('+n+',1)+C('+n+',2)+...?',a:Math.pow(2,n)+'',hint:'Sum of nCr = 2^n'}; },
    function () { var n=rand(5,8); var r=rand(2,4); return {q:'Ways to form '+r+'-digit number from 1-'+n+' without repetition?',a:(function(n,k){var r=1;for(var i=0;i<k;i++)r*=(n-i);return r})(n,r)+'',hint:'P(n,r) = n*(n-1)*...*(n-r+1)'}; },
    function () { var n=rand(5,9); return {q:'Number of ways to select at least 1 from '+n+' items?',a:(Math.pow(2,n)-1)+'',hint:'2^n - 1 (exclude empty set)'}; },
    function () { var n=rand(4,7); return {q:'Circular arrangement of '+n+' distinct items?',a:(function(n){var f=1;for(var i=2;i<n;i++)f*=i;return f}(n))+'(='+(n-1)+'!)',hint:'(n-1)! for circular arrangements'}; },
    function () { var n=rand(4,6); return {q:'Ways to arrange word with '+n+' distinct letters?',a:function(n){var f=1;for(var i=2;i<=n;i++)f*=i;return f}(n)+'',hint:'n! for distinct letters'}; },
    function () { var m=rand(3,5); var n=rand(3,5); return {q:'From '+m+' boys and '+n+' girls, choose 1 boy and 1 girl?',a:(m*n)+'',hint:'m*n ways (multiplication principle)'}; },
    function () { var n=rand(5,8); var r=rand(2,4); return {q:'Ways to form '+'ABCDEFGH'.slice(0,n)+' taking '+r+' at a time?',a:(function(n,k){var r=1;for(var i=1;i<=k;i++)r=r*(n-i+1)/i;return r})(n,r)+'',hint:'C(n,r) = n!/(r!(n-r)!)'}; }
  ];

  GENERATORS.math.algebra_matrices = [
    function () { var a=rand(1,5); var b=rand(1,5); var c=rand(1,5); var d=rand(1,5); return {q:'Det of [[ '+a+','+b+' ]['+c+','+d+']]?',a:(a*d-b*c)+'',hint:'Determinant = ad - bc'}; },
    function () { var a=rand(1,4); var b=rand(1,4); var c=rand(1,4); var d=rand(1,4); return {q:'Inverse of [[ '+a+','+b+' ]['+c+','+d+']] exists if?',a:'Determinant != 0 (det='+(a*d-b*c)+')',hint:'Inverse exists if det != 0'}; },
    function () { var a=rand(1,5); var b=rand(1,5); var c=rand(1,5); var d=rand(1,5); return {q:'Trace of [[ '+a+','+b+' ]['+c+','+d+']]?',a:(a+d)+'',hint:'Trace = sum of diagonal elements'}; },
    function () { var a=rand(1,5); var b=rand(1,5); var c=rand(1,5); return {q:'Order of matrix A = ['+a+'x'+b+'] and B = ['+b+'x'+c+']. AB order?',a:(''+a+'x'+c),hint:'mxn * nxp = mxp'}; },
    function () { var a=rand(1,4); var b=rand(1,4); var c=rand(1,4); var d=rand(1,4); return {q:'Transpose of [[ '+a+','+b+' ]['+c+','+d+']]?',a:'[[ '+a+','+c+' ]['+b+','+d+']]',hint:'Swap rows and columns'}; },
    function () { var a=rand(1,5); var b=rand(1,5); var c=rand(1,5); var d=rand(1,5); return {q:'For A = [[ '+a+','+b+' ]['+c+','+d+']], A + A\'?',a:'[[ '+(2*a)+','+(b+c)+' ]['+(b+c)+','+(2*d)+']]',hint:'A = A_ij, A\' = A_ji. Sum elementwise'}; },
    function () { var a=rand(1,5); var b=rand(1,5); return {q:'If A = ['+a+'x'+b+'] and B = ['+b+'x'+a+'], AB exists?',a:'Yes (AB: '+a+'x'+a+')',hint:'Multiplication possible if cols A = rows B'}; },
    function () { var n=rand(2,4); return {q:'Identity matrix I_'+n+' has how many 1s?',a:n+'',hint:'Diagonal elements = 1, rest = 0'}; },
    function () { var a=rand(1,4); var b=rand(1,4); var c=rand(1,4); var d=rand(1,4); var k=rand(2,5); return {q:'kA for k='+k+', A=[[ '+a+','+b+' ]['+c+','+d+']]?',a:'[[ '+(k*a)+','+(k*b)+' ]['+(k*c)+','+(k*d)+']]',hint:'Multiply each element by k'}; },
    function () { var a=rand(2,5); return {q:'Sc [[ 1,'+a+' ]['+a+',1 ]] ?',a:'Symmetric (A = A\')',hint:'Symmetric if a_ij = a_ji'}; },
    function () { var a=rand(1,4); var b=rand(1,4); var c=rand(1,4); var d=rand(1,4); return {q:'A = [[ '+a+','+b+' ]['+c+','+d+']]. Find A^2?',a:'Compute: [[ '+(a*a+b*c)+','+(a*b+b*d)+' ]['+(c*a+d*c)+','+(c*b+d*d)+']]',hint:'Matrix multiplication: row*col'}; },
    function () { return {q:'Which matrix has det = ad - bc?',a:'2x2 matrix [[a,b],[c,d]]',hint:'Determinant formula for 2x2'}; },
    function () { var a=rand(1,5); var b=rand(1,5); var c=rand(1,5); var d=rand(1,5); return {q:'For A=[[ '+a+','+b+' ]['+c+','+d+']], |A|?',a:(a*d-b*c)+'',hint:'|A| = ad - bc'}; },
    function () { var a=rand(2,5); var b=rand(2,5); return {q:'If A is '+a+'x'+b+', A\' is?',a:(''+b+'x'+a),hint:'Transpose: rows become columns'}; },
    function () { var a=rand(1,4); var b=rand(1,4); return {q:'A=['+a+'x'+b+'] and B=['+b+'x'+a+']. (AB)\' = ?',a:'B\'A\'',hint:'(AB)\' = B\' A\''}; }
  ];

  GENERATORS.math.calculus_limits = [
    function () { var n=rand(1,5); return {q:'Lim x->'+n+' (x^2 - '+n+'^2)/(x-'+n+')?',a:(2*n)+'',hint:'Factor numerator: (x-n)(x+n)/(x-n) -> x+n -> 2n'}; },
    function () { var a=rand(1,4); return {q:'Lim x->0 sin('+a+'x)/x?',a:a+'',hint:'lim sin(ax)/x = a'}; },
    function () { var a=rand(1,4); return {q:'Lim x->0 (1 - cos('+a+'x))/x^2?',a:((a*a)/2)+'',hint:'1-cos(ax) ~ (a^2 x^2)/2'}; },
    function () { var a=rand(1,3); return {q:'Lim x->0 (e^('+a+'x)-1)/x?',a:a+'',hint:'lim (e^(ax)-1)/x = a'}; },
    function () { return {q:'Lim x->0 (1+x)^(1/x)?',a:'e',hint:'Standard limit = e'}; },
    function () { var n=rand(2,6); return {q:'Lim x->0 (tan('+n+'x))/x?',a:n+'',hint:'lim tan(nx)/x = n'}; },
    function () { var a=rand(1,4); return {q:'Lim x->inf (1 + '+a+'/x)^x?',a:'e^'+a,hint:'lim (1 + a/x)^x = e^a'}; },
    function () { var n=rand(2,5); return {q:'Lim x->0 (ln(1+'+n+'x))/x?',a:n+'',hint:'ln(1+nx)/x -> n'}; },
    function () { var a=rand(1,4); return {q:'Lim x->0 (e^x - 1)/x?',a:'1',hint:'Standard result = 1'}; },
    function () { var n=rand(2,6); return {q:'Lim x->'+n+' 1/(x-'+n+')?',a:'Infinite (tends to +/-inf)',hint:'Denominator -> 0'}; },
    function () { var a=rand(1,4); var b=rand(1,4); if(a===b)b++; return {q:'Lim x->0 (sin('+a+'x)/sin('+b+'x))?',a:(a/b).toFixed(2),hint:'= a/b using lim sin(ax)/x = a'}; },
    function () { var n=rand(2,5); return {q:'Lim n->inf (1+1/n)^n?',a:'e',hint:'Standard form of e'}; },
    function () { var a=rand(1,3); return {q:'Lim x->0 (sec x - 1)/x^2?',a:'1/2',hint:'sec x - 1 ~ x^2/2'}; },
    function () { var n=rand(2,6); return {q:'Lim x->0 (1 - cos '+n+'x)/x^2?',a:((n*n)/2)+'',hint:'1-cos(nx) ~ n^2 x^2/2'}; },
    function () { var a=rand(1,5); return {q:'Lim x->'+a+' (x^2 - '+(a*a)+')/(x - '+a+')?',a:(2*a)+'',hint:'= Limit of (x+a) = 2a'}; }
  ];

  GENERATORS.math.calculus_diff = [
    function () { var n=rand(2,6); return {q:'d/dx x^'+n+'?',a:''+(n)+'x^'+(n-1),hint:'d/dx x^n = n*x^(n-1)'}; },
    function () { var n=rand(2,6); return {q:'d/dx e^('+n+'x)?',a:''+n+'e^('+n+'x)',hint:'d/dx e^(kx) = k*e^(kx)'}; },
    function () { var n=rand(1,5); return {q:'d/dx sin('+n+'x)?',a:''+n+'cos('+n+'x)',hint:'d/dx sin(kx) = k*cos(kx)'}; },
    function () { var n=rand(1,5); return {q:'d/dx cos('+n+'x)?',a:''+(-n)+'sin('+n+'x)',hint:'d/dx cos(kx) = -k*sin(kx)'}; },
    function () { var n=rand(1,5); return {q:'d/dx tan('+n+'x)?',a:''+n+'sec^2('+n+'x)',hint:'d/dx tan(kx) = k*sec^2(kx)'}; },
    function () { var n=rand(1,4); return {q:'d/dx ln('+n+'x)?',a:'1/x',hint:'d/dx ln(kx) = 1/x'}; },
    function () { var n=rand(1,5); return {q:'d/dx ('+n+'x^3 - 2x)?',a:''+(3*n)+'x^2 - 2',hint:'Power rule: d/dx x^n = n*x^(n-1)'}; },
    function () { var n=rand(1,4); return {q:'d/dx sin^2('+n+'x)?',a:''+(2*n)+'sin('+n+'x)cos('+n+'x) = '+n+'sin('+(2*n)+'x)',hint:'Chain rule: 2 sin(kx)*k*cos(kx) = k*sin(2kx)'}; },
    function () { var a=rand(1,4); var b=rand(1,4); return {q:'d/dx ('+a+'x^2 + '+b+'x + 1)?',a:''+(2*a)+'x + '+b,hint:'d/dx (ax^2+bx+c) = 2ax+b'}; },
    function () { var n=rand(1,4); return {q:'d/dx sqrt('+n+'x)?',a:''+(n/(2*Math.sqrt(n*1))).toFixed(2)+'/sqrt(x) (approx)',hint:'d/dx sqrt(kx) = k/(2*sqrt(kx))'}; },
    function () { var n=rand(1,4); return {q:'d/dx (x^'+n+' + 1/x^'+n+')?',a:''+n+'x^'+(n-1)+' - '+n+'/x^'+(n+1),hint:'1/x^n = x^(-n), d/dx = -n*x^(-n-1)'}; },
    function () { var a=rand(1,4); var b=rand(1,4); return {q:'d/dx (sin x + cos x)?',a:'cos x - sin x',hint:'d(sin)/dx=cos, d(cos)/dx=-sin'}; },
    function () { var n=rand(1,4); return {q:'d/dx e^(x^'+n+')?',a:''+n+'x^'+(n-1)+'e^(x^'+n+')',hint:'Chain rule: e^u * du/dx'}; },
    function () { var a=rand(1,4); var b=rand(1,4); return {q:'d/dx ('+a+'x * sin x)?',a:''+a+'sin x + '+a+'x cos x',hint:'Product rule: (uv)\' = u\'v + uv\''}; },
    function () { var a=rand(1,4); return {q:'d/dx tan^-1('+a+'x)?',a:''+a+'/(1+'+(a*a)+'x^2)',hint:'d/dx arctan(ax) = a/(1+a^2 x^2)'}; }
  ];
  GENERATORS.math.calculus_application = [
    function () { var a=rand(1,4); var b=rand(1,4); return {q:'f(x)='+a+'x^2 + '+b+'x + 1. f\'(x) at x=1?',a:(2*a+b)+'',hint:'f\'(x)=2ax+b, plug x=1'}; },
    function () { var a=rand(1,4); var b=rand(1,4); return {q:'Slope of tangent to y='+a+'x^2+'+b+'x at x=2?',a:(4*a+b)+'',hint:'dy/dx = 2ax+b, evaluate at x=2'}; },
    function () { var a=rand(2,5); return {q:'Maxima or minima: f(x)=x^2 - '+a+'x + 1?',a:'Minimum (a>0, parabola opens up)',hint:'Second derivative test: f\'\'=2>0'}; },
    function () { var a=rand(2,5); var b=rand(2,5); return {q:'Rate of change: area of circle when r='+a+', dr/dt='+b+'?',a:(2*Math.PI*a*b).toFixed(2)+' units^2/s',hint:'dA/dt = 2*pi*r*dr/dt'}; },
    function () { var a=rand(2,5); var b=rand(2,5); return {q:'Increasing/decreasing: f(x)=x^3-'+a+'x at x='+b+'?',a:(3*b*b-a)>0?'Increasing':'Decreasing',hint:'f\'(x)=3x^2 - a, check sign at x'}; },
    function () { var a=rand(2,5); var b=rand(1,4); return {q:'Equation of tangent to y=x^2 at ('+a+','+(a*a)+')?',a:'y = '+(2*a)+'x - '+(a*a),hint:'y - y1 = m(x-x1), m=2x at x1'}; },
    function () { var a=rand(2,6); return {q:'f(x)=x^3 - '+a+'x^2. Maxima at?',a:'x=0 and x='+(2*a/3).toFixed(1),hint:'f\'(x)=3x^2-2ax=0 => x=0, x=2a/3'}; },
    function () { var r=rand(2,6); return {q:'Volume of sphere: rate of change when r='+r+', dr/dt=2?',a:(4*Math.PI*r*r*2).toFixed(1)+' units^3/s',hint:'dV/dt = 4*pi*r^2*dr/dt'}; },
    function () { var a=rand(2,5); return {q:'Approx value of sqrt('+(a*a+1)+') using differentiation?',a:(a+1/(2*a)).toFixed(3)+' (approx)',hint:'sqrt(a^2+h) ~ a + h/(2a)'}; },
    function () { var a=rand(2,5); return {q:'f(x)=x^3 - '+a+'x. Is f(x) increasing for x>'+a+'?',a:(3*a*a-a)>0?'Yes':'Check',hint:'f\'(x)=3x^2 - a, for x>sqrt(a/3), f\'>0'}; },
    function () { var a=rand(1,4); var b=rand(1,4); var c=rand(1,3); return {q:'f(x)='+a+'x^3 - '+b+'x. f\'\'(1)?',a:(6*a)+'',hint:'f\'\'(x)=6ax, evaluate at x=1'}; },
    function () { var a=rand(2,5); var b=rand(2,5); return {q:'Increasing: f(x)=sin x on [0,'+a+']?',a:Math.PI/2>a?'Varies':'Increasing on [0,pi/2]',hint:'f\'(x)=cos x, positive on [0, pi/2)'}; },
    function () { var a=rand(2,5); return {q:'f(x)=x^3-'+a+'x^2. f is concave up for?',a:'x > '+(a/3).toFixed(1),hint:'f\'\'(x)=6x-2a > 0 => x > a/3'}; },
    function () { var a=rand(2,5); return {q:'Find min of f(x)=x^2 + '+a+'/x for x>0?',a:'At x = '+(a/2).toFixed(2)+'^(1/3) (approx)',hint:'Set f\'(x)=2x - a/x^2 = 0 => x^3=a/2'}; },
    function () { var a=rand(2,5); return {q:'f(x)=x^2 - '+a+'x + 1. Minimum value?',a:((4*1-a*a)/(4)).toFixed(2),hint:'Min value = -D/4a = -(a^2-4)/4'}; }
  ];

  GENERATORS.math.calculus_integration = [
    function () { var n=rand(1,5); return {q:'∫ x^'+n+' dx?',a:'x^'+(n+1)+'/'+(n+1)+' + C',hint:'∫ x^n dx = x^(n+1)/(n+1) + C'}; },
    function () { var n=rand(1,5); return {q:'∫ e^('+n+'x) dx?',a:'e^('+n+'x)/'+n+' + C',hint:'∫ e^(kx) dx = e^(kx)/k + C'}; },
    function () { var n=rand(1,5); return {q:'∫ sin('+n+'x) dx?',a:'-cos('+n+'x)/'+n+' + C',hint:'∫ sin(kx) dx = -cos(kx)/k + C'}; },
    function () { var n=rand(1,5); return {q:'∫ cos('+n+'x) dx?',a:'sin('+n+'x)/'+n+' + C',hint:'∫ cos(kx) dx = sin(kx)/k + C'}; },
    function () { var a=rand(1,4); var b=rand(1,5); return {q:'∫_0^1 ('+a+'x + '+b+') dx?',a:((a/2)+b)+'',hint:'[ax^2/2 + bx] from 0 to 1'}; },
    function () { var n=rand(2,5); return {q:'∫_1^2 x^'+n+' dx?',a:((Math.pow(2,n+1)-Math.pow(1,n+1))/(n+1))+''.slice(0,6),hint:'[x^(n+1)/(n+1)] from 1 to 2'}; },
    function () { return {q:'∫ 1/x dx?',a:'ln|x| + C',hint:'∫ 1/x dx = ln|x| + C'}; },
    function () { var n=rand(1,5); return {q:'∫ sec^2('+n+'x) dx?',a:'tan('+n+'x)/'+n+' + C',hint:'∫ sec^2(kx) dx = tan(kx)/k + C'}; },
    function () { var n=rand(1,4); return {q:'∫ 1/(1+'+n*n+'x^2) dx?',a:'(1/'+n+')tan^-1('+n+'x) + C',hint:'∫ dx/(1+a^2x^2) = (1/a)tan^-1(ax)'}; },
    function () { var a=rand(1,4); var b=rand(1,4); return {q:'∫ 0^'+a+' ('+b+'x^2) dx?',a:((b/3)*Math.pow(a,3))+'',hint:'[b*x^3/3] from 0 to '+a}; },
    function () { var a=rand(1,4); return {q:'∫ e^'+a+'x dx from 0 to 1?',a:((Math.exp(a)-1)/a).toFixed(2),hint:'[e^(ax)/a] from 0 to 1'}; },
    function () { var a=rand(1,4); var b=rand(1,4); return {q:'Area under y='+a+'x from x=0 to x='+b+'?',a:((a*b*b)/2)+'',hint:'Area = ∫_0^b ax dx = a*b^2/2'}; },
    function () { var n=rand(2,4); return {q:'∫ csc('+n+'x)cot('+n+'x) dx?',a:'-csc('+n+'x)/'+n+' + C',hint:'∫ csc(kx)cot(kx) dx = -csc(kx)/k'}; },
    function () { return {q:'∫ 0^1 x dx?',a:'1/2',hint:'[x^2/2] from 0 to 1 = 1/2'}; },
    function () { var a=rand(1,4); return {q:'∫ 1/(1+x^2) dx?',a:'tan^-1 x + C',hint:'∫ dx/(1+x^2) = arctan x + C'}; }
  ];

  GENERATORS.math.calculus_differential = [
    function () { var n=rand(1,4); return {q:'dy/dx = '+n+'x. General solution?',a:'y = '+(n/2)+'x^2 + C',hint:'Integrate both sides w.r.t. x'}; },
    function () { var n=rand(2,5); return {q:'dy/dx = y. General solution?',a:'y = Ce^x',hint:'dy/y = dx, integrate'}; },
    function () { var n=rand(1,4); return {q:'dy/dx = -'+n+'y. General solution?',a:'y = Ce^('+(-n)+'x)',hint:'dy/y = -n dx, integrate'}; },
    function () { var n=rand(2,5); return {q:'d^2y/dx^2 = '+n+'. Solve?',a:'y = '+(n/2)+'x^2 + Cx + D',hint:'Integrate twice'}; },
    function () { var a=rand(1,4); return {q:'Order of diff eq: d^3y/dx^3 + '+a+'dy/dx + y = 0?',a:'3',hint:'Order = highest derivative (3)'}; },
    function () { var a=rand(1,4); var b=rand(1,4); return {q:'Degree of diff eq: (dy/dx)^'+a+' + y = 0?',a:a+'',hint:'Degree = power of highest derivative'}; },
    function () { var n=rand(1,5); return {q:'dP/dt = '+n+'P. P(0)=5. P(t)?',a:'P = 5e^('+n+'t)',hint:'Exponential growth: P = P0*e^(kt)'}; },
    function () { var n=rand(1,5); return {q:'dy/dx = '+n+'xy. Variable separable?',a:'Yes',hint:'dy/y = nx dx, separate variables'}; },
    function () { var a=rand(1,4); var b=rand(1,4); return {q:'Order of (d^2y/dx^2)^'+a+' + dy/dx = 0?',a:'2',hint:'Highest derivative is 2nd order'}; },
    function () { var n=rand(2,5); return {q:'Linear diff eq: dy/dx + P(x)y = Q(x). Integrating factor?',a:'e^(∫ P dx)',hint:'IF = e^(∫ P dx)'}; },
    function () { var n=rand(1,4); return {q:'dy/dx = '+n+'e^x. y(0)=0. y(1)?',a:(n*(Math.E-1)).toFixed(2),hint:'y = '+n+'e^x + C, find C from y(0)=0'}; },
    function () { var n=rand(1,4); return {q:'dy/dx = '+n+'y, y(0)=2. y at x=1?',a:(2*Math.exp(n)).toFixed(2),hint:'y = 2e^(nx), plug x=1'}; },
    function () { var a=rand(1,4); return {q:'Diff eq: (x^'+a+' + y)dx + x dy = 0. Exact?',a:'Check: dM/dy = 1, dN/dx = 1 => Exact',hint:'Exact if dM/dy = dN/dx'}; },
    function () { var n=rand(1,3); var m=rand(1,3); return {q:'Homogeneous: dy/dx = (x^'+n+' + y^'+m+')/(x^'+n+'). Put y=vx?',a:'Yes, homogeneous degree 0',hint:'Put y=vx, then dy/dx = v + x dv/dx'}; },
    function () { var n=rand(1,4); return {q:'Newton\'s law of cooling: dT/dt = -k(T-Ts). Solution?',a:'T = Ts + (T0-Ts)e^(-kt)',hint:'Temperature approaches surrounding temp exponentially'}; }
  ];

  GENERATORS.math.coordinate_geometry = [
    function () { var x1=rand(-5,5); var y1=rand(-5,5); var x2=rand(-5,5); var y2=rand(-5,5); if(x1===x2&&y1===y2){x2++;} return {q:'Distance between ('+x1+','+y1+') and ('+x2+','+y2+')?',a:Math.sqrt((x2-x1)*(x2-x1)+(y2-y1)*(y2-y1)).toFixed(2),hint:'Distance = sqrt((x2-x1)^2+(y2-y1)^2)'}; },
    function () { var x1=rand(-5,5); var y1=rand(-5,5); var x2=rand(-5,5); var y2=rand(-5,5); if(x1===x2&&y1===y2){x2++;} return {q:'Midpoint of ('+x1+','+y1+') and ('+x2+','+y2+')?',a:'('+((x1+x2)/2)+','+((y1+y2)/2)+')',hint:'Midpoint = ((x1+x2)/2, (y1+y2)/2)'}; },
    function () { var m=rand(-5,5); while(m===0)m=rand(-5,5); var c=rand(-5,5); return {q:'Slope of line y='+m+'x+'+c+'?',a:m+'',hint:'y=mx+c => slope = m'}; },
    function () { var x1=rand(-5,5); var y1=rand(-5,5); var m=rand(-3,3); while(m===0)m=rand(-3,3); return {q:'Equation of line through ('+x1+','+y1+') slope '+m+'?',a:'y - '+y1+' = '+m+'(x - '+x1+')',hint:'Point-slope: y-y1 = m(x-x1)'}; },
    function () { var a=rand(1,5); var b=rand(1,5); return {q:'x-intercept and y-intercept of x/'+a+' + y/'+b+' = 1?',a:'('+a+',0) and (0,'+b+')',hint:'Intercept form: x/a + y/b = 1'}; },
    function () { var a=rand(1,4); var b=rand(1,4); return {q:'Circle center ('+a+','+b+') radius '+rand(2,5)+'?',a:'(x-'+a+')^2 + (y-'+b+')^2 = '+(rand(2,5)*rand(2,5)),hint:'(x-h)^2+(y-k)^2 = r^2'}; },
    function () { var m1=rand(1,4); var m2=rand(1,4); if(m1===m2)m2++; return {q:'Angle between lines of slopes '+m1+' and '+m2+'?',a:Math.atan(Math.abs((m2-m1)/(1+m1*m2)))*180/Math.PI.toFixed(1)+'^o',hint:'tan(theta) = |(m2-m1)/(1+m1*m2)|'}; },
    function () { var m=rand(-4,4); return {q:'Slope of line perpendicular to slope '+m+'?',a:m===0?'Infinite':(-1/m).toFixed(2),hint:'m1*m2 = -1 for perpendicular'}; },
    function () { var a=rand(1,5); var b=rand(1,5); return {q:'Focus of parabola y^2 = '+(4*a)+'x?',a:'('+a+',0)',hint:'For y^2 = 4ax, focus = (a,0)'}; },
    function () { var a=rand(1,5); var b=rand(1,5); while(b>=a)b--;if(b<1)b=1; return {q:'Eccentricity of ellipse x^2/'+(a*a)+' + y^2/'+(b*b)+' = 1?',a:Math.sqrt(1-b*b/(a*a)).toFixed(3),hint:'e = sqrt(1 - b^2/a^2)'}; },
    function () { var a=rand(1,4); return {q:'Directrix of parabola y^2 = '+(4*a)+'x?',a:'x = -'+a,hint:'Directrix: x = -a for y^2 = 4ax'}; },
    function () { var a=rand(1,5); return {q:'Center of hyperbola x^2/'+(a*a)+' - y^2/'+(a*a)+' = 1?',a:'(0,0)',hint:'Center at origin for standard form'}; },
    function () { var m=rand(1,4); return {q:'Condition for parallel lines y='+m+'x+1 and y='+m+'x+2?',a:'Slopes equal, different intercepts',hint:'Parallel if m1=m2 and c1!=c2'}; },
    function () { var a=rand(1,5); return {q:'Parabola y^2 = '+(4*a)+'x. Length of latus rectum?',a:(4*a)+'',hint:'Length = 4a'}; },
    function () { var r=rand(2,6); return {q:'Circle x^2 + y^2 = '+(r*r)+'. Radius?',a:r+'',hint:'x^2+y^2 = r^2 => radius = r'}; }
  ];

  GENERATORS.math.vectors = [
    function () { var a=rand(1,5); var b=rand(1,5); return {q:'Magnitude of vector ('+a+','+b+')?',a:Math.sqrt(a*a+b*b).toFixed(2),hint:'|v| = sqrt(x^2+y^2)'}; },
    function () { var a=rand(1,3); var b=rand(1,3); var c=rand(1,3); return {q:'Dot product of ('+a+','+b+') and ('+c+','+a+')?',a:(a*c+b*a)+'',hint:'a.b = a1b1 + a2b2'}; },
    function () { var a=rand(1,3); var b=rand(1,3); return {q:'Cross product |i j k; 1 2 3; '+a+' '+b+' 0|?',a:'('+(-3*b)+', '+(3*a)+', '+((b-2*a))+')',hint:'Cross product = determinant'}; },
    function () { var a=rand(1,4); var b=rand(1,4); return {q:'Unit vector in direction of ('+a+','+b+')?',a:'('+(a/Math.sqrt(a*a+b*b)).toFixed(2)+','+(b/Math.sqrt(a*a+b*b)).toFixed(2)+')',hint:'Divide vector by its magnitude'}; },
    function () { var a=rand(1,4); var b=rand(1,4); return {q:'Scalar projection of ('+a+','+b+') on (1,0)?',a:a+'',hint:'Projection = a.b/|b|'}; },
    function () { var a=rand(1,4); var b=rand(1,4); var c=rand(1,4); return {q:'Area of triangle formed by vectors ('+a+',0) and (0,'+b+')?',a:(0.5*a*b)+'',hint:'Area = 0.5*|cross product|'}; },
    function () { var a=rand(1,4); var b=rand(1,4); var c=rand(1,4); return {q:'3D vector: magnitude of ('+a+','+b+','+c+')?',a:Math.sqrt(a*a+b*b+c*c).toFixed(2),hint:'|v| = sqrt(x^2+y^2+z^2)'}; },
    function () { var a=rand(1,4); return {q:'Dot product of ('+a+',0) and (0,'+a+')?',a:'0 (perpendicular)',hint:'Perpendicular vectors have dot product = 0'}; },
    function () { var a=rand(1,4); return {q:'i.i + j.j + k.k?',a:'3',hint:'i.i = j.j = k.k = 1'}; },
    function () { var a=rand(1,4); var b=rand(1,4); return {q:'Angle between vectors ('+a+',0) and (0,'+b+')?',a:'90^o',hint:'Perpendicular => angle = 90'}; },
    function () { var a=rand(1,4); return {q:'If a=('+a+',2), b=(4,'+a+'), a..b?',a:(a*4+2*a)+'',hint:'a.b = a1b1+a2b2'}; },
    function () { var a=rand(1,4); var b=rand(1,4); return {q:'Vector connecting ('+a+','+b+') to ('+b+','+a+')?',a:'('+(b-a)+','+(a-b)+')',hint:'From A to B: B - A'}; },
    function () { var a=rand(1,3); var b=rand(1,3); var c=rand(1,3); return {q:'Coplanar: ('+a+',0,0), (0,'+b+',0), (0,0,'+c+'). Volume of parallelepiped?',a:(a*b*c)+'',hint:'Volume = |a.(b x c)|'}; },
    function () { var a=rand(1,4); var b=rand(1,4); return {q:'If vectors ('+a+','+b+') and ('+b+','+a+') are perpendicular, relation?',a:'ab + ba = 0 => 2ab=0 => a=0 or b=0',hint:'Dot product = 0 for perpendicular'}; },
    function () { var a=rand(1,4); var b=rand(1,4); return {q:'Direction cosines of vector ('+a+',0,0)?',a:'(1,0,0)',hint:'Direction cosines: (x/|v|, y/|v|, z/|v|)'}; }
  ];

  GENERATORS.math.trigonometry = [
    function () { var n=rand(1,5); return {q:'sin('+(n*30)+'^o)?',a:n%2===0?''+function(d){var v=Math.sin(d*Math.PI/180);return v.toFixed(2)}(n*30):function(d){return Math.sin(d*Math.PI/180).toFixed(2)}(n*30),hint:'Standard angles: 0,30,45,60,90'}; },
    function () { var n=rand(1,5); return {q:'cos('+(n*30)+'^o)?',a:function(d){return Math.cos(d*Math.PI/180).toFixed(2)}(n*30),hint:'Standard angle values'}; },
    function () { var n=rand(1,5); return {q:'tan('+(n*45)+'^o)?',a:function(d){var v=Math.tan(d*Math.PI/180);return Math.abs(v)>100?'Infinite':v.toFixed(2)}(n*45),hint:'tan 45 = 1, tan 90 = inf'}; },
    function () { var a=rand(1,5); return {q:'sin^2('+a+') + cos^2('+a+')?',a:'1',hint:'sin^2(theta)+cos^2(theta)=1'}; },
    function () { var a=rand(1,5); return {q:'sec^2('+a+') - tan^2('+a+')?',a:'1',hint:'sec^2 - tan^2 = 1'}; },
    function () { var n=rand(1,4); return {q:'sin 2'+(n*15)+'?',a:Math.sin(2*n*15*Math.PI/180).toFixed(2),hint:'sin 2theta = 2 sin theta cos theta'}; },
    function () { var a=rand(1,4); var b=rand(1,4); return {q:'sin('+a+' + '+b+')? Formula?',a:'sin A cos B + cos A sin B',hint:'Compound angle formula'}; },
    function () { return {q:'cos^2 x - sin^2 x = ?',a:'cos 2x',hint:'cos^2 - sin^2 = cos 2x'}; },
    function () { var a=rand(1,4); return {q:'sin('+a+'*pi/2)?',a:Math.sin(a*Math.PI/2).toFixed(2),hint:'sin(n*pi/2) = 0, 1, 0, -1 pattern'}; },
    function () { var a=rand(1,4); return {q:'Period of sin('+a+'x)?',a:(2*Math.PI/a).toFixed(2)+' (or 360/'+a+'^o)',hint:'Period = 2pi/k for sin(kx)'}; },
    function () { return {q:'sin(90^o - theta) = ?',a:'cos theta',hint:'Complementary angle identities'}; },
    function () { var a=rand(1,5); return {q:'sin 2*'+(a*15)+'? (using formula)',a:Math.sin(2*a*15*Math.PI/180).toFixed(2),hint:'sin 2x = 2 sin x cos x'}; },
    function () { var a=rand(1,4); return {q:'If sin x = '+a+'/5, cos x? (acute angle)',a:Math.sqrt(25-a*a)/5+'',hint:'sin^2 + cos^2 = 1'}; },
    function () { var a=rand(1,4); return {q:'Amplitude of '+a+' sin x?',a:a+'',hint:'Amplitude = coefficient of sin/cos'}; },
    function () { return {q:'Highest value of sin x + cos x?',a:'sqrt(2)',hint:'sin x + cos x = sqrt(2) sin(x+pi/4) <= sqrt(2)'}; }
  ];

  GENERATORS.math.statistics = [
    function () { var n=rand(3,6); var vals=[]; var s=0; for(var i=0;i<n;i++){vals[i]=rand(1,15);s+=vals[i];} return {q:'Mean of ['+vals.join(",")+']?',a:(s/n).toFixed(2),hint:'Mean = sum/n'}; },
    function () { var n=rand(3,5); var vals=[]; for(var i=0;i<n;i++)vals[i]=rand(1,15); vals.sort(function(a,b){return a-b;}); return {q:'Median of ['+vals.join(",")+']?',a:n%2?vals[Math.floor(n/2)]:((vals[n/2-1]+vals[n/2])/2)+'',hint:'Sort and take middle value(s)'}; },
    function () { var n=rand(3,6); var vals=[]; var s=0; for(var i=0;i<n;i++){vals[i]=rand(1,15);s+=vals[i];} var m=s/n; var v=0; for(var i=0;i<n;i++)v+=(vals[i]-m)*(vals[i]-m); return {q:'Variance of ['+vals.join(",")+']?',a:(v/n).toFixed(2),hint:'Variance = sum(xi-mean)^2/n'}; },
    function () { var n=rand(3,6); var vals=[]; var s=0; for(var i=0;i<n;i++){vals[i]=rand(1,15);s+=vals[i];} var m=s/n; var v=0; for(var i=0;i<n;i++)v+=(vals[i]-m)*(vals[i]-m); return {q:'Standard deviation of ['+vals.join(",")+']?',a:Math.sqrt(v/n).toFixed(2),hint:'SD = sqrt(variance)'}; },
    function () { var n=rand(3,5); var vals=[]; for(var i=0;i<n;i++)vals[i]=rand(1,10); var freq={}; var mode=vals[0]; var maxC=1; for(var i=0;i<n;i++){freq[vals[i]]=(freq[vals[i]]||0)+1;if(freq[vals[i]]>maxC){maxC=freq[vals[i]];mode=vals[i];}} return {q:'Mode of ['+vals.join(",")+']?',a:maxC>1?mode+'':'No unique mode',hint:'Mode = most frequent value'}; },
    function () { var n=rand(3,6); var vals=[]; for(var i=0;i<n;i++)vals[i]=rand(1,15); var max=Math.max.apply(null,vals); var min=Math.min.apply(null,vals); return {q:'Range of ['+vals.join(",")+']?',a:(max-min)+'',hint:'Range = max - min'}; },
    function () { var n=rand(4,8); var vals=[]; var s=0; for(var i=0;i<n;i++){vals[i]=rand(1,20);s+=vals[i];} return {q:'Mean of first '+n+' observations?',a:(s/n).toFixed(2),hint:'Mean = sum of values/n'}; },
    function () { var a=rand(1,10); var b=rand(1,10); return {q:'Mean of '+a+' and '+b+'?',a:((a+b)/2)+'',hint:'Mean = (a+b)/2'}; },
    function () { var n=rand(3,6); var vals=[]; for(var i=0;i<n;i++)vals[i]=rand(1,10); vals.sort(); return {q:'Quartile: Q1 of ['+vals.join(",")+']?',a:vals[Math.floor(n/4)]+' (approx)',hint:'Q1 = 25th percentile'}; },
    function () { var a=rand(2,10); var b=rand(2,10); var f1=rand(2,6); var f2=rand(2,6); return {q:'Weighted mean: '+a+' (f='+f1+'), '+b+' (f='+f2+')?',a:((a*f1+b*f2)/(f1+f2)).toFixed(2),hint:'Weighted mean = sum(xi*fi)/sum(fi)'}; },
    function () { var n=rand(3,6); var vals=[]; var s=0; for(var i=0;i<n;i++){vals[i]=rand(1,15);s+=vals[i];} var m=s/n; var v=0; for(var i=0;i<n;i++)v+=(vals[i]-m)*(vals[i]-m); var sd=Math.sqrt(v/n); var cv=sd/m*100; return {q:'CV of ['+vals.join(",")+']? (mean='+m.toFixed(1)+')',a:cv.toFixed(1)+'%',hint:'CV = (SD/Mean)*100%'}; },
    function () { var n=rand(3,6); var vals=[]; for(var i=0;i<n;i++)vals[i]=rand(2,12)*2; return {q:'All values in ['+vals.join(",")+'] are multiples of 2. Type of data?',a:'Even numbers (discrete)',hint:'Discrete data: countable values'}; },
    function () { var n=rand(4,10); return {q:'Sum of first '+n+' natural numbers?',a:(n*(n+1)/2)+'',hint:'Sum = n(n+1)/2'}; },
    function () { var a=rand(2,9); return {q:'Probability of rolling a sum of '+(a+1)+' with two dice?',a:(a/36).toFixed(3)+' ('+a+'/36)',hint:'Number of ways = count pairs summing to target'}; },
    function () { var n=rand(3,6); var vals=[]; for(var i=0;i<n;i++)vals[i]=rand(1,15); var m=vals.reduce(function(a,b){return a+b;},0)/n; return {q:'Mean deviation from mean of ['+vals.join(",")+']?',a:(vals.reduce(function(s,x){return s+Math.abs(x-m);},0)/n).toFixed(2),hint:'MD = sum|xi-mean|/n'}; }
  ];

  GENERATORS.math.complex_numbers = [
    function () { var a=rand(-5,5); var b=rand(-5,5); while(b===0)b=rand(-5,5); return {q:'Modulus of '+a+'+'+b+'i?',a:Math.sqrt(a*a+b*b).toFixed(2),hint:'|z| = sqrt(a^2 + b^2)'}; },
    function () { var a=rand(-5,5); var b=rand(-5,5); while(b===0)b=rand(-5,5); return {q:'Conjugate of '+a+'+'+b+'i?',a:a+''+(b>0?' - '+Math.abs(b)+'i':' + '+Math.abs(b)+'i').replace('--','+'),hint:'Conjugate: change sign of imaginary part'}; },
    function () { var a=rand(1,5); var b=rand(1,5); return {q:'('+a+'+'+b+'i) + ('+b+'-'+a+'i)?',a:(a+b)+'+'+(b-a)+'i',hint:'Add real and imaginary parts separately'}; },
    function () { var a=rand(1,5); var b=rand(1,5); return {q:'('+a+'+'+b+'i) - ('+b+'+'+a+'i)?',a:(a-b)+'+'+(b-a)+'i',hint:'Subtract real and imaginary parts'}; },
    function () { var a=rand(1,4); var b=rand(1,4); var r=Math.sqrt(a*a+b*b); var th=Math.atan2(b,a)*180/Math.PI; return {q:'Polar form of '+a+'+'+b+'i?',a:'r(cos theta + i sin theta), r='+r.toFixed(2)+', theta='+th.toFixed(1)+'^o',hint:'r = |z|, theta = arctan(b/a)'}; },
    function () { var a=rand(1,5); var b=rand(1,5); return {q:'Product: ('+a+'+'+b+'i)('+a+'-'+b+'i)?',a:(a*a+b*b)+'',hint:'(a+bi)(a-bi) = a^2 + b^2'}; },
    function () { var a=rand(1,4); var b=rand(1,4); return {q:'('+a+'+'+b+'i)^2?',a:(a*a-b*b)+(2*a*b>0?'+'+2*a*b:'-'+Math.abs(2*a*b))+'i',hint:'(a+bi)^2 = a^2 - b^2 + 2abi'}; },
    function () { var a=rand(1,4); var b=rand(1,4); return {q:'Real part of ('+a+'+'+b+'i)^2?',a:(a*a-b*b)+'',hint:'(a+bi)^2 = a^2 - b^2 + 2abi, real = a^2 - b^2'}; },
    function () { var a=rand(1,4); var b=rand(1,4); return {q:'Imaginary part of ('+a+'+'+b+'i)^2?',a:(2*a*b)+'',hint:'Imag part = 2ab'}; },
    function () { return {q:'i^2?',a:'-1',hint:'i = sqrt(-1), i^2 = -1'}; },
    function () { return {q:'i^3?',a:'-i',hint:'i^3 = i^2 * i = -1 * i = -i'}; },
    function () { return {q:'i^4?',a:'1',hint:'i^4 = (i^2)^2 = (-1)^2 = 1'}; },
    function () { var n=rand(1,6); return {q:'i^'+(n)+'?',a:['i','-1','-i','1','i','-1'][(n-1)%4],hint:'i^n cycles every 4: i, -1, -i, 1'}; },
    function () { var a=rand(1,5); var b=rand(1,5); var c=rand(1,5); var d=rand(1,5); var denom=c*c+d*d; return {q:'('+a+'+'+b+'i)/('+c+'+'+d+'i)?',a:((a*c+b*d)/denom).toFixed(2)+'+'+((b*c-a*d)/denom).toFixed(2)+'i',hint:'Multiply numerator and denominator by conjugate'}; },
    function () { var a=rand(1,5); var b=rand(1,5); var r=Math.sqrt(a*a+b*b); return {q:'Argument (principal) of '+a+'+'+b+'i?',a:(Math.atan2(b,a)*180/Math.PI).toFixed(1)+'^o',hint:'arg(z) = arctan(b/a) in correct quadrant'}; }
  ];
  // ==================== QUESTION SELECTION ENGINE ====================

  function getQuestionForTopic(subject, subTopic) {
    var gens = GENERATORS[subject] && GENERATORS[subject][subTopic];
    if (!gens || gens.length === 0) return null;
    for (var t = 0; t < 30; t++) {
      var gen = pick(gens);
      var q = gen();
      if (q && q.q && !_isRecent(q.q)) {
        q.subject = subject;
        q.subTopic = subTopic;
        if (!q.options) {
          q.options = [];
          for (var i = 0; i < 4; i++) {
            var dist = Math.round((parseFloat(q.a) || 0) + rand(-5, 5));
            if (dist !== parseFloat(q.a) && q.options.indexOf("" + dist) < 0) q.options.push("" + dist);
            else i--;
            if (q.options.length >= 4) break;
          }
          if (q.options.length < 4) {
            for (var i = q.options.length; i < 4; i++) q.options.push("" + (rand(1, 20)));
          }
        }
        var ansStr = typeof q.a === "number" ? q.a + "" : q.a;
        if (q.options.indexOf(ansStr) < 0) {
          q.options[rand(0, q.options.length - 1)] = ansStr;
        }
        _addRecent(q.q);
        return q;
      }
    }
    return null;
  }

  function getRandomTopic(subject) {
    var topics = SCI_TOPICS[subject];
    if (!topics || topics.length === 0) return null;
    return topics[rand(0, topics.length - 1)];
  }

  function generateSessionQuestions(mode, count, subject, subTopic) {
    var questions = [];
    var attempts = 0;
    while (questions.length < count && attempts < 200) {
      attempts++;
      var s = subject || pick(["physics","chemistry","biology","math"]);
      var st = subTopic || getRandomTopic(s);
      var q = getQuestionForTopic(s, st);
      if (q) {
        q.timeLimit = getTimeLimit(mode);
        questions.push(q);
      }
    }
    return questions;
  }

  function generateWeakspotQuestions(count) {
    var mistakes = loadMistakes();
    if (mistakes.length === 0) return generateSessionQuestions(count, count, null, null);
    var questions = [];
    var urgent = getMistakesForRetry(count);
    for (var i = 0; i < urgent.length && questions.length < count; i++) {
      var m = urgent[i];
      var found = false;
      for (var s in GENERATORS) {
        for (var st in GENERATORS[s]) {
          var gens = GENERATORS[s][st];
          for (var g = 0; g < gens.length; g++) {
            var q = gens[g]();
            if (q && q.q === m.question) { q.subject = s; q.subTopic = st; q.timeLimit = 15; questions.push(q); found = true; break; }
          }
          if (found) break;
        }
        if (found) break;
      }
    }
    while (questions.length < count) {
      var s = pick(["physics","chemistry","biology","math"]);
      var st = getRandomTopic(s);
      var q = getQuestionForTopic(s, st);
      if (q) { q.timeLimit = 15; questions.push(q); }
    }
    return questions;
  }

  function getTimeLimit(mode) {
    if (mode === "quicksolve") return rand(5, 8);
    if (mode === "instinct") return rand(5, 15);
    if (mode === "fivesec") return 5;
    if (mode === "examrush") return 30;
    if (mode === "weakspot") return 15;
    return 20;
  }

  // ==================== TRAINING MODES ====================

  function startTraining(mode, opts) {
    var state = loadState();
    updateStreak(state);

    var count = opts && opts.count ? opts.count : 10;
    var subject = opts && opts.subject ? opts.subject : null;
    var subTopic = opts && opts.subTopic ? opts.subTopic : null;

    var questions;
    if (mode === "weakspot") {
      questions = generateWeakspotQuestions(count);
    } else {
      questions = generateSessionQuestions(mode, count, subject, subTopic);
    }

    session = {
      mode: mode,
      layer: activeLayer,
      hardMode: activeHardMode,
      questions: questions,
      questionIndex: 0,
      totalQuestions: questions.length,
      correctCount: 0,
      wrongCount: 0,
      pointsEarned: 0,
      startTime: Date.now(),
      subject: subject,
      subTopic: subTopic,
      mistakes: []
    };

    cacheSession(session);
    renderFullUI();
    showQuestion();
  }

  function showQuestion() {
    if (!session || session.questionIndex >= session.questions.length) {
      endTraining();
      return;
    }
    var q = session.questions[session.questionIndex];
    currentQuestion = q;
    renderQuestion(q);
    startTimer(q.timeLimit || 15);
    cacheSession(session);
  }

  function submitAnswer(selected) {
    if (!session || !currentQuestion) return;
    clearTimer();
    var q = currentQuestion;
    var correct = false;
    var ansStr = typeof q.a === "number" ? q.a + "" : q.a;

    if (selected === ansStr || parseFloat(selected) === parseFloat(q.a)) {
      correct = true;
      session.correctCount++;
      var points = 10;
      if (session.hardMode) points *= 2;
      if (session.mode === "fivesec") points += 5;
      if (session.mode === "quicksolve") points += 3;
      session.pointsEarned += points;
    } else {
      correct = false;
      session.wrongCount++;
      addMistake(q, session.mode);
      session.mistakes.push(q);
    }

    showResult(correct, q);
  }

  function nextQuestion() {
    hideResult();
    session.questionIndex++;
    showQuestion();
  }

  function endTraining() {
    clearTimer();
    if (!session) return;
    var state = loadState();
    state.totalPoints += session.pointsEarned;
    state.sessions.push({
      mode: session.mode,
      layer: session.layer,
      date: new Date().toISOString(),
      correct: session.correctCount,
      wrong: session.wrongCount,
      total: session.totalQuestions,
      points: session.pointsEarned,
      subject: session.subject,
      subTopic: session.subTopic
    });
    if (state.sessions.length > 200) state.sessions = state.sessions.slice(-200);

    var modeStats = state.stats[session.mode] || { attempts: 0, correct: 0 };
    modeStats.attempts += session.totalQuestions;
    modeStats.correct += session.correctCount;
    state.stats[session.mode] = modeStats;

    updateStreak(state);
    saveState(state);
    clearSessionCache();
    showSessionResults();
    session = null;
    currentQuestion = null;
  }

  // ==================== UI RENDERING ====================

  function renderFullUI() {
    var container = document.getElementById("science-training-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "science-training-container";
      container.style.cssText = "max-width:800px;margin:20px auto;padding:24px;background:rgba(24,24,27,.95);border-radius:16px;border:1px solid rgba(255,255,255,.08)";
      var main = document.querySelector(".paper-page, main, .content") || document.body;
      main.appendChild(container);
    }
    container.innerHTML =
      "<div id='st-header' style='display:flex;justify-content:space-between;align-items:center;margin-bottom:20px'>" +
      "<div><span id='st-mode-badge' style='background:rgba(139,92,246,.2);color:#a78bfa;padding:4px 12px;border-radius:6px;font-size:.85em;font-weight:600'></span>" +
      "<span id='st-progress' style='margin-left:12px;color:#a1a1aa;font-size:.85em'></span></div>" +
      "<div><span id='st-timer' style='font-size:1.2em;font-weight:700;font-variant-numeric:tabular-nums;color:#fafafa'></span>" +
      "<span id='st-score' style='margin-left:16px;color:#fbbf24;font-size:.9em'></span></div></div>" +
      "<div id='st-question-area'></div>" +
      "<div id='st-result-overlay' style='display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.7);z-index:1000;display:none;align-items:center;justify-content:center'>" +
      "<div style='background:#18181b;border-radius:16px;padding:32px;max-width:500px;width:90%;border:1px solid rgba(255,255,255,.08)'></div></div>";
    document.getElementById("st-result-overlay").style.display = "none";
  }

  function renderQuestion(q) {
    var header = document.getElementById("st-header");
    var area = document.getElementById("st-question-area");
    if (!area) return;

    var modeLabel = session.mode.charAt(0).toUpperCase() + session.mode.slice(1);
    var layerLabel = session.layer === "instinct" ? "⚡ Instinct" : "📝 Exam";
    if (session.hardMode) layerLabel += " 🔥 Hard";
    document.getElementById("st-mode-badge").textContent = modeLabel + " | " + (q.subject || "Science") + (q.subTopic ? " - " + q.subTopic.replace(/_/g, " ") : "");
    document.getElementById("st-progress").textContent = (session.questionIndex + 1) + " / " + session.totalQuestions;
    document.getElementById("st-score").textContent = "⭐ " + session.pointsEarned + " pts";

    var html = "<div style='margin-bottom:16px'>";
    if (q.hint) html += "<div style='font-size:.8em;color:#a78bfa;margin-bottom:8px'>💡 " + q.hint + "</div>";
    html += "<div style='font-size:1.15em;line-height:1.6;color:#fafafa;font-weight:500'>" + q.q + "</div></div>";

    var opts = q.options;
    if (!opts || opts.length < 2) {
      var ans = (q.a || "").toString().trim();
      var num = parseFloat(ans);
      if (!isNaN(num)) {
        var off1 = Math.max(1, Math.round(Math.abs(num) * 0.15) || 1);
        var off2 = Math.max(1, Math.round(Math.abs(num) * 0.3) || 2);
        var pool = [ans, (num + off1).toString(), (num - off1).toString(), (num + off2).toString(), (num - off2).toString(), (num + off1 * 2).toString()];
        pool = pool.filter(function(v,i,a){return a.indexOf(v)===i;});
        opts = [];
        var idx = rand(0, Math.min(3, pool.length - 1));
        opts.push(pool[idx]); pool.splice(idx,1);
        while (opts.length < 4 && pool.length) { var p = pool.splice(rand(0, pool.length-1), 1)[0]; opts.push(p); }
        shuffle(opts);
      } else {
        opts = [ans, "None of the above", "Can't be determined", "Insufficient data"];
        shuffle(opts);
      }
    }
    if (!opts) opts = [ans || "1", "2", "3", "4"];
    html += "<div id='st-options' style='display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px'>";
    for (var i = 0; i < opts.length && i < 4; i++) {
      html += "<button class='st-opt' data-value='" + opts[i].replace(/'/g, "&apos;") + "' style='padding:14px 16px;border-radius:10px;background:#27272a;border:1px solid rgba(255,255,255,.06);color:#fafafa;font-size:.95em;cursor:pointer;text-align:left;transition:all .15s'>" +
        String.fromCharCode(65 + i) + ". " + opts[i] + "</button>";
    }
    html += "</div>";

    if (q.solution) {
      html += "<div id='st-solution-box' style='display:none;margin-top:16px;padding:16px;background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.15);border-radius:10px;color:#34d399;font-size:.9em'>" + q.solution + "</div>";
    }

    area.classList.remove("answered");
    area.innerHTML = html;

    area.querySelectorAll(".st-opt").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (area.classList.contains("answered")) return;
        area.classList.add("answered");
        submitAnswer(btn.getAttribute("data-value"));
      });
      btn.addEventListener("mouseenter", function () { this.style.borderColor = "rgba(139,92,246,.4)"; this.style.background = "#2a2a2e"; });
      btn.addEventListener("mouseleave", function () { if (!this.classList.contains("selected")) { this.style.borderColor = "rgba(255,255,255,.06)"; this.style.background = "#27272a"; } });
    });
  }

  function showResult(correct, q) {
    var overlay = document.getElementById("st-result-overlay");
    if (!overlay) return;
    var content = overlay.querySelector("div");

    var ansStr = typeof q.a === "number" ? q.a + "" : q.a;
    content.innerHTML =
      "<div style='text-align:center;margin-bottom:20px'>" +
      "<div style='font-size:3em;margin-bottom:8px'>" + (correct ? "✅" : "❌") + "</div>" +
      "<div style='font-size:1.2em;font-weight:700;color:" + (correct ? "#34d399" : "#ef4444") + "'>" + (correct ? "Correct!" : "Wrong!") + "</div>" +
      "<div style='color:#a1a1aa;margin-top:8px'>" +
      (correct ? "+" + (session.hardMode ? 20 : 10) + " points" : "Answer: " + ansStr) +
      "</div></div>";

    if (!correct && q.solution) {
      content.innerHTML += "<div style='padding:14px;background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.15);border-radius:10px;color:#34d399;font-size:.85em;margin-bottom:16px'>📖 " + q.solution + "</div>";
    }

    content.innerHTML += "<button id='st-next-btn' style='width:100%;padding:14px;border-radius:10px;background:#a78bfa;color:#fff;border:none;font-size:1em;font-weight:600;cursor:pointer'>" +
      (session.questionIndex >= session.questions.length - 1 ? "📊 View Results" : "Next Question →") + "</button>";

    overlay.style.display = "flex";
    document.getElementById("st-next-btn").addEventListener("click", function () {
      if (session.questionIndex >= session.questions.length - 1) {
        overlay.style.display = "none";
        endTraining();
      } else {
        overlay.style.display = "none";
        nextQuestion();
      }
    });
  }

  function hideResult() {
    var overlay = document.getElementById("st-result-overlay");
    if (overlay) overlay.style.display = "none";
  }

  function showSessionResults() {
    var container = document.getElementById("science-training-container");
    if (!container) return;
    if (!session) return;

    var pct = session.totalQuestions > 0 ? Math.round(session.correctCount / session.totalQuestions * 100) : 0;
    var rank = getRank(session.pointsEarned);
    var state = loadState();
    var overallRank = getRank(state.totalPoints);

    var html =
      "<div style='text-align:center;padding:20px 0'>" +
      "<div style='font-size:2.5em;margin-bottom:8px'>🏆</div>" +
      "<h2 style='margin:0 0 4px;color:#fafafa;font-size:1.4em'>Session Complete!</h2>" +
      "<div style='color:#a1a1aa;font-size:.9em'>" + session.mode + " | " + session.layer + "</div>" +
      "</div>" +
      "<div style='display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin:20px 0'>" +
      "<div style='text-align:center;padding:16px;background:#27272a;border-radius:10px'><div style='font-size:1.5em;font-weight:700;color:#34d399'>" + session.correctCount + "/" + session.totalQuestions + "</div><div style='color:#a1a1aa;font-size:.8em'>Correct</div></div>" +
      "<div style='text-align:center;padding:16px;background:#27272a;border-radius:10px'><div style='font-size:1.5em;font-weight:700;color:" + (pct >= 60 ? "#34d399" : "#ef4444") + "'>" + pct + "%</div><div style='color:#a1a1aa;font-size:.8em'>Accuracy</div></div>" +
      "<div style='text-align:center;padding:16px;background:#27272a;border-radius:10px'><div style='font-size:1.5em;font-weight:700;color:#fbbf24'>+" + session.pointsEarned + "</div><div style='color:#a1a1aa;font-size:.8em'>Points</div></div>" +
      "</div>" +
      "<div style='text-align:center;margin:12px 0;padding:12px;background:rgba(139,92,246,.1);border-radius:10px'>" +
      "<span style='font-size:.9em;color:#a78bfa'>Rank: " + overallRank.name + " (Total: " + state.totalPoints + " pts)</span>" +
      "</div>" +
      "<div style='margin-top:8px;padding:12px;background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.15);border-radius:10px;font-size:.85em;color:#fbbf24'>🔥 Streak: " + state.streaks.current + " days (Best: " + state.streaks.best + ")</div>" +
      "<div style='display:flex;gap:10px;margin-top:20px'>" +
      "<button id='st-retry-btn' class='st-btn' style='flex:1;padding:14px;border-radius:10px;background:#a78bfa;color:#fff;border:none;font-size:.95em;font-weight:600;cursor:pointer'>🔄 Retry</button>" +
      "<button id='st-close-btn' class='st-btn' style='flex:1;padding:14px;border-radius:10px;background:#52525b;color:#fff;border:none;font-size:.95em;font-weight:600;cursor:pointer'>📋 Menu</button>" +
      "</div>";

    container.innerHTML = html;

    document.getElementById("st-retry-btn").addEventListener("click", function () {
      startTraining(session.mode, { count: session.totalQuestions, subject: session.subject, subTopic: session.subTopic });
    });
    document.getElementById("st-close-btn").addEventListener("click", function () {
      backToMenu();
    });
  }

  function closeResults() {
    var overlay = document.getElementById("st-result-overlay");
    if (overlay) overlay.style.display = "none";
  }

  function backToMenu() {
    clearTimer();
    var container = document.getElementById("science-training-container");
    if (container) container.innerHTML = renderMenu();
    session = null;
    currentQuestion = null;
    clearSessionCache();
  }

  function renderMenu() {
    var state = loadState();
    var rank = getRank(state.totalPoints);
    var html =
      "<div style='text-align:center;padding:20px 0'>" +
      "<div style='font-size:2em;margin-bottom:8px'>🔬 Science Training Arena</div>" +
      "<div style='color:#a1a1aa;font-size:.9em'>Physics • Chemistry • Biology • Math</div>" +
      "<div style='margin-top:12px;padding:12px;background:rgba(139,92,246,.1);border-radius:10px'>" +
      "<span style='color:#a78bfa'>🏅 " + rank.name + "</span> · " +
      "<span style='color:#fbbf24'>⭐ " + state.totalPoints + " points</span> · " +
      "<span style='color:#34d399'>🔥 " + state.streaks.current + " day streak</span>" +
      "</div></div>" +
      "<div style='display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0'>" +
      "<button class='st-mode-btn' data-mode='quicksolve' style='padding:16px;border-radius:12px;background:#27272a;border:1px solid rgba(255,255,255,.06);color:#fafafa;cursor:pointer;text-align:left'>" +
      "<div style='font-weight:600'>⚡ Quick Solve</div><div style='font-size:.8em;color:#a1a1aa;margin-top:4px'>5-8 seconds per question</div></button>" +
      "<button class='st-mode-btn' data-mode='instinct' style='padding:16px;border-radius:12px;background:#27272a;border:1px solid rgba(255,255,255,.06);color:#fafafa;cursor:pointer;text-align:left'>" +
      "<div style='font-weight:600'>🧠 Instinct</div><div style='font-size:.8em;color:#a1a1aa;margin-top:4px'>5-15 seconds, build speed</div></button>" +
      "<button class='st-mode-btn' data-mode='fivesec' style='padding:16px;border-radius:12px;background:#27272a;border:1px solid rgba(255,255,255,.06);color:#fafafa;cursor:pointer;text-align:left'>" +
      "<div style='font-weight:600'>⏱ Five Sec</div><div style='font-size:.8em;color:#a1a1aa;margin-top:4px'>Exactly 5 seconds per question</div></button>" +
      "<button class='st-mode-btn' data-mode='examrush' style='padding:16px;border-radius:12px;background:#27272a;border:1px solid rgba(255,255,255,.06);color:#fafafa;cursor:pointer;text-align:left'>" +
      "<div style='font-weight:600'>📝 Exam Rush</div><div style='font-size:.8em;color:#a1a1aa;margin-top:4px'>Timed set of questions</div></button>" +
      "<button class='st-mode-btn' data-mode='weakspot' style='padding:16px;border-radius:12px;background:#27272a;border:1px solid rgba(255,255,255,.06);color:#fafafa;cursor:pointer;text-align:left'>" +
      "<div style='font-weight:600'>🎯 Weak Spot</div><div style='font-size:.8em;color:#a1a1aa;margin-top:4px'>Focus on past mistakes</div></button>" +
      "<button id='st-custom-btn' style='padding:16px;border-radius:12px;background:#27272a;border:1px solid rgba(255,255,255,.06);color:#fafafa;cursor:pointer;text-align:left'>" +
      "<div style='font-weight:600'>🎨 Custom</div><div style='font-size:.8em;color:#a1a1aa;margin-top:4px'>Pick topic & difficulty</div></button>" +
      "</div>" +
      "<div style='display:flex;gap:12px;margin:12px 0;padding:12px;background:#27272a;border-radius:10px;align-items:center'>" +
      "<label style='font-size:.9em;color:#a1a1aa'>🔥 Hard Mode</label>" +
      "<input type='checkbox' id='st-hard-toggle' " + (activeHardMode ? "checked" : "") + " style='width:18px;height:18px;accent-color:#ef4444'>" +
      "<span style='font-size:.8em;color:#52525b'>45% less time, 2x points</span>" +
      "</div>" +
      "<div style='display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin:12px 0'>" +
      "<button class='st-subject-btn' data-subject='physics' style='padding:12px;border-radius:8px;background:#27272a;border:1px solid rgba(255,255,255,.06);color:#fafafa;cursor:pointer'>🔭 Physics</button>" +
      "<button class='st-subject-btn' data-subject='chemistry' style='padding:12px;border-radius:8px;background:#27272a;border:1px solid rgba(255,255,255,.06);color:#fafafa;cursor:pointer'>🧪 Chemistry</button>" +
      "<button class='st-subject-btn' data-subject='biology' style='padding:12px;border-radius:8px;background:#27272a;border:1px solid rgba(255,255,255,.06);color:#fafafa;cursor:pointer'>🧬 Biology</button>" +
      "<button class='st-subject-btn' data-subject='math' style='padding:12px;border-radius:8px;background:#27272a;border:1px solid rgba(255,255,255,.06);color:#fafafa;cursor:pointer'>📐 Math</button>" +
      "</div>" +
      "<div style='text-align:center;margin-top:12px'>" +
      "<span style='font-size:.8em;color:#52525b'>Sessions completed: " + state.sessions.length + " · Mistakes to review: " + loadMistakes().length + "</span>" +
      "</div>";

    return html;
  }

  // ==================== TIMER ====================

  function startTimer(seconds) {
    clearTimer();
    var timerEl = document.getElementById("st-timer");
    if (!timerEl) return;

    if (session && session.hardMode) {
      seconds = Math.max(3, Math.round(seconds * 0.55));
    }

    var remaining = seconds;
    timerEl.textContent = formatTime(remaining);
    timerEl.className = remaining <= 3 ? "urgent" : (remaining <= 5 ? "warning" : "");

    timerId = setInterval(function () {
      remaining--;
      if (timerEl) {
        timerEl.textContent = formatTime(remaining);
        timerEl.className = remaining <= 3 ? "urgent" : (remaining <= 5 ? "warning" : "");
      }
      if (remaining <= 0) {
        clearTimer();
        if (currentQuestion && session) {
          submitAnswer("");
        }
      }
    }, 1000);
  }

  function clearTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    var timerEl = document.getElementById("st-timer");
    if (timerEl) timerEl.className = "";
  }

  function formatTime(sec) {
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  // ==================== EVENT BINDING ====================

  function bindEvents() {
    document.addEventListener("click", function (e) {
      var modeBtn = e.target.closest(".st-mode-btn");
      if (modeBtn) {
        var mode = modeBtn.getAttribute("data-mode");
        document.getElementById("st-hard-toggle");
        startTraining(mode, { count: mode === "examrush" ? 15 : 10 });
        return;
      }

      var subBtn = e.target.closest(".st-subject-btn");
      if (subBtn) {
        var subject = subBtn.getAttribute("data-subject");
        startTraining("instinct", { count: 10, subject: subject });
        return;
      }

      if (e.target.id === "st-custom-btn") {
        showCustomDialog();
      }
    });

    document.addEventListener("change", function (e) {
      if (e.target.id === "st-hard-toggle") {
        activeHardMode = e.target.checked;
      }
    });
  }

  function showCustomDialog() {
    var overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.7);z-index:1000;display:flex;align-items:center;justify-content:center";
    var subjects = ["physics","chemistry","biology","math"];
    var subjectNames = ["Physics","Chemistry","Biology","Math"];
    var html =
      "<div style='background:#18181b;border-radius:16px;padding:28px;max-width:400px;width:90%;border:1px solid rgba(255,255,255,.08)'>" +
      "<h3 style='margin:0 0 16px;color:#fafafa;font-size:1.1em'>🎨 Custom Session</h3>" +
      "<label style='color:#a1a1aa;font-size:.85em;display:block;margin-bottom:6px'>Subject</label>" +
      "<select id='st-custom-subject' style='width:100%;padding:10px;border-radius:8px;background:#27272a;color:#fafafa;border:1px solid rgba(255,255,255,.1);margin-bottom:12px;font-size:.9em'>";
    for (var i = 0; i < subjects.length; i++) {
      html += "<option value='" + subjects[i] + "'>" + subjectNames[i] + "</option>";
    }
    html += "</select>" +
      "<label style='color:#a1a1aa;font-size:.85em;display:block;margin-bottom:6px'>Mode</label>" +
      "<select id='st-custom-mode' style='width:100%;padding:10px;border-radius:8px;background:#27272a;color:#fafafa;border:1px solid rgba(255,255,255,.1);margin-bottom:12px;font-size:.9em'>" +
      "<option value='instinct'>🧠 Instinct</option><option value='fivesec'>⏱ Five Sec</option><option value='examrush'>📝 Exam Rush</option>" +
      "</select>" +
      "<label style='color:#a1a1aa;font-size:.85em;display:block;margin-bottom:6px'>Questions</label>" +
      "<select id='st-custom-count' style='width:100%;padding:10px;border-radius:8px;background:#27272a;color:#fafafa;border:1px solid rgba(255,255,255,.1);margin-bottom:20px;font-size:.9em'>" +
      "<option value='5'>5</option><option value='10' selected>10</option><option value='15'>15</option><option value='20'>20</option>" +
      "</select>" +
      "<div style='display:flex;gap:10px'>" +
      "<button id='st-custom-start' style='flex:1;padding:12px;border-radius:8px;background:#a78bfa;color:#fff;border:none;font-size:.95em;font-weight:600;cursor:pointer'>Start</button>" +
      "<button id='st-custom-cancel' style='flex:1;padding:12px;border-radius:8px;background:#52525b;color:#fff;border:none;font-size:.95em;cursor:pointer'>Cancel</button>" +
      "</div></div>";

    overlay.innerHTML = html;
    document.body.appendChild(overlay);

    overlay.querySelector("#st-custom-start").addEventListener("click", function () {
      var subject = overlay.querySelector("#st-custom-subject").value;
      var mode = overlay.querySelector("#st-custom-mode").value;
      var count = parseInt(overlay.querySelector("#st-custom-count").value);
      overlay.remove();
      startTraining(mode, { count: count, subject: subject });
    });
    overlay.querySelector("#st-custom-cancel").addEventListener("click", function () { overlay.remove(); });
  }

  // ==================== LAYER TOGGLE ====================

  window.setScienceLayer = function (layer) {
    if (layer === "instinct" || layer === "exam") {
      activeLayer = layer;
    }
  };

  window.toggleScienceHardMode = function () {
    activeHardMode = !activeHardMode;
    var toggle = document.getElementById("st-hard-toggle");
    if (toggle) toggle.checked = activeHardMode;
    return activeHardMode;
  };

  // ==================== INITIALIZATION ====================

  function initScienceTraining() {
    // Check for cached session
    var cached = restoreCachedSession();
    if (cached) {
      session = cached;
      renderFullUI();
      showQuestion();
      return;
    }

    var container = document.getElementById("science-training-container");
    if (container) {
      container.innerHTML = renderMenu();
    }
    bindEvents();
  }

  // Expose public API
  window.initScienceTraining = initScienceTraining;
  window.startScienceTraining = startTraining;
  window.getScienceGenerators = function () { return GENERATORS; };
  window.getScienceTopics = function () { return SCI_TOPICS; };
  window.getScienceState = loadState;
  window.getScienceMistakes = loadMistakes;
  window.getScienceRank = function () { return getRank(loadState().totalPoints); };
  window.hasCachedScienceSession = function () { try { return !!sessionStorage.getItem(SESSION_CACHE_KEY); } catch (e) { return false; } };
  window.clearCachedScienceSession = clearSessionCache;

  // Auto-init if DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      if (document.getElementById("science-training-container")) initScienceTraining();
    });
  } else {
    if (document.getElementById("science-training-container")) initScienceTraining();
  }

})();
