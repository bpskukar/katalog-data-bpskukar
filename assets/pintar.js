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
    ["sahabat",    "Sahabat Data"]
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

  /* ------------------------------------------------------------ tanda */
  /* Satu-satunya gambar tanda PINTAR: gerbang di kotak gradasi jingga→biru.
     Dipakai bilah, beranda, ikon tab, dan gambar pratinjau — supaya persis sama
     di mana pun ukurannya. warna: 'gradasi' | kode warna (ikon tab situs). */
  function tanda(warna) {
    var isi = !warna || warna === "gradasi"
      ? '<defs><linearGradient id="pintarG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F0932B"/><stop offset="1" stop-color="#2E7BD6"/></linearGradient></defs><rect width="100" height="100" rx="24" fill="url(#pintarG)"/>'
      : '<rect width="100" height="100" rx="24" fill="' + warna + '"/>';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true">' + isi +
      '<path d="M22 82V46a28 28 0 0 1 56 0v36M40 82V60a10 10 0 0 1 20 0v22M14 82h72" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  /* ------------------------------------------------------------ bilah */
  var IKON = {
    bulan: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    surya: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    panah: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    unduh: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 21h16"/></svg>'
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
    ".pintar__tanda{width:22px;height:22px;border-radius:24%;display:block;flex-shrink:0;box-shadow:0 2px 6px rgba(0,0,0,.25)}" +
    ".pintar__tanda svg{display:block;width:100%;height:100%}" +
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
    ".pintar__pasang{display:none;background:#fff;color:#0F3B6E;border-color:#fff}" +
    ".pintar__pasang:hover{background:#EAF2FC}" +
    ".pintar.is-bisa-pasang .pintar__pasang{display:inline-flex}" +
    ":root[data-theme=dark] .pintar__pasang{background:#7AB4F2;color:#081A31;border-color:#7AB4F2}" +
    ".pintar__ios{position:absolute;right:16px;top:" + (TINGGI + 6) + "px;z-index:201;width:min(320px,calc(100vw - 32px));background:#fff;color:#1c2b3a;border-radius:14px;padding:14px 16px;" +
      "box-shadow:0 18px 40px rgba(0,0,0,.3);font-size:13px;line-height:1.55;display:none}" +
    ".pintar__ios.is-buka{display:block}" +
    ".pintar__ios b{display:block;margin-bottom:4px;font-size:13.5px}" +
    ".pintar__ios button{margin-top:8px;border:0;background:#EAF2FC;color:#0F3B6E;border-radius:8px;padding:6px 10px;font:600 12px inherit;font-family:inherit;cursor:pointer}" +
    ":root[data-theme=dark] .pintar__ios{background:#132A48;color:#E6EEF8}" +
    ":root[data-theme=dark] .pintar__ios button{background:#1E3F66;color:#fff}" +
    "@media (max-width:1120px){.pintar__merek small{display:none}}" +
    "@media (max-width:860px){" +
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
          '<span class="pintar__tanda">' + tanda() + "</span><b>PINTAR</b><span>Kukar</span>" +
          "<small>Pusat Informasi &amp; Layanan Statistik Terpadu</small></a>" +
        '<nav class="pintar__menu" id="pintarMenu" aria-label="Situs PINTAR Kukar">' + menu + "</nav>" +
        '<div class="pintar__kanan">' +
          '<button type="button" class="pintar__lain" id="pintarLain" aria-expanded="false" aria-controls="pintarMenu">Menu ' + IKON.panah + "</button>" +
          '<button type="button" class="pintar__tema pintar__pasang" id="pintarPasang" title="Pasang PINTAR Kukar sebagai aplikasi di perangkat ini">' + IKON.unduh + "<span>Pasang</span></button>" +
          '<button type="button" class="pintar__tema" id="pintarTema"></button>' +
          '<div class="pintar__ios" id="pintarIos" role="dialog" aria-label="Cara memasang di iPhone"><b>Pasang di iPhone/iPad</b>' +
            "Ketuk tombol <b style=\"display:inline\">Bagikan</b> (kotak dengan panah ke atas) di Safari, lalu pilih <b style=\"display:inline\">Tambahkan ke Layar Utama</b>. " +
            "PINTAR Kukar akan muncul seperti aplikasi.<br><button type=\"button\" id=\"pintarIosTutup\">Mengerti</button></div>" +
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

  /* ------------------------------------------------- aplikasi (PWA) */
  /* Manifest, ikon, dan service worker tinggal di repositori beranda (akar domain)
     sehingga satu pemasangan mencakup ketiga situs. Tag dipasang di sini bila
     halaman belum memuatnya sendiri. */
  var PWA = { manifest: "/manifest.webmanifest", sw: "/sw.js", ikonApple: "/assets/ikon/apple-touch-icon.png" };
  function tagKepala(tag, atribut) {
    var e = document.createElement(tag);
    Object.keys(atribut).forEach(function (k) { e.setAttribute(k, atribut[k]); });
    document.head.appendChild(e);
  }
  if (!document.querySelector('link[rel="manifest"]')) tagKepala("link", { rel: "manifest", href: PWA.manifest });
  if (!document.querySelector('link[rel="apple-touch-icon"]')) tagKepala("link", { rel: "apple-touch-icon", href: PWA.ikonApple });
  if (!document.querySelector('meta[name="apple-mobile-web-app-title"]')) tagKepala("meta", { name: "apple-mobile-web-app-title", content: "PINTAR Kukar" });
  if (!document.querySelector('meta[name="mobile-web-app-capable"]')) tagKepala("meta", { name: "mobile-web-app-capable", content: "yes" });

  var promptPasang = null;
  var terpasang = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  var iOS = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
  function bisaPasang() { return !terpasang && (!!promptPasang || iOS); }
  function perbaruiPasang() {
    var b = document.getElementById("pintarBilah");
    if (b) b.classList.toggle("is-bisa-pasang", bisaPasang());
    try { window.dispatchEvent(new CustomEvent("pintar:pasang", { detail: { bisa: bisaPasang(), ios: iOS && !promptPasang, terpasang: terpasang } })); } catch (e) { /* abaikan */ }
  }
  function pasangAplikasi() {
    if (promptPasang) {
      var p = promptPasang; promptPasang = null; perbaruiPasang();
      p.prompt();
      return p.userChoice.then(function (r) { if (r && r.outcome !== "accepted") { promptPasang = p; perbaruiPasang(); } return r; });
    }
    var ios = document.getElementById("pintarIos");
    if (ios) { ios.classList.add("is-buka"); }
    return Promise.resolve(null);
  }
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); promptPasang = e; perbaruiPasang(); });
  window.addEventListener("appinstalled", function () { terpasang = true; promptPasang = null; perbaruiPasang(); });
  document.addEventListener("click", function (e) {
    var ios = document.getElementById("pintarIos");
    if (e.target && e.target.id === "pintarPasang") { e.stopPropagation(); pasangAplikasi(); return; }
    if (e.target && e.target.id === "pintarIosTutup") { ios.classList.remove("is-buka"); return; }
    if (ios && ios.classList.contains("is-buka") && !ios.contains(e.target)) ios.classList.remove("is-buka");
  });
  if (document.body) perbaruiPasang(); else document.addEventListener("DOMContentLoaded", perbaruiPasang);

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register(PWA.sw, { scope: "/" }).catch(function () { /* mis. beranda belum terpasang */ });
    });
  }

  window.PINTAR = {
    NAMA: "PINTAR Kukar",
    KEPANJANGAN: "Pusat Informasi & Layanan Statistik Terpadu",
    TINGGI: TINGGI, TAUTAN: TAUTAN, situs: situs, tanda: tanda,
    tema: tema, setTema: function (t) { terapkan(t, true); }, balik: balik,
    bisaPasang: bisaPasang, pasang: pasangAplikasi, iOS: iOS, terpasang: function () { return terpasang; }
  };
})();
