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
  var Laporan = window.LaporanLogic;

  // Semua kegiatan dari penyimpanan dipakai export dokumen agar hasil
  // pencarian tidak membatasi isi dokumen.
  var semuaKegiatanCache = [];

  // Salinan hasil pencarian yang sedang tampil, dipakai modal lihat/edit
  // tanpa menaruh JSON di atribut HTML.
  var daftarKegiatanCache = [];

  // Id kegiatan yang sedang menunggu konfirmasi pada modal hapus.
  var idHapusTertunda = null;

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

  /** Muat ulang semua kegiatan dari cache/server lalu render hasil filter. */
  async function muatDaftarKegiatan() {
    var data = typeof dbSelect === "function" ? await dbSelect("tabel_kegiatan") : [];
    semuaKegiatanCache = Logic.urutanKegiatan(data || []);
    renderDaftarKegiatan();
  }

  /** Render tabel dan kartu memakai kata kunci pencarian yang sedang aktif. */
  function renderDaftarKegiatan() {
    var tbody = elemen("tabel-kegiatan-body");
    var kartu = elemen("kartu-kegiatan");
    var jumlah = elemen("jumlah-kegiatan");
    var info = elemen("info-pencarian-kegiatan");
    var kolomCari = elemen("cari-kegiatan");
    if (!tbody || !kartu) return;

    var kata = kolomCari ? kolomCari.value : "";
    var sedangMencari = String(kata).trim().length > 0;
    var hasil = Logic.cariKegiatan(semuaKegiatanCache, kata);
    daftarKegiatanCache = hasil;

    if (jumlah) jumlah.textContent = semuaKegiatanCache.length;
    if (info) {
      info.textContent = sedangMencari
        ? hasil.length + " dari " + semuaKegiatanCache.length + " kegiatan cocok"
        : "";
      info.hidden = !sedangMencari;
    }

    if (hasil.length === 0) {
      var pesan =
        semuaKegiatanCache.length === 0
          ? "Belum ada kegiatan tersimpan."
          : "Tidak ada kegiatan yang cocok dengan pencarian.";
      tbody.innerHTML = '<tr><td colspan="4" class="kegiatan-kosong">' + pesan + "</td></tr>";
      kartu.innerHTML = '<p class="kegiatan-kosong">' + pesan + "</p>";
      return;
    }

    tbody.innerHTML = Logic.renderTabelKegiatan(hasil);
    kartu.innerHTML = Logic.renderKartuKegiatan(hasil);
  }

  /** Cari kegiatan dari cache memakai id yang ada pada tombol aksi. */
  function cariKegiatan(id) {
    return daftarKegiatanCache.find(function (item) {
      return String(item.id) === String(id);
    });
  }

  /** Buka dan tutup modal berdasarkan id elemen. */
  function bukaModal(idModal) {
    var modal = elemen(idModal);
    if (modal) modal.hidden = false;
  }

  function tutupModal(idModal) {
    var modal = elemen(idModal);
    if (modal) modal.hidden = true;
  }

  /** Isi modal lihat dengan detail kegiatan terpilih. */
  function tampilkanDetail(item) {
    if (!item) return;
    elemen("detail-judul").textContent = item.judul_kumpulan || "-";
    elemen("detail-tanggal").textContent = Logic.formatTanggalIndonesia(item.tanggal_kegiatan);
    elemen("detail-isi").textContent = item.isi_kegiatan || "-";
    bukaModal("modal-lihat");
  }

  /** Isi modal edit dengan data kegiatan terpilih. */
  function tampilkanEdit(item) {
    if (!item) return;
    elemen("edit_id").value = item.id;
    elemen("edit_judul_kumpulan").value = item.judul_kumpulan || "";
    elemen("edit_tanggal_kegiatan").value = item.tanggal_kegiatan || "";
    elemen("edit_isi_kegiatan").value = item.isi_kegiatan || "";
    bukaModal("modal-edit");
  }

  /** Susun dokumen Proker dari semua kegiatan yang tercatat. */
  function dokumenDariSemuaKegiatan() {
    return Laporan.bangunDokumenProker(semuaKegiatanCache, { tahun: new Date().getFullYear() });
  }

  /** Ubah HTML dokumen menjadi teks biasa untuk clipboard fallback. */
  function dokumenKeTeks(html) {
    var penampung = document.createElement("div");
    penampung.innerHTML = html;
    return (penampung.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
  }

  /**
   * Salin dokumen berformat ke clipboard, lalu buka halaman pembuatan
   * Google Dokumen. Pengguna tinggal menempel hasil salinan tersebut.
   */
  async function exportKeGoogleDokumen() {
    var html = dokumenDariSemuaKegiatan();
    var teks = dokumenKeTeks(html);

    try {
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new window.ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([teks], { type: "text/plain" }),
          }),
        ]);
      } else {
        var penampung = document.createElement("textarea");
        penampung.value = teks;
        document.body.appendChild(penampung);
        penampung.select();
        document.execCommand("copy");
        document.body.removeChild(penampung);
      }

      tampilkanPesan("Format dokumen tersalin. Tempelkan pada Google Dokumen yang terbuka.");
      window.open("https://docs.google.com/document/u/0/create", "_blank", "noopener");
    } catch (error) {
      tampilkanPesan("Gagal menyalin otomatis. Gunakan tombol unduh dokumen .doc.", "gagal");
    }
  }

  /** Unduh file .doc yang kompatibel dengan Word dan Google Dokumen. */
  function unduhDokumenDoc() {
    var tahun = new Date().getFullYear();
    var blob = new Blob([dokumenDariSemuaKegiatan()], { type: "application/msword" });
    var url = URL.createObjectURL(blob);
    var tautan = document.createElement("a");
    tautan.href = url;
    tautan.download = "proker_irma_" + tahun + ".doc";
    document.body.appendChild(tautan);
    tautan.click();
    document.body.removeChild(tautan);
    URL.revokeObjectURL(url);
    tampilkanPesan("Dokumen Proker IRMA berhasil diunduh.");
  }

  /**
   * Ubah tampilan tombol kirim saat data sedang dikirim.
   * Tombol langsung dinonaktifkan agar tidak bisa diklik dua kali,
   * lalu menampilkan spinner dan teks "Tunggu bentar....".
   */
  function aturTombolKirim(memuat) {
    var tombol = elemen("tombol-kirim");
    if (!tombol) return;

    if (memuat) {
      tombol.disabled = true;
      tombol.setAttribute("aria-busy", "true");
      tombol.innerHTML =
        '<span class="kegiatan-spinner" aria-hidden="true"></span> Tunggu bentar....';
      return;
    }

    tombol.disabled = false;
    tombol.removeAttribute("aria-busy");
    tombol.textContent = "Kirim Kegiatan";
  }

  /** Pasang semua event handler setelah pengguna terautentikasi. */
  function pasangHandler(session) {
    var form = elemen("form-kegiatan");

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      // Langsung beri umpan balik visual agar pengguna tidak mengirim dua kali.
      aturTombolKirim(true);

      try {
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
      } catch (error) {
        tampilkanPesan("Gagal menyimpan kegiatan. Silakan coba lagi.", "gagal");
      } finally {
        aturTombolKirim(false);
      }
    });

    // Satu handler untuk seluruh tombol aksi di tabel, kartu, dan modal.
    document.addEventListener("click", async function (event) {
      var target = event.target;

      var tombolTutup = target.closest("[data-tutup-modal]");
      if (tombolTutup) {
        var idModalDitutup = tombolTutup.getAttribute("data-tutup-modal");
        if (idModalDitutup === "modal-hapus") idHapusTertunda = null;
        tutupModal(idModalDitutup);
        return;
      }

      var tombolLihat = target.closest("[data-lihat-kegiatan]");
      if (tombolLihat) {
        tampilkanDetail(cariKegiatan(tombolLihat.getAttribute("data-lihat-kegiatan")));
        return;
      }

      var tombolEdit = target.closest("[data-edit-kegiatan]");
      if (tombolEdit) {
        tampilkanEdit(cariKegiatan(tombolEdit.getAttribute("data-edit-kegiatan")));
        return;
      }

      var tombolHapus = target.closest("[data-hapus-kegiatan]");
      if (!tombolHapus) return;

      var itemHapus = cariKegiatan(tombolHapus.getAttribute("data-hapus-kegiatan"));
      if (!itemHapus) return;

      idHapusTertunda = itemHapus.id;
      elemen("hapus-judul").textContent = itemHapus.judul_kumpulan || "-";
      bukaModal("modal-hapus");
    });

    // Konfirmasi hapus memakai modal, bukan konfirmasi bawaan browser.
    elemen("tombol-konfirmasi-hapus").addEventListener("click", async function () {
      if (!idHapusTertunda) return;

      await dbDelete("tabel_kegiatan", idHapusTertunda);
      idHapusTertunda = null;
      tutupModal("modal-hapus");
      tampilkanPesan("Kegiatan dihapus.");
      perbaruiInfoAntrean();
      await muatDaftarKegiatan();
    });

    // Simpan perubahan dari modal edit memakai lapisan offline-store.
    elemen("form-edit-kegiatan").addEventListener("submit", async function (event) {
      event.preventDefault();

      var hasil = Logic.validasiKegiatan({
        judul_kumpulan: elemen("edit_judul_kumpulan").value,
        tanggal_kegiatan: elemen("edit_tanggal_kegiatan").value,
        isi_kegiatan: elemen("edit_isi_kegiatan").value,
      });

      if (!hasil.valid) {
        tampilkanPesan(Logic.pesanPertama(hasil.errors), "gagal");
        return;
      }

      await dbUpdate("tabel_kegiatan", elemen("edit_id").value, hasil.data);
      tutupModal("modal-edit");
      tampilkanPesan("Perubahan kegiatan disimpan.");
      perbaruiInfoAntrean();
      await muatDaftarKegiatan();
    });

    // Pencarian langsung memfilter tampilan tanpa memuat ulang data.
    elemen("cari-kegiatan").addEventListener("input", renderDaftarKegiatan);

    // Tombol export dokumen: unduh .doc, salin ke Google Dokumen, atau keduanya.
    elemen("tombol-export-dokumen").addEventListener("click", unduhDokumenDoc);
    elemen("tombol-google-docs").addEventListener("click", exportKeGoogleDokumen);
    elemen("tombol-unduh-doc").addEventListener("click", unduhDokumenDoc);
    elemen("tombol-export-dokumen-hapus").addEventListener("click", unduhDokumenDoc);

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
