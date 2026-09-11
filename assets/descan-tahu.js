/* ============================================================================
   Pengetahuan Desa Cinta Statistik (Desa Cantik) untuk Asisten PST.
   Berkas ini MENAMBAH butir ke window.PENGETAHUAN — dimuat setelah
   assets/pengetahuan.js dan sebelum assets/chat.js.

   Isinya disarikan dari materi Pembinaan Desa Cantik 2026 (BPS RI) dan
   pemberitaan resmi. Bila capaian Kukar berubah, ubah butir "descan-kukar"
   di bawah DAN assets/capaian.js di repositori desa-cantik-bpskukar —
   keduanya harus sama.
   ========================================================================== */
(function () {
  "use strict";
  var P = (window.PENGETAHUAN = window.PENGETAHUAN || []);
  var SITUS = "https://bpskukar.github.io/desa-cantik-bpskukar/";
  var KELAS = SITUS + "kelas.html";

  P.push(

  /* ---------------- program ---------------- */
  { id:"descan", kunci:["desa cantik","descan","desa cinta statistik","cinta statistik","apa itu desa cantik","program desa cantik","kelurahan cantik","tujuan desa cantik","dasar hukum desa cantik"],
    tanya:"Apa itu Desa Cantik?",
    jawab:"Desa Cinta Statistik (Desa Cantik) adalah program pembinaan statistik BPS kepada pemerintah desa dan kelurahan. Tujuannya bukan menjadikan aparat desa petugas BPS, melainkan membuat desa mampu mengelola dan memakai datanya sendiri untuk perencanaan pembangunan. Dasar hukumnya UU No. 16 Tahun 1997 tentang Statistik, UU No. 6 Tahun 2014 tentang Desa, Perpres No. 39 Tahun 2019 tentang Satu Data Indonesia, dan PermenPAN RB No. 3 Tahun 2023. Sepanjang 2021–2025 program ini sudah membina 2.430 desa/kelurahan di seluruh Indonesia; sasaran 2026 adalah tiga desa/kelurahan di setiap kabupaten/kota.",
    tautan:[{u:SITUS,l:"Desa Cantik Kukar"}] },

  { id:"descan-kukar", kunci:["desa cantik kukar","desa binaan","binaan kukar","capaian desa cantik","prestasi desa cantik","desa cantik kutai kartanegara","juara desa cantik","peringkat desa cantik","desa mana saja","desa apa saja","berapa desa cantik","daftar desa cantik","desa cantik 2022","desa cantik 2024","desa cantik 2025","desa cantik 2026","batuah","loa duri ilir","sumber sari","ponoragan","loa kulu kota","sungai payang","maluhu","loa janan ulu"],
    tanya:"Desa mana saja yang jadi Desa Cantik di Kutai Kartanegara?",
    jawab:"Sejak 2022 ada sepuluh desa/kelurahan binaan di Kutai Kartanegara:\n• 2022 (5): Kelurahan Jawa (Sanga-Sanga), Kelurahan Loa Janan Ulu (Loa Janan), Kelurahan Maluhu (Tenggarong), Sungai Payang (Loa Kulu), dan Pela (Kota Bangun).\n• 2024 (1): Loa Duri Ilir (Loa Janan) — terbaik se-Kalimantan Timur dan peringkat ke-23 nasional.\n• 2025 (1): Batuah (Loa Janan) — terbaik se-Kalimantan Timur dan peringkat 6 nasional; penghargaannya diserahkan di kantor BPS RI pada 28 Oktober 2025.\n• 2026 (3): Loa Kulu Kota, Ponoragan, dan Sumber Sari — ketiganya di Kecamatan Loa Kulu. Sumber Sari masuk 15 besar nasional dan menjadi satu-satunya wakil Kalimantan Timur.",
    tautan:[{u:SITUS+"#capaian",l:"Lini masa capaian & pemberitaannya"}] },

  { id:"descan-syarat", kunci:["syarat desa cantik","cara ikut desa cantik","mau ikut desa cantik","bisa ikut desa cantik","ikut desa cantik","mendaftar desa cantik","diusulkan","usul desa cantik","kriteria desa cantik","syarat jadi desa cantik","desa saya"],
    tanya:"Bagaimana desa bisa ikut program Desa Cantik?",
    jawab:"Desa tidak mendaftar sendiri — diusulkan BPS Kabupaten/Kota lewat BPS Provinsi, lalu ditetapkan dengan Keputusan Kepala BPS. Lima syaratnya: (1) belum pernah diajukan sebagai Desa Cantik, utama maupun tambahan; (2) diutamakan berada dalam satu kecamatan dengan desa binaan lain agar pembinaan efisien; (3) tersedia internet berkualitas sangat baik di kantor desa; (4) tersedia komputer atau laptop yang dapat dipakai khusus mengelola data; (5) ada aparat desa yang mampu mengoperasikannya. Desa yang berminat bisa menyampaikannya ke BPS Kabupaten Kutai Kartanegara sebagai bahan usulan tahun berikutnya.",
    tautan:[{u:SITUS+"#pembinaan",l:"Proses pembinaan selengkapnya"}] },

  { id:"descan-output", kunci:["output desa cantik","output wajib","predikat desa cantik","syarat predikat","tiga output","harus dihasilkan","yang dihasilkan desa","hasil pembinaan"],
    tanya:"Apa yang harus dihasilkan desa untuk berpredikat Desa Cantik?",
    jawab:"Dua hal. Pertama, desa telah dibina Pembina Desa Cantik dan menunjuk Agen Statistik. Kedua, desa menghasilkan tiga output: (1) monografi atau profil desa/kelurahan; (2) publikasi statistik desa/kelurahan; (3) website yang memuat data/statistik desa. Predikatnya ditetapkan lewat Keputusan Kepala BPS, bukan SK desa atau peraturan bupati. Desa yang ditetapkan otomatis menjadi nominasi Penganugerahan Desa Cantik Terbaik.",
    tautan:[{u:SITUS+"#pembinaan",l:"Tiga output wajib"}] },

  { id:"descan-agen", kunci:["agen statistik","komunitas statistik","sk agen","siapa agen","berapa agen","tugas agen statistik","duta statistik"],
    tanya:"Siapa itu agen statistik dan apa tugasnya?",
    jawab:"Agen Statistik adalah aktor utama pelaksana Desa Cantik di desa. Ditetapkan lewat SK Kepala Desa/Lurah (dapat pula Camat/Bupati/Walikota). Jumlahnya harus lebih dari satu orang, dan minimal satu orang berasal dari aparat desa/kelurahan — kaur, kasi, atau staf. Diutamakan yang pernah terlibat sensus atau survei dan yang menguasai teknologi informasi; sejak 2026 diharapkan memiliki laptop/PC untuk kegiatan Desa Cantik. Tugasnya mengelola data desa sesuai kaidah statistik dan menularkan ilmunya ke perangkat desa lain, supaya kemampuannya tidak menumpuk pada satu orang.",
    tautan:[{u:KELAS+"#modul/kenal",l:"Modul Mengenal Desa Cantik"}] },

  { id:"descan-lama", kunci:["berapa lama","lama pembinaan","durasi pembinaan","jadwal desa cantik","tahapan desa cantik","tahapan pembinaan","proses pembinaan","kapan penilaian","penganugerahan","lima tahap"],
    tanya:"Berapa lama pembinaan Desa Cantik berlangsung?",
    jawab:"Pembinaan dan pendampingan dijadwalkan 3–4 bulan, sejak 2026 diutamakan terintegrasi di kantor kecamatan untuk seluruh desa binaan. Programnya berjalan lima tahap berurutan: koordinasi dan sosialisasi, identifikasi kondisi dan potensi desa, perencanaan kegiatan, pelaksanaan, lalu monitoring dan evaluasi. Penilaiannya berjenjang — penilaian mandiri, verifikasi provinsi, desk evaluation, field/online evaluation, dan pleno akhir. Penganugerahan Desa Cantik Terbaik 2026 dijadwalkan 26 September 2026.",
    tautan:[{u:SITUS+"#pembinaan",l:"Delapan tahapan pembinaan"}] },

  /* ---------------- kelas ---------------- */
  { id:"descan-kelas", kunci:["kelas statistik desa","kelas baca angka","belajar statistik","materi desa cantik","modul desa cantik","materi belajar","bahan belajar","belajar baca angka","soal latihan","belajar angka","kursus","pelatihan perangkat desa"],
    tanya:"Ada bahan belajar statistik untuk perangkat desa?",
    jawab:"Ada, dan terbuka untuk siapa saja tanpa pendaftaran: Kelas Statistik Desa — 15 modul dengan 106 soal latihan. Jalur 1 (Baca Angka, 5 modul) membahas dasar membaca angka: satuan, persen dan poin persen, indeks, tiga angka kemiskinan, dan jebakan tafsir. Jalur 2 (Statistik Desa, 10 modul) mengikuti kurikulum pembinaan Desa Cantik: pengenalan program, GSBPM dan Satu Data, identifikasi kebutuhan, pengumpulan, pengolahan, manajemen kualitas, analisis, penyajian, FASIH, serta DTSEN dan Sensus Ekonomi 2026. Jawaban salah tetap dijelaskan, dan kemajuan belajar tersimpan di peramban sendiri.",
    tautan:[{u:KELAS,l:"Buka Kelas Statistik Desa"}] },

  /* ---------------- data untuk desa ---------------- */
  { id:"descan-data", kunci:["data untuk desa","data desa","desa butuh data","perencanaan desa","rpjmdes","musrenbang","data apa untuk desa","podes"],
    tanya:"Data BPS apa yang bisa dipakai desa untuk perencanaan?",
    jawab:"Yang tersedia sampai tingkat desa adalah hasil sensus dan pendataan lengkap, bukan survei sampel. Jadi: Kecamatan Dalam Angka (terbit tiap 26 September) memuat angka per desa untuk penduduk, fasilitas pendidikan dan kesehatan, serta sarana; Potensi Desa (Podes) memuat keadaan desa dan fasilitasnya; hasil Sensus Penduduk 2020 dan Sensus Pertanian 2023 juga tersedia sampai desa. Yang TIDAK ada sampai desa adalah angka kemiskinan, pengangguran, IPM, dan inflasi — ketiganya berasal dari survei sampel yang hanya representatif sampai kabupaten. Untuk data by name by address penerima bantuan, rujukannya DTSEN lewat Dinas Sosial, bukan BPS.",
    tautan:[{u:"index.html",l:"Cek katalog ketersediaan sampai level desa"}] },

  { id:"descan-monografi", kunci:["monografi","cara membuat monografi","bikin monografi","menyusun monografi","profil desa","bikin profil desa","menyusun profil desa","cara bikin publikasi desa","publikasi statistik desa","menyusun publikasi"],
    tanya:"Bagaimana cara desa menyusun monografi atau publikasi statistiknya?",
    jawab:"Mulai dari data yang sudah ada, bukan dari mendata ulang. Langkahnya: (1) kumpulkan catatan administrasi desa dan data dari Puskesmas, sekolah, serta Kecamatan Dalam Angka; (2) rapikan jadi tabel dengan judul lengkap — apa, menurut apa, di mana, tahun berapa — beserta satuan dan sumbernya; (3) buat grafik dari tabel yang sudah jadi, bukan langsung dari data mentah; (4) sertakan penjelasan metodologi dan definisi istilah supaya bisa dipertanggungjawabkan dan dibandingkan tahun berikutnya; (5) sebarkan lewat website desa, papan pengumuman, dan pertemuan desa. Modul Penyajian Data di Kelas Statistik Desa membahasnya langkah demi langkah, termasuk delapan komponen tabel dan lima aturan baku membuat grafik.",
    tautan:[{u:KELAS+"#modul/sajikan",l:"Modul Menyajikan dan menyebarkan data"}] },

  /* ---------------- DTSEN ---------------- */
  { id:"dtsen", kunci:["dtsen","apa itu dtsen","data tunggal","desil","desil 1","peringkat kesejahteraan","data tunggal sosial","basis data bansos","p3ke","regsosek"],
    tanya:"Apa itu DTSEN dan desil?",
    jawab:"DTSEN — Data Tunggal Sosial dan Ekonomi Nasional — adalah basis data tunggal yang dibangun BPS berdasarkan Inpres No. 4 Tahun 2025, menggabungkan tiga basis data lama (DTKS, P3KE, Regsosek) yang divalidasi dengan data kependudukan Dukcapil. Seluruh keluarga di Indonesia — bukan hanya yang miskin — diperingkat ke dalam Desil 1 sampai 10: Desil 1 adalah 10 persen keluarga dengan kesejahteraan terbawah, Desil 10 yang teratas. Batas program: PKH untuk Desil 1–4; Sembako/BPNT, ATENSI, dan PBI JKN untuk Desil 1–5. DTSEN bersifat dinamis — pada 2026 diperbarui empat kali setahun, dan pemeringkatan desil berubah tiap tiga bulan.",
    tautan:[{u:KELAS+"#modul/dtsen",l:"Modul DTSEN dan Sensus Ekonomi 2026"}] },

  { id:"dtsen-usul", kunci:["tidak dapat bantuan","gak dapat bantuan","ga dapat bantuan","nggak dapat bantuan","tidak menerima bansos","tidak dapat bansos","kenapa tidak dapat","padahal miskin","usul bantuan","mengusulkan bantuan","sanggah","sanggahan","cek bansos","siks-ng","bansos tidak tepat sasaran","protes bantuan","daftar penerima","dicoret dari penerima"],
    tanya:"Warga tidak menerima bantuan padahal merasa berhak, harus bagaimana?",
    jawab:"BPS tidak menetapkan siapa yang menerima bantuan — BPS menyusun datanya, penetapan penerimanya di Kementerian Sosial. Jalurnya begini. Kalau keluarga sudah muncul di daftar SIKS-NG dan desilnya sesuai kriteria program, perangkat desa mengajukan Usulan Bansos. Kalau tidak muncul di daftar atau desilnya tidak sesuai, yang benar adalah Usulan Pembaruan Data — salah memilih jalur membuat usulan tidak dapat diproses sama sekali. Warga juga bisa mengusulkan atau menyanggah sendiri lewat aplikasi Cek Bansos, atau menghubungi Command Center 171. Tenggatnya bulanan: usulan bansos tanggal 1–11, batas akhir usulan pembaruan tanggal 11, musyawarah desa atau SPTJM sampai tanggal 14, dan pengesahan pemerintah daerah sampai tanggal 17.",
    tautan:[{u:KELAS+"#modul/dtsen",l:"Modul DTSEN: jalur usulan & tenggatnya"}] },

  { id:"se2026", kunci:["sensus ekonomi","se2026","se 2026","sensus ekonomi 2026","pendataan usaha","kapan sensus ekonomi","pendataan lapangan"],
    tanya:"Apa itu Sensus Ekonomi 2026?",
    jawab:"Sensus Ekonomi dilaksanakan sepuluh tahun sekali pada tahun berakhiran enam — 1986, 1996, 2006, 2016, dan kini 2026. Pendataan lapangannya berlangsung 16 Mei sampai 31 Juli 2026. Selain mendata usaha, SE2026 sekaligus memutakhirkan 40 variabel sosial ekonomi keluarga yang menjadi penentu tingkat kesejahteraan di DTSEN — itulah sebabnya Desa Cantik 2026 diarahkan mendukungnya. Peran agen statistik desa ada lima: memastikan seluruh rumah tangga dan unit usaha tercatat, memvalidasi agar tidak ada data ganda, menyosialisasikan ke warga, membantu desa memanfaatkan hasilnya, dan mendukung Satu Data.",
    tautan:[{u:"https://sensus.bps.go.id/se2026/",l:"Laman resmi SE2026"},{u:KELAS+"#modul/dtsen",l:"Modul DTSEN & SE2026"}] },

  { id:"fasih", kunci:["fasih","aplikasi pendataan","capi","aplikasi bps","petugas pendataan","assignment","sobat bps","mitra bps"],
    tanya:"Apa itu FASIH?",
    jawab:"FASIH (Flexible Authentic Survey Instrument Harmony) adalah sistem pengumpulan data BPS yang terpadu dari desain sampai pengolahan. Ekosistemnya empat bagian: SOBAT BPS untuk pendaftaran akun mitra, FASIH Survey Management berbasis web untuk admin, FASIH Mobile (Android) untuk petugas lapangan, dan FASIH Dashboard untuk pemantauan. Satu hal yang wajib diingat petugas: aplikasinya HANYA boleh dipasang dari Play Store — memasang dari berkas APK kiriman WhatsApp berisiko pencurian data di perangkat. Status assignment ada lima: Open (putih), Pending (oranye, sudah terkirim tapi menunggu balasan server), Submit (biru), Reject (merah muda), dan Approved (hijau).",
    tautan:[{u:KELAS+"#modul/fasih",l:"Modul Mengenal FASIH"}] },

  { id:"satudata", kunci:["satu data","satu data indonesia","sdi","standar data","metadata","gsbpm","walidata","interoperabilitas","konsep definisi baku"],
    tanya:"Apa hubungan Desa Cantik dengan Satu Data Indonesia?",
    jawab:"Dua jalur bertemu di Desa Cantik. Dari atas, BPS membina standar data dan metadata menuju Satu Data Desa Indonesia. Dari bawah, BPS membina desa memperbaiki datanya sendiri — itulah Desa Cantik. Yang dituntut Satu Data bukan desa mengumpulkan lebih banyak data, melainkan data yang ada memakai konsep, definisi, klasifikasi, ukuran, dan satuan yang sudah dibakukan — lima komponen Standar Data Statistik. Manfaatnya praktis: kalau desa memakai definisi rumah tangga yang sama dengan BPS, angka desa bisa dibandingkan dengan angka kecamatan dan kabupaten. Kalau definisinya dikarang sendiri, angkanya benar untuk desa itu tetapi tidak bisa disandingkan dengan apa pun.",
    tautan:[{u:KELAS+"#modul/siklus",l:"Modul Satu siklus kegiatan statistik"}] },

  { id:"descan-beda", kunci:["beda desa cantik","desa digital","smart village","desa cerdas","bedanya dengan","idm","indeks desa membangun"],
    tanya:"Apa bedanya Desa Cantik dengan Desa Digital atau Desa Cerdas?",
    jawab:"Berbeda pemilik program dan berbeda sasarannya. Desa Cantik adalah pembinaan statistik oleh BPS — sasarannya kemampuan desa mengelola dan memakai datanya sendiri, dengan output monografi, publikasi statistik, dan website berisi data. Desa Digital dan Desa Cerdas dikelola kementerian lain dan menyasar infrastruktur serta layanan digital. Indeks Desa Membangun (IDM) juga bukan produk BPS melainkan Kementerian Desa, sehingga statusnya tidak ditentukan oleh keikutsertaan dalam Desa Cantik. Keduanya bisa berjalan bersamaan dan saling mendukung — data yang rapi dari Desa Cantik justru memudahkan program digital lainnya.",
    tautan:[] },

  /* ---------------- untuk petugas ---------------- */
  { id:"petugas-descan", untuk:"petugas", kunci:["pembina desa cantik","tugas pembina","cawi descan","lke","penilaian mandiri","dashboard desa cantik","monev desa cantik"],
    tanya:"Tugas Pembina Desa Cantik BPS Kabupaten/Kota",
    jawab:"Menggali kebutuhan data desa sekaligus mengamati kondisinya; melakukan pembinaan dan pendampingan pelaksanaan kegiatan statistik; menyosialisasikan kesadaran cinta statistik ke masyarakat; memantau dan melaporkan ke BPS Kabupaten/Kota; serta melakukan penilaian mandiri kabupaten/kota dan mendampingi penilaian mandiri desa. Pada 2026 pembina kabupaten/kota menerima tiga jenis email CAWI (turun dari lima pada 2025): penilaian mandiri desa & kabupaten/kota, desa tambahan, dan Desa Cantik Berkelanjutan. Isian CAWI utamanya lima: penilaian mandiri desa, penilaian mandiri BPS Kab/Kota, laporan koordinasi/sosialisasi/pencanangan (bukti dukung: undangan, daftar hadir, notulen, dokumentasi), hasil identifikasi kebutuhan desa, dan laporan akhir. Hasil identifikasi yang dientri hanya Blok X Resume rincian 1001a dan 1001b, kuesioner lengkapnya tetap dilampirkan.",
    tautan:[] }

  );
  window.PENGETAHUAN_DESCAN = true;   /* penanda untuk pemuat malas assets/asisten.js */
})();
