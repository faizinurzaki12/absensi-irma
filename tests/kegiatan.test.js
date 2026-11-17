// ==========================================================
// tests/kegiatan.test.js
// Pengujian otomatis untuk fitur kegiatan kumpulan IRMA.
// Dijalankan dengan: node --test tests/kegiatan.test.js
// ==========================================================

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const Logic = require("../assets/js/kegiatan-logic.js");
const akarProject = path.join(__dirname, "..");

function bacaFile(relativePath) {
  return fs.readFileSync(path.join(akarProject, relativePath), "utf8");
}

// ---------- VALIDASI FORM ----------

test("validasi menerima data lengkap dan memangkas spasi", () => {
  const hasil = Logic.validasiKegiatan({
    judul_kumpulan: "  Kumpulan Irma November  ",
    tanggal_kegiatan: "2026-11-17",
    isi_kegiatan: "  Mengaji bareng dan evaluasi absensi.  ",
  });

  assert.equal(hasil.valid, true);
  assert.deepEqual(hasil.errors, {});
  assert.equal(hasil.data.judul_kumpulan, "Kumpulan Irma November");
  assert.equal(hasil.data.isi_kegiatan, "Mengaji bareng dan evaluasi absensi.");
});

test("validasi menolak field yang kosong", () => {
  const hasil = Logic.validasiKegiatan({});

  assert.equal(hasil.valid, false);
  assert.ok(hasil.errors.judul_kumpulan);
  assert.ok(hasil.errors.tanggal_kegiatan);
  assert.ok(hasil.errors.isi_kegiatan);
  assert.match(Logic.pesanPertama(hasil.errors), /Judul kumpulan wajib/);
});

test("validasi menolak tanggal yang tidak benar", () => {
  const tanggalSalah = Logic.validasiKegiatan({
    judul_kumpulan: "Kegiatan",
    tanggal_kegiatan: "2026-02-30",
    isi_kegiatan: "Isi kegiatan",
  });
  const formatSalah = Logic.validasiKegiatan({
    judul_kumpulan: "Kegiatan",
    tanggal_kegiatan: "17/11/2026",
    isi_kegiatan: "Isi kegiatan",
  });

  assert.equal(Logic.tanggalValid("2026-02-30"), false);
  assert.equal(Logic.tanggalValid("2026-11-17"), true);
  assert.equal(tanggalSalah.valid, false);
  assert.match(tanggalSalah.errors.tanggal_kegiatan, /tidak valid/);
  assert.equal(formatSalah.valid, false);
});

test("validasi membatasi panjang judul dan isi", () => {
  const hasil = Logic.validasiKegiatan({
    judul_kumpulan: "x".repeat(151),
    tanggal_kegiatan: "2026-11-17",
    isi_kegiatan: "y".repeat(5001),
  });

  assert.equal(hasil.valid, false);
  assert.match(hasil.errors.judul_kumpulan, /150 karakter/);
  assert.match(hasil.errors.isi_kegiatan, /5000 karakter/);
});

// ---------- FORMAT & KEAMANAN ----------

test("format tanggal memakai bahasa Indonesia", () => {
  assert.equal(Logic.formatTanggalIndonesia("2026-11-17"), "17 November 2026");
  assert.equal(Logic.formatTanggalIndonesia("2026-01-05"), "5 Januari 2026");
  assert.equal(Logic.formatTanggalIndonesia(""), "-");
});

test("escapeHtml mencegah skrip ikut terbaca sebagai HTML", () => {
  const hasil = Logic.escapeHtml('<script>alert("x")</script>');
  assert.equal(hasil.includes("<script>"), false);
  assert.equal(hasil.includes("&lt;script&gt;"), true);
});

test("ringkasIsi memotong teks panjang", () => {
  assert.equal(Logic.ringkasIsi("pendek", 10), "pendek");
  assert.equal(Logic.ringkasIsi("abcdefghijkl", 5), "abcde...");
});

// ---------- URUTAN & RENDER ----------

test("urutanKegiatan menampilkan tanggal terbaru lebih dulu", () => {
  const data = [
    { id: 1, tanggal_kegiatan: "2026-10-01", created_at: "2026-10-01T08:00:00Z" },
    { id: 2, tanggal_kegiatan: "2026-11-17", created_at: "2026-11-17T08:00:00Z" },
    { id: 3, tanggal_kegiatan: "2026-11-17", created_at: "2026-11-17T09:00:00Z" },
  ];

  assert.deepEqual(
    Logic.urutanKegiatan(data).map((item) => item.id),
    [3, 2, 1]
  );
});

test("renderTabelKegiatan lolos dari injeksi HTML dan memuat tombol hapus", () => {
  const html = Logic.renderTabelKegiatan([
    {
      id: "42",
      judul_kumpulan: "<b>Judul</b>",
      tanggal_kegiatan: "2026-11-17",
      isi_kegiatan: "Isi & <script>alert(1)</script>",
      _pending: true,
    },
  ]);

  assert.equal(html.includes("<b>Judul</b>"), false);
  assert.equal(html.includes("&lt;b&gt;Judul&lt;/b&gt;"), true);
  assert.equal(html.includes("<script>"), false);
  assert.equal(html.includes("17 November 2026"), true);
  assert.equal(html.includes("data-hapus-kegiatan=\"42\""), true);
  assert.equal(html.includes("belum tersinkron"), true);
});

test("renderKartuKegiatan menghasilkan kartu untuk layar HP", () => {
  const html = Logic.renderKartuKegiatan([
    {
      id: "7",
      judul_kumpulan: "Kumpulan Akhir Bulan",
      tanggal_kegiatan: "2026-11-30",
      isi_kegiatan: "Evaluasi kegiatan bulanan.",
    },
  ]);

  assert.equal(html.includes("kegiatan-item"), true);
  assert.equal(html.includes("Kumpulan Akhir Bulan"), true);
  assert.equal(html.includes("30 November 2026"), true);
  assert.equal(html.includes("data-hapus-kegiatan=\"7\""), true);
});

// ---------- STRUKTUR FILE & ANTARMUKA ----------

test("halaman kegiatan tersedia tanpa Tailwind dan memuat field yang diminta", () => {
  const halaman = bacaFile("kegiatan.html");

  assert.equal(halaman.includes("cdn.tailwindcss"), false);
  assert.equal(halaman.includes("id=\"judul_kumpulan\""), true);
  assert.equal(halaman.includes("id=\"tanggal_kegiatan\""), true);
  assert.equal(halaman.includes("id=\"isi_kegiatan\""), true);
  assert.equal(halaman.includes("id=\"tabel-kegiatan-body\""), true);
  assert.equal(halaman.includes("id=\"kartu-kegiatan\""), true);
  assert.equal(halaman.includes("tombol-kirim"), true);
});

test("semua halaman petugas memiliki tautan menu Kegiatan", () => {
  const halaman = ["siswa.html", "tambah.html", "rekap.html", "users.html", "export.html"];
  halaman.forEach((nama) => {
    assert.equal(bacaFile(nama).includes('href="/kegiatan"'), true, nama + " belum punya menu Kegiatan");
  });
});

test("file baru tidak memakai emoji atau ikon", () => {
  const daftar = [
    "kegiatan.html",
    "assets/js/kegiatan-logic.js",
    "assets/js/kegiatan-page.js",
    "assets/css/style.css",
  ];
  const polaEmoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

  daftar.forEach((nama) => {
    assert.equal(polaEmoji.test(bacaFile(nama)), false, nama + " masih mengandung emoji");
  });
});

test("migrasi SQL untuk tabel kegiatan tersedia", () => {
  const sql = bacaFile("sql/tabel_kegiatan.sql").toLowerCase();
  assert.equal(sql.includes("create table if not exists public.tabel_kegiatan"), true);
  assert.equal(sql.includes("judul_kumpulan"), true);
  assert.equal(sql.includes("isi_kegiatan"), true);
  assert.equal(sql.includes("enable row level security"), true);
});
