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

-- jadwal harian: bila perbaikan-04 ada, bps_tarik() ikut menarik terbitan (kegagalan tidak menghentikan tarikan angka)
do $$
begin
  if to_regprocedure('public.bps_tarik()') is not null then
    execute $f$
      create or replace function public.bps_tarik()
      returns jsonb language plpgsql volatile security definer set search_path = public as $b$
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
        begin v_terbitan := public.bps_tarik_terbitan(); exception when others then v_terbitan := jsonb_build_object('gagal', sqlerrm); end;
        return jsonb_build_object('berubah', n_ubah, 'sama', n_sama, 'gagal', n_gagal, 'terbit', hasil->'terbit', 'versi', hasil->'versi', 'terbitan', v_terbitan);
      end $b$;
    $f$;
  end if;
end $$;
