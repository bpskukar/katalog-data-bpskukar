-- ============================================================================
-- PERBAIKAN 03 — PINTAR Kukar: data indikator strategis dikelola dari
--                Ruang Pegawai, dan konsultasi daring bisa diajukan H-1.
-- Jalankan SEKALI di SQL Editor. Aman dijalankan ulang, tidak menghapus data.
-- Wajib sudah menjalankan schema.sql, perbaikan-01.sql, dan perbaikan-02.sql.
--
-- Yang ditambahkan:
--   1. Konsultasi daring: jadwal paling cepat H+1 (sebelumnya H+3).
--   2. Tabel indikator_konten — satu baris berisi seluruh isi situs
--      Indikator Strategis (angka, grafik, narasi) dalam bentuk JSON.
--      Dibaca publik oleh situs indikator, beranda PINTAR, dan asisten PST;
--      diubah hanya oleh pegawai aktif lewat tab "Indikator" di Ruang Pegawai.
--   3. Tabel indikator_riwayat — setiap simpanan disimpan sebagai versi,
--      lengkap dengan siapa dan kapan, sehingga bisa dipulihkan.
-- ============================================================================

-- ------------------------------------------------------- 1. konsultasi H+1
update public.pengaturan
   set nilai = '1', keterangan = 'Paling cepat H+n dari hari pengajuan (1 = bisa untuk besok)'
 where kunci = 'konsultasi_min_hari';
insert into public.pengaturan (kunci, nilai, publik, keterangan)
select 'konsultasi_min_hari', '1', true, 'Paling cepat H+n dari hari pengajuan (1 = bisa untuk besok)'
 where not exists (select 1 from public.pengaturan where kunci = 'konsultasi_min_hari');

insert into public.pengaturan (kunci, nilai, publik, keterangan) values
  ('indikator_url', 'https://bpskukar.github.io/indikator-strategis-bpskukar/', true, 'Alamat situs Indikator Strategis'),
  ('pintu_url',     'https://bpskukar.github.io/', true, 'Alamat beranda PINTAR Kukar')
on conflict (kunci) do nothing;

-- ------------------------------------------------- 2. isi indikator strategis
create table if not exists public.indikator_konten (
  id          text primary key default 'utama' check (id = 'utama'),
  data        jsonb not null,
  versi       integer not null default 0,
  catatan     text,
  diubah_oleh uuid references public.pegawai(id) on delete set null,
  diubah_pada timestamptz not null default now()
);
comment on table public.indikator_konten is
  'Seluruh isi situs Indikator Strategis (JSON). Satu baris saja: id = utama.';

create table if not exists public.indikator_riwayat (
  id          bigserial primary key,
  versi       integer not null,
  data        jsonb not null,
  catatan     text,
  diubah_oleh uuid,
  diubah_pada timestamptz not null default now()
);
create index if not exists indikator_riwayat_versi on public.indikator_riwayat (versi desc);

create or replace function public.jaga_indikator()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_pegawai() then
    raise exception 'Hanya pegawai aktif yang boleh mengubah data indikator.';
  end if;
  if jsonb_typeof(new.data) <> 'object' then
    raise exception 'Isi data harus berupa objek JSON.';
  end if;
  if pg_column_size(new.data) > 600000 then
    raise exception 'Isi data terlalu besar (maksimal 600 KB).';
  end if;
  new.id          := 'utama';
  new.versi       := coalesce(old.versi, 0) + 1;
  new.diubah_oleh := auth.uid();
  new.diubah_pada := now();
  new.catatan     := nullif(left(coalesce(new.catatan, ''), 300), '');
  return new;
end $$;
drop trigger if exists trg_jaga_indikator on public.indikator_konten;
create trigger trg_jaga_indikator before insert or update on public.indikator_konten
for each row execute function public.jaga_indikator();

create or replace function public.catat_indikator_riwayat()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.indikator_riwayat (versi, data, catatan, diubah_oleh, diubah_pada)
  values (new.versi, new.data, new.catatan, new.diubah_oleh, new.diubah_pada);
  -- simpan 60 versi terakhir saja
  delete from public.indikator_riwayat
   where id in (select id from public.indikator_riwayat order by versi desc offset 60);
  return new;
end $$;
drop trigger if exists trg_catat_indikator_riwayat on public.indikator_konten;
create trigger trg_catat_indikator_riwayat after insert or update on public.indikator_konten
for each row execute function public.catat_indikator_riwayat();

-- ------------------------------------------------------------- hak akses
alter table public.indikator_konten  enable row level security;
alter table public.indikator_riwayat enable row level security;

-- isi terbit: dibaca siapa saja (data publik), diubah pegawai, tidak bisa dihapus
drop policy if exists indikator_baca  on public.indikator_konten;
drop policy if exists indikator_tulis on public.indikator_konten;
drop policy if exists indikator_ubah  on public.indikator_konten;
create policy indikator_baca  on public.indikator_konten for select using (true);
create policy indikator_tulis on public.indikator_konten for insert with check (public.is_pegawai());
create policy indikator_ubah  on public.indikator_konten for update using (public.is_pegawai()) with check (public.is_pegawai());
revoke delete on public.indikator_konten from anon, authenticated;
-- kolom catatan & pengubah tidak untuk publik; pegawai membacanya lewat v_indikator_riwayat
revoke select on public.indikator_konten from anon, authenticated;
grant select (id, data, versi, diubah_pada) on public.indikator_konten to anon, authenticated;

-- riwayat: hanya pegawai yang membaca; ditulis pemicu (security definer)
drop policy if exists indikator_riwayat_baca on public.indikator_riwayat;
create policy indikator_riwayat_baca on public.indikator_riwayat for select using (public.is_pegawai());
revoke insert, update, delete on public.indikator_riwayat from anon, authenticated;

-- daftar versi dengan nama pengubah, tanpa isi (ringan untuk ditampilkan)
create or replace view public.v_indikator_riwayat with (security_invoker = on) as
select r.id, r.versi, r.catatan, r.diubah_pada, r.diubah_oleh,
       p.nama as nama_pengubah, pg_column_size(r.data) as ukuran
  from public.indikator_riwayat r
  left join public.pegawai p on p.id = r.diubah_oleh;
grant select on public.v_indikator_riwayat to anon, authenticated;

-- ------------------------------------------------------------- selesai
-- Setelah ini: buka Ruang Pegawai → tab "Indikator" → "Muat dari berkas awal"
-- untuk mengisi baris pertama dari assets/data.js situs indikator.
