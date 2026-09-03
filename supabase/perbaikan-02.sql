-- ============================================================================
-- PERBAIKAN 02 — konsultasi daring, notifikasi WhatsApp, profil pegawai
-- Jalankan SEKALI di SQL Editor. Aman dijalankan ulang, tidak menghapus data.
-- Wajib sudah menjalankan schema.sql (dan perbaikan-01 bila proyek lama).
--
-- Yang ditambahkan:
--   1. Profil pegawai: keahlian (topik), tautan Zoom pribadi, nomor HP.
--      Pegawai biasa tidak bisa lagi mengubah peran/aktif dirinya sendiri.
--   2. Tabel pengaturan (jam konsultasi, gateway WhatsApp, alamat situs).
--   3. Konsultasi daring: pengajuan tanpa akun, slot ≥ H+3 hari kerja,
--      tidak bisa bentrok, kode KON-YYMM-NNNN, cek status dengan kode + HP.
--   4. Poin "konsul" (5) untuk narasumber yang menuntaskan sesi.
--   5. Notifikasi WhatsApp lewat gateway (pg_net): tiket daring baru,
--      permintaan konsultasi, pertanyaan di papan tanya, jadwal ditetapkan,
--      plus pengingat harian 08.00 WITA (pg_cron) untuk tiket terlambat.
-- Ekstensi pg_net dan pg_cron diaktifkan lewat Dashboard → Database →
-- Extensions. Skrip ini tetap aman dijalankan sebelum keduanya aktif.
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
  ('konsultasi_min_hari',  '3',   true,  'Paling cepat H+n dari hari pengajuan'),
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

-- ------------------------------------------------------------ 4. poin konsul
alter table public.poin drop constraint if exists poin_jenis_check;
alter table public.poin add constraint poin_jenis_check
  check (jenis in ('catat','tanya','jawab','terbaik','tuntas','konsul'));

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
revoke execute on function public.beri_poin(uuid, text, uuid) from public, anon, authenticated;

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
