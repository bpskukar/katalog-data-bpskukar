/* ============================================================================
   Basis pengetahuan chatbot & kartu jawaban baku petugas PST.
   Tiap butir: kunci (kata pemicu), tanya (contoh pertanyaan), jawab (teks
   apa adanya, boleh memuat URL), tautan, dan untuk siapa ('semua'|'petugas').
   Isi ini yang dibaca chatbot — jadi kalau jawaban baku berubah, ubah di sini.
   ========================================================================== */
window.PENGETAHUAN = [
  { id:"jam", kunci:["jam","buka","tutup","hari","kapan buka","jam layanan","jam kerja","operasional","alamat","lokasi","dimana","di mana","kantor","telepon","kontak","hubungi","email","surel"],
    tanya:"Jam layanan dan alamat PST?",
    jawab:"PST BPS Kabupaten Kutai Kartanegara buka pada hari kerja pukul 09.00–15.30 WITA di Jl. Danau Aji No. 98, Tenggarong. Telepon (0541) 661210, surel bps6403@bps.go.id. Seluruh layanan konsultasi dan perpustakaan gratis.",
    tautan:[{u:"https://pst.bps.go.id/",l:"PST daring BPS"}] },

  { id:"cara", kunci:["cara","bagaimana","gimana","prosedur","syarat","minta data","permintaan data","ajukan","mengajukan","surat","bersurat","perlu surat","harus surat","formulir"],
    tanya:"Bagaimana cara meminta data?",
    jawab:"Ada tiga jalur, tergantung jenisnya:\n1. Data yang sudah terbit — unduh sendiri dari kukarkab.bps.go.id, tidak perlu surat. Cek di katalog dulu, sebagian besar ada di sana.\n2. Konsultasi dan tabulasi yang belum terbit — datang ke PST atau ajukan lewat pst.bps.go.id. Gratis, cukup kartu identitas dan mengisi buku tamu. Waktu penyelesaian maksimal 3 hari kerja.\n3. Data mikro dan pembelian publikasi — berbayar sesuai PP No. 7 Tahun 2015 dan wajib surat permintaan resmi; mahasiswa dan instansi pemerintah dapat mengajukan surat permohonan nol rupiah.",
    tautan:[{u:"index.html",l:"Katalog ketersediaan data"},{u:"https://pst.bps.go.id/",l:"Ajukan lewat PST daring"}] },

  { id:"dukcapil", kunci:["dukcapil","disdukcapil","beda","berbeda","selisih","tidak sama","kok beda","adminduk","kependudukan berbeda","kk","ktp"],
    tanya:"Kenapa jumlah penduduk BPS berbeda dengan Dukcapil?",
    jawab:"Keduanya mengukur hal yang berbeda. BPS menghitung penduduk yang benar-benar tinggal di suatu wilayah (de facto, berdasarkan sensus dan proyeksi), sedangkan Dukcapil mencatat penduduk yang terdaftar secara administrasi (de jure, berdasarkan KTP/KK). Orang yang ber-KTP Kukar tetapi tinggal di Samarinda dihitung Dukcapil sebagai penduduk Kukar, tetapi oleh BPS sebagai penduduk Samarinda. Selisih itu wajar dan bukan kekeliruan. Untuk perencanaan pembangunan dan indikator (kepadatan, rasio, IPM), pakailah angka BPS; untuk urusan administrasi (pemilih, bantuan by name), pakailah Dukcapil.",
    tautan:[] },

  { id:"kecamatan", kunci:["per kecamatan","tingkat kecamatan","per desa","tingkat desa","kemiskinan kecamatan","kemiskinan desa","pengangguran kecamatan","ipm kecamatan","tpt kecamatan","kenapa tidak ada kecamatan","sampel"],
    tanya:"Kenapa tidak ada angka kemiskinan atau pengangguran per kecamatan?",
    jawab:"Karena angka itu berasal dari survei sampel (Susenas dan Sakernas) yang dirancang hanya representatif sampai tingkat kabupaten. Responden memang tersebar di kecamatan, tetapi jumlahnya per kecamatan terlalu sedikit untuk menghasilkan angka yang dapat dipertanggungjawabkan — berapa pun jumlah respondennya. Ini bukan karena datanya belum diolah, melainkan karena metodenya memang tidak dirancang untuk itu. Yang tersedia sampai level desa adalah hasil sensus (SP2020, ST2023) dan Pendataan Potensi Desa.",
    tautan:[{u:"index.html",l:"Lihat mana yang tersedia sampai desa di katalog"}] },

  { id:"rahasia", kunci:["nama dan alamat","by name","by address","daftar nama","alamat responden","data individu","data pribadi","siapa saja","nama penerima","bantuan sosial","dtks","nama perusahaan","alamat perusahaan","rahasia"],
    tanya:"Bisakah minta daftar nama dan alamat penduduk miskin atau perusahaan?",
    jawab:"Tidak bisa, dalam keadaan apa pun. Pasal 21 dan 24 Undang-Undang Nomor 16 Tahun 1997 tentang Statistik melarang BPS membuka keterangan yang dapat mengidentifikasi responden — orang maupun perusahaan — termasuk kepada instansi pemerintah, dengan surat sekalipun. Yang dapat diberikan hanya angka agregat. Untuk penyaluran bantuan sosial, basis data by name by address ada di Dinas Sosial (DTKS/Regsosek), bukan di BPS.",
    tautan:[] },

  { id:"mikro", kunci:["data mikro","mikro","raw data","microdata","silastik","skripsi","tesis","disertasi","penelitian mahasiswa","olah sendiri","spss","stata"],
    tanya:"Bagaimana cara mendapat data mikro Susenas atau Sakernas untuk skripsi?",
    jawab:"Data mikro tidak dilayani di kantor kabupaten. Ajukan lewat Silastik (silastik.bps.go.id): buat akun, pilih survei dan variabel, unggah surat permintaan dari kampus (mahasiswa bisa mengajukan surat permohonan nol rupiah), lalu tanda tangani perjanjian penggunaan data. Prosesnya maksimal 10 hari kerja setelah persyaratan lengkap. Untuk kebutuhan tugas kuliah biasa, seringkali tabel yang sudah terbit di publikasi sudah cukup — cek katalog dulu.",
    tautan:[{u:"https://silastik.bps.go.id",l:"Silastik"},{u:"index.html",l:"Katalog"}] },

  { id:"terbit", kunci:["kapan terbit","kapan rilis","kapan keluar","belum ada","tahun ini","tahun berjalan","terbaru","2026","jadwal rilis","rencana terbit","update"],
    tanya:"Kapan data tahun ini terbit?",
    jawab:"Jadwalnya rutin tiap tahun: Kabupaten Dalam Angka akhir Februari, PDRB sekitar April, Kecamatan Dalam Angka 26 September, Statistik Kesejahteraan Rakyat dan Potensi Desa pada Desember. Angka kemiskinan dan IPM tahun berjalan biasanya baru tersedia pada akhir tahun atau awal tahun berikutnya. Jadwal resmi per publikasi ada di halaman Rencana Terbit.",
    tautan:[{u:"https://kukarkab.bps.go.id/id/arc",l:"Rencana Terbit BPS Kukar"}] },

  { id:"inflasi", kunci:["inflasi","ihk","indeks harga konsumen","harga","kenaikan harga","deflasi"],
    tanya:"Ada inflasi Kutai Kartanegara?",
    jawab:"Indeks Harga Konsumen hanya dihitung untuk kota terpilih sebagai wilayah pencacahan, bukan untuk semua kabupaten. Untuk Kalimantan Timur, rujukannya angka inflasi provinsi dan kota pencacahan di kaltim.bps.go.id. Bila Anda perlu memastikan apakah Kukar sudah masuk cakupan terbaru, petugas PST akan mengecek.",
    tautan:[{u:"https://kaltim.bps.go.id/id",l:"BPS Provinsi Kalimantan Timur"}] },

  { id:"sektoral", kunci:["dinas","opd","milik siapa","sumbernya","data sektoral","sekolah","guru","murid","puskesmas","jalan","kendaraan","ternak","perkebunan","sawit","apbd","pns","hujan","curah hujan"],
    tanya:"Data sekolah, ternak, jalan — itu milik BPS atau dinas?",
    jawab:"Sebagian besar data itu dihimpun perangkat daerah (dinas pendidikan, peternakan, PU, BMKG, dan lain-lain) dan hanya ditayangkan ulang oleh BPS dalam publikasi Dalam Angka. Untuk angka terbaru dan rinci, sumber resminya ada di dinas terkait. BPS dapat menunjukkan angka yang sudah terbit, tetapi surat permintaan data rinci sebaiknya ditujukan ke dinasnya. Di katalog, data seperti ini berstatus 'Data sektoral'.",
    tautan:[{u:"index.html",l:"Katalog — saring status Data sektoral"}] },

  { id:"tiket", kunci:["tiket","kode tiket","status permintaan","cek status","sudah sampai mana","sudah selesai","pst-","kon-","nomor tiket"],
    tanya:"Bagaimana memeriksa status permintaan saya?",
    jawab:"Ketik kode tiket Anda di sini (bentuknya PST-2609-0042 untuk permintaan data, atau KON-2609-0007 untuk konsultasi daring), lalu empat digit terakhir nomor HP yang Anda berikan kepada petugas. Atau buka halaman Sahabat Data.",
    tautan:[{u:"sahabat.html",l:"Halaman Sahabat Data"}] },

  { id:"konsultasi", kunci:["konsultasi","zoom","online","daring","video call","meeting","janji","jadwal konsultasi","bicara dengan","ngobrol","tanya langsung","narasumber"],
    tanya:"Bisa konsultasi online lewat Zoom?",
    jawab:"Bisa, gratis. Isi formulir konsultasi daring: ceritakan kebutuhan Anda supaya kami menyiapkan narasumber yang tepat, pilih paling banyak dua topik, lalu pilih jadwal — paling cepat besok (H+1), hari kerja pukul 09.00–14.30 WITA, 30 menit per sesi. Anda mendapat kode KON untuk memantau statusnya; tautan Zoom muncul di situ setelah jadwal ditetapkan petugas.",
    tautan:[{u:"konsultasi.html",l:"Ajukan konsultasi daring"}] },

  { id:"akun", kunci:["daftar akun","buat akun","login","masuk","akun","password","lupa sandi","registrasi"],
    tanya:"Perlu akun untuk minta data?",
    jawab:"Tidak wajib. Memeriksa status tiket cukup dengan kode tiket dan empat digit terakhir nomor HP. Akun berguna bila Anda sering meminta data: seluruh riwayat permintaan tersimpan dan Anda dapat mengajukan permintaan baru tanpa datang ke kantor. Pendaftarannya di halaman Sahabat Data.",
    tautan:[{u:"sahabat.html",l:"Daftar atau masuk"}] },

  { id:"biaya", kunci:["biaya","bayar","berbayar","gratis","tarif","harga publikasi","pnbp","nol rupiah","beli"],
    tanya:"Apakah layanan BPS berbayar?",
    jawab:"Konsultasi statistik, perpustakaan, dan unduh publikasi digital: gratis. Yang berbayar sesuai PP No. 7 Tahun 2015: pembelian publikasi cetak, data mikro, dan peta digital wilayah kerja statistik. Mahasiswa dan instansi pemerintah dapat mengajukan surat permohonan nol rupiah untuk dibebaskan dari biaya.",
    tautan:[] },

  { id:"romantik", kunci:["romantik","rekomendasi","survei sendiri","mau survei","menyelenggarakan survei","statistik sektoral","fs3","formulir survei"],
    tanya:"Instansi kami mau mengadakan survei sendiri, perlu apa?",
    jawab:"Ajukan rekomendasi kegiatan statistik lewat Romantik (romantik.web.bps.go.id). Gratis, wajib melampirkan surat permohonan dan Formulir Survei Statistik Sektoral. Waktu penyelesaian maksimal 30 hari kerja sejak dokumen lengkap. BPS akan menilai metodologi dan memastikan survei itu tidak menduplikasi yang sudah ada.",
    tautan:[{u:"https://romantik.web.bps.go.id",l:"Romantik"}] },

  { id:"apsapm", kunci:["aps","apm","apk","partisipasi sekolah","angka partisipasi","bedanya aps","perbedaan apm"],
    tanya:"Apa beda APS, APM, dan APK?",
    jawab:"APS (Angka Partisipasi Sekolah): persentase penduduk kelompok umur tertentu yang masih sekolah, jenjang apa pun. APM (Murni): persentase penduduk kelompok umur tertentu yang sekolah di jenjang yang sesuai umurnya. APK (Kasar): jumlah murid di suatu jenjang dibagi penduduk usia sekolah jenjang itu — bisa lebih dari 100 persen karena memuat murid yang lebih tua atau lebih muda. Ketiganya tersedia untuk Kukar di Statistik Kesejahteraan Rakyat.",
    tautan:[] },

  { id:"pdrbkapita", kunci:["pdrb per kapita","kaya","pendapatan","pendapatan per kapita","kok masih miskin","pdrb tinggi"],
    tanya:"PDRB per kapita Kukar tinggi, kenapa masih ada penduduk miskin?",
    jawab:"PDRB per kapita adalah nilai seluruh produksi di wilayah dibagi jumlah penduduk — bukan pendapatan yang benar-benar diterima penduduk. Di Kukar sebagian besar PDRB berasal dari pertambangan migas dan batubara yang nilai tambahnya mengalir ke perusahaan dan pemerintah, bukan ke rumah tangga. Untuk melihat kesejahteraan penduduk, pakailah pengeluaran per kapita, angka kemiskinan, dan IPM, bukan PDRB per kapita. Publikasi PDRB juga menyajikan seri tanpa migas dan batubara.",
    tautan:[] },

  /* ---- hanya untuk petugas ---- */
  { id:"petugas-tolak", untuk:"petugas", kunci:["cara menolak","menolak","bilang tidak ada","kalimat penolakan","jawab tidak bisa"],
    tanya:"Kalimat baku saat data tidak dapat diberikan",
    jawab:"Jangan bilang 'datanya belum ada' bila sebenarnya memang tidak dihasilkan — itu membuat orang datang lagi. Pakai: \"Data ini tidak dihasilkan sampai level itu karena [alasan metodologi / kerahasiaan UU 16/1997]. Yang bisa kami sediakan adalah [alternatif terdekat di katalog].\" Selalu tutup dengan alternatif, dan tawarkan mencatatkan kebutuhannya sebagai tiket bila alternatifnya belum memuaskan.",
    tautan:[] },

  { id:"petugas-alur", untuk:"petugas", kunci:["alur","sop","langkah","buku tamu","catat","piket","apa yang harus"],
    tanya:"Alur baku melayani sahabat data di meja PST",
    jawab:"1. Sapa, minta identitas, persilakan mengisi buku tamu (atau catat di ruang pegawai). 2. Ketik kebutuhannya di kotak 'Apa yang diminta' — lihat pencocokan katalog. 3. Kalau statusnya 'Unduh di web': bukakan tautannya, tunjukkan cara mengunduh, tiket ditandai selesai. 4. Kalau 'Permintaan resmi': jelaskan syaratnya, buat tiket 'Sedang diproses' atau 'Menunggu surat'. 5. Kalau 'Tidak tersedia' atau 'Level provinsi': jelaskan alasannya, tawarkan alternatif, tetap catat. 6. Kalau tidak yakin: buat tiket 'Diteruskan ke papan tanya' — jangan menebak. 7. Berikan kode tiket dan tawarkan kirim lewat WhatsApp.",
    tautan:[] }
];
