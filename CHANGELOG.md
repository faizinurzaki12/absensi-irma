# CHANGELOG

## Versi 1.0.0 - 17 November 2026
- Feat: menambahkan halaman input kegiatan kumpulan IRMA dengan field judul kumpulan, tanggal kegiatan, isi kegiatan, dan tombol kirim.
- Feat: menambahkan penyimpanan data kegiatan melalui Supabase dengan dukungan offline memakai antrean sinkronisasi yang sudah ada.
- Feat: menambahkan tampilan rekap kegiatan berupa tabel untuk laptop dan kartu untuk HP.
- Feat: menambahkan menu Kegiatan pada navigasi seluruh halaman petugas.
- Feat: menambahkan migrasi SQL tabel_kegiatan beserta kebijakan Row Level Security.
- Feat: menambahkan 14 pengujian otomatis untuk validasi form, keamanan HTML, format tanggal, urutan data, dan struktur halaman.


## Versi 1.1.0 - 17 November 2026
- Feat: menambahkan tombol Export Dokumen pada halaman kegiatan untuk mengunduh rekap Proker IRMA dalam format .doc.
- Feat: menambahkan aksi Lihat, Edit, dan Hapus pada tabel serta kartu kegiatan, lengkap dengan modal detail dan modal edit.
- Feat: menambahkan tombol Export ke Google Dokumen pada modal detail dengan format awal mengikuti PROKER IRMA 2024.docx.
- Feat: menata rekap kehadiran di halaman export menjadi dua kolom kiri dan kanan pada layar besar.
- Feat: mencatat siswa paling rajin kelas XII dan X, baik untuk periode yang difilter maupun seluruh periode.
- Feat: menambahkan halaman Dashboard Overview berisi ringkasan sistem, siswa paling rajin, dan aktivitas terbaru.
- Feat: mengubah export Excel menjadi kolom nama_siswa, kelas, dan kehadiran tiap bulan sesuai filter yang dipilih.
- Feat: menambahkan 12 pengujian otomatis untuk logika dokumen, Excel, dashboard, dan struktur halaman.

## Versi 1.1.1 - 17 November 2026
- Perbaikan: mengganti jenjang siswa paling rajin dari kelas XII menjadi kelas XI di halaman export dan dashboard.
- Perbaikan: aktivitas terbaru pada dashboard kini menampilkan nama siswa dan kelasnya saja.
- Perbaikan: tombol Kirim Kegiatan langsung dinonaktifkan dan menampilkan spinner serta teks "Tunggu bentar...." saat pengiriman.
- Perbaikan: redirect setelah login diarahkan ke halaman dashboard.
- Perbaikan: menambahkan 3 pengujian otomatis sehingga total menjadi 29 pengujian.

## Versi 1.2.0 - 18 November 2026
- Perbaikan: navigasi pada seluruh halaman petugas kini tampil dalam satu baris yang bisa digeser di layar handphone.
- Perbaikan: modal detail kegiatan tampil sebagai panel bawah di handphone agar lebih mudah dijangkau.
- Perbaikan: kartu ringkasan dashboard tetap dua kolom dan akses cepat ditata dua kolom pada layar sempit.
- Perbaikan: status koneksi dan tombol export pada halaman kegiatan memakai lebar penuh di handphone.
- Perbaikan: teks nama siswa pada kartu export tidak keluar dari kartu saat namanya panjang.
- Perbaikan: tidak memasukkan Agent.md, TASKS.md, folder doks, dan folder sql ke dalam commit fitur ini.
- Perbaikan: menambahkan 3 pengujian otomatis sehingga total menjadi 32 pengujian.
