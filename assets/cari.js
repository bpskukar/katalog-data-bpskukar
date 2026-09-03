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

  function cocokkan(teks, n) {
    /* Singkatan diambil sebelum huruf dikecilkan: IPM, PDRB, TPT, P0, IHK, NTP
       adalah kata kunci terkuat di meja PST tetapi terlalu pendek untuk lolos
       saringan panjang biasa. */
    var singkat = (teks.match(/\b(?:[A-Z]{2,6}[0-9]?|[A-Z][0-9])\b/g) || [])
      .map(function (w) { return w.toLowerCase(); });

    var kata = teks.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
      .filter(function (w) { return w.length >= 4 && HENTI.indexOf(w) === -1; });
    kata = singkat.concat(kata)
      .filter(function (w, i, a) { return a.indexOf(w) === i; })
      .slice(0, 12);
    if (!kata.length) return [];

    return K.DATA.map(function (d) {
      var nama = d.n.toLowerCase();
      var hay = (d.n + " " + d.t + " " + d.sm + " " + d.d + " " + (d.mn || "")).toLowerCase();
      var skor = 0, kena = 0;
      kata.forEach(function (w) {
        var pendek = w.length <= 5 && singkat.indexOf(w) !== -1;
        var b = pendek ? 3.2 : bobot(w);
        var v = pendek ? [w] : penggal(w);
        var diNama = false, diIsi = false;
        v.forEach(function (x) {
          var pola = pendek ? new RegExp("\\b" + x + "\\b") : null;
          if (pendek ? pola.test(nama) : nama.indexOf(x) !== -1) diNama = true;
          else if (pendek ? pola.test(hay) : hay.indexOf(x) !== -1) diIsi = true;
        });
        if (diNama) { skor += b * 3; kena++; }
        else if (diIsi) { skor += b; kena++; }
      });
      if (kena > 1) skor *= 1 + (kena - 1) * 0.35;   /* makin banyak kata cocok, makin yakin */
      return { d: d, skor: skor };
    }).filter(function (x) { return x.skor > 0.9; })
      .sort(function (a, b) { return b.skor - a.skor; })
      .slice(0, n || 5).map(function (x) { return x.d; });
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

  return { cocokkan: cocokkan, penggal: penggal, HENTI: HENTI, skorKataKunci: skorKataKunci };
})();
