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

## Isi katalog

83 ragam data pada sebelas topik, masing-masing dengan level wilayah terendah, periode,
sumber survei, letak di menu laman BPS, dan tautan langsung ke publikasi atau tabelnya.
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
  menjawab 3, jawaban terbaik 7, menuntaskan tiket 5.
- **Rekap kebutuhan** — kebutuhan terbanyak, asal instansi, tujuan pemanfaatan, jenis
  layanan, tren bulanan, ragam data paling sering diminta, dan ekspor CSV.

## Yang bisa dilakukan sahabat data

Memeriksa status permintaan cukup dengan **kode tiket dan empat digit terakhir nomor HP** —
tanpa membuat akun. Akun tersedia sebagai pilihan bagi pengguna rutin, untuk melihat
seluruh riwayat dan mengajukan permintaan baru tanpa datang ke kantor.

## Susunan berkas

```
index.html              katalog publik
admin.html              ruang pegawai
sahabat.html            portal konsumen data
assets/
  config.js             sambungan Supabase & klasifikasi baku BPS  ← satu-satunya yang perlu diisi
  katalog.js            isi katalog: 83 ragam data + 20 kecamatan
  theme.css             sistem tampilan bersama
  app.js                lapisan data (Supabase, dengan cadangan mode demo)
  admin.js              logika ruang pegawai
  sahabat.js            logika portal sahabat data
supabase/schema.sql     tabel, tampilan, pemicu poin, keamanan baris
PANDUAN-PASANG.md       cara memasang, menguji, dan memelihara
IDE-PENGEMBANGAN.md     usulan pengembangan lanjutan
```

Tidak ada proses build. Cukup `git push`, GitHub Pages menerbitkannya.

## Memasang

Ringkasnya: buat proyek Supabase gratis, jalankan `supabase/schema.sql`, isi dua baris
di `assets/config.js`, buat akun pegawai. Langkah rincinya ada di
[PANDUAN-PASANG.md](PANDUAN-PASANG.md).

Selama `config.js` masih kosong, situs berjalan dalam **mode demo** — seluruh fitur bisa
dicoba dengan `admin@bps.go.id` / `demo1234`, tetapi data hanya tersimpan di peramban
yang sedang dipakai. Berguna untuk memperagakan alurnya ke pimpinan lebih dulu.

## Sebelum katalog dipakai melayani

Lima baris masih ditandai **PERLU CEK** dan harus dipastikan petugas lebih dulu:

1. Penduduk menurut agama, suku, dan bahasa — kerincian yang boleh disajikan
2. Rata-rata upah pekerja — tahun terakhir yang dapat dilayani
3. Indeks Ketimpangan Gender — tahun terakhir yang tersedia di tingkat kabupaten
4. Inflasi dan Indeks Harga Konsumen — apakah Kukar sudah masuk cakupan penghitungan
5. Luas panen dan produksi padi — level terendah yang dapat dilayani

Cara memeriksanya: buka `assets/katalog.js`, cari `cek: true`, betulkan isinya, lalu hapus
penanda itu. Setelah semuanya beres, ubah `MODE_RANCANGAN` menjadi `false` di `index.html`
agar spanduk rancangan hilang.

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
