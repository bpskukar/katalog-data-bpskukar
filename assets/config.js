/* ============================================================================
   Konfigurasi — ubah dua baris di bawah setelah proyek Supabase dibuat.
   Kunci "anon" memang boleh terlihat publik; keamanan dijaga oleh Row Level
   Security di sisi basis data (lihat supabase/schema.sql).
   Selama masih kosong, seluruh halaman berjalan dalam MODE DEMO: data hanya
   tersimpan di peramban ini dan hilang bila cache dibersihkan.
   ========================================================================== */
window.KONFIG = {
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",

  NAMA_SATKER: "BPS Kabupaten Kutai Kartanegara",
  ALAMAT: "Jl. Danau Aji No. 98, Melayu, Tenggarong 75512",
  TELEPON: "(0541) 661210",
  SUREL: "bps6403@bps.go.id",
  JAM_LAYANAN: "Hari kerja 09.00 – 15.30 WITA",
  KODE_DOMAIN: "6403"
};

/* --------------------------------------------------------------------------
   Klasifikasi baku BPS. Sengaja mengikuti Blok I kuesioner Survei Kebutuhan
   Data (VKD25) supaya rekap PST langsung sebanding dengan SKD BPS pusat.
   -------------------------------------------------------------------------- */
window.BAKU = {
  kategoriInstansi: [
    "Lembaga pendidikan & penelitian dalam negeri",
    "Lembaga pendidikan & penelitian luar negeri",
    "Kementerian & lembaga pemerintah",
    "Lembaga internasional",
    "Media massa",
    "Pemerintah daerah",
    "Perbankan",
    "BUMN/D",
    "Swasta lainnya",
    "Lainnya"
  ],
  pemanfaatan: [
    "Tugas sekolah/tugas kuliah",
    "Pemerintahan",
    "Komersial",
    "Penelitian",
    "Lainnya"
  ],
  jenisLayanan: [
    "Konsultasi data statistik",
    "Pustaka tercetak",
    "Pustaka digital",
    "Penjualan publikasi",
    "Data mikro",
    "Rekomendasi kegiatan statistik"
  ],
  sarana: [
    "Datang langsung ke PST",
    "Telepon",
    "WhatsApp",
    "Surel",
    "Surat",
    "PST Online (pst.bps.go.id)",
    "Media sosial",
    "Lainnya"
  ],
  pendidikan: [
    "SD ke bawah", "SMP", "SMA/SMK", "D1/D2/D3", "D4/S1", "S2", "S3"
  ],
  pekerjaan: [
    "Pelajar/Mahasiswa", "PNS/TNI/Polri", "Pegawai BUMN/BUMD", "Pegawai swasta",
    "Wiraswasta", "Dosen/Peneliti", "Jurnalis", "Ibu rumah tangga",
    "Belum/tidak bekerja", "Lainnya"
  ],
  jenisKelamin: ["Laki-laki", "Perempuan"],

  /* Status penyelesaian permintaan */
  statusTiket: {
    selesai:  "Selesai dilayani",
    proses:   "Sedang diproses",
    surat:    "Menunggu surat resmi",
    eskalasi: "Diteruskan ke papan tanya",
    tolak:    "Tidak dapat dipenuhi"
  },

  /* Bobot poin keaktifan petugas */
  poin: {
    catat:    { n: 2,  l: "Mencatat kunjungan sahabat data" },
    tanya:    { n: 1,  l: "Mengangkat kebutuhan ke papan tanya" },
    jawab:    { n: 3,  l: "Menjawab pertanyaan pegawai lain" },
    terbaik:  { n: 7,  l: "Jawaban ditandai paling membantu" },
    tuntas:   { n: 5,  l: "Menuntaskan tiket yang tertunda" }
  },

  /* Janji waktu layanan menurut Standar Pelayanan PST BPS */
  sla: {
    "Konsultasi data statistik": { hari: 3,  ket: "maksimal 3 hari kerja (daring); 10 menit bila tatap muka" },
    "Pustaka tercetak":          { hari: 0,  ket: "maksimal 5 menit setelah mengisi buku tamu" },
    "Pustaka digital":           { hari: 0,  ket: "maksimal 5 menit setelah mengisi buku tamu" },
    "Penjualan publikasi":       { hari: 10, ket: "maksimal 10 hari kerja setelah persyaratan lengkap" },
    "Data mikro":                { hari: 10, ket: "maksimal 10 hari kerja; wajib SPPD lewat Silastik" },
    "Rekomendasi kegiatan statistik": { hari: 30, ket: "maksimal 30 hari kerja sejak dokumen lengkap" }
  }
};
