#!/usr/bin/env node
// Agent Memory: the agent's brain. Stores lessons learned from every run.
// - What worked (keep doing it)
// - What broke things (never do it again)
// - What patterns cause issues (avoid them)
// - Best approaches discovered (optimize for them)
//
// The agent reads this before every run and writes after every run.
// Over time it becomes the smartest maintainer — it has seen every
// mistake, every fix, every pattern.

const fs = require('fs');
const path = require('path');

const MEMORY_FILE = path.join(__dirname, '..', 'data', 'agent-memory.json');

function load() {
  try {
    return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
  } catch (e) {
    return {
      version: 1,
      created: new Date().toISOString(),
      lessons: [],        // { pattern, lesson, severity, learnedAt, timesHit }
      rules: [],          // { rule, reason, addedAt, timesApplied }
      mistakes: [],       // { what, why, fix, happenedAt }
      wins: [],           // { what, impact, happenedAt }
      stats: { totalRuns: 0, totalFixes: 0, totalMistakes: 0, totalLessons: 0 }
    };
  }
}

function save(mem) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(mem, null, 2));
}

// Record a lesson: "when X happens, do Y because Z"
function addLesson(pattern, lesson, severity) {
  const mem = load();
  // Check if this lesson already exists
  const existing = mem.lessons.find(l => l.pattern === pattern);
  if (existing) {
    existing.timesHit++;
    existing.lastHit = new Date().toISOString();
    save(mem);
    return;
  }
  mem.lessons.push({
    pattern,
    lesson,
    severity: severity || 'info', // info, warning, critical
    learnedAt: new Date().toISOString(),
    timesHit: 1
  });
  // Keep last 200 lessons
  if (mem.lessons.length > 200) mem.lessons = mem.lessons.slice(-200);
  mem.stats.totalLessons = mem.lessons.length;
  save(mem);
  console.log('memory: learned lesson — ' + pattern);
}

// Record a mistake the agent made
function addMistake(what, why, fix) {
  const mem = load();
  mem.mistakes.push({ what, why, fix, happenedAt: new Date().toISOString() });
  // Auto-generate a lesson from the mistake
  addLesson(what, 'NEVER do this again: ' + why + '. Instead: ' + fix, 'critical');
  if (mem.mistakes.length > 100) mem.mistakes = mem.mistakes.slice(-100);
  mem.stats.totalMistakes = mem.mistakes.length;
  save(mem);
  console.log('memory: recorded mistake — ' + what);
}

// Record a successful fix
function addWin(what, impact) {
  const mem = load();
  mem.wins.push({ what, impact, happenedAt: new Date().toISOString() });
  if (mem.wins.length > 100) mem.wins = mem.wins.slice(-100);
  save(mem);
}

// Add a rule: "always do X" or "never do Y"
function addRule(rule, reason) {
  const mem = load();
  if (mem.rules.find(r => r.rule === rule)) return;
  mem.rules.push({ rule, reason, addedAt: new Date().toISOString(), timesApplied: 0 });
  save(mem);
}

// Get all lessons as a prompt string for the LLM
function getLessonsPrompt() {
  const mem = load();
  const critical = mem.lessons.filter(l => l.severity === 'critical').slice(-20);
  const warnings = mem.lessons.filter(l => l.severity === 'warning').slice(-10);
  const rules = mem.rules.slice(-20);

  let prompt = '';
  if (rules.length) {
    prompt += 'RULES (always follow):\n';
    rules.forEach(r => { prompt += '- ' + r.rule + ' (because: ' + r.reason + ')\n'; });
    prompt += '\n';
  }
  if (critical.length) {
    prompt += 'CRITICAL MISTAKES TO NEVER REPEAT:\n';
    critical.forEach(l => { prompt += '- ' + l.pattern + ': ' + l.lesson + '\n'; });
    prompt += '\n';
  }
  if (warnings.length) {
    prompt += 'WARNINGS:\n';
    warnings.forEach(l => { prompt += '- ' + l.pattern + ': ' + l.lesson + '\n'; });
  }
  return prompt;
}

// Check if a proposed action violates any learned lesson
function checkAction(action) {
  const mem = load();
  for (const lesson of mem.lessons) {
    if (lesson.severity === 'critical' && action.includes(lesson.pattern)) {
      return { safe: false, reason: lesson.lesson };
    }
  }
  return { safe: true };
}

// Update stats after a run
function updateStats(fixes) {
  const mem = load();
  mem.stats.totalRuns++;
  mem.stats.totalFixes += fixes;
  save(mem);
}

module.exports = { load, save, addLesson, addMistake, addWin, addRule, getLessonsPrompt, checkAction, updateStats };

// If run directly, print current memory
if (require.main === module) {
  const mem = load();
  console.log('=== Agent Memory ===');
  console.log('Runs: ' + mem.stats.totalRuns);
  console.log('Total fixes: ' + mem.stats.totalFixes);
  console.log('Lessons learned: ' + mem.lessons.length);
  console.log('Rules: ' + mem.rules.length);
  console.log('Mistakes recorded: ' + mem.mistakes.length);
  console.log('Wins: ' + mem.wins.length);
  if (mem.lessons.length) {
    console.log('\nRecent critical lessons:');
    mem.lessons.filter(l => l.severity === 'critical').slice(-5).forEach(l => {
      console.log('  ⛔ ' + l.pattern + ': ' + l.lesson);
    });
  }
}
