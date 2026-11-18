// ==========================================================
// tests/dokumen.test.js
// Pengujian untuk fitur dokumen, dashboard, export Excel,
// dan perbaikan kelas XI, aktivitas, loading, serta redirect.
// Dijalankan dengan: node --test tests/dokumen.test.js
// ==========================================================

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const Laporan = require("../assets/js/laporan-logic.js");
const Logic = require("../assets/js/kegiatan-logic.js");
const App = require("../assets/js/app.js");
const akarProject = path.join(__dirname, "..");

function bacaFile(relativePath) {
  return fs.readFileSync(path.join(akarProject, relativePath), "utf8");
}

const siswaContoh = [
  { id: 1, nama_siswa: "Budi", kelas: "XII RPL 2" },
  { id: 2, nama_siswa: "Siti", kelas: "X PPLG 1" },
  { id: 3, nama_siswa: "Andi", kelas: "XI TJKT 1" },
];

const absensiContoh = [
  { id: 1, siswa_id: 1, tanggal_kegiatan: "2026-10-05", status_kehadiran: "Hadir" },
  { id: 2, siswa_id: 1, tanggal_kegiatan: "2026-11-05", status_kehadiran: "Hadir" },
  { id: 3, siswa_id: 2, tanggal_kegiatan: "2026-10-05", status_kehadiran: "Hadir" },
  { id: 4, siswa_id: 2, tanggal_kegiatan: "2026-11-05", status_kehadiran: "Hadir" },
  { id: 5, siswa_id: 2, tanggal_kegiatan: "2026-11-06", status_kehadiran: "Hadir" },
  { id: 6, siswa_id: 3, tanggal_kegiatan: "2026-11-05", status_kehadiran: "Hadir" },
  { id: 7, siswa_id: 1, tanggal_kegiatan: "2026-11-07", status_kehadiran: "Alfa" },
  { id: 8, siswa_id: 3, tanggal_kegiatan: "2026-10-05", status_kehadiran: "Hadir" },
  { id: 9, siswa_id: 3, tanggal_kegiatan: "2026-11-08", status_kehadiran: "Hadir" },
  { id: 10, siswa_id: 3, tanggal_kegiatan: "2026-11-09", status_kehadiran: "Alfa" },
];

// ---------- KLASIFIKASI KELAS ----------

test("kelasTermasuk membedakan X, XI, dan XII dengan benar", () => {
  assert.equal(Laporan.kelasTermasuk("X PPLG 1", "X"), true);
  assert.equal(Laporan.kelasTermasuk("XI TJKT 1", "X"), false);
  assert.equal(Laporan.kelasTermasuk("XII RPL 2", "X"), false);
  assert.equal(Laporan.kelasTermasuk("XI TJKT 1", "XI"), true);
  assert.equal(Laporan.kelasTermasuk("XII RPL 2", "XI"), false);
  assert.equal(Laporan.kelasTermasuk("XII RPL 2", "XII"), true);
  assert.equal(Laporan.kelasTermasuk("XI", "XI"), true);
});

test("hitungTerajin hanya menghitung Hadir pada jenjang yang diminta", () => {
  const xi = Laporan.hitungTerajin(absensiContoh, siswaContoh, "XI", "");
  const x = Laporan.hitungTerajin(absensiContoh, siswaContoh, "X", "");
  const xii = Laporan.hitungTerajin(absensiContoh, siswaContoh, "XII", "");

  // Sesuai perbaikan: jenjang pertama yang dipakai dashboard/export adalah XI.
  assert.equal(xi.nama, "Andi");
  assert.equal(xi.total, 3);
  assert.equal(x.nama, "Siti");
  assert.equal(x.total, 3);
  // Pembantu kelas tetap mengenali XII, tetapi tidak dipakai pada antarmuka.
  assert.equal(xii.nama, "Budi");
  assert.equal(xii.total, 2);
});

test("hitungTerajin mengikuti filter bulan yang dipilih", () => {
  const hasil = Laporan.hitungTerajin(absensiContoh, siswaContoh, "XI", "2026-10");
  assert.equal(hasil.nama, "Andi");
  assert.equal(hasil.total, 1);

  const kosong = Laporan.hitungTerajin(absensiContoh, siswaContoh, "XI", "2026-12");
  assert.equal(kosong, null);
});

// ---------- EXCEL BULANAN ----------

test("baris Excel memuat nama_siswa, kelas, dan kehadiran tiap bulan", () => {
  const baris = Laporan.bangunBarisExcelKehadiran(absensiContoh, siswaContoh, "");
  const budi = baris.find((item) => item.nama_siswa === "Budi");

  assert.equal(baris.length, 3);
  assert.equal(Object.keys(baris[0]).slice(0, 2).join(","), "nama_siswa,kelas");
  assert.equal(budi["kehadiran_2026-10"], 1);
  assert.equal(budi["kehadiran_2026-11"], 1);

  // Status Alfa tidak boleh menambah jumlah hadir.
  const siti = baris.find((item) => item.nama_siswa === "Siti");
  assert.equal(siti["kehadiran_2026-11"], 2);
  assert.equal(siti["kehadiran_2026-10"], 1);

  const andi = baris.find((item) => item.nama_siswa === "Andi");
  assert.equal(andi.kelas, "XI TJKT 1");
  assert.equal(andi["kehadiran_2026-11"], 2);
});

test("baris Excel mengikuti filter bulan", () => {
  const baris = Laporan.bangunBarisExcelKehadiran(absensiContoh, siswaContoh, "2026-10");
  assert.equal(baris.length, 3);
  assert.equal("kehadiran_2026-10" in baris[0], true);
  assert.equal("kehadiran_2026-11" in baris[0], false);
});

// ---------- DOKUMEN PROKER ----------

test("dokumen Proker memakai struktur awal dari contoh PROKER IRMA 2024", () => {
  const html = Laporan.bangunDokumenProker(
    [
      {
        judul_kumpulan: "Pengajian Bulanan",
        tanggal_kegiatan: "2026-11-17",
        isi_kegiatan: "Kajian dan evaluasi anggota",
      },
    ],
    { tahun: 2026 }
  );

  ["PROGRAM KERJA EKSTRAKURIKULER IRMA", "Pendahuluan", "Tujuan", "Sasaran",
    "Indikator Keberhasilan", "BAB II PERENCANAAN", "Rencana Kegiatan",
    "Rencana Anggaran", "BAB III PENUTUP", "November 2026", "Pengajian Bulanan",
    "17 November 2026"
  ].forEach((bagian) => {
    assert.equal(html.includes(bagian), true, bagian + " tidak ada di dokumen");
  });

  assert.equal(html.includes("2026-11-17"), false);
});

test("dokumen Proker aman dari injeksi HTML", () => {
  const html = Laporan.bangunDokumenProker([
    { judul_kumpulan: "<script>alert(1)</script>", tanggal_kegiatan: "2026-11-17", isi_kegiatan: "<b>isi</b>" },
  ]);

  assert.equal(html.includes("<script>alert(1)</script>"), false);
  assert.equal(html.includes("&lt;script&gt;"), true);
  assert.equal(html.includes("<b>isi</b>"), false);
});

// ---------- DASHBOARD ----------

test("ringkasanSistem menghitung total dan aktivitas terbaru", () => {
  const hasil = Laporan.ringkasanSistem({
    siswa: siswaContoh,
    absensi: absensiContoh,
    kegiatan: [{ id: 11, judul_kumpulan: "Raker", created_at: "2026-11-10T00:00:00Z" }],
    users: [{ id: "u1" }],
  });

  assert.equal(hasil.totalSiswa, 3);
  assert.equal(hasil.totalAbsensi, 10);
  assert.equal(hasil.totalHadir, 8);
  assert.equal(hasil.totalKegiatan, 1);
  assert.equal(hasil.totalPetugas, 1);
  assert.ok(hasil.aktivitasTerbaru.length > 0);
  assert.equal(hasil.aktivitasTerbaru[0].label.includes("Raker"), true);
});

test("aktivitas absensi di dashboard hanya berisi nama dan kelas siswa", () => {
  const hasil = Laporan.ringkasanSistem({
    siswa: siswaContoh,
    absensi: absensiContoh,
  });
  const label = hasil.aktivitasTerbaru.map((item) => item.label);

  assert.equal(label.includes("Budi (XII RPL 2)"), true);
  assert.equal(label.includes("Siti (X PPLG 1)"), true);
  assert.equal(label.includes("Andi (XI TJKT 1)"), true);
  assert.equal(label.some((item) => item.startsWith("Absensi ")), false);
  assert.equal(label.some((item) => item.includes("pada 2026-")), false);
});

test("aktivitas absensi menampilkan status dan tanggal tanpa cap waktu ISO", () => {
  const hasil = Laporan.ringkasanSistem({
    siswa: [
      { id: 1, nama_siswa: "Budi", kelas: "XI RPL 1" },
      { id: 2, nama_siswa: "Siti", kelas: "X PPLG 1" },
    ],
    absensi: [
      { siswa_id: 1, status_kehadiran: "Hadir", created_at: "2026-11-09T12:34:56Z" },
      { siswa_id: 2, status_kehadiran: "Sakit", created_at: "2026-11-08T07:00:00Z" },
    ],
    kegiatan: [{ judul_kumpulan: "Raker", created_at: "2026-11-10T00:00:00Z" }],
  });

  const absen = hasil.aktivitasTerbaru.filter((item) => item.status);
  assert.equal(absen.length, 2);

  const budi = absen.find((item) => item.label === "Budi (XI RPL 1)");
  assert.equal(budi.status, "Hadir");
  assert.equal(budi.hadir, true);
  assert.equal(budi.tanggal, "9 November 2026");
  assert.equal(budi.tanggal.includes("T"), false);

  const siti = absen.find((item) => item.label === "Siti (X PPLG 1)");
  assert.equal(siti.status, "Tidak Hadir");
  assert.equal(siti.hadir, false);
  assert.equal(siti.tanggal.includes("T"), false);

  const kegiatan = hasil.aktivitasTerbaru.find((item) => item.label.includes("Raker"));
  assert.equal(kegiatan.status, "");
  assert.equal(kegiatan.tanggal, "10 November 2026");
});

test("tanggal aktivitas hari ini ditampilkan sebagai Hari ini", () => {
  const sekarang = new Date();
  const kunci = [
    sekarang.getFullYear(),
    String(sekarang.getMonth() + 1).padStart(2, "0"),
    String(sekarang.getDate()).padStart(2, "0"),
  ].join("-");

  assert.equal(Laporan.formatTanggalRingkas(kunci + "T12:34:56Z"), "Hari ini");
  assert.equal(Laporan.formatTanggalRingkas("2026-11-09T12:34:56Z"), "9 November 2026");
  assert.equal(Laporan.formatTanggalRingkas("-"), "-");
});

test("konversi tanggal ISO aman untuk timezone Indonesia", () => {
  const { execFileSync } = require("node:child_process");
  const berkasLogika = path.join(akarProject, "assets/js/laporan-logic.js");
  const skrip =
    "var L=require(" + JSON.stringify(berkasLogika) + ");" +
    "process.stdout.write(L.formatTanggalRingkas('2026-11-08T17:30:00Z'));";

  const hasil = execFileSync(process.execPath, ["-e", skrip], {
    cwd: akarProject,
    env: { ...process.env, TZ: "Asia/Jakarta" },
    encoding: "utf8",
  });

  // 17:30 UTC = 00:30 hari berikutnya di Indonesia.
  assert.equal(hasil, "9 November 2026");
});

// ---------- FORMAT TANGGAL ----------

test("formatTanggalIndonesia selalu memakai urutan tanggal bulan tahun", () => {
  assert.equal(Laporan.formatTanggalIndonesia("2026-11-17"), "17 November 2026");
  assert.equal(Laporan.formatTanggalIndonesia("2026-01-05"), "5 Januari 2026");
  assert.equal(Laporan.formatTanggalIndonesia("2026-11-17T00:00:00Z"), "17 November 2026");
  assert.equal(Laporan.formatTanggalIndonesia(""), "-");
  assert.equal(Laporan.formatTanggalIndonesia("tidak valid"), "-");
});

test("formatTanggalRingkas tetap memakai Hari ini hanya untuk hari ini", () => {
  const sekarang = new Date();
  const kunci = [
    sekarang.getFullYear(),
    String(sekarang.getMonth() + 1).padStart(2, "0"),
    String(sekarang.getDate()).padStart(2, "0"),
  ].join("-");

  assert.equal(Laporan.formatTanggalRingkas(kunci), "Hari ini");
  assert.equal(Laporan.formatTanggalRingkas("2026-11-09"), "9 November 2026");
  assert.equal(Laporan.formatTanggalRingkas(""), "-");
});

test("tabel rekap dan export Excel menampilkan tanggal Indonesia", () => {
  const rekap = bacaFile("rekap.html");
  const app = bacaFile("assets/js/app.js");

  assert.equal(rekap.includes("formatTanggalIndonesiaRekap(a.tanggal_kegiatan)"), true);
  assert.equal(rekap.includes('class="px-4 py-3">${a.tanggal_kegiatan}'), false);
  assert.equal(app.includes("Tanggal: formatTanggalIndonesiaRekap(item.tanggal_kegiatan) || \"-\""), true);
});

// ---------- PENCARIAN REKAP ----------

const rekapCariContoh = [
  {
    id: 1,
    tanggal_kegiatan: "2026-11-17",
    status_kehadiran: "Hadir",
    tabel_siswa: { nama_siswa: "Budi", kelas: "XI RPL 1" },
  },
  {
    id: 2,
    tanggal_kegiatan: "2026-11-16",
    status_kehadiran: "Alfa",
    tabel_siswa: { nama_siswa: "Siti", kelas: "X PPLG 1" },
  },
];

test("cariRekapAbsensi mencocokkan tanggal, nama, kelas, dan status", () => {
  const cari = (kata) => App.cariRekapAbsensi(rekapCariContoh, kata).map((item) => item.id);

  assert.deepEqual(cari("2026-11-17"), [1]);
  assert.deepEqual(cari("17 November 2026"), [1]);
  assert.deepEqual(cari("budi"), [1]);
  assert.deepEqual(cari("RPL"), [1]);
  assert.deepEqual(cari("alfa"), [2]);
  assert.deepEqual(cari("HADIR"), [1]);
});

test("cariRekapAbsensi mengharuskan semua kata kunci cocok", () => {
  const hasil = App.cariRekapAbsensi(rekapCariContoh, "Siti Alfa");
  assert.deepEqual(hasil.map((item) => item.id), [2]);

  assert.deepEqual(App.cariRekapAbsensi(rekapCariContoh, "Budi Alfa"), []);
  assert.deepEqual(App.cariRekapAbsensi(rekapCariContoh, "  budi   hadir ").map((item) => item.id), [1]);
});

test("cariRekapAbsensi aman untuk data kosong dan tanpa kata kunci", () => {
  assert.deepEqual(
    App.cariRekapAbsensi(rekapCariContoh, "").map((item) => item.id),
    [1, 2]
  );
  assert.deepEqual(App.cariRekapAbsensi(rekapCariContoh, "   ").map((item) => item.id), [1, 2]);
  assert.deepEqual(App.cariRekapAbsensi(null, "budi"), []);
  assert.deepEqual(App.cariRekapAbsensi([{ id: 3, tanggal_kegiatan: "2026-11-15" }], "budi"), []);
  assert.equal(App.formatTanggalIndonesiaRekap("2026-11-17"), "17 November 2026");
});

test("halaman rekap menghubungkan kolom pencarian ke logika filter", () => {
  const html = bacaFile("rekap.html");
  const css = bacaFile("assets/css/style.css");

  assert.equal(html.includes('id="cari-rekap"'), true);
  assert.equal(html.includes('id="info-pencarian-rekap"'), true);
  assert.equal(html.includes('type="search"'), true);
  assert.equal(html.includes('addEventListener("input", renderRekap)'), true);
  assert.equal(html.includes("cariRekapAbsensi(semuaRekapCache, kata)"), true);
  assert.equal(html.includes("semuaRekapCache = absensi.map"), true);
  assert.equal(css.includes(".kegiatan-cari,\n.rekap-cari {"), true);
  assert.equal(css.includes(".kegiatan-input-cari,\n.rekap-cari input {"), true);
});

// ---------- STRUKTUR ANTARMUKA ----------

test("halaman kegiatan memiliki aksi lihat, edit, hapus, dan modal", () => {
  const html = bacaFile("kegiatan.html");
  const baris = Logic.renderTabelKegiatan([{ id: "1", judul_kumpulan: "Judul", tanggal_kegiatan: "2026-11-17", isi_kegiatan: "Isi" }]);

  assert.equal(html.includes('id="modal-lihat"'), true);
  assert.equal(html.includes('id="modal-edit"'), true);
  assert.equal(html.includes('id="tombol-export-dokumen"'), true);
  assert.equal(html.includes('id="tombol-google-docs"'), true);
  assert.equal(html.includes('id="tombol-unduh-doc"'), true);
  assert.equal(baris.includes("data-lihat-kegiatan"), true);
  assert.equal(baris.includes("data-edit-kegiatan"), true);
  assert.equal(baris.includes("data-hapus-kegiatan"), true);
});

test("tombol kirim kegiatan menampilkan spinner dan teks tunggu saat mengirim", () => {
  const html = bacaFile("kegiatan.html");
  const js = bacaFile("assets/js/kegiatan-page.js");
  const css = bacaFile("assets/css/style.css");

  assert.equal(html.includes('id="tombol-kirim"'), true);
  assert.equal(js.includes("aturTombolKirim(true)"), true);
  assert.equal(js.includes("tombol.disabled = true"), true);
  assert.equal(/Tunggu bentar\.\.\.\./i.test(js), true);
  assert.equal(js.includes("kegiatan-spinner"), true);
  assert.equal(js.includes("finally"), true);
  assert.equal(css.includes(".kegiatan-spinner"), true);
});

test("halaman export memakai dua kolom dan terajin XI serta X", () => {
  const html = bacaFile("export.html");
  assert.equal(html.includes("lg:grid-cols-2"), true);
  assert.equal(html.includes('id="top-siswa-xi"'), true);
  assert.equal(html.includes('id="top-siswa-x"'), true);
  assert.equal(html.includes('id="top-siswa-xii"'), false);
  assert.equal(html.includes("TERAJIN KELAS XI"), true);
  assert.equal(html.includes("bangunBarisExcelKehadiran"), true);
});

test("halaman dashboard tersedia dan tautannya ada di semua halaman", () => {
  const dashboard = bacaFile("dashboard.html");
  assert.equal(dashboard.includes('id="angka-siswa"'), true);
  assert.equal(dashboard.includes('id="dashboard-top-xi"'), true);
  assert.equal(dashboard.includes('id="dashboard-top-x"'), true);
  assert.equal(dashboard.includes('id="dashboard-top-xii"'), false);
  assert.equal(dashboard.includes('id="dashboard-aktivitas"'), true);

  ["kegiatan.html", "export.html", "siswa.html", "tambah.html", "rekap.html", "users.html"].forEach((nama) => {
    assert.equal(bacaFile(nama).includes('href="/dashboard"'), true, nama + " belum punya menu Dashboard");
  });
});

test("setelah login pengguna diarahkan ke dashboard", () => {
  const index = bacaFile("index.html");
  const klien = bacaFile("assets/js/supabase-client.js");

  assert.equal(index.includes('window.location.href = "/dashboard"'), true);
  assert.equal(index.includes('window.location.href = "/siswa"'), false);
  assert.equal(klien.includes('window.location.href = "/dashboard"'), true);
  assert.equal(klien.includes('window.location.href = "/siswa"'), false);
});

test("navigasi halaman Tailwind menyiapkan tab bar tanpa scroll horizontal", () => {
  const css = bacaFile("assets/css/style.css");
  const halaman = ["export.html", "siswa.html", "tambah.html", "rekap.html", "users.html"];

  assert.equal(css.includes(".nav-scroll > a"), true);

  halaman.forEach((nama) => {
    const html = bacaFile(nama);
    const tagNav = html.match(/<nav\b[^>]*>/);
    assert.equal(html.includes("nav-scroll min-w-0 whitespace-nowrap"), true, nama + " belum siap memakai tab bar");
    assert.equal(tagNav && tagNav[0].includes("overflow-x-auto"), false, nama + " navbar masih memakai scroll horizontal");
  });
});

test("CSS menata modal dan dashboard untuk layar HP", () => {
  const css = bacaFile("assets/css/style.css");

  assert.equal(css.includes("flex-wrap: nowrap"), true);
  assert.equal(css.includes("align-items: flex-end"), true);
  assert.equal(css.includes("border-radius: 14px 14px 0 0"), true);
  assert.equal(css.includes(".dashboard-grid:not(.dashboard-grid-dua)"), true);
  assert.equal(css.includes("repeat(2, minmax(0, 1fr))"), true);
  assert.equal(css.includes("overflow-wrap: anywhere"), true);
});

test("tampilan aktivitas dashboard memakai penanda status kehadiran", () => {
  const js = bacaFile("assets/js/dashboard-page.js");

  assert.equal(js.includes("dashboard-item-status"), true);
  assert.equal(js.includes("item.status"), true);
  assert.equal(js.includes("item.tanggal"), true);
});

test("layout tidak offset dan rekap kegiatan memakai kartu di HP", () => {
  const css = bacaFile("assets/css/style.css");

  assert.equal(css.includes("box-sizing: border-box"), true);
  assert.equal(css.includes(".dashboard-card {\n  min-width: 0;"), true);
  assert.equal(css.includes(".dashboard-cepat .kegiatan-tombol-export {\n  min-width: 0;"), true);
  assert.equal(css.includes("@media (min-width: 641px)"), true);
  assert.equal(css.includes(".kegiatan-item-atas {\n    flex-wrap: wrap;"), true);

  const kegiatan = bacaFile("kegiatan.html");
  assert.equal(kegiatan.includes('class="kegiatan-tabel-wrap"'), true);
  assert.equal(kegiatan.includes('id="kartu-kegiatan" class="kegiatan-kartu-list"'), true);
});

test("teks rekap panjang tidak keluar dari kartu export", () => {
  const html = bacaFile("export.html");
  assert.equal(html.includes('id="top-siswa-xi" class="text-sm font-bold text-gray-800 break-words"'), true);
  assert.equal(html.includes('id="top-siswa-x-periode" class="text-xs text-gray-500 mt-1 break-words"'), true);
});

test("navbar HP memakai tab bar bawah di seluruh halaman", () => {
  const css = bacaFile("assets/css/style.css");

  assert.equal(css.includes(".kegiatan-nav {"), true);
  assert.equal(css.includes("nav.nav-scroll {"), true);
  assert.equal(css.includes(".halaman-tabbar {"), true);
  assert.equal(css.includes("bottom: 0;"), true);
  assert.equal(css.includes("env(safe-area-inset-bottom)"), true);

  ["export.html", "siswa.html", "tambah.html", "rekap.html", "users.html"].forEach((nama) => {
    assert.equal(bacaFile(nama).includes("halaman-tabbar"), true, nama + " belum memakai tab bar bawah");
  });

  ["kegiatan.html", "dashboard.html"].forEach((nama) => {
    assert.equal(bacaFile(nama).includes('class="halaman-kegiatan"'), true, nama + " belum memakai gaya tab bar");
  });
});

test("file dan folder terlarang diabaikan git", () => {
  const ignore = bacaFile(".gitignore");
  ["Agent.md", "TASKS.md", "sql/", "doks/"].forEach((nama) => {
    assert.equal(ignore.includes(nama), true, nama + " belum ada di .gitignore");
  });

  const { execSync } = require("node:child_process");
  const terlacak = execSync("git ls-files", { cwd: akarProject, encoding: "utf8" })
    .split("\n")
    .filter(Boolean);

  ["Agent.md", "TASKS.md", "sql/", "doks/"].forEach((nama) => {
    assert.equal(
      terlacak.some((item) => item === nama || item.startsWith(nama)),
      false,
      nama + " masih terlacak di git"
    );
  });
});

test("modul navbar.js dimuat di seluruh halaman petugas", () => {
  const halaman = [
    "dashboard.html",
    "kegiatan.html",
    "export.html",
    "siswa.html",
    "tambah.html",
    "rekap.html",
    "users.html",
  ];

  halaman.forEach((nama) => {
    assert.equal(bacaFile(nama).includes('src="assets/js/navbar.js"'), true, nama + " belum memuat navbar.js");
  });
});

test("tab bar memakai menu utama dan tombol Lainnya tanpa scroll horizontal", () => {
  const js = bacaFile("assets/js/navbar.js");
  const css = bacaFile("assets/css/style.css");

  // Empat menu utama yang selalu terlihat di tab bar.
  assert.equal(js.includes('"Dashboard", "Siswa", "Kegiatan", "Export"'), true);

  // Tombol hamburger dan panel dropdown dibuat saat halaman dimuat.
  assert.equal(js.includes('className = "tabbar-menu"'), true);
  assert.equal(js.includes('className = "tabbar-dropdown"'), true);
  assert.equal(js.includes('setAttribute("aria-expanded"'), true);
  assert.equal(js.includes("Escape"), true);

  // Navbar fixed, tinggi ditambah, dan tidak bisa digeser kiri-kanan.
  assert.equal(css.includes("min-height: 72px"), true);
  assert.equal(css.includes("overflow: visible"), true);
  assert.equal(css.includes(".tabbar-menu-ikon"), true);
  assert.equal(css.includes(".tabbar-dropdown.buka"), true);
  assert.equal(css.includes("bottom: calc(72px + env(safe-area-inset-bottom))"), true);
});

test("semua elemen dibuat responsif untuk tampilan HP", () => {
  const css = bacaFile("assets/css/style.css");

  assert.equal(css.includes("overflow-x: hidden"), true);
  assert.equal(css.includes("overflow-wrap: break-word"), true);
  assert.match(css, /main\s*\{[^}]*max-width:\s*100%/);
  assert.match(css, /input,\s*textarea,\s*select\s*\{[^}]*max-width:\s*100%/);
});

test("modal hapus kegiatan menyediakan export dokumen untuk seluruh rekap", () => {
  const html = bacaFile("kegiatan.html");
  const js = bacaFile("assets/js/kegiatan-page.js");

  assert.equal(html.includes('id="modal-hapus"'), true);
  assert.equal(html.includes('id="hapus-judul"'), true);
  assert.equal(html.includes('id="tombol-export-dokumen-hapus"'), true);
  assert.equal(html.includes('id="tombol-konfirmasi-hapus"'), true);
  assert.equal(html.includes('id="tombol-unduh-doc" class="kegiatan-tombol-export sekunder">Export Dokumen'), true);

  assert.equal(js.includes("modal-hapus"), true);
  assert.equal(js.includes("tombol-export-dokumen-hapus"), true);
  assert.equal(js.includes("unduhDokumenDoc"), true);
  assert.equal(js.includes("window.confirm"), false);
});

test("halaman rekap memakai satu tabel responsif di semua layar", () => {
  const html = bacaFile("rekap.html");
  const css = bacaFile("assets/css/style.css");

  assert.equal(html.includes('class="rekap-tabel w-full text-sm"'), true);
  assert.equal(html.includes("card-tabel-rekap"), false);
  assert.equal(html.includes('class="hidden sm:block overflow-x-auto"'), false);
  assert.equal(html.includes("rekap-status"), true);

  assert.equal(css.includes(".rekap-tabel {"), true);
  assert.equal(css.includes(".rekap-tabel th,\n  .rekap-tabel td {"), true);
  assert.equal(css.includes("padding: 6px 4px;"), true);
});

test("README menjelaskan proyek beserta bagian yang diminta", () => {
  const readme = bacaFile("README.md");

  assert.equal(readme.startsWith("# Absensi IRMA"), true);

  ["## Deskripsi", "## Tujuan", "## Fitur", "## Teknologi yang dipakai", "## Struktur proyek", "## Pengujian"].forEach((bagian) => {
    assert.equal(readme.includes(bagian), true, "README tidak punya bagian " + bagian);
  });

  ["tabel_siswa", "tabel_absensi", "tabel_kegiatan", "tabel_users", "Tab bar", "Google Dokumen", "Excel"].forEach((kata) => {
    assert.equal(readme.includes(kata), true, "README tidak menyebut " + kata);
  });
});

test("file baru tidak memakai emoji atau ikon", () => {
  const daftar = [
    "dashboard.html",
    "assets/js/laporan-logic.js",
    "assets/js/dashboard-page.js",
    "assets/js/kegiatan-page.js",
    "kegiatan.html",
    "export.html",
  ];
  const polaEmoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

  daftar.forEach((nama) => {
    assert.equal(polaEmoji.test(bacaFile(nama)), false, nama + " masih mengandung emoji");
  });
});
