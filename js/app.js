(function () {
'use strict';
var D = document, W = window, B = D.body, E = D.documentElement;
function $(s, c) { return (c || D).querySelector(s); }
function $$(s, c) { return [].slice.call((c || D).querySelectorAll(s)); }
var mqR = matchMedia('(prefers-reduced-motion: reduce)');
var mqF = matchMedia('(pointer: fine)');
var mqD = matchMedia('(prefers-color-scheme: dark)');
var RM = mqR.matches;
var CFG = {}, PRC = {}, S = {};
try { CFG = JSON.parse($('#cfg').textContent); PRC = JSON.parse($('#prices').textContent); } catch (e) { }
try { S = JSON.parse($('#slots').textContent); } catch (e) { }
var jobs = [], ticking = 0, last = 0, LOW = 0, fc = 0, ft = 0, bad = 0;
function req() { if (!ticking) { ticking = 1; requestAnimationFrame(frame); } }
function frame(now) {
ticking = 0;
var gap = last ? now - last : 16, dt = Math.min(64, gap); last = now;
var sy = W.pageYOffset, live = 0, i;
for (i = 0; i < jobs.length; i++) { if (jobs[i](now, sy, dt)) live = 1; }
if (!LOW) {
if (gap > 100) { fc = 0; ft = now; }
else {
fc++;
if (!ft) ft = now;
else if (now - ft >= 1000) {
if (fc * 1000 / (now - ft) < 45) { if (++bad >= 2) low(); } else bad = 0;
fc = 0; ft = now;
}
}
}
if (live && !D.hidden) req();
}
function low() { LOW = 1; B.classList.add('low'); }
function add(f) { if (jobs.indexOf(f) < 0) { jobs.push(f); req(); } }
function del(f) { var i = jobs.indexOf(f); if (i >= 0) jobs.splice(i, 1); }
var nav = navigator, con = nav.connection;
if ((nav.hardwareConcurrency || 8) <= 4 || (con && con.saveData) || matchMedia('(update: slow)').matches) low();
var meas = [], mt = 0;
function onMeasure(f) { meas.push(f); f(); }
function remeasure() {
clearTimeout(mt);
mt = setTimeout(function () { for (var i = 0; i < meas.length; i++) meas[i](); req(); }, 150);
}
addEventListener('resize', remeasure, { passive: true });
addEventListener('scroll', req, { passive: true });
D.addEventListener('visibilitychange', function () { if (!D.hidden) { last = 0; req(); } });
function io(el, cb, opt) {
if (!el) return null;
if (!W.IntersectionObserver) { cb(true); return null; }
var o = new IntersectionObserver(function (es) { cb(es[0].isIntersecting, o); }, opt || {});
o.observe(el); return o;
}
var tb = $('#themeb'), palLive = 0;
function dark() { var t = E.dataset.theme; return t ? t === 'dark' : mqD.matches; }
function palette() {
var p = CFG.palette; if (!palLive || !p || !p.light) return;
var s = dark() ? (p.dark || p.light) : p.light, sty = E.style, k;
for (k in s) sty.setProperty('--' + k.replace(/([A-Z0-9])/g, '-$1').toLowerCase(), s[k]);
}
function colorMeta() {
var p = CFG.palette || {}, l = $('#tcl'), k = $('#tcd');
if (!l || !k || !p.light || !p.dark) return;
if (E.dataset.theme) { var c = dark() ? p.dark.bg : p.light.bg; l.content = c; k.content = c; }
else { l.content = p.light.bg; k.content = p.dark.bg; }
}
function paintTheme() {
if (tb) tb.setAttribute('aria-pressed', dark() ? 'true' : 'false');
colorMeta(); palette();
}
if (tb) tb.addEventListener('click', function () {
E.dataset.theme = dark() ? 'light' : 'dark';
try { localStorage.setItem('t', E.dataset.theme); } catch (e) { }
paintTheme();
});
mqD.addEventListener('change', function () { if (!E.dataset.theme) paintTheme(); });
paintTheme();
var hero = $('.hero');
function go() { if (hero) hero.classList.add('go'); }
if (RM) go();
else {
var gt = setTimeout(go, 400);
if (D.fonts && D.fonts.ready) D.fonts.ready.then(function () { clearTimeout(gt); requestAnimationFrame(go); });
}
var rises = $$('.rise');
if (RM) rises.forEach(function (e) { e.classList.add('in'); });
else rises.forEach(function (e) {
io(e, function (vis, o) { if (vis) { e.classList.add('in'); if (o) o.disconnect(); } },
{ threshold: 0.25, rootMargin: '0px 0px -12% 0px' });
});
var capEl = $('.cap'), dockEl = $('.dock');
io(hero, function (vis) {
if (vis) { capEl.classList.remove('is-on'); dockEl.classList.remove('is-on'); }
else { capEl.classList.add('is-on'); dockEl.classList.add('is-on'); }
}, { threshold: 0, rootMargin: '-45% 0px 0px 0px' });
var clock = $('#clock'), board = $('#board'), bcap = $('#boardcap');
var bTo = 0, bVis = 0, ctid = 0;
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function put(k, v) { var e = $('[data-c="' + k + '"]', clock); if (e) e.textContent = v; }
function tick() {
clearTimeout(ctid);
if (!bTo || !clock) return;
var ms = bTo - Date.now(); if (ms < 0) ms = 0;
var s = Math.floor(ms / 1000);
put('d', pad(Math.floor(s / 86400))); put('h', pad(Math.floor(s % 86400 / 3600)));
put('m', pad(Math.floor(s % 3600 / 60))); put('s', pad(s % 60));
if (bVis && !D.hidden) ctid = setTimeout(tick, 1000 - (Date.now() % 1000));
}
function setDate(iso) {
bTo = 0;
if (iso) { var d = new Date(iso + 'T00:00:00'); if (!isNaN(+d)) bTo = +d; }
if (bcap) bcap.textContent = S[bTo ? 'board.cap' : 'board.empty'] || '';
if (clock) clock.hidden = !bTo;
tick();
}
io(board, function (vis) { bVis = vis; tick(); }, { threshold: 0.05 });
D.addEventListener('visibilitychange', function () { if (!D.hidden) tick(); });
setDate('');
function magnet(btn, reach0, kf) {
if (!btn || RM || !mqF.matches) return;
var mx = 0, my = 0, tx = 0, ty = 0, r = null, rt = 0, on = 0;
function job() {
mx += (tx - mx) * 0.16; my += (ty - my) * 0.16;
btn.style.setProperty('--mx', mx.toFixed(2) + 'px');
btn.style.setProperty('--my', my.toFixed(2) + 'px');
if (Math.abs(tx - mx) > 0.1 || Math.abs(ty - my) > 0.1) return 1;
del(job); return 0;
}
addEventListener('scroll', function () { r = null; }, { passive: true });
onMeasure(function () { r = null; });
addEventListener('pointermove', function (e) {
if (e.pointerType === 'touch') return;
if (!r || e.timeStamp - rt > 200) { r = btn.getBoundingClientRect(); rt = e.timeStamp; }
var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
var dist = Math.sqrt(dx * dx + dy * dy), reach = Math.max(r.width, reach0);
if (dist < reach) { var k = (1 - dist / reach) * kf; tx = dx * k; ty = dy * k; on = 1; }
else { if (!on && !tx && !ty) return; tx = 0; ty = 0; on = 0; }
add(job);
}, { passive: true });
D.addEventListener('pointerleave', function () { tx = 0; ty = 0; on = 0; add(job); });
}
magnet($('.btn--hero'), 220, 0.42);
var liveT = [];
function jobPlus() {
if (LOW) return 0;
for (var i = 0; i < liveT.length; i++) {
var e = liveT[i], r = e.parentNode.getBoundingClientRect();
e.style.setProperty('--py', (((r.top + r.height / 2) / innerHeight - 0.5) * -44).toFixed(1) + 'px');
}
return 0;
}
if (!RM) $$('.plus--tilt').forEach(function (e) {
io(e.parentNode, function (vis) {
var i = liveT.indexOf(e);
if (vis && i < 0) { liveT.push(e); add(jobPlus); }
else if (!vis && i >= 0) { liveT.splice(i, 1); if (!liveT.length) del(jobPlus); }
}, { rootMargin: '10% 0px' });
});
function src(n) { return location.pathname.indexOf('/site/') >= 0 ? '../' + n : n; }
function applyCfg(c) {
if (!c || !c.brand) return;
var was = JSON.stringify(CFG.palette);
CFG = c;
if (W.__MD) W.__MD.cfg = c;
if (JSON.stringify(c.palette) !== was) { palLive = 1; palette(); }
colorMeta();
$$('[data-brand]').forEach(function (e) { e.textContent = c.brand.name; });
$$('[data-city]').forEach(function (e) { e.textContent = (c.contacts || {}).city || ''; });
var m = $('.cap__mark'); if (m && c.brand.logo) m.setAttribute('src', c.brand.logo);
var ct = c.contacts || {};
$$('[data-tel]').forEach(function (e) { e.setAttribute('href', ct.phoneHref || '#'); });
$$('[data-telnum]').forEach(function (e) { e.textContent = ct.phone || ''; });
$$('[data-tg]').forEach(function (e) { e.setAttribute('href', ct.telegram || '#'); });
}
fetch(src('config.json'), { cache: 'no-store' })
.then(function (r) { return r.ok ? r.json() : null; }).then(applyCfg).catch(function () { });
fetch(src('prices.json'), { cache: 'no-store' })
.then(function (r) { return r.ok ? r.json() : null; })
.then(function (p) {
if (!p || !p.categories) return;
PRC = p;
if (W.__MD) { W.__MD.prices = p; if (W.__MD.onPrices) W.__MD.onPrices(p); }
}).catch(function () { });
W.__MD = {
cfg: CFG, prices: PRC, S: S, jobs: jobs, add: add, del: del, io: io, RM: RM, setDate: setDate
};
var me = (D.currentScript && D.currentScript.src) || 'js/app.js';
var restUrl = me.replace(/app\.js(\?.*)?$/, 'rest.js');
var booted = 0;
function boot() {
if (booted) return; booted = 1;
removeEventListener('scroll', onsc);
import(restUrl).catch(function () { });
}
function onsc() { if (W.pageYOffset > 300) boot(); }
addEventListener('scroll', onsc, { passive: true });
addEventListener('pointerdown', boot, { passive: true, once: true });
if (W.requestIdleCallback) requestIdleCallback(boot, { timeout: 2000 }); else setTimeout(boot, 2000);
mqR.addEventListener('change', function (e) {
if (e.matches) { RM = 1; jobs.length = 0; B.classList.add('rm'); }
});
})();