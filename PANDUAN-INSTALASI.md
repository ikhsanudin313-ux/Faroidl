# Panduan Instalasi — Faroidl Cloud (Backend GAS + Frontend GitHub Pages)

Arsitektur: **Frontend** (index.html, css/, js/) di GitHub Pages → memanggil **Backend** Google Apps Script (REST API JSON) → Google Sheets & Drive.
Login & peran (Super Admin / Admin Kelompok) tetap berjalan: token sesi dikirim di dalam isi permintaan (bukan di URL).

Urutan wajib: **A. Backend dulu → B. isi config.js → C. GitHub Pages.**

## A. Backend (Google Apps Script)
1. Buka https://script.google.com → **Proyek baru**.
2. Ganti isi `Code.gs` dengan seluruh isi berkas **Kode.gs** (hapus kode bawaan).
3. (Disarankan) Menu ⚙ **Project Settings** → centang *Show "appsscript.json" manifest file* → buka `appsscript.json` → ganti isinya dengan berkas **appsscript.json**.
4. Pilih fungsi **setupAppEnvironment** → ▶ Run → izinkan akses (Drive, Sheets, Gmail). **Hanya sekali.** Folder Drive, Spreadsheet database, dan ID tersimpan otomatis di Script Properties.
5. Pilih fungsi **resetSuperAdmin** → ▶ Run. Kata sandi sementara tampil di **Execution Log**. Email pemilik skrip = Super Admin.
6. **Deploy → New deployment → Web app**: Execute as **Me**, Who has access **Anyone** → Deploy → **salin URL berakhiran `/exec`**.
7. Tes: buka URL `/exec?action=ping` di browser → harus tampil JSON `{"success":true,...}`.

> Setiap kali Kode.gs diubah: **Deploy → Manage deployments → ✏ Edit → Version: New version → Deploy**. URL `/exec` tetap sama.

## B. Isi alamat API di frontend
Buka `js/config.js`, ganti `ISI_URL_EXEC_DI_SINI` dengan URL `/exec` tadi:
```js
const API_URL = 'https://script.google.com/macros/s/AKfycb.../exec';
```
Lakukan ini **sebelum** push pertama.

## C. GitHub Pages
**Folder kerja = folder hasil ekstrak ZIP `faroidl-frontend`** (yang langsung berisi `index.html`, `css`, `js`). Di folder inilah `git init` dijalankan — bukan folder di atasnya.

1. Pasang Git (Windows: https://git-scm.com/download/win · Mac: ketik `git --version` di Terminal). Cek: `git --version`.
2. Punya akun di https://github.com. Atur identitas (sekali):
   ```
   git config --global user.name "Nama Anda"
   git config --global user.email "email-akun-github@contoh.com"
   ```
3. GitHub → **+ → New repository** → nama mis. `faroidl` → **Public** → jangan centang README/.gitignore/license → Create.
4. Buka terminal **di folder `faroidl-frontend`** (Windows: buka folder di File Explorer, klik address bar, ketik `powershell`, Enter). Cek dengan `dir` (atau `ls -la`): **`index.html` harus terlihat di daftar teratas**, beserta folder `css` dan `js`. Jika yang terlihat hanya satu folder lain, masuk dulu ke dalamnya (`cd faroidl-frontend`).
5. Jalankan satu per satu:
   ```
   git init
   git add .
   git commit -m "Upload pertama"
   git branch -M main
   git remote add origin https://github.com/USERNAME/faroidl.git
   git push -u origin main
   ```
   Saat diminta *Password*, tempel **Personal Access Token** (layar tampak kosong saat paste — normal).
6. Buat token: https://github.com/settings/tokens → *Generate new token (classic)* → centang **repo** → Generate → salin `ghp_...` (hanya tampil sekali).
7. Repo → **Settings → Pages** → Source **Deploy from a branch** → Branch **main** / **(root)** → Save. Tunggu 1–2 menit; centang **Enforce HTTPS**.
8. Situs: `https://USERNAME.github.io/faroidl/`. Jangan upload lewat "Upload files" di web GitHub (struktur folder rusak).

### Update di kemudian hari
```
git add .
git commit -m "Perubahan"
git push
```
Jika tampilan lama masih muncul: Ctrl+Shift+R.

## Tes cepat
1. Buka situs → login Super Admin (email pemilik skrip + sandi sementara).
2. F12 → Network: permintaan ke `script.google.com` berstatus 200, tanpa error CORS.
3. Buat kasus → cek tersimpan di Spreadsheet database.

## Pemecahan masalah
| Gejala | Penyebab / solusi |
|---|---|
| Pesan "URL API belum diatur" | `js/config.js` belum diisi / salah |
| "Respons server tidak valid" | Akses Web App bukan **Anyone**, URL bukan `/exec`, atau belum deploy versi baru |
| Halaman tanpa gaya (404 css/js) | File rata di root; ulangi dari folder yang benar |
| 404 di GitHub Pages | `index.html` tidak di root repo |
| Perubahan backend tak berefek | Deploy **New version** |
| Pratinjau berkas Drive kosong | Berkas Drive dibagikan "siapa saja dengan tautan" bagi penerima tertentu — atur akses |

## Catatan keamanan
- URL `/exec` bersifat publik; seluruh aksi (kecuali `ping`) tetap menuntut login & peran di server.
- Jangan menyimpan ID/rahasia di frontend; semuanya ada di Script Properties.
- Tidak ada berkas `.gs` di repo GitHub.

## Peran & hak akses (pembaruan: Tim Faroidl Kelompok & Daerah)

| Fitur | Super Admin | Tim Faroidl Daerah | Admin Kelompok | Tim Faroidl Kelompok |
|---|:-:|:-:|:-:|:-:|
| Lingkup data | Semua kelompok | Semua kelompok | Kelompoknya | Kelompoknya |
| Input pewaris, harta, ahli waris | ✅ | ✅ | ✅ | ✅ |
| Hitung waris, tabel hisab, Excel hasil | ✅ | ✅ | ✅ | ❌ |
| Berita Acara PDF & kirim salinan | ✅ | ✅ | ✅ | ❌ |
| Hapus kasus | ✅ | ✅ | ✅ | ❌ |
| Kelola kelompok, pengaturan, backup | ✅ | ✅ | ❌ | ❌ |
| Lihat Referensi & Aturan | ✅ | ✅ (lihat saja) | ✅ (lihat saja) | ❌ |
| Ubah aturan/rumus, dalil | ✅ | ❌ | ❌ | ❌ |
| Tambah/ubah akun | ✅ | ❌ (hanya lihat daftar) | ❌ | ❌ |
| Ubah porsi gono-gini | ✅ | ❌ | ❌ | ❌ |

Catatan:
- Batasan dijaga di **server** (Kode.gs), bukan hanya disembunyikan di tampilan.
- Tim Faroidl Kelompok tidak menerima data hasil hitung maupun aturan dari server. Jika ia mengubah harta/ahli waris pada kasus yang sudah dihitung, hasil lama tidak diubah dan status tetap; Tim Daerah/Admin akan melihat peringatan "hasil perlu diperbarui" dan menghitung ulang.
- Buat akun lewat **Referensi & Aturan → Kelompok & Akun Pengurus → Tambah Akun** (Super Admin). Peran Daerah tidak memerlukan kelompok.

### Cara memperbarui (akun & data lama tetap aman)
1. **Backend:** buka proyek Apps Script → ganti seluruh isi Kode.gs dengan versi baru → **Deploy → Manage deployments → ✏ → Version: New version → Deploy** (URL `/exec` tidak berubah; jangan jalankan setupAppEnvironment lagi).
2. **Frontend:** ganti berkas hasil ekstrak ZIP baru, **pertahankan `js/config.js` Anda yang sudah berisi URL `/exec`**, lalu di folder repo jalankan `git add .`, `git commit -m "peran baru"`, `git push`. Tunggu 1–2 menit, Ctrl+Shift+R.

## Pembaruan: form "Buat Kasus Waris Baru"
- Label **Almarhum / Almarhumah** menggantikan "pewaris" pada form dan judul (otomatis Almarhum/Almarhumah sesuai jenis kelamin).
- Kolom baru **Bin / Binti (nama ayah)**: nama tampil sebagai "Nama bin/binti Ayah" di dashboard, halaman hitung, Berita Acara, Excel, dan email. Data lama yang sudah memuat "bin/binti" di kolom nama tidak berubah.
- Kolom baru **Tanggal lahir** (opsional): usia saat wafat dihitung otomatis dan tampil di halaman kasus & Berita Acara.
- Label **Desa → Kelompok** dan **Daerah → Desa**. Data yang sudah tersimpan ikut berpindah label (isi kolom "Desa" lama kini tampil sebagai "Kelompok", isi "Daerah" lama sebagai "Desa").
- Kolom sheet baru (`Nama_Ayah`, `Tgl_Lahir`) ditambahkan **otomatis** pada pembacaan pertama setelah backend diperbarui; tidak perlu setup ulang.
- Pemilih kelompok akun (untuk Super Admin/Tim Daerah) kini berlabel "Pengurus berwenang (kelompok akun)" agar tidak tertukar dengan isian Kelompok.
- Memperbarui: tempel Kode.gs baru → Deploy **New version**; salin file frontend baru (kecuali `js/config.js`) → `git add .` / `git commit` / `git push`.
