/* ============================================================================
   PAHAM — lapisan pemahaman Asisten PST (tanpa model bahasa, tanpa server).
   • Koreksi salah ketik: kata yang tak dikenal dicocokkan ke kosakata situs
     (katalog, glosarium, pengetahuan, indikator) dengan jarak Damerau-Levenshtein.
   • Kamus bahasa sehari-hari → istilah BPS ("nganggur" → pengangguran/TPT).
   • Pengenalan entitas: tahun, kabupaten/kota se-Kaltim, provinsi, 20 kecamatan.
   • Niat: definisi, angka, banding, peringkat, tren, publikasi, permintaan data,
     konsultasi, tiket. Dipakai chat.js; dimuat sebelum chat.js.
   ========================================================================== */
window.PAHAM = (function () {
  "use strict";
  var K = window.KATALOG || { DATA: [], KECAMATAN: [] };

  function normal(t) {
    return String(t || "").toLowerCase().replace(/[“”"'’‘]/g, "").replace(/[^a-z0-9\s\-\/]/g, " ").replace(/\s+/g, " ").trim();
  }
  function tokens(t) { return normal(t).split(" ").filter(Boolean); }

  /* ------------------------------------------------------------ kosakata */
  var KOSA = {};
  function tambahKosakata(teks, bobot) {
    String(teks || "").toLowerCase().replace(/[^a-z\s-]/g, " ").split(/\s+/).forEach(function (w) {
      w = w.replace(/^-+|-+$/g, "");
      if (w.length >= 3) KOSA[w] = (KOSA[w] || 0) + (bobot || 1);
    });
  }
  /* kata fungsi & kata tanya: supaya tidak "dikoreksi" ke istilah lain */
  tambahKosakata("berapa bagaimana gimana dimana di mana kapan kenapa mengapa siapa apakah apa mana yang tolong minta mohon butuh perlu " +
    "ingin mau pengen cari carikan lihat tampilkan tunjukkan bandingkan banding dibanding dibandingkan perbandingan peringkat ranking urutan " +
    "tertinggi terendah tinggi rendah paling naik turun tumbuh sejak sampai hingga antara dengan untuk dari yang pada atau dan tahun " +
    "terakhir terbaru sekarang bisa dapat boleh adalah akan sudah belum jumlah angka nilai data datanya persen persentase " +
    "kutai kartanegara kukar kabupaten kota provinsi kalimantan timur kaltim kecamatan desa kelurahan wilayah daerah " +
    "saya kami kita bapak ibu mas mbak pak bu halo hai selamat pagi siang sore malam terima kasih makasih oke baik ya tidak bukan iya " +
    "sebelumnya lalu kemarin besok ini itu tadi juga masih lagi dulu kalau kalo jika bila misal contoh lebih kurang sama beda bedanya " +
    "berita resmi statistik publikasi buku terbitan infografis rilis jadwal agenda terbit unduh download tautan link pdf " +
    "konsultasi zoom daring online tiket kode status permintaan ajukan mengajukan pesan kirim batal ubah lanjut kembali " +
    "nama nomor telepon handphone email surel instansi keperluan kebutuhan skripsi tesis penelitian tugas kuliah laporan kantor " +
    "hari ini bulan minggu triwulan semester tahunan bulanan mingguan harian rata-rata rata rata total keseluruhan per menurut", 3);
  tambahKosakata("bps badan pusat statistik pst pelayanan terpadu sahabat pegawai petugas ruang glosarium katalog indikator strategis beranda pintar", 3);
  /* nama wilayah & sebutan sehari-hari */
  tambahKosakata("samarinda balikpapan bontang berau paser penajam paser utara ppu kutai barat kubar kutai timur kutim mahakam ulu mahulu sangatta tenggarong " +
    "kalimantan timur kaltim indonesia nasional jawa sulawesi borneo ibukota ikn nusantara sepaku", 4);
  /* kata umum yang tidak selalu ada di teks situs, supaya tidak salah dikoreksi */
  tambahKosakata("informasi mengenai tentang tolong silakan silahkan mohon bantu bantuan minta ingin butuh perlu punya sudah belum sedang akan harus boleh bisa dapat " +
    "mungkin kira-kira sekitar kurang lebih banyak sedikit besar kecil tinggi rendah baru lama cepat lambat jauh dekat sering jarang selalu pernah semua setiap beberapa " +
    "seluruh dimana kemana darimana bagaimana mengapa kenapa kapan siapa berapa apakah adakah tersedia sedia terbaru terakhir tahun bulan minggu hari waktu sekarang nanti " +
    "kemarin besok lusa tadi dulu sebelum sesudah setelah selama sejak sampai hingga antara dengan tanpa untuk kepada dari oleh karena sebab akibat supaya agar tetapi " +
    "namun walaupun meskipun jika kalau bila ketika saat cara langkah syarat prosedur biaya gratis bayar dokumen berkas surat lampiran contoh misalnya seperti " +
    "hasil jumlah total angka nilai persen persentase rata-rata tertinggi terendah naik turun tetap stabil membaik memburuk melambat cepat pesat " +
    "pertanyaan jawaban tanya jawab bertanya menjawab bilang katakan sampaikan kirim kirimkan hubungi telepon whatsapp wa email surel alamat kantor lokasi peta " +
    "tolonglah terimakasih makasih thanks halo hai selamat pagi siang sore malam permisi maaf mohon maaf assalamualaikum waalaikumsalam salam", 3);
  K.DATA.forEach(function (d) { tambahKosakata(d.n + " " + d.t + " " + d.sm + " " + d.d + " " + (d.mn || "")); });
  (K.KECAMATAN || []).forEach(function (k) { tambahKosakata(k[0], 3); });
  (window.GLOSARIUM || []).forEach(function (g) { tambahKosakata(g.istilah + " " + (g.kunci || []).join(" ") + " " + (g.definisi || "") + " " + (g.baca || "") + " " + (g.keliru || ""), 2); });
  (window.PENGETAHUAN || []).forEach(function (b) { tambahKosakata((b.kunci || []).join(" ") + " " + (b.jawab || "")); });

  /* ------------------------------------------------ bahasa sehari-hari */
  /* [pola, tambahan istilah BPS]. Tambahan disisipkan ke teks pencarian (tidak
     mengganti kata asli), sehingga katalog/indikator/glosarium ikut cocok. */
  var AWAM = [
    /* ---- Desa Cantik & program bantuan: bahasa sehari-hari → istilah baku ---- */
    [/\b(desa cantik|descan|des ?cantik|kelurahan cantik|cinta statistik)\b/, "desa cinta statistik desa cantik pembinaan"],
    [/\b(agen statistik|duta statistik|komunitas statistik|kader statistik)\b/, "agen statistik desa cantik"],
    [/\b(monografi|profil desa|desa dalam angka|publikasi desa)\b/, "monografi profil desa publikasi statistik desa"],
    [/\b(dtsen|data tunggal|desil|pemeringkatan kesejahteraan)\b/, "dtsen data tunggal sosial ekonomi desil"],
    [/\b(bansos|bantuan sosial|pkh|sembako|bpnt|blt|pbi|kis|kartu sehat|bantuan pemerintah)\b/, "bantuan sosial dtsen desil"],
    [/\b(ga dapat bantuan|gak dapat bantuan|tidak dapat bantuan|tidak dapat bansos|dicoret|diputus|tidak menerima lagi|kok tidak dapat)\b/, "usulan bantuan sanggahan dtsen cek bansos"],
    [/\b(cek ?bansos|siks ?ng|siks-ng|usulan bansos|sanggahan)\b/, "usulan pembaruan data dtsen bantuan sosial"],
    [/\b(sensus ekonomi|se ?2026|pendataan usaha|pendataan ekonomi)\b/, "sensus ekonomi 2026"],
    [/\b(fasih|aplikasi pendataan|aplikasi petugas|capi)\b/, "fasih aplikasi pengumpulan data"],
    [/\b(sobat ?bps|mitra bps|jadi petugas|daftar petugas|rekrutmen petugas)\b/, "mitra statistik sobat bps petugas"],
    [/\b(satu data|sdi|standar data|metadata|walidata)\b/, "satu data indonesia standar data statistik"],
    [/\b(kelas baca angka|belajar statistik|belajar angka|materi pelatihan|modul belajar|soal latihan)\b/, "kelas statistik desa belajar"],
    [/\b(sid|sistem informasi desa|website desa|web desa)\b/, "website desa data statistik"],
    /* ---- lainnya ---- */
    [/\b(nganggur\w*|pengangur\w*|penganggur\w*|tidak (punya|ada) (kerja|pekerjaan)|belum (dapat )?kerja|cari kerja)\b/, "pengangguran tpt tingkat pengangguran terbuka"],
    [/\b(orang|warga|rakyat|masyarakat|keluarga|rumah tangga) miskin\b|\bkemiskinan\b|\bmiskin\b/, "penduduk miskin kemiskinan p0"],
    [/\b(harga(-| )harga|harga naik|kenaikan harga|harga barang|mahal|inflasi)\b/, "inflasi indeks harga konsumen ihk"],
    [/\b(gaji|upah|umr|umk|ump)\b/, "upah minimum umk"],
    [/\b(lapangan kerja|pekerja|buruh|karyawan|tenaga kerja|angkatan kerja|bekerja)\b/, "tenaga kerja angkatan kerja sakernas tpak"],
    [/\b(sekolah|murid|siswa|guru|sd|smp|sma|smk|kuliah|kampus|universitas)\b/, "pendidikan"],
    [/\b(lama sekolah|lamanya sekolah|rata-rata sekolah|tamat sekolah|lulus)\b/, "rata-rata lama sekolah rls harapan lama sekolah hls"],
    [/\b(umur panjang|usia harapan|harapan hidup|panjang umur|umur harapan)\b/, "umur harapan hidup uhh"],
    [/\b(ekonomi (tumbuh|naik|melambat)|pertumbuhan ekonomi|laju ekonomi|tumbuh berapa)\b/, "laju pertumbuhan ekonomi lpe"],
    [/\b(penghasilan|pendapatan per ?orang|pendapatan per ?kapita|pendapatan daerah)\b/, "pdrb per kapita pendapatan"],
    [/\b(jumlah orang|banyak orang|populasi|jiwa|warga|penduduknya|jumlah penduduk)\b/, "jumlah penduduk penduduk"],
    [/\b(kesenjangan|ketimpangan|jurang|timpang|gini)\b/, "gini ratio ketimpangan pendapatan"],
    [/\b(petani|sawah|padi|beras|jagung|panen|pertanian|tani)\b/, "pertanian tanaman pangan luas panen produksi"],
    [/\b(sawit|karet|kelapa|kakao|lada|perkebunan)\b/, "perkebunan"],
    [/\b(tambang|batu ?bara|batubara|minyak|gas|migas|pertambangan)\b/, "pertambangan penggalian"],
    [/\b(sapi|kerbau|kambing|ayam|ternak|peternakan|daging|telur)\b/, "peternakan populasi ternak"],
    [/\b(ikan|nelayan|tambak|perikanan|udang)\b/, "perikanan produksi perikanan"],
    [/\b(hotel|wisata|wisatawan|turis|pariwisata|tamu hotel)\b/, "pariwisata hotel wisatawan"],
    [/\b(bayi|kelahiran|lahir|melahirkan|fertilitas)\b/, "kelahiran fertilitas"],
    [/\b(meninggal|kematian|mortalitas)\b/, "kematian mortalitas"],
    [/\b(cacat|disabilitas|difabel)\b/, "disabilitas"],
    [/\b(stunting|gizi|balita|imunisasi|kesehatan|sakit|rumah sakit|puskesmas|dokter)\b/, "kesehatan"],
    [/\b(belanja|pengeluaran|konsumsi|daya beli)\b/, "pengeluaran per kapita konsumsi"],
    [/\b(kampung|dusun|rt|rw)\b/, "desa"],
    [/\b(pembangunan manusia|kualitas manusia|kualitas hidup|ipm)\b/, "indeks pembangunan manusia ipm"],
    [/\b(kerja layak|jam kerja|setengah penganggur|informal)\b/, "ketenagakerjaan sakernas"],
    [/\b(luas|wilayah luas|luas daerah|luasnya)\b/, "luas wilayah"],
    [/\b(padat|kepadatan)\b/, "kepadatan penduduk"],
    [/\b(laki-laki|laki|perempuan|wanita|pria|gender|jenis kelamin)\b/, "jenis kelamin rasio jenis kelamin"],
    [/\b(lansia|manula|usia lanjut|orang tua)\b/, "lansia penduduk lanjut usia"],
    [/\b(anak-anak|remaja|pemuda|generasi)\b/, "kelompok umur generasi"],
    [/\b(listrik|pln|air bersih|pdam|sanitasi|jamban)\b/, "perumahan sanitasi listrik"],
    [/\b(internet|hp|ponsel|telepon seluler|sinyal|telekomunikasi)\b/, "telekomunikasi internet"],
    [/\b(jalan|jembatan|transportasi|angkutan|kendaraan|motor|mobil)\b/, "transportasi jalan kendaraan"],
    [/\b(ekspor|impor|perdagangan|pasar|toko|dagang)\b/, "perdagangan ekspor impor"],
    [/\b(bank|kredit|tabungan|koperasi|keuangan|apbd|pajak|pad)\b/, "keuangan daerah apbd"],
    [/\b(pabrik|industri|umkm|usaha kecil|usaha)\b/, "industri usaha"],
    [/\b(hujan|cuaca|iklim|suhu|banjir)\b/, "iklim curah hujan"],
    [/\b(sensus|sp2020|sensus penduduk)\b/, "sensus penduduk"]
  ];
  function awam(teks) {
    var t = normal(teks), tambah = [];
    AWAM.forEach(function (a) { if (a[0].test(t)) tambah.push(a[1]); });
    return tambah.filter(function (x, i, arr) { return arr.indexOf(x) === i; });
  }

  /* --------------------------------------------------- salah ketik */
  function jarak(a, b, maks) {
    /* Damerau-Levenshtein (transposisi berdekatan), berhenti bila melebihi maks */
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > maks) return maks + 1;
    var d = [], i, j;
    for (i = 0; i <= la; i++) { d[i] = [i]; }
    for (j = 1; j <= lb; j++) d[0][j] = j;
    for (i = 1; i <= la; i++) {
      var terkecil = maks + 1;
      for (j = 1; j <= lb; j++) {
        var biaya = a[i - 1] === b[j - 1] ? 0 : 1;
        var v = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + biaya);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2][j - 2] + 1);
        d[i][j] = v; if (v < terkecil) terkecil = v;
      }
      if (terkecil > maks) return maks + 1;
    }
    return d[la][lb];
  }
  var DAFTAR_KOSA = null;
  function daftarKosa() {
    if (!DAFTAR_KOSA) DAFTAR_KOSA = Object.keys(KOSA).filter(function (w) { return w.length >= 4; });
    return DAFTAR_KOSA;
  }
  function dikenal(w) {
    if (KOSA[w]) return true;
    /* bentuk berimbuhan dari kata dikenal: penggal awalan/akhiran */
    var v = window.CARI && window.CARI.penggal ? window.CARI.penggal(w) : [w];
    return v.some(function (x) { return KOSA[x]; });
  }
  function kandidat(w) {
    var maks = w.length >= 8 ? 2 : 1, terbaik = null, skor = 0, jr;
    var daftar = daftarKosa();
    for (var i = 0; i < daftar.length; i++) {
      var c = daftar[i];
      if (Math.abs(c.length - w.length) > maks) continue;
      if (c[0] !== w[0] && !(maks >= 1 && c.length >= 6 && jarak(w, c, 1) === 1)) continue;
      jr = jarak(w, c, maks);
      if (jr > maks) continue;
      var s = (maks + 1 - jr) * 1000 + Math.min(KOSA[c], 999);
      if (s > skor) { skor = s; terbaik = c; }
    }
    return terbaik;
  }
  function koreksi(teks) {
    var asli = String(teks || ""), ubah = [];
    var hasil = asli.replace(/[A-Za-z][A-Za-z\-]{4,}/g, function (w) {
      var lw = w.toLowerCase();
      if (/\d/.test(lw) || dikenal(lw)) return w;
      var c = kandidat(lw);
      if (!c || c === lw) return w;
      ubah.push([w, c]); return c;
    });
    return { teks: hasil, ubah: ubah };
  }

  /* -------------------------------------------------------- entitas */
  var WILAYAH = [
    ["Kutai Kartanegara", "KKR", /\b(kukar|kutai kartanegara|tenggarong)\b/],
    ["Samarinda", "SMD", /\bsamarinda\b/],
    ["Balikpapan", "BPP", /\bbalikpapan\b/],
    ["Bontang", "BTG", /\bbontang\b/],
    ["Berau", "BRU", /\bberau\b/],
    ["Paser", "PSR", /\bpaser\b(?! utara)/],
    ["Penajam Paser Utara", "PPU", /\b(ppu|penajam|paser utara)\b/],
    ["Kutai Barat", "KBR", /\b(kubar|kutai barat)\b/],
    ["Kutai Timur", "KTM", /\b(kutim|kutai timur|sangatta)\b/],
    ["Mahakam Ulu", "MHU", /\b(mahulu|mahakam ulu)\b/]
  ];
  var KEC = (K.KECAMATAN || []).map(function (k) { return k[0]; });
  function entitas(teks) {
    var t = normal(teks), e = { tahun: [], wilayah: [], prov: false, kecamatan: [] };
    (t.match(/\b20\d\d\b/g) || []).forEach(function (y) { if (e.tahun.indexOf(y) === -1) e.tahun.push(y); });
    if (/\b(kaltim|kalimantan timur|provinsi|se-kaltim|sekaltim|tingkat provinsi)\b/.test(t)) e.prov = true;
    WILAYAH.forEach(function (w) { if (w[2].test(t) && w[1] !== "KKR") e.wilayah.push({ nama: w[0], kode: w[1] }); });
    if (/\b(kukar|kutai kartanegara)\b/.test(t)) e.kukar = true;
    /* kecamatan: nama terpanjang dulu (Tenggarong Seberang sebelum Tenggarong, Samboja Barat sebelum Samboja) */
    KEC.slice().sort(function (a, b) { return b.length - a.length; }).forEach(function (n) {
      var re = new RegExp("\\b" + n.toLowerCase().replace(/[-\s]+/g, "[\\s-]*") + "\\b");
      if (re.test(t) && !e.kecamatan.some(function (x) { return x.toLowerCase().indexOf(n.toLowerCase()) !== -1; })) e.kecamatan.push(n);
    });
    /* "Tenggarong" sebagai nama kecamatan lebih masuk akal daripada ibu kota kabupaten
       bila disebut bersama kata kecamatan/penduduk/luas */
    if (e.kecamatan.length && /\b(kecamatan|penduduk|luas|desa|kelurahan|padat)\b/.test(t)) e.kukar = false;
    return e;
  }

  /* ------------------------------------------------------------- niat */
  function niat(teks) {
    var t = normal(teks);
    return {
      definisi:   /\b(apa itu|apa arti|apa maksud|artinya|arti|pengertian|definisi|maksudnya|apa bedanya|bedanya|perbedaan|cara menghitung|dihitung|rumus|cara membaca|itu apa)\b/.test(t),
      angka:      /\b(berapa|nilai|angka|persen|persentase|tingkat|indeks|jumlah|capaian|berapakah)\b/.test(t) || /\b20\d\d\b/.test(t),
      banding:    /\b(banding\w*|dibanding\w*|perbandingan|versus|vs|beda(nya)? dengan|selisih|lebih (tinggi|rendah|besar|kecil|baik|buruk) dari)\b/.test(t),
      peringkat:  /\b(peringkat|ranking|rangking|urutan|posisi|nomor berapa|ke berapa|tertinggi|terendah|paling (tinggi|rendah|besar|kecil|banyak|sedikit|miskin|kaya|padat|luas|maju|tertinggal|baik|buruk)|terbanyak|tersedikit|terluas|terkecil|terpadat|termiskin|termaju)\b/.test(t),
      tren:       /\b(tren|trend|perkembangan|naik|turun|meningkat|menurun|kenaikan|penurunan|perubahan|berubah|sejak|dari tahun|ke tahun|selama|lima tahun|5 tahun|membaik|memburuk|melambat|tumbuh|sampai|hingga|s\.?d\.?|antara|deret|riwayat|historis|per tahun|tiap tahun)\b/.test(t) || (t.match(/\b20\d\d\b/g) || []).length >= 2,
      publikasi:  /\b(publikasi|buku|terbitan|brs|berita resmi|infografis|rilis|dalam angka|kda|jadwal rilis|rencana terbit|kapan terbit|kapan rilis|kapan keluar|agenda|unduh|download|pdf)\b/.test(t),
      minta:      /\b(minta|meminta|permintaan|ajukan|mengajukan|pengajuan|butuh|perlu|request|tiket baru|buat tiket|ingin data|mau data|pesan data)\b/.test(t),
      konsultasi: /\b(konsultasi|konsul|zoom|janji temu|bicara dengan pegawai|ngobrol|tanya langsung|narasumber)\b/.test(t),
      tiket:      /\b(tiket|status permintaan|cek status|sudah sampai mana|pst-\d|kon-\d)\b/.test(t),
      kecamatan:  /\bkecamatan\b/.test(t),
      batal:      /^(batal|batalkan|cancel|gak jadi|tidak jadi|nggak jadi|ga jadi|stop|sudahlah)\b/.test(t),
      lanjutan:   /^(kalau|kalo|bagaimana (dengan|kalau)|gimana (dengan|kalau)|yang|dan|terus|lalu|untuk|di|kalau yang|tahun|bandingkan|dibanding|sekarang|terbaru)\b/.test(t) || tokens(t).length <= 3
    };
  }

  return { normal: normal, tokens: tokens, koreksi: koreksi, jarak: jarak, awam: awam, entitas: entitas, niat: niat,
           tambahKosakata: function (teks, bobot) { tambahKosakata(teks, bobot); DAFTAR_KOSA = null; },
           WILAYAH: WILAYAH, KECAMATAN: KEC, dikenal: dikenal };
})();
