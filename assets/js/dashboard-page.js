// ==========================================================
// assets/js/dashboard-page.js
// Menampilkan ringkasan keseluruhan sistem: jumlah data, siswa
// paling rajin XII/X, dan aktivitas terbaru.
// ==========================================================

(function () {
  "use strict";

  var Laporan = window.LaporanLogic;

  /** Ambil elemen berdasarkan id. */
  function elemen(id) {
    return document.getElementById(id);
  }

  /** Tampilkan status koneksi dengan teks biasa. */
  function perbaruiStatusJaringan() {
    var status = elemen("status-jaringan");
    if (!status) return;
    status.textContent = navigator.onLine ? "Online" : "Offline";
    status.className = navigator.onLine ? "kegiatan-status" : "kegiatan-status offline";
  }

  /** Tampilkan satu baris siswa paling rajin atau pesan kosong. */
  function tampilkanTerajin(idElemen, hasil) {
    var target = elemen(idElemen);
    if (!target) return;
    target.textContent = hasil
      ? hasil.nama + " (" + hasil.kelas + ") - " + hasil.total + "x Hadir"
      : "Belum ada data kehadiran.";
  }

  /** Render daftar aktivitas terbaru ke dalam panel. */
  function renderAktivitas(daftar) {
    var wadah = elemen("dashboard-aktivitas");
    if (!wadah) return;

    if (!daftar || daftar.length === 0) {
      wadah.innerHTML = '<p class="dashboard-kosong">Belum ada aktivitas tercatat.</p>';
      return;
    }

    wadah.innerHTML = daftar
      .map(function (item) {
        return (
          '<div class="dashboard-item">' +
          '<span class="dashboard-item-label">' + Laporan.escapeHtml(item.label) + "</span>" +
          '<span class="dashboard-item-waktu">' + Laporan.escapeHtml(item.tanggal || "-") + "</span>" +
          "</div>"
        );
      })
      .join("");
  }

  /** Muat semua tabel lalu isi dashboard. */
  async function init() {
    var session = await requireAuth();
    if (!session) return;

    perbaruiStatusJaringan();
    window.addEventListener("online", perbaruiStatusJaringan);
    window.addEventListener("offline", perbaruiStatusJaringan);

    var hasil = await Promise.all([
      dbSelect("tabel_siswa"),
      dbSelect("tabel_absensi"),
      dbSelect("tabel_kegiatan"),
      dbSelect("tabel_users"),
    ]);

    var siswa = hasil[0] || [];
    var absensi = hasil[1] || [];
    var kegiatan = hasil[2] || [];
    var users = hasil[3] || [];

    var ringkas = Laporan.ringkasanSistem({
      siswa: siswa,
      absensi: absensi,
      kegiatan: kegiatan,
      users: users,
    });

    elemen("angka-siswa").textContent = ringkas.totalSiswa;
    elemen("angka-absensi").textContent = ringkas.totalAbsensi;
    elemen("angka-hadir").textContent = ringkas.totalHadir;
    elemen("angka-kegiatan").textContent = ringkas.totalKegiatan;
    elemen("angka-petugas").textContent = ringkas.totalPetugas;

    tampilkanTerajin("dashboard-top-xii", Laporan.hitungTerajin(absensi, siswa, "XII", ""));
    tampilkanTerajin("dashboard-top-x", Laporan.hitungTerajin(absensi, siswa, "X", ""));
    renderAktivitas(ringkas.aktivitasTerbaru);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
