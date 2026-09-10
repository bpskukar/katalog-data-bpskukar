/* ============================================================================
   Ruang pegawai — Indikator › Sumber otomatis (Web API BPS).
   Memetakan bagian isi situs indikator ke variabel tabel dinamis BPS, menguji
   kunci, melihat pratinjau angka, menarik sekarang, dan membaca log sinkron.
   Logika penarikannya ada di basis data (supabase/perbaikan-04.sql); di sini
   hanya antarmuka. Dipasang admin.html setelah indikator-admin.js.
   ========================================================================== */
(function () {
  "use strict";
  if (!window.PST) return;
  var esc = PST.esc, el = PST.el;
  var STATUS = null, SUMBER = [], KERJA = null, SESI = null, PRATINJAU = null, UBAH_ID = null;

  var TARGET_DERET = [
    ["deret:kemiskinan:p0", "Deret kemiskinan · P0 (%)"], ["deret:kemiskinan:p1", "Deret kemiskinan · P1"],
    ["deret:kemiskinan:p2", "Deret kemiskinan · P2"], ["deret:kemiskinan:garis", "Deret kemiskinan · garis kemiskinan (Rp)"],
    ["deret:ipm:nilai", "Deret IPM · nilai"],
    ["deret:pdrbTahun:adhb", "Deret PDRB tahunan · ADHB"], ["deret:pdrbTahun:adhk", "Deret PDRB tahunan · ADHK"], ["deret:pdrbTahun:lpe", "Deret PDRB tahunan · LPE (%)"]
  ];
  var TARGET_WILAYAH = [["wilayah:miskin", "Kab/kota · angka kemiskinan (%)"], ["wilayah:laki", "Kab/kota · penduduk laki-laki (ribu)"], ["wilayah:perempuan", "Kab/kota · penduduk perempuan (ribu)"],
    ["wilayah:ipm", "Kab/kota · IPM"], ["wilayah:uhh", "Kab/kota · umur harapan hidup"], ["wilayah:hls", "Kab/kota · harapan lama sekolah"], ["wilayah:rls", "Kab/kota · rata-rata lama sekolah"], ["wilayah:ppp", "Kab/kota · pengeluaran per kapita (ribu Rp)"],
    ["wilayah:tpt", "Kab/kota · TPT (%)"], ["wilayah:lpe", "Kab/kota · pertumbuhan ekonomi (%)"], ["wilayah:pdrbKapita", "Kab/kota · PDRB per kapita (juta Rp)"], ["wilayah:gini", "Kab/kota · rasio Gini"]];

  function namaTarget(t) {
    var semua = TARGET_DERET.concat(TARGET_WILAYAH);
    for (var i = 0; i < semua.length; i++) if (semua[i][0] === t) return semua[i][1];
    if (t.indexOf("kartu:") === 0) {
      var id = t.slice(6), it = ((KERJA && KERJA.indikator) || []).filter(function (x) { return x.id === id; })[0];
      return "Kartu · " + (it ? it.label : id);
    }
    return t;
  }
  function tgl(iso) { return iso ? PST.tgl(iso, true) : "—"; }
  function ringkasDeret(s) {
    if (!s) return "—";
    if (s.wilayah) return "tahun " + esc(s.tahun) + ", " + Object.keys(s.wilayah).length + " wilayah";
    var k = Object.keys(s).sort();
    return k.slice(-3).map(function (t) { return esc(t) + ": " + esc(s[t]); }).join(" · ") + (k.length > 3 ? " …" : "");
  }

  /* ------------------------------------------------------------- status */
  function gambarStatus() {
    var s = STATUS || {}, admin = SESI && SESI.profil && SESI.profil.peran === "admin";
    var pil = function (ok, ya, tidak) { return '<span class="pill ' + (ok ? "ada" : "mohon") + '">' + esc(ok ? ya : tidak) + "</span>"; };
    el("soStatus").innerHTML =
      '<div class="so-status">' +
        "<div><b>Kunci Web API BPS</b><div>" + pil(s.kunci_terpasang, "terpasang " + (s.kunci_awal || ""), "belum diisi") + "</div></div>" +
        "<div><b>Ekstensi http</b><div>" + pil(s.http_tersedia, "aktif", "belum aktif — Dashboard › Database › Extensions › http") + "</div></div>" +
        "<div><b>Jadwal harian 02.00 WITA</b><div>" + pil(s.cron_tersedia && s.sinkron_aktif, s.cron_tersedia ? "aktif" : "pg_cron belum aktif", s.cron_tersedia ? "dimatikan" : "pg_cron belum aktif") + "</div></div>" +
        "<div><b>Sinkron terakhir</b><div>" + esc(s.sinkron_terakhir ? tgl(s.sinkron_terakhir) : "belum pernah") + "</div></div>" +
      "</div>" +
      (s.demo ? '<div class="msg msg--warn" style="margin-top:10px">Mode demo: tidak ada panggilan Web API sungguhan. Alur bisa dicoba, hasilnya tiruan.</div>' : "") +
      (admin ? '<div class="btnrow" style="margin-top:12px;align-items:flex-end">' +
          '<div class="field" style="margin:0;flex:1;min-width:260px"><label class="fl" for="soKunci">Kunci API (daftar gratis di webapi.bps.go.id → Profil → Aplikasi → Generate Key)</label>' +
          '<input type="password" id="soKunci" placeholder="' + (s.kunci_terpasang ? "sudah terpasang — isi hanya bila ingin mengganti" : "tempel kunci di sini") + '" autocomplete="off"></div>' +
          '<button type="button" class="btn btn--sm" id="soSimpanKunci">Simpan kunci</button>' +
          '<button type="button" class="btn btn--ghost btn--sm" id="soUji">Uji kunci</button>' +
          '<button type="button" class="btn btn--ghost btn--sm" id="soJadwal">' + (s.sinkron_aktif ? "Matikan jadwal" : "Nyalakan jadwal") + "</button>" +
        "</div>"
        : '<p class="field__hint" style="margin-top:8px">Kunci API dan jadwal hanya bisa diatur admin PST.</p>');
    if (admin) {
      el("soSimpanKunci").onclick = function () {
        var k = el("soKunci").value.trim(); if (!k) { PST.pesan("soMsg", "warn", "Kunci kosong."); return; }
        PST.aturPengaturan("bps_api_key", k).then(function () { el("soKunci").value = ""; PST.pesan("soMsg", "ok", "Kunci tersimpan. Tekan Uji kunci."); return muatStatus(); })
          .catch(function (e) { PST.pesan("soMsg", "err", e.message); });
      };
      el("soUji").onclick = function () {
        PST.pesan("soMsg", "info", "Menghubungi Web API BPS…");
        PST.bpsUjiKunci().then(function (r) { PST.pesan("soMsg", "ok", "Kunci bekerja. Domain provinsi punya " + esc((r.halaman && r.halaman.total) || "?") + " variabel tabel dinamis."); })
          .catch(function (e) { PST.pesan("soMsg", "err", "Gagal: " + e.message); });
      };
      el("soJadwal").onclick = function () {
        PST.aturPengaturan("bps_sinkron_aktif", s.sinkron_aktif ? "false" : "true").then(muatStatus).catch(function (e) { PST.pesan("soMsg", "err", e.message); });
      };
    }
  }
  function muatStatus() { return PST.bpsStatus().then(function (s) { STATUS = s; gambarStatus(); }).catch(function (e) { el("soStatus").innerHTML = '<div class="msg msg--err">' + esc(e.message) + "</div>"; }); }

  /* --------------------------------------------------- daftar variabel BPS */
  function cariVar() {
    var domain = el("soDomain").value, kata = el("soCari").value;
    PST.daftarVarBps(domain, kata).then(function (r) {
      if (!r.length) { el("soHasilVar").innerHTML = '<div class="empty" style="padding:12px">Tidak ada. Tekan <b>Muat daftar variabel</b> dulu bila belum pernah, atau ganti kata kunci.</div>'; return; }
      el("soHasilVar").innerHTML = r.map(function (v) {
        return '<div class="so-var"><span class="kode">' + esc(v.var_id) + "</span><span>" + esc(v.judul) + (v.satuan ? ' <i style="color:var(--ink-3)">(' + esc(v.satuan) + ")</i>" : "") + "</span>" +
          '<button type="button" class="btn btn--ghost btn--sm" data-pakai="' + esc(v.var_id) + '" data-judul="' + esc(v.judul) + '">Pakai</button></div>';
      }).join("");
      PST.qa("[data-pakai]", el("soHasilVar")).forEach(function (b) {
        b.onclick = function () { el("soVar").value = b.dataset.pakai; el("soVarLabel").value = b.dataset.judul; el("soForm").scrollIntoView({ behavior: "smooth", block: "nearest" }); };
      });
    }).catch(function (e) { el("soHasilVar").innerHTML = '<div class="msg msg--err">' + esc(e.message) + "</div>"; });
  }

  /* --------------------------------------------------------- formulir peta */
  function isiTarget() {
    var kartu = ((KERJA && KERJA.indikator) || []).map(function (it) { return '<option value="kartu:' + esc(it.id) + '">Kartu · ' + esc(it.label) + "</option>"; }).join("");
    el("soTarget").innerHTML = '<optgroup label="Kartu indikator (angka tahun terakhir)">' + kartu + "</optgroup>" +
      '<optgroup label="Deret grafik tahunan">' + TARGET_DERET.map(function (t) { return '<option value="' + t[0] + '">' + esc(t[1]) + "</option>"; }).join("") + "</optgroup>" +
      '<optgroup label="Per kabupaten/kota Kaltim (kartogram & Bandingkan)">' + TARGET_WILAYAH.map(function (t) { return '<option value="' + t[0] + '">' + esc(t[1]) + "</option>"; }).join("") + "</optgroup>";
  }
  function bacaForm() {
    return { target: el("soTarget").value, domain: el("soDomainPeta").value, var_id: parseInt(el("soVar").value, 10) || null, var_label: el("soVarLabel").value.trim() || null,
      vervar: el("soVervar").value.trim() || null, turvar: el("soTurvar").value.trim() || null, turtahun: el("soTurtahun").value.trim() || null,
      pengali: parseFloat(el("soPengali").value) || 1, aktif: el("soAktif").checked, catatan: el("soCatatan").value.trim() || null };
  }
  function isiForm(r) {
    UBAH_ID = r ? r.id : null;
    el("soTarget").value = r ? r.target : el("soTarget").value; el("soDomainPeta").value = r ? r.domain : "6400";
    el("soVar").value = r ? r.var_id : ""; el("soVarLabel").value = r ? (r.var_label || "") : "";
    el("soVervar").value = r ? (r.vervar || "") : ""; el("soTurvar").value = r ? (r.turvar || "") : ""; el("soTurtahun").value = r ? (r.turtahun || "") : "";
    el("soPengali").value = r ? r.pengali : 1; el("soAktif").checked = r ? r.aktif !== false : true; el("soCatatan").value = r ? (r.catatan || "") : "";
    el("soSimpan").textContent = r ? "Simpan perubahan" : "Simpan pemetaan";
    el("soBatal").hidden = !r;
    el("soPratinjauHasil").innerHTML = "";
  }
  function pratinjau() {
    var f = bacaForm();
    if (!f.var_id) { PST.pesan("soMsg", "warn", "Isi ID variabel dulu (cari di daftar, lalu Pakai)."); return; }
    el("soPratinjauHasil").innerHTML = '<div class="empty" style="padding:12px">Menghubungi Web API BPS…</div>';
    PST.bpsPratinjau(f.domain, f.var_id, f.vervar, f.turvar, f.turtahun).then(function (p) {
      PRATINJAU = p;
      var opsi = function (arr, judul, id) {
        return arr && arr.length > 1 ? "<div><b>" + esc(judul) + ":</b> " + arr.map(function (x) { return '<button type="button" class="so-pilih" data-isi="' + id + '" data-v="' + esc(x.label) + '">' + esc(x.label) + "</button>"; }).join(" ") + "</div>" : "";
      };
      var wil = f.target.indexOf("wilayah:") === 0;
      el("soPratinjauHasil").innerHTML =
        '<div class="card" style="padding:14px 16px"><div class="card__title">' + esc((p.var && p.var.label) || "Variabel " + f.var_id) + (p.var && p.var.unit ? " (" + esc(p.var.unit) + ")" : "") + "</div>" +
        '<div style="font-size:13px;color:var(--ink-2);display:grid;gap:6px">' +
          "<div><b>Wilayah (" + esc(p.labelvervar || "vervar") + "):</b> " + (p.vervar || []).map(function (x) { return esc(x.label) + " [" + esc(x.val) + "]"; }).join(", ") + "</div>" +
          opsi(p.turvar, "Turunan variabel — klik untuk memilih", "soTurvar") + opsi(p.turtahun, "Turunan tahun — klik untuk memilih", "soTurtahun") +
          "<div><b>Tahun tersedia:</b> " + (p.tahun || []).map(function (x) { return esc(x.label); }).join(", ") + "</div>" +
          (wil
            ? "<div><b>Nilai tahun terakhir per wilayah (" + esc(p.per_wilayah && p.per_wilayah.tahun) + "):</b> " + Object.keys((p.per_wilayah && p.per_wilayah.wilayah) || {}).map(function (k) { var w = p.per_wilayah.wilayah[k]; return esc(w.label) + " = " + esc(w.nilai); }).join("; ") + "</div>"
            : "<div><b>Deret untuk Kukar (yang akan dipakai):</b> " + (p.deret && Object.keys(p.deret).length ? Object.keys(p.deret).sort().map(function (t) { return esc(t) + ": " + esc(p.deret[t]); }).join(" · ") : '<span style="color:var(--s-tidak)">kosong — periksa vervar/turunan</span>') + "</div>") +
          '<div class="field__hint">Bandingkan satuannya dengan yang tampil di situs. Bila API dalam ribu tetapi kartu dalam jiwa, isi pengali 1000 (atau 0.001 untuk sebaliknya).</div>' +
        "</div></div>";
      PST.qa(".so-pilih", el("soPratinjauHasil")).forEach(function (b) { b.onclick = function () { el(b.dataset.isi).value = b.dataset.v; pratinjau(); }; });
    }).catch(function (e) { el("soPratinjauHasil").innerHTML = '<div class="msg msg--err">' + esc(e.message) + "</div>"; });
  }
  function simpan() {
    var f = bacaForm();
    if (!f.var_id) { PST.pesan("soMsg", "warn", "ID variabel belum diisi."); return; }
    if (UBAH_ID) f.id = UBAH_ID;
    PST.simpanSumberApi(f).then(function () { PST.pesan("soMsg", "ok", "Pemetaan tersimpan. Tekan Tarik untuk mengambil angkanya sekarang, atau tunggu jadwal harian."); isiForm(null); return muatSumber(); })
      .catch(function (e) { PST.pesan("soMsg", "err", e.message); });
  }

  /* ----------------------------------------------------------- daftar peta */
  function muatSumber() {
    return PST.daftarSumberApi().then(function (r) {
      SUMBER = r;
      if (window.INDIKATOR_ADMIN && window.INDIKATOR_ADMIN.tandaiOtomatis) window.INDIKATOR_ADMIN.tandaiOtomatis(SUMBER);
      if (!r.length) { el("soDaftar").innerHTML = '<div class="empty" style="padding:16px">Belum ada pemetaan. Cari variabel di atas, tekan Pakai, pilih bagian isi yang dituju, pratinjau, lalu simpan.</div>'; return; }
      el("soDaftar").innerHTML = '<div class="tbl-scroll"><table class="tbl"><thead><tr><th>Bagian isi</th><th>Variabel BPS</th><th>Pilihan</th><th>Terakhir</th><th>Nilai terakhir</th><th></th></tr></thead><tbody>' +
        r.map(function (x) {
          return "<tr" + (x.aktif === false ? ' style="opacity:.55"' : "") + "><td><b>" + esc(namaTarget(x.target)) + "</b><br><span class='kode'>" + esc(x.target) + "</span></td>" +
            "<td>" + esc(x.var_label || "") + "<br><span style='font-size:12px;color:var(--ink-3)'>domain " + esc(x.domain) + " · var " + esc(x.var_id) + "</span></td>" +
            "<td style='font-size:12px'>" + [x.vervar ? "wilayah " + esc(x.vervar) : "", x.turvar ? "turunan " + esc(x.turvar) : "", x.turtahun ? esc(x.turtahun) : "", x.pengali && +x.pengali !== 1 ? "× " + esc(x.pengali) : ""].filter(Boolean).join("<br>") + "</td>" +
            "<td style='font-size:12px;white-space:nowrap'>cek " + esc(tgl(x.terakhir_cek)) + "<br>ubah " + esc(tgl(x.terakhir_ubah)) + "</td>" +
            "<td style='font-size:12px'>" + ringkasDeret(x.nilai_terakhir) + "</td>" +
            "<td style='white-space:nowrap'><button class='btn btn--ghost btn--sm' data-tarik='" + esc(x.id) + "'>Tarik</button> <button class='btn btn--ghost btn--sm' data-ubah='" + esc(x.id) + "'>Ubah</button> <button class='btn btn--ghost btn--sm' data-hapus='" + esc(x.id) + "'>Hapus</button></td></tr>";
        }).join("") + "</tbody></table></div>";
      PST.qa("[data-tarik]", el("soDaftar")).forEach(function (b) { b.onclick = function () { tarik(+b.dataset.tarik); }; });
      PST.qa("[data-ubah]", el("soDaftar")).forEach(function (b) { b.onclick = function () { var x = SUMBER.filter(function (y) { return String(y.id) === b.dataset.ubah; })[0]; isiForm(x); el("soForm").scrollIntoView({ behavior: "smooth", block: "nearest" }); }; });
      PST.qa("[data-hapus]", el("soDaftar")).forEach(function (b) { b.onclick = function () { if (!confirm("Hapus pemetaan ini? Angka yang sudah terbit tidak berubah.")) return; PST.hapusSumberApi(+b.dataset.hapus).then(muatSumber).catch(function (e) { PST.pesan("soMsg", "err", e.message); }); }; });
    }).catch(function (e) { el("soDaftar").innerHTML = '<div class="msg msg--err">' + esc(e.message) + "</div>"; });
  }

  function tarik(id) {
    el("soTarikSemua").disabled = true;
    PST.pesan("soMsg", "info", "Menarik dari Web API BPS…");
    PST.bpsTarik(id, function (i, n) { PST.pesan("soMsg", "info", "Menarik dari Web API BPS: pemetaan " + i + " dari " + n + "…"); }).then(function (r) {
      if (r.dilewati) { PST.pesan("soMsg", "warn", "Dilewati: " + r.alasan); return; }
      if (r.gagal && r.gagal === (r.berubah + r.sama + r.gagal)) PST.pesan("soMsg", "err", "Semua sumber gagal ditarik: " + (r.gagalRinci || []).join(" | "));
      else PST.pesan("soMsg", r.terbit ? "ok" : "info", (r.terbit ? "Versi " + r.versi + " diterbitkan otomatis. " : "Tidak ada angka baru. ") + r.berubah + " berubah · " + r.sama + " sama · " + r.gagal + " gagal" + (r.gagal ? " (" + (r.gagalRinci || []).join(" | ") + ")" : "") + ".");
      muatSumber(); muatLog(); muatStatus();
      if (r.terbit && window.INDIKATOR_ADMIN && window.INDIKATOR_ADMIN.muatUlang) window.INDIKATOR_ADMIN.muatUlang();
    }).catch(function (e) { PST.pesan("soMsg", "err", e.message); }).then(function () { el("soTarikSemua").disabled = false; });
  }

  function muatLog() {
    PST.logSinkron().then(function (r) {
      if (!r.length) { el("soLog").innerHTML = '<div class="empty" style="padding:12px">Belum ada catatan.</div>'; return; }
      el("soLog").innerHTML = r.map(function (x) {
        var w = { berubah: "ada", terbit: "prov", sama: "lain", gagal: "tidak" }[x.status] || "lain";
        var rinci = "";
        if (x.rincian && x.rincian.baru) rinci = "<div class='so-rinci'>lama: " + esc(ringkasDeret(x.rincian.lama)) + "<br>baru: " + esc(ringkasDeret(x.rincian.baru)) + "</div>";
        return "<div class='so-log'><span class='pill " + w + "'>" + esc(x.status) + "</span><span><b>" + esc(x.target ? namaTarget(x.target) : "—") + "</b> · " + esc(x.pesan || "") + rinci + "</span><span style='color:var(--ink-3);white-space:nowrap;font-size:12px'>" + esc(tgl(x.waktu)) + "</span></div>";
      }).join("");
    }).catch(function (e) { el("soLog").innerHTML = '<div class="msg msg--err">' + esc(e.message) + "</div>"; });
  }

  /* ------------------------------------------------------------- pasang */
  var siap = false;
  function mulai(kerja, sesi) {
    KERJA = kerja; SESI = sesi;
    if (!siap) {
      siap = true;
      el("soMuatVar").onclick = function () {
        el("soMuatVar").disabled = true;
        PST.pesan("soMsg", "info", "Memuat daftar variabel domain " + el("soDomain").value + "…");
        PST.bpsMuatVar(el("soDomain").value, function (hal, total, n) { PST.pesan("soMsg", "info", "Memuat daftar variabel: halaman " + hal + " dari " + total + " (" + n + " variabel)…"); })
          .then(function (n) { PST.pesan("soMsg", "ok", n + " variabel dimuat. Ketik kata kunci untuk mencari."); cariVar(); })
          .catch(function (e) { PST.pesan("soMsg", "err", e.message); })
          .then(function () { el("soMuatVar").disabled = false; });
      };
      var jeda; el("soCari").addEventListener("input", function () { clearTimeout(jeda); jeda = setTimeout(cariVar, 200); });
      el("soDomain").onchange = cariVar;
      el("soPratinjau").onclick = pratinjau;
      el("soSimpan").onclick = simpan;
      el("soBatal").onclick = function () { isiForm(null); };
      el("soTarikSemua").onclick = function () { tarik(null); };
      el("soSegarLog").onclick = muatLog;
    }
    isiTarget(); isiForm(null);
    muatStatus(); cariVar(); muatSumber(); muatLog();
  }

  window.SUMBER_OTOMATIS = { mulai: mulai, daftar: function () { return SUMBER; } };
})();
