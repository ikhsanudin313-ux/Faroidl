'use strict';
/* =====================================================================
 *  CORE — state, util, jembatan REST API, sesi, antrean sinkron
 * ===================================================================== */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });
const rp = n => 'Rp ' + nf.format(Math.round(Number(n) || 0));
const rpM = n => {
  n = Number(n) || 0;
  const f = (v, u) => 'Rp ' + (Math.round(v * 100) / 100).toString().replace('.', ',') + ' ' + u;
  if (Math.abs(n) >= 1e12) return f(n / 1e12, 'T');
  if (Math.abs(n) >= 1e9) return f(n / 1e9, 'M');
  if (Math.abs(n) >= 1e6) return f(n / 1e6, 'Juta');
  return rp(n);
};
const pct = n => (Math.round(n * 100) / 100).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const uid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
const newKasusId = () => 'KAS-' + new Date().getFullYear() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[^A-Z0-9]/g, 'X').padEnd(4, 'X');
const tglID = s => { if (!s) return '—'; const d = new Date(s + 'T00:00:00'); return isNaN(d) ? s : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); };
const hijri = s => {
  try { const d = new Date(s + 'T00:00:00'); if (isNaN(d)) return ''; return new Intl.DateTimeFormat('id-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' }).format(d); } catch (e) { return ''; }
};

/* Penyimpanan aman (localStorage bisa diblokir di iframe) */
const mem = {};
const ls = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return mem[k] === undefined ? null : mem[k]; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { mem[k] = v; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { delete mem[k]; } }
};
const lsJSON = (k, d) => { try { const v = ls.get(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };

const STATUS = ['Draft Berkas', 'Rekap Harta', 'Terhitung', 'Selesai & PDF'];
const JENIS_HARTA = ['Properti', 'Kas & Tabungan', 'Emas & Logam Mulia', 'Kendaraan', 'Piutang', 'Usaha & Saham', 'Lainnya'];
const ROLE_SUPER = 'Super Admin';

const S = {
  token: null, user: null, dbLabel: '',
  D: { kelompok: [], kasus: [], harta: [], ahli: [], hasil: [], referensi: [], pengguna: [], log: [], pengaturan: {} },
  ui: { page: 'dashboard', kasusId: null, q: '', fStatus: '', fKel: '', fDari: '', fSampai: '', pg: 1, refTab: 'ref', refJenis: 'Semua', refQ: '', refPg: 1, logPg: 1 },
  ver: 1, rendered: {}, queue: [], syncing: false, saveTimers: {}, lastErr: ''
};
const ROLE_ADMIN = 'Admin Kelompok', ROLE_TIMK = 'Tim Faroidl Kelompok', ROLE_TIMD = 'Tim Faroidl Daerah';
const ROLES = [ROLE_SUPER, ROLE_TIMD, ROLE_ADMIN, ROLE_TIMK];
const isSuper = () => !!S.user && S.user.Peran === ROLE_SUPER;
/** Super Admin atau Tim Faroidl Daerah: lintas kelompok, kelola kelompok/pengaturan/backup. */
const isAll = () => !!S.user && (S.user.Peran === ROLE_SUPER || S.user.Peran === ROLE_TIMD);
/** Tim Faroidl Kelompok: hanya input pewaris, ahli waris, harta (tanpa hitung/BA/aturan). */
const isInputOnly = () => !!S.user && S.user.Peran === ROLE_TIMK;
/** Nama lengkap almarhum/ah: "Nama bin/binti Ayah" (data lama yang sudah memuat bin/binti tetap utuh). */
const namaLengkap = k => String(k.Nama_Pewaris || '') + (k.Nama_Ayah ? ' ' + (k.Jenis_Kelamin_Pewaris === 'Perempuan' ? 'binti' : 'bin') + ' ' + k.Nama_Ayah : '');
const almLabel = k => k && k.Jenis_Kelamin_Pewaris === 'Perempuan' ? 'Almarhumah' : 'Almarhum';
/** Usia (tahun) pada tanggal wafat; '' bila tanggal lahir/wafat tidak ada atau tidak masuk akal. */
function usiaTahun(lahir, wafat) {
  const a = /^(\d{4})-(\d{2})-(\d{2})/.exec(lahir || ''), b = /^(\d{4})-(\d{2})-(\d{2})/.exec(wafat || '');
  if (!a || !b) return '';
  let u = +b[1] - +a[1]; if (+b[2] < +a[2] || (+b[2] === +a[2] && +b[3] < +a[3])) u--;
  return u >= 0 && u < 130 ? u : '';
}
const kelNama = id => { const g = S.D.kelompok.find(x => x.ID_Kelompok === id); return g ? g.Nama_Kelompok : '—'; };
const getKasus = id => S.D.kasus.find(k => k.ID_Kasus === id);
const hartaOf = id => S.D.harta.filter(h => h.ID_Kasus === id);
const ahliOf = id => S.D.ahli.filter(a => a.ID_Kasus === id);
const hasilOf = id => S.D.hasil.filter(h => h.ID_Kasus === id);
const curKasus = () => getKasus(S.ui.kasusId);

/* ---------- Jembatan REST API (fetch -> Google Apps Script) ----------
 * POST dikirim sebagai text/plain agar tidak memicu CORS preflight (GAS tidak menjawab OPTIONS). */
async function api(fn, ...args) {
  const url = (typeof API_URL === 'string') ? API_URL.trim() : '';
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url)) {
    const e = new Error('URL API belum diatur. Isi API_URL pada berkas js/config.js dengan URL /exec dari Google Apps Script.'); e.config = true; throw e;
  }
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 120000);
  let res;
  try {
    res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: fn, args: args }), redirect: 'follow', credentials: 'omit', signal: ctrl.signal });
  } catch (err) {
    const e = new Error(err && err.name === 'AbortError' ? 'Server terlalu lama merespons. Coba lagi.' : 'Tidak dapat terhubung ke server. Periksa koneksi internet.'); e.net = true; throw e;
  } finally { clearTimeout(timer); }
  let body;
  try { body = await res.json(); }
  catch (err) { const e = new Error('Respons server tidak valid. Pastikan URL /exec benar dan akses Web App diatur "Anyone".'); e.net = true; throw e; }
  if (body && body.success) return body.data;
  const e = new Error((body && body.message) || 'Terjadi kesalahan.'); e.sesi = !!(body && body.message === 'SESI_HABIS'); e.server = true; throw e;
}

/* ---------- Toast ---------- */
function toast(msg, type) {
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast-f t-' + (type || 'info');
  const ic = { ok: 'check-circle-fill', err: 'exclamation-octagon-fill', warn: 'exclamation-triangle-fill', info: 'info-circle-fill' }[type || 'info'] || 'info-circle-fill';
  el.innerHTML = '<i class="bi bi-' + ic + '"></i><span>' + esc(msg) + '</span>';
  box.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 250); }, type === 'err' ? 6000 : 3200);
}

/* ---------- Modal ---------- */
let modalInst = null, modalSubmit = null;
function openModal(title, body, opts) {
  opts = opts || {};
  $('#appModalTitle').textContent = title;
  $('#appModalBody').innerHTML = body;
  $('#appModalDialog').className = 'modal-dialog modal-dialog-centered modal-dialog-scrollable' + (opts.size ? ' modal-' + opts.size : '');
  const foot = $('#appModalFoot');
  foot.innerHTML = '';
  (opts.buttons || [{ label: 'Tutup', cls: 'btn-ghost-f', close: true }]).forEach(b => {
    const bt = document.createElement('button');
    bt.type = 'button';
    bt.className = 'btn-f ' + (b.cls || 'btn-primary-f');
    bt.innerHTML = (b.icon ? '<i class="bi bi-' + b.icon + '"></i> ' : '') + esc(b.label);
    if (b.close) bt.setAttribute('data-bs-dismiss', 'modal');
    if (b.onClick) bt.addEventListener('click', () => b.onClick(bt));
    foot.appendChild(bt);
  });
  modalSubmit = opts.onSubmit || null;
  const el = $('#appModal');
  modalInst = bootstrap.Modal.getOrCreateInstance(el);
  modalInst.show();
  setTimeout(() => { const f = $('input,select,textarea', $('#appModalBody')); if (f && !opts.noFocus) f.focus(); }, 300);
}
function closeModal() { if (modalInst) modalInst.hide(); }
function busy(btn, on, label) {
  if (!btn) return;
  if (on) { btn.dataset.old = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin"></span> ' + esc(label || 'Memproses…'); }
  else { btn.disabled = false; if (btn.dataset.old) btn.innerHTML = btn.dataset.old; }
}
function confirmBox(title, msg, okLabel, onOk, danger) {
  openModal(title, '<p class="mb-0">' + msg + '</p>', { buttons: [
    { label: 'Batal', cls: 'btn-ghost-f', close: true },
    { label: okLabel, cls: danger ? 'btn-danger-f' : 'btn-primary-f', onClick: () => { closeModal(); onOk(); } }
  ], noFocus: true });
}

/* ---------- Tema ---------- */
function setTheme(t, persist) {
  document.documentElement.setAttribute('data-theme', t);
  document.documentElement.setAttribute('data-bs-theme', t);
  const ic = $('#themeIcon'); if (ic) ic.className = 'bi ' + (t === 'dark' ? 'bi-sun' : 'bi-moon-stars');
  if (persist) ls.set('frd_theme', t);
  const meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.setAttribute('content', t === 'dark' ? '#0e1a14' : '#0B5D3B');
}
const themeNow = () => document.documentElement.getAttribute('data-theme') || 'light';

/* ---------- Penyimpanan lokal (stale-while-revalidate) ---------- */
function saveCache() {
  try { ls.set('frd_cache', JSON.stringify({ user: S.user, D: S.D, dbLabel: S.dbLabel })); } catch (e) { /* kuota penuh */ }
}
function persistQueue() { ls.set('frd_q', JSON.stringify(S.queue)); }

/* ---------- Antrean sinkronisasi latar belakang ---------- */
function syncUi() {
  const el = $('#syncState'); if (!el) return;
  const n = S.queue.length;
  let h;
  if (S.syncing && n) h = '<span class="spin sm"></span> Menyimpan…';
  else if (n && S.lastErr) h = '<i class="bi bi-exclamation-triangle"></i> ' + n + ' perubahan belum tersimpan';
  else if (n) h = '<span class="spin sm"></span> ' + n + ' menunggu';
  else h = '<i class="bi bi-check2-circle"></i> Tersimpan';
  el.className = 'sync-state' + (n ? (S.lastErr ? ' bad' : ' busy') : ' ok');
  el.innerHTML = h;
}
function enqueue(job) {
  const dup = S.queue.some((j, i) => j.t === job.t && j.id === job.id && (i > 0 || !S.syncing));
  if (!dup) S.queue.push(Object.assign({ tries: 0 }, job));
  persistQueue(); syncUi(); pump();
}
function buildSavePayload(id) {
  const k = getKasus(id); if (!k) return null;
  const hasil = hasilOf(id);
  return { kasus: k, harta: hartaOf(id), ahli: ahliOf(id), hasil: hasil };
}
async function runJob(j) {
  if (j.t === 'save') {
    const p = buildSavePayload(j.id); if (!p) return;
    await api('saveKasusLengkap', S.token, p);
  } else if (j.t === 'del') {
    await api('deleteKasus', S.token, j.id);
  } else if (j.t === 'ref') {
    await api('saveReferensi', S.token, S.D.referensi);
  }
}
async function pump() {
  if (S.syncing || !S.token) return;
  S.syncing = true; S.lastErr = ''; syncUi();
  while (S.queue.length) {
    const j = S.queue[0];
    try { await runJob(j); S.queue.shift(); persistQueue(); S.lastErr = ''; }
    catch (e) {
      if (e.sesi) { S.lastErr = 'sesi'; S.syncing = false; syncUi(); sessionExpired(); return; }
      if (e.server) { S.queue.shift(); persistQueue(); toast('Perubahan ditolak server: ' + e.message, 'err'); continue; }
      j.tries++; S.lastErr = e.message;
      if (j.tries >= 5) { S.syncing = false; syncUi(); toast('Gagal menyimpan ke server. Perubahan tetap aman di perangkat; akan dicoba lagi.', 'warn'); setTimeout(pump, 15000); return; }
      syncUi(); await sleep(1200 * j.tries);
    }
    syncUi();
  }
  S.syncing = false; syncUi(); saveCache();
}
async function flushAll() { // tunggu antrean kosong (mis. sebelum membuat PDF)
  for (let i = 0; i < 80 && (S.queue.length || S.syncing); i++) { if (!S.syncing) pump(); await sleep(250); }
  if (S.queue.length) throw new Error('Perubahan belum tersinkron ke server. Coba beberapa saat lagi.');
}
window.addEventListener('online', () => { if (S.queue.length) pump(); });

/* ---------- Sesi ---------- */
function sessionExpired() {
  toast('Sesi berakhir. Silakan masuk kembali — perubahan Anda tetap tersimpan.', 'warn');
  S.token = null; ls.del('frd_token');
  showLogin();
}
function showLogin() {
  $('#splash').hidden = true; $('#appView').hidden = true; $('#loginView').hidden = false;
  const t = (S.D.pengaturan && S.D.pengaturan.nama_aplikasi) || 'Faroidl Cloud'; $('#loginTitle').textContent = t;
}
