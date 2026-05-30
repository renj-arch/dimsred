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
})();