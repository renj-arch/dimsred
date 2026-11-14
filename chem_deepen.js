// Deepened topics for chemistry
// Reads the new topics output and adds deepened topics
var fs = require('fs');
var result = JSON.parse(fs.readFileSync(process.env.TEMP + '\\chem_new_only.json', 'utf8'));
function g(a) { return a.join(",\n"); }

result.deepened_topics = {};

// MOLE CONCEPT
result.deepened_topics.mole_concept = "GENERATORS.chemistry.mole_concept.push(\n" + g([
  'function () { var m=rand(5,25); var n=m/40; return {q:"Mass NaOH="+m+" g. Moles?",a:n.toFixed(2)+" mol",hint:"n=m/M",solution:"n="+m+"/40="+n.toFixed(2)}; }',
  'function () { var n=rand(1,5); var m=n*18; return {q:"Moles H2O="+n+". Mass?",a:m+" g",hint:"m=nM",solution:"m="+n+"x18="+m}; }',
  'function () { var m=rand(10,50); var M=rand(20,60); var n=m/M; return {q:"Mass="+m+", M="+M+". Moles?",a:n.toFixed(2)+" mol",hint:"n=m/M",solution:"n="+m+"/"+M+"="+n.toFixed(2)}; }',
  'function () { var m=rand(5,20); var per=pick([40,50,60,70]); return {q:"Total="+m+" g, %C="+per+". Mass of C?",a:(m*per/100).toFixed(2)+" g",hint:"%=mass/total",solution:"C mass="+(m*per/100).toFixed(2)}; }',
  'function () { var c=rand(40,50); var h=rand(5,10); var o=100-c-h; return {q:"C="+c+"%,H="+h+"%,O="+o+"%. Empirical?",a:"C"+(c/12).toFixed(1)+"H"+h+"O"+(o/16).toFixed(1),hint:"Divide at mass",solution:"Moles: C="+(c/12).toFixed(2)+", H="+h+", O="+(o/16).toFixed(2)}; }',
  'function () { var e=pick(["CH2","CH2O","CH"]); var eM={CH2:14,CH2O:30,CH:13}; var M=eM[e]*rand(2,5); var n=M/eM[e]; return {q:"Emp="+e+", M="+M+". Molecular?",a:n+"x("+e+")",hint:"n=M/emp mass",solution:"n="+M+"/"+eM[e]+"="+n}; }',
  'function () { var m=rand(10,30); var V=rand(100,500); var M=m*1000/(40*V); return {q:m+" g NaOH in "+V+" mL. M?",a:M.toFixed(2)+" M",hint:"M=(m/M)x1000/V",solution:"M="+M.toFixed(2)}; }',
  'function () { var n=rand(1,5); var V=rand(100,500); var M=n*1000/V; return {q:"n="+n+", V="+V+" mL. M?",a:M.toFixed(2)+" M",hint:"M=nx1000/V",solution:"M="+M.toFixed(2)}; }',
  'function () { var m=rand(10,50); var V=rand(100,500); var M=m*1000/(58.5*V); return {q:"NaCl="+m+" g in "+V+" mL. M?",a:M.toFixed(2)+" M",hint:"M=(m/M)x1000/V",solution:"M="+M.toFixed(2)}; }',
  'function () { var m=rand(5,20); var V=rand(200,500); var n=m/40; var M=n*1000/V; return {q:"NaOH="+m+" g, V="+V+" mL. M?",a:M.toFixed(3)+" M",hint:"M=n/V(L)",solution:"n="+n.toFixed(3)+", M="+M.toFixed(3)}; }',
  'function () { var a=rand(10,50); var b=rand(10,50); var l=pick(["HCl","H2SO4","NaOH"]); var mM={HCl:36.5,H2SO4:98,NaOH:40}; return {q:"LR: "+a+" g "+l+" + "+b+" g CaCO3?",a:(a/mM[l])<(b/100)?l:"CaCO3",hint:"Compare moles",solution:"moles "+l+"="+(a/mM[l]).toFixed(2)+", CaCO3="+(b/100).toFixed(2)}; }',
  'function () { var m=rand(10,50); var M=rand(100,200); var N=(m/M)*6.022e23; return {q:"Mass="+m+", M="+M+". Molecules?",a:N.toExponential(3),hint:"N=(m/M)xNA",solution:"N="+N.toExponential(3)}; }',
  'function () { var m=rand(1,10); var N=(m/18)*6.022e23; return {q:"Molecules in "+m+" g water?",a:N.toExponential(3),hint:"N=(m/18)xNA",solution:"N="+N.toExponential(3)}; }',
  'function () { var m=rand(2,10); var V=rand(100,500); return {q:"NaOH="+m+" g, V="+V+" mL. g/L?",a:(m*1000/V).toFixed(1)+" g/L",hint:"g/L=mass/V(L)",solution:"g/L="+(m*1000/V).toFixed(1)}; }',
  'function () { var v=rand(5,25); var n=v/22.4; return {q:"STP V="+v+" L. Moles?",a:n.toFixed(3)+" mol",hint:"n=V/22.4",solution:"n="+v+"/22.4="+n.toFixed(3)}; }'
]) + "\n);";
console.log("mole_concept done");

// ATOMIC STRUCTURE
result.deepened_topics.atomic_structure = "GENERATORS.chemistry.atomic_structure.push(\n" + g([
  'function () { var n=rand(1,4); var l=rand(0,n-1); return {q:"n="+n+", l="+l+". ml values?",a:2*l+1,hint:"ml=-l to +l",solution:"ml values="+(2*l+1)}; }',
  'function () { return {q:"Lowest energy orbital in H?",a:"1s",hint:"n=1",solution:"1s (n=1)"}; }',
  'function () { return {q:"No two electrons have same 4 QN?",a:"Pauli exclusion",hint:"Unique set",solution:"Pauli principle"}; }',
  'function () { return {q:"Electrons fill increasing energy?",a:"Aufbau principle",hint:"Lowest first",solution:"Aufbau"}; }',
  'function () { return {q:"Degenerate orbitals singly first?",a:"Hunds rule",hint:"Max spin",solution:"Hunds rule"}; }',
  'function () { var z=rand(3,10); var e=["Li: 1s2 2s1","Be: 1s2 2s2","B: 1s2 2s2 2p1","C: 1s2 2s2 2p2","N: 1s2 2s2 2p3","O: 1s2 2s2 2p4","F: 1s2 2s2 2p5","Ne: 1s2 2s2 2p6"]; return {q:"Config of Z="+z+"?",a:e[z-3],hint:"Aufbau",solution:e[z-3]}; }',
  'function () { var n=rand(2,5); return {q:"Subshells for n="+n+"?",a:n,hint:"l=0 to n-1",solution:"n="+n+" subshells"}; }',
  'function () { var lam=rand(400,700); var nu=3e8/(lam*1e-9); return {q:"l="+lam+" nm. Frequency?",a:nu.toExponential(2)+" Hz",hint:"n=c/l",solution:"n="+nu.toExponential(2)}; }',
  'function () { var nu=rand(1,10)*1e14; var e=6.626e-34*nu; return {q:"n="+nu.toExponential(1)+" Hz. Energy?",a:e.toExponential(2)+" J",hint:"E=hn",solution:"E="+e.toExponential(2)}; }',
  'function () { var n1=rand(1,3); var n2=rand(n1+1,6); var rh=1.097e7; var wl=1/(rh*(1/(n1*n1)-1/(n2*n2))); return {q:"n="+n2+" to n="+n1+" wl in H?",a:(wl*1e9).toFixed(1)+" nm",hint:"1/l=RH(1/n12-1/n22)",solution:"l="+(wl*1e9).toFixed(1)+" nm"}; }',
  'function () { return {q:"H visible series?",a:"Balmer (n1=2)",hint:"n1=2",solution:"Balmer series"}; }',
  'function () { var v=rand(1,5)*1e5; var m=9.11e-31; var lam=6.626e-34/(m*v); return {q:"de Broglie v="+v.toExponential(1)+" m/s. l?",a:lam.toExponential(2)+" m",hint:"l=h/mv",solution:"l="+lam.toExponential(2)}; }',
  'function () { var delx=rand(1,5)*1e-10; var delp=6.626e-34/(4*Math.PI*delx); return {q:"Dx="+delx.toExponential(1)+" m. Min Dp?",a:delp.toExponential(2),hint:"Dx.Dp>=h/4p",solution:"Dp="+delp.toExponential(2)}; }',
  'function () { return {q:"Azimuthal QN (l) for s?",a:0,hint:"s=0,p=1,d=2",solution:"l=0"}; }',
  'function () { return {q:"Orbitals in f subshell?",a:7,hint:"l=3, 2l+1",solution:"7 orbitals"}; }'
]) + "\n);";
console.log("atomic_structure done");

// GASEOUS STATE
result.deepened_topics.gaseous_state = "GENERATORS.chemistry.gaseous_state.push(\n" + g([
  'function () { var P=rand(1,5); var V=rand(10,50); var n=rand(1,5); var T=P*V/(n*0.0821); return {q:"P="+P+", V="+V+", n="+n+". T?",a:T.toFixed(1)+" K",hint:"PV=nRT",solution:"T="+T.toFixed(1)}; }',
  'function () { var V1=rand(10,50); var P1=rand(1,5); var P2=rand(P1+1,10); return {q:"Boyles: V1="+V1+", P1="+P1+", P2="+P2+". V2?",a:(V1*P1/P2).toFixed(1)+" L",hint:"P1V1=P2V2",solution:"V2="+(V1*P1/P2).toFixed(1)}; }',
  'function () { var V1=rand(10,50); var T1=rand(273,373); var T2=rand(T1+50,500); return {q:"Charles: V1="+V1+", T1="+T1+", T2="+T2+". V2?",a:(V1*T2/T1).toFixed(1)+" L",hint:"V1/T1=V2/T2",solution:"V2="+(V1*T2/T1).toFixed(1)}; }',
  'function () { var n=rand(1,5); var V=rand(10,50); var T=rand(273,373); return {q:"n="+n+", V="+V+", T="+T+". P?",a:(n*0.0821*T/V).toFixed(2)+" atm",hint:"PV=nRT",solution:"P="+(n*0.0821*T/V).toFixed(2)}; }',
  'function () { var m=rand(2,100); var v=Math.sqrt(3*8.314*300/(m/1000)); return {q:"M="+m+", T=300. RMS?",a:v.toFixed(1)+" m/s",hint:"vrms=v(3RT/M)",solution:"vrms="+v.toFixed(1)}; }',
  'function () { return {q:"Grahams law: rH2/rO2?",a:"4:1",hint:"r ~ 1/vM",solution:"v(32/2)=4"}; }',
  'function () { var P=rand(10,100); var V=rand(1,10); var n=rand(1,5); var a=rand(1,5); var b=rand(1,5)/100; var Preal=(n*0.0821*300/(V-n*b))-(a*n*n/(V*V)); return {q:"vdW: n="+n+", V="+V+", a="+a+", b="+b.toFixed(2)+". P?",a:Preal.toFixed(2),hint:"(P+an2/V2)(V-nb)=nRT",solution:"P="+Preal.toFixed(2)}; }',
  'function () { return {q:"Critical Tc in vdW?",a:"8a/(27Rb)",hint:"Above Tc no liquefaction",solution:"Tc=8a/(27Rb)"}; }',
  'function () { return {q:"Daltons law?",a:"P_total = SPi",hint:"Sum of partial",solution:"Dalton"}; }',
  'function () { var P=rand(1,5); var f=pick([0.2,0.3,0.5]); return {q:"P="+P+", xO2="+f.toFixed(1)+". pO2?",a:(P*f).toFixed(2)+" atm",hint:"pi=Pixi",solution:"pO2="+(P*f).toFixed(2)}; }',
  'function () { var m=rand(2,4); var v=Math.sqrt(3*8.314*300/(m/1000)); return {q:"RMS speed (M="+m+", T=300)?",a:v.toFixed(0)+" m/s",hint:"vrms=v(3RT/M)",solution:"vrms="+v.toFixed(0)}; }',
  'function () { return {q:"T for H2 RMS = O2 RMS at 300K?",a:"4800 K",hint:"v(T/2)=v(300/32)",solution:"T=300x32/2=4800K"}; }',
  'function () { return {q:"Z for ideal gas?",a:"1",hint:"Z=PV/nRT",solution:"Z=1"}; }',
  'function () { return {q:"Kinetic theory: avg KE ~ ?",a:"T (absolute temp)",hint:"KE=3/2kT",solution:"KE ~ T"}; }',
  'function () { return {q:"Real gas: Z < 1 means?",a:"Attractive forces dominate",hint:"Negative deviation",solution:"Z<1 -> attraction"}; }'
]) + "\n);";
console.log("gaseous_state done");

// THERMODYNAMICS
result.deepened_topics.chemical_thermodynamics = "GENERATORS.chemistry.chemical_thermodynamics.push(\n" + g([
  'function () { var q=rand(10,100); var w=rand(5,20); return {q:"q="+q+", w="+w+". DU?",a:(q+w)+" J",hint:"DU=q+w",solution:"DU="+(q+w)}; }',
  'function () { var dH=rand(-50,-10); var dS=rand(-100,-10); var T=rand(300,500); var dG=dH-T*dS/1000; return {q:"DH="+dH+", DS="+dS+", T="+T+". DG?",a:dG.toFixed(1)+" kJ",hint:"DG=DH-TDS",solution:"DG="+dG.toFixed(1)}; }',
  'function () { var dH=rand(10,50); var T=rand(300,500); var dS=dH*1000/T; return {q:"At eq: DH="+dH+", T="+T+". DS?",a:dS.toFixed(1)+" J/K",hint:"DG=0",solution:"DS=DH/T="+dS.toFixed(1)}; }',
  'function () { return {q:"DG<0 means?",a:"Spontaneous",hint:"Gibbs energy dec",solution:"DG<0 -> spontaneous"}; }',
  'function () { return {q:"DH negative means?",a:"Exothermic",hint:"Heat released",solution:"Exothermic"}; }',
  'function () { return {q:"DH independent of path?",a:"Hess law",hint:"State function",solution:"Hess law"}; }',
  'function () { var dH=rand(100,500); var dS=rand(100,500); var T=dH*1000/dS; return {q:"DH="+dH+", DS="+dS+". Spont T?",a:"T>"+T.toFixed(0)+" K",hint:"DG<0",solution:"T>"+T.toFixed(0)}; }',
  'function () { return {q:"First law?",a:"DU=q+w",hint:"Energy conservation",solution:"DU=q+w"}; }',
  'function () { return {q:"Isobaric process?",a:"Constant P (DP=0)",hint:"P constant",solution:"Isobaric"}; }',
  'function () { return {q:"Adiabatic process?",a:"q=0 (no heat)",hint:"Insulated",solution:"Adiabatic q=0"}; }',
  'function () { var T1=rand(300,400); var T2=rand(500,800); return {q:"Carnot: T1="+T1+", T2="+T2+". h?",a:((1-T1/T2)*100).toFixed(1)+"%",hint:"h=1-T1/T2",solution:"h="+(1-T1/T2).toFixed(3)}; }',
  'function () { return {q:"Entropy is?",a:"Randomness/disorder",hint:"Degree of disorder",solution:"Entropy=S"}; }',
  'function () { return {q:"2nd law: DS_universe",a:">0 for spontaneous",hint:"Increases",solution:"DS_univ>0"}; }',
  'function () { return {q:"Standard DHf of element?",a:"0 (zero)",hint:"Reference state",solution:"DHf(element)=0"}; }',
  'function () { var dH=rand(200,400); var n=pick([2,3,4]); return {q:"Bond energy="+dH+", n="+n+". Total?",a:(n*dH)+" kJ",hint:"Multiply",solution:"Total="+(n*dH)}; }'
]) + "\n);";
console.log("thermo done");

// EQUILIBRIUM
result.deepened_topics.chemical_equilibrium = "GENERATORS.chemistry.chemical_equilibrium.push(\n" + g([
  'function () { return {q:"N2+3H2=2NH3: Kp=Kc(RT)^?",a:"-2 (Dn=-2)",hint:"Dn=2-4",solution:"Kp=Kc(RT)^-2"}; }',
  'function () { return {q:"Le Chatelier: T inc favors?",a:"Endothermic direction",hint:"Absorbs heat",solution:"Endothermic"}; }',
  'function () { return {q:"High P on N2+3H2=2NH3?",a:"Forward (fewer moles)",hint:"4->2 moles",solution:"Forward shift"}; }',
  'function () { return {q:"Kc=54.8 H2+I2=2HI. [HI]=1. [H2][I2]?",a:(1/54.8).toFixed(4),hint:"Kc=[HI]2/([H2][I2])",solution:"="+(1/54.8).toFixed(4)}; }',
  'function () { var a=rand(2,10)/10; var n=rand(1,5); return {q:"PCl5 dissec a="+a+", n="+(n*2)+". Kc?",a:(4*a*a/(n*(1-a))).toFixed(2),hint:"Kc=a2C/(1-a)",solution:"Kc="+(4*a*a/(n*(1-a))).toFixed(2)}; }',
  'function () { return {q:"K>>1 means?",a:"Forward/product-favored",hint:"K>1000",solution:"K>>1 forward"}; }',
  'function () { return {q:"Q=K means?",a:"At equilibrium",hint:"No change",solution:"Q=K equilibrium"}; }',
  'function () { return {q:"Catalyst effect on K?",a:"No effect",hint:"Both rates",solution:"No effect"}; }',
  'function () { var a=rand(1,9)/10; var n=rand(1,3); return {q:"PCl5 init="+n+", a="+a+". Total moles?",a:(n*(1+a)).toFixed(2),hint:"1->1+a",solution:"Total="+(n*(1+a))}; }',
  'function () { return {q:"Inert gas at const V?",a:"No shift",hint:"Conc same",solution:"No effect"}; }',
  'function () { return {q:"T inc decreases K for?",a:"Exothermic",hint:"Le Chatelier",solution:"Exothermic K down"}; }',
  'function () { var K=rand(10,1000); return {q:"Kp="+K+" for A(g)=B(g)+C(g). Kc at 300K?",a:(K/(0.0821*300)).toFixed(2),hint:"Dn=1",solution:"Kc="+(K/(0.0821*300)).toFixed(2)}; }'
]) + "\n);";
console.log("equilibrium done");

// IONIC EQUILIBRIUM
result.deepened_topics.ionic_equilibrium = "GENERATORS.chemistry.ionic_equilibrium.push(\n" + g([
  'function () { var c=rand(1,9)/10; return {q:"[H+]="+c.toFixed(1)+" M. pH?",a:(-Math.log10(c)).toFixed(2),hint:"pH=-log[H+]",solution:"pH="+(-Math.log10(c)).toFixed(2)}; }',
  'function () { var pH=rand(1,6); return {q:"pH="+pH+". [H+]?",a:Math.pow(10,-pH).toExponential(2),hint:"[H+]=10^-pH",solution:"[H+]="+Math.pow(10,-pH).toExponential(2)}; }',
  'function () { var c=rand(1,9)/10; return {q:"[OH-]="+c.toFixed(1)+" M. pOH, pH?",a:"pOH="+(-Math.log10(c)).toFixed(2)+", pH="+(14+Math.log10(c)).toFixed(2),hint:"pH+pOH=14",solution:"pH="+(14+Math.log10(c)).toFixed(2)}; }',
  'function () { var Ka=rand(1,9)*1e-5; var c=rand(1,9)/10; return {q:"Ka="+Ka.toExponential(1)+", C="+c.toFixed(1)+". pH?",a:(-Math.log10(Math.sqrt(Ka*c))).toFixed(2),hint:"[H+]=v(KaC)",solution:"pH="+(-Math.log10(Math.sqrt(Ka*c))).toFixed(2)}; }',
  'function () { var pH=rand(1,6); var pKa=rand(3,6); return {q:"Buffer: pH="+pH+", pKa="+pKa+". ratio?",a:Math.pow(10,pH-pKa).toFixed(2),hint:"pH=pKa+log(A-/HA)",solution:"ratio="+Math.pow(10,pH-pKa).toFixed(2)}; }',
  'function () { return {q:"CH3COONa is?",a:"Basic",hint:"Acetate hydrol",solution:"Basic"}; }',
  'function () { return {q:"NH4Cl is?",a:"Acidic",hint:"NH4+ hydrol",solution:"Acidic"}; }',
  'function () { var Ksp=rand(1,9)*1e-12; return {q:"Ksp AgCl="+Ksp.toExponential(1)+". s?",a:(Math.sqrt(Ksp)).toExponential(2),hint:"Ksp=s^2",solution:"s="+Math.sqrt(Ksp).toExponential(2)}; }',
  'function () { return {q:"Common ion effect on s?",a:"Decreases solubility",hint:"Shifts left",solution:"Decreases"}; }',
  'function () { var Ka=rand(1,9)*1e-5; return {q:"pKa from Ka="+Ka.toExponential(1)+"?",a:(-Math.log10(Ka)).toFixed(2),hint:"pKa=-logKa",solution:"pKa="+(-Math.log10(Ka)).toFixed(2)}; }',
  'function () { return {q:"0.1M HCl 100mL+100mL water pH?",a:"1.3",hint:"[H+]=0.05",solution:"pH=1.3"}; }',
  'function () { var c=rand(1,5); var Kb=rand(1,9)*1e-5; var OH=Math.sqrt(Kb*c); return {q:"NH3 C="+c+", Kb="+Kb.toExponential(1)+". pH?",a:(14+Math.log10(OH)).toFixed(2),hint:"[OH-]=v(KbC)",solution:"pH="+(14+Math.log10(OH)).toFixed(2)}; }',
  'function () { return {q:"Weak acid+strong base eq. pH?",a:">7 (basic)",hint:"Salt hydrol",solution:"pH>7"}; }',
  'function () { return {q:"Weak base+strong acid eq. pH?",a:"<7 (acidic)",hint:"Cation hydrol",solution:"pH<7"}; }',
  'function () { return {q:"Indicator for SA+SB?",a:"Phenolphthalein/methyl orange",hint:"Sharp change",solution:"Any indicator"}; }'
]) + "\n);";
console.log("ionic done");

// ELECTROCHEMISTRY
result.deepened_topics.electrochemistry = "GENERATORS.chemistry.electrochemistry.push(\n" + g([
  'function () { var n=rand(1,3); var E0=rand(1,5)/10; var Q=rand(1,9)/10; var E=E0-(0.059/n)*Math.log10(Q); return {q:"E0="+E0.toFixed(1)+", n="+n+". E (Nernst)?",a:E.toFixed(3)+" V",hint:"E=E0-0.059/n logQ",solution:"E="+E.toFixed(3)}; }',
  'function () { return {q:"Oxidation occurs at?",a:"Anode",hint:"Loss e-",solution:"Anode=ox"}; }',
  'function () { return {q:"Reduction occurs at?",a:"Cathode",hint:"Gain e-",solution:"Cathode=red"}; }',
  'function () { return {q:"Spontaneous redox->electricity?",a:"Galvanic/voltaic cell",hint:"Self-running",solution:"Galvanic cell"}; }',
  'function () { return {q:"Daniel cell EMF?",a:"1.10 V",hint:"0.34-(-0.76)",solution:"E=1.10V"}; }',
  'function () { var lam=rand(100,200); var C=rand(1,9)/10; return {q:"Lm="+lam+", C="+C.toFixed(1)+" M. k?",a:(lam*C/1000).toFixed(4)+" S/cm",hint:"Lm=kx1000/C",solution:"k="+(lam*C/1000).toFixed(4)}; }',
  'function () { return {q:"Highest Lm (limiting)?",a:"H+",hint:"Grotthuss",solution:"H+ highest"}; }',
  'function () { return {q:"Kohlrausch law?",a:"Lm=S(n+l+)",hint:"Independent ions",solution:"Lm=sum of ions"}; }',
  'function () { var w=rand(1,10); var I=rand(1,5); var t=rand(10,60); return {q:"w="+w+", I="+I+", t="+t+"min. Eq mass?",a:(w*96500/(I*t*60)).toFixed(1),hint:"w=ZIt/96500",solution:"Z="+(w*96500/(I*t*60)).toFixed(1)}; }',
  'function () { var n=rand(1,3); var I=rand(1,5); var t=rand(10,60); return {q:"n="+n+", I="+I+", t="+t+"min. Moles?",a:(n*I*t*60/96500).toFixed(4),hint:"mol=It/(nF)",solution:"mol="+(n*I*t*60/96500).toFixed(4)}; }',
  'function () { return {q:"Lead-acid anode?",a:"Pb",hint:"Pb->PbSO4",solution:"Pb anode"}; }',
  'function () { return {q:"Fuel cell example?",a:"H2-O2",hint:"H2+1/2O2->H2O",solution:"H2-O2 fuel cell"}; }',
  'function () { return {q:"Rusting needs?",a:"O2+H2O",hint:"Fe+O2+H2O->rust",solution:"Rust needs O2+H2O"}; }',
  'function () { return {q:"SHE potential?",a:"0.00 V",hint:"Reference",solution:"SHE=0V"}; }',
  'function () { var e0=rand(-1,2)/10; return {q:"E0red="+e0.toFixed(1)+" V means?",a:e0<0?"Reducing agent":"Oxidizing agent",hint:"Low E->reducing",solution:"Redox behavior"}; }'
]) + "\n);";
console.log("electro done");

// KINETICS
result.deepened_topics.chemical_kinetics = "GENERATORS.chemistry.chemical_kinetics.push(\n" + g([
  'function () { var n=pick([0,1,2]); return {q:"Rate=k[A]^"+n+". Order?",a:n,hint:"Exponent",solution:"Order="+n}; }',
  'function () { var k=rand(1,9)/10; var A=rand(1,5); return {q:"k="+k.toFixed(1)+", [A]="+A+". Rate? (1st)",a:(k*A).toFixed(2),hint:"Rate=k[A]",solution:"Rate="+(k*A).toFixed(2)}; }',
  'function () { var k=rand(1,9)/100; var A=rand(1,5); var B=rand(1,5); return {q:"k="+k.toFixed(2)+", [A]="+A+", [B]="+B+". Rate=k[A]^2[B]",a:(k*A*A*B).toFixed(4),hint:"Substitute",solution:"Rate="+(k*A*A*B).toFixed(4)}; }',
  'function () { return {q:"1st order t1/2?",a:"0.693/k (constant)",hint:"Indep of [A]",solution:"t1/2=0.693/k"}; }',
  'function () { var k=rand(1,9)/100; return {q:"k="+k.toFixed(3)+" s-1. t1/2?",a:(0.693/k).toFixed(1)+" s",hint:"t1/2=0.693/k",solution:"t1/2="+(0.693/k).toFixed(1)}; }',
  'function () { var t=rand(10,100); return {q:"t1/2="+t+" s. k(1st)?",a:(0.693/t).toFixed(4),hint:"k=0.693/t1/2",solution:"k="+(0.693/t).toFixed(4)}; }',
  'function () { return {q:"Order vs molecularity?",a:"Order=experimental, Molecularity=theoretical",hint:"Order may be fractional",solution:"Order:exp; Mol:theor"}; }',
  'function () { return {q:"Arrhenius: k=A",a:"exp(-Ea/RT)",hint:"k=Ae^(-Ea/RT)",solution:"k=Aexp(-Ea/RT)"}; }',
  'function () { var Ea=rand(50,150); var T=rand(300,500); var k=Math.exp(-Ea*1000/(8.314*T)); return {q:"Ea="+Ea+", T="+T+", A=1. k?",a:k.toExponential(3),hint:"exp(-Ea/RT)",solution:"k="+k.toExponential(3)}; }',
  'function () { var T=rand(300,500); var k=rand(1,9)/10; return {q:"T="+T+", k="+k.toFixed(1)+", A=1. Ea?",a:(-8.314*T*Math.log(k)).toFixed(0)+" J/mol",hint:"Ea=-RT ln(k)",solution:"Ea="+(-8.314*T*Math.log(k)).toFixed(0)}; }',
  'function () { return {q:"T effect on rate?",a:"Increases (2x/10C)",hint:"More E>Ea",solution:"Rate ~2x per 10C"}; }',
  'function () { return {q:"Collision theory: effective collision?",a:"Correct orientation + E>=Ea",hint:"Not all react",solution:"Effective collisions"}; }'
]) + "\n);";
console.log("kinetics done");

// SURFACE CHEMISTRY
result.deepened_topics.surface_chemistry = "GENERATORS.chemistry.surface_chemistry.push(\n" + g([
  'function () { return {q:"Chemisorption involves?",a:"Chemical bond formation",hint:"Strong, irreversible",solution:"Chemisorption"}; }',
  'function () { return {q:"Physisorption involves?",a:"van der Waals forces",hint:"Weak, reversible",solution:"Physisorption"}; }',
  'function () { return {q:"Freundlich: x/m = kP^(1/n). 1/n ?",a:"Adsorption intensity (0-1)",hint:"Favorability",solution:"1/n=0-1"}; }',
  'function () { return {q:"Enzymes are?",a:"Biochemical catalysts (proteins)",hint:"Biological",solution:"Enzymes"}; }',
  'function () { return {q:"Zeolites do?",a:"Shape-selective catalysis",hint:"Pore size",solution:"Shape-selective"}; }',
  'function () { return {q:"Negative catalyst?",a:"Inhibitor (slows rate)",hint:"Increases Ea",solution:"Inhibitor"}; }',
  'function () { return {q:"Enzyme-substrate model?",a:"Lock and key model",hint:"Active site",solution:"Lock and key"}; }',
  'function () { return {q:"Lyophilic colloids?",a:"Affinity for medium, reversible",hint:"Stable",solution:"Lyophilic"}; }',
  'function () { return {q:"Colloidal size?",a:"1-100 nm",hint:"Between true and susp",solution:"1-100nm"}; }',
  'function () { return {q:"Milk emulsion type?",a:"O/W (oil-in-water)",hint:"Fat in water",solution:"O/W"}; }'
]) + "\n);";
console.log("surface done");

// PERIODIC TABLE
result.deepened_topics.periodic_table = "GENERATORS.chemistry.periodic_table.push(\n" + g([
  'function () { return {q:"Highest IE in Group 1?",a:"Li",hint:"IE dec down",solution:"Li highest"}; }',
  'function () { return {q:"Highest EN element?",a:"F (4.0)",hint:"Most EN",solution:"F 4.0"}; }',
  'function () { return {q:"Highest IE among all?",a:"He (2372 kJ/mol)",hint:"Small size",solution:"He highest IE"}; }',
  'function () { return {q:"Atomic radius across period?",a:"Decreases",hint:"Zeff inc",solution:"Dec L to R"}; }',
  'function () { return {q:"IE down a group?",a:"Decreases",hint:"Size inc",solution:"IE dec down"}; }',
  'function () { return {q:"N vs O: higher IE?",a:"N (half p3)",hint:"Stable p3",solution:"N > O"}; }',
  'function () { return {q:"Lowest mp in Group 1?",a:"Cs (28.5C)",hint:"MP dec down",solution:"Cs lowest"}; }',
  'function () { return {q:"Lowest EA in halogens?",a:"F (e- repulsion)",hint:"Small size",solution:"F low EA"}; }',
  'function () { return {q:"Smallest in Group 13?",a:"B (85 pm)",hint:"Size inc down",solution:"B smallest"}; }',
  'function () { return {q:"Metalloid examples?",a:"B, Si, Ge, As, Sb, Te",hint:"Staircase line",solution:"Metalloids"}; }',
  'function () { return {q:"EN order F,Cl,Br,I?",a:"F>Cl>Br>I",hint:"Dec down",solution:"F>Cl>Br>I"}; }',
  'function () { return {q:"Anomalous IE: Be vs B?",a:"Be > B (B has p1)",hint:"Be s2 stable",solution:"Be>B"}; }'
]) + "\n);";
console.log("periodic done");

// CHEMICAL BONDING
result.deepened_topics.chemical_bonding = "GENERATORS.chemistry.chemical_bonding.push(\n" + g([
  'function () { return {q:"NH3: bond pairs and lone pairs?",a:"3 bond, 1 lone",hint:"N has 5 e-",solution:"3+1, sp3"}; }',
  'function () { return {q:"CH4 hybridization?",a:"sp3",hint:"4 sigma",solution:"sp3 tetrahedral"}; }',
  'function () { return {q:"BF3 geometry?",a:"Trigonal planar",hint:"3 bond, 0 lone",solution:"Trig planar 120"}; }',
  'function () { return {q:"H2O shape?",a:"Bent (V)",hint:"2 bond, 2 lone",solution:"Bent 104.5"}; }',
  'function () { return {q:"Covalent bond?",a:"Sharing of e-",hint:"Electron sharing",solution:"Covalent"}; }',
  'function () { return {q:"Ionic bond?",a:"Transfer of e- (electrostatic)",hint:"Electron transfer",solution:"Ionic"}; }',
  'function () { return {q:"Highest bond energy?",a:"N2 (945 kJ/mol)",hint:"Triple bond",solution:"N2 triple"}; }',
  'function () { return {q:"Shortest bond in N2,O2,F2?",a:"N2 (109.8 pm)",hint:"Triple bond",solution:"N2 shortest"}; }',
  'function () { return {q:"Benzene C-C bond length?",a:"139 pm (intermediate)",hint:"Resonance",solution:"139 pm"}; }',
  'function () { return {q:"CO2 dipole moment?",a:"0 D (zero)",hint:"Linear, symmetric",solution:"mu=0"}; }',
  'function () { return {q:"H2O dipole moment?",a:"1.85 D",hint:"Bent",solution:"mu=1.85D"}; }',
  'function () { return {q:"Pi bond formed by?",a:"Sidewise p-orbital overlap",hint:"Lateral",solution:"Pi = sidewise"}; }',
  'function () { return {q:"Sigma bond formed by?",a:"End-to-end overlap",hint:"Direct",solution:"Sigma = end-to-end"}; }',
  'function () { return {q:"He2 bond order (MOT)?",a:"0 (does not exist)",hint:"(Nb-Na)/2=0",solution:"BO=0"}; }',
  'function () { return {q:"O2 paramagnetic (MOT)?",a:"2 unpaired in p*2p",hint:"P*2p has 2 e-",solution:"O2 paramagnetic"}; }'
]) + "\n);";
console.log("bonding done");

// COORDINATION
result.deepened_topics.coordination = "GENERATORS.chemistry.coordination.push(\n" + g([
  'function () { return {q:"Werner primary valency [Co(NH3)6]Cl3?",a:"3 (ionizable)",hint:"OS=+3",solution:"Primary=3"}; }',
  'function () { return {q:"Werner secondary valency [Co(NH3)6]3+?",a:"6 (CN)",hint:"Coord number",solution:"Secondary=6"}; }',
  'function () { return {q:"[Ni(CN)4]2- geometry?",a:"Square planar (dsp2)",hint:"dsp2hyb",solution:"Square planar"}; }',
  'function () { return {q:"[Ni(CO)4] geometry?",a:"Tetrahedral (sp3)",hint:"sp3",solution:"Tetrahedral"}; }',
  'function () { return {q:"Geometrical isomerism in?",a:"[CoCl2(NH3)4]+",hint:"Ma4b2",solution:"cis-trans"}; }',
  'function () { return {q:"Chelate effect:",a:"Polydentate gives more stable complexes",hint:"Entropy",solution:"Chelate more stable"}; }',
  'function () { return {q:"[Ni(CN)4]2- magnetic?",a:"Diamagnetic (all paired)",hint:"dsp2, d8 low spin",solution:"Dia"}; }',
  'function () { return {q:"Do (CFT) represents?",a:"t2g-eg energy gap (10 Dq)",hint:"Octahedral",solution:"Do=10Dq"}; }',
  'function () { return {q:"Strongest ligand?",a:"CO > CN- > NH3 > H2O",hint:"Spectrochemical series",solution:"CO strongest"}; }',
  'function () { return {q:"Weak field gives?",a:"High spin (more unpaired)",hint:"Small Do",solution:"High spin"}; }',
  'function () { return {q:"[Fe(CN)6]4- is?",a:"Low spin (diamagnetic)",hint:"CN- strong",solution:"Low spin"}; }',
  'function () { return {q:"[Fe(H2O)6]2+ is?",a:"High spin (paramag)",hint:"H2O weak",solution:"High spin"}; }',
  'function () { return {q:"Color in TM due to?",a:"d-d transitions",hint:"e- between d orbitals",solution:"d-d trans"}; }',
  'function () { return {q:"Kstab and Kinstab?",a:"Kstab = 1/Kinstab",hint:"Inverse",solution:"K=1/K"}; }',
  'function () { return {q:"IUPAC: K3[Fe(CN)6]?",a:"Potassium hexacyanidoferrate(III)",hint:"Ligands,K,Fe,OS",solution:"K hexacyanidoferrate(III)"}; }'
]) + "\n);";
console.log("coordination done");

// S-BLOCK
result.deepened_topics.s_block = "GENERATORS.chemistry.s_block.push(\n" + g([
  'function () { return {q:"Highest IE in alkali metals?",a:"Li",hint:"IE dec down",solution:"Li"}; }',
  'function () { return {q:"Na burns in air to form?",a:"Na2O2 (peroxide)",hint:"Li->Li2O",solution:"Na2O2"}; }',
  'function () { return {q:"Li anomalous due to?",a:"Small size, high IE, covalent",hint:"Diagonal rel Mg",solution:"Li anomalous"}; }',
  'function () { return {q:"NaOH via?",a:"Castner-Kellner (electrolysis NaCl)",hint:"Brine",solution:"Castner-Kellner"}; }',
  'function () { return {q:"Baking soda?",a:"NaHCO3",hint:"Sodium bicarbonate",solution:"NaHCO3"}; }',
  'function () { return {q:"Plaster of Paris?",a:"CaSO4.1/2 H2O",hint:"Gypsum heated",solution:"CaSO4.1/2H2O"}; }',
  'function () { return {q:"Bleaching powder?",a:"CaOCl2",hint:"Cl2+Ca(OH)2",solution:"CaOCl2"}; }',
  'function () { return {q:"Highest hydration Gp2?",a:"Be2+",hint:"Hyd dec down",solution:"Be2+"}; }',
  'function () { return {q:"Washing soda?",a:"Na2CO3.10H2O",hint:"Efflorescent",solution:"Na2CO3.10H2O"}; }',
  'function () { return {q:"Li resembles?",a:"Mg (diagonal rel)",hint:"Similar properties",solution:"Li-Mg"}; }'
]) + "\n);";
console.log("s_block done");

// P-BLOCK
result.deepened_topics.p_block = "GENERATORS.chemistry.p_block.push(\n" + g([
  'function () { return {q:"Most abundant p-block in crust?",a:"Si (27.7%)",hint:"After O",solution:"Si"}; }',
  'function () { return {q:"Boric acid H3BO3 is?",a:"Monobasic Lewis acid",hint:"Accepts OH-",solution:"Monobasic"}; }',
  'function () { return {q:"Silicones backbone?",a:"Si-O-Si with R groups",hint:"(R2SiO)n",solution:"Si-O-Si"}; }',
  'function () { return {q:"Phosphine prep?",a:"White P + NaOH",hint:"P4+NaOH->PH3",solution:"P4+NaOH"}; }',
  'function () { return {q:"Contact process catalyst?",a:"V2O5",hint:"SO2+O2->SO3",solution:"V2O5"}; }',
  'function () { return {q:"Ostwald process product?",a:"HNO3",hint:"NH3->NO->NO2->HNO3",solution:"HNO3"}; }',
  'function () { return {q:"Haber catalyst?",a:"Fe + Mo promoter",hint:"N2+3H2->2NH3",solution:"Fe+Mo"}; }',
  'function () { return {q:"Ozone depletion by?",a:"Cl atoms (from CFCs)",hint:"Cl+O3->ClO+O2",solution:"Cl from CFCs"}; }',
  'function () { return {q:"Helium uses?",a:"Balloons, cryogenics, MRI",hint:"Light inert",solution:"He uses"}; }',
  'function () { return {q:"Diamond C hybrid?",a:"sp3 (tetrahedral)",hint:"Equal C-C bonds",solution:"sp3"}; }',
  'function () { return {q:"Graphite C hybrid?",a:"sp2 (hexagonal layers)",hint:"Sheets of C",solution:"sp2"}; }',
  'function () { return {q:"XeF6 + H2O gives?",a:"XeO3 + 6HF",hint:"Hydrolysis",solution:"XeO3"}; }',
  'function () { return {q:"Strongest oxidizing halogen?",a:"F2",hint:"E0=+2.87V",solution:"F2"}; }',
  'function () { return {q:"Red P used in?",a:"Matchboxes",hint:"Safety matches",solution:"Red P"}; }',
  'function () { return {q:"C60 known as?",a:"Fullerene (Buckyball)",hint:"Soccer ball",solution:"Fullerene"}; }'
]) + "\n);";
console.log("p_block done");

// D-F BLOCK
result.deepened_topics.d_f_block = "GENERATORS.chemistry.d_f_block.push(\n" + g([
  'function () { return {q:"Cr (24) config?",a:"[Ar]3d5 4s1",hint:"Half d stable",solution:"[Ar]3d5 4s1"}; }',
  'function () { return {q:"Cu (29) config?",a:"[Ar]3d10 4s1",hint:"Full d stable",solution:"[Ar]3d10 4s1"}; }',
  'function () { return {q:"Metal with +1 state?",a:"Cu (d10 stable)",hint:"Cu+ d10",solution:"Cu"}; }',
  'function () { return {q:"Mn max ox state?",a:"+7 (3d5 4s2)",hint:"7 e- to lose",solution:"Mn +7"}; }',
  'function () { return {q:"Lanthanoid contraction?",a:"Poor shielding of 4f",hint:"Zeff inc",solution:"Lanthanoid contraction"}; }',
  'function () { return {q:"K2Cr2O7 color?",a:"Orange-red",hint:"Cr(VI)",solution:"Orange-red"}; }',
  'function () { return {q:"K2Cr2O7 + Fe2+?",a:"Orange to green (Cr3+)",hint:"Cr(VI)->Cr(III)",solution:"O->G"}; }',
  'function () { return {q:"KMnO4 color?",a:"Purple",hint:"Mn(VII)",solution:"Purple"}; }',
  'function () { return {q:"KMnO4 + oxalate (acid)?",a:"Mn2+ + CO2 (colorless)",hint:"Purple to colorless",solution:"Mn2+"}; }',
  'function () { return {q:"Paramagnetism in TM?",a:"Unpaired e- in d",hint:"Magnetic moment",solution:"Unpaired d e-"}; }',
  'function () { return {q:"Lanthanoid contraction effect?",a:"Zr-Hf, Nb-Ta similar sizes",hint:"4d=5d",solution:"Similar sizes"}; }',
  'function () { return {q:"Fe common ox states?",a:"+2 and +3",hint:"3d6 4s2",solution:"Fe2+, Fe3+"}; }'
]) + "\n);";
console.log("d_f done");

// ORGANIC GOC
result.deepened_topics.organic_goc = "GENERATORS.chemistry.organic_goc.push(\n" + g([
  'function () { var e=pick(["CH3OH","CH3CHO","CH3COOH","C6H6"]); return {q:"FG of "+e+"?",a:e=="CH3OH"?"-OH":e=="CH3CHO"?"-CHO":e=="CH3COOH"?"-COOH":"Ring",hint:"ID group",solution:"FG identified"}; }',
  'function () { return {q:"IUPAC: CH3-CH2-CH3?",a:"Propane",hint:"3 C alkane",solution:"Propane"}; }',
  'function () { return {q:"-I groups examples?",a:"-Cl, -NO2, -CN, -F",hint:"EWG via sigma",solution:"-I groups"}; }',
  'function () { return {q:"+R groups examples?",a:"-OH, -NH2, -OR",hint:"EDG via pi",solution:"+R groups"}; }',
  'function () { return {q:"Hyperconjugation involves?",a:"C-H s with adjacent p",hint:"No bond resonance",solution:"s-p conj"}; }',
  'function () { return {q:"Carbocation stability?",a:"3>2>1>Methyl",hint:"More alkyl = more stable",solution:"3>2>1>Me"}; }',
  'function () { return {q:"Electrophile?",a:"H+, NO2+, Br+, Fe3+",hint:"e- deficient",solution:"Electrophile"}; }',
  'function () { return {q:"Nucleophile?",a:"OH-, CN-, NH3, H2O",hint:"e- rich",solution:"Nucleophile"}; }',
  'function () { return {q:"Addition reactions on?",a:"Alkenes/alkynes",hint:"Pi bonds",solution:"Addition to C=C"}; }',
  'function () { return {q:"Substitution typical on?",a:"Alkanes, aromatics",hint:"Replace H",solution:"Substitution"}; }',
  'function () { return {q:"Elimination gives?",a:"Alkene (removes atoms)",hint:"Dehydrohalogenation",solution:"Elimination"}; }',
  'function () { return {q:"Resonance delocalizes?",a:"Pi e- or lone pairs",hint:"Multiple structures",solution:"Resonance"}; }'
]) + "\n);";
console.log("organic_goc done");

// ORGANIC HYDROCARBONS
result.deepened_topics.organic_hydrocarbons = "GENERATORS.chemistry.organic_hydrocarbons.push(\n" + g([
  'function () { return {q:"Alkane formula?",a:"CnH2n+2",hint:"Saturated",solution:"CnH2n+2"}; }',
  'function () { return {q:"Markovnikov: H adds to?",a:"C with more H",hint:"Electrophilic add",solution:"H to more H C"}; }',
  'function () { return {q:"Peroxide effect: HBr+alkene?",a:"Br to C with more H (anti-Markovnikov)",hint:"Free radical",solution:"Anti-Markovnikov"}; }',
  'function () { return {q:"Ozonolysis gives?",a:"Carbonyls",hint:"O3 cleaves C=C",solution:"Carbonyls"}; }',
  'function () { return {q:"Saytzeff rule?",a:"More substituted alkene major",hint:"Stability",solution:"More sub major"}; }',
  'function () { return {q:"Wurtz reaction?",a:"2RX+2Na->R-R+2NaX",hint:"Coupling",solution:"Wurtz"}; }',
  'function () { return {q:"Benzene: Huckel rule?",a:"4n+2 pi e- (n=1, 6pi)",hint:"Aromatic",solution:"4n+2"}; }',
  'function () { return {q:"Friedel-Crafts alkylation?",a:"R-X + AlCl3 (Lewis acid)",hint:"Electrophilic",solution:"AlCl3 catalyst"}; }',
  'function () { return {q:"Baeyers test?",a:"Alkene + KMnO4 decolorizes (brown)",hint:"Oxidation",solution:"KMnO4 decolorized"}; }',
  'function () { return {q:"Alkyne H acidic because?",a:"sp C (50% s char)",hint:"More EN",solution:"sp C"}; }',
  'function () { return {q:"Methane preparation?",a:"CH3COONa+NaOH(soda lime)->CH4",hint:"Decarboxylation",solution:"Soda lime"}; }',
  'function () { return {q:"Ethene polymerizes to?",a:"Polyethene (PE)",hint:"nCH2=CH2",solution:"PE"}; }'
]) + "\n);";
console.log("hydrocarbons done");

// HALOALKANES
result.deepened_topics.organic_haloalkanes = "GENERATORS.chemistry.organic_haloalkanes.push(\n" + g([
  'function () { return {q:"SN1 rate depends on?",a:"[RX] only (1st order)",hint:"Carbocation",solution:"Rate=k[RX]"}; }',
  'function () { return {q:"SN2 rate depends on?",a:"[RX] and [Nu] (2nd order)",hint:"Concerted",solution:"Rate=k[RX][Nu]"}; }',
  'function () { return {q:"SN2 inversion of config?",a:"Walden inversion (backside attack)",hint:"Stereochemistry",solution:"Inversion"}; }',
  'function () { return {q:"E2 requires?",a:"Strong base, anti-periplanar H",hint:"Concerted",solution:"Anti elimination"}; }',
  'function () { return {q:"Finkelstein reaction?",a:"R-X+NaI(acetone)->R-I+NaX",hint:"Halogen exchange",solution:"Finkelstein"}; }',
  'function () { return {q:"Wurtz-Fittig reaction?",a:"RX+ArX+2Na->R-Ar+2NaX",hint:"Mixed",solution:"R-Ar"}; }',
  'function () { return {q:"Grignard reagent prepn?",a:"RX+Mg(dry ether)->RMgX",hint:"Anhydrous",solution:"RMgX"}; }',
  'function () { return {q:"CH3Cl+OH- gives?",a:"CH3OH (SN2)",hint:"Methyl halide",solution:"SN2->methanol"}; }',
  'function () { return {q:"Reactivity C-X bond?",a:"R-I>R-Br>R-Cl>R-F",hint:"Bond strength",solution:"I>Br>Cl>F"}; }',
  'function () { return {q:"SNAr in haloarenes needs?",a:"Strong EWG at o/p",hint:"NO2 group",solution:"EWG needed"}; }',
  'function () { return {q:"Freon (CFC) use?",a:"Refrigerant (now phased out)",hint:"Ozone depletion",solution:"CFC refrigerant"}; }',
  'function () { return {q:"High T favors?",a:"Elimination over substitution",hint:"Entropy",solution:"Elim at high T"}; }'
]) + "\n);";
console.log("haloalkanes done");

// ALCOHOLS
result.deepened_topics.organic_alcohols = "GENERATORS.chemistry.organic_alcohols.push(\n" + g([
  'function () { return {q:"Lucas test uses?",a:"ZnCl2+HCl (cloudiness)",hint:"3>2>1",solution:"Lucas test"}; }',
  'function () { return {q:"1 alcohol + [O] gives?",a:"Aldehyde then acid",hint:"Controlled ox",solution:"Aldehyde->acid"}; }',
  'function () { return {q:"2 alcohol + [O] gives?",a:"Ketone",hint:"Stops at ketone",solution:"Ketone"}; }',
  'function () { return {q:"3 alcohol oxidation?",a:"No reaction",hint:"No H on C-OH",solution:"No reaction"}; }',
  'function () { return {q:"Dehydration alcohol gives?",a:"Alkene (H2SO4, heat)",hint:"Elim H2O",solution:"Alkene"}; }',
  'function () { return {q:"Esterification?",a:"RCOOH+ROH<->RCOOR+H2O",hint:"H+ cat",solution:"Ester"}; }',
  'function () { return {q:"Phenol acidic because?",a:"Phenoxide resonance stable",hint:"O- delocalized",solution:"Resonance"}; }',
  'function () { return {q:"Kolbe reaction?",a:"Phenol+CO2+NaOH->salicylic acid",hint:"Electro sub",solution:"Salicylic acid"}; }',
  'function () { return {q:"Reimer-Tiemann?",a:"Phenol+CHCl3+NaOH->salicylaldehyde",hint:"Carbene",solution:"Salicylaldehyde"}; }',
  'function () { return {q:"Williamson synthesis?",a:"RO- + R-X -> R-O-R + X-",hint:"SN2",solution:"Ether"}; }',
  'function () { return {q:"Phenol+FeCl3 color?",a:"Purple/violet",hint:"Test",solution:"Purple"}; }',
  'function () { return {q:"Grignard+HCHO->?",a:"Primary alcohol (RCH2OH)",hint:"Then hydrolysis",solution:"1-alcohol"}; }'
]) + "\n);";
console.log("alcohols done");

// ALDEHYDES
result.deepened_topics.organic_aldehydes = "GENERATORS.chemistry.organic_aldehydes.push(\n" + g([
  'function () { return {q:"Aldehyde+HCN -> ?",a:"Cyanohydrin RCH(OH)CN",hint:"Nu add",solution:"Cyanohydrin"}; }',
  'function () { return {q:"Aldol condensation needs?",a:"a-H (adjacent to C=O)",hint:"Base cat",solution:"a-H needed"}; }',
  'function () { return {q:"Cannizzaro reaction?",a:"Aldehyde w/o a-H + conc base -> alcohol + acid",hint:"Disprop",solution:"Alcohol+acid"}; }',
  'function () { return {q:"Fehlings test: aldehyde gives?",a:"Red Cu2O ppt",hint:"Cu2+ reduced",solution:"Red Cu2O"}; }',
  'function () { return {q:"Tollens test: aldehyde gives?",a:"Silver mirror",hint:"Ag+ reduced",solution:"Ag mirror"}; }',
  'function () { return {q:"Wolf-Kishner: C=O->?",a:"CH2 (NH2NH2+KOH)",hint:"Reduction",solution:"CH2"}; }',
  'function () { return {q:"Clemmensen: C=O->?",a:"CH2 (Zn-Hg/HCl)",hint:"Acidic",solution:"CH2"}; }',
  'function () { return {q:"Rosenmund: RCOCl->?",a:"RCHO (H2/Pd-BaSO4)",hint:"Sel red",solution:"Aldehyde"}; }',
  'function () { return {q:"Iodoform test positive for?",a:"CH3CO-R or CH3CHOH-R",hint:"Yellow CHI3",solution:"CHI3"}; }',
  'function () { return {q:"Formalin is?",a:"40% HCHO (formaldehyde)",hint:"Preservative",solution:"40% HCHO"}; }',
  'function () { return {q:"Wittig: C=O+Ph3P=CHR->?",a:"Alkene+Ph3PO",hint:"Ylide",solution:"Alkene"}; }',
  'function () { return {q:"Acetaldehyde+NH3->?",a:"CH3CH(OH)NH2",hint:"Addn",solution:"Aldehyde ammonia"}; }'
]) + "\n);";
console.log("aldehydes done");

// ACIDS
result.deepened_topics.organic_acids = "GENERATORS.chemistry.organic_acids.push(\n" + g([
  'function () { return {q:"Acidity: formic vs acetic?",a:"Formic > Acetic",hint:"Alkyl dec acid",solution:"HCOOH > CH3COOH"}; }',
  'function () { return {q:"Alcohol to acid?",a:"RCH2OH+K2Cr2O7/H+->RCOOH",hint:"Oxidation",solution:"K2Cr2O7/H+"}; }',
  'function () { return {q:"Toluene+KMnO4->?",a:"Benzoic acid",hint:"Side chain ox",solution:"Benzoic acid"}; }',
  'function () { return {q:"HVZ: a-H replaced by?",a:"Br (using P/Br2)",hint:"Hell-Volhard-Zelinsky",solution:"a-Bromo acid"}; }',
  'function () { return {q:"Acyl chloride from acid?",a:"RCOOH+SOCl2->RCOCl",hint:"Thionyl chloride",solution:"SOCl2"}; }',
  'function () { return {q:"Ester from acid+alcohol?",a:"Fischer esterif (H+ cat)",hint:"Reversible",solution:"Ester+H2O"}; }',
  'function () { return {q:"Amide from acid+NH3?",a:"RCONH2+H2O",hint:"Heat",solution:"Amide"}; }',
  'function () { return {q:"Acid anhydride?",a:"(RCO)2O from 2RCOOH (P2O5)",hint:"Dehydration",solution:"Anhydride"}; }',
  'function () { return {q:"Decarboxylation?",a:"RCOONa+NaOH/CaO->RH+Na2CO3",hint:"Soda lime",solution:"RH"}; }',
  'function () { return {q:"Claisen condensation?",a:"2RCOOR+base->b-ketoester+ROH",hint:"Ester cond",solution:"b-ketoester"}; }'
]) + "\n);";
console.log("acids done");

// AMINES
result.deepened_topics.organic_amines = "GENERATORS.chemistry.organic_amines.push(\n" + g([
  'function () { return {q:"Nitrobenzene to aniline?",a:"C6H5NO2+Fe/HCl->C6H5NH2",hint:"Reduction",solution:"Fe/HCl"}; }',
  'function () { return {q:"Hoffmann degradation?",a:"RCONH2+Br2+KOH->RNH2+CO2",hint:"Loses C",solution:"RNH2"}; }',
  'function () { return {q:"Basicity: R2NH vs ...?",a:"R2NH>RNH2>R3N>NH3(aq)",hint:"Ind+solv",solution:"Dialkyl most basic"}; }',
  'function () { return {q:"Aniline less basic?",a:"Lone pair delocalized in ring",hint:"Resonance",solution:"Resonance dec basicity"}; }',
  'function () { return {q:"Diazotization: ArNH2+NaNO2+HCl?",a:"ArN2+Cl- (0-5C)",hint:"Diazonium salt",solution:"ArN2+"}; }',
  'function () { return {q:"Coupling: ArN2+ + Ar-H (phenol)?",a:"Azo dye (Ar-N=N-Ar)",hint:"Colored",solution:"Azo dye"}; }',
  'function () { return {q:"Carbylamine for 1 amine?",a:"RNH2+CHCl3+KOH->RNC (isocyanide)",hint:"Foul smell",solution:"Isocyanide test"}; }',
  'function () { return {q:"Gabriel phthalimide gives?",a:"Only primary amine",hint:"K-phthalimide+RX",solution:"Only 1 amine"}; }',
  'function () { return {q:"Hinsberg: primary amine?",a:"Sulfonamide soluble in KOH",hint:"C6H5SO2Cl",solution:"Primary sol KOH"}; }',
  'function () { return {q:"Hoffmann elim:",a:"R(CH3)3N+OH- -> alkene (less sub)",hint:"Hoffmann alkene",solution:"Less sub alkene"}; }'
]) + "\n);";
console.log("amines done");

// BIOMOLECULES
result.deepened_topics.organic_biomolecules = "GENERATORS.chemistry.organic_biomolecules.push(\n" + g([
  'function () { return {q:"Glucose formula?",a:"C6H12O6 (aldohexose)",hint:"Aldehyde sugar",solution:"C6H12O6"}; }',
  'function () { return {q:"Sucrose components?",a:"a-D-glucose + b-D-fructose",hint:"Glycosidic",solution:"Glu+Fru"}; }',
  'function () { return {q:"Starch components?",a:"Amylose+Amylopectin",hint:"a-D-glucose",solution:"Amylose+Amylopectin"}; }',
  'function () { return {q:"Amino acids linked by?",a:"Peptide bond (-CO-NH-)",hint:"Condensation",solution:"Peptide bond"}; }',
  'function () { return {q:"Water-soluble vitamins?",a:"B-complex and C",hint:"B and C",solution:"B+C"}; }',
  'function () { return {q:"DNA base pairs?",a:"A-T (2H), G-C (3H)",hint:"Complementary",solution:"A=T, G=C"}; }',
  'function () { return {q:"RNA sugar?",a:"Ribose (vs deoxyribose)",hint:"2-OH",solution:"Ribose"}; }',
  'function () { return {q:"Triglyceride = ?",a:"Glycerol + 3 fatty acids",hint:"Ester bonds",solution:"Gly+3FA"}; }',
  'function () { return {q:"Enzymes are?",a:"Biological catalysts (proteins)",hint:"Highly spec",solution:"Protein catalysts"}; }',
  'function () { return {q:"Cellulose polymer of?",a:"b-D-glucose (b1-4)",hint:"Structural",solution:"b-D-glucose"}; }'
]) + "\n);";
console.log("biomolecules done");

// POLYMERS
result.deepened_topics.organic_polymers = "GENERATORS.chemistry.organic_polymers.push(\n" + g([
  'function () { return {q:"Polyethene from?",a:"n CH2=CH2 (addition)",hint:"Free radical",solution:"PE"}; }',
  'function () { return {q:"Nylon-6,6 from?",a:"Hexamethylenediamine+adipic acid",hint:"Condensation",solution:"Nylon-6,6"}; }',
  'function () { return {q:"PVC monomer?",a:"Vinyl chloride (CH2=CH-Cl)",hint:"Addition",solution:"PVC"}; }',
  'function () { return {q:"Terylene/Dacron is?",a:"Polyester (glycol+terephthalic acid)",hint:"Condensation",solution:"Polyester"}; }',
  'function () { return {q:"Buna-S from?",a:"Butadiene+styrene",hint:"Copolymer",solution:"Buna-S"}; }',
  'function () { return {q:"Natural rubber monomer?",a:"Isoprene (2-methyl-1,3-butadiene)",hint:"C5H8",solution:"Isoprene"}; }',
  'function () { return {q:"Vulcanization uses?",a:"Sulfur (cross-links)",hint:"Strength improves",solution:"Sulfur cross-linking"}; }',
  'function () { return {q:"Biodegradable polymer?",a:"PHBV",hint:"Bacterial",solution:"PHBV"}; }',
  'function () { return {q:"Thermoplastic example?",a:"PE, PVC (remeltable)",hint:"Softens on heat",solution:"PE/PVC"}; }',
  'function () { return {q:"Thermosetting example?",a:"Bakelite (phenol+formaldehyde)",hint:"Cannot remelt",solution:"Bakelite"}; }'
]) + "\n);";
console.log("polymers done");

// CHEM EVERYDAY
result.deepened_topics.chemistry_everyday = "GENERATORS.chemistry.chemistry_everyday.push(\n" + g([
  'function () { return {q:"Paracetamol is?",a:"Analgesic + antipyretic",hint:"Pain+fever",solution:"Analgesic+antipyretic"}; }',
  'function () { return {q:"Aspirin is?",a:"Analgesic, antipyretic, anti-inflammatory",hint:"Acetylsalicylic",solution:"ASA"}; }',
  'function () { return {q:"Chlorine in water?",a:"Disinfectant (kills microbes)",hint:"Oxidizer",solution:"Disinfectant"}; }',
  'function () { return {q:"Soap action?",a:"Micelle formation (hydrophilic+hydrophobic)",hint:"Emulsify",solution:"Micelle"}; }',
  'function () { return {q:"Detergent advantage?",a:"Works in hard water (no scum)",hint:"Sulphonates",solution:"Hard water compatible"}; }',
  'function () { return {q:"Antibiotic example?",a:"Penicillin",hint:"Fungus",solution:"Penicillin"}; }',
  'function () { return {q:"Artificial sweetener?",a:"Aspartame, saccharin",hint:"Low calorie",solution:"Aspartame"}; }',
  'function () { return {q:"Food preservative?",a:"NaCl, sugar, Na-benzoate",hint:"Microbes",solution:"Preservatives"}; }',
  'function () { return {q:"Malachite green is?",a:"Triphenylmethane dye",hint:"Green",solution:"Dye"}; }',
  'function () { return {q:"Rocket propellant?",a:"Liquid H2+O2 or kerosene+LOX",hint:"Ox+fuel",solution:"H2-O2"}; }'
]) + "\n);";
console.log("everyday done");

fs.writeFileSync(process.env.TEMP + '\\chem_complete.json', JSON.stringify(result, null, 2));
console.log("COMPLETE: all topics written to chem_complete.json");
