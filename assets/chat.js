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
    '<button class="cb__tombol" id="cbBuka" aria-label="Buka asisten PST" aria-expanded="false" aria-controls="cbPanel">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.2A8 8 0 1 1 21 12z"/></svg>' +
      '<span>Tanya PST</span></button>' +
    '<section class="cb__panel" id="cbPanel" hidden role="dialog" aria-label="Asisten PST">' +
      '<header class="cb__kepala"><div><b>Asisten PST</b><span>menjawab dari katalog, bukan mengarang</span></div>' +
        '<button class="cb__tutup" id="cbTutup" aria-label="Tutup">×</button></header>' +
      '<div class="cb__isi" id="cbIsi" aria-live="polite"></div>' +
      '<div class="cb__chips" id="cbChips"></div>' +
      '<form class="cb__form" id="cbForm"><input type="text" id="cbInput" placeholder="Tulis pertanyaan…" aria-label="Pertanyaan untuk asisten PST" autocomplete="off" maxlength="300">' +
        '<button class="cb__kirim" type="submit">Kirim</button></form>' +
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

  /* tautan relatif (konsultasi.html, glosarium.html#ipm) selalu diarahkan ke situs katalog,
     karena widget ini juga dipasang di beranda dan situs indikator */
  var DASAR_KATALOG = (PST.TAUTAN && PST.TAUTAN.katalog) || "/katalog-data-bpskukar/";
  function tautanAbsolut(u) {
    u = String(u || "");
    if (/^(https?:|\/|#|mailto:|tel:)/.test(u)) return u;
    return DASAR_KATALOG + u;
  }
  function tautanHtml(ln) {
    if (!ln || !ln.length) return "";
    return '<div class="cb__ln">' + ln.map(function (x) {
      var luar = /^https?:/.test(x.u);
      return '<a href="' + esc(tautanAbsolut(x.u)) + '"' + (luar ? ' target="_blank" rel="noopener"' : "") + ">" + esc(x.l) + "</a>";
    }).join("") + "</div>";
  }

  /* ------------------------------------------------------------- otak */
  var CHIPS_AWAL = [
    ["Berapa IPM Kukar?", "berapa IPM Kukar terbaru?"],
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

  /* ------------------------------------ angka indikator strategis (PINTAR) */
  var IND;   /* undefined = belum dicoba, false = tak tersedia, objek = siap */
  var SINONIM = {
    penduduk: ["jumlah penduduk", "populasi", "penduduk kukar"], lpp: ["pertumbuhan penduduk", "laju penduduk"],
    tpak: ["partisipasi angkatan kerja", "angkatan kerja"], tpt: ["pengangguran", "penganggur"],
    "pdrb-adhb": ["pdrb", "harga berlaku", "produk domestik"], "pdrb-adhk": ["harga konstan", "pdrb riil"],
    lpe: ["pertumbuhan ekonomi", "laju ekonomi", "ekonomi tumbuh"], "pdrb-kapita": ["per kapita", "perkapita"],
    uhh: ["harapan hidup", "umur harapan"], hls: ["harapan lama sekolah", "harapan sekolah"], rls: ["rata rata lama sekolah", "lama sekolah"],
    ppp: ["pengeluaran per kapita", "daya beli", "pengeluaran riil"], ipm: ["indeks pembangunan manusia", "pembangunan manusia"],
    gini: ["gini", "ketimpangan pendapatan", "rasio gini"], ikg: ["ketimpangan gender", "gender"],
    p0: ["penduduk miskin", "kemiskinan", "angka kemiskinan", "persentase miskin", "orang miskin"], rentan: ["rentan miskin", "rentan"],
    p1: ["kedalaman kemiskinan", "indeks kedalaman"], p2: ["keparahan kemiskinan", "indeks keparahan"], garis: ["garis kemiskinan"]
  };
  function siapkanIndikator() {
    if (!PST.indikatorSiap) { IND = false; return Promise.resolve(false); }
    return PST.indikatorSiap().then(function (d) { IND = d || false; return IND; }).catch(function () { IND = false; return false; });
  }
  /* daftar yang bisa ditanya: kartu indikator + deret yang tidak punya kartu (P1, P2, garis) */
  function daftarIndikator() {
    var arr = (IND.indikator || []).slice(), km = IND.kemiskinan || {};
    var th = (km.label || []).length ? String(km.label[km.label.length - 1]) : "";
    var akhir = function (a) { return (a || []).length ? a[a.length - 1] : null; };
    if (!arr.some(function (x) { return x.id === "p1"; }) && km.p1) arr.push({ id: "p1", label: "Indeks Kedalaman Kemiskinan (P1)", abbr: "P1 · Tahun " + th, value: akhir(km.p1), dec: 2, unit: "", note: "Rata-rata jarak pengeluaran penduduk miskin terhadap garis kemiskinan." });
    if (!arr.some(function (x) { return x.id === "p2"; }) && km.p2) arr.push({ id: "p2", label: "Indeks Keparahan Kemiskinan (P2)", abbr: "P2 · Tahun " + th, value: akhir(km.p2), dec: 2, unit: "", note: "Sebaran pengeluaran di antara penduduk miskin." });
    if (!arr.some(function (x) { return x.id === "garis"; }) && km.garis) arr.push({ id: "garis", label: "Garis Kemiskinan", abbr: "Tahun " + th, value: akhir(km.garis), dec: 0, unit: "Rp/kapita/bulan", note: "Batas pengeluaran per kapita per bulan; di bawahnya tergolong miskin." });
    return arr;
  }
  function deretUntuk(id) {
    var km = IND.kemiskinan || {}, pt = IND.pdrbTahun || {}, ipm = IND.ipm || {};
    return { p0: [km.label, km.p0], p1: [km.label, km.p1], p2: [km.label, km.p2], garis: [km.label, km.garis],
             ipm: [ipm.label, ipm.nilai], lpe: [pt.label, pt.lpe], "pdrb-adhb": [pt.label, pt.adhb], "pdrb-adhk": [pt.label, pt.adhk] }[id] || null;
  }
  function cariIndikator(teks) {
    if (!IND) return null;
    /* singkatan dikenali huruf besar maupun kecil (ipm = IPM), kepanjangannya ikut dicari */
    var luas = CARI.perluas ? CARI.perluas(teks) : teks;
    var t = " " + luas.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ") + " ";
    var tok = teks.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter(Boolean);
    var terbaik = null, skorMaks = 0;
    daftarIndikator().forEach(function (it) {
      var skor = 0;
      var kode = String(it.abbr || "").split(/[ ·]/)[0].toLowerCase();
      if (tok.indexOf(it.id) !== -1 || (kode && kode.length <= 5 && CARI.HENTI.indexOf(kode) === -1 && tok.indexOf(kode) !== -1)) skor += 5;
      if (t.indexOf(" " + String(it.label).toLowerCase() + " ") !== -1) skor += 5;
      (SINONIM[it.id] || []).forEach(function (sn) { if (t.indexOf(sn) !== -1) skor += 3; });
      String(it.label).toLowerCase().split(/\s+/).forEach(function (w) {
        if (w.length >= 5 && CARI.HENTI.indexOf(w) === -1 && t.indexOf(w) !== -1) skor += 1;
      });
      if (skor > skorMaks) { skorMaks = skor; terbaik = it; }
    });
    return skorMaks >= 5 ? { it: terbaik, skor: skorMaks } : null;
  }
  function fmtAngka(n, dec) {
    return Number(n).toLocaleString("id-ID", { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 });
  }
  function jawabIndikator(teks, c) {
    var it = c.it, tahun = (teks.match(/\b(20\d\d)\b/) || [])[1];
    var html = "", deret = deretUntuk(it.id);
    var adaTahun = deret && deret[0] && deret[0].map(String).indexOf(tahun) !== -1;
    if (tahun && adaTahun) {
      var i = deret[0].map(String).indexOf(tahun);
      html += "<b>" + esc(it.label) + " Kutai Kartanegara " + esc(tahun) + ": " + fmtAngka(deret[1][i], it.dec) + (it.unit ? " " + esc(it.unit) : "") + "</b>";
    } else {
      html += "<b>" + esc(it.label) + " Kutai Kartanegara: " + fmtAngka(it.value, it.dec) + (it.unit ? " " + esc(it.unit) : "") + "</b>" +
        (it.abbr ? ' <span class="cb__meta">(' + esc(it.abbr) + ")</span>" : "");
      if (tahun && deret && deret[0] && deret[0].length) html += '<div class="cb__ket">Tahun ' + esc(tahun) + " tidak ada di deret; yang tersedia " + esc(deret[0][0]) + "–" + esc(deret[0][deret[0].length - 1]) + ".</div>";
    }
    if (it.note) html += '<div class="cb__ket">' + esc(it.note) + "</div>";
    if (deret && deret[0] && deret[0].length > 1 && !(tahun && adaTahun)) {
      html += '<div class="cb__ket" style="margin-top:6px">' + deret[0].map(function (l, i) { return esc(l) + ": " + fmtAngka(deret[1][i], it.dec); }).join(" · ") + "</div>";
    }
    var anchor = { ekonomi: "#ekonomi", manusia: "#manusia", pemerataan: "#kemiskinan", demografi: "#kependudukan", ketenagakerjaan: "#kependudukan" }[it.kat] || "#ringkasan";
    if (["p0", "p1", "p2", "garis", "rentan"].indexOf(it.id) !== -1) anchor = "#kemiskinan";
    var glos = GLOS.filter(function (g) { return g.id === it.id || g.indikator === it.id; })[0];
    html += tautanHtml([{ u: PST.TAUTAN.indikator + anchor, l: "Lihat grafik & rinciannya di Indikator Strategis" }].concat(glos ? [{ u: "glosarium.html#" + glos.id, l: "Apa itu " + (glos.singkat ? glos.singkat.split(/[ \/]+/)[0] : glos.istilah) + " & cara membacanya" }] : []));
    html += '<div class="cb__ket" style="margin-top:8px;color:var(--ink-3)">Sumber: Booklet Indikator Strategis BPS Kabupaten Kutai Kartanegara. Angka resmi rujuk publikasi aslinya.</div>';
    var hasil = CARI.cocokkan(it.label + " " + (SINONIM[it.id] || []).join(" "), 2);
    if (hasil.length) html += '<div class="cb__ket" style="margin-top:10px;color:var(--ink-3)">Data lengkapnya di katalog:</div>' + hasil.map(kartuKatalog).join("");
    pesanBot(html, [["Indikator lain", "berapa IPM, TPT, dan PDRB Kukar?"], ["Minta data lengkap", "bagaimana cara meminta data"], ["Konsultasi", "bisa konsultasi online lewat zoom?"]]);
  }

  /* ------------------------------------------------- glosarium (definisi) */
  var GLOS = window.GLOSARIUM || [];
  var NIAT_DEFINISI = /\b(apa itu|apa arti|apa maksud|artinya|arti|pengertian|definisi|maksud(?:nya)?|apa bedanya|bedanya|beda|perbedaan|cara menghitung|dihitung|rumus|cara membaca|membaca|maksudnya apa|itu apa|kenapa|mengapa)\b/i;
  function cariGlosarium(teks, n) {
    if (!GLOS.length) return [];
    var tl = " " + teks.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ") + " ";
    var tok = tl.trim().split(" ");
    return GLOS.map(function (g) {
      var skor = 0;
      var singk = (g.singkat || "").toLowerCase().split(/[ \/]+/).filter(Boolean);
      if (tok.indexOf(g.id) !== -1) skor += 8;
      singk.forEach(function (x) { if (tok.indexOf(x) !== -1) skor += 8; });
      if (tl.indexOf(" " + g.istilah.toLowerCase() + " ") !== -1) skor += 8;
      g.kunci.forEach(function (k) { if (k.length >= 3 && tl.indexOf(" " + k + " ") !== -1) skor += k.indexOf(" ") !== -1 ? 6 : 4; });
      return { g: g, skor: skor };
    }).filter(function (x) { return x.skor >= 4; }).sort(function (a, b) { return b.skor - a.skor; }).slice(0, n || 2);
  }
  function jawabGlosarium(teks, cocok) {
    var tanyaHitung = /\b(hitung|dihitung|rumus)\b/i.test(teks), tanyaBeda = /\b(beda|bedanya|perbedaan)\b/i.test(teks);
    var html = cocok.map(function (c) {
      var g = c.g, h = "<b>" + esc(g.istilah) + (g.singkat ? " (" + esc(g.singkat) + ")" : "") + "</b><div class=\"cb__ket\">" + esc(g.definisi) + "</div>";
      if ((tanyaHitung || cocok.length === 1) && g.hitung) h += '<div class="cb__ket" style="margin-top:6px"><b>Cara menghitung:</b> ' + esc(g.hitung) + "</div>";
      if (cocok.length === 1 && g.baca) h += '<div class="cb__ket" style="margin-top:6px"><b>Cara membaca:</b> ' + esc(g.baca) + "</div>";
      if (cocok.length === 1 && g.keliru) h += '<div class="cb__ket" style="margin-top:6px"><b>Sering keliru:</b> ' + esc(g.keliru) + "</div>";
      return '<div style="margin-bottom:8px">' + h + "</div>";
    }).join("");
    var tautan = cocok.map(function (c) { return { u: "glosarium.html#" + c.g.id, l: "Selengkapnya: " + c.g.istilah }; });
    if (cocok.length === 1 && cocok[0].g.indikator) tautan.push({ u: PST.TAUTAN.indikator, l: "Lihat angka Kukar di Indikator Strategis" });
    html += tautanHtml(tautan);
    if (petugas) html += '<button type="button" class="cb__salin" data-salin="' + esc(cocok.map(function (c) { return c.g.istilah + ": " + c.g.definisi; }).join("\n")) + '">salin jawaban</button>';
    var lanjut = [["Cara membacanya", "bagaimana cara membaca " + (cocok[0].g.singkat ? cocok[0].g.singkat.split(/[ \/]+/)[0] : cocok[0].g.istilah) + "?"], ["Berapa angkanya di Kukar", "berapa " + (cocok[0].g.singkat ? cocok[0].g.singkat.split(/[ \/]+/)[0] : cocok[0].g.istilah) + " Kukar?"], ["Buka glosarium", "buka glosarium"]];
    if (tanyaBeda && cocok.length < 2) lanjut.unshift(["Buka glosarium", "buka glosarium"]);
    pesanBot(html, lanjut);
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

    if (/^buka glosarium$/i.test(t)) return pesanBot("Glosarium memuat " + GLOS.length + " istilah beserta cara membaca dan salah kaprahnya." + tautanHtml([{ u: "glosarium.html", l: "Buka glosarium & cara membaca angka" }]), CHIPS_LANJUT);
    /* definisi/arti/beda/cara menghitung → glosarium, sebelum angka & pengetahuan */
    if (!idButir && NIAT_DEFINISI.test(t)) {
      var gl = cariGlosarium(t, /\b(beda|bedanya|perbedaan)\b/i.test(t) ? 2 : 1);
      if (gl.length) return jawabGlosarium(t, gl);
    }

    var p = jawabPengetahuan(t);
    var hasil = CARI.cocokkan(t, 3);

    /* angka indikator strategis: "berapa IPM Kukar 2025?" */
    if (IND === undefined) { siapkanIndikator().then(function () { jawab(teks, idButir); }); return; }
    var ci = cariIndikator(t);
    var niatAngka = /\b(berapa|nilai|angka|persen|persentase|tingkat|indeks|jumlah|capaian|naik|turun)\b/i.test(t) || /\b20\d\d\b/.test(t);
    if (ci && !idButir && (niatAngka || p.skor < 2)) return jawabIndikator(t, ci);

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
  var tombolBuka = document.getElementById("cbBuka");
  function tutup() {
    if (panel.hidden) return;
    panel.hidden = true; tombolBuka.setAttribute("aria-expanded", "false");
    if (panel.contains(document.activeElement)) tombolBuka.focus();   /* fokus kembali ke tombol pembuka */
  }
  tombolBuka.onclick = function () { if (panel.hidden) buka(); else tutup(); };
  document.getElementById("cbTutup").onclick = tutup;
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) tutup(); });
  document.getElementById("cbForm").onsubmit = function (e) {
    e.preventDefault(); var t = input.value.trim(); input.value = ""; kirim(t);
  };
  isi.addEventListener("click", function (e) {
    var b = e.target.closest("[data-salin]"); if (!b) return;
    try { navigator.clipboard.writeText(b.dataset.salin).then(function () { b.textContent = "tersalin ✓"; }); }
    catch (er) { b.textContent = "tidak bisa menyalin"; }
  });

  PST.sesi().then(function (s) { petugas = !!(s && s.jenis === "pegawai"); }).catch(function () {});

  /* API untuk tombol "Tanya PST" di mana pun (beranda, situs indikator, glosarium):
     ASISTEN.buka() membuka panel, ASISTEN.tanya(teks) membuka dan langsung bertanya. */
  function buka() {
    panel.hidden = false; tombolBuka.setAttribute("aria-expanded", "true");
    if (IND === undefined) siapkanIndikator();
    if (!isi.children.length) sapa();
    input.focus();
  }
  window.ASISTEN = {
    buka: buka,
    tutup: tutup,
    tanya: function (t) { t = String(t || "").trim().slice(0, 300); buka(); if (t) kirim(t); }
  };
  /* tombol/tautan mana pun dengan data-tanya="…" (atau data-tanya kosong = buka saja) */
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-tanya]"); if (!b) return;
    e.preventDefault();
    var t = b.getAttribute("data-tanya");
    if (t) window.ASISTEN.tanya(t); else buka();
  });

  /* buka otomatis lewat #tanya di URL, mis. dari tautan di halaman lain */
  if (location.hash === "#tanya") setTimeout(buka, 300);

  /* ?tanya=… dari situs indikator (tombol "Tanya PST" di kartu): buka dan langsung tanyakan */
  var tanyaAwal = (new URLSearchParams(location.search).get("tanya") || "").trim().slice(0, 300);
  if (tanyaAwal) setTimeout(function () {
    /* tanpa memindahkan fokus ke kotak ketik: di HP, papan ketik tidak langsung muncul */
    panel.hidden = false; tombolBuka.setAttribute("aria-expanded", "true");
    if (IND === undefined) siapkanIndikator();
    if (!isi.children.length) sapa();
    kirim(tanyaAwal);
  }, 350);
})();
