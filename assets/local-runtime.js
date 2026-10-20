/* Offline runtime for the downloaded package.
   Activates only when the package's seed data is present and no hosted runtime exists.
   Data lives in this browser's localStorage; uploads are kept as compressed data URLs. */
(function () {
  if (window.claude || !window.DFR_SEED) return;
  var KEY = 'dfr-local-db-v1', BKEY = 'dfr-local-blob:', mem = {}, ls = null;
  try { localStorage.setItem('dfr-t', '1'); localStorage.removeItem('dfr-t'); ls = localStorage; } catch (e) { ls = null; }
  function getItem(k) { return ls ? ls.getItem(k) : (mem[k] || null); }
  function setItem(k, v) { if (ls) ls.setItem(k, v); else mem[k] = v; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function load() { try { var s = getItem(KEY); if (s) return JSON.parse(s); } catch (e) {} return clone(window.DFR_SEED); }
  var store = load(), subs = [];
  function save() { try { setItem(KEY, JSON.stringify(store)); } catch (e) { console.warn('DFR offline: storage full', e); } }
  function snap(col, filt) {
    var c = store[col] || {};
    var docs = Object.keys(c).map(function (id) { return { id: id, exists: true, data: function () { return clone(c[id]); } }; });
    if (filt) docs = docs.filter(function (d) { return filt(d.data()); });
    return { docs: docs, size: docs.length, empty: !docs.length };
  }
  function fire(col) { subs.slice().forEach(function (s) { if (s.col === col) { try { s.cb(snap(col, s.filt)); } catch (e) { console.error(e); } } }); }
  function newId() { return 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function cmp(a, op, v) {
    switch (op) { case '==': return a === v; case '!=': return a !== v; case '<': return a < v; case '<=': return a <= v; case '>': return a > v; case '>=': return a >= v;
      case 'array-contains': return Array.isArray(a) && a.indexOf(v) > -1; case 'in': return (v || []).indexOf(a) > -1; case 'not-in': return (v || []).indexOf(a) < 0; }
    return false;
  }
  function docRef(col, id) {
    id = id || newId();
    return {
      id: id,
      get: function () { var c = store[col] || {}, has = Object.prototype.hasOwnProperty.call(c, id); return Promise.resolve({ id: id, exists: has, data: function () { return has ? clone(c[id]) : undefined; } }); },
      set: function (d) { (store[col] = store[col] || {})[id] = clone(d); save(); fire(col); return Promise.resolve(); },
      update: function (d) {
        var c = store[col] = store[col] || {}; if (!c[id]) return Promise.reject({ code: 'not_found' });
        var o = Object.assign({}, c[id]); Object.keys(d).forEach(function (k) { if (d[k] && d[k].__delete__) delete o[k]; else o[k] = clone(d[k]); });
        c[id] = o; save(); fire(col); return Promise.resolve();
      },
      delete: function () { if (store[col]) delete store[col][id]; save(); fire(col); return Promise.resolve(); }
    };
  }
  function query(col, filt) {
    return {
      where: function (f, op, v) { var prev = filt; return query(col, function (d) { return (!prev || prev(d)) && cmp(d[f], op, v); }); },
      get: function () { return Promise.resolve(snap(col, filt)); },
      onSnapshot: function (cb) { var s = { col: col, cb: cb, filt: filt }; subs.push(s); setTimeout(function () { cb(snap(col, filt)); }, 0); return function () { var i = subs.indexOf(s); if (i > -1) subs.splice(i, 1); }; },
      add: function (d) { var r = docRef(col); return r.set(d).then(function () { return r; }); },
      doc: function (id) { return docRef(col, id); }
    };
  }
  var db = { collection: function (c) { return query(c); }, doc: function (p) { var s = p.split('/'); return docRef(s[0], s[1]); } };
  window.addEventListener('storage', function (e) { if (e.key === KEY) { store = load(); Object.keys(store).forEach(fire); } });
  function upload(file) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () {
        var url = fr.result;
        function done(u) { var id = 'b' + newId(); try { setItem(BKEY + id, u); } catch (e) { return rej({ code: 'too_large' }); } res({ id: id, url: u }); }
        if (/^image\//.test(file.type) && !/svg/.test(file.type)) {
          var img = new Image();
          img.onload = function () { var m = 1600, k = Math.min(1, m / Math.max(img.width, img.height)), c = document.createElement('canvas');
            c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); done(c.toDataURL('image/jpeg', 0.82)); };
          img.onerror = function () { done(url); }; img.src = url;
        } else { if (url.length > 3e6) return rej({ code: 'too_large' }); done(url); }
      };
      fr.onerror = rej; fr.readAsDataURL(file);
    });
  }
  window.DFR_LOCAL = {
    blob: function (id) { try { return getItem(BKEY + id) || ''; } catch (e) { return ''; } },
    reset: function () { try { if (ls) Object.keys(ls).forEach(function (k) { if (k === KEY || k.indexOf(BKEY) === 0) ls.removeItem(k); }); mem = {}; } catch (e) {} location.reload(); },
    exportData: function () { return JSON.stringify(store); }
  };
  window.claude = { use: function (n) {
    if (n === 'db') return Promise.resolve(db);
    if (n === 'assets') return Promise.resolve({ upload: upload });
    if (n === 'user') return Promise.resolve({ canEdit: function () { return true; } });
    return Promise.reject(new Error('unavailable offline'));
  } };
})();
