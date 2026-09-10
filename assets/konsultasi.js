/* ============================================================================
   Formulir konsultasi daring — pemilihan slot ≥ H+n hari kerja.
   ========================================================================== */
(function () {
  "use strict";
  var B = window.BAKU, K = window.KONFIG, esc = PST.esc, el = PST.el;
  var ATURAN = null, TERPAKAI = {}, pilih = { tanggal: null, jam: null };
  var HARI = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"];

  el("spanduk").innerHTML = PST.spandukDemo();
  el("kontak").innerHTML = "<b>" + esc(K.NAMA_SATKER) + "</b> &mdash; " + esc(K.ALAMAT) + " · " + esc(K.TELEPON) + " · " + esc(K.JAM_LAYANAN) + ".";
  PST.sesi().then(function (s) { el("navbar").innerHTML = PST.nav("konsultasi.html", s); PST.pasangKeluar();
    if (s && s.jenis === "sahabat") {
      el("kNama").value = s.profil.nama || ""; el("kHp").value = s.profil.no_hp || ""; el("kEmail").value = s.email || "";
      el("kInstansi").value = s.profil.nama_instansi || "";
      if (s.profil.kategori_instansi) el("kKategori").value = s.profil.kategori_instansi;
    }
  });

  var TOPIK = []; window.KATALOG.DATA.forEach(function (d) { if (TOPIK.indexOf(d.t) === -1) TOPIK.push(d.t); });
  /* topik: tombol pilih, paling banyak dua (satu sesi 30 menit); disimpan "A · B" */
  var MAKS_TOPIK = 2, topikPilih = [];
  function gambarTopik() {
    el("kTopik").innerHTML = TOPIK.concat(["Lainnya"]).map(function (t) {
      var aktif = topikPilih.indexOf(t) !== -1;
      return '<button type="button" data-topik="' + esc(t) + '" aria-pressed="' + aktif + '"' + (!aktif && topikPilih.length >= MAKS_TOPIK ? " disabled" : "") + ">" + esc(t) + "</button>";
    }).join("");
    el("kTopikHint").textContent = topikPilih.length >= MAKS_TOPIK
      ? "Sudah dua topik. Lepas salah satu bila ingin mengganti."
      : "Satu sesi 30 menit cukup untuk satu–dua topik; kalau lebih, ajukan sesi lain setelah yang ini selesai.";
  }
  el("kTopik").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-topik]"); if (!b || b.disabled) return;
    var t = b.dataset.topik, i = topikPilih.indexOf(t);
    if (i !== -1) topikPilih.splice(i, 1); else if (topikPilih.length < MAKS_TOPIK) topikPilih.push(t);
    gambarTopik();
  });
  gambarTopik();
  el("kGuna").innerHTML = '<option value=""></option>' + PST.opsi(B.pemanfaatan);
  el("kKategori").innerHTML = '<option value=""></option>' + PST.opsi(B.kategoriInstansi);

  /* --- pencocokan katalog: sebagian kebutuhan mungkin sudah tersedia --- */
  var jeda;
  el("kKebutuhan").addEventListener("input", function () {
    clearTimeout(jeda);
    jeda = setTimeout(function () {
      var hasil = CARI.cocokkan(el("kKebutuhan").value, 3).filter(function (d) { return d.st === "ada"; });
      el("cocokKat").innerHTML = hasil.length
        ? '<div class="cocok"><b>Sebagian mungkin sudah bisa diunduh sekarang:</b>' + hasil.map(function (d) {
            return '<div class="b">' + esc(d.n) + ' <span style="font-family:var(--f-mono);font-size:10.5px;color:var(--ink-3)">' + esc(d.lv) + " · " + esc(d.pd) + "</span>" +
              ((d.ln || []).slice(0, 1).map(function (x) { return ' — <a href="' + esc(x.u) + '" target="_blank" rel="noopener">' + esc(x.l) + "</a>"; }).join("")) + "</div>";
          }).join("") + '<div style="font-size:12px;color:var(--ink-3);margin-top:6px">Tetap boleh berkonsultasi untuk memahami cara membacanya.</div></div>'
        : "";
    }, 250);
  });

  /* --- jadwal --- */
  function gambarHari() {
    var mulai = PST.tambahHari(PST.tglWita(), ATURAN.minHari), akhir = PST.tambahHari(PST.tglWita(), ATURAN.maksHari);
    var html = "", d = mulai;
    while (d <= akhir) {
      var dt = new Date(d + "T00:00:00Z"), kerja = PST.hariKerja(d);
      var penuh = kerja && ATURAN.jam.every(function (j) { return TERPAKAI[d + " " + j]; });
      html += '<button type="button" data-t="' + d + '" aria-pressed="' + (pilih.tanggal === d) + '"' + (!kerja || penuh ? " disabled" : "") + ">" +
        "<span>" + HARI[dt.getUTCDay()] + "</span><b>" + dt.getUTCDate() + "</b><span>" + ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"][dt.getUTCMonth()] + "</span></button>";
      d = PST.tambahHari(d, 1);
    }
    el("hariList").innerHTML = html;
    gambarJam();
  }
  function gambarJam() {
    if (!pilih.tanggal) { el("jamList").innerHTML = '<span style="font-size:13px;color:var(--ink-3)">Pilih tanggal dulu.</span>'; return; }
    el("jamList").innerHTML = ATURAN.jam.map(function (j) {
      var isi = TERPAKAI[pilih.tanggal + " " + j];
      return '<button type="button" data-j="' + j + '" aria-pressed="' + (pilih.jam === j) + '"' + (isi ? " disabled" : "") + ">" + j + "</button>";
    }).join("");
    el("terpilih").innerHTML = pilih.jam
      ? "Jadwal dipilih: <b>" + esc(PST.tgl(pilih.tanggal)) + " pukul " + esc(pilih.jam) + " WITA</b> · " + ATURAN.durasi + " menit"
      : "Pilih jam untuk " + esc(PST.tgl(pilih.tanggal)) + ".";
  }
  el("hariList").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-t]"); if (!b || b.disabled) return;
    pilih.tanggal = b.dataset.t; pilih.jam = null; gambarHari();
  });
  el("jamList").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-j]"); if (!b || b.disabled) return;
    pilih.jam = b.dataset.j; gambarJam();
  });

  function muatSlot() {
    var mulai = PST.tglWita(), akhir = PST.tambahHari(mulai, ATURAN.maksHari + 1);
    return PST.slotTerpakai(mulai, akhir).then(function (r) {
      TERPAKAI = {}; r.forEach(function (x) { TERPAKAI[x.tanggal + " " + String(x.jam).slice(0, 5)] = true; });
    }).catch(function () {});
  }

  PST.aturanKonsultasi().then(function (a) {
    ATURAN = a;
    var kata = ["","satu","dua","tiga","empat","lima","enam","tujuh"][a.minHari];
    el("minHariTeks").textContent = a.minHari <= 0 ? "hari ini" : a.minHari === 1 ? "besok" : (kata ? kata + " hari dari sekarang" : a.minHari + " hari dari sekarang");
    el("durasiTeks").textContent = a.durasi;
    return muatSlot();
  }).then(gambarHari);

  /* --- kirim --- */
  el("formKon").onsubmit = function (e) {
    e.preventDefault();
    if (!pilih.tanggal || !pilih.jam) { PST.pesan("msgKon", "warn", "Pilih tanggal dan jam konsultasi dulu."); el("hariList").scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    var d = {
      nama: el("kNama").value.trim(), no_hp: el("kHp").value.trim(), email: el("kEmail").value.trim() || null,
      kategori_instansi: el("kKategori").value || null, nama_instansi: el("kInstansi").value.trim() || null,
      pemanfaatan: el("kGuna").value || null, topik: topikPilih.length ? topikPilih.join(" · ") : null,
      kebutuhan: el("kKebutuhan").value.trim(), tanggal: pilih.tanggal, jam: pilih.jam
    };
    el("btnAjukan").disabled = true; PST.pesan("msgKon", "info", "Mengirim…");
    PST.ajukanKonsultasi(d).then(function (kode) {
      PST.pesan("msgKon", "", "");
      el("formKon").hidden = true;
      el("hasilAjuan").hidden = false;
      el("hasilAjuan").innerHTML = '<div class="hasil"><div class="k">' + esc(kode) + "</div>" +
        '<p style="margin:10px 0 0;font-size:14px;color:var(--s-ada)">Permintaan konsultasi diterima untuk <b>' + esc(PST.tgl(d.tanggal)) + " pukul " + esc(d.jam) + " WITA</b>. " +
        "Simpan kode ini. Petugas akan menetapkan narasumber dan mengirim tautan Zoom; pantau di halaman Sahabat Data dengan kode tersebut dan empat digit terakhir nomor HP Anda.</p>" +
        '<div class="btnrow" style="margin-top:14px"><a class="btn btn--sm" href="sahabat.html">Cek status</a>' +
        '<a class="btn btn--ghost btn--sm" href="index.html">Lihat katalog data</a></div></div>';
      window.scrollTo({ top: 0, behavior: "smooth" });
    }).catch(function (er) {
      PST.pesan("msgKon", "err", er.message);
      if (/diambil|terisi/i.test(er.message)) muatSlot().then(function () { pilih.jam = null; gambarHari(); });
    }).then(function () { el("btnAjukan").disabled = false; });
  };
})();
