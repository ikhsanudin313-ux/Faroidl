'use strict';
/* =====================================================================
 *  HITUNG WARIS SYAR'I
 * ===================================================================== */
const BAR_COLORS = () => [cssVar('--primary-container'), cssVar('--secondary-gold'), cssVar('--sage'), cssVar('--gold-soft'), cssVar('--mint-bright'), '#7a8a80'];

function hasilStale(id) {
  const st = hasilOf(id); if (!st.length) return false;
  const res = calcOf(id); if (!res.ok) return false;
  return res.rows.some(r => { const s = st.find(x => x.ID_Ahli_Waris === r.ahliId); return !s || Math.abs((Number(s.Nominal) || 0) - r.nominal) > 1; });
}

/** Tampilan khusus Tim Faroidl Kelompok: hanya input ahli waris (tanpa hasil hitung, aturan, atau Berita Acara). */
function renderAhliInput(k) {
  const sec = $('#page-hitung'), id = k.ID_Kasus, ah = ahliOf(id), hij = hijri(k.Tgl_Wafat);
  sec.innerHTML =
    '<div class="card-f case-head hitung-head"><div class="ch-main"><div class="ch-tags"><span class="tag-green">INPUT AHLI WARIS</span><span class="mono muted sm">#' + esc(id) + '</span>' + statusBadge(k.Status) + '</div>' +
      '<h1 class="h-display">' + esc(almLabel(k)) + ' ' + esc(namaLengkap(k)) + '</h1>' +
      '<div class="chips"><span class="chip"><i class="bi bi-calendar3"></i> Wafat: ' + esc(tglID(k.Tgl_Wafat)) + (hij ? ' (' + esc(hij) + ')' : '') + '</span>' + (usiaTahun(k.Tgl_Lahir, k.Tgl_Wafat) !== '' ? '<span class="chip"><i class="bi bi-person"></i> Usia ' + usiaTahun(k.Tgl_Lahir, k.Tgl_Wafat) + ' th</span>' : '') + '<span class="chip"><i class="bi bi-diagram-3"></i> ' + esc(kelNama(k.ID_Kelompok)) + '</span></div></div></div>' +
    '<div class="card-f"><div class="sec-h"><div><h2 class="h-sec">Daftar Ahli Waris</h2><p class="muted sm">Catat seluruh ahli waris. Perhitungan bagian dilakukan oleh Tim Faroidl Daerah / Admin.</p></div>' +
      '<button class="btn-f btn-primary-f" data-act="addAhli"><i class="bi bi-person-plus"></i> Tambah Ahli Waris</button></div>' +
      (ah.length ? '<div class="tbl-wrap"><table class="tbl resp"><thead><tr><th>Nama</th><th>Hubungan</th><th>Status</th><th class="r">Aksi</th></tr></thead><tbody>' +
        ah.map((a, i) => '<tr class="' + (a.Status_Hidup === 'Wafat' ? 'dim' : '') + '"><td data-label="Nama"><span class="av-n c' + (i % 6) + '">' + String(i + 1).padStart(2, '0') + '</span> <b class="nm">' + esc(a.Nama) + '</b></td>' +
          '<td data-label="Hubungan">' + esc(HUB[a.Hubungan] ? HUB[a.Hubungan][0] : a.Hubungan) + '</td><td data-label="Status">' + esc(a.Status_Hidup === 'Wafat' ? 'Wafat sebelum pewaris' : 'Hidup') + '</td>' +
          '<td data-label="Aksi" class="r"><div class="act-row"><button class="icon-btn sm" data-act="editAhli" data-id="' + esc(a.ID) + '" aria-label="Ubah"><i class="bi bi-pencil"></i></button><button class="icon-btn sm danger" data-act="delAhli" data-id="' + esc(a.ID) + '" aria-label="Hapus"><i class="bi bi-trash3"></i></button></div></td></tr>').join('') + '</tbody></table></div>'
        : emptyState('people', 'Belum ada ahli waris', 'Tambahkan ahli waris (pasangan, anak, orang tua, saudara).', '<button class="btn-f btn-primary-f" data-act="addAhli"><i class="bi bi-person-plus"></i> Tambah Ahli Waris</button>')) + '</div>' +
    '<div class="actionbar"><button class="btn-f btn-ghost-f" data-act="go" data-p="dashboard"><i class="bi bi-arrow-left"></i> <span>Kembali ke Dashboard</span></button></div>';
}

function renderHitung() {
  const sec = $('#page-hitung'), k = curKasus();
  if (!k) { sec.innerHTML = chooser(isInputOnly() ? 'Pilih kasus untuk mengisi ahli waris' : 'Pilih kasus untuk menghitung waris', 'openHitung'); return; }
  if (isInputOnly()) { renderAhliInput(k); return; }
  const id = k.ID_Kasus, R = rekapOf(id), res = calcOf(id), ah = ahliOf(id), hij = hijri(k.Tgl_Wafat);
  const aturanAktif = S.D.referensi.filter(r => r.Status_Aktif !== 'Nonaktif').length;
  const stat = !res.ok ? '—' : (res.aul ? '\'Aul (Defisit)' : (res.radd ? 'Radd (Surplus)' : 'Adil (Nihil Defisit)'));
  const ahliRows = res.ok ? res.rows : ah.map(a => ({ ahliId: a.ID, nama: a.Nama, hubungan: a.Hubungan, hubunganLabel: HUB[a.Hubungan] ? HUB[a.Hubungan][0] : a.Hubungan, status: 'tunda', bagianLabel: '—', frac: F.make(0), persen: 0, nominal: 0, alasan: '', siham: 0 }));
  const catBadge = r => ({ furudh: '<span class="badge-f b-furudh">Ashhabul Furudh</span>', ashabah: '<span class="badge-f b-ashabah">Ashabah</span>', furudh_ashabah: '<span class="badge-f b-furudh">Furudh</span> <span class="badge-f b-ashabah">Ashabah</span>', mahjub: '<span class="badge-f b-mahjub">Mahjub</span>', wafat: '<span class="badge-f b-mahjub">Wafat</span>', tunda: '' }[r.status] || '');
  const colorIdx = {}; let ci = 0;
  ahliRows.forEach(r => { if (r.persen > 0) colorIdx[r.ahliId] = ci++; });
  const BC = BAR_COLORS();

  sec.innerHTML =
    '<div class="card-f case-head hitung-head"><div class="ch-main"><div class="ch-tags"><span class="tag-green">PERKARA TETAP</span><span class="mono muted sm">#' + esc(id) + '</span>' + statusBadge(k.Status) + '</div>' +
      '<h1 class="h-display">' + esc(almLabel(k)) + ' ' + esc(namaLengkap(k)) + '</h1>' +
      '<div class="chips"><span class="chip"><i class="bi bi-calendar3"></i> Wafat: ' + esc(tglID(k.Tgl_Wafat)) + (hij ? ' (' + esc(hij) + ')' : '') + '</span>' + (usiaTahun(k.Tgl_Lahir, k.Tgl_Wafat) !== '' ? '<span class="chip"><i class="bi bi-person"></i> Usia ' + usiaTahun(k.Tgl_Lahir, k.Tgl_Wafat) + ' th</span>' : '') + '<span class="chip"><i class="bi bi-diagram-3"></i> ' + esc(kelNama(k.ID_Kelompok)) + '</span></div></div>' +
      '<div class="ch-side wrap"><button class="btn-f btn-gold-f" data-act="downloadBA"><i class="bi bi-file-earmark-pdf"></i> Unduh Berita Acara (PDF)</button>' +
      '<button class="btn-f btn-ghost-f" data-act="emailBA"><i class="bi bi-envelope"></i> Kirim Salinan</button>' +
      '<button class="btn-f btn-ghost-f icon-only" data-act="exportHasil" aria-label="Unduh Excel" title="Unduh Excel"><i class="bi bi-file-earmark-spreadsheet"></i></button></div></div>' +

    '<div class="mini-grid"><div class="mini"><small>HARTA WARIS BERSIH (TIRKAH)</small><b class="serif">' + rp(R.bersih) + '</b><em>Setelah wasiat &amp; mu\'nat tajhiz</em></div>' +
      '<div class="mini"><small>ASAL MASALAH (TASHIH)</small><b class="serif">' + (res.ok && !res.kosong ? res.asal + ' <span class="tag-gold">Tashih: ' + res.tashih + '</span>' : '—') + '</b><em>KPK penyebut furudh' + (res.ok && res.aul ? ' · naik menjadi ' + res.asalAkhir : '') + '</em></div>' +
      '<div class="mini"><small>STATUS \'AUL / RADD</small><b class="serif">' + stat + '</b><em>Total siham ' + (res.ok && !res.kosong ? (res.aul ? 'melebihi' : (res.radd ? 'kurang dari' : '=')) + ' asal masalah' : '—') + '</em></div>' +
      '<div class="mini"><small>ACUAN ATURAN</small><b class="serif">' + aturanAktif + ' kaidah aktif</b><em>Referensi Bagian Waris (v2.4)</em></div></div>' +

    (hasilStale(id) ? '<div class="note warn banner"><i class="bi bi-exclamation-triangle"></i> Referensi aturan berubah sejak hasil terakhir disimpan. Hasil di bawah memakai aturan saat ini. <button class="btn-f btn-sm btn-gold-f" data-act="refreshHasil">Perbarui hasil tersimpan</button></div>' : '') +

    '<div class="hitung-grid"><div class="hitung-main">' +
      '<div class="card-f"><div class="sec-h"><div><h2 class="h-sec"><span class="sec-n">1</span> Penetapan Status Hubungan Waris &amp; Hajb</h2><p class="muted sm">Uji kelayakan nasab, ikatan perkawinan, serta penerapan hijab hirman/nuqsan.</p></div>' +
        '<button class="btn-f btn-primary-f" data-act="addAhli"><i class="bi bi-person-plus"></i> Tambah Ahli Waris</button></div>' +
        (!res.ok ? '<div class="note warn"><i class="bi bi-exclamation-triangle"></i> ' + res.errors.map(esc).join(' ') + '</div>' : '') +
        (ah.length ? '<div class="tbl-wrap"><table class="tbl resp"><thead><tr><th>Nama &amp; Hubungan Nasab</th><th>Kategori Syar\'i</th><th>Status Bagian / Hajb</th><th class="r">Aksi</th></tr></thead><tbody>' +
          ahliRows.map((r, i) => '<tr class="' + (r.status === 'mahjub' || r.status === 'wafat' ? 'dim' : '') + '"><td data-label="Ahli Waris"><span class="av-n c' + ((colorIdx[r.ahliId] || 0) % 6) + '">' + String(i + 1).padStart(2, '0') + '</span> <b class="nm ' + (r.status === 'mahjub' || r.status === 'wafat' ? 'strike' : '') + '">' + esc(r.nama) + '</b><div class="muted sm">' + esc(r.hubunganLabel) + '</div></td>' +
            '<td data-label="Kategori">' + catBadge(r) + '</td>' +
            '<td data-label="Status"><b>' + esc(r.status === 'mahjub' ? 'Gugur (0 bagian)' : r.bagianLabel) + '</b>' + (r.alasan ? '<div class="muted sm">' + esc(r.alasan) + '</div>' : '') + '</td>' +
            '<td data-label="Aksi" class="r"><div class="act-row"><button class="icon-btn sm" data-act="editAhli" data-id="' + esc(r.ahliId) + '" aria-label="Ubah"><i class="bi bi-pencil"></i></button><button class="icon-btn sm danger" data-act="delAhli" data-id="' + esc(r.ahliId) + '" aria-label="Hapus"><i class="bi bi-trash3"></i></button></div></td></tr>').join('') + '</tbody></table></div>'
          : emptyState('people', 'Belum ada ahli waris', 'Tambahkan ahli waris (pasangan, anak, orang tua, saudara) untuk memulai perhitungan.', '<button class="btn-f btn-primary-f" data-act="addAhli"><i class="bi bi-person-plus"></i> Tambah Ahli Waris</button>')) + '</div>' +

      '<div class="card-f"><div class="sec-h"><div><h2 class="h-sec"><span class="sec-n">2</span> Hasil Hitung Faraid &amp; Penetapan Nominal</h2><p class="muted sm">Rincian nisbah pecahan dasar, persentase desimal, dan nominal rupiah.</p></div><span class="code-pill">Nominal = (Siham ÷ Tashih) × Tirkah</span></div>' +
        (res.ok && !res.kosong ? '<div class="tbl-wrap"><table class="tbl resp tab-num"><thead><tr><th>Nama &amp; Hubungan</th><th>Bagian</th><th class="r">Siham</th><th class="r">Persentase</th><th class="r">Nominal (Rp)</th></tr></thead><tbody>' +
          res.rows.map(r => '<tr class="' + (r.persen === 0 ? 'dim' : '') + '"><td data-label="Ahli Waris"><b class="nm ' + (r.persen === 0 ? 'strike' : '') + '">' + esc(r.nama) + '</b><div class="muted sm">' + esc(r.hubunganLabel) + '</div></td>' +
            '<td data-label="Bagian"><span class="frac">' + esc(r.status === 'mahjub' || r.status === 'wafat' ? '0' : r.bagianLabel) + '</span>' + (r.dalil && r.persen > 0 ? '<div class="muted sm">' + esc(r.dalil) + '</div>' : '') + '</td>' +
            '<td data-label="Siham" class="r num">' + (r.persen > 0 ? r.siham + ' / ' + res.tashih : '—') + '</td><td data-label="%" class="r num">' + pct(r.persen) + '</td><td data-label="Nominal" class="r num"><b>' + rp(r.nominal) + '</b></td></tr>').join('') +
          (res.baitulMal.n ? '<tr class="bm-row"><td data-label="Ahli Waris"><b class="nm">Baitul Mal</b><div class="muted sm">Radd (sisa) diserahkan ke Baitul Mal</div></td><td data-label="Bagian"><span class="frac">' + F.str(res.baitulMal) + '</span></td><td data-label="Siham" class="r num">' + (res.tashih * res.baitulMal.n / res.baitulMal.d) + ' / ' + res.tashih + '</td><td data-label="%" class="r num">' + pct(F.val(res.baitulMal) * 100) + '</td><td data-label="Nominal" class="r num"><b>' + rp(Math.round(F.val(res.baitulMal) * R.bersih * 100) / 100) + '</b></td></tr>' : '') +
          '</tbody><tfoot><tr><td><b>Total Terdistribusi' + (res.baitulMal.n ? '' : ' Sempurna') + '</b></td><td class="num">' + F.str(res.totalFrac) + (res.totalFrac.n === res.totalFrac.d ? ' Penuh' : '') + '</td><td class="r num">' + res.rows.reduce((s, r) => s + r.siham, 0) + ' / ' + res.tashih + '</td><td class="r num">' + pct(res.rows.reduce((s, r) => s + r.persen, 0)) + '</td><td class="r num"><b>' + rp(res.rows.reduce((s, r) => s + r.nominal, 0)) + '</b></td></tr></tfoot></table></div>' +
          '<div class="prop"><div class="prop-h"><span>Proporsi Visual Portofolio Ahli Waris</span><span>' + (res.baitulMal.n ? 'Ada sisa tak terbagi' : '100% Habis Terbagi') + '</span></div><div class="prop-bar" role="img" aria-label="Proporsi pembagian">' +
          res.rows.filter(r => r.persen > 0).map(r => '<i style="width:' + r.persen + '%;background:' + BC[colorIdx[r.ahliId] % BC.length] + '" title="' + esc(r.nama) + ' ' + pct(r.persen) + '"></i>').join('') + '</div>' +
          '<ul class="legend row">' + res.rows.filter(r => r.persen > 0).map(r => '<li><i style="background:' + BC[colorIdx[r.ahliId] % BC.length] + '"></i><span>' + esc(r.nama) + '</span><b>' + pct(r.persen) + '</b></li>').join('') + '</ul></div>'
          : emptyState('calculator', res.ok ? 'Belum ada ahli waris yang berhak' : 'Perbaiki data ahli waris', res.ok ? 'Tambahkan ahli waris yang masih hidup untuk menghitung bagian.' : 'Ada kesalahan data pada daftar ahli waris di atas.')) + '</div>' +

      (res.ok && !res.kosong ? jadwalHisab(res, R) : '') +
      (res.ok && !res.kosong ? '<div class="card-f note-hisab"><h2 class="h-sec sm"><i class="bi bi-journal-text"></i> Catatan Hisab Syar\'i (I\'tibar Faroidh):</h2>' + hisabNote(res, R) + '</div>' : '') +
    '</div>' +

    '<aside class="hitung-side">' + baPreview(k, R, res) + '</aside></div>';
}

function hisabNote(res, R) {
  const L = [];
  L.push('Asal masalah ditetapkan <b>' + res.asal + '</b> dari KPK penyebut para <i>ashhabul furudh</i>.');
  if (res.aul) L.push('Jumlah bagian melebihi asal masalah sehingga terjadi <b>\'aul</b>: asal masalah dinaikkan menjadi <b>' + res.asalAkhir + '</b> dan setiap ahli waris menanggung pengurangan secara proporsional.');
  if (res.radd) L.push('Jumlah bagian kurang dari asal masalah dan tidak ada ashabah, sehingga sisa dikembalikan (<b>radd</b>) secara proporsional' + (res.raddPasangan ? ' kepada pasangan.' : ' kepada ahli waris selain pasangan.'));
  if (res.baitulMal.n && !res.radd) L.push('Jumlah bagian kurang dari asal masalah dan tidak ada ashabah, sehingga terjadi <b>radd</b> sebesar <b>' + F.str(res.baitulMal) + '</b> (' + rp(F.val(res.baitulMal) * R.bersih) + '). Radd <b>tidak dibagikan kepada ahli waris</b> melainkan <b>diserahkan ke Baitul Mal</b>.');
  if (!res.aul && !res.radd && !res.baitulMal.n) L.push('Jumlah bagian tepat sama dengan asal masalah (<b>adil</b>, tanpa \'aul maupun radd).');
  L.push('Agar pembagian tidak berpecahan, dilakukan <b>tashih</b> sehingga asal masalah menjadi <b>' + res.tashih + '</b>. Satu siham = ' + rp(R.bersih / res.tashih) + ' (dibulatkan ke rupiah saat tampil).');
  if (res.akd) L.push('<b>Akdariyyah</b>: bagian saudari (1/2) dan kakek (1/6) digabung lalu dibagi secara muqasamah 2 : 1 (kakek 2 bagian, saudari 1 bagian) sesuai pendapat Zaid bin Tsabit r.a.');
  res.warnings.forEach(w => L.push('<span class="warn-t"><i class="bi bi-exclamation-triangle"></i> ' + esc(w) + '</span>'));
  return '<ul class="hisab">' + L.map(x => '<li>' + x + '</li>').join('') + '</ul>';
}

/* ---------- Tabel Hisab Faroidl (jadwal furudh ala kitab) ---------- */
function jadwalData(res) {
  const AM = res.asal, blok = res.blok || {}, groups = [], idx = {};
  res.rows.forEach(r => {
    if (r.status === 'wafat') return;
    const key = /^sdr_(lk|pr)_seibu$/.test(r.hubungan) ? 'seibu' : r.hubungan;  // saudara seibu berbagi satu bagian 1/3 / 1/6
    if (!idx[key]) { idx[key] = { t: key, ts: [], label: key === 'seibu' ? 'Saudara/i Seibu' : r.hubunganLabel, rows: [] }; groups.push(idx[key]); }
    if (idx[key].ts.indexOf(r.hubungan) < 0) idx[key].ts.push(r.hubungan);
    idx[key].rows.push(r);
  });
  let sumFard = 0;
  groups.forEach(g => {
    const bs = g.ts.map(t => blok[t]).filter(Boolean), b = bs[0]; g.mahjub = g.rows[0].status === 'mahjub';
    const fardN = bs.reduce((n, x) => n + ((x.fr && x.fr.n > 0) ? x.fr.n * (AM / x.fr.d) : 0), 0);
    g.fard = fardN > 0 ? fardN : null; if (g.fard) sumFard += g.fard;
    g.ashOnly = !!(b && b.ash && !g.fard);
    g.fin = bs.length ? bs.reduce((f, x) => F.add(f, x.fin), F.make(0)) : null;
    g.total = g.rows.reduce((s, r) => s + (r.siham || 0), 0);
    g.bagian = g.mahjub ? 'Mahjub' : (g.ashOnly ? 'Ashabah' : (g.ts.length > 1 && g.fard ? F.str(F.make(g.fard, AM)) : g.rows[0].bagianLabel.replace(/ \((\'aul|\+ radd)\)/g, '')));
  });
  let amR = null;
  if (res.radd) {
    amR = groups.reduce((l, g) => (g.fin && g.fin.n > 0) ? F.lcm(l, g.fin.d) : l, 1);
    groups.forEach(g => { g.raddSaham = (g.fin && g.fin.n > 0) ? g.fin.n * (amR / g.fin.d) : 0; });
  }
  const base = res.aul ? res.asalAkhir : (res.radd ? amR : AM);
  return { groups: groups, AM: AM, sisa: Math.max(0, AM - sumFard), amR: amR, base: base, faktor: (res.tashih % base === 0) ? res.tashih / base : null };
}

/* Tabel khusus Akdariyyah (Zaid bin Tsabit): 'aul → gabung bagian kakek + saudari → muqasamah 2:1 → tashih */
function jadwalAkdariyyah(res, R) {
  const AM = res.asal, base = res.asalAkhir, T = res.tashih, k = T / base, sis = res.akd;
  const row = t => res.rows.find(r => r.hubungan === t);
  const su = row('suami'), ib = row('ibu'), ka = row('kakek'), sd = row(sis);
  const pool0 = 1 + 3;                       // 1/6 kakek (1 saham) + 1/2 saudari (3 saham) dari asal masalah 6
  const arH = t => '<small class="ar" lang="ar">' + t + '</small>';
  const sdLbl = sis === 'sdr_pr_kandung' ? 'Saudari Kandung' : 'Saudari Seayah';
  const nm = (r, lbl) => '<td class="nm">' + esc(r.nama) + '<small>' + lbl + '</small></td>';
  const nom = r => '<td class="r num"><b>' + rp(r.nominal) + '</b></td>';
  const body =
    '<tr class="g-first">' + nm(su, 'Suami (Zauj)') + '<td class="grp"><span class="frac">1/2</span></td><td class="grp c">3</td><td class="grp c">3</td><td class="grp c">' + 3 * k + '</td><td class="c num"><b>' + su.siham + '</b></td>' + nom(su) + '</tr>' +
    '<tr class="g-first">' + nm(ib, 'Ibu') + '<td class="grp"><span class="frac">1/3</span></td><td class="grp c">2</td><td class="grp c">2</td><td class="grp c">' + 2 * k + '</td><td class="c num"><b>' + ib.siham + '</b></td>' + nom(ib) + '</tr>' +
    '<tr class="g-first">' + nm(ka, 'Kakek (ayah dari ayah)') + '<td class="grp"><span class="frac">1/6</span></td><td class="grp c">1</td>' +
      '<td rowspan="2" class="grp c"><b>' + pool0 + '</b><br><small>1 + 3 digabung</small></td><td rowspan="2" class="grp c"><b>' + pool0 * k + '</b><br><small>' + pool0 + ' × ' + k + '</small></td>' +
      '<td class="c num"><b>' + ka.siham + '</b><small class="muted"> (2 bagian)</small></td>' + nom(ka) + '</tr>' +
    '<tr>' + nm(sd, sdLbl) + '<td class="grp"><span class="frac">1/2</span></td><td class="grp c">3</td><td class="c num"><b>' + sd.siham + '</b><small class="muted"> (1 bagian)</small></td>' + nom(sd) + '</tr>';
  const foot = '<tr><td colspan="5"><b>Jumlah</b></td><td class="c"><b>' + res.rows.reduce((s, r) => s + (r.siham || 0), 0) + ' / ' + T + '</b></td><td class="r"><b>' + rp(res.rows.reduce((s, r) => s + (r.nominal || 0), 0)) + '</b></td></tr>';
  return '<div class="card-f"><div class="sec-h"><div><h2 class="h-sec"><span class="sec-n">3</span> Tabel Hisab &amp; Tashih Akdariyyah <span class="ar" lang="ar">الأكدرية</span></h2><p class="muted sm">Cara Zaid bin Tsabit r.a.: saudari diberi 1/2, kakek 1/6, lalu keduanya digabung dan dibagi muqasamah 2 : 1.</p></div><button class="btn-f btn-ghost-f btn-sm" data-act="exportJadwal"><i class="bi bi-file-earmark-excel"></i> Excel</button></div>' +
    '<div class="chips jd-chips"><span class="chip"><b>Asal masalah</b> ' + AM + '</span><span class="chip"><b>\'Aul</b> ' + AM + ' → ' + base + '</span>' +
    '<span class="chip"><b>Digabung</b> kakek 1 + saudari 3 = ' + pool0 + '</span><span class="chip"><b>Muqasamah</b> kakek : saudari = 2 : 1</span>' +
    '<span class="chip"><b>Tashih</b> ' + base + ' × ' + k + ' = ' + T + '</span></div>' +
    '<div class="tbl-wrap"><table class="jadwal"><thead><tr><th>Ahli Waris' + arH('الوارث') + '</th><th>Bagian' + arH('الفرض') + '</th><th class="c">Asal Masalah ' + AM + arH('أصل المسألة') + '</th>' +
    '<th class="c">Setelah \'Aul ' + base + arH('العول') + '</th><th class="c">Tashih × ' + k + ' = ' + T + arH('التصحيح') + '</th><th class="c">Muqasamah 2 : 1' + arH('المقاسمة') + '</th><th class="r">Nominal (Rp)</th></tr></thead>' +
    '<tbody>' + body + '</tbody><tfoot>' + foot + '</tfoot></table></div>' +
    '<p class="muted sm" style="margin-top:.5rem">Bagian gabungan ' + pool0 * k + ' siham dibagi 3 bagian: kakek 2 bagian = ' + ka.siham + ', saudari 1 bagian = ' + sd.siham + '. Nominal = (siham ÷ ' + T + ') × ' + rp(R.bersih) + '.</p></div>';
}
function jadwalHisab(res, R) {
  if (res.akd) return jadwalAkdariyyah(res, R);
  const J = jadwalData(res), T = res.tashih, g = J.groups;
  const arH = t => '<small class="ar" lang="ar">' + t + '</small>';
  let head = '<th>Ahli Waris' + arH('الوارث') + '</th><th>Bagian' + arH('الفرض') + '</th><th class="c">Asal Masalah ' + J.AM + arH('أصل المسألة') + '</th>';
  if (res.radd) head += '<th class="c">Setelah Radd ' + J.amR + arH('الرد') + '</th>';
  head += '<th class="c">Siham Kelompok' + arH('سهام') + '</th><th class="c">Siham / Orang' + arH('لكل واحد') + '</th><th class="r">Nominal (Rp)</th>';
  const ring = [];
  ring.push('<span class="chip"><b>Asal masalah</b> ' + J.AM + '</span>');
  if (res.aul) ring.push('<span class="chip"><b>\'Aul</b> ' + J.AM + ' → ' + res.asalAkhir + '</span>');
  if (res.radd) ring.push('<span class="chip"><b>Radd</b> ' + J.AM + ' → ' + J.amR + (res.raddPasangan ? ' (kepada pasangan)' : ' (pasangan tidak ikut radd)') + '</span>');
  if (res.baitulMal.n && !res.radd) ring.push('<span class="chip"><b>Radd</b> ' + F.str(res.baitulMal) + ' → Baitul Mal</span>');
  ring.push('<span class="chip"><b>Tashih</b> ' + (J.faktor && J.faktor > 1 ? J.base + ' × ' + J.faktor + ' = ' + T : (J.faktor === 1 ? 'tidak diperlukan (' + T + ')' : 'KPK = ' + T)) + '</span>');
  let body = '', ashRunLeft = 0;
  g.forEach((x, gi) => {
    x.rows.forEach((r, ri) => {
      body += '<tr class="' + (x.mahjub ? 'dim' : '') + (ri === 0 ? ' g-first' : '') + '"><td class="nm">' + esc(r.nama) + '<small>' + esc(r.hubunganLabel) + '</small></td>';
      if (ri === 0) {
        const n = x.rows.length;
        body += '<td rowspan="' + n + '" class="grp"><span class="frac">' + esc(x.bagian) + '</span></td>';
        if (x.ashOnly) {
          if (!ashRunLeft) { let span = 0, j = gi; while (j < g.length && g[j].ashOnly) { span += g[j].rows.length; j++; } ashRunLeft = j - gi; body += '<td rowspan="' + span + '" class="grp c"><b>Sisa</b><br>' + J.sisa + '</td>'; }
          ashRunLeft--;
        } else body += '<td rowspan="' + n + '" class="grp c">' + (x.mahjub ? '—' : (x.fard !== null ? x.fard : '—')) + '</td>';
        if (res.radd) body += '<td rowspan="' + n + '" class="grp c">' + (x.mahjub ? '—' : x.raddSaham) + '</td>';
        body += '<td rowspan="' + n + '" class="grp c"><b>' + (x.mahjub ? '—' : x.total) + '</b></td>';
      }
      body += '<td class="c num">' + (x.mahjub ? '—' : r.siham) + '</td><td class="r num"><b>' + (x.mahjub ? '—' : rp(r.nominal)) + '</b></td></tr>';
    });
  });
  const bmRow = res.baitulMal.n ? '<tr class="g-first"><td class="nm">Baitul Mal<small>Radd (sisa) diserahkan</small></td><td class="grp"><span class="frac">' + F.str(res.baitulMal) + '</span></td><td class="grp c">' + (J.AM * res.baitulMal.n / res.baitulMal.d) + '</td>' + (res.radd ? '<td class="grp c">—</td>' : '') + '<td class="grp c"><b>' + (T * res.baitulMal.n / res.baitulMal.d) + '</b></td><td class="c num">—</td><td class="r num"><b>' + rp(Math.round(F.val(res.baitulMal) * R.bersih * 100) / 100) + '</b></td></tr>' : '';
  const cs = res.radd ? 4 : 3;
  const foot = '<tr><td colspan="' + cs + '"><b>Jumlah</b></td><td class="c"><b>' + (g.reduce((s, x) => s + (x.mahjub ? 0 : x.total), 0) + (res.baitulMal.n ? T * res.baitulMal.n / res.baitulMal.d : 0)) + ' / ' + T + '</b></td><td class="c"></td><td class="r"><b>' + rp(g.reduce((s, x) => s + x.rows.reduce((a, r) => a + (r.nominal || 0), 0), 0) + (res.baitulMal.n ? F.val(res.baitulMal) * R.bersih : 0)) + '</b></td></tr>';
  return '<div class="card-f"><div class="sec-h"><div><h2 class="h-sec"><span class="sec-n">3</span> Tabel Hisab Faroidl <span class="ar" lang="ar">جدول المسألة</span></h2><p class="muted sm">Tabel asal masalah, \'aul/radd, dan tashih seperti dalam kitab faraid.</p></div><button class="btn-f btn-ghost-f btn-sm" data-act="exportJadwal"><i class="bi bi-file-earmark-excel"></i> Excel</button></div>' +
    '<div class="chips jd-chips">' + ring.join('') + '</div>' +
    '<div class="tbl-wrap"><table class="jadwal"><thead><tr>' + head + '</tr></thead><tbody>' + body + bmRow + '</tbody><tfoot>' + foot + '</tfoot></table></div>' +
    '<p class="muted sm" style="margin-top:.5rem">Nominal = (siham per orang ÷ ' + T + ') × ' + rp(R.bersih) + '. Sel yang digabung menunjukkan satu kelompok yang bagiannya dibagi rata.</p></div>';
}
function exportJadwal() {
  const k = curKasus(); if (!k || !xlsxReady()) return;
  const res = calcOf(k.ID_Kasus); if (!res.ok) return;
  if (res.akd) { const wb2 = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb2, XLSX.utils.json_to_sheet(res.rows.map(r => ({ 'Ahli Waris': r.nama, Hubungan: r.hubunganLabel, Bagian: r.bagianLabel, ['Siham (dari ' + res.tashih + ')']: r.siham, 'Nominal (Rp)': r.nominal }))), 'Akdariyyah'); saveXlsx(wb2, 'TabelAkdariyyah_' + k.ID_Kasus + '.xlsx'); return; }
  const J = jadwalData(res), rows = [];
  J.groups.forEach(x => x.rows.forEach(r => rows.push({ 'Ahli Waris': r.nama, Hubungan: r.hubunganLabel, Bagian: x.bagian, ['Asal Masalah ' + J.AM]: x.ashOnly ? 'Sisa ' + J.sisa : (x.fard === null ? '' : x.fard), 'Setelah Radd': res.radd ? x.raddSaham : '', 'Siham Kelompok': x.mahjub ? 0 : x.total, 'Siham/Orang': x.mahjub ? 0 : r.siham, Tashih: res.tashih, 'Nominal (Rp)': r.nominal })));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Tabel Hisab');
  saveXlsx(wb, 'TabelHisab_' + k.ID_Kasus + '.xlsx');
}

const BA_CATATAN_DEFAULT = 'Hasil perhitungan merupakan alat bantu dan perlu disahkan melalui musyawarah ahli waris serta lembaga yang berwenang (KUA / Pengadilan Agama).';
function baPreview(k, R, res) {
  const p = S.D.pengaturan || {};
  const lembaga = (S.D.pengaturan && S.D.pengaturan.nama_lembaga) || 'Majelis Hikmah & Musyawarah Faraidh';
  const rows = res.ok ? res.rows : [];
  return '<div class="ba"><div class="ba-in"><p class="ar ba-b" lang="ar" dir="rtl">بسم الله الرحمن الرحيم</p><div class="ba-lem">' + esc(lembaga.toUpperCase()) + '</div>' +
    '<div class="ba-t">BERITA ACARA &amp; KETETAPAN MUSYAWARAH WARIS</div><div class="ba-no mono">Nomor: BA/' + esc(k.ID_Kasus) + '</div>' +
    '<table class="ba-tb"><tr><td>' + esc(almLabel(k)) + '</td><td>' + esc(namaLengkap(k)) + '</td></tr>' + (k.Tgl_Lahir ? '<tr><td>Lahir</td><td>' + esc(tglID(k.Tgl_Lahir)) + (usiaTahun(k.Tgl_Lahir, k.Tgl_Wafat) !== '' ? ' (usia ' + usiaTahun(k.Tgl_Lahir, k.Tgl_Wafat) + ' th)' : '') + '</td></tr>' : '') + '<tr><td>Wafat</td><td>' + esc(tglID(k.Tgl_Wafat)) + '</td></tr><tr><td>Kelompok</td><td>' + esc(k.Desa || '—') + '</td></tr><tr><td>Desa</td><td>' + esc(k.Daerah || '—') + '</td></tr><tr><td>Tirkah bersih</td><td><b>' + rp(R.bersih) + '</b></td></tr></table>' +
    '<div class="ba-h">Rincian pembagian</div><table class="ba-tb">' + (rows.length ? rows.map(r => '<tr class="' + (r.persen ? '' : 'dim') + '"><td>' + esc(r.nama) + '<small>' + esc(r.hubunganLabel) + '</small></td><td class="r">' + (r.persen ? pct(r.persen) + '<small>' + rp(r.nominal) + '</small>' : '—') + '</td></tr>').join('') : '<tr><td colspan="2" class="muted">Belum ada hasil perhitungan.</td></tr>') + '</table>' +
    '<p class="ba-f">' + esc((S.D.pengaturan && S.D.pengaturan.ba_catatan) || BA_CATATAN_DEFAULT) + '</p>' +
    '<div class="ba-ttd"><div>' + esc(((p.ba_ttd_tempat || k.Daerah || '') ? (p.ba_ttd_tempat || k.Daerah) + ', ' : '') + tglID(new Date().toISOString().slice(0, 10))) + '</div><div>' + esc(p.ba_ttd_jabatan || 'Tim Faroidl') + '</div><div class="ba-sign"></div><b>' + (p.ba_ttd_nama ? esc(p.ba_ttd_nama) : '( ……………………… )') + '</b></div></div>' +
    '<button class="btn-f btn-primary-f w-100" data-act="downloadBA"><i class="bi bi-printer"></i> Cetak Akta Berita Acara Resmi (PDF)</button></div>';
}

/* ---------- Form ahli waris ---------- */
function hubunganOptions(k, selected) {
  const grup = {};
  HUBUNGAN_KODE.forEach(c => {
    if ((c === 'istri' && k.Jenis_Kelamin_Pewaris === 'Perempuan') || (c === 'suami' && k.Jenis_Kelamin_Pewaris !== 'Perempuan')) return;
    (grup[HUB[c][2]] = grup[HUB[c][2]] || []).push(c);
  });
  return Object.keys(grup).map(g => '<optgroup label="' + esc(g) + '">' + grup[g].map(c => '<option value="' + c + '"' + (selected === c ? ' selected' : '') + '>' + esc(HUB[c][0]) + '</option>').join('') + '</optgroup>').join('');
}
function ahliForm(k, a) {
  return '<form id="ahliForm" novalidate><label class="lbl">Nama ahli waris<input class="inp" name="Nama" maxlength="120" required value="' + esc(a ? a.Nama : '') + '" placeholder="Nama lengkap"></label>' +
    '<label class="lbl">Hubungan dengan pewaris<select class="sel w100" name="Hubungan">' + hubunganOptions(k, a ? a.Hubungan : 'anak_lk') + '</select></label>' +
    '<label class="lbl">Status<select class="sel w100" name="Status_Hidup"><option value="Hidup"' + (!a || a.Status_Hidup !== 'Wafat' ? ' selected' : '') + '>Hidup saat pewaris wafat</option><option value="Wafat"' + (a && a.Status_Hidup === 'Wafat' ? ' selected' : '') + '>Wafat lebih dahulu (tidak mewarisi)</option></select></label>' +
    '<p class="muted sm">Untuk beberapa anak, saudara, atau istri, tambahkan satu per satu. Penghalang (hajb) diterapkan otomatis.</p><div class="form-err" id="afErr" role="alert" hidden></div></form>';
}
function submitAhli(editId) {
  const k = curKasus(), f = $('#ahliForm'), err = $('#afErr'); if (!k || !f) return;
  const fd = new FormData(f), nama = String(fd.get('Nama') || '').trim(), hub = fd.get('Hubungan');
  if (!nama) { err.hidden = false; err.textContent = 'Nama ahli waris wajib diisi.'; return; }
  const a0 = { Nama: nama, Hubungan: hub, Jenis_Kelamin: HUB[hub][1], Status_Hidup: fd.get('Status_Hidup') };
  if (editId) Object.assign(S.D.ahli.find(a => a.ID === editId), a0);
  else S.D.ahli.push(Object.assign({ ID: uid(), ID_Kasus: k.ID_Kasus, Status_Terhalang: 'Tidak' }, a0));
  closeModal(); commit(k.ID_Kasus, { now: true }); renderHitung();
  if (isInputOnly()) { toast('Ahli waris disimpan.', 'ok'); return; }
  const res = calcOf(k.ID_Kasus); if (res.ok && res.errors.length === 0) toast('Ahli waris disimpan. Hasil dihitung ulang.', 'ok'); else if (!res.ok) toast(res.errors[0], 'warn');
}

/* ---------- Export Excel ---------- */
function xlsxReady() { if (!window.XLSX) { toast('Pustaka Excel belum termuat. Periksa koneksi lalu coba lagi.', 'warn'); return false; } return true; }
function saveXlsx(wb, name) { try { XLSX.writeFile(wb, name); toast('Berkas Excel diunduh.', 'ok'); } catch (e) { toast('Gagal mengunduh Excel: ' + e.message, 'err'); } }
function exportHasil() {
  const k = curKasus(); if (!k || !xlsxReady()) return;
  const res = calcOf(k.ID_Kasus), R = rekapOf(k.ID_Kasus);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
    { Keterangan: almLabel(k), Nilai: namaLengkap(k) }, { Keterangan: 'Tanggal lahir', Nilai: k.Tgl_Lahir || '' }, { Keterangan: 'Kelompok', Nilai: k.Desa || '' }, { Keterangan: 'Desa', Nilai: k.Daerah || '' }, { Keterangan: 'Tanggal wafat', Nilai: k.Tgl_Wafat }, { Keterangan: 'Total harta', Nilai: R.total },
    { Keterangan: 'Gono-gini', Nilai: R.gonogini }, { Keterangan: 'Bagian pasangan', Nilai: R.bagianPasangan }, { Keterangan: 'Harta bawaan', Nilai: R.bawaan },
    { Keterangan: 'Harta peninggalan', Nilai: R.peninggalan }, { Keterangan: 'Potongan', Nilai: R.potongan }, { Keterangan: 'Harta waris bersih', Nilai: R.bersih }]), 'Rekap');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(res.ok ? res.rows.map(r => ({ Nama: r.nama, Hubungan: r.hubunganLabel, Bagian: r.bagianLabel, Siham: r.siham, Tashih: res.tashih, 'Persentase (%)': r.persen, 'Nominal (Rp)': r.nominal, Keterangan: r.alasan || r.dalil })) : []), 'Pembagian');
  saveXlsx(wb, 'Faroidl_' + k.ID_Kasus + '.xlsx');
}
function exportRekap() {
  const k = curKasus(); if (!k || !xlsxReady()) return;
  const wb = XLSX.utils.book_new(), R = rekapOf(k.ID_Kasus);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hartaOf(k.ID_Kasus).map(h => ({ Harta: h.Nama_Harta, Jenis: h.Jenis, Kategori: h.Kategori, 'Nilai (Rp)': Number(h.Nilai) || 0, Keterangan: h.Keterangan }))), 'Catatan Harta');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ 'Total harta': R.total, Gonogini: R.gonogini, 'Bagian pasangan': R.bagianPasangan, Bawaan: R.bawaan, Peninggalan: R.peninggalan, 'Biaya jenazah': Number(k.Biaya_Jenazah) || 0, 'Catatan biaya jenazah': k.Catatan_Biaya || '', Utang: Number(k.Utang) || 0, 'Catatan utang': k.Catatan_Utang || '', 'Wasiat berlaku': R.wasiatEfektif, 'Catatan wasiat': k.Catatan_Wasiat || '', 'Hibah semasa hidup (dicatat)': Number(k.Hibah) || 0, 'Catatan hibah': k.Catatan_Hibah || '', 'Harta waris bersih': R.bersih }]), 'Rekap');
  saveXlsx(wb, 'Rekap_Harta_' + k.ID_Kasus + '.xlsx');
}
function exportKasus() {
  if (!xlsxReady()) return;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filteredKasus().map(k => ({ 'ID Kasus': k.ID_Kasus, 'Almarhum/ah': namaLengkap(k), 'Tgl Lahir': k.Tgl_Lahir || '', 'Tgl Wafat': k.Tgl_Wafat, Kelompok: k.Desa || '', Desa: k.Daerah || '', Pengurus: kelNama(k.ID_Kelompok), Status: k.Status, 'Tirkah Bersih (Rp)': kasusNilai(k.ID_Kasus), 'Jumlah Ahli Waris': ahliOf(k.ID_Kasus).length }))), 'Kasus Waris');
  saveXlsx(wb, 'Faroidl_Daftar_Kasus.xlsx');
}

/* ---------- PDF Berita Acara ---------- */
function b64ToBlob(b64, mime) { const bin = atob(b64), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: mime }); }
/* Ambil model Tabel Hisab yang sedang tampil, untuk dicetak di Berita Acara (teks saja). */
function jadwalModel() {
  const tb = $('#page-hitung table.jadwal'); if (!tb) return null;
  const txt = el => { const c = el.cloneNode(true); c.querySelectorAll('br').forEach(b => b.replaceWith(' ')); c.querySelectorAll('small').forEach(s => s.prepend(' ')); return c.textContent.replace(/\s+/g, ' ').trim(); };
  const cells = tr => Array.from(tr.children).map(c => ({ t: txt(c), cs: c.colSpan || 1, rs: c.rowSpan || 1, a: c.classList.contains('c') ? 'c' : (c.classList.contains('r') ? 'r' : ''), g: c.classList.contains('grp'), b: !!c.querySelector('b, th') }));
  const card = tb.closest('.card-f');
  return {
    judul: (card.querySelector('h2') || {}).textContent ? card.querySelector('h2').textContent.replace(/^\s*\d+\s*/, '').trim() : 'Tabel Hisab Faroidl',
    chips: Array.from(card.querySelectorAll('.jd-chips .chip')).map(c => c.textContent.replace(/\s+/g, ' ').trim()),
    head: Array.from(tb.tHead.rows).map(cells), body: Array.from(tb.tBodies[0].rows).map(cells), foot: tb.tFoot ? Array.from(tb.tFoot.rows).map(cells) : [],
    catatan: (Array.from(card.querySelectorAll('p.muted')).pop() || {}).textContent || ''
  };
}

async function downloadBA(btn) {
  const k = curKasus(); if (!k) return;
  const res = calcOf(k.ID_Kasus);
  if (!res.ok || res.kosong || !hasilOf(k.ID_Kasus).length) { toast('Lengkapi harta dan ahli waris terlebih dahulu agar hasil dapat dihitung.', 'warn'); return; }
  busy(btn, true, 'Membuat PDF…');
  try {
    await flushAll();
    const r = await api('buatBeritaAcara', S.token, k.ID_Kasus, jadwalModel());
    k.Status = 'Selesai & PDF'; S.ver++; S.rendered = {}; saveCache();
    const blob = b64ToBlob(r.base64, 'application/pdf'), url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = r.name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    openModal('Berita Acara Diterbitkan', '<p>Berkas <b>' + esc(r.name) + '</b> tersimpan di Google Drive dan diunduh ke perangkat Anda.</p><p class="mono sm muted">Kode verifikasi: ' + esc(r.hash.slice(0, 24)) + '</p><iframe class="pdf-frame" title="Pratinjau PDF" src="https://drive.google.com/file/d/' + esc(r.fileId) + '/preview"></iframe>',
      { size: 'xl', buttons: [{ label: 'Tutup', cls: 'btn-ghost-f', close: true }], noFocus: true });
    renderHitung();
  } catch (e) { if (e.sesi) sessionExpired(); else toast('Gagal membuat PDF: ' + e.message, 'err'); }
  finally { busy(btn, false); }
}
async function emailBA(btn) {
  const k = curKasus(); if (!k) return;
  if (!hasilOf(k.ID_Kasus).length) { toast('Hitung pembagian waris terlebih dahulu.', 'warn'); return; }
  busy(btn, true, 'Mengirim…');
  try { await flushAll(); const r = await api('kirimSalinan', S.token, k.ID_Kasus, jadwalModel()); toast('Salinan dikirim ke ' + r.to, 'ok'); }
  catch (e) { if (e.sesi) sessionExpired(); else toast('Gagal mengirim: ' + e.message, 'err'); }
  finally { busy(btn, false); }
}
