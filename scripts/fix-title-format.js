var fs = require('fs');
var root = 'C:/Users/Renjith/Desktop/icode (2)/study';

function getAllHtmlFiles(dir) {
  var results = [];
  var list = fs.readdirSync(dir);
  for (var i = 0; i < list.length; i++) {
    var file = require('path').join(dir, list[i]);
    var stat = fs.statSync(file);
    if (stat.isDirectory() && file.indexOf('node_modules') === -1) results = results.concat(getAllHtmlFiles(file));
    else if (file.endsWith('.html')) results.push(file);
  }
  return results;
}

var files = getAllHtmlFiles(root);
var fixed = 0;

for (var i = 0; i < files.length; i++) {
  var f = files[i].replace(/\\/g, '/');
  if (!f.match(/\/(cgl|rbi|jee|neet|gate|agniveer|upsc|ibps-po|sbi-clerk|ssc-gd|ctet)\/papers\//)) continue;

  var html = fs.readFileSync(files[i], 'utf-8');
  var original = html;

  // Fix "SSC CGL CGL" → "SSC CGL"
  html = html.replace(/(SSC CGL) CGL/g, '$1');
  // Fix "Agniveer (Indian Army) Agniveer" → "Agniveer (Indian Army)"
  html = html.replace(/Agniveer \(Indian Army\) Agniveer/g, 'Agniveer (Indian Army)');
  // Fix "RBI Grade B RBI" → "RBI Grade B"
  html = html.replace(/RBI Grade B RBI/g, 'RBI Grade B');
  // Fix "IBPS PO IBPS PO" → "IBPS PO"
  html = html.replace(/IBPS PO IBPS PO/g, 'IBPS PO');
  // Fix "SBI Clerk SBI Clerk" → "SBI Clerk"
  html = html.replace(/SBI Clerk SBI Clerk/g, 'SBI Clerk');
  // Fix "SSC GD Constable SSC GD" → "SSC GD Constable"
  html = html.replace(/SSC GD Constable SSC GD/g, 'SSC GD Constable');
  // Fix "CTET CTET" → "CTET"
  html = html.replace(/CTET CTET/g, 'CTET');
  // Fix "JEE Main JEE" → "JEE Main"
  html = html.replace(/JEE Main JEE/g, 'JEE Main');
  // Fix "NEET UG NEET" → "NEET UG"
  html = html.replace(/NEET UG NEET/g, 'NEET UG');

  // Fix lowercase months in titles
  var months = { jan:'Jan', feb:'Feb', mar:'Mar', apr:'Apr', may:'May', jun:'Jun',
    jul:'Jul', aug:'Aug', sep:'Sep', oct:'Oct', nov:'Nov', dec:'Dec' };
  for (var m in months) {
    html = html.replace(new RegExp('\\b' + m + '\\b', 'g'), months[m]);
  }

  // Fix lowercase GATE paper codes in title tags
  html = html.replace(/(<title>.*?)\b(cs|ec|me|ce|ee|in|ch)\b(.*?<\/title>)/gi, function(m, a, b, c) { return a + b.toUpperCase() + c; });
  html = html.replace(/(<meta name="description" content=".*?)\b(cs|ec|me|ce|ee|in|ch)\b(.*?">)/gi, function(m, a, b, c) { return a + b.toUpperCase() + c; });

  if (html !== original) {
    fs.writeFileSync(files[i], html, 'utf-8');
    fixed++;
  }
}

console.log('Fixed formatting in ' + fixed + ' files');
