(function(){
var PLAN_KEY = 'studypro_study_plan';
var PLAN_CACHE_KEY = 'studypro_plan_cache';

// ========== TOPIC MASTERY TIERS ==========
var TIERS = {
  foundation: { label: 'Foundation', emoji: '🔵', threshold: 0, next: 'intermediate' },
  intermediate: { label: 'Intermediate', emoji: '🟡', threshold: 0.4, next: 'advanced' },
  advanced: { label: 'Advanced', emoji: '🟢', threshold: 0.7, next: 'mastery' },
  mastery: { label: 'Mastery', emoji: '🌟', threshold: 0.9, next: null }
};

// ========== GENERATE STUDY PLAN ==========
window.generateStudyPlan = function(analysis) {
  if (!analysis || !analysis.patterns || analysis.totalMistakes < 3) {
    return null;
  }

  var today = new Date();
  var plan = {
    generatedAt: today.toISOString(),
    weekStart: today.toISOString().slice(0,10),
    focus: null,
    dailyPlans: [],
    weeklyGoal: null
  };

  // Determine primary focus
  var primaryPattern = null;
  var primaryScore = 0;
  analysis.patterns.forEach(function(p){
    var score = p.severity === 'high' ? 3 : (p.severity === 'medium' ? 2 : 1);
    score *= p.count || 1;
    if (score > primaryScore) {
      primaryScore = score;
      primaryPattern = p;
    }
  });

  // Extract weak section from patterns
  var weakSection = null;
  analysis.patterns.forEach(function(p){
    if (p.type === 'weakest_section') {
      var match = p.message.match(/"([^"]+)"/);
      if (match) weakSection = match[1];
    }
  });

  plan.focus = {
    pattern: primaryPattern ? primaryPattern.type : 'general',
    message: primaryPattern ? primaryPattern.message : 'Keep practicing consistently',
    drill: primaryPattern ? primaryPattern.drill : 'Review all topics regularly',
    weakSection: weakSection
  };

  // Build 7-day plan
  var daysOfWeek = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var focusAreas = [];

  // Create focus areas based on analysis
  if (weakSection) {
    focusAreas.push({ name: weakSection + ' Deep Dive', type: 'weak', drills: 10 });
  }
  if (primaryPattern) {
    var drillMap = {
      negation_trap: { name: 'Negation Trap Practice', type: 'pattern', drills: 8 },
      adjacent_distractor: { name: 'Two-Option Elimination', type: 'pattern', drills: 8 },
      partial_knowledge: { name: 'Precision Recall', type: 'pattern', drills: 8 },
      speed_error: { name: 'Speed Reading Accuracy', type: 'pattern', drills: 10 },
      concept_gap: { name: 'Concept Foundation', type: 'pattern', drills: 8 },
      first_option_bias: { name: 'Read-All-Options Drill', type: 'pattern', drills: 6 },
      last_option_fallback: { name: 'Elimination Strategy', type: 'pattern', drills: 6 }
    };
    if (drillMap[primaryPattern.type]) {
      focusAreas.push(drillMap[primaryPattern.type]);
    }
  }

  // Add general topics if we have few focus areas
  if (focusAreas.length < 2) {
    focusAreas.push({ name: 'Mixed Practice', type: 'general', drills: 15 });
  }
  if (focusAreas.length < 3) {
    focusAreas.push({ name: 'Mock Test Prep', type: 'mock', drills: 20 });
  }

  // Generate daily plans cycling through focus areas
  for (var d = 0; d < 7; d++) {
    var date = new Date(today);
    date.setDate(today.getDate() + d);
    var dayName = daysOfWeek[date.getDay()];
    var dateStr = date.toISOString().slice(0,10);

    var area = focusAreas[d % focusAreas.length];
    var dayPlan = {
      date: dateStr,
      day: dayName,
      focus: area.name,
      type: area.type,
      drills: area.drills,
      completed: false,
      warmup: d > 0 ? 'Review ' + (d % 3 + 1) + ' mistakes from previous days' : 'Start fresh — no warmup needed',
      cooldown: d === 6 ? 'Full review of week\'s progress' : 'Mark ' + (d + 1) + ' topics reviewed',
      tips: getDayTip(d, area.type)
    };
    plan.dailyPlans.push(dayPlan);
  }

  // Set weekly goal
  var totalDrills = plan.dailyPlans.reduce(function(sum, dp){ return sum + dp.drills; }, 0);
  plan.weeklyGoal = {
    targetDrills: totalDrills,
    targetDays: 5,
    description: 'Complete ' + totalDrills + ' questions across ' + focusAreas.length + ' focus areas'
  };

  // Cache
  localStorage.setItem(PLAN_CACHE_KEY, JSON.stringify(plan));
  return plan;
};

function getDayTip(dayIdx, type) {
  var tips = {
    weak: [
      'Start with the hardest topic first — your brain is freshest',
      'Use the Pomodoro technique: 25 min study, 5 min break',
      'Teach the concept to someone else (or your wall)',
      'Review 3 wrong answers from this section before starting',
      'Draw a concept map of what you know',
      'Focus on understanding WHY, not just WHAT',
      'Take a 10-min walk after this session to consolidate'
    ],
    pattern: [
      'Read every question TWICE before looking at options',
      'Cover options, read question, uncover — then answer',
      'Circle/underline key words like EXCEPT, NOT, INCORRECT',
      'If stuck between 2, re-read the question stem',
      'Eliminate 2 wrong options before choosing',
      'Time yourself: 45s per question max',
      'Review the pattern you\'re targeting before starting'
    ],
    general: [
      'Mix topics to keep your brain adaptable',
      'After 20 min of one topic, switch to another',
      'Use active recall: cover the answer and explain',
      'Do 5 warmup questions from yesterday\'s focus',
      'Take notes on new concepts you encounter',
      'Aim for 80%+ accuracy before speeding up',
      'End with a 2-min review of what you learned'
    ],
    mock: [
      'Simulate exam conditions: no phone, no breaks',
      'Read instructions carefully before starting',
      'Skip hard questions, come back later',
      'Keep an eye on the timer every 10 questions',
      'Review ALL questions even if you think you\'re done',
      'After mock, analyze mistakes before checking scores',
      'Focus on endurance — maintain accuracy through the end'
    ]
  };
  var pool = tips[type] || tips.general;
  return pool[dayIdx % pool.length];
}

// ========== RENDER STUDY PLAN ==========
window.renderStudyPlan = function(containerId, plan) {
  var container = document.getElementById(containerId);
  if (!container) return;

  if (!plan) {
    container.innerHTML = '';
    return;
  }

  var html = '';
  var today = new Date().toISOString().slice(0,10);
  var completedCount = 0;
  plan.dailyPlans.forEach(function(dp){ if (dp.date < today || dp.completed) completedCount++; });

  // Header
  var progressPct = Math.min(100, Math.round(completedCount / 7 * 100));
  html += '<div class="card-header">';
  html += '<div class="card-title"><span class="icon">📋</span> AI Study Plan</div>';
  html += '<span class="card-badge green">' + completedCount + '/7 days</span>';
  html += '</div>';

  // Focus banner
  var colorMap = { negation_trap: '#ef4444', adjacent_distractor: '#f59e0b', partial_knowledge: '#a78bfa', speed_error: '#f97316', concept_gap: '#ef4444', first_option_bias: '#f59e0b', last_option_fallback: '#f59e0b', weakest_section: '#a78bfa', label_bias: '#f59e0b', hard_question_overload: '#ef4444', general: '#34d399' };
  var focusColor = colorMap[plan.focus.pattern] || '#a78bfa';

  html += '<div style="padding:12px 14px;margin-bottom:14px;border-radius:10px;border:1px solid ' + focusColor.replace(')', ',.15)').replace('rgb', 'rgba') + ';background:' + focusColor.replace(')', ',.05)').replace('rgb', 'rgba') + '">';
  html += '<div style="font-size:.82em;font-weight:600;color:' + focusColor + ';margin-bottom:4px">🎯 Focus: ' + (plan.focus.weakSection || capitalize(plan.focus.pattern)) + '</div>';
  html += '<div style="font-size:.78em;color:var(--text-sec);line-height:1.5">' + plan.focus.drill + '</div>';
  html += '</div>';

  // Progress bar
  html += '<div style="margin-bottom:14px">';
  html += '<div style="display:flex;justify-content:space-between;font-size:.75em;color:var(--text-muted);margin-bottom:4px">';
  html += '<span>Weekly progress</span><span>' + completedCount + '/7 days</span></div>';
  html += '<div class="progress-bar"><div class="fill" style="width:' + progressPct + '%"></div></div>';
  html += '<div style="font-size:.7em;color:var(--text-muted);margin-top:4px">' + plan.weeklyGoal.description + '</div>';
  html += '</div>';

  // Daily plan list
  plan.dailyPlans.forEach(function(dp, i){
    var isToday = dp.date === today;
    var isPast = dp.date < today;
    var isFuture = dp.date > today;
    var bgColor = isToday ? 'rgba(167,139,250,.08)' : (dp.completed ? 'rgba(52,211,153,.04)' : 'transparent');
    var borderColor = isToday ? 'rgba(167,139,250,.2)' : (dp.completed ? 'rgba(52,211,153,.1)' : 'var(--border)');
    var leftColor = isToday ? '#a78bfa' : (dp.completed ? '#34d399' : 'var(--border)');

    var typeIcon = dp.type === 'weak' ? '🎯' : (dp.type === 'pattern' ? '🧠' : (dp.type === 'mock' ? '📝' : '📚'));

    html += '<div style="padding:10px 12px;margin-bottom:6px;border-radius:8px;border:1px solid ' + borderColor + ';background:' + bgColor + ';border-left:3px solid ' + leftColor + '">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px">';
    html += '<div style="flex:1">';
    html += '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">';
    html += '<span style="font-size:.78em">' + typeIcon + '</span>';
    html += '<span style="font-size:.8em;font-weight:600">' + (isToday ? 'Today' : dp.day) + '</span>';
    html += '<span style="font-size:.72em;color:var(--text-muted)">' + dp.date.slice(5) + '</span>';
    if (dp.completed) html += '<span style="font-size:.65em;padding:1px 6px;border-radius:100px;background:rgba(52,211,153,.12);color:#34d399">✅ Done</span>';
    html += '</div>';
    html += '<div style="font-size:.82em;margin:4px 0">' + dp.focus + '</div>';
    html += '<div style="font-size:.72em;color:var(--text-muted)">💡 ' + dp.tips + '</div>';
    html += '</div>';
    html += '<div style="text-align:right;flex-shrink:0">';
    html += '<div style="font-size:.72em;color:var(--text-muted)">' + dp.drills + ' Q</div>';
    html += '</div></div></div>';
  });

  container.innerHTML = html;
};

function capitalize(s) {
  return s ? s.replace(/_/g, ' ').replace(/\b\w/g, function(c){ return c.toUpperCase(); }) : '';
}

// ========== WINDOW LOADER ==========
window.loadStudyPlan = function() {
  var analysis = window.getAICachedAnalysis();
  if (!analysis) {
    // Run analysis first
    var list = JSON.parse(localStorage.getItem('studypro_wrong') || '[]');
    if (list.length >= 3) {
      analysis = window.runAIAnalysis(list);
    }
  }
  var plan = window.generateStudyPlan(analysis);
  window.renderStudyPlan('aiPlan', plan);
  return plan;
};

})();
