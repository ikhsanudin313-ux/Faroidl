'use strict';
/* =====================================================================
 *  KALKULATOR HARTA (inventaris aset, gono-gini, hak jenazah)
 * ===================================================================== */
function chooser(title, act) {
  const ks = filteredKasusAll();
  return '<div class="card-f">' + (ks.length ? '<h1 class="h-display sm">' + esc(title) + '</h1><div class="pick-list">' +
    ks.map(k => '<button class="pick" data-act="' + act + '" data-id="' + esc(k.ID_Kasus) + '"><div><b>' + esc(namaLengkap(k)) + '</b><div class="muted sm mono">' + esc(k.ID_Kasus) + ' · ' + esc(kelNama(k.ID_Kelompok)) + '</div></div>' + statusBadge(k.Status) + '</button>').join('') + '</div>'
    : emptyState('folder2-open', 'Belum ada kasus', 'Buat kasus waris terlebih dahulu.', '<button class="btn-f btn-gold-f" data-act="newKasus"><i class="bi bi-plus-circle"></i> Buat Kasus Waris Baru</button>')) + '</div>';
}
const filteredKasusAll = () => S.D.kasus.slice().sort((a, b) => String(b.Tgl_Input).localeCompare(String(a.Tgl_Input)));
const fmtMoney = n => (Number(n) || 0) ? nf.format(Math.round(Number(n))) : '';
const parseMoney = s => Number(String(s).replace(/[^\d]/g, '')) || 0;
const pasanganLabel = k => (k.Jenis_Kelamin_Pewaris === 'Perempuan' ? 'Suami' : 'Istri');

function renderKalkulator() {
  const sec = $('#page-kalkulator'), k = curKasus();
  if (!k) { sec.innerHTML = chooser('Pilih kasus untuk mengelola harta', 'openKalkulator'); return; }
  const id = k.ID_Kasus, H = hartaOf(id), ah = ahliOf(id), sup = isSuper();
  const pas = ah.find(a => a.Hubungan === 'suami' || a.Hubungan === 'istri');
  const hij = hijri(k.Tgl_Wafat);
  const step = (n, t, d, st) => '<div class="step st-' + st + '"><span class="step-n">' + (st === 'done' ? '<i class="bi bi-check-lg"></i>' : n) + '</span><div><small>LANGKAH ' + n + (st === 'act' ? ' · AKTIF' : '') + '</small><b>' + t + '</b><em>' + d + '</em></div></div>';
  const R = rekapOf(id);
  const s2 = H.length ? 'done' : 'act';
  const s3 = H.length ? ((k.Status === 'Terhitung' || k.Status === 'Selesai & PDF') ? 'done' : 'act') : 'wait';
  const s4 = (R.bersih > 0 && H.length) ? ((k.Status === 'Terhitung' || k.Status === 'Selesai & PDF') ? 'done' : 'act') : 'wait';
  sec.innerHTML =
    '<div class="card-f case-head"><div class="ch-main"><div class="ch-tags"><span class="tag-green">PERKARA AKTIF</span><span class="mono muted sm">#' + esc(id) + '</span><span class="chip">' + esc(kelNama(k.ID_Kelompok)) + '</span></div>' +
      '<h1 class="h-display">' + esc(almLabel(k)) + ' ' + esc(namaLengkap(k)) + '</h1>' +
      '<div class="chips"><span class="chip"><i class="bi bi-person-heart"></i> ' + (k.Status_Pasangan === 'Ada' ? pasanganLabel(k) + ' hidup' + (pas ? ' (' + esc(pas.Nama) + ')' : '') : 'Tidak ada pasangan hidup') + '</span>' +
      '<span class="chip"><i class="bi bi-calendar3"></i> Wafat: ' + esc(tglID(k.Tgl_Wafat)) + (hij ? ' / ' + esc(hij) : '') + '</span></div></div>' +
      '<div class="ch-side"><div class="verif"><small>STATUS</small><b>' + esc(k.Status) + '</b></div><button class="btn-f btn-ghost-f btn-sm" data-act="editPewaris"><i class="bi bi-pencil-square"></i> Ubah Data Pewaris</button></div></div>' +

    '<div class="stepper">' + step(1, 'Data Pewaris &amp; Wafat', 'Tercatat', 'done') + step(2, 'Catatan Harta &amp; Aset', H.length + ' pos harta', s2) +
      step(3, 'Rekap Gono-gini &amp; Kewajiban', 'Tajhiz, utang, wasiat', s3) + step(4, 'Pembagian (Siap Bagi)', 'Menuju faroidl', s4) + '</div>' +

    '<div class="kal-grid"><div class="kal-main">' +
      '<div class="card-f"><div class="sec-h"><div><h2 class="h-sec"><i class="bi bi-wallet2"></i> Inventarisasi Aset (Tirkah Kasar)</h2><p class="muted sm">Klasifikasikan antara harta bersama (syirkah/gono-gini) dan harta bawaan murni.</p></div>' +
        '<button class="btn-f btn-primary-f" data-act="addHarta"><i class="bi bi-plus-circle"></i> Tambah Item</button></div>' +
        '<div id="hartaTable"></div><div id="kalcTotals"></div></div>' +

      '<div class="card-f"><div class="sec-h"><div><h2 class="h-sec"><i class="bi bi-diagram-3"></i> Pemisahan Harta Gono-Gini (Syirkah Suami-Istri)</h2><span class="tag-gold">PASAL 97</span></div></div>' +
        '<p class="muted sm">Sesuai Kompilasi Hukum Islam (KHI), pasangan hidup memiliki hak atas bagian harta bersama; hanya sisanya dihitung sebagai harta peninggalan pewaris.</p>' +
        '<div id="kalcGono"></div>' +
        (sup ? '<details class="adj" ' + (Number(k.Porsi_Gonogini_Pasangan) !== 50 ? 'open' : '') + '><summary><i class="bi bi-sliders2"></i> Opsi penyesuaian porsi khusus (Super Admin)</summary>' +
          '<div class="adj-body"><label class="lbl">Persentase hak pasangan (%)<input id="porsiIn" class="inp" type="number" min="0" max="100" step="0.01" value="' + esc(k.Porsi_Gonogini_Pasangan) + '"></label>' +
          '<label class="lbl">Dasar hukum / bukti kesepakatan (wajib jika bukan 50%)<input id="alasanIn" class="inp" maxlength="300" value="' + esc(k.Alasan_Perubahan_Porsi) + '" placeholder="mis. Perjanjian pra-nikah / putusan pengadilan"></label>' +
          '<button class="btn-f btn-ghost-f" data-act="applyPorsi">Terapkan Porsi Baru</button><p class="muted sm mb-0">Perubahan dicatat pada log aktivitas.</p></div></details>'
          : '<p class="muted sm lock"><i class="bi bi-lock"></i> Porsi bawaan ½ (50%). Hanya Super Admin yang dapat mengubahnya.</p>') + '</div>' +

      '<div class="card-f"><div class="sec-h"><div><h2 class="h-sec"><i class="bi bi-journal-check"></i> Hak Terkait Jenazah Sebelum Pembagian Waris</h2></div></div>' +
        '<p class="muted sm">Urutan penunaian hak atas harta peninggalan: (1) biaya pengurusan jenazah, (2) pelunasan utang, (3) wasiat sah (maksimal ⅓).</p>' +
        '<div class="pot-grid">' +
          '<label class="pot"><span class="pot-n">1</span><span class="pot-t"><b>Biaya Pengurusan Jenazah</b><em>Memandikan, kafan, ambulans, liang lahat</em></span><span class="money-in"><i>Rp</i><input class="inp money" inputmode="numeric" data-in="k-biaya" value="' + fmtMoney(k.Biaya_Jenazah) + '" aria-label="Biaya jenazah"></span></label>' +
          '<label class="pot"><span class="pot-n">2</span><span class="pot-t"><b>Pelunasan Utang Pewaris</b><em>Utang yang masih menjadi tanggungan</em></span><span class="money-in"><i>Rp</i><input class="inp money" inputmode="numeric" data-in="k-utang" value="' + fmtMoney(k.Utang) + '" aria-label="Utang pewaris"></span></label>' +
          '<div id="kalcPot"></div>' +
          '<label class="pot"><span class="pot-n">3</span><span class="pot-t"><b>Wasiat Pewaris</b><em>Maksimal ⅓ dari sisa harta</em></span><span class="money-in"><i>Rp</i><input class="inp money" inputmode="numeric" data-in="k-wasiat" value="' + fmtMoney(k.Wasiat) + '" aria-label="Wasiat"></span></label>' +
          '<div id="kalcWas"></div></div></div>' +
    '</div>' +

    '<aside class="kal-side"><div id="kalcSide"></div>' +
      '<div class="card-f guide"><h3 class="h-sec sm"><i class="bi bi-lightbulb"></i> Panduan Musyawarah</h3><p class="muted sm mb-0">Pastikan seluruh ahli waris telah menandatangani Berita Acara Rekapitulasi sebelum masuk ke tabel hisab furudh guna menghindari sengketa di masa datang.</p></div></aside></div>' +

    '<div class="actionbar"><button class="btn-f btn-ghost-f" data-act="go" data-p="dashboard"><i class="bi bi-arrow-left"></i> <span>Kembali ke Dashboard</span></button>' +
      '<button class="btn-f btn-ghost-f" data-act="saveNow"><i class="bi bi-save"></i> <span>Simpan Draf Aset</span></button>' +
      '<button class="btn-f btn-ghost-f" data-act="exportRekap"><i class="bi bi-file-earmark-spreadsheet"></i> <span>Unduh Rekap (Excel)</span></button>' +
      '<button class="btn-f btn-gold-f" data-act="openHitung" data-id="' + esc(id) + '"><span>' + (isInputOnly() ? 'Lanjut ke Input Ahli Waris' : 'Lanjut ke Pembagian Ahli Waris') + '</span> <i class="bi bi-arrow-right"></i></button></div>';
  renderHartaTable(); kalcRefresh();
}

function renderHartaTable() {
  const box = $('#hartaTable'); if (!box) return;
  const k = curKasus(); if (!k) return;
  const H = hartaOf(k.ID_Kasus);
  if (!H.length) { box.innerHTML = emptyState('wallet2', 'Belum ada harta tercatat', 'Tambahkan rumah, tanah, tabungan, emas, kendaraan, atau piutang milik pewaris.', '<button class="btn-f btn-primary-f" data-act="addHarta"><i class="bi bi-plus-circle"></i> Tambah Item Harta</button>'); return; }
  box.innerHTML = '<div class="tbl-wrap"><table class="tbl resp"><thead><tr><th>Deskripsi Aset</th><th>Kategori</th><th>Bukti Yuridis</th><th class="r">Nilai Pasar / Taksiran</th><th class="r">Aksi</th></tr></thead><tbody>' +
    H.map(h => '<tr data-hid="' + esc(h.ID_Harta) + '"><td data-label="Aset"><b class="nm">' + esc(h.Nama_Harta) + '</b><div class="muted sm">' + esc(h.Jenis) + (h.Keterangan ? ' · ' + esc(h.Keterangan) : '') + '</div></td>' +
      '<td data-label="Kategori"><select class="sel cat ' + (h.Kategori === 'Gono-gini' ? 'c-gono' : 'c-bawaan') + '" data-in="h-kat" data-id="' + esc(h.ID_Harta) + '" aria-label="Kategori harta"><option' + (h.Kategori === 'Gono-gini' ? ' selected' : '') + ' value="Gono-gini">Gono-gini (bersama)</option><option' + (h.Kategori === 'Bawaan' ? ' selected' : '') + ' value="Bawaan">Bawaan pewaris</option></select></td>' +
      '<td data-label="Bukti">' + (h.Link_Bukti ? '<button class="link-btn" data-act="previewFile" data-url="' + esc(h.Link_Bukti) + '"><i class="bi bi-paperclip"></i> Lihat bukti</button>' : '<button class="link-btn muted" data-act="uploadHarta" data-id="' + esc(h.ID_Harta) + '"><i class="bi bi-cloud-upload"></i> Unggah</button>') + '</td>' +
      '<td data-label="Nilai" class="r"><span class="money-in sm"><i>Rp</i><input class="inp money" inputmode="numeric" data-in="h-nilai" data-id="' + esc(h.ID_Harta) + '" value="' + fmtMoney(h.Nilai) + '" aria-label="Nilai ' + esc(h.Nama_Harta) + '"></span></td>' +
      '<td data-label="Aksi" class="r"><div class="act-row"><button class="icon-btn sm" data-act="editHarta" data-id="' + esc(h.ID_Harta) + '" aria-label="Ubah"><i class="bi bi-pencil"></i></button>' +
      '<button class="icon-btn sm danger" data-act="delHarta" data-id="' + esc(h.ID_Harta) + '" aria-label="Hapus"><i class="bi bi-trash3"></i></button></div></td></tr>').join('') + '</tbody></table></div>';
}

/** Perbarui wilayah ringkasan tanpa merender ulang input (agar fokus mengetik tidak hilang). */
function kalcRefresh() {
  const k = curKasus(); if (!k || S.ui.page !== 'kalkulator') return;
  const id = k.ID_Kasus, R = rekapOf(id), sup = isSuper();
  const tot = $('#kalcTotals');
  if (tot) tot.innerHTML = '<div class="totals"><div><small>TOTAL NILAI HARTA TERINVENTARISIR</small><b class="serif">' + rp(R.total) + '</b></div><div class="tot-leg"><span><i class="g"></i>Gono-gini Total: <b>' + rp(R.gonogini) + '</b></span><span><i class="b"></i>Bawaan Pewaris: <b>' + rp(R.bawaan) + '</b></span></div></div>';
  const gono = $('#kalcGono');
  if (gono) {
    const pas = k.Status_Pasangan === 'Ada';
    const nmP = (ahliOf(id).find(a => a.Hubungan === 'suami' || a.Hubungan === 'istri') || {}).Nama;
    gono.innerHTML = '<div class="gono-grid"><div class="gono-c"><div class="gono-t"><span>Porsi ' + pasanganLabel(k) + (nmP ? ' (' + esc(nmP) + ')' : '') + '</span><span class="tag-gold">' + (pas ? esc(k.Porsi_Gonogini_Pasangan) + '%' + (Number(k.Porsi_Gonogini_Pasangan) === 50 ? ' (Default)' : '') : 'Tidak ada') + '</span></div><small>Hak milik pribadi (dikeluarkan)</small><b class="serif">' + rp(R.bagianPasangan) + '</b>' +
      '<em>' + (pas ? esc(k.Porsi_Gonogini_Pasangan) + '% × ' + rp(R.gonogini) : 'Tanpa pasangan hidup: seluruh gono-gini masuk harta peninggalan') + '</em></div>' +
      '<div class="gono-c"><div class="gono-t"><span>Porsi Almarhum/ah</span><span class="tag-green">' + (pas ? esc(100 - Number(k.Porsi_Gonogini_Pasangan)) : 100) + '%</span></div><small>Bagian masuk harta waris</small><b class="serif">' + rp(R.gonogini - R.bagianPasangan) + '</b><em>+ Harta bawaan pewaris: ' + rp(R.bawaan) + '</em></div></div>' +
      '<div class="subtotal"><span>Subtotal Peninggalan Pewaris:</span><b>' + rp(R.peninggalan) + '</b></div>';
  }
  const pot = $('#kalcPot');
  if (pot) pot.innerHTML = '<div class="pot-sum"><span>Sisa Bersih Sebelum Wasiat:</span><b>' + rp(R.sisaSebelumWasiat) + '</b></div>' + (R.defisit ? '<div class="note warn"><i class="bi bi-exclamation-triangle"></i> Biaya jenazah dan utang melebihi harta peninggalan. Sisa untuk ahli waris Rp 0.</div>' : '');
  const was = $('#kalcWas');
  if (was) was.innerHTML = R.wasiatMelebihi
    ? '<div class="note warn"><i class="bi bi-exclamation-triangle"></i> Wasiat melebihi ⅓. Dihitung hanya sebesar maksimal <b>' + rp(R.wasiatMax) + '</b>; kelebihannya memerlukan persetujuan seluruh ahli waris.</div>'
    : '<div class="note ok"><i class="bi bi-patch-check"></i> Memenuhi syarat syar\'i. Maksimal wasiat yang diperbolehkan: <b>' + rp(R.wasiatMax) + '</b>.</div>';
  const side = $('#kalcSide');
  if (side) {
    const dl = R.potongan - Number(k.Biaya_Jenazah || 0) - Number(k.Utang || 0);
    side.innerHTML = '<div class="card-f"><h2 class="h-sec sm">Komposisi Harta</h2><div class="donut sm"><canvas id="cvKal" role="img" aria-label="Komposisi harta"></canvas><div class="donut-c"><small>TIRKAH BERSIH</small><b>' + (R.total ? Math.round(R.bersih / R.total * 1000) / 10 : 0).toString().replace('.', ',') + '%</b><span>Siap bagi</span></div></div>' +
      '<ul class="legend"><li><i style="background:var(--primary-container)"></i><span>Tirkah bersih ahli waris</span><b>' + rp(R.bersih) + '</b></li><li><i style="background:var(--secondary-gold)"></i><span>Hak ' + pasanganLabel(k).toLowerCase() + ' (gono-gini)</span><b>' + rp(R.bagianPasangan) + '</b></li><li><i style="background:var(--sage)"></i><span>Duyun, tajhiz &amp; wasiat</span><b>' + rp(R.potongan) + '</b></li></ul></div>' +
      '<div class="card-f result"><div class="res-h"><i class="bi bi-bank"></i><span class="tag-light">Terkunci</span></div><small>HASIL AKHIR TAHAP 2</small><div class="res-l">Tirkah Khalishah (Harta Bersih):</div><b class="res-v">' + rp(R.bersih) + '</b>' +
      '<p class="res-d">Nominal mutlak yang akan didistribusikan kepada ahli waris (<i>Ashabul Furudh</i> &amp; <i>Ashabah</i>) pada Tahap 3.</p>' +
      '<dl class="res-rows"><div><dt>Harta Total Terkumpul</dt><dd>' + rp(R.total) + '</dd></div><div><dt>− Gono-gini ' + pasanganLabel(k) + ' (' + (k.Status_Pasangan === 'Ada' ? esc(k.Porsi_Gonogini_Pasangan) : 0) + '%)</dt><dd>' + rp(R.bagianPasangan) + '</dd></div>' +
      '<div><dt>− Biaya Tajhiz (Jenazah)</dt><dd>' + rp(k.Biaya_Jenazah) + '</dd></div><div><dt>− Pelunasan Utang (Duyun)</dt><dd>' + rp(k.Utang) + '</dd></div><div><dt>− Pelaksanaan Wasiat</dt><dd>' + rp(R.wasiatEfektif) + '</dd></div>' +
      '<div class="tot"><dt>Sisa Bersih Siap Faroidl:</dt><dd>' + rp(R.bersih) + '</dd></div></dl>' +
      '<p class="res-f"><i class="bi bi-cloud-check"></i> Tersimpan otomatis ke Sheets &amp; Drive</p></div>';
    const col = [cssVar('--primary-container'), cssVar('--secondary-gold'), cssVar('--sage')];
    makeChart('cvKal', { type: 'doughnut', data: { labels: ['Tirkah bersih', 'Hak pasangan', 'Duyun/Tajhiz/Wasiat'], datasets: [{ data: [R.bersih, R.bagianPasangan, R.potongan], backgroundColor: col, borderWidth: 0 }] },
      options: { cutout: '70%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' ' + c.label + ': ' + rp(c.parsed) } } }, animation: { duration: 250 } } });
  }
}

/* ---------- Form harta ---------- */
function hartaForm(h) {
  h = h || { Nama_Harta: '', Jenis: 'Properti', Nilai: 0, Kategori: 'Gono-gini', Keterangan: '' };
  return '<form id="hartaForm" novalidate><label class="lbl">Nama / deskripsi aset<input class="inp" name="Nama_Harta" maxlength="150" required value="' + esc(h.Nama_Harta) + '" placeholder="mis. Rumah tinggal utama"></label>' +
    '<div class="two"><label class="lbl">Jenis<select class="sel w100" name="Jenis">' + JENIS_HARTA.map(j => '<option' + (h.Jenis === j ? ' selected' : '') + '>' + j + '</option>').join('') + '</select></label>' +
    '<label class="lbl">Nilai pasar / taksiran<span class="money-in"><i>Rp</i><input class="inp money" name="Nilai" inputmode="numeric" required value="' + fmtMoney(h.Nilai) + '"></span></label></div>' +
    '<fieldset class="lbl"><legend>Kategori harta</legend><label class="radio"><input type="radio" name="Kategori" value="Gono-gini"' + (h.Kategori === 'Gono-gini' ? ' checked' : '') + '><span><b>Gono-gini (harta bersama)</b><em>Diperoleh selama pernikahan</em></span></label>' +
    '<label class="radio"><input type="radio" name="Kategori" value="Bawaan"' + (h.Kategori === 'Bawaan' ? ' checked' : '') + '><span><b>Bawaan pewaris</b><em>Warisan, hibah, atau sebelum menikah</em></span></label></fieldset>' +
    '<label class="lbl">Keterangan (opsional)<input class="inp" name="Keterangan" maxlength="300" value="' + esc(h.Keterangan) + '" placeholder="mis. SHM No. 412 / Sleman"></label>' +
    '<label class="lbl">Bukti yuridis (PDF/JPG/PNG, maks 4 MB, opsional)<input class="inp" type="file" name="bukti" accept="application/pdf,image/jpeg,image/png,image/webp"></label>' +
    '<div class="form-err" id="hfErr" role="alert" hidden></div></form>';
}
function readFileB64(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = () => rej(new Error('Gagal membaca berkas.')); r.readAsDataURL(file); });
}
async function uploadBukti(file, hartaId) {
  const k = curKasus(); if (!k || !file) return;
  if (file.size > 4 * 1024 * 1024) { toast('Ukuran berkas maksimal 4 MB.', 'err'); return; }
  toast('Mengunggah bukti ke Google Drive…', 'info');
  try {
    const b64 = await readFileB64(file);
    await flushAll();
    const r = await api('unggahBukti', S.token, k.ID_Kasus, file.name, file.type, b64);
    const h = S.D.harta.find(x => x.ID_Harta === hartaId); if (h) { h.Link_Bukti = r.url; commit(k.ID_Kasus, { now: true, keepStatus: true }); if (S.ui.page === 'kalkulator') renderHartaTable(); }
    toast('Bukti tersimpan di Google Drive.', 'ok');
  } catch (e) { if (e.sesi) sessionExpired(); else toast('Gagal mengunggah: ' + e.message, 'err'); }
}
function submitHarta(editId) {
  const k = curKasus(), f = $('#hartaForm'); if (!k || !f) return;
  const fd = new FormData(f), err = $('#hfErr');
  const nama = String(fd.get('Nama_Harta') || '').trim(), nilai = parseMoney(fd.get('Nilai'));
  if (!nama) { err.hidden = false; err.textContent = 'Nama aset wajib diisi.'; return; }
  if (nilai <= 0) { err.hidden = false; err.textContent = 'Nilai harus lebih dari 0.'; return; }
  const file = fd.get('bukti');
  let item;
  if (editId) { item = S.D.harta.find(h => h.ID_Harta === editId); Object.assign(item, { Nama_Harta: nama, Jenis: fd.get('Jenis'), Nilai: nilai, Kategori: fd.get('Kategori'), Keterangan: String(fd.get('Keterangan') || '').trim() }); }
  else { item = { ID_Harta: uid(), ID_Kasus: k.ID_Kasus, Nama_Harta: nama, Jenis: fd.get('Jenis'), Nilai: nilai, Kategori: fd.get('Kategori'), Keterangan: String(fd.get('Keterangan') || '').trim(), Link_Bukti: '' }; S.D.harta.push(item); }
  closeModal(); commit(k.ID_Kasus, { now: true }); renderHartaTable(); kalcRefresh();
  toast(editId ? 'Aset diperbarui.' : 'Aset ditambahkan.', 'ok');
  if (file && file.size) uploadBukti(file, item.ID_Harta);
}

/* ---------- Form data pewaris ---------- */
function pewarisForm(k, isNew) {
  const sup = isAll();
  return '<form id="pewarisForm" novalidate><label class="lbl">Nama lengkap Almarhum / Almarhumah<input class="inp" name="Nama_Pewaris" maxlength="120" required value="' + esc(k ? k.Nama_Pewaris : '') + '" placeholder="mis. H. Muhammad Ridwan"></label>' +
    '<div class="two"><label class="lbl"><span id="pfBinLbl">' + (k && k.Jenis_Kelamin_Pewaris === 'Perempuan' ? 'Binti (nama ayah)' : 'Bin (nama ayah)') + '</span><input class="inp" name="Nama_Ayah" maxlength="100" value="' + esc(k ? k.Nama_Ayah || '' : '') + '" placeholder="mis. Sulaiman"></label>' +
    '<label class="lbl">Tanggal lahir (opsional)<input class="inp" type="date" name="Tgl_Lahir" value="' + esc(k ? k.Tgl_Lahir || '' : '') + '" max="' + new Date().toISOString().slice(0, 10) + '"></label></div>' +
    '<div class="two"><label class="lbl">Kelompok<input class="inp" name="Desa" maxlength="80" value="' + esc(k ? k.Desa || '' : '') + '" placeholder="mis. Kelompok Al-Ikhlas"></label>' +
    '<label class="lbl">Desa<input class="inp" name="Daerah" maxlength="80" value="' + esc(k ? k.Daerah || '' : '') + '" placeholder="mis. Desa Sukamaju"></label></div>' +
    '<div class="two"><label class="lbl">Jenis kelamin<select class="sel w100" name="Jenis_Kelamin_Pewaris" id="pfJk"><option' + (k && k.Jenis_Kelamin_Pewaris === 'Laki-laki' ? ' selected' : '') + '>Laki-laki</option><option' + (k && k.Jenis_Kelamin_Pewaris === 'Perempuan' ? ' selected' : '') + '>Perempuan</option></select></label>' +
    '<label class="lbl">Tanggal wafat<input class="inp" type="date" name="Tgl_Wafat" required value="' + esc(k ? k.Tgl_Wafat : '') + '" max="' + new Date().toISOString().slice(0, 10) + '"></label></div>' +
    '<div class="two"><label class="lbl">Pasangan hidup saat wafat<select class="sel w100" name="Status_Pasangan"><option value="Ada"' + (!k || k.Status_Pasangan === 'Ada' ? ' selected' : '') + '>Ada</option><option value="Tidak Ada"' + (k && k.Status_Pasangan === 'Tidak Ada' ? ' selected' : '') + '>Tidak ada</option></select></label>' +
    (sup && isNew ? '<label class="lbl">Pengurus berwenang (kelompok akun)<select class="sel w100" name="ID_Kelompok">' + S.D.kelompok.map(g => '<option value="' + esc(g.ID_Kelompok) + '">' + esc(g.Nama_Kelompok) + '</option>').join('') + '</select></label>' : '<div></div>') + '</div>' +
    '<div class="form-err" id="pfErr" role="alert" hidden></div></form>';
}
function submitPewaris(isNew) {
  const f = $('#pewarisForm'), err = $('#pfErr'), fd = new FormData(f);
  const nama = String(fd.get('Nama_Pewaris') || '').trim(), tgl = fd.get('Tgl_Wafat');
  if (!nama) { err.hidden = false; err.textContent = 'Nama pewaris wajib diisi.'; return; }
  if (!tgl) { err.hidden = false; err.textContent = 'Tanggal wafat wajib diisi.'; return; }
  const kel = isAll() ? (fd.get('ID_Kelompok') || (S.D.kelompok[0] || {}).ID_Kelompok) : S.user.ID_Kelompok;
  if (!kel) { err.hidden = false; err.textContent = 'Belum ada kelompok. Buat kelompok terlebih dahulu di menu Referensi & Aturan.'; return; }
  if (isNew) {
    const k = { ID_Kasus: newKasusId(), ID_Kelompok: kel, Nama_Pewaris: nama, Jenis_Kelamin_Pewaris: fd.get('Jenis_Kelamin_Pewaris'), Tgl_Wafat: tgl, Status_Pasangan: fd.get('Status_Pasangan'), Desa: String(fd.get('Desa') || '').trim(), Daerah: String(fd.get('Daerah') || '').trim(), Nama_Ayah: String(fd.get('Nama_Ayah') || '').trim(), Tgl_Lahir: String(fd.get('Tgl_Lahir') || ''),
      Porsi_Gonogini_Pasangan: 50, Alasan_Perubahan_Porsi: '', Biaya_Jenazah: 0, Utang: 0, Wasiat: 0, Status: 'Draft Berkas', Dibuat_Oleh: S.user.Email, Tgl_Input: new Date().toISOString().slice(0, 10) };
    S.D.kasus.unshift(k); S.ui.kasusId = k.ID_Kasus; closeModal(); commit(k.ID_Kasus, { now: true }); go('kalkulator'); toast('Kasus dibuat. Silakan catat harta pewaris.', 'ok');
  } else {
    const k = curKasus();
    const gantiJk = k.Jenis_Kelamin_Pewaris !== fd.get('Jenis_Kelamin_Pewaris');
    Object.assign(k, { Nama_Pewaris: nama, Jenis_Kelamin_Pewaris: fd.get('Jenis_Kelamin_Pewaris'), Tgl_Wafat: tgl, Status_Pasangan: fd.get('Status_Pasangan'), Desa: String(fd.get('Desa') || '').trim(), Daerah: String(fd.get('Daerah') || '').trim(), Nama_Ayah: String(fd.get('Nama_Ayah') || '').trim(), Tgl_Lahir: String(fd.get('Tgl_Lahir') || '') });
    if (gantiJk) { const n = S.D.ahli.filter(a => a.ID_Kasus === k.ID_Kasus && (a.Hubungan === 'suami' || a.Hubungan === 'istri')).length; if (n) { S.D.ahli = S.D.ahli.filter(a => !(a.ID_Kasus === k.ID_Kasus && (a.Hubungan === 'suami' || a.Hubungan === 'istri'))); toast('Jenis kelamin berubah: data pasangan dihapus, tambahkan kembali.', 'warn'); } }
    closeModal(); commit(k.ID_Kasus, { now: true }); renderKalkulator();
  }
}
