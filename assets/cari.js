/* ============================================================================
   Mesin pencocokan katalog — dipakai ruang pegawai (pencatatan kunjungan)
   dan chatbot. Pembobotan kebalikan frekuensi + penggalan imbuhan Indonesia
   + pengenalan singkatan (IPM, PDRB, TPT, P0). Tanpa server, tanpa model.
   ========================================================================== */
window.CARI = (function () {
  "use strict";
  var K = window.KATALOG;

  /* Pembobotan kebalikan frekuensi: kata yang muncul di banyak baris katalog
     ("penduduk", "kabupaten") bernilai kecil; kata yang jarang ("miskin",
     "sakernas") bernilai besar. Tanpa ini, kalimat panjang selalu tersaring
     ke baris yang kebetulan memuat kata umum. */
  var HENTI = ("minta meminta mintak mohon tolong butuh perlu ingin cari mencari dapat bisa " +
    "data datanya angka nilai berapa jumlahnya untuk dari yang dengan pada atau dan " +
    "saya kami kita bapak ibu mas mbak pak bu tahun terakhir terbaru sekarang " +
    "apakah bagaimana dimana kapan mengenai tentang tolongin adalah akan sudah belum " +
    "keperluan kebutuhan skripsi tugas kuliah penelitian laporan berkas file " +
    "kutai kartanegara kukar kabupaten daerah wilayah").split(" ");

  function penggal(w) {
    var v = [w], a;
    a = w.replace(/^(keter|peng|peny|pem|pen|per|meng|meny|mem|men|ber|ter|ke|di|pe|se)/, "");
    if (a.length >= 4 && a !== w) v.push(a);
    v.slice().forEach(function (x) {
      var b = x.replace(/(kannya|annya|nya|kan|isasi|an|i)$/, "");
      if (b.length >= 4 && v.indexOf(b) === -1) v.push(b);
    });
    return v;
  }

  /* frekuensi dokumen tiap kata di seluruh katalog, dihitung sekali */
  var DF = (function () {
    var df = {};
    K.DATA.forEach(function (d) {
      var uniq = {};
      (d.n + " " + d.t + " " + d.sm + " " + d.d).toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
        .forEach(function (w) { if (w.length >= 4) uniq[w] = 1; });
      Object.keys(uniq).forEach(function (w) { df[w] = (df[w] || 0) + 1; });
    });
    return df;
  })();
  var N = K.DATA.length;

  function bobot(w) {
    var d = 0;
    penggal(w).forEach(function (v) { d = Math.max(d, DF[v] || 0); });
    if (!d) d = 1;
    return Math.max(0.35, Math.log(N / d));
  }

  /* toleransi salah ketik ringan: huruf ganda yang hilang (penganguran → pengangguran) */
  function ringkas(w) { return w.replace(/([a-z])\1/g, "$1"); }

  /* Singkatan yang dikenal beserta kepanjangannya. Orang mengetik "ipm" sama
     seringnya dengan "IPM", jadi singkatan dikenali tanpa memandang huruf besar-
     kecil, dan kepanjangannya ikut dicari (uhh → umur harapan hidup). */
  var ALIAS = {
    ipm: "indeks pembangunan manusia", ipg: "indeks pembangunan gender", ikg: "indeks ketimpangan gender", idg: "indeks pemberdayaan gender",
    pdrb: "produk domestik regional bruto", adhb: "atas dasar harga berlaku", adhk: "atas dasar harga konstan",
    lpe: "laju pertumbuhan ekonomi", lpp: "laju pertumbuhan penduduk", tpt: "tingkat pengangguran terbuka", tpak: "tingkat partisipasi angkatan kerja",
    uhh: "umur harapan hidup", ahh: "angka harapan hidup", hls: "harapan lama sekolah", rls: "rata-rata lama sekolah", ppp: "pengeluaran per kapita disesuaikan",
    ihk: "indeks harga konsumen", ntp: "nilai tukar petani", gini: "gini ratio ketimpangan pendapatan", ikk: "indeks kemahalan konstruksi",
    p0: "persentase penduduk miskin", p1: "indeks kedalaman kemiskinan", p2: "indeks keparahan kemiskinan", gk: "garis kemiskinan",
    brs: "berita resmi statistik",
    sp: "sensus penduduk", sp2020: "sensus penduduk", se: "sensus ekonomi", st: "sensus pertanian", st2023: "sensus pertanian",
    susenas: "survei sosial ekonomi nasional", sakernas: "survei angkatan kerja nasional", podes: "potensi desa", umk: "upah minimum", umr: "upah minimum",
    sdgs: "pembangunan berkelanjutan", tpb: "pembangunan berkelanjutan", ipd: "indeks pembangunan desa", idm: "indeks desa membangun",
    lf: "long form", ihpb: "indeks harga perdagangan besar", pst: "pelayanan statistik terpadu"
  };
  var SINGKATAN = (function () {
    var s = {};
    Object.keys(ALIAS).forEach(function (k) { s[k] = 1; });
    K.DATA.forEach(function (d) {
      ((d.n + " " + d.t + " " + d.sm + " " + d.d + " " + (d.mn || "")).match(/\b(?:[A-Z]{2,6}[0-9]?|[A-Z][0-9])\b/g) || [])
        .forEach(function (w) { s[w.toLowerCase()] = 1; });
    });
    return s;
  })();
  /* singkatan dalam teks, huruf besar atau kecil, sudah dikecilkan: "ipm", "p0" */
  function singkatan(teks) {
    var s = {};
    (teks.match(/\b(?:[A-Z]{2,6}[0-9]?|[A-Z][0-9])\b/g) || []).forEach(function (w) { s[w.toLowerCase()] = 1; });
    teks.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).forEach(function (w) { if (SINGKATAN[w]) s[w] = 1; });
    return Object.keys(s);
  }
  /* teks + kepanjangan singkatan yang dikenali */
  function perluas(teks) {
    var tambah = singkatan(teks).map(function (w) { return ALIAS[w] || ""; }).filter(Boolean);
    return tambah.length ? teks + " " + tambah.join(" ") : teks;
  }

  function cocokkan(teks, n, opsi) { return cocokkanSkor(teks, n, opsi).map(function (x) { return x.d; }); }

  /* seperti cocokkan, tetapi mengembalikan skornya juga: [{d, skor}].
     opsi.tambahan: kata pelengkap dari bahasa sehari-hari (paham.js) — ikut dicari
     dengan bobot separuh, supaya tidak mengalahkan kata yang diketik pengguna. */
  function cocokkanSkor(teks, n, opsi) {
    opsi = opsi || {};
    /* Singkatan (IPM, PDRB, TPT, P0, IHK, NTP) adalah kata kunci terkuat di meja
       PST tetapi terlalu pendek untuk lolos saringan panjang biasa. */
    var singkat = singkatan(teks);
    var pecah = function (t) { return t.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(function (w) { return w.length >= 4 && HENTI.indexOf(w) === -1; }); };
    var kata = singkat.concat(pecah(perluas(teks)))
      .filter(function (w, i, a) { return a.indexOf(w) === i; })
      .slice(0, 12);
    /* kata isi yang benar-benar diketik pengguna (bukan kepanjangan singkatan/tambahan): penentu "kuat" */
    var kataAsli = singkat.concat(pecah(teks)).filter(function (w, i, a) { return a.indexOf(w) === i && !/^\d+$/.test(w); });
    var lemah = {};
    if (opsi.tambahan) {
      var singkatT = singkatan(opsi.tambahan);
      singkatT.concat(pecah(perluas(opsi.tambahan))).forEach(function (w) {
        if (kata.indexOf(w) !== -1 || kata.length >= 18) return;
        kata.push(w); lemah[w] = 1; if (singkatT.indexOf(w) !== -1) singkat.push(w);
      });
    }
    if (!kata.length) return [];

    return K.DATA.map(function (d) {
      var nama = d.n.toLowerCase(), namaR = ringkas(nama);
      var hay = (d.n + " " + d.t + " " + d.sm + " " + d.d + " " + (d.mn || "")).toLowerCase(), hayR = ringkas(hay);
      var skor = 0, kena = 0, kenaAsli = 0, singkatKena = false;
      kata.forEach(function (w) {
        var pendek = w.length <= 5 && singkat.indexOf(w) !== -1;
        var angka = /^\d+$/.test(w);            /* tahun: hanya penentu urutan, bukan bukti cocok */
        var b = angka ? 0.4 : pendek ? 4.5 : bobot(w);
        if (lemah[w]) b *= pendek ? 0.4 : 0.5;
        var v = pendek ? [w] : penggal(w);
        var diNama = false, diIsi = false;
        v.forEach(function (x, i) {
          /* singkatan: kata utuh. kata asli: boleh berimbuhan di depan (miskin ⊂ kemiskinan,
             kerja ⊂ ketenagakerjaan) tetapi harus berakhir di akhiran/akhir kata (beras ⊄ berasal).
             potongan imbuhan: hanya di awal kata atau setelah awalan (ikan ⊂ perikanan, ⊄ pendidikan) */
          var pola, xr = ringkas(x);
          if (pendek) pola = new RegExp("\\b" + x + "\\b");
          else if (i > 0) pola = new RegExp("\\b(?:keter|peng|peny|pem|pen|per|meng|meny|mem|men|ber|ter|ke|di|pe|se|be)?" + x);
          else pola = new RegExp("(?:" + x + (x.length >= 5 && xr !== x ? "|" + xr : "") + ")(?:kannya|annya|kan|nya|isasi|an|i)?\\b");
          if (pola.test(nama) || (!pendek && i === 0 && x.length >= 5 && pola.test(namaR))) diNama = true;
          else if (pola.test(hay) || (!pendek && i === 0 && x.length >= 5 && pola.test(hayR))) diIsi = true;
        });
        if (diNama || diIsi) {
          skor += diNama ? (lemah[w] ? b : b * 3) : b;
          if (!lemah[w] && !angka) { kena++; if (kataAsli.indexOf(w) !== -1) { kenaAsli++; if (pendek) singkatKena = true; } }
        }
      });
      if (kena > 1) skor *= 1 + (kena - 1) * 0.35;   /* makin banyak kata cocok, makin yakin */
      /* kuat = paling sedikit separuh kata isi yang diketik pengguna cocok (atau singkatannya cocok):
         "jumlah pengrajin tenun per desa" hanya cocok "jumlah" & "desa" → lemah */
      return { d: d, skor: skor, kena: kena, kuat: singkatKena || kenaAsli >= Math.ceil(kataAsli.length / 2) };
    }).filter(function (x) { return x.skor > 0.9; })
      .sort(function (a, b) { return b.skor - a.skor; })
      .slice(0, n || 5);
  }


  /* pencocokan sederhana untuk basis pengetahuan: skor = jumlah kata kunci yang kena */
  function skorKataKunci(teks, daftarKunci) {
    var t = " " + teks.toLowerCase().replace(/[^a-z0-9\s]/g, " ") + " ";
    var skor = 0;
    daftarKunci.forEach(function (k) {
      k = k.toLowerCase();
      if (t.indexOf(" " + k + " ") !== -1 || (k.length >= 5 && t.indexOf(k) !== -1)) skor += k.split(" ").length;
    });
    return skor;
  }

  return { cocokkan: cocokkan, cocokkanSkor: cocokkanSkor, penggal: penggal, HENTI: HENTI, skorKataKunci: skorKataKunci,
           singkatan: singkatan, perluas: perluas, ALIAS: ALIAS };
})();
