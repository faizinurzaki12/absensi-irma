// ==========================================================
// assets/js/laporan-logic.js
// Logika murni untuk rekap dokumen, Excel bulanan, dan ringkasan
// dashboard. Tidak menyentuh DOM/Supabase supaya mudah diuji.
// Di browser diekspos sebagai window.LaporanLogic.
// ==========================================================

(function (global) {
  "use strict";

  var NAMA_BULAN = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];

  /** Samakan nilai menjadi teks bersih. */
  function teks(nilai) {
    return nilai === null || nilai === undefined ? "" : String(nilai).trim();
  }

  /** Amankan teks sebelum masuk ke HTML dokumen. */
  function escapeHtml(nilai) {
    return teks(nilai)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /**
   * Cek apakah sebuah kelas termasuk jenjang yang diminta.
   * Regex dengan batas spasi/angka diakhir mencegah "XI" ikut
   * terhitung sebagai "X", dan "XII" ikut terhitung sebagai "XI".
   */
  function kelasTermasuk(kelas, target) {
    var nilai = teks(kelas).toUpperCase();
    if (target === "XII") return /^XII(\s|$|-)/.test(nilai);
    if (target === "XI") return /^XI(\s|$|-)/.test(nilai);
    if (target === "X") return /^X(\s|$|-)/.test(nilai);
    return false;
  }

  /** Gabungkan absensi dengan data siswa supaya nama & kelas tersedia. */
  function gabungkanAbsensiSiswa(absensiList, siswaList) {
    var petaSiswa = {};
    (Array.isArray(siswaList) ? siswaList : []).forEach(function (siswa) {
      petaSiswa[String(siswa.id)] = siswa;
    });

    return (Array.isArray(absensiList) ? absensiList : []).map(function (absensi) {
      var siswa = petaSiswa[String(absensi.siswa_id)] || {};
      return {
        nama_siswa: teks(siswa.nama_siswa || absensi.nama_siswa) || "Tanpa Nama",
        kelas: teks(siswa.kelas || absensi.kelas) || "-",
        tanggal_kegiatan: teks(absensi.tanggal_kegiatan || absensi.tanggal),
        status_kehadiran: teks(absensi.status_kehadiran || absensi.status),
        created_at: teks(absensi.created_at),
      };
    });
  }

  /** Cek apakah tanggal berada pada filter bulan "YYYY-MM". */
  function cocokBulan(tanggal, filterBulan) {
    if (!filterBulan) return true;
    return teks(tanggal).indexOf(filterBulan) === 0;
  }

  /** Label bulan Indonesia dari kunci "YYYY-MM". */
  function labelBulan(kunci) {
    var bagian = teks(kunci).split("-");
    var index = Number(bagian[1]) - 1;
    if (!bagian[0] || index < 0 || index > 11) return kunci || "-";
    return NAMA_BULAN[index] + " " + bagian[0];
  }

  /**
   * Format tanggal ringkas untuk aktivitas dashboard. Tanggal hari ini
   * ditampilkan sebagai "Hari ini" agar cap waktu ISO seperti
   * "2026-11-09T12:34:56" tidak muncul di layar.
   */
  function formatTanggalRingkas(nilai) {
    var sumber = teks(nilai);
    if (!sumber) return "-";

    var tahun;
    var bulan;
    var hari;

    if (sumber.indexOf("T") !== -1) {
      // Cap waktu ISO diubah ke tanggal lokal agar tidak bergeser sehari
      // ketika disimpan dalam UTC (misalnya "2026-11-08T17:30:00Z").
      var parsed = new Date(sumber);
      if (isNaN(parsed.getTime())) return "-";
      tahun = parsed.getFullYear();
      bulan = parsed.getMonth();
      hari = parsed.getDate();
    } else {
      var bagian = sumber.slice(0, 10).split("-");
      if (bagian.length !== 3) return "-";
      tahun = Number(bagian[0]);
      bulan = Number(bagian[1]) - 1;
      hari = Number(bagian[2]);
    }

    if (!tahun || bulan < 0 || bulan > 11 || !hari) return "-";

    var sekarang = new Date();
    var hariIni = Date.UTC(sekarang.getFullYear(), sekarang.getMonth(), sekarang.getDate());
    var tanggal = Date.UTC(tahun, bulan, hari);
    if (tanggal === hariIni) return "Hari ini";

    return hari + " " + NAMA_BULAN[bulan] + " " + tahun;
  }

  /** Ambil daftar bulan yang ada pada data, atau bulan yang sedang difilter. */
  function daftarBulan(absensiList, siswaList, filterBulan) {
    if (filterBulan) return [{ kunci: filterBulan, label: labelBulan(filterBulan) }];

    var kunci = {};
    gabungkanAbsensiSiswa(absensiList, siswaList).forEach(function (row) {
      var bulan = row.tanggal_kegiatan.slice(0, 7);
      if (bulan) kunci[bulan] = true;
    });

    return Object.keys(kunci).sort().map(function (item) {
      return { kunci: item, label: labelBulan(item) };
    });
  }

  /**
   * Cari siswa paling rajin (status Hadir terbanyak) untuk satu jenjang.
   * filterBulan boleh kosong untuk seluruh periode.
   */
  function hitungTerajin(absensiList, siswaList, targetKelas, filterBulan) {
    var rekap = {};

    gabungkanAbsensiSiswa(absensiList, siswaList).forEach(function (row) {
      if (!kelasTermasuk(row.kelas, targetKelas)) return;
      if (row.status_kehadiran.toLowerCase() !== "hadir") return;
      if (!cocokBulan(row.tanggal_kegiatan, filterBulan)) return;

      var kunci = row.nama_siswa + "|" + row.kelas;
      if (!rekap[kunci]) {
        rekap[kunci] = { nama: row.nama_siswa, kelas: row.kelas, total: 0 };
      }
      rekap[kunci].total += 1;
    });

    var daftar = Object.keys(rekap).map(function (kunci) {
      return rekap[kunci];
    });

    daftar.sort(function (a, b) {
      if (b.total !== a.total) return b.total - a.total;
      return a.nama.localeCompare(b.nama);
    });

    return daftar.length > 0 ? daftar[0] : null;
  }

  /**
   * Baris Excel sesuai permintaan TASKS.md: kolom pertama nama_siswa dan
   * kelas, berikutnya kehadiran_<YYYY-MM> untuk tiap bulan yang ada.
   * Bulan diambil dari filter bila ada, kalau tidak dari data yang ada.
   */
  function bangunBarisExcelKehadiran(absensiList, siswaList, filterBulan) {
    var kolomBulan = daftarBulan(absensiList, siswaList, filterBulan).map(function (item) {
      return "kehadiran_" + item.kunci;
    });
    var rekap = {};

    gabungkanAbsensiSiswa(absensiList, siswaList).forEach(function (row) {
      if (!cocokBulan(row.tanggal_kegiatan, filterBulan)) return;

      var kunci = row.nama_siswa + "|" + row.kelas;
      if (!rekap[kunci]) {
        rekap[kunci] = { nama_siswa: row.nama_siswa, kelas: row.kelas };
        kolomBulan.forEach(function (kolom) { rekap[kunci][kolom] = 0; });
      }

      var kolom = "kehadiran_" + row.tanggal_kegiatan.slice(0, 7);
      if (row.status_kehadiran.toLowerCase() === "hadir" && kolomBulan.indexOf(kolom) !== -1) {
        rekap[kunci][kolom] += 1;
      }
    });

    return Object.keys(rekap).map(function (kunci) { return rekap[kunci]; }).sort(function (a, b) {
      if (a.nama_siswa !== b.nama_siswa) return a.nama_siswa.localeCompare(b.nama_siswa);
      return String(a.kelas).localeCompare(String(b.kelas));
    });
  }

  /**
   * Susun dokumen Proker IRMA berawal dari struktur file
   "PROKER IRMA 2024.docx": pendahuluan, tujuan, sasaran, target,
   BAB II perencanaan dengan tabel kegiatan, lalu BAB III penutup.
   */
  function bangunDokumenProker(kegiatanList, opsi) {
    var pengaturan = opsi || {};
    var tahun = pengaturan.tahun || new Date().getFullYear();
    var daftar = Array.isArray(kegiatanList) ? kegiatanList : [];
    var grup = {};

    daftar.forEach(function (item) {
      var tanggal = teks(item.tanggal_kegiatan);
      var kunci = tanggal ? labelBulan(tanggal.slice(0, 7)) : "Tanpa Tanggal";
      if (!grup[kunci]) grup[kunci] = [];
      grup[kunci].push(item);
    });

    var bagianKegiatan = Object.keys(grup).map(function (namaBulan) {
      var baris = grup[namaBulan].map(function (item, index) {
        return (
          "<tr>" +
          "<td>" + (index + 1) + "</td>" +
          "<td>" + escapeHtml(item.judul_kumpulan) + "</td>" +
          "<td>" + escapeHtml(item.tanggal_kegiatan) + "</td>" +
          "<td>" + escapeHtml(item.isi_kegiatan).replace(/\n/g, "<br />") + "</td>" +
          "</tr>"
        );
      }).join("");

      return (
        "<h3>Rekap Kegiatan: " + escapeHtml(namaBulan) + "</h3>" +
        '<table border="1" cellpadding="6" cellspacing="0">' +
        "<thead><tr><th>No</th><th>Judul Kumpulan</th><th>Tanggal</th><th>Isi Kegiatan</th></tr></thead>" +
        "<tbody>" + baris + "</tbody></table>"
      );
    }).join("");

    if (!bagianKegiatan) {
      bagianKegiatan = "<p>Belum ada kegiatan yang tercatat.</p>";
    }

    return (
      "<!DOCTYPE html><html><head><meta charset='UTF-8' />" +
      "<title>Proker IRMA " + tahun + "</title>" +
      "<style>body{font-family:Arial,sans-serif;font-size:12pt;line-height:1.5;}" +
      "h1,h2,h3{text-align:center;}h2{text-align:left;margin-top:24px;}" +
      "table{width:100%;border-collapse:collapse;margin-bottom:16px;}" +
      "th,td{border:1px solid #000;padding:6px;vertical-align:top;}" +
      "th{background:#ecfdf5;}p{text-align:justify;}</style></head><body>" +
      "<h1>PROGRAM KERJA EKSTRAKURIKULER IRMA</h1>" +
      "<h1>SMK NEGERI 4 TASIKMALAYA</h1>" +
      "<h2>TAHUN " + tahun + "</h2>" +
      "<h2>Pendahuluan</h2>" +
      "<p>Dokumen ini disusun sebagai acuan pelaksanaan program kerja ekstrakurikuler Ikatan Remaja Masjid (IRMA). " +
      "Isian kegiatan di bawah ini diambil langsung dari data yang tercatat pada sistem absensi IRMA.</p>" +
      "<h2>Tujuan</h2>" +
      "<p>Mengembangkan potensi anggota, memperkuat koordinasi pengurus, serta menyediakan laporan kegiatan yang rapi dan dapat dipertanggungjawabkan.</p>" +
      "<h2>Sasaran</h2>" +
      "<p>Seluruh anggota ekstrakurikuler IRMA, pengurus, pembina, dan pemangku kepentingan di lingkungan sekolah.</p>" +
      "<h2>Indikator Keberhasilan (Target)</h2>" +
      "<p>Terencananya dan terlaksananya kegiatan IRMA, serta tersedianya rekap kehadiran dan dokumentasi setiap kegiatan.</p>" +
      "<h2>BAB II PERENCANAAN</h2>" +
      "<h2>Rencana Kegiatan</h2>" +
      bagianKegiatan +
      "<h2>Rencana Anggaran (Biaya)</h2>" +
      "<p>Menyesuaikan Rencana Kegiatan dan Anggaran Sekolah (RKAS) pada tahun berjalan.</p>" +
      "<h2>BAB III PENUTUP</h2>" +
      "<p>Program kerja ini menjadi pedoman pelaksanaan kegiatan dan dapat dikembangkan lebih lanjut sesuai kondisi sekolah.</p>" +
      "</body></html>"
    );
  }

  /** Ringkasan angka dan aktivitas terbaru untuk halaman dashboard. */
  function ringkasanSistem(data) {
    var sumber = data || {};
    var siswa = Array.isArray(sumber.siswa) ? sumber.siswa : [];
    var absensi = Array.isArray(sumber.absensi) ? sumber.absensi : [];
    var kegiatan = Array.isArray(sumber.kegiatan) ? sumber.kegiatan : [];
    var users = Array.isArray(sumber.users) ? sumber.users : [];

    var absensiLengkap = gabungkanAbsensiSiswa(absensi, siswa);

    var totalHadir = absensiLengkap.filter(function (item) {
      return item.status_kehadiran.toLowerCase() === "hadir";
    }).length;

    var aktivitas = [];
    absensiLengkap.forEach(function (item) {
      var hadir = item.status_kehadiran.toLowerCase() === "hadir";
      var waktu = teks(item.created_at || item.tanggal_kegiatan);

      // Nama dan kelas tetap jadi label; status kehadiran dipisah agar
      // mudah ditampilkan sebagai penanda di dashboard.
      aktivitas.push({
        waktu: waktu,
        tanggal: formatTanggalRingkas(waktu),
        label: item.nama_siswa + " (" + item.kelas + ")",
        status: hadir ? "Hadir" : "Tidak Hadir",
        hadir: hadir,
      });
    });
    kegiatan.forEach(function (item) {
      var waktu = teks(item.created_at || item.tanggal_kegiatan);
      aktivitas.push({
        waktu: waktu,
        tanggal: formatTanggalRingkas(waktu),
        label: "Kegiatan " + teks(item.judul_kumpulan),
        status: "",
        hadir: null,
      });
    });
    aktivitas.sort(function (a, b) { return b.waktu.localeCompare(a.waktu); });

    return {
      totalSiswa: siswa.length,
      totalAbsensi: absensi.length,
      totalHadir: totalHadir,
      totalKegiatan: kegiatan.length,
      totalPetugas: users.length,
      aktivitasTerbaru: aktivitas.slice(0, 8),
    };
  }

  var api = {
    NAMA_BULAN: NAMA_BULAN,
    teks: teks,
    escapeHtml: escapeHtml,
    kelasTermasuk: kelasTermasuk,
    gabungkanAbsensiSiswa: gabungkanAbsensiSiswa,
    cocokBulan: cocokBulan,
    labelBulan: labelBulan,
    formatTanggalRingkas: formatTanggalRingkas,
    daftarBulan: daftarBulan,
    hitungTerajin: hitungTerajin,
    bangunBarisExcelKehadiran: bangunBarisExcelKehadiran,
    bangunDokumenProker: bangunDokumenProker,
    ringkasanSistem: ringkasanSistem,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (global) {
    global.LaporanLogic = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
