'use strict';
/* =====================================================================
 *  OPERASI KASUS (lokal & optimistik) + DASHBOARD
 * ===================================================================== */
const memoRekap = { v: 0, m: {} };
function rekapOf(id) {
  if (memoRekap.v !== S.ver) { memoRekap.v = S.ver; memoRekap.m = {}; }
  if (!memoRekap.m[id]) { const k = getKasus(id); memoRekap.m[id] = k ? hitungRekap(k, hartaOf(id)) : hitungRekap({}, []); }
  return memoRekap.m[id];
}
const memoCalc = { v: 0, m: {} };
function calcOf(id) {
  if (memoCalc.v !== S.ver) { memoCalc.v = S.ver; memoCalc.m = {}; }
  if (!memoCalc.m[id]) memoCalc.m[id] = hitungWaris(ahliOf(id), rekapOf(id).bersih, S.D.referensi, { radd: !!(S.D.pengaturan && S.D.pengaturan.sisa_harta === 'radd') });
  return memoCalc.m[id];
}
const kasusNilai = id => { const h = hasilOf(id); return h.length ? h.reduce((s, x) => s + (Number(x.Nominal) || 0), 0) : rekapOf(id).bersih; };

/** Tim Faroidl Kelompok: simpan data saja. Hasil hitung & status tidak diubah (server juga menolak). */
function commitInput(k, id, opt) {
  S.ver++; S.rendered = {};
  if (k.Status === 'Draft Berkas' && hartaOf(id).length) k.Status = 'Rekap Harta';
  clearTimeout(S.saveTimers[id]);
  if (opt.now) enqueue({ t: 'save', id: id });
  else S.saveTimers[id] = setTimeout(() => enqueue({ t: 'save', id: id }), 700);
  saveCache();
}

/** Hitung ulang hasil tersimpan sebuah kasus, turunkan status, jadwalkan simpan batch. */
function commit(id, opt) {
  opt = opt || {};
  const k = getKasus(id); if (!k) return;
  S.ver++;
  const ah = ahliOf(id);
  if (isInputOnly()) { commitInput(k, id, opt); return; }
  const res = calcOf(id);
  S.D.hasil = S.D.hasil.filter(h => h.ID_Kasus !== id);
  let valid = false;
  if (res.ok && !res.kosong && ah.length) {
    const sum = res.rows.reduce((s, r) => s + r.persen, 0);
    if (Math.abs(sum - 100) <= 0.1) {
      valid = true;
      res.rows.forEach(r => {
        const a = ah.find(x => x.ID === r.ahliId); if (a) a.Status_Terhalang = r.status === 'mahjub' ? 'Ya' : 'Tidak';
        S.D.hasil.push({ ID: uid(), ID_Kasus: id, ID_Ahli_Waris: r.ahliId, Bagian_Pecahan: r.bagianLabel, Persentase: r.persen, Nominal: r.nominal,
          Keterangan_Dalil: String(r.alasan || r.dalil || '').slice(0, 300), Salinan_Aturan: String(r.aturan || '').slice(0, 300) });
      });
    }
  }
  const old = k.Status;
  if (valid) k.Status = (old === 'Selesai & PDF' && opt.keepStatus) ? old : 'Terhitung';
  else k.Status = hartaOf(id).length ? 'Rekap Harta' : 'Draft Berkas';
  if (old === 'Selesai & PDF' && k.Status !== old) toast('Data berubah: Berita Acara PDF perlu diterbitkan ulang.', 'warn');
  S.rendered = {};
  clearTimeout(S.saveTimers[id]);
  if (opt.now) enqueue({ t: 'save', id: id });
  else S.saveTimers[id] = setTimeout(() => enqueue({ t: 'save', id: id }), 700);
  saveCache();
}

/* ---------- Komponen kecil ---------- */
const STATUS_CLS = { 'Draft Berkas': 'st-draft', 'Rekap Harta': 'st-rekap', 'Terhitung': 'st-hitung', 'Selesai & PDF': 'st-selesai' };
const STATUS_IC = { 'Draft Berkas': 'pencil-square', 'Rekap Harta': 'journal-text', 'Terhitung': 'hourglass-split', 'Selesai & PDF': 'check-circle' };
const statusBadge = s => '<span class="badge-f ' + (STATUS_CLS[s] || 'st-draft') + '"><i class="bi bi-' + (STATUS_IC[s] || 'dot') + '"></i> ' + esc(s) + '</span>';
const emptyState = (ic, t, d, btn) => '<div class="empty"><i class="bi bi-' + ic + '"></i><h3>' + esc(t) + '</h3><p>' + esc(d) + '</p>' + (btn || '') + '</div>';
const charts = {};
function makeChart(id, cfg) {
  const cv = document.getElementById(id); if (!cv || !window.Chart) return;
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
  charts[id] = new Chart(cv.getContext('2d'), cfg);
}
const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const CHART_COLORS = () => [cssVar('--primary-container'), cssVar('--secondary-gold'), cssVar('--sage'), cssVar('--mint-bright'), '#7a8a80', '#b9a25a'];

/* ---------- Dashboard ---------- */
function filteredKasus() {
  const u = S.ui, q = u.q.toLowerCase();
  return S.D.kasus.filter(k => (!u.fStatus || k.Status === u.fStatus) && (!u.fKel || k.ID_Kelompok === u.fKel) &&
    (!q || (namaLengkap(k) + ' ' + k.ID_Kasus).toLowerCase().includes(q)) &&
    (!u.fDari || k.Tgl_Wafat >= u.fDari) && (!u.fSampai || k.Tgl_Wafat <= u.fSampai))
    .sort((a, b) => String(b.Tgl_Input).localeCompare(String(a.Tgl_Input)) || b.ID_Kasus.localeCompare(a.ID_Kasus));
}

function kpiData() {
  const ks = S.D.kasus, ym = new Date().toISOString().slice(0, 7);
  const dist = ks.filter(k => k.Status === 'Terhitung' || k.Status === 'Selesai & PDF').reduce((s, k) => s + kasusNilai(k.ID_Kasus), 0);
  const nDist = ks.filter(k => k.Status === 'Terhitung' || k.Status === 'Selesai & PDF').length;
  return { total: ks.length, bulanIni: ks.filter(k => String(k.Tgl_Input).slice(0, 7) === ym).length, dist: dist,
    rata: nDist ? dist / nDist : 0, proses: ks.filter(k => k.Status !== 'Selesai & PDF').length,
    tanpaAhli: ks.filter(k => k.Status !== 'Selesai & PDF' && !ahliOf(k.ID_Kasus).length).length,
    ba: ks.filter(k => k.Status === 'Selesai & PDF').length };
}

function renderDashboard() {
  const u = S.user, K = kpiData(), sup = isSuper();
  const selStatus = '<option value="">Semua Status</option>' + STATUS.map(s => '<option' + (S.ui.fStatus === s ? ' selected' : '') + '>' + s + '</option>').join('');
  const selKel = '<option value="">Semua Kelompok</option>' + S.D.kelompok.map(g => '<option value="' + esc(g.ID_Kelompok) + '"' + (S.ui.fKel === g.ID_Kelompok ? ' selected' : '') + '>' + esc(g.Nama_Kelompok) + '</option>').join('');
  $('#page-dashboard').innerHTML =
    '<div class="card-f hero">' +
      '<div class="hero-txt"><h1 class="h-display">Assalamu\'alaikum, ' + esc(u.Nama) + ' <span class="pill pill-role">' + esc(u.Peran) + '</span></h1>' +
      '<p class="muted">Sistem perhitungan &amp; manajemen distribusi Faroidl Syar\'iyyah terpadu.</p>' +
      '<div class="chips"><span class="chip"><i class="bi bi-table"></i> Tersambung ke Google Sheets: <b>' + esc(S.dbLabel || 'DB') + '</b> <i class="dot-ok-i"></i></span>' +
      '<span class="chip"><i class="bi bi-folder2-open"></i> ' + S.D.hasil.length + ' baris hasil · ' + S.D.harta.length + ' catatan harta</span></div></div>' +
      '<div class="hero-act"><button class="btn-f btn-ghost-f" data-act="refresh"><i class="bi bi-arrow-repeat"></i> Sinkronisasi Data</button>' +
      '<button class="btn-f btn-gold-f" data-act="newKasus"><i class="bi bi-plus-circle"></i> Buat Kasus Waris Baru</button></div></div>' +

    '<div class="kpi-grid">' +
      '<div class="kpi"><div class="kpi-top"><span class="kpi-l">TOTAL KASUS TERCATAT</span><span class="kpi-ic"><i class="bi bi-bookmarks"></i></span></div><div class="kpi-v">' + K.total + '</div><div class="kpi-f"><i class="bi bi-graph-up-arrow"></i> <b>+' + K.bulanIni + ' kasus</b> masuk bulan ini</div></div>' +
      '<div class="kpi kpi-dark"><div class="kpi-top"><span class="kpi-l">TOTAL HARTA TERDISTRIBUSI</span><span class="kpi-ic"><i class="bi bi-bank"></i></span></div><div class="kpi-v">' + rpM(K.dist) + '</div><div class="kpi-f"><i class="bi bi-calculator"></i> Rata-rata: <b>' + rpM(K.rata) + '</b> / kasus</div></div>' +
      '<div class="kpi"><div class="kpi-top"><span class="kpi-l">KASUS DALAM PROSES</span><span class="kpi-ic ic-gold"><i class="bi bi-hourglass-split"></i></span></div><div class="kpi-v">' + K.proses + '</div><div class="kpi-f"><i class="bi bi-exclamation-circle"></i> ' + (K.tanpaAhli ? K.tanpaAhli + ' kasus belum ada ahli waris' : 'Semua kasus sudah ada ahli waris') + '</div></div>' +
      '<div class="kpi"><div class="kpi-top"><span class="kpi-l">BERITA ACARA DITERBITKAN</span><span class="kpi-ic"><i class="bi bi-patch-check"></i></span></div><div class="kpi-v">' + K.ba + '</div><div class="kpi-f"><i class="bi bi-qr-code"></i> PDF memuat QR verifikasi</div></div>' +
    '</div>' +

    '<div class="dash-grid"><div class="dash-main">' +
      '<div class="card-f filters">' +
        '<div class="f-row"><label class="search"><i class="bi bi-search"></i><input id="fQ" class="inp" type="search" placeholder="Cari nama almarhum/ah atau nomor kasus…" value="' + esc(S.ui.q) + '" aria-label="Cari kasus"></label>' +
        '<button class="btn-f btn-ghost-f" data-act="exportKasus"><i class="bi bi-download"></i> Export Excel</button>' +
        (isAll() ? '<button class="btn-f btn-ghost-f" data-act="backupDb"><i class="bi bi-cloud-arrow-up"></i> Backup Sheets</button>' : '') + '</div>' +
        '<div class="f-row sub"><label class="sel-l">Status:<select id="fStatus" class="sel">' + selStatus + '</select></label>' +
        (isAll() ? '<label class="sel-l">Kelompok:<select id="fKel" class="sel">' + selKel + '</select></label>' : '') +
        '<label class="sel-l">Wafat dari:<input id="fDari" class="sel" type="date" value="' + esc(S.ui.fDari) + '"></label>' +
        '<label class="sel-l">s.d.:<input id="fSampai" class="sel" type="date" value="' + esc(S.ui.fSampai) + '"></label></div>' +
      '</div>' +
      '<div id="kasusTable"></div>' +
    '</div>' +
    '<aside class="dash-side">' +
      '<div class="card-f"><div class="side-h"><h2 class="h-sec"><i class="bi bi-pie-chart"></i> Komposisi Harta</h2><span class="tag-gold">AGREGAT AKTIF</span></div>' +
      '<p class="muted sm">Sebaran klasifikasi aset peninggalan (<i>tirkah</i>) yang tercatat di seluruh kasus.</p>' +
      '<div id="compBox"></div></div>' +
      '<div class="card-f note-card"><div class="note-ic"><i class="bi bi-shield-check"></i></div><div><h3 class="h-sec sm">Pemberitahuan Adab &amp; Fiqih Waris</h3>' +
      '<p class="ar big" lang="ar" dir="rtl">تَعَلَّمُوا الْفَرَائِضَ وَعَلِّمُوهَا فَإِنَّهُ نِصْفُ الْعِلْمِ</p>' +
      '<p class="muted sm">Aplikasi ini adalah <b>sarana bantu hisab faraidh syar\'i</b>. Hasil penetapan pembagian waris mutlak disarankan untuk disepakati melalui musyawarah kekeluargaan serta disahkan secara yuridis oleh KUA atau Pengadilan Agama setempat.</p>' +
      '<p class="ref sm"><i class="bi bi-book"></i> Rujukan: Kompilasi Hukum Islam &amp; Matan Rahabiyyah</p></div></div>' +
      '<div class="card-f audit"><h3 class="lbl-cap">AUDIT TERKINI (GOOGLE DRIVE)</h3><div id="auditList"></div></div>' +
    '</aside></div>';
  renderKasusTable(); renderComposition(); renderAudit();
}

function renderKasusTable() {
  const box = $('#kasusTable'); if (!box) return;
  const list = filteredKasus(), per = 5, pages = Math.max(1, Math.ceil(list.length / per));
  if (S.ui.pg > pages) S.ui.pg = pages;
  const slice = list.slice((S.ui.pg - 1) * per, S.ui.pg * per);
  let h;
  if (!S.D.kasus.length) {
    h = '<div class="card-f">' + emptyState('folder2-open', 'Belum ada kasus waris', 'Mulai dengan membuat kasus waris pertama Anda.', '<button class="btn-f btn-gold-f" data-act="newKasus"><i class="bi bi-plus-circle"></i> Buat Kasus Waris Baru</button>') + '</div>';
  } else if (!list.length) {
    h = '<div class="card-f">' + emptyState('search', 'Tidak ada kasus yang cocok', 'Ubah kata kunci atau filter pencarian.') + '</div>';
  } else {
    h = '<div class="card-f table-card"><div class="tbl-wrap"><table class="tbl resp"><thead><tr><th>ID Kasus</th><th>Nama Almarhum/ah &amp; Tgl Wafat</th><th>Pengurus</th><th class="r">Nilai Tirkah Bersih</th><th>Status Alur</th><th class="r">Aksi</th></tr></thead><tbody>' +
      slice.map(k => {
        const na = ahliOf(k.ID_Kasus).length, hijriTxt = hijri(k.Tgl_Wafat);
        const done = k.Status === 'Selesai & PDF';
        const goTo = (!isInputOnly() && (k.Status === 'Terhitung' || done)) ? 'openHitung' : 'openKalkulator';
        const lbl = done ? 'Buka' : (k.Status === 'Terhitung' ? 'Lanjutkan' : (k.Status === 'Rekap Harta' ? 'Input Ahli' : 'Lengkapi'));
        return '<tr><td data-label="ID Kasus" class="mono">' + esc(k.ID_Kasus) + '</td>' +
          '<td data-label="Pewaris"><b class="nm">' + esc(namaLengkap(k)) + '</b><div class="muted sm"><i class="bi bi-calendar3"></i> Wafat: ' + esc(tglID(k.Tgl_Wafat)) + (hijriTxt ? ' · ' + esc(hijriTxt) : '') + '</div></td>' +
          '<td data-label="Pengurus"><span class="badge-f pill-grey">' + esc(kelNama(k.ID_Kelompok)) + '</span></td>' +
          '<td data-label="Tirkah Bersih" class="r num"><b>' + rp(kasusNilai(k.ID_Kasus)) + '</b><div class="muted sm">' + na + ' ahli waris</div></td>' +
          '<td data-label="Status">' + statusBadge(k.Status) + '</td>' +
          '<td data-label="Aksi" class="r"><div class="act-row"><button class="btn-f btn-sm btn-primary-f" data-act="' + goTo + '" data-id="' + esc(k.ID_Kasus) + '">' + lbl + '</button>' +
          '<button class="icon-btn sm" data-act="openKalkulator" data-id="' + esc(k.ID_Kasus) + '" aria-label="Edit harta" title="Catatan harta"><i class="bi bi-wallet2"></i></button>' +
          '<button class="icon-btn sm danger" data-act="delKasus" data-id="' + esc(k.ID_Kasus) + '" aria-label="Hapus kasus" title="Hapus"><i class="bi bi-trash3"></i></button></div></td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="pager"><span class="muted sm">Menampilkan ' + slice.length + ' dari ' + list.length + ' berkas · Halaman ' + S.ui.pg + ' dari ' + pages + '</span><div class="pg">' +
      '<button class="icon-btn sm" data-act="pg" data-d="-1" ' + (S.ui.pg <= 1 ? 'disabled' : '') + ' aria-label="Sebelumnya"><i class="bi bi-chevron-left"></i></button>' +
      Array.from({ length: Math.min(pages, 5) }, (_, i) => { const p = Math.min(Math.max(S.ui.pg - 2, 1) + i, pages); return p; }).filter((p, i, a) => a.indexOf(p) === i)
        .map(p => '<button class="pg-n' + (p === S.ui.pg ? ' on' : '') + '" data-act="pg" data-p="' + p + '">' + p + '</button>').join('') +
      '<button class="icon-btn sm" data-act="pg" data-d="1" ' + (S.ui.pg >= pages ? 'disabled' : '') + ' aria-label="Berikutnya"><i class="bi bi-chevron-right"></i></button></div></div></div>';
  }
  box.innerHTML = h;
}

function renderComposition() {
  const box = $('#compBox'); if (!box) return;
  const agg = {};
  S.D.harta.forEach(h => { const j = h.Jenis || 'Lainnya'; agg[j] = (agg[j] || 0) + (Number(h.Nilai) || 0); });
  const ent = Object.keys(agg).map(k => [k, agg[k]]).sort((a, b) => b[1] - a[1]);
  const tot = ent.reduce((s, e) => s + e[1], 0);
  if (!tot) { box.innerHTML = emptyState('pie-chart', 'Belum ada data harta', 'Grafik muncul setelah harta dicatat.'); return; }
  const col = CHART_COLORS();
  box.innerHTML = '<div class="donut"><canvas id="cvComp" aria-label="Komposisi harta" role="img"></canvas><div class="donut-c"><small>TOTAL TIRKAH</small><b>100%</b><span>' + rpM(tot) + '</span></div></div>' +
    '<ul class="legend">' + ent.map((e, i) => '<li><i style="background:' + col[i % col.length] + '"></i><span>' + esc(e[0]) + '</span><b>' + Math.round(e[1] / tot * 100) + '%</b></li>').join('') + '</ul>';
  makeChart('cvComp', { type: 'doughnut', data: { labels: ent.map(e => e[0]), datasets: [{ data: ent.map(e => e[1]), backgroundColor: ent.map((e, i) => col[i % col.length]), borderWidth: 0 }] },
    options: { cutout: '72%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' ' + c.label + ': ' + rp(c.parsed) } } }, animation: { duration: 300 } } });
}

function renderAudit() {
  const box = $('#auditList'); if (!box) return;
  const L = (S.D.log || []).filter(l => ['BA_PDF', 'UNGGAH_BUKTI', 'EMAIL_BA'].indexOf(l.Aksi) >= 0).slice(0, 4);
  const tag = { BA_PDF: 'Tersimpan', UNGGAH_BUKTI: 'Terunggah', EMAIL_BA: 'Terkirim' };
  box.innerHTML = L.length ? L.map(l => '<div class="audit-i"><span class="mono">' + esc(String(l.Detail).split(' · ')[0]) + '</span><em>' + (tag[l.Aksi] || '') + '</em></div>').join('') : '<p class="muted sm mb-0">Belum ada berkas Drive yang dibuat.</p>';
}
