/* ============================================================================
   Ruang pegawai PST — pencatatan kunjungan, papan tanya, rekap, peringkat.
   ========================================================================== */
(function () {
  "use strict";

  var B = window.BAKU, K = window.KATALOG, esc = PST.esc, el = PST.el;
  var SESI = null, TIKET = [], PEGAWAI = [], rujukan = [];

  var TOPIK = []; K.DATA.forEach(function (d) { if (TOPIK.indexOf(d.t) === -1) TOPIK.push(d.t); });

  /* ------------------------------------------------------------- penyalaan */
  el("spanduk").innerHTML = PST.spandukDemo();

  PST.sesi().then(function (s) {
    el("navbar").innerHTML = PST.nav("admin.html", s);
    PST.pasangKeluar();
    if (s && s.jenis === "pegawai") { SESI = s; mulai(); }
    else if (s && s.jenis === "sahabat") { location.href = "sahabat.html"; }
    else if (s && s.jenis === "nonaktif") {
      el("scMasuk").hidden = false;
      PST.pesan("msgMasuk", "warn", "Akun " + s.email + " sudah dinonaktifkan. Hubungi admin PST bila ini keliru.");
      PST.keluar();
    }
    else { el("scMasuk").hidden = false; }
  });

  el("formMasuk").onsubmit = function (e) {
    e.preventDefault();
    PST.pesan("msgMasuk", "info", "Memeriksa…");
    PST.masuk(el("mEmail").value.trim(), el("mSandi").value)
      .then(function () { location.reload(); })
      .catch(function (err) { PST.pesan("msgMasuk", "err", err.message); });
  };

  function mulai() {
    el("scRuang").hidden = false;
    var d = new Date();
    el("hariIni").textContent = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"][d.getDay()] +
      ", " + PST.tgl(d.toISOString()) + " · petugas: " + (SESI.profil.nama || SESI.email);

    isiPilihan();
    isiPilihanKon();
    pasangTab();
    muatTiket();
    muatTanya();
    PST.daftarPegawai().then(function (p) { PEGAWAI = p; }).catch(function(){});
  }

  /* --------------------------------------------------------- isi pilihan */
  function isiPilihan() {
    el("cJk").innerHTML = '<option value=""></option>' + PST.opsi(B.jenisKelamin);
    el("cPendidikan").innerHTML = '<option value=""></option>' + PST.opsi(B.pendidikan);
    el("cPekerjaan").innerHTML = '<option value=""></option>' + PST.opsi(B.pekerjaan);
    el("cKategori").innerHTML = '<option value=""></option>' + PST.opsi(B.kategoriInstansi);
    el("cPemanfaatan").innerHTML = '<option value=""></option>' + PST.opsi(B.pemanfaatan);
    el("cSarana").innerHTML = PST.opsi(B.sarana, "Datang langsung ke PST");
    el("cLayanan").innerHTML = PST.centang("cLayanan", B.jenisLayanan, ["Konsultasi data statistik"]);
    el("cStatus").innerHTML = Object.keys(B.statusTiket).map(function (k) {
      return '<option value="' + k + '">' + esc(B.statusTiket[k]) + "</option>";
    }).join("");
    el("tTopik").innerHTML = '<option value=""></option>' + PST.opsi(TOPIK);
    el("fStatus").innerHTML = '<option value="">Semua status</option>' +
      Object.keys(B.statusTiket).map(function (k) {
        return '<option value="' + k + '">' + esc(B.statusTiket[k]) + "</option>";
      }).join("");
  }

  function pasangTab() {
    PST.qa('.tabs button').forEach(function (b) {
      b.onclick = function () {
        PST.qa('.tabs button').forEach(function (x) { x.setAttribute("aria-selected", String(x === b)); });
        PST.qa(".panel").forEach(function (p) { p.hidden = p.id !== b.dataset.p; });
        if (b.dataset.p === "pRekap") gambarRekap();
        if (b.dataset.p === "pPeringkat") gambarPeringkat();
        if (b.dataset.p === "pTanya") muatTanya();
        if (b.dataset.p === "pKonsul") muatKon();
        if (b.dataset.p === "pProfil") gambarProfil();
        if (b.dataset.p === "pIndikator" && window.INDIKATOR_ADMIN) window.INDIKATOR_ADMIN.mulai();
        if (b.dataset.p === "pTerbitan" && window.TERBITAN_ADMIN) window.TERBITAN_ADMIN.mulai();
        if (b.dataset.p === "pAsisten" && window.ASISTEN_ADMIN) window.ASISTEN_ADMIN.mulai();
      };
    });
  }

  /* pencocokan katalog: lihat assets/cari.js */
  var cocokkan = window.CARI.cocokkan;

  function gambarCocokan() {
    var hasil = cocokkan(el("cKebutuhan").value);
    if (!hasil.length) { el("cocokan").innerHTML = ""; return; }
    el("cocokan").innerHTML = '<div class="cocok">' + hasil.map(function (d) {
      var ln = (d.ln || []).slice(0, 2).map(function (x) {
        return '<a class="cocok__a" href="' + esc(x.u) + '" target="_blank" rel="noopener">' + esc(x.l) + "</a>";
      }).join(" · ");
      return '<div class="cocok__i">' +
        '<span class="pill ' + d.st + '">' + esc(K.LABEL[d.st]) + "</span>" +
        '<span style="flex:1;min-width:200px"><span class="cocok__n">' + esc(d.n) + "</span>" +
          '<div class="cocok__meta">' +
            (d.lv && d.lv !== "\u2014" ? "level terendah " + esc(d.lv) + " · " : "") +
            (d.pd && d.pd !== "\u2014" ? esc(d.pd) + " · " : "") + esc(d.sm) + "</div>" +
          (ln ? '<div style="margin-top:4px">' + ln + "</div>" : "") +
          (d.cek ? '<div class="cocok__meta" style="color:var(--s-mohon)">perlu dipastikan lebih dulu</div>' : "") +
        "</span>" +
        '<button type="button" class="btn btn--ghost btn--sm" data-rujuk="' + esc(d.n) + '">rujuk</button>' +
        "</div>";
    }).join("") + "</div>";
    PST.qa("[data-rujuk]", el("cocokan")).forEach(function (b) {
      b.onclick = function () { tambahRujukan(b.dataset.rujuk); };
    });
  }

  function tambahRujukan(nama) {
    if (rujukan.indexOf(nama) === -1) rujukan.push(nama);
    gambarChip();
  }
  function gambarChip() {
    el("chipKosong").hidden = rujukan.length > 0;
    el("chipKatalog").innerHTML = rujukan.map(function (n, i) {
      return '<span class="chip">' + esc(n) + '<button type="button" data-x="' + i + '" aria-label="hapus">×</button></span>';
    }).join("");
    PST.qa("[data-x]", el("chipKatalog")).forEach(function (b) {
      b.onclick = function () { rujukan.splice(+b.dataset.x, 1); gambarChip(); };
    });
  }

  var jeda;
  el("cKebutuhan").addEventListener("input", function () {
    clearTimeout(jeda); jeda = setTimeout(gambarCocokan, 180);
  });

  /* ================================================ 2. SIMPAN KUNJUNGAN */
  el("formCatat").onsubmit = function (e) {
    e.preventDefault();
    var layanan = PST.nilaiCentang("cLayanan");
    var topik = rujukan.map(function (n) {
      var d = K.DATA.filter(function (x) { return x.n === n; })[0]; return d ? d.t : null;
    }).filter(Boolean);
    topik = topik.filter(function (v, i) { return topik.indexOf(v) === i; });

    var status = el("cStatus").value;
    var tenggat = null;
    if (status !== "selesai" && status !== "tolak") {
      var hari = 3;
      layanan.forEach(function (l) { if (B.sla[l] && B.sla[l].hari > hari) hari = B.sla[l].hari; });
      var t = new Date(); var n = 0;
      while (n < hari) { t.setDate(t.getDate() + 1); if (t.getDay() !== 0 && t.getDay() !== 6) n++; }
      tenggat = t.toISOString().slice(0, 10);
    }

    var row = {
      petugas_id: SESI.id,
      nama: el("cNama").value.trim(),
      email: el("cEmail").value.trim() || null,
      no_hp: el("cHp").value.trim() || null,
      jenis_kelamin: el("cJk").value || null,
      pendidikan: el("cPendidikan").value || null,
      pekerjaan: el("cPekerjaan").value || null,
      kategori_instansi: el("cKategori").value || null,
      nama_instansi: el("cInstansi").value.trim() || null,
      pemanfaatan: el("cPemanfaatan").value || null,
      jenis_layanan: layanan,
      sarana: el("cSarana").value || null,
      kebutuhan: el("cKebutuhan").value.trim(),
      topik: topik,
      katalog_ref: rujukan.slice(),
      butuh_surat: el("cSurat").checked,
      status: status,
      hasil: el("cHasil").value.trim() || null,
      tenggat: tenggat
    };
    el("btnSimpan").disabled = true;
    PST.pesan("msgCatat", "info", "Menyimpan…");
    PST.tambahKunjungan(row).then(function (t) {
      PST.pesan("msgCatat", "", "");
      var pesanWA = "Halo " + row.nama + ", terima kasih sudah berkunjung ke PST BPS Kabupaten Kutai Kartanegara.\n\n" +
        "Kode tiket Anda: " + t.kode_tiket + "\nKebutuhan: " + row.kebutuhan + "\n\n" +
        "Pantau statusnya di " + location.origin + location.pathname.replace(/admin\.html$/, "sahabat.html") +
        " dengan kode tersebut dan 4 digit terakhir nomor HP Anda.";
      var wa = PST.waLink(row.no_hp, pesanWA);
      el("hasilTiket").innerHTML =
        '<div class="tiketbox"><div class="k">' + esc(t.kode_tiket) + "</div>" +
        "<p>Kunjungan tersimpan. Berikan kode ini kepada sahabat data — ia dapat memeriksa status permintaannya " +
        "di halaman Sahabat Data dengan kode tersebut dan empat digit terakhir nomor HP-nya." +
        (status === "eskalasi" ? " Jangan lupa mengangkat kebutuhannya ke papan tanya." : "") + "</p>" +
        (wa ? '<div class="btnrow" style="margin-top:12px"><a class="btn btn--sm" href="' + esc(wa) + '" target="_blank" rel="noopener">Kirim kode lewat WhatsApp</a>' +
              '<span style="font-size:12px;color:var(--s-ada)">terbuka di WhatsApp petugas, tinggal tekan kirim</span></div>' : "") +
        "</div>";
      el("formCatat").reset(); rujukan = []; gambarChip();
      el("cocokan").innerHTML = "";
      isiPilihan();
      window.scrollTo({ top: 0, behavior: "smooth" });
      muatTiket();
    }).catch(function (err) {
      PST.pesan("msgCatat", "err", "Gagal menyimpan: " + err.message);
    }).then(function () { el("btnSimpan").disabled = false; });
  };

  /* ================================================ 3. DAFTAR TIKET */
  function muatTiket() {
    return PST.daftarKunjungan().then(function (r) {
      TIKET = r; gambarTiket();
      el("tTiket").innerHTML = '<option value="">— tanpa tiket —</option>' + TIKET.slice(0, 60).map(function (t) {
        return '<option value="' + esc(t.id) + '">' + esc(t.kode_tiket) + " · " + esc(t.nama) + "</option>";
      }).join("");
    }).catch(function (e) { PST.pesan("msgTiket", "err", e.message); });
  }

  /* Usulan jawaban otomatis: disusun asisten dari katalog, isi indikator terbit,
     dan jawaban baku. Selalu diperiksa petugas — tidak pernah terkirim sendiri. */
  function usulanTiket(t) {
    var w = el("dUsulan"); if (!w) return;
    if (!window.ASISTEN || !ASISTEN.usulan) { w.innerHTML = ""; return; }
    if (t.status === "selesai" || t.status === "tolak") { w.innerHTML = ""; return; }
    w.innerHTML = '<div class="usul"><div class="usul__h">Menyusun usulan jawaban…</div></div>';
    ASISTEN.usulan(t.kebutuhan).then(function (u) {
      if (!el("dUsulan") || el("dUsulan") !== w) return;              /* rincian sudah ditutup/ganti */
      if (!u || !u.teks) {
        w.innerHTML = '<div class="usul usul--kosong">Belum ada usulan jawaban otomatis untuk permintaan ini — tulis jawabannya sendiri di kolom di atas.</div>';
        return;
      }
      w.innerHTML = '<div class="usul"><div class="usul__h"><b>Usulan jawaban otomatis</b>' +
        '<span class="usul__k ' + esc(u.keyakinan) + '">keyakinan ' + esc(u.keyakinan) + "</span></div>" +
        '<pre class="usul__t">' + esc(u.teks) + "</pre>" +
        '<div class="usul__a"><button type="button" id="uPakai">Pakai usulan ini</button>' +
        '<button type="button" id="uSalin">Salin</button></div>' +
        '<div class="field__hint" style="margin-top:8px">Disusun dari katalog, isi indikator terbit, dan jawaban baku — <b>bukan jawaban resmi</b>. Periksa, betulkan bila perlu, baru kirim.</div></div>';
      el("uPakai").onclick = function () {
        var h = el("dHasil");
        if (h.value.trim() && !confirm("Catatan penyelesaian sudah terisi. Ganti dengan usulan ini?")) return;
        h.value = u.teks; h.focus();
      };
      el("uSalin").onclick = function () {
        var b = this;
        try { navigator.clipboard.writeText(u.teks).then(function () { b.textContent = "tersalin ✓"; setTimeout(function () { b.textContent = "Salin"; }, 2000); }); }
        catch (e) { b.textContent = "tidak bisa menyalin"; }
      };
      /* keyakinan tinggi & belum dijawab: langsung diisikan supaya tinggal diperiksa */
      if (u.keyakinan === "tinggi" && !String(t.hasil || "").trim() && !el("dHasil").value.trim()) {
        el("dHasil").value = u.teks;
        w.insertAdjacentHTML("beforeend", '<div class="field__hint" style="margin-top:4px;color:var(--s-mohon)">Usulan sudah diisikan ke kolom catatan penyelesaian di atas.</div>');
      }
    }).catch(function () { if (el("dUsulan") === w) w.innerHTML = ""; });
  }

  function terlambatkah(t) {
    if (!t.tenggat || t.status === "selesai" || t.status === "tolak") return false;
    return new Date(t.tenggat + "T23:59:59") < new Date();
  }

  function saringTiket() {
    var s = el("fStatus").value, q = el("fCari").value.trim().toLowerCase();
    return TIKET.filter(function (t) {
      if (s && t.status !== s) return false;
      if (!q) return true;
      return [t.kode_tiket, t.nama, t.nama_instansi, t.kebutuhan, t.kategori_instansi, t.petugas_nama, t.penyelesai_nama]
        .join(" ").toLowerCase().indexOf(q) !== -1;
    });
  }

  function gambarTiket() {
    var d = saringTiket();
    if (!d.length) { el("tblTiket").innerHTML = '<tr><td class="empty">Belum ada kunjungan tercatat.</td></tr>'; return; }
    el("tblTiket").innerHTML =
      "<thead><tr><th>Kode</th><th>Waktu</th><th>Sahabat data</th><th>Kebutuhan</th><th>Petugas</th><th>Status</th><th></th></tr></thead><tbody>" +
      d.slice(0, 300).map(function (t) {
        var w = { selesai:"ada", proses:"mohon", surat:"mohon", eskalasi:"prov", tolak:"tidak" }[t.status] || "lain";
        var terlambat = terlambatkah(t);
        var petugas = t.petugas_nama
          ? esc(t.petugas_nama)
          : (t.sahabat_id ? "<i style='color:var(--ink-3)'>daring</i>" : "—");
        if (t.status === "selesai" && t.penyelesai_nama && t.penyelesai_nama !== t.petugas_nama)
          petugas += "<br><span style='font-size:11.5px;color:var(--ink-3)'>selesai: " + esc(t.penyelesai_nama) + "</span>";
        return "<tr><td><span class='kode'>" + esc(t.kode_tiket) + "</span></td>" +
          "<td>" + esc(PST.tgl(t.dibuat, true)) +
            (t.tenggat && t.status !== "selesai" && t.status !== "tolak"
              ? "<br><span style='font-size:11.5px;color:" + (terlambat ? "var(--s-tidak)" : "var(--ink-3)") + "'>tenggat " + esc(PST.tgl(t.tenggat)) + "</span>" : "") + "</td>" +
          "<td><b>" + esc(t.nama) + "</b><br><span style='font-size:12px'>" + esc(t.nama_instansi || t.kategori_instansi || "—") + "</span></td>" +
          "<td style='max-width:340px'>" + esc((t.kebutuhan || "").slice(0, 130)) + ((t.kebutuhan||"").length > 130 ? "…" : "") + "</td>" +
          "<td style='white-space:nowrap'>" + petugas + "</td>" +
          "<td><span class='pill " + w + "'>" + esc(B.statusTiket[t.status] || t.status) + "</span>" +
            (terlambat ? "<br><span class='pill tidak' style='margin-top:4px'>terlambat</span>" : "") + "</td>" +
          "<td><button class='btn btn--ghost btn--sm' data-buka='" + esc(t.id) + "'>buka</button></td></tr>";
      }).join("") + "</tbody>";
    PST.qa("[data-buka]").forEach(function (b) { b.onclick = function () { bukaTiket(b.dataset.buka); }; });
  }
  el("fStatus").onchange = gambarTiket;
  el("fCari").oninput = gambarTiket;

  function bukaTiket(id) {
    var t = TIKET.filter(function (x) { return x.id === id; })[0];
    if (!t) return;
    var baris = function (l, v, html) {
      return v ? "<tr><th style='width:180px'>" + esc(l) + "</th><td>" + (html ? PST.linkify(v) : esc(v)) + "</td></tr>" : "";
    };
    var petugas = t.petugas_nama || (t.sahabat_id ? "Diajukan sendiri secara daring" : null);
    var penyelesai = t.status === "selesai" && t.penyelesai_nama
      ? t.penyelesai_nama + (t.selesai_pada ? ", " + PST.tgl(t.selesai_pada, true) : "") : null;
    el("detailTiket").innerHTML =
      '<div class="card"><div class="card__title">Tiket ' + esc(t.kode_tiket) + "</div>" +
      '<div id="msgDetail"></div>' +
      '<div class="tbl-scroll"><table class="tbl">' +
        baris("Nama", t.nama) + baris("Kontak", [t.no_hp, t.email].filter(Boolean).join(" · ")) +
        baris("Instansi", [t.nama_instansi, t.kategori_instansi].filter(Boolean).join(" · ")) +
        baris("Pekerjaan / pendidikan", [t.pekerjaan, t.pendidikan].filter(Boolean).join(" · ")) +
        baris("Pemanfaatan", t.pemanfaatan) +
        baris("Jenis layanan", (t.jenis_layanan || []).join(", ")) +
        baris("Sarana", t.sarana) +
        baris("Kebutuhan", t.kebutuhan, true) +
        baris("Ragam data dirujuk", (t.katalog_ref || []).join(" · ")) +
        baris("Perlu surat", t.butuh_surat ? "Ya" : "") +
        baris("Tenggat", t.tenggat ? PST.tgl(t.tenggat) + (terlambatkah(t) ? " — sudah lewat" : "") : "") +
        baris("Dicatat", PST.tgl(t.dibuat, true) + (petugas ? " oleh " + petugas : "")) +
        baris("Diselesaikan", penyelesai) +
        baris("Catatan penyelesaian", t.hasil, true) +
      "</table></div>" +
      '<div class="grid grid--2" style="margin-top:14px">' +
        '<div class="field"><label class="fl">Ubah status</label><select id="dStatus">' +
          Object.keys(B.statusTiket).map(function (k) {
            return '<option value="' + k + '"' + (k === t.status ? " selected" : "") + ">" + esc(B.statusTiket[k]) + "</option>";
          }).join("") + "</select></div>" +
        '<div class="field"><label class="fl">Ubah catatan penyelesaian</label>' +
          '<textarea id="dHasil" style="min-height:60px" placeholder="Boleh menyertakan tautan — akan bisa diklik oleh sahabat data">' + esc(t.hasil || "") + "</textarea></div>" +
      "</div>" +
      '<div id="dUsulan"></div>' +
      '<div class="btnrow"><button class="btn btn--sm" id="dSimpan">Simpan perubahan</button>' +
      (t.no_hp ? '<button class="btn btn--sm" id="dKirim" title="Simpan jawaban lalu buka WhatsApp ke nomor pemohon dengan pesannya sudah terisi">Simpan &amp; kirim ke WhatsApp</button>' : "") +
      '<button class="btn btn--ghost btn--sm" id="dAngkat">Angkat ke papan tanya</button>' +
      '<button class="btn btn--ghost btn--sm" id="dTutup">Tutup rincian</button></div></div>';
    usulanTiket(t);

    el("dSimpan").onclick = function () {
      PST.ubahKunjungan(id, { status: el("dStatus").value, hasil: el("dHasil").value.trim() || null }, SESI.id)
        .then(function () { return muatTiket(); })
        .then(function () { bukaTiket(id); PST.pesan("msgDetail", "ok", "Tersimpan."); })
        .catch(function (e) { PST.pesan("msgDetail", "err", e.message); });
    };
    if (el("dKirim")) el("dKirim").onclick = function () {
      var jawab = el("dHasil").value.trim();
      if (!jawab) { PST.pesan("msgDetail", "warn", "Isi dulu catatan penyelesaiannya — itu yang dikirim ke pemohon."); el("dHasil").focus(); return; }
      var w = window.open("", "_blank");                       /* dibuka lebih dulu supaya tidak diblokir peramban */
      PST.ubahKunjungan(id, { status: el("dStatus").value, hasil: jawab }, SESI.id)
        .then(function () {
          var pesan = "Halo Bapak/Ibu " + (t.nama || "") + ",\n\n" +
            "Permintaan data Anda dengan kode " + t.kode_tiket + " sudah kami tindak lanjuti.\n\n" + jawab +
            "\n\nStatus permintaan dapat diperiksa kapan saja di " + location.origin + location.pathname.replace(/admin\.html$/, "sahabat.html") +
            " dengan kode " + t.kode_tiket + " dan empat digit terakhir nomor HP ini.\n\nSalam,\nPST " + ((window.KONFIG && KONFIG.NAMA_SATKER) || "BPS Kabupaten Kutai Kartanegara");
          var tautan = PST.waLink(t.no_hp, pesan);
          if (tautan) w.location.href = tautan; else w.close();
          return muatTiket();
        })
        .then(function () { bukaTiket(id); PST.pesan("msgDetail", "ok", "Tersimpan. Jendela WhatsApp dibuka — tinggal tekan kirim."); })
        .catch(function (e) { try { w.close(); } catch (er) {} PST.pesan("msgDetail", "err", e.message); });
    };
    el("dAngkat").onclick = function () {
      PST.qa('.tabs button').filter(function (b) { return b.dataset.p === "pTanya"; })[0].click();
      el("tJudul").value = (t.kebutuhan || "").slice(0, 110);
      el("tIsi").value = "Diminta " + t.nama + (t.nama_instansi ? " (" + t.nama_instansi + ")" : "") +
        " pada " + PST.tgl(t.dibuat) + ". Pemanfaatan: " + (t.pemanfaatan || "—") + ".\n\n" + (t.kebutuhan || "");
      el("tTopik").value = (t.topik && t.topik[0]) || "";
      el("tTiket").value = id;
      el("tJudul").focus();
    };
    el("dTutup").onclick = function () { el("detailTiket").innerHTML = ""; };
    el("detailTiket").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /* ================================================ 4. PAPAN TANYA */
  var tanyaTerbuka = {};
  function muatTanya() {
    PST.qa(".qa.is-open").forEach(function (n) { tanyaTerbuka[n.dataset.q] = true; });
    PST.daftarPertanyaan().then(function (r) {
      if (!r.length) { el("daftarTanya").innerHTML = '<div class="empty">Belum ada pertanyaan. Bagus — berarti semuanya terjawab di meja.</div>'; return; }
      el("daftarTanya").innerHTML = r.map(function (p) {
        var w = { terbuka:"mohon", terjawab:"ada", ditutup:"lain" }[p.status];
        return '<div class="qa" data-q="' + esc(p.id) + '"><div class="qa__h">' +
          '<span class="pill ' + w + '">' + esc(p.status) + "</span>" +
          '<span class="qa__t">' + esc(p.judul) +
            '<span class="qa__m">' + esc(p.penanya_nama || (p.penanya_id === SESI.id ? SESI.profil.nama : "pegawai")) +
            " · " + esc(PST.sejak(p.dibuat)) + " · " + (p.n_jawaban || 0) + " jawaban" +
            (p.kode_tiket ? " · tiket " + esc(p.kode_tiket) : "") + "</span></span></div>" +
          '<div class="qa__b"><p style="font-size:13.5px;color:var(--ink-2);margin:12px 0 0">' +
            PST.linkify(p.isi || "") + "</p><div class='jwbList'></div></div></div>";
      }).join("");
      PST.qa(".qa").forEach(function (n) {
        var pert = r.filter(function (x) { return x.id === n.dataset.q; })[0];
        n.querySelector(".qa__h").onclick = function () {
          var buka = n.classList.toggle("is-open");
          if (buka) gambarJawaban(n, n.dataset.q, pert);
        };
        if (tanyaTerbuka[n.dataset.q]) { n.classList.add("is-open"); gambarJawaban(n, n.dataset.q, pert); }
      });
    }).catch(function (e) { el("daftarTanya").innerHTML = '<div class="msg msg--err">' + esc(e.message) + "</div>"; });
  }

  function gambarJawaban(node, pid, pert) {
    var box = node.querySelector(".jwbList");
    box.innerHTML = '<div class="empty" style="padding:16px">Memuat…</div>';
    var bolehTandai = pert && (pert.penanya_id === SESI.id || SESI.profil.peran === "admin");
    PST.daftarJawaban(pid).then(function (js) {
      box.innerHTML = js.map(function (j) {
        return '<div class="jwb' + (j.terbaik ? " is-best" : "") + '">' +
          '<div class="jwb__m">' + esc(j.penjawab_nama || "pegawai") + " · " + esc(PST.sejak(j.dibuat)) +
          (j.terbaik ? " · paling membantu" : "") + "</div>" +
          '<div>' + PST.linkify(j.isi) + "</div>" +
          ((j.tautan || []).length ? '<div style="margin-top:6px">' + j.tautan.map(function (u) {
            return '<a class="lnk" style="font-size:12.5px" href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(u) + "</a>";
          }).join("<br>") + "</div>" : "") +
          (!j.terbaik && bolehTandai && j.penjawab_id !== SESI.id
            ? '<div style="margin-top:7px"><button class="btn btn--ghost btn--sm" data-best="' + esc(j.id) + '">tandai paling membantu</button></div>' : "") +
          "</div>";
      }).join("") +
      (js.length && !bolehTandai && !js.some(function (j) { return j.terbaik; })
        ? '<p style="font-size:12px;color:var(--ink-3);margin:10px 0 0">Penanda “paling membantu” hanya bisa diberikan oleh penanya atau admin.</p>' : "") +
      '<form class="jwbForm" style="margin-top:16px">' +
        '<div class="field"><label class="fl">Jawaban Anda</label>' +
        '<textarea class="jIsi" placeholder="Jelaskan datanya ada di mana, atau mengapa tidak bisa disediakan"></textarea></div>' +
        '<div class="field"><label class="fl">Tautan rujukan (satu per baris)</label>' +
        '<textarea class="jTaut" style="min-height:52px" placeholder="https://kukarkab.bps.go.id/..."></textarea></div>' +
        '<div class="btnrow"><button class="btn btn--sm" type="submit">Kirim jawaban</button>' +
        (pert && pert.status !== "ditutup" ? '<button class="btn btn--ghost btn--sm" type="button" data-tutup="' + esc(pid) + '">Tutup pertanyaan</button>' : "") +
        "</div></form>";

      PST.qa("[data-best]", box).forEach(function (b) {
        b.onclick = function () {
          PST.tandaiTerbaik(b.dataset.best, pid).then(function () { muatTanya(); })
            .catch(function (e) { alert(e.message); });
        };
      });
      var t = box.querySelector("[data-tutup]");
      if (t) t.onclick = function () { PST.tutupPertanyaan(pid).then(muatTanya); };

      box.querySelector(".jwbForm").onsubmit = function (e) {
        e.preventDefault();
        var isi = box.querySelector(".jIsi").value.trim();
        if (!isi) return;
        var taut = box.querySelector(".jTaut").value.split("\n").map(function (x) { return x.trim(); }).filter(Boolean);
        PST.tambahJawaban({ pertanyaan_id: pid, penjawab_id: SESI.id, isi: isi, tautan: taut })
          .then(function () { muatTanya(); })
          .catch(function (er) { alert(er.message); });
      };
    });
  }

  el("formTanya").onsubmit = function (e) {
    e.preventDefault();
    PST.tambahPertanyaan({
      penanya_id: SESI.id,
      judul: el("tJudul").value.trim(),
      isi: el("tIsi").value.trim() || null,
      topik: el("tTopik").value || null,
      kunjungan_id: el("tTiket").value || null
    }).then(function () {
      el("formTanya").reset();
      PST.pesan("msgTanya", "ok", "Pertanyaan terkirim ke papan.");
      muatTanya();
    }).catch(function (er) { PST.pesan("msgTanya", "err", er.message); });
  };

  /* ================================================ 5. REKAP */
  function hitung(rows, ambil) {
    var m = {};
    rows.forEach(function (r) {
      var v = ambil(r);
      (Array.isArray(v) ? v : [v]).forEach(function (x) {
        if (x === null || x === undefined || x === "") return;
        m[x] = (m[x] || 0) + 1;
      });
    });
    return Object.keys(m).map(function (k) { return { k: k, n: m[k] }; })
      .sort(function (a, b) { return b.n - a.n; });
  }

  function bar(target, data, batas) {
    var d = data.slice(0, batas || 8);
    if (!d.length) { el(target).innerHTML = '<div class="empty" style="padding:14px">Belum ada data.</div>'; return; }
    var mx = d[0].n || 1;
    el(target).innerHTML = d.map(function (x) {
      return '<div class="bar"><span class="bar__l" title="' + esc(x.k) + '">' + esc(x.k) + "</span>" +
        '<span class="bar__t"><span class="bar__f" style="width:' + Math.round(x.n / mx * 100) + '%"></span></span>' +
        '<span class="bar__n">' + x.n + "</span></div>";
    }).join("");
  }

  function gambarRekap() {
    PST.daftarKunjungan().then(function (r) {
      TIKET = r;
      var kini = new Date(), bl = kini.getFullYear() + "-" + String(kini.getMonth()+1).padStart(2,"0");
      el("rTotal").textContent = r.length;
      el("rSelesai").textContent = r.filter(function (x) { return x.status === "selesai"; }).length;
      el("rProses").textContent = r.filter(function (x) { return ["proses","surat","eskalasi"].indexOf(x.status) !== -1; }).length;
      el("rBulan").textContent = r.filter(function (x) { return String(x.dibuat).slice(0,7) === bl; }).length;

      bar("rTopik", hitung(r, function (x) { return x.topik || []; }));
      bar("rInstansi", hitung(r, function (x) { return x.kategori_instansi; }));
      bar("rGuna", hitung(r, function (x) { return x.pemanfaatan; }), 6);
      bar("rLayanan", hitung(r, function (x) { return x.jenis_layanan || []; }), 6);
      bar("rKatalog", hitung(r, function (x) { return x.katalog_ref || []; }), 10);

      var bln = {};
      r.forEach(function (x) {
        var k = String(x.dibuat).slice(0, 7); bln[k] = (bln[k] || 0) + 1;
      });
      bar("rBulanan", Object.keys(bln).sort().reverse().slice(0, 12)
        .map(function (k) { return { k: k, n: bln[k] }; }), 12);

      var top = hitung(r, function (x) { return x.katalog_ref || []; }).slice(0, 5);
      var eskalasi = r.filter(function (x) { return x.status === "eskalasi" || x.status === "proses"; }).length;
      el("rSaran").innerHTML = top.length
        ? "<p style='margin:0 0 10px;font-size:13.5px;color:var(--ink-2)'>Lima ragam data ini paling sering diminta. Menyiapkan berkasnya lebih dulu — dalam bentuk siap kirim — akan memangkas waktu layanan paling banyak:</p><ol style='margin:0;padding-left:20px;font-size:13.5px;color:var(--ink-2);line-height:1.9'>" +
          top.map(function (x) {
            var d = K.DATA.filter(function (y) { return y.n === x.k; })[0];
            return "<li><b style='color:var(--ink)'>" + esc(x.k) + "</b> — diminta " + x.n + " kali" +
              (d ? " · status " + esc(K.LABEL[d.st]) + " · level " + esc(d.lv) : "") + "</li>";
          }).join("") + "</ol>" +
          (eskalasi ? "<p style='margin:12px 0 0;font-size:13.5px;color:var(--s-mohon)'>Ada " + eskalasi + " permintaan yang belum tuntas. Periksa daftar tiket.</p>" : "")
        : '<div class="empty" style="padding:14px">Rekap akan muncul setelah beberapa kunjungan tercatat.</div>';
    });
  }

  el("btnUnduh").onclick = function () {
    var kol = ["kode_tiket","dibuat","nama","no_hp","email","jenis_kelamin","pendidikan","pekerjaan",
      "kategori_instansi","nama_instansi","pemanfaatan","jenis_layanan","sarana","kebutuhan",
      "topik","katalog_ref","butuh_surat","status","hasil","tenggat"];
    var csv = [kol.join(";")].concat(TIKET.map(function (t) {
      return kol.map(function (k) {
        var v = t[k]; if (Array.isArray(v)) v = v.join(" | ");
        return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
      }).join(";");
    })).join("\n");
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = "rekap-pst-kukar-" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click(); URL.revokeObjectURL(a.href);
  };

  /* ================================================ 7. KONSULTASI DARING */
  var KON = [], ATURAN_K = null, konTerbuka = null;

  function isiPilihanKon() {
    el("kfStatus").innerHTML = '<option value="aktif">Diajukan & dijadwalkan</option>' +
      Object.keys(B.statusKonsultasi).map(function (k) { return '<option value="' + k + '">' + esc(B.statusKonsultasi[k]) + "</option>"; }).join("") +
      '<option value="">Semua</option>';
    el("jTopik").innerHTML = '<option value=""></option>' + PST.opsi(TOPIK);
    PST.aturanKonsultasi().then(function (a) {
      ATURAN_K = a;
      el("jJam").innerHTML = PST.opsi(a.jam);
      el("jTanggal").min = PST.tglWita();
    });
  }

  function muatKon() {
    return PST.daftarKonsultasi().then(function (r) { KON = r; gambarKon(); })
      .catch(function (e) { PST.pesan("msgKon", "err", e.message); });
  }

  function gambarKon() {
    var f = el("kfStatus").value;
    var d = KON.filter(function (k) {
      if (f === "aktif") return k.status === "diajukan" || k.status === "dijadwalkan";
      if (!f) return true; return k.status === f;
    });
    // yang aktif diurutkan dari jadwal terdekat
    if (f === "aktif") d.sort(function (a, b) { return (a.tanggal + a.jam) > (b.tanggal + b.jam) ? 1 : -1; });
    el("kfHitung").textContent = d.length + " permintaan";
    if (!d.length) { el("daftarKon").innerHTML = '<div class="empty">Tidak ada permintaan konsultasi pada saringan ini.</div>'; return; }
    el("daftarKon").innerHTML = d.map(function (k) {
      var w = { diajukan:"mohon", dijadwalkan:"ada", selesai:"lain", batal:"tidak" }[k.status] || "lain";
      var lewat = k.status !== "selesai" && k.status !== "batal" && k.tanggal < PST.tglWita();
      return '<div class="kon' + (konTerbuka === k.id ? " is-on" : "") + '" data-k="' + esc(k.id) + '">' +
        '<span class="kon__w">' + esc(PST.tgl(k.tanggal)) + " · " + esc(k.jam) + " WITA</span>" +
        '<span><span class="pill ' + w + '">' + esc(B.statusKonsultasi[k.status] || k.status) + "</span>" + (lewat ? ' <span class="pill tidak">lewat</span>' : "") + "</span>" +
        '<span class="kon__n">' + esc(k.nama) + (k.nama_instansi ? " · " + esc(k.nama_instansi) : "") + "</span>" +
        '<span class="kode">' + esc(k.kode) + "</span>" +
        '<span class="kon__m">' + esc(k.topik || "tanpa topik") + " · narasumber: " + esc(k.narasumber_nama || "belum ditetapkan") + "</span>" +
        "</div>";
    }).join("");
    PST.qa("[data-k]", el("daftarKon")).forEach(function (n) { n.onclick = function () { bukaKon(n.dataset.k); }; });
  }
  el("kfStatus").onchange = gambarKon;

  /* topik permintaan boleh dua, disimpan "A · B"; skor = berapa topik yang masuk keahlian */
  function daftarTopik(topik) { return String(topik || "").split(" · ").map(function (t) { return t.trim(); }).filter(Boolean); }
  function skorNarasumber(p, topik) {
    if (!topik || !p.keahlian) return 0;
    return daftarTopik(topik).filter(function (t) { return p.keahlian.indexOf(t) !== -1; }).length;
  }
  function topikCocok(p, topik) { return daftarTopik(topik).filter(function (t) { return (p.keahlian || []).indexOf(t) !== -1; }).join(" · "); }

  function bukaKon(id) {
    var k = KON.filter(function (x) { return x.id === id; })[0]; if (!k) return;
    konTerbuka = id; gambarKon();
    var baris = function (l, v, html) { return v ? "<tr><th style='width:150px'>" + esc(l) + "</th><td>" + (html ? PST.linkify(v) : esc(v)) + "</td></tr>" : ""; };
    var aktif = PEGAWAI.filter(function (p) { return p.aktif !== false; })
      .sort(function (a, b) { return skorNarasumber(b, k.topik) - skorNarasumber(a, k.topik) || a.nama.localeCompare(b.nama); });
    var bentrok = KON.filter(function (x) { return x.id !== k.id && x.status === "dijadwalkan" && x.tanggal === k.tanggal && x.jam === k.jam; })
      .map(function (x) { return x.narasumber_id; });
    var pilihanNara = '<option value="">— belum ditetapkan —</option>' + aktif.map(function (p) {
      var cocok = skorNarasumber(p, k.topik), sibuk = bentrok.indexOf(p.id) !== -1;
      return '<option value="' + esc(p.id) + '" data-zoom="' + esc(p.tautan_zoom || "") + '"' + (k.narasumber_id === p.id ? " selected" : "") + (sibuk ? " disabled" : "") + ">" +
        esc(p.nama) + (cocok ? " ✓ " + esc(topikCocok(p, k.topik)) : "") + (p.tautan_zoom ? "" : " (belum ada tautan Zoom)") + (sibuk ? " — sudah ada sesi di jam ini" : "") + "</option>";
    }).join("");

    el("detailKon").innerHTML =
      '<div class="card" style="margin-bottom:14px"><div class="card__title">Permintaan ' + esc(k.kode) + "</div>" +
      '<div id="msgDetailKon"></div>' +
      '<div class="tbl-scroll"><table class="tbl">' +
        baris("Nama", k.nama) + baris("Kontak", [k.no_hp, k.email].filter(Boolean).join(" · ")) +
        baris("Instansi", [k.nama_instansi, k.kategori_instansi].filter(Boolean).join(" · ")) +
        baris("Pemanfaatan", k.pemanfaatan) + baris("Topik", k.topik) +
        baris("Kebutuhan", k.kebutuhan, true) +
        baris("Diajukan", PST.tgl(k.dibuat, true) + (k.sahabat_id ? " (lewat akun)" : "")) +
      "</table></div>" +
      '<div class="grid grid--2" style="margin-top:14px;gap:12px">' +
        '<div class="field"><label class="fl">Topik (paling banyak dua)</label><div class="checks" id="dkTopik">' + PST.centang("dkTopik", TOPIK.concat(["Lainnya"]), daftarTopik(k.topik)) + "</div>" +
          '<div class="field__hint">' + (k.topik ? "Diisi sahabat data; boleh disesuaikan setelah membaca kebutuhannya." : "Sahabat data tidak memilih topik. Tetapkan di sini agar saran narasumber muncul dan rekapnya rapi.") + "</div></div>" +
        '<div class="field"><label class="fl">Narasumber</label><select id="dkNara">' + pilihanNara + "</select>" +
          '<div class="field__hint">' + (k.topik ? "Tanda ✓ = keahliannya sesuai topik. Urutan sudah menurut kecocokan." : "Belum bisa disarankan karena permintaan ini tanpa topik — pilih topik dulu, simpan, lalu tanda ✓ akan muncul.") + "</div></div>" +
        '<div class="field"><label class="fl">Status</label><select id="dkStatus">' +
          Object.keys(B.statusKonsultasi).map(function (s) { return '<option value="' + s + '"' + (s === k.status ? " selected" : "") + ">" + esc(B.statusKonsultasi[s]) + "</option>"; }).join("") + "</select></div>" +
        '<div class="field"><label class="fl">Tanggal</label><input type="date" id="dkTanggal" value="' + esc(k.tanggal) + '"></div>' +
        '<div class="field"><label class="fl">Jam</label><select id="dkJam">' + PST.opsi(ATURAN_K ? ATURAN_K.jam : B.konsultasi.jam, k.jam) + "</select></div>" +
      "</div>" +
      '<div class="field"><label class="fl">Tautan Zoom</label><input type="url" id="dkZoom" value="' + esc(k.tautan_zoom || "") + '" placeholder="terisi otomatis dari profil narasumber, boleh diganti"></div>' +
      '<div class="field"><label class="fl">Pesan untuk sahabat data</label><textarea id="dkPesan" style="min-height:56px" placeholder="Misal: siapkan daftar indikator yang dibutuhkan; sesi direkam untuk keperluan internal">' + esc(k.pesan_untuk_sahabat || "") + "</textarea></div>" +
      '<div class="field"><label class="fl">Catatan internal (tidak dilihat sahabat data)</label><textarea id="dkCatatan" style="min-height:48px">' + esc(k.catatan_internal || "") + "</textarea></div>" +
      '<div class="btnrow"><button class="btn btn--sm" id="dkSimpan">Simpan</button>' +
      '<a class="btn btn--ghost btn--sm" id="dkWA" target="_blank" rel="noopener">Kirim konfirmasi lewat WhatsApp</a>' +
      '<button class="btn btn--ghost btn--sm" id="dkTutup">Tutup</button></div></div>';

    function nilaiTopik() { return PST.nilaiCentang("dkTopik", el("dkTopik")); }
    el("dkTopik").onchange = function () {
      var dipilihTopik = nilaiTopik();
      /* paling banyak dua: kotak lain dikunci bila sudah dua */
      PST.qa('input[name="dkTopik"]', el("dkTopik")).forEach(function (i) { i.disabled = !i.checked && dipilihTopik.length >= 2; });
      var t = dipilihTopik.length ? dipilihTopik.join(" · ") : null;
      var nara = el("dkNara"), dipilih = nara.value;
      var urut = aktif.slice().sort(function (a, b) { return skorNarasumber(b, t) - skorNarasumber(a, t) || a.nama.localeCompare(b.nama); });
      nara.innerHTML = '<option value="">— belum ditetapkan —</option>' + urut.map(function (p) {
        var cocok = skorNarasumber(p, t), sibuk = bentrok.indexOf(p.id) !== -1;
        return '<option value="' + esc(p.id) + '" data-zoom="' + esc(p.tautan_zoom || "") + '"' + (dipilih === p.id ? " selected" : "") + (sibuk ? " disabled" : "") + ">" +
          esc(p.nama) + (cocok ? " ✓ " + esc(topikCocok(p, t)) : "") + (p.tautan_zoom ? "" : " (belum ada tautan Zoom)") + (sibuk ? " — sudah ada sesi di jam ini" : "") + "</option>";
      }).join("");
    };
    el("dkTopik").onchange();
    el("dkNara").onchange = function () {
      var o = this.options[this.selectedIndex];
      if (o && o.dataset.zoom && !el("dkZoom").value) el("dkZoom").value = o.dataset.zoom;
      if (this.value && el("dkStatus").value === "diajukan") el("dkStatus").value = "dijadwalkan";
    };
    function susunWA() {
      var st = el("dkStatus").value, nara = el("dkNara").options[el("dkNara").selectedIndex];
      var teks = "Halo " + k.nama + ", ini PST BPS Kabupaten Kutai Kartanegara.\n\n" +
        (st === "dijadwalkan"
          ? "Konsultasi daring Anda (" + k.kode + ") dijadwalkan:\n📅 " + PST.tgl(el("dkTanggal").value) + " pukul " + el("dkJam").value + " WITA\n" +
            "👤 Narasumber: " + (nara && nara.value ? nara.text.replace(/ ✓.*$/, "").replace(/ \(belum.*$/, "") : "-") + "\n" +
            "🔗 Zoom: " + (el("dkZoom").value || "(menyusul)") + "\n" +
            (el("dkPesan").value ? "\n" + el("dkPesan").value + "\n" : "")
          : st === "batal"
          ? "Mohon maaf, permintaan konsultasi " + k.kode + " tidak dapat dijadwalkan. " + (el("dkPesan").value || "") + "\n"
          : "Permintaan konsultasi " + k.kode + " sudah kami terima untuk " + PST.tgl(el("dkTanggal").value) + " pukul " + el("dkJam").value + " WITA. Narasumber dan tautan Zoom menyusul.\n") +
        "\nPantau status: " + location.origin + location.pathname.replace(/admin\.html$/, "sahabat.html");
      el("dkWA").href = PST.waLink(k.no_hp, teks);
    }
    ["dkStatus","dkNara","dkTanggal","dkJam","dkZoom","dkPesan","dkTopik"].forEach(function (i) { el(i).addEventListener("input", susunWA); el(i).addEventListener("change", susunWA); });
    susunWA();

    el("dkSimpan").onclick = function () {
      var patch = {
        topik: nilaiTopik().length ? nilaiTopik().join(" · ") : null,
        narasumber_id: el("dkNara").value || null, status: el("dkStatus").value,
        tanggal: el("dkTanggal").value, jam: el("dkJam").value,
        tautan_zoom: el("dkZoom").value.trim() || null,
        pesan_untuk_sahabat: el("dkPesan").value.trim() || null,
        catatan_internal: el("dkCatatan").value.trim() || null
      };
      if (patch.status === "dijadwalkan" && !patch.narasumber_id) { PST.pesan("msgDetailKon", "warn", "Tetapkan narasumber dulu sebelum menandai dijadwalkan."); return; }
      PST.ubahKonsultasi(id, patch).then(function () { return muatKon(); })
        .then(function () { bukaKon(id); PST.pesan("msgDetailKon", "ok", "Tersimpan." + (patch.status === "dijadwalkan" ? " Jangan lupa kirim konfirmasi ke sahabat data." : "")); })
        .catch(function (e) { PST.pesan("msgDetailKon", "err", e.message); });
    };
    el("dkTutup").onclick = function () { konTerbuka = null; el("detailKon").innerHTML = ""; gambarKon(); };
    el("detailKon").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  el("formJadwalkan").onsubmit = function (e) {
    e.preventDefault();
    PST.tambahKonsultasiPetugas({
      nama: el("jNama").value.trim(), no_hp: el("jHp").value.trim(), kebutuhan: el("jKebutuhan").value.trim(),
      topik: el("jTopik").value || null, tanggal: el("jTanggal").value, jam: el("jJam").value, status: "diajukan"
    }).then(function (row) {
      el("formJadwalkan").reset(); PST.pesan("msgJadwalkan", "ok", "Tersimpan sebagai " + row.kode + ". Buka untuk menetapkan narasumber.");
      return muatKon();
    }).catch(function (er) { PST.pesan("msgJadwalkan", "err", er.message); });
  };

  /* ================================================ 8. PROFIL SAYA */
  function gambarProfil() {
    var p = SESI.profil || {};
    el("prKeahlian").innerHTML = PST.centang("prKeahlian", TOPIK, p.keahlian || []);
    el("prZoom").value = p.tautan_zoom || ""; el("prHp").value = p.no_hp || ""; el("prJabatan").value = p.jabatan || "";
    PST.papanPeringkat().then(function (r) {
      var saya = r.filter(function (x) { return x.pegawai_id === SESI.id; })[0];
      el("ringkasSaya").innerHTML = saya
        ? '<div class="summary" style="grid-template-columns:repeat(2,1fr)">' +
          '<div><div class="n ada">' + saya.poin + '</div><div class="l">poin total</div></div>' +
          '<div><div class="n">' + saya.n_catat + '</div><div class="l">kunjungan dicatat</div></div>' +
          '<div><div class="n">' + (saya.n_jawab + saya.n_terbaik) + '</div><div class="l">jawaban di papan tanya</div></div>' +
          '<div><div class="n">' + (saya.n_konsul || 0) + '</div><div class="l">sesi konsultasi dituntaskan</div></div></div>'
        : '<div class="empty">Belum ada poin.</div>';
    });
  }
  el("formProfil").onsubmit = function (e) {
    e.preventDefault();
    PST.ubahProfil({ keahlian: PST.nilaiCentang("prKeahlian"), tautan_zoom: el("prZoom").value.trim() || null,
                     no_hp: el("prHp").value.trim() || null, jabatan: el("prJabatan").value.trim() || null })
      .then(function () { return PST.sesi(); })
      .then(function (s) { SESI = s; PST.pesan("msgProfil", "ok", "Profil tersimpan."); return PST.daftarPegawai(); })
      .then(function (p) { PEGAWAI = p; })
      .catch(function (er) { PST.pesan("msgProfil", "err", er.message); });
  };

  /* ================================================ 6. PERINGKAT */
  function gambarPeringkat() {
    PST.papanPeringkat().then(function (r) {
      if (!r.length) { el("papanPeringkat").innerHTML = '<div class="empty">Belum ada poin tercatat.</div>'; return; }
      el("papanPeringkat").innerHTML = r.map(function (p, i) {
        return '<div class="rank"><span class="rank__no">' + (i + 1) + "</span>" +
          '<span class="rank__nm"><b>' + esc(p.nama) + "</b><span>" +
            (p.jabatan ? esc(p.jabatan) + " · " : "") +
            p.n_catat + " kunjungan · " + p.n_jawab + " jawaban · " +
            p.n_terbaik + " jawaban terbaik · " + p.n_tuntas + " tiket dituntaskan" +
            (p.n_konsul ? " · " + p.n_konsul + " konsultasi" : "") + "</span></span>" +
          '<span class="rank__p">' + p.poin + "</span></div>";
      }).join("");
    }).catch(function (e) { el("papanPeringkat").innerHTML = '<div class="msg msg--err">' + esc(e.message) + "</div>"; });
  }
})();
