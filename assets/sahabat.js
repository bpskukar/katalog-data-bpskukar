/* ============================================================================
   Portal sahabat data — penelusuran tiket tanpa akun, plus akun opsional.
   ========================================================================== */
(function () {
  "use strict";
  var B = window.BAKU, K = window.KONFIG, esc = PST.esc, el = PST.el;
  var SESI = null;

  el("spanduk").innerHTML = PST.spandukDemo();
  el("jamLayanan").textContent = K.JAM_LAYANAN;
  el("kontak").innerHTML = "<b>" + esc(K.NAMA_SATKER) + "</b> &mdash; " + esc(K.ALAMAT) +
    " · telepon " + esc(K.TELEPON) + " · surel <a href='mailto:" + esc(K.SUREL) + "'>" + esc(K.SUREL) + "</a>" +
    " · " + esc(K.JAM_LAYANAN) + ".";
  el("dKategori").innerHTML = '<option value=""></option>' + PST.opsi(B.kategoriInstansi);
  el("pGuna").innerHTML = '<option value=""></option>' + PST.opsi(B.pemanfaatan);

  PST.sesi().then(function (s) {
    el("navbar").innerHTML = PST.nav("sahabat.html", s);
    PST.pasangKeluar();
    if (s && s.jenis === "sahabat") { SESI = s; masukAkun(); }
    else if (s && s.jenis === "pegawai") {
      el("kotakAkun").innerHTML = '<div class="card__title">Anda masuk sebagai pegawai</div>' +
        '<p style="font-size:13.5px;color:var(--ink-2);margin:0 0 14px">Halaman ini adalah tampilan yang dilihat sahabat data. ' +
        'Untuk mencatat kunjungan dan melihat rekap, buka ruang pegawai.</p>' +
        '<a class="btn" href="admin.html">Buka ruang pegawai</a>';
    }
  });

  /* ------------------------------------------------------- cek kode tiket */
  var LANGKAH = [
    ["Permintaan diterima", "Petugas PST mencatat kebutuhan Anda."],
    ["Sedang diproses",     "Data sedang disiapkan atau ditanyakan ke pegawai yang menangani."],
    ["Selesai",             "Data sudah dapat diambil atau sudah dikirim."]
  ];

  function tampilKonsultasi(t) {
    var st = B.statusKonsultasi[t.status] || t.status;
    var w = { diajukan:"mohon", dijadwalkan:"ada", selesai:"lain", batal:"tidak" }[t.status] || "lain";
    var idx = t.status === "selesai" ? 2 : (t.status === "dijadwalkan" ? 1 : 0);
    var LK = [["Permintaan diterima", "Kebutuhan Anda sudah tercatat."], ["Dijadwalkan", "Narasumber dan tautan Zoom sudah ditetapkan."], ["Selesai", "Sesi konsultasi sudah berlangsung."]];
    el("hasilCek").innerHTML =
      '<div style="border-top:1px solid var(--line);padding-top:16px">' +
      '<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;margin-bottom:12px">' +
        '<span class="kode">' + esc(t.kode) + '</span><span class="pill ' + w + '">' + esc(st) + "</span></div>" +
      '<p style="font-size:14px;margin:0 0 4px"><b>' + esc(PST.tgl(t.tanggal)) + " pukul " + esc(String(t.jam).slice(0, 5)) + " WITA</b> · " + t.durasi_menit + " menit</p>" +
      '<p style="font-size:13.5px;color:var(--ink-2);margin:0 0 14px"><b style="color:var(--ink)">Kebutuhan:</b> ' + esc(t.kebutuhan) + "</p>" +
      (t.status === "batal" ? "" : '<div class="lini">' + LK.map(function (l, i) {
        return '<div class="lini__i' + (i <= idx ? " on" : "") + '"><div class="lini__t">' + esc(l[0]) + '</div><div class="lini__d">' + esc(l[1]) + "</div></div>";
      }).join("") + "</div>") +
      (t.narasumber ? '<p style="font-size:13.5px;margin:4px 0 0"><b>Narasumber:</b> ' + esc(t.narasumber) + "</p>" : "") +
      (t.tautan_zoom ? '<div class="msg msg--ok" style="margin:12px 0 0"><b>Tautan Zoom:</b> ' + PST.linkify(t.tautan_zoom) + "<br><span style='font-size:12px'>Masuk lima menit sebelum jadwal. Siapkan pertanyaan Anda.</span></div>" : "") +
      (t.pesan_untuk_sahabat ? '<div class="msg msg--info" style="margin:12px 0 0"><b>Pesan petugas:</b> ' + PST.linkify(t.pesan_untuk_sahabat) + "</div>" : "") +
      (t.status === "batal" ? '<div class="msg msg--warn" style="margin:12px 0 0">Permintaan ini dibatalkan. Bila masih memerlukan konsultasi, ajukan kembali atau hubungi PST.</div>' : "") +
      "</div>";
  }

  el("formCek").onsubmit = function (e) {
    e.preventDefault();
    PST.pesan("msgCek", "info", "Mencari…");
    el("hasilCek").innerHTML = "";
    var kode = el("kKode").value.trim().toUpperCase();
    if (kode.indexOf("KON-") === 0) {
      PST.cekKonsultasi(kode, el("kHp").value).then(function (t) {
        PST.pesan("msgCek", "", "");
        if (!t) { PST.pesan("msgCek", "err", "Permintaan konsultasi tidak ditemukan. Periksa kode dan empat digit terakhir nomor HP Anda."); return; }
        tampilKonsultasi(t);
      }).catch(function (er) { PST.pesan("msgCek", "err", er.message); });
      return;
    }
    PST.cekTiket(kode, el("kHp").value).then(function (t) {
      PST.pesan("msgCek", "", "");
      if (!t) {
        PST.pesan("msgCek", "err", "Tiket tidak ditemukan. Periksa kembali kode dan empat digit terakhir nomor HP yang Anda berikan kepada petugas. Setelah lima kali salah, pemeriksaan kode itu dijeda 15 menit.");
        return;
      }
      var idx = t.status === "selesai" ? 2 : (t.status === "tolak" ? 0 : 1);
      var w = { selesai:"ada", proses:"mohon", surat:"mohon", eskalasi:"prov", tolak:"tidak" }[t.status] || "lain";
      el("hasilCek").innerHTML =
        '<div style="border-top:1px solid var(--line);padding-top:16px">' +
        '<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;margin-bottom:12px">' +
          '<span class="kode">' + esc(t.kode_tiket) + "</span>" +
          '<span class="pill ' + w + '">' + esc(B.statusTiket[t.status] || t.status) + "</span>" +
          '<span style="font-family:var(--f-mono);font-size:11px;color:var(--ink-3)">diajukan ' + esc(PST.tgl(t.dibuat)) + "</span>" +
        "</div>" +
        '<p style="font-size:13.5px;color:var(--ink-2);margin:0 0 16px"><b style="color:var(--ink)">Kebutuhan:</b> ' + esc(t.kebutuhan) + "</p>" +
        '<div class="lini">' + LANGKAH.map(function (l, i) {
          return '<div class="lini__i' + (i <= idx ? " on" : "") + '"><div class="lini__t">' + esc(l[0]) +
            "</div><div class=\"lini__d\">" + esc(l[1]) + "</div></div>";
        }).join("") + "</div>" +
        (t.tenggat ? '<p style="font-size:13px;color:var(--ink-3);margin:4px 0 0">Perkiraan selesai: ' + esc(PST.tgl(t.tenggat)) + ".</p>" : "") +
        (t.hasil ? '<div class="msg msg--info" style="margin:14px 0 0"><b>Catatan petugas:</b> ' + PST.linkify(t.hasil) + "</div>" : "") +
        (t.status === "tolak" ? '<div class="msg msg--warn" style="margin:14px 0 0">Permintaan ini tidak dapat dipenuhi. Alasannya ada pada catatan petugas di atas. Bila masih memerlukan penjelasan, hubungi PST.</div>' : "") +
        "</div>";
    }).catch(function (er) { PST.pesan("msgCek", "err", er.message); });
  };

  /* ------------------------------------------------------------------ akun */
  el("keDaftar").onclick = function () {
    el("formAkunMasuk").hidden = true; el("formAkunDaftar").hidden = false;
    el("judulAkun").textContent = "Daftar akun sahabat data"; PST.pesan("msgAkun", "", "");
  };
  el("keMasuk").onclick = function () {
    el("formAkunDaftar").hidden = true; el("formAkunMasuk").hidden = false;
    el("judulAkun").textContent = "Masuk ke akun sahabat data"; PST.pesan("msgAkun", "", "");
  };

  el("formAkunMasuk").onsubmit = function (e) {
    e.preventDefault();
    PST.pesan("msgAkun", "info", "Memeriksa…");
    PST.masuk(el("aEmail").value.trim(), el("aSandi").value)
      .then(function () { location.reload(); })
      .catch(function (er) { PST.pesan("msgAkun", "err", er.message); });
  };

  el("formAkunDaftar").onsubmit = function (e) {
    e.preventDefault();
    PST.pesan("msgAkun", "info", "Membuat akun…");
    PST.daftarSahabat({
      nama: el("dNama").value.trim(), email: el("dEmail").value.trim(), sandi: el("dSandi").value,
      no_hp: el("dHp").value.trim(), kategori_instansi: el("dKategori").value,
      nama_instansi: el("dInstansi").value.trim()
    }).then(function () {
      if (PST.DEMO) { location.reload(); return; }
      PST.pesan("msgAkun", "ok", "Akun dibuat. Bila diminta, buka tautan konfirmasi yang dikirim ke surel Anda, lalu masuk.");
      el("formAkunDaftar").reset();
    }).catch(function (er) { PST.pesan("msgAkun", "err", er.message); });
  };

  /* --------------------------------------------------------- ruang pengguna */
  function masukAkun() {
    el("kotakAkun").innerHTML = '<div class="card__title">Akun Anda</div>' +
      "<p style='font-size:14px;margin:0 0 4px'><b>" + esc(SESI.profil.nama || SESI.email) + "</b></p>" +
      "<p style='font-size:13px;color:var(--ink-3);margin:0'>" +
        esc([SESI.profil.nama_instansi, SESI.profil.kategori_instansi].filter(Boolean).join(" · ") || SESI.email) + "</p>";
    el("scAkun").hidden = false;
    muatRiwayat();
  }

  function muatRiwayatKon() {
    PST.daftarKonsultasi({ sahabat_id: SESI.id }).then(function (r) {
      if (!r.length) { el("riwayatKon").innerHTML = '<div class="empty" style="border:1px solid var(--line);background:var(--panel)">Belum ada permintaan konsultasi pada akun ini.</div>'; return; }
      el("riwayatKon").innerHTML = r.map(function (k) {
        var w = { diajukan:"mohon", dijadwalkan:"ada", selesai:"lain", batal:"tidak" }[k.status] || "lain";
        return '<div class="riw"><div class="riw__h"><span class="kode">' + esc(k.kode) + '</span><span class="pill ' + w + '">' + esc(B.statusKonsultasi[k.status] || k.status) + "</span>" +
          '<span style="font-family:var(--f-mono);font-size:11px;color:var(--ink-3)">' + esc(PST.tgl(k.tanggal)) + " · " + esc(k.jam) + " WITA</span></div>" +
          '<div style="font-size:13.5px;color:var(--ink-2)">' + esc(k.kebutuhan) + "</div>" +
          (k.narasumber_nama ? '<div style="font-size:13px;margin-top:6px"><b>Narasumber:</b> ' + esc(k.narasumber_nama) + "</div>" : "") +
          (k.status === "dijadwalkan" && k.tautan_zoom ? '<div style="font-size:13px;margin-top:4px"><b>Zoom:</b> ' + PST.linkify(k.tautan_zoom) + "</div>" : "") +
          (k.pesan_untuk_sahabat ? '<div style="font-size:13px;color:var(--ink-3);margin-top:4px"><b>Pesan petugas:</b> ' + PST.linkify(k.pesan_untuk_sahabat) + "</div>" : "") +
          "</div>";
      }).join("");
    }).catch(function (er) { el("riwayatKon").innerHTML = '<div class="msg msg--err">' + esc(er.message) + "</div>"; });
  }

  function muatRiwayat() {
    muatRiwayatKon();
    PST.daftarKunjungan({ sahabat_id: SESI.id }).then(function (r) {
      if (!r.length) {
        el("riwayat").innerHTML = '<div class="empty" style="border:1px solid var(--line);background:var(--panel)">' +
          "Belum ada permintaan tercatat pada akun ini. Bila Anda pernah datang ke PST, gunakan kotak kode tiket di atas." +
          "</div>";
        return;
      }
      el("riwayat").innerHTML = r.map(function (t) {
        var w = { selesai:"ada", proses:"mohon", surat:"mohon", eskalasi:"prov", tolak:"tidak" }[t.status] || "lain";
        return '<div class="riw"><div class="riw__h">' +
          '<span class="kode">' + esc(t.kode_tiket || "—") + "</span>" +
          '<span class="pill ' + w + '">' + esc(B.statusTiket[t.status] || t.status) + "</span>" +
          '<span style="font-family:var(--f-mono);font-size:11px;color:var(--ink-3)">' + esc(PST.tgl(t.dibuat)) + "</span>" +
          "</div>" +
          '<div style="font-size:13.5px;color:var(--ink-2)">' + esc(t.kebutuhan) + "</div>" +
          (t.hasil ? '<div style="font-size:13px;color:var(--ink-3);margin-top:7px"><b>Catatan petugas:</b> ' + PST.linkify(t.hasil) + "</div>" : "") +
          "</div>";
      }).join("");
    }).catch(function (er) { el("riwayat").innerHTML = '<div class="msg msg--err">' + esc(er.message) + "</div>"; });
  }

  el("formAjukan").onsubmit = function (e) {
    e.preventDefault();
    PST.pesan("msgAjukan", "info", "Mengirim…");
    PST.tambahKunjungan({
      sahabat_id: SESI.id, petugas_id: null, status: "proses",
      nama: SESI.profil.nama || SESI.email,
      email: SESI.email, no_hp: SESI.profil.no_hp || null,
      kategori_instansi: SESI.profil.kategori_instansi || null,
      nama_instansi: SESI.profil.nama_instansi || null,
      pemanfaatan: el("pGuna").value || null,
      jenis_layanan: ["Konsultasi data statistik"],
      sarana: "PST Online (pst.bps.go.id)",
      kebutuhan: el("pKebutuhan").value.trim()
    }).then(function (t) {
      PST.pesan("msgAjukan", "ok", "Permintaan terkirim. Kode tiket Anda: " + t.kode_tiket + ".");
      el("formAjukan").reset(); muatRiwayat();
    }).catch(function (er) { PST.pesan("msgAjukan", "err", er.message); });
  };
})();
