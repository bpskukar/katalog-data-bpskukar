-- ============================================================================
-- PERBAIKAN 04 — Pembaruan otomatis isi Indikator Strategis dari Web API BPS
-- Jalankan SEKALI di SQL Editor. Aman dijalankan ulang, tidak menghapus data.
-- Wajib sudah menjalankan perbaikan-03.sql.
--
-- Cara kerja:
--   • Petugas mendaftarkan kunci Web API BPS (gratis, webapi.bps.go.id) lewat
--     Ruang Pegawai → Indikator → Sumber otomatis. Kunci disimpan di tabel
--     pengaturan (tidak terbaca publik) dan hanya dipakai dari dalam basis data.
--   • Tabel sumber_api memetakan "bagian isi situs" ↔ "variabel tabel dinamis
--     BPS" (domain 6400 = Provinsi Kaltim, rincian per kab/kota; 6403 = Kukar).
--   • Setiap hari pukul 02.00 WITA fungsi bps_tarik() menarik semua pemetaan
--     yang aktif, membandingkan dengan isi terbit, dan bila ada angka baru
--     menerbitkan versi baru (catatan "Otomatis: Web API BPS …"). Semua
--     perubahan tercatat di sinkron_log dan bisa dipulihkan lewat riwayat versi.
--   • Yang otomatis: angka kartu indikator (+ tahun di keterangannya), deret
--     grafik tahunan (kemiskinan, IPM, PDRB), angka kabupaten/kota di kartogram.
--     Yang tetap manual: narasi, sorotan (kotak berwarna), rekomendasi, teks.
-- Memerlukan ekstensi "http" (Dashboard → Database → Extensions → http) dan
-- pg_cron untuk jadwal. Skrip ini tetap aman dijalankan sebelum keduanya aktif.
-- ============================================================================

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

-- ------------------------------------------------------------- selesai
-- Setelah ini: Ruang Pegawai → Indikator → Sumber otomatis → isi kunci API →
-- Muat daftar variabel → petakan kartu/deret ke variabel BPS → Tarik sekarang.
