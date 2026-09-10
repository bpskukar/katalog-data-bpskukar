-- ============================================================================
-- PERBAIKAN 05 — Konsultasi daring: 30 menit per sesi, paling banyak dua topik
-- Jalankan SEKALI di SQL Editor. Aman dijalankan ulang.
--   • Lama sesi 45 → 30 menit (pengaturan konsultasi_durasi + bawaan kolom).
--   • Topik disimpan "Topik A · Topik B" (kolom topik tetap teks; tidak ada
--     perubahan struktur). Jam sesi tetap 09.00, 10.00, 11.00, 13.30, 14.30 —
--     jeda 30 menit antar-sesi. Bila ingin lebih rapat, ubah konsultasi_jam.
-- ============================================================================
update public.pengaturan set nilai = '30', keterangan = 'Lama satu sesi, menit (paling banyak dua topik per sesi)'
 where kunci = 'konsultasi_durasi';
alter table public.konsultasi alter column durasi_menit set default 30;
-- contoh bila ingin sesi tiap 30 menit (opsional, hapus tanda -- di depannya):
-- update public.pengaturan set nilai = '09:00,09:30,10:00,10:30,11:00,13:30,14:00,14:30' where kunci = 'konsultasi_jam';
