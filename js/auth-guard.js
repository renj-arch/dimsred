(function(){
  if (window.location.pathname.indexOf('login.html') >= 0) return;
  if (window.location.pathname.indexOf('guest-login.html') >= 0) return;
  if (window.location.hash && window.location.hash.indexOf('access_token') >= 0) return;
  if (localStorage.getItem('sb_access_token')) return;
  if (localStorage.getItem('sb_guest_token')) return;
  // Skip redirect for search engine crawlers
  if (/bot|crawler|spider|google|bing|yahoo|slurp|baidu|yandex|facebook|twitter/i.test(navigator.userAgent)) return;
  // Skip redirect for AdSense crawler
  if (window.location.search.indexOf('google_ads') >= 0 || window.location.search.indexOf('adsense') >= 0) return;
  var redirect = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.replace('/login.html?redirect=' + redirect);
})();
