(function() {
  var key = 'vlymbooq_theme';
  var saved = localStorage.getItem(key);
  var isLight = saved === 'light';
  var root = document.documentElement;
  function apply(light) {
    if (light) { root.classList.add('light'); } else { root.classList.remove('light'); }
  }
  apply(isLight);
  var btn = document.getElementById('themeToggle');
  if (btn) {
    btn.textContent = isLight ? '☀️' : '🌙';
    btn.onclick = function(e) {
      e.preventDefault();
      isLight = !isLight;
      apply(isLight);
      localStorage.setItem(key, isLight ? 'light' : 'dark');
      btn.textContent = isLight ? '☀️' : '🌙';
    };
  }

  // ===== Study Vibe (applies across all pages) =====
  try {
    var vibes = [
      { id: 'rainy', label: '🌧️ Midnight Rain', bg: '#0a0a1a', bgCard: '#12121e', purple: '#7c9bfc', emerald: '#5eead4' },
      { id: 'library', label: '📚 Scholar\'s Nook', bg: '#0d0b09', bgCard: '#141110', purple: '#d4a574', emerald: '#a8b59a' },
      { id: 'coffee', label: '☕ Velvet Dawn', bg: '#120e0a', bgCard: '#1a1410', purple: '#e8a87c', emerald: '#b5a88a' },
      { id: 'nightowl', label: '🦉 Night Owl', bg: '#050508', bgCard: '#0a0a0e', purple: '#7c6ff0', emerald: '#4ade80' }
    ];
    var savedVibe = localStorage.getItem('studypro_vibe');
    function applyVibe(vibeId) {
      var v = null;
      for (var i = 0; i < vibes.length; i++) {
        if (vibes[i].id === vibeId) { v = vibes[i]; break; }
      }
      if (!v) return;
      var r = document.documentElement;
      r.style.setProperty('--bg', v.bg);
      r.style.setProperty('--bg-card', v.bgCard);
      r.style.setProperty('--purple', v.purple);
      r.style.setProperty('--emerald', v.emerald);
      localStorage.setItem('studypro_vibe', vibeId);
    }
    if (savedVibe) { applyVibe(savedVibe); }
    window.vibes = vibes;
    window.applyVibe = applyVibe;
  } catch(e) {}
})();
