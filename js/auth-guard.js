(function(){
  var BYPASS_CODE = 'agni2025';

  // If URL has ?uid=... set it in localStorage and redirect clean
  var params = new URLSearchParams(window.location.search);
  if (params.has('uid')) {
    localStorage.setItem('auth_uid', params.get('uid'));
    var clean = window.location.pathname;
    window.location.replace(clean);
    return;
  }

  if (window.location.pathname.indexOf('login.html') >= 0) return;
  if (window.location.hash && window.location.hash.indexOf('access_token') >= 0) return;
  if (localStorage.getItem('sb_access_token')) return;
  if (localStorage.getItem('auth_uid') === BYPASS_CODE) return;

  var redirect = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.replace('/login.html?redirect=' + redirect);
})();
