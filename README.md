# Katalog Ketersediaan Data — BPS Kabupaten Kutai Kartanegara

Daftar telusur ragam data yang dapat diperoleh dari BPS Kabupaten Kutai Kartanegara, beserta
level wilayah terendah yang tersedia, periode yang tercakup, sumber survei, dan cara memperolehnya.

🔗 **Demo:** https://mrafiraamadhan.github.io/katalog-data-kukar/

> ⚠️ **Status saat ini: rancangan awal.** Isi katalog belum diverifikasi petugas.
> Baca bagian [Sebelum dipublikasikan](#sebelum-dipublikasikan) di bawah.

---

## Latar belakang

Alur permintaan data saat ini punya dua langkah yang sebenarnya bisa dihapus:

```
butuh data → tidak tahu BPS punya atau tidak → tanya lewat WhatsApp/datang ke PST
           → petugas menjawab → baru mengajukan permintaan resmi
```

Dua langkah di tengah itu murni gesekan. Akibatnya petugas menjelaskan hal yang sama berulang kali,
dan sebagian permintaan yang masuk sudah keliru sejak awal — meminta data sampai level desa untuk
indikator yang hanya representatif sampai kabupaten, atau meminta angka tahun berjalan yang belum dirilis.

Katalog ini memindahkan jawaban itu ke depan, sehingga pengguna bisa memeriksa sendiri sebelum bertanya.

## Yang membedakan dari daftar data biasa

Katalog ini **juga memuat data yang tidak tersedia**, lengkap dengan alasannya. Banyak katalog data
pemerintah hanya memuat yang ada, sehingga pengguna tetap bingung ketika yang dicari tidak ketemu:
belum diunggah, tidak dikumpulkan, atau memang tidak boleh dibuka?

Empat status yang dipakai:

| Status | Arti |
|---|---|
| **Unduh di web** | Sudah diterbitkan, bisa diunduh sendiri tanpa mengajukan permintaan |
| **Permintaan resmi** | Tersedia tetapi belum berbentuk siap unduh; ajukan lewat PST |
| **Tidak tersedia** | Tidak dikumpulkan sampai level itu, atau dilindungi kerahasiaan UU No. 16 Tahun 1997 |
| **Data sektoral** | Dihimpun perangkat daerah, bukan BPS; sumber resminya di dinas terkait |

## Fitur

- **Pencarian** menyeluruh atas nama data, topik, sumber survei, dan keterangannya
- **Penyaring** berdasarkan topik dan level wilayah terendah
- **Rincian per baris** yang menjelaskan cakupan dan batasan datanya
- **Ringkasan angka** di kepala halaman
- **Mode gelap** mengikuti preferensi peramban
- Satu berkas HTML, tanpa peladen dan tanpa proses build

## Cakupan saat ini

52 ragam data pada sembilan topik: kependudukan, ketenagakerjaan, kemiskinan dan pemerataan,
pembangunan manusia, ekonomi dan PDRB, pertanian, potensi desa dan wilayah,
pendidikan-kesehatan-perumahan, serta data terbatas.

## Sebelum dipublikasikan

Katalog ini disusun dari publikasi BPS Kukar yang sudah terbit dan pola keluaran baku survei BPS.
**Isinya harus diverifikasi petugas lebih dulu**, karena kesalahan di sini berakibat langsung:
pengguna datang menagih data yang sebenarnya tidak ada.

**Langkah verifikasi:**

1. Buka `index.html`, cari array `DATA` di dalam `<script>`.
2. Periksa baris yang ditandai `cek: true` — enam baris, ditampilkan dengan penanda **PERLU CEK**.
   Baris inilah yang paling rawan keliru, terutama soal Indeks Harga Konsumen dan level terendah
   data pertanian.
3. Periksa juga kolom `lv` (level terendah) dan `pd` (periode) pada baris lain, khususnya seri
   tahun yang tersedia.
4. Setelah semua dipastikan, hapus `cek: true` pada baris yang sudah benar.
5. Ubah `var MODE_RANCANGAN = true;` menjadi `false`. Spanduk rancangan dan penanda PERLU CEK
   akan hilang dengan sendirinya.

**Saran cakupan:** jangan kejar lengkap. Katalog berisi 50 baris yang akurat jauh lebih berguna
daripada 300 baris yang separuhnya belum diperiksa. Tambahkan ragam data baru hanya setelah
benar-benar dipastikan.

## Cara menambah ragam data

Tambahkan objek baru pada array `DATA`:

```js
{
  t:  "Kependudukan",           // topik — tombol saring dibuat otomatis
  n:  "Nama ragam data",
  lv: "Kecamatan",              // Desa | Kecamatan | Kabupaten | —
  pd: "2020–2025",              // periode tersedia
  sm: "Proyeksi SP2020",        // sumber survei atau penghitungan
  st: "ada",                    // ada | mohon | tidak | lain
  cek: true,                    // opsional, tandai bila belum diverifikasi
  d:  "Keterangan yang muncul saat baris diklik."
}
```

## Sumber penyusunan

- Daftar publikasi BPS Kabupaten Kutai Kartanegara — <https://kukarkab.bps.go.id>
- Ragam keluaran baku Susenas, Sakernas, Podes, Sensus Penduduk 2020, Sensus Pertanian 2023,
  dan penghitungan Produk Domestik Regional Bruto
- Booklet Indikator Strategis Kabupaten Kutai Kartanegara Triwulan I dan II 2026

> **Catatan:** Halaman ini bukan publikasi resmi Badan Pusat Statistik. Untuk keperluan resmi,
> gunakan publikasi asli dari laman BPS.

## Lisensi

Kode sumber: MIT. Data statistik tetap milik dan bersumber dari Badan Pusat Statistik.
