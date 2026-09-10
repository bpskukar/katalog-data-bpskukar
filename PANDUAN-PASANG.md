# Panduan pasang

Waktu yang dibutuhkan sekitar 30 menit. Tidak perlu memasang apa pun di komputer —
semuanya lewat peramban.

Selama `assets/config.js` masih kosong, situs tetap berjalan dalam **mode demo**:
semua fitur bisa dicoba, tetapi catatan hanya tersimpan di peramban yang sedang dipakai
dan tidak terlihat pegawai lain. Cocok untuk memperagakan alur ke pimpinan sebelum
meminta izin. Masuk dengan `admin@bps.go.id` / `demo1234`.

---

## 1. Buat proyek Supabase

1. Buka <https://supabase.com>, daftar (gratis, boleh pakai akun GitHub).
2. **New project** → beri nama `pst-kukar`, pilih region **Southeast Asia (Singapore)**,
   buat sandi basis data dan simpan baik-baik.
3. Tunggu sekitar dua menit sampai proyek selesai disiapkan.

Paket gratis Supabase memberi 500 MB basis data dan 50.000 pengguna aktif per bulan.
Untuk beban PST kabupaten, itu berlebih.

## 2. Jalankan skema basis data

1. Di menu kiri pilih **SQL Editor** → **New query**.
2. Buka berkas `supabase/schema.sql` di repositori ini, salin **seluruh isinya**, tempel.
3. Tekan **Run**. Bila muncul `Success. No rows returned`, berarti berhasil.

Berkas itu membuat enam tabel, tiga tampilan, pemicu poin otomatis, penomoran tiket,
dan kebijakan keamanan baris. Aman dijalankan ulang bila nanti ada perubahan.

## 3. Sambungkan situs ke Supabase

1. Di Supabase: **Project Settings** → **API**.
2. Salin **Project URL** dan **anon public key**.
3. Buka `assets/config.js`, isi dua baris pertama:

   ```js
   SUPABASE_URL: "https://abcdefgh.supabase.co",
   SUPABASE_ANON_KEY: "eyJhbGciOi...",
   ```

Kunci `anon` memang dirancang untuk terlihat publik. Yang menjaga data adalah
kebijakan Row Level Security di langkah 2, bukan kerahasiaan kunci ini.
Jangan pernah menempelkan `service_role key` di sini.

## 4. Buat akun pegawai

Untuk setiap pegawai yang boleh masuk ruang pegawai:

1. Supabase → **Authentication** → **Users** → **Add user** → **Create new user**.
   Isi surel dinas dan sandi awal, centang **Auto Confirm User**.
2. Kembali ke **SQL Editor**, jalankan sekali per orang:

   ```sql
   insert into public.pegawai (id, nama, nip, jabatan, peran)
   select id, 'Muhammad Rafi Ramadhan', '199xxxxx', 'Statistisi Ahli Pertama', 'admin'
   from auth.users where email = 'rafi@bps.go.id'
   on conflict (id) do update set nama = excluded.nama, peran = excluded.peran;
   ```

   `peran` diisi `admin` untuk yang boleh menambah pegawai lain, `pegawai` untuk sisanya.

Orang yang tidak punya baris di tabel `pegawai` tidak akan pernah bisa membuka
ruang pegawai, walaupun punya akun Supabase.

## 5. Atur pendaftaran sahabat data

Supabase → **Authentication** → **Providers** → **Email**:

- **Confirm email** menyala berarti sahabat data harus mengklik tautan di surelnya
  sebelum bisa masuk. Lebih aman, tetapi mensyaratkan pengaturan pengirim surel.
- Untuk awal, boleh dimatikan supaya pendaftaran langsung jadi. Nyalakan lagi
  setelah SMTP kantor disiapkan di **Project Settings → Authentication → SMTP**.

Sahabat data yang hanya ingin memantau tiket **tidak perlu akun sama sekali** —
cukup kode tiket dan empat digit terakhir nomor HP.

## 6. Terbitkan ke GitHub Pages

```bash
git add .
git commit -m "Sistem PST: buku tamu, papan tanya, rekap, portal sahabat data"
git push
```

Repositori ini sudah memakai GitHub Pages. Setelah `push`, tunggu satu menit lalu buka:

- Katalog · <https://bpskukar.github.io/katalog-data-bpskukar/>
- Ruang pegawai · <https://bpskukar.github.io/katalog-data-bpskukar/admin.html>
- Sahabat data · <https://bpskukar.github.io/katalog-data-bpskukar/sahabat.html>

## 7. Uji sebelum dipakai betulan

Lakukan berurutan, jangan dilewat:

1. Masuk ruang pegawai dengan akun sendiri. Kalau gagal, periksa langkah 4.
2. Catat satu kunjungan percobaan. Kode tiket harus muncul.
3. Buka halaman sahabat data di **peramban lain atau mode penyamaran**, masukkan kode
   tiket itu dan empat digit terakhir nomor HP yang tadi diisi. Harus ketemu.
4. Coba dengan empat digit yang salah. Harus ditolak.
5. Minta satu pegawai lain masuk. Ia harus melihat tiket yang Anda buat tadi.
6. Angkat satu tiket ke papan tanya, minta pegawai itu menjawab, lalu tandai jawabannya
   paling membantu. Poinnya harus muncul di papan peringkat.
7. Hapus data percobaan lewat **Table Editor** di Supabase sebelum dipakai sungguhan.

---

## Bila jaringan kantor memblokir cdn.jsdelivr.net

Halaman akan menampilkan spanduk merah **"Tidak tersambung ke basis data"**.
Perbaikannya: unduh pustaka Supabase sekali, simpan ke dalam repositori.

1. Dari komputer yang bisa mengakses internet luar, unduh
   <https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js>
2. Simpan sebagai `assets/supabase.js` di repositori ini.
3. Di `admin.html` dan `sahabat.html`, ganti baris

   ```html
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
   ```

   menjadi

   ```html
   <script src="assets/supabase.js"></script>
   ```

Huruf pada halaman diambil dari Google Fonts. Bila itu juga diblokir, tampilan tetap
terbaca — peramban akan memakai huruf bawaan sistem.

## Logo resmi di bilah atas

Bilah atas menampilkan logo dari berkas `assets/logo-bps.png`. Berkas itu **tidak disertakan**
di repositori — ambil dari aset resmi kantor (logo BPS atau logo BPS Kabupaten Kutai Kartanegara),
simpan sebagai PNG dengan latar transparan, tinggi sekitar 80–120 piksel, lalu unggah ke folder
`assets/` dengan nama persis `logo-bps.png`. Selama berkasnya belum ada, hanya tulisan
"PST BPS Kutai Kartanegara" yang tampil — tidak ada yang rusak.

## Memasang pembaruan

Setiap kali ada berkas baru di repositori, ada dua hal yang mungkin perlu diperbarui:
**berkas situs** (unggah ulang ke GitHub) dan **basis data** (jalankan skrip SQL bila ada).

| Pembaruan | Berkas situs | Basis data |
|---|---|---|
| Perbaikan 01 — keamanan & keadilan poin, nama petugas di daftar tiket, tautan bisa diklik | `assets/*.js`, `assets/theme.css` | jalankan `supabase/perbaikan-01.sql` sekali |
| Perbaikan 02 — chatbot, konsultasi daring (Zoom), notifikasi WhatsApp, profil pegawai | semua `.html`, `assets/*` | jalankan `supabase/perbaikan-02.sql` sekali, lalu ikuti bagian *Konsultasi daring* dan *Notifikasi WhatsApp* di bawah |
| Tampilan portal PST — bilah putih berlogo, hero biru dengan pencarian, kartu layanan, huruf Poppins | semua `.html`, `assets/theme.css`, `assets/app.js`, `assets/admin.js` | tidak ada |
| Pembaruan 03 — PINTAR Kukar: bilah bersama + tema gelap, tab Indikator di ruang pegawai, asisten menjawab angka, konsultasi H+1 | semua `.html`, `assets/*` (baru: `pintar.js`, `indikator-admin.js`) — **plus** repositori indikator dan repositori beranda `bpskukar.github.io` | jalankan `supabase/perbaikan-03.sql` sekali, lalu ikuti bagian *PINTAR Kukar* di bawah |
| Pembaruan 04 — angka indikator ditarik otomatis dari Web API BPS (jadwal harian), panel *Sumber otomatis* di tab Indikator | `admin.html`, `assets/app.js`, `assets/indikator-admin.js`, `assets/sumber-otomatis.js` — **plus** `assets/app.js` & `assets/data.js` repositori indikator | jalankan `supabase/perbaikan-04.sql`, aktifkan ekstensi **http**, lalu ikuti bagian *Pembaruan otomatis dari Web API BPS* |
| Pembaruan 05 — pencarian mengenali singkatan huruf kecil, satu tanda PINTAR di semua tempat, konsultasi 30 menit & paling banyak dua topik | `konsultasi.html`, `assets/*.js`, `assets/og-katalog.png` — **plus** repositori indikator & beranda | jalankan `supabase/perbaikan-05.sql` |
| Pembaruan 06 — alasan untuk kembali: Angka hari ini & kartu bagikan, Terbit baru + agenda rilis, Glosarium, Bandingkan kab/kota se-Kaltim, pasang sebagai aplikasi (PWA) | `glosarium.html`, `admin.html`, `assets/*` (baru: `glosarium.js`, `terbitan-awal.js`, `terbitan-admin.js`) — **plus** repositori indikator (`kartu.js`, bagian Bandingkan) & beranda (`manifest.webmanifest`, `sw.js`, `luring.html`, `assets/ikon/`) | jalankan `supabase/perbaikan-06.sql`, lalu ikuti bagian *Terbit baru & agenda* di bawah |

Cara menjalankan skrip pembaruan basis data: buka SQL Editor → New query → tempel seluruh
isi berkasnya → Run. Semua skrip pembaruan aman dijalankan ulang dan tidak menghapus data.
Proyek yang **baru** dibuat cukup menjalankan `schema.sql` — isinya sudah memuat semua perbaikan.
Proyek yang **sudah berjalan** menjalankan skrip perbaikannya berurutan (`perbaikan-01.sql`,
`perbaikan-02.sql`, lalu `perbaikan-03.sql`) — jangan menjalankan ulang `schema.sql`, karena tabel
yang sudah ada akan dilewati sehingga sebagian perubahan tidak diterapkan.

> ⚠️ **Setiap kali mengunggah pembaruan, `assets/config.js` ikut tertimpa.** Berkas itu satu-satunya
> yang memuat kunci Supabase. Setelah mengunggah, buka kembali berkas itu di GitHub dan pastikan
> `SUPABASE_ANON_KEY` masih terisi. Bila kosong, situs kembali ke mode demo tanpa peringatan apa pun
> selain spanduk kuning — dan catatan petugas hari itu tidak masuk ke server.

## Konsultasi daring (Zoom)

Tidak ada integrasi API Zoom — sengaja, supaya tidak bergantung pada akun Zoom berbayar
atau persetujuan aplikasi. Alurnya:

1. **Tiap pegawai yang bisa jadi narasumber** masuk ruang pegawai → tab **Profil saya** →
   centang topik keahliannya, tempel **tautan Zoom pribadi** (Zoom → Profile → Personal
   Meeting ID → *Copy Invitation*, ambil tautannya). Tanpa ini, ia tetap bisa dipilih,
   tetapi tautan Zoom harus diketik manual tiap kali.
2. Sahabat data mengisi formulir di `konsultasi.html`, memilih jadwal paling cepat H+1 (besok)
   hari kerja. Ia menerima kode `KON-…`.
3. Petugas membuka tab **Konsultasi daring**, menetapkan narasumber (yang keahliannya cocok
   ditandai ✓ dan diurutkan teratas; yang sudah ada sesi di jam itu tidak bisa dipilih),
   tautan Zoom terisi otomatis dari profil narasumber, simpan, lalu klik **Kirim konfirmasi
   lewat WhatsApp** — pesan berisi jadwal, narasumber, dan tautan sudah tersusun.
4. Sahabat data memantau lewat kode KON + 4 digit HP; tautan Zoom baru terlihat setelah
   status *Dijadwalkan*.
5. Setelah sesi, petugas menandai *Selesai* → narasumber mendapat 5 poin (sekali per sesi).

Mengubah jam sesi, durasi, atau batas H+n: SQL Editor →

```sql
update public.pengaturan set nilai = '09:00,10:00,11:00,13:30,14:30' where kunci = 'konsultasi_jam';
update public.pengaturan set nilai = '45' where kunci = 'konsultasi_durasi';
update public.pengaturan set nilai = '1'  where kunci = 'konsultasi_min_hari';   -- 1 = boleh untuk besok
update public.pengaturan set nilai = '30' where kunci = 'konsultasi_maks_hari';
```

Perubahan langsung berlaku di formulir tanpa mengubah kode.

## Notifikasi WhatsApp

Sistem mengirim pesan ke **satu tujuan** (disarankan grup WhatsApp pegawai PST) saat:
tiket daring masuk dari sahabat data, permintaan konsultasi masuk, jadwal konsultasi
ditetapkan, pertanyaan baru di papan tanya, dan pengingat harian pukul 08.00 WITA bila ada
tiket lewat tenggat atau konsultasi belum dijadwalkan.

**Kenapa grup, bukan 34 nomor.** Satu pesan ke grup jauh lebih murah daripada 34 pesan, tidak
membuat nomor pengirim dianggap spam, dan grup menciptakan tanggung jawab bersama — siapa
yang membalas "saya ambil" terlihat semua orang.

**Pilih penyedia.** WhatsApp tidak menyediakan cara gratis mengirim pesan dari sistem.
Dua jalan yang lazim:

| | Gateway pihak ketiga (Fonnte, Wablas, dsb.) | WhatsApp Business Platform (Meta) |
|---|---|---|
| Biaya | ± Rp 50–150 ribu/bulan | verifikasi bisnis + biaya per percakapan |
| Pemasangan | 15 menit: daftar, pindai QR dengan nomor kantor | berhari-hari: verifikasi Meta, template pesan harus disetujui |
| Status | tidak resmi; nomor **bisa diblokir** WhatsApp bila dianggap spam | resmi |
| Cocok untuk | notifikasi internal ke grup pegawai, volume kecil | layanan publik berskala, kirim ke banyak warga |

Untuk notifikasi internal ke grup pegawai, gateway pihak ketiga dengan **nomor khusus
kantor (bukan nomor pribadi)** adalah pilihan yang wajar. Jangan pernah memakai nomor pribadi
pegawai sebagai pengirim.

**Langkah pemasangan (contoh Fonnte):**

1. Daftar di penyedia, sambungkan nomor WhatsApp khusus kantor dengan memindai QR, salin
   **token**-nya.
2. Buat grup WhatsApp "PST BPS Kukar", masukkan nomor kantor itu dan semua pegawai.
3. Ambil **ID grup** — di Fonnte ada menu *Get Group ID*; bentuknya `1203630xxxxxxx@g.us`.
4. Supabase → **Database → Extensions** → aktifkan **pg_net** (pengirim HTTP) dan
   **pg_cron** (penjadwal pengingat harian).
5. Jalankan ulang `supabase/perbaikan-02.sql` sekali (supaya jadwal pengingat terdaftar
   setelah pg_cron aktif), lalu isi pengaturannya:

   ```sql
   update public.pengaturan set nilai = 'https://api.fonnte.com/send' where kunci = 'wa_url';
   update public.pengaturan set nilai = 'TOKEN-DARI-FONNTE'            where kunci = 'wa_token';
   update public.pengaturan set nilai = '1203630xxxxxxx@g.us'          where kunci = 'wa_target';
   update public.pengaturan set nilai = 'fonnte'                       where kunci = 'wa_format';
   ```

   Untuk Wablas: `wa_url` = `https://<domain>.wablas.com/api/send-message`, `wa_format` = `wablas`.
   Penyedia lain yang menerima JSON `{target, message}` dengan header `Authorization: Bearer …`:
   `wa_format` = `generic`.

6. Uji kirim:

   ```sql
   select public.kirim_wa('uji', 'Halo dari sistem PST — notifikasi aktif.');
   select jenis, keterangan, request_id, dibuat from public.notifikasi_log order by id desc limit 5;
   ```

   Bila `keterangan` kosong dan `request_id` terisi, permintaan sudah dikirim ke gateway.
   Kalau pesan tidak sampai padahal `request_id` ada, cek hasilnya di `net._http_response`
   (Table Editor → schema `net`) — biasanya token salah atau nomor belum tersambung.

Token tersimpan di tabel `pengaturan` yang tertutup Row Level Security tanpa kebijakan apa pun,
sehingga tidak terbaca dari peramban. Yang bisa membacanya hanya fungsi pengirim di sisi
basis data.

**Mematikan sementara:** kosongkan `wa_url` (`update public.pengaturan set nilai = '' where kunci = 'wa_url'`).
Semua kejadian tetap tercatat di `notifikasi_log` dengan keterangan "belum diatur".

## Chatbot (asisten PST)

Tidak memakai model bahasa — jawabannya berasal dari dua sumber saja: `assets/katalog.js`
(89 ragam data) dan `assets/pengetahuan.js` (jawaban baku). Karena itu ia tidak pernah
mengarang angka, dan tidak butuh server maupun biaya.

Menambah atau mengubah jawaban: buka `assets/pengetahuan.js`, tiap butir punya `kunci`
(kata pemicu), `jawab`, dan `tautan`. Butir dengan `untuk: "petugas"` hanya muncul untuk
pegawai yang sudah masuk, dan di sana ada tombol **salin jawaban** — itulah "kartu jawaban
baku" untuk petugas piket. Setelah mengubah, unggah berkasnya ke GitHub; tidak perlu
menyentuh basis data.

## PINTAR Kukar (pembaruan 03)

PINTAR Kukar menyatukan tiga situs di satu domain `bpskukar.github.io`: beranda pintu
(repositori `bpskukar.github.io`), Indikator Strategis, dan Katalog Data ini. Urutan pemasangan:

1. **Basis data** — SQL Editor → New query → tempel seluruh isi `supabase/perbaikan-03.sql`
   → Run. Ini membuat tabel `indikator_konten` + `indikator_riwayat` dan mengubah
   `konsultasi_min_hari` menjadi 1.
2. **Repositori katalog (ini)** — unggah semua berkas pembaruan. Periksa `assets/config.js`
   masih berisi kunci.
3. **Repositori indikator** (`indikator-strategis-bpskukar`) — unggah berkas pembaruannya
   (`index.html`, `assets/*`). Situs itu kini membaca `/katalog-data-bpskukar/assets/config.js`
   dan tabel `indikator_konten`; selama tabel kosong ia memakai `assets/data.js`-nya sendiri.
4. **Repositori beranda** — buat repositori **baru** bernama persis `bpskukar.github.io`
   (publik), unggah `index.html`, `assets/pintar.js`, `README.md`. GitHub Pages untuk
   repositori bernama itu otomatis tayang di `https://bpskukar.github.io/` (cek Settings →
   Pages bila belum: Source = Deploy from a branch, Branch = main, folder = / root).
5. **Isi awal indikator** — buka Ruang Pegawai → tab **Indikator**. Karena server masih
   kosong, penyunting menampilkan isi dari `data.js` situs indikator. Tekan
   **Simpan & terbitkan** — jadilah versi 1. Sejak itu, semua koreksi angka dilakukan di tab
   ini, bukan dengan mengedit `data.js`.

Cara kerja tab Indikator:

- Kiri: daftar bagian (kartu indikator, sorotan, deret kemiskinan/PDRB/IPM, kartogram,
  teks, narasi, rekomendasi, sumber). Kanan: tabel/formulir bagian yang dipilih.
- **Pratinjau** membuka situs indikator dengan isi yang sedang disunting (hanya terlihat di
  peramban ini, belum terbit). **Simpan & terbitkan** menulis ke server; situs indikator dan
  beranda menampilkannya begitu dimuat ulang.
- **Riwayat versi** menampilkan 60 simpanan terakhir (siapa, kapan, catatan) dengan tombol
  **Pulihkan** — isi versi lama dimuat ke penyunting, lalu disimpan sebagai versi baru.
- **Unduh/Unggah JSON** untuk cadangan atau menyunting massal.
- Teks boleh memakai `**tebal**`. Warna diisi kode `#rrggbb`. Nilai angka memakai titik
  desimal.
- Hanya pegawai aktif yang bisa menyimpan (dijaga RLS dan pemicu di basis data); siapa pun
  bisa membaca isi terbit karena memang data publik.

Tema terang/gelap: tombolnya di bilah PINTAR (kanan atas) di ketiga situs. Pilihan tersimpan
di peramban pengguna dengan kunci `kukar-theme`; karena satu domain, ketiga situs mengikutinya.

Bila nama repositori diubah, sesuaikan tiga hal: objek `TAUTAN` di `assets/pintar.js` (lalu
salin ke ketiga repositori), tag `<script src="/katalog-data-bpskukar/assets/config.js">` di
situs indikator dan beranda, serta nilai `indikator_url`/`pintu_url`/`situs_url` di tabel
`pengaturan`.

## Pembaruan otomatis dari Web API BPS (pembaruan 04)

Angka di situs Indikator Strategis bisa ditarik langsung dari **tabel dinamis Web API BPS**
sehingga pegawai tidak perlu mengetik ulang setiap rilis. Pembagiannya:

| Otomatis (dari API, tiap hari 02.00 WITA) | Tetap manual (Penyunting isi) |
|---|---|
| Angka kartu indikator + tahun pada keterangannya (mis. "IPM · Tahun 2026") | Catatan singkat, label kecil ("Turun dari 7,28%"), ikon, warna |
| Deret grafik tahunan: kemiskinan (P0/P1/P2/garis), IPM, PDRB tahunan (ADHB/ADHK/LPE) | Judul & keterangan grafik, PDRB triwulanan |
| Kartogram Kaltim: angka kemiskinan dan penduduk per kabupaten/kota | Sorotan (kotak berwarna), narasi, rekomendasi, pengantar, sumber |

Setiap penarikan yang menemukan angka baru menerbitkan **versi baru** dengan catatan
"Otomatis: Web API BPS …" — tercatat di *Riwayat versi* (bisa dipulihkan) dan di *Log sinkron*.
Angka yang dipetakan ke API selalu mengikuti API: bila pegawai mengubahnya manual, penarikan
berikutnya mengembalikannya (ubah pemetaannya, atau matikan pemetaan itu, bila memang ingin manual).

Pemasangan:

1. **Kunci API** — daftar gratis di <https://webapi.bps.go.id/developer/> dengan surel kantor,
   klik tautan aktivasi yang dikirim ke surel, masuk, lalu **Profil → Aplikasi → Tambah aplikasi**
   (nama: *PINTAR Kukar*, URL: `https://bpskukar.github.io`) → **Generate Key**. Kuncinya adalah
   deretan huruf-angka di kolom **App ID** pada daftar aplikasi. Satu kunci untuk satu kantor.
2. **Ekstensi http** — Supabase Dashboard → **Database → Extensions** → cari `http` → aktifkan
   (schema `extensions`). Ini yang memungkinkan basis data memanggil API BPS langsung.
   Pastikan **pg_cron** juga aktif (sudah dipakai pengingat harian).
3. **SQL** — SQL Editor → New query → tempel seluruh `supabase/perbaikan-04.sql` → Run.
4. **Ruang Pegawai → Indikator → Sumber otomatis (Web API BPS)** — sebagai admin: tempel kunci →
   *Simpan kunci* → *Uji kunci* (harus menyebut jumlah variabel). Bagian *Sambungan* harus
   menunjukkan http aktif dan jadwal aktif.
5. **Muat daftar variabel** untuk domain **6400 (Provinsi Kaltim)** — tabel provinsi memuat
   angka per kabupaten/kota, sehingga Kukar tinggal dipilih. Butuh ½–2 menit (dimuat per
   4 halaman). Lakukan juga untuk 6403 bila ingin memakai tabel milik BPS Kukar.
6. **Petakan** — ketik kata kunci (mis. `pembangunan manusia`), tekan *Pakai* pada variabel yang
   tepat, pilih *Bagian isi situs* (mis. *Kartu · Indeks Pembangunan Manusia* atau *Deret IPM ·
   nilai*), tekan **Pratinjau angka**: periksa deret Kukar-nya, pilih turunan bila tabel punya
   jenis kelamin/total, cocokkan satuan (isi *pengali* 1000 bila API dalam ribu dan situs dalam
   jiwa). **Simpan pemetaan**. Satu variabel boleh dipakai dua pemetaan (kartu dan deret).
7. **Tarik sekarang (semua)** — penarikan pertama menerbitkan versi baru; buka situs indikator
   dan bandingkan. Setelah itu jadwal harian bekerja sendiri.

Bila tabel BPS menambah tahun baru, deret di grafik otomatis bertambah kolomnya (seri lain yang
belum ada angkanya dibiarkan kosong sampai pemetaannya juga ditarik). Bila suatu pemetaan gagal
(misalnya variabel dipindah BPS), status *gagal* muncul di log dan pemetaan lain tetap jalan.

Keamanan: kunci API hanya tersimpan di tabel `pengaturan` (tidak terbaca publik) dan hanya dipakai
dari dalam basis data; peramban tidak pernah memegangnya. Kunci, jadwal, dan domain hanya bisa diubah
admin; pemetaan bisa diatur semua pegawai aktif.

## Alasan untuk kembali (pembaruan 06)

Beranda PINTAR kini punya isi yang berubah dari hari ke hari, dan tiap situs punya alat yang
membuat orang kembali:

| Fitur | Di mana | Yang perlu dilakukan kantor |
|---|---|---|
| **Angka hari ini** — satu fakta berganti tiap hari dari isi indikator terbit, tombol WhatsApp & unduh kartu | Beranda | Tidak ada; ikut berubah bila angka indikator diperbarui |
| **Kartu angka siap bagikan** — PNG 1080×1080 dengan deret & sumber BPS | Situs indikator (tombol *Bagikan kartu* di tiap kartu), beranda | Tidak ada |
| **Terbit baru & agenda rilis** | Beranda; dikelola di Ruang Pegawai → *Terbitan & agenda* | Jalankan `perbaikan-06.sql`; isi agenda; bila Web API aktif (pembaruan 04), BRS/publikasi/infografis ditarik otomatis tiap malam |
| **Glosarium & cara membaca angka** — 37 istilah, asisten PST menjawab "apa itu…", "apa bedanya…" | `glosarium.html`; tautan *Apa ini?* di tiap kartu indikator | Tambah/ubah istilah di `assets/glosarium.js`, unggah ulang |
| **Bandingkan kab/kota se-Kaltim** — IPM & komponennya, kemiskinan, penduduk 2025 per kabupaten/kota | Situs indikator, bagian *Bandingkan* | Angka per kab/kota disunting di tab Indikator → *Kabupaten/kota Kaltim*; tahun & angka provinsi di *Pembanding kab/kota*; bisa juga ditarik Web API (target *Kab/kota · …*) |
| **Pasang sebagai aplikasi** — ikon di layar utama, sebagian bisa dibaca luring | Semua situs (tombol *Pasang* di bilah, spanduk di beranda) | Tidak ada; berkas `manifest.webmanifest`, `sw.js`, `luring.html`, `assets/ikon/` ada di repositori beranda |

### Terbit baru & agenda

1. Jalankan `supabase/perbaikan-06.sql` (boleh sebelum atau sesudah perbaikan-04).
2. Ruang Pegawai → **Terbitan & agenda**: tambah agenda rilis mendatang (jenis *Agenda*, tanggal,
   judul, tautan). Agenda yang lewat tanggalnya otomatis hilang dari beranda.
3. Bila kunci Web API terpasang, tombol **Tarik dari Web API** mengambil BRS, publikasi, infografis,
   dan berita terbaru BPS Kukar (halaman pertama tiap jenis); jadwal harian 02.00 WITA mengulanginya.
   Baris dari API hanya bisa disembunyikan atau diberi ringkasan.
4. Beranda membaca `v_terbitan` langsung (tanpa masuk). Bila server tak terjangkau, dipakai salinan
   terakhir di peramban, lalu `assets/terbitan-awal.js`.

### Pasang sebagai aplikasi (PWA)

Manifest dan service worker tinggal di repositori beranda (`bpskukar.github.io`) sehingga satu
pemasangan mencakup ketiga situs. Setiap kali ada berkas situs yang berubah, naikkan nilai `VERSI`
di `sw.js` (mis. `pintar-2026-10-01a`) agar salinan lama di perangkat pengunjung dibersihkan.
Data Supabase tidak pernah disimpan service worker.

## Pemeliharaan

| Kapan | Yang dilakukan |
|---|---|
| Setiap ada publikasi baru terbit | Tambah atau perbarui tautan di `assets/katalog.js` |
| Akhir September | Perbarui tautan Kecamatan Dalam Angka (terbit tiap 26 September) |
| Akhir Februari | Perbarui tautan Kabupaten Dalam Angka |
| Tiap triwulan | Unduh rekap CSV dari tab Rekap, bandingkan dengan hasil SKD |
| Ada pegawai pindah | Ubah `aktif` menjadi `false` di tabel `pegawai`, jangan dihapus |
| Jawaban baku berubah | Ubah `assets/pengetahuan.js`, unggah ulang |
| Istilah baru untuk glosarium | Tambah butir di `assets/glosarium.js`, unggah ulang |
| Ada berkas situs yang diubah | Naikkan `VERSI` di `sw.js` (repositori beranda) |
| Token gateway WA diganti | `update public.pengaturan set nilai = '…' where kunci = 'wa_token'` |

## Cadangan data

Supabase → **Database** → **Backups** menyediakan cadangan harian otomatis.
Selain itu, unduh CSV dari tab Rekap secara berkala dan simpan di penyimpanan kantor.
Isi tabel `kunjungan` memuat nama dan kontak orang, jadi berkas CSV-nya ikut
tunduk pada aturan perlindungan data pribadi — simpan di tempat yang terbatas aksesnya.
