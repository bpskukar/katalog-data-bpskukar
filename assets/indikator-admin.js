/* ============================================================================
   Ruang pegawai — tab "Indikator": menyunting isi situs Indikator Strategis.

   Seluruh isi situs indikator (angka kartu, deret grafik, narasi, teks) adalah
   satu objek JSON. Tab ini membukanya bagian demi bagian dalam bentuk tabel
   dan formulir, lalu menyimpannya ke tabel indikator_konten (Supabase) —
   atau ke peramban saat mode demo. Setiap simpanan menjadi versi baru yang
   bisa dipulihkan.

   Dipasang oleh admin.html setelah app.js dan admin.js.
   ========================================================================== */
(function () {
  "use strict";
  if (!window.PST) return;
  var esc = PST.esc, el = PST.el;
  var KERJA = null, ASLI = null, INFO = null, BAGIAN_AKTIF = null, KOTOR = false;

  /* ------------------------------------------------------------ pembantu */
  function klon(o) { return JSON.parse(JSON.stringify(o)); }
  function ambil(obj, jalur) {
    return jalur.split(".").reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
  }
  function taruh(obj, jalur, nilai) {
    var k = jalur.split("."), o = obj;
    for (var i = 0; i < k.length - 1; i++) { if (o[k[i]] == null || typeof o[k[i]] !== "object") o[k[i]] = {}; o = o[k[i]]; }
    o[k[k.length - 1]] = nilai;
  }
  function angka(v) { var n = parseFloat(String(v).replace(",", ".")); return isNaN(n) ? 0 : n; }
  function tandaiKotor(ya) {
    KOTOR = ya;
    var b = el("indKotor"); if (b) b.hidden = !ya;
    var s = el("indSimpan"); if (s) s.disabled = !ya;
  }
  window.addEventListener("beforeunload", function (e) { if (KOTOR) { e.preventDefault(); e.returnValue = ""; } });

  function kategoriId() { return ((KERJA && KERJA.kategori) || []).map(function (k) { return k.id; }).filter(function (k) { return k !== "semua"; }); }

  /* ------------------------------------------------------- daftar bagian */
  var BAGIAN = [
    { grup: "Angka" },
    { id: "indikator", nama: "Kartu indikator", jenis: "tabel", ket: "Kartu-kartu di bagian Ringkasan. Nilai ditulis dengan titik desimal (77.25). Kolom “hanya periode” diisi bila kartu hanya tampil pada satu triwulan.",
      kolom: [["id", "ID", "text"], ["label", "Nama indikator", "text"], ["abbr", "Singkatan / periode", "text"], ["value", "Nilai", "number"],
              ["dec", "Desimal", "number"], ["unit", "Satuan", "text"], ["kat", "Kategori", "select", kategoriId], ["icon", "Ikon", "text"],
              ["accent", "Warna", "color"], ["note", "Catatan singkat", "textarea"], ["tag", "Label kecil", "text"],
              ["tagType", "Jenis label", "select", ["", "good", "warn"]], ["hanya", "Hanya periode", "select", ["", "tw1", "tw2"]]] },
    { id: "sorotan.ekonomi",   nama: "Sorotan ekonomi",   jenis: "tabel", ket: "Tiga kotak berwarna di bawah grafik PDRB.",
      kolom: [["judul", "Judul", "text"], ["nilai", "Angka besar", "text"], ["gaya", "Warna", "select", ["", "amber"]], ["ket", "Keterangan", "textarea"]] },
    { id: "sorotan.kemiskinan", nama: "Sorotan kemiskinan", jenis: "tabel", ket: "Tiga kotak berwarna di bagian Profil Kemiskinan.",
      kolom: [["judul", "Judul", "text"], ["nilai", "Angka besar", "text"], ["gaya", "Warna", "select", ["", "amber"]], ["ket", "Keterangan", "textarea"]] },
    { id: "kemiskinan", nama: "Kemiskinan per tahun", jenis: "deret", ket: "Deret tahunan untuk dua grafik kemiskinan. Tambah baris untuk tahun baru.",
      label: "Tahun", seri: [["p0", "P0 — penduduk miskin (%)"], ["p1", "P1 — kedalaman"], ["p2", "P2 — keparahan"], ["garis", "Garis kemiskinan (Rp)"]],
      ekstra: [["judul", "Judul grafik P0/P1/P2", "text"], ["sub", "Keterangan grafik", "text"], ["judulGaris", "Judul grafik garis kemiskinan", "text"], ["subGaris", "Keterangan grafik garis", "text"]] },
    { id: "pdrbTriwulan", nama: "PDRB triwulanan", jenis: "deret", label: "Triwulan", seri: [["adhb", "ADHB (miliar Rp)"], ["adhk", "ADHK (miliar Rp)"], ["lpe", "LPE (%)"]],
      ekstra: [["sub", "Keterangan grafik", "text"]] },
    { id: "pdrbTahun", nama: "PDRB tahunan", jenis: "deret", label: "Tahun", seri: [["adhb", "ADHB (miliar Rp)"], ["adhk", "ADHK (miliar Rp)"], ["lpe", "LPE (%)"]],
      ekstra: [["sub", "Keterangan grafik", "text"]] },
    { id: "ipm", nama: "IPM per tahun", jenis: "deret", label: "Tahun", seri: [["nilai", "IPM"]],
      ekstra: [["judul", "Judul grafik", "text"], ["sub", "Keterangan grafik", "text"], ["judulKomponen", "Judul kartu komponen", "text"], ["subKomponen", "Keterangan komponen", "text"]] },
    { id: "ipm.komponen", nama: "Komponen IPM", jenis: "tabel", kolom: [["nama", "Komponen", "text"], ["nilai", "Nilai (teks)", "text"], ["satuan", "Satuan", "text"], ["delta", "Perubahan", "text"]] },
    { id: "generasi", nama: "Komposisi generasi", jenis: "tabel", kolom: [["nama", "Generasi", "text"], ["nilai", "Persen", "number"], ["ket", "Keterangan", "text"], ["warna", "Warna", "color"]] },
    { id: "demografiStat", nama: "Angka demografi", jenis: "tabel", kolom: [["label", "Keterangan", "text"], ["value", "Nilai (teks)", "text"]] },
    { id: "wilayah", nama: "Kabupaten/kota Kaltim", jenis: "tabel", ket: "Kartogram. Baris/kolom = posisi kotak (1–5 / 1–3). Centang “Kukar” pada Kutai Kartanegara.",
      kolom: [["nama", "Nama", "text"], ["kode", "Kode", "text"], ["bps", "Kode BPS", "text"], ["laki", "Laki-laki (ribu)", "number"], ["perempuan", "Perempuan (ribu)", "number"],
              ["miskin", "Miskin (%)", "number"], ["ipm", "IPM", "number?"], ["uhh", "UHH (th)", "number?"], ["hls", "HLS (th)", "number?"], ["rls", "RLS (th)", "number?"], ["ppp", "Pengeluaran/kapita (ribu Rp)", "number?"],
              ["tpt", "TPT (%)", "number?"], ["lpe", "LPE (%)", "number?"], ["pdrbKapita", "PDRB/kapita (juta Rp)", "number?"], ["gini", "Gini", "number?"],
              ["row", "Baris", "number"], ["col", "Kolom", "number"], ["home", "Kukar", "bool"]] },
    { id: "banding", nama: "Pembanding kab/kota", jenis: "formulir", ket: "Bagian “Bandingkan”: tahun tiap angka dan angka Provinsi Kaltim sebagai pembanding. Angka per kabupaten/kota diisi di “Kabupaten/kota Kaltim”. Kosongkan yang belum ada — indikator tanpa angka tidak ditampilkan.",
      kolom: [["tahunIpm", "Tahun IPM & komponen", "text"], ["tahunMiskin", "Tahun kemiskinan", "text"], ["tahunPenduduk", "Tahun penduduk", "text"], ["tahunTpt", "Tahun TPT", "text"], ["tahunLpe", "Tahun LPE", "text"], ["tahunPdrbKapita", "Tahun PDRB/kapita", "text"], ["tahunGini", "Tahun Gini", "text"],
              ["provIpm", "Kaltim: IPM", "number?"], ["provUhh", "Kaltim: UHH", "number?"], ["provHls", "Kaltim: HLS", "number?"], ["provRls", "Kaltim: RLS", "number?"], ["provPpp", "Kaltim: pengeluaran/kapita", "number?"], ["provMiskin", "Kaltim: miskin (%)", "number?"],
              ["provTpt", "Kaltim: TPT (%)", "number?"], ["provLpe", "Kaltim: LPE (%)", "number?"], ["provPdrbKapita", "Kaltim: PDRB/kapita", "number?"], ["provGini", "Kaltim: Gini", "number?"], ["sumber", "Sumber (kalimat)", "textarea"]] },
    { grup: "Teks & narasi" },
    { id: "teks.hero", nama: "Judul & pembuka", jenis: "formulir", ket: "Teks paling atas. **dua bintang** = huruf tebal (di judul menjadi warna oranye).",
      kolom: [["judul", "Judul utama", "text"], ["lede", "Kalimat pembuka", "textarea"], ["mini", "Empat angka di panel kanan (ID indikator, pisahkan koma)", "daftar"]] },
    { id: "periode", nama: "Periode data", jenis: "peta", ket: "Dua tombol periode. Catatan tampil di bawah saringan indikator.",
      kolom: [["nama", "Nama", "text"], ["volume", "Volume", "text"], ["terbit", "Terbit", "text"], ["catatan", "Catatan", "textarea"]] },
    { id: "teks.pengantar", nama: "Pengantar tiap bagian", jenis: "formulir",
      kolom: [["ringkasan", "Ringkasan", "textarea"], ["ekonomi", "Ekonomi", "textarea"], ["kependudukan", "Kependudukan", "textarea"], ["manusia", "Pembangunan manusia", "textarea"],
              ["kemiskinan", "Kemiskinan", "textarea"], ["rekomendasi", "Rekomendasi", "textarea"], ["sumber", "Sumber", "textarea"]] },
    { id: "narasi.ekonomi",    nama: "Narasi ekonomi",    jenis: "pasangan", kolom: ["Judul (indikator — angka)", "Isi"] },
    { id: "narasi.manusia",    nama: "Narasi pemb. manusia", jenis: "pasangan", kolom: ["Judul (indikator — angka)", "Isi"] },
    { id: "narasi.pemerataan", nama: "Narasi pemerataan", jenis: "pasangan", kolom: ["Judul (indikator — angka)", "Isi"] },
    { id: "teks.catatanKependudukan", nama: "Catatan kependudukan", jenis: "tabel",
      kolom: [["judul", "Judul", "text"], ["isi", "Isi", "textarea"], ["warna", "Warna garis", "select", ["", "teal", "amber", "plum", "green", "rose"]]] },
    { id: "teks.peta", nama: "Teks peta Kaltim", jenis: "formulir", kolom: [["judul", "Judul kartu", "text"], ["sub", "Keterangan", "text"], ["catatan", "Catatan di samping peta", "textarea"]] },
    { id: "teks.generasi", nama: "Teks grafik generasi", jenis: "formulir", kolom: [["judul", "Judul kartu", "text"], ["sub", "Keterangan", "text"]] },
    { id: "teks.penutup", nama: "Catatan penutup", jenis: "formulir", kolom: [["judul", "Judul", "text"], ["isi", "Isi", "textarea"]] },
    { id: "rekomendasi", nama: "Rekomendasi kebijakan", jenis: "tabel", ket: "Tiap rekomendasi berisi beberapa poin (judul poin dan uraiannya).",
      kolom: [["judul", "Judul rekomendasi", "text"], ["poin", "Poin-poin", "pasangan"]] },
    { id: "sumber", nama: "Sumber data", jenis: "pasangan", kolom: ["Publikasi / survei", "Penerbit"] },
    { id: "teks", nama: "Catatan kaki & footer", jenis: "formulir",
      kolom: [["catatanSumber", "Catatan angka PDRB tahunan", "textarea"], ["footer.deskripsi", "Deskripsi di footer", "textarea"], ["footer.slogan", "Slogan", "text"]] },
    { id: "kategori", nama: "Kategori indikator", jenis: "tabel", ket: "Saringan di bagian Ringkasan. ID dipakai pada kolom kategori kartu indikator; “semua” jangan dihapus.",
      kolom: [["id", "ID", "text"], ["label", "Label", "text"]] }
  ];

  /* ------------------------------------------------------------- tampilan */
  function gambarStatus() {
    var s = el("indStatus"); if (!s) return;
    if (!INFO) {
      s.innerHTML = '<div class="msg msg--warn" style="margin:0"><b>Belum ada isi di server.</b> Situs indikator sementara memakai berkas awalnya (assets/data.js). ' +
        'Tekan <b>Muat dari berkas awal</b>, periksa, lalu <b>Simpan &amp; terbitkan</b>.</div>';
      return;
    }
    var meta = (KERJA && KERJA.meta) || {};
    s.innerHTML = '<div class="msg msg--info" style="margin:0"><b>Versi ' + esc(INFO.versi) + '</b> terbit' +
      (INFO.diubah_pada ? " · " + esc(PST.tgl(INFO.diubah_pada, true)) : "") +
      (INFO.nama_pengubah ? " · " + esc(INFO.nama_pengubah) : (INFO.catatan && /^Otomatis/.test(INFO.catatan) ? " · sistem" : "")) +
      (INFO.catatan ? '<br><span style="font-size:12px">“' + esc(INFO.catatan) + "”</span>" : "") +
      (meta.sinkron_terakhir ? '<br><span style="font-size:12px">Web API BPS terakhir: ' + esc(PST.tgl(meta.sinkron_terakhir, true)) + "</span>" : "") + "</div>";
  }

  function gambarNav() {
    var n = el("indNav"); if (!n) return;
    n.innerHTML = BAGIAN.map(function (b) {
      if (b.grup) return '<div class="ind-nav__grup">' + esc(b.grup) + "</div>";
      return '<button type="button" class="ind-nav__b' + (BAGIAN_AKTIF && BAGIAN_AKTIF.id === b.id ? " is-on" : "") + '" data-b="' + esc(b.id) + '">' + esc(b.nama) + "</button>";
    }).join("");
    PST.qa("[data-b]", n).forEach(function (btn) { btn.onclick = function () { bukaBagian(btn.dataset.b); }; });
  }

  function bukaBagian(id) {
    BAGIAN_AKTIF = BAGIAN.filter(function (b) { return b.id === id; })[0];
    if (!BAGIAN_AKTIF || !KERJA) return;
    gambarNav();
    var b = BAGIAN_AKTIF, w = el("indEditor");
    var kepala = '<div class="card__title">' + esc(b.nama) + "</div>" + (b.ket ? '<p class="sec__note">' + md(b.ket) + "</p>" : "");
    if (b.jenis === "tabel")    w.innerHTML = kepala + editorTabel(b);
    if (b.jenis === "deret")    w.innerHTML = kepala + editorDeret(b);
    if (b.jenis === "formulir") w.innerHTML = kepala + editorFormulir(b);
    if (b.jenis === "peta")     w.innerHTML = kepala + editorPeta(b);
    if (b.jenis === "pasangan") w.innerHTML = kepala + editorPasangan(b);
    pasangKendali(w);
    tandaiOtomatis(SUMBER_API);
  }
  /* lencana "API" di baris kartu/deret yang diisi otomatis dari Web API BPS */
  var SUMBER_API = [];
  function tandaiOtomatis(daftar) {
    SUMBER_API = daftar || SUMBER_API;
    if (!BAGIAN_AKTIF) return;
    PST.qa(".ind-api", el("indEditor")).forEach(function (n) { n.remove(); });
    var aktif = SUMBER_API.filter(function (x) { return x.aktif !== false; }).map(function (x) { return x.target; });
    if (BAGIAN_AKTIF.id === "indikator") {
      PST.qa("input[data-j$='.id']", el("indEditor")).forEach(function (inp) {
        if (aktif.indexOf("kartu:" + inp.value) !== -1) inp.insertAdjacentHTML("afterend", '<span class="ind-api" title="Nilai diisi otomatis dari Web API BPS">API</span>');
      });
    } else {
      var seri = aktif.filter(function (t) { return t.indexOf("deret:" + BAGIAN_AKTIF.id + ":") === 0; }).map(function (t) { return t.split(":")[2]; });
      if (seri.length) PST.qa(".ind-tbl thead th", el("indEditor")).forEach(function (th) {
        var b = BAGIAN_AKTIF.seri && BAGIAN_AKTIF.seri.filter(function (s) { return s[1] === th.textContent; })[0];
        if (b && seri.indexOf(b[0]) !== -1) th.insertAdjacentHTML("beforeend", '<span class="ind-api" title="Deret diisi otomatis dari Web API BPS">API</span>');
      });
      if (BAGIAN_AKTIF.id === "wilayah" && aktif.some(function (t) { return t.indexOf("wilayah:") === 0; }))
        PST.qa(".ind-tbl thead th", el("indEditor")).forEach(function (th) {
          var kolom = { "Miskin (%)": "miskin", "Laki-laki (ribu)": "laki", "Perempuan (ribu)": "perempuan" }[th.textContent];
          if (kolom && aktif.indexOf("wilayah:" + kolom) !== -1) th.insertAdjacentHTML("beforeend", '<span class="ind-api">API</span>');
        });
    }
  }
  function md(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>"); }

  /* ---- sel masukan generik ---- */
  function sel(jalur, tipe, nilai, pilihan) {
    var a = ' data-j="' + esc(jalur) + '" data-t="' + tipe + '"';
    if (tipe === "textarea") return '<textarea class="ind-in"' + a + ">" + esc(nilai == null ? "" : nilai) + "</textarea>";
    if (tipe === "select") {
      var ops = typeof pilihan === "function" ? pilihan() : (pilihan || []);
      if (nilai && ops.indexOf(nilai) === -1) ops = ops.concat([nilai]);
      return '<select class="ind-in"' + a + ">" + ops.map(function (o) {
        return '<option value="' + esc(o) + '"' + (o === (nilai == null ? "" : nilai) ? " selected" : "") + ">" + (o === "" ? "—" : esc(o)) + "</option>";
      }).join("") + "</select>";
    }
    if (tipe === "bool") return '<input type="checkbox" class="ind-in"' + a + (nilai ? " checked" : "") + ">";
    if (tipe === "color") return '<span class="ind-warna"><input type="color" class="ind-in"' + a + ' value="' + esc(/^#[0-9a-fA-F]{6}$/.test(nilai || "") ? nilai : "#ED7014") + '"><code>' + esc(nilai || "") + "</code></span>";
    if (tipe === "number" || tipe === "number?") return '<input type="text" inputmode="decimal" class="ind-in ind-in--angka"' + a + ' value="' + esc(nilai == null ? "" : nilai) + '"' + (tipe === "number?" ? ' placeholder="–"' : "") + '>';
    if (tipe === "daftar") return '<input type="text" class="ind-in"' + a + ' value="' + esc(Array.isArray(nilai) ? nilai.join(", ") : (nilai || "")) + '">';
    return '<input type="text" class="ind-in"' + a + ' value="' + esc(nilai == null ? "" : nilai) + '">';
  }

  function editorTabel(b) {
    var arr = ambil(KERJA, b.id);
    if (!Array.isArray(arr)) { arr = []; taruh(KERJA, b.id, arr); }
    var kol = b.kolom;
    var h = '<div class="tbl-scroll"><table class="tbl ind-tbl"><thead><tr><th style="width:26px">#</th>' +
      kol.map(function (k) { return "<th>" + esc(k[1]) + "</th>"; }).join("") + '<th style="width:96px"></th></tr></thead><tbody>';
    arr.forEach(function (row, i) {
      h += '<tr><td class="ind-no">' + (i + 1) + "</td>" + kol.map(function (k) {
        var j = b.id + "." + i + "." + k[0];
        if (k[2] === "pasangan") return '<td style="min-width:360px">' + editorPasanganMini(j, row[k[0]]) + "</td>";
        return "<td>" + sel(j, k[2], row[k[0]], k[3]) + "</td>";
      }).join("") + '<td class="ind-aksi"><button type="button" title="naik" data-naik="' + i + '">↑</button><button type="button" title="turun" data-turun="' + i + '">↓</button><button type="button" title="hapus" data-hapus="' + i + '">×</button></td></tr>';
    });
    h += "</tbody></table></div>" +
      '<div class="btnrow" style="margin-top:12px"><button type="button" class="btn btn--ghost btn--sm" data-tambah="' + esc(b.id) + '">+ Tambah baris</button></div>';
    return h;
  }

  function editorPasanganMini(jalur, arr) {
    arr = Array.isArray(arr) ? arr : [];
    return '<div class="ind-pas" data-pas="' + esc(jalur) + '">' + arr.map(function (p, i) {
      return '<div class="ind-pas__b"><input type="text" class="ind-in" data-j="' + esc(jalur + "." + i + ".0") + '" data-t="text" value="' + esc(p[0]) + '" placeholder="Judul poin">' +
        '<textarea class="ind-in" data-j="' + esc(jalur + "." + i + ".1") + '" data-t="textarea" placeholder="Uraian">' + esc(p[1]) + "</textarea>" +
        '<button type="button" title="hapus poin" data-hapus-pas="' + esc(jalur) + '" data-i="' + i + '">×</button></div>';
    }).join("") + '<button type="button" class="btn btn--ghost btn--sm" data-tambah-pas="' + esc(jalur) + '">+ poin</button></div>';
  }

  function editorPasangan(b) {
    var arr = ambil(KERJA, b.id);
    if (!Array.isArray(arr)) { arr = []; taruh(KERJA, b.id, arr); }
    return arr.map(function (p, i) {
      return '<div class="ind-baris"><span class="ind-no">' + (i + 1) + "</span><div style=\"flex:1\">" +
        '<label class="fl">' + esc(b.kolom[0]) + "</label>" + sel(b.id + "." + i + ".0", "text", p[0]) +
        '<label class="fl" style="margin-top:8px">' + esc(b.kolom[1]) + "</label>" + sel(b.id + "." + i + ".1", "textarea", p[1]) + "</div>" +
        '<span class="ind-aksi"><button type="button" data-naik="' + i + '">↑</button><button type="button" data-turun="' + i + '">↓</button><button type="button" data-hapus="' + i + '">×</button></span></div>';
    }).join("") + '<div class="btnrow" style="margin-top:12px"><button type="button" class="btn btn--ghost btn--sm" data-tambah="' + esc(b.id) + '">+ Tambah</button></div>';
  }

  function editorDeret(b) {
    var o = ambil(KERJA, b.id);
    if (!o || typeof o !== "object") { o = {}; taruh(KERJA, b.id, o); }
    if (!Array.isArray(o.label)) o.label = [];
    b.seri.forEach(function (s) { if (!Array.isArray(o[s[0]])) o[s[0]] = o.label.map(function () { return 0; }); });
    var h = "";
    if (b.ekstra) h += '<div class="grid grid--2" style="gap:10px;margin-bottom:14px">' + b.ekstra.map(function (e) {
      return '<div class="field" style="margin:0"><label class="fl">' + esc(e[1]) + "</label>" + sel(b.id + "." + e[0], e[2], o[e[0]]) + "</div>";
    }).join("") + "</div>";
    h += '<div class="tbl-scroll"><table class="tbl ind-tbl"><thead><tr><th style="width:26px">#</th><th>' + esc(b.label) + "</th>" +
      b.seri.map(function (s) { return "<th>" + esc(s[1]) + "</th>"; }).join("") + '<th style="width:96px"></th></tr></thead><tbody>';
    o.label.forEach(function (lb, i) {
      h += '<tr><td class="ind-no">' + (i + 1) + "</td><td>" + sel(b.id + ".label." + i, "text", lb) + "</td>" +
        b.seri.map(function (s) { return "<td>" + sel(b.id + "." + s[0] + "." + i, "number", o[s[0]][i]) + "</td>"; }).join("") +
        '<td class="ind-aksi"><button type="button" data-naik="' + i + '">↑</button><button type="button" data-turun="' + i + '">↓</button><button type="button" data-hapus="' + i + '">×</button></td></tr>';
    });
    h += "</tbody></table></div>" +
      '<div class="btnrow" style="margin-top:12px"><button type="button" class="btn btn--ghost btn--sm" data-tambah="' + esc(b.id) + '">+ Tambah baris</button></div>';
    return h;
  }

  function editorFormulir(b) {
    var o = ambil(KERJA, b.id);
    if (!o || typeof o !== "object") { o = {}; taruh(KERJA, b.id, o); }
    return b.kolom.map(function (k) {
      return '<div class="field"><label class="fl">' + esc(k[1]) + "</label>" + sel(b.id + "." + k[0], k[2], ambil(o, k[0])) + "</div>";
    }).join("");
  }

  function editorPeta(b) {
    var o = ambil(KERJA, b.id);
    if (!o || typeof o !== "object") { o = {}; taruh(KERJA, b.id, o); }
    return Object.keys(o).map(function (key) {
      return '<div class="card" style="padding:14px 16px;margin-bottom:10px"><div class="card__title" style="margin-bottom:8px">' + esc(key) + "</div>" +
        '<div class="grid grid--2" style="gap:10px">' + b.kolom.map(function (k) {
          return '<div class="field" style="margin:0"><label class="fl">' + esc(k[1]) + "</label>" + sel(b.id + "." + key + "." + k[0], k[2], o[key][k[0]]) + "</div>";
        }).join("") + "</div></div>";
    }).join("");
  }

  /* ---- ikat masukan → KERJA ---- */
  function pasangKendali(w) {
    PST.qa(".ind-in", w).forEach(function (inp) {
      var ubah = function () {
        var t = inp.dataset.t, v;
        if (t === "bool") v = inp.checked;
        else if (t === "number") v = inp.value.trim() === "" ? 0 : angka(inp.value);
        else if (t === "number?") v = inp.value.trim() === "" ? null : angka(inp.value);   /* kosong = tidak ada data */
        else if (t === "daftar") v = inp.value.split(",").map(function (x) { return x.trim(); }).filter(Boolean);
        else v = inp.value;
        if (t === "color") { var c = inp.parentNode.querySelector("code"); if (c) c.textContent = v; }
        taruh(KERJA, inp.dataset.j, v);
        tandaiKotor(true);
      };
      inp.addEventListener("input", ubah); inp.addEventListener("change", ubah);
    });
    var b = BAGIAN_AKTIF;
    var target = function () { var arr = ambil(KERJA, b.id); return b.jenis === "deret" ? arr.label : arr; };
    var tukar = function (i, j) {
      if (b.jenis === "deret") {
        var o = ambil(KERJA, b.id);
        [o.label].concat(b.seri.map(function (s) { return o[s[0]]; })).forEach(function (a) { var t = a[i]; a[i] = a[j]; a[j] = t; });
      } else { var arr = ambil(KERJA, b.id); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
      tandaiKotor(true); bukaBagian(b.id);
    };
    PST.qa("[data-naik]", w).forEach(function (x) { x.onclick = function () { var i = +x.dataset.naik; if (i > 0) tukar(i, i - 1); }; });
    PST.qa("[data-turun]", w).forEach(function (x) { x.onclick = function () { var i = +x.dataset.turun; if (i < target().length - 1) tukar(i, i + 1); }; });
    PST.qa("[data-hapus]", w).forEach(function (x) {
      x.onclick = function () {
        var i = +x.dataset.hapus;
        if (!confirm("Hapus baris " + (i + 1) + "?")) return;
        if (b.jenis === "deret") { var o = ambil(KERJA, b.id); [o.label].concat(b.seri.map(function (s) { return o[s[0]]; })).forEach(function (a) { a.splice(i, 1); }); }
        else ambil(KERJA, b.id).splice(i, 1);
        tandaiKotor(true); bukaBagian(b.id);
      };
    });
    PST.qa("[data-tambah]", w).forEach(function (x) {
      x.onclick = function () {
        if (b.jenis === "deret") { var o = ambil(KERJA, b.id); o.label.push(""); b.seri.forEach(function (s) { o[s[0]].push(0); }); }
        else if (b.jenis === "pasangan") ambil(KERJA, b.id).push(["", ""]);
        else {
          var baru = {}; b.kolom.forEach(function (k) { baru[k[0]] = k[2] === "number" ? 0 : k[2] === "number?" ? null : k[2] === "bool" ? false : k[2] === "pasangan" ? [] : k[2] === "color" ? "#ED7014" : ""; });
          ambil(KERJA, b.id).push(baru);
        }
        tandaiKotor(true); bukaBagian(b.id);
        var baris = PST.qa(".ind-tbl tbody tr, .ind-baris", el("indEditor")); if (baris.length) baris[baris.length - 1].scrollIntoView({ block: "nearest" });
      };
    });
    PST.qa("[data-tambah-pas]", w).forEach(function (x) {
      x.onclick = function () { var arr = ambil(KERJA, x.dataset.tambahPas); if (!Array.isArray(arr)) { arr = []; taruh(KERJA, x.dataset.tambahPas, arr); } arr.push(["", ""]); tandaiKotor(true); bukaBagian(b.id); };
    });
    PST.qa("[data-hapus-pas]", w).forEach(function (x) {
      x.onclick = function () { ambil(KERJA, x.dataset.hapusPas).splice(+x.dataset.i, 1); tandaiKotor(true); bukaBagian(b.id); };
    });
  }

  /* ------------------------------------------------------------ periksa */
  function periksa(d) {
    var galat = [];
    if (!d || typeof d !== "object") return ["Isi bukan objek."];
    if (!Array.isArray(d.indikator) || !d.indikator.length) galat.push("Daftar kartu indikator kosong.");
    var ids = {};
    (d.indikator || []).forEach(function (it, i) {
      var n = "Kartu #" + (i + 1) + (it.label ? " (" + it.label + ")" : "");
      if (!it.id) galat.push(n + ": ID kosong.");
      else if (ids[it.id]) galat.push(n + ": ID “" + it.id + "” dipakai dua kali."); else ids[it.id] = 1;
      if (!it.label) galat.push(n + ": nama kosong.");
      if (typeof it.value !== "number" || isNaN(it.value)) galat.push(n + ": nilai bukan angka.");
    });
    ((d.teks && d.teks.hero && d.teks.hero.mini) || []).forEach(function (id) { if (!ids[id]) galat.push("Panel hero merujuk ID indikator “" + id + "” yang tidak ada."); });
    ["kemiskinan", "pdrbTriwulan", "pdrbTahun", "ipm"].forEach(function (k) {
      var o = d[k]; if (!o || !Array.isArray(o.label)) { galat.push("Bagian " + k + " tidak lengkap."); return; }
      Object.keys(o).forEach(function (s) {
        if (Array.isArray(o[s]) && s !== "label" && s !== "komponen" && o[s].length !== o.label.length) galat.push("Bagian " + k + ": deret " + s + " tidak sepanjang label.");
      });
      if (o.label.some(function (l) { return !String(l).trim(); })) galat.push("Bagian " + k + ": ada label tahun/triwulan yang kosong.");
    });
    if (!d.periode || !Object.keys(d.periode).length) galat.push("Periode data kosong.");
    if (!(d.wilayah || []).some(function (w) { return w.home; })) galat.push("Kartogram: belum ada wilayah yang ditandai “Kukar”.");
    return galat;
  }

  /* -------------------------------------------------------------- aksi */
  function pakai(data, sumber) {
    KERJA = klon(data); ASLI = klon(data);
    if (!BAGIAN_AKTIF) BAGIAN_AKTIF = BAGIAN.filter(function (b) { return b.id; })[0];
    bukaBagian(BAGIAN_AKTIF.id);
    tandaiKotor(sumber !== "server");
    if (!SUMBER_API.length && PST.daftarSumberApi) PST.daftarSumberApi().then(function (r) { tandaiOtomatis(r); }).catch(function () {});
  }

  function muat() {
    PST.pesan("indMsg", "info", "Memuat isi dari server…");
    return PST.muatIndikator().then(function (r) {
      INFO = r; gambarStatus();
      if (r && r.data) {
        pakai(r.data, "server"); PST.pesan("indMsg", "", "");
        PST.riwayatIndikator().then(function (rw) {
          if (rw[0] && rw[0].versi === INFO.versi) { INFO.nama_pengubah = rw[0].nama_pengubah; INFO.catatan = rw[0].catatan; gambarStatus(); }
        }).catch(function () {});
        return;
      }
      return PST.muatIndikatorAwal().then(function (awal) {
        pakai(awal, "awal");
        PST.pesan("indMsg", "warn", "Menampilkan isi dari berkas awal situs indikator. Belum ada yang tersimpan di server — periksa lalu tekan Simpan & terbitkan.");
      }).catch(function (e) { PST.pesan("indMsg", "err", e.message); });
    }).catch(function (e) { PST.pesan("indMsg", "err", "Gagal memuat: " + e.message); });
  }

  function simpan() {
    var galat = periksa(KERJA);
    if (galat.length) { PST.pesan("indMsg", "err", "Belum bisa disimpan:\n• " + galat.join("\n• ")); return; }
    var catatan = el("indCatatan").value.trim();
    el("indSimpan").disabled = true;
    PST.pesan("indMsg", "info", "Menyimpan…");
    PST.simpanIndikator(KERJA, catatan).then(function (r) {
      ASLI = klon(KERJA);
      INFO = Object.assign({}, INFO || {}, r, { catatan: catatan || null });
      PST.sesi().then(function (s) { INFO.nama_pengubah = s && s.profil ? s.profil.nama : null; gambarStatus(); });
      gambarStatus(); tandaiKotor(false);
      el("indCatatan").value = "";
      try { localStorage.removeItem("pintar.indikator.draf"); localStorage.removeItem("pintar.indikator.cache"); } catch (e) {}
      PST.pesan("indMsg", "ok", "Tersimpan sebagai versi " + r.versi + ". Situs indikator sudah menampilkan isi ini (muat ulang halamannya bila sedang terbuka).");
    }).catch(function (e) { PST.pesan("indMsg", "err", "Gagal menyimpan: " + e.message); el("indSimpan").disabled = false; });
  }

  function pratinjau() {
    try { localStorage.setItem("pintar.indikator.draf", JSON.stringify({ data: KERJA, versi: "draf", disimpan: new Date().toISOString() })); }
    catch (e) { PST.pesan("indMsg", "err", "Peramban menolak menyimpan draf pratinjau."); return; }
    window.open(PST.TAUTAN.indikator + "?pratinjau=1", "_blank");
  }

  function gambarRiwayat() {
    var w = el("indRiwayat");
    w.hidden = false; w.innerHTML = '<div class="empty" style="padding:14px">Memuat riwayat…</div>';
    PST.riwayatIndikator().then(function (r) {
      if (!r.length) { w.innerHTML = '<div class="empty" style="padding:14px">Belum ada versi tersimpan.</div>'; return; }
      w.innerHTML = '<div class="card__title">Riwayat versi</div>' + r.map(function (v) {
        return '<div class="ind-riw"><b>v' + esc(v.versi) + "</b><span>" + esc(PST.tgl(v.diubah_pada, true)) + (v.nama_pengubah ? " · " + esc(v.nama_pengubah) : "") +
          (v.catatan ? "<br><i>" + esc(v.catatan) + "</i>" : "") + "</span>" +
          '<button type="button" class="btn btn--ghost btn--sm" data-pulih="' + esc(v.id) + '" data-v="' + esc(v.versi) + '">Pulihkan</button></div>';
      }).join("") + '<div class="btnrow" style="margin-top:10px"><button type="button" class="btn btn--ghost btn--sm" id="indTutupRiwayat">Tutup</button></div>';
      PST.qa("[data-pulih]", w).forEach(function (b) {
        b.onclick = function () {
          if (!confirm("Muat isi versi " + b.dataset.v + " ke penyunting? Belum terbit sebelum Anda menekan Simpan.")) return;
          PST.bacaRiwayatIndikator(b.dataset.pulih).then(function (x) {
            pakai(x.data, "riwayat"); el("indCatatan").value = "Pulihkan versi " + b.dataset.v;
            PST.pesan("indMsg", "warn", "Isi versi " + b.dataset.v + " sudah dimuat ke penyunting. Tekan Simpan & terbitkan untuk menerbitkannya kembali.");
            w.hidden = true;
          }).catch(function (e) { PST.pesan("indMsg", "err", e.message); });
        };
      });
      el("indTutupRiwayat").onclick = function () { w.hidden = true; };
    }).catch(function (e) { w.innerHTML = '<div class="msg msg--err">' + esc(e.message) + "</div>"; });
  }

  function unduh() {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(KERJA, null, 2)], { type: "application/json" }));
    a.download = "indikator-kukar-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click(); URL.revokeObjectURL(a.href);
  }
  function unggah(file) {
    var r = new FileReader();
    r.onload = function () {
      try {
        var d = JSON.parse(r.result);
        var galat = periksa(d);
        if (galat.length) { PST.pesan("indMsg", "err", "Berkas tidak diterima:\n• " + galat.join("\n• ")); return; }
        pakai(d, "berkas"); PST.pesan("indMsg", "warn", "Isi berkas sudah dimuat ke penyunting. Periksa, lalu Simpan & terbitkan.");
      } catch (e) { PST.pesan("indMsg", "err", "Berkas bukan JSON yang sah."); }
    };
    r.readAsText(file);
  }

  /* -------------------------------------------------------------- pasang */
  function pasangSub() {
    PST.qa(".ind-sub button").forEach(function (b) {
      b.onclick = function () {
        PST.qa(".ind-sub button").forEach(function (x) { x.setAttribute("aria-selected", String(x === b)); });
        el("subPenyunting").hidden = b.dataset.sub !== "penyunting";
        el("subOtomatis").hidden = b.dataset.sub !== "otomatis";
        if (b.dataset.sub === "otomatis" && window.SUMBER_OTOMATIS) PST.sesi().then(function (s) { window.SUMBER_OTOMATIS.mulai(KERJA, s); });
      };
    });
  }
  function muatUlang() {
    if (KOTOR && !confirm("Ada perubahan belum disimpan di penyunting. Muat ulang isi terbaru dari server dan buang perubahan itu?")) return;
    muat();
  }

  function mulai() {
    if (el("indNav").dataset.siap) return;
    el("indNav").dataset.siap = "1";
    gambarNav(); pasangSub();
    el("indSimpan").onclick = simpan;
    el("indPratinjau").onclick = function () { if (KERJA) pratinjau(); };
    el("indRiwayatBtn").onclick = gambarRiwayat;
    el("indUnduh").onclick = function () { if (KERJA) unduh(); };
    el("indUnggah").onchange = function () { if (this.files[0]) unggah(this.files[0]); this.value = ""; };
    el("indAwal").onclick = function () {
      if (KOTOR && !confirm("Perubahan yang belum disimpan akan diganti isi berkas awal. Lanjutkan?")) return;
      PST.muatIndikatorAwal().then(function (awal) { pakai(awal, "awal"); PST.pesan("indMsg", "warn", "Isi berkas awal dimuat. Periksa, lalu Simpan & terbitkan."); })
        .catch(function (e) { PST.pesan("indMsg", "err", e.message); });
    };
    el("indBatal").onclick = function () {
      if (!ASLI) return;
      if (!confirm("Buang semua perubahan yang belum disimpan?")) return;
      KERJA = klon(ASLI); tandaiKotor(false); bukaBagian(BAGIAN_AKTIF.id);
    };
    muat();
  }

  window.INDIKATOR_ADMIN = { mulai: mulai, muatUlang: muatUlang, tandaiOtomatis: tandaiOtomatis };
})();
