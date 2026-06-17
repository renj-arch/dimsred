// =============================================
// CROSS-ENGINE SYSTEM v1
// Unified performance system connecting all 3 engines
// Selection probability estimator + ROI analyzer
// =============================================
(function(){
var CACHE_KEY = 'smart_cross_cache';

// ========== SELECTION PROBABILITY ESTIMATOR ==========
function estimateSelectionProbability(enAnalysis, qtAnalysis, rsAnalysis) {
  var prob = {
    overall: 0,
    bySection: { english: 0, quant: 0, reasoning: 0 },
    confidence: 'low',
    gaps: [],
    fastestPath: null
  };

  // Normalize scores (0-100)
  var enScore = enAnalysis?.level?.score || 0;
  var qtScore = qtAnalysis?.level?.score || 0;
  var rsScore = rsAnalysis?.level?.score || 0;

  prob.bySection = { english: enScore, quant: qtScore, reasoning: rsScore };

  // Weighted overall (depends on exam — default SSC CGL: all equal)
  prob.overall = Math.round((enScore + qtScore + rsScore) / 3);

  // Confidence based on data volume
  var dataPoints = 0;
  if (enAnalysis && enAnalysis.fingerprint) dataPoints += enAnalysis.fingerprint.totalQuestions || 0;
  if (qtAnalysis && qtAnalysis.speedSignature) dataPoints += Object.keys(qtAnalysis.operations || {}).length * 5;
  if (rsAnalysis && rsAnalysis.patternBreakdown) dataPoints += rsAnalysis.patternBreakdown.length * 3;

  prob.confidence = dataPoints < 20 ? 'low' : (dataPoints < 50 ? 'medium' : 'high');

  // Score prediction range
  var baseRange = prob.overall;
  var variance = prob.confidence === 'low' ? 25 : (prob.confidence === 'medium' ? 15 : 8);
  prob.predictionRange = {
    min: Math.max(0, baseRange - variance),
    max: Math.min(100, baseRange + variance),
    current: baseRange,
    label: baseRange - variance + '% – ' + (baseRange + variance) + '%'
  };

  // Gaps — sections dragging overall down
  var weakSections = [];
  if (enScore < 40) weakSections.push({ section: 'English', score: enScore, impact: 'high', weight: 0.35 });
  else if (enScore < 60) weakSections.push({ section: 'English', score: enScore, impact: 'medium', weight: 0.2 });
  if (qtScore < 40) weakSections.push({ section: 'Quant', score: qtScore, impact: 'high', weight: 0.4 });
  else if (qtScore < 60) weakSections.push({ section: 'Quant', score: qtScore, impact: 'medium', weight: 0.25 });
  if (rsScore < 40) weakSections.push({ section: 'Reasoning', score: rsScore, impact: 'high', weight: 0.35 });
  else if (rsScore < 60) weakSections.push({ section: 'Reasoning', score: rsScore, impact: 'medium', weight: 0.2 });
  prob.gaps = weakSections;

  // Fastest improvement path — highest ROI section
  weakSections.sort(function(a,b){ return b.weight - a.weight; });
  prob.fastestPath = weakSections[0] || null;

  // Improvement ROI
  prob.roi = generateROI(enScore, qtScore, rsScore, weakSections);

  return prob;
}

// ========== IMPROVEMENT ROI ANALYZER ==========
function generateROI(enScore, qtScore, rsScore, weakSections) {
  var roi = { topics: [], estimatedMarksGain: 0, timeRequired: 0 };

  // Per-section ROI
  if (enScore < 50) {
    roi.topics.push({ section: 'English', currentScore: enScore, potentialGain: Math.round((50 - enScore) * 0.6), estimatedHours: 8, priority: 'high', strategy: 'Focus on top 3 grammar rules + vocabulary spaced repetition' });
  }
  if (qtScore < 50) {
    roi.topics.push({ section: 'Quant', currentScore: qtScore, potentialGain: Math.round((50 - qtScore) * 0.7), estimatedHours: 12, priority: 'high', strategy: 'Master 5 key shortcuts + daily mental math drills' });
  }
  if (rsScore < 50) {
    roi.topics.push({ section: 'Reasoning', currentScore: rsScore, potentialGain: Math.round((50 - rsScore) * 0.65), estimatedHours: 10, priority: 'high', strategy: 'Pattern mutation practice + trap recognition drills' });
  }

  // If all scores > 50, suggest optimization
  if (roi.topics.length === 0) {
    roi.topics.push({ section: 'Overall', currentScore: Math.round((enScore + qtScore + rsScore) / 3), potentialGain: 10, estimatedHours: 15, priority: 'medium', strategy: 'Refine speed across all sections. Target: 15s/quant, 20s/reasoning, 30s/reading' });
  }

  roi.estimatedMarksGain = roi.topics.reduce(function(s, t){ return s + (t.potentialGain || 0); }, 0);
  roi.timeRequired = roi.topics.reduce(function(s, t){ return s + (t.estimatedHours || 0); }, 0);

  return roi;
}

// ========== MOST TIME-EFFICIENT TOPICS ==========
function findEfficientTopics(enAnalysis, qtAnalysis, rsAnalysis) {
  var topics = [];

  // English: vocab has highest ROI per minute
  if (enAnalysis) {
    topics.push({ section: 'English', topic: 'Vocabulary (high-frequency words)', roi: 0.8, timePerUnit: '5 min/day', marksImpact: '3-5 marks' });
    topics.push({ section: 'English', topic: 'Top 3 grammar rules', roi: 0.7, timePerUnit: '10 min/day', marksImpact: '4-6 marks' });
  }

  // Quant: shortcuts give highest time savings
  if (qtAnalysis) {
    var unknownShortcuts = qtAnalysis.unknownShortcuts || [];
    if (unknownShortcuts.length > 0) {
      topics.push({ section: 'Quant', topic: 'Learn ' + unknownShortcuts.length + ' unmastered shortcuts', roi: 0.9, timePerUnit: '15 min', marksImpact: 'Saves 5-10 min total' });
    }
    topics.push({ section: 'Quant', topic: 'Mental math (squares up to 100)', roi: 0.75, timePerUnit: '5 min/day', marksImpact: '3-5 marks' });
  }

  // Reasoning: pattern recognition improves multiple questions
  if (rsAnalysis) {
    var weakPatterns = rsAnalysis.weakPatterns || [];
    if (weakPatterns.length > 0) {
      topics.push({ section: 'Reasoning', topic: 'Fix ' + weakPatterns[0].label + ' patterns', roi: 0.85, timePerUnit: '10 min/day', marksImpact: '4-6 marks' });
    }
    topics.push({ section: 'Reasoning', topic: 'Trap recognition practice', roi: 0.7, timePerUnit: '8 min/day', marksImpact: '2-3 marks' });
  }

  topics.sort(function(a,b){ return b.roi - a.roi; });
  return topics;
}

// ========== WEAKNESS-TO-MARKS CONVERTER ==========
function weaknessToMarks(enAnalysis, qtAnalysis, rsAnalysis) {
  var conversion = [];
  var totalPotential = 0;

  if (enAnalysis) {
    var fp = enAnalysis.fingerprint;
    if (fp) {
      var grammarMarks = Math.round(fp.grammarMisfireRate * 10);
      var vocabMarks = Math.round((1 - fp.vocabRetentionRate) * 5);
      var confMarks = Math.round(fp.confidenceAccuracyGap * 5);
      if (grammarMarks > 0) { conversion.push({ from: 'Grammar errors', marksLost: grammarMarks, recoveryPotential: Math.round(grammarMarks * 0.7), strategy: 'Drill top 3 error rules' }); totalPotential += grammarMarks; }
      if (vocabMarks > 0) { conversion.push({ from: 'Weak vocabulary retention', marksLost: vocabMarks, recoveryPotential: Math.round(vocabMarks * 0.8), strategy: 'Spaced repetition of weak words' }); totalPotential += vocabMarks; }
      if (confMarks > 0) { conversion.push({ from: 'Confidence-accuracy gap', marksLost: confMarks, recoveryPotential: Math.round(confMarks * 0.5), strategy: 'Review before confirming answers' }); totalPotential += confMarks; }
    }
  }

  if (qtAnalysis) {
    var sig = qtAnalysis.speedSignature;
    if (sig) {
      var timeMarks = Math.round((60 - Math.min(60, sig.timePerMark)) / 10);
      var shortcutMarks = Math.round((1 - (sig.shortcutAdoptionRate || 0)) * 5);
      var mentalMarks = Math.round((1 - (sig.mentalMathEfficiency || 0)) * 5);
      if (timeMarks > 0) { conversion.push({ from: 'Slow solving speed', marksLost: timeMarks, recoveryPotential: Math.round(timeMarks * 0.6), strategy: 'Daily timed drills with shortcuts' }); totalPotential += timeMarks; }
      if (shortcutMarks > 0) { conversion.push({ from: 'Low shortcut adoption', marksLost: shortcutMarks, recoveryPotential: Math.round(shortcutMarks * 0.8), strategy: 'Force-use shortcuts in practice' }); totalPotential += shortcutMarks; }
      if (mentalMarks > 0) { conversion.push({ from: 'Mental math weakness', marksLost: mentalMarks, recoveryPotential: Math.round(mentalMarks * 0.7), strategy: '10 squaring drills daily' }); totalPotential += mentalMarks; }
    }
  }

  if (rsAnalysis) {
    var firstLookRate = parseFloat(rsAnalysis.firstLookRate) / 100 || 0.5;
    var impulsivity = parseFloat(rsAnalysis.impulsivityScore) / 100 || 0;
    var trapAware = rsAnalysis.trapAwareness?.trapCaughtRate || 0.5;
    if (firstLookRate < 0.6) { conversion.push({ from: 'Low first-look accuracy', marksLost: Math.round((0.6 - firstLookRate) * 10), recoveryPotential: Math.round((0.6 - firstLookRate) * 8), strategy: 'Practice question-type identification' }); totalPotential += 6; }
    if (impulsivity > 0.3) { conversion.push({ from: 'Impulsive answering', marksLost: Math.round(impulsivity * 8), recoveryPotential: Math.round(impulsivity * 6), strategy: '5-second pause rule before submitting' }); totalPotential += 5; }
    if (trapAware < 0.5) { conversion.push({ from: 'Trap vulnerability', marksLost: Math.round((0.5 - trapAware) * 8), recoveryPotential: Math.round((0.5 - trapAware) * 6), strategy: 'Study SSC trap types' }); totalPotential += 4; }
  }

  return { breakdown: conversion, totalRecoverableMarks: totalPotential };
}

// ========== UNIFIED ANALYSIS ==========
window.runCrossEngine = function(force) {
  var enAnalysis = window.getEnglishAnalysis();
  var qtAnalysis = window.getQuantAnalysis();
  var rsAnalysis = window.getReasoningAnalysis();

  if (!enAnalysis && !qtAnalysis && !rsAnalysis) return null;

  var selectionProb = estimateSelectionProbability(enAnalysis, qtAnalysis, rsAnalysis);
  var efficientTopics = findEfficientTopics(enAnalysis, qtAnalysis, rsAnalysis);
  var marksConversion = weaknessToMarks(enAnalysis, qtAnalysis, rsAnalysis);

  // Combine all recommendations
  var allRecs = [];
  if (enAnalysis && enAnalysis.recommendations) allRecs = allRecs.concat(enAnalysis.recommendations.map(function(r){ return { text: r, source: 'english' }; }));
  if (qtAnalysis && qtAnalysis.recommendations) allRecs = allRecs.concat(qtAnalysis.recommendations.map(function(r){ return { text: r, source: 'quant' }; }));
  if (rsAnalysis && rsAnalysis.recommendations) allRecs = allRecs.concat(rsAnalysis.recommendations.map(function(r){ return { text: r, source: 'reasoning' }; }));

  var result = {
    selectionProbability: selectionProb,
    efficientTopics: efficientTopics,
    weaknessesToMarks: marksConversion,
    allRecommendations: allRecs,
    levels: {
      english: enAnalysis?.level || { level: '—', label: 'No data', score: 0 },
      quant: qtAnalysis?.level || { level: '—', label: 'No data', score: 0 },
      reasoning: rsAnalysis?.level || { level: '—', label: 'No data', score: 0 }
    },
    overallScore: selectionProb.overall,
    topRecommendation: selectionProb.fastestPath?.section || 'Start practicing to get data'
  };

  localStorage.setItem(CACHE_KEY, JSON.stringify(result));
  return result;
};

window.getCrossAnalysis = function() {
  var cached = localStorage.getItem(CACHE_KEY);
  if (cached) { try { return JSON.parse(cached); } catch(e) {} }
  return window.runCrossEngine();
};

// ========== RENDER COMBINED DASHBOARD ==========
window.renderSmartDashboard = function(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;

  var cross = window.runCrossEngine();
  if (!cross) {
    container.innerHTML = '<div class="empty-state" style="padding:40px;text-align:center"><div class="icon" style="font-size:2.5em">📊</div><p style="color:var(--text-muted);margin-top:8px">Practice more questions to unlock your Smart Performance Dashboard. Need data from English, Quant, and Reasoning sections.</p></div>';
    return;
  }

  var html = '';

  // ====== LEVELS SECTION ======
  html += '<div style="margin-bottom:20px">';
  html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">';
  html += levelCard('English', cross.levels.english);
  html += levelCard('Quant', cross.levels.quant);
  html += levelCard('Reasoning', cross.levels.reasoning);
  html += '</div></div>';

  // ====== SELECTION PROBABILITY ======
  var sp = cross.selectionProbability;
  var probColor = sp.overall >= 70 ? '#34d399' : (sp.overall >= 50 ? '#fbbf24' : '#ef4444');
  html += '<div style="padding:16px 18px;border-radius:12px;border:1px solid ' + probColor.replace(')', ',.2)').replace('rgb', 'rgba') + ';background:' + probColor.replace(')', ',.05)').replace('rgb', 'rgba') + ';margin-bottom:16px">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">';
  html += '<div><span style="font-size:.85em;font-weight:700;color:var(--text)">🎯 Selection Probability</span>';
  html += '<div style="font-size:.72em;color:var(--text-muted);margin-top:2px">Range: ' + sp.predictionRange.label + ' · Confidence: ' + sp.confidence + '</div></div>';
  html += '<div style="font-size:2em;font-weight:900;color:' + probColor + '">' + sp.overall + '%</div></div>';

  // Score prediction bar
  html += '<div style="margin-top:10px"><div style="display:flex;justify-content:space-between;font-size:.72em;color:var(--text-muted)"><span>Min: ' + sp.predictionRange.min + '%</span><span>Current: ' + sp.overall + '%</span><span>Max: ' + sp.predictionRange.max + '%</span></div>';
  html += '<div style="height:6px;background:rgba(255,255,255,.06);border-radius:100px;margin-top:2px;overflow:hidden;position:relative">';
  html += '<div style="position:absolute;left:' + sp.predictionRange.min + '%;width:' + (sp.predictionRange.max - sp.predictionRange.min) + '%;height:100%;background:rgba(167,139,250,.2);border-radius:100px"></div>';
  html += '<div style="height:100%;width:' + sp.overall + '%;background:linear-gradient(90deg,' + probColor + ',' + probColor + '80);border-radius:100px;transition:width .5s;position:relative;z-index:1"></div>';
  html += '</div></div></div>';

  // ====== FASTEST IMPROVEMENT PATH ======
  if (sp.fastestPath || cross.topRecommendation) {
    html += '<div style="padding:14px 16px;border-radius:10px;border:1px solid rgba(167,139,250,.15);background:rgba(167,139,250,.04);margin-bottom:16px">';
    html += '<div style="font-size:.82em;font-weight:600;color:var(--purple);margin-bottom:6px">🚀 Fastest Improvement Path</div>';
    html += '<div style="font-size:.8em;color:var(--text-sec)">';
    if (sp.fastestPath) {
      html += 'Focus on <strong>' + sp.fastestPath.section + '</strong> (current: ' + sp.fastestPath.score + '%). ' + sp.fastestPath.impact + ' impact on overall score.';
      if (cross.weaknessesToMarks.totalRecoverableMarks > 0) {
        html += ' Potential recovery: <strong style="color:#34d399">+' + cross.weaknessesToMarks.totalRecoverableMarks + ' marks</strong>.';
      }
    } else {
      html += cross.topRecommendation;
    }
    html += '</div></div>';
  }

  // ====== ROI TOPICS ======
  if (cross.efficientTopics.length > 0) {
    html += '<div style="margin-bottom:16px"><div style="font-size:.82em;font-weight:700;margin-bottom:8px">📈 Best ROI Topics</div>';
    cross.efficientTopics.slice(0, 4).forEach(function(t, i){
      html += '<div style="padding:10px 12px;margin-bottom:4px;border-radius:8px;border:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:8px">';
      html += '<div style="flex:1"><span style="font-size:.78em;font-weight:600">' + t.topic + '</span><div style="font-size:.7em;color:var(--text-muted);margin-top:1px">' + t.timePerUnit + ' · ' + t.marksImpact + '</div></div>';
      html += '<span style="font-size:.7em;padding:2px 8px;border-radius:100px;background:rgba(52,211,153,.12);color:#34d399;font-weight:600">ROI: ' + (t.roi * 100).toFixed(0) + '%</span>';
      html += '</div>';
    });
    html += '</div>';
  }

  // ====== WEAKNESS-TO-MARKS BREAKDOWN ======
  var wm = cross.weaknessesToMarks;
  if (wm.breakdown && wm.breakdown.length > 0) {
    html += '<div style="margin-bottom:16px"><div style="font-size:.82em;font-weight:700;margin-bottom:8px">📉 Recoverable Marks</div>';
    wm.breakdown.forEach(function(b){
      html += '<div style="padding:8px 12px;margin-bottom:4px;border-radius:8px;border:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:8px">';
      html += '<div style="flex:1"><span style="font-size:.75em;font-weight:500">' + b.from + '</span><div style="font-size:.68em;color:var(--text-muted)">→ ' + b.strategy + '</div></div>';
      html += '<span style="font-size:.7em;padding:2px 8px;border-radius:100px;background:rgba(52,211,153,.12);color:#34d399;white-space:nowrap;font-weight:600">+' + b.recoveryPotential + '</span>';
      html += '</div>';
    });
    html += '<div style="text-align:right;font-size:.78em;color:var(--purple);font-weight:600;margin-top:6px">Total recoverable: +' + wm.totalRecoverableMarks + ' marks</div>';
    html += '</div>';
  }

  // ====== ALL RECOMMENDATIONS ======
  if (cross.allRecommendations.length > 0) {
    html += '<div><div style="font-size:.82em;font-weight:700;margin-bottom:8px">💡 All Recommendations</div>';
    cross.allRecommendations.slice(0, 6).forEach(function(r){
      var icon = r.source === 'english' ? '📖' : (r.source === 'quant' ? '🔢' : '🧩');
      html += '<div style="font-size:.75em;padding:6px 10px;margin-bottom:3px;border-radius:6px;background:rgba(255,255,255,.02);color:var(--text-sec);line-height:1.5">' + icon + ' ' + r.text + '</div>';
    });
    html += '</div>';
  }

  container.innerHTML = html;
};

function levelCard(name, level) {
  if (!level) return '<div style="padding:14px;border-radius:10px;border:1px solid var(--border);text-align:center"><div style="font-size:.75em;color:var(--text-muted)">' + name + '</div><div style="font-size:.85em;color:var(--text-muted);margin-top:4px">No data</div></div>';
  var color = level.score >= 70 ? '#34d399' : (level.score >= 50 ? '#fbbf24' : '#ef4444');
  return '<div style="padding:14px;border-radius:10px;border:1px solid var(--border);text-align:center">' +
    '<div style="font-size:1.5em">' + level.level + '</div>' +
    '<div style="font-size:.78em;font-weight:700;color:' + color + ';margin:2px 0">' + level.label + '</div>' +
    '<div style="font-size:1.1em;font-weight:800;color:' + color + '">' + level.score + '</div>' +
    '<div style="font-size:.65em;color:var(--text-muted)">' + name + '</div></div>';
}

})();
