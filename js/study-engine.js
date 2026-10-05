// Study Material Engine v1 — renders structured study content into interactive HTML
(function(){

var CONTAINER_ID = 'studyContent';

function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderSection(section, sectionIdx) {
  var h = '<div class="cc-section">';
  h += '<h2 class="cc-section-title" onclick="toggleSection(' + sectionIdx + ')">' + escapeHtml(section.title) + ' <span class="collapse-icon" id="sect-icon-' + sectionIdx + '">▾</span></h2>';
  h += '<div class="cc-topics" id="sect-' + sectionIdx + '">';
  section.topics.forEach(function(topic, tIdx) {
    h += renderTopic(topic, sectionIdx, tIdx);
  });
  h += '</div></div>';
  return h;
}

function renderTopic(topic, sectionIdx, tIdx) {
  var tid = 't-' + sectionIdx + '-' + tIdx;
  var h = '<div class="cc-topic-card" onclick="toggleTopic(\'' + tid + '\')">';
  h += '<div class="cc-topic-header"><span class="cc-topic-name">' + escapeHtml(topic.name) + '</span><span class="collapse-icon" id="topic-icon-' + tid + '">▸</span></div>';
  h += '<div class="cc-topic-body" id="' + tid + '">';
  
  // Subtopics
  if (topic.subtopics && topic.subtopics.length) {
    h += '<div class="cc-subtopics"><strong>Subtopics:</strong> ' + topic.subtopics.join(', ') + '</div>';
  }
  
  // Notes
  if (topic.notes) {
    h += '<div class="cc-notes"><strong>Key Points:</strong><ul>';
    topic.notes.forEach(function(n) { h += '<li>' + n + '</li>'; });
    h += '</ul></div>';
  }
  
  // Formulas
  if (topic.formulas && topic.formulas.length) {
    h += '<div class="cc-formulas"><strong>Formulas:</strong><div class="cc-formula-list">';
    topic.formulas.forEach(function(f) {
      h += '<div class="cc-formula-item">' + f + '</div>';
    });
    h += '</div></div>';
  }
  
  // Examples
  if (topic.examples && topic.examples.length) {
    h += '<div class="cc-examples"><strong>Examples:</strong>';
    topic.examples.forEach(function(ex, ei) {
      h += '<div class="cc-example-item"><div class="cc-example-q">Q' + (ei+1) + ': ' + ex.q + '</div>';
      h += '<div class="cc-example-a">✓ ' + ex.a + '</div></div>';
    });
    h += '</div>';
  }
  
  // Tips
  if (topic.tips && topic.tips.length) {
    h += '<div class="cc-tips"><strong>Tips:</strong><ul>';
    topic.tips.forEach(function(t) { h += '<li>' + t + '</li>'; });
    h += '</ul></div>';
  }
  
  // Practice link
  if (topic.practiceLink) {
    h += '<a href="' + topic.practiceLink + '" class="cc-practice-btn">Practice Now →</a>';
  }
  
  h += '</div></div>';
  return h;
}

window.renderStudyContent = function(data) {
  var el = document.getElementById(CONTAINER_ID);
  if (!el) return;
  var h = '';
  data.sections.forEach(function(section, i) {
    h += renderSection(section, i);
  });
  el.innerHTML = h;
};

window.toggleSection = function(idx) {
  var body = document.getElementById('sect-' + idx);
  var icon = document.getElementById('sect-icon-' + idx);
  if (!body) return;
  var isHidden = body.style.display === 'none';
  body.style.display = isHidden ? 'block' : 'none';
  if (icon) icon.textContent = isHidden ? '▾' : '▸';
};

window.toggleTopic = function(id) {
  var body = document.getElementById(id);
  var icon = document.getElementById('topic-icon-' + id);
  if (!body) return;
  var isHidden = body.style.display === 'none' || body.style.display === '';
  body.style.display = isHidden ? 'block' : 'none';
  if (icon) icon.textContent = isHidden ? '▾' : '▸';
};

})();
