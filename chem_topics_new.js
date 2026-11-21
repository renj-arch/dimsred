// New topics for chemistry
var result = { new_topics: {}, deepened_topics: {}, new_topic_names: ["solid_state","solutions","metallurgy","salt_analysis","environmental"] };
function g(a) { return a.join(",\n"); }

// ========== SOLID STATE ==========
result.new_topics.solid_state = "GENERATORS.chemistry.solid_state = [\n" + g([
  'function () { var a=rand(1,3); var t=["sc","bcc","fcc"]; var n=[1,2,4]; return {q:"Atoms/unit cell in "+t[a-1]+"?",a:n[a-1],hint:"Count corners,faces,center",solution:"Concept: "+t[a-1]+" = "+n[a-1]}; }',
  'function () { var a=rand(1,3); var t=["sc","bcc","fcc"]; var e=[52.4,68,74]; return {q:"Packing efficiency of "+t[a-1]+"?",a:e[a-1],hint:"PE=vol atoms/vol cell",solution:"Concept: "+t[a-1]+" PE="+e[a-1]+"%"}; }',
  'function () { return {q:"Atoms in fcc unit cell?",a:4,hint:"8x1/8+6x1/2=4",solution:"Concept: fcc=4 atoms"}; }',
  'function () { var r=rand(100,200); return {q:"sc r="+r+" pm. a?",a:(2*r)+" pm",hint:"a=2r",solution:"Formula: a=2r="+(2*r)}; }',
  'function () { var r=rand(100,200); var a=4*r/Math.sqrt(3); return {q:"bcc r="+r+" pm. a?",a:a.toFixed(1)+" pm",hint:"4r=av3",solution:"Formula: a=4r/v3="+a.toFixed(1)}; }',
  'function () { var r=rand(100,200); var a=2*Math.SQRT2*r; return {q:"fcc r="+r+" pm. a?",a:a.toFixed(1)+" pm",hint:"4r=av2",solution:"Formula: a=2v2r="+a.toFixed(1)}; }',
  'function () { var a=rand(300,500); var r=a*Math.sqrt(3)/4; return {q:"bcc a="+a+" pm. r?",a:r.toFixed(1)+" pm",hint:"r=av3/4",solution:"Formula: r=av3/4="+r.toFixed(1)}; }',
  'function () { var a=rand(300,500); var r=a/(2*Math.SQRT2); return {q:"fcc a="+a+" pm. r?",a:r.toFixed(1)+" pm",hint:"r=a/(2v2)",solution:"Formula: r=a/(2v2)="+r.toFixed(1)}; }',
  'function () { var a=rand(300,500); var z=pick([1,2,4]); var M=pick([27,56,63.5,108]); var d=z*M/(a*a*a*1e-30*6.022e23); return {q:"z="+z+", a="+a+" pm, M="+M+". Density?",a:d.toFixed(2),hint:"d=zM/(a3Na)",solution:"Formula: d="+d.toFixed(2)}; }',
  'function () { return {q:"Cation vacancy+interstitial?",a:"Frenkel defect",hint:"Seen in AgCl",solution:"Concept: Frenkel defect"}; }',
  'function () { return {q:"Defect in NaCl?",a:"Schottky defect",hint:"Equal vacancies",solution:"Concept: Schottky"}; }',
  'function () { return {q:"Si+As gives?",a:"n-type",hint:"Group 15",solution:"Concept: n-type"}; }',
  'function () { return {q:"Si+In gives?",a:"p-type",hint:"Group 13",solution:"Concept: p-type"}; }',
  'function () { return {q:"CN of bcc?",a:8,hint:"Neighbors",solution:"Concept: bcc CN=8"}; }',
  'function () { return {q:"CN of fcc?",a:12,hint:"Neighbors",solution:"Concept: fcc CN=12"}; }',
  'function () { var e=pick(["sc","bcc","fcc","hcp"]); var m={s:6,b:8,f:12,h:12}; return {q:"CN in "+e+"?",a:m[e[0]],hint:"Count",solution:"Concept: "+e+" CN="+m[e[0]]}; }',
  'function () { var e=pick(["NaCl","CsCl","ZnS"]); var m={N:"Rock salt",C:"CsCl type",Z:"Zinc blende"}; return {q:"Structure of "+e+"?",a:m[e[0]],hint:"Crystal",solution:"Concept: "+e+" - "+m[e[0]]}; }',
  'function () { return {q:"Paramagnetic behavior?",a:"Unpaired e- attracted by field",hint:"Temp dependent",solution:"Concept: paramagnetic"}; }',
  'function () { return {q:"Ferromagnetic behavior?",a:"Aligned domains, permanent",hint:"Fe, Co, Ni",solution:"Concept: ferromagnetic"}; }',
  'function () { return {q:"Band gap ~1 eV material?",a:"Semiconductors",hint:"Si, Ge",solution:"Concept: semiconductors"}; }',
  'function () { return {q:"Void % in sc?",a:"47.6%",hint:"100-52.4",solution:"Concept: sc=47.6%"}; }',
  'function () { return {q:"Octahedral voids/hcp atom?",a:1,hint:"6per6atoms",solution:"Concept: hcp=1 void/atom"}; }',
  'function () { return {q:"Tetrahedral voids/fcc atom?",a:2,hint:"8per4atoms",solution:"Concept: fcc=2 voids/atom"}; }',
  'function () { return {q:"Atoms in bcc unit cell?",a:2,hint:"8x1/8+1=2",solution:"Concept: bcc=2 atoms"}; }'
]) + "\n];";

// ========== SOLUTIONS ==========
result.new_topics.solutions = "GENERATORS.chemistry.solutions = [\n" + g([
  'function () { var m=rand(10,50); var n=m/40; return {q:"Mass NaOH="+m+" g. Moles?",a:n.toFixed(2)+" mol",hint:"n=m/M",solution:"n="+m+"/40="+n.toFixed(2)}; }',
  'function () { var m=rand(5,20); var V=rand(100,500); var n=m/40; var M=n*1000/V; return {q:"NaOH "+m+" g in "+V+" mL. Molarity?",a:M.toFixed(2)+" M",hint:"M=n/V(L)",solution:"M="+M.toFixed(2)}; }',
  'function () { var n=rand(1,5)/10; var m=rand(100,500); return {q:"moles="+n.toFixed(1)+", solvent="+m+" g. Molality?",a:(n*1000/m).toFixed(3)+" m",hint:"m=n/kg",solution:"m="+(n*1000/m).toFixed(3)}; }',
  'function () { var m=rand(10,50); var n=m/40; var ns=m/18; return {q:"solute="+n.toFixed(2)+" mol, water="+m+" g. Mole fraction?",a:(n/(n+ns)).toFixed(4),hint:"x=n/total",solution:"x="+(n/(n+ns)).toFixed(4)}; }',
  'function () { return {q:"Gas solubility ~ partial pressure?",a:"Henrys law",hint:"p=KHx",solution:"Concept: Henrys law"}; }',
  'function () { return {q:"Solution obeying Raoults law completely?",a:"Ideal solution",hint:"DH=0,DV=0",solution:"Concept: Ideal solution"}; }',
  'function () { return {q:"A-B weaker than A-A+B-B gives?",a:"Positive deviation",hint:"Higher v.p.",solution:"Concept: Positive deviation"}; }',
  'function () { return {q:"Minimum boiling azeotrope?",a:"Ethanol-water",hint:"95.4% ethanol",solution:"Concept: Ethanol-water"}; }',
  'function () { return {q:"Relative lowering of v.p. depends on?",a:"Mole fraction of solute",hint:"Raoults law",solution:"Concept: Dp/p0 = x_solute"}; }',
  'function () { var m=rand(10,50); var M=rand(50,150); var Kb=rand(2,6)/10; var ms=rand(100,500); var dT=Kb*m*1000/(M*ms); return {q:m+" g (M="+M+") in "+ms+" g, Kb="+Kb.toFixed(1)+". DTb?",a:dT.toFixed(3)+" K",hint:"DTb=Kb x m",solution:"DTb="+dT.toFixed(3)}; }',
  'function () { var m=rand(10,50); var M=rand(50,150); var Kf=(rand(1,5)*0.86+0.1).toFixed(2); var ms=rand(100,500); var dT=parseFloat(Kf)*m*1000/(M*ms); return {q:m+" g (M="+M+") in "+ms+" g, Kf="+Kf+". DTf?",a:dT.toFixed(2)+" K",hint:"DTf=Kf x m",solution:"DTf="+dT.toFixed(2)}; }',
  'function () { var n=rand(1,10)/100; var T=rand(27,37); var V=rand(1,5); var pi=n*0.0821*(T+273)/V; return {q:"n="+n.toFixed(2)+", V="+V+" L, T="+T+"C. Osmotic P?",a:pi.toFixed(2)+" atm",hint:"p=nRT/V",solution:"p="+pi.toFixed(2)}; }',
  'function () { return {q:"van t Hoff factor NaCl?",a:2,hint:"i=particles",solution:"NaCl i=2"}; }',
  'function () { return {q:"van t Hoff factor glucose?",a:1,hint:"no dissociation",solution:"glucose i=1"}; }',
  'function () { return {q:"Mole fraction water in 1 molal?",a:"0.9823",hint:"55.55/(55.55+1)",solution:"x=0.9823"}; }',
  'function () { var p=rand(100,760); var dp=rand(10,50); return {q:"p0="+p+",p="+(p-dp)+". Dp/p0?",a:(dp/p).toFixed(4),hint:"(p0-p)/p0",solution:"Dp/p0="+(dp/p).toFixed(4)}; }',
  'function () { return {q:"Concentration that changes with T?",a:"Molarity",hint:"Volume dependent",solution:"Molarity (V~T)"}; }',
  'function () { return {q:"Higher KH means?",a:"Lower solubility",hint:"Inverse",solution:"KH ~ 1/solubility"}; }',
  'function () { return {q:"Ideal solution pair?",a:"Benzene-toluene",hint:"Similar properties",solution:"Benzene-toluene"}; }',
  'function () { return {q:"Highest osmotic pressure: urea/NaCl/CaCl2?",a:"CaCl2",hint:"p=iCRT",solution:"CaCl2 i=3"}; }',
  'function () { return {q:"Best colligative property for polymer?",a:"Osmotic pressure",hint:"Sensitive",solution:"Osmotic pressure"}; }',
  'function () { return {q:"Reverse osmosis requires P?",a:"> osmotic pressure",hint:"Against gradient",solution:"P > p"}; }',
  'function () { return {q:"0.1M NaCl vs glucose: lower FP?",a:"NaCl",hint:"DTf ~ i",solution:"NaCl (i=2)"}; }',
  'function () { return {q:"HCl-H2O azeotrope type?",a:"Maximum boiling, 20.24% HCl",hint:"Max boiling",solution:"Max boiling azeotrope"}; }',
  'function () { return {q:"Coagulant for As2S3 (neg sol)?",a:"FeCl3",hint:"Hardy-Schulze",solution:"Fe3+ highest charge"}; }',
  'function () { var m=rand(5,20); var M=rand(200,500); var V=rand(500,1000); var pi=m*0.0821*298*1000/(M*V); return {q:m+" g polymer in "+V+" mL, p="+pi.toFixed(4)+" atm. M?",a:((m*0.0821*298*1000)/(pi*V)).toFixed(1),hint:"p=mRT/MV",solution:"M="+((m*0.0821*298*1000)/(pi*V)).toFixed(1)}; }',
  'function () { return {q:"Gold number is?",a:"mg colloid preventing coagulation",hint:"Protective action",solution:"Gold number"}; }',
  'function () { return {q:"Highest FP: glucose/NaCl/CaCl2?",a:"Glucose",hint:"Small DTf",solution:"Glucose has highest FP"}; }'
]) + "\n];";

// ========== METALLURGY ==========
result.new_topics.metallurgy = "GENERATORS.chemistry.metallurgy = [\n" + g([
  'function () { return {q:"Most abundant metal in crust?",a:"Al",hint:"~8%",solution:"Al most abundant"}; }',
  'function () { return {q:"Aluminium ore?",a:"Bauxite (Al2O3.2H2O)",hint:"Oxide ore",solution:"Bauxite"}; }',
  'function () { return {q:"Lead ore?",a:"Galena (PbS)",hint:"Sulfide",solution:"Galena"}; }',
  'function () { return {q:"Sulfide ore concentration?",a:"Froth flotation",hint:"Wetting difference",solution:"Froth flotation"}; }',
  'function () { return {q:"Bauxite concentration?",a:"Leaching (Bayers)",hint:"NaOH dissolves Al2O3",solution:"Bayers process"}; }',
  'function () { return {q:"Heating ore in limited air?",a:"Calcination",hint:"Removes CO2,H2O",solution:"Calcination"}; }',
  'function () { return {q:"Heating sulfide ore in excess air?",a:"Roasting",hint:"Sulfide to oxide",solution:"Roasting"}; }',
  'function () { return {q:"Reducing agent for Fe?",a:"CO",hint:"Blast furnace",solution:"CO reduces Fe2O3"}; }',
  'function () { return {q:"Flux for iron extraction?",a:"Limestone (CaCO3)",hint:"Removes SiO2",solution:"CaO+SiO2->CaSiO3"}; }',
  'function () { return {q:"Cryolite in Hall-Heroult?",a:"Solvent for Al2O3",hint:"Lowers mp",solution:"Cryolite lowers mp"}; }',
  'function () { return {q:"Zn from ZnO uses?",a:"Coke (C)",hint:"ZnO+C->Zn+CO",solution:"Carbon reduction"}; }',
  'function () { return {q:"Copper from Cu2S extracted by?",a:"Self-reduction",hint:"Cu2S+Cu2O->Cu",solution:"Self-reduction"}; }',
  'function () { return {q:"Zone refining for?",a:"Ultra-pure semiconductors",hint:"Si, Ge",solution:"Zone refining"}; }',
  'function () { return {q:"Zn refining method?",a:"Distillation",hint:"Zn BP=907C",solution:"Distillation"}; }',
  'function () { return {q:"Electrolytic Cu: anode?",a:"Impure Cu (anode), pure Cu (cathode)",hint:"CuSO4 electrolyte",solution:"Electrolytic refining"}; }',
  'function () { return {q:"Mond process extracts?",a:"Ni",hint:"Ni(CO)4",solution:"Ni via carbonyl"}; }',
  'function () { return {q:"Cyanide process for Ag: complex?",a:"[Ag(CN)2]-",hint:"NaCN dissolves",solution:"Na[Ag(CN)2]"}; }',
  'function () { return {q:"Thermite process reducing agent?",a:"Al",hint:"Reduces Fe2O3",solution:"2Al+Fe2O3->2Fe"}; }',
  'function () { return {q:"Blast furnace slag?",a:"CaSiO3",hint:"CaO+SiO2",solution:"Calcium silicate"}; }',
  'function () { return {q:"Froth stabilizer?",a:"Pine oil / cresol",hint:"Stabilizes froth",solution:"Pine oil"}; }',
  'function () { return {q:"Collector in flotation?",a:"Xanthates",hint:"Hydrophobic coating",solution:"Xanthates"}; }',
  'function () { return {q:"Van Arkel for Ti uses?",a:"TiI4 (volatile)",hint:"Ti+2I2->TiI4->Ti",solution:"TiI4"}; }',
  'function () { return {q:"Ellingham diagram plots?",a:"DG vs Temperature",hint:"Oxide stability",solution:"Ellingham plot"}; }',
  'function () { return {q:"Castner-Kellner process?",a:"Extraction of Na",hint:"Electrolysis NaCl",solution:"Na extraction"}; }',
  'function () { return {q:"Copper ore example?",a:"Malachite/Chalcopyrite",hint:"Cu ores",solution:"Cu ores"}; }'
]) + "\n];";

// ========== SALT ANALYSIS ==========
result.new_topics.salt_analysis = "GENERATORS.chemistry.salt_analysis = [\n" + g([
  'function () { return {q:"Co in borax bead test?",a:"Blue",hint:"Co gives blue",solution:"Co - blue bead"}; }',
  'function () { return {q:"Prussian blue with K4[Fe(CN)6]?",a:"Fe3+",hint:"Fe4[Fe(CN)6]3",solution:"Fe3+ -> Prussian blue"}; }',
  'function () { return {q:"Turnbulls blue with K3[Fe(CN)6]?",a:"Fe2+",hint:"Fe3[Fe(CN)6]2",solution:"Fe2+ -> Turnbulls blue"}; }',
  'function () { return {q:"Brown with Nesslers reagent?",a:"NH4+",hint:"K2HgI4",solution:"NH4+ -> brown"}; }',
  'function () { return {q:"Na+ flame test?",a:"Golden yellow",hint:"589 nm",solution:"Na+ yellow"}; }',
  'function () { return {q:"Ca2+ flame test?",a:"Brick red",hint:"Emits red",solution:"Ca2+ brick red"}; }',
  'function () { return {q:"Sr2+ flame test?",a:"Crimson red",hint:"Sr gives crimson",solution:"Sr2+ crimson"}; }',
  'function () { return {q:"AgNO3 + KBr gives?",a:"AgBr (pale yellow)",hint:"Insoluble",solution:"AgBr pale yellow"}; }',
  'function () { return {q:"AgNO3 + KI gives?",a:"AgI (yellow)",hint:"Insoluble",solution:"AgI yellow"}; }',
  'function () { return {q:"Chromyl chloride test for?",a:"Cl-",hint:"CrO2Cl2 red vapors",solution:"Cl- -> CrO2Cl2"}; }',
  'function () { return {q:"Brown ring test for?",a:"NO3-",hint:"FeSO4+H2SO4",solution:"NO3- -> brown ring"}; }',
  'function () { return {q:"BaCl2 + SO42- in dil HCl?",a:"White BaSO4",hint:"Insoluble",solution:"BaSO4 white"}; }',
  'function () { return {q:"Group I cations?",a:"Ag+, Pb2+, Hg22+",hint:"Chlorides",solution:"Group I = chlorides"}; }',
  'function () { return {q:"Group II reagent?",a:"H2S + dil HCl (acidic)",hint:"Cu,Cd,Hg,Pb",solution:"H2S/acid"}; }',
  'function () { return {q:"Group III reagent?",a:"NH4OH + NH4Cl",hint:"Al,Fe,Cr",solution:"NH4OH+NH4Cl"}; }',
  'function () { return {q:"Group IV reagent?",a:"H2S + NH4OH (basic)",hint:"Co,Ni,Zn,Mn",solution:"H2S/base"}; }',
  'function () { return {q:"Group V cations?",a:"Ba2+, Sr2+, Ca2+",hint:"Carbonates",solution:"Carbonates"}; }',
  'function () { return {q:"Mg2+ confirmatory test?",a:"Phosphate test (MgNH4PO4)",hint:"White crystalline",solution:"MgNH4PO4"}; }',
  'function () { return {q:"CO32- + dil HCl?",a:"CO2 (milky limewater)",hint:"Effervescence",solution:"CO2 gas"}; }',
  'function () { return {q:"SO32- + dil HCl gives?",a:"SO2 (turns K2Cr2O7 green)",hint:"SO2 reduces Cr",solution:"SO2 -> green Cr3+"}; }',
  'function () { return {q:"NO2- test?",a:"Brown fumes with FeSO4+HCl",hint:"NO+NO2",solution:"Brown fumes nitrite"}; }',
  'function () { return {q:"White ppt with NaOH soluble in excess?",a:"Al3+ (amphoteric)",hint:"Al(OH)3 dissolves",solution:"Al3+ amphoteric"}; }',
  'function () { return {q:"K2Cr2O7 + SO2 color?",a:"Orange to green",hint:"Cr(VI)->Cr(III)",solution:"Orange->green"}; }',
  'function () { return {q:"Cu2+ + excess NH4OH?",a:"Deep blue [Cu(NH3)4]2+",hint:"Complex",solution:"[Cu(NH3)4]2+"}; }',
  'function () { return {q:"Methyl orange in acid?",a:"Red",hint:"Red < 3.1",solution:"MO red in acid"}; }'
]) + "\n];";

// ========== ENVIRONMENTAL ==========
result.new_topics.environmental = "GENERATORS.chemistry.environmental = [\n" + g([
  'function () { return {q:"Incomplete combustion pollutant?",a:"CO",hint:"Binds hemoglobin",solution:"CO from incomplete combustion"}; }',
  'function () { return {q:"Highest GWP?",a:"CFCs",hint:"Trap heat",solution:"CFCs high GWP"}; }',
  'function () { return {q:"Normal rain pH?",a:"5.6",hint:"CO2+H2O->H2CO3",solution:"pH=5.6"}; }',
  'function () { return {q:"Acid rain causes?",a:"NOx and SOx",hint:"HNO3 + H2SO4",solution:"NOx and SOx"}; }',
  'function () { return {q:"BOD measures?",a:"O2 for organic matter decomposition",hint:"Microbial activity",solution:"BOD = O2 needed"}; }',
  'function () { return {q:"COD is?",a:"O2 equivalent by K2Cr2O7",hint:"Chemical oxidation",solution:"Chemical O2 demand"}; }',
  'function () { return {q:"Eutrophication causes?",a:"Excess N and P (fertilizers)",hint:"Algal bloom",solution:"Nutrient pollution"}; }',
  'function () { return {q:"Ozone depletion by?",a:"CFCs",hint:"Cl destroys O3",solution:"CFCs -> O3 depletion"}; }',
  'function () { return {q:"ODS phaseout treaty?",a:"Montreal Protocol (1987)",hint:"CFC ban",solution:"Montreal Protocol"}; }',
  'function () { return {q:"Photochemical smog contains?",a:"O3, PAN, aldehydes",hint:"NOx+HC+sun",solution:"Photochemical smog"}; }',
  'function () { return {q:"Green chemistry principle?",a:"Prevention better than cleanup",hint:"Waste reduction",solution:"Prevent waste"}; }',
  'function () { return {q:"FGD converts SO2 to?",a:"Gypsum (CaSO4.2H2O)",hint:"CaO+SO2+O2",solution:"FGD -> gypsum"}; }',
  'function () { return {q:"Marble damage by?",a:"SO2/acid rain (CaCO3+H2SO4)",hint:"Taj Mahal damage",solution:"Acid rain on marble"}; }',
  'function () { return {q:"Drinking water BOD limit?",a:"<5 mg/L",hint:"Clean water",solution:"BOD<5"}; }',
  'function () { return {q:"Natural greenhouse effect?",a:"Gases trap IR (avg 15C vs -18C)",hint:"Necessary",solution:"Natural greenhouse"}; }',
  'function () { return {q:"Catalytic converter products?",a:"CO2, N2, H2O (from CO, NOx, HC)",hint:"Pt-Pd-Rh",solution:"Oxidation + reduction"}; }',
  'function () { return {q:"Kyoto Protocol deals with?",a:"GHG emission reduction",hint:"Climate change",solution:"Kyoto Protocol"}; }',
  'function () { return {q:"LD50 indicates?",a:"Dose killing 50% of population",hint:"Toxicity measure",solution:"LD50"}; }',
  'function () { return {q:"Biomagnification: DDT?",a:"Concentration increases up food chain",hint:"Persistent",solution:"DDT biomagnification"}; }',
  'function () { return {q:"Major greenhouse gas?",a:"CO2",hint:"Fossil fuels",solution:"CO2"}; }'
]) + "\n];";

console.log("ALL NEW TOPICS GENERATED");
console.log(JSON.stringify(result));
