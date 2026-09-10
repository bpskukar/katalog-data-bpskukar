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
  ('konsultasi_durasi',    '30',  true,  'Lama satu sesi, menit'),
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
  durasi_menit        integer not null default 30,

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
    new.durasi_menit := coalesce(public.atur('konsultasi_durasi'), '30')::int;
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

-- ============================================================ PERBAIKAN 04 --
-- Penarikan otomatis dari Web API BPS (lihat perbaikan-04.sql).
-- ------------------------------------------------------------ 0. ekstensi
do $$
begin
  begin
    create extension if not exists http with schema extensions;
  exception when others then
    raise notice 'Ekstensi http belum bisa dibuat dari sini (%). Aktifkan lewat Dashboard → Database → Extensions → http, lalu jalankan ulang skrip ini.', sqlerrm;
  end;
end $$;

-- ------------------------------------------------------------ 1. pengaturan
insert into public.pengaturan (kunci, nilai, publik, keterangan) values
  ('bps_api_key',        '',     false, 'Kunci Web API BPS (webapi.bps.go.id). Kosong = sinkron mati'),
  ('bps_domain_prov',    '6400', false, 'Domain BPS Provinsi Kalimantan Timur (tabel per kabupaten/kota)'),
  ('bps_domain_kab',     '6403', false, 'Domain BPS Kabupaten Kutai Kartanegara'),
  ('bps_vervar_kukar',   '6403', false, 'Kode wilayah Kukar pada tabel provinsi (vervar)'),
  ('bps_sinkron_aktif',  'true', false, 'true = tarik otomatis tiap hari 02.00 WITA'),
  ('bps_sinkron_terakhir', '',   true,  'Waktu sinkron terakhir (diisi sistem)')
on conflict (kunci) do nothing;

-- kunci hanya boleh diatur admin; lewat RPC supaya tidak perlu SQL Editor
create or replace function public.atur_pengaturan(p_kunci text, p_nilai text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Hanya admin yang boleh mengubah pengaturan.'; end if;
  if p_kunci not in ('bps_api_key','bps_domain_prov','bps_domain_kab','bps_vervar_kukar','bps_sinkron_aktif') then
    raise exception 'Pengaturan % tidak boleh diubah dari sini.', p_kunci;
  end if;
  update public.pengaturan set nilai = coalesce(trim(p_nilai), '') where kunci = p_kunci;
end $$;
revoke execute on function public.atur_pengaturan(text, text) from public, anon;
grant execute on function public.atur_pengaturan(text, text) to authenticated;

-- status pengaturan untuk pegawai (kunci tidak dikirim utuh)
create or replace function public.bps_status()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_key text;
begin
  if not public.is_pegawai() then raise exception 'Hanya pegawai.'; end if;
  v_key := coalesce(public.atur('bps_api_key'), '');
  return jsonb_build_object(
    'kunci_terpasang', v_key <> '',
    'kunci_awal', case when v_key <> '' then left(v_key, 4) || '…' || right(v_key, 3) else null end,
    'domain_prov', public.atur('bps_domain_prov'),
    'domain_kab', public.atur('bps_domain_kab'),
    'vervar_kukar', public.atur('bps_vervar_kukar'),
    'sinkron_aktif', coalesce(public.atur('bps_sinkron_aktif'), 'true') = 'true',
    'sinkron_terakhir', nullif(public.atur('bps_sinkron_terakhir'), ''),
    'http_tersedia', exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                             where p.proname = 'http_get' and n.nspname in ('extensions','public')),
    'cron_tersedia', exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                             where n.nspname = 'cron' and p.proname = 'schedule')
  );
end $$;
revoke execute on function public.bps_status() from public, anon;
grant execute on function public.bps_status() to authenticated;

-- ------------------------------------------------------------ 2. tabel
-- pemetaan bagian isi ↔ variabel Web API BPS
create table if not exists public.sumber_api (
  id            serial primary key,
  target        text not null,             -- kartu:<id> | deret:<bagian>:<seri> | wilayah:<kolom>
  domain        text not null default '6400',
  var_id        integer not null,
  var_label     text,
  vervar        text,                      -- kode wilayah pada tabel (null = ikut bps_vervar_kukar / semua utk wilayah)
  turvar        text,                      -- turunan variabel (null = pertama / "Tidak ada")
  turtahun      text,                      -- turunan tahun (null = "Tahunan" / pertama)
  pengali       numeric not null default 1,  -- mis. 0.001 bila API dalam jiwa tetapi situs dalam ribu jiwa
  aktif         boolean not null default true,
  catatan       text,
  terakhir_cek  timestamptz,
  terakhir_ubah timestamptz,
  nilai_terakhir jsonb,
  dibuat        timestamptz not null default now()
);
alter table public.sumber_api add column if not exists pengali numeric not null default 1;
create unique index if not exists sumber_api_target on public.sumber_api (target);
alter table public.sumber_api enable row level security;
drop policy if exists sumber_api_pegawai on public.sumber_api;
create policy sumber_api_pegawai on public.sumber_api for all
  using (public.is_pegawai()) with check (public.is_pegawai());

-- jejak setiap penarikan
create table if not exists public.sinkron_log (
  id        bigserial primary key,
  waktu     timestamptz not null default now(),
  sumber_id integer,
  target    text,
  status    text not null,                 -- berubah | sama | gagal | terbit
  pesan     text,
  rincian   jsonb
);
alter table public.sinkron_log enable row level security;
drop policy if exists sinkron_log_baca on public.sinkron_log;
create policy sinkron_log_baca on public.sinkron_log for select using (public.is_pegawai());
revoke insert, update, delete on public.sinkron_log from anon, authenticated;

-- cache daftar variabel per domain (supaya pencarian di ruang pegawai instan)
create table if not exists public.bps_var_cache (
  domain   text not null,
  var_id   integer not null,
  judul    text,
  satuan   text,
  subjek   text,
  vertikal text,
  diambil  timestamptz not null default now(),
  primary key (domain, var_id)
);
alter table public.bps_var_cache enable row level security;
drop policy if exists bps_var_cache_baca on public.bps_var_cache;
create policy bps_var_cache_baca on public.bps_var_cache for select using (public.is_pegawai());
revoke insert, update, delete on public.bps_var_cache from anon, authenticated;

-- ------------------------------------------------------------ 3. pemanggil API
-- Satu-satunya tempat kunci dipakai. Dipanggil dari fungsi lain (definer).
create or replace function public.bps_ambil(p_path text)
returns jsonb language plpgsql volatile security definer set search_path = public, extensions as $$
declare v_key text; v_url text; v_status int; v_body text; v_json jsonb;
begin
  v_key := coalesce(public.atur('bps_api_key'), '');
  if v_key = '' then raise exception 'Kunci Web API BPS belum diisi (Sumber otomatis → Kunci API).'; end if;
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where p.proname = 'http_get' and n.nspname in ('extensions','public')) then
    raise exception 'Ekstensi http belum aktif. Aktifkan lewat Dashboard → Database → Extensions → http.';
  end if;
  -- Web API BPS memakai gaya jalur: .../domain/6400/var/123/key/<kunci>
  v_url := 'https://webapi.bps.go.id/v1/api/' || rtrim(p_path, '/') || '/key/' || v_key;
  -- pasang batas waktu bila fungsinya ada (pgsql-http ≥ 1.4)
  begin perform http_set_curlopt('CURLOPT_TIMEOUT_MS', '25000'); exception when others then null; end;
  select status, content into v_status, v_body from http_get(v_url);
  if v_status <> 200 then raise exception 'Web API BPS menjawab HTTP % untuk %', v_status, p_path; end if;
  begin v_json := v_body::jsonb; exception when others then raise exception 'Jawaban Web API BPS bukan JSON.'; end;
  if v_json ? 'status' and v_json->>'status' <> 'OK' then
    raise exception 'Web API BPS: %', coalesce(v_json->>'message', v_json->>'status');
  end if;
  return v_json;
end $$;
revoke execute on function public.bps_ambil(text) from public, anon, authenticated;

-- uji kunci: ambil 1 halaman daftar variabel domain kabupaten
create or replace function public.bps_uji_kunci()
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v jsonb;
begin
  if not public.is_pegawai() then raise exception 'Hanya pegawai.'; end if;
  v := public.bps_ambil('list/model/var/domain/' || coalesce(public.atur('bps_domain_prov'),'6400') || '/page/1');
  return jsonb_build_object('ok', true, 'halaman', v->'data'->0);
end $$;
revoke execute on function public.bps_uji_kunci() from public, anon;
grant execute on function public.bps_uji_kunci() to authenticated;

-- muat/segarkan daftar variabel satu domain ke cache, beberapa halaman per panggilan
-- (RPC dari peramban dibatasi ±8 detik oleh Supabase; ruang pegawai memanggil berulang)
create or replace function public.bps_muat_var(p_domain text, p_mulai integer default 1, p_jumlah integer default 4)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v jsonb; v_hal int := greatest(p_mulai, 1); v_total int := v_hal; v_n int := 0; r jsonb; v_akhir int;
begin
  if not public.is_pegawai() then raise exception 'Hanya pegawai.'; end if;
  if p_domain !~ '^\d{4}$' then raise exception 'Domain harus 4 digit, mis. 6400.'; end if;
  if v_hal = 1 then delete from public.bps_var_cache where domain = p_domain; end if;
  v_akhir := v_hal + greatest(least(p_jumlah, 10), 1) - 1;
  while v_hal <= v_total and v_hal <= v_akhir and v_hal <= 200 loop
    v := public.bps_ambil('list/model/var/domain/' || p_domain || '/page/' || v_hal);
    v_total := coalesce((v->'data'->0->>'pages')::int, 1);
    for r in select * from jsonb_array_elements(coalesce(v->'data'->1, '[]'::jsonb)) loop
      insert into public.bps_var_cache (domain, var_id, judul, satuan, subjek, vertikal)
      values (p_domain, (r->>'var_id')::int, r->>'title', r->>'unit', coalesce(r->>'sub_name', r->>'subj', r->>'subcsa_name'), r->>'vertical')
      on conflict (domain, var_id) do update set judul = excluded.judul, satuan = excluded.satuan, subjek = excluded.subjek, vertikal = excluded.vertikal, diambil = now();
      v_n := v_n + 1;
    end loop;
    v_hal := v_hal + 1;
  end loop;
  return jsonb_build_object('dimuat', v_n, 'halaman_berikut', case when v_hal <= v_total then v_hal else null end, 'total_halaman', v_total,
                            'jumlah_cache', (select count(*) from public.bps_var_cache where domain = p_domain));
end $$;
revoke execute on function public.bps_muat_var(text, integer, integer) from public, anon;
grant execute on function public.bps_muat_var(text, integer, integer) to authenticated;

-- ---------------------------------------------------- 4. pembacaan datacontent
-- Web API BPS: datacontent berkunci gabungan vervar||var||turvar||tahun||turtahun.
-- Mengembalikan deret {label_tahun: nilai} untuk satu vervar/turvar/turtahun.
create or replace function public.bps_deret(p jsonb, p_vervar text, p_turvar text, p_turtahun text)
returns jsonb language plpgsql immutable as $$
declare v_var text; v_turvar text; v_turtahun text; v_vervar text; t jsonb; k text; hasil jsonb := '{}'::jsonb; v_val jsonb;
begin
  v_var := p->'var'->0->>'val';
  -- vervar: yang diminta, atau satu-satunya/pertama
  select x->>'val' into v_vervar from jsonb_array_elements(coalesce(p->'vervar','[]'::jsonb)) x
   where p_vervar is null or x->>'val' = p_vervar or x->>'label' = p_vervar limit 1;
  if v_vervar is null then return null; end if;
  -- turvar: yang diminta, atau "Tidak ada"/"Total"/pertama
  select x->>'val' into v_turvar from jsonb_array_elements(coalesce(p->'turvar','[]'::jsonb)) x
   where p_turvar is null or x->>'val' = p_turvar or x->>'label' = p_turvar
   order by case when p_turvar is null and (x->>'label' ilike '%tidak ada%' or x->>'label' ilike 'total%' or x->>'label' ilike 'jumlah%') then 0 else 1 end limit 1;
  v_turvar := coalesce(v_turvar, '0');
  -- turtahun: yang diminta, atau "Tahunan"/pertama; tabel tanpa turunan tahun → kunci tanpa bagian ini
  select x->>'val' into v_turtahun from jsonb_array_elements(case when jsonb_typeof(p->'turtahun') = 'array' then p->'turtahun' else '[]'::jsonb end) x
   where p_turtahun is null or x->>'val' = p_turtahun or x->>'label' = p_turtahun
   order by case when p_turtahun is null and x->>'label' ilike 'tahunan%' then 0 else 1 end limit 1;
  if v_turtahun is null and jsonb_typeof(p->'turtahun') = 'array' and jsonb_array_length(p->'turtahun') > 0 then v_turtahun := '0'; end if;
  v_turtahun := coalesce(v_turtahun, '');
  for t in select * from jsonb_array_elements(coalesce(p->'tahun','[]'::jsonb)) loop
    k := v_vervar || v_var || v_turvar || (t->>'val') || v_turtahun;
    v_val := p->'datacontent'->k;
    -- cadangan: sebagian tabel menyusun kunci tanpa turunan tahun
    if v_val is null and v_turtahun <> '' then k := v_vervar || v_var || v_turvar || (t->>'val'); v_val := p->'datacontent'->k; end if;
    -- angka biasanya numerik; bila dikirim sebagai teks angka ("6.72"), diterima juga
    if v_val is not null and jsonb_typeof(v_val) = 'string' and (p->'datacontent'->>k) ~ '^-?\d+(\.\d+)?$' then
      v_val := to_jsonb((p->'datacontent'->>k)::numeric);
    end if;
    if v_val is not null and jsonb_typeof(v_val) = 'number' then
      hasil := hasil || jsonb_build_object(t->>'label', v_val);
    end if;
  end loop;
  return hasil;
end $$;

-- nilai tahun terakhir untuk semua vervar (kab/kota) → {kode_vervar: nilai}
create or replace function public.bps_per_wilayah(p jsonb, p_turvar text, p_turtahun text)
returns jsonb language plpgsql immutable as $$
declare w jsonb; d jsonb; hasil jsonb := '{}'::jsonb; th text; v jsonb; th_maks text := null;
begin
  for w in select * from jsonb_array_elements(coalesce(p->'vervar','[]'::jsonb)) loop
    d := public.bps_deret(p, w->>'val', p_turvar, p_turtahun);
    if d is null or d = '{}'::jsonb then continue; end if;
    select k, d->k into th, v from jsonb_object_keys(d) k order by k desc limit 1;   -- tahun terbesar
    if th_maks is null or th > th_maks then th_maks := th; end if;
    hasil := hasil || jsonb_build_object(w->>'val', jsonb_build_object('tahun', th, 'nilai', v, 'label', w->>'label'));
  end loop;
  return jsonb_build_object('tahun', th_maks, 'wilayah', hasil);
end $$;

-- pratinjau untuk ruang pegawai: struktur tabel + deret contoh
create or replace function public.bps_pratinjau(p_domain text, p_var integer, p_vervar text default null, p_turvar text default null, p_turtahun text default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v jsonb;
begin
  if not public.is_pegawai() then raise exception 'Hanya pegawai.'; end if;
  v := public.bps_ambil('list/model/data/domain/' || p_domain || '/var/' || p_var);
  return jsonb_build_object(
    'var', v->'var'->0, 'vervar', v->'vervar', 'turvar', v->'turvar', 'turtahun', v->'turtahun', 'tahun', v->'tahun',
    'labelvervar', v->>'labelvervar',
    'deret', public.bps_deret(v, coalesce(p_vervar, case when p_domain = coalesce(public.atur('bps_domain_prov'),'6400') then public.atur('bps_vervar_kukar') end), p_turvar, p_turtahun),
    'per_wilayah', public.bps_per_wilayah(v, p_turvar, p_turtahun)
  );
end $$;
revoke execute on function public.bps_pratinjau(text, integer, text, text, text) from public, anon;
grant execute on function public.bps_pratinjau(text, integer, text, text, text) to authenticated;

-- kalikan semua angka dalam deret (kartu/deret: {tahun: nilai}; wilayah: {wilayah:{kode:{nilai}}})
create or replace function public.bps_kali(p_seri jsonb, p_pengali numeric)
returns jsonb language plpgsql immutable as $$
declare hasil jsonb; k text; w jsonb;
begin
  if p_seri is null or p_pengali is null or p_pengali = 1 then return p_seri; end if;
  if p_seri ? 'wilayah' then
    hasil := p_seri; w := '{}'::jsonb;
    for k in select key from jsonb_each(p_seri->'wilayah') loop
      w := w || jsonb_build_object(k, jsonb_set(p_seri->'wilayah'->k, '{nilai}', to_jsonb(trim_scale(round((p_seri->'wilayah'->k->>'nilai')::numeric * p_pengali, 4)))));
    end loop;
    return jsonb_set(hasil, '{wilayah}', w);
  end if;
  hasil := '{}'::jsonb;
  for k in select key from jsonb_each(p_seri) loop
    hasil := hasil || jsonb_build_object(k, trim_scale(round((p_seri->>k)::numeric * p_pengali, 4)));
  end loop;
  return hasil;
end $$;

-- ------------------------------------------------- 5. menerapkan ke isi situs
-- p_data = isi situs (jsonb); p_target = kartu:<id> | deret:<bagian>:<seri> | wilayah:<kolom>
-- p_seri = {tahun: nilai} (kartu/deret) atau {tahun, wilayah:{kode:{nilai,..}}} (wilayah)
create or replace function public.bps_terapkan(p_data jsonb, p_target text, p_seri jsonb)
returns jsonb language plpgsql immutable as $$
declare bagian text[]; d jsonb := p_data; i int; item jsonb; th text; v jsonb; labels jsonb; lbl text; seri jsonb; k text; kode text; kolom text;
        arr jsonb; n int; baru jsonb; s_key text;
begin
  bagian := string_to_array(p_target, ':');
  if bagian[1] = 'kartu' then
    -- tahun terakhir → indikator[id].value; tahun di abbr diganti
    select k2, p_seri->k2 into th, v from jsonb_object_keys(p_seri) k2 order by k2 desc limit 1;
    if th is null then return d; end if;
    for i in 0 .. jsonb_array_length(coalesce(d->'indikator','[]'::jsonb)) - 1 loop
      item := d->'indikator'->i;
      if item->>'id' = bagian[2] then
        item := jsonb_set(item, '{value}', v);
        if item->>'abbr' ~ '\d{4}' then item := jsonb_set(item, '{abbr}', to_jsonb(regexp_replace(item->>'abbr', '\d{4}', th))); end if;
        d := jsonb_set(d, array['indikator', i::text], item);
      end if;
    end loop;
    return d;
  elsif bagian[1] = 'deret' then
    -- bagian[2] = kemiskinan | ipm | pdrbTahun ; bagian[3] = nama seri (p0, nilai, adhb, ...)
    labels := coalesce(d->bagian[2]->'label', '[]'::jsonb);
    seri := coalesce(d->bagian[2]->bagian[3], '[]'::jsonb);
    -- label boleh berhias ("2024*", "2025**"); pencocokan memakai angkanya saja
    -- 1) isi/perbarui nilai pada tahun yang sudah ada
    for i in 0 .. jsonb_array_length(labels) - 1 loop
      lbl := regexp_replace(labels->>i, '[^0-9]', '', 'g');
      if p_seri ? lbl then
        while jsonb_array_length(seri) <= i loop seri := seri || 'null'::jsonb; end loop;
        seri := jsonb_set(seri, array[i::text], p_seri->lbl);
      end if;
    end loop;
    d := jsonb_set(d, array[bagian[2], bagian[3]], seri);
    -- 2) tahun baru di API yang lebih besar dari label terakhir → tambah kolom; seri lain diisi null
    for th in select k2 from jsonb_object_keys(p_seri) k2 order by k2 loop
      if not exists (select 1 from jsonb_array_elements_text(labels) x where regexp_replace(x, '[^0-9]', '', 'g') = th)
         and (jsonb_array_length(labels) = 0 or th > regexp_replace(labels->>(jsonb_array_length(labels)-1), '[^0-9]', '', 'g')) then
        labels := labels || to_jsonb(th);
        for s_key in select key from jsonb_each(d->bagian[2]) where jsonb_typeof(value) = 'array' and key <> 'label' and key <> 'komponen' loop
          arr := d->bagian[2]->s_key;
          while jsonb_array_length(arr) < jsonb_array_length(labels) - 1 loop arr := arr || 'null'::jsonb; end loop;
          arr := arr || (case when s_key = bagian[3] then p_seri->th else 'null'::jsonb end);
          d := jsonb_set(d, array[bagian[2], s_key], arr);
        end loop;
        d := jsonb_set(d, array[bagian[2], 'label'], labels);
      end if;
    end loop;
    return d;
  elsif bagian[1] = 'wilayah' then
    kolom := bagian[2];   -- miskin | laki | perempuan | ipm | uhh | hls | rls | ppp | tpt | lpe | pdrbKapita | gini
    for i in 0 .. jsonb_array_length(coalesce(d->'wilayah','[]'::jsonb)) - 1 loop
      item := d->'wilayah'->i;
      kode := item->>'bps';
      if kode is not null and (p_seri->'wilayah') ? kode then
        v := p_seri->'wilayah'->kode->'nilai';
        if v is not null then d := jsonb_set(d, array['wilayah', i::text, kolom], v); end if;
      end if;
    end loop;
    -- pembanding (bagian "Bandingkan"): tahun data dan angka provinsi (vervar 6400) ikut diperbarui
    s_key := case kolom when 'miskin' then 'Miskin' when 'laki' then 'Penduduk' when 'perempuan' then 'Penduduk'
                        when 'ipm' then 'Ipm' when 'uhh' then 'Ipm' when 'hls' then 'Ipm' when 'rls' then 'Ipm' when 'ppp' then 'Ipm'
                        when 'tpt' then 'Tpt' when 'lpe' then 'Lpe' when 'pdrbKapita' then 'PdrbKapita' when 'gini' then 'Gini' else null end;
    if s_key is not null then
      if d ? 'banding' = false then d := jsonb_set(d, '{banding}', '{}'::jsonb); end if;
      if p_seri->>'tahun' is not null then d := jsonb_set(d, array['banding', 'tahun' || s_key], to_jsonb(p_seri->>'tahun')); end if;
      if (p_seri->'wilayah') ? '6400' and kolom not in ('laki','perempuan') then
        s_key := case kolom when 'miskin' then 'Miskin' when 'ipm' then 'Ipm' when 'uhh' then 'Uhh' when 'hls' then 'Hls' when 'rls' then 'Rls' when 'ppp' then 'Ppp'
                            when 'tpt' then 'Tpt' when 'lpe' then 'Lpe' when 'pdrbKapita' then 'PdrbKapita' when 'gini' then 'Gini' end;
        d := jsonb_set(d, array['banding', 'prov' || s_key], p_seri->'wilayah'->'6400'->'nilai');
      end if;
    end if;
    return d;
  end if;
  return d;
end $$;

-- ------------------------------------------------------------- 6. penarikan
-- Pemicu jaga_indikator menuntut pegawai aktif; penarikan otomatis berjalan sebagai
-- sistem, jadi diberi jalur khusus lewat pengaturan sesi 'pst.sinkron'.
create or replace function public.jaga_indikator()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_sistem boolean := coalesce(current_setting('pst.sinkron', true), '') = '1';
begin
  if not v_sistem and not public.is_pegawai() then
    raise exception 'Hanya pegawai aktif yang boleh mengubah data indikator.';
  end if;
  if jsonb_typeof(new.data) <> 'object' then raise exception 'Isi data harus berupa objek JSON.'; end if;
  if pg_column_size(new.data) > 600000 then raise exception 'Isi data terlalu besar (maksimal 600 KB).'; end if;
  new.id          := 'utama';
  new.versi       := coalesce(old.versi, 0) + 1;
  new.diubah_oleh := case when v_sistem then null else auth.uid() end;
  new.diubah_pada := now();
  new.catatan     := nullif(left(coalesce(new.catatan, ''), 300), '');
  return new;
end $$;

-- Penarikan dibagi dua supaya panggilan dari peramban tetap singkat:
--   bps_tarik_satu(id)  : satu permintaan HTTP, simpan deret ke sumber_api.nilai_terakhir
--   bps_terbitkan()     : terapkan semua deret tersimpan ke isi situs, terbitkan bila berubah
--   bps_tarik()         : keduanya untuk semua pemetaan — dipakai jadwal harian
create or replace function public.bps_tarik_satu(p_id integer)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare s record; v jsonb; seri jsonb; v_vervar text;
begin
  if auth.uid() is not null and not public.is_pegawai() then raise exception 'Hanya pegawai.'; end if;
  select * into s from public.sumber_api where id = p_id;
  if s is null then raise exception 'Pemetaan tidak ditemukan.'; end if;
  begin
    v := public.bps_ambil('list/model/data/domain/' || s.domain || '/var/' || s.var_id);
    if split_part(s.target, ':', 1) = 'wilayah' then
      seri := public.bps_per_wilayah(v, s.turvar, s.turtahun);
    else
      v_vervar := coalesce(s.vervar, case when s.domain = coalesce(public.atur('bps_domain_prov'),'6400') then public.atur('bps_vervar_kukar') end);
      seri := public.bps_deret(v, v_vervar, s.turvar, s.turtahun);
    end if;
    if seri is null or seri = '{}'::jsonb or (split_part(s.target, ':', 1) = 'wilayah' and (seri->'wilayah') = '{}'::jsonb) then
      raise exception 'Tidak ada angka untuk wilayah/turunan yang dipilih.';
    end if;
    seri := public.bps_kali(seri, s.pengali);
    update public.sumber_api set terakhir_cek = now(), nilai_terakhir = seri,
           var_label = coalesce(var_label, v->'var'->0->>'label'),
           terakhir_ubah = case when nilai_terakhir is distinct from seri then now() else terakhir_ubah end
     where id = s.id;
    if s.nilai_terakhir is distinct from seri then
      insert into public.sinkron_log (sumber_id, target, status, pesan, rincian)
      values (s.id, s.target, 'berubah', 'Angka baru dari Web API BPS', jsonb_build_object('lama', s.nilai_terakhir, 'baru', seri));
      return jsonb_build_object('id', s.id, 'target', s.target, 'status', 'berubah', 'deret', seri);
    end if;
    return jsonb_build_object('id', s.id, 'target', s.target, 'status', 'sama', 'deret', seri);
  exception when others then
    insert into public.sinkron_log (sumber_id, target, status, pesan) values (s.id, s.target, 'gagal', sqlerrm);
    update public.sumber_api set terakhir_cek = now() where id = s.id;
    return jsonb_build_object('id', s.id, 'target', s.target, 'status', 'gagal', 'pesan', sqlerrm);
  end;
end $$;
revoke execute on function public.bps_tarik_satu(integer) from public, anon;
grant execute on function public.bps_tarik_satu(integer) to authenticated;

create or replace function public.bps_terbitkan()
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare s record; d jsonb; d0 jsonb; v_versi int; n int := 0; v_by text; v_manual boolean := auth.uid() is not null;
begin
  if v_manual and not public.is_pegawai() then raise exception 'Hanya pegawai.'; end if;
  select data into d0 from public.indikator_konten where id = 'utama';
  if d0 is null then
    insert into public.sinkron_log (status, pesan) values ('gagal', 'Isi indikator belum ada di server (terbitkan versi 1 dulu).');
    return jsonb_build_object('terbit', false, 'pesan', 'Isi indikator belum ada di server.');
  end if;
  d := d0;
  for s in select * from public.sumber_api where aktif and nilai_terakhir is not null order by id loop
    d := public.bps_terapkan(d, s.target, s.nilai_terakhir); n := n + 1;
  end loop;
  update public.pengaturan set nilai = to_char(now() at time zone 'Asia/Makassar', 'YYYY-MM-DD"T"HH24:MI:SS') where kunci = 'bps_sinkron_terakhir';
  if d is not distinct from d0 then return jsonb_build_object('terbit', false, 'diterapkan', n); end if;
  d := jsonb_set(d, '{meta}', coalesce(d->'meta', '{}'::jsonb) || jsonb_build_object(
         'sinkron_terakhir', to_char(now() at time zone 'Asia/Makassar', 'YYYY-MM-DD"T"HH24:MI:SS'),
         'sumber', 'Web API BPS', 'jumlah_sumber', n));
  v_by := case when v_manual then 'ditarik pegawai' else 'jadwal harian' end;
  perform set_config('pst.sinkron', '1', true);
  update public.indikator_konten set data = d, catatan = 'Otomatis: Web API BPS (' || v_by || '), ' || n || ' pemetaan diterapkan'
   where id = 'utama' returning versi into v_versi;
  perform set_config('pst.sinkron', '', true);
  insert into public.sinkron_log (status, pesan, rincian) values ('terbit', 'Versi ' || v_versi || ' diterbitkan otomatis', jsonb_build_object('diterapkan', n));
  return jsonb_build_object('terbit', true, 'versi', v_versi, 'diterapkan', n);
end $$;
revoke execute on function public.bps_terbitkan() from public, anon;
grant execute on function public.bps_terbitkan() to authenticated;

-- jadwal harian: semua pemetaan lalu terbitkan
create or replace function public.bps_tarik()
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare s record; r jsonb; n_ubah int := 0; n_sama int := 0; n_gagal int := 0; hasil jsonb; v_terbitan jsonb;
begin
  if auth.uid() is not null and not public.is_pegawai() then raise exception 'Hanya pegawai.'; end if;
  if auth.uid() is null and coalesce(public.atur('bps_sinkron_aktif'), 'true') <> 'true' then
    return jsonb_build_object('dilewati', true, 'alasan', 'sinkron otomatis dimatikan');
  end if;
  for s in select id from public.sumber_api where aktif order by id loop
    r := public.bps_tarik_satu(s.id);
    if r->>'status' = 'berubah' then n_ubah := n_ubah + 1; elsif r->>'status' = 'gagal' then n_gagal := n_gagal + 1; else n_sama := n_sama + 1; end if;
  end loop;
  hasil := public.bps_terbitkan();
  -- terbitan terbaru (perbaikan-06) ikut ditarik bila fungsinya ada; kegagalannya tidak menghentikan tarikan angka
  if to_regprocedure('public.bps_tarik_terbitan()') is not null then
    begin execute 'select public.bps_tarik_terbitan()' into v_terbitan; exception when others then v_terbitan := jsonb_build_object('gagal', sqlerrm); end;
  end if;
  return jsonb_build_object('berubah', n_ubah, 'sama', n_sama, 'gagal', n_gagal, 'terbit', hasil->'terbit', 'versi', hasil->'versi', 'terbitan', v_terbitan);
end $$;
revoke execute on function public.bps_tarik() from public, anon;
grant execute on function public.bps_tarik() to authenticated;

-- jadwal harian 02.00 WITA (18.00 UTC) bila pg_cron aktif
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'cron' and p.proname = 'schedule') then
    perform cron.schedule('pst-sinkron-bps', '0 18 * * *', 'select public.bps_tarik()');
  end if;
end $$;

-- ------------------------------------------------------------ 7. pandangan log
create or replace view public.v_sinkron_log with (security_invoker = on) as
select l.id, l.waktu, l.sumber_id, l.target, l.status, l.pesan, l.rincian, s.var_label, s.var_id, s.domain
  from public.sinkron_log l left join public.sumber_api s on s.id = l.sumber_id
 order by l.waktu desc;
grant select on public.v_sinkron_log to authenticated;

-- ============================================================ PERBAIKAN 06 --
-- ============================================================================
-- PERBAIKAN 06 — "Terbit baru dari BPS Kukar" & agenda rilis di beranda PINTAR
-- Jalankan SEKALI di SQL Editor. Aman dijalankan ulang, tidak menghapus data.
-- Boleh dijalankan sebelum/sesudah perbaikan-04 (Web API). Tanpa perbaikan-04,
-- daftar terbitan diisi manual lewat Ruang Pegawai → Terbitan & agenda.
--
--   • Tabel terbitan: BRS, publikasi, infografis, tabel, berita (sumber 'api'
--     atau 'manual') dan agenda rilis mendatang (selalu manual).
--   • bps_tarik_terbitan(): menarik BRS/publikasi/infografis/berita terbaru
--     domain kabupaten (6403) dari Web API BPS; dipanggil jadwal harian
--     bps_tarik() bila perbaikan-04 terpasang, atau tombol di Ruang Pegawai.
--   • v_terbitan: tampilan publik (hanya yang aktif), dibaca beranda.
-- ============================================================================

-- ------------------------------------------------------------ 1. tabel
create table if not exists public.terbitan (
  id          bigserial primary key,
  jenis       text not null check (jenis in ('brs','publikasi','infografis','tabel','berita','agenda')),
  judul       text not null,
  ringkas     text,
  tanggal     date not null,                       -- tanggal rilis (atau jadwal, untuk agenda)
  tautan      text,                                -- halaman di situs BPS
  berkas      text,                                -- PDF/Excel langsung (bila ada)
  gambar      text,                                -- sampul/thumbnail
  sumber      text not null default 'manual' check (sumber in ('manual','api')),
  domain      text,
  ref_id      text,                                -- id di Web API (unik per domain+jenis)
  aktif       boolean not null default true,
  dibuat      timestamptz not null default now(),
  diubah      timestamptz not null default now(),
  diubah_oleh uuid
);
create unique index if not exists terbitan_api_unik on public.terbitan (domain, jenis, ref_id) where sumber = 'api';
create unique index if not exists terbitan_manual_unik on public.terbitan (jenis, judul, tanggal) where sumber = 'manual';
create index if not exists terbitan_tanggal on public.terbitan (tanggal desc);

alter table public.terbitan enable row level security;
drop policy if exists terbitan_baca on public.terbitan;
create policy terbitan_baca on public.terbitan for select using (aktif or public.is_pegawai());
drop policy if exists terbitan_tulis on public.terbitan;
create policy terbitan_tulis on public.terbitan for insert with check (public.is_pegawai());
drop policy if exists terbitan_ubah on public.terbitan;
create policy terbitan_ubah on public.terbitan for update using (public.is_pegawai()) with check (public.is_pegawai());
drop policy if exists terbitan_hapus on public.terbitan;
create policy terbitan_hapus on public.terbitan for delete using (public.is_pegawai() and sumber = 'manual');
grant select on public.terbitan to anon, authenticated;
grant insert, update, delete on public.terbitan to authenticated;
grant usage, select on sequence public.terbitan_id_seq to authenticated;

create or replace function public.jaga_terbitan()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if not (coalesce(current_setting('pst.sinkron', true), '') = '1') then new.sumber := 'manual'; end if;
    if new.sumber = 'manual' then new.domain := null; new.ref_id := null; end if;
  end if;
  if tg_op = 'UPDATE' and not (coalesce(current_setting('pst.sinkron', true), '') = '1') then
    -- pegawai hanya boleh menyunting isi manual; baris API hanya boleh disembunyikan/ditampilkan & diberi ringkasan
    if old.sumber = 'api' then
      new.judul := old.judul; new.tanggal := old.tanggal; new.tautan := old.tautan; new.berkas := old.berkas;
      new.gambar := old.gambar; new.jenis := old.jenis; new.sumber := old.sumber; new.domain := old.domain; new.ref_id := old.ref_id;
    end if;
  end if;
  new.judul := left(trim(new.judul), 300);
  new.ringkas := nullif(left(coalesce(new.ringkas, ''), 600), '');
  new.diubah := now();
  new.diubah_oleh := auth.uid();
  return new;
end $$;
drop trigger if exists trg_jaga_terbitan on public.terbitan;
create trigger trg_jaga_terbitan before insert or update on public.terbitan
  for each row execute function public.jaga_terbitan();

-- tampilan publik untuk beranda: terbitan terbaru (≤ 90 hari mendatang untuk agenda)
create or replace view public.v_terbitan with (security_invoker = on) as
select id, jenis, judul, ringkas, tanggal, tautan, berkas, gambar, sumber
  from public.terbitan
 where aktif
 order by tanggal desc, id desc;
grant select on public.v_terbitan to anon, authenticated;

-- agenda rutin yang pasti (boleh diubah/dihapus pegawai)
insert into public.terbitan (jenis, judul, ringkas, tanggal, tautan, sumber) values
  ('agenda', 'Kecamatan Dalam Angka 2026 (seluruh kecamatan)', 'Terbit serentak setiap 26 September.', date '2026-09-26', 'https://kukarkab.bps.go.id/id/publication', 'manual'),
  ('agenda', 'Kabupaten Kutai Kartanegara Dalam Angka 2027', 'Terbit setiap 28 Februari.', date '2027-02-28', 'https://kukarkab.bps.go.id/id/publication', 'manual')
on conflict do nothing;

-- ------------------------------------------------------------ 2. tarikan Web API
-- Mengambil halaman pertama BRS, publikasi, infografis, dan berita domain kabupaten.
-- Nama bidang Web API (title, rl_date, abstract, pdf, thumbnail, cover, img, …)
-- dibaca dengan coalesce supaya tahan terhadap perbedaan kecil antar-model.
create or replace function public.bps_tarik_terbitan()
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v_domain text; v jsonb; r jsonb; v_model text; v_jenis text; n_baru int := 0; n_sama int := 0; n_gagal int := 0;
        v_id text; v_judul text; v_tgl date; v_tautan text; v_berkas text; v_gambar text; v_ringkas text; v_ada bigint; hasil jsonb := '[]'::jsonb;
begin
  if auth.uid() is not null and not public.is_pegawai() then raise exception 'Hanya pegawai.'; end if;
  if to_regprocedure('public.bps_ambil(text)') is null then
    raise exception 'Web API BPS belum terpasang (jalankan perbaikan-04.sql dan isi kunci API).';
  end if;
  v_domain := coalesce(public.atur('bps_domain_kab'), '6403');
  perform set_config('pst.sinkron', '1', true);
  foreach v_model in array array['pressrelease','publication','infographic','news'] loop
    v_jenis := case v_model when 'pressrelease' then 'brs' when 'publication' then 'publikasi' when 'infographic' then 'infografis' else 'berita' end;
    begin
      v := public.bps_ambil('list/model/' || v_model || '/domain/' || v_domain || '/page/1');
      for r in select * from jsonb_array_elements(coalesce(v->'data'->1, '[]'::jsonb)) loop
        v_id := coalesce(r->>'brs_id', r->>'pub_id', r->>'inf_id', r->>'news_id', r->>'id');
        v_judul := coalesce(r->>'title', r->>'judul');
        if v_id is null or v_judul is null then continue; end if;
        begin
          v_tgl := coalesce(nullif(r->>'rl_date',''), nullif(r->>'updt_date',''), nullif(r->>'sch_date',''))::date;
        exception when others then v_tgl := null; end;
        if v_tgl is null then
          begin v_tgl := left(coalesce(nullif(r->>'rl_date',''), nullif(r->>'updt_date',''), ''), 10)::date; exception when others then v_tgl := current_date; end;
        end if;
        v_berkas := coalesce(nullif(r->>'pdf',''), nullif(r->>'dl',''), nullif(r->>'excel',''));
        v_gambar := coalesce(nullif(r->>'thumbnail',''), nullif(r->>'cover',''), nullif(r->>'img',''), nullif(r->>'picture',''));
        v_ringkas := left(regexp_replace(coalesce(r->>'abstract', r->>'desc', r->>'news', ''), '<[^>]+>', '', 'g'), 600);
        -- halaman di situs BPS kabupaten: /id/<model>/<yyyy>/<mm>/<dd>/<id>/<slug>.html (slug bebas)
        v_tautan := 'https://kukarkab.bps.go.id/id/' || v_model || '/' || to_char(v_tgl, 'YYYY/MM/DD') || '/' || v_id || '/' ||
                    left(regexp_replace(lower(v_judul), '[^a-z0-9]+', '-', 'g'), 80) || '.html';
        select id into v_ada from public.terbitan where sumber = 'api' and domain = v_domain and jenis = v_jenis and ref_id = v_id;
        if v_ada is null then
          insert into public.terbitan (jenis, judul, ringkas, tanggal, tautan, berkas, gambar, sumber, domain, ref_id)
          values (v_jenis, v_judul, nullif(v_ringkas, ''), v_tgl, v_tautan, v_berkas, v_gambar, 'api', v_domain, v_id);
          n_baru := n_baru + 1;
        else
          update public.terbitan set judul = v_judul, ringkas = coalesce(ringkas, nullif(v_ringkas, '')), tanggal = v_tgl,
                 tautan = v_tautan, berkas = v_berkas, gambar = v_gambar where id = v_ada;
          n_sama := n_sama + 1;
        end if;
      end loop;
      hasil := hasil || jsonb_build_object('model', v_model, 'status', 'ok', 'jumlah', jsonb_array_length(coalesce(v->'data'->1, '[]'::jsonb)));
    exception when others then
      n_gagal := n_gagal + 1;
      hasil := hasil || jsonb_build_object('model', v_model, 'status', 'gagal', 'pesan', sqlerrm);
    end;
  end loop;
  perform set_config('pst.sinkron', '', true);
  if to_regclass('public.sinkron_log') is not null then
    insert into public.sinkron_log (target, status, pesan, rincian)
    values ('terbitan', case when n_gagal = 4 then 'gagal' when n_baru > 0 then 'berubah' else 'sama' end,
            n_baru || ' terbitan baru, ' || n_sama || ' sudah ada, ' || n_gagal || ' model gagal', hasil);
  end if;
  return jsonb_build_object('baru', n_baru, 'sama', n_sama, 'gagal', n_gagal, 'rinci', hasil);
end $$;
revoke execute on function public.bps_tarik_terbitan() from public, anon;
grant execute on function public.bps_tarik_terbitan() to authenticated;


-- ============================================================ PERBAIKAN 07 --
-- Asisten PST yang bertindak (permintaan data dari obrolan) dan belajar (asisten_log).
-- Salinan supabase/perbaikan-07.sql; proyek baru cukup menjalankan berkas ini.
-- ============================================================================
-- ------------------------------------------------ 1. permintaan data dari asisten
create or replace function public.ajukan_permintaan(p jsonb)
returns text language plpgsql volatile security definer set search_path = public as $$
declare v_ip text; v_n int; v_hp text; v_kode text; v_sah uuid; v_nama text; v_keb text;
begin
  v_ip := coalesce(current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for', '');
  if v_ip <> '' then
    delete from public.ajuan_log where waktu < now() - interval '1 day';
    select count(*) into v_n from public.ajuan_log where ip = v_ip and waktu > now() - interval '1 hour';
    if v_n >= 3 then raise exception 'Terlalu banyak pengajuan dari jaringan ini. Coba lagi satu jam lagi.'; end if;
    insert into public.ajuan_log (ip) values (v_ip);
  end if;

  v_hp   := regexp_replace(coalesce(p->>'no_hp',''), '\D', '', 'g');
  v_nama := left(trim(coalesce(p->>'nama','')), 120);
  v_keb  := left(trim(coalesce(p->>'kebutuhan','')), 2000);
  if length(v_hp) < 9 or length(v_hp) > 15 then raise exception 'Nomor HP tidak sah.'; end if;
  if length(v_nama) < 2 then raise exception 'Nama wajib diisi.'; end if;
  if length(v_keb) < 8 then raise exception 'Tuliskan kebutuhan datanya lebih jelas.'; end if;

  select count(*) into v_n from public.kunjungan
   where status = 'proses' and regexp_replace(coalesce(no_hp,''), '\D', '', 'g') = v_hp;
  if v_n >= 3 then raise exception 'Masih ada tiga permintaan aktif untuk nomor ini. Tunggu sampai salah satunya selesai, atau hubungi PST.'; end if;

  select id into v_sah from public.sahabat where id = auth.uid();

  insert into public.kunjungan
    (sahabat_id, petugas_id, nama, email, no_hp, nama_instansi, pemanfaatan, jenis_layanan, sarana, kebutuhan, status, tenggat)
  values
    (v_sah, null, v_nama, nullif(left(trim(coalesce(p->>'email','')), 120), ''), v_hp,
     nullif(left(trim(coalesce(p->>'nama_instansi','')), 120), ''), nullif(left(coalesce(p->>'pemanfaatan',''), 60), ''),
     '{"Konsultasi data statistik"}', 'Asisten PST (daring)', v_keb, 'proses',
     public.tambah_hari_kerja((now() at time zone 'Asia/Makassar')::date, 3))
  returning kode_tiket into v_kode;
  return v_kode;
end $$;
grant execute on function public.ajukan_permintaan(jsonb) to anon, authenticated;

-- ------------------------------------------------ 2. notifikasi tiket daring (sahabat & asisten)
create or replace function public.notif_tiket()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.petugas_id is null and (new.sahabat_id is not null or new.sarana = 'Asisten PST (daring)') then
    perform public.kirim_wa('tiket_daring',
      '🔔 *Tiket daring baru* ' || new.kode_tiket || E'\n' ||
      'Dari: ' || new.nama || coalesce(' (' || new.nama_instansi || ')', '') ||
      case when new.sarana = 'Asisten PST (daring)' then ' — lewat asisten PST' else '' end || E'\n' ||
      'Kebutuhan: ' || left(new.kebutuhan, 300) || E'\n' ||
      'Tenggat: ' || coalesce(to_char(new.tenggat, 'DD-MM-YYYY'), '—') || E'\n\n' ||
      'Siapa yang ambil? Buka ' || public.situs() || 'admin.html');
  end if;
  return new;
end $$;
drop trigger if exists trg_notif_tiket on public.kunjungan;
create trigger trg_notif_tiket after insert on public.kunjungan
for each row execute function public.notif_tiket();

-- ------------------------------------------------ 3. catatan asisten
create table if not exists public.asisten_log (
  id         bigserial primary key,
  waktu      timestamptz not null default now(),
  halaman    text,
  pertanyaan text not null,
  jenis      text,                 -- indikator | banding | tren | kecamatan | glosarium | pengetahuan | katalog | terbitan | sapa | kosong
  skor       numeric,
  nilai      smallint check (nilai in (-1, 1)),
  sesi       text,                 -- pengenal acak per pembukaan halaman, bukan identitas
  ditangani  boolean not null default false,
  catatan    text
);
comment on table public.asisten_log is 'Pertanyaan ke asisten PST + jenis jawaban + nilai pengunjung, tanpa identitas.';
create index if not exists asisten_log_waktu_idx on public.asisten_log (waktu desc);
alter table public.asisten_log enable row level security;
revoke all on public.asisten_log from anon, authenticated;
grant select on public.asisten_log to authenticated;
grant update (ditangani, catatan) on public.asisten_log to authenticated;

drop policy if exists asl_baca on public.asisten_log;
create policy asl_baca on public.asisten_log for select to authenticated using (public.is_pegawai());
drop policy if exists asl_ubah on public.asisten_log;
create policy asl_ubah on public.asisten_log for update to authenticated using (public.is_pegawai()) with check (public.is_pegawai());

create or replace function public.asisten_samarkan(t text) returns text language sql immutable as $$
  select left(regexp_replace(regexp_replace(regexp_replace(coalesce(t, ''),
    '(PST|KON)-\d{4}-\d{4}', '\1-****-****', 'gi'),
    '\d{6,}', '######', 'g'),
    '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}', 'email@…', 'g'), 300)
$$;

create or replace function public.asisten_catat(p jsonb)
returns bigint language plpgsql volatile security definer set search_path = public as $$
declare v_id bigint; v_n int; v_sesi text; v_t text;
begin
  v_t := public.asisten_samarkan(p->>'pertanyaan');
  if length(trim(v_t)) < 2 then return null; end if;
  v_sesi := left(coalesce(p->>'sesi',''), 40);
  -- paling banyak 120 catatan per sesi per jam (anti-banjir)
  select count(*) into v_n from public.asisten_log where sesi = v_sesi and waktu > now() - interval '1 hour';
  if v_sesi <> '' and v_n >= 120 then return null; end if;
  insert into public.asisten_log (halaman, pertanyaan, jenis, skor, sesi)
  values (left(coalesce(p->>'halaman',''), 120), v_t, left(coalesce(p->>'jenis',''), 30),
          case when (p->>'skor') ~ '^-?[0-9.]+$' then (p->>'skor')::numeric else null end, nullif(v_sesi, ''))
  returning id into v_id;
  return v_id;
end $$;
grant execute on function public.asisten_catat(jsonb) to anon, authenticated;

create or replace function public.asisten_nilai(p_id bigint, p_sesi text, p_nilai int)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if p_nilai not in (-1, 1) then return; end if;
  update public.asisten_log set nilai = p_nilai
   where id = p_id and sesi = left(coalesce(p_sesi, ''), 40) and waktu > now() - interval '1 day';
end $$;
grant execute on function public.asisten_nilai(bigint, text, int) to anon, authenticated;

-- bersihkan catatan lama secara berkala (opsional): simpan 180 hari
create or replace function public.asisten_bersihkan() returns void language sql security definer set search_path = public as $$
  delete from public.asisten_log where waktu < now() - interval '180 days'
$$;
revoke execute on function public.asisten_bersihkan() from public, anon, authenticated;

-- --------------------------------------------------------------- 6. PEGAWAI --
-- Setelah membuat pengguna di Authentication › Users, jalankan sekali per orang:
--
--   insert into public.pegawai (id, nama, nip, jabatan, peran)
--   select id, 'Nama Lengkap', '1990xxxx', 'Statistisi Ahli Pertama', 'admin'
--   from auth.users where email = 'nama@bps.go.id'
--   on conflict (id) do update set nama = excluded.nama, peran = excluded.peran;
