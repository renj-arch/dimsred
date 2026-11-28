#!/usr/bin/env node
'use strict';
/**
 * build-di-paper.js — a data-interpretation practice paper with real charts.
 *
 * Writes papers-data/<exam>-di-practice-set-NN.json where every question carries
 * a `chart` (inline SVG for bar/pie/line, or an HTML table). Answers are
 * computed from the data, so they cannot drift, and the mock test renders the
 * chart above the question.
 *
 *   node scripts/build-di-paper.js --exam upsc
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

function arg(n, d) { const i = process.argv.indexOf('--' + n); return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d; }
const EXAM = String(arg('exam', 'upsc'));
const SET = parseInt(arg('set', '1'), 10) || 1;

// deterministic PRNG so a rebuild is stable
let _seed = (EXAM.charCodeAt(0) * 7919 + SET * 104729) >>> 0;
function rnd() { _seed = (_seed * 1664525 + 1013904223) >>> 0; return _seed / 4294967296; }
function rand(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const r2 = (n) => Math.round(n * 100) / 100;
const fmt = (n) => (Math.abs(n - Math.round(n)) < 1e-9 ? String(Math.round(n)) : String(r2(n)));

function barSvg(title, labels, values, unit) {
  const W = 520, H = 270, L = 46, B = 34, T = 34, R = 16;
  const max = Math.max(...values);
  const bw = (W - L - R) / labels.length;
  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(title)}" style="width:100%;max-width:520px;display:block;margin:6px auto;background:#fbf7ec;border-radius:8px">`;
  s += `<text x="${W / 2}" y="20" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#1f2937">${esc(title)}</text>`;
  s += `<line x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}" stroke="#1f2937" stroke-width="1.5"/>`;
  s += `<line x1="${L}" y1="${T}" x2="${L}" y2="${H - B}" stroke="#1f2937" stroke-width="1.5"/>`;
  labels.forEach((lab, i) => {
    const h = (values[i] / max) * (H - B - T);
    const x = L + i * bw + bw * 0.2;
    const y = H - B - h;
    s += `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(bw * 0.6)}" height="${r2(h)}" fill="#93c5fd" stroke="#2563eb" stroke-width="1"/>`;
    s += `<text x="${r2(x + bw * 0.3)}" y="${r2(y - 4)}" text-anchor="middle" font-family="sans-serif" font-size="10.5" fill="#1f2937">${values[i]}</text>`;
    s += `<text x="${r2(x + bw * 0.3)}" y="${H - B + 15}" text-anchor="middle" font-family="sans-serif" font-size="10.5" fill="#4b5563">${esc(lab)}</text>`;
  });
  s += `<text x="${L - 6}" y="${T + 4}" text-anchor="end" font-family="sans-serif" font-size="9" fill="#6b7280">${esc(unit)}</text>`;
  s += '</svg>';
  return s;
}

function pieSvg(title, slices) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  const cx = 130, cy = 145, r = 82;
  let a0 = -Math.PI / 2;
  let s = `<svg viewBox="0 0 520 290" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(title)}" style="width:100%;max-width:520px;display:block;margin:6px auto;background:#fbf7ec;border-radius:8px">`;
  s += `<text x="260" y="22" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#1f2937">${esc(title)}</text>`;
  const colors = ['#93c5fd', '#fca5a5', '#86efac', '#fcd34d', '#c4b5fd', '#67e8f9'];
  slices.forEach((sl, i) => {
    const a1 = a0 + (sl.value / total) * Math.PI * 2;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    s += `<path d="M ${cx} ${cy} L ${r2(x0)} ${r2(y0)} A ${r} ${r} 0 ${large} 1 ${r2(x1)} ${r2(y1)} Z" fill="${colors[i % colors.length]}" stroke="#1f2937" stroke-width="1"/>`;
    const mid = (a0 + a1) / 2;
    const lx = cx + (r * 0.66) * Math.cos(mid), ly = cy + (r * 0.66) * Math.sin(mid);
    s += `<text x="${r2(lx)}" y="${r2(ly + 4)}" text-anchor="middle" font-family="sans-serif" font-size="10.5" font-weight="700" fill="#1f2937">${sl.value}%</text>`;
    a0 = a1;
  });
  slices.forEach((sl, i) => {
    const y = 80 + i * 30;
    s += `<rect x="278" y="${y - 11}" width="13" height="13" fill="${colors[i % colors.length]}" stroke="#1f2937"/>`;
    s += `<text x="299" y="${y}" font-family="sans-serif" font-size="12" fill="#1f2937">${esc(sl.label)} — ${sl.value}%</text>`;
  });
  s += `<text x="278" y="${80 + slices.length * 30 + 6}" font-family="sans-serif" font-size="10.5" fill="#6b7280">Total = ${total}%</text>`;
  s += '</svg>';
  return s;
}

function lineSvg(title, labels, values, unit) {
  const W = 520, H = 270, L = 50, B = 34, T = 34, R = 20;
  const max = Math.max(...values), min = Math.min(...values);
  const span = max - min || 1;
  const xs = (i) => L + (i * (W - L - R)) / (labels.length - 1);
  const ys = (v) => H - B - ((v - min) / span) * (H - B - T);
  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(title)}" style="width:100%;max-width:520px;display:block;margin:6px auto;background:#fbf7ec;border-radius:8px">`;
  s += `<text x="${W / 2}" y="20" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#1f2937">${esc(title)}</text>`;
  s += `<line x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}" stroke="#1f2937" stroke-width="1.5"/>`;
  s += `<line x1="${L}" y1="${T}" x2="${L}" y2="${H - B}" stroke="#1f2937" stroke-width="1.5"/>`;
  const pts = values.map((v, i) => r2(xs(i)) + ',' + r2(ys(v))).join(' ');
  s += `<polyline points="${pts}" fill="none" stroke="#2563eb" stroke-width="2.5"/>`;
  values.forEach((v, i) => {
    s += `<circle cx="${r2(xs(i))}" cy="${r2(ys(v))}" r="3.5" fill="#2563eb"/>`;
    s += `<text x="${r2(xs(i))}" y="${r2(ys(v) - 8)}" text-anchor="middle" font-family="sans-serif" font-size="10.5" fill="#1f2937">${v}</text>`;
    s += `<text x="${r2(xs(i))}" y="${H - B + 15}" text-anchor="middle" font-family="sans-serif" font-size="10.5" fill="#4b5563">${esc(labels[i])}</text>`;
  });
  s += `<text x="${L - 6}" y="${T + 4}" text-anchor="end" font-family="sans-serif" font-size="9" fill="#6b7280">${esc(unit)}</text>`;
  s += '</svg>';
  return s;
}

function tableHtml(title, headers, rows) {
  return `<div style="overflow-x:auto;margin:8px 0;background:#ffffff;border:1px solid #d1d5db;border-radius:8px;padding:10px"><table style="width:100%;border-collapse:collapse;font-size:.9em;color:#111827"><caption style="text-align:left;font-weight:700;padding:4px 0;color:#111827">${esc(title)}</caption><thead><tr>${headers.map((h) => `<th style="border:1px solid #d1d5db;padding:6px 8px;background:#f3f4f6;color:#111827">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td style="border:1px solid #d1d5db;padding:6px 8px;color:#111827">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function opts(correct, distractors) {
  const all = [correct].concat(distractors).map((x) => String(x));
  const uniq = [...new Set(all)].slice(0, 4);
  while (uniq.length < 4) uniq.push(String(r2(Number(correct) * (1 + 0.1 * uniq.length))));
  const correctIdx = 0;
  const shuffled = uniq.sort(() => rnd() - 0.5);
  const ci = shuffled.indexOf(String(correct));
  return shuffled.map((t, i) => ({ label: String.fromCharCode(65 + i), text: t, correct: i === ci }));
}

const Q = [];
function add(text, chart, correct, distractors, solution, section) {
  Q.push({ text, chart, options: opts(correct, distractors), solution, section: section || 'Data Interpretation' });
}

// 1-2: bar chart
const years = ['2021', '2022', '2023', '2024', '2025'];
const prod = years.map(() => rand(40, 95));
prod.sort((a, b) => a - b); // a rising series, so "increase" is positive
const bar = barSvg('Steel production of a plant (million tonnes)', years, prod, 'MT');
add(`What was the percentage increase in production from ${years[1]} to ${years[2]}?`, bar,
  fmt(r2(((prod[2] - prod[1]) / prod[1]) * 100)) + '%',
  [fmt(r2(((prod[2] - prod[1]) / prod[2]) * 100)) + '%', fmt(r2(((prod[3] - prod[2]) / prod[2]) * 100)) + '%', fmt(r2(((prod[2] - prod[0]) / prod[0]) * 100)) + '%'],
  `Increase = ${prod[2]} − ${prod[1]} = ${prod[2] - prod[1]}; % = ${prod[2] - prod[1]}/${prod[1]} × 100 = ${fmt(r2(((prod[2] - prod[1]) / prod[1]) * 100))}%.`);
add(`What was the average production over the five years?`, bar,
  fmt(r2(prod.reduce((a, b) => a + b, 0) / 5)) + ' MT',
  [fmt(r2(prod.reduce((a, b) => a + b, 0) / 4)) + ' MT', fmt(r2(Math.max(...prod))) + ' MT', fmt(r2((Math.max(...prod) + Math.min(...prod)) / 2)) + ' MT'],
  `Average = (${prod.join(' + ')}) / 5 = ${fmt(r2(prod.reduce((a, b) => a + b, 0) / 5))} MT.`);

// 3-4: pie chart
let a = rand(28, 38), b = rand(20, 30), c = rand(14, 22), d = 100 - a - b - c;
const slices = [{ label: 'Food', value: a }, { label: 'Rent', value: b }, { label: 'Education', value: c }, { label: 'Other', value: d }];
const pie = pieSvg('Monthly expenditure of a family (% of income)', slices);
add(`What is the central angle of the "Food" sector?`, pie,
  fmt(r2(a * 3.6)) + '°',
  [fmt(r2(b * 3.6)) + '°', fmt(r2(c * 3.6)) + '°', fmt(r2(d * 3.6)) + '°'],
  `Central angle = ${a}% × 3.6 = ${fmt(r2(a * 3.6))}°.`);
const total = rand(40, 90) * 1000;
add(`If the monthly income is ₹${total.toLocaleString('en-IN')}, how much is spent on Education?`, pie,
  '₹' + Math.round(total * c / 100).toLocaleString('en-IN'),
  ['₹' + Math.round(total * a / 100).toLocaleString('en-IN'), '₹' + Math.round(total * b / 100).toLocaleString('en-IN'), '₹' + Math.round(total * d / 100).toLocaleString('en-IN')],
  `Education = ${c}% of ₹${total.toLocaleString('en-IN')} = ₹${Math.round(total * c / 100).toLocaleString('en-IN')}.`);

// 5-6: line chart
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const temp = months.map(() => rand(20, 42));
const line = lineSvg('Average temperature (°C)', months, temp, '°C');
add(`What is the difference between the highest and lowest temperature?`, line,
  String(Math.max(...temp) - Math.min(...temp)) + '°C',
  [String(Math.max(...temp)) + '°C', String(Math.min(...temp)) + '°C', String(Math.max(...temp) + Math.min(...temp)) + '°C'],
  `Highest ${Math.max(...temp)}°C, lowest ${Math.min(...temp)}°C; difference ${Math.max(...temp) - Math.min(...temp)}°C.`);
add(`What is the average temperature over the six months?`, line,
  fmt(r2(temp.reduce((x, y) => x + y, 0) / 6)) + '°C',
  [fmt(r2(temp.reduce((x, y) => x + y, 0) / 5)) + '°C', fmt(r2((Math.max(...temp) + Math.min(...temp)) / 2)) + '°C', fmt(r2(Math.max(...temp))) + '°C'],
  `Average = (${temp.join(' + ')}) / 6 = ${fmt(r2(temp.reduce((x, y) => x + y, 0) / 6))}°C.`);

// 7-8: table
const students = ['A', 'B', 'C', 'D'];
const marks = students.map(() => [rand(55, 95), rand(50, 90), rand(60, 98)]);
const tabs = tableHtml('Marks out of 100', ['Student', 'Maths', 'Science', 'English'], students.map((s, i) => [s, marks[i][0], marks[i][1], marks[i][2]]));
const totals = marks.map((m) => m.reduce((x, y) => x + y, 0));
const best = students[totals.indexOf(Math.max(...totals))];
add(`Which student has the highest total?`, tabs, best,
  students.filter((s) => s !== best).concat([students[0] === best ? students[1] : students[0]]).slice(0, 3),
  `Totals: ${students.map((s, i) => s + '=' + totals[i]).join(', ')}; highest ${best} (${Math.max(...totals)}).`);
const si = 1;
add(`What is ${students[si]}'s percentage in Science?`, tabs,
  fmt(r2(marks[si][1])) + '%',
  [fmt(r2(marks[si][1] + 10)) + '%', fmt(r2(marks[si][1] - 8)) + '%', fmt(r2(marks[si][2])) + '%'],
  `Science mark = ${marks[si][1]} out of 100 = ${fmt(r2(marks[si][1]))}%.`);

const paper = {
  kind: 'practice',
  folder: EXAM,
  slug: EXAM + '-di-practice-set-0' + SET,
  title: 'Data Interpretation practice set ' + SET,
  pageTitle: 'Data Interpretation — charts and tables',
  pageDesc: 'Bar, pie, line and table questions with answers worked from the data.',
  exam: EXAM,
  timerMinutes: 20,
  totalQuestions: Q.length,
  totalMarks: Q.length,
  sectionsMeta: [{ name: 'Data Interpretation', count: Q.length }],
  generatedAt: new Date().toISOString(),
  generatedBy: 'build-di-paper.js',
  questions: Q.map((q, i) => ({ id: 900000 + SET * 100 + i + 1, q: i + 1, section: q.section, text: q.text, options: q.options, solution: q.solution, chart: q.chart }))
};

const file = path.join(ROOT, 'papers-data', paper.slug + '.json');
fs.writeFileSync(file, JSON.stringify(paper, null, 1), 'utf8');

// Register in data/papers.json so papers.html lists it.
const NAMES = { upsc: 'UPSC CSE', cgl: 'SSC CGL', rbi: 'RBI Grade B', 'ibps-po': 'IBPS PO', 'sbi-clerk': 'SBI Clerk', 'ssc-gd': 'SSC GD', ctet: 'CTET', nda: 'NDA', cds: 'CDS', clat: 'CLAT', apfc: 'UPSC APFC', agniveer: 'Agniveer', jee: 'JEE Main', neet: 'NEET UG', gate: 'GATE' };
const pjPath = path.join(ROOT, 'data', 'papers.json');
const entry = {
  id: EXAM + '-' + paper.slug,
  exam: NAMES[EXAM] || EXAM,
  examKey: EXAM,
  year: 2026,
  paper: 'Data Interpretation Practice Set 0' + SET,
  type: 'practice-set',
  totalQuestions: Q.length,
  sections: [{ name: 'Data Interpretation', count: Q.length }],
  sourceFile: paper.slug + '.json'
};
try {
  const pj = JSON.parse(fs.readFileSync(pjPath, 'utf8'));
  const arr = Array.isArray(pj) ? pj : (pj.papers || []);
  const at = arr.findIndex((x) => x && x.id === entry.id);
  if (at >= 0) arr[at] = entry; else arr.push(entry);
  if (!Array.isArray(pj)) pj.papers = arr;
  fs.writeFileSync(pjPath, JSON.stringify(pj, null, 1) + '\n', 'utf8');
  console.log('registered in data/papers.json: ' + entry.id);
} catch (e) { console.log('WARN could not update papers.json: ' + e.message); }

console.log('wrote ' + path.relative(ROOT, file) + ' (' + Q.length + ' questions, bar/pie/line/table)');