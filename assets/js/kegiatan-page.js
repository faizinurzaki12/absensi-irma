// ==========================================================
// assets/js/kegiatan-page.js
// Penghubung antara form kegiatan, penyimpanan data, dan tampilan.
//
// Bergantung pada script global yang sudah dimuat lebih dulu:
// - supabase-client.js : requireAuth()
// - offline-store.js   : dbSelect(), dbInsert(), dbDelete(),
//                        jumlahAntreanOffline(), prosesAntreanSinkronisasi()
// - kegiatan-logic.js  : window.KegiatanLogic
// ==========================================================

(function () {
  "use strict";

  var Logic = window.KegiatanLogic;

  /** Ambil elemen berdasarkan id. */
  function elemen(id) {
    return document.getElementById(id);
  }

  /** Tampilkan pesan di kotak notifikasi halaman. */
  function tampilkanPesan(teks, jenis) {
    var kotak = elemen("notifikasi-kegiatan");
    if (!kotak) return;
    kotak.textContent = teks || "";
    kotak.className = "kegiatan-notifikasi";
    if (teks) kotak.classList.add(jenis === "gagal" ? "gagal" : "berhasil");
  }

  /** Perbarui keterangan jumlah perubahan yang menunggu sinkron. */
  function perbaruiInfoAntrean() {
    var info = elemen("info-antrean");
    if (!info) return;
    var jumlah = typeof jumlahAntreanOffline === "function" ? jumlahAntreanOffline() : 0;
    if (jumlah > 0) {
      info.textContent = jumlah + " perubahan menunggu disinkronkan saat online.";
      info.hidden = false;
    } else {
      info.textContent = "";
      info.hidden = true;
    }
  }

  /** Tampilkan status koneksi tanpa memakai ikon atau emoji. */
  function perbaruiStatusJaringan() {
    var status = elemen("status-jaringan");
    if (!status) return;

    if (navigator.onLine) {
      status.textContent = "Online";
      status.className = "kegiatan-status";
      if (typeof prosesAntreanSinkronisasi === "function") {
        prosesAntreanSinkronisasi().then(function () {
          perbaruiInfoAntrean();
          muatDaftarKegiatan();
        });
      }
    } else {
      status.textContent = "Offline";
      status.className = "kegiatan-status offline";
    }
  }

  /** Muat ulang daftar kegiatan dari cache/server lalu render. */
  async function muatDaftarKegiatan() {
    var tbody = elemen("tabel-kegiatan-body");
    var kartu = elemen("kartu-kegiatan");
    var jumlah = elemen("jumlah-kegiatan");
    if (!tbody || !kartu) return;

    var data = typeof dbSelect === "function" ? await dbSelect("tabel_kegiatan") : [];
    var urut = Logic.urutanKegiatan(data || []);

    if (jumlah) jumlah.textContent = urut.length;

    if (urut.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="kegiatan-kosong">Belum ada kegiatan tersimpan.</td></tr>';
      kartu.innerHTML = '<p class="kegiatan-kosong">Belum ada kegiatan tersimpan.</p>';
      return;
    }

    tbody.innerHTML = Logic.renderTabelKegiatan(urut);
    kartu.innerHTML = Logic.renderKartuKegiatan(urut);
  }

  /** Pasang semua event handler setelah pengguna terautentikasi. */
  function pasangHandler(session) {
    var form = elemen("form-kegiatan");

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      var hasil = Logic.validasiKegiatan({
        judul_kumpulan: elemen("judul_kumpulan").value,
        tanggal_kegiatan: elemen("tanggal_kegiatan").value,
        isi_kegiatan: elemen("isi_kegiatan").value,
      });

      if (!hasil.valid) {
        tampilkanPesan(Logic.pesanPertama(hasil.errors), "gagal");
        return;
      }

      var payload = {
        judul_kumpulan: hasil.data.judul_kumpulan,
        tanggal_kegiatan: hasil.data.tanggal_kegiatan,
        isi_kegiatan: hasil.data.isi_kegiatan,
        user_id: session.user.id,
      };

      // Simpan lewat lapisan offline-store agar tetap bisa dipakai tanpa sinyal.
      await dbInsert("tabel_kegiatan", payload);

      form.reset();
      tampilkanPesan(
        navigator.onLine
          ? "Kegiatan berhasil disimpan."
          : "Kegiatan disimpan di perangkat dan akan dikirim saat online."
      );
      perbaruiInfoAntrean();
      await muatDaftarKegiatan();
    });

    // Satu handler untuk semua tombol hapus, baik di tabel maupun di kartu.
    document.addEventListener("click", async function (event) {
      var tombol = event.target.closest("[data-hapus-kegiatan]");
      if (!tombol) return;
      if (!window.confirm("Hapus kegiatan ini?")) return;

      await dbDelete("tabel_kegiatan", tombol.getAttribute("data-hapus-kegiatan"));
      tampilkanPesan("Kegiatan dihapus.");
      perbaruiInfoAntrean();
      await muatDaftarKegiatan();
    });

    window.addEventListener("online", perbaruiStatusJaringan);
    window.addEventListener("offline", perbaruiStatusJaringan);
  }

  /** Inisialisasi halaman. */
  async function init() {
    if (!Logic) {
      tampilkanPesan("Logika kegiatan gagal dimuat.", "gagal");
      return;
    }

    var session = await requireAuth();
    if (!session) return;

    perbaruiStatusJaringan();
    perbaruiInfoAntrean();
    await muatDaftarKegiatan();
    pasangHandler(session);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
