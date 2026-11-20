'use strict';
/* =====================================================================
 *  REFERENSI & ATURAN (Super Admin: kelola · Admin Kelompok: lihat)
 * ===================================================================== */
const condLabelR = r => r.Kondisi === 'MANUAL' ? '✎ ' + (r.Kondisi_Manual || 'Kondisi manual') : condLabel(r.Kondisi);
const condLabel = c => (COND[c] ? COND[c].label : String(c || '').replace(/_/g, ' ').toLowerCase().replace(/^./, x => x.toUpperCase()));
const JENIS_BADGE = { Furudh: 'b-furudh', Ashabah: 'b-ashabah', Hajb: 'b-mahjub' };
const JENIS_LBL = { Furudh: 'Ashhabul Furudh', Ashabah: 'Ashabah', Hajb: 'Mahjub' };

function renderReferensi() {
  const sup = isSuper(), all = isAll(), sec = $('#page-referensi');
  const aktif = S.D.referensi.filter(r => r.Status_Aktif !== 'Nonaktif').length;
  const tabs = [['ref', 'book', 'Referensi Bagian Waris (Faroidl Rules)', S.D.referensi.length]];
  if (all) tabs.push(['kel', 'people', 'Kelompok & Akun Pengurus (RBAC)', S.D.kelompok.length]);
  tabs.push(['log', 'clock-history', 'Log Aktivitas Sistem (Audit Trail)', '']);
  if (all) tabs.push(['set', 'gear', 'Pengaturan Aplikasi', '']);
  if (!tabs.some(t => t[0] === S.ui.refTab)) S.ui.refTab = 'ref';
  sec.innerHTML =
    '<div class="ref-head"><div><div class="ch-tags"><span class="tag-green"><i class="bi bi-shield-lock"></i> ' + (sup ? 'SUPER ADMIN MASTER CONTROL' : (all ? 'TIM FAROIDL DAERAH' : 'AKSES LIHAT SAJA')) + '</span><span class="tag-gold"><i class="bi bi-patch-check"></i> I\'timad jumhur ulama</span></div>' +
      '<h1 class="h-display">Basis Aturan Faroidl &amp; ' + (all ? 'Manajemen Kelompok' : 'Acuan Perhitungan') + '</h1>' +
      '<p class="muted">Konfigurasi aturan pembagian furudh, ashabah, hajb' + (all ? ', serta kelompok pengurus waris' : '') + ' yang tersinkron dengan Google Sheets &amp; Apps Script.</p></div>' +
      (sup ? '<div class="ref-act"><button class="btn-f btn-ghost-f" data-act="resetRef"><i class="bi bi-arrow-counterclockwise"></i> Pulihkan Aturan Default</button>' +
        '<button class="btn-f btn-ghost-f" data-act="importRef"><i class="bi bi-file-earmark-arrow-up"></i> Impor Aturan Excel</button>' +
        '<button class="btn-f btn-ghost-f" data-act="exportRef"><i class="bi bi-file-earmark-spreadsheet"></i> Ekspor (.xlsx)</button>' +
        '<button class="btn-f btn-primary-f" data-act="addRule"><i class="bi bi-plus-circle"></i> Tambah Aturan Baru</button>' +
        '<input type="file" id="refFile" accept=".xlsx,.xls,.csv" hidden></div>' : '<div class="ref-act"><button class="btn-f btn-ghost-f" data-act="exportRef"><i class="bi bi-file-earmark-spreadsheet"></i> Ekspor (.xlsx)</button></div>') + '</div>' +
    '<div class="kpi-grid sm"><div class="kpi"><div class="kpi-top"><span class="kpi-l">TOTAL KAIDAH AKTIF</span><span class="kpi-ic"><i class="bi bi-journal-bookmark"></i></span></div><div class="kpi-v">' + aktif + ' <small>Kaidah Furudh, Ashabah &amp; Hajb</small></div></div>' +
      '<div class="kpi"><div class="kpi-top"><span class="kpi-l">KELOMPOK REGIONAL</span><span class="kpi-ic"><i class="bi bi-diagram-3"></i></span></div><div class="kpi-v">' + S.D.kelompok.length + ' <small>Kelompok aktif</small></div></div>' +
      '<div class="kpi"><div class="kpi-top"><span class="kpi-l">PENGURUS BERWENANG</span><span class="kpi-ic"><i class="bi bi-people"></i></span></div><div class="kpi-v">' + (all ? S.D.pengguna.filter(u => u.Status === 'Aktif').length : 1) + ' <small>Akun aktif</small></div></div>' +
      '<div class="kpi"><div class="kpi-top"><span class="kpi-l">INTEGRITAS AUDIT</span><span class="kpi-ic"><i class="bi bi-shield-check"></i></span></div><div class="kpi-v" id="integr">' + (S.queue.length ? S.queue.length + ' <small>menunggu sinkron</small>' : '100% <small>Tersinkron GAS Cloud</small>') + '</div></div></div>' +
    '<div class="tabs" role="tablist">' + tabs.map(t => '<button class="tab' + (S.ui.refTab === t[0] ? ' on' : '') + '" role="tab" aria-selected="' + (S.ui.refTab === t[0]) + '" data-act="refTab" data-t="' + t[0] + '"><i class="bi bi-' + t[1] + '"></i> <span>' + t[2] + '</span>' + (t[3] !== '' ? ' <em class="cnt">' + t[3] + '</em>' : '') + '</button>').join('') + '</div>' +
    '<div id="refBody"></div>';
  renderRefBody();
}

function renderRefBody() {
  const b = $('#refBody'); if (!b) return;
  ({ ref: refTabRef, kel: refTabKel, log: refTabLog, set: refTabSet }[S.ui.refTab] || refTabRef)(b);
}

function refFiltered() {
  const q = S.ui.refQ.toLowerCase();
  return S.D.referensi.filter(r => (S.ui.refJenis === 'Semua' || r.Jenis === S.ui.refJenis) &&
    (!q || (HUB_ATURAN_LABEL[r.Hubungan] + ' ' + condLabelR(r) + ' ' + r.Dalil + ' ' + r.ID_Referensi).toLowerCase().includes(q)))
    .sort((a, b) => String(a.ID_Referensi).localeCompare(String(b.ID_Referensi)));
}

function refTabRef(b) {
  const sup = isSuper(), list = refFiltered(), per = 8, pages = Math.max(1, Math.ceil(list.length / per));
  if (S.ui.refPg > pages) S.ui.refPg = pages;
  const sl = list.slice((S.ui.refPg - 1) * per, S.ui.refPg * per);
  b.innerHTML = '<div class="card-f filters"><div class="f-row"><label class="search"><i class="bi bi-search"></i><input id="refQ" class="inp" type="search" placeholder="Cari hubungan, kondisi, atau dalil…" value="' + esc(S.ui.refQ) + '" aria-label="Cari aturan"></label>' +
    '<div class="seg">' + ['Semua', 'Furudh', 'Ashabah', 'Hajb'].map(j => '<button class="seg-b' + (S.ui.refJenis === j ? ' on' : '') + '" data-act="refJenis" data-j="' + j + '">' + j + '</button>').join('') + '</div>' +
    '<span class="live-note"><i class="dot-ok-i"></i> Perubahan langsung memengaruhi perhitungan real-time seluruh kelompok.</span></div></div>' +
    '<div class="card-f table-card"><div class="tbl-wrap"><table class="tbl resp tab-num"><thead><tr><th>ID Aturan</th><th>Hubungan Waris</th><th>Kondisi Syar\'i</th><th>Bagian Pecahan</th><th>Kategori</th><th>Dalil</th><th>Prioritas</th><th>Status</th>' + (sup ? '<th class="r">Aksi</th>' : '') + '</tr></thead><tbody>' +
    (sl.length ? sl.map(r => '<tr class="' + (r.Status_Aktif === 'Nonaktif' ? 'dim' : '') + '"><td data-label="ID" class="mono">' + esc(r.ID_Referensi) + '</td><td data-label="Hubungan"><b class="nm">' + esc(HUB_ATURAN_LABEL[r.Hubungan] || r.Hubungan) + '</b></td><td data-label="Kondisi" class="cond">' + esc(condLabelR(r)) + (r.Kondisi === 'MANUAL' ? ' <span class="tag-gold" title="Tidak dipakai mesin hitung otomatis">INFORMATIF</span>' : '') + '</td>' +
      '<td data-label="Bagian"><span class="frac-badge' + (r.Jenis === 'Furudh' ? '' : ' alt') + '">' + (r.Jenis === 'Furudh' ? esc(r.Bagian_Pecahan) : (r.Jenis === 'Ashabah' ? 'Sisa' : 'Terhalang')) + '</span></td>' +
      '<td data-label="Kategori"><span class="badge-f ' + (JENIS_BADGE[r.Jenis] || '') + '">' + (JENIS_LBL[r.Jenis] || r.Jenis) + '</span></td><td data-label="Dalil" class="dalil">' + esc(r.Dalil) + (r.Link_Dalil ? ' <button class="link-btn" data-act="previewFile" data-url="' + esc(r.Link_Dalil) + '" data-title="Dalil ' + esc(r.ID_Referensi) + '" aria-label="Lihat berkas dalil"><i class="bi bi-paperclip"></i> Berkas</button>' : '') + '</td><td data-label="Prioritas"><span class="prio">Tk. ' + esc(r.Prioritas) + '</span></td>' +
      '<td data-label="Status"><span class="st-dot ' + (r.Status_Aktif === 'Nonaktif' ? 'off' : 'on') + '"></span> ' + esc(r.Status_Aktif || 'Aktif') + '</td>' +
      (sup ? '<td data-label="Aksi" class="r"><div class="act-row"><button class="icon-btn sm" data-act="editRule" data-id="' + esc(r.ID_Referensi) + '" aria-label="Ubah aturan"><i class="bi bi-pencil"></i></button><button class="icon-btn sm" data-act="toggleRule" data-id="' + esc(r.ID_Referensi) + '" aria-label="' + (r.Status_Aktif === 'Nonaktif' ? 'Aktifkan' : 'Nonaktifkan') + ' aturan" title="' + (r.Status_Aktif === 'Nonaktif' ? 'Aktifkan' : 'Nonaktifkan') + '"><i class="bi bi-' + (r.Status_Aktif === 'Nonaktif' ? 'toggle-off' : 'toggle-on') + '"></i></button></div></td>' : '') + '</tr>').join('')
      : '<tr><td colspan="9">' + emptyState('search', 'Tidak ada aturan yang cocok', 'Ubah kata kunci atau filter.') + '</td></tr>') + '</tbody></table></div>' +
    '<div class="pager"><span class="muted sm">Menampilkan ' + sl.length + ' dari ' + list.length + ' basis kaidah hukum faraidh · Halaman ' + S.ui.refPg + '/' + pages + '</span><div class="pg"><button class="icon-btn sm" data-act="refPg" data-d="-1" ' + (S.ui.refPg <= 1 ? 'disabled' : '') + ' aria-label="Sebelumnya"><i class="bi bi-chevron-left"></i></button><button class="icon-btn sm" data-act="refPg" data-d="1" ' + (S.ui.refPg >= pages ? 'disabled' : '') + ' aria-label="Berikutnya"><i class="bi bi-chevron-right"></i></button></div></div></div>' +
    '<p class="muted sm note-inf"><i class="bi bi-info-circle"></i> Pecahan baris <b>Ashhabul Furudh</b> langsung dipakai mesin hitung. Baris <b>Ashabah</b> dan <b>Mahjub</b> menjelaskan kaidah yang sudah tertanam di mesin (urutan ashabah dan penghalang) dan bersifat informasi.</p>';
}

function refTabKel(b) {
  const sup = isSuper();   // hanya Super Admin yang boleh menambah/ubah akun
  b.innerHTML = '<div class="card-f"><div class="sec-h"><div><h2 class="h-sec">Kelompok</h2><p class="muted sm">Setiap Admin Kelompok hanya melihat kasus kelompoknya sendiri.</p></div><button class="btn-f btn-primary-f" data-act="addKel"><i class="bi bi-plus-circle"></i> Tambah Kelompok</button></div>' +
    '<div class="tbl-wrap"><table class="tbl resp"><thead><tr><th>ID</th><th>Nama Kelompok</th><th>Email Penerima Salinan</th><th class="r">Kasus</th><th class="r">Pengguna</th><th class="r">Aksi</th></tr></thead><tbody>' +
    (S.D.kelompok.length ? S.D.kelompok.map(g => '<tr><td data-label="ID" class="mono">' + esc(g.ID_Kelompok) + '</td><td data-label="Nama"><b class="nm">' + esc(g.Nama_Kelompok) + '</b><div class="muted sm">' + esc(g.Keterangan) + '</div></td><td data-label="Email">' + esc(g.Admin_Email || '—') + '</td>' +
      '<td data-label="Kasus" class="r num">' + S.D.kasus.filter(k => k.ID_Kelompok === g.ID_Kelompok).length + '</td><td data-label="Pengguna" class="r num">' + S.D.pengguna.filter(u => u.ID_Kelompok === g.ID_Kelompok).length + '</td>' +
      '<td data-label="Aksi" class="r"><div class="act-row"><button class="icon-btn sm" data-act="editKel" data-id="' + esc(g.ID_Kelompok) + '" aria-label="Ubah"><i class="bi bi-pencil"></i></button><button class="icon-btn sm danger" data-act="delKel" data-id="' + esc(g.ID_Kelompok) + '" aria-label="Hapus"><i class="bi bi-trash3"></i></button></div></td></tr>').join('') : '<tr><td colspan="6">' + emptyState('diagram-3', 'Belum ada kelompok', 'Tambahkan kelompok pertama.') + '</td></tr>') + '</tbody></table></div></div>' +
    '<div class="card-f"><div class="sec-h"><div><h2 class="h-sec">Akun Pengurus</h2><p class="muted sm">Peran: Super Admin (akses penuh), Tim Faroidl Daerah (semua kelompok, tanpa kelola akun &amp; aturan), Admin Kelompok, dan Tim Faroidl Kelompok (hanya input data, terbatas pada kelompoknya).' + (sup ? '' : ' Daftar ini hanya untuk dilihat.') + '</p></div>' + (sup ? '<button class="btn-f btn-primary-f" data-act="addUser"><i class="bi bi-person-plus"></i> Tambah Akun</button>' : '') + '</div>' +
    '<div class="tbl-wrap"><table class="tbl resp"><thead><tr><th>Nama</th><th>Email</th><th>Peran</th><th>Kelompok</th><th>Status</th>' + (sup ? '<th class="r">Aksi</th>' : '') + '</tr></thead><tbody>' +
    S.D.pengguna.map(u => '<tr class="' + (u.Status === 'Nonaktif' ? 'dim' : '') + '"><td data-label="Nama"><b class="nm">' + esc(u.Nama) + '</b></td><td data-label="Email">' + esc(u.Email) + '</td><td data-label="Peran"><span class="badge-f ' + (u.Peran === ROLE_SUPER ? 'b-furudh' : 'b-ashabah') + '">' + esc(u.Peran) + '</span></td><td data-label="Kelompok">' + (u.ID_Kelompok ? esc(kelNama(u.ID_Kelompok)) : 'Semua') + '</td>' +
      '<td data-label="Status"><span class="st-dot ' + (u.Status === 'Aktif' ? 'on' : 'off') + '"></span> ' + esc(u.Status) + '</td>' + (sup ? '<td data-label="Aksi" class="r"><button class="icon-btn sm" data-act="editUser" data-id="' + esc(u.ID) + '" aria-label="Ubah akun"><i class="bi bi-pencil"></i></button></td>' : '') + '</tr>').join('') + '</tbody></table></div></div>';
}

function refTabLog(b) {
  const L = S.D.log || [], per = 12, pages = Math.max(1, Math.ceil(L.length / per));
  if (S.ui.logPg > pages) S.ui.logPg = pages;
  const sl = L.slice((S.ui.logPg - 1) * per, S.ui.logPg * per);
  b.innerHTML = '<div class="card-f table-card"><div class="tbl-wrap"><table class="tbl resp"><thead><tr><th>Waktu (WIB)</th><th>Pengguna</th><th>Aksi</th><th>Detail</th></tr></thead><tbody>' +
    (sl.length ? sl.map(l => '<tr><td data-label="Waktu" class="mono">' + esc(l.Waktu) + '</td><td data-label="Pengguna">' + esc(l.Pengguna) + '</td><td data-label="Aksi"><span class="badge-f pill-grey">' + esc(l.Aksi) + '</span></td><td data-label="Detail">' + esc(l.Detail) + '</td></tr>').join('') : '<tr><td colspan="4">' + emptyState('clock-history', 'Belum ada aktivitas', 'Aktivitas akan tercatat di sini.') + '</td></tr>') + '</tbody></table></div>' +
    '<div class="pager"><span class="muted sm">' + L.length + ' aktivitas terakhir' + (isAll() ? '' : ' (milik Anda)') + ' · Halaman ' + S.ui.logPg + '/' + pages + '</span><div class="pg"><button class="icon-btn sm" data-act="logPg" data-d="-1" ' + (S.ui.logPg <= 1 ? 'disabled' : '') + ' aria-label="Sebelumnya"><i class="bi bi-chevron-left"></i></button><button class="icon-btn sm" data-act="logPg" data-d="1" ' + (S.ui.logPg >= pages ? 'disabled' : '') + ' aria-label="Berikutnya"><i class="bi bi-chevron-right"></i></button></div></div></div>';
}

function refTabSet(b) {
  const p = S.D.pengaturan || {};
  b.innerHTML = '<div class="card-f"><h2 class="h-sec">Identitas Aplikasi</h2><form id="setForm" class="set-form" novalidate>' +
    '<label class="lbl">Nama aplikasi<input class="inp" name="nama_aplikasi" maxlength="60" value="' + esc(p.nama_aplikasi || 'Faroidl Cloud') + '"></label>' +
    '<label class="lbl">Nama lembaga (kop Berita Acara)<input class="inp" name="nama_lembaga" maxlength="120" value="' + esc(p.nama_lembaga || '') + '"></label>' +
    '<label class="lbl">URL logo (opsional)<input class="inp" name="logo_url" maxlength="200" value="' + esc(p.logo_url || '') + '" placeholder="https://…"></label>' +
    '<h2 class="h-sec sm" style="margin-top:.5rem">Catatan Kaki &amp; Tanda Tangan Berita Acara</h2>' +
    '<label class="lbl">Teks catatan kaki (kosongkan untuk teks bawaan)<textarea class="inp" name="ba_catatan" rows="3" maxlength="600" style="padding:.6rem .75rem;min-height:84px" placeholder="' + esc(BA_CATATAN_DEFAULT) + '">' + esc(p.ba_catatan || '') + '</textarea></label>' +
    '<div class="two"><label class="lbl">Jabatan penanda tangan<input class="inp" name="ba_ttd_jabatan" maxlength="80" value="' + esc(p.ba_ttd_jabatan || 'Tim Faroidl') + '"></label>' +
    '<label class="lbl">Nama penanda tangan (opsional)<input class="inp" name="ba_ttd_nama" maxlength="80" value="' + esc(p.ba_ttd_nama || '') + '"></label></div>' +
    '<label class="lbl">Tempat penandatanganan (kosong = Desa pada kasus)<input class="inp" name="ba_ttd_tempat" maxlength="80" value="' + esc(p.ba_ttd_tempat || '') + '" placeholder="mis. Ketapang"></label>' +
    '<div><button type="button" class="btn-f btn-primary-f" data-act="savePeng"><i class="bi bi-save"></i> Simpan Pengaturan</button></div></form>' +
    '<p class="muted sm">ID Spreadsheet, ID folder Drive, dan salt sandi disimpan di Script Properties (bukan di sheet) demi keamanan.</p></div>';
}

/* ---------- Form aturan ---------- */
function ruleForm(r) {
  r = r || { Hubungan: 'suami', Kondisi: 'TANPA_KETURUNAN', Bagian_Pecahan: '1/2', Jenis: 'Furudh', Dalil: '', Prioritas: 1, Status_Aktif: 'Aktif' };
  const hubOpts = Object.keys(HUB_ATURAN_LABEL).map(h => '<option value="' + h + '"' + (r.Hubungan === h ? ' selected' : '') + '>' + esc(HUB_ATURAN_LABEL[h]) + '</option>').join('');
  return '<form id="ruleForm" novalidate><input type="hidden" id="rfEditId" value="' + esc(r.ID_Referensi || '') + '"><label class="lbl">Hubungan waris<select class="sel w100" name="Hubungan" id="rfHub">' + hubOpts + '</select></label>' +
    '<label class="lbl">Jenis aturan<select class="sel w100" name="Jenis" id="rfJenis">' + ['Furudh', 'Ashabah', 'Hajb'].map(j => '<option value="' + j + '"' + (r.Jenis === j ? ' selected' : '') + '>' + JENIS_LBL[j] + (j === 'Furudh' ? ' (dipakai mesin hitung)' : ' (informasi)') + '</option>').join('') + '</select></label>' +
    '<label class="lbl">Kondisi syar\'i<select class="sel w100" name="Kondisi" id="rfKond">' + condOptions(r.Hubungan, r.Kondisi) + '</select></label>' +
    '<div id="rfManWrap"' + (r.Kondisi === 'MANUAL' ? '' : ' hidden') + '><label class="lbl">Kondisi manual<input class="inp" name="Kondisi_Manual" id="rfKondMan" maxlength="150" value="' + esc(r.Kondisi_Manual || '') + '" placeholder="mis. Pewaris meninggalkan anak angkat bersyarat wasiat wajibah"></label>' +
    '<p class="note warn sm"><i class="bi bi-info-circle"></i> Kondisi manual bersifat <b>catatan rujukan</b>: tidak dievaluasi oleh mesin hitung otomatis. Gunakan kondisi baku bila aturan ingin dipakai dalam perhitungan.</p></div>' +
    '<div class="two"><label class="lbl">Bagian pecahan<input class="inp" name="Bagian_Pecahan" id="rfBag" value="' + esc(r.Jenis === 'Furudh' ? r.Bagian_Pecahan : '') + '" placeholder="mis. 1/6" ' + (r.Jenis === 'Furudh' ? '' : 'disabled') + '></label>' +
    '<label class="lbl">Prioritas (kecil = dicek dahulu)<input class="inp" type="number" min="1" max="99" name="Prioritas" value="' + esc(r.Prioritas) + '"></label></div>' +
    '<label class="lbl">Dalil / keterangan<input class="inp" name="Dalil" maxlength="200" value="' + esc(r.Dalil) + '" placeholder="mis. QS. An-Nisa: 11"></label>' +
    '<div class="lbl dalil-up"><span>Berkas dalil rujukan (PDF/gambar, maks. 4 MB)</span><input type="hidden" name="Link_Dalil" id="rfLink" value="' + esc(r.Link_Dalil || '') + '">' +
    '<div class="up-row"><button type="button" class="btn-f btn-ghost-f btn-sm" data-act="pickDalil"><i class="bi bi-cloud-upload"></i> <span id="rfUpLbl">' + (r.Link_Dalil ? 'Ganti berkas' : 'Pilih berkas') + '</span></button>' +
    '<span id="rfUpName" class="muted sm">' + (r.Link_Dalil ? 'Berkas tersimpan di Drive' : 'Belum ada berkas') + '</span>' +
    '<button type="button" class="link-btn muted" id="rfUpDel" data-act="clearDalil"' + (r.Link_Dalil ? '' : ' hidden') + '><i class="bi bi-x-circle"></i> Hapus</button></div></div>' +
    '<label class="lbl">Status<select class="sel w100" name="Status_Aktif"><option' + (r.Status_Aktif !== 'Nonaktif' ? ' selected' : '') + '>Aktif</option><option' + (r.Status_Aktif === 'Nonaktif' ? ' selected' : '') + '>Nonaktif</option></select></label>' +
    '<div class="form-err" id="rfErr" role="alert" hidden></div></form>';
}
function condOptions(hub, cur) {
  const list = (COND_PER_HUB[hub] || []).slice();
  Object.keys(COND).forEach(c => { if (list.indexOf(c) < 0) list.push(c); });
  if (cur && list.indexOf(cur) < 0) list.push(cur);
  return list.filter(c => c !== 'MANUAL').map(c => '<option value="' + c + '"' + (cur === c ? ' selected' : '') + '>' + esc(condLabel(c)) + '</option>').join('') +
    '<option value="MANUAL"' + (cur === 'MANUAL' ? ' selected' : '') + '>✎ Tulis kondisi manual…</option>';
}
function submitRule(editId) {
  const f = $('#ruleForm'), err = $('#rfErr'), fd = new FormData(f);
  const jenis = fd.get('Jenis'); let bag = String(fd.get('Bagian_Pecahan') || '').trim();
  const fail = m => { err.hidden = false; err.textContent = m; };
  if (jenis === 'Furudh') {
    const fr = F.parse(bag);
    if (!fr || fr.d === 0 || fr.n > fr.d || fr.n === 0) return fail('Pecahan tidak valid. Contoh: 1/6, 2/3, 1/8.');
    bag = fr.n + '/' + fr.d;
  } else bag = jenis === 'Ashabah' ? 'Ashabah' : '0';
  const o = { Hubungan: fd.get('Hubungan'), Kondisi: fd.get('Kondisi'), Kondisi_Manual: fd.get('Kondisi') === 'MANUAL' ? String(fd.get('Kondisi_Manual') || '').trim() : '', Bagian_Pecahan: bag, Jenis: jenis, Dalil: String(fd.get('Dalil') || '').trim(), Prioritas: Math.max(1, parseInt(fd.get('Prioritas'), 10) || 1), Status_Aktif: fd.get('Status_Aktif'), Link_Dalil: String(fd.get('Link_Dalil') || ''), Diubah_Oleh: S.user.Email, Tgl_Ubah: new Date().toISOString().slice(0, 10) };
  if (o.Kondisi === 'MANUAL' && !o.Kondisi_Manual) return fail('Tulis kondisi manual terlebih dahulu.');
  if (S.dalilBusy) return fail('Tunggu hingga unggahan berkas selesai.');
  if (editId) Object.assign(S.D.referensi.find(r => r.ID_Referensi === editId), o);
  else {
    const max = S.D.referensi.reduce((m, r) => Math.max(m, parseInt(String(r.ID_Referensi).replace(/\D/g, ''), 10) || 0), 0);
    S.D.referensi.push(Object.assign({ ID_Referensi: 'REF-' + String(max + 1).padStart(3, '0') }, o));
  }
  closeModal(); S.ver++; S.rendered = {}; saveCache(); enqueue({ t: 'ref', id: 'ref' }); renderReferensi();
  toast('Aturan disimpan. Berlaku untuk perhitungan berikutnya; kasus lama tetap utuh sampai diubah.', 'ok');
}

/* ---------- Form kelompok & akun ---------- */
function kelForm(g) {
  g = g || {};
  return '<form id="kelForm" novalidate><label class="lbl">Nama kelompok<input class="inp" name="Nama_Kelompok" maxlength="100" required value="' + esc(g.Nama_Kelompok) + '" placeholder="mis. Cabang Bantul"></label>' +
    '<label class="lbl">Keterangan<input class="inp" name="Keterangan" maxlength="200" value="' + esc(g.Keterangan) + '"></label>' +
    '<label class="lbl">Email penerima salinan Berita Acara<input class="inp" type="email" name="Admin_Email" maxlength="120" value="' + esc(g.Admin_Email) + '"></label><div class="form-err" id="kfErr" role="alert" hidden></div></form>';
}
function userForm(u) {
  u = u || { Peran: 'Admin Kelompok', Status: 'Aktif' };
  return '<form id="userForm" novalidate><label class="lbl">Nama<input class="inp" name="Nama" maxlength="100" required value="' + esc(u.Nama) + '"></label>' +
    '<label class="lbl">Email<input class="inp" type="email" name="Email" maxlength="120" required value="' + esc(u.Email) + '" autocomplete="off"></label>' +
    '<div class="two"><label class="lbl">Peran<select class="sel w100" name="Peran" id="ufPeran">' + ROLES.map(r => '<option' + ((u.Peran || ROLE_ADMIN) === r ? ' selected' : '') + '>' + r + '</option>').join('') + '</select></label>' +
    '<label class="lbl">Kelompok<select class="sel w100" name="ID_Kelompok" id="ufKel"><option value="">—</option>' + S.D.kelompok.map(g => '<option value="' + esc(g.ID_Kelompok) + '"' + (u.ID_Kelompok === g.ID_Kelompok ? ' selected' : '') + '>' + esc(g.Nama_Kelompok) + '</option>').join('') + '</select></label></div>' +
    '<div class="two"><label class="lbl">Status<select class="sel w100" name="Status"><option' + (u.Status !== 'Nonaktif' ? ' selected' : '') + '>Aktif</option><option' + (u.Status === 'Nonaktif' ? ' selected' : '') + '>Nonaktif</option></select></label>' +
    '<label class="lbl">' + (u.ID ? 'Kata sandi baru (kosongkan jika tetap)' : 'Kata sandi awal (min. 8 karakter)') + '<input class="inp" type="password" name="Password" autocomplete="new-password" minlength="8"></label></div>' +
    '<div class="form-err" id="ufErr" role="alert" hidden></div></form>';
}

/* ---------- Impor / ekspor aturan ---------- */
function exportRef() {
  if (!xlsxReady()) return;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(S.D.referensi.map(r => ({ ID_Referensi: r.ID_Referensi, Hubungan: r.Hubungan, Kondisi: r.Kondisi, Kondisi_Manual: r.Kondisi_Manual || '', Bagian_Pecahan: r.Bagian_Pecahan, Jenis: r.Jenis, Dalil: r.Dalil, Prioritas: r.Prioritas, Status_Aktif: r.Status_Aktif, Link_Dalil: r.Link_Dalil || '' }))), 'Referensi');
  saveXlsx(wb, 'Faroidl_Referensi_Bagian_Waris.xlsx');
}
async function importRefFile(file) {
  if (!file || !xlsxReady()) return;
  try {
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
    if (!rows.length) throw new Error('Berkas kosong.');
    const out = rows.map((r, i) => {
      const id = String(r.ID_Referensi || '').trim() || 'REF-' + String(i + 1).padStart(3, '0');
      const hub = String(r.Hubungan || '').trim(), jenis = String(r.Jenis || '').trim();
      if (!HUB_ATURAN_LABEL[hub]) throw new Error('Baris ' + (i + 2) + ': hubungan "' + hub + '" tidak dikenal.');
      if (['Furudh', 'Ashabah', 'Hajb'].indexOf(jenis) < 0) throw new Error('Baris ' + (i + 2) + ': jenis harus Furudh, Ashabah, atau Hajb.');
      let bag = String(r.Bagian_Pecahan || '').trim();
      if (jenis === 'Furudh') { const f = F.parse(bag); if (!f || f.n === 0 || f.n > f.d) throw new Error('Baris ' + (i + 2) + ': pecahan "' + bag + '" tidak valid.'); bag = f.n + '/' + f.d; } else bag = jenis === 'Ashabah' ? 'Ashabah' : '0';
      return { ID_Referensi: id, Hubungan: hub, Kondisi: String(r.Kondisi || 'DEFAULT').trim().toUpperCase(), Kondisi_Manual: String(r.Kondisi_Manual || '').trim(), Bagian_Pecahan: bag, Jenis: jenis, Dalil: String(r.Dalil || ''), Prioritas: parseInt(r.Prioritas, 10) || 1, Status_Aktif: r.Status_Aktif === 'Nonaktif' ? 'Nonaktif' : 'Aktif', Link_Dalil: String(r.Link_Dalil || ((S.D.referensi.find(x => x.ID_Referensi === id) || {}).Link_Dalil) || ''), Diubah_Oleh: S.user.Email, Tgl_Ubah: new Date().toISOString().slice(0, 10) };
    });
    confirmBox('Impor aturan', 'Mengganti seluruh <b>' + S.D.referensi.length + '</b> aturan saat ini dengan <b>' + out.length + '</b> aturan dari berkas "' + esc(file.name) + '"?', 'Ganti Aturan', () => {
      S.D.referensi = out; S.ver++; S.rendered = {}; saveCache(); enqueue({ t: 'ref', id: 'ref' }); renderReferensi(); toast('Aturan diimpor.', 'ok');
    });
  } catch (e) { toast('Impor gagal: ' + e.message, 'err'); }
}

/* ---------- Unggah berkas dalil (Super Admin) ---------- */
async function uploadDalil(file) {
  if (!file) return;
  const lbl = $('#rfUpName'), btn = $('[data-act=pickDalil]');
  if (file.size > 4 * 1024 * 1024) { toast('Ukuran berkas maksimal 4 MB.', 'err'); return; }
  if (['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].indexOf(file.type) < 0) { toast('Format harus PDF, JPG, PNG, atau WebP.', 'err'); return; }
  S.dalilBusy = true; if (btn) btn.disabled = true; if (lbl) lbl.innerHTML = '<span class="spin sm"></span> Mengunggah ' + esc(file.name) + '…';
  try {
    const b64 = await readFileB64(file);
    const r = await api('unggahDalil', S.token, ($('#rfEditId') || {}).value || 'REF', file.name, file.type, b64);
    const li = $('#rfLink'); if (li) li.value = r.url;
    if ($('#rfUpName')) $('#rfUpName').textContent = r.name;
    if ($('#rfUpLbl')) $('#rfUpLbl').textContent = 'Ganti berkas';
    if ($('#rfUpDel')) $('#rfUpDel').hidden = false;
    toast('Berkas dalil terunggah. Klik "Simpan Aturan" untuk menautkannya.', 'ok');
  } catch (e) { if (e.sesi) sessionExpired(); else { toast('Gagal mengunggah: ' + e.message, 'err'); if ($('#rfUpName')) $('#rfUpName').textContent = 'Unggahan gagal'; } }
  finally { S.dalilBusy = false; if ($('[data-act=pickDalil]')) $('[data-act=pickDalil]').disabled = false; }
}
