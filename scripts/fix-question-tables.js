#!/usr/bin/env node
/**
 * fix-question-tables.js — turn markdown tables in question text into real
 * tables.
 *
 * A model writing a data question often answers with a pipe table:
 *
 *   State/UT | Total Literacy (%) | Male (%) | Female (%)
 *   Kerala | 94.0 | 96.1 | 92.1
 *   ...
 *
 * The generator stores that text verbatim inside <div class="q-text">, so the
 * reader sees a wall of pipes instead of a table — Q10 and Q15 of the UPSC
 * practice set are exactly that. This converts those runs into a real <table>
 * and leaves every other word untouched.
 *
 *   node scripts/fix-question-tables.js            # fix in place
 *   node scripts/fix-question-tables.js --check    # exit 1 if any remain
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHECK = process.argv.includes('--check');
const MARK = 'class="q-table"';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&(?!(?:amp|lt|gt|quot|#\d+);)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// The generated pages have no table styling, so a converted table needs its own
// rule. Injected once per page, marked so a second run is a no-op.
const CSS_MARK = '/* q-table-style */';
const QCSS = '<style>' + CSS_MARK +
  'table.q-table{width:100%;border-collapse:collapse;margin:10px 0 14px;font-size:.92em}' +
  'table.q-table th,table.q-table td{border:1px solid rgba(255,255,255,.14);padding:7px 9px;text-align:left}' +
  'table.q-table th{background:rgba(167,139,250,.12);font-weight:700;white-space:nowrap}' +
  'table.q-table tr:nth-child(even) td{background:rgba(255,255,255,.03)}' +
  '</style>';

function cells(line) {
  let s = String(line).trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim());
}

function isSeparator(line) {
  return /^\s*\|?[\s:|-]+\|?\s*$/.test(line) && /-/.test(line) && (line.match(/\|/g) || []).length >= 1;
}

// A table that arrived on one line: the generator strips newlines, so the rows
// are only implied by where the numeric groups repeat. Find the column count
// that makes every row end in a value, then cut the row accordingly.
// The generator strips newlines and sometimes glues a row label onto the value
// before it, so the row break is not a pipe at all. What survives is the shape:
// each data row is one label followed by the same number of values. So count the
// longest run of values, and the column count is that run plus the label.
function gridFromTokens(tokens) {
  const plainNum = (c) => /^[+-]?[0-9][0-9,]*(?:\.[0-9]+)?\s*%?$/.test(String(c).trim());
  const labelish = (c) => c !== '' && !plainNum(c);

  let best = 0;
  let run = 0;
  tokens.forEach((t) => {
    if (plainNum(t)) { run++; if (run > best) best = run; }
    else run = 0;
  });
  if (best < 1) return null;

  const cols = best + 1;
  if (tokens.length < cols * 3) return null;      // header + at least two rows
  const header = tokens.slice(0, cols);
  if (!header.every(labelish)) return null;

  const rows = [header];
  let i = cols;
  while (i < tokens.length) {
    const label = tokens[i];
    const vals = tokens.slice(i + 1, i + 1 + best);
    if (!labelish(label) || vals.length < best || !vals.every(plainNum)) return null;
    rows.push([label].concat(vals));
    i += cols;
  }
  return rows.length >= 3 ? rows : null;
}

function splitInline(text) {
  const parts = String(text).split('|');
  if (parts.length < 6) return null;
  const prose = parts.shift().trim();

  // A row label is often glued to the value before it ("92.1 Mizoram"), so the
  // pipe is not the only row boundary. Split value-then-Capital into two cells
  // before counting anything.
  const expanded = [];
  parts.forEach((raw) => {
    const cell = String(raw).trim();
    if (!cell) return;
    if (/^:?-{2,}:?$/.test(cell)) return;
    cell.split(/(?<=[0-9%)])\s+(?=[A-Z])/).forEach((piece) => {
      const p = piece.trim();
      if (p) expanded.push(p);
    });
  });
  if (expanded.length < 6) return null;

  const cut = Math.max(prose.lastIndexOf('?'), prose.lastIndexOf('.'));
  if (cut > -1 && cut < prose.length - 1) {
    const tail = prose.slice(cut + 1).trim();
    if (tail && tail.length <= 40) {
      const withTail = [tail].concat(expanded);
      const grid = gridFromTokens(withTail) || findGrid(withTail);
      if (grid) return { prose: prose.slice(0, cut + 1).trim(), rows: grid };
    }
  }

  const grid = gridFromTokens(expanded) || findGrid(expanded);
  return grid ? { prose: prose, rows: grid } : null;
}

// Fallback: exact rectangular split, for tables that kept their separators.
function findGrid(cells) {
  const plainNum = (c) => /^[+-]?[0-9][0-9,]*(?:\.[0-9]+)?\s*%?$/.test(String(c).trim());
  const labelish = (c) => c !== '' && !plainNum(c);

  for (let k = 2; k <= 8; k++) {
    if (cells.length % k !== 0 || k === cells.length) continue;
    const rows = [];
    for (let i = 0; i < cells.length; i += k) rows.push(cells.slice(i, i + k));
    if (rows.length < 3) continue;
    if (!rows[0].some(labelish)) continue;
    const ok = rows.slice(1).every((r) => labelish(r[0]) && r.slice(1).every(plainNum));
    if (ok) return rows;
  }
  return null;
}

function tableHtml(rows) {
  const width = rows[0].length;
  let html = '<table class="q-table"><thead><tr>' +
    rows[0].map((c) => '<th>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>';
  for (let r = 1; r < rows.length; r++) {
    const filled = [];
    for (let c = 0; c < width; c++) filled.push(rows[r][c] == null ? '' : rows[r][c]);
    html += '<tr>' + filled.map((c) => '<td>' + esc(c) + '</td>').join('') + '</tr>';
  }
  return html + '</tbody></table>';
}

// Convert every run of >= 2 consecutive pipe lines into one table.
function convertTables(text) {
  let src = String(text);
  let changed = false;

  // 1. the one-line case
  const inline = splitInline(src);
  if (inline) {
    const prefix = inline.prose ? inline.prose + '\n' : '';
    return { text: prefix + tableHtml(inline.rows), changed: true };
  }

  // 2. the multi-line case
  const lines = src.split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const pipes = (line.match(/\|/g) || []).length;
    if (pipes >= 2) {
      let j = i;
      const run = [];
      while (j < lines.length && (lines[j].match(/\|/g) || []).length >= 2) {
        run.push(lines[j]);
        j++;
      }
      const rows = run.filter((r) => !isSeparator(r)).map(cells);
      if (rows.length >= 2 && rows[0].length >= 2) {
        const body = rows.filter((r) => r.length >= 2);
        if (out.length && out[out.length - 1].trim() !== '') out.push('');
        out.push(tableHtml(body));
        changed = true;
        i = j;
        continue;
      }
    }
    out.push(line);
    i++;
  }
  return { text: out.join('\n'), changed: changed };
}

function walk(dir, out) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const e of entries) {
    if (e.name === '.git' || e.name === 'node_modules' || e.name === 'data') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.name.endsWith('.html')) out.push(full);
  }
  return out;
}

// Only question text and solution boxes are touched: those are where a model
// writes a table, and rewording anything else would be out of scope.
const BLOCKS = [
  /(<div class="q-text">)([\s\S]*?)(<\/div>)/g,
  /(<div class="solution-box">)([\s\S]*?)(<\/div>)/g,
  /(<div class="q-option">)([\s\S]*?)(<\/div>)/g
];

const files = walk(ROOT, []);
let fixed = 0;
const stale = [];

for (const file of files) {
  let html;
  try { html = fs.readFileSync(file, 'utf8'); } catch (e) { continue; }
  if (html.indexOf('|') === -1) continue;

  let next = html;
  BLOCKS.forEach((re) => {
    next = next.replace(re, (m, open, inner, close) => {
      if (inner.indexOf(MARK) !== -1) return m;
      const res = convertTables(inner);
      return open + res.text + close;
    });
  });
  // Style the converted tables, once.
  if (next.indexOf('<table class="q-table"') !== -1 && next.indexOf(CSS_MARK) === -1) {
    next = next.replace(/<\/head>/i, QCSS + '</head>');
  }
  if (next === html) continue;

  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  if (CHECK) { stale.push(rel); continue; }
  fs.writeFileSync(file, next, 'utf8');
  fixed++;
  if (fixed <= 5) console.log('  fixed ' + rel);
}

if (CHECK) {
  if (stale.length) {
    console.error('FAIL ' + stale.length + ' page(s) still show a markdown table in question text');
    stale.slice(0, 10).forEach((s) => console.error('  ' + s));
    process.exitCode = 1;
  } else {
    console.log('question tables: all rendered');
  }
} else {
  console.log('question tables: ' + fixed + ' page(s) fixed');
}