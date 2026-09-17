var M = window.__MD, D = document, W = window;
var CFG = M.cfg, PRC = M.prices, RM = M.RM, FINE = M.fine.matches;
function $(s, c) { return (c || D).querySelector(s); }
function $$(s, c) { return [].slice.call((c || D).querySelectorAll(s)); }
function c01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
var PL = {};
try { PL = JSON.parse($('#plabels').textContent); } catch (e) { }
function fix(x) { return Math.round(x * 1e6) / 1e6; }
function bank(x) {                                  
x = fix(x);
var f = Math.floor(x), d = x - f;
return d > 0.5 ? f + 1 : d < 0.5 ? f : (f % 2 ? f + 1 : f);
}
function tier(base, qty) {                          
var ks = Object.keys(base).map(Number).sort(function (a, b) { return a - b; }), k = ks[0];
for (var i = 0; i < ks.length; i++) if (qty >= ks[i]) k = ks[i];
return k;
}
function quote(cat, qty, urg, print) {
var t = tier(cat.base, qty), b = cat.base[t];
var pr = (print && cat.print && cat.print[print] != null) ? cat.print[print] : 0;
var k = (PRC.urgency[urg] || { k: 1 }).k;
var c = fix((b + pr) * qty * k);
return { tier: t, unit: b, pr: pr, k: k, center: Math.trunc(c), lo: bank(c * 0.85), hi: bank(c * 1.15), under: qty < cat.minQty };
}
W.__calc = { quote: quote, bank: bank, tier: tier };   
var NB = ' ';
function money(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NB); }
var cats = $('#cats'), rng = $('#qty'), qn = $('#qtyn'), qu = $('#qtyu');
var urgs = $('#urgs'), prints = $('#prints'), pstep = $('#pstep');
var res = $('#res'), sum = $('#sum'), hint = $('#hint');
var MIC = {
under: 'Ниже минимального тиража категории',
d5: '5 дней — наценка за срочность',
none: 'Считаем без нанесения',
busy: 'Пересчитываем ориентир под новый тираж',
prn: 'Приладка считается отдельно',
k1000: 'Тираж 1000: цена за штуку ниже',
bags: 'Пакеты: печать уже в цене'
};
var st = { cat: null, qty: 500, urg: 'standard', print: null };
var lo = 0, hi = 0, tlo = 0, thi = 0, busy = 0, tw = 0;
function catById(id) {
for (var i = 0; i < PRC.categories.length; i++) if (PRC.categories[i].id === id) return PRC.categories[i];
return PRC.categories[0];
}
function printOpts(cat) {
var o = [], p = cat.print || {};
for (var k in p) if (p[k] > 0) o.push(k);
return o;
}
function renderPrints(cat) {
var o = printOpts(cat), h = '';
if (!o.length) { pstep.hidden = true; st.print = null; prints.innerHTML = ''; return; }
pstep.hidden = false;
h += pill('print', '', 'Без нанесения', st.print === null);
for (var i = 0; i < o.length; i++) h += pill('print', o[i], PL[o[i]] || o[i], st.print === o[i]);
prints.innerHTML = h;
}
function pill(name, val, label, on) {
return '<li class="pill"><label><input type="radio" name="' + name + '" value="' + val + '"' + (on ? ' checked' : '') +
'><span>' + label + '</span></label></li>';
}
var t0 = 0, f0 = 0, f1 = 0;
function tweenJob(now) {
if (!t0) t0 = now;
var k = Math.min(1, (now - t0) / 420), e = 1 - Math.pow(1 - k, 3);
lo = f0 + (tlo - f0) * e; hi = f1 + (thi - f1) * e;
if (k >= 1) { lo = tlo; hi = thi; paint(lo, hi); M.del(tweenJob); tw = 0; return 0; }
paint(Math.round(lo / 50) * 50, Math.round(hi / 50) * 50);
return 1;
}
function paint(a, b) { sum.textContent = money(a) + ' – ' + money(b) + ' ₽'; }
function micro() {
var t = '';
var cat = st.cat;
if (busy) t = MIC.busy;
else if (cat.minQty && st.qty < cat.minQty) t = MIC.under;
else if (!printOpts(cat).length) t = MIC.bags;
else if (st.urg === 'days5') t = MIC.d5;
else if (st.print) t = MIC.prn;
else if (st.qty >= 1000) t = MIC.k1000;
else t = MIC.none;
if (hint.textContent !== t) hint.textContent = t;
}
function calc(soft) {
var cat = st.cat, q = quote(cat, st.qty, st.urg, st.print);
qn.textContent = money(st.qty); qu.textContent = cat.unit;
if (q.under) {
res.classList.add('is-warn');
sum.textContent = MIC.under;
hint.textContent = 'от ' + money(cat.minQty) + ' ' + cat.unit;
M.del(tweenJob); tw = 0; lo = tlo = q.lo; hi = thi = q.hi;
return;
}
res.classList.remove('is-warn');
tlo = q.lo; thi = q.hi;
if (RM || soft !== 'tween') { lo = tlo; hi = thi; paint(lo, hi); M.del(tweenJob); tw = 0; }
else {
f0 = lo; f1 = hi; t0 = 0;
if (!tw) { tw = 1; M.add(tweenJob); }
res.classList.remove('sweep'); void res.offsetWidth; res.classList.add('sweep');
}
micro();
}
function bindCalc() {
if (!cats) return;
st.cat = catById(cats.querySelector('input:checked') ? cats.querySelector('input:checked').value : PRC.categories[0].id);
st.print = null;
var o = printOpts(st.cat); if (o.length) st.print = o[0];
renderPrints(st.cat);
st.qty = parseInt(rng.value, 10) || 500;
calc('now');
cats.addEventListener('change', function (e) {
st.cat = catById(e.target.value);
var oo = printOpts(st.cat);
st.print = oo.length ? oo[0] : null;
renderPrints(st.cat);
calc('tween');
});
urgs.addEventListener('change', function (e) { st.urg = e.target.value; calc('tween'); });
prints.addEventListener('change', function (e) { st.print = e.target.value || null; calc('tween'); });
rng.addEventListener('input', function () {
st.qty = parseInt(rng.value, 10) || 0; busy = 1; calc('now');
clearTimeout(rng._t); rng._t = setTimeout(function () { busy = 0; micro(); }, 420);
});
$$('[data-q]').forEach(function (b) {
b.addEventListener('click', function () { rng.value = b.dataset.q; st.qty = +b.dataset.q; calc('tween'); });
});
}
function briefText() {
var cat = st.cat, q = quote(cat, st.qty, st.urg, st.print);
var L = ['Бриф с сайта', 'Категория: ' + cat.name, 'Тираж: ' + st.qty + ' ' + cat.unit,
'Срок: ' + PRC.urgency[st.urg].label];
if (st.print) L.push('Нанесение: ' + (PL[st.print] || st.print));
if (!q.under) L.push('Ориентир: ' + money(q.lo) + ' – ' + money(q.hi) + ' ₽');
var c = $('#contact');
if (c && c.value) L.push('Контакт: ' + c.value);
return { text: L.join('\n'), data: { category: cat.id, qty: st.qty, urgency: st.urg, print: st.print, priceLow: q.lo, priceHigh: q.hi, contact: c ? c.value : '' } };
}
/*! Единственная точка отправки заявки на весь сайт.
Заменить на webhook CRM или бота: в config.json поставить endpoint.mode = "webhook" и endpoint.url. */
function send(text, data) {
var e = CFG.endpoint || {}, c = CFG.contacts || {}, mode = e.mode || 'telegram';
function mail() {
location.href = 'mailto:' + (c.email || '') + '?subject=' + encodeURIComponent('Заявка с сайта') +
'&body=' + encodeURIComponent(text);
}
if (mode === 'webhook' && e.url) {
fetch(e.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).catch(mail);
return;
}
if (mode === 'mailto') return mail();
var u = (c.telegramUser || '').replace(/^@/, '') || (c.telegram || '').split('/').pop();
var w = W.open('https://t.me/' + u + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
if (!w) mail();
}
var sb = $('#sendbrief');
if (sb) sb.addEventListener('click', function (ev) { ev.preventDefault(); var b = briefText(); send(b.text, b.data); });
var rf = $('#reqform');
if (rf) rf.addEventListener('submit', function (ev) {
ev.preventDefault();
var ct = $('#rcontact').value, tk = $('#rtask').value;
var L = ['Заявка с сайта'];
if (tk) L.push('Задача: ' + tk);
if (ct) L.push('Контакт: ' + ct);
send(L.join('\n'), { task: tk, contact: ct });
});
var rail = $('#rail');
if (rail) {
rail.addEventListener('keydown', function (e) {
var w = rail.firstElementChild ? rail.firstElementChild.offsetWidth + 16 : 300;
if (e.key === 'ArrowRight') { rail.scrollLeft += w; e.preventDefault(); }
else if (e.key === 'ArrowLeft') { rail.scrollLeft -= w; e.preventDefault(); }
else if (e.key === 'Home') { rail.scrollLeft = 0; e.preventDefault(); }
else if (e.key === 'End') { rail.scrollLeft = rail.scrollWidth; e.preventDefault(); }
});
$$('.card', rail).forEach(function (c) {
c.addEventListener('focusin', function () { c.scrollIntoView({ block: 'nearest', inline: 'center' }); });
});
if (FINE && !RM && innerWidth >= 760) {
var v = 0, dragging = 0, px = 0, samples = [];
function glide() {
rail.scrollLeft += v; v *= 0.92;
if (Math.abs(v) < 0.08) { v = 0; M.del(glide); return 0; }
return 1;
}
rail.addEventListener('wheel', function (e) {
var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
var max = rail.scrollWidth - rail.clientWidth;
if ((d < 0 && rail.scrollLeft > 0) || (d > 0 && rail.scrollLeft < max)) {
e.preventDefault(); v += d * 0.9; M.add(glide);
}
}, { passive: false });
rail.addEventListener('pointerdown', function (e) {
if (e.pointerType !== 'mouse') return;
dragging = 1; px = e.clientX; samples = []; v = 0; rail.setPointerCapture(e.pointerId);
});
rail.addEventListener('pointermove', function (e) {
if (!dragging) return;
var dx = e.clientX - px; px = e.clientX;
rail.scrollLeft -= dx;
samples.push(dx); if (samples.length > 5) samples.shift();
});
rail.addEventListener('pointerup', function () {
if (!dragging) return; dragging = 0;
var s = 0, w = 0;
for (var i = 0; i < samples.length; i++) { s += samples[i] * (i + 1); w += i + 1; }
v = w ? -s / w * 1.6 : 0; M.add(glide);
});
var hot = null, hr = null;
rail.addEventListener('pointerover', function (e) {
var c = e.target.closest ? e.target.closest('.card') : null;
if (!c || c === hot) return;
if (hot) reset(hot);
hot = c; hr = c.getBoundingClientRect();
c.style.willChange = 'transform';
});
rail.addEventListener('pointermove', function (e) {
if (!hot || !hr) return;
var nx = (e.clientX - hr.left) / hr.width - 0.5;
var ny = (e.clientY - hr.top) / hr.height - 0.5;
hot.style.setProperty('--ry', (nx * 14).toFixed(2) + 'deg');
hot.style.setProperty('--rx', (-ny * 10).toFixed(2) + 'deg');
hot.style.setProperty('--lift', '-12px');
hot.style.setProperty('--sc', '1.03');
hot.style.setProperty('--imsc', '1.06');
hot.style.setProperty('--glare', '.35');
hot.style.setProperty('--gx', ((nx + 0.5) * 100).toFixed(1) + '%');
hot.style.setProperty('--gy', ((ny + 0.5) * 100).toFixed(1) + '%');
}, { passive: true });
function reset(c) {
['--ry', '--rx', '--lift', '--sc', '--imsc', '--glare'].forEach(function (p) { c.style.removeProperty(p); });
setTimeout(function () { if (c !== hot) c.style.willChange = ''; }, 400);
}
rail.addEventListener('pointerleave', function () { if (hot) { reset(hot); hot = null; hr = null; } });
M.measure(function () { if (hot) hr = hot.getBoundingClientRect(); });
}
}
$$('.marq').forEach(function (m) {
var t = $('.marq__t', m);
if (!t) return;
var w = t.scrollWidth / 2, speed = innerWidth >= 760 ? 28 : 22;
t.style.setProperty('--dur', Math.max(20, Math.round(w / speed)) + 's');
M.io(m, function (vis) { m.classList.toggle('in', vis); }, { threshold: 0 });
});
var days = $('.days'), dstage = $('.days__stage');
if (days && dstage) {
var items = $$('.days__it', days), big = $('#daybig'), bar = $('#daybar');
var dtop = 0, dpath = 1, cur2 = -1, dday = 0;
M.measure(function () { dtop = days.offsetTop; dpath = Math.max(1, days.offsetHeight - innerHeight); });
function jobDays(now, sy) {
var dp = c01((sy - dtop) / dpath);
bar.style.setProperty('--dp', dp.toFixed(3));
var n = items.length;
var i = Math.min(n - 1, Math.floor(dp * n + 0.0001));
if (i !== cur2) {
if (items[cur2]) items[cur2].classList.remove('on');
items[i].classList.add('on');
cur2 = i;
}
var d = Math.min(10, 1 + Math.floor(dp * 9.999));
if (d !== dday) { dday = d; big.textContent = d; }
return 1;
}
if (RM) { items.forEach(function (e) { e.classList.add('on'); }); big.textContent = '10'; bar.style.setProperty('--dp', 1); }
else M.io(days, function (vis) { if (vis) M.add(jobDays); else M.del(jobDays); }, { rootMargin: '10px' });
}
if (FINE && !RM) $$('.btn--sec').forEach(function (b) {
var face = $('.btn__face', b), sh = $('.btn__shade', b), r = null, mx = 0, my = 0, tx = 0, ty = 0;
function job() {
mx += (tx - mx) * 0.16; my += (ty - my) * 0.16;
b.style.setProperty('--mx', mx.toFixed(2) + 'px'); b.style.setProperty('--my', my.toFixed(2) + 'px');
if (Math.abs(tx - mx) > 0.1 || Math.abs(ty - my) > 0.1) return 1;
M.del(job); return 0;
}
b.addEventListener('pointerenter', function () { r = b.getBoundingClientRect(); });
b.addEventListener('pointermove', function (e) {
if (!r) r = b.getBoundingClientRect();
var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
var d = Math.sqrt(dx * dx + dy * dy), reach = Math.max(r.width, 180);
var k = d < reach ? (1 - d / reach) * 0.34 : 0;
tx = dx * k; ty = dy * k;
if (face) face.style.transform = k ? 'scale(1.025)' : '';
if (sh) { sh.style.opacity = k ? 0.5 : ''; sh.style.transform = k ? 'translateY(18px) scale(.9)' : ''; }
M.add(job);
}, { passive: true });
b.addEventListener('pointerleave', function () {
tx = 0; ty = 0; r = null;
if (face) face.style.transform = '';
if (sh) { sh.style.opacity = ''; sh.style.transform = ''; }
M.add(job);
});
});
var IMG = {};
$$('#rail .card').forEach(function (c) { IMG[c.dataset.id] = c.dataset.img || ''; });
var CAPS = {};
$$('#rail .card').forEach(function (c) { CAPS[c.dataset.id] = $('.card__d', c).textContent; });
var ALTS = {};
$$('#rail .card').forEach(function (c) { ALTS[c.dataset.id] = $('img', c) ? $('img', c).alt : ''; });
M.onPrices = function (p) {
if (JSON.stringify(p) === JSON.stringify(PRC)) return;
PRC = p; M.prices = p;
if (cats) {
var h = '';
for (var i = 0; i < p.categories.length; i++) {
var c = p.categories[i];
h += pill('cat', c.id, c.name, i === 0);
}
cats.innerHTML = h;
st.cat = p.categories[0];
var o = printOpts(st.cat); st.print = o.length ? o[0] : null;
renderPrints(st.cat); calc('now');
}
if (rail) {
var r = '';
for (var j = 0; j < p.categories.length; j++) {
var q = p.categories[j], im = IMG[q.id];
r += '<li class="card" data-id="' + q.id + '" data-img="' + im + '"><div class="card__box">' +
(im ? '<img src="img/' + im + '-400.webp" srcset="img/' + im + '-400.webp 400w, img/' + im + '-760.webp 760w" sizes="(min-width:760px) 420px, 78vw" width="400" height="300" loading="lazy" decoding="async" alt="' + (ALTS[q.id] || q.name) + '">' : '') +
'<span class="card__glare" aria-hidden="true"></span></div>' +
'<div class="card__t"><h3 class="card__n">' + q.name + '</h3><span class="card__d">' + (CAPS[q.id] || ('от ' + q.minQty + ' ' + q.unit)) + '</span></div></li>';
}
rail.innerHTML = r;
}
};
bindCalc();
var INLINE = $('#prices').textContent;
if (JSON.stringify(PRC) !== JSON.stringify(JSON.parse(INLINE))) M.onPrices(PRC);