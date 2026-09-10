/* ============================================================================
   Ruang Pegawai → tab "Pertanyaan asisten" (perbaikan-07).
   Membaca asisten_log (tanpa identitas), mengelompokkan pertanyaan yang sama,
   menyorot yang belum terjawab / dinilai 👎, dan menandai yang sudah ditangani.
   ========================================================================== */
(function () {
  "use strict";
  var esc = PST.esc, el = PST.el;
  var DATA = [], SUDAH = false;
  var LABEL = { indikator: "angka", banding: "banding", tren: "tren", kecamatan: "kecamatan", glosarium: "glosarium", pengetahuan: "jawaban baku",
                katalog: "katalog", terbitan: "terbitan", tiket: "tiket", sapa: "sapaan", kosong: "tak terjawab",
                swalayan: "terlayani otomatis", "tiket-baru": "jadi tiket" };

  function normal(t) { return String(t || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim(); }
  function batasHari() { var h = +el("asHari").value; return h ? Date.now() - h * 864e5 : 0; }

  function kelompok(rows) {
    var g = {};
    rows.forEach(function (r) {
      var k = normal(r.pertanyaan);
      if (!g[k]) g[k] = { kunci: k, teks: r.pertanyaan, n: 0, gagal: 0, buruk: 0, baik: 0, ditangani: 0, ids: [], terakhir: r.waktu, jenis: {} };
      var x = g[k]; x.n++; x.ids.push(r.id);
      if (r.jenis === "kosong") x.gagal++;
      if (r.nilai === -1) x.buruk++; if (r.nilai === 1) x.baik++;
      if (r.ditangani) x.ditangani++;
      x.jenis[r.jenis || "-"] = (x.jenis[r.jenis || "-"] || 0) + 1;
      if (r.waktu > x.terakhir) { x.terakhir = r.waktu; x.teks = r.pertanyaan; }
    });
    return Object.keys(g).map(function (k) { return g[k]; });
  }
  function jenisUtama(x) { return Object.keys(x.jenis).sort(function (a, b) { return x.jenis[b] - x.jenis[a]; })[0]; }

  function gambar() {
    var batas = batasHari(), rows = DATA.filter(function (r) { return !batas || new Date(r.waktu).getTime() >= batas; });
    var total = rows.length, gagal = rows.filter(function (r) { return r.jenis === "kosong"; }).length;
    var dinilai = rows.filter(function (r) { return r.nilai; }).length, baik = rows.filter(function (r) { return r.nilai === 1; }).length;
    var sesi = {}; rows.forEach(function (r) { if (r.sesi) sesi[r.sesi] = 1; });
    var mandiri = rows.filter(function (r) { return r.jenis === "swalayan"; }).length;
    var jadiTiket = rows.filter(function (r) { return r.jenis === "tiket-baru"; }).length;
    var permintaan = mandiri + jadiTiket;
    el("asRingkas").innerHTML =
      "<div><div class=\"n\">" + total + "</div><div class=\"l\">pertanyaan · " + Object.keys(sesi).length + " sesi obrolan</div></div>" +
      "<div><div class=\"n ada\">" + (total ? Math.round((total - gagal) / total * 100) : 0) + "%</div><div class=\"l\">terjawab (bukan “belum menemukan”)</div></div>" +
      "<div><div class=\"n mohon\">" + gagal + "</div><div class=\"l\">belum terjawab</div></div>" +
      "<div><div class=\"n ada\">" + mandiri + "</div><div class=\"l\">permintaan terlayani otomatis" + (permintaan ? " (" + Math.round(mandiri / permintaan * 100) + "% dari " + permintaan + ")" : "") + "</div></div>" +
      "<div><div class=\"n prov\">" + (dinilai ? Math.round(baik / dinilai * 100) + "%" : "—") + "</div><div class=\"l\">👍 dari " + dinilai + " penilaian</div></div>";

    var saring = el("asSaring").value, grup = kelompok(rows);
    if (saring === "swalayan") grup = grup.filter(function (x) { return jenisUtama(x) === "swalayan" || jenisUtama(x) === "tiket-baru"; });
    else if (saring === "gagal") grup = grup.filter(function (x) { return x.gagal && x.ditangani < x.n; });
    else if (saring === "buruk") grup = grup.filter(function (x) { return x.buruk && x.ditangani < x.n; });
    else if (saring === "ditangani") grup = grup.filter(function (x) { return x.ditangani; });
    else if (saring === "sering") grup = grup.filter(function (x) { return x.n >= 2; });
    grup.sort(function (a, b) { return saring === "semua" ? (b.terakhir > a.terakhir ? 1 : -1) : (b.n - a.n) || (b.terakhir > a.terakhir ? 1 : -1); });
    grup = grup.slice(0, 200);
    if (!grup.length) { el("asDaftar").innerHTML = '<div class="empty" style="border:1px solid var(--line);background:var(--panel)">' + (total ? "Tidak ada pertanyaan untuk saringan ini." : "Belum ada pertanyaan tercatat pada rentang ini.") + "</div>"; return; }
    el("asDaftar").innerHTML = grup.map(function (x) {
      var j = jenisUtama(x), selesai = x.ditangani >= x.n;
      return '<div class="as' + (selesai ? " is-selesai" : "") + '" data-k="' + esc(x.kunci) + '">' +
        '<div class="as__n">' + x.n + "<small>kali</small></div><div>" +
        '<div class="as__t"><span class="as__jenis' + (j === "kosong" ? " kosong" : j === "swalayan" ? " swalayan" : x.buruk ? " buruk" : "") + '">' + esc(LABEL[j] || j) + "</span>" + esc(x.teks) + "</div>" +
        '<div class="as__m">terakhir ' + esc(PST.sejak(x.terakhir)) + (x.baik || x.buruk ? " · 👍 " + x.baik + " 👎 " + x.buruk : "") + (x.gagal && x.gagal < x.n ? " · " + x.gagal + "× tak terjawab" : "") + (selesai ? " · sudah ditangani" : "") + "</div>" +
        '<div class="as__aksi"><button type="button" data-tanya="' + esc(x.teks) + '">Coba di asisten</button>' +
        (selesai ? '<button type="button" data-buka="1">Buka lagi</button>' : '<button type="button" data-tangani="1">Tandai ditangani</button>') + "</div>" +
        "</div></div>";
    }).join("");
  }

  function muat() {
    PST.pesan("msgAsisten", "info", "Memuat…");
    return PST.daftarLogAsisten({ limit: 3000 }).then(function (rows) {
      DATA = rows || []; PST.pesan("msgAsisten", "", ""); gambar();
    }).catch(function (e) {
      var pesan = /asisten_log|does not exist|permission/i.test(e.message)
        ? "Tabel catatan asisten belum ada. Jalankan <span class='kode'>supabase/perbaikan-07.sql</span> di SQL Editor." : "Gagal memuat: " + esc(e.message);
      el("msgAsisten").innerHTML = '<div class="msg msg--warn">' + pesan + "</div>";
    });
  }

  function mulai() {
    if (SUDAH) { muat(); return; }
    SUDAH = true;
    el("asSaring").onchange = gambar; el("asHari").onchange = gambar; el("asMuat").onclick = muat;
    el("asDaftar").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var w = b.closest(".as"), k = w && w.dataset.k;
      if (b.dataset.tanya !== undefined) return;   /* ditangani chat.js (data-tanya) */
      var g = kelompok(DATA).filter(function (x) { return x.kunci === k; })[0]; if (!g) return;
      var ya = !!b.dataset.tangani;
      PST.ubahLogAsisten(g.ids, { ditangani: ya }).then(function () {
        DATA.forEach(function (r) { if (g.ids.indexOf(r.id) !== -1) r.ditangani = ya; });
        gambar();
      }).catch(function (er) { PST.pesan("msgAsisten", "err", er.message); });
    });
    muat();
  }
  window.ASISTEN_ADMIN = { mulai: mulai, muat: muat };
})();
