-- ============================================================================
-- PERBAIKAN 07 — Asisten PST yang bertindak dan belajar
-- Jalankan SEKALI di SQL Editor setelah perbaikan-06. Aman dijalankan ulang.
--   1. ajukan_permintaan(p): permintaan data dari obrolan asisten tanpa akun —
--      masuk ke tabel kunjungan sebagai tiket 'proses' (kode PST-…), dibatasi
--      3 pengajuan/jam per alamat IP dan 3 tiket aktif per nomor HP.
--   2. notif_tiket: WhatsApp ke petugas juga untuk tiket dari asisten.
--   3. asisten_log: pertanyaan pengunjung + jenis jawaban + nilai 👍/👎, tanpa
--      identitas (nomor/kode/email disamarkan sebelum dikirim dan di sini).
--      Ditulis lewat asisten_catat/asisten_nilai (anon), dibaca pegawai di
--      Ruang Pegawai → Pertanyaan asisten.
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
