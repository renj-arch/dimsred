(function(){
  if (window.location.pathname.indexOf('login.html') >= 0) return;
  if (window.location.hash && window.location.hash.indexOf('access_token') >= 0) return;
  if (localStorage.getItem('sb_access_token')) return;
  var redirect = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.replace('/login.html?redirect=' + redirect);
})();
