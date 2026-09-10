/* ============================================================================
   Ruang Pegawai → Terbitan & agenda: daftar terbit baru (BRS, publikasi,
   infografis, berita) dan agenda rilis mendatang yang tampil di beranda PINTAR.
   Baris dari Web API BPS (sumber 'api') hanya bisa disembunyikan/diberi ringkasan.
   ========================================================================== */
(function () {
  "use strict";
  if (!window.PST) return;
  var esc = PST.esc, el = PST.el;
  var DAFTAR = [], SIAP = false;
  var JENIS = { brs: "BRS", publikasi: "Publikasi", infografis: "Infografis", tabel: "Tabel", berita: "Berita", agenda: "Agenda" };
  var BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  function tglKotak(t) {
    var d = new Date(String(t) + "T00:00:00");
    if (isNaN(d)) return "<b>?</b>";
    return "<b>" + d.getDate() + "</b>" + BULAN[d.getMonth()] + " " + d.getFullYear();
  }
  function muat() {
    return PST.daftarTerbitan().then(function (d) { DAFTAR = d; gambar(); }).catch(function (e) { PST.pesan("msgTerbitanDaftar", "err", e.message); });
  }
  function gambar() {
    var f = el("tbSaring").value, hari = PST.tglWita ? PST.tglWita() : new Date().toISOString().slice(0, 10);
    var d = DAFTAR.filter(function (t) {
      if (f === "agenda") return t.jenis === "agenda";
      if (f === "api") return t.sumber === "api";
      if (f === "manual") return t.sumber !== "api";
      if (f === "sembunyi") return t.aktif === false;
      return true;
    });
    el("tbDaftar").innerHTML = d.length ? d.map(function (t) {
      var lewat = t.jenis === "agenda" && String(t.tanggal) < hari;
      return '<div class="tb' + (t.aktif === false ? " mati" : "") + '" data-id="' + esc(t.id) + '">' +
        '<div class="tb__t">' + tglKotak(t.tanggal) + "</div>" +
        "<div>" +
          '<div class="tb__j"><span class="tb__jenis' + (t.sumber === "api" ? " api" : "") + '">' + esc(JENIS[t.jenis] || t.jenis) + (t.sumber === "api" ? " · API" : "") + "</span>" +
            (t.tautan ? '<a class="lnk" href="' + esc(t.tautan) + '" target="_blank" rel="noopener">' + esc(t.judul) + "</a>" : esc(t.judul)) + "</div>" +
          (t.ringkas ? '<div class="tb__m">' + esc(t.ringkas) + "</div>" : "") +
          '<div class="tb__m">' + (t.aktif === false ? "Disembunyikan dari beranda. " : "") + (lewat ? "Agenda sudah lewat — tidak tampil di beranda. " : "") + "</div>" +
          '<div class="tb__aksi">' +
            '<button type="button" data-aksi="aktif">' + (t.aktif === false ? "Tampilkan" : "Sembunyikan") + "</button>" +
            '<button type="button" data-aksi="ubah">' + (t.sumber === "api" ? "Ringkasan" : "Ubah") + "</button>" +
            (t.sumber !== "api" ? '<button type="button" class="bahaya" data-aksi="hapus">Hapus</button>' : "") +
          "</div>" +
        "</div></div>";
    }).join("") : '<div class="empty">Belum ada. Tambahkan agenda rilis atau tarik dari Web API.</div>';
  }
  function isiForm(t) {
    el("tbId").value = t ? t.id : "";
    el("tbJenis").value = t ? t.jenis : "agenda";
    el("tbTanggal").value = t ? String(t.tanggal).slice(0, 10) : "";
    el("tbJudul").value = t ? t.judul : "";
    el("tbRingkas").value = t && t.ringkas ? t.ringkas : "";
    el("tbTautan").value = t && t.tautan ? t.tautan : "";
    var api = !!(t && t.sumber === "api");
    ["tbJenis", "tbTanggal", "tbJudul", "tbTautan"].forEach(function (i) { el(i).disabled = api; });
    el("tbJudulForm").textContent = t ? (api ? "Ringkasan untuk baris API" : "Ubah terbitan / agenda") : "Tambah terbitan / agenda";
    el("tbBatal").hidden = !t;
  }
  function pasang() {
    el("tbSaring").onchange = gambar;
    el("tbBatal").onclick = function () { isiForm(null); };
    el("formTerbitan").onsubmit = function (e) {
      e.preventDefault();
      var id = el("tbId").value, lama = DAFTAR.filter(function (x) { return String(x.id) === id; })[0];
      var row = lama && lama.sumber === "api"
        ? { id: lama.id, ringkas: el("tbRingkas").value.trim() || null }
        : { jenis: el("tbJenis").value, tanggal: el("tbTanggal").value, judul: el("tbJudul").value.trim(), ringkas: el("tbRingkas").value.trim() || null, tautan: el("tbTautan").value.trim() || null };
      if (lama && lama.sumber !== "api") row.id = lama.id;
      if (!row.id && (!row.judul || !row.tanggal)) { PST.pesan("msgTerbitan", "warn", "Judul dan tanggal wajib diisi."); return; }
      el("tbSimpan").disabled = true;
      PST.simpanTerbitan(row).then(function () { PST.pesan("msgTerbitan", "ok", "Tersimpan — tampil di beranda."); isiForm(null); return muat(); })
        .catch(function (er) { PST.pesan("msgTerbitan", "err", er.message); }).then(function () { el("tbSimpan").disabled = false; });
    };
    el("tbDaftar").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-aksi]"); if (!b) return;
      var id = b.closest(".tb").dataset.id, t = DAFTAR.filter(function (x) { return String(x.id) === id; })[0]; if (!t) return;
      if (b.dataset.aksi === "aktif") PST.simpanTerbitan({ id: t.id, aktif: t.aktif === false }).then(muat).catch(function (er) { PST.pesan("msgTerbitanDaftar", "err", er.message); });
      if (b.dataset.aksi === "ubah") { isiForm(t); el("tbJudul").focus(); }
      if (b.dataset.aksi === "hapus" && confirm("Hapus “" + t.judul + "”?")) PST.hapusTerbitan(t.id).then(muat).catch(function (er) { PST.pesan("msgTerbitanDaftar", "err", er.message); });
    });
    el("tbTarik").onclick = function () {
      var b = el("tbTarik"); b.disabled = true; b.textContent = "Menarik…";
      PST.tarikTerbitan().then(function (r) {
        PST.pesan("msgTerbitanDaftar", r.demo ? "info" : (r.gagal ? "warn" : "ok"),
          r.demo ? "Mode demo: tidak ada Web API sungguhan." : r.baru + " terbitan baru, " + r.sama + " sudah ada" + (r.gagal ? ", " + r.gagal + " jenis gagal (" + (r.rinci || []).filter(function (x) { return x.status === "gagal"; }).map(function (x) { return x.model + ": " + x.pesan; }).join("; ") + ")" : "") + ".");
        return muat();
      }).catch(function (er) { PST.pesan("msgTerbitanDaftar", "err", er.message); }).then(function () { b.disabled = false; b.textContent = "Tarik dari Web API"; });
    };
  }
  function mulai() {
    if (!SIAP) { pasang(); isiForm(null); SIAP = true; }
    muat();
  }
  window.TERBITAN_ADMIN = { mulai: mulai, muat: muat };
})();
