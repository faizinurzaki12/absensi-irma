// ==========================================================
// assets/js/app.js
// Logika pendukung: status jaringan, notifikasi sinkron,
// dan export laporan ke Excel.
//
// Catatan: antrean offline & sinkronisasi CRUD sekarang
// ditangani secara generik oleh assets/js/offline-store.js
// (dipakai oleh tabel_siswa, tabel_absensi, dan tabel_users).
// ==========================================================

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
