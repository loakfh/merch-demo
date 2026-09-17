var M = window.__MD, D = document, W = window;
var CFG = M.cfg, PRC = M.prices, RM = M.RM, S = M.S || {};
function $(s, c) { return (c || D).querySelector(s); }
function $$(s, c) { return [].slice.call((c || D).querySelectorAll(s)); }
var PL = {};
try { PL = JSON.parse($('#plabels').textContent); } catch (e) { }
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function txt(k, a) {
var s = S[k] == null ? k : S[k];
if (a) for (var i in a) s = s.split('{' + i + '}').join(a[i]);
return s;
}
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
function total(list) {
var lo = 0, hi = 0, n = 0;
for (var i = 0; i < list.length; i++) {
var q = list[i].r || list[i];
if (q.under) continue;
lo += q.lo; hi += q.hi; n++;
}
return { lo: lo, hi: hi, n: n };
}
W.__calc = { quote: quote, bank: bank, tier: tier, total: total };   
var NB = ' ';
function money(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NB); }
var KEY = 'md.wz.v1';
var st = {
cats: [], own: 0, ownTxt: '', qty: 500, qtyMode: 'common', qtyBy: {},
urg: 'standard', date: '', rushDays: 0, print: {}, details: '', contact: '', step: 1, urgT: 0
};
function catById(id) {
for (var i = 0; i < PRC.categories.length; i++) if (PRC.categories[i].id === id) return PRC.categories[i];
return null;
}
function printOpts(cat) {
var o = [], p = (cat && cat.print) || {};
for (var k in p) if (p[k] > 0) o.push(k);
return o;
}
function chosen() {
var out = [];
for (var i = 0; i < PRC.categories.length; i++) {
var c = PRC.categories[i];
if (st.cats.indexOf(c.id) >= 0) out.push(c);
}
return out;
}
function anyPrint() {
var c = chosen();
for (var i = 0; i < c.length; i++) if (printOpts(c[i]).length) return 1;
return 0;
}
function stepMap() { var m = [1, 2, 3]; if (anyPrint()) m.push(4); m.push(5); return m; }
function seq() { return stepMap().concat([6]); }
function nextOf(n) { var s = seq(), i = s.indexOf(n); return i >= 0 && i < s.length - 1 ? s[i + 1] : n; }
function prevOf(n) { var s = seq(), i = s.indexOf(n); return i > 0 ? s[i - 1] : n; }
function panel(n) { return n === 6 ? $('#wz-res') : $('#wz-s' + n); }
function save() {
try {
sessionStorage.setItem(KEY, JSON.stringify({
v: 1, step: st.step, cats: st.cats, own: st.own, ownTxt: st.ownTxt, qty: st.qty,
qtyMode: st.qtyMode, qtyBy: st.qtyBy, urg: st.urg, date: st.date, print: st.print,
details: st.details, contact: st.contact, urgT: st.urgT
}));
} catch (e) { }
}
function load() {
var o = null;
try { o = JSON.parse(sessionStorage.getItem(KEY)); } catch (e) { }
if (!o || o.v !== 1) return;
st.cats = (o.cats || []).filter(function (id) { return !!catById(id); });
st.own = o.own ? 1 : 0; st.ownTxt = o.ownTxt || '';
st.qty = +o.qty > 0 ? +o.qty : 500;
st.qtyMode = o.qtyMode === 'own' ? 'own' : 'common';
st.qtyBy = o.qtyBy || {};
st.urg = PRC.urgency[o.urg] ? o.urg : 'standard';
st.date = o.date || ''; st.details = o.details || ''; st.contact = o.contact || '';
st.urgT = o.urgT ? 1 : 0;
st.print = {};
for (var id in (o.print || {})) {
var c = catById(id);
if (c && (!o.print[id] || (c.print && c.print[o.print[id]] > 0))) st.print[id] = o.print[id];
}
if (!st.cats.length && !st.own) { st.step = 1; return; }
if (seq().indexOf(o.step) >= 0) st.step = o.step;
}
var wz = $('#wz');
var box = $('#wzsteps'), count = $('#wzcount'), liveP = $('#wzlive');
var rng = $('#qty'), qi = $('#qtyi'), qn = $('#qtyn'), qu = $('#qtyu');
var res = $('#res'), sumO = $('#sum'), resHint = $('#reshint');
function defPrint(c) { var o = printOpts(c); return o.length ? o[0] : null; }
function pill(name, val, label, on, type) {
return '<li class="pill"><label><input type="' + (type || 'radio') + '" name="' + name + '" value="' + val + '"' +
(on ? ' checked' : '') + '><span>' + esc(label) + '</span></label></li>';
}
function qtyOf(c) { return st.qtyMode === 'own' ? (+st.qtyBy[c.id] || st.qty) : st.qty; }
function buildQtyRows() {
var wrap = $('#qtyrows');
wrap.hidden = st.qtyMode !== 'own';
$('#qtymode').textContent = st.qtyMode === 'own' ? txt('wz.qty.each') : txt('wz.qty.common');
if (st.qtyMode !== 'own') { wrap.innerHTML = ''; return; }
var h = '', cs = chosen();
for (var i = 0; i < cs.length; i++) {
var c = cs[i], q = +st.qtyBy[c.id] || st.qty;
h += '<li class="wz__row"><p class="wz__rowh">' + esc(c.name) + '</p>' +
'<p class="wz__rowq"><label class="vh" for="q-' + c.id + '">' + esc(c.name) + '</label>' +
'<input class="fld__i" id="q-' + c.id + '" data-qid="' + c.id + '" type="number" inputmode="numeric" min="1" max="100000" step="1" value="' + q + '">' +
'<span class="wz__rowu">' + esc(c.unit) + ' · ' + esc(txt('wz.min', { n: c.minQty, u: c.unit })) + '</span></p>' +
'<p class="wz__warn" data-warn="' + c.id + '"' + (q < c.minQty ? '' : ' hidden') + '>Ниже минимального тиража категории</p></li>';
}
wrap.innerHTML = h;
}
function buildPrints() {
var wrap = $('#printrows'), h = '', cs = chosen(), any = 0;
for (var i = 0; i < cs.length; i++) {
var c = cs[i], o = printOpts(c);
if (!o.length) continue;
if (!(c.id in st.print)) st.print[c.id] = defPrint(c);
h += '<li class="wz__row"><p class="wz__rowh">' + esc(c.name) + '</p><ul class="pills">' +
pill('pr_' + c.id, '', txt('wz.print.none'), !st.print[c.id]);
for (var j = 0; j < o.length; j++) {
h += pill('pr_' + c.id, o[j], PL[o[j]] || o[j], st.print[c.id] === o[j]);
if (st.print[c.id] === o[j]) any = 1;
}
h += '</ul></li>';
}
wrap.innerHTML = h;
$('#wzprn').textContent = any ? 'Приладка считается отдельно' : 'Считаем без нанесения';
}
function nav() {
var m = stepMap(), i = m.indexOf(st.step), done = st.step === 6;
$$('.wz__seg').forEach(function (b) {
var s = +b.dataset.s, k = m.indexOf(s);
b.parentNode.hidden = k < 0;
if (k < 0) return;
$('.wz__segn', b).textContent = k + 1;
if (s === st.step) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
b.classList.toggle('is-done', done || (i >= 0 && k < i));
b.disabled = !(done || (i >= 0 && k <= i));
});
count.hidden = done;
if (!done) count.textContent = txt('wz.count', { n: i + 1, m: m.length });
}
function live() {
var m = stepMap(), i = m.indexOf(st.step), p = panel(st.step);
var h = p ? $('.wz__h', p).textContent : '';
liveP.textContent = (i >= 0 ? txt('wz.count', { n: i + 1, m: m.length }) + '. ' : '') + h;
}
function err(n, msg) {
var p = $('#wz-e' + n);
if (!p) return 0;
p.textContent = msg; p.hidden = false; p.setAttribute('role', 'alert');
return 0;
}
function clearErr(n) { var p = $('#wz-e' + n); if (p) { p.hidden = true; p.removeAttribute('role'); } }
function valid(n) {
if (n === 1) {
if (!st.cats.length && !st.own) { err(1, txt('wz.err.cat')); var f = $('#wzcats input'); if (f) f.focus(); return 0; }
if (st.own && !st.ownTxt.trim()) { err(1, txt('wz.err.own')); $('#wzowntxt').focus(); return 0; }
clearErr(1); return 1;
}
if (n === 2) {
if (!(st.qty > 0)) { err(2, txt('wz.err.qty')); qi.focus(); return 0; }
if (st.qtyMode === 'own') {
var cs = chosen();
for (var i = 0; i < cs.length; i++) if (!(+st.qtyBy[cs[i].id] > 0)) { err(2, txt('wz.err.qty')); return 0; }
}
clearErr(2); return 1;
}
if (n === 3) {
if (st.date && new Date(st.date + 'T00:00:00') < today()) { err(3, txt('wz.err.date')); return 0; }
clearErr(3); return 1;
}
return 1;
}
function go(to, dir) {
var from = st.step, a = panel(from), b = panel(to);
if (!b || to === from) return;
st.step = to;
if (to === 2) buildQtyRows();
if (to === 4) buildPrints();
if (to === 6) buildRes();
if (RM) { a.hidden = true; b.hidden = false; }
else {
var h0 = box.offsetHeight;
a.classList.add('is-out'); a.setAttribute('inert', ''); a.setAttribute('aria-hidden', 'true');
a.style.setProperty('--d', (dir < 0 ? 28 : -28) + 'px');
b.style.setProperty('--d', (dir < 0 ? -28 : 28) + 'px');
b.classList.add('is-in'); b.hidden = false;
var h1 = b.offsetHeight;
box.style.height = h0 + 'px';
requestAnimationFrame(function () {
box.style.height = h1 + 'px';
b.classList.remove('is-in'); b.style.removeProperty('--d');
});
setTimeout(function () {
a.hidden = true; a.classList.remove('is-out');
a.removeAttribute('inert'); a.removeAttribute('aria-hidden'); a.style.removeProperty('--d');
box.style.height = '';
}, 420);
}
nav(); live();
$('.wz__h', b).focus({ preventScroll: true });
save();
}
function next() { if (valid(st.step)) go(nextOf(st.step), 1); }
function back() { go(prevOf(st.step), -1); }
function itemsOf() {
var out = [], cs = chosen();
for (var i = 0; i < cs.length; i++) {
var c = cs[i], q = qtyOf(c), p = st.print[c.id] || null;
if (p && !(c.print && c.print[p] > 0)) p = null;
out.push({ c: c, q: q, p: p, r: quote(c, q, st.urg, p) });
}
return out;
}
var lo = 0, hi = 0, tlo = 0, thi = 0, f0 = 0, f1 = 0, t0 = 0, tw = 0;
function paint(a, b) { sumO.textContent = money(a) + ' – ' + money(b) + ' ₽'; }
function tweenJob(now) {
if (!t0) t0 = now;
var k = Math.min(1, (now - t0) / 420), e = 1 - Math.pow(1 - k, 3);
lo = f0 + (tlo - f0) * e; hi = f1 + (thi - f1) * e;
if (k >= 1) { lo = tlo; hi = thi; paint(lo, hi); M.del(tweenJob); tw = 0; return 0; }
paint(Math.round(lo / 50) * 50, Math.round(hi / 50) * 50);
return 1;
}
function buildRes() {
var list = itemsOf(), t = total(list), h = '', i;
for (i = 0; i < list.length; i++) {
var it = list[i], pr;
if (it.p) pr = PL[it.p] || it.p;
else pr = printOpts(it.c).length ? txt('wz.print.none') : txt('wz.bags');
h += '<li class="wz__row"><p class="wz__rowh">' + esc(it.c.name) + '</p>' +
'<p class="wz__rowp">' + money(it.q) + ' ' + esc(it.c.unit) + ' · ' + esc(pr) + '</p>' +
'<p class="wz__rowv">' + (it.r.under ? esc(txt('wz.res.noprice')) : money(it.r.lo) + ' – ' + money(it.r.hi) + ' ₽') + '</p>' +
(it.r.under ? '<p class="wz__warn">Ниже минимального тиража категории</p>' : '') + '</li>';
}
if (st.own && st.ownTxt) h += '<li class="wz__row"><p class="wz__rowh">' + esc(txt('wz.own')) + '</p>' +
'<p class="wz__rowp">' + esc(st.ownTxt) + '</p><p class="wz__rowv">' + esc(txt('wz.own.noprice')) + '</p></li>';
$('#resrows').innerHTML = h;
var hints = [];
if (!t.n) {
res.classList.add('is-warn');
M.del(tweenJob); tw = 0;
sumO.textContent = list.length ? txt('wz.allunder') : txt('wz.own.noprice');
} else {
res.classList.remove('is-warn');
tlo = t.lo; thi = t.hi;
if (RM) { lo = tlo; hi = thi; paint(lo, hi); }
else {
f0 = lo; f1 = hi; t0 = 0;
if (!tw) { tw = 1; M.add(tweenJob); }
res.classList.remove('sweep'); void res.offsetWidth; res.classList.add('sweep');
}
if (t.n < list.length) hints.push(txt('wz.partial', { n: t.n, m: list.length }));
}
for (i = 0; i < list.length; i++) if (!printOpts(list[i].c).length) { hints.push(txt('wz.bags')); break; }
if (st.rushDays) hints.push(txt('wz.rush'));
else if (st.urg === 'days5') hints.push('5 дней — наценка за срочность');
resHint.textContent = hints.join('. ');
var s = '<li><span>' + esc(txt('wz.sum.urg')) + '</span><b>' + esc(PRC.urgency[st.urg].label) +
'</b><button type="button" class="wz__edit" data-to="3">' + esc(txt('wz.edit')) + '</button></li>';
if (st.date) s += '<li><span>' + esc(txt('wz.sum.date')) + '</span><b>' + esc(ruDate(st.date)) +
'</b><button type="button" class="wz__edit" data-to="3">' + esc(txt('wz.edit')) + '</button></li>';
if (st.details) s += '<li><span>' + esc(txt('wz.sum.details')) + '</span><b>' + esc(st.details) +
'</b><button type="button" class="wz__edit" data-to="5">' + esc(txt('wz.edit')) + '</button></li>';
$('#ressum').innerHTML = s;
}
function ruDate(iso) { var p = iso.split('-'); return p[2] + '.' + p[1] + '.' + p[0]; }
function today() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function briefText(src) {
var list = itemsOf(), t = total(list), L = [src === 'dialog' ? 'Бриф с сайта, диалог' : 'Бриф с сайта'], i;
L.push('Позиции:');
var items = [];
for (i = 0; i < list.length; i++) {
var it = list[i], pr = it.p ? (PL[it.p] || it.p) : (printOpts(it.c).length ? 'без нанесения' : 'печать в цене');
L.push('— ' + it.c.name + ': ' + it.q + ' ' + it.c.unit + ', ' + pr + ', ' +
(it.r.under ? 'ниже минимального тиража, ориентир не считали' : money(it.r.lo) + ' – ' + money(it.r.hi) + ' ₽'));
items.push({ category: it.c.id, qty: it.q, print: it.p, priceLow: it.r.under ? null : it.r.lo, priceHigh: it.r.under ? null : it.r.hi });
}
if (st.own && st.ownTxt) L.push('— Свой вариант: ' + st.ownTxt + ' (ориентир не считали)');
L.push('Срок: ' + PRC.urgency[st.urg].label);
if (st.date) L.push('Желаемая дата: ' + ruDate(st.date));
if (st.rushDays) L.push('Желаемый срок: ' + st.rushDays + ' дней — вне сетки');
if (t.n) L.push('Ориентир всего: ' + money(t.lo) + ' – ' + money(t.hi) + ' ₽');
if (st.details) L.push('Детали: ' + st.details);
if (st.contact) L.push('Контакт: ' + st.contact);
var one = list.length === 1 && !st.own;
var data = {
items: items, custom: st.own ? st.ownTxt : '', urgency: st.urg, deadline: st.date,
qtyMode: st.qtyMode, priceLow: t.n ? t.lo : null, priceHigh: t.n ? t.hi : null,
details: st.details, contact: st.contact,
category: one ? list[0].c.id : null, qty: one ? list[0].q : null, print: one ? list[0].p : null
};
if (src) data.source = src;
return { text: cut(L), data: data };
}
function cut(L) {
var s = L.join('\n');
if (s.length <= 1800) return s;
var i;
for (i = 0; i < L.length; i++) if (L[i].indexOf('Детали: ') === 0) L[i] = 'Детали: ' + L[i].slice(8, 200) + '…';
s = L.join('\n'); if (s.length <= 1800) return s;
for (i = L.length - 1; i >= 0; i--) if (L[i].indexOf('— Свой вариант') === 0) L.splice(i, 1);
s = L.join('\n'); if (s.length <= 1800) return s;
var n = 0, out = [];
for (i = 0; i < L.length; i++) { if (L[i].indexOf('— ') === 0) { n++; continue; } out.push(L[i]); }
out.splice(1, 1, n + ' позиций, список уточним');
return out.join('\n').slice(0, 1800);
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
function syncCats() {
$$('#wzcats input').forEach(function (i) {
i.checked = i.value === '__own' ? !!st.own : st.cats.indexOf(i.value) >= 0;
});
$('#wzownwrap').hidden = !st.own;
$('#wzs1hint').textContent = (st.cats.length + (st.own ? 1 : 0)) ? txt('wz.s1.hint', { n: st.cats.length + (st.own ? 1 : 0) }) : '';
}
function syncUrg() { $$('#urgs input').forEach(function (i) { i.checked = i.value === st.urg; }); }
function syncQty() {
qn.textContent = money(st.qty);
var cs = chosen();
qu.textContent = cs.length ? cs[0].unit : 'шт';
if (qi.value !== String(st.qty)) qi.value = st.qty;
rng.value = Math.min(5000, Math.max(10, st.qty));
rng.classList.toggle('is-over', st.qty > 5000);
$('#qtymode').textContent = st.qty > 5000 ? txt('wz.qty.over') :
(st.qtyMode === 'own' ? txt('wz.qty.each') : txt('wz.qty.common'));
}
function normQty(v) {
v = String(v).replace(/\s/g, '').replace(',', '.');
var n = parseFloat(v);
if (!isFinite(n) || n < 1) return 0;
n = Math.floor(n);
return n > 100000 ? 100000 : n;
}
function dateCalc() {
var v = $('#wzdate').value, note = $('#wzdaten'), msgs = [];
st.rushDays = 0;
if (v) {
var d = new Date(v + 'T00:00:00');
if (isNaN(+d) || d < today()) { st.date = ''; err(3, txt('wz.err.date')); note.textContent = ''; M.setDate(''); save(); return; }
clearErr(3);
st.date = v;
var days = Math.ceil((+d - +today()) / 86400000);
var want = days >= 15 ? 'standard' : days >= 10 ? 'days10' : 'days5';
if (!st.urgT) { st.urg = want; syncUrg(); }
else if (st.urg !== want) msgs.push(txt('wz.date.mismatch'));
if (days < 5) { st.rushDays = days; msgs.push(txt('wz.rush')); }
} else { st.date = ''; clearErr(3); }
if (!msgs.length && st.urg === 'days5') msgs.push('5 дней — наценка за срочность');
note.textContent = msgs.join('. ');
M.setDate(st.date);
save();
}
if (wz) {
load();
$('#wzdate').min = new Date().toISOString().slice(0, 10);
$('#wzdate').value = st.date;
$('#wzowntxt').value = st.ownTxt;
$('#wzdetails').value = st.details;
$('#contact').value = st.contact;
$('#qtysplit').checked = st.qtyMode === 'own';
syncCats(); syncUrg(); syncQty();
var cs0 = chosen();
for (var ci = 0; ci < cs0.length; ci++) if (!(cs0[ci].id in st.print)) st.print[cs0[ci].id] = defPrint(cs0[ci]);
if (st.step !== 1) {
panel(1).hidden = true;
if (st.step === 2) buildQtyRows();
if (st.step === 4) buildPrints();
if (st.step === 6) buildRes();
panel(st.step).hidden = false;
}
nav(); M.setDate(st.date);
$('#wzcats').addEventListener('change', function (e) {
var v = e.target.value;
if (v === '__own') st.own = e.target.checked ? 1 : 0;
else {
var i = st.cats.indexOf(v);
if (e.target.checked) { if (i < 0) st.cats.push(v); var c = catById(v); if (c && !(v in st.print)) st.print[v] = defPrint(c); }
else if (i >= 0) st.cats.splice(i, 1);
}
syncCats(); syncQty();
if (st.own && e.target.value === '__own' && e.target.checked) $('#wzowntxt').focus();
if (st.cats.length || st.own) clearErr(1);
if (stepMap().indexOf(st.step) < 0 && st.step !== 6) go(5, 1); else nav();
save();
});
$('#wzowntxt').addEventListener('input', function () { st.ownTxt = this.value; save(); });
rng.addEventListener('input', function () { st.qty = parseInt(rng.value, 10) || 0; syncQty(); clearErr(2); save(); });
qi.addEventListener('input', function () {
var n = normQty(qi.value);
if (n) { st.qty = n; qn.textContent = money(n); rng.value = Math.min(5000, Math.max(10, n)); }
});
qi.addEventListener('change', function () {
var n = normQty(qi.value);
if (!n) { err(2, txt('wz.err.qty')); return; }
st.qty = n; clearErr(2); syncQty(); buildQtyRows(); save();
});
$$('[data-q]').forEach(function (b) {
b.addEventListener('click', function () { st.qty = +b.dataset.q; clearErr(2); syncQty(); buildQtyRows(); save(); });
});
$('#qtysplit').addEventListener('change', function () {
st.qtyMode = this.checked ? 'own' : 'common';
buildQtyRows(); syncQty(); save();
});
$('#qtyrows').addEventListener('input', function (e) {
var id = e.target.dataset && e.target.dataset.qid;
if (!id) return;
var n = normQty(e.target.value), c = catById(id);
st.qtyBy[id] = n;
var w = $('[data-warn="' + id + '"]');
if (w && c) w.hidden = !(n && n < c.minQty);
if (n) clearErr(2);
save();
});
$('#urgs').addEventListener('change', function (e) { st.urg = e.target.value; st.urgT = 1; dateCalc(); save(); });
$('#wzdate').addEventListener('change', dateCalc);
$('#printrows').addEventListener('change', function (e) {
var id = e.target.name.replace(/^pr_/, '');
st.print[id] = e.target.value || null;
buildPrints(); save();
});
var ta = $('#wzdetails');
ta.addEventListener('input', function () {
st.details = ta.value;
if (!CSS.supports || !CSS.supports('field-sizing', 'content')) { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }
var c = $('#wzcnt');
c.hidden = ta.value.length < 400;
c.textContent = ta.value.length + ' / 500';
save();
});
$('#contact').addEventListener('input', function () { st.contact = this.value; save(); });
$$('.wz__next').forEach(function (b) { b.addEventListener('click', next); });
$$('.wz__back').forEach(function (b) { b.addEventListener('click', back); });
$('#wznav').addEventListener('click', function (e) {
var b = e.target.closest('.wz__seg');
if (!b || b.disabled) return;
var to = +b.dataset.s;
go(to, to > st.step ? 1 : -1);
});
$('#ressum').addEventListener('click', function (e) {
var b = e.target.closest('.wz__edit');
if (b) go(+b.dataset.to, -1);
});
box.addEventListener('keydown', function (e) {
if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'range') { e.preventDefault(); next(); }
});
var ax = null, x0 = 0, y0 = 0, ts = 0, pid = null;
box.addEventListener('pointerdown', function (e) {
if (e.target.closest('input,textarea,select,button,label,a,.rng')) { pid = null; return; }
ax = null; x0 = e.clientX; y0 = e.clientY; ts = e.timeStamp; pid = e.pointerId;
}, { passive: true });
box.addEventListener('pointermove', function (e) {
if (pid === null || e.pointerId !== pid) return;
var dx = e.clientX - x0, dy = e.clientY - y0;
if (ax === null) {
if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
ax = Math.abs(dx) > Math.abs(dy) * 1.5 ? 'x' : 'y';
}
if (ax !== 'x' || RM) return;
var p = panel(st.step);
p.classList.add('is-drag'); p.style.setProperty('--d', (dx * 0.35).toFixed(1) + 'px');
}, { passive: true });
function endSwipe(e) {
if (pid === null) return;
var p = panel(st.step), dx = e.clientX - x0, dt = Math.max(1, e.timeStamp - ts);
p.classList.remove('is-drag'); p.style.removeProperty('--d');
if (ax === 'x' && (Math.abs(dx) > 64 || Math.abs(dx) / dt > 0.45)) { if (dx < 0) next(); else back(); }
pid = null; ax = null;
}
box.addEventListener('pointerup', endSwipe, { passive: true });
box.addEventListener('pointercancel', function () {
if (pid === null) return;
var p = panel(st.step); p.classList.remove('is-drag'); p.style.removeProperty('--d');
pid = null; ax = null;
}, { passive: true });
var sb = $('#sendbrief');
if (sb) sb.addEventListener('click', function () { var b = briefText(); send(b.text, b.data); });
}
var rf = $('#reqform');
if (rf) rf.addEventListener('submit', function (ev) {
ev.preventDefault();
var ct = $('#rcontact').value, tk = $('#rtask').value;
var L = ['Заявка с сайта'];
if (tk) L.push('Задача: ' + tk);
if (ct) L.push('Контакт: ' + ct);
send(L.join('\n'), { task: tk, contact: ct });
});
var dl = $$('.days__it');
if (dl.length) {
if (RM) dl.forEach(function (e) { e.classList.add('on'); });
else dl.forEach(function (e) {
M.io(e, function (vis, o) { if (vis) { e.classList.add('on'); if (o) o.disconnect(); } },
{ threshold: 0.6, rootMargin: '0px 0px -18% 0px' });
});
}
var AI = CFG.ai || {}, dock = $('#aidock');
if (dock) {
if (AI.mode === 'live' && AI.url) {
$('#aitag').hidden = true;
$('#aititle').textContent = txt('ai.title.live');
}
var abtn = $('#aisend'), ata = $('#aitask'), aerr = $('#aierr');
abtn.hidden = false;                                   
abtn.addEventListener('click', function () {
var t = ata.value.trim();
if (!t) { ata.focus(); return; }
var b = briefText('dialog');
var L = b.text.split('\n');
L.splice(b.data.contact ? L.length - 1 : L.length, 0, 'Задача: ' + t);
b.data.task = t;
send(L.join('\n'), b.data);
abtn.disabled = true; aerr.textContent = txt('ai.sent');
});
}
M.onPrices = function (p) {
if (JSON.stringify(p) === JSON.stringify(PRC)) return;
PRC = p; M.prices = p;
var tiles = $('.grid');
if (tiles) {
var ico = {}, h = '', band = $('.band');
$$('.tile', tiles).forEach(function (t) { ico[t.dataset.id] = t.dataset.ico; });
for (var i = 0; i < p.categories.length; i++) {
var c = p.categories[i];
h += '<li class="tile" data-id="' + c.id + '" data-ico="' + (ico[c.id] || 'i-mark') + '">' +
'<div class="tile__top"><span class="tile__ico"><svg viewBox="0 0 40 40"><use href="#' + (ico[c.id] || 'i-mark') + '"/></svg></span>' +
'<span class="tile__n" aria-hidden="true">' + (i < 9 ? '0' : '') + (i + 1) + '</span></div>' +
'<h3 class="tile__t">' + esc(c.name) + '</h3>' +
'<div class="tile__b"><span class="tile__d">от ' + c.minQty + ' ' + esc(c.unit) + '</span>' +
'<span class="tile__m" aria-hidden="true"><svg viewBox="0 0 48 48"><use href="#i-mark"/></svg></span></div></li>';
if (i === 3 && band) h += band.outerHTML;
}
tiles.innerHTML = h;
}
if (wz) {
var ch = '';
for (var j = 0; j < p.categories.length; j++) ch += pill('cat', p.categories[j].id, p.categories[j].name, st.cats.indexOf(p.categories[j].id) >= 0, 'checkbox');
ch += pill('cat', '__own', txt('wz.own'), !!st.own, 'checkbox');
$('#wzcats').innerHTML = ch;
st.cats = st.cats.filter(function (id) { return !!catById(id); });
syncCats(); syncQty(); nav();
}
};
var INLINE = $('#prices').textContent;
if (JSON.stringify(PRC) !== JSON.stringify(JSON.parse(INLINE))) M.onPrices(PRC);