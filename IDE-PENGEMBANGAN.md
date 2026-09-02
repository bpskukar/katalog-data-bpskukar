# Ide pengembangan PST BPS Kutai Kartanegara

Disusun dari pola permintaan di meja PST, Standar Pelayanan Statistik Terpadu BPS,
dan inovasi yang sudah berjalan di satker BPS kabupaten lain. Diurutkan dari yang
paling cepat memberi hasil.

---

## Bagian 1 — Menolong petugas piket besok pagi

### 1. Kartu jawaban baku untuk sepuluh pertanyaan tersering

Papan tanya menyelesaikan pertanyaan *baru*. Yang justru paling menghabiskan waktu adalah
pertanyaan *lama yang berulang*. Sepuluh pertanyaan berikut hampir pasti muncul tiap bulan
di PST mana pun, dan jawabannya selalu sama:

1. Kenapa jumlah penduduk BPS berbeda dengan angka Dukcapil?
2. Kenapa tidak ada angka kemiskinan per kecamatan atau per desa?
3. Bisakah minta nama dan alamat penduduk miskin untuk penyaluran bantuan?
4. Kenapa data tahun berjalan belum ada?
5. Apa bedanya Angka Partisipasi Murni dan Angka Partisipasi Kasar?
6. Kenapa PDRB per kapita Kukar besar tetapi masih ada penduduk miskin?
7. Bagaimana cara mendapat data mikro Susenas untuk skripsi?
8. Apakah perlu surat resmi untuk minta data?
9. Kenapa tidak ada inflasi Kutai Kartanegara?
10. Data ini sebenarnya milik dinas mana?

Tulis jawaban baku satu paragraf untuk masing-masing, simpan sebagai kartu yang bisa
disalin-tempel oleh petugas piket. **Sumbernya gratis:** setiap jawaban di papan tanya
yang ditandai "paling membantu" adalah calon kartu jawaban. Tinggal dipromosikan.

> Langkah pertama: buat berkas `assets/jawaban-baku.js` dengan sepuluh entri, tampilkan
> sebagai tab baru di ruang pegawai. Setengah hari kerja.

### 2. Jadwal piket yang terlihat di layar

Sistem sudah tahu siapa yang mencatat, tetapi belum tahu siapa yang *seharusnya* jaga.
Tambahkan tabel `jadwal_piket` (tanggal, pegawai, pendamping) dan tampilkan
"Hari ini yang bertugas: …" di kepala ruang pegawai. Manfaat sampingannya: rekap kehadiran
piket otomatis, dan kalau petugas piket lupa mencatat, ketahuan siapa yang perlu diingatkan.

### 3. Resi tiket lewat WhatsApp, tanpa API

Tombol yang membuka `https://wa.me/<nomor>?text=…` berisi kode tiket, ringkasan kebutuhan,
dan tautan halaman pengecekan. Petugas menekan sekali, pesan terkirim dari WhatsApp
petugas sendiri. Nol biaya, tidak perlu integrasi, langsung bisa dipakai besok.

### 4. Mode kios untuk tablet di meja PST

Sahabat data mengisi sendiri profilnya di tablet sambil menunggu — nama, instansi,
pemanfaatan — persis seperti buku tamu daring BPS Kota Bukittinggi. Petugas tinggal
menambahkan kebutuhan dan hasil. Antrean lebih cepat, salah ketik nama berkurang,
dan pengisian profil jadi lebih lengkap karena orangnya sendiri yang mengisi.

---

## Bagian 2 — Menaikkan mutu layanan

### 5. Halaman "angka terkini Kukar" dengan tanggal rilis berikutnya

Satu halaman berisi indikator strategis — IPM, persentase penduduk miskin, TPT,
pertumbuhan ekonomi, jumlah penduduk — lengkap dengan **tanggal rilis terakhir dan
jadwal rilis berikutnya**. Laman BPS Kukar tidak punya halaman indikator strategis,
jadi pertanyaan "kapan datanya keluar" selalu jatuh ke petugas. Jadwalnya sendiri
sangat teratur dan bisa diisi sekali: Kabupaten Dalam Angka akhir Februari,
PDRB April, Kecamatan Dalam Angka 26 September, Kesejahteraan Rakyat dan
Potensi Desa Desember.

### 6. Ajakan mengisi Survei Kebutuhan Data di akhir layanan

Setelah tiket ditutup, tampilkan kode QR menuju kuesioner SKD. Isian profil di buku tamu
sudah mengikuti Blok I VKD25, jadi sahabat data tidak perlu mengulang jawaban yang sama.
Ini menaikkan tingkat respons SKD sekaligus Indeks Kepuasan Konsumen dan Indeks Persepsi
Anti Korupsi — dua angka yang ikut dinilai dalam kinerja satker.

### 7. Pemberitahuan otomatis saat status tiket berubah

Supabase Edge Function yang mengirim surel begitu status berpindah ke "selesai".
Sahabat data tidak perlu memeriksa manual, dan petugas tidak perlu menelepon.
Perlu satu layanan pengirim surel (Resend atau SMTP kantor).

### 8. Ukur waktu penyelesaian sungguhan

Tenggat sudah dihitung otomatis dari Standar Pelayanan. Langkah berikutnya:
bandingkan tenggat dengan waktu selesai sungguhan, lalu tampilkan
"rata-rata penyelesaian 2,3 hari kerja, 91 persen tepat waktu" di tab Rekap.
Angka ini yang dicari saat penyusunan laporan kinerja dan penilaian Zona Integritas.

### 9. Chatbot WhatsApp, dimulai dari yang paling sederhana

BPS Kabupaten Sanggau punya KAWAN dan BPS Kuantan Singingi punya CARANO — keduanya
chatbot WhatsApp untuk layanan statistik. Tidak perlu langsung secanggih itu.
Tahap pertama cukup: nomor WhatsApp layanan dengan balasan otomatis berisi tautan
katalog dan tiga pertanyaan tersering. Tahap berikutnya baru pencarian katalog di
dalam percakapan. Semua interaksi tetap tercatat di basis data yang sama.

---

## Bagian 3 — Langkah strategis

### 10. Perluas katalog ke data sektoral pemerintah daerah

Empat belas baris di katalog ini berstatus "data sektoral" — ada di publikasi BPS,
tetapi sumber resminya di dinas. Sekarang katalog hanya bisa bilang "bukan milik BPS".
Kalau ditambahi **nama dinas, unit, dan kontak walidata**-nya, PST berubah dari
tempat menolak permintaan menjadi tempat mengarahkan permintaan.

Ini juga menopang tugas pembinaan statistik sektoral: proses pengisiannya memaksa
pemetaan siapa memegang data apa di lingkungan pemda, yang persis dibutuhkan untuk
penilaian Evaluasi Penyelenggaraan Statistik Sektoral.

### 11. Rekap kebutuhan yang tak terpenuhi sebagai usulan resmi ke atas

Kolom yang paling berharga di tab Rekap justru bukan data yang sering diminta,
melainkan **permintaan yang tidak bisa dipenuhi**. Kumpulkan setahun, kelompokkan,
lalu kirimkan sebagai usulan kebutuhan data daerah ke BPS Provinsi Kalimantan Timur.
Jarang ada satker kabupaten yang membawa bukti kuantitatif seperti ini. Bila
misalnya "kemiskinan tingkat kecamatan" muncul empat puluh kali setahun, itu argumen
nyata untuk kajian estimasi area kecil, bukan sekadar keluhan.

### 12. Forum Sahabat Data Kukar

Pengguna rutin — Bappeda, Dinas Sosial, kampus, media — diberi akun tetap dan diundang
dua kali setahun untuk membahas kebutuhan data mendatang. Layanan berubah dari melayani
permintaan satu per satu menjadi menyiapkan kebutuhan sebelum diminta. Daftar undangannya
sudah otomatis tersedia: sepuluh instansi teratas di tab Rekap.

### 13. Poin keaktifan sebagai komponen penilaian, bukan sekadar papan skor

Papan peringkat hanya berguna kalau ada akibatnya. Usulkan agar poin triwulanan menjadi
salah satu bahan pertimbangan penilaian kinerja pegawai, dengan sertifikat "Petugas PST
Terbaik" tiap triwulan. Jaga bobotnya tetap wajar — poin mengukur keaktifan membantu,
bukan mutu jawaban, dan jangan sampai orang mengejar angka dengan mencatat kunjungan fiktif.
Karena itu poin jawaban terbaik (7) sengaja dibuat jauh lebih besar daripada poin mencatat (2).

### 14. Daftarkan sebagai inovasi pelayanan publik

Sistem ini memenuhi kriteria yang biasa dinilai: memecahkan masalah nyata, terukur,
dapat direplikasi satker lain, dan berbiaya nyaris nol. Kabupaten lain sudah lebih dulu
mendaftarkan buku tamu daring dan chatbot mereka. Yang membedakan Kukar: katalognya
memuat **data yang tidak tersedia beserta alasannya** — pendekatan yang belum umum,
dan justru itu bagian yang paling menghemat waktu petugas.

---

## Yang sebaiknya belum dikerjakan

**Visualisasi dan dasbor publik yang cantik.** Menggoda, tetapi tidak memecahkan masalah
yang sedang dihadapi. Petugas piket tidak kesulitan menggambar grafik; ia kesulitan
menjawab "apakah datanya ada".

**Pencarian dengan kecerdasan buatan di dalam katalog.** Pencocokan kata kunci yang ada
sekarang sudah menangani kalimat sehari-hari dengan baik. Tambahan model bahasa berarti
biaya, ketergantungan jaringan, dan risiko jawaban mengarang — hal terakhir yang boleh
terjadi di layanan statistik resmi.

**Menambah ragam data sampai ratusan baris.** Katalog berisi 83 baris yang akurat jauh
lebih berguna daripada 300 baris yang separuhnya belum diperiksa. Kekeliruan di sini
berakibat langsung: orang datang menagih data yang sebenarnya tidak ada.
