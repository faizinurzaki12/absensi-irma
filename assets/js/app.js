// ==========================================================
// assets/js/app.js
// Logika pendukung: status jaringan & offline sync absensi
// ==========================================================

const OFFLINE_KEY = "irma_absensi_offline";

// ---------- STATUS JARINGAN ----------
function initNetworkStatus(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;

  async function update() {
    if (navigator.onLine) {
      el.textContent = "🌐 Online";
      el.className = "text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full";
      await syncOfflineAbsensi();
    } else {
      el.textContent = "📴 Offline - data akan disimpan sementara";
      el.className = "text-sm font-semibold text-red-600 bg-red-50 px-3 py-1 rounded-full";
    }
  }

  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  update();
}

// ---------- ANTREAN OFFLINE (localStorage) ----------
function getOfflineQueue() {
  const raw = localStorage.getItem(OFFLINE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveOfflineQueue(queue) {
  localStorage.setItem(OFFLINE_KEY, JSON.stringify(queue));
}

function tambahKeAntreanOffline(item) {
  const queue = getOfflineQueue();
  // Memastikan siswa_id dikonversi ke Angka sebelum masuk antrean
  const cleanItem = {
    ...item,
    siswa_id: parseInt(item.siswa_id, 10),
    _localId: Date.now() + Math.random(),
  };
  queue.push(cleanItem);
  saveOfflineQueue(queue);
}

/**
 * Dipanggil saat koneksi kembali online.
 * Mengirim semua data absensi yang tertunda ke Supabase satu per satu.
 */
async function syncOfflineAbsensi() {
  const queue = getOfflineQueue();
  if (queue.length === 0) {
    if (typeof perbaruiInfoAntrean === "function") perbaruiInfoAntrean();
    return;
  }

  const sisaGagal = [];

  for (const item of queue) {
    const { _localId, ...payload } = item;

    // Proteksi Tambahan: Pastikan siswa_id berupa Angka
    payload.siswa_id = parseInt(payload.siswa_id, 10);

    // Jika siswa_id bukan angka valid (misal NaN akibat string "siswa_id" lama), buang data tsb
    if (isNaN(payload.siswa_id)) {
      console.warn("Data tidak valid dibuang dari antrean:", item);
      continue;
    }

    const { error } = await supabase.from("tabel_absensi").insert(payload);
    if (error) {
      console.error("Gagal sinkron item:", error.message);
      sisaGagal.push(item);
    }
  }

  saveOfflineQueue(sisaGagal);

  // Perbarui tampilan antrean di UI (agar alert kuning hilang)
  if (typeof perbaruiInfoAntrean === "function") {
    perbaruiInfoAntrean();
  }

  if (sisaGagal.length === 0 && queue.length > 0) {
    tampilkanNotifikasiSync(`${queue.length} data absensi berhasil disinkronkan.`);
  }
}

function tampilkanNotifikasiSync(pesan) {
  const box = document.getElementById("sync-notif");
  if (!box) return;
  box.textContent = "✅ " + pesan;
  box.classList.remove("hidden");
  setTimeout(() => box.classList.add("hidden"), 4000);
}

function jumlahAntreanOffline() {
  return getOfflineQueue().length;
}

// ---------- EXPORT EXCEL (.xlsx) ----------
function unduhExcel(namaFile, dataAbsensi) {
  // 1. Format data menjadi array of objects untuk worksheet
  const formattedData = dataAbsensi.map((item, index) => ({
    No: index + 1,
    Tanggal: item.tanggal_kegiatan || "-",
    "Nama Siswa": item.tabel_siswa?.nama_siswa || "-",
    Kelas: item.tabel_siswa?.kelas || "-",
    "Status Kehadiran": item.status_kehadiran || "-",
  }));

  // 2. Buat Worksheet & Workbook baru
  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Absensi");

  // 3. Atur lebar kolom otomatis agar rapi
  const colWidths = [
    { wch: 6 }, // No
    { wch: 15 }, // Tanggal
    { wch: 25 }, // Nama Siswa
    { wch: 12 }, // Kelas
    { wch: 18 }, // Status Kehadiran
  ];
  worksheet["!cols"] = colWidths;

  // 4. Unduh file .xlsx
  XLSX.writeFile(workbook, namaFile);
}
