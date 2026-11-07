/*
 * Owner-only GitHub runner, shared by the Mains pack pages.
 *
 * mains.html already lets the owner send a generation request to GitHub
 * Actions instead of compiling a model in the browser. This module gives the
 * answer-writing, optional, language and interview pages the same route:
 * sign in as the owner, tap the button, the site's model writes on GitHub's
 * runners, and the result arrives here.
 *
 * Nothing heavy runs on the visitor's device, and the dispatch is gated
 * server-side by functions/api/on-demand.js (owner email + rate limit).
 */
(function () {
  'use strict';
  var loading = null;

  function load() {
    if (window.OwnerRunner) return Promise.resolve(window.OwnerRunner);
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = '../../js/owner-runner.js';
      s.onload = function () {
        if (window.OwnerRunner) resolve(window.OwnerRunner);
        else reject(new Error('The runner library loaded without an API.'));
      };
      s.onerror = function () { reject(new Error('The runner library could not be loaded.')); };
      document.head.appendChild(s);
    });
    return loading;
  }

  function ready() {
    return load().then(function (R) {
      return R.ready ? R.ready() : R;
    });
  }

  function showIfOwner(button) {
    if (!button) return;
    ready().then(function (state) {
      if (state && state.owner) button.hidden = false;
    }).catch(function () { /* not the owner, or offline: leave it hidden */ });
  }

  function run(kind, payload, onStatus) {
    return load().then(function (R) {
      if (!R || !R.run) throw new Error('The runner API is unavailable.');
      return R.run(kind, payload || {}, {
        onStatus: typeof onStatus === 'function' ? onStatus : function () {}
      });
    });
  }

  window.MainsRunner = {
    load: load,
    ready: ready,
    showIfOwner: showIfOwner,
    run: run
  };
})();
