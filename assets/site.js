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

  // ---- journey tracking: every meaningful click gets a name ----
  function track(name, params){ if (window.dpTrack) window.dpTrack(name, params); }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-ev], a, button');
    if (!el) return;
    var page = location.pathname.replace(/^\//,'') || 'index.html';
    // explicit tags first
    if (el.dataset && el.dataset.ev) {
      var params = { page: page };
      Object.keys(el.dataset).forEach(function (k) { if (k !== 'ev') params[k] = el.dataset[k]; });
      track(el.dataset.ev, params); return;
    }
    // navigation: header + mobile menu + footer links
    if (el.tagName === 'A' && el.closest('.bar nav, #mobilenav, footer')) {
      var where = el.closest('footer') ? 'footer' : (el.closest('#mobilenav') ? 'mobile_menu' : 'header');
      track('nav_click', { page: page, location: where, label: (el.textContent||'').trim().slice(0,40), href: el.getAttribute('href') });
      return;
    }
    if (el.classList.contains('bag')) { track('open_bag', { page: page }); return; }
    if (el.classList.contains('menu-btn')) { track('mobile_menu_open', { page: page }); return; }
    // mailto = a development / contact enquiry
    if (el.tagName === 'A' && /^mailto:/.test(el.getAttribute('href')||'')) { track('contact_click', { page: page, subject: (el.getAttribute('href').split('subject=')[1]||'').slice(0,40) }); return; }
  }, true);

  document.addEventListener('DOMContentLoaded', function () {
    paintCount();
    // newsletter signups
    var f = document.getElementById('signup');
    if (f) f.addEventListener('submit', function(){ track('generate_lead', { page: location.pathname, method: 'newsletter' }); });
    // FAQ opens
    document.querySelectorAll('details').forEach(function(d){
      d.addEventListener('toggle', function(){ if (d.open) track('faq_open', { question: (d.querySelector('summary')||{}).textContent.trim().slice(0,60) }); });
    });

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
