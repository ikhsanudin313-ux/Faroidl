'use strict';
/* =====================================================================
 *  MAIN — navigasi SPA, aksi (delegasi event), login, inisialisasi
 * ===================================================================== */
const NAV_ALL = [['dashboard', 'grid-1x2', 'Dashboard Kasus'], ['kalkulator', 'wallet2', 'Kalkulator Harta'], ['hitung', 'calculator', 'Hitung Waris Syar\'i'], ['referensi', 'book', 'Referensi & Aturan']];
/** Menu menurut peran: Tim Faroidl Kelompok hanya input data (tanpa hitung & aturan). */
const navItems = () => isInputOnly() ? [['dashboard', 'grid-1x2', 'Dashboard Kasus'], ['kalkulator', 'wallet2', 'Harta Peninggalan'], ['hitung', 'people', 'Ahli Waris']] : NAV_ALL;
const RENDER = { dashboard: renderDashboard, kalkulator: renderKalkulator, hitung: renderHitung, referensi: renderReferensi };

function renderNav() {
  const on = S.ui.page, NAV = navItems();
  const html = NAV.map(n => '<button class="nav-i' + (n[0] === on ? ' on' : '') + '" data-act="go" data-p="' + n[0] + '" ' + (n[0] === on ? 'aria-current="page"' : '') + '><i class="bi bi-' + n[1] + '"></i><span>' + n[2] + '</span></button>').join('');
  $('#sbNav').innerHTML = html;
  $('#bottomNav').innerHTML = NAV.map(n => '<button class="bn-i' + (n[0] === on ? ' on' : '') + '" data-act="go" data-p="' + n[0] + '" aria-label="' + n[2] + '"><i class="bi bi-' + n[1] + '"></i><span>' + n[2].replace(' Syar\'i', '').replace(' & Aturan', '') + '</span></button>').join('');
}
function go(page) {
  if (!RENDER[page] || !navItems().some(n => n[0] === page)) page = 'dashboard';
  S.ui.page = page;
  $$('.page').forEach(s => { s.hidden = s.dataset.page !== page; });
  if (S.rendered[page] !== S.ver) { RENDER[page](); S.rendered[page] = S.ver; }
  renderNav(); closeMenu();
  window.scrollTo(0, 0);
}
function openMenu() { $('#sidebar').classList.add('open'); $('.sb-scrim').hidden = false; }
function closeMenu() { $('#sidebar').classList.remove('open'); $('.sb-scrim').hidden = true; }

function applyBranding() {
  const nm = (S.D.pengaturan && S.D.pengaturan.nama_aplikasi) || 'Faroidl Cloud';
  $('#sbTitle').textContent = nm; $('#ftName').textContent = nm; document.title = nm;
}
function showApp() {
  $('#splash').hidden = true; $('#loginView').hidden = true; $('#appView').hidden = false;
  const u = S.user;
  $('#tbName').textContent = u.Nama; $('#tbRole').textContent = u.Peran + (u.ID_Kelompok ? ' • ' + kelNama(u.ID_Kelompok) : '');
  $('#tbAvatar').textContent = (u.Nama || '?').trim().charAt(0).toUpperCase();
  $('#dbLabel').textContent = 'ID Database: ' + (S.dbLabel || '—');
  applyBranding(); syncUi();
}

async function loadBootstrap(silent) {
  if (S.queue.length) { await flushAll().catch(() => { }); if (S.queue.length) { if (!silent) toast('Masih ada perubahan yang belum tersinkron; data server tidak ditimpa.', 'warn'); return; } }
  const d = await api('getBootstrap', S.token);
  S.user = d.user; S.dbLabel = d.dbLabel;
  S.D = { kelompok: d.kelompok, kasus: d.kasus, harta: d.harta, ahli: d.ahli, hasil: d.hasil, referensi: d.referensi, pengguna: d.pengguna, log: d.log, pengaturan: d.pengaturan };
  S.ver++; S.rendered = {};
  if (S.ui.kasusId && !getKasus(S.ui.kasusId)) S.ui.kasusId = null;
  saveCache(); showApp(); go(S.ui.page);
}

/* ---------- Login ---------- */
async function submitLogin(e) {
  e.preventDefault();
  const em = $('#loginEmail').value.trim(), pw = $('#loginPass').value, err = $('#loginErr'), btn = $('#loginBtn');
  err.hidden = true;
  if (!em || !pw) { err.hidden = false; err.textContent = 'Email dan kata sandi wajib diisi.'; return; }
  busy(btn, true, 'Memeriksa…');
  try {
    const r = await api('doLogin', em, pw);
    const cached = lsJSON('frd_cache', null);
    if (!cached || !cached.user || cached.user.Email !== r.user.Email) { S.queue = []; persistQueue(); ls.del('frd_cache'); S.D = { kelompok: [], kasus: [], harta: [], ahli: [], hasil: [], referensi: [], pengguna: [], log: [], pengaturan: S.D.pengaturan }; }
    S.token = r.token; S.user = r.user; ls.set('frd_token', r.token);
    $('#loginPass').value = '';
    await loadBootstrap(true);
    S.ui.page = 'dashboard'; go('dashboard'); pump();
  } catch (x) { err.hidden = false; err.textContent = x.message; }
  finally { busy(btn, false); }
}
async function logout() {
  try { if (S.queue.length) await flushAll().catch(() => { }); await api('doLogout', S.token).catch(() => { }); } finally {
    S.token = null; S.user = null; S.queue = []; ['frd_token', 'frd_cache', 'frd_q'].forEach(ls.del);
    S.D = { kelompok: [], kasus: [], harta: [], ahli: [], hasil: [], referensi: [], pengguna: [], log: [], pengaturan: {} }; S.ui.kasusId = null; S.rendered = {}; closeModal(); showLogin();
  }
}

/* ---------- Aksi (data-act) ---------- */
const ACT = {
  togglePass(el) { const i = $('#loginPass'); const show = i.type === 'password'; i.type = show ? 'text' : 'password'; el.innerHTML = '<i class="bi bi-eye' + (show ? '-slash' : '') + '"></i>'; },
  openMenu, closeMenu,
  toggleTheme() { setTheme(themeNow() === 'dark' ? 'light' : 'dark', true); S.rendered = {}; go(S.ui.page); },
  go(el) { go(el.dataset.p); },
  async refresh(el) { busy(el, true, 'Sinkron…'); try { await loadBootstrap(false); toast('Data tersinkron dengan Google Sheets.', 'ok'); } catch (e) { if (e.sesi) sessionExpired(); else toast('Gagal sinkron: ' + e.message, 'err'); } finally { busy(el, false); } },
  userMenu() {
    const u = S.user;
    openModal('Akun Saya', '<div class="acc"><div class="avatar lg">' + esc((u.Nama || '?').charAt(0).toUpperCase()) + '</div><div><b>' + esc(u.Nama) + '</b><div class="muted sm">' + esc(u.Email) + '</div><div class="muted sm">' + esc(u.Peran) + (u.ID_Kelompok ? ' · ' + esc(kelNama(u.ID_Kelompok)) : '') + '</div></div></div>' +
      '<h3 class="h-sec sm mt-3">Ganti kata sandi</h3><form id="pwForm" novalidate><label class="lbl">Kata sandi lama<input class="inp" type="password" name="lama" autocomplete="current-password"></label>' +
      '<label class="lbl">Kata sandi baru (min. 8 karakter)<input class="inp" type="password" name="baru" autocomplete="new-password" minlength="8"></label><div class="form-err" id="pwErr" role="alert" hidden></div></form>',
      { buttons: [{ label: 'Keluar', cls: 'btn-danger-f', icon: 'box-arrow-right', onClick: () => logout() }, { label: 'Simpan Sandi', cls: 'btn-primary-f', onClick: ACT.changePwd }, { label: 'Tutup', cls: 'btn-ghost-f', close: true }], noFocus: true });
  },
  async changePwd(btn) {
    const f = $('#pwForm'), err = $('#pwErr'), fd = new FormData(f);
    if (String(fd.get('baru')).length < 8) { err.hidden = false; err.textContent = 'Kata sandi baru minimal 8 karakter.'; return; }
    busy(btn, true, 'Menyimpan…');
    try { await api('gantiPassword', S.token, fd.get('lama'), fd.get('baru')); closeModal(); toast('Kata sandi diperbarui.', 'ok'); }
    catch (e) { err.hidden = false; err.textContent = e.message; } finally { busy(btn, false); }
  },

  /* --- kasus --- */
  newKasus() { openModal('Buat Kasus Waris Baru', pewarisForm(null, true), { buttons: [{ label: 'Batal', cls: 'btn-ghost-f', close: true }, { label: 'Simpan & Lanjut', cls: 'btn-gold-f', icon: 'arrow-right', onClick: () => submitPewaris(true) }] }); },
  editPewaris() { const k = curKasus(); if (k) openModal('Ubah Data Pewaris', pewarisForm(k, false), { buttons: [{ label: 'Batal', cls: 'btn-ghost-f', close: true }, { label: 'Simpan', cls: 'btn-primary-f', onClick: () => submitPewaris(false) }] }); },
  openKalkulator(el) { if (el.dataset.id) S.ui.kasusId = el.dataset.id; S.rendered.kalkulator = 0; go('kalkulator'); },
  openHitung(el) { if (el.dataset.id) S.ui.kasusId = el.dataset.id; S.rendered.hitung = 0; go('hitung'); },
  delKasus(el) {
    const k = getKasus(el.dataset.id); if (!k) return;
    confirmBox('Hapus kasus?', 'Kasus <b>' + esc(namaLengkap(k)) + '</b> beserta harta, ahli waris, dan hasilnya akan dihapus dari database. Berkas di Google Drive tidak dihapus.', 'Hapus', () => {
      const id = k.ID_Kasus; S.D.kasus = S.D.kasus.filter(x => x.ID_Kasus !== id); ['harta', 'ahli', 'hasil'].forEach(t => { S.D[t] = S.D[t].filter(x => x.ID_Kasus !== id); });
      if (S.ui.kasusId === id) S.ui.kasusId = null; clearTimeout(S.saveTimers[id]); S.queue = S.queue.filter(j => !(j.t === 'save' && j.id === id));
      S.ver++; S.rendered = {}; saveCache(); enqueue({ t: 'del', id: id }); go(S.ui.page); toast('Kasus dihapus.', 'ok');
    }, true);
  },
  pg(el) { const pages = Math.max(1, Math.ceil(filteredKasus().length / 5)); S.ui.pg = el.dataset.p ? +el.dataset.p : Math.min(pages, Math.max(1, S.ui.pg + (+el.dataset.d))); renderKasusTable(); },
  exportKasus, exportHasil, exportRekap, exportJadwal,
  async backupDb(el) { busy(el, true, 'Mencadangkan…'); try { const r = await api('backupDatabase', S.token); toast('Cadangan dibuat di Drive: ' + r.name, 'ok'); } catch (e) { if (e.sesi) sessionExpired(); else toast('Backup gagal: ' + e.message, 'err'); } finally { busy(el, false); } },

  /* --- harta --- */
  addHarta() { openModal('Tambah Item Harta', hartaForm(), { buttons: [{ label: 'Batal', cls: 'btn-ghost-f', close: true }, { label: 'Simpan Aset', cls: 'btn-primary-f', onClick: () => submitHarta() }] }); },
  editHarta(el) { const h = S.D.harta.find(x => x.ID_Harta === el.dataset.id); if (h) openModal('Ubah Item Harta', hartaForm(h), { buttons: [{ label: 'Batal', cls: 'btn-ghost-f', close: true }, { label: 'Simpan Perubahan', cls: 'btn-primary-f', onClick: () => submitHarta(h.ID_Harta) }] }); },
  delHarta(el) {
    const h = S.D.harta.find(x => x.ID_Harta === el.dataset.id); if (!h) return;
    confirmBox('Hapus item harta?', 'Aset <b>' + esc(h.Nama_Harta) + '</b> akan dihapus dari catatan.', 'Hapus', () => { S.D.harta = S.D.harta.filter(x => x.ID_Harta !== h.ID_Harta); commit(h.ID_Kasus, { now: true }); renderHartaTable(); kalcRefresh(); toast('Aset dihapus.', 'ok'); }, true);
  },
  uploadHarta(el) {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/pdf,image/jpeg,image/png,image/webp';
    inp.onchange = () => { if (inp.files[0]) uploadBukti(inp.files[0], el.dataset.id); }; inp.click();
  },
  pickDalil() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/pdf,image/jpeg,image/png,image/webp';
    inp.onchange = () => { if (inp.files[0]) uploadDalil(inp.files[0]); }; inp.click();
  },
  clearDalil() { $('#rfLink').value = ''; $('#rfUpName').textContent = 'Belum ada berkas'; $('#rfUpLbl').textContent = 'Pilih berkas'; $('#rfUpDel').hidden = true; },
  previewFile(el) {
    const url = el.dataset.url, m = /\/d\/([\w-]+)/.exec(url) || /[?&]id=([\w-]+)/.exec(url), id = m ? m[1] : '';
    openModal(el.dataset.title || 'Pratinjau Bukti', id ? '<iframe class="pdf-frame" title="Pratinjau berkas" src="https://drive.google.com/file/d/' + esc(id) + '/preview"></iframe>' : '<p>Pratinjau tidak tersedia.</p>',
      { size: 'xl', noFocus: true, buttons: [{ label: 'Unduh', cls: 'btn-ghost-f', icon: 'download', onClick: () => window.open(id ? 'https://drive.google.com/uc?export=download&id=' + id : url, '_blank', 'noopener') }, { label: 'Tutup', cls: 'btn-primary-f', close: true }] });
  },
  applyPorsi() {
    const k = curKasus(); if (!k || !isSuper()) return;
    const v = Number($('#porsiIn').value), alasan = $('#alasanIn').value.trim();
    if (!(v >= 0 && v <= 100)) { toast('Porsi harus antara 0 dan 100.', 'err'); return; }
    if (v !== 50 && !alasan) { toast('Isi dasar hukum/bukti kesepakatan jika porsi bukan 50%.', 'err'); $('#alasanIn').focus(); return; }
    k.Porsi_Gonogini_Pasangan = v; k.Alasan_Perubahan_Porsi = alasan; commit(k.ID_Kasus, { now: true }); kalcRefresh(); toast('Porsi gono-gini diperbarui.', 'ok');
  },
  saveNow() { const k = curKasus(); if (k) { commit(k.ID_Kasus, { now: true, keepStatus: true }); toast('Draf disimpan.', 'ok'); } },

  /* --- ahli waris --- */
  addAhli() { const k = curKasus(); if (k) openModal('Tambah Ahli Waris', ahliForm(k, null), { buttons: [{ label: 'Batal', cls: 'btn-ghost-f', close: true }, { label: 'Simpan', cls: 'btn-primary-f', onClick: () => submitAhli() }] }); },
  editAhli(el) { const k = curKasus(), a = S.D.ahli.find(x => x.ID === el.dataset.id); if (k && a) openModal('Ubah Ahli Waris', ahliForm(k, a), { buttons: [{ label: 'Batal', cls: 'btn-ghost-f', close: true }, { label: 'Simpan', cls: 'btn-primary-f', onClick: () => submitAhli(a.ID) }] }); },
  delAhli(el) {
    const a = S.D.ahli.find(x => x.ID === el.dataset.id); if (!a) return;
    confirmBox('Hapus ahli waris?', '<b>' + esc(a.Nama) + '</b> akan dihapus dan hasil dihitung ulang.', 'Hapus', () => { S.D.ahli = S.D.ahli.filter(x => x.ID !== a.ID); commit(a.ID_Kasus, { now: true }); renderHitung(); toast('Ahli waris dihapus.', 'ok'); }, true);
  },
  refreshHasil() { const k = curKasus(); if (k) { commit(k.ID_Kasus, { now: true }); renderHitung(); toast('Hasil tersimpan diperbarui.', 'ok'); } },
  downloadBA(el) { downloadBA(el); }, emailBA(el) { emailBA(el); },

  /* --- referensi --- */
  refTab(el) { S.ui.refTab = el.dataset.t; renderReferensi(); },
  refJenis(el) { S.ui.refJenis = el.dataset.j; S.ui.refPg = 1; renderReferensi(); },
  refPg(el) { S.ui.refPg = Math.max(1, S.ui.refPg + (+el.dataset.d)); renderRefBody(); },
  logPg(el) { S.ui.logPg = Math.max(1, S.ui.logPg + (+el.dataset.d)); renderRefBody(); },
  addRule() { openModal('Tambah Aturan Baru', ruleForm(null), { buttons: [{ label: 'Batal', cls: 'btn-ghost-f', close: true }, { label: 'Simpan Aturan', cls: 'btn-primary-f', onClick: () => submitRule() }] }); },
  editRule(el) { const r = S.D.referensi.find(x => x.ID_Referensi === el.dataset.id); if (r) openModal('Ubah Aturan ' + r.ID_Referensi, ruleForm(r), { buttons: [{ label: 'Batal', cls: 'btn-ghost-f', close: true }, { label: 'Simpan Aturan', cls: 'btn-primary-f', onClick: () => submitRule(r.ID_Referensi) }] }); },
  toggleRule(el) {
    const r = S.D.referensi.find(x => x.ID_Referensi === el.dataset.id); if (!r) return;
    r.Status_Aktif = r.Status_Aktif === 'Nonaktif' ? 'Aktif' : 'Nonaktif'; r.Diubah_Oleh = S.user.Email; r.Tgl_Ubah = new Date().toISOString().slice(0, 10);
    S.ver++; S.rendered = {}; saveCache(); enqueue({ t: 'ref', id: 'ref' }); renderReferensi(); toast('Aturan ' + r.ID_Referensi + (r.Status_Aktif === 'Aktif' ? ' diaktifkan.' : ' dinonaktifkan.'), 'ok');
  },
  resetRef(el) {
    confirmBox('Pulihkan aturan default?', 'Seluruh aturan akan dikembalikan ke kaidah faraidh bawaan. Perubahan manual Anda akan hilang.', 'Pulihkan', async () => {
      try { await flushAll(); S.D.referensi = await api('resetReferensi', S.token); S.ver++; S.rendered = {}; saveCache(); renderReferensi(); toast('Aturan dipulihkan ke default.', 'ok'); }
      catch (e) { if (e.sesi) sessionExpired(); else toast('Gagal: ' + e.message, 'err'); }
    });
  },
  importRef() { const f = $('#refFile'); if (f) f.click(); },
  exportRef,
  addKel() { openModal('Tambah Kelompok', kelForm(null), { buttons: [{ label: 'Batal', cls: 'btn-ghost-f', close: true }, { label: 'Simpan', cls: 'btn-primary-f', onClick: b => saveKel(b) }] }); },
  editKel(el) { const g = S.D.kelompok.find(x => x.ID_Kelompok === el.dataset.id); if (g) openModal('Ubah Kelompok', kelForm(g), { buttons: [{ label: 'Batal', cls: 'btn-ghost-f', close: true }, { label: 'Simpan', cls: 'btn-primary-f', onClick: b => saveKel(b, g.ID_Kelompok) }] }); },
  delKel(el) {
    const g = S.D.kelompok.find(x => x.ID_Kelompok === el.dataset.id); if (!g) return;
    confirmBox('Hapus kelompok?', 'Kelompok <b>' + esc(g.Nama_Kelompok) + '</b> hanya dapat dihapus jika tidak memiliki pengguna dan kasus.', 'Hapus', async () => {
      try { await api('deleteKelompok', S.token, g.ID_Kelompok); S.D.kelompok = S.D.kelompok.filter(x => x.ID_Kelompok !== g.ID_Kelompok); S.ver++; S.rendered = {}; saveCache(); renderReferensi(); toast('Kelompok dihapus.', 'ok'); }
      catch (e) { if (e.sesi) sessionExpired(); else toast(e.message, 'err'); }
    }, true);
  },
  addUser() { openModal('Tambah Akun Pengurus', userForm(null), { buttons: [{ label: 'Batal', cls: 'btn-ghost-f', close: true }, { label: 'Simpan Akun', cls: 'btn-primary-f', onClick: b => saveUser(b) }] }); },
  editUser(el) { const u = S.D.pengguna.find(x => x.ID === el.dataset.id); if (u) openModal('Ubah Akun', userForm(u), { buttons: [{ label: 'Batal', cls: 'btn-ghost-f', close: true }, { label: 'Simpan Akun', cls: 'btn-primary-f', onClick: b => saveUser(b, u.ID) }] }); },
  async savePeng(el) {
    const fd = new FormData($('#setForm')); const o = {}; fd.forEach((v, k) => { o[k] = v; });
    busy(el, true, 'Menyimpan…');
    try { await api('savePengaturan', S.token, o); S.D.pengaturan = o; S.ver++; S.rendered = {}; saveCache(); applyBranding(); toast('Pengaturan disimpan.', 'ok'); }
    catch (e) { if (e.sesi) sessionExpired(); else toast(e.message, 'err'); } finally { busy(el, false); }
  },
  logout
};

async function saveKel(btn, id) {
  const f = $('#kelForm'), err = $('#kfErr'), fd = new FormData(f);
  const o = { ID_Kelompok: id || '', Nama_Kelompok: String(fd.get('Nama_Kelompok') || '').trim(), Keterangan: fd.get('Keterangan'), Admin_Email: fd.get('Admin_Email') };
  if (!o.Nama_Kelompok) { err.hidden = false; err.textContent = 'Nama kelompok wajib diisi.'; return; }
  busy(btn, true, 'Menyimpan…');
  try { const r = await api('saveKelompok', S.token, o); const i = S.D.kelompok.findIndex(x => x.ID_Kelompok === r.ID_Kelompok); if (i >= 0) S.D.kelompok[i] = r; else S.D.kelompok.push(r); S.ver++; S.rendered = {}; saveCache(); closeModal(); renderReferensi(); toast('Kelompok disimpan.', 'ok'); }
  catch (e) { if (e.sesi) { closeModal(); sessionExpired(); } else { err.hidden = false; err.textContent = e.message; } } finally { busy(btn, false); }
}
async function saveUser(btn, id) {
  const f = $('#userForm'), err = $('#ufErr'), fd = new FormData(f); const o = { ID: id || '' }; fd.forEach((v, k) => { o[k] = v; });
  busy(btn, true, 'Menyimpan…');
  try { const r = await api('savePengguna', S.token, o); const i = S.D.pengguna.findIndex(x => x.ID === r.ID); if (i >= 0) S.D.pengguna[i] = r; else S.D.pengguna.push(r); S.ver++; S.rendered = {}; saveCache(); closeModal(); renderReferensi(); toast('Akun disimpan.', 'ok'); }
  catch (e) { if (e.sesi) { closeModal(); sessionExpired(); } else { err.hidden = false; err.textContent = e.message; } } finally { busy(btn, false); }
}

/* ---------- Delegasi event ---------- */
let qTimer = null;
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
  const fn = ACT[el.dataset.act]; if (fn) { e.preventDefault(); fn(el, e); }
});
document.addEventListener('submit', e => { if (e.target.id === 'loginForm') submitLogin(e); else e.preventDefault(); });
document.addEventListener('input', e => {
  const t = e.target;
  if (t.classList && t.classList.contains('money')) { const v = parseMoney(t.value); t.value = v ? nf.format(v) : ''; }
  const k = curKasus();
  switch (t.dataset && t.dataset.in) {
    case 'k-biaya': if (k) { k.Biaya_Jenazah = parseMoney(t.value); commit(k.ID_Kasus, { keepStatus: false }); kalcRefresh(); } return;
    case 'k-utang': if (k) { k.Utang = parseMoney(t.value); commit(k.ID_Kasus); kalcRefresh(); } return;
    case 'k-wasiat': if (k) { k.Wasiat = parseMoney(t.value); commit(k.ID_Kasus); kalcRefresh(); } return;
    case 'h-nilai': { const h = S.D.harta.find(x => x.ID_Harta === t.dataset.id); if (h && k) { h.Nilai = parseMoney(t.value); commit(k.ID_Kasus); kalcRefresh(); } return; }
  }
  if (t.id === 'fQ') { clearTimeout(qTimer); qTimer = setTimeout(() => { S.ui.q = t.value; S.ui.pg = 1; renderKasusTable(); }, 180); }
  else if (t.id === 'refQ') { clearTimeout(qTimer); qTimer = setTimeout(() => { S.ui.refQ = t.value; S.ui.refPg = 1; renderRefBody(); const i = $('#refQ'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 180); }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'fStatus') { S.ui.fStatus = t.value; S.ui.pg = 1; renderKasusTable(); }
  else if (t.id === 'fKel') { S.ui.fKel = t.value; S.ui.pg = 1; renderKasusTable(); }
  else if (t.id === 'fDari') { S.ui.fDari = t.value; S.ui.pg = 1; renderKasusTable(); }
  else if (t.id === 'fSampai') { S.ui.fSampai = t.value; S.ui.pg = 1; renderKasusTable(); }
  else if (t.dataset && t.dataset.in === 'h-kat') { const h = S.D.harta.find(x => x.ID_Harta === t.dataset.id); if (h) { h.Kategori = t.value; t.className = 'sel cat ' + (t.value === 'Gono-gini' ? 'c-gono' : 'c-bawaan'); commit(h.ID_Kasus); kalcRefresh(); } }
  else if (t.id === 'rfHub') { $('#rfKond').innerHTML = condOptions(t.value, null); $('#rfManWrap').hidden = true; }
  else if (t.id === 'rfKond') { $('#rfManWrap').hidden = t.value !== 'MANUAL'; if (t.value === 'MANUAL') $('#rfKondMan').focus(); }
  else if (t.id === 'rfJenis') { const b = $('#rfBag'); b.disabled = t.value !== 'Furudh'; if (t.value !== 'Furudh') b.value = ''; }
  else if (t.id === 'pfJk') { const l = $('#pfBinLbl'); if (l) l.textContent = t.value === 'Perempuan' ? 'Binti (nama ayah)' : 'Bin (nama ayah)'; }
  else if (t.id === 'ufPeran') { $('#ufKel').disabled = t.value === ROLE_SUPER || t.value === ROLE_TIMD; }
  else if (t.id === 'refFile') { importRefFile(t.files[0]); t.value = ''; }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.closest && e.target.closest('#appModalBody') && e.target.tagName === 'INPUT' && e.target.type !== 'file') {
    e.preventDefault(); const b = $('#appModalFoot .btn-primary-f, #appModalFoot .btn-gold-f'); if (b) b.click();
  }
  if (e.key === 'Escape') closeMenu();
});

/* ---------- Inisialisasi ---------- */
function init() {
  setTheme(ls.get('frd_theme') || 'light');
  S.queue = lsJSON('frd_q', []);
  const tok = ls.get('frd_token'), cache = lsJSON('frd_cache', null);
  if (tok && cache && cache.user) {
    S.token = tok; S.user = cache.user; S.dbLabel = cache.dbLabel || ''; S.D = Object.assign(S.D, cache.D || {});
    showApp(); go('dashboard');
    loadBootstrap(true).then(() => pump()).catch(e => { if (e.sesi) sessionExpired(); else toast('Mode luring: menampilkan data tersimpan di perangkat.', 'warn'); });
  } else if (tok) {
    S.token = tok;
    loadBootstrap(true).then(() => { go('dashboard'); pump(); }).catch(() => { S.token = null; showLogin(); });
  } else showLogin();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
