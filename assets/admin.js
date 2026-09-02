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
      };
    });
  }

  /* ================================================ 1. PENCOCOKAN KATALOG */
  /* Pembobotan kebalikan frekuensi: kata yang muncul di banyak baris katalog
     ("penduduk", "kabupaten") bernilai kecil; kata yang jarang ("miskin",
     "sakernas") bernilai besar. Tanpa ini, kalimat panjang selalu tersaring
     ke baris yang kebetulan memuat kata umum. */
  var HENTI = ("minta meminta mintak mohon tolong butuh perlu ingin cari mencari dapat bisa " +
    "data datanya angka nilai berapa jumlahnya untuk dari yang dengan pada atau dan " +
    "saya kami kita bapak ibu mas mbak pak bu tahun terakhir terbaru sekarang " +
    "apakah bagaimana dimana kapan mengenai tentang tolongin adalah akan sudah belum " +
    "keperluan kebutuhan skripsi tugas kuliah penelitian laporan berkas file " +
    "kutai kartanegara kukar kabupaten daerah wilayah").split(" ");

  function penggal(w) {
    var v = [w], a;
    a = w.replace(/^(keter|peng|peny|pem|pen|per|meng|meny|mem|men|ber|ter|ke|di|pe|se)/, "");
    if (a.length >= 4 && a !== w) v.push(a);
    v.slice().forEach(function (x) {
      var b = x.replace(/(kannya|annya|nya|kan|isasi|an|i)$/, "");
      if (b.length >= 4 && v.indexOf(b) === -1) v.push(b);
    });
    return v;
  }

  /* frekuensi dokumen tiap kata di seluruh katalog, dihitung sekali */
  var DF = (function () {
    var df = {};
    K.DATA.forEach(function (d) {
      var uniq = {};
      (d.n + " " + d.t + " " + d.sm + " " + d.d).toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
        .forEach(function (w) { if (w.length >= 4) uniq[w] = 1; });
      Object.keys(uniq).forEach(function (w) { df[w] = (df[w] || 0) + 1; });
    });
    return df;
  })();
  var N = K.DATA.length;

  function bobot(w) {
    var d = 0;
    penggal(w).forEach(function (v) { d = Math.max(d, DF[v] || 0); });
    if (!d) d = 1;
    return Math.max(0.35, Math.log(N / d));
  }

  function cocokkan(teks) {
    /* Singkatan diambil sebelum huruf dikecilkan: IPM, PDRB, TPT, P0, IHK, NTP
       adalah kata kunci terkuat di meja PST tetapi terlalu pendek untuk lolos
       saringan panjang biasa. */
    var singkat = (teks.match(/\b(?:[A-Z]{2,6}[0-9]?|[A-Z][0-9])\b/g) || [])
      .map(function (w) { return w.toLowerCase(); });

    var kata = teks.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
      .filter(function (w) { return w.length >= 4 && HENTI.indexOf(w) === -1; });
    kata = singkat.concat(kata)
      .filter(function (w, i, a) { return a.indexOf(w) === i; })
      .slice(0, 12);
    if (!kata.length) return [];

    return K.DATA.map(function (d) {
      var nama = d.n.toLowerCase();
      var hay = (d.n + " " + d.t + " " + d.sm + " " + d.d + " " + (d.mn || "")).toLowerCase();
      var skor = 0, kena = 0;
      kata.forEach(function (w) {
        var pendek = w.length <= 5 && singkat.indexOf(w) !== -1;
        var b = pendek ? 3.2 : bobot(w);
        var v = pendek ? [w] : penggal(w);
        var diNama = false, diIsi = false;
        v.forEach(function (x) {
          var pola = pendek ? new RegExp("\\b" + x + "\\b") : null;
          if (pendek ? pola.test(nama) : nama.indexOf(x) !== -1) diNama = true;
          else if (pendek ? pola.test(hay) : hay.indexOf(x) !== -1) diIsi = true;
        });
        if (diNama) { skor += b * 3; kena++; }
        else if (diIsi) { skor += b; kena++; }
      });
      if (kena > 1) skor *= 1 + (kena - 1) * 0.35;   /* makin banyak kata cocok, makin yakin */
      return { d: d, skor: skor };
    }).filter(function (x) { return x.skor > 0.9; })
      .sort(function (a, b) { return b.skor - a.skor; })
      .slice(0, 5).map(function (x) { return x.d; });
  }

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
      el("hasilTiket").innerHTML =
        '<div class="tiketbox"><div class="k">' + esc(t.kode_tiket) + "</div>" +
        "<p>Kunjungan tersimpan. Berikan kode ini kepada sahabat data — ia dapat memeriksa status permintaannya " +
        "di halaman Sahabat Data dengan kode tersebut dan empat digit terakhir nomor HP-nya." +
        (status === "eskalasi" ? " Jangan lupa mengangkat kebutuhannya ke papan tanya." : "") + "</p></div>";
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

  function saringTiket() {
    var s = el("fStatus").value, q = el("fCari").value.trim().toLowerCase();
    return TIKET.filter(function (t) {
      if (s && t.status !== s) return false;
      if (!q) return true;
      return [t.kode_tiket, t.nama, t.nama_instansi, t.kebutuhan, t.kategori_instansi]
        .join(" ").toLowerCase().indexOf(q) !== -1;
    });
  }

  function gambarTiket() {
    var d = saringTiket();
    if (!d.length) { el("tblTiket").innerHTML = '<tr><td class="empty">Belum ada kunjungan tercatat.</td></tr>'; return; }
    el("tblTiket").innerHTML =
      "<thead><tr><th>Kode</th><th>Waktu</th><th>Sahabat data</th><th>Kebutuhan</th><th>Status</th><th></th></tr></thead><tbody>" +
      d.slice(0, 300).map(function (t) {
        var w = { selesai:"ada", proses:"mohon", surat:"mohon", eskalasi:"prov", tolak:"tidak" }[t.status] || "lain";
        return "<tr><td><span class='kode'>" + esc(t.kode_tiket) + "</span></td>" +
          "<td>" + esc(PST.tgl(t.dibuat, true)) + "</td>" +
          "<td><b>" + esc(t.nama) + "</b><br><span style='font-size:12px'>" + esc(t.nama_instansi || t.kategori_instansi || "—") + "</span></td>" +
          "<td style='max-width:340px'>" + esc((t.kebutuhan || "").slice(0, 130)) + ((t.kebutuhan||"").length > 130 ? "…" : "") + "</td>" +
          "<td><span class='pill " + w + "'>" + esc(B.statusTiket[t.status] || t.status) + "</span></td>" +
          "<td><button class='btn btn--ghost btn--sm' data-buka='" + esc(t.id) + "'>buka</button></td></tr>";
      }).join("") + "</tbody>";
    PST.qa("[data-buka]").forEach(function (b) { b.onclick = function () { bukaTiket(b.dataset.buka); }; });
  }
  el("fStatus").onchange = gambarTiket;
  el("fCari").oninput = gambarTiket;

  function bukaTiket(id) {
    var t = TIKET.filter(function (x) { return x.id === id; })[0];
    if (!t) return;
    var baris = function (l, v) { return v ? "<tr><th style='width:180px'>" + esc(l) + "</th><td>" + esc(v) + "</td></tr>" : ""; };
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
        baris("Kebutuhan", t.kebutuhan) +
        baris("Ragam data dirujuk", (t.katalog_ref || []).join(" · ")) +
        baris("Perlu surat", t.butuh_surat ? "Ya" : "") +
        baris("Tenggat", t.tenggat ? PST.tgl(t.tenggat) : "") +
        baris("Dicatat", PST.tgl(t.dibuat, true)) +
      "</table></div>" +
      '<div class="grid grid--2" style="margin-top:14px">' +
        '<div class="field"><label class="fl">Ubah status</label><select id="dStatus">' +
          Object.keys(B.statusTiket).map(function (k) {
            return '<option value="' + k + '"' + (k === t.status ? " selected" : "") + ">" + esc(B.statusTiket[k]) + "</option>";
          }).join("") + "</select></div>" +
        '<div class="field"><label class="fl">Catatan penyelesaian</label>' +
          '<textarea id="dHasil" style="min-height:60px">' + esc(t.hasil || "") + "</textarea></div>" +
      "</div>" +
      '<div class="btnrow"><button class="btn btn--sm" id="dSimpan">Simpan perubahan</button>' +
      '<button class="btn btn--ghost btn--sm" id="dAngkat">Angkat ke papan tanya</button>' +
      '<button class="btn btn--ghost btn--sm" id="dTutup">Tutup rincian</button></div></div>';

    el("dSimpan").onclick = function () {
      PST.ubahKunjungan(id, { status: el("dStatus").value, hasil: el("dHasil").value.trim() || null }, SESI.id)
        .then(function () { PST.pesan("msgDetail", "ok", "Tersimpan."); return muatTiket(); })
        .catch(function (e) { PST.pesan("msgDetail", "err", e.message); });
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
  function muatTanya() {
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
          '<div class="qa__b"><p style="font-size:13.5px;color:var(--ink-2);white-space:pre-wrap;margin:12px 0 0">' +
            esc(p.isi || "") + "</p><div class='jwbList'></div></div></div>";
      }).join("");
      PST.qa(".qa").forEach(function (n) {
        n.querySelector(".qa__h").onclick = function () {
          var buka = n.classList.toggle("is-open");
          if (buka) gambarJawaban(n, n.dataset.q, r.filter(function(x){return x.id===n.dataset.q;})[0]);
        };
      });
    }).catch(function (e) { el("daftarTanya").innerHTML = '<div class="msg msg--err">' + esc(e.message) + "</div>"; });
  }

  function gambarJawaban(node, pid, pert) {
    var box = node.querySelector(".jwbList");
    box.innerHTML = '<div class="empty" style="padding:16px">Memuat…</div>';
    PST.daftarJawaban(pid).then(function (js) {
      box.innerHTML = js.map(function (j) {
        return '<div class="jwb' + (j.terbaik ? " is-best" : "") + '">' +
          '<div class="jwb__m">' + esc(j.penjawab_nama || "pegawai") + " · " + esc(PST.sejak(j.dibuat)) +
          (j.terbaik ? " · paling membantu" : "") + "</div>" +
          '<div style="white-space:pre-wrap">' + esc(j.isi) + "</div>" +
          ((j.tautan || []).length ? '<div style="margin-top:6px">' + j.tautan.map(function (u) {
            return '<a class="lnk" style="font-size:12.5px" href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(u) + "</a>";
          }).join("<br>") + "</div>" : "") +
          (j.terbaik ? "" : '<div style="margin-top:7px"><button class="btn btn--ghost btn--sm" data-best="' + esc(j.id) + '">tandai paling membantu</button></div>') +
          "</div>";
      }).join("") +
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

  /* ================================================ 6. PERINGKAT */
  function gambarPeringkat() {
    PST.papanPeringkat().then(function (r) {
      if (!r.length) { el("papanPeringkat").innerHTML = '<div class="empty">Belum ada poin tercatat.</div>'; return; }
      el("papanPeringkat").innerHTML = r.map(function (p, i) {
        return '<div class="rank"><span class="rank__no">' + (i + 1) + "</span>" +
          '<span class="rank__nm"><b>' + esc(p.nama) + "</b><span>" +
            (p.jabatan ? esc(p.jabatan) + " · " : "") +
            p.n_catat + " kunjungan · " + p.n_jawab + " jawaban · " +
            p.n_terbaik + " jawaban terbaik · " + p.n_tuntas + " tiket dituntaskan</span></span>" +
          '<span class="rank__p">' + p.poin + "</span></div>";
      }).join("");
    }).catch(function (e) { el("papanPeringkat").innerHTML = '<div class="msg msg--err">' + esc(e.message) + "</div>"; });
  }
})();
