var fs = require('fs');
var path = require('path');
var DATA = path.join(__dirname, 'course-data.json');

var data = JSON.parse(fs.readFileSync(DATA, 'utf-8'));

// Append diagram to content if not already present
function addDiagram(key, diagramHTML) {
  if (!data[key]) { console.log('Missing: ' + key); return; }
  if (data[key].indexOf('class=\"diagram-box\"') !== -1) { console.log('Has diagram: ' + key); return; }
  data[key] += diagramHTML;
  console.log('Added diagram: ' + key);
}

// SVG namespace helper
function svgTag(width, height, content) {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" style="max-width:100%;height:auto">' + content + '</svg>';
}

// ===== REASONING DIAGRAMS =====

// Syllogism - Venn diagrams
addDiagram('reasoning/syllogism', '<div class="diagram-box"><div class="diagram-caption">Venn diagrams for standard syllogism statements (All A are B, No A is B, Some A are B, Some A are not B)</div>' +
svgTag(600, 160,
  '<text x="50" y="20" fill="#a1a1aa" font-size="11" font-family="Inter">All A are B</text>' +
  '<ellipse cx="80" cy="90" rx="55" ry="40" fill="none" stroke="#a78bfa" stroke-width="2"/>' +
  '<ellipse cx="80" cy="90" rx="35" ry="25" fill="none" stroke="#34d399" stroke-width="2"/>' +
  '<text x="80" y="90" fill="#fafafa" font-size="10" text-anchor="middle" font-family="Inter">A</text>' +
  '<text x="125" y="105" fill="#a1a1aa" font-size="9" text-anchor="middle" font-family="Inter">B</text>' +

  '<text x="220" y="20" fill="#a1a1aa" font-size="11" font-family="Inter">No A is B</text>' +
  '<ellipse cx="220" cy="75" rx="40" ry="30" fill="none" stroke="#a78bfa" stroke-width="2"/>' +
  '<ellipse cx="280" cy="75" rx="40" ry="30" fill="none" stroke="#34d399" stroke-width="2"/>' +
  '<text x="220" y="75" fill="#fafafa" font-size="10" text-anchor="middle" font-family="Inter">A</text>' +
  '<text x="280" y="75" fill="#a1a1aa" font-size="10" text-anchor="middle" font-family="Inter">B</text>' +

  '<text x="390" y="20" fill="#a1a1aa" font-size="11" font-family="Inter">Some A are B</text>' +
  '<ellipse cx="390" cy="85" rx="40" ry="30" fill="none" stroke="#a78bfa" stroke-width="2"/>' +
  '<ellipse cx="430" cy="85" rx="40" ry="30" fill="none" stroke="#34d399" stroke-width="2"/>' +
  '<text x="395" y="90" fill="#fafafa" font-size="10" text-anchor="middle" font-family="Inter">A</text>' +
  '<text x="435" y="90" fill="#a1a1aa" font-size="10" text-anchor="middle" font-family="Inter">B</text>' +
  '<path d="M405 85 Q415 80 425 85" fill="none" stroke="#f59e0b" stroke-width="1.5"/>' +

  '<text x="560" y="20" fill="#a1a1aa" font-size="11" font-family="Inter">Some A are not B</text>' +
  '<ellipse cx="540" cy="85" rx="40" ry="30" fill="none" stroke="#a78bfa" stroke-width="2"/>' +
  '<ellipse cx="590" cy="85" rx="40" ry="30" fill="none" stroke="#34d399" stroke-width="2"/>' +
  '<text x="530" y="90" fill="#fafafa" font-size="10" text-anchor="middle" font-family="Inter">A</text>' +
  '<text x="590" y="90" fill="#a1a1aa" font-size="10" text-anchor="middle" font-family="Inter">B</text>'
) + '</div>');

// Blood relation - family tree
addDiagram('reasoning/blood-relation', '<div class="diagram-box"><div class="diagram-caption">Sample family tree showing relationships between family members</div>' +
svgTag(500, 220,
  '<text x="250" y="18" fill="#a1a1aa" font-size="11" text-anchor="middle" font-family="Inter">Sample Family Tree</text>' +

  '<rect x="170" y="30" width="70" height="26" rx="13" fill="rgba(96,165,250,.2)" stroke="#60a5fa" stroke-width="1.5"/>' +
  '<text x="205" y="47" fill="#60a5fa" font-size="12" text-anchor="middle" font-family="Inter">Grandpa</text>' +

  '<rect x="260" y="30" width="70" height="26" rx="13" fill="rgba(244,114,182,.2)" stroke="#f472b6" stroke-width="1.5"/>' +
  '<text x="295" y="47" fill="#f472b6" font-size="12" text-anchor="middle" font-family="Inter">Grandma</text>' +

  '<line x1="240" y1="56" x2="240" y2="75" stroke="#52525b" stroke-width="1.5"/>' +
  '<line x1="240" y1="75" x2="250" y2="85" stroke="#52525b" stroke-width="1.5"/>' +
  '<line x1="240" y1="75" x2="240" y2="85" stroke="#52525b" stroke-width="1.5"/>' +

  '<rect x="205" y="88" width="70" height="26" rx="13" fill="rgba(52,211,153,.2)" stroke="#34d399" stroke-width="1.5"/>' +
  '<text x="240" y="105" fill="#34d399" font-size="12" text-anchor="middle" font-family="Inter">Father</text>' +

  '<rect x="295" y="88" width="70" height="26" rx="13" fill="rgba(244,114,182,.2)" stroke="#f472b6" stroke-width="1.5"/>' +
  '<text x="330" y="105" fill="#f472b6" font-size="12" text-anchor="middle" font-family="Inter">Mother</text>' +

  '<rect x="225" y="136" width="70" height="26" rx="13" fill="rgba(167,139,250,.2)" stroke="#a78bfa" stroke-width="1.5"/>' +
  '<text x="260" y="153" fill="#a78bfa" font-size="12" text-anchor="middle" font-family="Inter">Son</text>' +

  '<rect x="320" y="136" width="70" height="26" rx="13" fill="rgba(167,139,250,.2)" stroke="#a78bfa" stroke-width="1.5"/>' +
  '<text x="355" y="153" fill="#a78bfa" font-size="12" text-anchor="middle" font-family="Inter">Daughter</text>' +

  '<line x1="155" y1="100" x2="205" y2="100" stroke="#52525b" stroke-width="1"/>' +
  '<line x1="240" y1="114" x2="240" y2="136" stroke="#52525b" stroke-width="1.5"/>' +
  '<line x1="330" y1="114" x2="355" y2="136" stroke="#52525b" stroke-width="1.5"/>' +
  '<line x1="275" y1="114" x2="275" y2="136" stroke="#52525b" stroke-width="1.5"/>' +

  '<text x="140" y="192" fill="#52525b" font-size="9" font-family="Inter">&#x2190; married</text>' +
  '<line x1="135" y1="185" x2="160" y2="185" stroke="#52525b" stroke-width="1"/>' +
  '<text x="140" y="208" fill="#52525b" font-size="9" font-family="Inter">&#x2193; children</text>'
) + '</div>');

// Direction & Distance - path diagram
addDiagram('reasoning/direction-distance', '<div class="diagram-box"><div class="diagram-caption">Cardinal directions and path plotting — example movement with net displacement</div>' +
svgTag(400, 340,
  '<text x="200" y="18" fill="#a1a1aa" font-size="11" text-anchor="middle" font-family="Inter">Direction &amp; Path Plotting</text>' +

  '<line x1="200" y1="30" x2="200" y2="310" stroke="#52525b" stroke-width="0.5" stroke-dasharray="4,4"/>' +
  '<line x1="50" y1="170" x2="350" y2="170" stroke="#52525b" stroke-width="0.5" stroke-dasharray="4,4"/>' +

  '<text x="200" y="325" fill="#60a5fa" font-size="10" text-anchor="middle" font-family="Inter">S (South)</text>' +
  '<text x="200" y="25" fill="#ef4444" font-size="10" text-anchor="middle" font-family="Inter">N (North)</text>' +
  '<text x="365" y="175" fill="#f59e0b" font-size="10" font-family="Inter">E (East)</text>' +
  '<text x="35" y="175" fill="#a1a1aa" font-size="10" font-family="Inter">W (West)</text>' +

  '<polygon points="200,35 195,50 205,50" fill="#ef4444"/>' +
  '<polygon points="200,315 195,300 205,300" fill="#60a5fa"/>' +
  '<polygon points="355,170 340,165 340,175" fill="#f59e0b"/>' +
  '<polygon points="45,170 60,165 60,175" fill="#a1a1aa"/>' +

  '<circle cx="120" cy="230" r="5" fill="#34d399"/>' +
  '<text x="110" y="220" fill="#34d399" font-size="9" font-family="Inter">Start</text>' +
  '<line x1="120" y1="230" x2="120" y2="140" stroke="#34d399" stroke-width="2" stroke-dasharray="6,3"/>' +
  '<text x="125" y="185" fill="#34d399" font-size="9" font-family="Inter">10 km N</text>' +

  '<line x1="120" y1="140" x2="220" y2="140" stroke="#f59e0b" stroke-width="2" stroke-dasharray="6,3"/>' +
  '<text x="150" y="135" fill="#f59e0b" font-size="9" font-family="Inter">5 km E</text>' +

  '<line x1="220" y1="140" x2="220" y2="230" stroke="#a78bfa" stroke-width="2" stroke-dasharray="6,3"/>' +
  '<text x="225" y="185" fill="#a78bfa" font-size="9" font-family="Inter">10 km S</text>' +

  '<circle cx="220" cy="230" r="5" fill="#ef4444"/>' +
  '<text x="230" y="235" fill="#ef4444" font-size="9" font-family="Inter">End</text>' +

  '<line x1="120" y1="230" x2="220" y2="230" stroke="#fafafa" stroke-width="2"/>' +
  '<text x="150" y="250" fill="#fafafa" font-size="10" font-family="Inter">Net displacement = 5 km East</text>'
) + '</div>');

// Calendar-Clock - clock face
addDiagram('reasoning/calendar-clock', '<div class="diagram-box"><div class="diagram-caption">Clock face showing angle between hour and minute hands (3:00 = 90°)</div>' +
svgTag(260, 280,
  '<circle cx="130" cy="140" r="100" fill="none" stroke="#52525b" stroke-width="2"/>' +
  '<circle cx="130" cy="140" r="3" fill="#fafafa"/>' +

  '<text x="130" y="50" fill="#a1a1aa" font-size="11" text-anchor="middle" font-family="Inter">12</text>' +
  '<text x="215" y="145" fill="#a1a1aa" font-size="11" font-family="Inter">3</text>' +
  '<text x="130" y="235" fill="#a1a1aa" font-size="11" text-anchor="middle" font-family="Inter">6</text>' +
  '<text x="45" y="145" fill="#a1a1aa" font-size="11" font-family="Inter">9</text>' +

  '<text x="180" y="70" fill="#a1a1aa" font-size="9" font-family="Inter">1</text>' +
  '<text x="210" y="100" fill="#a1a1aa" font-size="9" font-family="Inter">2</text>' +
  '<text x="210" y="190" fill="#a1a1aa" font-size="9" font-family="Inter">4</text>' +
  '<text x="180" y="220" fill="#a1a1aa" font-size="9" font-family="Inter">5</text>' +
  '<text x="75" y="70" fill="#a1a1aa" font-size="9" font-family="Inter">11</text>' +
  '<text x="50" y="100" fill="#a1a1aa" font-size="9" font-family="Inter">10</text>' +
  '<text x="50" y="190" fill="#a1a1aa" font-size="9" font-family="Inter">8</text>' +
  '<text x="75" y="220" fill="#a1a1aa" font-size="9" font-family="Inter">7</text>' +

  '<line x1="130" y1="140" x2="130" y2="60" stroke="#34d399" stroke-width="3" stroke-linecap="round"/>' +
  '<line x1="130" y1="140" x2="210" y2="140" stroke="#a78bfa" stroke-width="2" stroke-linecap="round"/>' +
  '<path d="M130 140 A40 40 0 0 1 170 140" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4,3"/>' +
  '<text x="155" y="150" fill="#f59e0b" font-size="10" font-family="Inter">90Â°</text>'
) + '</div>');

// ===== QUANT DIAGRAMS =====

// Geometry - triangle diagram
addDiagram('quant/geometry-trigo', '<div class="diagram-box"><div class="diagram-caption">Right triangle with labeled sides and trigonometric ratios (sin Î¸ = opposite/hypotenuse, cos Î¸ = adjacent/hypotenuse, tan Î¸ = opposite/adjacent)</div>' +
svgTag(360, 280,
  '<polygon points="50,230 300,230 50,50" fill="rgba(167,139,250,.08)" stroke="#a78bfa" stroke-width="2"/>' +
  '<rect x="48" y="228" width="6" height="6" fill="#a78bfa" rx="1"/>' +

  '<text x="170" y="245" fill="#34d399" font-size="11" text-anchor="middle" font-family="Inter">Adjacent (base)</text>' +
  '<line x1="50" y1="235" x2="300" y2="235" stroke="#34d399" stroke-width="1" stroke-dasharray="3,3"/>' +

  '<text x="45" y="140" fill="#f59e0b" font-size="11" text-anchor="middle" font-family="Inter" transform="rotate(-90,45,140)">Opposite (perpendicular)</text>' +
  '<line x1="38" y1="230" x2="38" y2="50" stroke="#f59e0b" stroke-width="1" stroke-dasharray="3,3"/>' +

  '<text x="190" y="110" fill="#f87171" font-size="11" font-family="Inter">Hypotenuse</text>' +

  '<text x="55" y="90" fill="#fafafa" font-size="11" font-family="Inter">Î¸</text>' +
  '<path d="M60,220 Q90,200 90,185" fill="none" stroke="#fafafa" stroke-width="1.5"/>' +

  '<text x="65" y="222" fill="#fafafa" font-size="9" font-family="Inter">C</text>' +
  '<text x="305" y="222" fill="#fafafa" font-size="9" font-family="Inter">A</text>' +
  '<text x="55" y="55" fill="#fafafa" font-size="9" font-family="Inter">B</text>'
) + '</div>');

// Mensuration - 3D shapes
addDiagram('quant/mensuration', '<div class="diagram-box"><div class="diagram-caption">Common 3D shapes: cylinder (volume = Ï€rÂ²h), cone (volume = â…“Ï€rÂ²h), sphere (volume = â‚„â‚ƒÏ€rÂ³)</div>' +
svgTag(560, 220,
  // Cylinder
  '<ellipse cx="100" cy="50" rx="50" ry="15" fill="rgba(96,165,250,.15)" stroke="#60a5fa" stroke-width="1.5"/>' +
  '<rect x="50" y="50" width="100" height="120" fill="rgba(96,165,250,.05)" stroke="#60a5fa" stroke-width="1.5"/>' +
  '<ellipse cx="100" cy="170" rx="50" ry="15" fill="rgba(96,165,250,.1)" stroke="#60a5fa" stroke-width="1.5"/>' +
  '<text x="100" y="205" fill="#60a5fa" font-size="10" text-anchor="middle" font-family="Inter">Cylinder</text>' +
  '<text x="100" y="218" fill="#a1a1aa" font-size="9" text-anchor="middle" font-family="Inter">V = Ï€rÂ²h</text>' +
  '<line x1="100" y1="170" x2="100" y2="195" stroke="#52525b" stroke-width="1"/>' +
  '<text x="55" y="115" fill="#a1a1aa" font-size="9" text-anchor="middle" font-family="Inter" transform="rotate(-90,55,115)">h</text>' +
  '<text x="130" y="190" fill="#a1a1aa" font-size="9" font-family="Inter">r</text>' +

  // Cone
  '<line x1="240" y1="40" x2="190" y2="170" stroke="#34d399" stroke-width="1.5"/>' +
  '<line x1="240" y1="40" x2="290" y2="170" stroke="#34d399" stroke-width="1.5"/>' +
  '<ellipse cx="240" cy="170" rx="50" ry="14" fill="rgba(52,211,153,.1)" stroke="#34d399" stroke-width="1.5"/>' +
  '<text x="240" y="205" fill="#34d399" font-size="10" text-anchor="middle" font-family="Inter">Cone</text>' +
  '<text x="240" y="218" fill="#a1a1aa" font-size="9" text-anchor="middle" font-family="Inter">V = â…“Ï€rÂ²h</text>' +

  // Sphere
  '<circle cx="400" cy="110" r="65" fill="rgba(167,139,250,.1)" stroke="#a78bfa" stroke-width="1.5"/>' +
  '<ellipse cx="400" cy="110" rx="65" ry="20" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="1"/>' +
  '<text x="400" y="205" fill="#a78bfa" font-size="10" text-anchor="middle" font-family="Inter">Sphere</text>' +
  '<text x="400" y="218" fill="#a1a1aa" font-size="9" text-anchor="middle" font-family="Inter">V = â‚„â‚ƒÏ€rÂ³</text>' +
  '<text x="430" y="100" fill="#a1a1aa" font-size="9" font-family="Inter">r</text>'
) + '</div>');

// ===== PHYSICS DIAGRAMS =====

// Optics - ray diagram
addDiagram('physics/optics', '<div class="diagram-box"><div class="diagram-caption">Ray diagram showing reflection and refraction of light at a plane surface</div>' +
svgTag(480, 260,
  '<line x1="40" y1="130" x2="440" y2="130" stroke="#52525b" stroke-width="1"/>' +
  '<rect x="40" y="130" width="400" height="100" fill="rgba(96,165,250,.06)" stroke="rgba(96,165,250,.3)" stroke-width="1"/>' +
  '<text x="240" y="230" fill="rgba(96,165,250,.4)" font-size="11" text-anchor="middle" font-family="Inter">Denser Medium (Glass/Water)</text>' +

  '<line x1="240" y1="130" x2="240" y2="20" stroke="#52525b" stroke-width="0.5" stroke-dasharray="4,4"/>' +
  '<text x="250" y="25" fill="#a1a1aa" font-size="9" font-family="Inter">Normal</text>' +

  '<line x1="240" y1="40" x2="120" y2="110" stroke="#f59e0b" stroke-width="2"/>' +
  '<polygon points="120,110 130,108 128,115" fill="#f59e0b"/>' +
  '<text x="100" y="65" fill="#f59e0b" font-size="10" font-family="Inter">Incident ray</text>' +

  '<line x1="240" y1="40" x2="340" y2="90" stroke="#34d399" stroke-width="2"/>' +
  '<polygon points="340,90 333,94 337,84" fill="#34d399"/>' +
  '<text x="310" y="65" fill="#34d399" font-size="10" font-family="Inter">Reflected ray</text>' +

  '<line x1="240" y1="50" x2="300" y2="180" stroke="#a78bfa" stroke-width="2"/>' +
  '<polygon points="300,180 292,177 298,172" fill="#a78bfa"/>' +
  '<text x="305" y="165" fill="#a78bfa" font-size="10" font-family="Inter">Refracted ray</text>' +

  '<path d="M200,40 Q220,50 230,55" fill="none" stroke="#fafafa" stroke-width="1"/>' +
  '<text x="180" y="55" fill="#fafafa" font-size="10" font-family="Inter">Î¸áµ¢</text>' +
  '<path d="M245,42 Q255,50 260,55" fill="none" stroke="#fafafa" stroke-width="1"/>' +
  '<text x="265" y="60" fill="#fafafa" font-size="10" font-family="Inter">Î¸áµ£</text>'
) + '</div>');

// Mechanics - free body diagram
addDiagram('physics/mechanics', '<div class="diagram-box"><div class="diagram-caption">Free body diagram showing forces acting on a block on an inclined plane (mg = weight, N = normal reaction, f = friction)</div>' +
svgTag(420, 300,
  '<polygon points="50,250 380,250 50,70" fill="rgba(96,165,250,.06)" stroke="rgba(96,165,250,.3)" stroke-width="1"/>' +
  '<text x="60" y="230" fill="rgba(96,165,250,.4)" font-size="10" font-family="Inter">Inclined Plane</text>' +

  '<rect x="160" y="165" width="70" height="50" rx="4" fill="rgba(167,139,250,.15)" stroke="#a78bfa" stroke-width="2"/>' +
  '<text x="195" y="193" fill="#a78bfa" font-size="11" text-anchor="middle" font-family="Inter">m</text>' +

  '<line x1="195" y1="215" x2="195" y2="280" stroke="#ef4444" stroke-width="2"/>' +
  '<polygon points="195,280 190,270 200,270" fill="#ef4444"/>' +
  '<text x="205" y="275" fill="#ef4444" font-size="10" font-family="Inter">mg (weight)</text>' +

  '<line x1="195" y1="165" x2="195" y2="130" stroke="#34d399" stroke-width="2"/>' +
  '<polygon points="195,130 190,140 200,140" fill="#34d399"/>' +
  '<text x="205" y="135" fill="#34d399" font-size="10" font-family="Inter">N (Normal)</text>' +

  '<line x1="230" y1="190" x2="270" y2="190" stroke="#f59e0b" stroke-width="2"/>' +
  '<polygon points="270,190 260,185 260,195" fill="#f59e0b"/>' +
  '<text x="275" y="195" fill="#f59e0b" font-size="10" font-family="Inter">f (friction)</text>' +

  '<path d="M70,250 Q120,230 150,210" fill="none" stroke="#fafafa" stroke-width="1.5"/>' +
  '<text x="100" y="255" fill="#fafafa" font-size="10" font-family="Inter">Î¸</text>'
) + '</div>');

// Electrostatics - circuit diagram
addDiagram('physics/electrostatics', '<div class="diagram-box"><div class="diagram-caption">Simple series circuit with a battery, resistor, and ammeter — current flows from positive to negative terminal</div>' +
svgTag(380, 240,
  '<line x1="60" y1="50" x2="60" y2="190" stroke="#34d399" stroke-width="2"/>' +
  '<line x1="60" y1="50" x2="320" y2="50" stroke="#34d399" stroke-width="2"/>' +
  '<line x1="320" y1="50" x2="320" y2="190" stroke="#34d399" stroke-width="2"/>' +
  '<line x1="60" y1="190" x2="320" y2="190" stroke="#34d399" stroke-width="2"/>' +

  '<rect x="120" y="40" width="60" height="24" rx="3" fill="rgba(239,68,68,.2)" stroke="#ef4444" stroke-width="1.5"/>' +
  '<text x="150" y="55" fill="#ef4444" font-size="11" text-anchor="middle" font-family="Inter">+</text>' +
  '<rect x="180" y="40" width="60" height="24" rx="3" fill="rgba(96,165,250,.2)" stroke="#60a5fa" stroke-width="1.5"/>' +
  '<text x="210" y="55" fill="#60a5fa" font-size="11" text-anchor="middle" font-family="Inter">&minus;</text>' +
  '<text x="165" y="85" fill="#a1a1aa" font-size="10" text-anchor="middle" font-family="Inter">Battery (V)</text>' +

  '<rect x="260" y="175" width="50" height="30" rx="3" fill="rgba(167,139,250,.15)" stroke="#a78bfa" stroke-width="1.5"/>' +
  '<text x="285" y="193" fill="#a78bfa" font-size="9" text-anchor="middle" font-family="Inter">R</text>' +
  '<text x="285" y="215" fill="#a1a1aa" font-size="9" text-anchor="middle" font-family="Inter">Resistor</text>' +

  '<circle cx="100" cy="190" r="15" fill="rgba(245,158,11,.15)" stroke="#f59e0b" stroke-width="1.5"/>' +
  '<text x="100" y="195" fill="#f59e0b" font-size="10" text-anchor="middle" font-family="Inter">A</text>' +
  '<text x="100" y="218" fill="#a1a1aa" font-size="9" text-anchor="middle" font-family="Inter">Ammeter</text>' +

  '<text x="190" y="230" fill="#a1a1aa" font-size="9" text-anchor="middle" font-family="Inter">Series Circuit: I = V/R</text>' +

  '<polygon points="190,50 185,55 195,55" fill="#34d399"/>' +
  '<text x="230" y="25" fill="#34d399" font-size="9" font-family="Inter">Current (I) &#x2192;</text>'
) + '</div>');

// ===== BIOLOGY DIAGRAMS =====

// Cell diagram
addDiagram('biology/cell-biology', '<div class="diagram-box"><div class="diagram-caption">Structure of a eukaryotic cell showing major organelles: nucleus, mitochondria, ribosomes, ER, Golgi apparatus</div>' +
svgTag(420, 360,
  '<ellipse cx="210" cy="180" rx="170" ry="150" fill="rgba(167,139,250,.05)" stroke="#a78bfa" stroke-width="2"/>' +
  '<text x="210" y="18" fill="#a1a1aa" font-size="12" text-anchor="middle" font-family="Inter">Eukaryotic Cell Structure</text>' +

  '<ellipse cx="210" cy="160" rx="65" ry="55" fill="rgba(96,165,250,.1)" stroke="#60a5fa" stroke-width="1.5"/>' +
  '<circle cx="210" cy="145" r="12" fill="rgba(96,165,250,.3)" stroke="#60a5fa" stroke-width="1"/>' +
  '<text x="210" y="130" fill="#60a5fa" font-size="8" text-anchor="middle" font-family="Inter">Nucleolus</text>' +
  '<text x="210" y="175" fill="#60a5fa" font-size="9" text-anchor="middle" font-family="Inter">Nucleus</text>' +
  '<line x1="280" y1="150" x2="350" y2="120" stroke="#52525b" stroke-width="0.5"/>' +
  '<text x="355" y="125" fill="#60a5fa" font-size="9" font-family="Inter">Nucleus</text>' +

  '<ellipse cx="130" cy="100" rx="35" ry="20" fill="rgba(52,211,153,.1)" stroke="#34d399" stroke-width="1.5"/>' +
  '<text x="130" y="105" fill="#34d399" font-size="7" text-anchor="middle" font-family="Inter">Golgi</text>' +
  '<line x1="165" y1="100" x2="200" y2="100" stroke="#52525b" stroke-width="0.5"/>' +
  '<text x="205" y="103" fill="#34d399" font-size="9" font-family="Inter">Golgi apparatus</text>' +

  '<rect x="180" y="220" width="50" height="30" rx="3" fill="rgba(239,68,68,.1)" stroke="#ef4444" stroke-width="1"/>' +
  '<text x="205" y="238" fill="#ef4444" font-size="7" text-anchor="middle" font-family="Inter">Ribosomes</text>' +
  '<line x1="230" y1="235" x2="330" y2="245" stroke="#52525b" stroke-width="0.5"/>' +
  '<text x="335" y="248" fill="#ef4444" font-size="9" font-family="Inter">Ribosomes (protein synthesis)</text>' +

  '<path d="M70,180 Q60,200 70,220" fill="none" stroke="#f59e0b" stroke-width="2"/>' +
  '<path d="M70,220 Q80,240 70,260" fill="none" stroke="#f59e0b" stroke-width="2"/>' +
  '<text x="60" y="280" fill="#f59e0b" font-size="9" font-family="Inter">ER</text>' +
  '<line x1="80" y1="230" x2="110" y2="240" stroke="#52525b" stroke-width="0.5"/>' +
  '<text x="115" y="243" fill="#f59e0b" font-size="9" font-family="Inter">Endoplasmic Reticulum</text>' +

  '<ellipse cx="280" cy="260" rx="30" ry="20" fill="rgba(245,158,11,.1)" stroke="#f59e0b" stroke-width="1.5"/>' +
  '<text x="280" y="265" fill="#f59e0b" font-size="7" text-anchor="middle" font-family="Inter">Mito.</text>' +
  '<line x1="310" y1="260" x2="350" y2="270" stroke="#52525b" stroke-width="0.5"/>' +
  '<text x="355" y="273" fill="#f59e0b" font-size="9" font-family="Inter">Mitochondria</text>' +

  '<circle cx="70" cy="70" r="8" fill="rgba(52,211,153,.2)" stroke="#34d399" stroke-width="1"/>' +
  '<text x="70" y="58" fill="#a1a1aa" font-size="8" text-anchor="middle" font-family="Inter">Vacuole</text>'
) + '</div>');

// DNA diagram  
addDiagram('biology/genetics-evolution', '<div class="diagram-box"><div class="diagram-caption">DNA double helix structure showing base pairs (A-T, G-C) and sugar-phosphate backbone</div>' +
svgTag(300, 340,
  '<text x="150" y="18" fill="#a1a1aa" font-size="11" text-anchor="middle" font-family="Inter">DNA Double Helix</text>' +

  // Left strand
  '<path d="M100,50 Q90,75 100,100 Q110,125 100,150 Q90,175 100,200 Q110,225 100,250 Q90,275 100,300" fill="none" stroke="#60a5fa" stroke-width="3"/>' +
  // Right strand
  '<path d="M200,50 Q210,75 200,100 Q190,125 200,150 Q210,175 200,200 Q190,225 200,250 Q210,275 200,300" fill="none" stroke="#34d399" stroke-width="3"/>' +

  // Base pairs
  '<line x1="100" y1="75" x2="200" y2="75" stroke="#f59e0b" stroke-width="2"/>' +
  '<text x="150" y="78" fill="#f59e0b" font-size="7" text-anchor="middle" font-family="Inter">A=T</text>' +

  '<line x1="100" y1="125" x2="200" y2="125" stroke="#a78bfa" stroke-width="2"/>' +
  '<text x="150" y="128" fill="#a78bfa" font-size="7" text-anchor="middle" font-family="Inter">Gâ‰¡C</text>' +

  '<line x1="100" y1="175" x2="200" y2="175" stroke="#f59e0b" stroke-width="2"/>' +
  '<text x="150" y="178" fill="#f59e0b" font-size="7" text-anchor="middle" font-family="Inter">T=A</text>' +

  '<line x1="100" y1="225" x2="200" y2="225" stroke="#a78bfa" stroke-width="2"/>' +
  '<text x="150" y="228" fill="#a78bfa" font-size="7" text-anchor="middle" font-family="Inter">Câ‰¡G</text>' +

  '<line x1="100" y1="275" x2="200" y2="275" stroke="#f59e0b" stroke-width="2"/>' +
  '<text x="150" y="278" fill="#f59e0b" font-size="7" text-anchor="middle" font-family="Inter">A=T</text>' +

  '<text x="80" y="320" fill="#a1a1aa" font-size="9" font-family="Inter">Sugar-Phosphate Backbone</text>' +
  '<line x1="60" y1="315" x2="95" y2="315" stroke="#52525b" stroke-width="0.5"/>' +

  '<text x="230" y="320" fill="#a1a1aa" font-size="9" font-family="Inter">Base Pairs</text>' +
  '<line x1="220" y1="315" x2="228" y2="315" stroke="#52525b" stroke-width="0.5"/>'
) + '</div>');

// ===== WRITE =====
fs.writeFileSync(DATA, JSON.stringify(data, null, 2), 'utf-8');
console.log('\n=== SVG diagram additions complete ===');
