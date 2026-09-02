/* ============================================================================
   Katalog Ketersediaan Data — BPS Kabupaten Kutai Kartanegara
   Sumber tunggal isi katalog. Dipakai oleh index.html (katalog publik)
   dan admin.html (penautan kebutuhan sahabat data ke ragam data).

   Skema satu baris:
     t   topik
     n   nama ragam data
     lv  level wilayah terendah: Desa | Kecamatan | Kabupaten | —
     pd  periode tersedia
     sm  sumber survei / penghitungan
     st  ada | mohon | prov | tidak | lain
     d   keterangan yang muncul saat baris dibuka
     mn  letak di situs BPS (jejak menu), opsional
     ln  daftar tautan langsung [{u:url, l:label}], opsional
     cek true bila isian masih perlu dipastikan petugas
   ========================================================================== */
window.KATALOG = (function () {
  "use strict";

  var B = "https://kukarkab.bps.go.id/id/";

  /* --- pustaka tautan yang sudah diverifikasi --- */
  var P = {
    kda26:   B+"publication/2026/02/27/ba1c29ed91564e4a05d23ea1/kabupaten-kutai-kartanegara-dalam-angka-2026.html",
    kda25:   B+"publication/2025/02/28/2a8ceff0dde51a480f3abff3/kabupaten-kutai-kartanegara-dalam-angka-2025.html",
    pdrblu:  B+"publication/2025/04/11/81236c332af07ac46df51677/produk-domestik-regional-bruto-kabupaten-kutai-kartanegara-menurut-lapangan-usaha-2020---2024.html",
    pdrbpg:  B+"publication/2025/04/30/1777d0d876f5065264761147/produk-domestik-regional-bruto-kabupaten-kutai-kartanegara-menurut-pengeluaran-2020---2024.html",
    kesra24: B+"publication/2024/12/13/619a24ea9279a1252c860056/statistik-kesejahteraan-rakyat-kabupaten-kutai-kartanegara-2024.html",
    statda:  B+"publication/2024/12/24/4d3490ca80dfd5c73e1a0e77/statistik-daerah-kabupaten-kutai-kartanegara-2023-2024.html",
    podes24: B+"publication/2024/12/27/5f7df259a67caad27eb45b80/statistik-potensi-desa-kabupaten-kutai-kartanegara-2024.html",
    st23tan: B+"publication/2024/08/16/e8b33f932b8b4ec5dae8a383/hasil-pencacahan-lengkap-sensus-pertanian-2023---tahap-ii-usaha-pertanian-perorangan--utp--tanaman-pangan-kabupaten-kutai-kartanegara.html",
    st23nak: B+"publication/2024/08/09/ba027bc08ab350dc18303e8a/hasil-pencacahan-lengkap-sensus-pertanian-2023---tahap-ii-usaha-pertanian-perorangan--utp--peternakan-kabupaten-kutai-kartanegara.html",
    st23kan: B+"publication/2024/08/23/1b118c18adc084928dff74c5/complete-enumeration-results-of-the-2023-census-of-agriculture---edition-2-fishery-individual-agricultural-holdings-kutai-kartanegara-regency.html",
    st23tp1: B+"pressrelease/2025/01/10/1167/sensus-pertanian-2023-hasil-pencacahan-lengkap---tahap-i.html",
    naker18: B+"publication/2019/12/31/96a62ee81762da428144c074/keadaan-angkatan-kerja-kabupaten-kutai-kartanegara-2018.html",
    skd24:   B+"publication/2024/12/06/1411c279283c27284e668ff7/analisis-hasil-survei-kebutuhan-data-bps-kabupaten-kutai-kartanegara-2024.html",
    brsipm:  B+"pressrelease/2024/01/02/9/indeks-pembangunan-manusia--ipm--kutai-kartanegara-tahun-2023-berstatus-tinggi-yakni-sebesar-75-95.html",

    /* tabel statistik */
    tPendKec: B+"statistics-table/2/MTk3IzI=/jumlah-penduduk-menurut-kecamatan-di-kabupaten-kutai-kartanegara.html",
    tPendUmur:B+"statistics-table/2/MTk4IzI=/jumlah-penduduk-menurut-kelompok-umur-dan-jenis-kelamin-di-kabupaten-kutai-kartanegara.html",
    tRasioJK: B+"statistics-table/2/MjAwIzI=/rasio-jenis-kelamin-penduduk-menurut-kecamatan-di-kabupaten-kutai-kartanegara.html",
    tSP:      B+"statistics-table/2/NzUjMg==/hasil-sensus-penduduk.html",
    tSP2020:  B+"statistics-table/1/MjEjMQ==/jumlah-penduduk-dan-rasio-jenis-kelamin-menurut-kecamatan-hasil-sp-2020-kabupaten-kutai-kartanegara-.html",
    tGK:      B+"statistics-table/2/MTIyIzI=/garis-kemiskinan-kabupaten-kutai-kartanegara.html",
    tMiskin:  B+"statistics-table/2/MTIzIzI=/jumlah-penduduk-miskin-kabupaten-kutai-kartanegara.html",
    tP2:      B+"statistics-table/2/MTI2IzI=/indeks-keparahan-kemiskinan--p2--kabupaten-kutai-kartanegara.html",
    tIPM:     B+"statistics-table/2/MTg4IzI=/indeks-pembangunan-manusia--ipm--menurut-jenis-kelamin.html",
    tAHH:     B+"statistics-table/2/MTgzIzI=/angka-harapan-hidup--ahh--menurut-jenis-kelamin.html",
    tPengkap: B+"statistics-table/2/MTg2IzI=/pengeluaran-per-kapita-yang-disesuaikan-menurut-jenis-kelamin.html",
    tIPG:     B+"statistics-table/2/MiMy/indeks-pembangunan-gender.html",
    tNakes:   B+"statistics-table/2/NzMjMg==/number-of-health-personnel-by-subdistrict-in-kutai-kartanegara-regency.html",
    tSayur:   B+"statistics-table/2/MTY1IzI=/luas-panen-tanaman-sayuran-dan-buah-buahan-semusim-menurut-jenis-tanaman-di-kabupaten-kutai-kartanegara.html",
    tSayurKec:B+"statistics-table/2/MTYwIzI=/luas-panen-tanaman-sayuran-dan-buah-buahan-semusim-menurut-jenis-tanaman-dan-kecamatan-di-kabupaten-kutai-kartanegara.html",
    tIHIpdrb: B+"statistics-table/2/MjI4IzI=/-seri-2010--indeks-harga-implisit-pdrb-menurut-pengeluaran.html",

    /* halaman subjek — selalu sertakan ?subject= , tanpa itu halaman error */
    s519: B+"statistics-table?subject=519", /* Kependudukan dan Migrasi */
    s520: B+"statistics-table?subject=520", /* Tenaga Kerja */
    s521: B+"statistics-table?subject=521", /* Pendidikan */
    s522: B+"statistics-table?subject=522", /* Kesehatan */
    s523: B+"statistics-table?subject=523", /* Konsumsi dan Pendapatan */
    s525: B+"statistics-table?subject=525", /* Pemukiman dan Perumahan */
    s530: B+"statistics-table?subject=530", /* Statistik Makroekonomi */
    s531: B+"statistics-table?subject=531", /* Neraca Ekonomi */
    s533: B+"statistics-table?subject=533", /* Statistik sektoral */
    s536: B+"statistics-table?subject=536", /* Harga-Harga */
    s539: B+"statistics-table?subject=539", /* Lingkungan */
    s541: B+"statistics-table?subject=541", /* Multi-domain */
    s557: B+"statistics-table?subject=557", /* Pertanian, Kehutanan, Perikanan */
    s558: B+"statistics-table?subject=558", /* Energi */
    s559: B+"statistics-table?subject=559", /* Pertambangan, Manufaktur, Konstruksi */
    s560: B+"statistics-table?subject=560", /* Transportasi */
    s561: B+"statistics-table?subject=561", /* Pariwisata */
    s563: B+"statistics-table?subject=563", /* Kemiskinan lintas sektor */
    s564: B+"statistics-table?subject=564", /* Gender */

    dinamis: B+"query-builder",
    arc:     B+"arc",
    tautan:  B+"tautan",
    pst:     "https://pst.bps.go.id/",
    silastik:"https://silastik.bps.go.id",
    romantik:"https://romantik.web.bps.go.id",
    ppid:    "https://ppid.bps.go.id/?mfd=6403",
    kaltim:  "https://kaltim.bps.go.id/id",
    sig:     "https://sig.bps.go.id"
  };

  function L(u, l) { return { u: u, l: l }; }

  var DATA = [
  /* ================= KEPENDUDUKAN ================= */
  { t:"Kependudukan", n:"Jumlah penduduk menurut jenis kelamin", lv:"Kecamatan", pd:"2020–2025", sm:"Proyeksi SP2020", st:"ada",
    mn:"Produk › Publikasi · Produk › Statistik menurut Subjek (519)",
    ln:[L(P.tPendKec,"Tabel: penduduk menurut kecamatan"), L(P.kda26,"Kukar Dalam Angka 2026"), L(P.s519,"Subjek Kependudukan dan Migrasi")],
    d:"Angka proyeksi penduduk pertengahan tahun, bukan pencatatan administrasi kependudukan Dukcapil. Selisih dengan angka Dukcapil adalah hal biasa dan bukan kekeliruan — jelaskan ini lebih dulu bila pengguna membandingkan keduanya." },

  { t:"Kependudukan", n:"Kepadatan penduduk per kilometer persegi", lv:"Kecamatan", pd:"2020–2025", sm:"Proyeksi SP2020", st:"ada",
    mn:"Produk › Publikasi", ln:[L(P.kda26,"Kukar Dalam Angka 2026 — bab Geografi & Kependudukan"), L(P.statda,"Statistik Daerah 2023/2024")],
    d:"Ada pada bagian geografi dan kependudukan publikasi Dalam Angka, sudah dihitung per kecamatan." },

  { t:"Kependudukan", n:"Laju pertumbuhan penduduk", lv:"Kabupaten", pd:"2020–2025", sm:"Proyeksi SP2020", st:"ada",
    mn:"Produk › Publikasi", ln:[L(P.kda26,"Kukar Dalam Angka 2026"), L(P.tSP,"Tabel: hasil Sensus Penduduk")],
    d:"Untuk level kecamatan tidak disajikan langsung, tetapi dapat dihitung sendiri dari angka penduduk tiap tahun pada tabel penduduk menurut kecamatan." },

  { t:"Kependudukan", n:"Rasio jenis kelamin", lv:"Kecamatan", pd:"2020–2025", sm:"Proyeksi SP2020", st:"ada",
    mn:"Produk › Statistik menurut Subjek (519)", ln:[L(P.tRasioJK,"Tabel: rasio jenis kelamin menurut kecamatan"), L(P.tSP2020,"Tabel: hasil SP2020 menurut kecamatan")],
    d:"Jumlah penduduk laki-laki untuk setiap 100 penduduk perempuan." },

  { t:"Kependudukan", n:"Komposisi penduduk menurut kelompok umur", lv:"Kabupaten", pd:"2020–2025", sm:"Proyeksi SP2020", st:"ada",
    mn:"Produk › Statistik menurut Subjek (519)", ln:[L(P.tPendUmur,"Tabel: penduduk menurut kelompok umur dan jenis kelamin"), L(P.kda26,"Kukar Dalam Angka 2026")],
    d:"Termasuk penduduk usia produktif, lansia, rasio ketergantungan, dan pengelompokan menurut generasi." },

  { t:"Kependudukan", n:"Jumlah penduduk menurut desa dan kelurahan", lv:"Desa", pd:"2020; seri tahunan", sm:"SP2020 · Kecamatan Dalam Angka", st:"ada",
    mn:"Produk › Publikasi › Kecamatan Dalam Angka",
    ln:[L(P.tSP2020,"Tabel: hasil SP2020 menurut kecamatan"), L(P.podes24,"Statistik Potensi Desa 2024")],
    d:"Level desa hanya ada di publikasi Kecamatan Dalam Angka — pilih kecamatannya di daftar kecamatan pada halaman ini — dan pada hasil Sensus Penduduk 2020. Tidak ada satu tabel tunggal yang memuat seluruh desa se-kabupaten sekaligus." },

  { t:"Kependudukan", n:"Proyeksi penduduk tahun mendatang", lv:"Kabupaten", pd:"2020–2035", sm:"Proyeksi SP2020", st:"mohon",
    mn:"Ajukan lewat PST", ln:[L(P.pst,"Ajukan lewat PST BPS")],
    d:"Seri proyeksi jangka panjang hasil SP2020 tersedia sampai 2035 di tingkat kabupaten. Belum diterbitkan sebagai tabel siap unduh di laman Kukar, jadi mintalah melalui layanan konsultasi statistik." },

  { t:"Kependudukan", n:"Penduduk menurut agama, suku, dan bahasa", lv:"Kabupaten", pd:"2020", sm:"SP2020 Lanjutan", st:"mohon", cek:true,
    mn:"Ajukan lewat PST", ln:[L(P.pst,"Ajukan lewat PST BPS")],
    d:"Karakteristik ini dikumpulkan pada Sensus Penduduk 2020 Lanjutan. Perlu dipastikan kerincian yang boleh disajikan untuk tingkat kabupaten sebelum dijanjikan ke pengguna." },

  { t:"Kependudukan", n:"Jumlah rumah tangga dan rata-rata anggota rumah tangga", lv:"Kecamatan", pd:"2020–2025", sm:"SP2020 · Susenas", st:"ada",
    mn:"Produk › Publikasi", ln:[L(P.kda26,"Kukar Dalam Angka 2026"), L(P.kesra24,"Statistik Kesejahteraan Rakyat 2024")],
    d:"Jumlah rumah tangga per kecamatan ada di Dalam Angka; rata-rata banyaknya anggota rumah tangga ada di publikasi kesejahteraan rakyat." },

  { t:"Kependudukan", n:"Angka kelahiran, kematian, dan fertilitas", lv:"Kabupaten", pd:"2020–2024", sm:"SP2020 · Susenas", st:"ada",
    mn:"Produk › Publikasi", ln:[L(P.kesra24,"Statistik Kesejahteraan Rakyat 2024 — bab Fertilitas & KB")],
    d:"Publikasi kesejahteraan rakyat memuat fertilitas dan keluarga berencana. Angka kematian rinci menurut penyebab bukan keluaran BPS, melainkan ada di dinas kesehatan." },

  /* ================= KETENAGAKERJAAN ================= */
  { t:"Ketenagakerjaan", n:"Tingkat Partisipasi Angkatan Kerja (TPAK)", lv:"Kabupaten", pd:"2015–2025", sm:"Sakernas Agustus", st:"ada",
    mn:"Produk › Statistik menurut Subjek (520)", ln:[L(P.s520,"Subjek Tenaga Kerja"), L(P.kda26,"Kukar Dalam Angka 2026"), L(P.dinamis,"Tabel Dinamis")],
    d:"Sakernas dirancang mewakili tingkat kabupaten pada pencacahan Agustus. Angka Februari hanya representatif sampai tingkat provinsi — jangan dijanjikan sebagai angka kabupaten." },

  { t:"Ketenagakerjaan", n:"Tingkat Pengangguran Terbuka (TPT)", lv:"Kabupaten", pd:"2015–2025", sm:"Sakernas Agustus", st:"ada",
    mn:"Produk › Statistik menurut Subjek (520)", ln:[L(P.s520,"Subjek Tenaga Kerja"), L(P.kda26,"Kukar Dalam Angka 2026")],
    d:"Persentase penganggur terhadap seluruh angkatan kerja, kondisi Agustus." },

  { t:"Ketenagakerjaan", n:"Penduduk bekerja menurut lapangan usaha", lv:"Kabupaten", pd:"2015–2025", sm:"Sakernas Agustus", st:"ada",
    mn:"Produk › Statistik menurut Subjek (520)", ln:[L(P.s520,"Subjek Tenaga Kerja"), L(P.naker18,"Keadaan Angkatan Kerja 2018 — contoh format rinci")],
    d:"Semakin rinci pengelompokan sektor, semakin besar galat sampelnya; rincian tertentu bisa jadi tidak dapat disajikan. Untuk rincian di luar tabel yang terbit, ajukan lewat PST." },

  { t:"Ketenagakerjaan", n:"Penduduk bekerja menurut status pekerjaan (formal–informal)", lv:"Kabupaten", pd:"2015–2025", sm:"Sakernas Agustus", st:"ada",
    mn:"Produk › Statistik menurut Subjek (520)", ln:[L(P.s520,"Subjek Tenaga Kerja")],
    d:"Membedakan berusaha sendiri, buruh/karyawan, pekerja bebas, dan pekerja keluarga — dasar penghitungan proporsi pekerja formal dan informal." },

  { t:"Ketenagakerjaan", n:"Penduduk bekerja menurut pendidikan tertinggi", lv:"Kabupaten", pd:"2015–2025", sm:"Sakernas Agustus", st:"mohon",
    mn:"Ajukan lewat PST", ln:[L(P.pst,"Ajukan lewat PST BPS")],
    d:"Tabulasi silang pendidikan dengan status bekerja tersedia di tingkat kabupaten tetapi tidak selalu diterbitkan. Ajukan sebagai permintaan tabulasi." },

  { t:"Ketenagakerjaan", n:"Rata-rata upah atau gaji bersih pekerja", lv:"Kabupaten", pd:"seri Sakernas", sm:"Sakernas Agustus", st:"mohon", cek:true,
    mn:"Ajukan lewat PST", ln:[L(P.pst,"Ajukan lewat PST BPS")],
    d:"Tidak ada publikasi Sakernas tingkat kabupaten yang terbit setelah edisi 2018, sehingga angka upah harus diminta sebagai tabulasi. Pastikan lebih dulu tahun terakhir yang dapat dilayani." },

  { t:"Ketenagakerjaan", n:"Upah Minimum Kabupaten (UMK)", lv:"Kabupaten", pd:"tahunan", sm:"Laporan dinas", st:"lain",
    mn:"Bukan produk BPS", ln:[L(P.kda26,"Ditayangkan ulang di Kukar Dalam Angka 2026")],
    d:"Ditetapkan pemerintah daerah dan dihimpun dinas ketenagakerjaan. BPS hanya menayangkan ulang di publikasi Dalam Angka; surat resmi sebaiknya ditujukan ke dinas terkait." },

  { t:"Ketenagakerjaan", n:"Ketenagakerjaan tingkat kecamatan atau desa", lv:"—", pd:"—", sm:"Sakernas", st:"tidak",
    d:"Sakernas berbasis sampel yang dirancang mewakili tingkat kabupaten. Angka kecamatan tidak dapat diturunkan darinya, berapa pun jumlah responden yang kebetulan berada di kecamatan tersebut. Ini pertanyaan yang paling sering muncul di PST — tolak dengan penjelasan metodologi, jangan dengan 'datanya belum ada'." },

  /* ================= KEMISKINAN DAN PEMERATAAN ================= */
  { t:"Kemiskinan dan pemerataan", n:"Persentase penduduk miskin (P0)", lv:"Kabupaten", pd:"2015–2025", sm:"Susenas Maret", st:"ada",
    mn:"Produk › Statistik menurut Subjek (563)", ln:[L(P.tMiskin,"Tabel: jumlah penduduk miskin"), L(P.s563,"Subjek Kemiskinan lintas sektor"), L(P.statda,"Statistik Daerah 2023/2024")],
    d:"Ini angka kemiskinan makro hasil survei, dipakai untuk perencanaan agregat. Bukan daftar keluarga penerima bantuan." },

  { t:"Kemiskinan dan pemerataan", n:"Jumlah penduduk miskin", lv:"Kabupaten", pd:"2015–2025", sm:"Susenas Maret", st:"ada",
    mn:"Produk › Statistik menurut Subjek (563)", ln:[L(P.tMiskin,"Tabel: jumlah penduduk miskin Kukar")],
    d:"Disajikan dalam ribu jiwa, sejalan dengan persentase penduduk miskin." },

  { t:"Kemiskinan dan pemerataan", n:"Indeks kedalaman kemiskinan (P1)", lv:"Kabupaten", pd:"2015–2025", sm:"Susenas Maret", st:"ada",
    mn:"Produk › Statistik menurut Subjek (563)", ln:[L(P.s563,"Subjek Kemiskinan lintas sektor"), L(P.dinamis,"Tabel Dinamis")],
    d:"Mengukur seberapa jauh rata-rata pengeluaran penduduk miskin berada di bawah garis kemiskinan." },

  { t:"Kemiskinan dan pemerataan", n:"Indeks keparahan kemiskinan (P2)", lv:"Kabupaten", pd:"2015–2025", sm:"Susenas Maret", st:"ada",
    mn:"Produk › Statistik menurut Subjek (563)", ln:[L(P.tP2,"Tabel: indeks keparahan kemiskinan (P2)")],
    d:"Mengukur ketimpangan pengeluaran di antara sesama penduduk miskin." },

  { t:"Kemiskinan dan pemerataan", n:"Garis kemiskinan", lv:"Kabupaten", pd:"2015–2025", sm:"Susenas Maret", st:"ada",
    mn:"Produk › Statistik menurut Subjek (563)", ln:[L(P.tGK,"Tabel: garis kemiskinan Kukar")],
    d:"Batas pengeluaran per kapita per bulan yang memisahkan penduduk miskin dan tidak miskin." },

  { t:"Kemiskinan dan pemerataan", n:"Gini Ratio", lv:"Kabupaten", pd:"2015–2025", sm:"Susenas Maret", st:"ada",
    mn:"Produk › Statistik menurut Subjek (523)", ln:[L(P.s523,"Subjek Konsumsi dan Pendapatan"), L(P.statda,"Statistik Daerah 2023/2024")],
    d:"Mengukur ketimpangan pengeluaran penduduk pada skala nol sampai satu." },

  { t:"Kemiskinan dan pemerataan", n:"Pengeluaran per kapita per bulan", lv:"Kabupaten", pd:"2015–2025", sm:"Susenas Maret", st:"ada",
    mn:"Produk › Statistik menurut Subjek (523)", ln:[L(P.s523,"Subjek Konsumsi dan Pendapatan"), L(P.kesra24,"Statistik Kesejahteraan Rakyat 2024")],
    d:"Termasuk rincian menurut kelompok makanan dan bukan makanan." },

  { t:"Kemiskinan dan pemerataan", n:"Kemiskinan tingkat kecamatan atau desa", lv:"—", pd:"—", sm:"Susenas", st:"tidak",
    ln:[L(P.podes24,"Alternatif terdekat: Statistik Potensi Desa 2024")],
    d:"Susenas dirancang mewakili tingkat kabupaten. Angka kemiskinan kecamatan hanya pernah dihasilkan lewat kajian khusus dengan metode estimasi area kecil, bukan keluaran rutin. Untuk penyasaran bantuan, rujukannya basis data terpadu di Dinas Sosial. Untuk gambaran kondisi desa, tawarkan Statistik Potensi Desa." },

  { t:"Kemiskinan dan pemerataan", n:"Daftar nama dan alamat penduduk miskin", lv:"—", pd:"—", sm:"Susenas", st:"tidak",
    d:"Dilarang oleh Pasal 21 dan 24 Undang-Undang Nomor 16 Tahun 1997 tentang Statistik. Melanggar dengan sengaja diancam pidana penjara sampai 5 tahun dan denda sampai Rp100 juta, dan bagi petugas statistik sampai 1 tahun 6 bulan. Tidak dapat diberikan kepada siapa pun, termasuk instansi pemerintah, dengan surat sekalipun." },

  /* ================= PEMBANGUNAN MANUSIA ================= */
  { t:"Pembangunan manusia", n:"Indeks Pembangunan Manusia (IPM)", lv:"Kabupaten", pd:"2010–2025", sm:"Penghitungan BPS", st:"ada",
    mn:"Produk › Statistik menurut Subjek (541)", ln:[L(P.tIPM,"Tabel: IPM menurut jenis kelamin"), L(P.brsipm,"Berita Resmi Statistik IPM Kukar"), L(P.statda,"Statistik Daerah 2023/2024")],
    d:"Sejak 2023 dihitung dengan metode baru; angka lama tidak dapat langsung dibandingkan dengan angka metode baru tanpa penjelasan." },

  { t:"Pembangunan manusia", n:"Umur Harapan Hidup saat lahir (AHH)", lv:"Kabupaten", pd:"2010–2025", sm:"Penghitungan BPS", st:"ada",
    mn:"Produk › Statistik menurut Subjek (541)", ln:[L(P.tAHH,"Tabel: Angka Harapan Hidup menurut jenis kelamin")],
    d:"Komponen IPM pada dimensi kesehatan. Tersedia terpisah untuk laki-laki dan perempuan." },

  { t:"Pembangunan manusia", n:"Harapan Lama Sekolah dan Rata-Rata Lama Sekolah", lv:"Kabupaten", pd:"2010–2025", sm:"Susenas", st:"ada",
    mn:"Produk › Statistik menurut Subjek (541)", ln:[L(P.s541,"Subjek Statistik dan Indikator Multi-Domain"), L(P.kesra24,"Statistik Kesejahteraan Rakyat 2024")],
    d:"Harapan Lama Sekolah dihitung untuk penduduk usia tujuh tahun, Rata-Rata Lama Sekolah untuk penduduk 25 tahun ke atas. Keduanya sering tertukar — pastikan pengguna meminta yang mana." },

  { t:"Pembangunan manusia", n:"Pengeluaran per kapita disesuaikan", lv:"Kabupaten", pd:"2010–2025", sm:"Susenas", st:"ada",
    mn:"Produk › Statistik menurut Subjek (541)", ln:[L(P.tPengkap,"Tabel: pengeluaran per kapita disesuaikan")],
    d:"Komponen IPM pada dimensi standar hidup layak, dalam rupiah per tahun dan sudah disesuaikan dengan paritas daya beli." },

  { t:"Pembangunan manusia", n:"Indeks Pembangunan Gender (IPG)", lv:"Kabupaten", pd:"seri tahunan", sm:"Penghitungan BPS", st:"ada",
    mn:"Produk › Statistik menurut Subjek (564)", ln:[L(P.tIPG,"Tabel: Indeks Pembangunan Gender"), L(P.s564,"Subjek Gender dan Kelompok Populasi Khusus")],
    d:"Membandingkan capaian pembangunan manusia perempuan terhadap laki-laki." },

  { t:"Pembangunan manusia", n:"Indeks Ketimpangan Gender (IKG)", lv:"Kabupaten", pd:"—", sm:"Penghitungan BPS", st:"mohon", cek:true,
    mn:"Ajukan lewat PST", ln:[L(P.s564,"Subjek Gender"), L(P.pst,"Ajukan lewat PST BPS")],
    d:"Berbeda dengan IPG. Belum ditemukan tabelnya di laman Kukar — pastikan tahun terakhir yang tersedia di tingkat kabupaten sebelum menjanjikan ke pengguna." },

  { t:"Pembangunan manusia", n:"IPM tingkat kecamatan", lv:"—", pd:"—", sm:"Penghitungan BPS", st:"tidak",
    d:"IPM disusun dari komponen berbasis survei sampel yang hanya representatif sampai kabupaten. Tidak dihitung untuk kecamatan, dan tidak boleh diperkirakan sendiri dari data kecamatan." },

  /* ================= EKONOMI DAN PDRB ================= */
  { t:"Ekonomi dan PDRB", n:"PDRB menurut lapangan usaha", lv:"Kabupaten", pd:"2010–2024", sm:"Penghitungan PDRB", st:"ada",
    mn:"Produk › Publikasi", ln:[L(P.pdrblu,"PDRB Menurut Lapangan Usaha 2020–2024"), L(P.s531,"Subjek Neraca Ekonomi")],
    d:"Atas dasar harga berlaku dan harga konstan, dengan rincian tujuh belas kategori lapangan usaha. Terbit sebagai publikasi tersendiri sekitar April tiap tahun." },

  { t:"Ekonomi dan PDRB", n:"PDRB menurut pengeluaran", lv:"Kabupaten", pd:"2010–2024", sm:"Penghitungan PDRB", st:"ada",
    mn:"Produk › Publikasi", ln:[L(P.pdrbpg,"PDRB Menurut Pengeluaran 2020–2024"), L(P.tIHIpdrb,"Tabel: indeks harga implisit PDRB")],
    d:"Memerinci PDRB menurut konsumsi rumah tangga, konsumsi pemerintah, pembentukan modal tetap bruto, dan perdagangan luar wilayah." },

  { t:"Ekonomi dan PDRB", n:"Laju pertumbuhan ekonomi", lv:"Kabupaten", pd:"2010–2024", sm:"Penghitungan PDRB", st:"ada",
    mn:"Produk › Publikasi", ln:[L(P.pdrblu,"PDRB Menurut Lapangan Usaha 2020–2024"), L(P.statda,"Statistik Daerah 2023/2024")],
    d:"Dihitung dari PDRB atas dasar harga konstan. Angka triwulanan tersedia di tingkat provinsi, bukan kabupaten." },

  { t:"Ekonomi dan PDRB", n:"PDRB per kapita", lv:"Kabupaten", pd:"2010–2024", sm:"Penghitungan PDRB", st:"ada",
    mn:"Produk › Publikasi", ln:[L(P.pdrblu,"PDRB Menurut Lapangan Usaha 2020–2024")],
    d:"Nilai produksi wilayah dibagi jumlah penduduk. Bukan ukuran pendapatan yang benar-benar diterima penduduk — perlu dijelaskan, terutama di Kukar yang PDRB-nya besar karena pertambangan." },

  { t:"Ekonomi dan PDRB", n:"PDRB tanpa migas dan batubara", lv:"Kabupaten", pd:"2010–2024", sm:"Penghitungan PDRB", st:"ada",
    mn:"Produk › Publikasi", ln:[L(P.pdrblu,"PDRB Menurut Lapangan Usaha 2020–2024")],
    d:"Disajikan sebagai seri terpisah di dalam publikasi PDRB. Sering diminta pemda untuk melihat ekonomi di luar sektor ekstraktif." },

  { t:"Ekonomi dan PDRB", n:"PDRB tingkat kecamatan", lv:"—", pd:"—", sm:"Penghitungan PDRB", st:"tidak",
    d:"Penghitungan PDRB memerlukan data produksi yang tidak tersedia sampai tingkat kecamatan. Tidak dihasilkan secara rutin dan tidak dapat dipesan." },

  { t:"Ekonomi dan PDRB", n:"Inflasi dan Indeks Harga Konsumen", lv:"—", pd:"—", sm:"Survei Harga Konsumen", st:"prov", cek:true,
    mn:"Rujuk BPS Provinsi Kalimantan Timur", ln:[L(P.kaltim,"BPS Provinsi Kalimantan Timur"), L(P.s536,"Subjek Harga-Harga")],
    d:"Indeks Harga Konsumen dihitung untuk kota terpilih sebagai wilayah pencacahan, bukan untuk semua kabupaten. Pastikan lebih dulu apakah Kutai Kartanegara masuk cakupan setelah perluasan wilayah penghitungan; jika belum, arahkan pengguna ke angka provinsi Kalimantan Timur." },

  { t:"Ekonomi dan PDRB", n:"Nilai ekspor dan impor kabupaten", lv:"—", pd:"—", sm:"Statistik Perdagangan", st:"prov",
    mn:"Rujuk BPS Provinsi Kalimantan Timur", ln:[L(P.kaltim,"BPS Provinsi Kalimantan Timur")],
    d:"Statistik ekspor-impor disusun menurut pelabuhan muat dan provinsi asal barang, bukan menurut kabupaten. Angka kabupaten tidak dihasilkan." },

  { t:"Ekonomi dan PDRB", n:"Nilai Tukar Petani (NTP)", lv:"—", pd:"—", sm:"Survei Harga Perdesaan", st:"prov",
    mn:"Rujuk BPS Provinsi Kalimantan Timur", ln:[L(P.kaltim,"BPS Provinsi Kalimantan Timur")],
    d:"NTP dirancang dan dirilis pada tingkat provinsi. Tidak ada NTP tingkat kabupaten." },

  { t:"Ekonomi dan PDRB", n:"Realisasi APBD dan keuangan daerah", lv:"Kabupaten", pd:"tahunan", sm:"Laporan dinas", st:"lain",
    mn:"Bukan produk BPS", ln:[L(P.kda26,"Ditayangkan ulang di Kukar Dalam Angka 2026")],
    d:"Dihimpun dari Badan Pengelola Keuangan dan Aset Daerah. BPS menayangkan ulang di publikasi Dalam Angka; angka resmi dan terbaru ada di badan tersebut." },

  /* ================= PERTANIAN ================= */
  { t:"Pertanian", n:"Jumlah usaha pertanian dan rumah tangga usaha pertanian", lv:"Kecamatan", pd:"2013, 2023", sm:"Sensus Pertanian", st:"ada",
    mn:"Produk › Publikasi", ln:[L(P.st23tan,"ST2023 Tahap II — Tanaman Pangan"), L(P.st23tp1,"Ringkasan hasil ST2023 Tahap I")],
    d:"Hasil pencacahan lengkap Sensus Pertanian 2023 sudah terbit untuk Kukar. Tersedia dari dua putaran sensus sehingga dapat dibandingkan antardekade." },

  { t:"Pertanian", n:"Usaha pertanian perorangan peternakan", lv:"Kabupaten", pd:"2023", sm:"Sensus Pertanian 2023", st:"ada",
    mn:"Produk › Publikasi", ln:[L(P.st23nak,"ST2023 Tahap II — Peternakan")],
    d:"Volume tersendiri hasil ST2023 yang memerinci usaha peternakan perorangan." },

  { t:"Pertanian", n:"Usaha pertanian perorangan perikanan", lv:"Kabupaten", pd:"2023", sm:"Sensus Pertanian 2023", st:"ada",
    mn:"Produk › Publikasi", ln:[L(P.st23kan,"ST2023 Tahap II — Perikanan")],
    d:"Volume tersendiri hasil ST2023 untuk usaha perikanan perorangan, termasuk perikanan tangkap dan budidaya." },

  { t:"Pertanian", n:"Luas panen dan produksi padi", lv:"Kabupaten", pd:"2018–2025", sm:"Kerangka Sampel Area", st:"mohon", cek:true,
    mn:"Ajukan lewat PST", ln:[L(P.s557,"Subjek Pertanian, Kehutanan, Perikanan"), L(P.pst,"Ajukan lewat PST BPS")],
    d:"Metode kerangka sampel area dirancang untuk tingkat kabupaten. Angka per kecamatan yang muncul di publikasi Dalam Angka umumnya bersumber dari laporan dinas, bukan dari KSA — jangan menyebut keduanya sebagai satu sumber. Pastikan level terendah yang dapat dilayani." },

  { t:"Pertanian", n:"Luas panen tanaman sayuran dan buah-buahan semusim", lv:"Kecamatan", pd:"seri tahunan", sm:"Survei Hortikultura", st:"ada",
    mn:"Produk › Statistik menurut Subjek (557)", ln:[L(P.tSayurKec,"Tabel: menurut jenis tanaman dan kecamatan"), L(P.tSayur,"Tabel: menurut jenis tanaman")],
    d:"Tersedia sampai level kecamatan menurut jenis tanaman." },

  { t:"Pertanian", n:"Populasi ternak dan produksi peternakan", lv:"Kecamatan", pd:"tahunan", sm:"Laporan dinas", st:"lain",
    mn:"Bukan produk BPS", ln:[L(P.kda26,"Ditayangkan ulang di Kukar Dalam Angka 2026")],
    d:"Ditayangkan di publikasi Dalam Angka tetapi dikumpulkan oleh dinas yang membidangi peternakan. Sumber resminya di dinas tersebut." },

  { t:"Pertanian", n:"Luas dan produksi perkebunan", lv:"Kecamatan", pd:"tahunan", sm:"Laporan dinas", st:"lain",
    mn:"Bukan produk BPS", ln:[L(P.kda26,"Ditayangkan ulang di Kukar Dalam Angka 2026"), L(P.s557,"Subjek Pertanian")],
    d:"Termasuk kelapa sawit dan komoditas perkebunan lain. Bersumber dari dinas yang membidangi perkebunan — permintaan rinci sebaiknya diarahkan ke sana." },

  { t:"Pertanian", n:"Produksi perikanan tangkap dan budidaya", lv:"Kecamatan", pd:"tahunan", sm:"Laporan dinas", st:"lain",
    mn:"Bukan produk BPS", ln:[L(P.kda26,"Ditayangkan ulang di Kukar Dalam Angka 2026")],
    d:"Angka produksi tahunan dihimpun dinas perikanan. Data struktur usaha perikanan rumah tangga ada pada hasil ST2023." },

  /* ================= POTENSI DESA DAN WILAYAH ================= */
  { t:"Potensi desa dan wilayah", n:"Wilayah administrasi kecamatan, desa, dan kelurahan", lv:"Desa", pd:"terkini", sm:"Podes", st:"ada",
    mn:"Produk › Publikasi", ln:[L(P.kda26,"Kukar Dalam Angka 2026"), L(P.podes24,"Statistik Potensi Desa 2024")],
    d:"Termasuk jumlah dan nama satuan wilayah. Kutai Kartanegara kini memiliki 20 kecamatan setelah pemekaran Samboja Barat dan Kota Bangun Darat." },

  { t:"Potensi desa dan wilayah", n:"Fasilitas pendidikan menurut desa", lv:"Desa", pd:"2021, 2024", sm:"Podes", st:"ada",
    mn:"Produk › Publikasi", ln:[L(P.podes24,"Statistik Potensi Desa 2024"), L(P.s521,"Subjek Pendidikan")],
    d:"Podes mencatat keberadaan fasilitas di tiap desa, bukan jumlah murid atau guru. Untuk jumlah murid dan guru, sumbernya dinas pendidikan." },

  { t:"Potensi desa dan wilayah", n:"Fasilitas kesehatan menurut desa", lv:"Desa", pd:"2021, 2024", sm:"Podes", st:"ada",
    mn:"Produk › Publikasi", ln:[L(P.podes24,"Statistik Potensi Desa 2024"), L(P.tNakes,"Tabel: tenaga kesehatan menurut kecamatan")],
    d:"Mencakup keberadaan puskesmas, poskesdes, posyandu, serta tenaga kesehatan yang tinggal di desa." },

  { t:"Potensi desa dan wilayah", n:"Kondisi jalan dan akses transportasi desa", lv:"Desa", pd:"2021, 2024", sm:"Podes", st:"ada",
    mn:"Produk › Publikasi", ln:[L(P.podes24,"Statistik Potensi Desa 2024"), L(P.s560,"Subjek Transportasi")],
    d:"Jenis permukaan jalan utama, keterjangkauan kendaraan roda empat, dan moda transportasi antardesa." },

  { t:"Potensi desa dan wilayah", n:"Sarana ekonomi desa", lv:"Desa", pd:"2021, 2024", sm:"Podes", st:"ada",
    mn:"Produk › Publikasi", ln:[L(P.podes24,"Statistik Potensi Desa 2024")],
    d:"Keberadaan pasar, minimarket, koperasi, dan lembaga keuangan di tiap desa." },

  { t:"Potensi desa dan wilayah", n:"Desa menurut kejadian bencana alam", lv:"Desa", pd:"2021, 2024", sm:"Podes", st:"ada",
    mn:"Produk › Statistik menurut Subjek (539)", ln:[L(P.podes24,"Statistik Potensi Desa 2024"), L(P.s539,"Subjek Lingkungan")],
    d:"Podes mencatat kejadian bencana dalam tiga tahun terakhir menurut jenisnya, pada tingkat desa." },

  { t:"Potensi desa dan wilayah", n:"Peta digital wilayah kerja statistik (wilkerstat)", lv:"Desa", pd:"terkini", sm:"Pemetaan BPS", st:"mohon",
    mn:"Layanan › PST (berbayar)", ln:[L(P.pst,"Ajukan lewat PST BPS"), L(P.sig,"Sistem Informasi Geografis BPS")],
    d:"Termasuk batas satuan lingkungan setempat dan blok sensus. Termasuk layanan penjualan produk BPS, jadi berbayar dan memerlukan surat permintaan. Bukan peta batas administrasi resmi — batas administrasi resmi ada di pemerintah daerah." },

  { t:"Potensi desa dan wilayah", n:"Profil lengkap satu kecamatan", lv:"Desa", pd:"2025", sm:"Kecamatan Dalam Angka", st:"ada",
    mn:"Produk › Publikasi", ln:[L(P.podes24,"Statistik Potensi Desa 2024")],
    d:"Setiap kecamatan punya publikasi Dalam Angka tersendiri yang memuat geografi, pemerintahan, penduduk, sosial, pertanian, dan perdagangan sampai level desa. Daftar tautan 20 kecamatan ada di bagian bawah halaman ini." },

  /* ================= PENDIDIKAN, KESEHATAN, PERUMAHAN ================= */
  { t:"Pendidikan, kesehatan, perumahan", n:"Angka Partisipasi Sekolah, Murni, dan Kasar", lv:"Kabupaten", pd:"2015–2025", sm:"Susenas Maret", st:"ada",
    mn:"Produk › Statistik menurut Subjek (521)", ln:[L(P.kesra24,"Statistik Kesejahteraan Rakyat 2024"), L(P.s521,"Subjek Pendidikan")],
    d:"Tersedia menurut kelompok umur dan jenjang. Ketiganya sering tertukar — pastikan pengguna meminta APS, APM, atau APK." },

  { t:"Pendidikan, kesehatan, perumahan", n:"Angka melek huruf", lv:"Kabupaten", pd:"2015–2025", sm:"Susenas Maret", st:"ada",
    mn:"Produk › Publikasi", ln:[L(P.kesra24,"Statistik Kesejahteraan Rakyat 2024")],
    d:"Persentase penduduk yang dapat membaca dan menulis, umumnya disajikan untuk usia 15 tahun ke atas." },

  { t:"Pendidikan, kesehatan, perumahan", n:"Penolong kelahiran oleh tenaga kesehatan", lv:"Kabupaten", pd:"2015–2025", sm:"Susenas Maret", st:"ada",
    mn:"Produk › Publikasi", ln:[L(P.kesra24,"Statistik Kesejahteraan Rakyat 2024 — bab Kesehatan")],
    d:"Persentase kelahiran yang ditolong tenaga kesehatan terlatih." },

  { t:"Pendidikan, kesehatan, perumahan", n:"Akses air minum dan sanitasi layak", lv:"Kabupaten", pd:"2015–2025", sm:"Susenas Maret", st:"ada",
    mn:"Produk › Statistik menurut Subjek (525)", ln:[L(P.kesra24,"Statistik Kesejahteraan Rakyat 2024 — bab Perumahan"), L(P.s525,"Subjek Pemukiman dan Perumahan")],
    d:"Persentase rumah tangga dengan akses terhadap sumber air minum layak dan sanitasi layak." },

  { t:"Pendidikan, kesehatan, perumahan", n:"Kondisi tempat tinggal rumah tangga", lv:"Kabupaten", pd:"2015–2025", sm:"Susenas Maret", st:"ada",
    mn:"Produk › Statistik menurut Subjek (525)", ln:[L(P.kesra24,"Statistik Kesejahteraan Rakyat 2024"), L(P.s525,"Subjek Pemukiman dan Perumahan")],
    d:"Jenis lantai, dinding, atap, luas lantai per kapita, sumber penerangan, dan status kepemilikan." },

  { t:"Pendidikan, kesehatan, perumahan", n:"Akses internet, telepon seluler, dan komputer", lv:"Kabupaten", pd:"2020–2024", sm:"Susenas Maret", st:"ada",
    mn:"Produk › Publikasi", ln:[L(P.kesra24,"Statistik Kesejahteraan Rakyat 2024 — bab TIK")],
    d:"Publikasi kesejahteraan rakyat memuat bab teknologi informasi dan komunikasi: persentase penduduk mengakses internet, memiliki telepon seluler, dan menggunakan komputer." },

  { t:"Pendidikan, kesehatan, perumahan", n:"Jumlah sekolah, guru, dan murid", lv:"Kecamatan", pd:"tahunan", sm:"Laporan dinas", st:"lain",
    mn:"Bukan produk BPS", ln:[L(P.kda26,"Ditayangkan ulang di Kukar Dalam Angka 2026")],
    d:"Ditayangkan di publikasi Dalam Angka tetapi dihimpun dinas pendidikan dan kantor kementerian agama. Untuk data terbaru dan rinci, rujuk instansi tersebut." },

  { t:"Pendidikan, kesehatan, perumahan", n:"Jumlah tenaga kesehatan menurut kecamatan", lv:"Kecamatan", pd:"seri tahunan", sm:"Laporan dinas", st:"lain",
    mn:"Produk › Statistik menurut Subjek (522)", ln:[L(P.tNakes,"Tabel: tenaga kesehatan menurut kecamatan"), L(P.s522,"Subjek Kesehatan")],
    d:"Tersedia sebagai tabel di laman BPS Kukar, tetapi sumbernya laporan dinas kesehatan." },

  /* ================= INFRASTRUKTUR DAN SEKTORAL ================= */
  { t:"Infrastruktur dan sektoral", n:"Panjang jalan menurut kondisi dan status", lv:"Kabupaten", pd:"tahunan", sm:"Laporan dinas", st:"lain",
    mn:"Bukan produk BPS", ln:[L(P.kda26,"Ditayangkan ulang di Kukar Dalam Angka 2026")],
    d:"Dihimpun dinas pekerjaan umum. Untuk kondisi jalan sampai level desa, alternatifnya Podes." },

  { t:"Infrastruktur dan sektoral", n:"Jumlah kendaraan bermotor", lv:"Kabupaten", pd:"tahunan", sm:"Laporan instansi", st:"lain",
    mn:"Bukan produk BPS", ln:[L(P.kda26,"Ditayangkan ulang di Kukar Dalam Angka 2026"), L(P.s560,"Subjek Transportasi")],
    d:"Bersumber dari kepolisian dan samsat. BPS hanya menayangkan ulang." },

  { t:"Infrastruktur dan sektoral", n:"Pelanggan dan produksi listrik serta air bersih", lv:"Kabupaten", pd:"tahunan", sm:"Laporan perusahaan", st:"lain",
    mn:"Bukan produk BPS", ln:[L(P.kda26,"Ditayangkan ulang di Kukar Dalam Angka 2026"), L(P.s558,"Subjek Energi")],
    d:"Dihimpun dari PLN dan perusahaan daerah air minum melalui survei perusahaan dan laporan." },

  { t:"Infrastruktur dan sektoral", n:"Hotel, akomodasi, dan kunjungan wisatawan", lv:"Kabupaten", pd:"tahunan", sm:"VHTS · Laporan dinas", st:"lain",
    mn:"Produk › Statistik menurut Subjek (561)", ln:[L(P.s561,"Subjek Pariwisata"), L(P.kda26,"Kukar Dalam Angka 2026")],
    d:"Jumlah akomodasi dan tingkat penghunian kamar berasal dari survei BPS, sedangkan kunjungan objek wisata dihimpun dinas pariwisata. Bedakan keduanya saat menjawab." },

  { t:"Infrastruktur dan sektoral", n:"Jumlah dan jenis industri", lv:"Kabupaten", pd:"tahunan", sm:"Survei Industri · Laporan dinas", st:"lain",
    mn:"Produk › Statistik menurut Subjek (559)", ln:[L(P.s559,"Subjek Pertambangan, Manufaktur, Konstruksi"), L(P.kda26,"Kukar Dalam Angka 2026")],
    d:"BPS menyurvei industri besar dan sedang; industri kecil dan mikro dihimpun dinas perindustrian. Nama dan alamat perusahaan bersifat rahasia dan tidak dapat diberikan." },

  { t:"Infrastruktur dan sektoral", n:"Jumlah pegawai negeri sipil pemerintah daerah", lv:"Kabupaten", pd:"tahunan", sm:"Laporan instansi", st:"lain",
    mn:"Bukan produk BPS", ln:[L(P.kda26,"Ditayangkan ulang di Kukar Dalam Angka 2026")],
    d:"Bersumber dari badan kepegawaian daerah." },

  { t:"Infrastruktur dan sektoral", n:"Curah hujan, suhu, dan kelembapan", lv:"Kabupaten", pd:"bulanan", sm:"Laporan BMKG", st:"lain",
    mn:"Bukan produk BPS", ln:[L(P.kda26,"Ditayangkan ulang di Kukar Dalam Angka 2026")],
    d:"Dihimpun dari stasiun BMKG. Data harian dan per titik pengamatan diminta langsung ke BMKG." },

  /* ================= DATA TERBATAS ================= */
  { t:"Data terbatas", n:"Data mikro Susenas, Sakernas, dan sensus", lv:"—", pd:"—", sm:"BPS RI", st:"mohon",
    mn:"Layanan › Silastik (berbayar)", ln:[L(P.silastik,"Silastik — layanan data mikro BPS"), L(P.pst,"PST BPS")],
    d:"Tidak dilayani di kantor kabupaten. Diajukan lewat Silastik, berbayar sesuai Peraturan Pemerintah Nomor 7 Tahun 2015, dan wajib menandatangani Surat Perjanjian Penggunaan Data beserta abstraksi penggunaannya. Mahasiswa dan instansi pemerintah wajib melampirkan surat permintaan data atau surat permohonan nol rupiah." },

  { t:"Data terbatas", n:"Daftar nama dan alamat responden survei", lv:"—", pd:"—", sm:"Seluruh survei", st:"tidak",
    d:"Dilindungi Pasal 21 dan 24 Undang-Undang Nomor 16 Tahun 1997 tentang Statistik. Keterangan yang dapat mengidentifikasi responden tidak dapat diberikan dalam keadaan apa pun, termasuk untuk keperluan dinas." },

  { t:"Data terbatas", n:"Daftar nama dan alamat pelaku usaha", lv:"—", pd:"—", sm:"Sensus Ekonomi", st:"tidak",
    d:"Sama seperti data rumah tangga, keterangan yang mengidentifikasi unit usaha bersifat rahasia. Yang dapat disajikan hanya angka agregat." },

  /* ================= LAYANAN PST ================= */
  { t:"Layanan PST", n:"Konsultasi statistik", lv:"—", pd:"—", sm:"Layanan BPS", st:"ada",
    mn:"Layanan › PST", ln:[L(P.pst,"PST BPS")],
    d:"Gratis, tidak perlu surat. Datang langsung dengan kartu identitas dan mengisi buku tamu, atau daring lewat akun PST. Waktu penyelesaian tatap muka maksimal 10 menit; daring maksimal 3 hari kerja setelah permintaan jelas." },

  { t:"Layanan PST", n:"Perpustakaan tercetak dan digital", lv:"—", pd:"—", sm:"Layanan BPS", st:"ada",
    mn:"Layanan › PST", ln:[L(P.pst,"PST BPS")],
    d:"Gratis, tidak perlu surat. Publikasi digital diberikan dalam PDF berwatermark. Waktu penyelesaian tatap muka maksimal 5 menit setelah mengisi buku tamu." },

  { t:"Layanan PST", n:"Rekomendasi kegiatan statistik (Romantik)", lv:"—", pd:"—", sm:"Layanan BPS", st:"mohon",
    mn:"Layanan › Romantik", ln:[L(P.romantik,"Romantik — rekomendasi kegiatan statistik")],
    d:"Untuk instansi yang akan menyelenggarakan survei sendiri. Gratis, tetapi wajib melampirkan surat permohonan beserta Formulir Survei Statistik Sektoral. Waktu penyelesaian maksimal 30 hari kerja sejak dokumen lengkap terekam." },

  { t:"Layanan PST", n:"Penjualan publikasi dan produk BPS", lv:"—", pd:"—", sm:"Layanan BPS", st:"mohon",
    mn:"Layanan › PST (berbayar)", ln:[L(P.pst,"PST BPS")],
    d:"Berbayar sesuai Peraturan Pemerintah Nomor 7 Tahun 2015. Wajib surat permintaan data atau surat permohonan nol rupiah bagi mahasiswa dan instansi pemerintah. Waktu penyelesaian maksimal 10 hari kerja." },

  { t:"Layanan PST", n:"Rencana terbit publikasi dan berita resmi statistik", lv:"—", pd:"—", sm:"Laman BPS Kukar", st:"ada",
    mn:"Rencana Terbit", ln:[L(P.arc,"Rencana Terbit BPS Kukar"), L(P.tautan,"Daftar tautan lengkap laman BPS Kukar")],
    d:"Untuk menjawab pertanyaan 'kapan datanya keluar'. Kukar Dalam Angka terbit akhir Februari, Kecamatan Dalam Angka 26 September, PDRB April, Kesejahteraan Rakyat dan Potensi Desa Desember." }
  ];

  /* --- Kecamatan Dalam Angka 2025, satu-satunya sumber level desa per kecamatan --- */
  var KECAMATAN = [
    ["Samboja","2024", B+"publication/2024/09/26/158a82a3d9151492a0ffc520/kecamatan-samboja-dalam-angka-2024.html"],
    ["Samboja Barat","2025", B+"publication/2025/09/26/72b20132cb28bd67e0387339/kecamatan-samboja-barat-dalam-angka-2025.html"],
    ["Muara Jawa","2025", B+"publication/2025/09/26/e1630ab543fe37ec2e8e24ff/kecamatan-muara-jawa-dalam-angka-2025.html"],
    ["Sanga-Sanga","2025", B+"publication/2025/09/26/748bbbe5f53d2b2948c46e7f/kecamatan-sanga-sanga-dalam-angka-2025.html"],
    ["Loa Janan","2025", B+"publication/2025/09/26/313fca928d07d313beea17e3/kecamatan-loa-janan-dalam-angka-2025.html"],
    ["Loa Kulu","2025", B+"publication/2025/09/26/13f830c1052457463e7adbd6/kecamatan-loa-kulu-dalam-angka-2025.html"],
    ["Muara Muntai","2025", B+"publication/2025/09/26/cff3432634be916d8e39b7b7/kecamatan-muara-muntai-dalam-angka-2025.html"],
    ["Muara Wis","2025", B+"publication/2025/09/26/4d60aa82e186c938a018c2f4/kecamatan-muara-wis-dalam-angka-2025.html"],
    ["Kota Bangun","2025", B+"publication/2025/09/26/a87d0a99f680c1b412b99a1f/kecamatan-kota-bangun-dalam-angka-2025.html"],
    ["Kota Bangun Darat","2025", B+"publication/2025/09/26/412eb6884e6c7e3b2119c92d/kecamatan-kota-bangun-darat-dalam-angka-2025.html"],
    ["Tenggarong","2025", B+"publication/2025/09/26/ef6e1c95522bb17678c8c314/kecamatan-tenggarong-dalam-angka-2025.html"],
    ["Sebulu","2025", B+"publication/2025/09/26/90dd52db5e1f2da86cd50d71/kecamatan-sebulu-dalam-angka-2025.html"],
    ["Tenggarong Seberang","2025", B+"publication/2025/09/26/e92b71d74472b43b0ca98e22/kecamatan-tenggarong-seberang-dalam-angka-2025.html"],
    ["Anggana","2025", B+"publication/2025/09/26/49a673f7d358df252f611694/kecamatan-anggana-dalam-angka-2025.html"],
    ["Muara Badak","2025", B+"publication/2025/09/26/9695aea53310e2e8a054bd3a/kecamatan-muara-badak-dalam-angka-2025.html"],
    ["Marang Kayu","2025", B+"publication/2025/09/26/ec48d8a7e0fe14f8e6a8a580/kecamatan-marang-kayu-dalam-angka-2025.html"],
    ["Muara Kaman","2025", B+"publication/2025/09/26/c5b81476278422254d969007/kecamatan-muara-kaman-dalam-angka-2025.html"],
    ["Kenohan","2024", B+"publication/2024/09/26/42268ddbabec848200580ceb/kecamatan-kenohan-dalam-angka-2024.html"],
    ["Kembang Janggut","2025", B+"publication/2025/09/26/23c09b5831dda017edcbf63f/kecamatan-kembang-janggut-dalam-angka-2025.html"],
    ["Tabang","2025", B+"publication/2025/09/26/8224c64f44fb8018b64bdc26/kecamatan-tabang-dalam-angka-2025.html"]
  ];

  var LABEL = {
    ada:   "Unduh di web",
    mohon: "Permintaan resmi",
    prov:  "Level provinsi",
    tidak: "Tidak tersedia",
    lain:  "Data sektoral"
  };

  return { DATA: DATA, KECAMATAN: KECAMATAN, LABEL: LABEL, TAUTAN: P };
})();
