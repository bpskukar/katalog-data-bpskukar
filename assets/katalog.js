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
  var KAL = "https://kaltim.bps.go.id/id/";

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
    sig:     "https://sig.bps.go.id",

    /* --- tabel statis laman Kukar (diperiksa satu per satu, Sep 2026): t<id> --- */
    t2: B+"statistics-table/2/MiMy/indeks-pembangunan-gender.html", /* Indeks Pembangunan Gender */
    t33: B+"statistics-table/2/MzMjMg==/indeks-pemberdayaan-gender-idg-menurut-kabupaten-kota-di-kalimantan-timur.html", /* Indeks Pemberdayaan Gender (IDG) Menurut Kabupaten/Kota di Kalimantan Timur */
    t34: B+"statistics-table/2/MzQjMg==/seri-2010-tahunan-pdrb-atas-dasar-harga-berlaku-menurut-lapangan-usaha.html", /* [Seri 2010] Tahunan - PDRB Atas Dasar Harga Berlaku Menurut Lapangan Usaha */
    t42: B+"statistics-table/2/NDIjMg==/seri-2010-tahunan-pdrb-atas-dasar-harga-konstan-menurut-lapangan-usaha.html", /* [Seri 2010] Tahunan - PDRB Atas Dasar Harga Konstan Menurut Lapangan Usaha */
    t49: B+"statistics-table/2/NDkjMg==/seri-2010-tahunan-distribusi-pdrb-atas-dasar-harga-berlaku-menurut-lapangan-usaha.html", /* [Seri 2010] Tahunan - Distribusi PDRB Atas Dasar Harga Berlaku Menurut Lapangan Usaha */
    t56: B+"statistics-table/2/NTYjMg==/seri-2010-tahunan-laju-pertumbuhan-pdrb-atas-dasar-harga-konstan-menurut-lapangan-usaha.html", /* [Seri 2010] Tahunan - Laju Pertumbuhan PDRB Atas Dasar Harga Konstan Menurut Lapangan Usaha */
    t63: B+"statistics-table/2/NjMjMg==/seri-2010-tahunan-indeks-harga-implisit-pdrb-menurut-lapangan-usaha.html", /* [Seri 2010] Tahunan - Indeks Harga Implisit PDRB Menurut Lapangan Usaha */
    t68: B+"statistics-table/2/NjgjMg==/seri-2010-tahunan-pdrb-atas-dasar-harga-berlaku-menurut-pengeluaran.html", /* [Seri 2010] Tahunan - PDRB Atas Dasar Harga Berlaku Menurut Pengeluaran */
    t69: B+"statistics-table/2/NjkjMg==/seri-2010-tahunan-pdrb-atas-dasar-harga-konstan-menurut-pengeluaran.html", /* [Seri 2010] Tahunan - PDRB Atas Dasar Harga Konstan Menurut Pengeluaran */
    t70: B+"statistics-table/2/NzAjMg==/seri-2010-tahunan-laju-pertumbuhan-pdrb-atas-dasar-harga-konstan-menurut-pengeluaran.html", /* [Seri 2010] Tahunan - Laju Pertumbuhan PDRB Atas Dasar Harga Konstan Menurut Pengeluaran */
    t71: B+"statistics-table/2/NzEjMg==/seri-2010-tahunan-distribusi-pdrb-atas-dasar-harga-berlaku-menurut-pengeluaran.html", /* [Seri 2010] Tahunan - Distribusi PDRB Atas Dasar Harga Berlaku Menurut Pengeluaran */
    t73: B+"statistics-table/2/NzMjMg==/jumlah-tenaga-kesehatan-menurut-kecamatan-di-kabupaten-kutai-kartanegara.html", /* Jumlah Tenaga Kesehatan Menurut Kecamatan di Kabupaten Kutai Kartanegara */
    t75: B+"statistics-table/2/NzUjMg==/hasil-sensus-penduduk.html", /* Hasil Sensus Penduduk */
    t83: B+"statistics-table/2/ODMjMg==/jumlah-pelanggan-listrik-menurut-unit-layanan-pelanggan-ulp.html", /* Jumlah Pelanggan Listrik Menurut Unit Layanan Pelanggan (ULP) */
    t85: B+"statistics-table/2/ODUjMg==/jumlah-pelanggan-menurut-kecamatan.html", /* Jumlah Pelanggan Menurut Kecamatan */
    t90: B+"statistics-table/2/OTAjMg==/luas-daerah-dan-jumlah-pulau-menurut-kecamatan-di-kabupaten-kutai-kartanegara.html", /* Luas Daerah dan Jumlah Pulau Menurut Kecamatan di Kabupaten Kutai Kartanegara */
    t92: B+"statistics-table/2/OTIjMg==/tinggi-wilayah-dan-jarak-ke-ibukota-kabupaten-menurut-kecamatan-di-kabupaten-kutai-kartane.html", /* Tinggi Wilayah dan Jarak ke Ibukota Kabupaten Menurut Kecamatan di Kabupaten Kutai Kartanegara */
    t94: B+"statistics-table/2/OTQjMg==/jumlah-desa-kelurahan-menurut-kecamatan.html", /* Jumlah Desa/Kelurahan Menurut Kecamatan */
    t99: B+"statistics-table/2/OTkjMg==/suhu-udara-menurut-bulan-di-kutai-kartanegara.html", /* Suhu Udara Menurut Bulan di Kutai Kartanegara */
    t100: B+"statistics-table/2/MTAwIzI=/kelembaban-udara-menurut-bulan-di-kutai-kartanegara.html", /* Kelembaban Udara Menurut Bulan di Kutai Kartanegara */
    t102: B+"statistics-table/2/MTAyIzI=/kecepatan-angin-menurut-bulan-di-kutai-kartanegara.html", /* Kecepatan Angin Menurut Bulan di Kutai Kartanegara */
    t104: B+"statistics-table/2/MTA0IzI=/tekanan-udara-menurut-bulan-di-kutai-kartanegara.html", /* Tekanan Udara Menurut Bulan di Kutai Kartanegara */
    t105: B+"statistics-table/2/MTA1IzI=/jumlah-curah-hujan-hari-hujan-rata-rata-harian-penyinaran-matahari-menurut-bulan-di-kutai.html", /* Jumlah Curah Hujan, Hari Hujan, Rata-Rata Harian Penyinaran Matahari Menurut Bulan di Kutai Kartanegara */
    t108: B+"statistics-table/2/MTA4IzI=/jumlah-pegawai-negeri-sipil-menurut-jabatan-dan-jenis-kelamin.html", /* Jumlah Pegawai Negeri Sipil Menurut Jabatan dan Jenis Kelamin */
    t109: B+"statistics-table/2/MTA5IzI=/jumlah-pegawai-negeri-sipil-menurut-tingkat-pendidikan-dan-jenis-kelamin.html", /* Jumlah Pegawai Negeri Sipil Menurut Tingkat Pendidikan dan Jenis Kelamin */
    t113: B+"statistics-table/2/MTEzIzI=/jumlah-pegawai-negeri-sipil-menurut-tingkat-kepangkatan-dan-jenis-kelamin.html", /* Jumlah Pegawai Negeri Sipil Menurut Tingkat Kepangkatan dan Jenis Kelamin */
    t115: B+"statistics-table/2/MTE1IzI=/jumlah-anggota-dewan-perwakilan-rakyat-daerah-menurut-partai-politik-dan-jenis-kelamin.html", /* Jumlah Anggota Dewan Perwakilan Rakyat Daerah Menurut Partai Politik dan Jenis Kelamin */
    t122: B+"statistics-table/2/MTIyIzI=/garis-kemiskinan-kabupaten-kutai-kartanegara.html", /* Garis Kemiskinan Kabupaten Kutai Kartanegara */
    t123: B+"statistics-table/2/MTIzIzI=/jumlah-penduduk-miskin-kabupaten-kutai-kartanegara.html", /* Jumlah Penduduk Miskin Kabupaten Kutai Kartanegara */
    t124: B+"statistics-table/2/MTI0IzI=/persentase-penduduk-miskin-p0-kabupaten-kutai-kartanegara.html", /* Persentase Penduduk Miskin (P0) Kabupaten Kutai Kartanegara */
    t125: B+"statistics-table/2/MTI1IzI=/indeks-kedalaman-kemiskinan-p1-kabupaten-kutai-kartanegara.html", /* Indeks Kedalaman Kemiskinan (P1) Kabupaten Kutai Kartanegara */
    t126: B+"statistics-table/2/MTI2IzI=/indeks-keparahan-kemiskinan-p2-kabupaten-kutai-kartanegara.html", /* Indeks Keparahan Kemiskinan (P2) Kabupaten Kutai Kartanegara */
    t127: B+"statistics-table/2/MTI3IzI=/gini-ratio-kabupaten-kutai-kartanegara.html", /* Gini Ratio Kabupaten Kutai Kartanegara */
    t128: B+"statistics-table/2/MTI4IzI=/rata-rata-konsumsi-kalori-per-kapita-sehari-menurut-kelompok-komoditas-makanan.html", /* Rata-rata Konsumsi Kalori per Kapita Sehari Menurut Kelompok Komoditas Makanan */
    t131: B+"statistics-table/2/MTMxIzI=/rata-rata-pengeluaran-per-kapita-sebulan-menurut-kelompok-komoditas-makanan-di-kabupaten-k.html", /* Rata-rata Pengeluaran per Kapita Sebulan Menurut Kelompok Komoditas Makanan di Kabupaten Kutai Kartanegara */
    t132: B+"statistics-table/2/MTMyIzI=/rata-rata-pengeluaran-per-kapita-sebulan-menurut-kelompok-komoditas-bukan-makanan-di-kabup.html", /* Rata-rata Pengeluaran per Kapita Sebulan Menurut Kelompok Komoditas Bukan Makanan di Kabupaten Kutai Kartanegara */
    t133: B+"statistics-table/2/MTMzIzI=/rata-rata-pengeluaran-per-kapita-sebulan-menurut-kelompok-komoditas-makanan-dan-bukan-maka.html", /* Rata-rata Pengeluaran per Kapita Sebulan Menurut Kelompok Komoditas Makanan dan Bukan Makanan di Kabupaten Kutai Kartanegara */
    t138: B+"statistics-table/2/MTM4IzI=/angka-partisipasi-kasar-apk-menurut-jenjang-pendidikan-di-kabupaten-kutai-kartanegara.html", /* Angka Partisipasi Kasar (APK) Menurut Jenjang Pendidikan di Kabupaten Kutai Kartanegara */
    t139: B+"statistics-table/2/MTM5IzI=/angka-partisipasi-murni-apm-menurut-jenjang-pendidikan-di-kabupaten-kutai-kartanegara.html", /* Angka Partisipasi Murni (APM) Menurut Jenjang Pendidikan di Kabupaten Kutai Kartanegara */
    t141: B+"statistics-table/2/MTQxIzI=/angka-partisipasi-sekolah-aps-menurut-kelompok-umur-di-kabupaten-kutai-kartanegara.html", /* Angka Partisipasi Sekolah (APS) Menurut Kelompok Umur di Kabupaten Kutai Kartanegara */
    t154: B+"statistics-table/2/MTU0IzI=/luas-panen-tanaman-biofarmaka-menurut-jenis-tanaman-di-kabupaten-kutai-kartanegara.html", /* Luas Panen Tanaman Biofarmaka Menurut Jenis Tanaman di Kabupaten Kutai Kartanegara */
    t156: B+"statistics-table/2/MTU2IzI=/produksi-tanaman-biofarmaka-menurut-jenis-tanaman-di-kabupaten-kutai-kartanegara.html", /* Produksi Tanaman Biofarmaka Menurut Jenis Tanaman di Kabupaten Kutai Kartanegara */
    t157: B+"statistics-table/2/MTU3IzI=/luas-panen-tanaman-biofarmaka-menurut-jenis-tanaman-dan-kecamatan-di-kabupaten-kutai-karta.html", /* Luas Panen Tanaman Biofarmaka Menurut Jenis Tanaman dan Kecamatan di Kabupaten Kutai Kartanegara */
    t159: B+"statistics-table/2/MTU5IzI=/produksi-tanaman-biofarmaka-menurut-jenis-tanaman-dan-kecamatan-di-kabupaten-kutai-kartane.html", /* Produksi Tanaman Biofarmaka Menurut Jenis Tanaman dan Kecamatan di Kabupaten Kutai Kartanegara */
    t160: B+"statistics-table/2/MTYwIzI=/luas-panen-tanaman-sayuran-dan-buah-buahan-semusim-menurut-jenis-tanaman-dan-kecamatan-di.html", /* Luas Panen Tanaman Sayuran dan Buah-Buahan Semusim Menurut Jenis Tanaman dan Kecamatan di Kabupaten Kutai Kartanegara */
    t162: B+"statistics-table/2/MTYyIzI=/produksi-tanaman-sayuran-dan-buah-buahan-semusim-menurut-jenis-tanaman-dan-kecamatan-di-ka.html", /* Produksi Tanaman Sayuran dan Buah-buahan Semusim Menurut Jenis Tanaman dan Kecamatan di Kabupaten Kutai Kartanegara */
    t165: B+"statistics-table/2/MTY1IzI=/luas-panen-tanaman-sayuran-dan-buah-buahan-semusim-menurut-jenis-tanaman-di-kabupaten-kuta.html", /* Luas Panen Tanaman Sayuran dan Buah-buahan Semusim Menurut Jenis Tanaman di Kabupaten Kutai Kartanegara */
    t166: B+"statistics-table/2/MTY2IzI=/produksi-tanaman-sayuran-dan-buah-buahan-semusim-menurut-jenis-tanaman-di-kabupaten-kutai.html", /* Produksi Tanaman Sayuran dan Buah-buahan Semusim Menurut Jenis Tanaman di Kabupaten Kutai Kartanegara */
    t167: B+"statistics-table/2/MTY3IzI=/luas-panen-tanaman-hias-menurut-jenis-tanaman-dan-kecamatan-di-kabupaten-kutai-kartanegara.html", /* Luas Panen Tanaman Hias Menurut Jenis Tanaman dan Kecamatan di Kabupaten Kutai Kartanegara */
    t169: B+"statistics-table/2/MTY5IzI=/produksi-tanaman-hias-menurut-jenis-tanaman-dan-kecamatan-di-kabupaten-kutai-kartanegara.html", /* Produksi Tanaman Hias Menurut Jenis Tanaman dan Kecamatan di Kabupaten Kutai Kartanegara */
    t172: B+"statistics-table/2/MTcyIzI=/rata-rata-harga-bahan-pokok-perbulan.html", /* Rata-Rata Harga Bahan Pokok Perbulan */
    t178: B+"statistics-table/2/MTc4IzI=/indeks-pemberdayaan-gender-idg.html", /* Indeks Pemberdayaan Gender (IDG) */
    t179: B+"statistics-table/2/MTc5IzI=/indeks-ketimpangan-gender-ikg-indonesia-menurut-kabupaten-kota.html", /* Indeks Ketimpangan Gender (IKG) Indonesia Menurut Kabupaten/Kota */
    t180: B+"statistics-table/2/MTgwIzI=/indeks-pembangunan-gender-ipg.html", /* Indeks Pembangunan Gender (IPG) */
    t181: B+"statistics-table/2/MTgxIzI=/indeks-pembangunan-gender-menggunakan-uhh-hasil-sp2020-lf.html", /* Indeks Pembangunan Gender (menggunakan UHH hasil SP2020 LF) */
    t183: B+"statistics-table/2/MTgzIzI=/angka-harapan-hidup-ahh-menurut-jenis-kelamin.html", /* Angka Harapan Hidup (AHH) Menurut Jenis Kelamin */
    t184: B+"statistics-table/2/MTg0IzI=/angka-harapan-lama-sekolah-hls-menurut-jenis-kelamin.html", /* Angka Harapan Lama Sekolah (HLS) Menurut Jenis Kelamin */
    t185: B+"statistics-table/2/MTg1IzI=/rata-rata-lama-sekolah-rls-menurut-jenis-kelamin.html", /* Rata-rata Lama Sekolah (RLS) Menurut Jenis Kelamin */
    t186: B+"statistics-table/2/MTg2IzI=/pengeluaran-per-kapita-yang-disesuaikan-menurut-jenis-kelamin.html", /* Pengeluaran per Kapita yang Disesuaikan Menurut Jenis Kelamin */
    t188: B+"statistics-table/2/MTg4IzI=/indeks-pembangunan-manusia-ipm-menurut-jenis-kelamin.html", /* Indeks Pembangunan Manusia (IPM) Menurut Jenis Kelamin */
    t189: B+"statistics-table/2/MTg5IzI=/indeks-pembangunan-manusia-ipm-menurut-jenis-kelamin-menggunakan-uhh-hasil-sp2020-lf.html", /* Indeks Pembangunan Manusia (IPM) Menurut Jenis Kelamin (menggunakan UHH hasil SP2020 LF) */
    t190: B+"statistics-table/2/MTkwIzI=/metode-baru-harapan-lama-sekolah.html", /* [Metode Baru] Harapan Lama Sekolah */
    t191: B+"statistics-table/2/MTkxIzI=/metode-baru-rata-rata-lama-sekolah.html", /* [Metode Baru] Rata-rata Lama Sekolah */
    t192: B+"statistics-table/2/MTkyIzI=/metode-baru-pengeluaran-per-kapita-disesuaikan.html", /* [Metode Baru] Pengeluaran per Kapita Disesuaikan */
    t193: B+"statistics-table/2/MTkzIzI=/metode-baru-umur-harapan-hidup-saat-lahir-uhh.html", /* [Metode Baru] Umur Harapan Hidup Saat Lahir (UHH) */
    t194: B+"statistics-table/2/MTk0IzI=/metode-baru-indeks-pembangunan-manusia-ipm.html", /* [Metode Baru] Indeks Pembangunan Manusia (IPM) */
    t195: B+"statistics-table/2/MTk1IzI=/metode-baru-umur-harapan-hidup-saat-lahir-uhh-hasil-long-form-sp2020.html", /* [Metode Baru] Umur Harapan Hidup Saat Lahir (UHH) Hasil Long Form SP2020 */
    t196: B+"statistics-table/2/MTk2IzI=/metode-baru-indeks-pembangunan-manusia-ipm-hasil-long-form-sp2020.html", /* [Metode Baru] Indeks Pembangunan Manusia (IPM) Hasil Long Form SP2020 */
    t197: B+"statistics-table/2/MTk3IzI=/jumlah-penduduk-menurut-kecamatan-di-kabupaten-kutai-kartanegara.html", /* Jumlah Penduduk Menurut Kecamatan di Kabupaten Kutai Kartanegara */
    t198: B+"statistics-table/2/MTk4IzI=/jumlah-penduduk-menurut-kelompok-umur-dan-jenis-kelamin-di-kabupaten-kutai-kartanegara.html", /* Jumlah Penduduk Menurut Kelompok Umur dan Jenis Kelamin di Kabupaten Kutai Kartanegara */
    t200: B+"statistics-table/2/MjAwIzI=/rasio-jenis-kelamin-penduduk-menurut-kecamatan-di-kabupaten-kutai-kartanegara.html", /* Rasio Jenis Kelamin Penduduk Menurut Kecamatan di Kabupaten Kutai Kartanegara */
    t201: B+"statistics-table/2/MjAxIzI=/indeks-kemahalan-konstruksi.html", /* Indeks Kemahalan Konstruksi */
    t203: B+"statistics-table/2/MjAzIzI=/tingkat-partisipasi-angkatan-kerja-menurut-jenis-kelamin-kabupaten-kutai-kartanegara.html", /* Tingkat Partisipasi Angkatan Kerja Menurut Jenis Kelamin Kabupaten Kutai Kartanegara */
    t204: B+"statistics-table/2/MjA0IzI=/tingkat-kesempatan-kerja-tkk-kabupaten-kutai-kartanegara.html", /* Tingkat Kesempatan Kerja (TKK) Kabupaten Kutai Kartanegara */
    t206: B+"statistics-table/2/MjA2IzI=/jumlah-penduduk-berusia-15-tahun-keatas-menurut-jenis-kegiatan-selama-seminggu-yang-lalu-d.html", /* Jumlah Penduduk Berusia 15 Tahun Keatas Menurut Jenis Kegiatan Selama Seminggu yang Lalu dan Jenis Kelamin */
    t208: B+"statistics-table/2/MjA4IzI=/jumlah-rumah-makan-restoran-menurut-kecamatan-di-kabupaten-kutai-kartanegara.html", /* Jumlah Rumah Makan/Restoran Menurut Kecamatan di Kabupaten Kutai Kartanegara */
    t211: B+"statistics-table/2/MjExIzI=/jumlah-sarana-akomodasi-menurut-kecamatan-dan-jenis-akomodasi-di-kabupaten-kutai-kartanega.html", /* Jumlah Sarana Akomodasi Menurut Kecamatan dan Jenis Akomodasi di Kabupaten Kutai Kartanegara */
    t214: B+"statistics-table/2/MjE0IzI=/jumlah-barang-angkutan-laut-dalam-negeri-menurut-pelabuhan-keberangkatan-di-kabupaten-kuta.html", /* Jumlah Barang Angkutan Laut Dalam Negeri menurut Pelabuhan Keberangkatan Di Kabupaten Kutai Kartanegara */
    t216: B+"statistics-table/2/MjE2IzI=/seri-2010-triwulanan-pdrb-atas-dasar-harga-berlaku-menurut-pengeluaran.html", /* [Seri 2010] Triwulanan - PDRB Atas Dasar Harga Berlaku Menurut Pengeluaran */
    t217: B+"statistics-table/2/MjE3IzI=/seri-2010-triwulanan-pdrb-atas-dasar-harga-berlaku-menurut-lapangan-usaha.html", /* [Seri 2010] Triwulanan - PDRB Atas Dasar Harga Berlaku Menurut Lapangan Usaha */
    t218: B+"statistics-table/2/MjE4IzI=/seri-2010-triwulanan-pdrb-atas-dasar-harga-konstan-menurut-pengeluaran.html", /* [Seri 2010] Triwulanan - PDRB Atas Dasar Harga Konstan Menurut Pengeluaran */
    t220: B+"statistics-table/2/MjIwIzI=/seri-2010-triwulanan-laju-pertumbuhan-q-to-q-pdrb-menurut-lapangan-usaha.html", /* [Seri 2010] Triwulanan - Laju Pertumbuhan (q-to-q) PDRB Menurut Lapangan Usaha */
    t221: B+"statistics-table/2/MjIxIzI=/seri-2010-triwulanan-pdrb-atas-dasar-harga-konstan-menurut-lapangan-usaha.html", /* [Seri 2010] Triwulanan - PDRB Atas Dasar Harga Konstan Menurut Lapangan Usaha */
    t222: B+"statistics-table/2/MjIyIzI=/seri-2010-triwulanan-laju-pertumbuhan-y-on-y-pdrb-menurut-lapangan-usaha.html", /* [Seri 2010] Triwulanan - Laju Pertumbuhan (y-on-y) PDRB Menurut Lapangan Usaha */
    t223: B+"statistics-table/2/MjIzIzI=/seri-2010-triwulanan-laju-pertumbuhan-c-to-c-pdrb-menurut-lapangan-usaha.html", /* [Seri 2010] Triwulanan - Laju Pertumbuhan (c-to-c) PDRB Menurut Lapangan Usaha */
    t226: B+"statistics-table/2/MjI2IzI=/seri-2010-triwulanan-laju-pertumbuhan-y-on-y-pdrb-menurut-pengeluaran.html", /* [Seri 2010] Triwulanan - Laju Pertumbuhan (y-on-y) PDRB Menurut Pengeluaran */
    t228: B+"statistics-table/2/MjI4IzI=/seri-2010-tahunan-indeks-harga-implisit-pdrb-menurut-pengeluaran.html", /* [Seri 2010] Tahunan - Indeks Harga Implisit PDRB Menurut Pengeluaran */
    t229: B+"statistics-table/2/MjI5IzI=/proporsi-perempuan-usia-15-49-tahun-pernah-kawin-yang-melahirkan-tidak-di-fasilitas-keseha.html", /* Proporsi Perempuan Usia 15-49 Tahun Pernah Kawin yang Melahirkan Tidak di Fasilitas Kesehatan (MTF) */
    t237: B+"statistics-table/2/MjM3IzI=/seri-2010-triwulanan-pdrb-atas-dasar-harga-berlaku-menurut-17-kategori-lapangan-usaha.html", /* [Seri 2010] Triwulanan - PDRB Atas Dasar Harga Berlaku Menurut 17 Kategori Lapangan Usaha */
    t239: B+"statistics-table/2/MjM5IzI=/seri-2010-triwulanan-pdrb-atas-dasar-harga-konstan-menurut-17-kategori-lapangan-usaha.html", /* [Seri 2010] Triwulanan - PDRB Atas Dasar Harga Konstan Menurut 17 Kategori Lapangan Usaha */
    t242: B+"statistics-table/2/MjQyIzI=/seri-2010-triwulanan-laju-pertumbuhan-y-on-y-pdrb-menurut-17-kategori-lapangan-usaha.html", /* [Seri 2010] Triwulanan - Laju Pertumbuhan (y-on-y) PDRB Menurut 17 Kategori Lapangan Usaha */
    /* --- tabel dinamis lama laman Kukar: d<id> --- */
    d21: B+"statistics-table/1/MjEjMQ==/jumlah-penduduk-dan-rasio-jenis-kelamin-menurut-kecamatan-hasil-sp-2020.html", /* Jumlah Penduduk dan Rasio Jenis Kelamin Menurut Kecamatan, Hasil SP 2020 */
    d22: B+"statistics-table/1/MjIjMQ==/indeks-pembangunan-manusia-kabupaten-kutai-kartanegara-2015-2021.html", /* Indeks Pembangunan Manusia Kabupaten Kutai Kartanegara, 2015 - 2021 */
    d25: B+"statistics-table/1/MjUjMQ==/jumlah-koperasi-menurut-jenis-koperasi-dan-kecamatan-di-kabupaten-kutai-kartanegara-2023.html", /* Jumlah Koperasi Menurut Jenis Koperasi dan Kecamatan di Kabupaten Kutai Kartanegara, 2023 */
    d32: B+"statistics-table/1/MzIjMQ==/pengamatan-unsur-iklim-menurut-bulan-di-stasiun-meteorologi-apt-pranoto-2023.html", /* Pengamatan Unsur Iklim Menurut Bulan di Stasiun Meteorologi APT Pranoto, 2023 */
    d33: B+"statistics-table/1/MzMjMQ==/jumlah-desa-kelurahan-menurut-kecamatan-di-kabupaten-kutai-kartanegara-2019-2023.html", /* Jumlah Desa/Kelurahan Menurut Kecamatan di Kabupaten Kutai Kartanegara, 2019–2023 */
    d34: B+"statistics-table/1/MzQjMQ==/jumlah-anggota-dprd-menurut-partai-politik-dan-jenis-kelamin-2023.html", /* Jumlah Anggota DPRD Menurut Partai Politik dan Jenis Kelamin, 2023 */
    /* --- tabel statis laman BPS Provinsi Kaltim (angka menurut kabupaten/kota): k<id> --- */
    k307: KAL+"statistics-table/2/MzA3IzI=/rata-rata-upah-gaji-bersih-sebulan-pekerja-formal-menurut-kabupaten-kota.html", /* Rata-rata Upah/Gaji Bersih Sebulan Pekerja Formal Menurut Kabupaten/Kota */
    k308: KAL+"statistics-table/2/MzA4IzI=/rata-rata-pendapatan-bersih-sebulan-pekerja-informal-menurut-kabupaten-kota.html", /* Rata-rata Pendapatan Bersih Sebulan Pekerja Informal Menurut Kabupaten/Kota */
    k310: KAL+"statistics-table/2/MzEwIzI=/upah-minimum-regional.html", /* Upah Minimum Regional */
    k311: KAL+"statistics-table/2/MzExIzI=/rata-rata-upah-gaji-bersih-sebulan-pekerja-formal-menurut-kelompok-umur-dan-lapangan-peker.html", /* Rata-rata Upah/Gaji Bersih Sebulan Pekerja Formal Menurut Kelompok Umur dan Lapangan Pekerjaan Utama */
    k314: KAL+"statistics-table/2/MzE0IzI=/nilai-tukar-petani-ntp-2018-100.html", /* Nilai Tukar Petani (NTP) (2018=100) */
    k315: KAL+"statistics-table/2/MzE1IzI=/nilai-tukar-usaha-pertanian-ntup-2018-100.html", /* Nilai Tukar Usaha Pertanian (NTUP) (2018=100) */
    k318: KAL+"statistics-table/2/MzE4IzI=/luas-panen-padi-menurut-kabupaten-kota.html", /* Luas Panen Padi Menurut Kabupaten/Kota */
    k319: KAL+"statistics-table/2/MzE5IzI=/produktivitas-padi-menurut-kabupaten-kota.html", /* Produktivitas Padi Menurut Kabupaten/Kota */
    k320: KAL+"statistics-table/2/MzIwIzI=/produksi-padi-menurut-kabupaten-kota.html", /* Produksi Padi Menurut Kabupaten/Kota */
    k321: KAL+"statistics-table/2/MzIxIzI=/produksi-beras-menurut-kabupaten-kota.html", /* Produksi Beras Menurut Kabupaten/Kota */
    k325: KAL+"statistics-table/2/MzI1IzI=/persentase-penduduk-berumur-15-tahun-ke-atas-yang-melek-huruf.html", /* Persentase Penduduk Berumur 15 Tahun ke Atas yang Melek Huruf */
    k301: KAL+"statistics-table/2/MzAxIzI=/rata-rata-banyaknya-anggota-rumah-tangga-menurut-kabupaten-kota.html", /* Rata-rata Banyaknya Anggota Rumah Tangga Menurut Kabupaten/Kota */
    k300: KAL+"statistics-table/2/MzAwIzI=/jumlah-rumah-tangga-menurut-kabupaten-kota.html", /* Jumlah Rumah Tangga Menurut Kabupaten/Kota */
    /* --- publikasi & halaman lain --- */
    lfkukar: B+"publication/2023/02/16/b00133813ff02c3e2443ccf8/hasil-long-form-sensus-penduduk-2020-kabupaten-kutai-kartanegara.html",
    lfsuku:  "https://www.bps.go.id/id/publication/2024/12/12/6feb932e24186429686fb57b/profil-suku-dan-keragaman-bahasa-daerah-hasil-long-form-sensus-penduduk-2020.html",
    proyeksi:KAL+"publication/2023/07/14/b91f5bf8d6eda289dd135816/proyeksi-penduduk-kabupaten-kota-provinsi-kalimantan-timur-2020-2035-hasil-sensus-penduduk-2020.html",
    brsKaltim: KAL+"pressrelease",
    kaltimHarga: KAL+"statistics-table?subject=536",
    kaltimNaker: KAL+"statistics-table?subject=537",
    kaltimTani:  KAL+"statistics-table?subject=557",
  };

  function L(u, l) { return { u: u, l: l }; }

  var DATA = [
  /* ================= KEPENDUDUKAN ================= */
  { t:"Kependudukan", n:"Jumlah penduduk menurut jenis kelamin", lv:"Kecamatan", pd:"2020–2025", sm:"Proyeksi SP2020", st:"ada",
    mn:"Produk › Publikasi · Produk › Statistik menurut Subjek (519)",
    ln:[L(P.tPendKec,"Tabel: penduduk menurut kecamatan"), L(P.kda26,"Kukar Dalam Angka 2026"), L(P.s519,"Subjek Kependudukan dan Migrasi"), L(P.t198,"Tabel: penduduk menurut kelompok umur dan jenis kelamin"), L(P.d21,"Tabel: penduduk & rasio jenis kelamin per kecamatan hasil SP2020")],
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

  { t:"Kependudukan", n:"Proyeksi penduduk tahun mendatang", lv:"Kabupaten", pd:"2020–2035", sm:"Proyeksi SP2020", st:"ada",
    mn:"Laman BPS Provinsi Kaltim › Publikasi", ln:[L(P.proyeksi,"Proyeksi Penduduk Kab/Kota Kaltim 2020–2035 (BPS Kaltim)"), L(P.pst,"Ajukan lewat PST BPS")],
    d:"Seri proyeksi jangka panjang hasil SP2020 tersedia sampai 2035 di tingkat kabupaten. Belum diterbitkan sebagai tabel siap unduh di laman Kukar, jadi mintalah melalui layanan konsultasi statistik." },

  { t:"Kependudukan", n:"Penduduk menurut agama", lv:"Kecamatan", pd:"tahunan", sm:"Kantor Kementerian Agama (data sektoral)", st:"lain",
    mn:"Kukar Dalam Angka › bab Sosial dan Kesejahteraan Rakyat › Agama", ln:[L(P.kda26,"Kukar Dalam Angka 2026"), L(P.kda25,"Kukar Dalam Angka 2025")],
    d:"Jumlah pemeluk agama dan tempat ibadah menurut kecamatan berasal dari Kantor Kementerian Agama Kabupaten Kutai Kartanegara dan ditayangkan ulang di Dalam Angka. Sensus Penduduk 2020 juga mencatat agama, tetapi BPS Kukar tidak menerbitkan tabel agama tingkat kabupaten/kecamatan di lamannya — untuk keperluan resmi rujuk Kemenag atau tabel di Dalam Angka." },

  { t:"Kependudukan", n:"Penduduk menurut suku bangsa dan bahasa", lv:"Kabupaten", pd:"2022 (Long Form SP2020)", sm:"SP2020 Long Form", st:"mohon",
    mn:"Ajukan lewat PST", ln:[L(P.lfkukar,"Booklet Hasil Long Form SP2020 Kukar (Feb 2023)"), L(P.lfsuku,"Profil Suku & Keragaman Bahasa Daerah — BPS pusat"), L(P.pst,"Ajukan lewat PST BPS")],
    d:"Suku bangsa dan bahasa sehari-hari dikumpulkan pada Long Form SP2020 (pencacahan 2022). BPS pusat menerbitkan profil sepuluh suku besar dan keragaman bahasa daerah secara nasional; booklet Long Form Kukar memuat indikator kependudukan hasil Long Form (umur, fertilitas, mortalitas, migrasi, pendidikan, disabilitas, perumahan). Tabulasi suku bangsa atau bahasa khusus Kutai Kartanegara diminta lewat PST sebagai tabulasi khusus." },

  { t:"Kependudukan", n:"Jumlah rumah tangga dan rata-rata anggota rumah tangga", lv:"Kecamatan", pd:"2020–2025", sm:"SP2020 · Susenas", st:"ada",
    mn:"Produk › Publikasi", ln:[L(P.kda26,"Kukar Dalam Angka 2026"), L(P.kesra24,"Statistik Kesejahteraan Rakyat 2024"), L(P.k300,"Tabel Kaltim: jumlah rumah tangga menurut kab/kota"), L(P.k301,"Tabel Kaltim: rata-rata anggota rumah tangga menurut kab/kota")],
    d:"Jumlah rumah tangga per kecamatan ada di Dalam Angka; rata-rata banyaknya anggota rumah tangga ada di publikasi kesejahteraan rakyat." },

  { t:"Kependudukan", n:"Angka kelahiran, kematian, dan fertilitas", lv:"Kabupaten", pd:"2020–2024", sm:"SP2020 · Susenas", st:"ada",
    mn:"Produk › Publikasi", ln:[L(P.kesra24,"Statistik Kesejahteraan Rakyat 2024 — bab Fertilitas & KB")],
    d:"Publikasi kesejahteraan rakyat memuat fertilitas dan keluarga berencana. Angka kematian rinci menurut penyebab bukan keluaran BPS, melainkan ada di dinas kesehatan." },

  /* ================= KETENAGAKERJAAN ================= */
  { t:"Ketenagakerjaan", n:"Tingkat Partisipasi Angkatan Kerja (TPAK)", lv:"Kabupaten", pd:"2015–2025", sm:"Sakernas Agustus", st:"ada",
    mn:"Produk › Statistik menurut Subjek (520)", ln:[L(P.t203,"Tabel: TPAK menurut jenis kelamin"), L(P.t204,"Tabel: Tingkat Kesempatan Kerja (TKK)"), L(P.t206,"Tabel: penduduk 15+ menurut jenis kegiatan"), L(P.s520,"Subjek Tenaga Kerja"), L(P.kda26,"Kukar Dalam Angka 2026"), L(P.dinamis,"Tabel Dinamis")],
    d:"Sakernas dirancang mewakili tingkat kabupaten pada pencacahan Agustus. Angka Februari hanya representatif sampai tingkat provinsi — jangan dijanjikan sebagai angka kabupaten." },

  { t:"Ketenagakerjaan", n:"Tingkat Pengangguran Terbuka (TPT)", lv:"Kabupaten", pd:"2015–2025", sm:"Sakernas Agustus", st:"ada",
    mn:"Produk › Statistik menurut Subjek (520)", ln:[L(P.t206,"Tabel: penduduk 15+ menurut jenis kegiatan seminggu lalu"), L(P.t204,"Tabel: Tingkat Kesempatan Kerja (TKK)"), L(P.s520,"Subjek Tenaga Kerja"), L(P.kda26,"Kukar Dalam Angka 2026")],
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

  { t:"Ketenagakerjaan", n:"Rata-rata upah atau gaji bersih pekerja", lv:"Kabupaten", pd:"seri Sakernas Agustus", sm:"Sakernas Agustus", st:"ada",
    mn:"Laman BPS Provinsi Kaltim › Tabel Statistik › Biaya Tenaga Kerja", ln:[L(P.k307,"Tabel Kaltim: upah/gaji bersih pekerja formal menurut kab/kota"), L(P.k308,"Tabel Kaltim: pendapatan bersih pekerja informal menurut kab/kota"), L(P.k311,"Tabel Kaltim: upah menurut kelompok umur & lapangan pekerjaan (provinsi)"), L(P.pst,"Rincian khusus Kukar: ajukan lewat PST")],
    d:"Angka kabupaten diterbitkan BPS Provinsi Kalimantan Timur, bukan di laman Kukar: rata-rata upah/gaji bersih sebulan pekerja formal dan rata-rata pendapatan bersih pekerja informal menurut kabupaten/kota. Rincian menurut lapangan usaha, jenis pekerjaan, atau pendidikan khusus Kutai Kartanegara harus diminta sebagai tabulasi Sakernas Agustus." },

  { t:"Ketenagakerjaan", n:"Upah Minimum Kabupaten (UMK)", lv:"Kabupaten", pd:"tahunan", sm:"Laporan dinas", st:"lain",
    mn:"Bukan produk BPS", ln:[L(P.kda26,"Ditayangkan ulang di Kukar Dalam Angka 2026"), L(P.k310,"Tabel Kaltim: Upah Minimum Regional")],
    d:"Ditetapkan pemerintah daerah dan dihimpun dinas ketenagakerjaan. BPS hanya menayangkan ulang di publikasi Dalam Angka; surat resmi sebaiknya ditujukan ke dinas terkait." },

  { t:"Ketenagakerjaan", n:"Ketenagakerjaan tingkat kecamatan atau desa", lv:"—", pd:"—", sm:"Sakernas", st:"tidak",
    d:"Sakernas berbasis sampel yang dirancang mewakili tingkat kabupaten. Angka kecamatan tidak dapat diturunkan darinya, berapa pun jumlah responden yang kebetulan berada di kecamatan tersebut. Ini pertanyaan yang paling sering muncul di PST — tolak dengan penjelasan metodologi, jangan dengan 'datanya belum ada'." },

  /* ================= KEMISKINAN DAN PEMERATAAN ================= */
  { t:"Kemiskinan dan pemerataan", n:"Persentase penduduk miskin (P0)", lv:"Kabupaten", pd:"2015–2025", sm:"Susenas Maret", st:"ada",
    mn:"Produk › Statistik menurut Subjek (563)", ln:[L(P.t124,"Tabel: persentase penduduk miskin (P0)"), L(P.tMiskin,"Tabel: jumlah penduduk miskin"), L(P.s563,"Subjek Kemiskinan lintas sektor"), L(P.statda,"Statistik Daerah 2023/2024")],
    d:"Ini angka kemiskinan makro hasil survei, dipakai untuk perencanaan agregat. Bukan daftar keluarga penerima bantuan." },

  { t:"Kemiskinan dan pemerataan", n:"Jumlah penduduk miskin", lv:"Kabupaten", pd:"2015–2025", sm:"Susenas Maret", st:"ada",
    mn:"Produk › Statistik menurut Subjek (563)", ln:[L(P.tMiskin,"Tabel: jumlah penduduk miskin Kukar")],
    d:"Disajikan dalam ribu jiwa, sejalan dengan persentase penduduk miskin." },

  { t:"Kemiskinan dan pemerataan", n:"Indeks kedalaman kemiskinan (P1)", lv:"Kabupaten", pd:"2015–2025", sm:"Susenas Maret", st:"ada",
    mn:"Produk › Statistik menurut Subjek (563)", ln:[L(P.t125,"Tabel: indeks kedalaman kemiskinan (P1)"), L(P.s563,"Subjek Kemiskinan lintas sektor"), L(P.dinamis,"Tabel Dinamis")],
    d:"Mengukur seberapa jauh rata-rata pengeluaran penduduk miskin berada di bawah garis kemiskinan." },

  { t:"Kemiskinan dan pemerataan", n:"Indeks keparahan kemiskinan (P2)", lv:"Kabupaten", pd:"2015–2025", sm:"Susenas Maret", st:"ada",
    mn:"Produk › Statistik menurut Subjek (563)", ln:[L(P.tP2,"Tabel: indeks keparahan kemiskinan (P2)")],
    d:"Mengukur ketimpangan pengeluaran di antara sesama penduduk miskin." },

  { t:"Kemiskinan dan pemerataan", n:"Garis kemiskinan", lv:"Kabupaten", pd:"2015–2025", sm:"Susenas Maret", st:"ada",
    mn:"Produk › Statistik menurut Subjek (563)", ln:[L(P.tGK,"Tabel: garis kemiskinan Kukar")],
    d:"Batas pengeluaran per kapita per bulan yang memisahkan penduduk miskin dan tidak miskin." },

  { t:"Kemiskinan dan pemerataan", n:"Gini Ratio", lv:"Kabupaten", pd:"2015–2025", sm:"Susenas Maret", st:"ada",
    mn:"Produk › Statistik menurut Subjek (523)", ln:[L(P.t127,"Tabel: Gini Ratio Kukar"), L(P.s523,"Subjek Konsumsi dan Pendapatan"), L(P.statda,"Statistik Daerah 2023/2024")],
    d:"Mengukur ketimpangan pengeluaran penduduk pada skala nol sampai satu." },

  { t:"Kemiskinan dan pemerataan", n:"Pengeluaran per kapita per bulan", lv:"Kabupaten", pd:"2015–2025", sm:"Susenas Maret", st:"ada",
    mn:"Produk › Statistik menurut Subjek (523)", ln:[L(P.t133,"Tabel: pengeluaran per kapita sebulan makanan & bukan makanan"), L(P.t131,"Tabel: menurut kelompok komoditas makanan"), L(P.t132,"Tabel: menurut kelompok komoditas bukan makanan"), L(P.t128,"Tabel: rata-rata konsumsi kalori per kapita sehari"), L(P.s523,"Subjek Konsumsi dan Pendapatan"), L(P.kesra24,"Statistik Kesejahteraan Rakyat 2024")],
    d:"Termasuk rincian menurut kelompok makanan dan bukan makanan." },

  { t:"Kemiskinan dan pemerataan", n:"Kemiskinan tingkat kecamatan atau desa", lv:"—", pd:"—", sm:"Susenas", st:"tidak",
    ln:[L(P.podes24,"Alternatif terdekat: Statistik Potensi Desa 2024")],
    d:"Susenas dirancang mewakili tingkat kabupaten. Angka kemiskinan kecamatan hanya pernah dihasilkan lewat kajian khusus dengan metode estimasi area kecil, bukan keluaran rutin. Untuk penyasaran bantuan, rujukannya basis data terpadu di Dinas Sosial. Untuk gambaran kondisi desa, tawarkan Statistik Potensi Desa." },

  { t:"Kemiskinan dan pemerataan", n:"Daftar nama dan alamat penduduk miskin", lv:"—", pd:"—", sm:"Susenas", st:"tidak",
    d:"Dilarang oleh Pasal 21 dan 24 Undang-Undang Nomor 16 Tahun 1997 tentang Statistik. Melanggar dengan sengaja diancam pidana penjara sampai 5 tahun dan denda sampai Rp100 juta, dan bagi petugas statistik sampai 1 tahun 6 bulan. Tidak dapat diberikan kepada siapa pun, termasuk instansi pemerintah, dengan surat sekalipun." },

  /* ================= PEMBANGUNAN MANUSIA ================= */
  { t:"Pembangunan manusia", n:"Indeks Pembangunan Manusia (IPM)", lv:"Kabupaten", pd:"2010–2025", sm:"Penghitungan BPS", st:"ada",
    mn:"Produk › Statistik menurut Subjek (541)", ln:[L(P.tIPM,"Tabel: IPM menurut jenis kelamin"), L(P.brsipm,"Berita Resmi Statistik IPM Kukar"), L(P.statda,"Statistik Daerah 2023/2024"), L(P.t194,"Tabel: IPM metode baru"), L(P.t196,"Tabel: IPM hasil Long Form SP2020"), L(P.d22,"Tabel dinamis: IPM 2015–2021")],
    d:"Sejak 2023 dihitung dengan metode baru; angka lama tidak dapat langsung dibandingkan dengan angka metode baru tanpa penjelasan." },

  { t:"Pembangunan manusia", n:"Umur Harapan Hidup saat lahir (AHH)", lv:"Kabupaten", pd:"2010–2025", sm:"Penghitungan BPS", st:"ada",
    mn:"Produk › Statistik menurut Subjek (541)", ln:[L(P.tAHH,"Tabel: Angka Harapan Hidup menurut jenis kelamin"), L(P.t193,"Tabel: UHH metode baru"), L(P.t195,"Tabel: UHH hasil Long Form SP2020")],
    d:"Komponen IPM pada dimensi kesehatan. Tersedia terpisah untuk laki-laki dan perempuan." },

  { t:"Pembangunan manusia", n:"Harapan Lama Sekolah dan Rata-Rata Lama Sekolah", lv:"Kabupaten", pd:"2010–2025", sm:"Susenas", st:"ada",
    mn:"Produk › Statistik menurut Subjek (541)", ln:[L(P.t184,"Tabel: HLS menurut jenis kelamin"), L(P.t185,"Tabel: RLS menurut jenis kelamin"), L(P.t190,"Tabel: HLS metode baru"), L(P.t191,"Tabel: RLS metode baru"), L(P.s541,"Subjek Statistik dan Indikator Multi-Domain"), L(P.kesra24,"Statistik Kesejahteraan Rakyat 2024")],
    d:"Harapan Lama Sekolah dihitung untuk penduduk usia tujuh tahun, Rata-Rata Lama Sekolah untuk penduduk 25 tahun ke atas. Keduanya sering tertukar — pastikan pengguna meminta yang mana." },

  { t:"Pembangunan manusia", n:"Pengeluaran per kapita disesuaikan", lv:"Kabupaten", pd:"2010–2025", sm:"Susenas", st:"ada",
    mn:"Produk › Statistik menurut Subjek (541)", ln:[L(P.tPengkap,"Tabel: pengeluaran per kapita disesuaikan"), L(P.t192,"Tabel: pengeluaran per kapita disesuaikan (metode baru)")],
    d:"Komponen IPM pada dimensi standar hidup layak, dalam rupiah per tahun dan sudah disesuaikan dengan paritas daya beli." },

  { t:"Pembangunan manusia", n:"Indeks Pembangunan Gender (IPG)", lv:"Kabupaten", pd:"seri tahunan", sm:"Penghitungan BPS", st:"ada",
    mn:"Produk › Statistik menurut Subjek (564)", ln:[L(P.tIPG,"Tabel: Indeks Pembangunan Gender"), L(P.s564,"Subjek Gender dan Kelompok Populasi Khusus"), L(P.t180,"Tabel: IPG"), L(P.t181,"Tabel: IPG dengan UHH hasil SP2020 LF"), L(P.t178,"Tabel: Indeks Pemberdayaan Gender (IDG)"), L(P.t33,"Tabel: IDG menurut kab/kota se-Kaltim")],
    d:"Membandingkan capaian pembangunan manusia perempuan terhadap laki-laki." },

  { t:"Pembangunan manusia", n:"Indeks Ketimpangan Gender (IKG)", lv:"Kabupaten", pd:"seri tahunan", sm:"Penghitungan BPS (Susenas, Sakernas, SP2020)", st:"ada",
    mn:"Produk › Statistik menurut Subjek (564)", ln:[L(P.t179,"Tabel: IKG menurut kabupaten/kota"), L(P.t180,"Tabel: Indeks Pembangunan Gender (IPG)"), L(P.t178,"Tabel: Indeks Pemberdayaan Gender (IDG)"), L(P.s564,"Subjek Gender dan Kelompok Populasi Khusus")],
    d:"IKG mengukur ketimpangan perempuan–laki-laki dari tiga dimensi: kesehatan reproduksi, pemberdayaan, dan pasar kerja (0 = setara, 1 = timpang sempurna). Berbeda dengan IPG yang membandingkan capaian IPM perempuan terhadap laki-laki, dan IDG yang mengukur peran aktif perempuan di ekonomi dan politik. Ketiganya tersedia sebagai tabel di laman Kukar." },

  { t:"Pembangunan manusia", n:"IPM tingkat kecamatan", lv:"—", pd:"—", sm:"Penghitungan BPS", st:"tidak",
    d:"IPM disusun dari komponen berbasis survei sampel yang hanya representatif sampai kabupaten. Tidak dihitung untuk kecamatan, dan tidak boleh diperkirakan sendiri dari data kecamatan." },

  /* ================= EKONOMI DAN PDRB ================= */
  { t:"Ekonomi dan PDRB", n:"PDRB menurut lapangan usaha", lv:"Kabupaten", pd:"2010–2024", sm:"Penghitungan PDRB", st:"ada",
    mn:"Produk › Publikasi", ln:[L(P.t34,"Tabel: PDRB ADHB tahunan menurut lapangan usaha"), L(P.t42,"Tabel: PDRB ADHK tahunan menurut lapangan usaha"), L(P.t49,"Tabel: distribusi PDRB menurut lapangan usaha"), L(P.t237,"Tabel: PDRB ADHB triwulanan 17 kategori"), L(P.t239,"Tabel: PDRB ADHK triwulanan 17 kategori"), L(P.pdrblu,"PDRB Menurut Lapangan Usaha 2020–2024"), L(P.s531,"Subjek Neraca Ekonomi")],
    d:"Atas dasar harga berlaku dan harga konstan, dengan rincian tujuh belas kategori lapangan usaha. Terbit sebagai publikasi tersendiri sekitar April tiap tahun." },

  { t:"Ekonomi dan PDRB", n:"PDRB menurut pengeluaran", lv:"Kabupaten", pd:"2010–2024", sm:"Penghitungan PDRB", st:"ada",
    mn:"Produk › Publikasi", ln:[L(P.t68,"Tabel: PDRB ADHB tahunan menurut pengeluaran"), L(P.t69,"Tabel: PDRB ADHK tahunan menurut pengeluaran"), L(P.t71,"Tabel: distribusi PDRB menurut pengeluaran"), L(P.t216,"Tabel: PDRB ADHB triwulanan menurut pengeluaran"), L(P.t218,"Tabel: PDRB ADHK triwulanan menurut pengeluaran"), L(P.pdrbpg,"PDRB Menurut Pengeluaran 2020–2024"), L(P.tIHIpdrb,"Tabel: indeks harga implisit PDRB")],
    d:"Memerinci PDRB menurut konsumsi rumah tangga, konsumsi pemerintah, pembentukan modal tetap bruto, dan perdagangan luar wilayah." },

  { t:"Ekonomi dan PDRB", n:"Laju pertumbuhan ekonomi", lv:"Kabupaten", pd:"2010–2024", sm:"Penghitungan PDRB", st:"ada",
    mn:"Produk › Publikasi", ln:[L(P.t56,"Tabel: laju pertumbuhan PDRB tahunan menurut lapangan usaha"), L(P.t222,"Tabel: laju pertumbuhan triwulanan y-on-y"), L(P.t220,"Tabel: laju pertumbuhan triwulanan q-to-q"), L(P.t223,"Tabel: laju pertumbuhan kumulatif c-to-c"), L(P.t70,"Tabel: laju pertumbuhan menurut pengeluaran"), L(P.pdrblu,"PDRB Menurut Lapangan Usaha 2020–2024"), L(P.statda,"Statistik Daerah 2023/2024")],
    d:"Dihitung dari PDRB atas dasar harga konstan. Angka triwulanan tersedia di tingkat provinsi, bukan kabupaten." },

  { t:"Ekonomi dan PDRB", n:"PDRB per kapita", lv:"Kabupaten", pd:"2010–2024", sm:"Penghitungan PDRB", st:"ada",
    mn:"Produk › Publikasi", ln:[L(P.pdrblu,"PDRB Menurut Lapangan Usaha 2020–2024")],
    d:"Nilai produksi wilayah dibagi jumlah penduduk. Bukan ukuran pendapatan yang benar-benar diterima penduduk — perlu dijelaskan, terutama di Kukar yang PDRB-nya besar karena pertambangan." },

  { t:"Ekonomi dan PDRB", n:"PDRB tanpa migas dan batubara", lv:"Kabupaten", pd:"2010–2024", sm:"Penghitungan PDRB", st:"ada",
    mn:"Produk › Publikasi", ln:[L(P.pdrblu,"PDRB Menurut Lapangan Usaha 2020–2024")],
    d:"Disajikan sebagai seri terpisah di dalam publikasi PDRB. Sering diminta pemda untuk melihat ekonomi di luar sektor ekstraktif." },

  { t:"Ekonomi dan PDRB", n:"PDRB tingkat kecamatan", lv:"—", pd:"—", sm:"Penghitungan PDRB", st:"tidak",
    d:"Penghitungan PDRB memerlukan data produksi yang tidak tersedia sampai tingkat kecamatan. Tidak dihasilkan secara rutin dan tidak dapat dipesan." },

  { t:"Ekonomi dan PDRB", n:"Inflasi dan Indeks Harga Konsumen", lv:"—", pd:"bulanan", sm:"Survei Harga Konsumen", st:"prov",
    mn:"Rujuk BPS Provinsi Kalimantan Timur › Berita Resmi Statistik", ln:[L(P.brsKaltim,"Berita Resmi Statistik inflasi bulanan Kaltim"), L(P.kaltimHarga,"Tabel Kaltim: subjek Harga-Harga"), L(P.t172,"Tabel Kukar: rata-rata harga bahan pokok per bulan")],
    d:"Kutai Kartanegara bukan wilayah cakupan penghitungan IHK. Di Kalimantan Timur inflasi dihitung untuk empat kabupaten/kota — Samarinda, Balikpapan, Berau, dan Penajam Paser Utara — serta angka gabungan provinsi; arahkan pengguna ke angka provinsi atau kota terdekat (Samarinda). Untuk Kukar sendiri yang tersedia adalah rata-rata harga bahan pokok bulanan di laman BPS Kukar." },

  { t:"Ekonomi dan PDRB", n:"Nilai ekspor dan impor kabupaten", lv:"—", pd:"—", sm:"Statistik Perdagangan", st:"prov",
    mn:"Rujuk BPS Provinsi Kalimantan Timur", ln:[L(P.kaltim,"BPS Provinsi Kalimantan Timur")],
    d:"Statistik ekspor-impor disusun menurut pelabuhan muat dan provinsi asal barang, bukan menurut kabupaten. Angka kabupaten tidak dihasilkan." },

  { t:"Ekonomi dan PDRB", n:"Nilai Tukar Petani (NTP)", lv:"—", pd:"—", sm:"Survei Harga Perdesaan", st:"prov",
    mn:"Rujuk BPS Provinsi Kalimantan Timur", ln:[L(P.k314,"Tabel Kaltim: NTP (2018=100)"), L(P.k315,"Tabel Kaltim: NTUP (2018=100)"), L(P.kaltim,"BPS Provinsi Kalimantan Timur")],
    d:"NTP dirancang dan dirilis pada tingkat provinsi. Tidak ada NTP tingkat kabupaten." },

  { t:"Ekonomi dan PDRB", n:"Realisasi APBD dan keuangan daerah", lv:"Kabupaten", pd:"tahunan", sm:"Laporan dinas", st:"lain",
    mn:"Bukan produk BPS", ln:[L(P.kda26,"Ditayangkan ulang di Kukar Dalam Angka 2026")],
    d:"Dihimpun dari Badan Pengelola Keuangan dan Aset Daerah. BPS menayangkan ulang di publikasi Dalam Angka; angka resmi dan terbaru ada di badan tersebut." },

  { t:"Ekonomi dan PDRB", n:"Indeks Kemahalan Konstruksi (IKK)", lv:"Kabupaten", pd:"seri tahunan", sm:"Survei Harga Kemahalan Konstruksi", st:"ada",
    mn:"Produk › Statistik menurut Subjek (559)", ln:[L(P.t201,"Tabel: Indeks Kemahalan Konstruksi"), L(P.s559,"Subjek Pertambangan, Manufaktur, Konstruksi")],
    d:"Perbandingan tingkat kemahalan bahan bangunan, sewa alat, dan upah pekerja konstruksi antarwilayah — salah satu komponen penghitungan Dana Alokasi Umum. Tabel tersedia di laman Kukar." },

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

  { t:"Pertanian", n:"Luas panen dan produksi padi", lv:"Kabupaten", pd:"2018–terkini", sm:"Kerangka Sampel Area (KSA)", st:"ada",
    mn:"Laman BPS Provinsi Kaltim › Tabel Statistik › Pertanian", ln:[L(P.k318,"Tabel Kaltim: luas panen padi menurut kab/kota"), L(P.k320,"Tabel Kaltim: produksi padi menurut kab/kota"), L(P.k319,"Tabel Kaltim: produktivitas padi menurut kab/kota"), L(P.k321,"Tabel Kaltim: produksi beras menurut kab/kota"), L(P.s557,"Subjek Pertanian (laman Kukar)")],
    d:"Angka KSA diterbitkan BPS Provinsi Kalimantan Timur menurut kabupaten/kota: luas panen, produktivitas, produksi padi (gabah kering giling), dan produksi beras. KSA dirancang untuk tingkat kabupaten; angka per kecamatan yang muncul di Dalam Angka bersumber dari laporan dinas pertanian, bukan KSA — jangan menyebut keduanya sebagai satu sumber." },

  { t:"Pertanian", n:"Luas panen tanaman sayuran dan buah-buahan semusim", lv:"Kecamatan", pd:"seri tahunan", sm:"Survei Hortikultura", st:"ada",
    mn:"Produk › Statistik menurut Subjek (557)", ln:[L(P.tSayurKec,"Tabel: menurut jenis tanaman dan kecamatan"), L(P.tSayur,"Tabel: menurut jenis tanaman"), L(P.t162,"Tabel: produksi menurut jenis tanaman dan kecamatan"), L(P.t166,"Tabel: produksi menurut jenis tanaman")],
    d:"Tersedia sampai level kecamatan menurut jenis tanaman." },

  { t:"Pertanian", n:"Luas panen dan produksi tanaman biofarmaka dan tanaman hias", lv:"Kecamatan", pd:"seri tahunan", sm:"Statistik Hortikultura (laporan dinas)", st:"ada",
    mn:"Produk › Statistik menurut Subjek (557)", ln:[L(P.t157,"Tabel: luas panen biofarmaka menurut jenis dan kecamatan"), L(P.t159,"Tabel: produksi biofarmaka menurut jenis dan kecamatan"), L(P.t167,"Tabel: luas panen tanaman hias menurut jenis dan kecamatan"), L(P.t169,"Tabel: produksi tanaman hias menurut jenis dan kecamatan")],
    d:"Tanaman biofarmaka (jahe, kunyit, dan sejenisnya) serta tanaman hias, sampai tingkat kecamatan. Tabel tersedia langsung di laman Kukar." },

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
    mn:"Produk › Publikasi", ln:[L(P.t94,"Tabel: jumlah desa/kelurahan menurut kecamatan"), L(P.t90,"Tabel: luas daerah dan jumlah pulau menurut kecamatan"), L(P.t92,"Tabel: tinggi wilayah dan jarak ke ibu kota kabupaten"), L(P.kda26,"Kukar Dalam Angka 2026"), L(P.podes24,"Statistik Potensi Desa 2024")],
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
    mn:"Produk › Statistik menurut Subjek (521)", ln:[L(P.t141,"Tabel: APS menurut kelompok umur"), L(P.t139,"Tabel: APM menurut jenjang"), L(P.t138,"Tabel: APK menurut jenjang"), L(P.kesra24,"Statistik Kesejahteraan Rakyat 2024"), L(P.s521,"Subjek Pendidikan")],
    d:"Tersedia menurut kelompok umur dan jenjang. Ketiganya sering tertukar — pastikan pengguna meminta APS, APM, atau APK." },

  { t:"Pendidikan, kesehatan, perumahan", n:"Angka melek huruf", lv:"Kabupaten", pd:"2015–2025", sm:"Susenas Maret", st:"ada",
    mn:"Produk › Publikasi", ln:[L(P.kesra24,"Statistik Kesejahteraan Rakyat 2024"), L(P.k325,"Tabel Kaltim: penduduk 15+ melek huruf")],
    d:"Persentase penduduk yang dapat membaca dan menulis, umumnya disajikan untuk usia 15 tahun ke atas." },

  { t:"Pendidikan, kesehatan, perumahan", n:"Penolong kelahiran oleh tenaga kesehatan", lv:"Kabupaten", pd:"2015–2025", sm:"Susenas Maret", st:"ada",
    mn:"Produk › Publikasi", ln:[L(P.kesra24,"Statistik Kesejahteraan Rakyat 2024 — bab Kesehatan"), L(P.t229,"Tabel: proporsi perempuan melahirkan tidak di fasilitas kesehatan (MTF)")],
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
    mn:"Bukan produk BPS", ln:[L(P.t85,"Tabel: pelanggan listrik menurut kecamatan"), L(P.t83,"Tabel: pelanggan listrik menurut ULP"), L(P.kda26,"Ditayangkan ulang di Kukar Dalam Angka 2026"), L(P.s558,"Subjek Energi")],
    d:"Dihimpun dari PLN dan perusahaan daerah air minum melalui survei perusahaan dan laporan." },

  { t:"Infrastruktur dan sektoral", n:"Hotel, akomodasi, dan kunjungan wisatawan", lv:"Kabupaten", pd:"tahunan", sm:"VHTS · Laporan dinas", st:"lain",
    mn:"Produk › Statistik menurut Subjek (561)", ln:[L(P.t211,"Tabel: sarana akomodasi menurut kecamatan dan jenis"), L(P.t208,"Tabel: rumah makan/restoran menurut kecamatan"), L(P.s561,"Subjek Pariwisata"), L(P.kda26,"Kukar Dalam Angka 2026")],
    d:"Jumlah akomodasi dan tingkat penghunian kamar berasal dari survei BPS, sedangkan kunjungan objek wisata dihimpun dinas pariwisata. Bedakan keduanya saat menjawab." },

  { t:"Infrastruktur dan sektoral", n:"Jumlah dan jenis industri", lv:"Kabupaten", pd:"tahunan", sm:"Survei Industri · Laporan dinas", st:"lain",
    mn:"Produk › Statistik menurut Subjek (559)", ln:[L(P.s559,"Subjek Pertambangan, Manufaktur, Konstruksi"), L(P.kda26,"Kukar Dalam Angka 2026")],
    d:"BPS menyurvei industri besar dan sedang; industri kecil dan mikro dihimpun dinas perindustrian. Nama dan alamat perusahaan bersifat rahasia dan tidak dapat diberikan." },

  { t:"Infrastruktur dan sektoral", n:"Jumlah pegawai negeri sipil pemerintah daerah", lv:"Kabupaten", pd:"tahunan", sm:"Laporan instansi", st:"lain",
    mn:"Bukan produk BPS", ln:[L(P.t108,"Tabel: PNS menurut jabatan dan jenis kelamin"), L(P.t109,"Tabel: PNS menurut pendidikan dan jenis kelamin"), L(P.t113,"Tabel: PNS menurut kepangkatan dan jenis kelamin"), L(P.kda26,"Ditayangkan ulang di Kukar Dalam Angka 2026")],
    d:"Bersumber dari badan kepegawaian daerah." },

  { t:"Infrastruktur dan sektoral", n:"Anggota DPRD menurut partai politik dan jenis kelamin", lv:"Kabupaten", pd:"tahunan", sm:"Sekretariat DPRD (data sektoral)", st:"ada",
    mn:"Produk › Statistik menurut Subjek (520)", ln:[L(P.t115,"Tabel: anggota DPRD menurut partai politik dan jenis kelamin"), L(P.d34,"Tabel dinamis: anggota DPRD 2023"), L(P.kda26,"Kukar Dalam Angka 2026")],
    d:"Data sektoral dari Sekretariat DPRD yang ditayangkan ulang BPS. Sudah berbentuk tabel di laman Kukar." },

  { t:"Infrastruktur dan sektoral", n:"Jumlah koperasi menurut jenis dan kecamatan", lv:"Kecamatan", pd:"2023", sm:"Dinas Koperasi dan UKM (data sektoral)", st:"ada",
    mn:"Produk › Tabel Dinamis", ln:[L(P.d25,"Tabel dinamis: koperasi menurut jenis dan kecamatan 2023"), L(P.kda26,"Kukar Dalam Angka 2026")],
    d:"Data sektoral dari dinas yang ditayangkan ulang BPS. Tahun lain lihat bab Perdagangan/Koperasi di Dalam Angka." },

  { t:"Infrastruktur dan sektoral", n:"Barang angkutan laut dalam negeri menurut pelabuhan", lv:"Kabupaten", pd:"seri tahunan", sm:"Kesyahbandaran / pelabuhan (data sektoral)", st:"ada",
    mn:"Produk › Statistik menurut Subjek (560)", ln:[L(P.t214,"Tabel: barang angkutan laut dalam negeri menurut pelabuhan keberangkatan"), L(P.s560,"Subjek Transportasi")],
    d:"Bongkar-muat barang angkutan laut dalam negeri menurut pelabuhan keberangkatan di Kutai Kartanegara. Tabel tersedia di laman Kukar." },

  { t:"Infrastruktur dan sektoral", n:"Curah hujan, suhu, dan kelembapan", lv:"Kabupaten", pd:"bulanan", sm:"Laporan BMKG", st:"lain",
    mn:"Bukan produk BPS", ln:[L(P.t105,"Tabel: curah hujan, hari hujan, penyinaran matahari per bulan"), L(P.t99,"Tabel: suhu udara per bulan"), L(P.t100,"Tabel: kelembaban udara per bulan"), L(P.t102,"Tabel: kecepatan angin per bulan"), L(P.d32,"Tabel dinamis: unsur iklim Stasiun APT Pranoto 2023"), L(P.kda26,"Ditayangkan ulang di Kukar Dalam Angka 2026")],
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
