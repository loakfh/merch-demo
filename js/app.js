(function () {
'use strict';
var D = document, W = window, B = D.body;
function $(s, c) { return (c || D).querySelector(s); }
function $$(s, c) { return [].slice.call((c || D).querySelectorAll(s)); }
function c01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
var mqR = matchMedia('(prefers-reduced-motion: reduce)');
var mqF = matchMedia('(pointer: fine)');
var RM = mqR.matches;
var CFG = {}, PRC = {};
try { CFG = JSON.parse($('#cfg').textContent); PRC = JSON.parse($('#prices').textContent); } catch (e) { }
var jobs = [], ticking = 0, last = 0, LOW = 0, fc = 0, ft = 0, bad = 0;
function req() { if (!ticking) { ticking = 1; requestAnimationFrame(frame); } }
function frame(now) {
ticking = 0;
var dt = last ? Math.min(64, now - last) : 16; last = now;
var sy = W.pageYOffset, live = 0, i;
for (i = 0; i < jobs.length; i++) { if (jobs[i](now, sy, dt)) live = 1; }
if (!LOW) {
fc++;
if (!ft) ft = now;
else if (now - ft >= 1000) {
if (fc * 1000 / (now - ft) < 45) { if (++bad >= 2) low(); } else bad = 0;
fc = 0; ft = now;
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
if (!W.IntersectionObserver) { cb(true); return null; }
var o = new IntersectionObserver(function (es) { cb(es[0].isIntersecting, o); }, opt || {});
o.observe(el); return o;
}
var stage = $('.stage'), scroller = $('.scroller'), track = $('#track'), belt = $('#belt');
var station = $('.station'), plates = $$('.plate', track), ticks = $$('.tick');
var cap = $('.cap'), dock = $('.dock');
var N = plates.length, NG = N / 3;
var cx = new Float64Array(N), stp = new Uint8Array(N);
var step = 170, loopW = 1020, sx = 195, top0 = 0, path = 1, K = 1.15, DRIFT = 0.010, PCAP = 24;
var cur = 0, drift = 0, hit = 0, day0 = 0, deep = 0, py0 = 0;
function mLine() {
var wide = innerWidth >= 760;
K = wide ? 1.6 : 1.15; DRIFT = wide ? 0.014 : 0.010; PCAP = wide ? 60 : 24;
step = N > 1 ? (plates[1].offsetLeft - plates[0].offsetLeft) : 170;
loopW = step * NG;
for (var i = 0; i < N; i++) cx[i] = plates[i].offsetLeft + plates[i].offsetWidth / 2;
sx = belt.offsetWidth / 2;
top0 = scroller.offsetTop;
path = Math.max(1, scroller.offsetHeight - innerHeight);
}
function jobLine(now, sy, dt) {
var p = c01((sy - top0) / path), i;
if (!LOW) drift += dt * DRIFT;
var target = -p * loopW * K - drift;
cur += (target - cur) * (1 - Math.pow(0.0016, dt / 1000));
var x = -loopW + (cur % loopW);            
track.style.setProperty('--belt', x.toFixed(2) + 'px');
var ht = 0, half = step * 0.5;
for (i = 0; i < N; i++) {
var d = cx[i] + x - sx, s = d < 0 ? 1 : 0;
if (stp[i] !== s) { stp[i] = s; plates[i].style.setProperty('--stamped', s); }
var ab = d < 0 ? -d : d;
if (ab < half) { var v = 1 - ab / half; if (v > ht) ht = v; }
}
hit += (ht - hit) * 0.25;
station.style.setProperty('--hit', hit.toFixed(3));
var day = Math.min(10, 1 + Math.floor(p * 10));
if (day !== day0) {
if (ticks[day0 - 1]) ticks[day0 - 1].dataset.on = '0';
if (ticks[day - 1]) ticks[day - 1].dataset.on = '1';
day0 = day;
}
if (!LOW) {
var py = (p - 0.5) * 2 * PCAP;
if (Math.abs(py - py0) > 0.1) {
py0 = py;
stage.style.setProperty('--py1', (py * 0.6).toFixed(1) + 'px');
stage.style.setProperty('--py2', (py * 0.4).toFixed(1) + 'px');
stage.style.setProperty('--py3', (py * 0.2).toFixed(1) + 'px');
}
}
if (p >= 0.5 && !deep) { deep = 1; stage.classList.add('is-deep'); cap.classList.add('is-on'); dock.classList.add('is-on'); }
else if (p < 0.45 && deep) { deep = 0; stage.classList.remove('is-deep'); cap.classList.remove('is-on'); }
return 1;
}
if (RM) {
for (var q = 0; q < N; q++) plates[q].style.setProperty('--stamped', q % 2 ? 1 : 0);
if (ticks[9]) ticks[9].dataset.on = '1';
cap.classList.add('is-on'); dock.classList.add('is-on');
} else {
onMeasure(mLine);
addEventListener('load', remeasure);
io(scroller, function (vis) { if (vis) add(jobLine); else del(jobLine); }, { rootMargin: '10px' });
}
function go() { stage.classList.add('go'); }
if (RM) go();
else {
var t0 = setTimeout(go, 400);
if (D.fonts && D.fonts.ready) D.fonts.ready.then(function () { clearTimeout(t0); requestAnimationFrame(go); });
}
var rises = $$('.rise');
if (RM) rises.forEach(function (e) { e.classList.add('in'); });
else rises.forEach(function (e) {
io(e, function (vis, o) { if (vis) { e.classList.add('in'); if (o) o.disconnect(); } },
{ threshold: 0.25, rootMargin: '0px 0px -12% 0px' });
});
var board = $('.board'), cs = $('[data-c="s"]'), words = $('.board__words');
var DAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
function ship() {
var n = new Date(), t = new Date(n);
t.setHours(18, 0, 0, 0);
if (n >= t) t.setDate(t.getDate() + 1);
while (t.getDay() === 0 || t.getDay() === 6) t.setDate(t.getDate() + 1);
t.setHours(18, 0, 0, 0);
return t;
}
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function roll(el, ch) {
var a = el.children[0], b = el.children[1];
if (a.textContent === ch) return;
if (RM) { a.textContent = ch; return; }
b.textContent = ch; el.classList.add('roll');
setTimeout(function () { el.classList.remove('roll'); a.textContent = ch; }, 190);
}
var digits = [], clockOn = 0, ctid = 0;
if (cs) { cs.innerHTML = '<span class="digit"><i>0</i><i class="nx">0</i></span><span class="digit"><i>0</i><i class="nx">0</i></span>'; digits = $$('.digit', cs); }
function tick() {
var ms = ship() - Date.now(); if (ms < 0) ms = 0;
var s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600),
m = Math.floor(s % 3600 / 60), ss = s % 60, e;
e = $('[data-c="d"]'); if (e) e.textContent = pad(d);
e = $('[data-c="h"]'); if (e) e.textContent = pad(h);
e = $('[data-c="m"]'); if (e) e.textContent = pad(m);
var sv = pad(ss);
if (digits[0]) { roll(digits[0], sv[0]); roll(digits[1], sv[1]); }
if (clockOn && !RM) ctid = setTimeout(tick, 1000 - (Date.now() % 1000));
}
if (board) {
var sh = ship();
if (words) words.textContent = DAYS[sh.getDay()] + ', 18:00';
io(board, function (vis) {
clockOn = vis && !D.hidden;
clearTimeout(ctid);
tick();
}, { threshold: 0.05 });
D.addEventListener('visibilitychange', function () {
clearTimeout(ctid);
if (!D.hidden && clockOn) tick();
});
var lots = $$('.lots li'), liveOn = 0, ltid = 0;
io(board, function (vis, o) {
if (!vis) return;
lots.forEach(function (li, i) {
li.style.setProperty('--d', (i * 110) + 'ms');
li.style.setProperty('--p', li.dataset.p);
});
if (o) o.disconnect();
}, { threshold: 0.2 });
var live = $('.lots li.is-live');
if (live && !RM) io(board, function (vis) {
clearInterval(ltid);
if (!vis) return;
ltid = setInterval(function () {
var v = Math.min(0.97, parseFloat(live.dataset.p) + 0.012);
live.dataset.p = v; live.style.setProperty('--p', v);
}, 2600);
}, { threshold: 0.2 });
}
function magnet(btn, reach0, kf) {
if (!btn || RM || !mqF.matches) return;
var face = $('.btn__face', btn), arrow = $('.btn__arrow', btn), shade = $('.btn__shade', btn);
var mx = 0, my = 0, tx = 0, ty = 0, r = null, rt = 0, on = 0;
function job() {
mx += (tx - mx) * 0.16; my += (ty - my) * 0.16;
btn.style.setProperty('--mx', mx.toFixed(2) + 'px');
btn.style.setProperty('--my', my.toFixed(2) + 'px');
if (Math.abs(tx - mx) > 0.1 || Math.abs(ty - my) > 0.1) return 1;
del(job); return 0;
}
function drop() { r = null; }
addEventListener('scroll', drop, { passive: true });
onMeasure(drop);
addEventListener('pointermove', function (e) {
if (e.pointerType === 'touch') return;
if (!r || e.timeStamp - rt > 200) { r = btn.getBoundingClientRect(); rt = e.timeStamp; }
var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
var dist = Math.sqrt(dx * dx + dy * dy), reach = Math.max(r.width, reach0);
if (dist < reach) {
var k = (1 - dist / reach) * kf;
tx = dx * k; ty = dy * k;
if (!on) {
on = 1;
if (face) face.style.transform = 'scale(' + (kf > 0.4 ? 1.035 : 1.025) + ')';
if (arrow) arrow.style.transform = 'translateX(3px)';
if (shade) { shade.style.opacity = 0.5; shade.style.transform = 'translateY(18px) scale(.9)'; }
}
} else {
if (!on && !tx && !ty) return;
tx = 0; ty = 0; on = 0;
if (face) face.style.transform = '';
if (arrow) arrow.style.transform = '';
if (shade) { shade.style.opacity = ''; shade.style.transform = ''; }
}
add(job);
}, { passive: true });
D.addEventListener('pointerleave', function () { tx = 0; ty = 0; on = 0; add(job); });
}
magnet($('.btn--hero'), 220, 0.42);
function src(n) { return location.pathname.indexOf('/site/') >= 0 ? '../' + n : n; }
function theme(p) {
if (!p) return;
var r = D.documentElement.style, map = { bg: '--paper', ink: '--ink', inkMuted: '--ink-60', accent: '--lime', accent2: '--lime-2' };
for (var k in map) if (p[k]) r.setProperty(map[k], p[k]);
}
function applyCfg(c) {
if (!c || !c.brand) return;
CFG = c; theme(c.palette);
$$('[data-brand]').forEach(function (e) { e.textContent = c.brand.name; });
$$('[data-city]').forEach(function (e) { e.textContent = (c.contacts || {}).city || ''; });
var m = $('.cap__mark'); if (m && c.brand.logo) m.setAttribute('src', c.brand.logo);
var ct = c.contacts || {};
$$('[data-tel]').forEach(function (e) { e.setAttribute('href', ct.phoneHref || '#'); });
$$('[data-telnum]').forEach(function (e) { e.textContent = ct.phone || ''; });
$$('[data-tg]').forEach(function (e) { e.setAttribute('href', ct.telegram || '#'); });
if (W.__MD) W.__MD.cfg = c;
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
W.__MD = { cfg: CFG, prices: PRC, jobs: jobs, add: add, del: del, req: req, io: io, measure: onMeasure, RM: RM, fine: mqF, low: function () { return LOW; } };
var me = (D.currentScript && D.currentScript.src) || 'js/app.js';
var restUrl = me.replace(/app\.js(\?.*)?$/, 'rest.js');
var booted = 0;
function boot() {
if (booted) return; booted = 1;
removeEventListener('scroll', onsc);
import(restUrl).catch(function () { });
}
function onsc() { if (W.pageYOffset > 400) boot(); }
addEventListener('scroll', onsc, { passive: true });
addEventListener('pointerdown', boot, { passive: true, once: true });
if (W.requestIdleCallback) requestIdleCallback(boot, { timeout: 2000 }); else setTimeout(boot, 2000);
mqR.addEventListener('change', function (e) {
if (e.matches) { RM = 1; jobs.length = 0; B.classList.add('rm'); }
});
})();