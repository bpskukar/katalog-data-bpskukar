/* ============================================================================
   PINTAR Kukar — Pusat Informasi & Layanan Statistik Terpadu
   Bilah atas bersama + tema terang/gelap yang sinkron di seluruh situs.

   Berkas ini IDENTIK di tiga repositori:
     bpskukar.github.io                  (beranda pintu)
     indikator-strategis-bpskukar        (angka)
     katalog-data-bpskukar               (layanan PST)
   Bila diubah, salin ke ketiganya.

   Pemasangan (di <head>, sebelum stylesheet situs):
     <script src="assets/pintar.js" data-situs="katalog"></script>
   Nilai data-situs: pintu | indikator | katalog | konsultasi | sahabat | pegawai

   Cara kerja tema: pilihan disimpan di localStorage dengan kunci 'kukar-theme'.
   Ketiga situs berada di satu domain (bpskukar.github.io), jadi penyimpanan
   itu dibaca bersama — ganti tema di satu situs, situs lain ikut. Tab yang
   sedang terbuka ikut berubah lewat peristiwa 'storage'.
   ========================================================================== */
(function () {
  "use strict";
  var KUNCI = "kukar-theme", TINGGI = 38;
  var root = document.documentElement;
  var skrip = document.currentScript;
  var situs = (skrip && skrip.getAttribute("data-situs")) || "";
  var aktif = situs === "pegawai" ? "katalog" : situs;   // ruang pegawai = bagian situs katalog

  var TAUTAN = {
    pintu:      "/",
    indikator:  "/indikator-strategis-bpskukar/",
    katalog:    "/katalog-data-bpskukar/",
    konsultasi: "/katalog-data-bpskukar/konsultasi.html",
    sahabat:    "/katalog-data-bpskukar/sahabat.html",
    pegawai:    "/katalog-data-bpskukar/admin.html"
  };
  var MENU = [
    ["pintu",      "Beranda"],
    ["indikator",  "Indikator Strategis"],
    ["katalog",    "Katalog Data"],
    ["konsultasi", "Konsultasi Daring"],
    ["sahabat",    "Cek Tiket"]
  ];

  /* ------------------------------------------------------------ tema */
  function tersimpan() { try { return localStorage.getItem(KUNCI); } catch (e) { return null; } }
  function sistem() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function tema() { return root.getAttribute("data-theme") === "dark" ? "dark" : "light"; }
  function terapkan(t, simpan) {
    t = t === "dark" ? "dark" : "light";
    root.setAttribute("data-theme", t);
    if (simpan) { try { localStorage.setItem(KUNCI, t); } catch (e) { /* abaikan */ } }
    perbaruiTombol();
    try { window.dispatchEvent(new CustomEvent("pintar:tema", { detail: { tema: t } })); } catch (e) { /* peramban lama */ }
  }
  function balik() { terapkan(tema() === "dark" ? "light" : "dark", true); }

  /* dipasang sedini mungkin agar halaman tidak berkedip */
  root.style.setProperty("--pintar-h", TINGGI + "px");
  terapkan(tersimpan() || sistem(), false);

  window.addEventListener("storage", function (e) {
    if (e.key === KUNCI && e.newValue) terapkan(e.newValue, false);
  });
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var ikut = function () { if (!tersimpan()) terapkan(sistem(), false); };
    if (mq.addEventListener) mq.addEventListener("change", ikut); else if (mq.addListener) mq.addListener(ikut);
  }

  /* ------------------------------------------------------------ bilah */
  var IKON = {
    bulan: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    surya: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    gerbang: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V10a8 8 0 0 1 16 0v11"/><path d="M9 21v-6a3 3 0 0 1 6 0v6"/><path d="M2 21h20"/></svg>',
    panah: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>'
  };

  var CSS =
    ".pintar{position:sticky;top:0;z-index:200;height:" + TINGGI + "px;background:#0F3B6E;color:rgba(255,255,255,.82);" +
      "font-family:'Plus Jakarta Sans','Inter','Poppins',system-ui,-apple-system,'Segoe UI',sans-serif;font-size:12.5px;line-height:1;" +
      "box-shadow:0 1px 0 rgba(0,0,0,.18);-webkit-font-smoothing:antialiased}" +
    ":root[data-theme=dark] .pintar{background:#081A31;color:rgba(255,255,255,.78)}" +
    ".pintar *{box-sizing:border-box}" +
    ".pintar__in{max-width:1240px;margin-inline:auto;padding-inline:16px;height:100%;display:flex;align-items:center;gap:6px;position:relative}" +
    ".pintar__merek{display:inline-flex;align-items:center;gap:8px;color:#fff;text-decoration:none;padding:6px 8px 6px 2px;border-radius:8px;flex-shrink:0}" +
    ".pintar__merek:hover{background:rgba(255,255,255,.08)}" +
    ".pintar__tanda{width:22px;height:22px;border-radius:7px;display:grid;place-items:center;color:#fff;" +
      "background:linear-gradient(135deg,#F0932B 0%,#2E7BD6 100%);box-shadow:0 2px 6px rgba(0,0,0,.25)}" +
    ".pintar__merek b{font-weight:800;letter-spacing:.06em;font-size:12.5px}" +
    ".pintar__merek span{font-weight:600;color:rgba(255,255,255,.7);font-size:12.5px}" +
    ".pintar__merek small{font-weight:500;color:rgba(255,255,255,.55);font-size:11px;margin-left:6px;padding-left:10px;border-left:1px solid rgba(255,255,255,.22)}" +
    ".pintar__menu{display:flex;align-items:center;gap:2px;margin-left:8px}" +
    ".pintar__menu a{color:rgba(255,255,255,.82);text-decoration:none;font-weight:600;padding:7px 10px;border-radius:999px;white-space:nowrap;transition:background .15s,color .15s}" +
    ".pintar__menu a:hover{background:rgba(255,255,255,.12);color:#fff}" +
    ".pintar__menu a[aria-current=page]{background:#fff;color:#0F3B6E}" +
    ":root[data-theme=dark] .pintar__menu a[aria-current=page]{background:#7AB4F2;color:#081A31}" +
    ".pintar__kanan{margin-left:auto;display:flex;align-items:center;gap:6px}" +
    ".pintar__tema,.pintar__lain{height:28px;border-radius:999px;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.06);color:#fff;" +
      "cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:0 10px;font-size:12px;font-weight:600;font-family:inherit;transition:background .15s}" +
    ".pintar__tema:hover,.pintar__lain:hover{background:rgba(255,255,255,.16)}" +
    ".pintar__tema span{display:inline}" +
    ".pintar__lain{display:none}" +
    "@media (max-width:820px){" +
      ".pintar__merek small{display:none}" +
      ".pintar__menu{display:none;position:absolute;top:" + TINGGI + "px;right:8px;left:auto;min-width:220px;flex-direction:column;align-items:stretch;gap:2px;" +
        "background:#0F3B6E;padding:8px;border-radius:0 0 14px 14px;box-shadow:0 18px 40px rgba(0,0,0,.35);margin:0}" +
      ":root[data-theme=dark] .pintar__menu{background:#081A31}" +
      ".pintar.is-buka .pintar__menu{display:flex}" +
      ".pintar__menu a{padding:11px 12px;border-radius:9px;font-size:13.5px}" +
      ".pintar__lain{display:inline-flex}" +
      ".pintar__tema span{display:none}" +
      ".pintar__tema{width:30px;padding:0;justify-content:center}" +
    "}" +
    "@media print{.pintar{display:none}}";

  function perbaruiTombol() {
    var b = document.getElementById("pintarTema");
    if (!b) return;
    var gelap = tema() === "dark";
    b.innerHTML = (gelap ? IKON.surya : IKON.bulan) + "<span>" + (gelap ? "Terang" : "Gelap") + "</span>";
    b.setAttribute("aria-label", gelap ? "Aktifkan mode terang" : "Aktifkan mode gelap");
    b.title = b.getAttribute("aria-label");
  }

  function pasang() {
    if (document.getElementById("pintarBilah")) return;
    var gaya = document.createElement("style");
    gaya.id = "pintarGaya"; gaya.textContent = CSS;
    document.head.appendChild(gaya);

    var menu = MENU.map(function (m) {
      return '<a href="' + TAUTAN[m[0]] + '" data-s="' + m[0] + '"' + (m[0] === aktif ? ' aria-current="page"' : "") + ">" + m[1] + "</a>";
    }).join("");

    var b = document.createElement("div");
    b.className = "pintar"; b.id = "pintarBilah";
    b.setAttribute("role", "navigation"); b.setAttribute("aria-label", "PINTAR Kukar");
    b.innerHTML =
      '<div class="pintar__in">' +
        '<a class="pintar__merek" href="' + TAUTAN.pintu + '" title="PINTAR Kukar — Pusat Informasi & Layanan Statistik Terpadu">' +
          '<span class="pintar__tanda">' + IKON.gerbang + "</span><b>PINTAR</b><span>Kukar</span>" +
          "<small>Pusat Informasi &amp; Layanan Statistik Terpadu</small></a>" +
        '<nav class="pintar__menu" id="pintarMenu" aria-label="Situs PINTAR Kukar">' + menu + "</nav>" +
        '<div class="pintar__kanan">' +
          '<button type="button" class="pintar__lain" id="pintarLain" aria-expanded="false" aria-controls="pintarMenu">Layanan ' + IKON.panah + "</button>" +
          '<button type="button" class="pintar__tema" id="pintarTema"></button>' +
        "</div>" +
      "</div>";
    document.body.insertBefore(b, document.body.firstChild);
    perbaruiTombol();

    document.getElementById("pintarTema").addEventListener("click", balik);
    var lain = document.getElementById("pintarLain");
    lain.addEventListener("click", function (e) {
      e.stopPropagation();
      var buka = b.classList.toggle("is-buka");
      lain.setAttribute("aria-expanded", String(buka));
    });
    document.addEventListener("click", function (e) {
      if (b.classList.contains("is-buka") && !b.contains(e.target)) { b.classList.remove("is-buka"); lain.setAttribute("aria-expanded", "false"); }
    });
  }

  if (document.body) pasang(); else document.addEventListener("DOMContentLoaded", pasang);

  window.PINTAR = {
    NAMA: "PINTAR Kukar",
    KEPANJANGAN: "Pusat Informasi & Layanan Statistik Terpadu",
    TINGGI: TINGGI, TAUTAN: TAUTAN, situs: situs,
    tema: tema, setTema: function (t) { terapkan(t, true); }, balik: balik
  };
})();
