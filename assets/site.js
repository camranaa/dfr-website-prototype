/* DFR public site: menu overlay + published articles from the media CMS (db). Public pages only read. */
(function () {
  var overlay = document.getElementById('menu-overlay');
  var openers = document.querySelectorAll('[data-open-menu]');
  var lastFocus = null;
  function openMenu() {
    if (!overlay) return;
    lastFocus = document.activeElement;
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    var c = overlay.querySelector('.close'); if (c) c.focus();
    openers.forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
  }
  function closeMenu() {
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    document.body.style.overflow = '';
    openers.forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (lastFocus) lastFocus.focus();
  }
  openers.forEach(function (b) { b.addEventListener('click', openMenu); });
  if (overlay) {
    overlay.querySelector('.close').addEventListener('click', closeMenu);
    overlay.addEventListener('click', function (e) { if (e.target.tagName === 'A') closeMenu(); });
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
})();

window.DFR = (function () {
  var dbp = null;
  function db() {
    if (!dbp) dbp = (window.claude && window.claude.use) ? window.claude.use('db').catch(function () { return null; }) : Promise.resolve(null);
    return dbp;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  var KU_DIGITS = '٠١٢٣٤٥٦٧٨٩';
  function fmtDate(d) {
    if (!d) return '';
    var p = String(d).slice(0, 10).split('-');
    if (p.length !== 3) return esc(d);
    return p[2] + '/' + p[1] + '/' + p[0];
  }
  // uploaded files: '/_blob/<id>' on the hosted page, a stored data URL in the offline package
  function blob(id) { return (window.DFR_LOCAL && window.DFR_LOCAL.blob(id)) || '/_blob/' + id; }
  function img(id, label) {
    return id ? '<img src="' + esc(blob(id)) + '" alt="" loading="lazy">' : '<div class="ph">' + esc(label || 'وێنە') + '</div>';
  }
  function link(a) { return 'article.html#' + encodeURIComponent(a.id); }
  var REPS = window.DFR_REPS || {};
  // first representation an article is published to (for the "from" badge)
  function repOf(a) { var t = a.targets || []; for (var i = 0; i < t.length; i++) { if (REPS[t[i]]) return t[i]; } return ''; }
  function card(a, opts) {
    var r = (opts && opts.showRep) ? repOf(a) : '';
    var from = r ? '<a class="from" href="rep-' + esc(r) + '.html"><img src="assets/flags/' + esc(r) + '.svg" alt="">' + esc(REPS[r].ku) + '</a>' : '';
    return '<article class="card"><a class="img" href="' + link(a) + '" tabindex="-1" aria-hidden="true">' + img(a.image) + '</a>' +
      '<div class="body"><div class="meta"><span class="date">' + fmtDate(a.date) + '</span>' + (a.subject ? '<span class="chip">' + esc(a.subject) + '</span>' : '') + (a.sample ? '<span class="chip sample">نموونە</span>' : '') + '</div>' +
      (from ? '<div>' + from + '</div>' : '') +
      '<h3><a href="' + link(a) + '">' + esc(a.title) + '</a></h3>' + (a.subtitle ? '<p class="sub">' + esc(a.subtitle) + '</p>' : '') + '</div></article>';
  }
  // render a list into el with numbered pages into pagerEl
  function paged(el, pagerEl, items, per, render, emptyHtml) {
    var pages = Math.max(1, Math.ceil(items.length / per)), cur = 1;
    function go(p) {
      cur = Math.min(Math.max(1, p), pages);
      el.innerHTML = items.length ? items.slice((cur - 1) * per, cur * per).map(render).join('') : emptyHtml;
      if (!pagerEl) return;
      if (pages < 2) { pagerEl.innerHTML = ''; return; }
      var h = '<button type="button" data-p="' + (cur - 1) + '"' + (cur === 1 ? ' disabled' : '') + ' aria-label="لاپەڕەی پێشوو">→</button>';
      for (var i = 1; i <= pages; i++) h += '<button type="button" data-p="' + i + '"' + (i === cur ? ' aria-current="page"' : '') + ' aria-label="لاپەڕەی ' + i + '">' + i + '</button>';
      h += '<button type="button" data-p="' + (cur + 1) + '"' + (cur === pages ? ' disabled' : '') + ' aria-label="لاپەڕەی دواتر">←</button>';
      pagerEl.innerHTML = h;
      Array.prototype.forEach.call(pagerEl.querySelectorAll('[data-p]'), function (b) {
        b.addEventListener('click', function () { go(+b.getAttribute('data-p')); var top = el.getBoundingClientRect().top + window.scrollY - 90; if (window.scrollY > top) window.scrollTo({ top: top, behavior: 'smooth' }); });
      });
    }
    go(1);
  }
  function emptyState(text) {
    return '<div class="empty"><b>هێشتا هیچ بابەتێک بڵاو نەکراوەتەوە</b>' + esc(text || 'بابەتەکان لێرە دەردەکەون کاتێک بەشی میدیا لە سیستەمی بەڕێوەبردنی ناوەڕۆک (CMS) بڵاویان دەکاتەوە.') + '</div>';
  }
  function published() {
    return db().then(function (d) {
      if (!d) return null;
      return d.collection('articles').where('status', '==', 'published').get().then(function (s) {
        return s.docs.map(function (x) { var o = Object.assign({}, x.data()); o.id = x.id; return o; })
          .sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });
      }).catch(function () { return null; });
    });
  }
  return { blob: blob, db: db, esc: esc, fmtDate: fmtDate, img: img, card: card, link: link, emptyState: emptyState, published: published, paged: paged, repOf: repOf, REPS: REPS };
})();

/* page wiring */
(function () {
  var root = document.querySelector('[data-page]');
  if (!root) return;
  var page = root.getAttribute('data-page');
  var D = window.DFR;


  // lead slideshow: 5 stories; while untouched it flips over to show a representation highlight between stories
  function leadCarousel(el, items, highlights) {
    var NEWS_MS = 6000, REP_MS = 4500, i = 0, h = 0, flipped = false, paused = false, timer = null;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.classList.add('has-car');
    el.innerHTML = '<div class="lcar" id="lcar" role="region" aria-roledescription="carousel" aria-label="هەواڵە سەرەکییەکان"><div class="lflip" id="lflip"><div class="lface front" id="lfront" aria-live="polite"></div><div class="lface back" id="lback" aria-hidden="true"></div></div>' +
      '<div class="lctrl"><button type="button" class="nb" id="lprev" aria-label="هەواڵی پێشوو">→</button><div class="dots" id="ldots">' + items.map(function (a, k) { return '<button type="button" aria-label="هەواڵی ' + (k + 1) + '" data-k="' + k + '"><i></i></button>'; }).join('') + '</div><button type="button" class="nb" id="lnext" aria-label="هەواڵی دواتر">←</button>' +
      '<button type="button" class="nb" id="lpause" aria-label="ڕاگرتن">❚❚</button><span class="rlbl" id="lrlbl" hidden>لە نوێنەرایەتییەکانەوە</span><span class="lstate">' + items.length + ' هەواڵ' + (highlights.length ? ' · ' + highlights.length + ' چالاکیی نوێنەرایەتی' : '') + '</span></div></div>';
    var flip = document.getElementById('lflip'), front = document.getElementById('lfront'), back = document.getElementById('lback'), car = document.getElementById('lcar');
    function frontHtml(a) {
      return '<div class="lead-text"><div class="meta"><span class="chip">' + D.esc(a.subject || 'هەواڵ') + '</span><span class="date">' + D.fmtDate(a.date) + '</span></div>' +
        '<h1><a href="' + D.link(a) + '">' + D.esc(a.title) + '</a></h1>' + (a.subtitle ? '<p>' + D.esc(a.subtitle) + '</p>' : '') +
        '<a class="more" href="' + D.link(a) + '">زیاتر بخوێنەرەوە ←</a></div><a class="lead-img cover" href="' + D.link(a) + '" tabindex="-1" aria-hidden="true">' + D.img(a.image, 'وێنەی هەواڵی سەرەکی') + '</a>';
    }
    function backHtml(a) {
      var r = D.repOf(a), R = D.REPS[r] || {};
      return '<div class="lead-text"><span class="kicker">↻ لە نوێنەرایەتییەکانەوە</span><div class="meta"><span class="date" style="color:var(--on-dark-2)">' + D.fmtDate(a.date) + '</span>' + (a.sample ? '<span class="chip sample">نموونە</span>' : '') + '</div>' +
        '<h1><a href="' + D.link(a) + '">' + D.esc(a.title) + '</a></h1>' + (a.subtitle ? '<p>' + D.esc(a.subtitle) + '</p>' : '') +
        '<div style="display:flex;gap:16px;flex-wrap:wrap"><a class="more light" href="' + D.link(a) + '">زیاتر بخوێنەرەوە ←</a><a class="more light" href="rep-' + D.esc(r) + '.html">پەڕەی نوێنەرایەتی ←</a></div></div>' +
        '<a class="rflag" href="rep-' + D.esc(r) + '.html" tabindex="-1" style="--acc:' + D.esc(R.acc || '#444') + '">' + (a.image ? D.img(a.image) : '<img src="assets/flags/' + D.esc(r) + '.svg" alt="">') +
        '<span class="badge2"><img src="assets/flags/' + D.esc(r) + '.svg" alt="">نوێنەرایەتی لە ' + D.esc(R.ku || '') + '</span></a>';
    }
    function dots() { Array.prototype.forEach.call(document.querySelectorAll('#ldots button'), function (b, k) { var on = k === i && !flipped; b.setAttribute('aria-current', on ? 'true' : 'false'); var ii = b.querySelector('i'); b.replaceChild(ii.cloneNode(), ii); }); car.style.setProperty('--dur', (NEWS_MS / 1000) + 's'); document.getElementById('lrlbl').hidden = !flipped; }
    function showNews(k) { i = (k + items.length) % items.length; front.innerHTML = frontHtml(items[i]); if (flipped) { flipped = false; flip.classList.remove('flipped'); back.setAttribute('aria-hidden', 'true'); front.removeAttribute('aria-hidden'); } dots(); }
    function showRep() { if (!highlights.length) return false; back.innerHTML = backHtml(highlights[h]); h = (h + 1) % highlights.length; flipped = true; flip.classList.add('flipped'); back.removeAttribute('aria-hidden'); front.setAttribute('aria-hidden', 'true'); dots(); return true; }
    // news shows for NEWS_MS, then (if untouched) the card flips to a representation highlight for REP_MS, then on to the next story
    function step() {
      if (paused) return;
      if (highlights.length && !reduce) { showRep(); timer = setTimeout(function () { if (!paused) { showNews(i + 1); schedule(); } }, REP_MS); }
      else { showNews(i + 1); schedule(); }
    }
    function schedule() { clearTimeout(timer); if (!paused) timer = setTimeout(step, NEWS_MS); }
    function setPaused(p) { paused = p; car.classList.toggle('paused', p); var b = document.getElementById('lpause'); b.textContent = p ? '▶' : '❚❚'; b.setAttribute('aria-label', p ? 'دەستپێکردنەوە' : 'ڕاگرتن'); if (p) clearTimeout(timer); else schedule(); }
    var userPaused = false;
    document.getElementById('lprev').addEventListener('click', function () { showNews(i - 1); schedule(); });
    document.getElementById('lnext').addEventListener('click', function () { showNews(i + 1); schedule(); });
    document.getElementById('lpause').addEventListener('click', function () { userPaused = !paused; setPaused(!paused); });
    Array.prototype.forEach.call(document.querySelectorAll('#ldots button'), function (b) { b.addEventListener('click', function () { showNews(+b.getAttribute('data-k')); schedule(); }); });
    // pause while the reader is touching / hovering / focused on it
    car.addEventListener('mouseenter', function () { if (!userPaused) setPaused(true); });
    car.addEventListener('mouseleave', function () { if (!userPaused) setPaused(false); });
    car.addEventListener('focusin', function () { if (!userPaused) setPaused(true); });
    car.addEventListener('focusout', function () { if (!userPaused && !car.contains(document.activeElement)) setPaused(false); });
    car.addEventListener('touchstart', function () { if (!userPaused) { setPaused(true); setTimeout(function () { if (!userPaused) setPaused(false); }, 12000); } }, { passive: true });
    showNews(0); schedule();
  }

  if (page === 'home') {
    D.published().then(function (all) {
      var lead = document.getElementById('lead');
      var grid = document.getElementById('home-news');
      var pager = document.getElementById('home-pager');
      if (!all) { grid.innerHTML = D.emptyState(); return; }
      var home = all.filter(function (a) { return (a.targets || []).indexOf('home') > -1; });
      var reps = all.filter(function (a) { return !!D.repOf(a); });
      var cnt = document.getElementById('reps-count'); if (cnt) cnt.textContent = reps.length || '';
      var top5 = home.filter(function (a) { return a.featured; }).concat(home.filter(function (a) { return !a.featured; })).slice(0, 5);
      var top = top5[0];
      var seenRep = {}, highlights = reps.filter(function (a) { var r = D.repOf(a); if (seenRep[r]) return false; seenRep[r] = 1; return true; }).slice(0, 8);
      if (top) leadCarousel(lead, top5, highlights);
      var feeds = {
        dfr: { items: home.filter(function (a) { return top5.indexOf(a) < 0; }).concat(top5.slice(1)).sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); }).filter(function (a) { return a !== top; }), opts: null, empty: D.emptyState() },
        reps: { items: reps, opts: { showRep: true }, empty: D.emptyState('چالاکی و کۆبوونەوەکانی نوێنەرایەتییەکان لێرە دەردەکەون کاتێک لە CMS بڵاو دەکرێنەوە.') }
      };
      var tabs = document.querySelectorAll('.tabs-h [data-feed]');
      function show(key) {
        var f = feeds[key];
        Array.prototype.forEach.call(tabs, function (b) { b.setAttribute('aria-selected', b.getAttribute('data-feed') === key ? 'true' : 'false'); });
        var panel = document.getElementById('home-panel'); if (panel) panel.setAttribute('aria-labelledby', key === 'dfr' ? 't-dfr' : 't-reps');
        D.paged(grid, pager, f.items, 6, function (a) { return D.card(a, f.opts); }, f.empty);
      }
      Array.prototype.forEach.call(tabs, function (b, i) {
        b.addEventListener('click', function () { show(b.getAttribute('data-feed')); });
        b.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { var n = tabs[(i + 1) % tabs.length]; n.focus(); n.click(); } });
      });
      show('dfr');
    });
  }

  if (page === 'news') {
    var state = { subject: '', kind: '' };
    var listEl = document.getElementById('news-list');
    var repEl = document.getElementById('report-list');
    var galEl = document.getElementById('news-gallery');
    var cache = null;
    function draw() {
      if (!cache) { listEl.innerHTML = D.emptyState(); repEl.innerHTML = ''; return; }
      var news = cache.filter(function (a) { return a.kind !== 'report' && (!state.subject || a.subject === state.subject); });
      listEl.innerHTML = news.length ? news.map(function (a) { return D.card(a, { showRep: true }); }).join('') : D.emptyState('هیچ هەواڵێک لەم بابەتەدا نییە.');
      var reps = cache.filter(function (a) { return a.kind === 'report'; });
      repEl.innerHTML = reps.length ? reps.map(D.card).join('') : D.emptyState('ڕاپۆرتە هەواڵەکان لێرە دەردەکەون.');
      var pics = [];
      cache.forEach(function (a) { if (a.image) pics.push(a); (a.gallery || []).forEach(function (g) { pics.push({ image: g, id: a.id }); }); });
      galEl.innerHTML = pics.length ? pics.slice(0, 16).map(function (p) { return '<a class="g" href="' + D.link(p) + '">' + D.img(p.image) + '</a>'; }).join('') : D.emptyState('وێنەکانی هەواڵەکان لێرە کۆدەکرێنەوە.');
    }
    document.querySelectorAll('#subject-filter button').forEach(function (b) {
      b.addEventListener('click', function () {
        state.subject = b.getAttribute('data-v');
        document.querySelectorAll('#subject-filter button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        draw();
      });
    });
    D.published().then(function (all) { cache = all; draw(); });
  }

  if (page === 'article') {
    var box = document.getElementById('article');
    var id = decodeURIComponent((location.hash || '').slice(1));
    D.db().then(function (d) {
      if (!d || !id) { box.innerHTML = D.emptyState('ئەم بابەتە نەدۆزرایەوە.'); return; }
      d.doc('articles/' + id).get().then(function (s) {
        var a = s.exists ? s.data() : null;
        if (!a || a.status !== 'published') { box.innerHTML = D.emptyState('ئەم بابەتە نەدۆزرایەوە یان هێشتا بڵاو نەکراوەتەوە.'); return; }
        document.title = a.title + ' — فەرمانگەی پەیوەندییەکانی دەرەوە';
        var paras = D.richOrText ? D.richOrText(a.body) : String(a.body || '').split(/\n\s*\n/).filter(Boolean).map(function (p) { return '<p>' + D.esc(p) + '</p>'; }).join('');
        var gal = (a.gallery || []).map(function (g) { return '<div class="g">' + D.img(g) + '</div>'; }).join('');
        box.innerHTML = '<div class="meta"><span class="chip">' + D.esc(a.subject || 'هەواڵ') + '</span><span class="date">' + D.fmtDate(a.date) + '</span>' + (a.unit ? '<span>' + D.esc(a.unit) + '</span>' : '') + '</div>' +
          '<h1>' + D.esc(a.title) + '</h1>' + (a.subtitle ? '<p class="subtitle">' + D.esc(a.subtitle) + '</p>' : '') +
          '<div class="hero">' + D.img(a.image, 'وێنەی هەواڵ') + '</div><div class="text">' + (paras || '<p class="sub">[دەقی هەواڵ]</p>') + '</div>' +
          (gal ? '<div class="gallery" style="margin-top:16px">' + gal + '</div>' : '') +
          ((a.people || []).length ? '<div class="people-list"><h2>' + (a.kind === 'visit' ? 'ئەندامانی شاند' : 'کەسایەتییەکان') + '</h2><ul>' + a.people.map(function (p) { return '<li><b>' + D.esc(p.name) + '</b>' + (p.title ? ' — ' + D.esc(p.title) : '') + '</li>'; }).join('') + '</ul></div>' : '') +
          ((a.tags || []).length ? '<div class="tags">' + a.tags.map(function (t) { return '<span>' + D.esc(t) + '</span>'; }).join('') + '</div>' : '') +
          (a.source ? '<p class="sub" style="margin-top:14px">سەرچاوە: <span class="ltr">' + D.esc(a.source) + '</span></p>' : '');
      }).catch(function () { box.innerHTML = D.emptyState('ئەم بابەتە نەدۆزرایەوە.'); });
    });
  }

  if (page === 'rep') {
    var slug = root.getAttribute('data-rep');
    var el = document.getElementById('rep-news');
    var alb = document.getElementById('rep-album-grid');
    var CAM = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
    D.published().then(function (all) {
      if (!all) { el.innerHTML = D.emptyState(); alb.innerHTML = D.emptyState('وێنەی چالاکییەکان لێرە کۆدەکرێنەوە.'); return; }
      var mine = all.filter(function (a) { return (a.targets || []).indexOf(slug) > -1; });
      D.paged(el, document.getElementById('rep-pager'), mine, 6, function (a) { return D.card(a); }, D.emptyState('هەواڵ و کۆبوونەوەکانی ئەم نوێنەرایەتییە لێرە دەردەکەون کاتێک لە CMS بڵاو دەکرێنەوە.'));
      // one album per activity: cover photo + count; activities without photos show a placeholder cover
      var albums = mine.slice(0, 8);
      alb.innerHTML = albums.length ? albums.map(function (a) {
        var n = (a.image ? 1 : 0) + (a.gallery || []).length;
        var cover = a.image || (a.gallery || [])[0];
        return '<a class="alb" href="' + D.link(a) + '"><span class="cover">' + (cover ? D.img(cover) : '<span class="stack">' + CAM + '<span>وێنەکان لە CMS زیاد دەکرێن</span></span>') +
          '<span class="count">' + (n ? n + ' وێنە' : 'بێ وێنە') + '</span></span><b>' + D.esc(a.title) + '</b><small>' + D.fmtDate(a.date) + (a.sample ? ' · نموونە' : '') + '</small></a>';
      }).join('') : D.emptyState('وێنەی چالاکییەکانی ئەم نوێنەرایەتییە لێرە کۆدەکرێنەوە.');
    });
  }

  if (page === 'reps-dir') {
    var q = document.getElementById('mq'), sel = document.getElementById('mreg'), none = document.getElementById('mnone'), count = document.getElementById('dcount');
    var grid = document.getElementById('ctiles'), cards = grid.querySelectorAll('.ctile'), type = '';
    function norm(s) { return String(s || '').replace(/[ً-ٟ‌‍ـ]/g, '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').toLowerCase(); }
    function apply() {
      var term = norm(q.value.trim()), reg = sel.value, shown = 0;
      Array.prototype.forEach.call(cards, function (c) {
        var ok = (!type || c.getAttribute('data-type') === type) && (!reg || c.getAttribute('data-region') === reg) && (!term || norm(c.getAttribute('data-q')).indexOf(term) > -1);
        c.hidden = !ok; if (ok) shown++;
      });
      none.hidden = shown > 0;
      count.textContent = shown + ' لە ' + cards.length + ' نوێنەرایەتی';
    }
    function setType(t) {
      type = t;
      Array.prototype.forEach.call(document.querySelectorAll('#mtype button'), function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-t') === t ? 'true' : 'false'); });
      apply();
    }
    q.addEventListener('input', apply); sel.addEventListener('change', apply);
    Array.prototype.forEach.call(document.querySelectorAll('#mtype button'), function (b) { b.addEventListener('click', function () { setType(b.getAttribute('data-t')); }); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-jump-type]'), function (a) { a.addEventListener('click', function () { setType(a.getAttribute('data-jump-type')); }); });
    // grid / list view (remembered per viewer)
    function setView(v) {
      grid.classList.toggle('is-list', v === 'list');
      Array.prototype.forEach.call(document.querySelectorAll('.vtoggle button'), function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-view') === v ? 'true' : 'false'); });
      try { localStorage.setItem('dfr-dir-view', v); } catch (e) {}
    }
    Array.prototype.forEach.call(document.querySelectorAll('.vtoggle button'), function (b) { b.addEventListener('click', function () { setView(b.getAttribute('data-view')); }); });
    try { var sv = localStorage.getItem('dfr-dir-view'); if (sv) setView(sv); } catch (e) {}
    apply();
    // detail drawer
    var drawer = document.getElementById('cdrawer'), dbody = document.getElementById('dbody'), opener = null;
    function close() { drawer.hidden = true; document.body.classList.remove('noscroll'); if (opener) opener.focus(); }
    function open(id, btn) {
      var tpl = document.getElementById('cd-' + id); if (!tpl) return;
      opener = btn; dbody.innerHTML = ''; dbody.appendChild(tpl.content.cloneNode(true));
      drawer.hidden = false; document.body.classList.add('noscroll');
      drawer.querySelector('.dclose').focus();
      Array.prototype.forEach.call(dbody.querySelectorAll('[data-copy]'), function (c) {
        c.addEventListener('click', function () {
          var v = c.getAttribute('data-copy');
          var done = function () { c.classList.add('ok'); setTimeout(function () { c.classList.remove('ok'); }, 1200); };
          try { navigator.clipboard.writeText(v).then(done, function () {}); } catch (e) {}
        });
      });
    }
    Array.prototype.forEach.call(document.querySelectorAll('.ctile'), function (b) { b.addEventListener('click', function () { open(b.getAttribute('data-id'), b); }); });
    drawer.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) { var a = e.target.closest('a[href^="#"]'); close(); if (a) location.hash = a.getAttribute('href'); } });
    document.addEventListener('keydown', function (e) {
      if (drawer.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') { var f = drawer.querySelectorAll('button,a[href]'); var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
    });
  }

  if (page === 'search') {
    var IDX = window.DFR_INDEX || [], form = document.getElementById('sform'), qin = document.getElementById('sq'), out = document.getElementById('sres'), cnt = document.getElementById('scount');
    function nrm(s) { return String(s || '').replace(/[ً-ٟ‌‍ـ]/g, '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').toLowerCase(); }
    function snip(text, q) { text = String(text || ''); var n = nrm(text), k = n.indexOf(nrm(q)); if (k < 0) return D.esc(text.slice(0, 160)); var s = Math.max(0, k - 60), part = text.slice(s, k + q.length + 100);
      var kk = nrm(part).indexOf(nrm(q)); return (s ? '…' : '') + D.esc(part.slice(0, kk)) + '<mark>' + D.esc(part.slice(kk, kk + q.length)) + '</mark>' + D.esc(part.slice(kk + q.length)) + '…'; }
    var arts = [];
    function run() {
      var q = qin.value.trim(); var n = nrm(q);
      try { history.replaceState(null, '', 'search.html' + (q ? '?q=' + encodeURIComponent(q) : '')); } catch (e) {}
      if (!n) { out.innerHTML = ''; cnt.textContent = ''; return; }
      var res = [];
      IDX.forEach(function (it) { var hay = nrm(it.t + ' ' + it.s); if (hay.indexOf(n) > -1) res.push({ k: it.k, t: it.t, u: it.u, s: snip(it.s, q), w: nrm(it.t).indexOf(n) > -1 ? 2 : 1 }); });
      arts.forEach(function (a) { var hay = nrm([a.title, a.subtitle, a.body, (a.tags || []).join(' '), a.subject].join(' ')); if (hay.indexOf(n) > -1) res.push({ k: 'هەواڵ · ' + D.fmtDate(a.date), t: a.title, u: D.link(a), s: snip(a.subtitle + ' ' + String(a.body || '').replace(/<[^>]+>/g, ' '), q), w: nrm(a.title).indexOf(n) > -1 ? 3 : 1 }); });
      res.sort(function (a, b) { return b.w - a.w; });
      cnt.textContent = res.length + ' ئەنجام بۆ «' + q + '»';
      out.innerHTML = res.length ? res.slice(0, 60).map(function (r) { return '<div class="sr-item"><span class="k">' + D.esc(r.k) + '</span><div><a class="t" href="' + D.esc(r.u) + '">' + D.esc(r.t) + '</a></div><p>' + r.s + '</p></div>'; }).join('') : D.emptyState('هیچ ئەنجامێک نەدۆزرایەوە. وشەیەکی تر تاقی بکەرەوە، یان پەیوەندی بە فەرمانگەوە بکە.');
    }
    form.addEventListener('submit', function (e) { e.preventDefault(); run(); });
    qin.addEventListener('input', function () { clearTimeout(qin._t); qin._t = setTimeout(run, 200); });
    var q0 = (location.search.match(/[?&]q=([^&]*)/) || [])[1]; if (q0) qin.value = decodeURIComponent(q0.replace(/\+/g, ' '));
    D.published().then(function (all) { arts = all || []; run(); });
    run(); qin.focus();
  }
})();

/* ---------- publications, consulate pages, share buttons, rich text (shared with the Center for Diplomatic Development pages) */
(function () {
  var D = window.DFR; if (!D) return;
  var CATS = window.DFR_PUBCATS || {};
  var root = document.querySelector('[data-page]'), page = root ? root.getAttribute('data-page') : '';
  var LANG = ((document.querySelector('[data-cdd-lang]') || document.documentElement).getAttribute('data-cdd-lang') || 'ku');
  function T(ku, en, ar) { return LANG === 'en' ? (en || ku) : LANG === 'ar' ? (ar || ku) : ku; }
  // allow a small, safe subset of HTML from the CMS rich-text editor
  function clean(html) {
    var box = document.createElement('div'); box.innerHTML = String(html || '');
    var OK = { P: 1, BR: 1, B: 1, STRONG: 1, I: 1, EM: 1, U: 1, H2: 1, H3: 1, UL: 1, OL: 1, LI: 1, A: 1, BLOCKQUOTE: 1 };
    (function walk(n) { Array.prototype.slice.call(n.childNodes).forEach(function (c) {
      if (c.nodeType === 1) {
        if (!OK[c.tagName]) { while (c.firstChild) n.insertBefore(c.firstChild, c); n.removeChild(c); return walk(n); }
        Array.prototype.slice.call(c.attributes).forEach(function (a) { if (!(c.tagName === 'A' && a.name === 'href' && /^(https?:|mailto:|#|[\w.-]+\.html)/i.test(a.value))) c.removeAttribute(a.name); });
        if (c.tagName === 'A') { c.setAttribute('target', '_blank'); c.setAttribute('rel', 'noopener'); }
        walk(c);
      } else if (c.nodeType !== 3) n.removeChild(c);
    }); })(box);
    return box.innerHTML;
  }
  function richOrText(v) { v = String(v || ''); return /<\w/.test(v) ? clean(v) : v.split(/\n\s*\n/).filter(Boolean).map(function (p) { return '<p>' + D.esc(p) + '</p>'; }).join(''); }
  function year(p) { return String(p.date || '').slice(0, 4); }
  function cover(p, big) {
    if (p.cover) return '<img src="' + D.esc(D.blob(p.cover)) + '" alt="">';
    return '<span class="pc-ph"><b>' + D.esc(CATS[p.category] || T('بڵاوکراوە', 'Publication', 'منشور')) + '</b><span>' + D.esc(p.title) + '</span><i>' + D.esc(p.unit || T('فەرمانگەی پەیوەندییەکانی دەرەوە', 'Department of Foreign Relations', 'دائرة العلاقات الخارجية')) + '</i></span>';
  }
  function pubLink(p) { return 'publication.html#' + encodeURIComponent(p.id); }
  function fileLink(p) {
    if (p.file) return '<a href="' + D.esc(D.blob(p.file)) + '" download target="_blank">' + T('داگرتن / خوێندنەوە (PDF)', 'Download / read (PDF)', 'تحميل / قراءة (PDF)') + ' ↓</a>';
    if (p.link) return '<a href="' + D.esc(p.link) + '" target="_blank" rel="noopener">' + T('خوێندنەوە', 'Read', 'قراءة') + ' ↗</a>';
    return '<span class="pmeta">' + T('فایل لە CMS زیاد دەکرێت', 'File to be added in the CMS', 'سيُضاف الملف من نظام الإدارة') + '</span>';
  }
  function pubCard(p) {
    return '<article class="pub cat-' + D.esc(p.category || '') + '"><a class="pcover cat-' + D.esc(p.category || '') + '" href="' + pubLink(p) + '" tabindex="-1" aria-hidden="true">' + cover(p) + '</a>' +
      '<div class="pb"><span class="pcat">' + D.esc(CATS[p.category] || '') + (p.sample ? ' · <span class="chip sample">' + T('نموونە', 'Sample', 'نموذج') + '</span>' : '') + '</span><h3><a href="' + pubLink(p) + '">' + D.esc(p.title) + '</a></h3>' +
      '<span class="pmeta">' + D.esc([p.authors, year(p), p.lang === 'en' ? 'English' : p.lang === 'ar' ? 'عربي' : ''].filter(Boolean).join(' · ')) + '</span>' +
      (p.summary ? '<p>' + D.esc(String(p.summary).replace(/<[^>]+>/g, ' ')) + '</p>' : '') + '<div class="pacts">' + fileLink(p) + '</div></div></article>';
  }
  function publishedPubs() {
    return D.db().then(function (d) { if (!d) return null;
      return d.collection('publications').where('status', '==', 'published').get().then(function (s) {
        return s.docs.map(function (x) { var o = Object.assign({}, x.data()); o.id = x.id; return o; }).sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });
      }).catch(function () { return null; }); });
  }
  function shareBar(title) {
    var u = encodeURIComponent(location.href), t = encodeURIComponent(title || document.title);
    return '<div class="share" aria-label="' + T('هاوبەشکردن', 'Share', 'مشاركة') + '"><span>' + T('هاوبەشکردن:', 'Share:', 'مشاركة:') + '</span>' +
      '<a href="https://www.facebook.com/sharer/sharer.php?u=' + u + '" target="_blank" rel="noopener">Facebook</a>' +
      '<a href="https://twitter.com/intent/tweet?url=' + u + '&text=' + t + '" target="_blank" rel="noopener">X</a>' +
      '<a href="https://wa.me/?text=' + t + '%20' + u + '" target="_blank" rel="noopener">WhatsApp</a>' +
      '<a href="https://t.me/share/url?url=' + u + '&text=' + t + '" target="_blank" rel="noopener">Telegram</a>' +
      '<button type="button" data-copy-link>' + T('کۆپیکردنی لینک', 'Copy link', 'نسخ الرابط') + '</button></div>';
  }
  function wireShare(el) { var b = el && el.querySelector('[data-copy-link]'); if (b) b.addEventListener('click', function () { try { navigator.clipboard.writeText(location.href).then(function () { b.textContent = T('کۆپی کرا ✓', 'Copied ✓', 'تم النسخ ✓'); }); } catch (e) {} }); }
  Object.assign(D, { pubCard: pubCard, publishedPubs: publishedPubs, shareBar: shareBar, wireShare: wireShare, clean: clean, richOrText: richOrText, T: T, LANG: LANG, pubCover: cover, pubFile: fileLink });

  // representation + consulate pages: publications linked to this page
  var rp = document.getElementById('rep-pubs');
  if (rp && root) {
    var slug = root.getAttribute('data-rep');
    publishedPubs().then(function (all) {
      var mine = (all || []).filter(function (p) { return (p.targets || []).indexOf(slug) > -1; });
      rp.innerHTML = mine.length ? mine.slice(0, 6).map(pubCard).join('') : D.emptyState(T('بڵاوکراوەکانی پەیوەندیدار لێرە دەردەکەون کاتێک لە CMS بڵاو دەکرێنەوە.', 'Related publications appear here when published in the CMS.', 'تظهر المنشورات هنا عند نشرها.'));
    });
  }

  // publications index: categories, year, search, sort, pages
  if (page === 'pubs') {
    var st = { c: (location.hash || '').slice(1), q: '', y: '', s: 'new' }, list = document.getElementById('pub-list'), all = [];
    function norm(s) { return String(s || '').replace(/[ً-ٟ‌‍ـ]/g, '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').toLowerCase(); }
    function draw() {
      var n = norm(st.q), rows = all.filter(function (p) { return (!st.c || p.category === st.c) && (!st.y || year(p) === st.y) && (!n || norm([p.title, p.authors, p.summary, (p.tags || []).join(' ')].join(' ')).indexOf(n) > -1); });
      rows.sort(function (a, b) { return st.s === 'old' ? String(a.date).localeCompare(String(b.date)) : st.s === 'az' ? String(a.title).localeCompare(String(b.title)) : String(b.date).localeCompare(String(a.date)); });
      document.getElementById('pcount').textContent = rows.length + ' بڵاوکراوە';
      Array.prototype.forEach.call(document.querySelectorAll('#pcats button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-c') === st.c ? 'true' : 'false'); });
      D.paged(list, document.getElementById('pub-pager'), rows, 9, pubCard, D.emptyState('هیچ بڵاوکراوەیەک لەم بەشەدا نییە.'));
    }
    Array.prototype.forEach.call(document.querySelectorAll('#pcats button'), function (b) { b.addEventListener('click', function () { st.c = b.getAttribute('data-c'); try { history.replaceState(null, '', st.c ? '#' + st.c : location.pathname); } catch (e) {} draw(); }); });
    document.getElementById('pq').addEventListener('input', function () { st.q = this.value; draw(); });
    document.getElementById('pyear').addEventListener('change', function () { st.y = this.value; draw(); });
    document.getElementById('psort').addEventListener('change', function () { st.s = this.value; draw(); });
    publishedPubs().then(function (r) {
      all = r || [];
      Array.prototype.forEach.call(document.querySelectorAll('#pcats [data-n]'), function (el) { var k = el.getAttribute('data-n'); el.textContent = all.filter(function (p) { return !k || p.category === k; }).length || ''; });
      var ys = all.map(year).filter(Boolean).filter(function (y, i, a) { return a.indexOf(y) === i; }).sort().reverse();
      document.getElementById('pyear').innerHTML += ys.map(function (y) { return '<option>' + y + '</option>'; }).join('');
      draw();
    });
  }

  // one publication
  if (page === 'pub') {
    var box = document.getElementById('pub'), id = decodeURIComponent((location.hash || '').slice(1));
    D.db().then(function (d) {
      if (!d || !id) { box.innerHTML = D.emptyState('ئەم بڵاوکراوەیە نەدۆزرایەوە.'); return; }
      d.doc('publications/' + id).get().then(function (s) {
        var p = s.exists ? s.data() : null; if (!p || p.status !== 'published') { box.innerHTML = D.emptyState('ئەم بڵاوکراوەیە نەدۆزرایەوە.'); return; }
        p.id = id; document.title = p.title + ' — بڵاوکراوەکان';
        var tg = (p.targets || []).map(function (t) { var c = (window.DFR_CONS || {})[t], r = (window.DFR_REPS || {})[t];
          return c ? '<a href="' + c.file + '">' + D.esc(c.name) + '</a>' : r ? '<a href="rep-' + t + '.html">نوێنەرایەتی لە ' + D.esc(r.ku) + '</a>' : t === 'cdd' ? '<a href="cdd.html">ناوەندی پێگەیاندنی دیپلۆماسی</a>' : ''; }).filter(Boolean).join('، ');
        box.innerHTML = '<div class="pcover cat-' + D.esc(p.category || '') + '">' + cover(p, true) + '</div><div><span class="pcat">' + D.esc(CATS[p.category] || '') + '</span><h1>' + D.esc(p.title) + '</h1>' +
          '<dl>' + (p.authors ? '<dt>نووسەر</dt><dd>' + D.esc(p.authors) + '</dd>' : '') + '<dt>ڕێکەوت</dt><dd>' + D.fmtDate(p.date) + '</dd>' + (p.unit ? '<dt>یەکە</dt><dd>' + D.esc(p.unit) + '</dd>' : '') + (p.pages ? '<dt>لاپەڕە</dt><dd>' + D.esc(p.pages) + '</dd>' : '') + (p.lang ? '<dt>زمان</dt><dd>' + (p.lang === 'en' ? 'English' : p.lang === 'ar' ? 'عربي' : 'کوردی') + '</dd>' : '') + (tg ? '<dt>پەیوەندیدار</dt><dd>' + tg + '</dd>' : '') + '</dl>' +
          '<div class="sum">' + richOrText(p.summary) + '</div>' + ((p.tags || []).length ? '<div class="tags">' + p.tags.map(function (t) { return '<span>' + D.esc(t) + '</span>'; }).join('') + '</div>' : '') +
          '<div class="btns">' + fileLink(p).replace('<a ', '<a class="menu-btn" ') + '<a class="menu-btn" href="publications.html' + (p.category ? '#' + p.category : '') + '">هەموو بڵاوکراوەکانی ئەم جۆرە</a></div>' + shareBar(p.title) + '</div>';
        wireShare(box);
      });
    });
  }

  // share buttons under every article
  if (page === 'article') {
    var art = document.getElementById('article'), done = false;
    var mo = new MutationObserver(function () { if (done || !art.querySelector('h1')) return; done = true; var div = document.createElement('div'); div.innerHTML = shareBar(art.querySelector('h1').textContent); art.appendChild(div.firstChild); wireShare(art); });
    mo.observe(art, { childList: true });
  }

  // site search also covers publications
  if (page === 'search') {
    var qin = document.getElementById('sq'), out = document.getElementById('sres');
    publishedPubs().then(function (ps) {
      (ps || []).forEach(function (p) { (window.DFR_INDEX = window.DFR_INDEX || []).push({ k: 'بڵاوکراوە · ' + (CATS[p.category] || ''), t: p.title, u: pubLink(p), s: [p.authors, String(p.summary || '').replace(/<[^>]+>/g, ' ')].join(' · ') }); });
      if (qin && qin.value) qin.dispatchEvent(new Event('input'));
    });
  }
})();

/* ---------- Center for Diplomatic Development: content from the CMS ('cdd' collection, articles/publications targeted to 'cdd'), forms */
(function () {
  var D = window.DFR, C = window.CDD, root = document.querySelector('[data-page="cdd"]');
  if (!D || !C || !root) return;
  var L = root.getAttribute('data-cdd-lang') || 'ku', slug = root.getAttribute('data-cdd'), esc = D.esc;
  function T(k) { var o = C.ui[k] || {}; return o[L] || o.ku || ''; }
  function lk(o) { return o ? (o[L] || o.ku || '') : ''; }
  function F(s) { return (C.files[s] || {})[L] || '#'; }
  function S(ku, en, ar) { return L === 'en' ? en : L === 'ar' ? ar : ku; }
  function $(id) { return document.getElementById(id); }
  function byOrder(a, b) { return (Number(a.order) || 99) - (Number(b.order) || 99); }
  var dbp = D.db(), cache = null;
  function allItems() { if (!cache) cache = dbp.then(function (d) { if (!d) return []; return d.collection('cdd').get().then(function (s) { return s.docs.map(function (x) { var o = Object.assign({}, x.data()); o.id = x.id; return o; }).filter(function (o) { return o.status === 'published'; }); }).catch(function () { return []; }); }); return cache; }
  function items(type) { return allItems().then(function (a) { return a.filter(function (o) { return o.type === type; }).sort(byOrder); }); }
  function arts() { return D.published().then(function (a) { return (a || []).filter(function (x) { return (x.targets || []).indexOf('cdd') > -1; }); }); }
  function pubs() { return D.publishedPubs().then(function (a) { return (a || []).filter(function (x) { return (x.targets || []).indexOf('cdd') > -1; }); }); }
  var SAMPLE = S('نموونە', 'Sample', 'نموذج');
  function empty(msg) { return '<div class="empty">' + esc(msg || S('هێشتا هیچ شتێک بڵاو نەکراوەتەوە.', 'Nothing published yet.', 'لا يوجد محتوى منشور بعد.')) + '</div>'; }
  function ncard(a) {
    var k = C.kinds[a.kind];
    return '<article class="card"><a class="img" href="' + D.link(a) + '" tabindex="-1" aria-hidden="true">' + D.img(a.image) + '</a><div class="body"><div class="meta"><span class="date">' + D.fmtDate(a.date) + '</span>' + (k ? '<span class="chip">' + esc(lk(k)) + '</span>' : '') + (a.sample ? '<span class="chip sample">' + SAMPLE + '</span>' : '') + '</div><h3><a href="' + D.link(a) + '">' + esc(a.title) + '</a></h3>' + (a.subtitle ? '<p class="sub">' + esc(a.subtitle) + '</p>' : '') + '</div></article>';
  }
  function pcard(p) {
    var st = C.status[p.pstatus] || {};
    return '<article class="prog st-' + esc(p.pstatus || '') + '"><a class="pimg" href="' + F('program') + '#' + encodeURIComponent(p.id) + '" tabindex="-1" aria-hidden="true">' + (p.image ? D.img(p.image) : '<span class="pph">' + C.icons.cap + '</span>') + '</a><div class="pbody">' +
      '<div class="meta"><span class="pill2 st-' + esc(p.pstatus || '') + '">' + esc(lk(st)) + '</span>' + (p.sample ? '<span class="chip sample">' + SAMPLE + '</span>' : '') + '</div><h3><a href="' + F('program') + '#' + encodeURIComponent(p.id) + '">' + esc(p.title) + '</a></h3>' +
      '<dl class="pfacts">' + (p.duration ? '<dt>' + T('duration') + '</dt><dd>' + esc(p.duration) + '</dd>' : '') + (p.start ? '<dt>' + T('start') + '</dt><dd>' + D.fmtDate(p.start) + '</dd>' : '') + (p.mode ? '<dt>' + T('mode') + '</dt><dd>' + esc(p.mode) + '</dd>' : '') + '</dl></div></article>';
  }
  function logo(p) { return p.logo ? D.img(p.logo) : '<span class="lph">' + esc(String(p.name || '?').replace(/\(.*?\)/g, '').split(/[\s—-]+/).filter(Boolean).slice(0, 2).map(function (w) { return w.charAt(0); }).join('\u200c')) + '</span>'; }
  function partner(p) { return '<a class="partner"' + (p.website ? ' href="' + esc(p.website) + '" target="_blank" rel="noopener"' : '') + '><span class="plogo">' + logo(p) + '</span><b>' + esc(p.name) + '</b><small>' + esc(lk(C.ptypes[p.ptype])) + (p.sample ? ' · ' + SAMPLE : '') + '</small>' + (p.desc ? '<span class="pdesc">' + esc(p.desc) + '</span>' : '') + '</a>'; }
  function person(p, big) {
    return '<div class="cdd-person' + (big ? ' lead-p' : '') + '">' + (p.photo ? '<span class="ph-av">' + D.img(p.photo) + '</span>' : '<span class="ph-av">' + C.icons.user + '</span>') + '<div><span class="pcat">' + esc(p.roleLabel || '') + (p.sample ? ' · ' + SAMPLE : '') + '</span><h3>' + esc(p['name_' + L] || p.name) + '</h3><p class="ptitle">' + esc(p['title_' + L] || p.title || '') + '</p>' +
      ((p['bio_' + L] || p.bio) ? '<div class="prose">' + D.richOrText(p['bio_' + L] || p.bio) + '</div>' : (big ? '<p class="pmeta">' + T('bio_ph') + '</p>' : '')) +
      ((p.email || p.phone) ? '<p class="pmeta">' + [p.email ? '<a class="ltr" dir="ltr" href="mailto:' + esc(p.email) + '">' + esc(p.email) + '</a>' : '', p.phone ? '<span class="ltr" dir="ltr">' + esc(p.phone) + '</span>' : ''].filter(Boolean).join(' · ') + '</p>' : '') + '</div></div>';
  }
  var ROLE = { director: S('بەرپرسی ناوەند', 'Director', 'المدير'), staff: S('ستاف', 'Staff', 'الكادر'), advisor: S('ڕاوێژکار', 'Advisor', 'مستشار'), trainer: S('ڕاهێنەر', 'Trainer', 'مدرب') };

  // editable texts + SEO overrides from the CMS
  items('page').then(function (ps) { ps.forEach(function (p) { var el = $('cdd-txt-' + p.slug), b = p['body_' + L]; if (el && b) el.innerHTML = D.richOrText(b); }); });
  items('seo').then(function (ss) { ss.filter(function (s) { return s.page === slug; }).forEach(function (s) {
    if (s['title_' + L]) document.title = s['title_' + L];
    if (s['desc_' + L]) { var m = document.querySelector('meta[name="description"]'); if (!m) { m = document.createElement('meta'); m.name = 'description'; document.head.appendChild(m); } m.content = s['desc_' + L]; } }); });

  if (slug === 'home') {
    arts().then(function (a) { $('cdd-news').innerHTML = a.length ? a.slice(0, 3).map(ncard).join('') : empty(); });
    pubs().then(function (p) { p.sort(function (a, b) { return (b.featured ? 1 : 0) - (a.featured ? 1 : 0); }); $('cdd-research').innerHTML = p.length ? p.slice(0, 3).map(D.pubCard).join('') : empty(); });
    items('program').then(function (p) { var ord = { open: 0, soon: 1, closed: 2, done: 3 }; p.sort(function (a, b) { return (a.pstatus in ord ? ord[a.pstatus] : 9) - (b.pstatus in ord ? ord[b.pstatus] : 9); }); $('cdd-programs').innerHTML = p.length ? p.slice(0, 3).map(pcard).join('') : empty(); });
    items('partner').then(function (p) { $('cdd-partners-strip').innerHTML = p.length ? p.slice(0, 8).map(function (x) { return '<span class="plogo" title="' + esc(x.name) + '">' + logo(x) + '</span>'; }).join('') : empty(); });
  }
  if (slug === 'goals') items('goal').then(function (g) { if (!g.length) return; $('cdd-goals').innerHTML = g.map(function (x, n) { return '<li><span class="gi">' + (C.icons[x.icon] || C.icons.target) + '</span><span class="gn">' + String(n + 1).padStart(2, '0') + '</span><b>' + esc(x['title_' + L] || x.title_ku) + '</b>' + ((x['desc_' + L] || x.desc_ku) ? '<span class="gd">' + esc(x['desc_' + L] || x.desc_ku) + '</span>' : '') + '</li>'; }).join(''); });
  if (slug === 'director') items('person').then(function (ps) {
    ps.forEach(function (p) { p.roleLabel = ROLE[p.role] || ''; });
    var dir = ps.filter(function (p) { return p.role === 'director'; })[0]; if (dir) $('cdd-director').outerHTML = person(dir, true);
    var team = ps.filter(function (p) { return p.role !== 'director'; }); $('cdd-team').innerHTML = team.length ? team.map(function (p) { return person(p); }).join('') : empty(S('لیستی ستاف و ڕاهێنەران لە CMS زیاد دەکرێت.', 'Staff and trainers will be added in the CMS.', 'سيُضاف الكادر والمدربون من نظام الإدارة.'));
  });
  if (slug === 'training') items('program').then(function (p) {
    var f = '', el = $('cdd-programs-all');
    function draw() { var r = p.filter(function (x) { return !f || x.pstatus === f; }); el.innerHTML = r.length ? r.map(pcard).join('') : empty(); }
    Array.prototype.forEach.call(document.querySelectorAll('#cdd-prog-f button'), function (b) { b.addEventListener('click', function () { f = b.getAttribute('data-f'); Array.prototype.forEach.call(document.querySelectorAll('#cdd-prog-f button'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); draw(); }); });
    draw();
  });
  if (slug === 'program') {
    var id = decodeURIComponent((location.hash || '').slice(1)), box = $('cdd-program');
    items('program').then(function (ps) {
      var p = ps.filter(function (x) { return x.id === id; })[0]; if (!p) { box.innerHTML = empty(S('ئەم خولە نەدۆزرایەوە.', 'Course not found.', 'لم يتم العثور على الدورة.')); return; }
      document.title = p.title + ' — ' + T('k');
      var open = p.pstatus === 'open' && p.regOpen;
      box.innerHTML = '<div class="pimg big">' + (p.image ? D.img(p.image) : '<span class="pph">' + C.icons.cap + '</span>') + '</div><div><span class="pill2 st-' + esc(p.pstatus) + '">' + esc(lk(C.status[p.pstatus])) + '</span>' + (p.sample ? ' <span class="chip sample">' + SAMPLE + '</span>' : '') + '<h1>' + esc(p.title) + '</h1>' +
        '<dl class="pfacts">' + [['duration', p.duration], ['start', p.start && D.fmtDate(p.start) + (p.end ? S(' تا ', ' to ', ' إلى ') + D.fmtDate(p.end) : '')], ['mode', p.mode], ['audience', p.audience], ['seats', p.seats]].filter(function (x) { return x[1]; }).map(function (x) { return '<dt>' + T(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd>'; }).join('') + '</dl>' +
        '<div class="prose">' + D.richOrText(p.desc) + '</div>' + D.shareBar(p.title) +
        (open ? '<form class="cdd-form" data-kind="registration" data-program="' + esc(p.id) + '" data-program-title="' + esc(p.title) + '" novalidate><h2>' + T('register') + '</h2><p class="pmeta">' + T('reg_note') + '</p><div class="grid2">' +
          [['name', 'f_name', 1], ['position', 'f_position'], ['unit', 'f_unit', 1], ['email', 'f_email', 1, 'email'], ['phone', 'f_phone', 0, 'tel']].map(function (f) { return '<div class="fld"><label for="r-' + f[0] + '">' + T(f[1]) + (f[2] ? ' *' : '') + '</label><input id="r-' + f[0] + '" name="' + f[0] + '" type="' + (f[3] || 'text') + '"' + (f[2] ? ' required' : '') + (f[3] ? ' dir="ltr"' : '') + '></div>'; }).join('') +
          '</div><div class="fld"><label for="r-why">' + T('f_why') + '</label><textarea id="r-why" name="why"></textarea></div><input type="text" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true"><button class="btn-g" type="submit">' + T('f_send') + '</button><p class="fmsg" role="status"></p></form>' : '') + '</div>';
      D.wireShare(box); wireForms(box);
    });
  }
  if (slug === 'research') pubs().then(function (all) {
    var st = { c: '', q: '', y: '' }, el = $('cdd-research-all');
    var ys = all.map(function (p) { return String(p.date || '').slice(0, 4); }).filter(function (y, i, a) { return y && a.indexOf(y) === i; }).sort().reverse();
    $('ryear').innerHTML = '<option value="">' + S('هەموو ساڵەکان', 'All years', 'كل السنوات') + '</option>' + ys.map(function (y) { return '<option>' + y + '</option>'; }).join('');
    $('rq').placeholder = S('گەڕان لە توێژینەوەکان…', 'Search research…', 'ابحث في البحوث…');
    function draw() { var n = st.q.toLowerCase(); var r = all.filter(function (p) { return (!st.c || p.category === st.c) && (!st.y || String(p.date).slice(0, 4) === st.y) && (!n || [p.title, p.authors, p.summary].join(' ').toLowerCase().indexOf(n) > -1); });
      D.paged(el, $('cdd-res-pager'), r, 9, D.pubCard, empty()); }
    Array.prototype.forEach.call(document.querySelectorAll('#cdd-res-f button'), function (b) { b.addEventListener('click', function () { st.c = b.getAttribute('data-c'); Array.prototype.forEach.call(document.querySelectorAll('#cdd-res-f button'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); draw(); }); });
    $('rq').addEventListener('input', function () { st.q = this.value; draw(); }); $('ryear').addEventListener('change', function () { st.y = this.value; draw(); });
    draw();
  });
  if (slug === 'partners') Promise.all([items('partner'), items('alumni'), items('program')]).then(function (r) {
    var ps = r[0], al = r[1], pr = r[2], groups = {};
    ps.forEach(function (p) { (groups[p.ptype] = groups[p.ptype] || []).push(p); });
    $('cdd-partners').innerHTML = ps.length ? Object.keys(C.ptypes).filter(function (k) { return groups[k]; }).map(function (k) { return '<div class="pgroup"><h3 class="sub-h">' + esc(lk(C.ptypes[k])) + '</h3><div class="partners">' + groups[k].map(partner).join('') + '</div></div>'; }).join('') : empty();
    $('cdd-astats').innerHTML = [[al.length, S('دەرچووی تۆمارکراو', 'Registered alumni', 'خريج مسجل')], [pr.filter(function (p) { return p.pstatus === 'done'; }).length, S('خولی تەواوبوو', 'Completed courses', 'دورة مكتملة')], [ps.length, S('هاوبەش', 'Partners', 'شريك')]].map(function (x) { return '<div><b>' + x[0] + '</b><span>' + x[1] + '</span></div>'; }).join('');
    $('cdd-alumni').innerHTML = al.length ? al.map(function (a) { return '<div class="cdd-person alum">' + (a.photo ? '<span class="ph-av">' + D.img(a.photo) + '</span>' : '<span class="ph-av">' + C.icons.cap + '</span>') + '<div><h3>' + esc(a.name) + '</h3><p class="ptitle">' + esc(a.position || '') + '</p><p class="pmeta">' + esc([a.program, a.year].filter(Boolean).join(' · ')) + (a.sample ? ' · ' + SAMPLE : '') + '</p>' + (a.quote ? '<blockquote>' + esc(a.quote) + '</blockquote>' : '') + '</div></div>'; }).join('') : empty();
  });
  if (slug === 'news') arts().then(function (all) {
    var k = '', el = $('cdd-news-all');
    function draw() { D.paged(el, $('cdd-news-pager'), all.filter(function (a) { return !k || a.kind === k; }), 9, ncard, empty()); }
    Array.prototype.forEach.call(document.querySelectorAll('#cdd-news-f button'), function (b) { b.addEventListener('click', function () { k = b.getAttribute('data-k'); Array.prototype.forEach.call(document.querySelectorAll('#cdd-news-f button'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); draw(); }); });
    draw();
  });
  if (slug === 'legal') items('legal').then(function (ls) { if (!ls.length) return;
    $('cdd-legal').innerHTML = ls.map(function (d) { return '<article class="ldoc"><span class="li">' + C.icons.doc + '</span><div><b>' + esc(d['title_' + L] || d.title_ku) + '</b><dl><dt>' + T('number') + '</dt><dd class="ltr" dir="ltr">' + esc(d.number || '') + '</dd><dt>' + T('date') + '</dt><dd>' + D.fmtDate(d.date) + '</dd><dt>' + T('issuer') + '</dt><dd>' + esc(d['issuer_' + L] || d.issuer_ku || '') + '</dd></dl>' +
      ((d['summary_' + L] || d.summary_ku) ? '<p>' + esc(d['summary_' + L] || d.summary_ku) + '</p>' : '') + (d.file ? '<a class="menu-btn" href="' + esc(D.blob(d.file)) + '" target="_blank" download>PDF ↓</a>' : '<span class="pmeta">' + T('pdf_ph') + '</span>') + '</div></article>'; }).join(''); });

  // forms: contact, course registration, newsletter, alumni → 'cdd_forms' (read only by the Center's editors in the CMS)
  function msg(f, ok, text) { var m = f.querySelector('.fmsg'); if (m) { m.textContent = text; m.className = 'fmsg ' + (ok ? 'ok' : 'err'); } }
  function wireForms(scope) {
    Array.prototype.forEach.call((scope || document).querySelectorAll('form.cdd-form, form.cdd-nl'), function (f) {
      if (f._wired) return; f._wired = true;
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var data = {}; Array.prototype.forEach.call(f.querySelectorAll('input[name],textarea[name]'), function (i) { data[i.name] = i.value.trim(); });
        if (data.website) return; delete data.website;
        var bad = Array.prototype.filter.call(f.querySelectorAll('[required]'), function (i) { return !i.value.trim() || (i.type === 'email' && !/^\S+@\S+\.\S+$/.test(i.value.trim())); })[0];
        if (bad) { bad.focus(); msg(f, false, S('تکایە خانە پێویستەکان بە دروستی پڕبکەرەوە.', 'Please fill in the required fields correctly.', 'يرجى ملء الحقول المطلوبة بشكل صحيح.')); return; }
        data.kind = f.getAttribute('data-kind'); data.lang = L; data.page = slug; data.at = new Date().toISOString(); data.status = 'new';
        if (f.getAttribute('data-program')) { data.program = f.getAttribute('data-program'); data.programTitle = f.getAttribute('data-program-title'); }
        var btn = f.querySelector('button[type=submit]'); btn.disabled = true;
        dbp.then(function (d) { if (!d) throw new Error('no db');
          var up = (window.claude && window.claude.use) ? window.claude.use('user').catch(function () { return null; }) : Promise.resolve(null);
          return up.then(function (u) { return u && u.id ? u.id() : null; }).then(function (uid) {
            if (!uid) throw new Error('signed out');
            var ref = d.collection('cdd_forms').doc(uid);
            return ref.get().then(function (s) { var items = ((s.exists && s.data().items) || []).slice(-49);
              data.fid = Date.now().toString(36) + Math.random().toString(36).slice(2, 6); items.push(data);
              return ref.set({ items: items, updatedAt: data.at }); });
          }); }).then(function () {
          f.reset(); msg(f, true, data.kind === 'newsletter' ? S('بەشداربوونەکەت تۆمارکرا. سوپاس!', 'You are subscribed. Thank you!', 'تم الاشتراك. شكراً لك!') : data.kind === 'registration' ? S('داواکاریی تۆمارکردنەکەت گەیشت؛ ناوەند پەیوەندیت پێوە دەکات.', 'Your registration was received; the Center will contact you.', 'تم استلام طلب التسجيل؛ سيتواصل معك المركز.') : S('پەیامەکەت گەیشت. سوپاس!', 'Your message was sent. Thank you!', 'تم إرسال رسالتك. شكراً لك!'));
        }).catch(function () { msg(f, false, S('ناردن سەرکەوتوو نەبوو. دواتر هەوڵ بدەرەوە یان ئیمەیڵ بنێرە.', 'Could not send. Please try later or email us.', 'تعذر الإرسال. حاول لاحقاً أو راسلنا بالبريد.')); })
          .then(function () { btn.disabled = false; });
      });
    });
  }
  wireForms(document);
})();
