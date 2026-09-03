-- ============================================================================
-- PERBAIKAN 01 — keamanan poin, keadilan poin, dan pembatasan cek tiket
-- Jalankan SEKALI di SQL Editor pada proyek yang sudah memakai schema.sql.
-- Aman dijalankan ulang. Tidak menghapus data apa pun.
--
-- Yang diperbaiki:
--   1. Poin "tuntas" hanya sekali per tiket (sebelumnya bertambah tiap kali
--      status dibolak-balik selesai → proses → selesai).
--   2. Poin "tuntas" tidak diberikan untuk tiket yang dibuat lalu ditutup
--      sendiri dalam waktu kurang dari satu jam.
--   3. Fungsi beri_poin tidak lagi bisa dipanggil dari peramban (sebelumnya
--      siapa pun yang login — termasuk sahabat data — bisa menambah poin).
--   4. Menjawab pertanyaan sendiri tidak berpoin; jawaban sendiri tidak bisa
--      ditandai paling membantu; yang boleh menandai hanya penanya atau admin.
--   5. Kolom "terbaik" pada jawaban tidak bisa diubah langsung, hanya lewat
--      fungsi tandai_terbaik.
--   6. Kode tiket selalu dibuat sistem; sahabat data tidak bisa mengisi kode,
--      catatan petugas, atau tenggat sendiri. Tenggat permintaan daring
--      otomatis 3 hari kerja.
--   7. cek_tiket dibatasi: 5 kali salah dalam 15 menit → diabaikan sementara.
--   8. Tampilan v_kunjungan memuat nama petugas pencatat dan penyelesai.
-- ============================================================================

-- ---------------------------------------------------------- 1–2. poin tiket
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

-- ------------------------------------------------- 3. tutup pintu beri_poin
revoke execute on function public.beri_poin(uuid, text, uuid) from public, anon, authenticated;
-- Pemicu dan tandai_terbaik tetap bisa memanggilnya karena berjalan sebagai pemilik.

-- --------------------------------------------- 4. keadilan poin tanya-jawab
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

-- ------------------------------------------ 5. kolom terbaik tidak bisa diakali
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

-- -------------------------------------------- 6. kode tiket & isian sahabat
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

-- ------------------------------------------------- 7. pembatasan cek tiket
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

-- --------------------------------------------- 8. nama petugas di daftar tiket
create or replace view public.v_kunjungan with (security_invoker = on) as
select k.*, p.nama as petugas_nama, s.nama as penyelesai_nama
from public.kunjungan k
left join public.pegawai p on p.id = k.petugas_id
left join public.pegawai s on s.id = k.diselesaikan_oleh;

-- ----------------------------------------------------- rapikan poin lama
-- Poin "tuntas" ganda yang sudah telanjur tercatat dari celah nomor 1:
-- sisakan satu per tiket, hapus sisanya.
delete from public.poin p
using public.poin q
where p.jenis = 'tuntas' and q.jenis = 'tuntas' and p.ref = q.ref and p.id > q.id;
