const fs = require('fs');
const result = {
  new_topics: {},
  deepened_topics: {},
  new_topic_names: ["solid_state", "solutions", "metallurgy", "salt_analysis", "environmental"]
};

function g(arr) { return arr.join(",\n"); }

// SOLID STATE
result.new_topics.solid_state = "GENERATORS.chemistry.solid_state = [\n" + g([
  'function () { var a=rand(1,3); var t=["sc","bcc","fcc"]; var n=[1,2,4]; return {q:"Atoms/unit cell in "+t[a-1]+"?",a:n[a-1],hint:"Count corners,faces,center",solution:"Concept: "+t[a-1]+" unit cell = "+n[a-1]+" atoms"}; }',
  'function () { var a=rand(1,3); var t=["sc","bcc","fcc"]; var e=[52.4,68,74]; return {q:"Packing efficiency of "+t[a-1]+"?",a:e[a-1],hint:"PE=vol atoms/vol cell x100",solution:"Concept: "+t[a-1]+" PE = "+e[a-1]+"%"}; }',
  'function () { return {q:"Atoms in fcc unit cell?",a:4,hint:"8x1/8+6x1/2=4",solution:"Concept: fcc = 4 atoms"}; }',
  'function () { var r=rand(100,200); return {q:"sc radius="+r+" pm. Edge?",a:(2*r)+" pm",hint:"a=2r",solution:"Formula: a=2r=2x"+r+"="+(2*r)+" pm"}; }',
  'function () { var r=rand(100,200); var a=4*r/Math.sqrt(3); return {q:"bcc r="+r+" pm. a?",a:a.toFixed(1)+" pm",hint:"4r=av3",solution:"Formula: a=4r/v3="+a.toFixed(1)+" pm"}; }',
  'function () { var r=rand(100,200); var a=2*Math.SQRT2*r; return {q:"fcc r="+r+" pm. a?",a:a.toFixed(1)+" pm",hint:"4r=av2",solution:"Formula: a=2v2r="+a.toFixed(1)+" pm"}; }',
  'function () { var a=rand(300,500); var r=a*Math.sqrt(3)/4; return {q:"bcc a="+a+" pm. r?",a:r.toFixed(1)+" pm",hint:"r=av3/4",solution:"Formula: r=av3/4="+r.toFixed(1)+" pm"}; }',
  'function () { var a=rand(300,500); var r=a/(2*Math.SQRT2); return {q:"fcc a="+a+" pm. r?",a:r.toFixed(1)+" pm",hint:"r=a/(2v2)",solution:"Formula: r=a/(2v2)="+r.toFixed(1)+" pm"}; }',
  'function () { var a=rand(300,500); var z=pick([1,2,4]); var M=pick([27,56,63.5,108]); var d=z*M/(a*a*a*1e-30*6.022e23); return {q:"z="+z+", a="+a+" pm, M="+M+". Density?",a:d.toFixed(2),hint:"d=zM/(a3Na)",solution:"Formula: d="+d.toFixed(2)+" g/cm3"}; }',
  'function () { return {q:"Cation vacancy+interstitial?",a:"Frenkel defect",hint:"Seen in AgCl",solution:"Concept: Frenkel defect"}; }',
  'function () { return {q:"Defect in NaCl?",a:"Schottky defect",hint:"Equal vacancies",solution:"Concept: Schottky defect in NaCl"}; }',
  'function () { return {q:"Si+As gives?",a:"n-type",hint:"As group15, extra e-",solution:"Concept: n-type semiconductor"}; }',
  'function () { return {q:"Si+In gives?",a:"p-type",hint:"In group13, hole",solution:"Concept: p-type semiconductor"}; }',
  'function () { return {q:"CN of bcc?",a:8,hint:"Nearest neighbors",solution:"Concept: bcc CN=8"}; }',
  'function () { return {q:"CN of fcc?",a:12,hint:"Nearest neighbors",solution:"Concept: fcc CN=12"}; }',
  'function () { var e=pick(["sc","bcc","fcc","hcp"]); var m={s:6,b:8,f:12,h:12}; return {q:"CN in "+e+"?",a:m[e[0]],hint:"Count",solution:"Concept: "+e+" CN="+m[e[0]]}; }',
  'function () { var e=pick(["NaCl","CsCl","ZnS"]); var m={N:"Rock salt",C:"CsCl type",Z:"Zinc blende"}; return {q:"Structure of "+e+"?",a:m[e[0]],hint:"Crystal structure",solution:"Concept: "+e+" - "+m[e[0]]}; }',
  'function () { return {q:"Unpaired e- attracted by field?",a:"Paramagnetic",hint:"Temp. dependent",solution:"Concept: paramagnetic"}; }',
  'function () { return {q:"Permanent magnetism?",a:"Ferromagnetic",hint:"Domain alignment",solution:"Concept: ferromagnetism"}; }',
  'function () { return {q:"Band gap ~1 eV?",a:"Semiconductors",hint:"Si, Ge",solution:"Concept: semiconductors Eg~1eV"}; }',
  'function () { return {q:"Void % in sc?",a:"47.6%",hint:"100-52.4",solution:"Concept: sc void=47.6%"}; }',
  'function () { return {q:"Octahedral voids/hcp atom?",a:1,hint:"6per6atoms",solution:"Concept: hcp=1 void/atom"}; }',
  'function () { return {q:"Atoms in bcc?",a:2,hint:"8x1/8+1",solution:"Concept: bcc=2 atoms"}; }',
  'function () { return {q:"Tetrahedral voids/fcc atom?",a:2,hint:"8per4atoms",solution:"Concept: fcc=2 voids/atom"}; }'
]) + "\n];";
console.log("solid_state done (" + result.new_topics.solid_state.length + " chars)");
