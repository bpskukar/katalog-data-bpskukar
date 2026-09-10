-- ============================================================================
-- Katalog & PST BPS Kabupaten Kutai Kartanegara
-- Skema basis data Supabase. Tempelkan seluruh berkas ini ke SQL Editor
-- Supabase lalu jalankan sekali. Aman dijalankan ulang.
--
-- Sudah memuat perbaikan-01 dan perbaikan-02. Proyek yang dibuat dengan versi
-- sebelumnya cukup menjalankan supabase/perbaikan-01.sql lalu perbaikan-02.sql.
-- ============================================================================

-- ---------------------------------------------------------------- 1. TABEL --

create table if not exists public.pegawai (
  id         uuid primary key references auth.users(id) on delete cascade,
  nama       text not null,
  nip        text,
  jabatan    text,
  peran      text not null default 'pegawai' check (peran in ('admin','pegawai')),
  aktif      boolean not null default true,
  dibuat     timestamptz not null default now()
);
comment on table public.pegawai is 'Pegawai BPS Kukar yang boleh mengakses ruang pegawai.';

create table if not exists public.sahabat (
  id                uuid primary key references auth.users(id) on delete cascade,
  nama              text not null,
  no_hp             text,
  kategori_instansi text,
  nama_instansi     text,
  dibuat            timestamptz not null default now()
);
comment on table public.sahabat is 'Akun mandiri konsumen data (sahabat data).';

create sequence if not exists public.tiket_seq;

create table if not exists public.kunjungan (
  id                uuid primary key default gen_random_uuid(),
  kode_tiket        text unique,
  dibuat            timestamptz not null default now(),
  petugas_id        uuid references public.pegawai(id) on delete set null,
  sahabat_id        uuid references public.sahabat(id) on delete set null,

  -- profil pengunjung, mengikuti Blok I kuesioner Survei Kebutuhan Data (VKD25)
  nama              text not null,
  email             text,
  no_hp             text,
  jenis_kelamin     text,
  pendidikan        text,
  pekerjaan         text,
  kategori_instansi text,
  nama_instansi     text,
  pemanfaatan       text,
  jenis_layanan     text[] default '{}',
  sarana            text,

  -- kebutuhan
  kebutuhan         text not null,
  topik             text[] default '{}',
  katalog_ref       text[] default '{}',
  butuh_surat       boolean not null default false,

  -- penyelesaian
  status            text not null default 'selesai'
                    check (status in ('selesai','proses','surat','eskalasi','tolak')),
  hasil             text,
  tenggat           date,
  selesai_pada      timestamptz,
  diselesaikan_oleh uuid references public.pegawai(id) on delete set null
);
comment on table public.kunjungan is 'Buku tamu PST: satu baris per sahabat data yang dilayani.';
create index if not exists kunjungan_dibuat_idx on public.kunjungan (dibuat desc);
create index if not exists kunjungan_status_idx on public.kunjungan (status);
create index if not exists kunjungan_sahabat_idx on public.kunjungan (sahabat_id);

create table if not exists public.pertanyaan (
  id              uuid primary key default gen_random_uuid(),
  dibuat          timestamptz not null default now(),
  kunjungan_id    uuid references public.kunjungan(id) on delete set null,
  penanya_id      uuid references public.pegawai(id) on delete set null,
  judul           text not null,
  isi             text,
  topik           text,
  status          text not null default 'terbuka' check (status in ('terbuka','terjawab','ditutup')),
  jawaban_terbaik uuid
);
comment on table public.pertanyaan is 'Papan tanya antarpegawai untuk kebutuhan yang belum terjawab di meja PST.';

create table if not exists public.jawaban (
  id            uuid primary key default gen_random_uuid(),
  dibuat        timestamptz not null default now(),
  pertanyaan_id uuid not null references public.pertanyaan(id) on delete cascade,
  penjawab_id   uuid references public.pegawai(id) on delete set null,
  isi           text not null,
  tautan        text[] default '{}',
  terbaik       boolean not null default false
);
create index if not exists jawaban_pertanyaan_idx on public.jawaban (pertanyaan_id);

create table if not exists public.poin (
  id         bigserial primary key,
  dibuat     timestamptz not null default now(),
  pegawai_id uuid not null references public.pegawai(id) on delete cascade,
  jenis      text not null check (jenis in ('catat','tanya','jawab','terbaik','tuntas','konsul')),
  nilai      integer not null,
  ref        uuid
);
comment on table public.poin is 'Buku besar poin keaktifan. Hanya ditulis oleh pemicu, tidak pernah oleh peramban.';
create index if not exists poin_pegawai_idx on public.poin (pegawai_id);

-- -------------------------------------------------------------- 2. PEMBANTU --

-- Dipakai di dalam kebijakan RLS. SECURITY DEFINER supaya tidak memicu
-- rekursi ketika kebijakan pada tabel pegawai perlu membaca tabel pegawai.
create or replace function public.is_pegawai()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.pegawai p where p.id = auth.uid() and p.aktif);
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.pegawai p where p.id = auth.uid() and p.aktif and p.peran = 'admin');
$$;

-- Nomor tiket berurutan: PST-YYMM-0001
create or replace function public.tambah_hari_kerja(p_mulai date, p_n integer)
returns date language plpgsql immutable as $$
declare d date := p_mulai; n integer := 0;
begin
  while n < p_n loop
    d := d + 1;
    if extract(isodow from d) < 6 then n := n + 1; end if;
  end loop;
  return d;
end $$;

create or replace function public.buat_kode_tiket()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.kode_tiket := 'PST-' || to_char(now() at time zone 'Asia/Makassar', 'YYMM')
                    || '-' || lpad(nextval('public.tiket_seq')::text, 4, '0');

  -- Pengguna login yang bukan pegawai (sahabat data) tidak boleh mengisi
  -- kolom milik petugas. Tenggatnya dihitung sistem: 3 hari kerja.
  if auth.uid() is not null and not public.is_pegawai() then
    new.petugas_id        := null;
    new.hasil             := null;
    new.selesai_pada      := null;
    new.diselesaikan_oleh := null;
    new.status            := 'proses';
    new.katalog_ref       := '{}';
    new.topik             := '{}';
    new.butuh_surat       := false;
    new.tenggat           := public.tambah_hari_kerja((now() at time zone 'Asia/Makassar')::date, 3);
  end if;
  return new;
end $$;

drop trigger if exists trg_kode_tiket on public.kunjungan;
create trigger trg_kode_tiket before insert on public.kunjungan
for each row execute function public.buat_kode_tiket();

-- Akun sahabat data dibuat otomatis saat pendaftaran mandiri
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.raw_user_meta_data->>'peran','') = 'sahabat' then
    insert into public.sahabat (id, nama, no_hp, kategori_instansi, nama_instansi)
    values (new.id,
            coalesce(new.raw_user_meta_data->>'nama', new.email),
            new.raw_user_meta_data->>'no_hp',
            new.raw_user_meta_data->>'kategori_instansi',
            new.raw_user_meta_data->>'nama_instansi')
    on conflict (id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------ 3. POIN --

create or replace function public.beri_poin(p_pegawai uuid, p_jenis text, p_ref uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v integer;
begin
  if p_pegawai is null then return; end if;
  v := case p_jenis when 'catat' then 2 when 'tanya' then 1 when 'jawab' then 3
                    when 'terbaik' then 7 when 'tuntas' then 5 when 'konsul' then 5 else 0 end;
  if v = 0 then return; end if;
  insert into public.poin (pegawai_id, jenis, nilai, ref) values (p_pegawai, p_jenis, v, p_ref);
end $$;
-- Hanya boleh dipanggil pemicu dan fungsi lain, tidak pernah dari peramban.
revoke execute on function public.beri_poin(uuid, text, uuid) from public, anon, authenticated;

create or replace function public.poin_kunjungan()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_sudah boolean;
begin
  if tg_op = 'INSERT' then
    perform public.beri_poin(new.petugas_id, 'catat', new.id);
    return new;
  end if;

  if new.status = 'selesai' and old.status <> 'selesai' then
    new.selesai_pada      := now();
    new.diselesaikan_oleh := coalesce(auth.uid(), new.diselesaikan_oleh);

    select exists (select 1 from public.poin where jenis = 'tuntas' and ref = new.id) into v_sudah;
    if not v_sudah
       and new.diselesaikan_oleh is not null
       and ( new.diselesaikan_oleh is distinct from new.petugas_id      -- menuntaskan tiket orang lain
             or new.dibuat < now() - interval '1 hour' )                -- atau tiket sendiri yang memang tertunda
    then
      perform public.beri_poin(new.diselesaikan_oleh, 'tuntas', new.id);
    end if;

  elsif new.status <> 'selesai' and old.status = 'selesai' then
    new.selesai_pada      := null;
    new.diselesaikan_oleh := null;
  end if;
  return new;
end $$;

drop trigger if exists trg_poin_kunjungan_ins on public.kunjungan;
create trigger trg_poin_kunjungan_ins after insert on public.kunjungan
for each row execute function public.poin_kunjungan();

drop trigger if exists trg_poin_kunjungan_upd on public.kunjungan;
create trigger trg_poin_kunjungan_upd before update on public.kunjungan
for each row execute function public.poin_kunjungan();

create or replace function public.poin_tanya()
returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.beri_poin(new.penanya_id, 'tanya', new.id); return new; end $$;

drop trigger if exists trg_poin_tanya on public.pertanyaan;
create trigger trg_poin_tanya after insert on public.pertanyaan
for each row execute function public.poin_tanya();

create or replace function public.poin_jawab()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_penanya uuid;
begin
  select penanya_id into v_penanya from public.pertanyaan where id = new.pertanyaan_id;
  if v_penanya is distinct from new.penjawab_id then
    perform public.beri_poin(new.penjawab_id, 'jawab', new.id);
  end if;
  return new;
end $$;

drop trigger if exists trg_poin_jawab on public.jawaban;
create trigger trg_poin_jawab after insert on public.jawaban
for each row execute function public.poin_jawab();

-- Kolom 'terbaik' hanya boleh berubah lewat tandai_terbaik.
create or replace function public.jaga_terbaik()
returns trigger language plpgsql as $$
begin
  if new.terbaik is distinct from old.terbaik
     and coalesce(current_setting('pst.tandai', true), '') <> '1' then
    new.terbaik := old.terbaik;
  end if;
  return new;
end $$;
drop trigger if exists trg_jaga_terbaik on public.jawaban;
create trigger trg_jaga_terbaik before update on public.jawaban
for each row execute function public.jaga_terbaik();

-- Menandai jawaban paling membantu: hanya satu per pertanyaan, sekali berpoin.
create or replace function public.tandai_terbaik(p_jawaban uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_pert uuid; v_peg uuid; v_penanya uuid; v_sudah boolean;
begin
  if not public.is_pegawai() then raise exception 'Hanya pegawai yang boleh menandai.'; end if;

  select j.pertanyaan_id, j.penjawab_id, q.penanya_id into v_pert, v_peg, v_penanya
  from public.jawaban j join public.pertanyaan q on q.id = j.pertanyaan_id
  where j.id = p_jawaban;
  if v_pert is null then raise exception 'Jawaban tidak ditemukan.'; end if;

  if v_peg = auth.uid() then
    raise exception 'Jawaban sendiri tidak boleh ditandai paling membantu.';
  end if;
  if auth.uid() is distinct from v_penanya and not public.is_admin() then
    raise exception 'Hanya penanya atau admin yang boleh menandai jawaban paling membantu.';
  end if;

  perform set_config('pst.tandai', '1', true);   -- izin sekali jalan untuk pemicu jaga_terbaik
  update public.jawaban set terbaik = (id = p_jawaban) where pertanyaan_id = v_pert;
  update public.pertanyaan set status = 'terjawab', jawaban_terbaik = p_jawaban where id = v_pert;

  select exists (select 1 from public.poin where jenis = 'terbaik' and ref = p_jawaban) into v_sudah;
  if not v_sudah then perform public.beri_poin(v_peg, 'terbaik', p_jawaban); end if;
end $$;

-- Penelusuran tiket tanpa akun: kode tiket + 4 digit terakhir nomor HP.
-- Dibatasi 5 kali salah per kode per 15 menit untuk menahan tebak-tebakan.
create table if not exists public.cek_log (
  id     bigserial primary key,
  kode   text not null,
  waktu  timestamptz not null default now(),
  sukses boolean not null
);
create index if not exists cek_log_idx on public.cek_log (kode, waktu desc);
alter table public.cek_log enable row level security;
-- sengaja tanpa kebijakan: hanya fungsi cek_tiket (pemilik) yang menyentuhnya
revoke all on public.cek_log from anon, authenticated;

create or replace function public.cek_tiket(p_kode text, p_hp4 text)
returns table (kode_tiket text, dibuat timestamptz, status text, kebutuhan text,
               jenis_layanan text[], hasil text, tenggat date, nama text)
language plpgsql volatile security definer set search_path = public as $$
declare
  v_kode  text := upper(trim(coalesce(p_kode, '')));
  v_hp    text := right(regexp_replace(coalesce(p_hp4, ''), '\D', '', 'g'), 4);
  v_gagal integer;
begin
  if v_kode = '' or length(v_hp) < 4 then return; end if;

  delete from public.cek_log where waktu < now() - interval '1 day';
  select count(*) into v_gagal from public.cek_log c
  where c.kode = v_kode and not c.sukses and c.waktu > now() - interval '15 minutes';
  if v_gagal >= 5 then return; end if;     -- diam, sama seperti tidak ketemu

  return query
    select k.kode_tiket, k.dibuat, k.status, k.kebutuhan, k.jenis_layanan, k.hasil, k.tenggat, k.nama
    from public.kunjungan k
    where upper(k.kode_tiket) = v_kode
      and right(regexp_replace(coalesce(k.no_hp, ''), '\D', '', 'g'), 4) = v_hp
    limit 1;

  insert into public.cek_log (kode, sukses) values (v_kode, found);
end $$;
grant execute on function public.cek_tiket(text, text) to anon, authenticated;

-- ---------------------------------------------------------------- 4. TAMPILAN --

create or replace view public.v_peringkat with (security_invoker = on) as
select p.id as pegawai_id, p.nama, p.jabatan,
       coalesce(sum(o.nilai), 0)::int as poin,
       count(*) filter (where o.jenis = 'catat')::int   as n_catat,
       count(*) filter (where o.jenis = 'jawab')::int   as n_jawab,
       count(*) filter (where o.jenis = 'terbaik')::int as n_terbaik,
       count(*) filter (where o.jenis = 'tuntas')::int  as n_tuntas,
       count(*) filter (where o.jenis = 'konsul')::int  as n_konsul
from public.pegawai p
left join public.poin o on o.pegawai_id = p.id
where p.aktif
group by p.id, p.nama, p.jabatan;

create or replace view public.v_kunjungan with (security_invoker = on) as
select k.*, p.nama as petugas_nama, s.nama as penyelesai_nama
from public.kunjungan k
left join public.pegawai p on p.id = k.petugas_id
left join public.pegawai s on s.id = k.diselesaikan_oleh;

create or replace view public.v_pertanyaan with (security_invoker = on) as
select q.*, g.nama as penanya_nama, k.kode_tiket,
       (select count(*) from public.jawaban j where j.pertanyaan_id = q.id)::int as n_jawaban
from public.pertanyaan q
left join public.pegawai g on g.id = q.penanya_id
left join public.kunjungan k on k.id = q.kunjungan_id;

create or replace view public.v_jawaban with (security_invoker = on) as
select j.*, g.nama as penjawab_nama
from public.jawaban j
left join public.pegawai g on g.id = j.penjawab_id;

-- --------------------------------------------------------- 5. KEAMANAN BARIS --

alter table public.pegawai    enable row level security;
alter table public.sahabat    enable row level security;
alter table public.kunjungan  enable row level security;
alter table public.pertanyaan enable row level security;
alter table public.jawaban    enable row level security;
alter table public.poin       enable row level security;

drop policy if exists peg_baca on public.pegawai;
create policy peg_baca on public.pegawai for select to authenticated
  using (public.is_pegawai() or id = auth.uid());
drop policy if exists peg_ubah_diri on public.pegawai;
create policy peg_ubah_diri on public.pegawai for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
drop policy if exists peg_admin_tulis on public.pegawai;
create policy peg_admin_tulis on public.pegawai for insert to authenticated
  with check (public.is_admin());

drop policy if exists sah_diri on public.sahabat;
create policy sah_diri on public.sahabat for select to authenticated
  using (id = auth.uid() or public.is_pegawai());
drop policy if exists sah_ubah_diri on public.sahabat;
create policy sah_ubah_diri on public.sahabat for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Kunjungan memuat nama dan kontak orang: pegawai penuh, sahabat hanya miliknya.
drop policy if exists kun_baca on public.kunjungan;
create policy kun_baca on public.kunjungan for select to authenticated
  using (public.is_pegawai() or sahabat_id = auth.uid());
drop policy if exists kun_tulis_pegawai on public.kunjungan;
create policy kun_tulis_pegawai on public.kunjungan for insert to authenticated
  with check (public.is_pegawai());
drop policy if exists kun_tulis_sahabat on public.kunjungan;
create policy kun_tulis_sahabat on public.kunjungan for insert to authenticated
  with check (sahabat_id = auth.uid() and petugas_id is null and status = 'proses');
drop policy if exists kun_ubah on public.kunjungan;
create policy kun_ubah on public.kunjungan for update to authenticated
  using (public.is_pegawai()) with check (public.is_pegawai());

drop policy if exists tny_baca on public.pertanyaan;
create policy tny_baca on public.pertanyaan for select to authenticated using (public.is_pegawai());
drop policy if exists tny_tulis on public.pertanyaan;
create policy tny_tulis on public.pertanyaan for insert to authenticated
  with check (public.is_pegawai() and penanya_id = auth.uid());
drop policy if exists tny_ubah on public.pertanyaan;
create policy tny_ubah on public.pertanyaan for update to authenticated
  using (public.is_pegawai()) with check (public.is_pegawai());

drop policy if exists jwb_baca on public.jawaban;
create policy jwb_baca on public.jawaban for select to authenticated using (public.is_pegawai());
drop policy if exists jwb_tulis on public.jawaban;
create policy jwb_tulis on public.jawaban for insert to authenticated
  with check (public.is_pegawai() and penjawab_id = auth.uid());
drop policy if exists jwb_ubah on public.jawaban;
create policy jwb_ubah on public.jawaban for update to authenticated
  using (penjawab_id = auth.uid()) with check (penjawab_id = auth.uid());

-- Poin hanya boleh dibaca; penulisannya lewat pemicu SECURITY DEFINER.
drop policy if exists poin_baca on public.poin;
create policy poin_baca on public.poin for select to authenticated using (public.is_pegawai());


-- ============================================================================
-- 7. KONSULTASI DARING, PROFIL PEGAWAI, NOTIFIKASI WHATSAPP (perbaikan-02)
-- ============================================================================

-- ------------------------------------------------------------ 1. profil pegawai
alter table public.pegawai add column if not exists keahlian    text[] not null default '{}';
alter table public.pegawai add column if not exists tautan_zoom text;
alter table public.pegawai add column if not exists no_hp       text;

create or replace function public.jaga_pegawai()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Hanya admin yang boleh mengubah peran dan status aktif. Pegawai biasa
  -- hanya boleh mengubah profil dirinya (nama, jabatan, keahlian, zoom, hp).
  if auth.uid() is not null and not public.is_admin() then
    new.peran := old.peran;
    new.aktif := old.aktif;
    new.id    := old.id;
  end if;
  return new;
end $$;
drop trigger if exists trg_jaga_pegawai on public.pegawai;
create trigger trg_jaga_pegawai before update on public.pegawai
for each row execute function public.jaga_pegawai();

-- ------------------------------------------------------------- 2. pengaturan
create table if not exists public.pengaturan (
  kunci      text primary key,
  nilai      text,
  publik     boolean not null default false,
  keterangan text
);
alter table public.pengaturan enable row level security;
revoke all on public.pengaturan from anon, authenticated;
-- tanpa kebijakan: hanya fungsi pemilik yang membaca; admin mengubah lewat SQL Editor

insert into public.pengaturan (kunci, nilai, publik, keterangan) values
  ('konsultasi_jam',       '09:00,10:00,11:00,13:30,14:30', true,  'Jam mulai sesi konsultasi daring (WITA), dipisah koma'),
  ('konsultasi_durasi',    '45',  true,  'Lama satu sesi, menit'),
  ('konsultasi_min_hari',  '1',   true,  'Paling cepat H+n dari hari pengajuan (1 = bisa untuk besok)'),
  ('konsultasi_maks_hari', '30',  true,  'Paling jauh H+n dari hari pengajuan'),
  ('situs_url', 'https://bpskukar.github.io/katalog-data-bpskukar/', true, 'Alamat situs, dipakai di pesan WhatsApp'),
  ('wa_url',    '',       false, 'URL kirim pesan gateway WhatsApp. Kosong = notifikasi mati'),
  ('wa_token',  '',       false, 'Token / API key gateway'),
  ('wa_target', '',       false, 'ID grup WhatsApp (mis. 1203...@g.us) atau nomor 628..., dipisah koma'),
  ('wa_format', 'fonnte', false, 'fonnte | wablas | generic')
on conflict (kunci) do nothing;

create or replace function public.pengaturan_publik()
returns table (kunci text, nilai text)
language sql stable security definer set search_path = public as $$
  select p.kunci, p.nilai from public.pengaturan p where p.publik
$$;
grant execute on function public.pengaturan_publik() to anon, authenticated;

create or replace function public.atur(p_kunci text)
returns text language sql stable security definer set search_path = public as $$
  select nilai from public.pengaturan where kunci = p_kunci
$$;
revoke execute on function public.atur(text) from public, anon, authenticated;

-- ------------------------------------------------------------- 3. konsultasi
create sequence if not exists public.konsultasi_seq;

create table if not exists public.konsultasi (
  id                  uuid primary key default gen_random_uuid(),
  kode                text unique,
  dibuat              timestamptz not null default now(),
  diubah              timestamptz not null default now(),
  sahabat_id          uuid references public.sahabat(id) on delete set null,

  nama                text not null,
  email               text,
  no_hp               text not null,
  kategori_instansi   text,
  nama_instansi       text,
  pemanfaatan         text,
  topik               text,
  kebutuhan           text not null,

  tanggal             date not null,
  jam                 time not null,
  durasi_menit        integer not null default 45,

  status              text not null default 'diajukan'
                      check (status in ('diajukan','dijadwalkan','selesai','batal')),
  narasumber_id       uuid references public.pegawai(id) on delete set null,
  tautan_zoom         text,
  pesan_untuk_sahabat text,
  catatan_internal    text,
  selesai_pada        timestamptz
);
comment on table public.konsultasi is 'Permintaan konsultasi daring (Zoom) dari sahabat data.';
create unique index if not exists konsultasi_slot_aktif
  on public.konsultasi (tanggal, jam) where status in ('diajukan','dijadwalkan');
create index if not exists konsultasi_tanggal_idx on public.konsultasi (tanggal, jam);
create index if not exists konsultasi_status_idx  on public.konsultasi (status);

-- batas tanggal yang boleh dipilih, dihitung di satu tempat
create or replace function public.rentang_konsultasi()
returns table (paling_cepat date, paling_jauh date)
language sql stable security definer set search_path = public as $$
  select (now() at time zone 'Asia/Makassar')::date + coalesce(public.atur('konsultasi_min_hari'),'3')::int,
         (now() at time zone 'Asia/Makassar')::date + coalesce(public.atur('konsultasi_maks_hari'),'30')::int
$$;
grant execute on function public.rentang_konsultasi() to anon, authenticated;

create or replace function public.jaga_konsultasi()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_cepat date; v_jauh date; v_jam text[];
begin
  if tg_op = 'INSERT' then
    new.durasi_menit := coalesce(public.atur('konsultasi_durasi'), '45')::int;
    if not public.is_pegawai() then
      -- pengajuan dari luar: kolom milik petugas dikosongkan
      new.status := 'diajukan'; new.narasumber_id := null; new.tautan_zoom := null;
      new.pesan_untuk_sahabat := null; new.catatan_internal := null; new.selesai_pada := null;
    end if;
  end if;

  new.diubah := now();

  -- aturan jadwal berlaku saat tanggal/jam diisi atau diubah
  if tg_op = 'INSERT' or new.tanggal is distinct from old.tanggal or new.jam is distinct from old.jam then
    if extract(isodow from new.tanggal) >= 6 then
      raise exception 'Konsultasi hanya pada hari kerja (Senin–Jumat).';
    end if;
    v_jam := string_to_array(coalesce(public.atur('konsultasi_jam'), '09:00,10:00,11:00,13:30,14:30'), ',');
    if not (to_char(new.jam, 'HH24:MI') = any (v_jam)) then
      raise exception 'Jam % di luar pilihan sesi (%).', to_char(new.jam,'HH24:MI'), array_to_string(v_jam, ', ');
    end if;
    -- pegawai boleh menjadwalkan lebih dekat (mis. menjadwal ulang); sahabat data terikat H+n
    if not public.is_pegawai() then
      select paling_cepat, paling_jauh into v_cepat, v_jauh from public.rentang_konsultasi();
      if new.tanggal < v_cepat then
        raise exception 'Jadwal paling cepat %.', to_char(v_cepat, 'DD-MM-YYYY');
      end if;
      if new.tanggal > v_jauh then
        raise exception 'Jadwal paling jauh %.', to_char(v_jauh, 'DD-MM-YYYY');
      end if;
    end if;
  end if;

  -- nomor urut diambil setelah semua pemeriksaan lolos, supaya pengajuan yang
  -- ditolak tidak meninggalkan lubang pada penomoran
  if tg_op = 'INSERT' then
    new.kode := 'KON-' || to_char(now() at time zone 'Asia/Makassar', 'YYMM')
                || '-' || lpad(nextval('public.konsultasi_seq')::text, 4, '0');
  end if;

  if tg_op = 'UPDATE' and new.status = 'selesai' and old.status <> 'selesai' then
    new.selesai_pada := now();
    if new.narasumber_id is not null
       and not exists (select 1 from public.poin where jenis = 'konsul' and ref = new.id) then
      perform public.beri_poin(new.narasumber_id, 'konsul', new.id);
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_jaga_konsultasi on public.konsultasi;
create trigger trg_jaga_konsultasi before insert or update on public.konsultasi
for each row execute function public.jaga_konsultasi();

-- slot yang sudah terisi, untuk menandai pilihan di formulir (tanpa data pribadi)
create or replace function public.slot_terpakai(p_dari date, p_sampai date)
returns table (tanggal date, jam time)
language sql stable security definer set search_path = public as $$
  select k.tanggal, k.jam from public.konsultasi k
  where k.status in ('diajukan','dijadwalkan') and k.tanggal between p_dari and p_sampai
$$;
grant execute on function public.slot_terpakai(date, date) to anon, authenticated;

-- pengajuan tanpa akun. Dibatasi 3 pengajuan per jam per alamat IP dan
-- satu permintaan aktif per nomor HP.
create table if not exists public.ajuan_log (
  id bigserial primary key, ip text, waktu timestamptz not null default now()
);
alter table public.ajuan_log enable row level security;
revoke all on public.ajuan_log from anon, authenticated;

create or replace function public.ajukan_konsultasi(p jsonb)
returns text language plpgsql volatile security definer set search_path = public as $$
declare v_ip text; v_n int; v_hp text; v_ada text; v_kode text; v_sah uuid;
begin
  v_ip := coalesce(current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for', '');
  if v_ip <> '' then
    delete from public.ajuan_log where waktu < now() - interval '1 day';
    select count(*) into v_n from public.ajuan_log where ip = v_ip and waktu > now() - interval '1 hour';
    if v_n >= 3 then raise exception 'Terlalu banyak pengajuan dari jaringan ini. Coba lagi satu jam lagi.'; end if;
    insert into public.ajuan_log (ip) values (v_ip);
  end if;

  v_hp := regexp_replace(coalesce(p->>'no_hp',''), '\D', '', 'g');
  if length(v_hp) < 9 then raise exception 'Nomor HP tidak sah.'; end if;
  if coalesce(trim(p->>'nama'),'') = '' then raise exception 'Nama wajib diisi.'; end if;
  if coalesce(trim(p->>'kebutuhan'),'') = '' then raise exception 'Kebutuhan wajib diisi.'; end if;

  select kode into v_ada from public.konsultasi
  where regexp_replace(no_hp, '\D', '', 'g') = v_hp and status in ('diajukan','dijadwalkan') limit 1;
  if v_ada is not null then
    raise exception 'Masih ada permintaan konsultasi aktif untuk nomor ini (%). Tunggu sampai selesai atau hubungi PST.', v_ada;
  end if;

  select id into v_sah from public.sahabat where id = auth.uid();

  begin
    insert into public.konsultasi
      (sahabat_id, nama, email, no_hp, kategori_instansi, nama_instansi, pemanfaatan, topik, kebutuhan, tanggal, jam)
    values
      (v_sah, trim(p->>'nama'), nullif(trim(p->>'email'),''), v_hp,
       nullif(p->>'kategori_instansi',''), nullif(trim(p->>'nama_instansi'),''), nullif(p->>'pemanfaatan',''),
       nullif(p->>'topik',''), trim(p->>'kebutuhan'), (p->>'tanggal')::date, (p->>'jam')::time)
    returning kode into v_kode;
  exception when unique_violation then
    raise exception 'Jadwal itu baru saja diambil orang lain. Pilih waktu lain.';
  end;
  return v_kode;
end $$;
grant execute on function public.ajukan_konsultasi(jsonb) to anon, authenticated;

-- cek status konsultasi: kode + 4 digit HP, memakai pembatas yang sama dengan tiket
create or replace function public.cek_konsultasi(p_kode text, p_hp4 text)
returns table (kode text, dibuat timestamptz, status text, kebutuhan text, topik text,
               tanggal date, jam time, durasi_menit integer, narasumber text,
               tautan_zoom text, pesan_untuk_sahabat text, nama text)
language plpgsql volatile security definer set search_path = public as $$
declare
  v_kode  text := upper(trim(coalesce(p_kode, '')));
  v_hp    text := right(regexp_replace(coalesce(p_hp4, ''), '\D', '', 'g'), 4);
  v_gagal integer;
begin
  if v_kode = '' or length(v_hp) < 4 then return; end if;
  select count(*) into v_gagal from public.cek_log c
  where c.kode = v_kode and not c.sukses and c.waktu > now() - interval '15 minutes';
  if v_gagal >= 5 then return; end if;

  return query
    select k.kode, k.dibuat, k.status, k.kebutuhan, k.topik, k.tanggal, k.jam, k.durasi_menit,
           g.nama, case when k.status = 'dijadwalkan' then k.tautan_zoom end,
           k.pesan_untuk_sahabat, k.nama
    from public.konsultasi k left join public.pegawai g on g.id = k.narasumber_id
    where upper(k.kode) = v_kode
      and right(regexp_replace(coalesce(k.no_hp, ''), '\D', '', 'g'), 4) = v_hp
    limit 1;
  insert into public.cek_log (kode, sukses) values (v_kode, found);
end $$;
grant execute on function public.cek_konsultasi(text, text) to anon, authenticated;

create or replace view public.v_konsultasi with (security_invoker = on) as
select k.*, g.nama as narasumber_nama, g.tautan_zoom as narasumber_zoom
from public.konsultasi k left join public.pegawai g on g.id = k.narasumber_id;

alter table public.konsultasi enable row level security;
drop policy if exists kon_baca on public.konsultasi;
create policy kon_baca on public.konsultasi for select to authenticated
  using (public.is_pegawai() or sahabat_id = auth.uid());
drop policy if exists kon_tulis on public.konsultasi;
create policy kon_tulis on public.konsultasi for insert to authenticated
  with check (public.is_pegawai());
drop policy if exists kon_ubah on public.konsultasi;
create policy kon_ubah on public.konsultasi for update to authenticated
  using (public.is_pegawai()) with check (public.is_pegawai());

-- ------------------------------------------------ 5. notifikasi WhatsApp
create table if not exists public.notifikasi_log (
  id         bigserial primary key,
  dibuat     timestamptz not null default now(),
  jenis      text,
  pesan      text,
  request_id bigint,
  keterangan text
);
alter table public.notifikasi_log enable row level security;
revoke all on public.notifikasi_log from anon, authenticated;
drop policy if exists notif_baca on public.notifikasi_log;
create policy notif_baca on public.notifikasi_log for select to authenticated using (public.is_admin());
grant select on public.notifikasi_log to authenticated;

create or replace function public.kirim_wa(p_jenis text, p_pesan text)
returns void language plpgsql volatile security definer set search_path = public as $$
declare v_url text; v_token text; v_target text; v_format text;
        v_body jsonb; v_headers jsonb; v_id bigint;
begin
  v_url    := coalesce(public.atur('wa_url'), '');
  v_token  := coalesce(public.atur('wa_token'), '');
  v_target := coalesce(public.atur('wa_target'), '');
  v_format := coalesce(public.atur('wa_format'), 'fonnte');

  if v_url = '' or v_target = '' then
    insert into public.notifikasi_log (jenis, pesan, keterangan)
    values (p_jenis, p_pesan, 'tidak dikirim: gateway belum diatur di tabel pengaturan');
    return;
  end if;
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'net' and p.proname = 'http_post') then
    insert into public.notifikasi_log (jenis, pesan, keterangan)
    values (p_jenis, p_pesan, 'tidak dikirim: ekstensi pg_net belum diaktifkan');
    return;
  end if;

  if v_format = 'wablas' then
    v_headers := jsonb_build_object('Authorization', v_token, 'Content-Type', 'application/json');
    v_body    := jsonb_build_object('phone', v_target, 'message', p_pesan);
  elsif v_format = 'generic' then
    v_headers := jsonb_build_object('Authorization', 'Bearer ' || v_token, 'Content-Type', 'application/json');
    v_body    := jsonb_build_object('target', v_target, 'message', p_pesan);
  else -- fonnte
    v_headers := jsonb_build_object('Authorization', v_token, 'Content-Type', 'application/json');
    v_body    := jsonb_build_object('target', v_target, 'message', p_pesan);
  end if;

  select net.http_post(url := v_url, body := v_body, headers := v_headers) into v_id;
  insert into public.notifikasi_log (jenis, pesan, request_id) values (p_jenis, p_pesan, v_id);
exception when others then
  -- kegagalan kirim tidak boleh menggagalkan pencatatan tiket
  insert into public.notifikasi_log (jenis, pesan, keterangan) values (p_jenis, p_pesan, 'gagal: ' || sqlerrm);
end $$;
revoke execute on function public.kirim_wa(text, text) from public, anon, authenticated;

create or replace function public.situs() returns text language sql stable security definer set search_path = public as $$
  select coalesce(public.atur('situs_url'), '')
$$;
revoke execute on function public.situs() from public, anon, authenticated;

-- tiket daring baru (dari sahabat data)
create or replace function public.notif_tiket()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.sahabat_id is not null and new.petugas_id is null then
    perform public.kirim_wa('tiket_daring',
      '🔔 *Tiket daring baru* ' || new.kode_tiket || E'\n' ||
      'Dari: ' || new.nama || coalesce(' (' || new.nama_instansi || ')', '') || E'\n' ||
      'Kebutuhan: ' || left(new.kebutuhan, 300) || E'\n' ||
      'Tenggat: ' || coalesce(to_char(new.tenggat, 'DD-MM-YYYY'), '—') || E'\n\n' ||
      'Siapa yang ambil? Buka ' || public.situs() || 'admin.html');
  end if;
  return new;
end $$;
drop trigger if exists trg_notif_tiket on public.kunjungan;
create trigger trg_notif_tiket after insert on public.kunjungan
for each row execute function public.notif_tiket();

-- permintaan konsultasi baru & jadwal ditetapkan
create or replace function public.notif_konsultasi()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_nara text;
begin
  if tg_op = 'INSERT' then
    perform public.kirim_wa('konsultasi_baru',
      '📅 *Permintaan konsultasi daring* ' || new.kode || E'\n' ||
      'Dari: ' || new.nama || coalesce(' (' || new.nama_instansi || ')', '') || E'\n' ||
      'Topik: ' || coalesce(new.topik, '—') || E'\n' ||
      'Usulan waktu: ' || to_char(new.tanggal, 'Dy DD-MM-YYYY') || ' ' || to_char(new.jam, 'HH24:MI') || ' WITA' || E'\n' ||
      'Kebutuhan: ' || left(new.kebutuhan, 300) || E'\n\n' ||
      'Perlu ditetapkan narasumbernya: ' || public.situs() || 'admin.html');
  elsif new.status = 'dijadwalkan' and (old.status <> 'dijadwalkan' or new.narasumber_id is distinct from old.narasumber_id) then
    select nama into v_nara from public.pegawai where id = new.narasumber_id;
    perform public.kirim_wa('konsultasi_jadwal',
      '✅ *Konsultasi dijadwalkan* ' || new.kode || E'\n' ||
      to_char(new.tanggal, 'Dy DD-MM-YYYY') || ' ' || to_char(new.jam, 'HH24:MI') || ' WITA · ' || new.durasi_menit || ' menit' || E'\n' ||
      'Narasumber: ' || coalesce(v_nara, '—') || E'\n' ||
      'Sahabat data: ' || new.nama || E'\n' ||
      'Topik: ' || coalesce(new.topik, '—'));
  end if;
  return new;
end $$;
drop trigger if exists trg_notif_konsultasi on public.konsultasi;
create trigger trg_notif_konsultasi after insert or update on public.konsultasi
for each row execute function public.notif_konsultasi();

-- pertanyaan baru di papan tanya
create or replace function public.notif_tanya()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_nama text;
begin
  select nama into v_nama from public.pegawai where id = new.penanya_id;
  perform public.kirim_wa('papan_tanya',
    '❓ *Pertanyaan baru di papan tanya*' || E'\n' ||
    new.judul || E'\n' ||
    'Dari: ' || coalesce(v_nama, 'pegawai') || coalesce(' · topik ' || new.topik, '') || E'\n\n' ||
    'Yang tahu jawabannya, bantu di ' || public.situs() || 'admin.html (+3 poin, +7 bila paling membantu)');
  return new;
end $$;
drop trigger if exists trg_notif_tanya on public.pertanyaan;
create trigger trg_notif_tanya after insert on public.pertanyaan
for each row execute function public.notif_tanya();

-- pengingat harian 08.00 WITA, hanya bila ada yang perlu ditindaklanjuti
create or replace function public.pengingat_harian()
returns void language plpgsql volatile security definer set search_path = public as $$
declare v_hari date := (now() at time zone 'Asia/Makassar')::date;
        n_telat int; n_tunda int; n_kon int; v_kon text; v_pesan text := '';
begin
  select count(*) into n_telat from public.kunjungan where status in ('proses','surat','eskalasi') and tenggat < v_hari;
  select count(*) into n_tunda from public.kunjungan where status in ('proses','surat','eskalasi');
  select count(*) into n_kon   from public.konsultasi where status = 'diajukan';
  select string_agg('• ' || to_char(jam,'HH24:MI') || ' ' || nama || coalesce(' — ' || topik, '') ||
                    ' (narasumber: ' || coalesce((select g.nama from public.pegawai g where g.id = k.narasumber_id), 'belum ada') || ')', E'\n' order by jam)
    into v_kon from public.konsultasi k where k.tanggal = v_hari and k.status = 'dijadwalkan';

  if n_telat = 0 and n_tunda = 0 and n_kon = 0 and v_kon is null then return; end if;

  v_pesan := '☀️ *Pengingat PST ' || to_char(v_hari, 'DD-MM-YYYY') || '*' || E'\n';
  if n_telat > 0 then v_pesan := v_pesan || '⚠️ ' || n_telat || ' tiket sudah lewat tenggat' || E'\n'; end if;
  if n_tunda > 0 then v_pesan := v_pesan || '⏳ ' || n_tunda || ' tiket masih berjalan' || E'\n'; end if;
  if n_kon   > 0 then v_pesan := v_pesan || '📅 ' || n_kon || ' permintaan konsultasi belum dijadwalkan' || E'\n'; end if;
  if v_kon is not null then v_pesan := v_pesan || 'Konsultasi hari ini:' || E'\n' || v_kon || E'\n'; end if;
  v_pesan := v_pesan || E'\n' || public.situs() || 'admin.html';
  perform public.kirim_wa('pengingat', v_pesan);
end $$;
revoke execute on function public.pengingat_harian() from public, anon, authenticated;

-- jadwalkan bila pg_cron sudah aktif (00:00 UTC = 08:00 WITA, Senin–Jumat)
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'cron' and p.proname = 'schedule') then
    perform cron.schedule('pst-pengingat-harian', '0 0 * * 1-5', 'select public.pengingat_harian()');
  end if;
end $$;

-- ============================================================ PERBAIKAN 03 --
-- PINTAR Kukar: isi situs indikator strategis dikelola dari ruang pegawai.
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

-- --------------------------------------------------------------- 6. PEGAWAI --
-- Setelah membuat pengguna di Authentication › Users, jalankan sekali per orang:
--
--   insert into public.pegawai (id, nama, nip, jabatan, peran)
--   select id, 'Nama Lengkap', '1990xxxx', 'Statistisi Ahli Pertama', 'admin'
--   from auth.users where email = 'nama@bps.go.id'
--   on conflict (id) do update set nama = excluded.nama, peran = excluded.peran;
