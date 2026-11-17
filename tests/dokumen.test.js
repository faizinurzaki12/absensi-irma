// ==========================================================
// tests/dokumen.test.js
// Pengujian untuk fitur dokumen, dashboard, dan export Excel.
// Dijalankan dengan: node --test tests/dokumen.test.js
// ==========================================================

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const Laporan = require("../assets/js/laporan-logic.js");
const Logic = require("../assets/js/kegiatan-logic.js");
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
];

// ---------- KLASIFIKASI KELAS ----------

test("kelasTermasuk membedakan X, XI, dan XII dengan benar", () => {
  assert.equal(Laporan.kelasTermasuk("X PPLG 1", "X"), true);
  assert.equal(Laporan.kelasTermasuk("XI TJKT 1", "X"), false);
  assert.equal(Laporan.kelasTermasuk("XII RPL 2", "X"), false);
  assert.equal(Laporan.kelasTermasuk("XI TJKT 1", "XI"), true);
  assert.equal(Laporan.kelasTermasuk("XII RPL 2", "XI"), false);
  assert.equal(Laporan.kelasTermasuk("XII RPL 2", "XII"), true);
  assert.equal(Laporan.kelasTermasuk("XII", "XII"), true);
});

test("hitungTerajin hanya menghitung Hadir pada jenjang yang diminta", () => {
  const xii = Laporan.hitungTerajin(absensiContoh, siswaContoh, "XII", "");
  const x = Laporan.hitungTerajin(absensiContoh, siswaContoh, "X", "");
  const xi = Laporan.hitungTerajin(absensiContoh, siswaContoh, "XI", "");

  assert.equal(xii.nama, "Budi");
  assert.equal(xii.total, 2);
  assert.equal(x.nama, "Siti");
  assert.equal(x.total, 3);
  assert.equal(xi.nama, "Andi");
  assert.equal(xi.total, 1);
});

test("hitungTerajin mengikuti filter bulan yang dipilih", () => {
  const hasil = Laporan.hitungTerajin(absensiContoh, siswaContoh, "X", "2026-10");
  assert.equal(hasil.nama, "Siti");
  assert.equal(hasil.total, 1);

  const kosong = Laporan.hitungTerajin(absensiContoh, siswaContoh, "XII", "2026-12");
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
});

test("baris Excel mengikuti filter bulan", () => {
  const baris = Laporan.bangunBarisExcelKehadiran(absensiContoh, siswaContoh, "2026-10");
  assert.equal(baris.length, 2);
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
    "Rencana Anggaran", "BAB III PENUTUP", "November 2026", "Pengajian Bulanan"
  ].forEach((bagian) => {
    assert.equal(html.includes(bagian), true, bagian + " tidak ada di dokumen");
  });
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
    kegiatan: [{ id: 9, judul_kumpulan: "Raker", created_at: "2026-11-10T00:00:00Z" }],
    users: [{ id: "u1" }],
  });

  assert.equal(hasil.totalSiswa, 3);
  assert.equal(hasil.totalAbsensi, 7);
  assert.equal(hasil.totalHadir, 6);
  assert.equal(hasil.totalKegiatan, 1);
  assert.equal(hasil.totalPetugas, 1);
  assert.ok(hasil.aktivitasTerbaru.length > 0);
  assert.equal(hasil.aktivitasTerbaru[0].label.includes("Raker"), true);
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

test("halaman export memakai dua kolom dan terajin XII serta X", () => {
  const html = bacaFile("export.html");
  assert.equal(html.includes("lg:grid-cols-2"), true);
  assert.equal(html.includes('id="top-siswa-xii"'), true);
  assert.equal(html.includes('id="top-siswa-x"'), true);
  assert.equal(html.includes('id="top-siswa-xi"'), false);
  assert.equal(html.includes("bangunBarisExcelKehadiran"), true);
});

test("halaman dashboard tersedia dan tautannya ada di semua halaman", () => {
  const dashboard = bacaFile("dashboard.html");
  assert.equal(dashboard.includes('id="angka-siswa"'), true);
  assert.equal(dashboard.includes('id="dashboard-top-xii"'), true);
  assert.equal(dashboard.includes('id="dashboard-top-x"'), true);
  assert.equal(dashboard.includes('id="dashboard-aktivitas"'), true);

  ["kegiatan.html", "export.html", "siswa.html", "tambah.html", "rekap.html", "users.html"].forEach((nama) => {
    assert.equal(bacaFile(nama).includes('href="/dashboard"'), true, nama + " belum punya menu Dashboard");
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
