-- ============================================================================
-- Katalog & PST BPS Kabupaten Kutai Kartanegara
-- Skema basis data Supabase. Tempelkan seluruh berkas ini ke SQL Editor
-- Supabase lalu jalankan sekali. Aman dijalankan ulang.
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
  jenis      text not null check (jenis in ('catat','tanya','jawab','terbaik','tuntas')),
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
create or replace function public.buat_kode_tiket()
returns trigger language plpgsql as $$
begin
  if new.kode_tiket is null then
    new.kode_tiket := 'PST-' || to_char(now() at time zone 'Asia/Makassar', 'YYMM')
                      || '-' || lpad(nextval('public.tiket_seq')::text, 4, '0');
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
                    when 'terbaik' then 7 when 'tuntas' then 5 else 0 end;
  if v = 0 then return; end if;
  insert into public.poin (pegawai_id, jenis, nilai, ref) values (p_pegawai, p_jenis, v, p_ref);
end $$;

create or replace function public.poin_kunjungan()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.beri_poin(new.petugas_id, 'catat', new.id);
  elsif tg_op = 'UPDATE' and new.status = 'selesai' and old.status <> 'selesai' then
    new.selesai_pada := now();
    new.diselesaikan_oleh := coalesce(new.diselesaikan_oleh, auth.uid());
    perform public.beri_poin(new.diselesaikan_oleh, 'tuntas', new.id);
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
begin perform public.beri_poin(new.penjawab_id, 'jawab', new.id); return new; end $$;

drop trigger if exists trg_poin_jawab on public.jawaban;
create trigger trg_poin_jawab after insert on public.jawaban
for each row execute function public.poin_jawab();

-- Menandai jawaban paling membantu: hanya satu per pertanyaan, sekali berpoin.
create or replace function public.tandai_terbaik(p_jawaban uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_pert uuid; v_peg uuid; v_sudah boolean;
begin
  if not public.is_pegawai() then raise exception 'Hanya pegawai yang boleh menandai.'; end if;
  select pertanyaan_id, penjawab_id into v_pert, v_peg from public.jawaban where id = p_jawaban;
  if v_pert is null then raise exception 'Jawaban tidak ditemukan.'; end if;

  select exists (select 1 from public.poin where jenis = 'terbaik' and ref = p_jawaban) into v_sudah;

  update public.jawaban set terbaik = (id = p_jawaban) where pertanyaan_id = v_pert;
  update public.pertanyaan set status = 'terjawab', jawaban_terbaik = p_jawaban where id = v_pert;

  if not v_sudah then perform public.beri_poin(v_peg, 'terbaik', p_jawaban); end if;
end $$;

-- Penelusuran tiket tanpa akun: kode tiket + 4 digit terakhir nomor HP.
create or replace function public.cek_tiket(p_kode text, p_hp4 text)
returns table (kode_tiket text, dibuat timestamptz, status text, kebutuhan text,
               jenis_layanan text[], hasil text, tenggat date, nama text)
language sql stable security definer set search_path = public as $$
  select k.kode_tiket, k.dibuat, k.status, k.kebutuhan, k.jenis_layanan, k.hasil, k.tenggat, k.nama
  from public.kunjungan k
  where upper(k.kode_tiket) = upper(trim(p_kode))
    and right(regexp_replace(coalesce(k.no_hp,''), '\D', '', 'g'), 4) = right(trim(p_hp4), 4)
  limit 1;
$$;
grant execute on function public.cek_tiket(text, text) to anon, authenticated;

-- ---------------------------------------------------------------- 4. TAMPILAN --

create or replace view public.v_peringkat with (security_invoker = on) as
select p.id as pegawai_id, p.nama, p.jabatan,
       coalesce(sum(o.nilai), 0)::int as poin,
       count(*) filter (where o.jenis = 'catat')::int   as n_catat,
       count(*) filter (where o.jenis = 'jawab')::int   as n_jawab,
       count(*) filter (where o.jenis = 'terbaik')::int as n_terbaik,
       count(*) filter (where o.jenis = 'tuntas')::int  as n_tuntas
from public.pegawai p
left join public.poin o on o.pegawai_id = p.id
where p.aktif
group by p.id, p.nama, p.jabatan;

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

-- --------------------------------------------------------------- 6. PEGAWAI --
-- Setelah membuat pengguna di Authentication › Users, jalankan sekali per orang:
--
--   insert into public.pegawai (id, nama, nip, jabatan, peran)
--   select id, 'Nama Lengkap', '1990xxxx', 'Statistisi Ahli Pertama', 'admin'
--   from auth.users where email = 'nama@bps.go.id'
--   on conflict (id) do update set nama = excluded.nama, peran = excluded.peran;
