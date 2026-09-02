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

## Pemeliharaan

| Kapan | Yang dilakukan |
|---|---|
| Setiap ada publikasi baru terbit | Tambah atau perbarui tautan di `assets/katalog.js` |
| Akhir September | Perbarui tautan Kecamatan Dalam Angka (terbit tiap 26 September) |
| Akhir Februari | Perbarui tautan Kabupaten Dalam Angka |
| Tiap triwulan | Unduh rekap CSV dari tab Rekap, bandingkan dengan hasil SKD |
| Ada pegawai pindah | Ubah `aktif` menjadi `false` di tabel `pegawai`, jangan dihapus |

## Cadangan data

Supabase → **Database** → **Backups** menyediakan cadangan harian otomatis.
Selain itu, unduh CSV dari tab Rekap secara berkala dan simpan di penyimpanan kantor.
Isi tabel `kunjungan` memuat nama dan kontak orang, jadi berkas CSV-nya ikut
tunduk pada aturan perlindungan data pribadi — simpan di tempat yang terbatas aksesnya.
