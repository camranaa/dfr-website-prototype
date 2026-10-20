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
        var paras = String(a.body || '').split(/\n\s*\n/).filter(Boolean).map(function (p) { return '<p>' + D.esc(p) + '</p>'; }).join('');
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
      arts.forEach(function (a) { var hay = nrm([a.title, a.subtitle, a.body, (a.tags || []).join(' '), a.subject].join(' ')); if (hay.indexOf(n) > -1) res.push({ k: 'هەواڵ · ' + D.fmtDate(a.date), t: a.title, u: D.link(a), s: snip(a.subtitle + ' ' + a.body, q), w: nrm(a.title).indexOf(n) > -1 ? 3 : 1 }); });
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
