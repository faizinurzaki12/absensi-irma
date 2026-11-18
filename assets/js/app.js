// ==========================================================
// assets/js/app.js
// Logika pendukung: status jaringan, notifikasi sinkron,
// dan export laporan ke Excel.
//
// Catatan: antrean offline & sinkronisasi CRUD sekarang
// ditangani secara generik oleh assets/js/offline-store.js
// (dipakai oleh tabel_siswa, tabel_absensi, dan tabel_users).
// ==========================================================

// ---------- PENCARIAN REKAP ABSENSI ----------
const NAMA_BULAN_REKAP = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

/** Ubah nilai apa pun menjadi teks aman untuk diproses. */
function teksRekap(nilai) {
  return nilai === null || nilai === undefined ? "" : String(nilai);
}

/** Ubah "2026-11-17" menjadi "17 November 2026". */
function formatTanggalIndonesiaRekap(nilai) {
  const bagian = teksRekap(nilai).slice(0, 10).split("-");
  if (bagian.length !== 3) return "";

  const index = Number(bagian[1]) - 1;
  if (!bagian[0] || index < 0 || index > 11 || !bagian[2]) return "";
  return Number(bagian[2]) + " " + NAMA_BULAN_REKAP[index] + " " + bagian[0];
}

/**
 * Cari data rekap berdasarkan tanggal (mentah maupun format Indonesia),
 * nama siswa, kelas, dan status kehadiran. Beberapa kata kunci harus
 * semuanya cocok, sehingga pengguna bisa menggabungkan misalnya
 * nama siswa dan status dalam satu pencarian.
 */
function cariRekapAbsensi(data, kataKunci) {
  const daftar = Array.isArray(data) ? data.slice() : [];
  const kunci = teksRekap(kataKunci).trim().toLowerCase();
  const urutTanggal = (a, b) =>
    teksRekap(b.tanggal_kegiatan).localeCompare(teksRekap(a.tanggal_kegiatan));

  if (!kunci) return daftar.sort(urutTanggal);

  const kata = kunci.split(/\s+/);
  return daftar
    .filter((item) => {
      const siswa = item && item.tabel_siswa ? item.tabel_siswa : {};
      const gabungan = [
        item && item.tanggal_kegiatan,
        formatTanggalIndonesiaRekap(item && item.tanggal_kegiatan),
        siswa.nama_siswa,
        siswa.kelas,
        item && item.status_kehadiran,
      ]
        .map(teksRekap)
        .join(" ")
        .toLowerCase();

      return kata.every((bagian) => gabungan.indexOf(bagian) !== -1);
    })
    .sort(urutTanggal);
}

// ---------- STATUS JARINGAN ----------
function initNetworkStatus(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;

  async function update() {
    if (navigator.onLine) {
      el.textContent = "🌐 Online";
      el.className = "text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full";
      if (typeof prosesAntreanSinkronisasi === "function") await prosesAntreanSinkronisasi();
    } else {
      el.textContent = "📴 Offline - perubahan disimpan sementara di perangkat";
      el.className = "text-sm font-semibold text-red-600 bg-red-50 px-3 py-1 rounded-full";
    }
  }

  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  update();
}

function tampilkanNotifikasiSync(pesan) {
  const box = document.getElementById("sync-notif");
  if (!box) return;
  box.textContent = "✅ " + pesan;
  box.classList.remove("hidden");
  setTimeout(() => box.classList.add("hidden"), 4000);
}

// ---------- EXPORT EXCEL (.xlsx) ----------
function unduhExcel(namaFile, dataAbsensi) {
  const formattedData = dataAbsensi.map((item, index) => ({
    No: index + 1,
    Tanggal: item.tanggal_kegiatan || "-",
    "Nama Siswa": item.tabel_siswa?.nama_siswa || "-",
    Kelas: item.tabel_siswa?.kelas || "-",
    "Status Kehadiran": item.status_kehadiran || "-",
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Absensi");

  worksheet["!cols"] = [
    { wch: 6 }, // No
    { wch: 15 }, // Tanggal
    { wch: 25 }, // Nama Siswa
    { wch: 12 }, // Kelas
    { wch: 18 }, // Status Kehadiran
  ];

  XLSX.writeFile(workbook, namaFile);
}

// Ekspor untuk pengujian Node.js. Di browser fungsi di atas tetap
// tersedia sebagai variabel global karena app.js dimuat sebagai script biasa.
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    cariRekapAbsensi: cariRekapAbsensi,
    formatTanggalIndonesiaRekap: formatTanggalIndonesiaRekap,
  };
}
