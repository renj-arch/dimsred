(function(){
  var API = '/api/validate-code';

  // If URL has ?uid=... validate it server-side, store result, redirect clean
  var params = new URLSearchParams(window.location.search);
  if (params.has('uid')) {
    var code = params.get('uid');
    fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: code }) })
      .then(function(r){ return r.json(); })
      .then(function(data){
        if (data.valid) {
          localStorage.setItem('auth_bypass', code);
        }
        var clean = window.location.pathname;
        window.location.replace(clean);
      })
      .catch(function(){
        var clean = window.location.pathname;
        window.location.replace(clean);
      });
    return;
  }

  if (window.location.pathname.indexOf('login.html') >= 0) return;
  if (window.location.hash && window.location.hash.indexOf('access_token') >= 0) return;
  if (localStorage.getItem('sb_access_token')) return;

  // Validate stored bypass code server-side (async, non-blocking)
  var stored = localStorage.getItem('auth_bypass');
  if (stored) {
    fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: stored }) })
      .then(function(r){ return r.json(); })
      .then(function(data){
        if (!data.valid) {
          localStorage.removeItem('auth_bypass');
          var redirect = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.replace('/login.html?redirect=' + redirect);
        }
      });
    return; // allow access while validating asynchronously
  }

  var redirect = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.replace('/login.html?redirect=' + redirect);
})();
