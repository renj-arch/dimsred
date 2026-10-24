(function(){
  var PER_PAGE = 4;
  var section = document.querySelector('.section');
  if (!section) return;
  var cards = section.querySelectorAll('.paper-card');
  if (cards.length <= PER_PAGE) return;

  // Group all cards into a container for clean pagination
  var wrapper = document.createElement('div');
  wrapper.className = 'papers-grid';
  cards.forEach(function(c) { wrapper.appendChild(c); });
  section.insertBefore(wrapper, section.querySelector('.pagination-controls'));

  var page = 0;
  var totalPages = Math.ceil(cards.length / PER_PAGE);

  var controls = document.createElement('div');
  controls.className = 'pagination-controls';
  controls.innerHTML =
    '<button class="pag-btn pag-prev" disabled>&#x25C0; Prev</button>' +
    '<span class="pag-info">Page <span class="pag-current">1</span> of ' + totalPages + '</span>' +
    '<button class="pag-btn pag-next">Next &#x25B6;</button>';

  section.appendChild(controls);

  function showPage(p) {
    page = p;
    cards.forEach(function(c, i) {
      c.style.display = (i >= page * PER_PAGE && i < (page + 1) * PER_PAGE) ? '' : 'none';
    });
    controls.querySelector('.pag-current').textContent = page + 1;
    controls.querySelector('.pag-prev').disabled = page === 0;
    controls.querySelector('.pag-next').disabled = page >= totalPages - 1;
  }

  controls.querySelector('.pag-prev').addEventListener('click', function() {
    if (page > 0) showPage(page - 1);
  });
  controls.querySelector('.pag-next').addEventListener('click', function() {
    if (page < totalPages - 1) showPage(page + 1);
  });

  showPage(0);
})();
