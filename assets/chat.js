/* ============================================================================
   Asisten PST — chatbot berbasis katalog + basis pengetahuan.
   Tidak memakai model bahasa: setiap jawaban berasal dari assets/katalog.js
   atau assets/pengetahuan.js, sehingga tidak pernah mengarang angka.
   Dipasang di semua halaman lewat <script src="assets/chat.js">.
   ========================================================================== */
(function () {
  "use strict";
  if (!window.PST || !window.CARI || !window.PENGETAHUAN) return;
  var esc = PST.esc, K = window.KATALOG;
  var petugas = false, kodeTunggu = null, riwayat = [];

  /* ------------------------------------------------------------ tampilan */
  var wadah = document.createElement("div");
  wadah.className = "cb";
  wadah.innerHTML =
    '<button class="cb__tombol" id="cbBuka" aria-label="Buka asisten PST">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.2A8 8 0 1 1 21 12z"/></svg>' +
      '<span>Tanya PST</span></button>' +
    '<section class="cb__panel" id="cbPanel" hidden aria-label="Asisten PST">' +
      '<header class="cb__kepala"><div><b>Asisten PST</b><span>menjawab dari katalog, bukan mengarang</span></div>' +
        '<button class="cb__tutup" id="cbTutup" aria-label="Tutup">×</button></header>' +
      '<div class="cb__isi" id="cbIsi"></div>' +
      '<div class="cb__chips" id="cbChips"></div>' +
      '<form class="cb__form" id="cbForm"><input type="text" id="cbInput" placeholder="Tulis pertanyaan…" autocomplete="off" maxlength="300">' +
        '<button class="btn btn--sm" type="submit">Kirim</button></form>' +
    '</section>';
  document.body.appendChild(wadah);

  var isi = document.getElementById("cbIsi"), chips = document.getElementById("cbChips");
  var input = document.getElementById("cbInput"), panel = document.getElementById("cbPanel");

  function gulir() { isi.scrollTop = isi.scrollHeight; }
  function pesanku(t) {
    isi.innerHTML += '<div class="cb__p cb__p--saya">' + esc(t) + "</div>"; gulir();
  }
  function pesanBot(html, chipsBaru) {
    isi.innerHTML += '<div class="cb__p cb__p--bot">' + html + "</div>"; gulir();
    setChips(chipsBaru || []);
  }
  function setChips(daftar) {
    chips.innerHTML = daftar.map(function (c) {
      return '<button type="button" class="cb__chip" data-q="' + esc(c[1] || c[0]) + '"' + (c[2] ? ' data-id="' + esc(c[2]) + '"' : "") + ">" + esc(c[0]) + "</button>";
    }).join("");
  }
  chips.addEventListener("click", function (e) {
    var b = e.target.closest(".cb__chip"); if (!b) return;
    kirim(b.dataset.q, b.dataset.id);
  });

  function tautanHtml(ln) {
    if (!ln || !ln.length) return "";
    return '<div class="cb__ln">' + ln.map(function (x) {
      var luar = /^https?:/.test(x.u);
      return '<a href="' + esc(x.u) + '"' + (luar ? ' target="_blank" rel="noopener"' : "") + ">" + esc(x.l) + "</a>";
    }).join("") + "</div>";
  }

  /* ------------------------------------------------------------- otak */
  var CHIPS_AWAL = [
    ["Data apa yang tersedia sampai desa?", "data apa saja yang tersedia sampai level desa"],
    ["Cara minta data", "bagaimana cara meminta data"],
    ["Cek status tiket", "cek status tiket saya"],
    ["Konsultasi lewat Zoom", "bisa konsultasi online lewat zoom?"],
    ["Jam & lokasi PST", "jam layanan dan alamat PST"]
  ];
  var CHIPS_PETUGAS = [
    ["Alur melayani", "alur baku melayani sahabat data", "petugas-alur"],
    ["Kalimat penolakan", "kalimat baku saat menolak", "petugas-tolak"],
    ["Beda BPS vs Dukcapil", "kenapa beda dengan dukcapil", "dukcapil"],
    ["Kenapa tak ada per kecamatan", "kenapa tidak ada kemiskinan per kecamatan", "kecamatan"]
  ];
  var CHIPS_LANJUT = [
    ["Ajukan konsultasi daring", "bisa konsultasi online lewat zoom?"],
    ["Cara minta data", "bagaimana cara meminta data"],
    ["Cek status tiket", "cek status tiket saya"]
  ];

  function sapa() {
    var s = petugas
      ? "Halo, rekan petugas. Ketik kebutuhan sahabat data untuk mencari di katalog, atau pilih kartu jawaban baku di bawah — jawabannya bisa disalin."
      : "Halo! Saya asisten PST BPS Kutai Kartanegara. Tanyakan data apa yang Anda cari, cara memperolehnya, atau ketik kode tiket untuk memeriksa status.";
    pesanBot(esc(s), petugas ? CHIPS_PETUGAS.concat(CHIPS_AWAL.slice(0, 2)) : CHIPS_AWAL);
  }

  function jawabPengetahuan(teks) {
    var terbaik = null, skor = 0;
    window.PENGETAHUAN.forEach(function (b) {
      if (b.untuk === "petugas" && !petugas) return;
      var s = CARI.skorKataKunci(teks, b.kunci);
      if (s > skor) { skor = s; terbaik = b; }
    });
    return { b: terbaik, skor: skor };
  }

  function kartuKatalog(d) {
    return '<div class="cb__kat"><span class="pill ' + d.st + '">' + esc(K.LABEL[d.st]) + "</span>" +
      "<b>" + esc(d.n) + "</b>" +
      '<div class="cb__meta">' + (d.lv !== "—" ? "level terendah " + esc(d.lv) + " · " : "") + esc(d.pd) + " · " + esc(d.sm) + "</div>" +
      '<div class="cb__ket">' + esc(d.d) + "</div>" +
      tautanHtml(d.ln) + "</div>";
  }

  function tampilTiket(t, jenis) {
    if (!t) {
      pesanBot("Tiket tidak ditemukan. Periksa kembali kodenya dan empat digit terakhir nomor HP yang Anda berikan kepada petugas. Setelah lima kali salah, pemeriksaan kode itu dijeda 15 menit.", CHIPS_LANJUT);
      return;
    }
    var B = window.BAKU, w;
    if (jenis === "KON") {
      var st = { diajukan:"Diajukan, menunggu penetapan narasumber", dijadwalkan:"Dijadwalkan", selesai:"Selesai", batal:"Dibatalkan" }[t.status] || t.status;
      w = { diajukan:"mohon", dijadwalkan:"ada", selesai:"lain", batal:"tidak" }[t.status] || "lain";
      pesanBot('<span class="kode">' + esc(t.kode) + '</span> <span class="pill ' + w + '">' + esc(st) + "</span>" +
        '<div class="cb__ket" style="margin-top:8px"><b>Jadwal:</b> ' + esc(PST.tgl(t.tanggal)) + " pukul " + esc(String(t.jam).slice(0,5)) + " WITA · " + t.durasi_menit + " menit" +
        (t.narasumber ? "<br><b>Narasumber:</b> " + esc(t.narasumber) : "") +
        (t.tautan_zoom ? "<br><b>Tautan Zoom:</b> " + PST.linkify(t.tautan_zoom) : "") +
        (t.pesan_untuk_sahabat ? "<br><b>Pesan petugas:</b> " + PST.linkify(t.pesan_untuk_sahabat) : "") + "</div>", CHIPS_LANJUT);
    } else {
      w = { selesai:"ada", proses:"mohon", surat:"mohon", eskalasi:"prov", tolak:"tidak" }[t.status] || "lain";
      pesanBot('<span class="kode">' + esc(t.kode_tiket) + '</span> <span class="pill ' + w + '">' + esc(B.statusTiket[t.status] || t.status) + "</span>" +
        '<div class="cb__ket" style="margin-top:8px"><b>Kebutuhan:</b> ' + esc(t.kebutuhan) +
        (t.tenggat ? "<br><b>Perkiraan selesai:</b> " + esc(PST.tgl(t.tenggat)) : "") +
        (t.hasil ? "<br><b>Catatan petugas:</b> " + PST.linkify(t.hasil) : "") + "</div>", CHIPS_LANJUT);
    }
  }

  function cekKode(kode, hp) {
    var jenis = kode.slice(0, 3);
    pesanBot("Sebentar, saya periksa…");
    var janji = jenis === "KON" ? PST.cekKonsultasi(kode, hp) : PST.cekTiket(kode, hp);
    janji.then(function (t) { tampilTiket(t, jenis); })
      .catch(function (e) { pesanBot("Gagal memeriksa: " + esc(e.message), CHIPS_LANJUT); });
  }

  function jawabButir(b) {
    var html = PST.linkify(b.jawab) + tautanHtml(b.tautan);
    if (petugas) html += '<button type="button" class="cb__salin" data-salin="' + esc(b.jawab) + '">salin jawaban</button>';
    pesanBot(html, CHIPS_LANJUT);
  }

  function jawab(teks, idButir) {
    var t = teks.trim();
    if (idButir) {
      var langsung = window.PENGETAHUAN.filter(function (b) { return b.id === idButir; })[0];
      if (langsung) return jawabButir(langsung);
    }
    var mKode = t.toUpperCase().match(/\b(PST|KON)-\d{4}-\d{4}\b/);
    var mHP = t.replace(/(PST|KON)-\d{4}-\d{4}/i, "").match(/\b\d{4}\b/);

    if (mKode && mHP) { kodeTunggu = null; return cekKode(mKode[0], mHP[0]); }
    if (mKode) {
      kodeTunggu = mKode[0];
      return pesanBot("Baik, kode <span class='kode'>" + esc(kodeTunggu) + "</span>. Sekarang ketik <b>empat digit terakhir nomor HP</b> yang Anda berikan kepada petugas.");
    }
    if (kodeTunggu && /^\d{4}$/.test(t)) { var k = kodeTunggu; kodeTunggu = null; return cekKode(k, t); }
    if (/\b(cek|status|periksa)\b/i.test(t) && /\btiket\b/i.test(t)) {
      return pesanBot("Ketik kode tiket Anda — bentuknya <span class='kode'>PST-2609-0042</span> untuk permintaan data atau <span class='kode'>KON-2609-0007</span> untuk konsultasi daring — lalu empat digit terakhir nomor HP Anda. Boleh sekaligus dalam satu pesan.");
    }

    var p = jawabPengetahuan(t);
    var hasil = CARI.cocokkan(t, 3);

    if (p.b && (p.skor >= 2 || (p.skor === 1 && (!hasil.length || p.b.untuk === "petugas")))) {
      var html = PST.linkify(p.b.jawab) + tautanHtml(p.b.tautan);
      if (petugas) html += '<button type="button" class="cb__salin" data-salin="' + esc(p.b.jawab) + '">salin jawaban</button>';
      if (hasil.length && p.b.id !== "cara" && p.b.id !== "jam") {
        html += '<div class="cb__ket" style="margin-top:10px;color:var(--ink-3)">Ragam data yang mungkin Anda maksud:</div>' + hasil.slice(0, 2).map(kartuKatalog).join("");
      }
      return pesanBot(html, CHIPS_LANJUT);
    }
    if (hasil.length) {
      var ada = hasil.some(function (d) { return d.st === "ada"; });
      return pesanBot(
        (ada ? "Ini yang cocok di katalog — yang berstatus <b>Unduh di web</b> bisa langsung diambil dari tautannya:" :
               "Ini yang paling mendekati di katalog:") +
        hasil.map(kartuKatalog).join("") +
        '<div class="cb__ket" style="margin-top:8px;color:var(--ink-3)">Bukan yang dicari? Sebut nama datanya lebih spesifik, atau ajukan konsultasi.</div>',
        CHIPS_LANJUT);
    }
    return pesanBot("Saya belum menemukan itu di katalog. Coba sebutkan nama datanya — misalnya <i>jumlah penduduk per kecamatan</i>, <i>angka kemiskinan</i>, atau <i>PDRB</i> — atau pilih salah satu di bawah.",
      [["Lihat katalog lengkap", "data apa saja yang tersedia"], ["Ajukan konsultasi daring", "bisa konsultasi online lewat zoom?"], ["Hubungi PST", "jam layanan dan alamat PST"]]);
  }

  function kirim(t, idButir) {
    if (!t) return;
    pesanku(t); riwayat.push(t);
    setChips([]);
    setTimeout(function () { jawab(t, idButir); }, 120);
  }

  /* ------------------------------------------------------------- kendali */
  document.getElementById("cbBuka").onclick = function () {
    panel.hidden = !panel.hidden;
    if (!panel.hidden && !isi.children.length) sapa();
    if (!panel.hidden) input.focus();
  };
  document.getElementById("cbTutup").onclick = function () { panel.hidden = true; };
  document.getElementById("cbForm").onsubmit = function (e) {
    e.preventDefault(); var t = input.value.trim(); input.value = ""; kirim(t);
  };
  isi.addEventListener("click", function (e) {
    var b = e.target.closest("[data-salin]"); if (!b) return;
    try { navigator.clipboard.writeText(b.dataset.salin).then(function () { b.textContent = "tersalin ✓"; }); }
    catch (er) { b.textContent = "tidak bisa menyalin"; }
  });

  PST.sesi().then(function (s) { petugas = !!(s && s.jenis === "pegawai"); }).catch(function () {});

  /* buka otomatis lewat #tanya di URL, mis. dari tautan di halaman lain */
  if (location.hash === "#tanya") setTimeout(function () { document.getElementById("cbBuka").click(); }, 300);
})();
