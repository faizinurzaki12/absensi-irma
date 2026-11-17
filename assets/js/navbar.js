// ==========================================================
// assets/js/navbar.js
// Menyusun navbar menjadi tab bar bawah di layar handphone.
// Empat menu utama tetap terlihat; menu sisanya dipindahkan ke
// dropdown "Lainnya" yang terbuka ke atas (tanpa scroll horizontal).
// ==========================================================

(function () {
  "use strict";

  var MENU_UTAMA = ["Dashboard", "Siswa", "Kegiatan", "Export"];
  var penghitung = 0;

  /** Ambil teks bersih dari sebuah elemen navigasi. */
  function teksElemen(elemen) {
    return (elemen.textContent || "").replace(/\s+/g, " ").trim();
  }

  /** Tutup dropdown dan kembalikan status tombolnya. */
  function tutupDropdown(tombol, dropdown) {
    if (!dropdown || !tombol) return;
    dropdown.classList.remove("buka");
    tombol.setAttribute("aria-expanded", "false");
  }

  /** Buka/tutup dropdown saat tombol "Lainnya" ditekan. */
  function pasangTombol(nav, tombol, dropdown) {
    tombol.addEventListener("click", function (event) {
      event.stopPropagation();
      var akanDibuka = !dropdown.classList.contains("buka");

      document.querySelectorAll(".tabbar-dropdown.buka").forEach(function (dropdownLain) {
        dropdownLain.classList.remove("buka");
        var tombolLain = document.querySelector('[aria-controls="' + dropdownLain.id + '"]');
        if (tombolLain) tombolLain.setAttribute("aria-expanded", "false");
      });

      dropdown.classList.toggle("buka", akanDibuka);
      tombol.setAttribute("aria-expanded", akanDibuka ? "true" : "false");
    });

    dropdown.addEventListener("click", function (event) {
      event.stopPropagation();
      if (event.target.closest("a, button")) tutupDropdown(tombol, dropdown);
    });

    nav.setAttribute("data-tabbar-siap", "true");
  }

  /** Susun ulang satu elemen <nav>. */
  function susunNavbar(nav) {
    if (!nav || nav.getAttribute("data-tabbar-siap") === "true") return;

    var dropdown = document.createElement("div");
    dropdown.className = "tabbar-dropdown";
    penghitung += 1;
    dropdown.id = "menu-lainnya-" + penghitung;

    Array.prototype.slice.call(nav.children).forEach(function (item) {
      if (MENU_UTAMA.indexOf(teksElemen(item)) === -1) {
        dropdown.appendChild(item);
      }
    });

    // Tidak ada menu tambahan -> tab bar cukup memakai menu utama.
    if (dropdown.children.length === 0) return;

    var tombol = document.createElement("button");
    tombol.type = "button";
    tombol.className = "tabbar-menu";
    tombol.setAttribute("aria-expanded", "false");
    tombol.setAttribute("aria-controls", dropdown.id);
    tombol.setAttribute("aria-label", "Buka menu lainnya");
    tombol.innerHTML =
      '<span class="tabbar-menu-ikon" aria-hidden="true"></span>' +
      "<span>Lainnya</span>";

    nav.appendChild(tombol);
    nav.appendChild(dropdown);
    pasangTombol(nav, tombol, dropdown);
  }

  /** Klik di luar dropdown atau tombol Esc menutup menu. */
  function pasangPenutupGlobal() {
    document.addEventListener("click", function () {
      document.querySelectorAll(".tabbar-dropdown.buka").forEach(function (dropdown) {
        var tombol = document.querySelector('[aria-controls="' + dropdown.id + '"]');
        tutupDropdown(tombol, dropdown);
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      document.querySelectorAll(".tabbar-dropdown.buka").forEach(function (dropdown) {
        var tombol = document.querySelector('[aria-controls="' + dropdown.id + '"]');
        tutupDropdown(tombol, dropdown);
      });
    });
  }

  function init() {
    document.querySelectorAll("nav.kegiatan-nav, nav.nav-scroll").forEach(susunNavbar);
    pasangPenutupGlobal();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
