/* ============================================================================
   Pemuat Asisten PST untuk situs di luar katalog (beranda PINTAR, Indikator
   Strategis). Memasang tombol "Tanya PST" seketika, lalu memuat mesin asisten
   (katalog, pencocokan, pengetahuan, glosarium, lapisan data, chat.js) dari
   situs katalog — satu domain — saat pertama dibutuhkan atau saat peramban senggang.

   Pemasangan di halaman lain:
     <script src="/katalog-data-bpskukar/assets/asisten.js" defer></script>
   Tombol/tautan mana pun dengan data-tanya="pertanyaan" akan membuka asisten.
   ========================================================================== */
(function () {
  "use strict";
  if (window.ASISTEN_PEMUAT) return;
  var skripIni = document.currentScript;
  var DASAR = (skripIni && skripIni.src && skripIni.src.replace(/assets\/asisten\.js.*$/, "")) || "/katalog-data-bpskukar/";
  var janji = null;

  function tagCss() {
    if (document.querySelector('link[href$="asisten.css"]')) return;
    var l = document.createElement("link"); l.rel = "stylesheet"; l.href = DASAR + "assets/asisten.css";
    document.head.appendChild(l);
  }
  function muatSkrip(src) {
    return new Promise(function (ok, gagal) {
      var s = document.createElement("script"); s.src = src; s.async = false;
      s.onload = ok; s.onerror = function () { gagal(new Error("gagal memuat " + src)); };
      document.head.appendChild(s);
    });
  }
  /* [pengecekan sudah ada, sumber] — berurutan */
  var URUTAN = [
    [function () { return !!window.supabase; }, "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js", true],
    [function () { return !!window.KONFIG; }, DASAR + "assets/config.js"],
    [function () { return !!window.KATALOG; }, DASAR + "assets/katalog.js"],
    [function () { return !!window.CARI; }, DASAR + "assets/cari.js"],
    [function () { return !!window.PENGETAHUAN; }, DASAR + "assets/pengetahuan.js"],
    [function () { return !!window.GLOSARIUM; }, DASAR + "assets/glosarium.js"],
    [function () { return !!window.PST; }, DASAR + "assets/app.js"],
    [function () { return !!window.ASISTEN; }, DASAR + "assets/chat.js"]
  ];
  function muat() {
    if (window.ASISTEN) return Promise.resolve();
    if (janji) return janji;
    janji = URUTAN.reduce(function (p, k) {
      return p.then(function () {
        if (k[0]()) return null;
        return muatSkrip(k[1]).catch(function (e) { if (!k[2]) throw e; /* pustaka luar boleh gagal: mode demo */ });
      });
    }, Promise.resolve()).then(function () {
      var awal = document.getElementById("cbAwal"); if (awal) awal.remove();
    }).catch(function (e) {
      janji = null;
      var b = document.getElementById("cbBukaAwal");
      if (b) { b.disabled = false; b.querySelector("span").textContent = "Tanya PST"; }
      throw e;
    });
    return janji;
  }

  function tombolAwal() {
    if (document.getElementById("cbAwal") || window.ASISTEN) return;
    var w = document.createElement("div");
    w.className = "cb cb--awal"; w.id = "cbAwal";
    w.innerHTML = '<button type="button" class="cb__tombol" id="cbBukaAwal" aria-label="Buka asisten PST">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.2A8 8 0 1 1 21 12z"/></svg>' +
      "<span>Tanya PST</span></button>";
    document.body.appendChild(w);
    document.getElementById("cbBukaAwal").onclick = function () {
      var b = this; b.disabled = true; b.querySelector("span").textContent = "Memuat…";
      muat().then(function () { if (window.ASISTEN) window.ASISTEN.buka(); })
        .catch(function () { b.disabled = false; b.querySelector("span").textContent = "Tanya PST"; alert("Asisten belum bisa dimuat. Periksa sambungan, lalu coba lagi."); });
    };
  }
  /* tautan data-tanya yang diklik sebelum mesin termuat: muat dulu, lalu tanyakan */
  document.addEventListener("click", function (e) {
    if (window.ASISTEN) return;                       /* chat.js sudah menangani */
    var b = e.target.closest("[data-tanya]"); if (!b) return;
    e.preventDefault();
    var t = b.getAttribute("data-tanya") || "";
    muat().then(function () { if (window.ASISTEN) { if (t) window.ASISTEN.tanya(t); else window.ASISTEN.buka(); } });
  });

  function mulai() {
    tagCss();
    tombolAwal();
    if (/[?&]tanya=/.test(location.search) || location.hash === "#tanya") { muat(); return; }
    /* muat di belakang layar saat senggang agar klik pertama seketika */
    if ("requestIdleCallback" in window) window.requestIdleCallback(function () { muat().catch(function () {}); }, { timeout: 8000 });
    else setTimeout(function () { muat().catch(function () {}); }, 5000);
  }
  window.ASISTEN_PEMUAT = { muat: muat, dasar: DASAR };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mulai); else mulai();
})();
