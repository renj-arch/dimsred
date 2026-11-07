// Chemistry question generator for JEE/NEET
// Generates JSON output with all 5 new topics deepened 25 topics

const result = {
  new_topics: {},
  deepened_topics: {},
  new_topic_names: ["solid_state", "solutions", "metallurgy", "salt_analysis", "environmental"]
};

function gen(arr) {
  return arr.join(",\n");
}

// ==================== SOLID STATE ====================
result.new_topics.solid_state = "GENERATORS.chemistry.solid_state = [\n" + gen([
  "function () { var a=rand(1,3); var t=['simple cubic','bcc','fcc']; var n=[1,2,4]; return {q:'Number of atoms per unit cell in '+t[a-1]+':',a:n[a-1],hint:'Count atoms at corners, faces, body center',solution:'Concept: '+t[a-1]+' unit cell - atoms per unit cell = '+n[a-1]}; }",
  "function () { var a=rand(1,3); var t=['simple cubic','bcc','fcc']; var e=[52.4,68,74]; return {q:'Packing efficiency of '+t[a-1]+' (in %):',a:e[a-1],hint:'Packing efficiency = volume occupied by atoms/total volume x 100',solution:'Concept: packing efficiency of '+t[a-1]+' - '+e[a-1]+'%'}; }",
  "function () { var a=rand(2,4); return {q:'Number of atoms in fcc unit cell:',a:4,hint:'fcc: 8 corners x 1/8 + 6 faces x 1/2 = 4',solution:'Concept: fcc unit cell - (8x1/8)+(6x1/2) = '+('4')+' atoms'}; }",
  "function () { var r=rand(100,200); return {q:'Atomic radius of simple cubic crystal = '+r+' pm. Edge length?',a:(2*r)+' pm',hint:'In simple cubic, a=2r',solution:'Formula: a = 2r - 2x'+r+' = '+(2*r)+' pm'}; }",
  "function () { var r=rand(100,200); var a=4*r/Math.sqrt(3); return {q:'Atomic radius of bcc crystal = '+r+' pm. Edge length?',a:a.toFixed(1)+' pm',hint:'In bcc, 4r = a*v3',solution:'Formula: a = 4r/v3 - 4x'+r+'/v3 = '+a.toFixed(1)+' pm'}; }",
  "function () { var r=rand(100,200); var a=2*Math.SQRT2*r; return {q:'Atomic radius of fcc crystal = '+r+' pm. Edge length?',a:a.toFixed(1)+' pm',hint:'In fcc, 4r = a*v2',solution:'Formula: a = 2v2 x r - 2v2x'+r+' = '+a.toFixed(1)+' pm'}; }",
  "function () { var a=rand(300,500); var r=a*Math.sqrt(3)/4; return {q:'Edge length of bcc unit cell = '+a+' pm. Atomic radius?',a:r.toFixed(1)+' pm',hint:'For bcc, 4r = av3',solution:'Formula: r = av3/4 - '+a+'xv3/4 = '+r.toFixed(1)+' pm'}; }",
  "function () { var a=rand(300,500); var r=a/(2*Math.SQRT2); return {q:'Edge length of fcc unit cell = '+a+' pm. Atomic radius?',a:r.toFixed(1)+' pm',hint:'For fcc, 4r = av2',solution:'Formula: r = a/(2v2) - '+a+'/(2v2) = '+r.toFixed(1)+' pm'}; }",
  "function () { var a=rand(300,500); var z=pick([1,2,4]); var M=pick([27,56,63.5,108]); var Na=6.022e23; var d=z*M/(a*a*a*1e-30*Na); return {q:'z='+z+', edge='+a+' pm, M='+M+' g/mol. Density (g/cm3)?',a:d.toFixed(2),hint:'d = zM/(a3Na)',solution:'Formula: d = zM/(a3Na) - '+z+'x'+M+'/(('+a+'x10-10)3x6.022x1023) = '+d.toFixed(2)+' g/cm3'}; }",
  "function () { var e=pick(['Schottky','Frenkel','Metal excess','Metal deficiency']); return {q:'Defect: cation leaves lattice site and occupies interstitial position:',a:'Frenkel defect',hint:'Cation vacancy + cation interstitial',solution:'Concept: Frenkel defect - cation vacancy + cation interstitial, seen in AgCl'}; }",
  "function () { var e=pick(['Schottky','Frenkel','Metal excess','Metal deficiency']); return {q:'Which defect is shown by NaCl?',a:'Schottky defect',hint:'Equal number of cation and anion vacancies',solution:'Concept: Schottky defect - equal number of cation and anion vacancies'}; }",
  "function () { var e=pick(['n-type','p-type']); return {q:'Si doped with As forms which semiconductor?',a:'n-type',hint:'As has 5 valence electrons, extra electron',solution:'Concept: doping Si (group 14) with As (group 15) - n-type semiconductor'}; }",
  "function () { var e=pick(['n-type','p-type']); return {q:'Si doped with In forms which semiconductor?',a:'p-type',hint:'In has 3 valence electrons, hole created',solution:'Concept: doping Si (group 14) with In (group 13) - p-type semiconductor'}; }",
  "function () { return {q:'Coordination number of bcc structure:',a:8,hint:'Each atom in bcc has 8 nearest neighbors',solution:'Concept: bcc - coordination number = '+('8')}; }",
  "function () { return {q:'Coordination number of fcc structure:',a:12,hint:'Each atom in fcc has 12 nearest neighbors',solution:'Concept: fcc - coordination number = '+('12')}; }",
  "function () { var e=pick(['simple cubic','bcc','fcc','hcp']); var m={s:6,b:8,f:12,h:12}; var k=e[0]; return {q:'Coordination number in '+e+':',a:m[k],hint:'Count nearest neighbors',solution:'Concept: CN in '+e+' - '+m[k]}; }",
  "function () { var e=pick(['NaCl','CsCl','ZnS','CaF2']); var m={'NaCl':'Rock salt','CsCl':'CsCl type','ZnS':'Zinc blende','CaF2':'Fluorite'}; return {q:''+e+' crystallizes in which structure?',a:m[e],hint:'Recall common crystal structures',solution:'Concept: '+e+' - '+m[e]+' structure'}; }",
  "function () { var e=pick(['diamagnetic','paramagnetic','ferromagnetic']); return {q:'Type with unpaired electrons attracted to external field:',a:'paramagnetic',hint:'Paramagnetic materials have permanent magnetic dipoles',solution:'Concept: paramagnetic - unpaired electrons, attracted by magnetic field'}; }",
  "function () { var e=pick(['ferromagnetic','ferrimagnetic','antiferromagnetic']); return {q:'Strong magnetism that persists after field removal:',a:'ferromagnetic',hint:'Domain alignment persists',solution:'Concept: ferromagnetic - aligned domains, permanent magnetism (e.g., Fe, Co, Ni)'}; }",
  "function () { var e=pick(['insulators','conductors','semiconductors']); return {q:'Band gap ~1 eV between conduction and valence band:',a:'semiconductors',hint:'Small band gap allows thermal excitation',solution:'Concept: semiconductors - small band gap (~1 eV), conduct at higher temperature'}; }",
  "function () { var r=rand(1,4); var vt=[52.4,68,74,74]; return {q:'Void space % in '+['simple cubic','bcc','fcc','hcp'][r-1]+':',a:(100-vt[r-1])+'%',hint:'Void % = 100 - packing efficiency',solution:'Concept: void % = '+(100-vt[r-1])+'%'}; }",
  "function () { return {q:'Octahedral voids per atom in hcp:',a:1,hint:'hcp has 6 octahedral voids for 6 atoms',solution:'Concept: hcp - octahedral voids = number of atoms = '+('1')+' per atom'}; }",
  "function () { return {q:'Tetrahedral voids per atom in fcc:',a:2,hint:'fcc has 8 tetrahedral voids for 4 atoms',solution:'Concept: fcc - tetrahedral voids per atom = 8/4 = '+('2')}; }",
  "function () { var e=pick(['Fe3O4','Fe2O3','CrO2','NiO']); return {q:'Which is ferromagnetic?',a:e=='Fe3O4'?'Fe3O4':e=='CrO2'?'CrO2':'Fe3O4',hint:'Ferromagnetic materials show strong attraction',solution:'Concept: Fe3O4 (magnetite) is ferromagnetic - spontaneous magnetization'}; }",
  "function () { return {q:'Number of atoms in bcc unit cell:',a:2,hint:'bcc: 8 corners x 1/8 + 1 body center = 2',solution:'Concept: bcc - (8x1/8)+(1x1) = '+('2')+' atoms'}; }"
]) + "\n];";

// ==================== SOLUTIONS ====================
result.new_topics.solutions = "GENERATORS.chemistry.solutions = [\n" + gen([
  "function () { var m=rand(10,50); var n=m/40; return {q:'Mass of NaOH = '+m+' g, Molar mass = 40 g/mol. Moles?',a:n.toFixed(2)+' mol',hint:'n = given mass / molar mass',solution:'Formula: n = m/M - '+m+'/40 = '+n.toFixed(2)+' mol'}; }",
  "function () { var m=rand(5,20); var V=rand(100,500); var n=m/40; var M=n*1000/V; return {q:'NaOH ('+m+' g) in '+V+' mL water. Molarity?',a:M.toFixed(2)+' M',hint:'Molarity = moles / volume in L',solution:'Formula: M = n/V(L) - ('+m+'/40) x (1000/'+V+') = '+M.toFixed(2)+' M'}; }",
  "function () { var n=rand(1,5)/10; var m=rand(100,500); return {q:'Moles = '+n.toFixed(1)+', mass of solvent = '+m+' g. Molality?',a:(n*1000/m).toFixed(3)+' m',hint:'Molality = moles / kg of solvent',solution:'Formula: m = n / mass(kg) - '+n.toFixed(1)+' / ('+m+'/1000) = '+(n*1000/m).toFixed(3)+' m'}; }",
  "function () { var m=rand(5,30); var M=rand(100,200); return {q:'Mass of solvent = '+m+' g, moles of solute = '+(m/40).toFixed(2)+'. Mole fraction?',a:((m/40)/((m/40)+(m/18))).toFixed(4),hint:'Mole fraction = n_solute / (n_solute + n_solvent)',solution:'Formula: x_solute = ('+m+'/40) / (('+m+'/40)+('+m+'/18)) = '+((m/40)/((m/40)+(m/18))).toFixed(4)}; }",
  "function () { return {q:'Which law states: solubility of gas is proportional to partial pressure?',a:'Henrys law',hint:'Relationship between solubility and pressure',solution:'Concept: Henrys law - p = KH x x (mole fraction in solution)'}; }",
  "function () { return {q:'Solutions that obey Raoults law at all concentrations:',a:'Ideal solutions',hint:'No deviation from Raoults law',solution:'Concept: ideal solutions - obey Raoults law, DH=0, DV=0'}; }",
  "function () { return {q:'Deviation: A-B interactions weaker than A-A and B-B gives:',a:'Positive deviation',hint:'Vapor pressure higher than expected',solution:'Concept: positive deviation - A-B < A-A + B-B, DH > 0'}; }",
  "function () { return {q:'Minimum boiling azeotrope example:',a:'Ethanol-water',hint:'Show positive deviation',solution:'Concept: ethanol-water - minimum boiling azeotrope (95.4% ethanol, 78.1C)'}; }",
  "function () { return {q:'Relative lowering of vapor pressure depends on:',a:'Mole fraction of solute',hint:'Raoults law for non-volatile solute',solution:'Concept: Dp/p0 = mole fraction of solute - colligative property'}; }",
  "function () { var m=rand(10,50); var M=rand(50,150); var Kb=rand(2,6)/10; var ms=rand(100,500); var n=m/M; var dT=Kb*n*1000/ms; return {q:''+m+' g (M='+M+' g/mol) in '+ms+' g solvent, Kb='+Kb.toFixed(1)+'. DTb?',a:dT.toFixed(3)+' K',hint:'DTb = Kb x m (molality)',solution:'Formula: DTb = Kb x (m/M) x 1000/ms = '+Kb.toFixed(1)+' x ('+m+'/'+M+') x 1000/'+ms+' = '+dT.toFixed(3)+' K'}; }",
  "function () { var m=rand(10,50); var M=rand(50,150); var Kf=rand(1,5)+0.86; var ms=rand(100,500); var n=m/M; var dT=Kf*n*1000/ms; return {q:''+m+' g (M='+M+') in '+ms+' g, Kf='+Kf.toFixed(2)+'. DTf?',a:dT.toFixed(2)+' K',hint:'DTf = Kf x m',solution:'Formula: DTf = Kf x (m/M) x 1000/ms = '+Kf.toFixed(2)+' x ('+m+'/'+M+') x 1000/'+ms+' = '+dT.toFixed(2)+' K'}; }",
  "function () { var n=rand(1,10)/100; var T=rand(27,37); var V=rand(1,5); var pi=n*0.0821*(T+273)/V; return {q:'n='+n.toFixed(2)+', V='+V+' L, T='+T+'C. Osmotic pressure (atm)?',a:pi.toFixed(2)+' atm',hint:'p = nRT/V',solution:'Formula: p = nRT/V - '+n.toFixed(2)+'x0.0821x'+(T+273)+'/'+V+' = '+pi.toFixed(2)+' atm'}; }",
  "function () { var i=pick([1,2,3]); var e=pick(['glucose','NaCl','CaCl2']); return {q:'van t Hoff factor for '+e+':',a:i,hint:'i = number of particles after dissociation',solution:'Concept: i depends on degree of dissociation - '+(i==1?'glucose (no dissociation)':i==2?'NaCl - Na+ + Cl- (i=2)':'CaCl2 - Ca2+ + 2Cl- (i=3)')}; }",
  "function () { return {q:'Mole fraction of water in 1 molal aqueous solution:',a:'0.9823',hint:'1 molal = 1 mole in 1000 g water (55.55 moles)',solution:'Formula: x_water = 55.55/(55.55+1) = '+('0.9823')}; }",
  "function () { var p=rand(100,760); var dp=rand(10,50); return {q:'Vapor pressure of pure benzene = '+p+' mm Hg. After adding solute, v.p. = '+(p-dp)+'. Relative lowering?',a:(dp/p).toFixed(4),hint:'Dp/p0 = (p0-p)/p0',solution:'Formula: Dp/p0 = '+dp+'/'+p+' = '+(dp/p).toFixed(4)}; }",
  "function () { return {q:'Concentration unit that changes with temperature:',a:'Molarity',hint:'Volume changes with temperature',solution:'Concept: molarity depends on volume, which changes with T - molality is T-independent'}; }",
  "function () { return {q:'Henrys law constant (KH) of CO2 is 1.67x108 Pa. Higher KH means:',a:'Lower solubility',hint:'KH ~ 1/solubility',solution:'Concept: higher KH - lower solubility of gas'}; }",
  "function () { return {q:'Which pair forms an ideal solution?',a:'Benzene-toluene',hint:'Similar molecular structures',solution:'Concept: benzene-toluene - ideal solution, DH=0, DV=0'}; }",
  "function () { var e=pick(['urea','NaCl','BaCl2']); return {q:'Highest osmotic pressure for equimolar solution of:',a:e=='BaCl2'?'BaCl2':e=='NaCl'?'NaCl':'urea',hint:'p depends on number of particles (i)',solution:'Concept: p = iCRT, BaCl2 gives 3 particles - highest p'}; }",
  "function () { return {q:'Colligative property used for polymer molar mass:',a:'Osmotic pressure',hint:'Sensitive even at low concentrations',solution:'Concept: osmotic pressure - best for polymers (large molecules, small p values)'}; }",
  "function () { return {q:'For reverse osmosis, applied pressure must be:',a:'Greater than osmotic pressure',hint:'RO = forcing solvent against gradient',solution:'Concept: reverse osmosis - P > p, used in water purification'}; }",
  "function () { var e=pick(['urea','NaCl','CaCl2']); return {q:'0.1 M '+e+' has lowest freezing point. Why?',a:e=='CaCl2'?'Highest i=3':e=='NaCl'?'i=2':'i=1',hint:'DTf ~ i, more particles - lower Tf',solution:'Concept: DTf = i x Kf x m, CaCl2 - i=3 - highest DTf'}; }",
  "function () { return {q:'Azeotropic mixture of HCl-H2O:',a:'20.24% HCl (maximum boiling)',hint:'Maximum boiling azeotrope',solution:'Concept: HCl-H2O - max boiling azeotrope at 20.24% HCl, 108.6C'}; }",
  "function () { return {q:'Boiling point: 0.1 m NaCl vs 0.1 m glucose:',a:'NaCl has higher boiling point',hint:'DTb = i x Kb x m, NaCl i=2',solution:'Concept: NaCl dissociates (i=2) - higher DTb than glucose (i=1)'}; }",
  "function () { var e=pick(['FeCl3','K4[Fe(CN)6]','NaCl','BaCl2']); return {q:'Greatest coagulation power for negative sol (As2S3):',a:'FeCl3',hint:'Hardy-Schulze rule: higher charge cation coagulates faster',solution:'Concept: Fe3+ has highest charge - most effective coagulant for negative sol'}; }",
  "function () { var m=rand(5,20); var M=rand(200,500); var V=rand(500,1000); var pi=m*0.0821*298*1000/(M*V); return {q:''+m+' g polymer in '+V+' mL, T=25C, p='+pi.toFixed(4)+' atm. Molar mass?',a:((m*0.0821*298*1000)/(pi*V)).toFixed(1)+' g/mol',hint:'p = (mass/M) x RT/V',solution:'Formula: M = mass x R x T x 1000/(p x V)'}; }",
  "function () { return {q:'Gold number of protective colloid:',a:'Min mg to prevent coagulation of 10 mL gold sol',hint:'Protective action measurement',solution:'Concept: Gold number - mg of colloid preventing coagulation of 10 mL gold sol'}; }",
  "function () { return {q:'Which has highest freezing point? 0.1 M glucose, 0.1 M NaCl, 0.1 M CaCl2',a:'0.1 M glucose',hint:'Lower i - higher freezing point',solution:'Concept: DTf ~ i, glucose has i=1 - smallest DTf - highest freezing point'}; }",
  "function () { var m=rand(5,20); var V=rand(100,500); var M=m*1000/(58.5*V); return {q:'NaCl = '+m+' g in '+V+' mL. Molarity? (M=58.5 g/mol)',a:M.toFixed(2)+' M',hint:'M = (mass/M) x 1000/V',solution:'Formula: M = ('+m+'/58.5) x 1000/'+V+' = '+M.toFixed(2)+' M'}; }"
]) + "\n];";

// ==================== METALLURGY ====================
result.new_topics.metallurgy = "GENERATORS.chemistry.metallurgy = [\n" + gen([
  "function () { return {q:'Most abundant metal in Earths crust:',a:'Al',hint:'Al is ~8% of crust by mass',solution:'Concept: Al is most abundant metal in Earths crust (~8.3%)'}; }",
  "function () { var e=pick(['haematite','bauxite','galena','cinnabar','malachite']); return {q:'Ore of aluminium:',a:'Bauxite (Al2O3.2H2O)',hint:'Aluminum ore is an oxide',solution:'Concept: bauxite - Al2O3.2H2O, main Al ore'}; }",
  "function () { var e=pick(['haematite','bauxite','galena','cinnabar','malachite']); return {q:'Ore of lead:',a:'Galena (PbS)',hint:'Lead sulfide ore',solution:'Concept: galena - PbS, ore of lead'}; }",
  "function () { var e=pick(['gravity separation','magnetic separation','froth flotation','leaching']); return {q:'Method for concentrating sulphide ores:',a:'Froth flotation',hint:'Sulphide ores wetted by oil, gangue by water',solution:'Concept: froth flotation - for sulphide ores using differential wetting'}; }",
  "function () { var e=pick(['gravity separation','magnetic separation','froth flotation','leaching']); return {q:'Concentration of bauxite ore:',a:'Leaching (Bayers process)',hint:'Bauxite contains Fe2O3 and SiO2 impurities',solution:'Concept: Bayers process - leaching with NaOH to get pure Al2O3'}; }",
  "function () { var e=pick(['Roasting','Calcination','Smelting','Refining']); return {q:'Heating ore in absence of air:',a:'Calcination',hint:'Removes water and CO2',solution:'Concept: calcination - heating below melting point in limited air'}; }",
  "function () { var e=pick(['Roasting','Calcination','Smelting','Refining']); return {q:'Heating sulphide ore in excess air:',a:'Roasting',hint:'Converts sulphide to oxide',solution:'Concept: roasting - heating sulphide ores in excess air to get oxide + SO2'}; }",
  "function () { var e=pick(['C','CO','H2','Al']); return {q:'Reducing agent for Fe from haematite:',a:'CO (carbon monoxide)',hint:'Blast furnace reaction',solution:'Concept: CO reduces Fe2O3 - Fe + CO2 in blast furnace'}; }",
  "function () { return {q:'Flux used in extraction of iron:',a:'Limestone (CaCO3)',hint:'Removes SiO2 impurity as slag',solution:'Concept: CaCO3 - CaO + CO2; CaO + SiO2 - CaSiO3 (slag)'}; }",
  "function () { return {q:'Hall-Heroult process: cryolite (Na3AlF6) is used as:',a:'Solvent for Al2O3 (lowers melting point)',hint:'Al2O3 has very high melting point',solution:'Concept: cryolite lowers melting point and increases conductivity'}; }",
  "function () { return {q:'Extraction of Zn from ZnO uses:',a:'Coke (C)',hint:'ZnO + C - Zn + CO',solution:'Concept: ZnO + C - Zn + CO at high temperature'}; }",
  "function () { return {q:'Copper from Cu2S extracted by:',a:'Self-reduction (auto-reduction)',hint:'Cu2S + O2 - Cu2O + SO2; Cu2O + Cu2S - Cu + SO2',solution:'Concept: self-reduction - Cu2O + Cu2S - 6Cu + SO2'}; }",
  "function () { return {q:'Zone refining is used for:',a:'Ultra-pure semiconductors (Si, Ge)',hint:'Based on fractional crystallization',solution:'Concept: zone refining - impurities more soluble in melt than solid'}; }",
  "function () { var e=pick(['distillation','electrolytic','zone','chromatographic']); return {q:'Refining method for high purity Zn:',a:'Distillation',hint:'Zn has low boiling point (907C)',solution:'Concept: Zn purified by distillation due to low boiling point'}; }",
  "function () { return {q:'In electrolytic refining of Cu, anode and cathode:',a:'Anode: impure Cu, Cathode: pure Cu',hint:'Electrolysis with CuSO4 solution',solution:'Concept: impure Cu at anode dissolves, pure Cu deposits at cathode'}; }",
  "function () { return {q:'Which metal is extracted by Mond process?',a:'Ni',hint:'Forms volatile Ni(CO)4',solution:'Concept: Ni + 4CO - Ni(CO)4 (volatile) - heat - pure Ni'}; }",
  "function () { return {q:'In cyanide process for Ag, complex formed:',a:'[Ag(CN)2]-',hint:'Ag2S + NaCN + O2 - complex',solution:'Concept: 4Ag2S + 8NaCN + O2 + 2H2O - 4Na[Ag(CN)2] + 4NaOH + 2S'}; }",
  "function () { return {q:'Thermite process uses which reducing agent?',a:'Al (aluminium)',hint:'Al reduces Fe2O3, highly exothermic',solution:'Concept: 2Al + Fe2O3 - 2Fe + Al2O3 + heat (thermite weld)'}; }",
  "function () { return {q:'Slag in blast furnace for Fe:',a:'CaSiO3 (calcium silicate)',hint:'CaO + SiO2 - CaSiO3',solution:'Concept: CaO (from limestone) + SiO2 (impurity) - CaSiO3 slag'}; }",
  "function () { return {q:'Froth stabilizer in froth flotation:',a:'Pine oil / Cresol',hint:'Stabilizes the froth',solution:'Concept: froth stabilizers - pine oil, cresol maintain froth'}; }",
  "function () { var e=pick(['Cu','Zn','Fe','Ag']); return {q:'Method of extraction: Zn from ZnO',a:'Carbon reduction (smelting)',hint:'ZnO + C - Zn + CO',solution:'Concept: ZnO reduced by C at 1200C - Zn vapor distilled off'}; }",
  "function () { return {q:'Collector in froth flotation for sulphide ores:',a:'Xanthates (e.g., ethyl xanthate)',hint:'Makes ore particles hydrophobic',solution:'Concept: collectors like xanthates form hydrophobic layer on sulphide ore'}; }",
  "function () { return {q:'Van Arkel method for Ti purification uses:',a:'TiI4 (volatile iodide)',hint:'Ti + 2I2 - TiI4 - heat - pure Ti + I2',solution:'Concept: TiI4 decomposes on hot filament - pure Ti'}; }",
  "function () { return {q:'Ellingham diagram plots:',a:'DG vs Temperature',hint:'Shows feasibility of reduction',solution:'Concept: Ellingham diagram - DG vs T for oxide formation'}; }",
  "function () { return {q:'Castner-Kellner process for:',a:'Extraction of Na',hint:'Electrolysis of molten NaCl',solution:'Concept: Castner-Kellner - electrolysis of NaCl/CaCl2 mixture - Na metal'}; }"
]) + "\n];";

// ==================== SALT ANALYSIS ====================
result.new_topics.salt_analysis = "GENERATORS.chemistry.salt_analysis = [\n" + gen([
  "function () { var e=pick(['Red','Blue','Green','Yellow']); return {q:'Cobalt nitrate gives which color in borax bead test?',a:'Blue',hint:'Cobalt forms blue colored bead in oxidizing flame',solution:'Concept: Co(NO3)2 - blue bead in borax bead test (oxidizing flame)'}; }",
  "function () { var e=pick(['Cu2+','Fe2+','Fe3+','Ni2+','Zn2+']); return {q:'Which ion gives Prussian blue with K4[Fe(CN)6]?',a:'Fe3+',hint:'Fe3+ + [Fe(CN)6]4- - Fe4[Fe(CN)6]3',solution:'Concept: Fe3+ + K4[Fe(CN)6] - Prussian blue precipitate'}; }",
  "function () { var e=pick(['Cu2+','Fe2+','Fe3+','Ni2+','Zn2+']); return {q:'Which ion gives Turnbulls blue with K3[Fe(CN)6]?',a:'Fe2+',hint:'Fe2+ + [Fe(CN)6]3- - Fe3[Fe(CN)6]2',solution:'Concept: Fe2+ + K3[Fe(CN)6] - Turnbulls blue'}; }",
  "function () { var e=pick(['NH4+','Na+','K+','Ca2+','Mg2+']); return {q:'Which cation forms brown ring with Nesslers reagent?',a:'NH4+',hint:'Nesslers reagent is K2HgI4 in KOH',solution:'Concept: NH4+ + K2HgI4 - brown precipitate'}; }",
  "function () { var e=pick(['brick red','crimson','golden yellow','green','blue']); return {q:'Flame test color of Na+:',a:'Golden yellow',hint:'Na+ emits characteristic yellow',solution:'Concept: Na+ - golden yellow flame (589 nm)'}; }",
  "function () { var e=pick(['brick red','crimson','golden yellow','green','blue']); return {q:'Flame test color of Ca2+:',a:'Brick red',hint:'Ca2+ emits brick red flame',solution:'Concept: Ca2+ - brick red flame'}; }",
  "function () { var e=pick(['brick red','crimson','golden yellow','green','blue']); return {q:'Flame test color of Sr2+:',a:'Crimson red',hint:'Sr2+ gives crimson red',solution:'Concept: Sr2+ - crimson red flame'}; }",
  "function () { var e=pick(['Cl-','Br-','I-','S2-','NO3-']); return {q:'AgNO3 + KBr gives precipitate of:',a:'AgBr (pale yellow)',hint:'AgBr is pale yellow, insoluble',solution:'Concept: Ag+ + Br- - AgBr (pale yellow precipitate)'}; }",
  "function () { var e=pick(['Cl-','Br-','I-','S2-','NO3-']); return {q:'AgNO3 + KI gives precipitate of:',a:'AgI (yellow)',hint:'AgI is yellow, insoluble',solution:'Concept: Ag+ + I- - AgI (yellow precipitate)'}; }",
  "function () { var e=pick(['Cl-','Br-','I-','S2-','NO3-']); return {q:'Chromyl chloride test is for:',a:'Cl-',hint:'Confirmatory test for chloride',solution:'Concept: NaCl + K2Cr2O7 + H2SO4 - red vapors of CrO2Cl2'}; }",
  "function () { return {q:'Brown ring test detects:',a:'NO3- (nitrate)',hint:'FeSO4 + H2SO4 + NO3- - brown ring',solution:'Concept: NO3- reduced to NO - forms brown ring [Fe(H2O)5NO]2+'}; }",
  "function () { return {q:'BaCl2 + dil HCl + SO42- gives:',a:'White precipitate of BaSO4',hint:'BaSO4 insoluble in dil HCl',solution:'Concept: Ba2+ + SO42- - BaSO4 (white, insoluble in dil HCl)'}; }",
  "function () { var e=pick(['Group I','Group II','Group III','Group IV','Group V','Group VI']); return {q:'Group I cations precipitated as:',a:'Chlorides (Ag+, Pb2+, Hg22+)',hint:'Group I reagent: dil HCl',solution:'Concept: Group I - chlorides insoluble in dil HCl'}; }",
  "function () { return {q:'Group II reagent in qualitative analysis:',a:'H2S in presence of dil HCl',hint:'Group II: Cu2+, Cd2+, Hg2+, Pb2+',solution:'Concept: Group II - H2S gas in acidic medium'}; }",
  "function () { return {q:'Group III precipitating reagent:',a:'NH4OH + NH4Cl',hint:'Group III: Al3+, Fe3+, Cr3+',solution:'Concept: Group III - NH4OH + NH4Cl precipitates hydroxides of Al, Fe, Cr'}; }",
  "function () { return {q:'Group IV precipitating reagent:',a:'H2S in presence of NH4OH',hint:'Group IV: Co2+, Ni2+, Zn2+, Mn2+',solution:'Concept: Group IV - H2S in basic medium (NH4OH)'}; }",
  "function () { return {q:'Group V cations:',a:'Ba2+, Sr2+, Ca2+',hint:'Precipitated as carbonates',solution:'Concept: Group V - carbonates of Ba, Sr, Ca with (NH4)2CO3'}; }",
  "function () { return {q:'Group VI (Mg2+) confirmed by:',a:'Phosphate test (MgNH4PO4 white ppt)',hint:'Mg2+ + PO43- + NH4+ - MgNH4PO4',solution:'Concept: Mg2+ + Na2HPO4 + NH4OH - MgNH4PO4 (white crystalline)'}; }",
  "function () { return {q:'CO32- with dil HCl produces:',a:'CO2 (turns lime water milky)',hint:'Carbonate + acid - CO2',solution:'Concept: CO32- + 2H+ - H2O + CO2 - Ca(OH)2 - CaCO3 (milky)'}; }",
  "function () { return {q:'SO32- test with dil HCl gives:',a:'SO2 gas (turns K2Cr2O7 green)',hint:'SO2 reduces Cr2O72- to Cr3+',solution:'Concept: SO32- + 2H+ - H2O + SO2 - reduces K2Cr2O7 to green Cr3+'}; }",
  "function () { return {q:'NO2- test gives brown fumes with:',a:'Dil HCl + FeSO4',hint:'Nitrite + acid - NO2 gas',solution:'Concept: NO2- + H+ - HNO2 - NO + NO2 (brown fumes)'}; }",
  "function () { return {q:'Which gives white ppt with NaOH that dissolves in excess?',a:'Al3+ (amphoteric)',hint:'Al(OH)3 dissolves in excess NaOH',solution:'Concept: Al3+ + 3OH- - Al(OH)3 (white) - Al(OH)4- (soluble in excess NaOH)'}; }",
  "function () { return {q:'K2Cr2O7 test for SO2: color change:',a:'Orange to green',hint:'Cr2O72- (orange) to Cr3+ (green)',solution:'Concept: SO2 reduces Cr2O72- - Cr3+ (green)'}; }",
  "function () { return {q:'Cu2+ with excess NH4OH gives:',a:'Deep blue [Cu(NH3)4]2+',hint:'Cu(OH)2 dissolved by NH3',solution:'Concept: Cu2+ + 4NH3 - [Cu(NH3)4]2+ (deep blue)'}; }",
  "function () { return {q:'Methyl orange in acidic medium:',a:'Red',hint:'MO: red in acid, yellow in base',solution:'Concept: methyl orange - red in acid (pH < 3.1), yellow in base (pH > 4.4)'}; }"
]) + "\n];";

// ==================== ENVIRONMENTAL ====================
result.new_topics.environmental = "GENERATORS.chemistry.environmental = [\n" + gen([
  "function () { var e=pick(['CO','NOx','SOx','O3','PM2.5']); return {q:'Major air pollutant from incomplete combustion:',a:'CO (carbon monoxide)',hint:'Incomplete combustion gives CO',solution:'Concept: CO from incomplete combustion - binds hemoglobin 300x stronger than O2'}; }",
  "function () { var e=pick(['CO2','CH4','N2O','CFCs']); return {q:'Highest GWP per molecule:',a:'CFCs',hint:'Chlorofluorocarbons trap heat efficiently',solution:'Concept: CFCs - very high GWP, also deplete ozone layer'}; }",
  "function () { return {q:'pH of normal rain water:',a:'5.6',hint:'CO2 dissolves forming carbonic acid',solution:'Concept: normal rain pH = 5.6 due to CO2 + H2O - H2CO3'}; }",
  "function () { return {q:'Acid rain mainly caused by:',a:'NOx and SOx',hint:'Oxides of N and S form acids',solution:'Concept: NOx + H2O - HNO3; SOx + H2O - H2SO4 - acid rain (pH < 5.6)'}; }",
  "function () { return {q:'BOD measures:',a:'Oxygen required to decompose organic matter in water',hint:'Higher BOD = more pollution',solution:'Concept: BOD - O2 consumed by microbes in 5 days at 20C'}; }",
  "function () { return {q:'COD is:',a:'Oxygen equivalent of organic matter oxidized by K2Cr2O7',hint:'Chemical method for organic content',solution:'Concept: COD - K2Cr2O7 oxidizes organic matter, measured as O2 equivalent'}; }",
  "function () { return {q:'Eutrophication caused by:',a:'Excess nitrates and phosphates in water',hint:'Fertilizer runoff - algal bloom',solution:'Concept: eutrophication - excess nutrients - algal bloom - O2 depletion'}; }",
  "function () { return {q:'Ozone hole primarily caused by:',a:'CFCs (chlorofluorocarbons)',hint:'CFCs release Cl atoms that destroy O3',solution:'Concept: CFCs + UV - Cl; Cl + O3 - ClO + O2; ClO + O - Cl + O2'}; }",
  "function () { return {q:'International treaty to phase out ODS:',a:'Montreal Protocol (1987)',hint:'Phase out ozone depleting substances',solution:'Concept: Montreal Protocol (1987) - phase out CFCs and other ODS'}; }",
  "function () { return {q:'Photochemical smog consists of:',a:'O3, PAN, aldehydes',hint:'Formed from NOx and hydrocarbons in sunlight',solution:'Concept: photochemical smog - NOx + HC + sunlight - O3 + PAN + aldehydes'}; }",
  "function () { return {q:'Green chemistry principle:',a:'Prevention is better than treatment',hint:'Minimize waste at source',solution:'Concept: green chemistry - prevent waste rather than treat after formation'}; }",
  "function () { return {q:'Flue gas desulfurization converts SO2 to:',a:'Gypsum (CaSO4.2H2O)',hint:'CaO + SO2 - CaSO3 - oxidized',solution:'Concept: FGD - CaO + SO2 - CaSO3 - oxidized to gypsum'}; }",
  "function () { return {q:'Biodegradable polymer example:',a:'PHBV (poly-b-hydroxybutyrate-co-b-hydroxyvalerate)',hint:'Produced by bacteria',solution:'Concept: PHBV - biodegradable polymer, breaks down by microbial action'}; }",
  "function () { return {q:'Pollutant damaging marble (CaCO3):',a:'SO2 (acid rain - H2SO4)',hint:'H2SO4 reacts with CaCO3',solution:'Concept: CaCO3 + H2SO4 - CaSO4 + CO2 + H2O - damages Taj Mahal'}; }",
  "function () { return {q:'Max permissible BOD for drinking water:',a:'< 5 mg/L',hint:'Clean water has low BOD',solution:'Concept: drinking water BOD < 5 mg/L; polluted > 10 mg/L'}; }",
  "function () { return {q:'Natural greenhouse effect without which Earth would be:',a:'Too cold (-18C instead of 15C)',hint:'Gases trap infrared radiation',solution:'Concept: natural greenhouse - avg temp 15C instead of -18C'}; }",
  "function () { return {q:'Catalytic converter converts:',a:'CO to CO2, NOx to N2, HC to CO2 + H2O',hint:'Uses Pt-Pd-Rh catalyst',solution:'Concept: catalytic converter - oxidation of CO and HC, reduction of NOx'}; }",
  "function () { return {q:'Kyoto Protocol deals with:',a:'Reduction of greenhouse gas emissions',hint:'International climate change treaty',solution:'Concept: Kyoto Protocol (1997) - binding targets for GHG reduction'}; }",
  "function () { return {q:'LD50 value indicates:',a:'Lethal dose that kills 50% of test population',hint:'mg per kg body weight',solution:'Concept: LD50 - dose required to kill 50% of animals (mg/kg)'}; }",
  "function () { return {q:'Biomagnification maximum in:',a:'DDT',hint:'Persistent pesticide accumulates in food chain',solution:'Concept: DDT - concentration increases up food chain (biomagnification)'}; }"
]) + "\n];";

// ==================== DEEPENED TOPICS ====================

// MOLE CONCEPT - +15
result.deepened_topics.mole_concept = "GENERATORS.chemistry.mole_concept.push(\n" + gen([
  "function () { var m=rand(5,25); var n=m/40; return {q:'Mass of NaOH = '+m+' g. Moles? (M = 40 g/mol)',a:n.toFixed(2)+' mol',hint:'n = given mass / molar mass',solution:'Formula: n = m/M - '+m+'/40 = '+n.toFixed(2)+' mol'}; }",
  "function () { var n=rand(1,5); var m=n*18; return {q:'Moles of H2O = '+n+'. Mass?',a:m+' g',hint:'m = n x M',solution:'Formula: m = n x M - '+n+' x 18 = '+m+' g'}; }",
  "function () { var m=rand(10,50); var M=rand(20,60); var n=m/M; return {q:'Mass = '+m+' g, Molar mass = '+M+' g/mol. Moles?',a:n.toFixed(2)+' mol',hint:'n = given mass / molar mass',solution:'Formula: n = m/M - '+m+'/'+M+' = '+n.toFixed(2)+' mol'}; }",
  "function () { var m=rand(5,20); var per=pick([40,50,60,70]); var comp=m*per/100; return {q:'Total='+m+' g, %C='+per+'. Mass of C?',a:comp.toFixed(2)+' g',hint:'Mass = (%/100) x total',solution:'Formula: = '+per+'x'+m+'/100 = '+comp.toFixed(2)+' g'}; }",
  "function () { var c=rand(40,50); var h=rand(5,10); var o=100-c-h; return {q:'C='+c+'%, H='+h+'%, O='+o+'%. Empirical formula? (C=12, H=1, O=16)',a:'C'+(c/12).toFixed(1)+'H'+h+'O'+(o/16).toFixed(1),hint:'Divide % by atomic mass',solution:'Formula: moles: C='+(c/12).toFixed(2)+', H='+h.toFixed(2)+', O='+(o/16).toFixed(2)}; }",
  "function () { var e=pick(['CH2','CH2O','CH']); var eM={'CH2':14,'CH2O':30,'CH':13}; var M=eM[e]*rand(2,6); var n=M/eM[e]; return {q:'Empirical='+e+', Molar mass='+M+'. Molecular formula?',a:n<2?e:e.charAt(0)+n+e.charAt(e.length>2?2:1)+(n==2?'':e.length>2?e.charAt(2):''),hint:'n = M / empirical mass',solution:'Formula: n = '+M+'/'+eM[e]+' = '+n}; }",
  "function () { var m=rand(10,30); var V=rand(100,500); var M=m*1000/(40*V); return {q:''+m+' g NaOH in '+V+' mL. Molarity?',a:M.toFixed(2)+' M',hint:'M = (m/M) x 1000/V',solution:'Formula: M = ('+m+'/40)x1000/'+V+' = '+M.toFixed(2)+' M'}; }",
  "function () { var n=rand(1,5); var V=rand(100,500); var M=n*1000/V; return {q:'n='+n+', V='+V+' mL. Molarity?',a:M.toFixed(2)+' M',hint:'M = n x 1000 / V',solution:'Formula: M = '+n+'x1000/'+V+' = '+M.toFixed(2)+' M'}; }",
  "function () { var m=rand(10,50); var V=rand(100,500); var mol=m/58.5; var M=mol*1000/V; return {q:'NaCl='+m+' g in '+V+' mL. M? (M=58.5)',a:M.toFixed(2)+' M',hint:'M = (m/M)x(1000/V)',solution:'Formula: M = ('+m+'/58.5)x(1000/'+V+') = '+M.toFixed(2)+' M'}; }",
  "function () { var m=rand(5,20); var V=rand(200,500); var n=m/40; var M=n*1000/V; return {q:'NaOH='+m+' g, V='+V+' mL. Molarity?',a:M.toFixed(3)+' M',hint:'First find n then M = n/V(L)',solution:'Formula: n='+m+'/40='+n.toFixed(3)+'; M='+n.toFixed(3)+'x1000/'+V+'='+M.toFixed(3)+' M'}; }",
  "function () { var a=rand(10,50); var b=rand(10,50); var l=pick(['HCl','H2SO4','NaOH']); var mM={'HCl':36.5,'H2SO4':98,'NaOH':40}; return {q:'Limiting reagent: '+a+' g '+l+' + '+b+' g CaCO3 (M: '+l+'='+mM[l]+', CaCO3=100)',a:(a/mM[l])<(b/100)?l:'CaCO3',hint:'Compare moles with stoichiometric ratio',solution:'Concept: moles '+l+'='+(a/mM[l]).toFixed(2)+', CaCO3='+(b/100).toFixed(2)}; }",
  "function () { var m=rand(10,50); var M=rand(100,200); var N=(m/M)*6.022e23; return {q:'Mass='+m+' g, M='+M+'. Number of molecules?',a:N.toExponential(3),hint:'N = (mass/M) x NA',solution:'Formula: N = ('+m+'/'+M+')x6.022x1023 = '+N.toExponential(3)}; }",
  "function () { var m=rand(1,10); var N=(m/18)*6.022e23; return {q:'Molecules in '+m+' g water:',a:N.toExponential(3),hint:'N = (mass/M) x NA',solution:'Formula: N = ('+m+'/18)x6.022x1023 = '+N.toExponential(3)}; }",
  "function () { var m=rand(2,10); var V=rand(100,500); return {q:'NaOH='+m+' g, Vol='+V+' mL. g/L?',a:(m*1000/V).toFixed(1)+' g/L',hint:'g/L = mass / volume in L',solution:'Formula: = '+m+'x1000/'+V+' = '+(m*1000/V).toFixed(1)+' g/L'}; }",
  "function () { var v=rand(5,25); var n=v/22.4; return {q:'Volume of CO2 at STP = '+v+' L. Moles?',a:n.toFixed(3)+' mol',hint:'At STP, 1 mole = 22.4 L',solution:'Formula: n = V/22.4 - '+v+'/22.4 = '+n.toFixed(3)+' mol'}; }"
]) + "\n);";

// ATOMIC STRUCTURE - +15
result.deepened_topics.atomic_structure = "GENERATORS.chemistry.atomic_structure.push(\n" + gen([
  "function () { var n=rand(1,4); var l=rand(0,n-1); return {q:'n='+n+', l='+l+'. Possible values of ml?',a:l*2+1, hint:'ml = -l to +l',solution:'Concept: ml = -'+l+' to +'+l+' - '+(2*l+1)+' values'}; }",
  "function () { var e=pick(['1s','2s','2p','3s','3d']); return {q:'Lowest energy orbital in H atom:',a:'1s',hint:'E depends only on n in H',solution:'Concept: E ~ 1/n2 - 1s has lowest n'}; }",
  "function () { var e=pick(['Pauli','Hund','Aufbau']); return {q:'No two electrons have same 4 quantum numbers:',a:'Pauli exclusion principle',hint:'Each electron has unique set',solution:'Concept: Pauli - max 2 electrons per orbital with opposite spins'}; }",
  "function () { var e=pick(['Pauli','Hund','Aufbau']); return {q:'Electrons fill orbitals in increasing energy:',a:'Aufbau principle',hint:'Lowest energy first',solution:'Concept: Aufbau - 1s - 2s - 2p - 3s - 3p - 4s - 3d ...'}; }",
  "function () { var e=pick(['Pauli','Hund','Aufbau']); return {q:'Electrons fill degenerate orbitals singly first:',a:'Hunds rule',hint:'Maximizes total spin',solution:'Concept: Hund - electrons occupy degenerate orbitals singly first'}; }",
  "function () { var z=rand(3,10); var ec=['Li: 1s2 2s1','Be: 1s2 2s2','B: 1s2 2s2 2p1','C: 1s2 2s2 2p2','N: 1s2 2s2 2p3','O: 1s2 2s2 2p4','F: 1s2 2s2 2p5','Ne: 1s2 2s2 2p6']; return {q:'Electronic config of Z='+z+':',a:ec[z-3],hint:'Fill orbitals following Aufbau',solution:'Concept: Z='+z+' - '+ec[z-3]}; }",
  "function () { var n=rand(2,5); return {q:'Number of subshells for n='+n+':',a:n,hint:'l=0 to n-1',solution:'Concept: for n='+n+', l=0 to '+(n-1)+' - '+n+' subshells'}; }",
  "function () { var lam=rand(400,700); var nu=3e8/(lam*1e-9); return {q:'Wavelength='+lam+' nm. Frequency? (c=3x108 m/s)',a:nu.toExponential(2)+' Hz',hint:'n = c/l',solution:'Formula: n = c/l - 3x108 / ('+lam+'x10-9) = '+nu.toExponential(2)+' Hz'}; }",
  "function () { var nu=rand(1,10)*1e14; var e=6.626e-34*nu; return {q:'n='+nu.toExponential(1)+' Hz. Energy?',a:e.toExponential(2)+' J',hint:'E = hn',solution:'Formula: E = hn - 6.626x10-34 x '+nu.toExponential(1)+' = '+e.toExponential(2)+' J'}; }",
  "function () { var n1=rand(1,3); var n2=rand(n1+1,6); var rh=1.097e7; var wl=1/(rh*(1/(n1*n1)-1/(n2*n2))); return {q:'Wavelength for n='+n2+' to n='+n1+' in H? (RH=1.097x107 m-1)',a:(wl*1e9).toFixed(1)+' nm',hint:'1/l = RH(1/n12 - 1/n22)',solution:'Formula: 1/l = 1.097x107(1/'+n1+'2 - 1/'+n2+'2) = '+(wl*1e9).toFixed(1)+' nm'}; }",
  "function () { var e=pick(['Lyman','Balmer','Paschen']); return {q:'Spectral series in visible region:',a:'Balmer series',hint:'n1=2 for Balmer',solution:'Concept: Balmer series - n1=2, transitions to n2=3,4,5. in visible'}; }",
  "function () { var v=rand(1,5)*1e5; var m=9.11e-31; var lam=(6.626e-34)/(m*v); return {q:'de Broglie wavelength (v='+v.toExponential(1)+' m/s):',a:lam.toExponential(2)+' m',hint:'l = h/mv',solution:'Formula: l = h/mv = 6.626x10-34/(9.11x10-31x'+v.toExponential(1)+') = '+lam.toExponential(2)+' m'}; }",
  "function () { var delx=rand(1,5)*1e-10; var delp=6.626e-34/(4*Math.PI*delx); return {q:'Dx='+delx.toExponential(1)+' m. Min Dp?',a:delp.toExponential(2)+' kg m/s',hint:'Dx.Dp >= h/4p',solution:'Formula: Dp = h/(4pDx) = 6.626x10-34/(4px'+delx.toExponential(1)+') = '+delp.toExponential(2)}; }",
  "function () { var e=pick(['s','p','d','f']); return {q:'Azimuthal quantum number (l) for s orbital:',a:0,hint:'s-0, p-1, d-2, f-3',solution:'Concept: s orbital - l = '+('0')}; }",
  "function () { var e=pick(['s','p','d','f']); return {q:'Number of orbitals in f subshell:',a:7,hint:'f - l=3, ml=-3 to +3',solution:'Concept: f subshell - l=3 - 2l+1 = '+('7')+' orbitals'}; }"
]) + "\n);";

// GASEOUS STATE - +15
result.deepened_topics.gaseous_state = "GENERATORS.chemistry.gaseous_state.push(\n" + gen([
  "function () { var P=rand(1,5); var V=rand(10,50); var n=rand(1,5); var T=P*V/(n*0.0821); return {q:'P='+P+' atm, V='+V+' L, n='+n+' mol. T? (R=0.0821)',a:T.toFixed(1)+' K',hint:'PV = nRT',solution:'Formula: T = PV/nR = '+P+'x'+V+'/('+n+'x0.0821) = '+T.toFixed(1)+' K'}; }",
  "function () { var V1=rand(10,50); var P1=rand(1,5); var P2=rand(P1+1,10); return {q:'Boyles law: V1='+V1+' L, P1='+P1+' atm, P2='+P2+' atm. V2?',a:(V1*P1/P2).toFixed(1)+' L',hint:'P1V1 = P2V2',solution:'Formula: V2 = P1V1/P2 = '+P1+'x'+V1+'/'+P2+' = '+(V1*P1/P2).toFixed(1)+' L'}; }",
  "function () { var V1=rand(10,50); var T1=rand(273,373); var T2=rand(T1+50,500); return {q:'Charles law: V1='+V1+' L, T1='+T1+' K, T2='+T2+' K. V2?',a:(V1*T2/T1).toFixed(1)+' L',hint:'V1/T1 = V2/T2',solution:'Formula: V2 = V1T2/T1 = '+V1+'x'+T2+'/'+T1+' = '+(V1*T2/T1).toFixed(1)+' L'}; }",
  "function () { var V=rand(10,50); var T=rand(273,373); var n=rand(1,5); var P=n*0.0821*T/V; return {q:'n='+n+' mol, V='+V+' L, T='+T+' K. P?',a:P.toFixed(2)+' atm',hint:'PV = nRT',solution:'Formula: P = nRT/V = '+n+'x0.0821x'+T+'/'+V+' = '+P.toFixed(2)+' atm'}; }",
  "function () { var n=rand(1,5); var V=rand(10,50); var T=rand(273,373); var P=n*0.0821*T/V; return {q:'Ideal gas: n='+n+', V='+V+' L, T='+T+' K. P?',a:P.toFixed(2)+' atm',hint:'PV = nRT, R=0.0821',solution:'Formula: P = nRT/V = '+n+'x0.0821x'+T+'/'+V+' = '+P.toFixed(2)+' atm'}; }",
  "function () { return {q:'Kinetic theory: avg KE of gas is proportional to:',a:'Absolute temperature (T)',hint:'KE_avg = (3/2)kT',solution:'Concept: KE_avg = (3/2)kT - proportional to absolute temperature'}; }",
  "function () { var m=rand(2,100); var v=Math.sqrt(3*8.314*300/(m/1000)); return {q:'M='+m+' g/mol, T=300 K. RMS velocity? (R=8.314)',a:v.toFixed(1)+' m/s',hint:'v_rms = v(3RT/M)',solution:'Formula: v_rms = v(3x8.314x300/'+(m/1000)+') = '+v.toFixed(1)+' m/s'}; }",
  "function () { return {q:'Grahams law: rate ratio of H2 (M=2) to O2 (M=32):',a:'4 : 1',hint:'r ~ 1/vM',solution:'Formula: r_H2/r_O2 = v(M_O2/M_H2) = v(32/2) = '+(4).toFixed(1)}; }",
  "function () { var P=rand(10,100); var V=rand(1,10); var n=rand(1,5); var a=rand(1,5); var b=rand(1,5)/100; var Preal=(n*0.0821*300/(V-n*b))-(a*n*n/(V*V)); return {q:'vdW: n='+n+', V='+V+' L, a='+a+', b='+b.toFixed(2)+', T=300 K. P?',a:Preal.toFixed(2)+' atm',hint:'(P+an2/V2)(V-nb)=nRT',solution:'Formula: P = nRT/(V-nb) - an2/V2'}; }",
  "function () { return {q:'Critical temperature (Tc) in vdW:',a:'Tc = 8a/(27Rb)',hint:'Tc depends on a and b',solution:'Concept: Tc = 8a/(27Rb) - above Tc, gas cannot be liquefied'}; }",
  "function () { return {q:'Daltons law of partial pressure:',a:'P_total = P1 + P2 + P3 + ...',hint:'Each gas exerts its own pressure',solution:'Concept: P_total = SPi - each gas behaves independently'}; }",
  "function () { var P=rand(1,5); var f=pick([0.2,0.3,0.5]); return {q:'Total P='+P+' atm, mole fraction O2='+f.toFixed(1)+'. pO2?',a:(P*f).toFixed(2)+' atm',hint:'pi = P_total x xi',solution:'Formula: pO2 = '+P+' x '+f.toFixed(1)+' = '+(P*f).toFixed(2)+' atm'}; }",
  "function () { var m=rand(2,4); var v=Math.sqrt(3*8.314*300/(m/1000)); return {q:'RMS speed (M='+m+' g/mol, T=300 K):',a:v.toFixed(0)+' m/s',hint:'v_rms = v(3RT/M)',solution:'Formula: v_rms = v(3x8.314x300/'+(m/1000)+') = '+v.toFixed(0)+' m/s'}; }",
  "function () { return {q:'T at which RMS of H2 equals RMS of O2 at 300 K:',a:'4800 K',hint:'v_rms ~ v(T/M)',solution:'Formula: v(T_H2/2) = v(300/32) - T_H2 = 300x32/2 = '+('4800')+' K'}; }",
  "function () { return {q:'Compressibility factor Z for ideal gas:',a:'Z = 1',hint:'Z = PV/nRT',solution:'Concept: for ideal gas, PV = nRT - Z = '+('1')}; }"
]) + "\n);";

// Print JSON
console.log(JSON.stringify(result, null, 2));
