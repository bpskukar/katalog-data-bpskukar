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

## Memasang pembaruan

Setiap kali ada berkas baru di repositori, ada dua hal yang mungkin perlu diperbarui:
**berkas situs** (unggah ulang ke GitHub) dan **basis data** (jalankan skrip SQL bila ada).

| Pembaruan | Berkas situs | Basis data |
|---|---|---|
| Perbaikan 01 — keamanan & keadilan poin, nama petugas di daftar tiket, tautan bisa diklik | `assets/*.js`, `assets/theme.css` | jalankan `supabase/perbaikan-01.sql` sekali |
| Perbaikan 02 — chatbot, konsultasi daring (Zoom), notifikasi WhatsApp, profil pegawai | semua `.html`, `assets/*` | jalankan `supabase/perbaikan-02.sql` sekali, lalu ikuti bagian *Konsultasi daring* dan *Notifikasi WhatsApp* di bawah |

Cara menjalankan skrip pembaruan basis data: buka SQL Editor → New query → tempel seluruh
isi berkasnya → Run. Semua skrip pembaruan aman dijalankan ulang dan tidak menghapus data.
Proyek yang **baru** dibuat cukup menjalankan `schema.sql` — isinya sudah memuat semua perbaikan.
Proyek yang **sudah berjalan** menjalankan skrip perbaikannya berurutan (`perbaikan-01.sql`
lalu `perbaikan-02.sql`) — jangan menjalankan ulang `schema.sql`, karena tabel yang sudah ada
akan dilewati sehingga sebagian perubahan tidak diterapkan.

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
2. Sahabat data mengisi formulir di `konsultasi.html`, memilih jadwal paling cepat H+3
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
update public.pengaturan set nilai = '3'  where kunci = 'konsultasi_min_hari';
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
(83 ragam data) dan `assets/pengetahuan.js` (jawaban baku). Karena itu ia tidak pernah
mengarang angka, dan tidak butuh server maupun biaya.

Menambah atau mengubah jawaban: buka `assets/pengetahuan.js`, tiap butir punya `kunci`
(kata pemicu), `jawab`, dan `tautan`. Butir dengan `untuk: "petugas"` hanya muncul untuk
pegawai yang sudah masuk, dan di sana ada tombol **salin jawaban** — itulah "kartu jawaban
baku" untuk petugas piket. Setelah mengubah, unggah berkasnya ke GitHub; tidak perlu
menyentuh basis data.

## Pemeliharaan

| Kapan | Yang dilakukan |
|---|---|
| Setiap ada publikasi baru terbit | Tambah atau perbarui tautan di `assets/katalog.js` |
| Akhir September | Perbarui tautan Kecamatan Dalam Angka (terbit tiap 26 September) |
| Akhir Februari | Perbarui tautan Kabupaten Dalam Angka |
| Tiap triwulan | Unduh rekap CSV dari tab Rekap, bandingkan dengan hasil SKD |
| Ada pegawai pindah | Ubah `aktif` menjadi `false` di tabel `pegawai`, jangan dihapus |
| Jawaban baku berubah | Ubah `assets/pengetahuan.js`, unggah ulang |
| Token gateway WA diganti | `update public.pengaturan set nilai = '…' where kunci = 'wa_token'` |

## Cadangan data

Supabase → **Database** → **Backups** menyediakan cadangan harian otomatis.
Selain itu, unduh CSV dari tab Rekap secara berkala dan simpan di penyimpanan kantor.
Isi tabel `kunjungan` memuat nama dan kontak orang, jadi berkas CSV-nya ikut
tunduk pada aturan perlindungan data pribadi — simpan di tempat yang terbatas aksesnya.
