// Bounded runner: executes a fetch script child process and forcibly kills it
// after a deadline so a single hung HTTP request can never stall the whole
// feeds job (which previously froze before build-archive-single.js re-ran).
//
// Usage: node scripts/with-timeout.js <script> <timeoutMs> [args...]
// Always exits 0 so downstream steps (merge, cleanup, archive build) run.

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const script = process.argv[2];
const timeoutMs = parseInt(process.argv[3], 10) || 120000;
const args = process.argv.slice(4);

if (!script) {
  console.error('usage: node scripts/with-timeout.js <script> [timeoutMs] [args...]');
  process.exit(0);
}

const child = spawn('node', [script].concat(args), {
  stdio: 'inherit',
  env: process.env,
});

const start = Date.now();
let killed = false;

const timer = setTimeout(() => {
  killed = true;
  console.error(`[with-timeout] ${script} exceeded ${timeoutMs}ms — killing`);
  child.kill('SIGKILL');
}, timeoutMs);

child.on('close', (code, signal) => {
  clearTimeout(timer);
  if (killed) {
    console.error(`[with-timeout] ${script} force-killed after ${timeoutMs}ms (signal ${signal})`);
  } else {
    const dur = Date.now() - start;
    console.error(`[with-timeout] ${script} finished (${dur}ms, exit ${code})`);
  }
  // Always exit 0 so upstream steps proceed.
  process.exit(0);
});