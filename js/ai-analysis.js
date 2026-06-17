(function(){
var ANALYSIS_KEY = 'studypro_ai_analysis';

// ========== ERROR CLASSIFIER ==========
function classifyError(item) {
  var q = (item.qText || '').toLowerCase();
  var c = (item.correct || '').toLowerCase();
  var ch = (item.chosen || '').toLowerCase();

  var types = [];

  // 1. Negation trap (EXCEPT, NOT, INCORRECT)
  if (/except|not |incorrect|false|wrong|never|least/.test(q)) {
    types.push('negation_trap');
  }

  // 2. Closest distractor — chose option numerically adjacent to correct
  if (item.correct && item.chosen) {
    var cMatch = item.correct.match(/^([A-E])/);
    var chMatch = item.chosen.match(/^([A-E])/);
    if (cMatch && chMatch) {
      var diff = Math.abs(cMatch[1].charCodeAt(0) - chMatch[1].charCodeAt(0));
      if (diff === 1) types.push('adjacent_distractor');
    }
  }

  // 3. Partial knowledge — correct topic, wrong detail
  var cWords = new Set(c.split(/\s+/).filter(function(w){ return w.length > 3; }));
  var chWords = new Set(ch.split(/\s+/).filter(function(w){ return w.length > 3; }));
  var overlap = 0;
  cWords.forEach(function(w){ if (chWords.has(w)) overlap++; });
  var total = Math.max(cWords.size, 1);
  if (overlap / total > 0.3 && c !== ch) {
    types.push('partial_knowledge');
  }

  // 4. Speed error — easy question wrong
  if (item.difficulty === 'easy') {
    types.push('speed_error');
  }

  // 5. Concept gap — hard question, same topic repeating
  if (item.difficulty === 'hard') {
    types.push('concept_gap');
  }

  // 6. First-option bias
  if (ch.indexOf('A.') === 0 || ch.indexOf('A)') === 0) {
    types.push('first_option_bias');
  }

  // 7. Last-option fallback
  var lastLabels = ['D.', 'D)', 'E.', 'E)'];
  for (var i = 0; i < lastLabels.length; i++) {
    if (ch.indexOf(lastLabels[i]) === 0) {
      types.push('last_option_fallback');
      break;
    }
  }

  return types.length > 0 ? types : ['unknown'];
}

// ========== PATTERN DETECTOR ==========
function detectPatterns(list) {
  if (list.length === 0) return [];

  var patterns = [];
  var total = list.length;

  // Count error types
  var typeCounts = {};
  var sectionCounts = {};
  var difficultyCounts = { easy:0, medium:0, hard:0 };
  var labelCounts = { A:0, B:0, C:0, D:0, E:0 };
  var sectionScores = {};

  list.forEach(function(item){
    var types = classifyError(item);
    types.forEach(function(t){ typeCounts[t] = (typeCounts[t] || 0) + 1; });

    var sec = item.section || 'General';
    if (!sectionCounts[sec]) sectionCounts[sec] = { total:0, hard:0 };
    sectionCounts[sec].total++;
    if (item.difficulty === 'hard') sectionCounts[sec].hard++;

    var d = item.difficulty || 'medium';
    difficultyCounts[d] = (difficultyCounts[d] || 0) + 1;

    var ch = (item.chosen || '').match(/^([A-E])/);
    if (ch) labelCounts[ch[1]] = (labelCounts[ch[1]] || 0) + 1;

    if (!sectionScores[sec]) sectionScores[sec] = { mistakes:0, hard:0 };
    sectionScores[sec].mistakes++;
    if (item.difficulty === 'hard') sectionScores[sec].hard++;
  });

  // Pattern: dominant error type
  var dominantType = null;
  var dominantCount = 0;
  for (var t in typeCounts) {
    if (typeCounts[t] > dominantCount && t !== 'unknown') {
      dominantCount = typeCounts[t];
      dominantType = t;
    }
  }
  if (dominantType && dominantCount / total >= 0.2) {
    var msg = '';
    var drill = '';
    switch (dominantType) {
      case 'negation_trap':
        msg = 'You fall for NEGATION traps (' + dominantCount + 'x). Questions with EXCEPT/NOT/INCORRECT trip you up.';
        drill = 'Practice: read the last word of every question FIRST. Circle negative words. Do 10 "EXCEPT" questions.';
        break;
      case 'adjacent_distractor':
        msg = 'You pick the ADJACENT option (' + dominantCount + 'x). You narrow it down to 2 but choose the wrong one.';
        drill = 'Practice: when stuck between 2 options, re-read the question. Look for the word that makes one wrong.';
        break;
      case 'partial_knowledge':
        msg = 'PARTIAL KNOWLEDGE errors (' + dominantCount + 'x). You know the topic but miss the specific detail.';
        drill = 'Focus on exact definitions, numbers, and exceptions within your weak topics.';
        break;
      case 'speed_error':
        msg = 'SPEED errors (' + dominantCount + 'x). You get easy questions wrong — reading too fast.';
        drill = 'Do 20 easy questions untimed. Then retry with timer. Target: 100% on easy before moving to medium.';
        break;
      case 'concept_gap':
        msg = 'CONCEPT GAP detected (' + dominantCount + 'x). Hard questions in the same topic keep tripping you.';
        drill = 'Review fundamentals in your weakest section. Do 5 medium questions → if 80%+, attempt hard.';
        break;
      case 'first_option_bias':
        msg = 'FIRST OPTION BIAS (' + dominantCount + 'x). You pick A without reading all options.';
        drill = 'Force yourself to read ALL options before choosing. Cover options, read each aloud.';
        break;
      case 'last_option_fallback':
        msg = 'LAST OPTION FALLBACK (' + dominantCount + 'x). You pick D/E when unsure — guessing pattern.';
        drill = 'When unsure, eliminate 2 wrong options first, then choose from remaining. Avoid last-option default.';
        break;
    }
    if (msg) patterns.push({ type: dominantType, severity: 'high', message: msg, drill: drill, count: dominantCount });
  }

  // Pattern: weakest section
  var worstSection = null;
  var worstPct = 0;
  for (var s in sectionCounts) {
    var pct = sectionCounts[s].hard / Math.max(sectionCounts[s].total, 1);
    if (pct > worstPct && sectionCounts[s].total >= 2) {
      worstPct = pct;
      worstSection = s;
    }
  }
  if (worstSection && worstPct > 0.3) {
    patterns.push({
      type: 'weakest_section',
      severity: worstPct > 0.6 ? 'high' : 'medium',
      message: 'Your weakest section is "' + worstSection + '" (' + Math.round(worstPct * 100) + '% hard errors).',
      drill: 'Drill ' + worstSection + ' specifically. Start with 10 medium questions. Only move to hard when you hit 80%+.',
      count: Math.round(worstPct * 100)
    });
  }

  // Pattern: option label bias
  var maxLabel = null;
  var maxLabelCount = 0;
  for (var l in labelCounts) {
    if (labelCounts[l] > maxLabelCount) {
      maxLabelCount = labelCounts[l];
      maxLabel = l;
    }
  }
  if (maxLabel && maxLabelCount / total > 0.35 && total >= 5) {
    patterns.push({
      type: 'label_bias',
      severity: 'medium',
      message: 'You pick option ' + maxLabel + ' disproportionately (' + Math.round(maxLabelCount / total * 100) + '% of wrong answers).',
      drill: 'Randomize your guessing. When unsure, assign A/B/C/D to scratch paper and pick blindly.',
      count: maxLabelCount
    });
  }

  // Pattern: high hard-question ratio
  var hardPct = difficultyCounts.hard / Math.max(total, 1);
  if (hardPct > 0.4 && total >= 5) {
    patterns.push({
      type: 'hard_question_overload',
      severity: 'medium',
      message: Math.round(hardPct * 100) + '% of your mistakes are HARD questions. You attempt too-hard questions without foundation.',
      drill: 'Stop doing hard questions until you hit 80%+ on medium in the same topic. Build up layers.',
      count: difficultyCounts.hard
    });
  }

  return patterns;
}

// ========== OVERALL PROFILE ==========
function generateProfile(patterns, list) {
  if (patterns.length === 0) {
    return { label: 'No clear pattern yet', emoji: '📖', suggestion: 'Practice more papers to get personalized AI analysis.' };
  }

  var highCount = 0;
  patterns.forEach(function(p){ if (p.severity === 'high') highCount++; });

  if (highCount >= 2) {
    return { label: 'Needs focused improvement', emoji: '🎯', suggestion: 'You have ' + highCount + ' critical patterns. Focus on one at a time.' };
  }
  if (highCount === 1) {
    return { label: 'One key pattern to fix', emoji: '💡', suggestion: 'Fix your dominant error type first — it will improve everything else.' };
  }
  return { label: 'Improving steadily', emoji: '📈', suggestion: 'No major red flags. Keep practicing and review weak sections.' };
}

// ========== MAIN ANALYSIS ==========
window.runAIAnalysis = function(list) {
  if (!list || list.length === 0) {
    return { patterns: [], profile: { label: 'No data yet', emoji: '📖', suggestion: 'Complete some papers first.' }, totalMistakes: 0 };
  }

  // Cache analysis result
  var analysis = {
    patterns: detectPatterns(list),
    profile: null,
    totalMistakes: list.length,
    analyzedAt: new Date().toISOString()
  };
  analysis.profile = generateProfile(analysis.patterns, list);
  localStorage.setItem(ANALYSIS_KEY, JSON.stringify(analysis));
  return analysis;
};

window.getAICachedAnalysis = function() {
  try {
    return JSON.parse(localStorage.getItem(ANALYSIS_KEY));
  } catch(e) { return null; }
};

// ========== RENDER INSIGHTS ON MISTAKES PAGE ==========
window.renderAIInsights = function(containerId, list) {
  var container = document.getElementById(containerId);
  if (!container) return;

  var analysis = window.runAIAnalysis(list);
  var patterns = analysis.patterns;
  var profile = analysis.profile;

  if (patterns.length === 0) {
    container.innerHTML = '';
    return;
  }

  var html = '';

  // Profile banner
  html += '<div style="margin-bottom:16px;padding:16px 20px;border-radius:12px;border:1px solid rgba(167,139,250,.15);background:linear-gradient(135deg,rgba(167,139,250,.05),rgba(52,211,153,.03))">';
  html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">';
  html += '<span style="font-size:1.5em">' + (profile.emoji || '🤖') + '</span>';
  html += '<div><div style="font-weight:700;font-size:.9em">AI Analysis: <span style="color:var(--purple)">' + (profile.label || '') + '</span></div>';
  html += '<div style="font-size:.78em;color:var(--text-secondary);margin-top:2px">' + (profile.suggestion || '') + '</div></div>';
  html += '</div>';
  html += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">';

  // Severity badges
  var highCount = 0, medCount = 0;
  patterns.forEach(function(p){
    if (p.severity === 'high') highCount++;
    else if (p.severity === 'medium') medCount++;
  });
  if (highCount > 0) html += '<span style="font-size:.72em;padding:3px 10px;border-radius:100px;background:rgba(239,68,68,.12);color:#ef4444;font-weight:600">🔴 ' + highCount + ' critical</span>';
  if (medCount > 0) html += '<span style="font-size:.72em;padding:3px 10px;border-radius:100px;background:rgba(251,191,36,.12);color:#fbbf24;font-weight:600">🟡 ' + medCount + ' moderate</span>';
  html += '<span style="font-size:.72em;padding:3px 10px;border-radius:100px;background:rgba(255,255,255,.04);color:var(--text-muted);font-weight:500">' + analysis.totalMistakes + ' mistakes analyzed</span>';

  html += '</div></div>';

  // Pattern cards
  patterns.forEach(function(p, i){
    var borderColor = p.severity === 'high' ? 'rgba(239,68,68,.2)' : 'rgba(251,191,36,.2)';
    var bgColor = p.severity === 'high' ? 'rgba(239,68,68,.03)' : 'rgba(251,191,36,.03)';
    var accentColor = p.severity === 'high' ? '#ef4444' : '#fbbf24';

    html += '<div style="padding:14px 16px;margin-bottom:8px;border-radius:10px;border:1px solid ' + borderColor + ';background:' + bgColor + '">';
    html += '<div style="display:flex;justify-content:space-between;align-items:start;gap:8px;margin-bottom:6px">';
    html += '<div style="font-size:.82em;font-weight:600;color:' + accentColor + ';line-height:1.4">' + p.message + '</div>';
    html += '<span style="font-size:.68em;padding:2px 8px;border-radius:100px;background:' + (p.severity === 'high' ? 'rgba(239,68,68,.1)' : 'rgba(251,191,36,.1)') + ';color:' + accentColor + ';white-space:nowrap;flex-shrink:0">' + p.count + 'x</span>';
    html += '</div>';
    html += '<div style="font-size:.78em;color:var(--text-secondary);line-height:1.5">💡 ' + p.drill + '</div>';
    html += '</div>';
  });

  container.innerHTML = html;
};

})();
