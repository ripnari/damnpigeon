/* Shared site chrome — nav behaviour, mobile menu, and a cart that survives
   moving between pages. Storage is wrapped: if it's unavailable the cart just
   falls back to memory for the session instead of breaking the page. */
(function () {
  var KEY = 'dpny_bag_v1';
  var mem = null;

  function read() {
    if (mem) return mem;
    try { mem = JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch (e) { mem = {}; }
    return mem;
  }
  function write(v) {
    mem = v;
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {}
    paintCount();
  }

  window.DPBag = {
    all:   function () { return read(); },
    count: function () {
      var b = read(), n = 0;
      for (var k in b) n += (b[k].qty || 0);
      return n;
    },
    add: function (key, item) {
      var b = read();
      if (b[key]) b[key].qty += (item.qty || 1);
      else b[key] = item;
      write(b);
    },
    setQty: function (key, d) {
      var b = read();
      if (!b[key]) return;
      b[key].qty += d;
      if (b[key].qty <= 0) delete b[key];
      write(b);
    },
    remove: function (key) { var b = read(); delete b[key]; write(b); },
    clear:  function () { write({}); }
  };

  function paintCount() {
    var n = window.DPBag.count();
    document.querySelectorAll('[data-bagcount]').forEach(function (el) { el.textContent = n; });
  }
  window.DPBag.paintCount = paintCount;

  document.addEventListener('DOMContentLoaded', function () {
    paintCount();

    // mobile menu
    var btn = document.querySelector('.menu-btn');
    var drop = document.getElementById('mobilenav');
    if (btn && drop) {
      btn.addEventListener('click', function () {
        var open = drop.classList.toggle('open');
        btn.textContent = open ? '×' : '≡';
      });
    }

    // solid nav on scroll
    var bar = document.querySelector('.bar');
    if (bar) {
      var onScroll = function () { bar.classList.toggle('solid', window.scrollY > 40); };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
  });
})();
