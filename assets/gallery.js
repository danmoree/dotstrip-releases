// Click a screenshot to open it full size. Arrow keys / swipe to move, Esc or backdrop to close.
(function () {
  var items = Array.prototype.slice.call(document.querySelectorAll('.shot'));
  if (!items.length) return;
  var lb = document.createElement('div');
  lb.className = 'lb';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Screenshot viewer');
  lb.innerHTML = '<button class="x" aria-label="Close">&times;</button>' +
    '<button class="prev" aria-label="Previous screenshot">&#8249;</button>' +
    '<figure><img alt=""><figcaption></figcaption></figure>' +
    '<button class="next" aria-label="Next screenshot">&#8250;</button>';
  document.body.appendChild(lb);
  var img = lb.querySelector('img'), cap = lb.querySelector('figcaption');
  var cur = 0, opener = null;

  function show(i) {
    cur = (i + items.length) % items.length;
    var b = items[cur];
    img.src = b.dataset.full || b.querySelector('img').src;
    img.alt = b.querySelector('img').alt;
    cap.innerHTML = '<b></b><span></span><div class="count"></div>';
    cap.querySelector('b').textContent = b.dataset.title || '';
    cap.querySelector('span').textContent = b.dataset.text || '';
    cap.querySelector('.count').textContent = (cur + 1) + ' / ' + items.length;
  }
  function open(i, from) { opener = from; show(i); lb.classList.add('open'); document.body.style.overflow = 'hidden'; lb.querySelector('.x').focus(); }
  function close() { lb.classList.remove('open'); document.body.style.overflow = ''; if (opener) opener.focus(); }

  items.forEach(function (b, i) { b.addEventListener('click', function () { open(i, b); }); });
  lb.querySelector('.x').addEventListener('click', close);
  lb.querySelector('.prev').addEventListener('click', function () { show(cur - 1); });
  lb.querySelector('.next').addEventListener('click', function () { show(cur + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(cur - 1);
    else if (e.key === 'ArrowRight') show(cur + 1);
  });
  var x0 = null;
  lb.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1));
  }, { passive: true });
})();
