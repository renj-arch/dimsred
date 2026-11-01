const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "neet", "chapters");

function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
}

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildPage(subject, chNum, chName, questions, navItems) {
  const cls = chNum <= 14 ? "11" : "12";
  const fileSlug = `${subject.toLowerCase()}-chapter-${chNum}-${slug(chName)}`;
  const title = `NEET ${subject} Chapter ${chNum}: ${chName} MCQ with Answers`;
  const desc = `Free NEET ${subject} Chapter ${chNum} (${chName}) MCQ with solutions. ${questions.length}+ practice questions.`;
  const canonical = `https://vlymbooq.qzz.io/neet/chapters/${fileSlug}.html`;

  const badgeColor = subject === "Physics" ? "#f87171" : "#fbbf24";
  const badgeBg = subject === "Physics" ? "248,113,113" : "251,191,36";

  const navHtml = navItems.map((n) => {
    const href = `${subject.toLowerCase()}-chapter-${n.num}-${slug(n.name)}.html`;
    const active = n.num === chNum ? ' class="active"' : "";
    return `<a href="${href}"${active}>Ch ${n.num}</a>`;
  }).join("\n            ");

  const qsJson = JSON.stringify(questions.map((q, idx) => ({
    id: idx + 1,
    text: esc(q.text),
    topic: q.topic,
    opts: q.opts.map(o => ({ l: o.l, t: esc(o.t), c: o.c || false })),
    sol: esc(q.sol)
  })));

  const totalQ = questions.length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <link rel='stylesheet' href='../../css/style.css'>
    <meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${desc}">
    <meta property="og:image" content="https://vlymbooq.qzz.io/logo.png">
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="icon" type="image/png" href="/logo.png">
    <link rel="canonical" href="${canonical}">
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage","name":"${title}","description":"${desc}","url":"${canonical}","educationalLevel":"Competitive Exam","audience":{"@type":"EducationalAudience","educationalRole":"student"},"publisher":{"@type":"Organization","name":"vlymbooq","url":"https://vlymbooq.qzz.io"}}</script>
    <style>
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap");
        *{margin:0;padding:0;box-sizing:border-box}
        :root{--bg:#09090b;--bg-card:#111113;--border:rgba(255,255,255,.06);--text:#fafafa;--text-sec:#a1a1aa;--text-muted:#52525b;--purple:#a78bfa;--emerald:#34d399;--radius:12px}
        body{font-family:Inter,-apple-system,sans-serif;background:var(--bg);color:var(--text)}
        a{color:var(--purple);text-decoration:none}
        .nav{position:sticky;top:0;z-index:100;padding:14px 24px;background:rgba(9,9,11,.85);border-bottom:1px solid var(--border)}
        .nav-inner{max-width:1100px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px}
        .brand{display:flex;align-items:center;gap:8px}
        .brand-icon{width:28px;height:28px;border-radius:6px;flex-shrink:0}
        .brand-text{font-weight:800;font-size:1.05em;background:linear-gradient(135deg,var(--purple),var(--emerald));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .nav-links{display:flex;gap:2px;flex-wrap:wrap}
        .nav-links a{padding:7px 14px;border-radius:100px;font-size:.82em;font-weight:500;color:#a1a1aa;transition:all .2s;white-space:nowrap}
        .nav-links a:hover{color:var(--text);background:rgba(255,255,255,.04)}
        .nav-links a.active{color:var(--text);background:rgba(255,255,255,.06)}
        .container{max-width:900px;margin:0 auto;padding:24px}
        .chapter-header{padding:24px 0;border-bottom:1px solid var(--border);margin-bottom:24px}
        .chapter-header .badge{display:inline-flex;padding:4px 12px;border-radius:100px;background:rgba(${badgeBg},.12);color:${badgeColor};font-size:.75em;font-weight:600;margin-bottom:8px}
        .chapter-header h1{font-size:1.6em;font-weight:900;margin-bottom:8px;line-height:1.2}
        .chapter-header .sub{color:var(--text-sec);font-size:.9em;line-height:1.6}
        .chapter-header .meta{display:flex;gap:12px;margin-top:10px;flex-wrap:wrap}
        .chapter-header .meta span{font-size:.8em;color:var(--text-muted)}
        .q-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:12px}
        .q-card .q-num{font-size:.78em;color:var(--text-muted);margin-bottom:4px;display:flex;justify-content:space-between}
        .q-card .q-topic{font-size:.7em;padding:2px 8px;border-radius:100px;background:rgba(167,139,250,.1);color:var(--purple)}
        .q-card .q-text{font-size:.93em;margin-bottom:10px;line-height:1.6;font-weight:500}
        .q-card .q-opts{display:grid;grid-template-columns:1fr 1fr;gap:6px}
        @media(max-width:500px){.q-card .q-opts{grid-template-columns:1fr}}
        .q-card .q-opt{padding:8px 12px;border-radius:8px;border:1px solid var(--border);cursor:pointer;font-size:.82em;transition:all .15s}
        .q-card .q-opt:hover{border-color:rgba(255,255,255,.15)}
        .q-card .q-opt.correct{border-color:var(--emerald);background:rgba(52,211,153,.1)}
        .q-card .q-opt.wrong{border-color:#ef4444;background:rgba(239,68,68,.1);color:#ef4444}
        .q-card .q-opt.disabled{pointer-events:none;opacity:.7}
        .q-card .q-soln{display:none;margin-top:10px;padding:10px;background:rgba(139,92,246,.06);border-radius:8px;font-size:.82em;color:var(--text-sec);line-height:1.5}
        .q-card .q-soln.show{display:block}
        .q-card .q-soln strong{color:var(--emerald)}
        .q-card .q-result{font-size:.78em;font-weight:600;margin-top:6px}
        .q-card .q-result.correct{color:var(--emerald)}
        .q-card .q-result.wrong{color:#ef4444}
        .ch-list{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px}
        .ch-list a{padding:5px 12px;border-radius:100px;font-size:.8em;border:1px solid var(--border);color:var(--text-sec);transition:all .2s}
        .ch-list a:hover{border-color:var(--purple);color:var(--purple)}
        .ch-list a.active{background:rgba(167,139,250,.12);border-color:var(--purple);color:var(--purple)}
        .pdf-dl{display:flex;align-items:center;gap:12px;padding:14px 18px;background:rgba(52,211,153,.04);border:1px solid rgba(52,211,153,.1);border-radius:var(--radius);margin:20px 0}
        .pdf-dl button{padding:8px 20px;border-radius:100px;background:rgba(52,211,153,.12);color:var(--emerald);font-weight:600;font-size:.82em;border:none;cursor:pointer}
        .pdf-dl button:hover{background:rgba(52,211,153,.2)}
        .score-bar{background:rgba(255,255,255,.02);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}
        .score-bar .score{font-size:1.3em;font-weight:800;color:var(--purple)}
        .score-bar .score .denom{color:var(--text-muted);font-weight:400}
        .score-bar button{padding:6px 16px;border-radius:100px;background:rgba(255,255,255,.04);color:var(--text-sec);border:1px solid var(--border);cursor:pointer;font-size:.78em}
        @media print{.nav,.score-bar,.pdf-dl,.ch-list{display:none}.q-card .q-soln{display:block!important}}
    </style>
</head>
<body>
    <nav class="nav"><div class="nav-inner"><a href="../index.html" class="brand"><img src="/logo.png" alt="" class="brand-icon"><span class="brand-text">vlymbooq</span></a><div class="nav-links"><a href="../index.html">Home</a><a href="../../dashboard.html">Dashboard</a><a href="../../dashboard.html">Community</a><a href="../index.html" class="active">NEET</a></div></div></nav>
    <div class="container">
        <div class="ch-list">
            ${navHtml}
        </div>
        <div class="chapter-header">
            <div class="badge">NEET ${subject} &middot; NCERT Class ${cls}</div>
            <h1>Chapter ${chNum}: ${chName} &mdash; MCQ with Answers</h1>
            <div class="sub">${totalQ} NEET-level MCQs on ${chName} covering key concepts from NCERT Class ${cls} syllabus.</div>
            <div class="meta"><span>${totalQ} Questions</span><span>${totalQ} Minutes</span><span>+4, -1 Marking</span><span>NCERT Based</span></div>
        </div>
        <div class="score-bar"><div><span class="score" id="c-count">0</span><span class="denom"> / ${totalQ}</span></div><div><span id="acc-pct" style="font-weight:700;color:var(--emerald)">0%</span></div><button onclick="resetQ()">&#x1f504; Reset</button></div>
        <div id="q-cont"></div>
        <div class="pdf-dl"><div style="flex:1"><strong>&#x1f4c4; Chapter ${chNum} PDF</strong><br><span style="font-size:.8em;color:var(--text-muted)">Download for offline practice</span></div><button onclick="window.print()">&#x2b07; Download PDF</button></div>
    </div>
    <script>
    var qs = ${qsJson};
    var an={},cc=0;
    function getCL(q){for(var i=0;i<q.opts.length;i++){if(q.opts[i].c)return q.opts[i].l+". "+q.opts[i].t}return""}
    function rd(){var c=document.getElementById("q-cont"),h="";for(var i=0;i<qs.length;i++){var q=qs[i],o="";for(var j=0;j<q.opts.length;j++){o+='<div class="q-opt" data-q="'+q.id+'" data-i="'+j+'" onclick="so('+q.id+","+j+')">'+q.opts[j].l+". "+q.opts[j].t+"</div>"}h+='<div class="q-card" id="q-'+q.id+'"><div class="q-num"><span>Question '+(i+1)+" of "+qs.length+"</span><span class="q-topic">"+q.topic+"</span></div><div class="q-text">'+q.text+"</div><div class="q-opts">"+o+'</div><div class="q-soln" id="sn-'+q.id+'"><strong>\\u2713 Correct: </strong>'+getCL(q)+".<br>"+q.sol+'</div><div class="q-result" id="r-'+q.id+'"></div></div>}c.innerHTML=h;uc()}
    function so(id,idx){if(an[id])return;an[id]=true;var q=qs.filter(function(x){return x.id===id})[0];var os=document.querySelectorAll("#q-"+id+" .q-opt");var cr=q.opts[idx].c;for(var i=0;i<os.length;i++)os[i].classList.add("disabled");if(cr){os[idx].classList.add("correct");document.getElementById("r-"+id).textContent="+4 Correct!";cc++;}else{os[idx].classList.add("wrong");for(var i=0;i<q.opts.length;i++){if(q.opts[i].c)os[i].classList.add("correct")}document.getElementById("r-"+id).textContent="-1 Wrong"}document.getElementById("sn-"+id).classList.add("show");uc()}
    function uc(){document.getElementById("c-count").textContent=cc;var t=Object.keys(an).length;document.getElementById("acc-pct").textContent=(t>0?Math.round(cc/t*100):0)+"%"}
    function resetQ(){if(!confirm("Reset?"))return;an={};cc=0;document.querySelectorAll(".q-card").forEach(function(c){c.querySelectorAll(".q-opt").forEach(function(e){e.className="q-opt"});c.querySelector(".q-soln").classList.remove("show");c.querySelector(".q-result").className="q-result";c.querySelector(".q-result").textContent=""});uc()}
    rd();
    </script>
</body>
</html>`;
}

const PHYSICS_CHAPTERS = [
  { num: 1, name: "Physical World & Measurement", questions: [
    { text: "The SI unit of electric current is:", topic: "Units", opts: [{l:"A",t:"Ampere",c:true},{l:"B",t:"Volt"},{l:"C",t:"Ohm"},{l:"D",t:"Coulomb"}], sol: "Ampere (A) is the SI base unit of electric current." },
    { text: "Which of the following is a derived unit?", topic: "Units", opts: [{l:"A",t:"Second"},{l:"B",t:"Kilogram"},{l:"C",t:"Newton",c:true},{l:"D",t:"Ampere"}], sol: "Newton (N) is derived as kg.m/s2; the others are base SI units." },
    { text: "The dimensions of work are:", topic: "Dimensions", opts: [{l:"A",t:"[ML2T-2]",c:true},{l:"B",t:"[MLT-2]"},{l:"C",t:"[ML2T-1]"},{l:"D",t:"[MLT-1]"}], sol: "Work = Force x Displacement = [MLT-2][L] = [ML2T-2]." },
    { text: "1 fermi is equal to:", topic: "Units", opts: [{l:"A",t:"10-12 m"},{l:"B",t:"10-15 m",c:true},{l:"C",t:"10-9 m"},{l:"D",t:"10-18 m"}], sol: "1 fermi (fm) = 10-15 m, used for nuclear sizes." },
    { text: "How many significant figures are in 0.00560?", topic: "Significant Figures", opts: [{l:"A",t:"3",c:true},{l:"B",t:"4"},{l:"C",t:"5"},{l:"D",t:"2"}], sol: "Leading zeros are insignificant; trailing zeros after decimal count. So 3 significant figures." },
    { text: "The error in radius measurement is 2%. The error in volume will be:", topic: "Errors", opts: [{l:"A",t:"2%"},{l:"B",t:"4%"},{l:"C",t:"6%",c:true},{l:"D",t:"8%"}], sol: "V varies as r3, so error in V = 3 x (Dr/r) = 3 x 2% = 6%." },
    { text: "Which instrument measures the diameter of a wire most precisely?", topic: "Measurement", opts: [{l:"A",t:"Vernier caliper"},{l:"B",t:"Screw gauge",c:true},{l:"C",t:"Meter scale"},{l:"D",t:"Thermometer"}], sol: "Screw gauge (micrometer) measures small diameters with 0.01 mm precision." },
    { text: "The dimensional formula of Planck's constant h is:", topic: "Dimensions", opts: [{l:"A",t:"[ML2T-1]",c:true},{l:"B",t:"[MLT-1]"},{l:"C",t:"[ML2T-2]"},{l:"D",t:"[MLT-2]"}], sol: "E = hf, so h = E/f = [ML2T-2]/[T-1] = [ML2T-1]." },
    { text: "The SI unit of solid angle is:", topic: "Units", opts: [{l:"A",t:"Radian"},{l:"B",t:"Steradian",c:true},{l:"C",t:"Degree"},{l:"D",t:"Gradian"}], sol: "Steradian (sr) is the SI unit of solid angle." },
    { text: "If percentage error in length is 1% and in time period is 2%, error in g (g = 4p2L/T2) is:", topic: "Errors", opts: [{l:"A",t:"3%"},{l:"B",t:"5%",c:true},{l:"C",t:"1%"},{l:"D",t:"4%"}], sol: "Dg/g = DL/L + 2DT/T = 1% + 2x2% = 5%." }
  ]},
  { num: 2, name: "Motion in a Straight Line", questions: [
    { text: "A car moves with uniform velocity 20 m/s for 10 s. Distance covered is:", topic: "Kinematics", opts: [{l:"A",t:"100 m"},{l:"B",t:"200 m",c:true},{l:"C",t:"150 m"},{l:"D",t:"50 m"}], sol: "Distance = velocity x time = 20 x 10 = 200 m." },
    { text: "The slope of a velocity-time graph gives:", topic: "Graphs", opts: [{l:"A",t:"Displacement"},{l:"B",t:"Acceleration",c:true},{l:"C",t:"Force"},{l:"D",t:"Momentum"}], sol: "Slope of v-t graph = dv/dt = acceleration." },
    { text: "A body starts from rest and accelerates at 2 m/s2 for 5 s. Final velocity is:", topic: "Kinematics", opts: [{l:"A",t:"5 m/s"},{l:"B",t:"10 m/s",c:true},{l:"C",t:"15 m/s"},{l:"D",t:"20 m/s"}], sol: "v = u + at = 0 + 2x5 = 10 m/s." },
    { text: "The area under an acceleration-time graph represents:", topic: "Graphs", opts: [{l:"A",t:"Velocity"},{l:"B",t:"Displacement"},{l:"C",t:"Change in velocity",c:true},{l:"D",t:"Force"}], sol: "Integral a dt = Dv, so area = change in velocity." },
    { text: "A ball thrown upward reaches 20 m height. Initial velocity is (g = 10 m/s2):", topic: "Kinematics", opts: [{l:"A",t:"10 m/s"},{l:"B",t:"20 m/s",c:true},{l:"C",t:"30 m/s"},{l:"D",t:"40 m/s"}], sol: "v2 = u2 - 2gh, 0 = u2 - 2x10x20, u = 20 m/s." },
    { text: "Which is a vector quantity?", topic: "Scalars-Vectors", opts: [{l:"A",t:"Speed"},{l:"B",t:"Distance"},{l:"C",t:"Displacement",c:true},{l:"D",t:"Time"}], sol: "Displacement has both magnitude and direction; speed, distance, time are scalars." },
    { text: "Equal distances in equal time intervals means:", topic: "Motion", opts: [{l:"A",t:"Uniform velocity",c:true},{l:"B",t:"Uniform acceleration"},{l:"C",t:"Variable velocity"},{l:"D",t:"Variable acceleration"}], sol: "Equal distances in equal times implies constant speed (uniform velocity)." },
    { text: "A stone dropped from a tower takes 4 s to reach ground. Height is (g = 10 m/s2):", topic: "Kinematics", opts: [{l:"A",t:"40 m"},{l:"B",t:"80 m",c:true},{l:"C",t:"160 m"},{l:"D",t:"20 m"}], sol: "h = (1/2)gt2 = 0.5 x 10 x 16 = 80 m." },
    { text: "Retardation means:", topic: "Kinematics", opts: [{l:"A",t:"Negative acceleration",c:true},{l:"B",t:"Zero acceleration"},{l:"C",t:"Positive acceleration"},{l:"D",t:"Constant velocity"}], sol: "Retardation (deceleration) is negative acceleration." },
    { text: "A body covers half distance at speed v1 and other half at v2. Average speed is:", topic: "Kinematics", opts: [{l:"A",t:"(v1+v2)/2"},{l:"B",t:"2v1v2/(v1+v2)",c:true},{l:"C",t:"Sqrt(v1v2)"},{l:"D",t:"v1v2/(v1+v2)"}], sol: "For equal distances, average speed = harmonic mean = 2v1v2/(v1+v2)." }
  ]},
  { num: 3, name: "Motion in a Plane", questions: [
    { text: "A vector A has magnitude 5 at 60 to x-axis. Its x-component is:", topic: "Vectors", opts: [{l:"A",t:"2.5",c:true},{l:"B",t:"4.33"},{l:"C",t:"5"},{l:"D",t:"3"}], sol: "Ax = A cos 60 = 5 x 0.5 = 2.5." },
    { text: "Maximum projectile range occurs at angle:", topic: "Projectile", opts: [{l:"A",t:"30"},{l:"B",t:"45",c:true},{l:"C",t:"60"},{l:"D",t:"90"}], sol: "Maximum range at 45 for a given initial speed." },
    { text: "Two vectors of magnitudes 3 and 4 have resultant 5. Angle between them is:", topic: "Vectors", opts: [{l:"A",t:"0"},{l:"B",t:"60"},{l:"C",t:"90",c:true},{l:"D",t:"180"}], sol: "R2 = A2+B2+2AB cos q, 25 = 9+16+24 cos q, cos q = 0, q = 90." },
    { text: "Horizontal acceleration in projectile motion is:", topic: "Projectile", opts: [{l:"A",t:"g"},{l:"B",t:"0",c:true},{l:"C",t:"-g"},{l:"D",t:"2g"}], sol: "No horizontal force in ideal projectile motion, so horizontal acceleration = 0." },
    { text: "Time of flight for a projectile with speed u at angle q is:", topic: "Projectile", opts: [{l:"A",t:"2u sin q/g",c:true},{l:"B",t:"u sin q/g"},{l:"C",t:"2u cos q/g"},{l:"D",t:"u cos q/g"}], sol: "T = 2u sin q / g." },
    { text: "Dot product of two vectors is maximum when angle is:", topic: "Vectors", opts: [{l:"A",t:"0",c:true},{l:"B",t:"90"},{l:"C",t:"180"},{l:"D",t:"60"}], sol: "A.B = AB cos q, maximum at q = 0 (cos 0 = 1)." },
    { text: "Maximum height of a projectile is:", topic: "Projectile", opts: [{l:"A",t:"u2 sin2q/2g",c:true},{l:"B",t:"u2 sin 2q/g"},{l:"C",t:"u2 cos2q/2g"},{l:"D",t:"u2/2g"}], sol: "H = u2 sin2q / 2g." },
    { text: "If i, j, k are unit vectors along x, y, z, then i.j equals:", topic: "Vectors", opts: [{l:"A",t:"1"},{l:"B",t:"0",c:true},{l:"C",t:"-1"},{l:"D",t:"i"}], sol: "i.j = |i||j| cos 90 = 0, as they are perpendicular." },
    { text: "The horizontal range is maximum when angle of projection is:", topic: "Projectile", opts: [{l:"A",t:"30"},{l:"B",t:"45",c:true},{l:"C",t:"60"},{l:"D",t:"90"}], sol: "R = u2 sin 2q/g; max when sin 2q = 1 => q = 45." },
    { text: "Condition for two vectors to be perpendicular:", topic: "Vectors", opts: [{l:"A",t:"A.B = 0",c:true},{l:"B",t:"A x B = 0"},{l:"C",t:"|A| = |B|"},{l:"D",t:"A.B = AB"}], sol: "Dot product = 0 for perpendicular vectors." }
  ]},
  { num: 4, name: "Laws of Motion", questions: [
    { text: "Newton's first law defines:", topic: "Newtons Laws", opts: [{l:"A",t:"Force"},{l:"B",t:"Inertia",c:true},{l:"C",t:"Momentum"},{l:"D",t:"Energy"}], sol: "First law (inertia): a body at rest stays at rest unless acted upon by external force." },
    { text: "SI unit of force is:", topic: "Force", opts: [{l:"A",t:"Joule"},{l:"B",t:"Newton",c:true},{l:"C",t:"Pascal"},{l:"D",t:"Watt"}], sol: "Force is in Newtons (N): 1 N = 1 kg.m/s2." },
    { text: "A force of 10 N acts on a 2 kg mass for 3 s. Change in momentum is:", topic: "Momentum", opts: [{l:"A",t:"10 kg.m/s"},{l:"B",t:"20 kg.m/s"},{l:"C",t:"30 kg.m/s",c:true},{l:"D",t:"15 kg.m/s"}], sol: "Dp = F x t = 10 x 3 = 30 kg.m/s (impulse-momentum theorem)." },
    { text: "Action and reaction forces act on:", topic: "Newtons Laws", opts: [{l:"A",t:"Same body"},{l:"B",t:"Different bodies",c:true},{l:"C",t:"Same point"},{l:"D",t:"Same direction"}], sol: "Newtons third law: action and reaction act on two different bodies." },
    { text: "A 5 kg box pushed with 20 N on frictionless surface accelerates at:", topic: "Force", opts: [{l:"A",t:"2 m/s2"},{l:"B",t:"4 m/s2",c:true},{l:"C",t:"5 m/s2"},{l:"D",t:"10 m/s2"}], sol: "a = F/m = 20/5 = 4 m/s2." },
    { text: "Which is a conservative force?", topic: "Forces", opts: [{l:"A",t:"Friction"},{l:"B",t:"Air resistance"},{l:"C",t:"Gravitational force",c:true},{l:"D",t:"Tension"}], sol: "Gravitational force is conservative; work done is path-independent." },
    { text: "Coefficient of friction depends on:", topic: "Friction", opts: [{l:"A",t:"Area of contact"},{l:"B",t:"Nature of surfaces",c:true},{l:"C",t:"Relative velocity"},{l:"D",t:"All of these"}], sol: "Coefficient m depends only on the nature (roughness/material) of surfaces." },
    { text: "A 60 kg person stands in an elevator accelerating upward at 2 m/s2. Scale reading is (g = 10 m/s2):", topic: "Apparent Weight", opts: [{l:"A",t:"600 N"},{l:"B",t:"720 N",c:true},{l:"C",t:"480 N"},{l:"D",t:"0 N"}], sol: "N = m(g+a) = 60(10+2) = 720 N." },
    { text: "Limiting friction depends on:", topic: "Friction", opts: [{l:"A",t:"Normal reaction",c:true},{l:"B",t:"Velocity"},{l:"C",t:"Area"},{l:"D",t:"Shape"}], sol: "fs(max) = ms N, depends on normal reaction and coefficient of static friction." },
    { text: "Centripetal force for mass m moving in a circle of radius r at speed v is:", topic: "Circular Motion", opts: [{l:"A",t:"mv2/r",c:true},{l:"B",t:"mvr"},{l:"C",t:"mv/r"},{l:"D",t:"mr2v"}], sol: "Centripetal force F = mv2/r directed toward the center." }
  ]},
  { num: 5, name: "Work, Energy and Power", questions: [
    { text: "Work done by centripetal force is:", topic: "Work", opts: [{l:"A",t:"Positive"},{l:"B",t:"Zero",c:true},{l:"C",t:"Negative"},{l:"D",t:"Infinite"}], sol: "Centripetal force is perpendicular to displacement, so work = 0." },
    { text: "Kinetic energy of mass m moving at speed v is:", topic: "Energy", opts: [{l:"A",t:"mv2"},{l:"B",t:"(1/2)mv2",c:true},{l:"C",t:"mgh"},{l:"D",t:"(1/2)mv"}], sol: "KE = (1/2)mv2." },
    { text: "Potential energy stored in a spring stretched by x (constant k) is:", topic: "Energy", opts: [{l:"A",t:"(1/2)kx2",c:true},{l:"B",t:"kx2"},{l:"C",t:"(1/2)kx"},{l:"D",t:"kx"}], sol: "Elastic PE = (1/2)kx2." },
    { text: "If speed is doubled, kinetic energy becomes:", topic: "Energy", opts: [{l:"A",t:"Half"},{l:"B",t:"Double"},{l:"C",t:"Four times",c:true},{l:"D",t:"Unchanged"}], sol: "KE varies as v2, so doubling v quadruples KE." },
    { text: "SI unit of power is:", topic: "Power", opts: [{l:"A",t:"Joule"},{l:"B",t:"Watt",c:true},{l:"C",t:"Newton"},{l:"D",t:"Pascal"}], sol: "Power is in Watts (W): 1 W = 1 J/s." },
    { text: "A force F = (3i+4j) N moves a body through d = (2i+3j) m. Work done is:", topic: "Work", opts: [{l:"A",t:"12 J"},{l:"B",t:"18 J",c:true},{l:"C",t:"24 J"},{l:"D",t:"6 J"}], sol: "W = F.d = 3x2 + 4x3 = 6 + 12 = 18 J." },
    { text: "Work-energy theorem states:", topic: "Work-Energy", opts: [{l:"A",t:"W = DKE",c:true},{l:"B",t:"W = DPE"},{l:"C",t:"W = DP"},{l:"D",t:"W = F.d"}], sol: "Work-energy theorem: net work = change in kinetic energy." },
    { text: "A 50 g bullet moving at 400 m/s has kinetic energy:", topic: "Energy", opts: [{l:"A",t:"4000 J",c:true},{l:"B",t:"2000 J"},{l:"C",t:"8000 J"},{l:"D",t:"1000 J"}], sol: "KE = 0.5 x 0.05 x 4002 = 4000 J." },
    { text: "A 500 kg lift moves up at constant 2 m/s. Motor power is (g = 10 m/s2):", topic: "Power", opts: [{l:"A",t:"5 kW"},{l:"B",t:"10 kW",c:true},{l:"C",t:"2 kW"},{l:"D",t:"20 kW"}], sol: "P = Fv = mgv = 500 x 10 x 2 = 10000 W = 10 kW." },
    { text: "Two bodies of masses m and 4m have equal KE. Ratio of their momenta is:", topic: "Energy-Momentum", opts: [{l:"A",t:"1:2",c:true},{l:"B",t:"1:4"},{l:"C",t:"2:1"},{l:"D",t:"4:1"}], sol: "KE = p2/2m, so p varies as sqrt(m). p1/p2 = sqrt(m/4m) = 1/2." }
  ]},
  { num: 6, name: "System of Particles & Rotational Motion", questions: [
    { text: "Center of mass of a uniform rod lies at its:", topic: "Center of Mass", opts: [{l:"A",t:"Midpoint",c:true},{l:"B",t:"Endpoint"},{l:"C",t:"One-third length"},{l:"D",t:"Quarter length"}], sol: "For a uniform rod, COM is at the geometric center (midpoint)." },
    { text: "Moment of inertia depends on:", topic: "Moment of Inertia", opts: [{l:"A",t:"Mass only"},{l:"B",t:"Mass distribution about axis",c:true},{l:"C",t:"Velocity"},{l:"D",t:"Angular velocity"}], sol: "I depends on mass distribution relative to the axis of rotation." },
    { text: "MI of a ring of mass M and radius R about its central axis is:", topic: "Moment of Inertia", opts: [{l:"A",t:"MR2/2"},{l:"B",t:"MR2",c:true},{l:"C",t:"2MR2/5"},{l:"D",t:"MR2/3"}], sol: "For a ring: I = MR2 about its central perpendicular axis." },
    { text: "Radius of gyration depends on:", topic: "Radius of Gyration", opts: [{l:"A",t:"Axis of rotation",c:true},{l:"B",t:"Mass"},{l:"C",t:"Angular speed"},{l:"D",t:"Torque"}], sol: "Radius of gyration K = sqrt(I/M) depends on axis and mass distribution." },
    { text: "Angular momentum L is given by:", topic: "Angular Momentum", opts: [{l:"A",t:"I w",c:true},{l:"B",t:"I a"},{l:"C",t:"mvr"},{l:"D",t:"Iw2/2"}], sol: "L = Iw (angular momentum = moment of inertia x angular velocity)." },
    { text: "A torque of 10 N.m acts for 2 s. Change in angular momentum is:", topic: "Angular Momentum", opts: [{l:"A",t:"5 kg.m2/s"},{l:"B",t:"20 kg.m2/s",c:true},{l:"C",t:"10 kg.m2/s"},{l:"D",t:"40 kg.m2/s"}], sol: "t = dL/dt, so DL = t Dt = 10 x 2 = 20 kg.m2/s." },
    { text: "MI of a disc about its perpendicular central axis is:", topic: "Moment of Inertia", opts: [{l:"A",t:"MR2"},{l:"B",t:"MR2/2",c:true},{l:"C",t:"2MR2/5"},{l:"D",t:"MR2/3"}], sol: "For a disc: I = MR2/2 about the central perpendicular axis." },
    { text: "Condition for rotational equilibrium:", topic: "Equilibrium", opts: [{l:"A",t:"SF = 0"},{l:"B",t:"St = 0",c:true},{l:"C",t:"v = 0"},{l:"D",t:"w = 0"}], sol: "For rotational equilibrium, net torque (St) about any point must be zero." },
    { text: "Angular momentum of mass m moving with speed v at distance r perpendicularly:", topic: "Angular Momentum", opts: [{l:"A",t:"mvr",c:true},{l:"B",t:"mvr/2"},{l:"C",t:"2mvr"},{l:"D",t:"mv/r"}], sol: "L = mvr for perpendicular motion about a point distance r away." },
    { text: "Parallel axis theorem relates I about any axis to I about:", topic: "Moment of Inertia", opts: [{l:"A",t:"Any other parallel axis"},{l:"B",t:"Parallel axis through COM",c:true},{l:"C",t:"Perpendicular axis"},{l:"D",t:"Central axis"}], sol: "I = Icm + Mh2, where h is distance between parallel axes." }
  ]},
  { num: 7, name: "Gravitation", questions: [
    { text: "Universal law of gravitation was given by:", topic: "Gravitation", opts: [{l:"A",t:"Galileo"},{l:"B",t:"Newton",c:true},{l:"C",t:"Kepler"},{l:"D",t:"Einstein"}], sol: "Newton formulated universal gravitation in Principia (1687)." },
    { text: "Value of gravitational constant G is:", topic: "Gravitation", opts: [{l:"A",t:"9.8 m/s2"},{l:"B",t:"6.67 x 10-11 N.m2/kg2",c:true},{l:"C",t:"6.67 x 1011 N.m2/kg2"},{l:"D",t:"3 x 108 m/s"}], sol: "G = 6.67 x 10-11 N.m2/kg2." },
    { text: "Acceleration due to gravity at depth d below earth surface:", topic: "Gravity", opts: [{l:"A",t:"Increases"},{l:"B",t:"Decreases",c:true},{l:"C",t:"Remains same"},{l:"D",t:"Zero at all depths"}], sol: "g = g(1 - d/R), so gravity decreases with depth." },
    { text: "Escape velocity on earth is approximately:", topic: "Gravitation", opts: [{l:"A",t:"11.2 km/s",c:true},{l:"B",t:"22.4 km/s"},{l:"C",t:"7.9 km/s"},{l:"D",t:"3 km/s"}], sol: "ve = sqrt(2GM/R) approx 11.2 km/s for Earth." },
    { text: "Period of a geostationary satellite is:", topic: "Satellites", opts: [{l:"A",t:"12 h"},{l:"B",t:"24 h",c:true},{l:"C",t:"48 h"},{l:"D",t:"6 h"}], sol: "Geostationary satellites have orbital period = 24 hours." },
    { text: "Kepler's second law is also called:", topic: "Keplers Laws", opts: [{l:"A",t:"Law of orbits"},{l:"B",t:"Law of areas",c:true},{l:"C",t:"Law of periods"},{l:"D",t:"Law of gravity"}], sol: "Kepler's second law: radius vector sweeps equal areas in equal times." },
    { text: "Weightlessness in a satellite is due to:", topic: "Weightlessness", opts: [{l:"A",t:"Zero g"},{l:"B",t:"Free fall",c:true},{l:"C",t:"No gravity"},{l:"D",t:"High speed"}], sol: "Satellites are in continuous free fall, creating weightlessness." },
    { text: "If distance between two masses is halved, gravitational force becomes:", topic: "Gravitation", opts: [{l:"A",t:"Half"},{l:"B",t:"Double"},{l:"C",t:"Four times",c:true},{l:"D",t:"Unchanged"}], sol: "F varies as 1/r2, so halving r gives 4x force." },
    { text: "Orbital velocity near earth surface is:", topic: "Satellites", opts: [{l:"A",t:"7.9 km/s",c:true},{l:"B",t:"11.2 km/s"},{l:"C",t:"3.1 km/s"},{l:"D",t:"5 km/s"}], sol: "vo = sqrt(gR) approx 7.9 km/s for low Earth orbit." },
    { text: "Gravitational potential at infinity is:", topic: "Potential", opts: [{l:"A",t:"0",c:true},{l:"B",t:"Infinite"},{l:"C",t:"Negative"},{l:"D",t:"Positive"}], sol: "Gravitational potential is conventionally zero at infinity." }
  ]},
  { num: 8, name: "Mechanical Properties of Solids", questions: [
    { text: "Stress is defined as:", topic: "Stress-Strain", opts: [{l:"A",t:"Force/Area",c:true},{l:"B",t:"Area/Force"},{l:"C",t:"Force x Area"},{l:"D",t:"Force x Length"}], sol: "Stress = Force / Area (unit: Pa or N/m2)." },
    { text: "SI unit of Young's modulus is:", topic: "Elasticity", opts: [{l:"A",t:"N/m"},{l:"B",t:"N/m2",c:true},{l:"C",t:"N.m"},{l:"D",t:"N.m2"}], sol: "Young's modulus = stress/strain, unit N/m2 (Pa)." },
    { text: "Hooke's law states stress is proportional to:", topic: "Elasticity", opts: [{l:"A",t:"Force"},{l:"B",t:"Strain",c:true},{l:"C",t:"Length"},{l:"D",t:"Area"}], sol: "Within elastic limit, stress varies as strain (Hooke's law)." },
    { text: "Which material has the highest Young's modulus?", topic: "Elasticity", opts: [{l:"A",t:"Rubber"},{l:"B",t:"Steel",c:true},{l:"C",t:"Wood"},{l:"D",t:"Copper"}], sol: "Steel has a very high Young's modulus (~2 x 1011 N/m2)." },
    { text: "Breaking stress of a wire depends on:", topic: "Strength", opts: [{l:"A",t:"Length"},{l:"B",t:"Material",c:true},{l:"C",t:"Diameter"},{l:"D",t:"Shape"}], sol: "Breaking stress is a material property, independent of dimensions." },
    { text: "Bulk modulus is defined for:", topic: "Elasticity", opts: [{l:"A",t:"Linear deformation"},{l:"B",t:"Volume deformation",c:true},{l:"C",t:"Shear deformation"},{l:"D",t:"Twisting"}], sol: "Bulk modulus (K) relates volume stress (pressure) to volume strain." },
    { text: "A wire stretches 1 mm under load. If same wire of half radius is used, stretch under same load is:", topic: "Elasticity", opts: [{l:"A",t:"1 mm"},{l:"B",t:"2 mm"},{l:"C",t:"4 mm",c:true},{l:"D",t:"16 mm"}], sol: "DL = FL/AY. If r becomes r/2, A becomes A/4, so DL becomes 4x = 4 mm." },
    { text: "Shear modulus (G) relates:", topic: "Elasticity", opts: [{l:"A",t:"Longitudinal stress and strain"},{l:"B",t:"Shear stress and shear strain",c:true},{l:"C",t:"Volume stress and strain"},{l:"D",t:"All of these"}], sol: "Shear modulus G = shear stress / shear strain." },
    { text: "Elastic limit is the point beyond which:", topic: "Elasticity", opts: [{l:"A",t:"Hooke's law ceases",c:true},{l:"B",t:"Material breaks"},{l:"C",t:"Strain becomes zero"},{l:"D",t:"Stress becomes zero"}], sol: "Beyond elastic limit, deformation becomes permanent (plastic)." },
    { text: "Ratio of lateral strain to longitudinal strain is called:", topic: "Elasticity", opts: [{l:"A",t:"Young's modulus"},{l:"B",t:"Poisson's ratio",c:true},{l:"C",t:"Bulk modulus"},{l:"D",t:"Shear modulus"}], sol: "Poisson's ratio s = -lateral strain / longitudinal strain." }
  ]},
  { num: 9, name: "Mechanical Properties of Fluids", questions: [
    { text: "SI unit of pressure is:", topic: "Pressure", opts: [{l:"A",t:"N/m"},{l:"B",t:"N/m2",c:true},{l:"C",t:"N.m"},{l:"D",t:"kg/m3"}], sol: "Pressure = Force/Area => N/m2 = Pa (Pascal)." },
    { text: "Atmospheric pressure at sea level is about:", topic: "Pressure", opts: [{l:"A",t:"1.01 x 105 Pa",c:true},{l:"B",t:"1.01 x 103 Pa"},{l:"C",t:"106 Pa"},{l:"D",t:"102 Pa"}], sol: "1 atm = 1.013 x 105 Pa = 760 mm Hg." },
    { text: "Pascal's law is used in:", topic: "Fluid Mechanics", opts: [{l:"A",t:"Hydraulic lift",c:true},{l:"B",t:"Barometer"},{l:"C",t:"Thermometer"},{l:"D",t:"Manometer"}], sol: "Hydraulic lifts use Pascal's law: pressure transmitted equally through enclosed fluid." },
    { text: "Archimedes' principle deals with:", topic: "Buoyancy", opts: [{l:"A",t:"Viscosity"},{l:"B",t:"Buoyant force",c:true},{l:"C",t:"Surface tension"},{l:"D",t:"Pressure"}], sol: "Buoyant force = weight of displaced fluid (Archimedes' principle)." },
    { text: "Terminal velocity is reached when:", topic: "Viscosity", opts: [{l:"A",t:"Weight = buoyant force"},{l:"B",t:"Weight = buoyant force + viscous drag",c:true},{l:"C",t:"No forces act"},{l:"D",t:"Velocity is zero"}], sol: "At terminal velocity, net force = 0: mg = Fb + Fd." },
    { text: "Bernoulli's principle is derived from:", topic: "Fluid Dynamics", opts: [{l:"A",t:"Conservation of mass"},{l:"B",t:"Conservation of energy",c:true},{l:"C",t:"Conservation of momentum"},{l:"D",t:"Newtons second law"}], sol: "Bernoulli's equation is based on the work-energy theorem." },
    { text: "Rate of flow through a capillary tube is given by:", topic: "Viscosity", opts: [{l:"A",t:"Poiseuille's law",c:true},{l:"B",t:"Stokes law"},{l:"C",t:"Bernoulli's equation"},{l:"D",t:"Archimedes' principle"}], sol: "Poiseuille's law: V = Ppr4/8hL for laminar flow." },
    { text: "Surface tension has units of:", topic: "Surface Tension", opts: [{l:"A",t:"N/m",c:true},{l:"B",t:"N/m2"},{l:"C",t:"J/m"},{l:"D",t:"N.m"}], sol: "Surface tension = Force/Length => N/m (or J/m2)." },
    { text: "Angle of contact for mercury and glass is:", topic: "Surface Tension", opts: [{l:"A",t:"0"},{l:"B",t:"Acute"},{l:"C",t:"Obtuse (~135)",c:true},{l:"D",t:"180"}], sol: "Mercury has obtuse angle of contact (~135) with glass." },
    { text: "Stokes' law gives viscous force on a sphere as:", topic: "Viscosity", opts: [{l:"A",t:"6phrv",c:true},{l:"B",t:"4phrv"},{l:"C",t:"8phrv"},{l:"D",t:"2phrv"}], sol: "F = 6phrv (Stokes' law), h = viscosity, r = radius, v = velocity." }
  ]},
  { num: 10, name: "Thermal Properties of Matter", questions: [
    { text: "Which temperature scale is absolute?", topic: "Temperature", opts: [{l:"A",t:"Celsius"},{l:"B",t:"Fahrenheit"},{l:"C",t:"Kelvin",c:true},{l:"D",t:"Reaumur"}], sol: "Kelvin is the absolute thermodynamic temperature scale." },
    { text: "Coefficient of linear expansion a depends on:", topic: "Thermal Expansion", opts: [{l:"A",t:"Length only"},{l:"B",t:"Material",c:true},{l:"C",t:"Temperature change only"},{l:"D",t:"Cross-sectional area"}], sol: "a is a material property (per C or per K)." },
    { text: "SI unit of thermal conductivity is:", topic: "Conduction", opts: [{l:"A",t:"W/mK",c:true},{l:"B",t:"J/mK"},{l:"C",t:"W/m2K"},{l:"D",t:"J/K"}], sol: "Thermal conductivity k is in W/m.K." },
    { text: "Newton's law of cooling states:", topic: "Cooling", opts: [{l:"A",t:"dT/dt varies as (T-T0)",c:true},{l:"B",t:"dT/dt varies as T2"},{l:"C",t:"dT/dt = constant"},{l:"D",t:"dT/dt varies as 1/T"}], sol: "Rate of cooling varies as temperature difference between body and surroundings." },
    { text: "A bimetal strip bends on heating because:", topic: "Thermal Expansion", opts: [{l:"A",t:"Different expansion coefficients",c:true},{l:"B",t:"Different specific heats"},{l:"C",t:"Different conductivities"},{l:"D",t:"Same expansion coefficients"}], sol: "Two metals with different a values expand differently, causing bending." },
    { text: "Specific heat capacity of water is about:", topic: "Calorimetry", opts: [{l:"A",t:"1 J/gC"},{l:"B",t:"4.2 J/gC",c:true},{l:"C",t:"420 J/gC"},{l:"D",t:"0.1 J/gC"}], sol: "Water specific heat = 4.2 J/gC (4200 J/kgC)." },
    { text: "Heat transfer by radiation uses:", topic: "Radiation", opts: [{l:"A",t:"Medium"},{l:"B",t:"Electromagnetic waves",c:true},{l:"C",t:"Particles"},{l:"D",t:"Convection currents"}], sol: "Radiation requires no medium; travels via EM waves (infrared)." },
    { text: "Stefan-Boltzmann law: radiated power varies as:", topic: "Radiation", opts: [{l:"A",t:"T3"},{l:"B",t:"T4",c:true},{l:"C",t:"T2"},{l:"D",t:"T"}], sol: "P = esAT4, so P varies as T4." },
    { text: "100 g iron at 80C placed in 200 g water at 20C. Final temp (c_iron = 0.45 J/gC, c_water = 4.2 J/gC):", topic: "Calorimetry", opts: [{l:"A",t:"30C"},{l:"B",t:"40C"},{l:"C",t:"~22.9C",c:true},{l:"D",t:"50C"}], sol: "Heat lost = Heat gained: 100x0.45x(80-T) = 200x4.2x(T-20), T approx 22.9C." },
    { text: "Water equivalent of a calorimeter is:", topic: "Calorimetry", opts: [{l:"A",t:"Mass of water with same heat capacity",c:true},{l:"B",t:"Mass of calorimeter"},{l:"C",t:"Specific heat of water"},{l:"D",t:"Volume of water"}], sol: "Water equivalent = mass of water needing same heat for same temperature rise." }
  ]},
  { num: 11, name: "Thermodynamics", questions: [
    { text: "First law of thermodynamics is about:", topic: "First Law", opts: [{l:"A",t:"Conservation of mass"},{l:"B",t:"Conservation of energy",c:true},{l:"C",t:"Conservation of momentum"},{l:"D",t:"Entropy increase"}], sol: "First law: DQ = DU + DW (conservation of energy)." },
    { text: "In an isothermal process:", topic: "Processes", opts: [{l:"A",t:"Temperature constant",c:true},{l:"B",t:"Pressure constant"},{l:"C",t:"Volume constant"},{l:"D",t:"No heat exchange"}], sol: "Isothermal => constant temperature." },
    { text: "In an adiabatic process:", topic: "Processes", opts: [{l:"A",t:"Temp constant"},{l:"B",t:"DQ = 0",c:true},{l:"C",t:"DU = 0"},{l:"D",t:"Pressure constant"}], sol: "Adiabatic => no heat exchange (DQ = 0)." },
    { text: "Carnot engine has max efficiency when operating between:", topic: "Heat Engine", opts: [{l:"A",t:"Same temp"},{l:"B",t:"Two different temps",c:true},{l:"C",t:"Zero temp"},{l:"D",t:"Infinite temp"}], sol: "Carnot efficiency h = 1 - T2/T1, needs two reservoirs at different T." },
    { text: "Carnot engine efficiency is 50% when T1 = 600 K. T2 is:", topic: "Heat Engine", opts: [{l:"A",t:"200 K"},{l:"B",t:"300 K",c:true},{l:"C",t:"400 K"},{l:"D",t:"500 K"}], sol: "h = 1 - T2/T1, 0.5 = 1 - T2/600, T2 = 300 K." },
    { text: "Cp - Cv for ideal gas is:", topic: "Specific Heats", opts: [{l:"A",t:"R",c:true},{l:"B",t:"0"},{l:"C",t:"2R"},{l:"D",t:"R/2"}], sol: "For ideal gas: Cp - Cv = R (Mayer's relation)." },
    { text: "Second law of thermodynamics deals with:", topic: "Second Law", opts: [{l:"A",t:"Energy conservation"},{l:"B",t:"Entropy and direction",c:true},{l:"C",t:"Absolute zero"},{l:"D",t:"Heat capacity"}], sol: "Second law defines direction of spontaneous processes and entropy." },
    { text: "For a monatomic gas, g = Cp/Cv equals:", topic: "Specific Heats", opts: [{l:"A",t:"5/3",c:true},{l:"B",t:"7/5"},{l:"C",t:"4/3"},{l:"D",t:"3/2"}], sol: "For monatomic gas: Cv = 3R/2, Cp = 5R/2, g = 5/3." },
    { text: "A refrigerator works on:", topic: "Refrigerator", opts: [{l:"A",t:"Carnot cycle in reverse",c:true},{l:"B",t:"Isothermal expansion"},{l:"C",t:"Adiabatic compression"},{l:"D",t:"Free expansion"}], sol: "A refrigerator is a reversed heat engine (reverse Carnot cycle)." },
    { text: "Work done in an isochoric process is:", topic: "Processes", opts: [{l:"A",t:"Zero",c:true},{l:"B",t:"Positive"},{l:"C",t:"Negative"},{l:"D",t:"Infinite"}], sol: "Isochoric => DV = 0 => W = PDV = 0." }
  ]},
  { num: 12, name: "Kinetic Theory", questions: [
    { text: "Average KE of gas molecules varies as:", topic: "Kinetic Theory", opts: [{l:"A",t:"T",c:true},{l:"B",t:"T2"},{l:"C",t:"sqrt(T)"},{l:"D",t:"1/T"}], sol: "KE_avg = (3/2)kT, varies as absolute temperature." },
    { text: "RMS speed of gas molecules depends on:", topic: "Kinetic Theory", opts: [{l:"A",t:"Pressure only"},{l:"B",t:"Temp and molar mass",c:true},{l:"C",t:"Volume only"},{l:"D",t:"Number of molecules"}], sol: "vrms = sqrt(3RT/M), depends on T and M." },
    { text: "Which gas has highest rms speed at given temperature?", topic: "Kinetic Theory", opts: [{l:"A",t:"O2"},{l:"B",t:"N2"},{l:"C",t:"H2",c:true},{l:"D",t:"CO2"}], sol: "vrms varies as 1/sqrt(M), H2 (lowest M) has highest vrms." },
    { text: "Degrees of freedom for a diatomic gas molecule:", topic: "Degrees of Freedom", opts: [{l:"A",t:"3"},{l:"B",t:"5",c:true},{l:"C",t:"6"},{l:"D",t:"7"}], sol: "Diatomic: 3 translational + 2 rotational = 5 (at moderate T)." },
    { text: "Dalton's law of partial pressures applies to:", topic: "Gas Laws", opts: [{l:"A",t:"Ideal gases",c:true},{l:"B",t:"Real gases"},{l:"C",t:"Liquids"},{l:"D",t:"Solids"}], sol: "Dalton's law: total pressure = sum of partial pressures of non-reacting ideal gases." },
    { text: "Mean free path l of a gas molecule is:", topic: "Mean Free Path", opts: [{l:"A",t:"1/(sqrt2 p d2 n)",c:true},{l:"B",t:"sqrt2 p d2 n"},{l:"C",t:"p d2 n"},{l:"D",t:"1/(p d2 n)"}], sol: "l = 1/(sqrt2 p d2 n), n = number density, d = molecular diameter." },
    { text: "Boyle's law holds at constant:", topic: "Gas Laws", opts: [{l:"A",t:"Temperature",c:true},{l:"B",t:"Pressure"},{l:"C",t:"Volume"},{l:"D",t:"Moles"}], sol: "Boyle's law: P varies as 1/V at constant temperature." },
    { text: "One mole of any gas at STP occupies:", topic: "Gas Laws", opts: [{l:"A",t:"22.4 L",c:true},{l:"B",t:"11.2 L"},{l:"C",t:"44.8 L"},{l:"D",t:"5.6 L"}], sol: "At STP (0C, 1 atm), 1 mole occupies 22.4 L." },
    { text: "Ideal gas equation is:", topic: "Gas Laws", opts: [{l:"A",t:"PV = nRT",c:true},{l:"B",t:"PV = nkT"},{l:"C",t:"PV = RT"},{l:"D",t:"P = nRT/V2"}], sol: "Ideal gas law: PV = nRT, R = 8.314 J/mol.K." },
    { text: "At absolute zero, KE of gas molecules is:", topic: "Kinetic Theory", opts: [{l:"A",t:"Zero",c:true},{l:"B",t:"Maximum"},{l:"C",t:"Infinite"},{l:"D",t:"Equal to PE"}], sol: "At 0 K, molecular motion ceases => KE = 0." }
  ]},
  { num: 13, name: "Oscillations", questions: [
    { text: "SHM is characterized by:", topic: "SHM", opts: [{l:"A",t:"a varies as -x",c:true},{l:"B",t:"a varies as x"},{l:"C",t:"a = constant"},{l:"D",t:"v = constant"}], sol: "In SHM, acceleration varies as -displacement (restoring force)." },
    { text: "Time period of spring-mass system depends on:", topic: "SHM", opts: [{l:"A",t:"Mass and spring constant",c:true},{l:"B",t:"Amplitude"},{l:"C",t:"Gravity"},{l:"D",t:"Length"}], sol: "T = 2p sqrt(m/k), independent of amplitude (small oscillations)." },
    { text: "Time period of simple pendulum depends on:", topic: "Pendulum", opts: [{l:"A",t:"Mass"},{l:"B",t:"Length",c:true},{l:"C",t:"Amplitude (large angles)"},{l:"D",t:"Density"}], sol: "T = 2p sqrt(L/g), independent of mass and amplitude (small angles)." },
    { text: "Frequency is 5 Hz. Time period is:", topic: "SHM", opts: [{l:"A",t:"0.1 s"},{l:"B",t:"0.2 s",c:true},{l:"C",t:"0.5 s"},{l:"D",t:"5 s"}], sol: "T = 1/f = 1/5 = 0.2 s." },
    { text: "In SHM, velocity is maximum at:", topic: "SHM", opts: [{l:"A",t:"Extreme position"},{l:"B",t:"Mean position",c:true},{l:"C",t:"Midway"},{l:"D",t:"All points equally"}], sol: "v_max = Aw at the mean (equilibrium) position." },
    { text: "Damped oscillations have:", topic: "Damping", opts: [{l:"A",t:"Decreasing amplitude",c:true},{l:"B",t:"Increasing frequency"},{l:"C",t:"Constant energy"},{l:"D",t:"Increasing amplitude"}], sol: "In damped oscillation, energy dissipates => amplitude decays." },
    { text: "Resonance occurs when:", topic: "Resonance", opts: [{l:"A",t:"Driving freq = natural freq",c:true},{l:"B",t:"Driving freq > natural freq"},{l:"C",t:"Driving freq < natural freq"},{l:"D",t:"No driving force"}], sol: "Resonance = max amplitude when w_drive = w_natural." },
    { text: "Phase difference between displacement and velocity in SHM:", topic: "SHM", opts: [{l:"A",t:"0"},{l:"B",t:"p/2",c:true},{l:"C",t:"p"},{l:"D",t:"3p/2"}], sol: "v = Aw cos(wt+f) leads x = A sin(wt+f) by p/2." },
    { text: "Total energy of a particle in SHM is:", topic: "SHM Energy", opts: [{l:"A",t:"mw2A2/2",c:true},{l:"B",t:"mw2A2"},{l:"C",t:"mw2A2/4"},{l:"D",t:"2mw2A2"}], sol: "E_total = mw2A2/2 (constant, varies as A2)." },
    { text: "A pendulum clock runs slow. To correct it:", topic: "Pendulum", opts: [{l:"A",t:"Shorten the pendulum",c:true},{l:"B",t:"Lengthen the pendulum"},{l:"C",t:"Increase mass"},{l:"D",t:"Decrease mass"}], sol: "T varies as sqrt(L). If clock runs slow (T too large), shorten L." }
  ]},
  { num: 14, name: "Waves", questions: [
    { text: "Sound waves in air are:", topic: "Wave Types", opts: [{l:"A",t:"Transverse"},{l:"B",t:"Longitudinal",c:true},{l:"C",t:"Electromagnetic"},{l:"D",t:"Torsional"}], sol: "Sound waves in air are longitudinal (compression-rarefaction)." },
    { text: "Speed of sound in air depends on:", topic: "Wave Speed", opts: [{l:"A",t:"Temperature",c:true},{l:"B",t:"Frequency"},{l:"C",t:"Amplitude"},{l:"D",t:"Wavelength"}], sol: "v = sqrt(gRT/M), depends on temperature and nature of gas." },
    { text: "Beat frequency is:", topic: "Beats", opts: [{l:"A",t:"|f1 - f2|",c:true},{l:"B",t:"f1 + f2"},{l:"C",t:"(f1+f2)/2"},{l:"D",t:"|f1-f2|/2"}], sol: "Beat frequency = difference between two interfering frequencies." },
    { text: "Fundamental frequency of stretched string depends on:", topic: "Standing Waves", opts: [{l:"A",t:"Length, tension, linear density",c:true},{l:"B",t:"Amplitude"},{l:"C",t:"Source frequency"},{l:"D",t:"Temperature"}], sol: "f = (1/2L) sqrt(T/m) for fundamental mode." },
    { text: "Distance between adjacent nodes in stationary wave:", topic: "Standing Waves", opts: [{l:"A",t:"l/2",c:true},{l:"B",t:"l"},{l:"C",t:"l/4"},{l:"D",t:"2l"}], sol: "Distance between successive nodes = l/2." },
    { text: "Doppler effect in sound is observed when:", topic: "Doppler Effect", opts: [{l:"A",t:"Source or observer in motion",c:true},{l:"B",t:"Both stationary"},{l:"C",t:"Medium changes"},{l:"D",t:"Temperature changes"}], sol: "Doppler effect: apparent frequency changes due to relative motion." },
    { text: "Intensity of a wave varies as:", topic: "Wave Intensity", opts: [{l:"A",t:"Amplitude2",c:true},{l:"B",t:"Amplitude"},{l:"C",t:"Frequency"},{l:"D",t:"Wavelength"}], sol: "I varies as A2 (intensity varies as square of amplitude)." },
    { text: "When wave reflects from rigid boundary, phase change is:", topic: "Reflection", opts: [{l:"A",t:"0"},{l:"B",t:"p",c:true},{l:"C",t:"p/2"},{l:"D",t:"2p"}], sol: "Reflection from rigid boundary => phase change of p (180)." },
    { text: "Speed of sound in air at 0C is about:", topic: "Wave Speed", opts: [{l:"A",t:"330 m/s",c:true},{l:"B",t:"340 m/s"},{l:"C",t:"300 m/s"},{l:"D",t:"360 m/s"}], sol: "Speed of sound approx 330 m/s at 0C, ~340 m/s at room temp." },
    { text: "Organ pipes produce sound based on:", topic: "Standing Waves", opts: [{l:"A",t:"Standing waves in air columns",c:true},{l:"B",t:"Electromagnetic induction"},{l:"C",t:"Piezoelectric effect"},{l:"D",t:"String resonance"}], sol: "Organ pipes use standing longitudinal waves in air columns." }
  ]},
  { num: 15, name: "Electric Charges and Fields", questions: [
    { text: "SI unit of electric charge is:", topic: "Electrostatics", opts: [{l:"A",t:"Ampere"},{l:"B",t:"Coulomb",c:true},{l:"C",t:"Volt"},{l:"D",t:"Farad"}], sol: "Charge is measured in Coulombs (C)." },
    { text: "Coulomb's law gives force between:", topic: "Electrostatics", opts: [{l:"A",t:"Two point charges",c:true},{l:"B",t:"Two magnets"},{l:"C",t:"Charged and neutral bodies"},{l:"D",t:"Current-carrying wires"}], sol: "Coulomb's law: F = kq1q2/r2 for two point charges." },
    { text: "Value of 1/(4pe0) is:", topic: "Electrostatics", opts: [{l:"A",t:"9 x 109 N.m2/C2",c:true},{l:"B",t:"9 x 10-9 N.m2/C2"},{l:"C",t:"109 N.m2/C2"},{l:"D",t:"8.85 x 10-12 N.m2/C2"}], sol: "k = 1/(4pe0) approx 9 x 109 N.m2/C2." },
    { text: "Electric field lines originate from:", topic: "Electric Field", opts: [{l:"A",t:"Positive charge",c:true},{l:"B",t:"Negative charge"},{l:"C",t:"Neutral point"},{l:"D",t:"Magnetic pole"}], sol: "Electric field lines start at positive charges and end at negative charges." },
    { text: "Electric flux through closed surface is:", topic: "Gauss Law", opts: [{l:"A",t:"Q/e0",c:true},{l:"B",t:"Qe0"},{l:"C",t:"Q/2e0"},{l:"D",t:"Q2/e0"}], sol: "Gauss's law: F = Q_enclosed / e0." },
    { text: "Inside a uniformly charged spherical shell, electric field is:", topic: "Gauss Law", opts: [{l:"A",t:"Zero",c:true},{l:"B",t:"Maximum"},{l:"C",t:"Constant"},{l:"D",t:"Infinite"}], sol: "By Gauss's law, E = 0 inside a charged spherical shell." },
    { text: "Electric field due to a point charge at distance r is:", topic: "Electric Field", opts: [{l:"A",t:"kq/r2",c:true},{l:"B",t:"kq/r"},{l:"C",t:"kq2/r"},{l:"D",t:"kq/r3"}], sol: "E = kq/r2 (directed radially from the charge)." },
    { text: "Two charges +q and -q at small distance form a:", topic: "Dipole", opts: [{l:"A",t:"Electric dipole",c:true},{l:"B",t:"Monopole"},{l:"C",t:"Quadrupole"},{l:"D",t:"Magnetic dipole"}], sol: "Electric dipole: equal and opposite charges separated by distance." },
    { text: "Dipole moment p is:", topic: "Dipole", opts: [{l:"A",t:"q x 2a",c:true},{l:"B",t:"q/a"},{l:"C",t:"q2a"},{l:"D",t:"2a/q"}], sol: "p = q x (2a), directed from -q to +q." },
    { text: "A charge of 2 mC in an electric field of 500 N/C experiences force:", topic: "Electric Field", opts: [{l:"A",t:"10-3 N",c:true},{l:"B",t:"10-2 N"},{l:"C",t:"10-4 N"},{l:"D",t:"10-1 N"}], sol: "F = qE = 2x10-6 x 500 = 10-3 N = 1 mN." }
  ]},
  { num: 16, name: "Electrostatic Potential and Capacitance", questions: [
    { text: "SI unit of electric potential is:", topic: "Potential", opts: [{l:"A",t:"Joule"},{l:"B",t:"Volt",c:true},{l:"C",t:"Coulomb"},{l:"D",t:"Farad"}], sol: "Potential is in Volts (V = J/C)." },
    { text: "Equipotential surfaces are ___ to electric field lines:", topic: "Potential", opts: [{l:"A",t:"Parallel"},{l:"B",t:"Perpendicular",c:true},{l:"C",t:"At 45"},{l:"D",t:"Random"}], sol: "Equipotential surfaces are always perpendicular to electric field lines." },
    { text: "Capacitance of parallel plate capacitor depends on:", topic: "Capacitance", opts: [{l:"A",t:"Area and separation",c:true},{l:"B",t:"Charge only"},{l:"C",t:"Voltage only"},{l:"D",t:"Current"}], sol: "C = e0A/d, depends on area (A) and separation (d)." },
    { text: "SI unit of capacitance is:", topic: "Capacitance", opts: [{l:"A",t:"Farad",c:true},{l:"B",t:"Coulomb"},{l:"C",t:"Volt"},{l:"D",t:"Henry"}], sol: "Capacitance is measured in Farads (F)." },
    { text: "When dielectric is inserted, capacitance:", topic: "Dielectrics", opts: [{l:"A",t:"Increases",c:true},{l:"B",t:"Decreases"},{l:"C",t:"Same"},{l:"D",t:"Zero"}], sol: "C = kC, where k > 1 for dielectrics => capacitance increases." },
    { text: "Potential due to point charge at distance r is:", topic: "Potential", opts: [{l:"A",t:"kq/r",c:true},{l:"B",t:"kq/r2"},{l:"C",t:"kq2/r"},{l:"D",t:"kq/r3"}], sol: "V = kq/r (scalar quantity)." },
    { text: "Energy stored in capacitor C charged to V is:", topic: "Capacitance", opts: [{l:"A",t:"CV2/2",c:true},{l:"B",t:"CV2"},{l:"C",t:"C2V/2"},{l:"D",t:"C2V2"}], sol: "U = CV2/2 = Q2/2C." },
    { text: "2 mF and 3 mF capacitors in parallel. Equivalent capacitance:", topic: "Capacitance", opts: [{l:"A",t:"5 mF",c:true},{l:"B",t:"1.2 mF"},{l:"C",t:"6 mF"},{l:"D",t:"1 mF"}], sol: "Parallel: Ceq = C1 + C2 = 2 + 3 = 5 mF." },
    { text: "Dielectric constant of a conductor is:", topic: "Dielectrics", opts: [{l:"A",t:"0"},{l:"B",t:"Infinite",c:true},{l:"C",t:"1"},{l:"D",t:"Less than 1"}], sol: "For conductors, k = infinite (electric field inside is zero)." },
    { text: "Work done moving charge q through potential difference V:", topic: "Potential", opts: [{l:"A",t:"qV",c:true},{l:"B",t:"q/V"},{l:"C",t:"V/q"},{l:"D",t:"q2V"}], sol: "W = qV (work = charge x potential difference)." }
  ]},
  { num: 17, name: "Current Electricity", questions: [
    { text: "Ohm's law states:", topic: "Ohms Law", opts: [{l:"A",t:"V varies as I",c:true},{l:"B",t:"V varies as I2"},{l:"C",t:"I varies as V2"},{l:"D",t:"V varies as 1/I"}], sol: "At constant temperature, V varies as I (V = IR)." },
    { text: "SI unit of resistance is:", topic: "Resistance", opts: [{l:"A",t:"Ohm",c:true},{l:"B",t:"Volt"},{l:"C",t:"Ampere"},{l:"D",t:"Watt"}], sol: "Resistance is in Ohms (O)." },
    { text: "Resistivity of a conductor depends on:", topic: "Resistivity", opts: [{l:"A",t:"Material and temperature",c:true},{l:"B",t:"Length"},{l:"C",t:"Area"},{l:"D",t:"Current"}], sol: "r is a material property, depends on temperature but not dimensions." },
    { text: "A wire of resistance R cut into 3 equal parts. Each part resistance:", topic: "Resistance", opts: [{l:"A",t:"R/3",c:true},{l:"B",t:"R"},{l:"C",t:"3R"},{l:"D",t:"R/9"}], sol: "R varies as L. Length = L/3 => R = R/3." },
    { text: "Kirchhoff's junction law is based on:", topic: "Circuit Laws", opts: [{l:"A",t:"Charge conservation",c:true},{l:"B",t:"Energy conservation"},{l:"C",t:"Momentum conservation"},{l:"D",t:"Ohm's law"}], sol: "KCL (junction rule): S I_in = S I_out (charge conservation)." },
    { text: "Balanced Wheatstone bridge condition:", topic: "Bridge", opts: [{l:"A",t:"P/Q = R/S",c:true},{l:"B",t:"P/Q = S/R"},{l:"C",t:"PQ = RS"},{l:"D",t:"P+R = Q+S"}], sol: "For balance: P/Q = R/S (no current through galvanometer)." },
    { text: "Internal resistance of ideal voltmeter is:", topic: "Measurement", opts: [{l:"A",t:"Zero"},{l:"B",t:"Infinite",c:true},{l:"C",t:"Low"},{l:"D",t:"1 O"}], sol: "Ideal voltmeter has infinite resistance (draws no current)." },
    { text: "Three resistors 2 O, 3 O, 6 O in parallel. Equivalent:", topic: "Resistance", opts: [{l:"A",t:"1 O",c:true},{l:"B",t:"2 O"},{l:"C",t:"3 O"},{l:"D",t:"6 O"}], sol: "1/R = 1/2+1/3+1/6 = 6/6 = 1 => R = 1 O." },
    { text: "Power dissipated in a resistor R with current I:", topic: "Power", opts: [{l:"A",t:"I2R",c:true},{l:"B",t:"IR"},{l:"C",t:"I/R"},{l:"D",t:"I2/R"}], sol: "P = I2R = V2/R = VI." },
    { text: "Cell of emf E and internal resistance r delivers current I. Terminal voltage:", topic: "Cells", opts: [{l:"A",t:"E - Ir",c:true},{l:"B",t:"E + Ir"},{l:"C",t:"E/I"},{l:"D",t:"Ir - E"}], sol: "Terminal voltage V = E - Ir (drop across internal resistance)." }
  ]},
  { num: 18, name: "Moving Charges and Magnetism", questions: [
    { text: "Force on charge q moving with velocity v in magnetic field B:", topic: "Magnetic Force", opts: [{l:"A",t:"q(v x B)",c:true},{l:"B",t:"q(v.B)"},{l:"C",t:"qvB"},{l:"D",t:"qB/v"}], sol: "F = q(v x B) = qvB sin q." },
    { text: "SI unit of magnetic field is:", topic: "Magnetism", opts: [{l:"A",t:"Tesla",c:true},{l:"B",t:"Gauss"},{l:"C",t:"Weber"},{l:"D",t:"Henry"}], sol: "Magnetic field B is in Tesla (T)." },
    { text: "Biot-Savart law gives:", topic: "Magnetic Field", opts: [{l:"A",t:"Electric field due to charge"},{l:"B",t:"Magnetic field due to current",c:true},{l:"C",t:"Force between charges"},{l:"D",t:"Electric potential"}], sol: "dB = (m0/4p)(Idl x r)/r2 for magnetic field due to current element." },
    { text: "Magnetic field at center of circular loop radius R carrying current I:", topic: "Magnetic Field", opts: [{l:"A",t:"m0I/2R",c:true},{l:"B",t:"m0I/2pR"},{l:"C",t:"m0I/R"},{l:"D",t:"m0IR/2"}], sol: "B = m0I/2R at center of circular loop." },
    { text: "Two parallel current-carrying wires:", topic: "Force", opts: [{l:"A",t:"Attract if same direction",c:true},{l:"B",t:"Repel if same direction"},{l:"C",t:"No force"},{l:"D",t:"Always attract"}], sol: "Parallel currents attract; antiparallel currents repel." },
    { text: "Cyclotron frequency depends on:", topic: "Cyclotron", opts: [{l:"A",t:"q/m and B",c:true},{l:"B",t:"Velocity"},{l:"C",t:"Radius"},{l:"D",t:"Electric field"}], sol: "f = qB/2pm (independent of speed and radius)." },
    { text: "Ampere's circuital law:", topic: "Amperes Law", opts: [{l:"A",t:"o B.dl = m0 I_enc",c:true},{l:"B",t:"o E.dl = 0"},{l:"C",t:"o B.dA = 0"},{l:"D",t:"o E.dA = Q/e0"}], sol: "Ampere's law: o B.dl = m0 I through enclosed surface." },
    { text: "Magnetic field inside long solenoid:", topic: "Solenoid", opts: [{l:"A",t:"m0 nI",c:true},{l:"B",t:"m0I/2pr"},{l:"C",t:"m0I/2R"},{l:"D",t:"Zero"}], sol: "B = m0 nI inside an ideal solenoid (n = turns per unit length)." },
    { text: "Charge enters magnetic field perpendicularly. Path is:", topic: "Motion in B", opts: [{l:"A",t:"Circular",c:true},{l:"B",t:"Straight line"},{l:"C",t:"Helical"},{l:"D",t:"Parabolic"}], sol: "When v is perpendicular to B, Lorentz force provides centripetal force => circular motion." },
    { text: "1 Tesla equals:", topic: "Magnetism", opts: [{l:"A",t:"1 N/A.m",c:true},{l:"B",t:"1 N/A.m2"},{l:"C",t:"1 N.m/A"},{l:"D",t:"1 J/A"}], sol: "1 T = 1 N/(A.m) = 1 kg/(s2.A)." }
  ]},
  { num: 19, name: "Magnetism and Matter", questions: [
    { text: "Magnetic dipole moment of bar magnet points:", topic: "Magnetism", opts: [{l:"A",t:"N to S"},{l:"B",t:"S to N",c:true},{l:"C",t:"Both"},{l:"D",t:"No direction"}], sol: "Magnetic moment M points from south to north (inside magnet)." },
    { text: "Earth's magnetic field is due to:", topic: "Geomagnetism", opts: [{l:"A",t:"Iron core",c:true},{l:"B",t:"Atmospheric currents"},{l:"C",t:"Solar wind"},{l:"D",t:"Ocean currents"}], sol: "Earth's field originates from molten iron-nickel outer core (dynamo effect)." },
    { text: "Substance strongly attracted to magnet is:", topic: "Materials", opts: [{l:"A",t:"Ferromagnetic",c:true},{l:"B",t:"Paramagnetic"},{l:"C",t:"Diamagnetic"},{l:"D",t:"Non-magnetic"}], sol: "Ferromagnetic materials (Fe, Ni, Co) are strongly attracted." },
    { text: "Curie temperature is temp above which:", topic: "Materials", opts: [{l:"A",t:"Ferromagnetism disappears",c:true},{l:"B",t:"Paramagnetism becomes ferromagnetism"},{l:"C",t:"Diamagnetism appears"},{l:"D",t:"All magnetism disappears"}], sol: "Above Curie temp, ferromagnetic materials become paramagnetic." },
    { text: "Diamagnetic substances have:", topic: "Materials", opts: [{l:"A",t:"c < 0",c:true},{l:"B",t:"c > 0"},{l:"C",t:"c >> 1"},{l:"D",t:"c = 0"}], sol: "Diamagnetic materials have negative magnetic susceptibility (c < 0)." },
    { text: "Bar magnet of moment M cut into two halves perpendicular to axis. Each half:", topic: "Magnetism", opts: [{l:"A",t:"M/2",c:true},{l:"B",t:"M"},{l:"C",t:"2M"},{l:"D",t:"M/4"}], sol: "Magnetic moment = pole strength x length. Length halved => M/2." },
    { text: "Angle of dip at magnetic equator:", topic: "Geomagnetism", opts: [{l:"A",t:"0",c:true},{l:"B",t:"90"},{l:"C",t:"45"},{l:"D",t:"60"}], sol: "At magnetic equator, field is horizontal => angle of dip = 0." },
    { text: "Paramagnetic substances follow:", topic: "Materials", opts: [{l:"A",t:"Curie's law",c:true},{l:"B",t:"Ohm's law"},{l:"C",t:"Coulomb's law"},{l:"D",t:"Biot-Savart law"}], sol: "Paramagnetic susceptibility varies as 1/T (Curie's law)." },
    { text: "Hysteresis loop is associated with:", topic: "Materials", opts: [{l:"A",t:"Ferromagnetic materials",c:true},{l:"B",t:"Diamagnetic"},{l:"C",t:"Paramagnetic"},{l:"D",t:"Dielectrics"}], sol: "Ferromagnetic materials exhibit hysteresis (B lags behind H)." },
    { text: "Which is paramagnetic?", topic: "Materials", opts: [{l:"A",t:"Aluminum",c:true},{l:"B",t:"Copper"},{l:"C",t:"Gold"},{l:"D",t:"Bismuth"}], sol: "Al is paramagnetic; Cu, Au diamagnetic; Bi strongly diamagnetic." }
  ]},
  { num: 20, name: "Electromagnetic Induction", questions: [
    { text: "Faraday's law relates:", topic: "Induction", opts: [{l:"A",t:"EMF to rate of change of flux",c:true},{l:"B",t:"EMF to current"},{l:"C",t:"Current to voltage"},{l:"D",t:"Flux to resistance"}], sol: "Faraday's law: e = -dF/dt." },
    { text: "Lenz's law is consequence of:", topic: "Induction", opts: [{l:"A",t:"Energy conservation",c:true},{l:"B",t:"Charge conservation"},{l:"C",t:"Momentum conservation"},{l:"D",t:"Newton's third law"}], sol: "Lenz's law ensures energy conservation." },
    { text: "SI unit of magnetic flux is:", topic: "Induction", opts: [{l:"A",t:"Weber",c:true},{l:"B",t:"Tesla"},{l:"C",t:"Henry"},{l:"D",t:"Volt"}], sol: "Magnetic flux F is in Weber (Wb) = T.m2." },
    { text: "Self-inductance depends on:", topic: "Inductance", opts: [{l:"A",t:"Geometry and turns",c:true},{l:"B",t:"Current"},{l:"C",t:"Voltage"},{l:"D",t:"Resistance"}], sol: "L depends on coil geometry, number of turns, and core material." },
    { text: "Mutual inductance M: induced EMF in secondary due to dI/dt in primary:", topic: "Mutual Inductance", opts: [{l:"A",t:"-M dI/dt",c:true},{l:"B",t:"-M I"},{l:"C",t:"M dI/dt"},{l:"D",t:"M I2"}], sol: "e = -M dI/dt." },
    { text: "SI unit of inductance is:", topic: "Inductance", opts: [{l:"A",t:"Henry",c:true},{l:"B",t:"Weber"},{l:"C",t:"Tesla"},{l:"D",t:"Farad"}], sol: "Inductance is measured in Henry (H)." },
    { text: "Conducting rod length L moving perpendicular to B at speed v. Induced EMF:", topic: "Motional EMF", opts: [{l:"A",t:"BLv",c:true},{l:"B",t:"BLv2"},{l:"C",t:"BL2v"},{l:"D",t:"B2Lv"}], sol: "e = BLv (motional EMF, when v perpendicular B perpendicular L)." },
    { text: "Energy stored in inductor L carrying current I:", topic: "Inductance", opts: [{l:"A",t:"LI2/2",c:true},{l:"B",t:"LI2"},{l:"C",t:"L2I/2"},{l:"D",t:"L2I2"}], sol: "U = LI2/2 (magnetic energy in inductor)." },
    { text: "Eddy currents produced when:", topic: "Eddy Currents", opts: [{l:"A",t:"Conductor experiences changing B",c:true},{l:"B",t:"Magnet is stationary"},{l:"C",t:"Current flows steadily"},{l:"D",t:"No flux change"}], sol: "Eddy currents are induced loops in conductors exposed to changing B." },
    { text: "AC generator works on:", topic: "Generator", opts: [{l:"A",t:"Electromagnetic induction",c:true},{l:"B",t:"Electrostatic induction"},{l:"C",t:"Magnetic effect of current"},{l:"D",t:"Thermoelectric effect"}], sol: "AC generator converts mechanical to electrical energy via EM induction." }
  ]},
  { num: 21, name: "Alternating Current", questions: [
    { text: "RMS value of AC voltage V = V0 sin wt:", topic: "AC", opts: [{l:"A",t:"V0/sqrt2",c:true},{l:"B",t:"V0/2"},{l:"C",t:"V0"},{l:"D",t:"sqrt2 V0"}], sol: "Vrms = V0/sqrt2 approx 0.707 V0." },
    { text: "Phase difference between V and I in pure resistive circuit:", topic: "AC", opts: [{l:"A",t:"0",c:true},{l:"B",t:"p/2"},{l:"C",t:"p"},{l:"D",t:"-p/2"}], sol: "For pure resistor, V and I are in phase." },
    { text: "In pure inductive circuit, current ___ voltage by p/2:", topic: "AC", opts: [{l:"A",t:"Leads"},{l:"B",t:"Lags",c:true},{l:"C",t:"In phase with"},{l:"D",t:"Opposes"}], sol: "In pure inductive circuit, I lags V by 90." },
    { text: "Resonant frequency of LCR series circuit:", topic: "Resonance", opts: [{l:"A",t:"1/sqrt(LC)",c:true},{l:"B",t:"sqrt(LC)"},{l:"C",t:"1/LC"},{l:"D",t:"sqrt(L/C)"}], sol: "w0 = 1/sqrt(LC) or f0 = 1/(2p sqrt(LC))." },
    { text: "At resonance in LCR circuit, impedance is:", topic: "Resonance", opts: [{l:"A",t:"Minimum = R",c:true},{l:"B",t:"Maximum"},{l:"C",t:"Infinite"},{l:"D",t:"Zero"}], sol: "At resonance, XL = XC => Z = R (minimum impedance)." },
    { text: "Power factor in AC circuit:", topic: "AC", opts: [{l:"A",t:"cos f",c:true},{l:"B",t:"sin f"},{l:"C",t:"tan f"},{l:"D",t:"cot f"}], sol: "Power factor = cos f = R/Z." },
    { text: "Transformer works on:", topic: "Transformer", opts: [{l:"A",t:"Mutual induction",c:true},{l:"B",t:"Self-induction"},{l:"C",t:"Electrostatic induction"},{l:"D",t:"Eddy currents"}], sol: "Transformer operates on mutual induction between primary and secondary." },
    { text: "For step-down transformer:", topic: "Transformer", opts: [{l:"A",t:"Vs < Vp, Is > Ip",c:true},{l:"B",t:"Vs > Vp, Is < Ip"},{l:"C",t:"Vs = Vp"},{l:"D",t:"Is = Ip"}], sol: "Step-down: Vs < Vp and (ideally) Is > Ip." },
    { text: "Impedance of LCR series circuit:", topic: "AC", opts: [{l:"A",t:"sqrt(R2+(XL-XC)2)",c:true},{l:"B",t:"R+XL+XC"},{l:"C",t:"sqrt(R2+XL2+XC2)"},{l:"D",t:"R2+(XL-XC)2"}], sol: "Z = sqrt(R2 + (wL - 1/wC)2)." },
    { text: "Quality factor Q of resonant circuit:", topic: "Resonance", opts: [{l:"A",t:"w0L/R",c:true},{l:"B",t:"R/w0L"},{l:"C",t:"w0R/L"},{l:"D",t:"L/w0R"}], sol: "Q = (w0L)/R = (1/R) sqrt(L/C) at resonance." }
  ]},
  { num: 22, name: "Electromagnetic Waves", questions: [
    { text: "Maxwell's equations unified:", topic: "EM Waves", opts: [{l:"A",t:"Electricity and magnetism",c:true},{l:"B",t:"Mechanics and optics"},{l:"C",t:"Thermo and EM"},{l:"D",t:"Quantum and relativity"}], sol: "Maxwell's equations showed light as an electromagnetic wave." },
    { text: "Speed of EM waves in vacuum:", topic: "EM Waves", opts: [{l:"A",t:"3 x 108 m/s",c:true},{l:"B",t:"3 x 106 m/s"},{l:"C",t:"3 x 1010 m/s"},{l:"D",t:"330 m/s"}], sol: "c = 3 x 108 m/s in vacuum." },
    { text: "EM waves are:", topic: "EM Waves", opts: [{l:"A",t:"Transverse",c:true},{l:"B",t:"Longitudinal"},{l:"C",t:"Both"},{l:"D",t:"Neither"}], sol: "EM waves are transverse (E and B oscillate perpendicular to propagation)." },
    { text: "Longest wavelength in EM spectrum?", topic: "EM Spectrum", opts: [{l:"A",t:"Radio waves",c:true},{l:"B",t:"X-rays"},{l:"C",t:"UV"},{l:"D",t:"Gamma rays"}], sol: "Radio waves have longest wavelength (meters to km)." },
    { text: "Ratio E0/B0 in EM wave:", topic: "EM Waves", opts: [{l:"A",t:"c",c:true},{l:"B",t:"1/c"},{l:"C",t:"c2"},{l:"D",t:"1/c2"}], sol: "E0/B0 = c." },
    { text: "X-rays discovered by:", topic: "EM Spectrum", opts: [{l:"A",t:"Roentgen",c:true},{l:"B",t:"Maxwell"},{l:"C",t:"Hertz"},{l:"D",t:"Marconi"}], sol: "Wilhelm Roentgen discovered X-rays in 1895." },
    { text: "Microwaves used in:", topic: "EM Spectrum", opts: [{l:"A",t:"Radar and communication",c:true},{l:"B",t:"Cancer treatment"},{l:"C",t:"Sterilization"},{l:"D",t:"Night vision"}], sol: "Microwaves used in radar, satellite communication, and ovens." },
    { text: "Displacement current introduced by:", topic: "EM Waves", opts: [{l:"A",t:"Maxwell",c:true},{l:"B",t:"Faraday"},{l:"C",t:"Ampere"},{l:"D",t:"Hertz"}], sol: "Maxwell introduced Id = e0 dFE/dt." },
    { text: "Visible light wavelength range:", topic: "EM Spectrum", opts: [{l:"A",t:"400-700 nm",c:true},{l:"B",t:"200-400 nm"},{l:"C",t:"700-1000 nm"},{l:"D",t:"100-400 nm"}], sol: "Visible: ~400 nm (violet) to 700 nm (red)." },
    { text: "Photon energy varies as:", topic: "EM Waves", opts: [{l:"A",t:"Frequency",c:true},{l:"B",t:"Wavelength"},{l:"C",t:"Amplitude"},{l:"D",t:"Speed"}], sol: "E = hf, energy varies as frequency." }
  ]},
  { num: 23, name: "Ray Optics and Optical Instruments", questions: [
    { text: "Law of reflection:", topic: "Reflection", opts: [{l:"A",t:"i = r",c:true},{l:"B",t:"i > r"},{l:"C",t:"i < r"},{l:"D",t:"i = 2r"}], sol: "Angle of incidence = angle of reflection." },
    { text: "Focal length of concave mirror is:", topic: "Mirrors", opts: [{l:"A",t:"Positive"},{l:"B",t:"Negative",c:true},{l:"C",t:"Infinite"},{l:"D",t:"Zero"}], sol: "By sign convention, concave mirror focal length is negative." },
    { text: "Snell's law:", topic: "Refraction", opts: [{l:"A",t:"n1 sin i = n2 sin r",c:true},{l:"B",t:"n1/sin i = n2/sin r"},{l:"C",t:"sin i/sin r = n2/n1"},{l:"D",t:"n1 cos i = n2 cos r"}], sol: "n1 sin i = n2 sin r." },
    { text: "Absolute refractive index:", topic: "Refraction", opts: [{l:"A",t:"n = c/v",c:true},{l:"B",t:"n = v/c"},{l:"C",t:"n = cv"},{l:"D",t:"n = 1/cv"}], sol: "n = c/v, where c = speed in vacuum, v = speed in medium." },
    { text: "Total internal reflection occurs when:", topic: "TIR", opts: [{l:"A",t:"Denser to rarer above critical angle",c:true},{l:"B",t:"Rarer to denser"},{l:"C",t:"Any medium"},{l:"D",t:"Vacuum to glass"}], sol: "TIR requires n1 > n2 and i > critical angle." },
    { text: "Power of lens of focal length 20 cm:", topic: "Lens", opts: [{l:"A",t:"+5 D",c:true},{l:"B",t:"-5 D"},{l:"C",t:"+0.05 D"},{l:"D",t:"-0.05 D"}], sol: "P = 1/f (in m) = 1/0.20 = +5 D (convex lens)." },
    { text: "Convex lens corrects:", topic: "Optical Instruments", opts: [{l:"A",t:"Hypermetropia",c:true},{l:"B",t:"Myopia"},{l:"C",t:"Astigmatism"},{l:"D",t:"Presbyopia"}], sol: "Convex lens (converging) corrects hypermetropia (farsightedness)." },
    { text: "Magnifying power of simple microscope:", topic: "Microscope", opts: [{l:"A",t:"1 + D/f",c:true},{l:"B",t:"D/f"},{l:"C",t:"f/D"},{l:"D",t:"1 + f/D"}], sol: "M = 1 + D/f, with D = 25 cm (near point)." },
    { text: "Dispersion produces:", topic: "Dispersion", opts: [{l:"A",t:"Rainbow",c:true},{l:"B",t:"Mirage"},{l:"C",t:"Reflection"},{l:"D",t:"Diffraction"}], sol: "Dispersion splits white light into constituent colors." },
    { text: "Lens formula:", topic: "Lens", opts: [{l:"A",t:"1/f = 1/v - 1/u",c:true},{l:"B",t:"1/f = 1/u - 1/v"},{l:"C",t:"1/f = 1/u + 1/v"},{l:"D",t:"f = uv/(u+v)"}], sol: "1/f = 1/v - 1/u (with sign convention)." }
  ]},
  { num: 24, name: "Wave Optics", questions: [
    { text: "Huygens' principle:", topic: "Wave Theory", opts: [{l:"A",t:"Each wavefront point is source of secondary wavelets",c:true},{l:"B",t:"Light travels in straight lines"},{l:"C",t:"Light is a particle"},{l:"D",t:"Wavelength constant"}], sol: "Every point on wavefront acts as source of secondary wavelets." },
    { text: "Young's double slit demonstrates:", topic: "Interference", opts: [{l:"A",t:"Interference of light",c:true},{l:"B",t:"Reflection"},{l:"C",t:"Refraction"},{l:"D",t:"Dispersion"}], sol: "YDSE demonstrates wave nature of light through interference." },
    { text: "Fringe width in YDSE:", topic: "Interference", opts: [{l:"A",t:"lD/d",c:true},{l:"B",t:"ld/D"},{l:"C",t:"dD/l"},{l:"D",t:"l/dD"}], sol: "b = lD/d." },
    { text: "Constructive interference path difference:", topic: "Interference", opts: [{l:"A",t:"nl",c:true},{l:"B",t:"(2n+1)l/2"},{l:"C",t:"nl/2"},{l:"D",t:"(2n+1)l"}], sol: "Constructive: Dx = nl (n=0,1,2...). Destructive: Dx = (2n+1)l/2." },
    { text: "Diffraction significant when slit width:", topic: "Diffraction", opts: [{l:"A",t:"Comparable to l",c:true},{l:"B",t:"Much larger than l"},{l:"C",t:"Much smaller than l"},{l:"D",t:"Zero"}], sol: "Diffraction significant when slit width approx wavelength." },
    { text: "Polarization confirms light is:", topic: "Polarization", opts: [{l:"A",t:"Transverse",c:true},{l:"B",t:"Longitudinal"},{l:"C",t:"Mechanical"},{l:"D",t:"Stationary"}], sol: "Only transverse waves can be polarized, confirming light is transverse." },
    { text: "Brewster's angle:", topic: "Polarization", opts: [{l:"A",t:"Reflected light is completely polarized",c:true},{l:"B",t:"Reflected light unpolarized"},{l:"C",t:"Partially polarized"},{l:"D",t:"Absorbed"}], sol: "At Brewster's angle (tan qB = n2/n1), reflected light is completely polarized." },
    { text: "Central maximum width in single slit diffraction:", topic: "Diffraction", opts: [{l:"A",t:"2lD/a",c:true},{l:"B",t:"lD/a"},{l:"C",t:"la/D"},{l:"D",t:"2la/D"}], sol: "Width = 2lD/a (a = slit width)." },
    { text: "Coherent sources have:", topic: "Interference", opts: [{l:"A",t:"Constant phase difference",c:true},{l:"B",t:"Same amplitude only"},{l:"C",t:"Same frequency only"},{l:"D",t:"Random phase"}], sol: "Coherent sources have constant phase difference." },
    { text: "Resolving power of microscope increased by:", topic: "Optical Instruments", opts: [{l:"A",t:"Shorter wavelength",c:true},{l:"B",t:"Longer wavelength"},{l:"C",t:"Larger aperture"},{l:"D",t:"Smaller refractive index"}], sol: "Resolving power varies as 1/l, so shorter l improves resolution." }
  ]},
  { num: 25, name: "Dual Nature of Radiation and Matter", questions: [
    { text: "Photoelectric effect explained by:", topic: "Photoelectric", opts: [{l:"A",t:"Einstein",c:true},{l:"B",t:"Planck"},{l:"C",t:"Bohr"},{l:"D",t:"Rutherford"}], sol: "Einstein explained photoelectric effect using photon concept (Nobel 1921)." },
    { text: "Work function is:", topic: "Photoelectric", opts: [{l:"A",t:"Minimum energy to eject electron",c:true},{l:"B",t:"Max KE of electrons"},{l:"C",t:"Incident photon energy"},{l:"D",t:"Ionization energy"}], sol: "Work function f = hf0 is minimum energy to eject electron." },
    { text: "KE of photoelectrons depends on:", topic: "Photoelectric", opts: [{l:"A",t:"Frequency of light",c:true},{l:"B",t:"Intensity"},{l:"C",t:"Number of photons"},{l:"D",t:"Distance"}], sol: "Kmax = hf - f depends on frequency (f), not intensity." },
    { text: "de Broglie wavelength:", topic: "Wave-Particle", opts: [{l:"A",t:"h/p",c:true},{l:"B",t:"h/mv"},{l:"C",t:"p/h"},{l:"D",t:"h2/p"}], sol: "l = h/p = h/(mv)." },
    { text: "Stopping potential depends on:", topic: "Photoelectric", opts: [{l:"A",t:"Frequency",c:true},{l:"B",t:"Intensity"},{l:"C",t:"Distance"},{l:"D",t:"Area"}], sol: "eV0 = hf - f, so V0 depends on frequency." },
    { text: "Particle nature of light shown by:", topic: "Wave-Particle", opts: [{l:"A",t:"Photoelectric effect",c:true},{l:"B",t:"Interference"},{l:"C",t:"Diffraction"},{l:"D",t:"Polarization"}], sol: "Photoelectric effect shows particle nature; interference/diffraction show wave nature." },
    { text: "Davisson-Germer confirmed:", topic: "Wave-Particle", opts: [{l:"A",t:"Wave nature of electrons",c:true},{l:"B",t:"Particle nature of light"},{l:"C",t:"Nuclear model"},{l:"D",t:"Quantum numbers"}], sol: "Davisson-Germer showed electron diffraction (wave nature of matter)." },
    { text: "Threshold frequency for metal with work function 2 eV (h = 6.63x10-34 J.s):", topic: "Photoelectric", opts: [{l:"A",t:"4.83x1014 Hz",c:true},{l:"B",t:"3x1014 Hz"},{l:"C",t:"5x1014 Hz"},{l:"D",t:"6x1014 Hz"}], sol: "f0 = f/h = (2x1.6x10-19)/(6.63x10-34) approx 4.83x1014 Hz." },
    { text: "Dual nature of matter proposed by:", topic: "Wave-Particle", opts: [{l:"A",t:"de Broglie",c:true},{l:"B",t:"Heisenberg"},{l:"C",t:"Schrodinger"},{l:"D",t:"Einstein"}], sol: "Louis de Broglie proposed wave-particle duality for matter (1924)." },
    { text: "Momentum of photon of wavelength l:", topic: "Photon", opts: [{l:"A",t:"h/l",c:true},{l:"B",t:"hc/l"},{l:"C",t:"l/h"},{l:"D",t:"hl"}], sol: "p = h/l (photon momentum)." }
  ]},
  { num: 26, name: "Atoms", questions: [
    { text: "Rutherford's alpha scattering discovered:", topic: "Atomic Model", opts: [{l:"A",t:"Nucleus",c:true},{l:"B",t:"Electron"},{l:"C",t:"Proton"},{l:"D",t:"Neutron"}], sol: "Rutherford's experiment showed atoms have a dense, positively charged nucleus." },
    { text: "Bohr model assumes:", topic: "Bohr Model", opts: [{l:"A",t:"Quantized angular momentum",c:true},{l:"B",t:"Continuous energy levels"},{l:"C",t:"Any radius orbits"},{l:"D",t:"No quantization"}], sol: "Bohr's postulate: mvr = nh/2p (quantized angular momentum)." },
    { text: "First Bohr orbit radius (n=1) of H:", topic: "Bohr Model", opts: [{l:"A",t:"0.53 A",c:true},{l:"B",t:"1.06 A"},{l:"C",t:"2.12 A"},{l:"D",t:"0.27 A"}], sol: "a0 = 0.529 A (Bohr radius)." },
    { text: "Energy of nth orbit of H varies as:", topic: "Bohr Model", opts: [{l:"A",t:"-1/n2",c:true},{l:"B",t:"1/n2"},{l:"C",t:"-1/n"},{l:"D",t:"n2"}], sol: "En = -13.6/n2 eV, so E varies as -1/n2." },
    { text: "Ionization energy of H atom:", topic: "Bohr Model", opts: [{l:"A",t:"13.6 eV",c:true},{l:"B",t:"10.2 eV"},{l:"C",t:"3.4 eV"},{l:"D",t:"1.51 eV"}], sol: "Ionization = E8 - E1 = 0 - (-13.6) = 13.6 eV." },
    { text: "Which transition emits longest wavelength?", topic: "Spectrum", opts: [{l:"A",t:"n=2 to n=1"},{l:"B",t:"n=3 to n=2"},{l:"C",t:"n=4 to n=3",c:true},{l:"D",t:"n=5 to n=4"}], sol: "Longest wavelength = smallest DE. n=4->3 has smallest DE." },
    { text: "Lyman series lies in:", topic: "Spectrum", opts: [{l:"A",t:"UV",c:true},{l:"B",t:"Visible"},{l:"C",t:"IR"},{l:"D",t:"Radio"}], sol: "Lyman series (n>=2 -> n=1) is in UV region." },
    { text: "Atomic number is:", topic: "Nucleus", opts: [{l:"A",t:"Number of protons",c:true},{l:"B",t:"Number of neutrons"},{l:"C",t:"Mass number"},{l:"D",t:"Nucleon number"}], sol: "Atomic number Z = number of protons." },
    { text: "Isotopes have:", topic: "Nucleus", opts: [{l:"A",t:"Same Z, different A",c:true},{l:"B",t:"Same A, different Z"},{l:"C",t:"Same N, different Z"},{l:"D",t:"Different Z and A"}], sol: "Isotopes: same atomic number Z, different mass number A." },
    { text: "Balmer series lies in:", topic: "Spectrum", opts: [{l:"A",t:"Visible",c:true},{l:"B",t:"UV"},{l:"C",t:"IR"},{l:"D",t:"X-ray"}], sol: "Balmer series (n>=3 -> n=2) is in visible region." }
  ]},
  { num: 27, name: "Nuclei", questions: [
    { text: "Nucleus consists of:", topic: "Nuclear Physics", opts: [{l:"A",t:"Protons and neutrons",c:true},{l:"B",t:"Protons and electrons"},{l:"C",t:"Neutrons and electrons"},{l:"D",t:"All three"}], sol: "Nucleus contains protons and neutrons (nucleons)." },
    { text: "Mass-energy equivalence:", topic: "Nuclear Physics", opts: [{l:"A",t:"E = mc2",c:true},{l:"B",t:"E = mc"},{l:"C",t:"E = m2c"},{l:"D",t:"E = m/c2"}], sol: "Einstein: E = mc2 (mass can convert to energy)." },
    { text: "Binding energy per nucleon max for:", topic: "Nuclear Physics", opts: [{l:"A",t:"Fe (iron)",c:true},{l:"B",t:"H (hydrogen)"},{l:"C",t:"U (uranium)"},{l:"D",t:"He (helium)"}], sol: "Binding energy per nucleon peaks at iron (A approx 56)." },
    { text: "Radioactive decay follows:", topic: "Radioactivity", opts: [{l:"A",t:"Exponential decay",c:true},{l:"B",t:"Linear decay"},{l:"C",t:"Sinusoidal"},{l:"D",t:"Log growth"}], sol: "N = N0 e-lt, exponential decay." },
    { text: "Half-life is time for:", topic: "Radioactivity", opts: [{l:"A",t:"Half the nuclei to decay",c:true},{l:"B",t:"All nuclei to decay"},{l:"C",t:"Activity to double"},{l:"D",t:"Mass to double"}], sol: "Half-life T1/2 = ln2/l: time for N to become N0/2." },
    { text: "Alpha particle consists of:", topic: "Radioactivity", opts: [{l:"A",t:"2p + 2n",c:true},{l:"B",t:"1p + 1n"},{l:"C",t:"2p"},{l:"D",t:"2n"}], sol: "Alpha = He nucleus = 2p + 2n." },
    { text: "In beta-minus decay, n converts to:", topic: "Radioactivity", opts: [{l:"A",t:"p + e- + antineutrino",c:true},{l:"B",t:"p + positron"},{l:"C",t:"2p"},{l:"D",t:"n + photon"}], sol: "n -> p + e- + nu_bar (beta- decay)." },
    { text: "Nuclear fission:", topic: "Nuclear Reactions", opts: [{l:"A",t:"Splitting heavy nucleus",c:true},{l:"B",t:"Combining light nuclei"},{l:"C",t:"Spontaneous decay"},{l:"D",t:"Electron capture"}], sol: "Fission: heavy nucleus splits into lighter fragments with energy release." },
    { text: "Nuclear fusion occurs in:", topic: "Nuclear Reactions", opts: [{l:"A",t:"Sun and stars",c:true},{l:"B",t:"Nuclear reactors"},{l:"C",t:"Atomic bombs"},{l:"D",t:"X-ray machines"}], sol: "Fusion (H -> He) powers Sun and stars." },
    { text: "1 amu equals:", topic: "Nuclear Physics", opts: [{l:"A",t:"931.5 MeV/c2",c:true},{l:"B",t:"1.66x10-19 kg"},{l:"C",t:"1.66x10-27 J"},{l:"D",t:"931.5 J"}], sol: "1 u = 1.66x10-27 kg = 931.5 MeV/c2." }
  ]},
  { num: 28, name: "Semiconductor Electronics", questions: [
    { text: "Pure semiconductor is called:", topic: "Semiconductors", opts: [{l:"A",t:"Intrinsic",c:true},{l:"B",t:"Extrinsic"},{l:"C",t:"Conductor"},{l:"D",t:"Insulator"}], sol: "Pure (undoped) semiconductor = intrinsic semiconductor." },
    { text: "Doping Si with phosphorus produces:", topic: "Doping", opts: [{l:"A",t:"n-type",c:true},{l:"B",t:"p-type"},{l:"C",t:"Insulator"},{l:"D",t:"Conductor"}], sol: "P (group 15) has 5 valence electrons => donates extra e- => n-type." },
    { text: "Depletion layer width in PN junction:", topic: "Diode", opts: [{l:"A",t:"Increases with reverse bias",c:true},{l:"B",t:"Decreases with reverse bias"},{l:"C",t:"Constant"},{l:"D",t:"Only depends on temp"}], sol: "Reverse bias widens depletion layer; forward bias narrows it." },
    { text: "PN junction diode acts as:", topic: "Diode", opts: [{l:"A",t:"Rectifier",c:true},{l:"B",t:"Amplifier"},{l:"C",t:"Oscillator"},{l:"D",t:"Modulator"}], sol: "PN diode rectifies AC to DC." },
    { text: "Majority carriers in n-type semiconductor:", topic: "Doping", opts: [{l:"A",t:"Electrons",c:true},{l:"B",t:"Holes"},{l:"C",t:"Both equal"},{l:"D",t:"Ions"}], sol: "In n-type, electrons are majority carriers, holes are minority." },
    { text: "Zener diode is used for:", topic: "Diode", opts: [{l:"A",t:"Voltage regulation",c:true},{l:"B",t:"Amplification"},{l:"C",t:"Rectification"},{l:"D",t:"Switching"}], sol: "Zener diode works in reverse breakdown region for voltage regulation." },
    { text: "A transistor has ____ terminals:", topic: "Transistor", opts: [{l:"A",t:"3",c:true},{l:"B",t:"2"},{l:"C",t:"4"},{l:"D",t:"5"}], sol: "Transistor has 3 terminals: emitter, base, collector." },
    { text: "In common-emitter configuration, input is at:", topic: "Transistor", opts: [{l:"A",t:"Base",c:true},{l:"B",t:"Emitter"},{l:"C",t:"Collector"},{l:"D",t:"Ground"}], sol: "CE config: input at base, output at collector, emitter common." },
    { text: "Logic gate that gives output 1 only when both inputs are 1:", topic: "Logic Gates", opts: [{l:"A",t:"AND",c:true},{l:"B",t:"OR"},{l:"C",t:"NOT"},{l:"D",t:"NAND"}], sol: "AND gate: Y = A.B, output 1 only when both A and B are 1." },
    { text: "Truth table of NOT gate:", topic: "Logic Gates", opts: [{l:"A",t:"Y = A-bar",c:true},{l:"B",t:"Y = A"},{l:"C",t:"Y = 1 always"},{l:"D",t:"Y = 0 always"}], sol: "NOT gate inverts input: Y = A-bar (0->1, 1->0)." }
  ]}
];

const physNav = PHYSICS_CHAPTERS.map(ch => ({ num: ch.num, name: ch.name }));

// Generate all physics chapter files
let generated = 0;
for (const ch of PHYSICS_CHAPTERS) {
  const html = buildPage("Physics", ch.num, ch.name, ch.questions, physNav);
  const filename = `physics-chapter-${ch.num}-${slug(ch.name)}.html`;
  fs.writeFileSync(path.join(OUT, filename), html, "utf8");
  generated++;
  console.log(`Generated: ${filename}`);
}

console.log(`\nDone! Generated ${generated} Physics chapter files.`);
