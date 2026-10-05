const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname,"..","neet","chapters");
function slug(n){return n.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/-+$/,"");}
function esc(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
// Load buildPage from physics generator
const physGen = require("./gen-neet-physics-chapters.js");
