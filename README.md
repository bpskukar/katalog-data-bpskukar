# Katalog & Sistem PST — BPS Kabupaten Kutai Kartanegara

Alat bantu Pelayanan Statistik Terpadu: katalog ketersediaan data yang bisa dibuka siapa
saja, ditambah ruang kerja pegawai untuk mencatat kunjungan, saling membantu menjawab,
dan merekap kebutuhan sahabat data.

🔗 <https://bpskukar.github.io/katalog-data-bpskukar/>

---

## Masalah yang dipecahkan

Petugas piket PST berganti tiap hari, sementara pemahaman tentang data tidak merata.
Ketika peneliti, pemerintah daerah, atau mahasiswa datang, petugas yang belum hafal
akan menelepon pegawai yang paham. Akibatnya beban menumpuk pada beberapa orang saja,
dan jawaban yang sama diulang terus tanpa pernah tersimpan.

Sistem ini memindahkan pengetahuan itu keluar dari kepala beberapa orang:

| Bagian | Untuk siapa | Menjawab |
|---|---|---|
| **Katalog** (`index.html`) | Siapa saja | Datanya ada atau tidak, sampai level apa, bisa diunduh sendiri atau harus bersurat, dan tautannya di mana |
| **Ruang pegawai** (`admin.html`) | Pegawai BPS | Siapa yang datang, minta apa, sudah ditangani atau belum, kebutuhan apa yang paling sering muncul |
| **Sahabat data** (`sahabat.html`) | Konsumen data | Permintaan saya sudah sampai mana |
| **Konsultasi daring** (`konsultasi.html`) | Konsumen data | Bicara langsung lewat Zoom, pilih jadwal sendiri |
| **Asisten PST** (tombol di semua halaman) | Siapa saja | Jawaban cepat dari katalog dan jawaban baku, cek tiket lewat percakapan |

## Isi katalog

89 ragam data pada sebelas topik, masing-masing dengan level wilayah terendah, periode,
sumber survei, letak di menu laman BPS, dan tautan langsung ke publikasi atau tabelnya —
124 tautan tabel statistik di laman BPS Kukar dan BPS Provinsi Kaltim diperiksa satu per satu
(September 2026), sehingga tidak ada lagi baris berstatus *perlu cek*.
Ditambah tautan 20 publikasi Kecamatan Dalam Angka — satu-satunya sumber rutin
yang turun sampai level desa.

Lima status dipakai:

| Status | Arti |
|---|---|
| **Unduh di web** | Sudah terbit, bisa diunduh sendiri tanpa mengajukan permintaan |
| **Permintaan resmi** | Ada tetapi belum siap unduh; ajukan lewat PST |
| **Level provinsi** | Tidak dihasilkan untuk kabupaten, tersedia di tingkat provinsi atau nasional |
| **Tidak tersedia** | Tidak dikumpulkan sampai level itu, atau dilindungi UU No. 16 Tahun 1997 |
| **Data sektoral** | Dihimpun perangkat daerah; sumber resminya di dinas terkait |

Yang membedakan dari daftar data biasa: katalog ini **juga memuat data yang tidak tersedia
beserta alasannya**. Bagian itulah yang paling menghemat waktu, karena menjawab pertanyaan
yang paling sering membuat petugas menelepon rekannya.

## Yang bisa dilakukan pegawai

- **Mencatat kunjungan** dengan isian yang mengikuti Blok I kuesioner Survei Kebutuhan
  Data (VKD25), sehingga rekapnya sebanding dengan SKD BPS pusat.
- **Pencocokan katalog otomatis** — begitu kebutuhan sahabat data diketik, katalog
  menampilkan ragam data yang cocok beserta status dan tautannya. Ini inti alatnya:
  petugas menjawab di tempat tanpa menelepon siapa pun.
- **Kode tiket otomatis** untuk permintaan yang belum tuntas, beserta tenggat yang
  dihitung dari Standar Pelayanan PST (3 hari kerja konsultasi, 10 hari penjualan,
  30 hari rekomendasi kegiatan statistik).
- **Papan tanya** untuk kebutuhan yang tidak terjawab di meja, dengan penandaan jawaban
  paling membantu.
- **Poin keaktifan dan papan peringkat** — mencatat kunjungan 2, mengangkat pertanyaan 1,
  menjawab 3, jawaban terbaik 7, menuntaskan tiket 5. Dengan pagar keadilan: poin tuntas hanya
  sekali per tiket dan tidak diberikan untuk tiket sendiri yang ditutup kurang dari satu jam;
  menjawab pertanyaan sendiri tidak berpoin; yang boleh menandai jawaban paling membantu hanya
  penanya atau admin, dan tidak pernah untuk jawaban sendiri. Semua aturan ini ditegakkan di
  basis data, bukan di peramban, sehingga tidak bisa diakali lewat API.
- **Kirim kode tiket lewat WhatsApp** — satu tombol setelah kunjungan tersimpan, terbuka di
  WhatsApp petugas dengan pesan yang sudah tersusun. Tanpa API, tanpa biaya.
- **Rekap kebutuhan** — kebutuhan terbanyak, asal instansi, tujuan pemanfaatan, jenis
  layanan, tren bulanan, ragam data paling sering diminta, dan ekspor CSV.

## Konsultasi daring lewat Zoom

Sahabat data mengisi formulir — kebutuhan, topik, data diri — lalu memilih jadwal pada
hari kerja, paling cepat besok (H+1), dari jam sesi yang tersedia. Slot yang
sudah terisi tidak bisa dipilih. Ia menerima kode `KON-…` untuk memantau statusnya.
Petugas menetapkan narasumber (disarankan menurut keahlian), tautan Zoom terisi otomatis
dari profil narasumber, dan konfirmasi dikirim lewat WhatsApp dengan satu tombol.
Narasumber mendapat poin setelah sesi ditandai selesai.

## Asisten PST (chatbot)

Menjawab dari dua sumber saja — katalog dan jawaban baku — sehingga tidak pernah mengarang
angka: "ada data kemiskinan per desa?" dijawab dengan alasan metodologisnya dan ragam data
terdekat yang tersedia; "kenapa beda dengan Dukcapil?" dijawab dengan penjelasan baku;
kode tiket yang diketik langsung diperiksa. Untuk pegawai yang masuk, tersedia kartu jawaban
baku (alur melayani, kalimat penolakan) dengan tombol salin.

## Notifikasi WhatsApp

Tiket daring baru, permintaan konsultasi, jadwal ditetapkan, pertanyaan baru di papan tanya,
dan pengingat harian pukul 08.00 WITA dikirim ke grup WhatsApp pegawai melalui gateway
pilihan sendiri (Fonnte, Wablas, atau yang sejenis). Pengiriman berjalan di sisi basis data
(pg_net + pg_cron); kegagalan kirim tidak pernah menggagalkan pencatatan. Rinciannya di
[PANDUAN-PASANG.md](PANDUAN-PASANG.md#notifikasi-whatsapp).

## Yang bisa dilakukan sahabat data

Memeriksa status permintaan cukup dengan **kode tiket dan empat digit terakhir nomor HP** —
tanpa membuat akun. Akun tersedia sebagai pilihan bagi pengguna rutin, untuk melihat
seluruh riwayat dan mengajukan permintaan baru tanpa datang ke kantor.

## PINTAR Kukar — satu pintu, dua gerbang

Situs ini adalah **gerbang layanan** dari **PINTAR Kukar** (Pusat Informasi & Layanan
Statistik Terpadu), payung yang menyatukan dua situs BPS Kukar di satu domain:

| Situs | Peran | Alamat |
|---|---|---|
| Beranda PINTAR | pintu masuk: pencarian terpadu angka + data, angka sorotan, tautan layanan | `bpskukar.github.io/` |
| Indikator Strategis | gerbang **angka** (dashboard booklet, warna oranye) | `bpskukar.github.io/indikator-strategis-bpskukar/` |
| Katalog Data & PST (repositori ini) | gerbang **layanan** (katalog, tiket, konsultasi, asisten, ruang pegawai; warna biru BPS) | `bpskukar.github.io/katalog-data-bpskukar/` |

Yang mengikatnya:

- **Bilah atas bersama** (`assets/pintar.js`, berkas identik di tiga repositori): nama
  keluarga, menu silang, dan satu tombol **tema terang/gelap**. Karena satu domain, pilihan
  tema tersimpan bersama — ganti di satu situs, situs lain ikut, tab yang terbuka pun ikut.
- **Dari angka ke layanan, satu klik**: setiap kartu indikator punya tautan *Minta data
  lengkap* (membuka katalog dengan `?q=` terisi) dan *Tanya PST* (membuka asisten dengan
  `?tanya=` terisi).
- **Asisten PST menjawab angka**: "berapa IPM Kukar 2023?" dijawab dari isi indikator
  yang sama dengan yang tampil di dashboard, lengkap dengan deretnya.
- **Satu ruang kerja pegawai**: isi situs indikator (angka, grafik, narasi, teks) disunting
  dari tab **Indikator** di ruang pegawai, tersimpan di tabel `indikator_konten` dengan
  riwayat versi yang bisa dipulihkan. Situs indikator membacanya langsung; bila server
  tidak terjangkau ia memakai salinan terakhir, lalu `assets/data.js`-nya sendiri.
- **Satu sumber kunci**: situs indikator dan beranda membaca `assets/config.js` milik
  repositori ini lewat jalur `/katalog-data-bpskukar/assets/config.js`, jadi kunci Supabase
  cukup diisi di satu tempat.

## Susunan berkas

```
index.html              katalog publik
konsultasi.html         formulir konsultasi daring
admin.html              ruang pegawai
sahabat.html            portal konsumen data
assets/
  config.js             sambungan Supabase & klasifikasi baku BPS  ← satu-satunya yang perlu diisi
  pintar.js             bilah PINTAR Kukar + tema sinkron (identik di 3 repositori)
  indikator-admin.js    tab Indikator di ruang pegawai (penyunting isi situs indikator)
  katalog.js            isi katalog: 89 ragam data + 20 kecamatan
  cari.js               mesin pencocokan (dipakai ruang pegawai & chatbot)
  pengetahuan.js        jawaban baku chatbot & kartu jawaban petugas
  chat.js               widget asisten PST
  konsultasi.js         logika formulir konsultasi
  theme.css             sistem tampilan bersama
  app.js                lapisan data (Supabase, dengan cadangan mode demo)
  admin.js              logika ruang pegawai
  sahabat.js            logika portal sahabat data
supabase/schema.sql     tabel, tampilan, pemicu poin, keamanan baris (sudah memuat semua perbaikan)
supabase/perbaikan-01.sql  pembaruan 01 untuk proyek yang dibuat dengan schema.sql versi awal
supabase/perbaikan-02.sql  pembaruan 02: konsultasi daring, notifikasi WhatsApp, profil pegawai
supabase/perbaikan-03.sql  pembaruan 03: isi indikator strategis + riwayat versi, konsultasi H+1
PANDUAN-PASANG.md       cara memasang, menguji, dan memelihara
IDE-PENGEMBANGAN.md     usulan pengembangan lanjutan
```

Tidak ada proses build. Cukup `git push`, GitHub Pages menerbitkannya.

Tampilannya mengikuti gaya portal PST BPS (pst.bps.go.id): bilah putih berlogo, hero gradasi
biru dengan kotak pencarian, kartu layanan membulat, tombol pil biru, huruf Poppins. Logo resmi
diambil dari `assets/logo-bps.png` yang ditambahkan sendiri oleh kantor.

## Memasang

Ringkasnya: buat proyek Supabase gratis, jalankan `supabase/schema.sql`, isi dua baris
di `assets/config.js`, buat akun pegawai. Langkah rincinya ada di
[PANDUAN-PASANG.md](PANDUAN-PASANG.md).

Selama `config.js` masih kosong, situs berjalan dalam **mode demo** — seluruh fitur bisa
dicoba dengan `admin@bps.go.id` / `demo1234`, tetapi data hanya tersimpan di peramban
yang sedang dipakai. Berguna untuk memperagakan alurnya ke pimpinan lebih dulu.

## Sebelum katalog dipakai melayani

Semua baris sudah diperiksa (September 2026): lima baris yang semula bertanda *perlu cek*
telah dipastikan — agama (data sektoral Kemenag di Dalam Angka), suku/bahasa (Long Form SP2020,
tabulasi lewat PST), upah pekerja dan padi KSA (tabel menurut kabupaten/kota di laman BPS
Provinsi Kaltim), IKG (tabel di laman Kukar), serta inflasi (Kukar bukan cakupan IHK; empat
kab/kota Kaltim yang dihitung: Samarinda, Balikpapan, Berau, Penajam Paser Utara). Karena itu
`MODE_RANCANGAN` di `index.html` sudah `false`.

Yang tetap perlu dilakukan petugas secara berkala: bila BPS menerbitkan tabel baru atau
memindahkan tabel, perbarui tautannya di `assets/katalog.js` (pustaka `P` di bagian atas
berkas — satu tempat untuk semua tautan). Untuk menandai baris yang belum pasti, beri
`cek:true` dan nyalakan kembali `MODE_RANCANGAN`.

## Menambah ragam data

```js
{
  t:  "Kependudukan",
  n:  "Nama ragam data",
  lv: "Kecamatan",                    // Desa | Kecamatan | Kabupaten | —
  pd: "2020–2025",
  sm: "Proyeksi SP2020",
  st: "ada",                          // ada | mohon | prov | tidak | lain
  mn: "Produk › Publikasi",           // jejak menu di laman BPS
  ln: [L("https://…", "Judul publikasi")],
  d:  "Keterangan yang muncul saat baris dibuka."
}
```

## Sumber penyusunan

- Publikasi dan tabel statistik BPS Kabupaten Kutai Kartanegara — <https://kukarkab.bps.go.id>
- Standar Pelayanan Statistik Terpadu BPS dan panduan Survei Kebutuhan Data (VKD25)
- Undang-Undang Nomor 16 Tahun 1997 tentang Statistik, Pasal 21, 24, 36, dan 37
- Ragam keluaran baku Susenas, Sakernas, Podes, Sensus Penduduk 2020, Sensus Pertanian 2023,
  dan penghitungan Produk Domestik Regional Bruto

> **Catatan.** Halaman ini alat bantu internal PST, bukan publikasi resmi Badan Pusat Statistik.
> Untuk keperluan resmi, gunakan publikasi asli dari laman BPS. Ruang pegawai memuat nama dan
> kontak orang — perlakukan sesuai ketentuan perlindungan data pribadi, dan jangan sebarkan
> tautannya ke luar kantor.

## Lisensi

Kode sumber: MIT. Data statistik tetap milik dan bersumber dari Badan Pusat Statistik.
