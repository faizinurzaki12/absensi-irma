# Absensi IRMA

Aplikasi web untuk mengelola absensi dan kegiatan ekstrakurikuler **Ikatan Remaja Masjid (IRMA)** SMK Negeri 4 Tasikmalaya.

## Deskripsi

Absensi IRMA adalah aplikasi berbasis web yang dipakai petugas untuk mencatat kehadiran siswa, mengelola data siswa dan akun, merencanakan serta mendokumentasikan kegiatan kumpulan, dan menghasilkan laporan. Data disimpan di Supabase, tetapi aplikasi tetap bisa dipakai saat koneksi terputus: perubahan disimpan lebih dulu di perangkat, lalu dikirim otomatis ketika jaringan kembali online.

Tampilannya dioptimalkan untuk handphone. Pada layar sempit, navigasi berubah menjadi tab bar bawah yang tetap berada di posisinya, memakai empat menu utama dan satu tombol **Lainnya** berupa dropdown ke atas, tanpa geser kiri-kanan.

## Tujuan

- Memudahkan petugas mencatat kehadiran siswa dengan cepat, termasuk saat sinyal tidak stabil.
- Menyatukan data siswa, absensi, kegiatan, dan akun petugas dalam satu aplikasi.
- Menghasilkan rekap kehadiran dan program kerja yang rapi serta siap dibagikan.
- Memberikan gambaran menyeluruh tentang kondisi ekstrakurikuler melalui dashboard.
- Memberikan pengalaman pakai yang nyaman di handphone maupun laptop.

## Fitur

### Autentikasi dan akses
- Login memakai akun petugas melalui Supabase Auth.
- Sesi tetap aktif saat offline selama pengguna pernah login minimal sekali saat online.
- Setiap halaman petugas memerlukan login; setelah login pengguna diarahkan ke dashboard.

### Dashboard
- Ringkasan jumlah siswa, absensi, kehadiran, kegiatan, dan petugas.
- Siswa paling rajin untuk jenjang **XI** dan **X** pada seluruh periode.
- Aktivitas terbaru berupa nama siswa dan kelasnya, serta kegiatan yang baru dicatat.
- Akses cepat menuju kelola siswa, input absensi, input kegiatan, dan export laporan.

### Data siswa dan absensi
- Manajemen data siswa: tambah, ubah, dan hapus.
- Input absensi harian beserta status kehadiran.
- Rekap absensi yang tampil sebagai tabel di laptop dan kartu di handphone.

### Kegiatan kumpulan IRMA
- Input kegiatan berisi judul kumpulan, tanggal kegiatan, dan isi kegiatan.
- Daftar kegiatan diurutkan dari tanggal terbaru, tampil sebagai tabel di laptop dan kartu di handphone.
- Aksi **Lihat**, **Edit**, dan **Hapus** melalui modal, dengan konfirmasi sebelum menghapus.
- Ekspor rekap ke dokumen `.doc` yang kompatibel dengan Microsoft Word maupun Google Dokumen.
- Salin format ke Google Dokumen langsung dari aplikasi.
- Format dokumen mengikuti struktur awal **PROKER IRMA 2024**: pendahuluan, tujuan, sasaran, indikator keberhasilan, BAB II perencanaan berisi tabel rekap kegiatan per bulan, dan BAB III penutup.
- Tombol kirim langsung dinonaktifkan dan menampilkan spinner serta teks "Tunggu bentar...." saat pengiriman berlangsung.

### Laporan dan ekspor
- Filter bulan dan tahun statistik.
- Kartu statistik dan siswa paling rajin untuk kelas **XI** dan **X** sesuai periode yang dipilih.
- Ekspor Excel dengan kolom `nama_siswa`, `kelas`, dan `kehadiran_<YYYY-MM>` mengikuti bulan pada filter.

### Offline dan sinkronisasi
- Setiap perubahan langsung tersimpan di `localStorage` dan tampil seketika di layar.
- Antrean sinkronisasi mengirim perubahan ke Supabase saat koneksi kembali online.
- ID sementara pada data yang dibuat offline diganti otomatis dengan ID dari server, termasuk perbaikan referensi antartdata.
- Indikator status jaringan dan jumlah perubahan yang masih menunggu disinkronkan.

### Tampilan
- Responsif di layar handphone; teks panjang dibungkus dan lebar elemen dibatasi agar tidak keluar layar.
- Tab bar bawah berisi **Dashboard**, **Siswa**, **Kegiatan**, **Export**, dan tombol **Lainnya** (Akun, Input Absensi, Rekap, Logout).
- Dropdown **Lainnya** muncul ke atas, ditutup dengan klik di luar atau tombol `Escape`, dan tinggi tab bar ditambah agar mudah disentuh.

## Teknologi yang dipakai

- HTML, CSS, dan JavaScript murni tanpa framework serta tanpa proses build.
- Tailwind CSS melalui CDN pada sebagian halaman; gaya tambahan ada di `assets/css/style.css`.
- Supabase JS v2 untuk autentikasi dan database.
- SheetJS (XLSX) untuk mengekspor laporan ke Excel.
- Node.js test runner bawaan untuk pengujian otomatis.

## Struktur proyek

```
absensi-irma/
├── index.html                  Halaman login
├── dashboard.html              Ringkasan keseluruhan sistem
├── siswa.html                  Manajemen data siswa
├── tambah.html                 Input absensi harian
├── rekap.html                  Rekap absensi
├── kegiatan.html               Input dan rekap kegiatan kumpulan
├── export.html                 Laporan dan export Excel
├── users.html                  Profil dan manajemen akun petugas
├── assets/
│   ├── css/style.css           Gaya tema, modal, dashboard, dan tab bar
│   └── js/
│       ├── supabase-client.js  Klien Supabase, proteksi halaman, logout
│       ├── offline-store.js    Cache localStorage dan antrean sinkronisasi
│       ├── app.js              Status jaringan dan bantuan export Excel
│       ├── navbar.js           Penyusun tab bar dan dropdown "Lainnya"
│       ├── kegiatan-logic.js   Validasi dan render data kegiatan
│       ├── kegiatan-page.js    Penghubung form kegiatan dengan penyimpanan
│       ├── laporan-logic.js    Rekap dokumen, Excel, dan ringkasan dashboard
│       └── dashboard-page.js   Pengisi data halaman dashboard
├── tests/
│   ├── kegiatan.test.js        Pengujian logika kegiatan
│   └── dokumen.test.js         Pengujian laporan, dashboard, dan tampilan
├── CHANGELOG.md                Catatan perubahan versi
└── README.md                   Dokumentasi proyek ini
```

## Daftar halaman

| Halaman | File | Fungsi utama |
| --- | --- | --- |
| Login | `index.html` | Masuk sebagai petugas |
| Dashboard | `dashboard.html` | Ringkasan data dan akses cepat |
| Siswa | `siswa.html` | Kelola data siswa |
| Input Absensi | `tambah.html` | Catat kehadiran harian |
| Rekap | `rekap.html` | Lihat rekap absensi |
| Kegiatan | `kegiatan.html` | Input, kelola, dan export kegiatan |
| Export | `export.html` | Laporan dan unduh Excel bulanan |
| Akun | `users.html` | Profil dan akun petugas |

## Pengujian

Pengujian otomatis dijalankan dengan test runner bawaan Node.js:

```
node --test tests/kegiatan.test.js tests/dokumen.test.js
```

Cakupannya meliputi validasi form kegiatan, keamanan teks HTML, format tanggal, urutan data, rekap kehadiran, dokumen Proker, ringkasan dashboard, struktur halaman, dan tata letak tab bar responsif.

## Jenjang yang dipakai

Rekap dan statistik memakai jenjang **XI** dan **X**. Fungsi pencocokan kelas membedakan secara tepat antara `X`, `XI`, dan `XII` sehingga data kelas XI tidak ikut terhitung sebagai kelas X.

## Catatan

- Konfigurasi URL dan kunci Supabase berada di `assets/js/supabase-client.js`.
- Tabel yang dipakai: `tabel_siswa`, `tabel_absensi`, `tabel_kegiatan`, dan `tabel_users`.
- File `Agent.md`, `TASKS.md`, folder `sql/`, dan folder `doks/` sengaja tidak disertakan dalam repository dan sudah dicegah oleh `.gitignore`.
- Riwayat perubahan tercatat di [CHANGELOG.md](CHANGELOG.md).
