/* ============================================================================
   Asisten PST — chatbot berbasis katalog + basis pengetahuan + isi indikator.
   Tidak memakai model bahasa: setiap jawaban berasal dari assets/katalog.js,
   assets/pengetahuan.js, assets/glosarium.js, atau isi indikator terbit,
   sehingga tidak pernah mengarang angka.

   Pemahaman (assets/paham.js): salah ketik, bahasa sehari-hari, konteks lanjutan
   ("kalau 2023?"), entitas tahun/kab-kota/kecamatan, niat (banding, peringkat,
   tren, publikasi, permintaan, konsultasi).
   Tindakan: permintaan data & konsultasi daring langsung dari obrolan.
   Belajar: pertanyaan + hasilnya dicatat tanpa identitas (perbaikan-07) dan
   dinilai 👍/👎, dibaca pegawai di Ruang Pegawai → Pertanyaan asisten.

   Dipasang di semua halaman katalog lewat <script src="assets/chat.js">; situs
   lain memuatnya lewat assets/asisten.js.
   ========================================================================== */
(function () {
  "use strict";
  if (!window.PST || !window.CARI || !window.PENGETAHUAN) return;
  var esc = PST.esc, K = window.KATALOG, PH = window.PAHAM || null, B = window.BAKU || {};
  var petugas = false, sahabat = null, kodeTunggu = null, riwayat = [];
  var SESI = Math.random().toString(36).slice(2, 12) + Date.now().toString(36);

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
    isi.insertAdjacentHTML("beforeend", '<div class="cb__p cb__p--saya">' + esc(t) + "</div>"); gulir();
  }
  /* opsi: {jenis, skor, tanya, alat:false} — alat = tombol salin/WhatsApp/nilai */
  var TANYA_KINI = "";
  function pesanBot(html, chipsBaru, opsi) {
    opsi = opsi || {};
    var div = document.createElement("div");
    div.className = "cb__p cb__p--bot";
    div.innerHTML = html;
    if (opsi.alat !== false) {
      div.insertAdjacentHTML("beforeend",
        '<div class="cb__alat"><button type="button" data-alat="salin" title="Salin jawaban">Salin</button>' +
        '<button type="button" data-alat="wa" title="Kirim jawaban ke WhatsApp">WhatsApp</button>' +
        (opsi.jenis ? '<span class="cb__nilai" aria-label="Apakah jawaban ini membantu?"><button type="button" data-nilai="1" aria-label="Jawaban membantu" title="Membantu">👍</button><button type="button" data-nilai="-1" aria-label="Jawaban kurang membantu" title="Kurang membantu">👎</button></span>' : "") + "</div>");
    }
    isi.appendChild(div); gulir();
    setChips(chipsBaru || []);
    if (opsi.jenis && opsi.tanya) catat(div, opsi.tanya, opsi.jenis, opsi.skor);
    return div;
  }
  function setChips(daftar) {
    chips.innerHTML = daftar.map(function (c) {
      return '<button type="button" class="cb__chip" data-q="' + esc(c[1] || c[0]) + '"' + (c[2] ? ' data-id="' + esc(c[2]) + '"' : "") + ' data-label="' + esc(c[0]) + '">' + esc(c[0]) + "</button>";
    }).join("");
  }
  chips.addEventListener("click", function (e) {
    var b = e.target.closest(".cb__chip"); if (!b) return;
    kirim(b.dataset.q, b.dataset.id, b.dataset.label);
  });

  /* tautan relatif (konsultasi.html, glosarium.html#ipm) selalu diarahkan ke situs katalog,
     karena widget ini juga dipasang di beranda dan situs indikator */
  var DASAR_KATALOG = (PST.TAUTAN && PST.TAUTAN.katalog) || "/katalog-data-bpskukar/";
  var T_IND = (PST.TAUTAN && PST.TAUTAN.indikator) || "/indikator-strategis-bpskukar/";
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
  function ket(t, gaya) { return '<div class="cb__ket"' + (gaya ? ' style="' + gaya + '"' : "") + ">" + t + "</div>"; }

  /* ------------------------------------------------- salin / WhatsApp / nilai */
  function teksPolos(div) {
    var k = div.cloneNode(true);
    Array.prototype.slice.call(k.querySelectorAll(".cb__alat")).forEach(function (x) { x.remove(); });
    Array.prototype.slice.call(k.querySelectorAll("a[href]")).forEach(function (a) {
      var h = a.getAttribute("href"); if (/^https?:/.test(h)) a.textContent = a.textContent + " (" + h + ")";
      else if (/^\//.test(h)) a.textContent = a.textContent + " (" + location.origin + h + ")";
    });
    var t = (k.innerText || k.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
    var tanya = div.dataset.tanya || "";
    return t + "\n\n— Asisten PST BPS Kabupaten Kutai Kartanegara" + (tanya ? "\nTanya sendiri: " + location.origin + DASAR_KATALOG + "?tanya=" + encodeURIComponent(tanya) : "");
  }
  isi.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    var div = b.closest(".cb__p--bot");
    if (b.dataset.alat === "salin") {
      var t = teksPolos(div);
      var ok = function () { b.textContent = "Tersalin ✓"; setTimeout(function () { b.textContent = "Salin"; }, 2000); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, function () { b.textContent = "Tidak bisa menyalin"; });
      else { try { var ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); ok(); } catch (er) { b.textContent = "Tidak bisa menyalin"; } }
      return;
    }
    if (b.dataset.alat === "wa") { window.open("https://wa.me/?text=" + encodeURIComponent(teksPolos(div)), "_blank", "noopener"); return; }
    if (b.dataset.nilai) {
      var n = +b.dataset.nilai, w = b.parentElement;
      w.innerHTML = '<span class="cb__nilai-ok">' + (n > 0 ? "Terima kasih 👍" : "Terima kasih, akan kami perbaiki 🙏") + "</span>";
      if (div.dataset.log) PST.nilaiAsisten(+div.dataset.log, SESI, n);
      else div.dataset.nilaiTunda = String(n);
      if (n < 0) setTimeout(function () { setChips([["Ajukan permintaan data", "ajukan permintaan data"], ["Konsultasi daring", "mau konsultasi daring"], ["Hubungi PST", "jam layanan dan alamat PST"]]); }, 50);
      return;
    }
    if (b.dataset.salin !== undefined) {
      try { navigator.clipboard.writeText(b.dataset.salin).then(function () { b.textContent = "tersalin ✓"; }); } catch (er) { b.textContent = "tidak bisa menyalin"; }
    }
  });

  /* ------------------------------------------------- catatan (belajar) */
  function catat(div, tanya, jenis, skor) {
    if (!PST.catatAsisten) return;
    div.dataset.tanya = tanya;
    PST.catatAsisten({ pertanyaan: tanya, jenis: jenis, skor: skor, halaman: location.pathname, sesi: SESI }).then(function (id) {
      if (!id) return;
      div.dataset.log = String(id);
      if (div.dataset.nilaiTunda) PST.nilaiAsisten(id, SESI, +div.dataset.nilaiTunda);
    }).catch(function () {});
  }

  /* ------------------------------------------------------------- otak */
  var CHIPS_AWAL = [
    ["Berapa IPM Kukar?", "berapa IPM Kukar terbaru?"],
    ["Kukar peringkat berapa di Kaltim?", "Kukar peringkat berapa IPM di Kaltim?"],
    ["Data apa yang tersedia sampai desa?", "data apa saja yang tersedia sampai level desa"],
    ["Ajukan permintaan data", "ajukan permintaan data"],
    ["Konsultasi lewat Zoom", "mau konsultasi daring lewat zoom"],
    ["Cek status tiket", "cek status tiket saya"]
  ];
  var CHIPS_PETUGAS = [
    ["Alur melayani", "alur baku melayani sahabat data", "petugas-alur"],
    ["Kalimat penolakan", "kalimat baku saat menolak", "petugas-tolak"],
    ["Beda BPS vs Dukcapil", "kenapa beda dengan dukcapil", "dukcapil"],
    ["Kenapa tak ada per kecamatan", "kenapa tidak ada kemiskinan per kecamatan", "kecamatan"]
  ];
  var CHIPS_LANJUT = [
    ["Ajukan permintaan data", "ajukan permintaan data"],
    ["Konsultasi daring", "mau konsultasi daring lewat zoom"],
    ["Cek status tiket", "cek status tiket saya"]
  ];

  function sapa() {
    var s = petugas
      ? "Halo, rekan petugas. Ketik kebutuhan sahabat data untuk mencari di katalog, atau pilih kartu jawaban baku di bawah — jawabannya bisa disalin."
      : "Halo! Saya asisten PST BPS Kutai Kartanegara. Tanyakan angka (\u201cberapa IPM Kukar?\u201d), arti istilah, data yang tersedia, atau ajukan permintaan data dan konsultasi langsung di sini.";
    pesanBot(esc(s), petugas ? CHIPS_PETUGAS.concat(CHIPS_AWAL.slice(0, 2)) : CHIPS_AWAL, { alat: false });
  }

  function jawabPengetahuan(teks) {
    var terbaik = null, skor = 0, panjang = 0;
    window.PENGETAHUAN.forEach(function (b) {
      if (b.untuk === "petugas" && !petugas) return;
      var s = CARI.skorKataKunci(teks, b.kunci);
      if (!s) return;
      /* seri dimenangkan butir yang kuncinya paling spesifik, bukan yang
         kebetulan lebih dulu di daftar — "desa cantik kukar" > "desa cantik" */
      var pj = CARI.panjangKunciKena ? CARI.panjangKunciKena(teks, b.kunci) : 0;
      if (s > skor || (s === skor && pj > panjang)) { skor = s; terbaik = b; panjang = pj; }
    });
    return { b: terbaik, skor: skor };
  }

  function kartuKatalog(d) {
    return '<div class="cb__kat"><span class="pill ' + d.st + '">' + esc(K.LABEL[d.st]) + "</span>" +
      "<b>" + esc(d.n) + "</b>" +
      '<div class="cb__meta">' + (d.lv !== "—" ? "level terendah " + esc(d.lv) + " · " : "") + esc(d.pd) + " · " + esc(d.sm) + "</div>" +
      ket(esc(d.d)) + tautanHtml(d.ln) + "</div>";
  }

  function tampilTiket(t, jenis, tanya) {
    if (!t) {
      pesanBot("Tiket tidak ditemukan. Periksa kembali kodenya dan empat digit terakhir nomor HP yang Anda berikan kepada petugas. Setelah lima kali salah, pemeriksaan kode itu dijeda 15 menit.", CHIPS_LANJUT, { alat: false });
      return;
    }
    var w;
    if (jenis === "KON") {
      var st = { diajukan:"Diajukan, menunggu penetapan narasumber", dijadwalkan:"Dijadwalkan", selesai:"Selesai", batal:"Dibatalkan" }[t.status] || t.status;
      w = { diajukan:"mohon", dijadwalkan:"ada", selesai:"lain", batal:"tidak" }[t.status] || "lain";
      pesanBot('<span class="kode">' + esc(t.kode) + '</span> <span class="pill ' + w + '">' + esc(st) + "</span>" +
        ket("<b>Jadwal:</b> " + esc(PST.tgl(t.tanggal)) + " pukul " + esc(String(t.jam).slice(0,5)) + " WITA · " + t.durasi_menit + " menit" +
        (t.narasumber ? "<br><b>Narasumber:</b> " + esc(t.narasumber) : "") +
        (t.tautan_zoom ? "<br><b>Tautan Zoom:</b> " + PST.linkify(t.tautan_zoom) : "") +
        (t.pesan_untuk_sahabat ? "<br><b>Pesan petugas:</b> " + PST.linkify(t.pesan_untuk_sahabat) : ""), "margin-top:8px"), CHIPS_LANJUT, { alat: false });
    } else {
      w = { selesai:"ada", proses:"mohon", surat:"mohon", eskalasi:"prov", tolak:"tidak" }[t.status] || "lain";
      pesanBot('<span class="kode">' + esc(t.kode_tiket) + '</span> <span class="pill ' + w + '">' + esc((B.statusTiket || {})[t.status] || t.status) + "</span>" +
        ket("<b>Kebutuhan:</b> " + esc(t.kebutuhan) +
        (t.tenggat ? "<br><b>Perkiraan selesai:</b> " + esc(PST.tgl(t.tenggat)) : "") +
        (t.hasil ? "<br><b>Catatan petugas:</b> " + PST.linkify(t.hasil) : ""), "margin-top:8px"), CHIPS_LANJUT, { alat: false });
    }
  }

  function cekKode(kode, hp) {
    var jenis = kode.slice(0, 3);
    pesanBot("Sebentar, saya periksa…", [], { alat: false });
    var janji = jenis === "KON" ? PST.cekKonsultasi(kode, hp) : PST.cekTiket(kode, hp);
    janji.then(function (t) { tampilTiket(t, jenis); })
      .catch(function (e) { pesanBot("Gagal memeriksa: " + esc(e.message), CHIPS_LANJUT, { alat: false }); });
  }

  function jawabButir(b, tanya) {
    var html = PST.linkify(b.jawab) + tautanHtml(b.tautan);
    var lanjut = CHIPS_LANJUT;
    if (b.id === "konsultasi") lanjut = [["Ajukan konsultasi di sini", "ajukan konsultasi daring sekarang"], ["Cek status tiket", "cek status tiket saya"]];
    if (b.id === "cara") lanjut = [["Ajukan permintaan data di sini", "ajukan permintaan data"], ["Konsultasi daring", "mau konsultasi daring lewat zoom"]];
    pesanBot(html, lanjut, { jenis: "pengetahuan", tanya: tanya || b.id });
  }

  /* ------------------------------------------ pemahaman (paham.js) */
  var KONTEKS = { indikator: null, tahun: null, jenis: null };
  /* ragam data yang baru saja ditunjukkan ke pengunjung — supaya asisten tidak
     menawarkan hal yang sama dua kali saat permintaan diteruskan */
  var TAWARAN = { teks: "", nama: [] };
  function catatTawaran(teks, daftar) {
    TAWARAN = { teks: PH ? PH.normal(teks) : String(teks).toLowerCase(), nama: (daftar || []).map(function (d) { return d.n || d; }) };
  }
  function sudahDitawarkan(teks, daftar) {
    var t = PH ? PH.normal(teks) : String(teks).toLowerCase();
    if (!TAWARAN.nama.length || !t || !TAWARAN.teks) return false;
    if (t.indexOf(TAWARAN.teks) === -1 && TAWARAN.teks.indexOf(t) === -1) return false;
    return daftar.every(function (x) { return TAWARAN.nama.indexOf(x.d.n) !== -1; });
  }
  function pahami(teks) {
    var asli = String(teks || "").trim();
    var k = PH ? PH.koreksi(asli) : { teks: asli, ubah: [] };
    var luas = k.teks, tambah = PH ? PH.awam(k.teks) : [];
    if (tambah.length) luas += " " + tambah.join(" ");
    if (CARI.perluas) luas = CARI.perluas(luas);
    return { asli: asli, teks: k.teks, luas: luas, tambahan: tambah.join(" "), ubah: k.ubah,
      ent: PH ? PH.entitas(k.teks) : { tahun: (asli.match(/\b20\d\d\b/g) || []), wilayah: [], prov: false, kecamatan: [] },
      niat: PH ? PH.niat(k.teks) : {} };
  }
  function catatanKoreksi(p) {
    if (!p.ubah.length) return "";
    return ket("Saya artikan " + p.ubah.map(function (u) { return "\u201c" + esc(u[0]) + "\u201d sebagai \u201c" + esc(u[1]) + "\u201d"; }).join(", ") + ".", "color:var(--cb-ink-3);font-size:11.5px;margin-bottom:6px");
  }

  /* ------------------------------------ angka indikator strategis (PINTAR) */
  var IND;   /* undefined = belum dicoba, false = tak tersedia, objek = siap */
  var SINONIM = {
    penduduk: ["jumlah penduduk", "populasi", "penduduk kukar", "banyak penduduk"], lpp: ["pertumbuhan penduduk", "laju penduduk"],
    tpak: ["partisipasi angkatan kerja", "angkatan kerja"], tpt: ["pengangguran", "penganggur"],
    "pdrb-adhb": ["pdrb", "harga berlaku", "produk domestik"], "pdrb-adhk": ["harga konstan", "pdrb riil"],
    lpe: ["pertumbuhan ekonomi", "laju ekonomi", "ekonomi tumbuh"], "pdrb-kapita": ["per kapita", "perkapita"],
    uhh: ["harapan hidup", "umur harapan"], hls: ["harapan lama sekolah", "harapan sekolah"], rls: ["rata rata lama sekolah", "lama sekolah"],
    ppp: ["pengeluaran per kapita", "daya beli", "pengeluaran riil"], ipm: ["indeks pembangunan manusia", "pembangunan manusia"],
    gini: ["gini", "ketimpangan pendapatan", "rasio gini"], ikg: ["ketimpangan gender", "gender"],
    p0: ["penduduk miskin", "kemiskinan", "angka kemiskinan", "persentase miskin", "orang miskin", "miskin"], rentan: ["rentan miskin", "rentan"],
    p1: ["kedalaman kemiskinan", "indeks kedalaman"], p2: ["keparahan kemiskinan", "indeks keparahan"], garis: ["garis kemiskinan"]
  };
  function siapkanIndikator() {
    if (!PST.indikatorSiap) { IND = false; return Promise.resolve(false); }
    return PST.indikatorSiap().then(function (d) {
      IND = d || false;
      if (IND && PH) PH.tambahKosakata(daftarIndikator().map(function (it) { return it.label + " " + (it.abbr || ""); }).join(" "), 3);
      return IND;
    }).catch(function () { IND = false; return false; });
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
  function tahunLabel(l) { return String(l).replace(/\D/g, "").slice(0, 4); }
  function deretUntuk(id) {
    var km = IND.kemiskinan || {}, pt = IND.pdrbTahun || {}, ipm = IND.ipm || {};
    var d = { p0: [km.label, km.p0], p1: [km.label, km.p1], p2: [km.label, km.p2], garis: [km.label, km.garis],
              ipm: [ipm.label, ipm.nilai], lpe: [pt.label, pt.lpe], "pdrb-adhb": [pt.label, pt.adhb], "pdrb-adhk": [pt.label, pt.adhk] }[id];
    return d && d[0] && d[1] && d[0].length ? d : null;
  }
  function singkat(it) { var s = String(it.abbr || "").split(/[ ·]/)[0]; return s && s.length <= 6 && CARI.HENTI.indexOf(s.toLowerCase()) === -1 ? s : it.label; }
  function cariIndikator(luas) {
    if (!IND) return null;
    var t = " " + luas.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ") + " ";
    var tok = t.trim().split(" ");
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
  function fmtTanda(n, dec) { return (n > 0 ? "+" : n < 0 ? "\u2212" : "") + fmtAngka(Math.abs(n), dec); }
  function anchorUntuk(it) {
    var a = { ekonomi: "#ekonomi", manusia: "#manusia", pemerataan: "#kemiskinan", demografi: "#kependudukan", ketenagakerjaan: "#kependudukan" }[it.kat] || "#ringkasan";
    if (["p0", "p1", "p2", "garis", "rentan"].indexOf(it.id) !== -1) a = "#kemiskinan";
    return a;
  }
  function glosUntuk(it) {
    return GLOS.filter(function (g) { return g.id === it.id; })[0] || GLOS.filter(function (g) { return g.indikator === it.id; })[0];
  }
  function tautanIndikator(it, tambahan) {
    var glos = glosUntuk(it);
    return tautanHtml([{ u: T_IND + anchorUntuk(it), l: "Lihat grafik & rinciannya di Indikator Strategis" }]
      .concat(glos ? [{ u: "glosarium.html#" + glos.id, l: "Apa itu " + (glos.singkat ? glos.singkat.split(/[ \/]+/)[0] : glos.istilah) + " & cara membacanya" }] : [])
      .concat(tambahan || []));
  }
  var SUMBER_BOOKLET = "Sumber: Booklet Indikator Strategis BPS Kabupaten Kutai Kartanegara. Angka resmi rujuk publikasi aslinya.";
  function chipsIndikator(it) {
    var s = singkat(it), c = [];
    if (metaBanding(it.id) && adaBanding(metaBanding(it.id))) c.push(["Peringkat di Kaltim", "Kukar peringkat berapa " + s + " di Kaltim?"], ["Bandingkan dengan Samarinda", "bandingkan " + s + " Kukar dengan Samarinda"]);
    if (deretUntuk(it.id)) c.push(["Tren 5 tahun", s + " Kukar naik atau turun sejak " + tahunLabel(deretUntuk(it.id)[0][0]) + "?"]);
    c.push(["Minta data lengkap", "ajukan permintaan data " + it.label]);
    return c.slice(0, 4);
  }
  function jawabIndikator(p, c) {
    var it = c.it, teks = p.teks, tahun = p.ent.tahun[0];
    var html = catatanKoreksi(p), deret = deretUntuk(it.id);
    var idx = -1;
    if (tahun && deret) idx = deret[0].map(tahunLabel).indexOf(tahun);
    if (tahun && idx !== -1) {
      html += "<b>" + esc(it.label) + " Kutai Kartanegara " + esc(tahun) + ": " + fmtAngka(deret[1][idx], it.dec) + (it.unit ? " " + esc(it.unit) : "") + "</b>";
      if (idx > 0) { var d0 = deret[1][idx] - deret[1][idx - 1]; html += ket(fmtTanda(d0, it.dec) + (it.unit === "%" ? " poin" : it.unit ? " " + esc(it.unit) : "") + " dibanding " + esc(tahunLabel(deret[0][idx - 1])) + "."); }
      KONTEKS.tahun = tahun;
    } else {
      html += "<b>" + esc(it.label) + " Kutai Kartanegara: " + fmtAngka(it.value, it.dec) + (it.unit ? " " + esc(it.unit) : "") + "</b>" +
        (it.abbr ? ' <span class="cb__meta">(' + esc(it.abbr) + ")</span>" : "");
      if (tahun && deret) html += ket("Tahun " + esc(tahun) + " tidak ada di deret; yang tersedia " + esc(tahunLabel(deret[0][0])) + "–" + esc(tahunLabel(deret[0][deret[0].length - 1])) + ".");
      else if (tahun) html += ket("Yang tersedia di situs hanya angka terbaru; deret tahunan " + esc(it.label) + " tidak ada.");
      KONTEKS.tahun = null;
    }
    if (it.note) html += ket(esc(it.note));
    if (deret && deret[0].length > 1 && idx === -1) {
      html += ket(deret[0].map(function (l, i) { return esc(l) + ": " + fmtAngka(deret[1][i], it.dec); }).join(" · "), "margin-top:6px");
    }
    html += tautanIndikator(it);
    html += ket(SUMBER_BOOKLET, "margin-top:8px;color:var(--cb-ink-3)");
    var hasil = CARI.cocokkan(it.label + " " + (SINONIM[it.id] || []).join(" "), 2);
    if (hasil.length) { html += ket("Data lengkapnya di katalog:", "margin-top:10px;color:var(--cb-ink-3)") + hasil.map(kartuKatalog).join(""); catatTawaran(teks, hasil); }
    KONTEKS.indikator = it; KONTEKS.jenis = "indikator";
    pesanBot(html, chipsIndikator(it), { jenis: "indikator", skor: c.skor, tanya: p.asli });
  }

  /* ---------------------------------- bandingkan / peringkat / tren */
  var BANDING = [
    { k: "ipm",        id: "ipm",         label: "IPM",                        unit: "",           dec: 2, arah: "tinggi", th: "tahunIpm",        prov: "provIpm" },
    { k: "miskin",     id: "p0",          label: "Persentase penduduk miskin", unit: "%",          dec: 2, arah: "rendah", th: "tahunMiskin",     prov: "provMiskin" },
    { k: "uhh",        id: "uhh",         label: "Umur harapan hidup",         unit: "tahun",      dec: 2, arah: "tinggi", th: "tahunIpm",        prov: "provUhh" },
    { k: "hls",        id: "hls",         label: "Harapan lama sekolah",       unit: "tahun",      dec: 2, arah: "tinggi", th: "tahunIpm",        prov: "provHls" },
    { k: "rls",        id: "rls",         label: "Rata-rata lama sekolah",     unit: "tahun",      dec: 2, arah: "tinggi", th: "tahunIpm",        prov: "provRls" },
    { k: "ppp",        id: "ppp",         label: "Pengeluaran per kapita",     unit: "ribu Rp/th", dec: 0, arah: "tinggi", th: "tahunIpm",        prov: "provPpp" },
    { k: "penduduk",   id: "penduduk",    label: "Jumlah penduduk",            unit: "ribu jiwa",  dec: 2, arah: "netral", th: "tahunPenduduk",   prov: null, hitung: function (r) { return r.laki != null && r.perempuan != null ? Number(r.laki) + Number(r.perempuan) : null; } },
    { k: "tpt",        id: "tpt",         label: "Pengangguran terbuka (TPT)", unit: "%",          dec: 2, arah: "rendah", th: "tahunTpt",        prov: "provTpt" },
    { k: "lpe",        id: "lpe",         label: "Pertumbuhan ekonomi",        unit: "%",          dec: 2, arah: "tinggi", th: "tahunLpe",        prov: "provLpe" },
    { k: "pdrbKapita", id: "pdrb-kapita", label: "PDRB per kapita",            unit: "juta Rp",    dec: 1, arah: "netral", th: "tahunPdrbKapita", prov: "provPdrbKapita" },
    { k: "gini",       id: "gini",        label: "Rasio Gini",                 unit: "",           dec: 3, arah: "rendah", th: "tahunGini",       prov: "provGini" }
  ];
  function metaBanding(id) { return BANDING.filter(function (m) { return m.id === id; })[0] || null; }
  function nilaiBanding(m, r) { var v = m.hitung ? m.hitung(r) : r[m.k]; return v == null || v === "" || isNaN(Number(v)) ? null : Number(v); }
  function barisBanding(m) {
    return (IND.wilayah || []).map(function (r) { return { r: r, v: nilaiBanding(m, r) }; }).filter(function (x) { return x.v != null; });
  }
  function adaBanding(m) { return IND && (IND.wilayah || []).length > 1 && barisBanding(m).length >= 2; }
  function urutBanding(m) {
    return barisBanding(m).sort(function (a, b) { return m.arah === "rendah" ? a.v - b.v : b.v - a.v; });
  }
  function tahunBanding(m) { return (IND.banding && IND.banding[m.th]) || ""; }
  function satuan(m, v) { return fmtAngka(v, m.dec) + (m.unit ? " " + m.unit : ""); }
  function daftarBanding() { return BANDING.filter(adaBanding).map(function (m) { return m.label; }); }

  function jawabPeringkat(p, it) {
    var m = metaBanding(it.id);
    if (!m || !adaBanding(m)) return jawabTanpaBanding(p, it);
    var urut = urutBanding(m), home = -1;
    urut.forEach(function (x, i) { if (x.r.home || x.r.kode === "KKR") home = i; });
    var n = urut.length, th = tahunBanding(m), tl = PH ? PH.normal(p.teks) : p.teks.toLowerCase();
    var html = catatanKoreksi(p);
    /* "kabupaten paling miskin", "IPM tertinggi di Kaltim" → nilai ekstremnya dulu */
    var ekstrem = /\b(peringkat|urutan|posisi|ranking|rangking|nomor|ke berapa)\b/.test(tl) ? null
      : /\b(paling (rendah|kecil|sedikit|baik|sejahtera|kaya|maju)|terendah|terkecil|tersedikit|terbaik|termaju)\b/.test(tl) ? (m.arah === "rendah" ? "rendah" : "tinggi")
      : /\b(paling|ter(tinggi|besar|banyak|miskin|buruk|tertinggal|padat))\b/.test(tl) ? (m.arah === "rendah" ? "tinggi" : "tinggi") : null;
    if (/\b(paling (miskin|buruk|tertinggal)|termiskin|terburuk|tertinggal)\b/.test(tl)) ekstrem = m.arah === "rendah" ? "tinggi" : "rendah";
    var byAsc = barisBanding(m).sort(function (a, b) { return a.v - b.v; });
    var minR = byAsc[0], maksR = byAsc[byAsc.length - 1];
    if (ekstrem) {
      html += "<b>" + esc(m.label) + (th ? " " + esc(th) : "") + " " + (ekstrem === "tinggi" ? "tertinggi" : "terendah") + " se-Kaltim: " + esc((ekstrem === "tinggi" ? maksR : minR).r.nama) + " (" + satuan(m, (ekstrem === "tinggi" ? maksR : minR).v) + ")</b>" +
        ket((ekstrem === "tinggi" ? "Terendah" : "Tertinggi") + ": " + esc((ekstrem === "tinggi" ? minR : maksR).r.nama) + " (" + satuan(m, (ekstrem === "tinggi" ? minR : maksR).v) + ")." +
          (home !== -1 ? " Kutai Kartanegara: <b>" + satuan(m, urut[home].v) + "</b>, peringkat " + (home + 1) + " dari " + n + (m.arah === "rendah" ? " (diurutkan dari yang terendah)." : ".") : ""));
    } else if (home !== -1) {
      var k = urut[home];
      html += "<b>" + esc(m.label) + " Kutai Kartanegara" + (th ? " " + esc(th) : "") + ": " + satuan(m, k.v) + " — peringkat " + (home + 1) + " dari " + n + " kabupaten/kota se-Kaltim</b>";
      html += ket(m.arah === "rendah" ? "Diurutkan dari yang terendah (peringkat 1 = paling rendah)." : m.arah === "tinggi" ? "Diurutkan dari yang tertinggi." : "Diurutkan dari yang terbesar.");
    } else html += "<b>" + esc(m.label) + " per kabupaten/kota se-Kaltim" + (th ? " " + esc(th) : "") + "</b>";
    html += '<ol class="cb__urut">' + urut.map(function (x, i) {
      var kukar = i === home;
      return "<li" + (kukar ? ' class="is-kukar"' : "") + ">" + esc(x.r.nama) + " <span>" + satuan(m, x.v) + "</span></li>";
    }).join("") + "</ol>";
    var prov = m.prov && IND.banding ? IND.banding[m.prov] : null;
    if (prov != null && prov !== "" && home !== -1) {
      var selisih = urut[home].v - Number(prov);
      html += ket("Kalimantan Timur: <b>" + satuan(m, Number(prov)) + "</b> — Kukar " + (Math.abs(selisih) < Math.pow(10, -m.dec) / 2 ? "sama dengan" : (selisih > 0 ? "di atas" : "di bawah")) + " provinsi (" + fmtTanda(selisih, m.dec) + (m.unit === "%" ? " poin" : "") + ").");
    }
    html += tautanIndikator(it, [{ u: T_IND + "#bandingkan", l: "Grafik perbandingan 10 kab/kota" }]);
    if (IND.banding && IND.banding.sumber) html += ket("Sumber: " + esc(IND.banding.sumber), "margin-top:8px;color:var(--cb-ink-3)");
    KONTEKS.indikator = it; KONTEKS.jenis = "banding";
    pesanBot(html, [["Bandingkan dengan Samarinda", "bandingkan " + singkat(it) + " Kukar dengan Samarinda"], ["Indikator lain", "peringkat apa saja yang bisa dibandingkan?"], ["Minta data lengkap", "ajukan permintaan data " + it.label]], { jenis: "banding", tanya: p.asli });
  }
  function jawabBandingWilayah(p, it) {
    var m = metaBanding(it.id);
    if (!m || !adaBanding(m)) return jawabTanpaBanding(p, it);
    var baris = barisBanding(m), th = tahunBanding(m);
    var kukar = baris.filter(function (x) { return x.r.home || x.r.kode === "KKR"; })[0];
    var lain = p.ent.wilayah.map(function (w) { return baris.filter(function (x) { return x.r.kode === w.kode || x.r.nama === w.nama; })[0]; }).filter(Boolean);
    var html = catatanKoreksi(p);
    var baik = function (a, b) { return m.arah === "netral" ? null : (m.arah === "rendah" ? a < b : a > b); };
    if (p.ent.prov && !lain.length) {
      var prov = m.prov && IND.banding ? IND.banding[m.prov] : null;
      if (prov == null || prov === "") return pesanBot(catatanKoreksi(p) + "Angka " + esc(m.label) + " Provinsi Kaltim belum ada di situs." + tautanIndikator(it), chipsIndikator(it), { jenis: "banding", skor: 0, tanya: p.asli });
      var s = kukar.v - Number(prov);
      html += "<b>" + esc(m.label) + (th ? " " + esc(th) : "") + "</b>" +
        ket("Kutai Kartanegara: <b>" + satuan(m, kukar.v) + "</b><br>Kalimantan Timur: <b>" + satuan(m, Number(prov)) + "</b>") +
        ket("Selisih " + fmtTanda(s, m.dec) + (m.unit === "%" ? " poin" : "") + " — Kukar " + (Math.abs(s) < Math.pow(10, -m.dec) / 2 ? "sama dengan provinsi" : (s > 0 ? "di atas" : "di bawah") + " angka provinsi") +
          (baik(kukar.v, Number(prov)) === null ? "" : baik(kukar.v, Number(prov)) ? " (lebih baik)" : " (kurang baik)") + ".");
    } else {
      if (!lain.length) return jawabPeringkat(p, it);
      html += "<b>" + esc(m.label) + (th ? " " + esc(th) : "") + "</b>";
      var semua = (p.ent.kukar || p.niat.banding ? [kukar].concat(lain) : lain.concat([kukar])).filter(Boolean);
      html += ket(semua.map(function (x) { return esc(x.r.nama) + ": <b>" + satuan(m, x.v) + "</b>"; }).join("<br>"));
      if (kukar && lain.length === 1) {
        var d = kukar.v - lain[0].v, b2 = baik(kukar.v, lain[0].v);
        html += ket("Selisih " + fmtTanda(d, m.dec) + (m.unit === "%" ? " poin" : "") + " — Kukar " + (Math.abs(d) < Math.pow(10, -m.dec) / 2 ? "sama dengan" : d > 0 ? "lebih tinggi dari" : "lebih rendah dari") + " " + esc(lain[0].r.nama) + (b2 === null ? "" : b2 ? " (lebih baik)" : " (kurang baik)") + ".");
      }
      var urut = urutBanding(m), pos = {}; urut.forEach(function (x, i) { pos[x.r.nama] = i + 1; });
      html += ket("Peringkat se-Kaltim (" + urut.length + " kab/kota): " + semua.map(function (x) { return esc(x.r.nama) + " ke-" + pos[x.r.nama]; }).join(", ") + ".", "color:var(--cb-ink-3)");
    }
    html += tautanIndikator(it, [{ u: T_IND + "#bandingkan", l: "Grafik perbandingan 10 kab/kota" }]);
    if (IND.banding && IND.banding.sumber) html += ket("Sumber: " + esc(IND.banding.sumber), "margin-top:8px;color:var(--cb-ink-3)");
    KONTEKS.indikator = it; KONTEKS.jenis = "banding";
    pesanBot(html, [["Peringkat lengkap", "Kukar peringkat berapa " + singkat(it) + " di Kaltim?"], ["Bandingkan dengan Kaltim", "bandingkan " + singkat(it) + " Kukar dengan Kaltim"], ["Tren 5 tahun", singkat(it) + " Kukar naik atau turun?"]], { jenis: "banding", tanya: p.asli });
  }
  function jawabTanpaBanding(p, it) {
    var ada = daftarBanding();
    var html = catatanKoreksi(p) + "Angka <b>" + esc(it.label) + "</b> per kabupaten/kota belum tersedia di situs ini" +
      (ada.length ? ", yang bisa dibandingkan: " + esc(ada.join(", ")) + "." : ".") +
      ket("Untuk Kukar sendiri: <b>" + fmtAngka(it.value, it.dec) + (it.unit ? " " + esc(it.unit) : "") + "</b>" + (it.abbr ? " (" + esc(it.abbr) + ")" : "") + ".", "margin-top:6px") +
      tautanIndikator(it, [{ u: T_IND + "#bandingkan", l: "Bagian Bandingkan di Indikator Strategis" }]);
    KONTEKS.indikator = it; KONTEKS.jenis = "banding";
    pesanBot(html, [["Peringkat IPM", "Kukar peringkat berapa IPM di Kaltim?"], ["Peringkat kemiskinan", "Kukar peringkat berapa kemiskinan di Kaltim?"], ["Minta data lengkap", "ajukan permintaan data " + it.label]], { jenis: "banding", skor: 0, tanya: p.asli });
  }
  function jawabTren(p, it) {
    var deret = deretUntuk(it.id);
    if (!deret) {
      var html0 = catatanKoreksi(p) + "Deret tahunan <b>" + esc(it.label) + "</b> belum ada di situs; yang tersedia angka terbaru: <b>" + fmtAngka(it.value, it.dec) + (it.unit ? " " + esc(it.unit) : "") + "</b>" + (it.abbr ? " (" + esc(it.abbr) + ")" : "") + "." +
        (it.note ? ket(esc(it.note)) : "") + tautanIndikator(it);
      KONTEKS.indikator = it; KONTEKS.jenis = "tren";
      return pesanBot(html0, [["Tren IPM", "IPM Kukar naik atau turun sejak 2021?"], ["Tren kemiskinan", "kemiskinan Kukar naik atau turun?"], ["Minta data lengkap", "ajukan permintaan data " + it.label]], { jenis: "tren", skor: 0, tanya: p.asli });
    }
    var th = deret[0].map(tahunLabel), v = deret[1].map(Number);
    var awal = 0, akhir = v.length - 1;
    var tAwal = p.ent.tahun.length ? th.indexOf(p.ent.tahun[0]) : -1, tAkhir = p.ent.tahun.length > 1 ? th.indexOf(p.ent.tahun[1]) : -1;
    if (tAwal !== -1) awal = tAwal; if (tAkhir !== -1 && tAkhir > awal) akhir = tAkhir;
    if (awal >= akhir) { awal = 0; akhir = v.length - 1; }
    var beda = v[akhir] - v[awal], pct = v[awal] ? beda / Math.abs(v[awal]) * 100 : null;
    var poin = it.unit === "%" ? " poin" : it.unit ? " " + esc(it.unit) : " poin";
    var naik = 0, turun = 0; for (var i = awal + 1; i <= akhir; i++) { if (v[i] > v[i - 1]) naik++; else if (v[i] < v[i - 1]) turun++; }
    var kata = beda > 0 ? "naik" : beda < 0 ? "turun" : "tidak berubah";
    var pola = naik && !turun ? "naik setiap tahun" : turun && !naik ? "turun setiap tahun" : "naik-turun (" + naik + " kali naik, " + turun + " kali turun)";
    var html = catatanKoreksi(p) + "<b>" + esc(it.label) + " Kutai Kartanegara " + kata + " dari " + fmtAngka(v[awal], it.dec) + " (" + esc(th[awal]) + ") menjadi " + fmtAngka(v[akhir], it.dec) + " (" + esc(th[akhir]) + ")</b>" +
      ket("Perubahan " + fmtTanda(beda, it.dec) + poin + (pct != null ? " (" + fmtTanda(pct, 1) + "%)" : "") + " selama " + (akhir - awal) + " tahun; " + pola + ".");
    var maks = v.indexOf(Math.max.apply(null, v.slice(awal, akhir + 1))), min = v.indexOf(Math.min.apply(null, v.slice(awal, akhir + 1)));
    html += ket("Tertinggi " + fmtAngka(v[maks], it.dec) + " (" + esc(th[maks]) + "), terendah " + fmtAngka(v[min], it.dec) + " (" + esc(th[min]) + ").");
    html += ket(deret[0].map(function (l, i) { return esc(l) + ": " + fmtAngka(v[i], it.dec); }).join(" · "), "margin-top:6px");
    if (["p0", "p1", "p2", "tpt", "gini"].indexOf(it.id) !== -1) html += ket("Untuk indikator ini, turun berarti membaik.", "color:var(--cb-ink-3)");
    var g = glosUntuk(it); if (g && g.baca) html += ket("<b>Cara membaca:</b> " + esc(g.baca), "margin-top:6px");
    html += tautanIndikator(it) + ket(SUMBER_BOOKLET, "margin-top:8px;color:var(--cb-ink-3)");
    KONTEKS.indikator = it; KONTEKS.jenis = "tren";
    pesanBot(html, chipsIndikator(it), { jenis: "tren", tanya: p.asli });
  }

  /* ------------------------------------------------------- kecamatan */
  var METRIK_KEC = [
    { k: "penduduk", label: "Jumlah penduduk", unit: "jiwa", dec: 0, re: /\b(penduduk|populasi|jiwa|orang|warga|banyak)\b/ },
    { k: "luas", label: "Luas wilayah", unit: "km²", dec: 2, re: /\b(luas|terluas|luasnya|wilayah|km2?)\b/ },
    { k: "kepadatan", label: "Kepadatan penduduk", unit: "jiwa/km²", dec: 0, re: /\b(padat|terpadat|kepadatan)\b/, hitung: function (r) { return r.penduduk != null && r.luas ? Number(r.penduduk) / Number(r.luas) : null; } },
    { k: "desa", label: "Jumlah desa", unit: "desa", dec: 0, re: /\b(desa|kampung)\b/ },
    { k: "kelurahan", label: "Jumlah kelurahan", unit: "kelurahan", dec: 0, re: /\bkelurahan\b/ },
    { k: "laki", label: "Penduduk laki-laki", unit: "jiwa", dec: 0, re: /\b(laki|pria)\b/ },
    { k: "perempuan", label: "Penduduk perempuan", unit: "jiwa", dec: 0, re: /\b(perempuan|wanita)\b/ }
  ];
  function metrikKec(teks) { var t = PH ? PH.normal(teks) : String(teks).toLowerCase(); return METRIK_KEC.filter(function (x) { return x.re.test(t); })[0] || null; }
  function nilaiKec(m, r) { var v = m.hitung ? m.hitung(r) : r[m.k]; return v == null || v === "" || isNaN(Number(v)) ? null : Number(v); }
  function publikasiKec(nama) {
    var k = (K.KECAMATAN || []).filter(function (x) { return x[0].toLowerCase() === String(nama).toLowerCase(); })[0];
    return k ? { u: k[2], l: "Kecamatan " + k[0] + " Dalam Angka " + k[1] } : null;
  }
  function jawabKecamatan(p) {
    var t = PH ? PH.normal(p.teks) : p.teks.toLowerCase();
    var daftar = (IND && IND.kecamatan && IND.kecamatan.daftar) || [];
    var meta = (IND && IND.kecamatan) || {};
    var m = metrikKec(t) || METRIK_KEC[0];
    var html = catatanKoreksi(p), chipsK = [];
    var tautanTabel = (K.TAUTAN && K.TAUTAN.tPendKec) ? [{ u: K.TAUTAN.tPendKec, l: "Tabel BPS: jumlah penduduk menurut kecamatan" }] : [];
    if (p.ent.kecamatan.length) {
      var nama = p.ent.kecamatan[0];
      var r = daftar.filter(function (x) { return String(x.nama).toLowerCase() === nama.toLowerCase(); })[0];
      var v = r ? nilaiKec(m, r) : null;
      var pub = publikasiKec(nama);
      if (v != null) {
        html += "<b>" + esc(m.label) + " Kecamatan " + esc(nama) + (meta.tahun ? " " + esc(meta.tahun) : "") + ": " + fmtAngka(v, m.dec) + " " + esc(m.unit) + "</b>";
        var rinci = METRIK_KEC.filter(function (x) { return x.k !== m.k && nilaiKec(x, r) != null; }).map(function (x) { return esc(x.label) + " " + fmtAngka(nilaiKec(x, r), x.dec) + " " + esc(x.unit); });
        if (rinci.length) html += ket(rinci.join(" · "));
        var urut = daftar.map(function (x) { return { x: x, v: nilaiKec(m, x) }; }).filter(function (y) { return y.v != null; }).sort(function (a, b) { return b.v - a.v; });
        var pos = urut.map(function (y) { return y.x.nama; }).indexOf(r.nama);
        if (pos !== -1 && urut.length > 1) html += ket("Peringkat " + (pos + 1) + " dari " + urut.length + " kecamatan (terbesar " + esc(urut[0].x.nama) + " " + fmtAngka(urut[0].v, m.dec) + ", terkecil " + esc(urut[urut.length - 1].x.nama) + " " + fmtAngka(urut[urut.length - 1].v, m.dec) + ").");
        html += ket("Sumber: " + esc(meta.sumber || "BPS Kabupaten Kutai Kartanegara"), "margin-top:8px;color:var(--cb-ink-3)");
        html += tautanHtml((pub ? [pub] : []).concat(tautanTabel));
        chipsK = [["Kecamatan terbesar", "kecamatan mana yang penduduknya paling banyak?"], ["Kecamatan terluas", "kecamatan terluas di Kukar?"], ["Minta data lengkap", "ajukan permintaan data " + m.label + " Kecamatan " + nama]];
        return pesanBot(html, chipsK, { jenis: "kecamatan", tanya: p.asli });
      }
      html += "Angka <b>" + esc(m.label.toLowerCase()) + " Kecamatan " + esc(nama) + "</b> belum ada di situs ini. Sumber resminya publikasi tahunan kecamatan (penduduk per desa, fasilitas, pertanian):" +
        tautanHtml((pub ? [pub] : []).concat(tautanTabel, [{ u: "index.html?q=" + encodeURIComponent("kecamatan " + nama), l: "Cari di katalog: kecamatan " + nama }]));
      chipsK = [["Ajukan permintaan data", "ajukan permintaan data " + m.label + " Kecamatan " + nama], ["Data per desa apa saja?", "data apa saja yang tersedia sampai level desa"], ["Konsultasi daring", "mau konsultasi daring lewat zoom"]];
      return pesanBot(html, chipsK, { jenis: "kecamatan", skor: 0, tanya: p.asli });
    }
    /* tanpa nama kecamatan: "kecamatan paling padat", "kecamatan terluas" */
    var semua = daftar.map(function (x) { return { x: x, v: nilaiKec(m, x) }; }).filter(function (y) { return y.v != null; });
    if (semua.length >= 2) {
      var kecil = /\b(terkecil|tersedikit|paling (kecil|sedikit)|terendah)\b/.test(t);
      semua.sort(function (a, b) { return kecil ? a.v - b.v : b.v - a.v; });
      html += "<b>" + esc(m.label) + " per kecamatan" + (meta.tahun ? " " + esc(meta.tahun) : "") + " — " + (kecil ? "terkecil" : "terbesar") + ": " + esc(semua[0].x.nama) + " (" + fmtAngka(semua[0].v, m.dec) + " " + esc(m.unit) + ")</b>";
      html += '<ol class="cb__urut">' + semua.map(function (y) { return "<li>" + esc(y.x.nama) + " <span>" + fmtAngka(y.v, m.dec) + "</span></li>"; }).join("") + "</ol>";
      html += ket("Sumber: " + esc(meta.sumber || "BPS Kabupaten Kutai Kartanegara"), "margin-top:8px;color:var(--cb-ink-3)") + tautanHtml(tautanTabel);
      return pesanBot(html, [["Penduduk Tenggarong", "penduduk kecamatan Tenggarong berapa?"], ["Minta data lengkap", "ajukan permintaan data " + m.label + " per kecamatan"]], { jenis: "kecamatan", tanya: p.asli });
    }
    html += "Angka <b>" + esc(m.label.toLowerCase()) + " per kecamatan</b> belum ada di situs ini. Sumbernya Kabupaten Kutai Kartanegara Dalam Angka dan publikasi tiap kecamatan:" +
      tautanHtml(tautanTabel.concat([{ u: "index.html?q=kecamatan", l: "Cari di katalog: data per kecamatan" }]));
    return pesanBot(html, [["Ajukan permintaan data", "ajukan permintaan data " + m.label + " per kecamatan"], ["Data per desa apa saja?", "data apa saja yang tersedia sampai level desa"]], { jenis: "kecamatan", skor: 0, tanya: p.asli });
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
  function jawabGlosarium(p, cocok) {
    var teks = p.teks;
    var tanyaHitung = /\b(hitung|dihitung|rumus)\b/i.test(teks), tanyaBeda = /\b(beda|bedanya|perbedaan)\b/i.test(teks);
    var html = catatanKoreksi(p) + cocok.map(function (c) {
      var g = c.g, h = "<b>" + esc(g.istilah) + (g.singkat ? " (" + esc(g.singkat) + ")" : "") + "</b>" + ket(esc(g.definisi));
      if ((tanyaHitung || cocok.length === 1) && g.hitung) h += ket("<b>Cara menghitung:</b> " + esc(g.hitung), "margin-top:6px");
      if (cocok.length === 1 && g.baca) h += ket("<b>Cara membaca:</b> " + esc(g.baca), "margin-top:6px");
      if (cocok.length === 1 && g.keliru) h += ket("<b>Sering keliru:</b> " + esc(g.keliru), "margin-top:6px");
      return '<div style="margin-bottom:8px">' + h + "</div>";
    }).join("");
    var tautan = cocok.map(function (c) { return { u: "glosarium.html#" + c.g.id, l: "Selengkapnya: " + c.g.istilah }; });
    if (cocok.length === 1 && cocok[0].g.indikator) tautan.push({ u: T_IND, l: "Lihat angka Kukar di Indikator Strategis" });
    html += tautanHtml(tautan);
    var nm = cocok[0].g.singkat ? cocok[0].g.singkat.split(/[ \/]+/)[0] : cocok[0].g.istilah;
    var lanjut = [["Cara membacanya", "bagaimana cara membaca " + nm + "?"], ["Berapa angkanya di Kukar", "berapa " + nm + " Kukar?"], ["Buka glosarium", "buka glosarium"]];
    if (tanyaBeda && cocok.length < 2) lanjut.unshift(["Buka glosarium", "buka glosarium"]);
    var itG = IND ? daftarIndikator().filter(function (x) { return x.id === cocok[0].g.id || x.id === cocok[0].g.indikator; })[0] : null;
    if (itG) { KONTEKS.indikator = itG; KONTEKS.jenis = "glosarium"; }
    pesanBot(html, lanjut, { jenis: "glosarium", skor: cocok[0].skor, tanya: p.asli });
  }

  /* ------------------------------------------------ publikasi & BRS */
  var JENIS_TERBIT = { brs: "Berita Resmi Statistik", publikasi: "Publikasi", infografis: "Infografis", tabel: "Tabel", berita: "Berita", agenda: "Agenda rilis" };
  function tglPendek(iso) { return iso ? PST.tgl(iso) : ""; }
  function jawabTerbitan(p) {
    var t = PH ? PH.normal(p.teks) : p.teks.toLowerCase();
    var kapan = /\bkapan\b/.test(t) && /\b(terbit|rilis|keluar|tersedia|ada)\b/.test(t);
    var jenisMinta = /\b(brs|berita resmi)\b/.test(t) ? "brs" : /\binfografis\b/.test(t) ? "infografis" : (/\b(agenda|jadwal rilis|rencana terbit)\b/.test(t) || kapan) ? "agenda" : null;
    var kata = (PH ? PH.tokens(t) : t.split(/\s+/)).filter(function (w) { return w.length >= 4 && CARI.HENTI.indexOf(w) === -1 && !/^(publikasi|buku|terbitan|brs|berita|resmi|statistik|infografis|rilis|terbit|agenda|jadwal|unduh|download|tentang|terbaru|kapan|keluar|dalam|angka|rencana|berikutnya|mendatang|selanjutnya|depan|terdekat|datang|nanti|tersedia|mana|saja)$/.test(w); });
    var stem = function (w) { return CARI.penggal ? CARI.penggal(w) : [w]; };
    var cocok = function (judul) {
      var j = " " + String(judul).toLowerCase() + " ", n = 0;
      kata.forEach(function (w) { if (stem(w).some(function (x) { return j.indexOf(x) !== -1; })) n++; });
      return n;
    };
    var hariIni = new Date().toISOString().slice(0, 10);
    PST.daftarTerbitanPublik().then(function (rows) {
      var daftar = (rows || []).map(function (r) { return { r: r, n: cocok(r.judul + " " + (r.ringkas || "")) }; });
      /* publikasi tiap kecamatan dari katalog */
      (K.KECAMATAN || []).forEach(function (k) {
        var judul = "Kecamatan " + k[0] + " Dalam Angka " + k[1];
        daftar.push({ r: { jenis: "publikasi", judul: judul, tanggal: k[1] + "-09-26", tautan: k[2], sumber: "katalog" }, n: cocok(judul) });
      });
      /* nama publikasi di katalog (kolom mn) */
      K.DATA.forEach(function (d) {
        if (!d.ln || !d.ln.length) return;
        var n = cocok(d.n + " " + (d.mn || "") + " " + d.ln.map(function (x) { return x.l; }).join(" "));
        if (n) daftar.push({ r: { jenis: "katalog", judul: d.n, ringkas: d.ln.map(function (x) { return x.l; }).join(" · "), tautan: d.ln[0].u, tanggal: "", sumber: "katalog" }, n: n * 0.8 });
      });
      var hasil;
      var agendaMendatang = function (x) { return x.r.jenis === "agenda" && (!x.r.tanggal || x.r.tanggal >= hariIni); };
      if (jenisMinta === "agenda" && kata.length) hasil = daftar.filter(function (x) { return x.n > 0 && (agendaMendatang(x) || x.r.jenis !== "agenda"); }).sort(function (a, b) { return (agendaMendatang(b) - agendaMendatang(a)) || b.n - a.n || String(b.r.tanggal).localeCompare(String(a.r.tanggal)); });
      if (jenisMinta === "agenda" && (!kata.length || !hasil.length)) { kata = []; hasil = daftar.filter(agendaMendatang).sort(function (a, b) { return String(a.r.tanggal).localeCompare(String(b.r.tanggal)); }); }
      else if (kata.length) hasil = daftar.filter(function (x) { return x.n > 0 && (!jenisMinta || x.r.jenis === jenisMinta) && (x.r.jenis !== "agenda" || agendaMendatang(x)); }).sort(function (a, b) { return b.n - a.n || String(b.r.tanggal).localeCompare(String(a.r.tanggal)); });
      else if (jenisMinta !== "agenda") hasil = daftar.filter(function (x) { return x.r.jenis !== "agenda" && x.r.jenis !== "katalog" && (!jenisMinta || x.r.jenis === jenisMinta); }).sort(function (a, b) { return String(b.r.tanggal).localeCompare(String(a.r.tanggal)); });
      hasil = hasil.slice(0, 5);
      var html = catatanKoreksi(p), chipsT = [["Agenda rilis berikutnya", "agenda rilis BPS Kukar berikutnya"], ["BRS terbaru", "BRS terbaru BPS Kukar"], ["Publikasi terbaru", "publikasi terbaru BPS Kukar"]];
      if (!hasil.length) {
        html += (kata.length ? "Belum ada terbitan yang cocok dengan <i>" + esc(kata.join(" ")) + "</i> di daftar terbitan situs ini." : "Belum ada " + esc(jenisMinta ? JENIS_TERBIT[jenisMinta] : "terbitan") + " di daftar terbitan situs ini.") +
          " Semua publikasi, BRS, dan tabel BPS Kukar ada di laman resminya:" +
          tautanHtml([{ u: "https://kukarkab.bps.go.id/id/publication", l: "Publikasi BPS Kukar" }, { u: "https://kukarkab.bps.go.id/id/pressrelease", l: "Berita Resmi Statistik BPS Kukar" }, { u: "index.html?q=" + encodeURIComponent(kata.join(" ")), l: "Cari di katalog data" }]);
        chipsT.push(["Ajukan permintaan data", "ajukan permintaan data " + kata.join(" ")]);
        return pesanBot(html, chipsT, { jenis: "terbitan", skor: 0, tanya: p.asli });
      }
      html += (jenisMinta === "agenda" && !kata.length ? "<b>Agenda rilis BPS Kukar berikutnya:</b>" : kata.length ? "<b>Terbitan yang cocok:</b>" : "<b>" + esc(jenisMinta ? JENIS_TERBIT[jenisMinta] : "Terbitan") + " terbaru BPS Kukar:</b>") +
        hasil.map(function (x) {
          var r = x.r;
          return '<div class="cb__kat"><span class="pill ' + (r.jenis === "agenda" ? "mohon" : r.jenis === "brs" ? "prov" : "ada") + '">' + esc(JENIS_TERBIT[r.jenis] || "Katalog") + "</span> <b>" + esc(r.judul) + "</b>" +
            '<div class="cb__meta">' + (r.tanggal ? esc(tglPendek(r.tanggal)) : "") + (r.ringkas ? (r.tanggal ? " · " : "") + esc(String(r.ringkas).slice(0, 140)) : "") + "</div>" +
            (r.tautan ? tautanHtml([{ u: r.tautan, l: r.jenis === "agenda" ? "Laman publikasi BPS Kukar" : "Buka / unduh" }]) : "") + "</div>";
        }).join("");
      html += ket("Selengkapnya di laman BPS Kukar; agenda & terbitan terbaru juga tampil di beranda PINTAR.", "margin-top:8px;color:var(--cb-ink-3)");
      pesanBot(html, chipsT, { jenis: "terbitan", skor: hasil[0].n, tanya: p.asli });
    }).catch(function () {
      pesanBot("Daftar terbitan sedang tidak bisa dibaca. Semua publikasi dan BRS ada di laman resmi:" + tautanHtml([{ u: "https://kukarkab.bps.go.id/id/publication", l: "Publikasi BPS Kukar" }]), CHIPS_LANJUT, { jenis: "terbitan", skor: 0, tanya: p.asli });
    });
  }

  /* ----------------------------------------- alur: permintaan & konsultasi */
  var ALUR = null;
  var HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"], BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  function labelHari(iso) { var d = new Date(iso + "T00:00:00Z"); return HARI[d.getUTCDay()] + " " + d.getUTCDate() + " " + BULAN[d.getUTCMonth()]; }
  function hpBersih(t) { return String(t || "").replace(/\D/g, ""); }
  function tanyaAlur(html, chipsBaru) { pesanBot(html, chipsBaru || [["Batal", "batal"]], { alat: false }); }
  var CHIP_BATAL = ["Batal", "batal"];

  function mulaiTiket(kebutuhan) {
    ALUR = { jenis: "tiket", d: { kebutuhan: (kebutuhan || "").trim(), ditawarkan: [] } };
    if (sahabat) { ALUR.d.nama = sahabat.profil.nama || sahabat.email; ALUR.d.no_hp = sahabat.profil.no_hp || ""; ALUR.d.email = sahabat.email; }
    if (ALUR.d.kebutuhan.length >= 8) return swalayanDulu(ALUR.d.kebutuhan);
    ALUR.langkah = "kebutuhan";
    tanyaAlur("Baik. Tuliskan data atau informasi apa yang Anda butuhkan — sebut nama datanya, level wilayah (kabupaten/kecamatan/desa), dan tahunnya. Contoh: <i>jumlah penduduk per desa di Kecamatan Loa Kulu 2024</i>." +
      ket("Kalau ternyata sudah tersedia dan bisa diunduh sendiri, saya tunjukkan langsung — tidak perlu menunggu petugas.", "margin-top:6px"));
  }

  /* ------------------------------------------------- layanan mandiri (swalayan)
     Sebelum permintaan diteruskan ke petugas, asisten mencoba menjawabnya sendiri
     dari isi situs: angka indikator terbit, jawaban baku, dan ragam data katalog
     yang berstatus "Unduh di web". Petugas hanya menerima yang memang belum bisa
     dijawab otomatis. */
  function periksaSwalayan(teks) {
    var p = pahami(teks), out = { p: p };
    var rinci = /\b(desa|kelurahan|kecamatan|dusun)\b/i.test(p.teks) || (p.ent.kecamatan || []).length > 0;
    /* 1. angka indikator strategis — hanya untuk angka kabupaten, bukan permintaan rinci per desa */
    if (IND && !rinci) {
      var ci = cariIndikator(CARI.perluas ? CARI.perluas(p.teks) : p.teks);
      if (ci) { out.jenis = "indikator"; out.ci = ci; return out; }
    }
    /* 2. ragam data di katalog — yang menentukan adalah status ragam data paling cocok */
    var hasil = CARI.cocokkanSkor(p.teks, 3, { tambahan: p.tambahan });
    var kuat = hasil.filter(function (x) { return x.kuat; });
    out.hasil = hasil; out.kuat = kuat;
    var pk = jawabPengetahuan(p.teks);
    if (kuat.length) {
      var utama = kuat[0], rinciRegex = /desa|kelurahan|kecamatan/;
      if (rinci) {
        /* permintaan sampai desa/kecamatan: yang menentukan adalah baris yang memang
           membahas level itu — bukan angka kabupaten yang kebetulan cocok katanya */
        var seLevel = kuat.filter(function (x) {
          return rinciRegex.test(String(x.d.lv || "").toLowerCase()) || rinciRegex.test(String(x.d.n).toLowerCase());
        });
        if (seLevel.length) utama = seLevel[0];
        else {
          /* tidak ada yang sampai level itu: jangan diklaim "sudah tersedia" */
          out.jenis = "terbatas"; out.pilih = kuat.slice(0, 2); out.b = pk.skor >= 2 ? pk.b : null; return out;
        }
      }
      if (utama.d.st === "ada") {
        out.pilih = [utama].concat(kuat.filter(function (x) { return x.d.st === "ada" && x !== utama; })).slice(0, 2);
        out.jenis = sudahDitawarkan(p.teks, out.pilih) ? "sudah-ditawarkan" : "tersedia";
        return out;
      }
      out.pilih = [utama].concat(kuat.filter(function (x) { return x !== utama; })).slice(0, 2);
      if (utama.d.st === "mohon") { out.jenis = "resmi"; return out; }
      /* tidak tersedia / hanya level provinsi / data sektoral instansi lain */
      out.jenis = "terbatas"; out.b = pk.skor >= 2 ? pk.b : null; return out;
    }
    /* 3. jawaban baku (mis. alasan data per desa tidak ada, beda dengan Dukcapil) */
    if (pk.b && pk.skor >= 3) { out.jenis = "pengetahuan"; out.b = pk.b; return out; }
    out.jenis = "belum-dikenal";
    return out;
  }

  var CHIP_SWALAYAN = [["Ya, sudah ketemu", "__cukup"], ["Belum sesuai — teruskan ke petugas", "__lanjut"], ["Batal", "batal"]];
  function tanyaSwalayan(html, chipsBaru) {
    ALUR.langkah = "swalayan";
    tanyaAlur(html, chipsBaru || CHIP_SWALAYAN);
  }
  function namaTawaran(x) { return x.d.n + " (" + ((K.LABEL || {})[x.d.st] || x.d.st) + ")"; }

  function swalayanDulu(teks) {
    var k = periksaSwalayan(teks), d = ALUR.d;
    d.kebutuhan = teks; d.hasilSwalayan = k.jenis;
    if (k.pilih) d.ditawarkan = k.pilih.map(namaTawaran);

    if (k.jenis === "indikator") {
      jawabIndikator(k.p, k.ci);
      d.ditawarkan = ["Angka " + k.ci.it.label + " (situs Indikator Strategis)"];
      return tanyaSwalayan("Angka di atas <b>sudah terbit</b> dan boleh langsung dipakai — tinggal cantumkan sumbernya. Apakah itu yang Anda butuhkan?");
    }
    if (k.jenis === "pengetahuan") {
      jawabButir(k.b, teks);
      return tanyaSwalayan("Apakah penjelasan di atas sudah menjawab kebutuhan Anda?");
    }
    if (k.jenis === "tersedia") {
      catatTawaran(teks, k.pilih.map(function (x) { return x.d; }));
      return tanyaSwalayan(catatanKoreksi(k.p) +
        "<b>Sebentar — sepertinya ini sudah tersedia</b> dan bisa Anda unduh sendiri sekarang, tanpa menunggu petugas:" +
        k.pilih.map(function (x) { return kartuKatalog(x.d); }).join("") +
        ket("Apakah ini yang Anda cari?", "margin-top:8px"));
    }
    if (k.jenis === "resmi") {
      var htmlR = catatanKoreksi(k.p) + "Yang Anda minta ada di katalog kami, tetapi <b>tidak bisa diunduh langsung</b> — statusnya <i>Permintaan resmi</i>, jadi memang perlu diteruskan ke petugas:" +
        k.pilih.map(function (x) { return kartuKatalog(x.d); }).join("") +
        ket("Saya lanjutkan permintaannya, ya.", "margin-top:8px");
      pesanBot(htmlR, [], { alat: false });
      return langkahTiket("nama");
    }
    if (k.jenis === "terbatas") {
      var htmlT = catatanKoreksi(k.p) + (k.b ? PST.linkify(k.b.jawab) + tautanHtml(k.b.tautan) + ket("Yang paling mendekati di katalog:", "margin-top:10px;color:var(--cb-ink-3)")
        : "Yang paling mendekati di katalog — perhatikan statusnya:");
      htmlT += k.pilih.map(function (x) { return kartuKatalog(x.d); }).join("");
      catatTawaran(teks, k.pilih.map(function (x) { return x.d; }));
      return tanyaSwalayan(htmlT + ket("Apakah ini sudah cukup, atau permintaannya tetap saya teruskan ke petugas?", "margin-top:8px"),
        [["Cukup, terima kasih", "__cukup"], ["Tetap teruskan ke petugas", "__lanjut"], ["Batal", "batal"]]);
    }
    if (k.jenis === "sudah-ditawarkan") {
      /* ragam datanya baru saja ditunjukkan dan pemohon tetap ingin bertanya: langsung teruskan */
      return langkahTiket("nama");
    }
    return langkahTiket("nama");
  }

  /* ------------------------------- usulan jawaban untuk petugas (tiket masuk)
     Draf jawaban dalam teks polos, disusun dari sumber yang sama dengan asisten
     (katalog, isi indikator terbit, jawaban baku). Dipakai Ruang Pegawai supaya
     petugas tinggal memeriksa, membetulkan bila perlu, lalu mengirim. */
  function urlPenuh(u) {
    u = String(u || "");
    if (/^https?:/.test(u)) return u;
    if (u.charAt(0) === "/") return location.origin + u;
    return location.origin + DASAR_KATALOG + u;
  }
  function barisKatalog(d) {
    var t = "• " + d.n + " — " + (d.lv !== "\u2014" ? "level terendah " + d.lv + ", " : "") + d.pd + " (sumber: " + d.sm + ")";
    (d.ln || []).slice(0, 2).forEach(function (x) { t += "\n  " + x.l + ": " + urlPenuh(x.u); });
    return t;
  }
  function bersih(t) { return String(t || "").replace(/\*\*/g, "").replace(/\s+$/g, ""); }
  function susunUsulan(teks) {
    var k = periksaSwalayan(String(teks || "").split(/\n\s*\n/)[0]);   /* catatan asisten di bawah kebutuhan diabaikan */
    var u = { jenis: k.jenis, keyakinan: "rendah", teks: "" }, isi = "";
    if (k.jenis === "indikator") {
      var it = k.ci.it, deret = deretUntuk(it.id), tahun = k.p.ent.tahun[0], idx = -1;
      if (tahun && deret) idx = deret[0].map(tahunLabel).indexOf(tahun);
      isi = idx !== -1
        ? it.label + " Kutai Kartanegara " + tahun + ": " + fmtAngka(deret[1][idx], it.dec) + (it.unit ? " " + it.unit : "") + "."
        : it.label + " Kutai Kartanegara: " + fmtAngka(it.value, it.dec) + (it.unit ? " " + it.unit : "") + (it.abbr ? " (" + it.abbr + ")" : "") + ".";
      if (deret && deret[0].length > 1) isi += "\nDeret " + tahunLabel(deret[0][0]) + "\u2013" + tahunLabel(deret[0][deret[0].length - 1]) + ": " +
        deret[0].map(function (l, i) { return l + " " + fmtAngka(deret[1][i], it.dec); }).join(", ") + ".";
      if (it.note) isi += "\n" + bersih(it.note);
      isi += "\n\nGrafik dan rinciannya: " + urlPenuh(T_IND + anchorUntuk(it)) +
             "\nSumber: Booklet Indikator Strategis BPS Kabupaten Kutai Kartanegara.";
      u.keyakinan = "tinggi";
    } else if (k.jenis === "tersedia" || k.jenis === "sudah-ditawarkan") {
      isi = "Data yang Bapak/Ibu perlukan sudah tersedia dan dapat diunduh langsung:\n\n" +
        k.pilih.map(function (x) { return barisKatalog(x.d); }).join("\n\n") +
        "\n\nSilakan diunduh. Bila memerlukan rincian yang belum ada di situ (tahun lain atau pecahan wilayah tertentu), mohon disampaikan kembali.";
      u.keyakinan = k.jenis === "tersedia" ? "tinggi" : "sedang";
    } else if (k.jenis === "resmi") {
      var cara = window.PENGETAHUAN.filter(function (b) { return b.id === "cara"; })[0];
      isi = "Data yang diminta ada pada kami, namun tidak dapat diunduh langsung sehingga perlu permintaan resmi:\n\n" +
        k.pilih.map(function (x) { return barisKatalog(x.d); }).join("\n\n") +
        (cara ? "\n\n" + bersih(cara.jawab) : "");
      u.keyakinan = "sedang";
    } else if (k.jenis === "terbatas") {
      isi = (k.b ? bersih(k.b.jawab) + "\n\n" : "Mohon maaf, data dengan rincian seperti itu belum tersedia pada kami.\n\n") +
        "Yang paling mendekati dan dapat kami sediakan:\n\n" +
        k.pilih.map(function (x) { return barisKatalog(x.d); }).join("\n\n");
      u.keyakinan = "sedang";
    } else if (k.jenis === "pengetahuan") {
      isi = bersih(k.b.jawab) +
        ((k.b.tautan || []).length ? "\n\n" + k.b.tautan.map(function (x) { return x.l + ": " + urlPenuh(x.u); }).join("\n") : "");
      u.keyakinan = "sedang";
    }
    u.teks = isi;
    return u;
  }

  function selesaiSwalayan() {
    var keb = ALUR.d.kebutuhan, jns = ALUR.d.hasilSwalayan; ALUR = null;
    var tutup = jns === "terbatas"
      ? "Baik. Maaf yang Anda cari belum bisa kami sediakan — penjelasan di atas biasanya cukup untuk dicantumkan sebagai keterangan di laporan." +
        ket("Kalau perlu bantuan memilih angka pengganti yang paling mendekati, ajukan konsultasi daring; petugas kami bisa menemani menafsirkannya.", "margin-top:6px")
      : "Senang bisa membantu — berarti tidak perlu menunggu petugas." +
        ket("Kalau nanti perlu rincian yang tidak ada di situ (tahun lain, wilayah lebih rinci, atau pecahan tertentu), tulis saja di sini; permintaan seperti itu saya teruskan ke petugas PST.", "margin-top:6px");
    pesanBot(tutup,
      [["Tanya data lain", "data apa saja yang tersedia"], ["Konsultasi daring", "mau konsultasi daring lewat zoom"], ["Cek status tiket", "cek status tiket saya"]], { alat: false });
    if (PST.catatAsisten) PST.catatAsisten({ pertanyaan: keb, jenis: "swalayan", halaman: location.pathname, sesi: SESI }).catch(function () {});
  }
  function langkahTiket(l) {
    var d = ALUR.d;
    if (l === "nama" && d.nama) l = "hp";
    if (l === "hp" && hpBersih(d.no_hp).length >= 9) l = "guna";
    if (l === "guna" && d.pemanfaatan !== undefined) l = "konfirmasi";
    ALUR.langkah = l;
    if (l === "kebutuhan") return tanyaAlur("Tuliskan kembali data apa yang Anda butuhkan (nama data, level wilayah, tahun).");
    if (l === "nama") return tanyaAlur("Siapa nama Anda? (nama lengkap, untuk dihubungi petugas)");
    if (l === "hp") return tanyaAlur("Nomor HP/WhatsApp yang bisa dihubungi? Petugas mengabari lewat nomor ini, dan 4 digit terakhirnya dipakai untuk mengecek status.");
    if (l === "guna") return tanyaAlur("Untuk keperluan apa? (pilih, atau ketik sendiri)", (B.pemanfaatan || []).map(function (x) { return [x, "__guna:" + x]; }).concat([["Lewati", "__guna:"], CHIP_BATAL]));
    if (l === "konfirmasi") {
      var h = "<b>Periksa dulu:</b>" + ket("<b>Kebutuhan:</b> " + esc(d.kebutuhan) + "<br><b>Nama:</b> " + esc(d.nama) + "<br><b>HP:</b> " + esc(d.no_hp) + (d.pemanfaatan ? "<br><b>Keperluan:</b> " + esc(d.pemanfaatan) : ""), "margin-top:6px") +
        (d.ditawarkan && d.ditawarkan.length ? ket("Petugas akan diberi tahu bahwa Anda sudah melihat: " + esc(d.ditawarkan.join("; ")) + ".", "color:var(--cb-ink-3)") : "") +
        ket("Setelah dikirim, petugas PST menghubungi Anda — biasanya dalam 3 hari kerja. Data yang tersedia bebas biaya.", "color:var(--cb-ink-3)");
      return tanyaAlur(h, [["Kirim permintaan", "__kirim"], ["Ubah kebutuhan", "__ubah:kebutuhan"], ["Ubah nomor HP", "__ubah:hp"], CHIP_BATAL]);
    }
  }
  function kirimTiket() {
    var d = ALUR.d; ALUR = null;
    pesanBot("Mengirim permintaan…", [], { alat: false });
    /* petugas perlu tahu apa yang sudah ditawarkan asisten, supaya tidak mengulang */
    var keb = d.kebutuhan;
    if (d.ditawarkan && d.ditawarkan.length) keb += "\n\n— Asisten sudah menunjukkan: " + d.ditawarkan.join("; ") + ". Pemohon menyatakan belum sesuai.";
    PST.ajukanPermintaan({ nama: d.nama, no_hp: d.no_hp, email: d.email || null, kebutuhan: keb, pemanfaatan: d.pemanfaatan || null, halaman: location.pathname }).then(function (kode) {
      if (PST.catatAsisten) PST.catatAsisten({ pertanyaan: d.kebutuhan, jenis: "tiket-baru", halaman: location.pathname, sesi: SESI }).catch(function () {});
      pesanBot("<b>Permintaan terkirim.</b> Kode tiket Anda: <span class=\"kode\">" + esc(kode) + "</span>" +
        ket("Simpan kode ini. Untuk mengecek status, ketik kodenya beserta 4 digit terakhir nomor HP di sini kapan saja, atau lewat halaman Sahabat Data. Petugas menghubungi lewat WhatsApp/telepon.", "margin-top:6px") +
        tautanHtml([{ u: "sahabat.html", l: "Halaman Sahabat Data (cek status, riwayat)" }]), [["Cek status tiket", kode + " " + hpBersih(d.no_hp).slice(-4)], ["Konsultasi daring", "mau konsultasi daring lewat zoom"], ["Tanya lagi", "berapa IPM Kukar terbaru?"]], { alat: false });
    }).catch(function (e) {
      pesanBot("Permintaan belum terkirim: " + esc(e.message) + ket("Anda bisa mencoba lagi, atau mengajukannya lewat halaman Sahabat Data / WhatsApp PST.", "margin-top:6px") + tautanHtml([{ u: "sahabat.html", l: "Halaman Sahabat Data" }]), [["Coba lagi", "ajukan permintaan data " + d.kebutuhan], ["Hubungi PST", "jam layanan dan alamat PST"]], { alat: false });
    });
  }

  function mulaiKonsultasi() {
    ALUR = { jenis: "konsultasi", d: {}, langkah: "muat" };
    if (sahabat) { ALUR.d.nama = sahabat.profil.nama || sahabat.email; ALUR.d.no_hp = sahabat.profil.no_hp || ""; ALUR.d.email = sahabat.email; }
    pesanBot("Baik, kita ajukan <b>konsultasi daring</b> (Zoom, gratis). Saya cek jadwal yang tersedia…", [], { alat: false });
    var alur = ALUR;
    PST.aturanKonsultasi().then(function (a) {
      alur.aturan = a;
      var mulai = PST.tambahHari(PST.tglWita(), a.minHari), akhir = PST.tambahHari(PST.tglWita(), a.maksHari);
      return PST.slotTerpakai(PST.tglWita(), akhir).then(function (r) {
        var terpakai = {}; r.forEach(function (x) { terpakai[x.tanggal + " " + String(x.jam).slice(0, 5)] = true; });
        alur.terpakai = terpakai;
        var hari = [], d = mulai;
        while (d <= akhir && hari.length < 6) {
          if (PST.hariKerja(d) && a.jam.some(function (j) { return !terpakai[d + " " + j]; })) hari.push(d);
          d = PST.tambahHari(d, 1);
        }
        alur.hari = hari;
        if (ALUR !== alur) return;
        if (!hari.length) { ALUR = null; return pesanBot("Maaf, belum ada jadwal kosong dalam " + a.maksHari + " hari ke depan. Silakan hubungi PST langsung.", CHIPS_LANJUT, { alat: false }); }
        alur.langkah = "tanggal";
        tanyaAlur("Pilih <b>tanggal</b> (hari kerja, " + a.durasi + " menit per sesi, pukul " + a.jam[0] + "–" + a.jam[a.jam.length - 1] + " WITA):", hari.map(function (h) { return [labelHari(h), "__tgl:" + h]; }).concat([CHIP_BATAL]));
      });
    }).catch(function (e) { ALUR = null; pesanBot("Jadwal tidak bisa dibaca: " + esc(e.message) + tautanHtml([{ u: "konsultasi.html", l: "Buka formulir konsultasi" }]), CHIPS_LANJUT, { alat: false }); });
  }
  function langkahKonsultasi(l) {
    var d = ALUR.d, a = ALUR.aturan;
    if (l === "nama" && d.nama) l = "hp";
    if (l === "hp" && hpBersih(d.no_hp).length >= 9) l = "topik";
    if (l === "topik" && d.sudahTopik) l = "konfirmasi";
    ALUR.langkah = l;
    if (l === "jam") {
      var jam = a.jam.filter(function (j) { return !ALUR.terpakai[d.tanggal + " " + j]; });
      return tanyaAlur("Tanggal <b>" + esc(PST.tgl(d.tanggal)) + "</b>. Pilih <b>jam</b> (WITA):", jam.map(function (j) { return [j, "__jam:" + j]; }).concat([["Ganti tanggal", "__ubah:tanggal"], CHIP_BATAL]));
    }
    if (l === "kebutuhan") return tanyaAlur("Ceritakan <b>apa yang ingin dikonsultasikan</b> — data apa, untuk keperluan apa — supaya kami menyiapkan narasumber yang tepat.");
    if (l === "nama") return tanyaAlur("Siapa nama Anda?");
    if (l === "hp") return tanyaAlur("Nomor HP/WhatsApp yang bisa dihubungi? Tautan Zoom dan konfirmasi jadwal dikirim ke nomor ini.");
    if (l === "topik") {
      var TOPIK = []; K.DATA.forEach(function (x) { if (TOPIK.indexOf(x.t) === -1) TOPIK.push(x.t); });
      d.topik = d.topik || [];
      var sisa = TOPIK.filter(function (x) { return d.topik.indexOf(x) === -1; });
      if (d.topik.length >= 2) { d.sudahTopik = true; return langkahKonsultasi("konfirmasi"); }
      return tanyaAlur((d.topik.length ? "Topik: <b>" + esc(d.topik.join(" · ")) + "</b>. Tambah satu lagi, atau lanjut." : "Pilih <b>topik</b> (paling banyak dua):"),
        sisa.map(function (x) { return [x, "__topik:" + x]; }).concat([[d.topik.length ? "Lanjut" : "Lewati", "__topik:"], CHIP_BATAL]));
    }
    if (l === "konfirmasi") {
      var h = "<b>Periksa dulu:</b>" + ket("<b>Jadwal:</b> " + esc(PST.tgl(d.tanggal)) + " pukul " + esc(d.jam) + " WITA · " + a.durasi + " menit<br><b>Kebutuhan:</b> " + esc(d.kebutuhan) +
        (d.topik && d.topik.length ? "<br><b>Topik:</b> " + esc(d.topik.join(" · ")) : "") + "<br><b>Nama:</b> " + esc(d.nama) + "<br><b>HP:</b> " + esc(d.no_hp), "margin-top:6px") +
        ket("Setelah diajukan, petugas menetapkan narasumber dan mengirim tautan Zoom ke WhatsApp Anda.", "color:var(--cb-ink-3)");
      return tanyaAlur(h, [["Ajukan konsultasi", "__kirim"], ["Ganti jadwal", "__ubah:tanggal"], ["Ubah nomor HP", "__ubah:hp"], CHIP_BATAL]);
    }
  }
  function kirimKonsultasi() {
    var d = ALUR.d; ALUR = null;
    pesanBot("Mengajukan konsultasi…", [], { alat: false });
    PST.ajukanKonsultasi({ nama: d.nama, no_hp: d.no_hp, email: d.email || null, kebutuhan: d.kebutuhan, topik: d.topik && d.topik.length ? d.topik.join(" · ") : null,
      tanggal: d.tanggal, jam: d.jam, kategori_instansi: null, nama_instansi: null, pemanfaatan: null }).then(function (kode) {
      pesanBot("<b>Konsultasi diajukan.</b> Kode Anda: <span class=\"kode\">" + esc(kode) + "</span>" +
        ket("Jadwal " + esc(PST.tgl(d.tanggal)) + " pukul " + esc(d.jam) + " WITA. Petugas menetapkan narasumber lalu mengirim tautan Zoom ke WhatsApp Anda. Cek status kapan saja dengan kode + 4 digit terakhir HP.", "margin-top:6px") +
        tautanHtml([{ u: "sahabat.html", l: "Halaman Sahabat Data" }]), [["Cek status", kode + " " + hpBersih(d.no_hp).slice(-4)], ["Tanya lagi", "berapa IPM Kukar terbaru?"]], { alat: false });
    }).catch(function (e) {
      pesanBot("Konsultasi belum terkirim: " + esc(e.message) + tautanHtml([{ u: "konsultasi.html", l: "Coba lewat formulir konsultasi" }]), [["Coba lagi", "ajukan konsultasi daring sekarang"], ["Hubungi PST", "jam layanan dan alamat PST"]], { alat: false });
    });
  }
  /* masukan pengguna saat alur berjalan. Mengembalikan true bila sudah ditangani. */
  function pilihTanggal() {
    ALUR.langkah = "tanggal";
    tanyaAlur("Pilih <b>tanggal</b>:", ALUR.hari.map(function (h) { return [labelHari(h), "__tgl:" + h]; }).concat([CHIP_BATAL]));
  }
  function langkahAlur(t) {
    var d = ALUR.d, l = ALUR.langkah, m, hp = hpBersih(t);
    if ((m = t.match(/^__ubah:(\w+)$/))) {
      if (ALUR.jenis === "tiket") {
        if (m[1] === "hp") { d.no_hp = ""; langkahTiket("hp"); } else { d.kebutuhan = ""; d.ditawarkan = []; langkahTiket("kebutuhan"); }
        return true;
      }
      if (m[1] === "tanggal") { pilihTanggal(); return true; }
      d.no_hp = ""; langkahKonsultasi("hp"); return true;
    }
    if (t === "__kirim") {
      if (l !== "konfirmasi") return false;
      if (ALUR.jenis === "tiket") kirimTiket(); else kirimKonsultasi();
      return true;
    }
    var hpSalah = "Nomor HP tampaknya belum benar — tulis angkanya saja, misalnya <i>0812xxxxxxx</i>.";
    if (ALUR.jenis === "tiket") {
      if (l === "kebutuhan") { if (t.length < 8) tanyaAlur("Tolong tulis kebutuhannya sedikit lebih jelas (nama data, wilayah, tahun)."); else swalayanDulu(t); return true; }
      if (l === "swalayan") {
        if (t === "__cukup" || /^(ya|iya|sudah|udah|betul|benar|ok|oke|cukup|pas|sesuai|itu)\b/i.test(t)) { selesaiSwalayan(); return true; }
        if (t === "__lanjut" || /^(bukan|belum|tidak|gak|nggak|ga|lanjut|teruskan)\b/i.test(t)) { langkahTiket("nama"); return true; }
        if (t.length >= 8) { d.ditawarkan = (d.ditawarkan || []); swalayanDulu(t); return true; }   /* kebutuhannya diperjelas */
        tanyaAlur("Pilih salah satu di bawah, atau tuliskan kebutuhannya lebih jelas supaya saya cari lagi.", CHIP_SWALAYAN);
        return true;
      }
      if (l === "nama") { if (t.length < 2 || /^\d+$/.test(t)) tanyaAlur("Tulis nama Anda, ya."); else { d.nama = t; langkahTiket("hp"); } return true; }
      if (l === "hp") { if (hp.length < 9 || hp.length > 15) tanyaAlur(hpSalah); else { d.no_hp = t; langkahTiket("guna"); } return true; }
      if (l === "guna") { m = t.match(/^__guna:(.*)$/); d.pemanfaatan = m ? m[1] : t; langkahTiket("konfirmasi"); return true; }
      if (l === "konfirmasi") {
        if (/^(ya|iya|kirim|ok|oke|betul|benar|lanjut)\b/i.test(t)) kirimTiket();
        else tanyaAlur("Pilih <b>Kirim permintaan</b> untuk mengirim, atau ubah isinya.", [["Kirim permintaan", "__kirim"], ["Ubah kebutuhan", "__ubah:kebutuhan"], CHIP_BATAL]);
        return true;
      }
      return false;
    }
    if (l === "muat") { tanyaAlur("Sebentar, jadwal masih dimuat…", []); return true; }
    if (l === "tanggal") {
      m = t.match(/^__tgl:(\d{4}-\d\d-\d\d)$/);
      if (!m || ALUR.hari.indexOf(m[1]) === -1) pilihTanggal(); else { d.tanggal = m[1]; langkahKonsultasi("jam"); }
      return true;
    }
    if (l === "jam") {
      m = t.match(/^__jam:(\d\d:\d\d)$/) || t.match(/^(\d\d[:.]\d\d)$/);
      var j = m ? m[1].replace(".", ":") : null;
      if (!j || ALUR.aturan.jam.indexOf(j) === -1 || ALUR.terpakai[d.tanggal + " " + j]) langkahKonsultasi("jam"); else { d.jam = j; langkahKonsultasi("kebutuhan"); }
      return true;
    }
    if (l === "kebutuhan") { if (t.length < 8) tanyaAlur("Ceritakan sedikit lebih jelas, ya — data apa dan untuk apa."); else { d.kebutuhan = t; langkahKonsultasi("nama"); } return true; }
    if (l === "nama") { if (t.length < 2 || /^\d+$/.test(t)) tanyaAlur("Tulis nama Anda, ya."); else { d.nama = t; langkahKonsultasi("hp"); } return true; }
    if (l === "hp") { if (hp.length < 9 || hp.length > 15) tanyaAlur(hpSalah); else { d.no_hp = t; langkahKonsultasi("topik"); } return true; }
    if (l === "topik") {
      m = t.match(/^__topik:(.*)$/);
      if (m && m[1]) { d.topik = (d.topik || []).concat([m[1]]); langkahKonsultasi("topik"); }
      else if (m) { d.sudahTopik = true; langkahKonsultasi("konfirmasi"); }
      else { d.topik = (d.topik || []).concat([t.slice(0, 60)]); langkahKonsultasi("topik"); }
      return true;
    }
    if (l === "konfirmasi") {
      if (/^(ya|iya|kirim|ok|oke|betul|benar|lanjut|ajukan)\b/i.test(t)) kirimKonsultasi();
      else tanyaAlur("Pilih <b>Ajukan konsultasi</b> untuk mengirim, atau ubah isinya.", [["Ajukan konsultasi", "__kirim"], ["Ganti jadwal", "__ubah:tanggal"], CHIP_BATAL]);
      return true;
    }
    return false;
  }

/* ---------------------------------------------------------- penjawab */
  function jawab(teks, idButir) {
    var t = String(teks || "").trim();
    if (!t) return;
    /* alur permintaan/konsultasi: "batal" menghentikan; masukan lain jadi isian langkah */
    if (ALUR) {
      if (/^(batal|batalkan|cancel|gak jadi|tidak jadi|nggak jadi|ga jadi|stop)\b/i.test(t)) { ALUR = null; return pesanBot("Baik, dibatalkan. Ada lagi yang bisa saya bantu?", CHIPS_AWAL, { alat: false }); }
      if (langkahAlur(t)) return;
    }
    if (/^__/.test(t)) return;   /* sisa perintah alur yang sudah tidak berlaku */
    if (idButir) {
      var langsung = window.PENGETAHUAN.filter(function (b) { return b.id === idButir; })[0];
      if (langsung) return jawabButir(langsung, t);
    }
    var mKode = t.toUpperCase().match(/\b(PST|KON)-\d{4}-\d{4}\b/);
    var mHP = t.replace(/(PST|KON)-\d{4}-\d{4}/i, "").match(/\b\d{4}\b/);
    if (mKode && mHP) { kodeTunggu = null; return cekKode(mKode[0], mHP[0]); }
    if (mKode) {
      kodeTunggu = mKode[0];
      return pesanBot("Baik, kode <span class='kode'>" + esc(kodeTunggu) + "</span>. Sekarang ketik <b>empat digit terakhir nomor HP</b> yang Anda berikan kepada petugas.", [], { alat: false });
    }
    if (kodeTunggu && /^\d{4}$/.test(t)) { var k = kodeTunggu; kodeTunggu = null; return cekKode(k, t); }
    if (/\b(cek|status|periksa)\b/i.test(t) && /\btiket\b/i.test(t)) {
      return pesanBot("Ketik kode tiket Anda — bentuknya <span class='kode'>PST-2609-0042</span> untuk permintaan data atau <span class='kode'>KON-2609-0007</span> untuk konsultasi daring — lalu empat digit terakhir nomor HP Anda. Boleh sekaligus dalam satu pesan.", [], { alat: false });
    }

    var p = pahami(t), n = p.niat, e = p.ent;
    var kataSaja = PH ? PH.tokens(p.teks) : p.teks.toLowerCase().split(/\s+/);

    /* sapaan & basa-basi */
    if (kataSaja.length <= 4 && /^(halo|hai|hi|hello|hey|selamat( pagi| siang| sore| malam)?|assalamualaikum|assalamu'?alaikum|permisi|pagi|siang|sore|malam|tes|test|ping)\b/i.test(p.teks)) {
      return pesanBot("Halo! Silakan tanya angka (\u201cberapa IPM Kukar?\u201d), arti istilah, data yang tersedia, atau ajukan permintaan data dan konsultasi di sini.", CHIPS_AWAL, { jenis: "sapa", tanya: p.asli, alat: false });
    }
    if (kataSaja.length <= 5 && /^(terima ?kasih|makasih|thanks|thank you|trims|tengkyu|sip|mantap|oke|ok|okay|baik|siap|sudah cukup|cukup)\b/i.test(p.teks)) {
      return pesanBot("Sama-sama! Kalau ada pertanyaan lain, tulis saja di sini. Jawaban saya bisa dinilai 👍/👎 supaya makin baik.", CHIPS_AWAL.slice(0, 3), { jenis: "sapa", tanya: p.asli, alat: false });
    }

    /* tindakan: permintaan data & konsultasi dari obrolan */
    if (/^(ajukan|buat|bikin|daftar) (permintaan|tiket)/i.test(p.teks) || /^(minta|mau minta|ingin minta|mohon) data\b/i.test(p.teks) && p.teks.split(/\s+/).length <= 3) {
      return mulaiTiket(p.asli.replace(/^(ajukan|buat|bikin|daftar) (permintaan|tiket)( data)?( baru)?( untuk| tentang| soal)?/i, "").replace(/^(minta|mau minta|ingin minta|mohon) data/i, "").trim());
    }
    if (n.konsultasi && !/\b(bisa|bisakah|apakah|boleh|gimana|bagaimana|cara|caranya|syarat|biaya|gratis|kapan saja|jam berapa)\b/i.test(p.teks) &&
        (/\b(ajukan|daftarkan|daftar|jadwalkan|booking|pesan jadwal|buat jadwal|sekarang|langsung)\b/i.test(p.teks) || /^(mau|ingin|pengen|saya mau|saya ingin) (konsultasi|konsul)\b/i.test(p.teks))) return mulaiKonsultasi();
    if (/^(peringkat|banding\w*) apa saja/i.test(p.teks)) {
      var ada = daftarBanding();
      return pesanBot("Yang bisa dibandingkan antar-kabupaten/kota se-Kaltim: <b>" + esc(ada.join(", ")) + "</b>." + ket("Tanya misalnya: <i>Kukar peringkat berapa kemiskinan di Kaltim?</i>, <i>bandingkan IPM Kukar dengan Balikpapan</i>, <i>penduduk Bontang berapa?</i>", "margin-top:6px") + tautanHtml([{ u: T_IND + "#bandingkan", l: "Bagian Bandingkan di Indikator Strategis" }]),
        ada.slice(0, 3).map(function (l) { return ["Peringkat " + l.toLowerCase(), "Kukar peringkat berapa " + l + " di Kaltim?"]; }), { jenis: "banding", tanya: p.asli });
    }

    if (/^buka glosarium$/i.test(t)) return pesanBot("Glosarium memuat " + GLOS.length + " istilah beserta cara membaca dan salah kaprahnya." + tautanHtml([{ u: "glosarium.html", l: "Buka glosarium & cara membaca angka" }]), CHIPS_LANJUT, { alat: false });
    var pk = jawabPengetahuan(p.teks);
    /* definisi/arti/beda/cara menghitung → glosarium, sebelum angka & pengetahuan.
       "kenapa beda dengan dukcapil" (kata beda/kenapa saja) tetap ke jawaban baku bila jawaban bakunya kuat. */
    if (!idButir && NIAT_DEFINISI.test(p.teks) && !n.peringkat && !n.tren) {
      var definisiKuat = /\b(apa itu|apa arti|apa maksud|artinya|pengertian|definisi|maksudnya|apa bedanya|cara menghitung|dihitung|rumus|cara membaca|itu apa)\b/i.test(p.teks);
      if (definisiKuat || !(pk.b && pk.skor >= 2)) {
        var gl = cariGlosarium(p.luas, /\b(beda|bedanya|perbedaan)\b/i.test(p.teks) ? 2 : 1);
        if (gl.length) return jawabGlosarium(p, gl);
      }
    }

    if (IND === undefined) { siapkanIndikator().then(function () { jawab(teks, idButir); }); return; }
    var hasil = CARI.cocokkanSkor(p.teks, 3, { tambahan: p.tambahan });

    /* publikasi/BRS/agenda */
    if (n.publikasi && !(n.angka && cariIndikator(p.luas)) && !(pk.b && pk.b.id === "terbit" && pk.skor >= 2 && !/\b(publikasi|brs|infografis|agenda|dalam angka)\b/i.test(p.teks))) return jawabTerbitan(p);

    /* angka indikator strategis, dengan ingatan konteks ("kalau 2023?", "yang Samarinda?") */
    /* indikator: dulu dari kata pengguna (+ kepanjangan singkatan); bahasa sehari-hari (paham.js)
       dipakai hanya bila kalimatnya jelas menanyakan angka, bukan data sektoral/kecamatan */
    var ci = cariIndikator(CARI.perluas ? CARI.perluas(p.teks) : p.teks);
    if (!ci) {
      var c2 = cariIndikator(p.luas);
      if (c2 && !/\b(per kecamatan|per desa|kecamatan|desa|kelurahan|sekolah|guru|murid|siswa|puskesmas|dinas|opd)\b/i.test(p.teks) && (n.angka || n.banding || n.peringkat || n.tren || kataSaja.length <= 6)) ci = c2;
    }
    var lanjutan = !ci && KONTEKS.indikator && n.lanjutan && (e.tahun.length || e.wilayah.length || e.prov || e.kecamatan.length || n.banding || n.peringkat || n.tren || n.angka);
    if (lanjutan) ci = { it: KONTEKS.indikator, skor: 4 };
    var niatAngka = n.angka || n.banding || n.peringkat || n.tren || e.wilayah.length || e.prov;
    /* Jawaban baku yang SANGAT kuat menang atas penelusuran angka. Skor >= 5 berarti
       beberapa frasa kunci (bukan satu kata) dari kalimat penanya sendiri kena —
       mis. "kapan sensus ekonomi 2026" kena "sensus ekonomi", "sensus ekonomi 2026",
       dan "kapan sensus ekonomi". Tanpa aturan ini, kata tahun di kalimat itu membuatnya
       dikira pertanyaan angka lanjutan. */
    /* "kenapa/mengapa/kok/apa bedanya" menuntut penjelasan, bukan angka — jawaban baku
       yang cukup kuat harus menang. Tanpa ini, "kenapa jumlah penduduk BPS beda dengan
       Dukcapil" dijawab dengan angka jumlah penduduk, bukan alasan perbedaannya. */
    var bakuKuat = pk.b && (pk.skor >= 5 ||
      (pk.skor >= 2 && /\b(kenapa|mengapa|kok|apa beda|apa bedanya|bedanya|perbedaan)\b/i.test(p.teks)));
    if (ci && !idButir && !bakuKuat && (niatAngka || pk.skor < 2 || (lanjutan && pk.skor < 3))) {
      if (e.kecamatan.length && ci.it.id === "penduduk") return jawabKecamatan(p);
      if (e.kecamatan.length && !e.kukar) return jawabKecamatan(p);
      if (n.peringkat && metaBanding(ci.it.id)) return jawabPeringkat(p, ci.it);
      if ((e.wilayah.length || e.prov) && (n.banding || n.angka || lanjutan || e.wilayah.length)) return jawabBandingWilayah(p, ci.it);
      if (n.tren && (e.tahun.length !== 1 || /\b(sejak|dari|mulai|sampai|hingga)\b/i.test(p.teks))) return jawabTren(p, ci.it);
      if (n.peringkat) return jawabTanpaBanding(p, ci.it);
      return jawabIndikator(p, ci);
    }
    /* kecamatan tanpa indikator: "luas Tenggarong", "kecamatan paling padat" */
    if (e.kecamatan.length && !e.kukar && (metrikKec(p.teks) || n.angka)) return jawabKecamatan(p);
    if (!e.kecamatan.length && n.kecamatan && metrikKec(p.teks) && (n.peringkat || n.angka)) return jawabKecamatan(p);
    /* "jumlah sekolah per kecamatan": bila katalog punya data level kecamatan/desa, itu jawabannya —
       bukan penjelasan umum "kenapa tidak ada per kecamatan" */
    if (pk.b && pk.b.id === "kecamatan" && hasil.some(function (x) { return /kecamatan|desa/i.test(x.d.lv); })) pk = { b: null, skor: 0 };
    /* peringkat kab/kota tanpa nama indikator: "kabupaten paling miskin di Kaltim" ditangani lewat sinonim; sisanya: */
    if (n.peringkat && (e.prov || /\b(kabupaten|kab\/kota|kota)\b/i.test(p.teks)) && daftarBanding().length) {
      var ada2 = daftarBanding();
      return pesanBot(catatanKoreksi(p) + "Peringkat apa yang ingin dilihat? Yang tersedia: <b>" + esc(ada2.join(", ")) + "</b>.", ada2.slice(0, 4).map(function (l) { return [l, "Kukar peringkat berapa " + l + " di Kaltim?"]; }), { jenis: "banding", skor: 0, tanya: p.asli });
    }

    /* satu kata kunci saja sudah cukup bila katalog tidak punya kecocokan yang kuat —
       "apa itu DTSEN" tidak boleh dijawab dengan baris katalog yang kebetulan mirip */
    if (pk.b && (pk.skor >= 2 || (pk.skor === 1 && (!hasil.length || pk.b.untuk === "petugas" ||
        !hasil.some(function (x) { return x.kuat; }))))) {
      var html = catatanKoreksi(p) + PST.linkify(pk.b.jawab) + tautanHtml(pk.b.tautan);
      if (hasil.length && pk.b.id !== "cara" && pk.b.id !== "jam") {
        html += ket("Ragam data yang mungkin Anda maksud:", "margin-top:10px;color:var(--cb-ink-3)") + hasil.slice(0, 2).map(function (x) { return kartuKatalog(x.d); }).join("");
        catatTawaran(p.teks, hasil.slice(0, 2).map(function (x) { return x.d; }));
      }
      var lanjut = CHIPS_LANJUT;
      if (pk.b.id === "konsultasi") lanjut = [["Ajukan konsultasi di sini", "ajukan konsultasi daring sekarang"], ["Cek status tiket", "cek status tiket saya"]];
      if (pk.b.id === "cara") lanjut = [["Ajukan permintaan data di sini", "ajukan permintaan data"], ["Konsultasi daring", "mau konsultasi daring lewat zoom"]];
      return pesanBot(html, lanjut, { jenis: "pengetahuan", skor: pk.skor, tanya: p.asli });
    }
    var kebutuhan = p.asli.replace(/^(saya |kami )?(minta|mau|ingin|butuh|perlu|cari|carikan|tolong|mohon|ada|punya|apakah ada|adakah)\s+(data\s+)?/i, "");
    var kataIsi = kataSaja.filter(function (w) { return w.length >= 4 && CARI.HENTI.indexOf(w) === -1 && !/^\d+$/.test(w); });
    if (hasil.length && (hasil[0].kuat || kataIsi.length <= 1)) {
      var ada3 = hasil.some(function (x) { return x.d.st === "ada"; });
      catatTawaran(p.teks, hasil.map(function (x) { return x.d; }));
      return pesanBot(catatanKoreksi(p) +
        (ada3 ? "Ini yang cocok di katalog — yang berstatus <b>Unduh di web</b> bisa langsung diambil dari tautannya:" :
               "Ini yang paling mendekati di katalog:") +
        hasil.map(function (x) { return kartuKatalog(x.d); }).join("") +
        ket("Bukan yang dicari, atau perlu rincian lain? Ajukan permintaan data — petugas yang mencarikan.", "margin-top:8px;color:var(--cb-ink-3)"),
        [["Ajukan permintaan data ini", "ajukan permintaan data " + kebutuhan], ["Konsultasi daring", "mau konsultasi daring lewat zoom"], ["Cek status tiket", "cek status tiket saya"]], { jenis: "katalog", skor: hasil[0].skor, tanya: p.asli });
    }
    if (hasil.length) {
      catatTawaran(p.teks, hasil.slice(0, 2).map(function (x) { return x.d; }));
      /* hanya kata umum yang cocok (mis. "desa"): anggap belum terjawab, tetapi tunjukkan yang agak dekat */
      return pesanBot(catatanKoreksi(p) + "Saya belum menemukan <b>" + esc(kebutuhan) + "</b> di katalog. Yang agak mendekati:" +
        hasil.slice(0, 2).map(function (x) { return kartuKatalog(x.d); }).join("") +
        ket("Kalau bukan itu, ajukan permintaan data — petugas PST yang mencarikan, termasuk data instansi lain bila kami tahu sumbernya.", "margin-top:8px;color:var(--cb-ink-3)"),
        [["Ajukan permintaan data ini", "ajukan permintaan data " + kebutuhan], ["Konsultasi daring", "mau konsultasi daring lewat zoom"], ["Lihat katalog lengkap", "data apa saja yang tersedia"]], { jenis: "kosong", skor: hasil[0].skor, tanya: p.asli });
    }
    return pesanBot(catatanKoreksi(p) + "Saya belum menemukan itu di katalog. Coba sebutkan nama datanya — misalnya <i>jumlah penduduk per kecamatan</i>, <i>angka kemiskinan</i>, atau <i>PDRB</i> — atau ajukan permintaan data supaya petugas yang mencarikan.",
      [["Ajukan permintaan data", "ajukan permintaan data " + kebutuhan], ["Lihat katalog lengkap", "data apa saja yang tersedia"], ["Konsultasi daring", "mau konsultasi daring lewat zoom"], ["Hubungi PST", "jam layanan dan alamat PST"]], { jenis: "kosong", skor: 0, tanya: p.asli });
  }

  function kirim(t, idButir, tampil) {
    if (!t) return;
    pesanku(tampil || t); riwayat.push(t);
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

  PST.sesi().then(function (s) { petugas = !!(s && s.jenis === "pegawai"); sahabat = s && s.jenis === "sahabat" ? s : null; }).catch(function () {});

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
    tanya: function (t) { t = String(t || "").trim().slice(0, 300); buka(); if (t) kirim(t); },
    pahami: pahami,
    /* draf jawaban untuk petugas — menunggu isi indikator siap lebih dulu */
    usulan: function (teks) {
      if (!teks || String(teks).trim().length < 5) return Promise.resolve({ jenis: "kosong", keyakinan: "rendah", teks: "" });
      var jalan = function () { try { return susunUsulan(teks); } catch (e) { return { jenis: "galat", keyakinan: "rendah", teks: "" }; } };
      if (IND !== undefined) return Promise.resolve(jalan());
      return siapkanIndikator().then(jalan, jalan);
    }
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

  /* ?tanya=… dari situs lain (tautan yang dibagikan): buka dan langsung tanyakan */
  var tanyaAwal = (new URLSearchParams(location.search).get("tanya") || "").trim().slice(0, 300);
  if (tanyaAwal) setTimeout(function () {
    /* tanpa memindahkan fokus ke kotak ketik: di HP, papan ketik tidak langsung muncul */
    panel.hidden = false; tombolBuka.setAttribute("aria-expanded", "true");
    if (IND === undefined) siapkanIndikator();
    if (!isi.children.length) sapa();
    kirim(tanyaAwal);
  }, 350);
})();
