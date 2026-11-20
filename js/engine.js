'use strict';
/* =====================================================================
 *  <ENGINE> MESIN HITUNG FAROIDL — murni (tanpa DOM), dapat diuji di Node
 * ===================================================================== */
const HUB = {
  suami: ['Suami (Zauj)', 'Laki-laki', 'Pasangan'],
  istri: ['Istri (Zaujah)', 'Perempuan', 'Pasangan'],
  anak_lk: ['Anak Laki-laki', 'Laki-laki', 'Keturunan'],
  anak_pr: ['Anak Perempuan', 'Perempuan', 'Keturunan'],
  cucu_lk: ['Cucu Laki-laki (dari anak lk)', 'Laki-laki', 'Keturunan'],
  cucu_pr: ['Cucu Perempuan (dari anak lk)', 'Perempuan', 'Keturunan'],
  ayah: ['Ayah', 'Laki-laki', 'Orang Tua'],
  ibu: ['Ibu', 'Perempuan', 'Orang Tua'],
  kakek: ['Kakek (ayah dari ayah)', 'Laki-laki', 'Orang Tua'],
  nenek_ibu: ['Nenek (ibu dari ibu)', 'Perempuan', 'Orang Tua'],
  nenek_ayah: ['Nenek (ibu dari ayah)', 'Perempuan', 'Orang Tua'],
  sdr_lk_kandung: ['Saudara Laki-laki Kandung', 'Laki-laki', 'Saudara'],
  sdr_pr_kandung: ['Saudari Kandung', 'Perempuan', 'Saudara'],
  sdr_lk_seayah: ['Saudara Laki-laki Seayah', 'Laki-laki', 'Saudara'],
  sdr_pr_seayah: ['Saudari Seayah', 'Perempuan', 'Saudara'],
  sdr_lk_seibu: ['Saudara Laki-laki Seibu', 'Laki-laki', 'Saudara'],
  sdr_pr_seibu: ['Saudari Seibu', 'Perempuan', 'Saudara'],
  keponakan_kandung: ['Keponakan (anak sdr lk kandung)', 'Laki-laki', 'Kerabat'],
  keponakan_seayah: ['Keponakan (anak sdr lk seayah)', 'Laki-laki', 'Kerabat'],
  paman_kandung: ['Paman Kandung (dari ayah)', 'Laki-laki', 'Kerabat'],
  paman_seayah: ['Paman Seayah (dari ayah)', 'Laki-laki', 'Kerabat'],
  sepupu_kandung: ['Sepupu (anak paman kandung)', 'Laki-laki', 'Kerabat'],
  sepupu_seayah: ['Sepupu (anak paman seayah)', 'Laki-laki', 'Kerabat']
};
const HUBUNGAN_KODE = Object.keys(HUB);
const HUB_ATURAN_LABEL = Object.assign({ nenek: 'Nenek (ibu dari ibu / ibu dari ayah)', saudara_seibu: 'Saudara Seibu (lk/pr)' },
  Object.fromEntries(HUBUNGAN_KODE.map(k => [k, HUB[k][0]])));

/* Pecahan eksak (bilangan bulat) */
const F = {
  gcd: (a, b) => (b ? F.gcd(b, a % b) : Math.abs(a)),
  make(n, d = 1) { if (d < 0) { n = -n; d = -d; } const g = F.gcd(n, d) || 1; return { n: n / g, d: d / g }; },
  add: (a, b) => F.make(a.n * b.d + b.n * a.d, a.d * b.d),
  sub: (a, b) => F.make(a.n * b.d - b.n * a.d, a.d * b.d),
  mul: (a, b) => F.make(a.n * b.n, a.d * b.d),
  div: (a, b) => F.make(a.n * b.d, a.d * b.n),
  val: a => a.n / a.d,
  cmp: (a, b) => a.n * b.d - b.n * a.d,
  isZero: a => a.n === 0,
  lcm: (a, b) => (a * b) / F.gcd(a, b),
  parse(s) { const m = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(String(s)); return m ? F.make(+m[1], +m[2]) : null; },
  str: a => (a.d === 1 ? String(a.n) : a.n + '/' + a.d)
};

/* Predikat kondisi yang dapat dipilih Super Admin pada Referensi Bagian Waris.
 *  (n = jumlah ahli waris yang tidak terhalang, c = konteks, t = jenis yang dievaluasi) */
const COND = {
  DEFAULT: { label: 'Tanpa syarat khusus', fn: () => true },
  TANPA_KETURUNAN: { label: 'Pewaris tanpa anak/cucu', fn: (n, c) => !c.adaKet },
  ADA_KETURUNAN: { label: 'Pewaris ada anak/cucu', fn: (n, c) => c.adaKet },
  TUNGGAL_TANPA_LAKI: { label: 'Seorang diri, tanpa anak laki-laki', fn: (n, c, t) => n[t] === 1 && n.anak_lk === 0 },
  JAMAK_TANPA_LAKI: { label: 'Dua orang atau lebih, tanpa anak laki-laki', fn: (n, c, t) => n[t] >= 2 && n.anak_lk === 0 },
  TANPA_ANAK_PR_TUNGGAL: { label: 'Seorang diri, tanpa anak perempuan', fn: n => n.anak_pr === 0 && n.cucu_pr === 1 && n.cucu_lk === 0 },
  TANPA_ANAK_PR_JAMAK: { label: 'Dua atau lebih, tanpa anak perempuan', fn: n => n.anak_pr === 0 && n.cucu_pr >= 2 && n.cucu_lk === 0 },
  ADA_SATU_ANAK_PR: { label: 'Bersama seorang anak perempuan', fn: n => n.anak_pr === 1 && n.cucu_lk === 0 },
  ADA_KETURUNAN_ATAU_SAUDARA: { label: 'Ada anak/cucu atau 2+ saudara', fn: (n, c) => c.adaKet || c.totSdr >= 2 },
  UMARIYATAIN: { label: 'Pasangan + ayah + ibu (tanpa anak/saudara)', fn: (n, c) => c.pasangan && n.ayah > 0 && !c.adaKet && c.totSdr < 2 },
  SAUDARI_TUNGGAL: { label: 'Seorang diri (tanpa saudara laki-laki sederajat)', fn: (n, c, t) => n[t] === 1 },
  SAUDARI_JAMAK: { label: 'Dua orang atau lebih', fn: (n, c, t) => n[t] >= 2 },
  ADA_SATU_SAUDARI_KANDUNG: { label: 'Bersama seorang saudari kandung', fn: n => n.sdr_pr_kandung === 1 },
  SEIBU_TUNGGAL: { label: 'Seorang saudara seibu', fn: n => n.sdr_lk_seibu + n.sdr_pr_seibu === 1 },
  SEIBU_JAMAK: { label: 'Dua atau lebih saudara seibu', fn: n => n.sdr_lk_seibu + n.sdr_pr_seibu >= 2 }
};
/* Kondisi yang bermakna bagi tiap hubungan (untuk formulir tambah aturan) */
const COND_PER_HUB = {
  suami: ['TANPA_KETURUNAN', 'ADA_KETURUNAN'], istri: ['TANPA_KETURUNAN', 'ADA_KETURUNAN'],
  anak_pr: ['TUNGGAL_TANPA_LAKI', 'JAMAK_TANPA_LAKI'],
  cucu_pr: ['TANPA_ANAK_PR_TUNGGAL', 'TANPA_ANAK_PR_JAMAK', 'ADA_SATU_ANAK_PR'],
  ayah: ['ADA_KETURUNAN'], kakek: ['ADA_KETURUNAN'],
  ibu: ['UMARIYATAIN', 'ADA_KETURUNAN_ATAU_SAUDARA', 'DEFAULT'], nenek: ['DEFAULT'],
  sdr_pr_kandung: ['SAUDARI_TUNGGAL', 'SAUDARI_JAMAK'],
  sdr_pr_seayah: ['SAUDARI_TUNGGAL', 'SAUDARI_JAMAK', 'ADA_SATU_SAUDARI_KANDUNG'],
  saudara_seibu: ['SEIBU_TUNGGAL', 'SEIBU_JAMAK']
};
const ASHABAH_RANK = ['anak_lk', 'cucu_lk', 'ayah', 'kakek', 'sdr_lk_kandung', 'sdr_lk_seayah', 'keponakan_kandung', 'keponakan_seayah',
  'paman_kandung', 'paman_seayah', 'sepupu_kandung', 'sepupu_seayah'];

/**
 * Menghitung pembagian waris.
 * @param ahli       [{ID, Nama, Hubungan, Status_Hidup}]
 * @param hartaBersih nilai harta waris bersih (Rp)
 * @param rules      baris Referensi_Bagian_Waris (hanya Jenis 'Furudh' & Aktif yang dipakai untuk pecahan)
 */
/** opts.radd === true: sisa dikembalikan ke ahli waris (radd). Bawaan: sisa diserahkan ke Baitul Mal. */
function hitungWaris(ahli, hartaBersih, rules, opts) {
  const modeRadd = !!(opts && opts.radd);
  const warnings = [];
  const errors = [];
  const aturan = (rules || []).filter(r => r.Status_Aktif !== 'Nonaktif' && r.Jenis === 'Furudh')
    .sort((a, b) => (Number(a.Prioritas) - Number(b.Prioritas)) || String(a.ID_Referensi).localeCompare(String(b.ID_Referensi)));

  const alive = (ahli || []).filter(a => a.Status_Hidup !== 'Wafat' && HUB[a.Hubungan]);
  const n = {};
  HUBUNGAN_KODE.forEach(h => { n[h] = 0; });
  alive.forEach(a => { n[a.Hubungan]++; });

  if (n.suami > 1) errors.push('Suami tidak boleh lebih dari satu.');
  if (n.istri > 4) errors.push('Istri tidak boleh lebih dari empat.');
  if (n.suami && n.istri) errors.push('Suami dan istri tidak dapat sekaligus menjadi ahli waris.');
  ['ayah', 'ibu', 'kakek', 'nenek_ibu', 'nenek_ayah'].forEach(t => { if (n[t] > 1) errors.push(HUB[t][0] + ' tidak boleh lebih dari satu.'); });
  if (errors.length) return { ok: false, errors: errors, warnings: warnings };

  /* ---------- HAJB (penghalang) ---------- */
  const has = t => n[t] > 0;
  const mahjub = {};
  const blk = (t, why) => { if (has(t) && !mahjub[t]) mahjub[t] = why; };
  const live = t => has(t) && !mahjub[t];

  if (has('anak_lk')) { blk('cucu_lk', 'Terhalang anak laki-laki'); blk('cucu_pr', 'Terhalang anak laki-laki'); }
  if (n.anak_pr >= 2 && !has('anak_lk') && !has('cucu_lk')) blk('cucu_pr', 'Terhalang 2 anak perempuan atau lebih (bagian 2/3 sudah penuh)');
  if (has('ayah')) { blk('kakek', 'Terhalang ayah'); blk('nenek_ayah', 'Terhalang ayah'); }
  if (has('ibu')) { blk('nenek_ibu', 'Terhalang ibu'); blk('nenek_ayah', 'Terhalang ibu'); }

  const adaKetLaki = live('anak_lk') || live('cucu_lk');
  const adaKetPr = live('anak_pr') || live('cucu_pr');
  const adaKet = adaKetLaki || adaKetPr;
  const kakekAda = live('kakek');

  ['sdr_lk_seibu', 'sdr_pr_seibu'].forEach(t => {
    if (adaKet) blk(t, 'Terhalang keturunan (anak/cucu)');
    else if (has('ayah')) blk(t, 'Terhalang ayah');
    else if (kakekAda) blk(t, 'Terhalang kakek');
  });
  const sdrKS = ['sdr_lk_kandung', 'sdr_pr_kandung', 'sdr_lk_seayah', 'sdr_pr_seayah'];
  sdrKS.forEach(t => {
    if (adaKetLaki) blk(t, 'Terhalang keturunan laki-laki');
    else if (has('ayah')) blk(t, 'Terhalang ayah');
  });
  if (kakekAda && adaKet) {
    sdrKS.forEach(t => blk(t, 'Terhalang kakek (disederhanakan karena ada keturunan)'));
    if (sdrKS.some(t => has(t))) warnings.push('Kakek bersama saudara dan keturunan: kakek diperlakukan seperti ayah (disederhanakan). Mohon konsultasikan dengan ulama.');
  }
  const fullSisAsh = live('sdr_pr_kandung') && !live('sdr_lk_kandung') && adaKetPr;
  if (live('sdr_lk_kandung')) { blk('sdr_lk_seayah', 'Terhalang saudara laki-laki kandung'); blk('sdr_pr_seayah', 'Terhalang saudara laki-laki kandung'); }
  if (fullSisAsh) {
    blk('sdr_lk_seayah', 'Terhalang saudari kandung (ashabah ma\'a ghair)');
    blk('sdr_pr_seayah', 'Terhalang saudari kandung (ashabah ma\'a ghair)');
  }
  if (live('sdr_pr_kandung') && n.sdr_pr_kandung >= 2 && !live('sdr_lk_kandung') && !fullSisAsh && !live('sdr_lk_seayah')) {
    blk('sdr_pr_seayah', 'Terhalang 2 saudari kandung atau lebih');
  }
  const sisAshP = live('sdr_pr_seayah') && !live('sdr_lk_seayah') && !live('sdr_lk_kandung') && !live('sdr_pr_kandung') && adaKetPr;

  ASHABAH_RANK.forEach((t, i) => {
    if (i < 6 || !has(t)) return;
    let why = null;
    for (let j = 0; j < i; j++) { if (live(ASHABAH_RANK[j])) { why = 'Terhalang ashabah yang lebih dekat (' + HUB[ASHABAH_RANK[j]][0] + ')'; break; } }
    if (!why && (fullSisAsh || sisAshP)) why = 'Terhalang saudari (ashabah ma\'a ghair)';
    if (why) mahjub[t] = why;
  });

  /* ---------- Hitungan efektif ---------- */
  const m = {};
  HUBUNGAN_KODE.forEach(t => { m[t] = mahjub[t] ? 0 : n[t]; });
  const totSdr = n.sdr_lk_kandung + n.sdr_pr_kandung + n.sdr_lk_seayah + n.sdr_pr_seayah + n.sdr_lk_seibu + n.sdr_pr_seibu;
  const ctx = { adaKet: adaKet, adaKetLaki: adaKetLaki, adaKetPr: adaKetPr, totSdr: totSdr, pasangan: m.suami + m.istri > 0 };
  const pilih = (hub, t) => {
    for (const r of aturan) {
      if (r.Hubungan !== hub) continue;
      const c = COND[r.Kondisi];
      if (c && c.fn(m, ctx, t || hub)) return r;
    }
    warnings.push('Tidak ada aturan aktif yang cocok untuk "' + (HUB_ATURAN_LABEL[hub] || hub) + '" pada kondisi ini di Referensi Bagian Waris.');
    return null;
  };

  const fr = {};            // jenis -> pecahan total jenis tsb
  const how = {};           // jenis -> { rule, kind }
  const setFard = (t, f, rule, kind) => { fr[t] = F.add(fr[t] || F.make(0), f); how[t] = { rule: rule, kind: kind || 'furudh' }; };
  const fardRule = (t, hub) => { const r = pilih(hub || t, t); return r ? { r: r, f: F.parse(r.Bagian_Pecahan) } : null; };

  let fSpouse = F.make(0);
  ['suami', 'istri'].forEach(t => {
    if (!m[t]) return;
    const x = fardRule(t);
    if (x && x.f) { setFard(t, x.f, x.r); fSpouse = x.f; }
  });

  if (m.ibu) {
    const x = fardRule('ibu');
    if (x && x.f) {
      let f = x.f;
      if (x.r.Kondisi === 'UMARIYATAIN') f = F.mul(f, F.sub(F.make(1), fSpouse));
      setFard('ibu', f, x.r, x.r.Kondisi === 'UMARIYATAIN' ? 'umariyatain' : 'furudh');
    }
  }
  if (m.nenek_ibu || m.nenek_ayah) {
    const x = fardRule('nenek_ibu', 'nenek');
    if (x && x.f) {
      const k = (m.nenek_ibu ? 1 : 0) + (m.nenek_ayah ? 1 : 0);
      ['nenek_ibu', 'nenek_ayah'].forEach(t => { if (m[t]) setFard(t, F.div(x.f, F.make(k)), x.r); });
    }
  }
  if (m.sdr_lk_seibu + m.sdr_pr_seibu > 0) {
    const x = fardRule('sdr_lk_seibu', 'saudara_seibu');
    if (x && x.f) {
      const tot = m.sdr_lk_seibu + m.sdr_pr_seibu;
      ['sdr_lk_seibu', 'sdr_pr_seibu'].forEach(t => { if (m[t]) setFard(t, F.mul(x.f, F.make(m[t], tot)), x.r); });
    }
  }
  if (m.anak_pr && !m.anak_lk) { const x = fardRule('anak_pr'); if (x && x.f) setFard('anak_pr', x.f, x.r); }
  if (m.cucu_pr && !m.cucu_lk && !m.anak_lk) { const x = fardRule('cucu_pr'); if (x && x.f) setFard('cucu_pr', x.f, x.r); }

  // Ayah / kakek
  let kakekMuq = false;
  const sibsCounted = ['sdr_lk_kandung', 'sdr_pr_kandung', 'sdr_lk_seayah', 'sdr_pr_seayah'].filter(t => live(t));
  if (m.kakek && !adaKet && sibsCounted.length) kakekMuq = true;
  const bapaLike = m.ayah ? 'ayah' : (m.kakek && !kakekMuq ? 'kakek' : null);
  const asbNote = {};   // jenis -> 'ashabah' tambahan pada fard
  if (bapaLike && adaKet) {
    const x = fardRule(bapaLike);
    if (x && x.f) { setFard(bapaLike, x.f, x.r); }
    if (!adaKetLaki) asbNote[bapaLike] = true;
  }

  // Saudari (fard) — bila bukan ashabah bil ghair / ma'a ghair / bersama kakek
  if (!kakekMuq) {
    if (live('sdr_pr_kandung') && !live('sdr_lk_kandung') && !fullSisAsh) { const x = fardRule('sdr_pr_kandung'); if (x && x.f) setFard('sdr_pr_kandung', x.f, x.r); }
    if (live('sdr_pr_seayah') && !live('sdr_lk_seayah') && !sisAshP) { const x = fardRule('sdr_pr_seayah'); if (x && x.f) setFard('sdr_pr_seayah', x.f, x.r); }
  }

  let fardSum = F.make(0);
  Object.keys(fr).forEach(t => { fardSum = F.add(fardSum, fr[t]); });

  // Kakek bersama saudara: pilih yang paling menguntungkan kakek (jumhur)
  let muqInfo = null, akd = null;
  // Akdariyyah: suami + ibu + kakek + satu saudari (kandung/seayah) — cara Zaid bin Tsabit r.a.
  const akdOk = kakekMuq && m.suami === 1 && m.ibu === 1 && m.kakek === 1 && sibsCounted.length === 1 && /^sdr_pr_(kandung|seayah)$/.test(sibsCounted[0]) && m[sibsCounted[0]] === 1 && F.cmp(fardSum, F.make(5, 6)) === 0;
  if (akdOk) {
    akd = sibsCounted[0];
    const rk = { ID_Referensi: '-', Bagian_Pecahan: '1/6', Kondisi: 'AKDARIYYAH', Dalil: 'Akdariyyah — pendapat Zaid bin Tsabit r.a.' };
    setFard('kakek', F.make(1, 6), rk, 'akdariyyah');
    setFard(akd, F.make(1, 2), Object.assign({}, rk, { Bagian_Pecahan: '1/2' }), 'akdariyyah');
    fardSum = F.add(fardSum, F.make(2, 3));
    muqInfo = 'akdariyyah';
    warnings.push('Kasus Akdariyyah (suami, ibu, kakek, satu saudari) dihitung menurut Zaid bin Tsabit r.a.: saudari diberi 1/2 dan kakek 1/6, terjadi \'aul, lalu bagian keduanya digabung dan dibagi muqasamah 2 : 1. Sebagian ulama berpendapat lain; mohon konsultasikan.');
  } else if (kakekMuq) {
    const groupT = (live('sdr_lk_kandung') || live('sdr_pr_kandung')) ? ['sdr_lk_kandung', 'sdr_pr_kandung'] : ['sdr_lk_seayah', 'sdr_pr_seayah'];
    const W = sibsCounted.reduce((s, t) => s + m[t] * (t.indexOf('_lk_') > 0 ? 2 : 1), 0);
    const M = F.sub(F.make(1), fardSum);
    const c16 = F.make(1, 6);
    let best = c16, which = '1/6 dari seluruh harta';
    if (F.cmp(M, F.make(0)) > 0) {
      const a = F.mul(M, F.make(2, 2 + W));
      const b = F.div(M, F.make(3));
      best = a; which = 'muqasamah (dibagi bersama saudara)';
      if (F.cmp(b, best) > 0) { best = b; which = '1/3 dari sisa'; }
      if (F.cmp(c16, best) > 0) { best = c16; which = '1/6 dari seluruh harta'; }
    }
    setFard('kakek', best, { ID_Referensi: '-', Bagian_Pecahan: F.str(best), Kondisi: 'MUQASAMAH', Dalil: 'Ijma Sahabat (kakek bersama saudara) — ' + which }, 'muqasamah');
    fardSum = F.add(fardSum, best);
    let rem = F.sub(F.make(1), fardSum);
    if (F.cmp(rem, F.make(0)) > 0) {
      const wsum = groupT.reduce((s, t) => s + m[t] * (t.indexOf('_lk_') > 0 ? 2 : 1), 0);
      groupT.forEach(t => {
        if (!m[t]) return;
        const w = m[t] * (t.indexOf('_lk_') > 0 ? 2 : 1);
        setFard(t, F.mul(rem, F.make(w, wsum)), { ID_Referensi: '-', Bagian_Pecahan: F.str(F.mul(rem, F.make(w, wsum))), Kondisi: 'MUQASAMAH', Dalil: 'Ashabah bersama kakek' }, 'ashabah_saudara');
      });
      fardSum = F.add(fardSum, rem);
    }
    muqInfo = which;
    warnings.push('Kakek bersama saudara dihitung dengan cara paling menguntungkan kakek (' + which + '). Kasus mu\'addah/akdariyyah disederhanakan; mohon konsultasikan dengan ulama.');
  }

  /* ---------- ASHABAH (sisa) ---------- */
  let R = F.sub(F.make(1), fardSum);
  let grp = null, grpKind = 'ashabah_nafsi';
  const g = (a, b) => [{ t: a, w: 2 }, { t: b, w: 1 }].filter(x => m[x.t] > 0);
  if (!kakekMuq) {
    if (m.anak_lk) { grp = g('anak_lk', 'anak_pr'); grpKind = m.anak_pr ? 'bil_ghair' : 'ashabah_nafsi'; }
    else if (m.cucu_lk) { grp = g('cucu_lk', 'cucu_pr'); grpKind = m.cucu_pr ? 'bil_ghair' : 'ashabah_nafsi'; }
    else if (m.ayah) { grp = [{ t: 'ayah', w: 1 }]; }
    else if (m.kakek) { grp = [{ t: 'kakek', w: 1 }]; }
    else if (m.sdr_lk_kandung || fullSisAsh) {
      grp = g('sdr_lk_kandung', 'sdr_pr_kandung');
      grpKind = m.sdr_lk_kandung ? (m.sdr_pr_kandung ? 'bil_ghair' : 'ashabah_nafsi') : 'ma_a_ghair';
    } else if (m.sdr_lk_seayah || sisAshP) {
      grp = g('sdr_lk_seayah', 'sdr_pr_seayah');
      grpKind = m.sdr_lk_seayah ? (m.sdr_pr_seayah ? 'bil_ghair' : 'ashabah_nafsi') : 'ma_a_ghair';
    } else {
      for (const t of ['keponakan_kandung', 'keponakan_seayah', 'paman_kandung', 'paman_seayah', 'sepupu_kandung', 'sepupu_seayah']) {
        if (m[t]) { grp = [{ t: t, w: 1 }]; break; }
      }
    }
  }

  let aul = false, radd = false, baitulMal = F.make(0), raddSpouse = false;
  const ashFr = {};
  if (grp && grp.length) {
    if (F.cmp(R, F.make(0)) > 0) {
      const wsum = grp.reduce((s, x) => s + x.w * m[x.t], 0);
      grp.forEach(x => { ashFr[x.t] = F.mul(R, F.make(x.w * m[x.t], wsum)); });
    }
    if (F.cmp(R, F.make(0)) <= 0 && F.cmp(R, F.make(0)) === 0 && (live('sdr_lk_kandung') || live('sdr_pr_kandung')) && (m.sdr_lk_seibu + m.sdr_pr_seibu) > 1 && m.sdr_lk_kandung) {
      warnings.push('Kasus musytarakah: saudara kandung tidak mendapat sisa sementara saudara seibu mendapat 1/3. Sebagian ulama (mis. Syafi\'i, Maliki) membagi 1/3 itu bersama saudara kandung; mohon konsultasikan dengan ulama.');
    }
  }

  if (F.cmp(fardSum, F.make(1)) > 0) { aul = true; }
  else if (modeRadd && F.cmp(R, F.make(0)) > 0 && !(grp && grp.length)) { radd = true; }

  const asalFard = Object.keys(fr).reduce((l, t) => F.lcm(l, fr[t].d), 1);

  // Total akhir per jenis
  const fin = {};
  Object.keys(fr).forEach(t => { fin[t] = fr[t]; });
  Object.keys(ashFr).forEach(t => { fin[t] = F.add(fin[t] || F.make(0), ashFr[t]); });
  if (aul) { Object.keys(fin).forEach(t => { fin[t] = F.div(fin[t], fardSum); }); }
  if (akd) { const pool = F.add(fin.kakek, fin[akd]); fin.kakek = F.mul(pool, F.make(2, 3)); fin[akd] = F.mul(pool, F.make(1, 3)); }
  if (radd) {
    const sp = ['suami', 'istri'];
    let sumSp = F.make(0), sumNon = F.make(0);
    Object.keys(fin).forEach(t => { if (sp.indexOf(t) >= 0) sumSp = F.add(sumSp, fin[t]); else sumNon = F.add(sumNon, fin[t]); });
    if (F.cmp(sumNon, F.make(0)) > 0) {
      const k = F.div(F.sub(F.make(1), sumSp), sumNon);
      Object.keys(fin).forEach(t => { if (sp.indexOf(t) < 0) fin[t] = F.mul(fin[t], k); });
    } else if (F.cmp(sumSp, F.make(0)) > 0) {
      const k = F.div(F.make(1), sumSp);
      Object.keys(fin).forEach(t => { fin[t] = F.mul(fin[t], k); });
      raddSpouse = true;
      warnings.push('Hanya pasangan yang menjadi ahli waris: sisa harta dikembalikan (radd) kepada pasangan. Sebagian ulama menyerahkannya ke Baitul Mal; mohon konsultasikan.');
    }
  }
  let total = F.make(0);
  Object.keys(fin).forEach(t => { total = F.add(total, fin[t]); });
  if (F.cmp(total, F.make(1)) < 0) {
    baitulMal = F.sub(F.make(1), total);
    if (!alive.length || F.cmp(total, F.make(0)) === 0) warnings.push('Tidak ada ahli waris yang berhak: harta diserahkan ke Baitul Mal/dzawil arham (konsultasikan).');
    else warnings.push('Sisa ' + F.str(baitulMal) + ' adalah radd yang tidak dibagikan kepada ahli waris dan diserahkan ke Baitul Mal.');
  }

  /* ---------- Keluaran per orang ---------- */
  const typeMembers = {};
  alive.forEach(a => { (typeMembers[a.Hubungan] = typeMembers[a.Hubungan] || []).push(a); });
  const lcmFin = Object.keys(fin).reduce((l, t) => F.lcm(l, F.div(fin[t], F.make(m[t] || 1)).d), 1);
  const labelFor = (t) => {
    const hw = how[t];
    const isAsh = !!ashFr[t];
    const parts = [];
    if (fr[t] && hw && hw.kind === 'akdariyyah') parts.push(t === 'kakek' ? '1/6 + muqasamah 2:1 (Akdariyyah)' : '1/2 → muqasamah 2:1 (Akdariyyah)');
    else if (fr[t] && hw && hw.kind === 'umariyatain') parts.push('1/3 sisa (Umariyatain)');
    else if (fr[t] && hw && (hw.kind === 'muqasamah')) parts.push(F.str(fr[t]) + ' (' + muqInfo + ')');
    else if (fr[t] && hw && hw.kind === 'ashabah_saudara') parts.push('Ashabah bersama kakek');
    else if (fr[t]) parts.push(F.str(F.parse(hw.rule.Bagian_Pecahan) || fr[t]));
    if (isAsh) parts.push(grpKind === 'bil_ghair' ? 'Ashabah bil Ghair' : (grpKind === 'ma_a_ghair' ? 'Ashabah ma\'a Ghair' : 'Ashabah'));
    let s = parts.join(' + ');
    if (aul && fr[t]) s += ' (\'aul)';
    if (radd && fr[t]) s += ' (+ radd)';
    return s || '-';
  };

  const rows = [];
  (ahli || []).forEach(a => {
    const t = a.Hubungan;
    const base = { ahliId: a.ID, nama: a.Nama, hubungan: t, hubunganLabel: HUB[t] ? HUB[t][0] : t };
    if (a.Status_Hidup === 'Wafat') { rows.push(Object.assign(base, { status: 'wafat', bagianLabel: 'Wafat', frac: F.make(0), persen: 0, nominal: 0, alasan: 'Wafat lebih dahulu (tidak mewarisi)', dalil: '', aturan: '' })); return; }
    if (mahjub[t]) { rows.push(Object.assign(base, { status: 'mahjub', bagianLabel: 'Gugur (0 bagian)', frac: F.make(0), persen: 0, nominal: 0, alasan: mahjub[t], dalil: 'Hajb', aturan: 'Hajb (bawaan sistem)' })); return; }
    const mem = typeMembers[t] || [];
    let f = F.make(0);
    if (ashFr[t] || fin[t]) {
      // pembagian dalam jenis: ashabah bil ghair sudah ditimbang per jenis, jadi dibagi rata dalam jenis
      f = F.div(fin[t] || F.make(0), F.make(mem.length || 1));
    }
    const hw = how[t];
    const isAsh = !!ashFr[t];
    const hasRule = hw && hw.rule && hw.rule.ID_Referensi && hw.rule.ID_Referensi !== '-';
    const status = isAsh && fr[t] ? 'furudh_ashabah' : (isAsh ? 'ashabah' : 'furudh');
    const ashText = grpKind === 'bil_ghair' ? 'Ashabah bil ghair (2 : 1)' : (grpKind === 'ma_a_ghair' ? 'Ashabah ma\'a ghair' : 'Ashabah');
    rows.push(Object.assign(base, {
      status: status,
      bagianLabel: labelFor(t),
      frac: f,
      persen: Math.round(F.val(f) * 10000) / 100,
      nominal: Math.round(F.val(f) * hartaBersih * 100) / 100,
      alasan: mem.length > 1 ? 'Bagian jenis ini dibagi rata ' + mem.length + ' orang' : '',
      dalil: (hw && hw.rule ? hw.rule.Dalil : '') + (isAsh ? (hw ? ' · ' : '') + ashText : ''),
      aturan: (hasRule ? hw.rule.ID_Referensi + ' · ' + hw.rule.Bagian_Pecahan + ' · ' + (COND[hw.rule.Kondisi] ? COND[hw.rule.Kondisi].label : hw.rule.Kondisi) : '') + (isAsh ? (hasRule ? ' + ' : '') + ashText : '')
    }));
  });
  const tashih = rows.reduce((l, r) => F.lcm(l, r.frac.d), 1);
  rows.forEach(r => { r.siham = r.frac.n * (tashih / r.frac.d); });
  const asalAkhir = aul ? Math.round(asalFard * F.val(fardSum)) : asalFard;

  const kosong = rows.every(r => r.status === 'mahjub' || r.status === 'wafat');
  if (kosong && alive.length === 0) warnings.push('Belum ada ahli waris yang hidup. Tambahkan ahli waris untuk menghitung.');
  return { ok: true, rows: rows, asal: asalFard, asalAkhir: asalAkhir, tashih: tashih, aul: aul, radd: radd, raddPasangan: raddSpouse,
    totalFrac: total, baitulMal: baitulMal, warnings: warnings, errors: [], kosong: kosong,
    akd: akd, fardSum: fardSum, blok: Object.keys(fin).reduce((o, t) => { o[t] = { fr: fr[t] || null, ash: !!ashFr[t], fin: fin[t] }; return o; }, {}) };
}

/** Rekap harta (sama dengan computeRekap_ di server). */
function hitungRekap(k, harta) {
  let tG = 0, tB = 0;
  (harta || []).forEach(h => { if (h.Kategori === 'Gono-gini') tG += Number(h.Nilai) || 0; else tB += Number(h.Nilai) || 0; });
  const porsi = k.Status_Pasangan === 'Ada' ? (Number(k.Porsi_Gonogini_Pasangan) || 0) / 100 : 0;
  const bagianPasangan = tG * porsi;
  const peninggalan = tG - bagianPasangan + tB;
  const biaya = Number(k.Biaya_Jenazah) || 0, utang = Number(k.Utang) || 0, wasiatIn = Number(k.Wasiat) || 0;
  const sisaSebelumWasiat = Math.max(0, peninggalan - biaya - utang);
  const wasiatMax = sisaSebelumWasiat / 3;
  const wasiat = Math.min(wasiatIn, wasiatMax);
  const r2 = x => Math.round(x * 100) / 100;
  return { total: r2(tG + tB), gonogini: r2(tG), bagianPasangan: r2(bagianPasangan), bawaan: r2(tB), peninggalan: r2(peninggalan),
    sisaSebelumWasiat: r2(sisaSebelumWasiat), wasiatMax: r2(wasiatMax), wasiatEfektif: r2(wasiat), wasiatMelebihi: wasiatIn > wasiatMax + 0.005,
    potongan: r2(biaya + utang + wasiat), bersih: r2(sisaSebelumWasiat - wasiat), defisit: peninggalan < biaya + utang };
}
/* </ENGINE> */
