// ==========================================================
// assets/js/kegiatan-logic.js
// Logika murni untuk fitur kegiatan kumpulan IRMA.
//
// File ini sengaja tidak menyentuh DOM atau Supabase supaya
// bisa diuji langsung dengan Node.js. Di browser, seluruh
// fungsi diekspos lewat window.KegiatanLogic.
// ==========================================================

(function (global) {
  "use strict";

  /** Daftar nama bulan dalam bahasa Indonesia (indeks 0 = Januari). */
  var NAMA_BULAN = [
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

  /**
   * Bersihkan nilai teks dari input form.
   * Null/undefined diubah menjadi string kosong agar aman diproses.
   */
  function bersihkanTeks(nilai) {
    return nilai === null || nilai === undefined ? "" : String(nilai).trim();
  }

  /**
   * Amankan teks sebelum disisipkan ke HTML.
   * Ini mencegah karakter <, >, &, tanda kutip menjadi tag/script.
   */
  function escapeHtml(nilai) {
    return bersihkanTeks(nilai)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /**
   * Cek apakah sebuah tanggal benar-benar ada.
   * Date.parse saja tidak cukup karena "2026-02-30" ikut dianggap valid.
   */
  function tanggalValid(nilai) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nilai)) return false;

    var bagian = nilai.split("-");
    var tahun = Number(bagian[0]);
    var bulan = Number(bagian[1]);
    var hari = Number(bagian[2]);
    var tanggal = new Date(Date.UTC(tahun, bulan - 1, hari));

    return (
      tanggal.getUTCFullYear() === tahun &&
      tanggal.getUTCMonth() === bulan - 1 &&
      tanggal.getUTCDate() === hari
    );
  }

  /**
   * Validasi isian form kegiatan.
   * Mengembalikan data yang sudah bersih beserta daftar error per field.
   */
  function validasiKegiatan(input) {
    var data = {
      judul_kumpulan: bersihkanTeks(input && input.judul_kumpulan),
      tanggal_kegiatan: bersihkanTeks(input && input.tanggal_kegiatan),
      isi_kegiatan: bersihkanTeks(input && input.isi_kegiatan),
    };
    var errors = {};

    if (!data.judul_kumpulan) {
      errors.judul_kumpulan = "Judul kumpulan wajib diisi.";
    } else if (data.judul_kumpulan.length > 150) {
      errors.judul_kumpulan = "Judul kumpulan maksimal 150 karakter.";
    }

    if (!data.tanggal_kegiatan) {
      errors.tanggal_kegiatan = "Tanggal kegiatan wajib diisi.";
    } else if (!tanggalValid(data.tanggal_kegiatan)) {
      errors.tanggal_kegiatan = "Tanggal kegiatan tidak valid.";
    }

    if (!data.isi_kegiatan) {
      errors.isi_kegiatan = "Isi kegiatan wajib diisi.";
    } else if (data.isi_kegiatan.length > 5000) {
      errors.isi_kegiatan = "Isi kegiatan maksimal 5000 karakter.";
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors: errors,
      data: data,
    };
  }

  /** Ambil pesan error pertama untuk ditampilkan ke pengguna. */
  function pesanPertama(errors) {
    var kunci = Object.keys(errors || {});
    return kunci.length > 0 ? errors[kunci[0]] : "";
  }

  /** Ubah "2026-11-17" menjadi "17 November 2026". */
  function formatTanggalIndonesia(nilai) {
    var tanggal = bersihkanTeks(nilai);
    if (!tanggalValid(tanggal)) return "-";

    var bagian = tanggal.split("-");
    var bulan = Number(bagian[1]) - 1;
    return Number(bagian[2]) + " " + NAMA_BULAN[bulan] + " " + bagian[0];
  }

  /** Potong isi panjang agar tabel tetap rapi. */
  function ringkasIsi(nilai, panjangMaksimal) {
    var teks = bersihkanTeks(nilai);
    var batas = panjangMaksimal || 100;
    if (teks.length <= batas) return teks;
    return teks.slice(0, batas).trimEnd() + "...";
  }

  /**
   * Urutkan kegiatan: tanggal terbaru lebih dulu.
   * Kalau tanggal sama, data yang terakhir dibuat tampil lebih atas.
   */
  function urutanKegiatan(daftar) {
    return (Array.isArray(daftar) ? daftar : []).slice().sort(function (a, b) {
      var tanggalA = bersihkanTeks(a.tanggal_kegiatan);
      var tanggalB = bersihkanTeks(b.tanggal_kegiatan);
      if (tanggalA !== tanggalB) return tanggalB.localeCompare(tanggalA);

      var buatA = bersihkanTeks(a.created_at);
      var buatB = bersihkanTeks(b.created_at);
      return buatB.localeCompare(buatA);
    });
  }

  /** Badge kecil untuk data yang belum berhasil disinkronkan. */
  function badgePending(item) {
    if (!item || !item._pending) return "";
    return ' <span class="kegiatan-badge">belum tersinkron</span>';
  }

  /** Baris tabel versi layar laptop. */
  function renderTabelKegiatan(daftar) {
    return urutanKegiatan(daftar)
      .map(function (item) {
        return (
          "<tr>" +
          '<td class="kegiatan-sel-utama">' +
          escapeHtml(item.judul_kumpulan || "-") +
          badgePending(item) +
          "</td>" +
          "<td>" +
          formatTanggalIndonesia(item.tanggal_kegiatan) +
          "</td>" +
          "<td>" +
          escapeHtml(ringkasIsi(item.isi_kegiatan || "-", 100)) +
          "</td>" +
          '<td class="kegiatan-sel-aksi">' +
          '<button type="button" class="kegiatan-tombol-hapus" data-hapus-kegiatan="' +
          escapeHtml(item.id) +
          '">Hapus</button>' +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  /** Kartu kegiatan versi layar HP. */
  function renderKartuKegiatan(daftar) {
    return urutanKegiatan(daftar)
      .map(function (item) {
        return (
          '<div class="kegiatan-item">' +
          '<div class="kegiatan-item-atas">' +
          '<p class="kegiatan-item-judul">' +
          escapeHtml(item.judul_kumpulan || "-") +
          badgePending(item) +
          "</p>" +
          '<button type="button" class="kegiatan-tombol-hapus" data-hapus-kegiatan="' +
          escapeHtml(item.id) +
          '">Hapus</button>' +
          "</div>" +
          '<p class="kegiatan-item-tanggal">Tanggal: ' +
          formatTanggalIndonesia(item.tanggal_kegiatan) +
          "</p>" +
          '<p class="kegiatan-item-isi">' +
          escapeHtml(ringkasIsi(item.isi_kegiatan || "-", 140)) +
          "</p>" +
          "</div>"
        );
      })
      .join("");
  }

  var api = {
    NAMA_BULAN: NAMA_BULAN,
    bersihkanTeks: bersihkanTeks,
    escapeHtml: escapeHtml,
    tanggalValid: tanggalValid,
    validasiKegiatan: validasiKegiatan,
    pesanPertama: pesanPertama,
    formatTanggalIndonesia: formatTanggalIndonesia,
    ringkasIsi: ringkasIsi,
    urutanKegiatan: urutanKegiatan,
    renderTabelKegiatan: renderTabelKegiatan,
    renderKartuKegiatan: renderKartuKegiatan,
  };

  // Ekspor untuk pengujian Node.js (CommonJS).
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  // Ekspor untuk halaman browser (script biasa, bukan module).
  if (global) {
    global.KegiatanLogic = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
