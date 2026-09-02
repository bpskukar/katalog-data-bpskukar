/* ============================================================================
   Lapisan data & pembantu antarmuka bersama.
   Dua tulang punggung:
     - Supabase  : dipakai bila assets/config.js sudah diisi. Data nyata,
                   lintas-pegawai, aman lewat Row Level Security.
     - Demo      : cadangan otomatis bila belum diisi. Data hanya di peramban
                   ini. Berguna untuk memperagakan alur sebelum server disiapkan.
   ========================================================================== */
window.PST = (function () {
  "use strict";

  var K = window.KONFIG, B = window.BAKU;
  var sb = null, DEMO = true, GAGAL_MUAT = false;

  if (K.SUPABASE_URL && K.SUPABASE_ANON_KEY) {
    if (!window.supabase) {
      /* Pustaka Supabase tidak termuat — biasanya cdn.jsdelivr.net diblokir
         jaringan kantor. Jangan diam-diam beralih ke mode demo: petugas akan
         mengira catatannya tersimpan padahal hanya ada di peramban sendiri. */
      GAGAL_MUAT = true;
    } else {
      try { sb = window.supabase.createClient(K.SUPABASE_URL, K.SUPABASE_ANON_KEY); DEMO = false; }
      catch (e) { GAGAL_MUAT = true; }
    }
  }

  /* ---------------------------------------------------------------- utilitas */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }
  function el(id) { return document.getElementById(id); }
  function q(sel, root) { return (root || document).querySelector(sel); }
  function qa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  var BULAN = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  function tgl(iso, jam) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d)) return "—";
    var s = d.getDate() + " " + BULAN[d.getMonth()] + " " + d.getFullYear();
    if (jam) s += ", " + String(d.getHours()).padStart(2,"0") + "." + String(d.getMinutes()).padStart(2,"0");
    return s;
  }
  function sejak(iso) {
    var d = (Date.now() - new Date(iso)) / 1000;
    if (d < 60) return "baru saja";
    if (d < 3600) return Math.floor(d/60) + " menit lalu";
    if (d < 86400) return Math.floor(d/3600) + " jam lalu";
    if (d < 2592000) return Math.floor(d/86400) + " hari lalu";
    return tgl(iso);
  }
  function pesan(target, jenis, teks) {
    var n = typeof target === "string" ? el(target) : target;
    if (!n) return;
    if (!teks) { n.innerHTML = ""; return; }
    n.innerHTML = '<div class="msg msg--' + jenis + '">' + esc(teks) + "</div>";
  }
  function opsi(arr, terpilih) {
    return arr.map(function (v) {
      return '<option value="' + esc(v) + '"' + (v === terpilih ? " selected" : "") + ">" + esc(v) + "</option>";
    }).join("");
  }
  function centang(nama, arr, terpilih) {
    terpilih = terpilih || [];
    return arr.map(function (v) {
      return '<label><input type="checkbox" name="' + nama + '" value="' + esc(v) + '"' +
             (terpilih.indexOf(v) !== -1 ? " checked" : "") + "> " + esc(v) + "</label>";
    }).join("");
  }
  function nilaiCentang(nama, root) {
    return qa('input[name="' + nama + '"]:checked', root).map(function (i) { return i.value; });
  }

  /* --------------------------------------------------------- penyimpan demo */
  function LS(k, def) {
    try { var v = JSON.parse(localStorage.getItem("pstkukar." + k)); return v == null ? def : v; }
    catch (e) { return def; }
  }
  function SV(k, v) { try { localStorage.setItem("pstkukar." + k, JSON.stringify(v)); } catch (e) {} }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  function benihDemo() {
    if (LS("benih")) return;
    SV("pegawai", [
      { id:"p1", email:"admin@bps.go.id",  sandi:"demo1234", nama:"Admin PST",        nip:"1990",  jabatan:"Statistisi Ahli",  peran:"admin",   aktif:true },
      { id:"p2", email:"rafi@bps.go.id",   sandi:"demo1234", nama:"Rafi",             nip:"1991",  jabatan:"Statistisi",       peran:"pegawai", aktif:true },
      { id:"p3", email:"petugas@bps.go.id",sandi:"demo1234", nama:"Petugas Piket",    nip:"1992",  jabatan:"Pranata Komputer", peran:"pegawai", aktif:true }
    ]);
    SV("sahabat", []); SV("kunjungan", []); SV("pertanyaan", []);
    SV("jawaban", []); SV("poin", []); SV("nomor", 0);
    SV("benih", true);
  }
  if (DEMO) benihDemo();

  function kodeTiket(n) {
    var d = new Date();
    return "PST-" + String(d.getFullYear()).slice(2) + String(d.getMonth()+1).padStart(2,"0") +
           "-" + String(n).padStart(4, "0");
  }

  /* -------------------------------------------------------------- autentikasi */
  var sesiKini = null;

  function masuk(email, sandi) {
    if (DEMO) {
      var p = LS("pegawai", []).filter(function (x) {
        return x.email.toLowerCase() === email.toLowerCase() && x.sandi === sandi && x.aktif;
      })[0];
      if (!p) {
        var s = LS("sahabat", []).filter(function (x) {
          return x.email.toLowerCase() === email.toLowerCase() && x.sandi === sandi;
        })[0];
        if (!s) return Promise.reject(new Error("Surel atau kata sandi tidak cocok."));
        SV("sesi", { id:s.id, jenis:"sahabat" });
        return Promise.resolve();
      }
      SV("sesi", { id:p.id, jenis:"pegawai" });
      return Promise.resolve();
    }
    return sb.auth.signInWithPassword({ email:email, password:sandi }).then(function (r) {
      if (r.error) throw new Error(terjemah(r.error.message));
      sesiKini = null;
    });
  }

  function daftarSahabat(d) {
    if (DEMO) {
      var arr = LS("sahabat", []);
      if (arr.some(function (x) { return x.email.toLowerCase() === d.email.toLowerCase(); }))
        return Promise.reject(new Error("Surel itu sudah terdaftar."));
      var s = { id:uid(), email:d.email, sandi:d.sandi, nama:d.nama, no_hp:d.no_hp,
                kategori_instansi:d.kategori_instansi, nama_instansi:d.nama_instansi, dibuat:new Date().toISOString() };
      arr.push(s); SV("sahabat", arr); SV("sesi", { id:s.id, jenis:"sahabat" });
      return Promise.resolve();
    }
    return sb.auth.signUp({
      email: d.email, password: d.sandi,
      options: { data: { nama:d.nama, no_hp:d.no_hp, kategori_instansi:d.kategori_instansi, nama_instansi:d.nama_instansi, peran:"sahabat" } }
    }).then(function (r) {
      if (r.error) throw new Error(terjemah(r.error.message));
      return r;
    });
  }

  function keluar() {
    sesiKini = null;
    if (DEMO) { SV("sesi", null); return Promise.resolve(); }
    return sb.auth.signOut();
  }

  function sesi() {
    if (sesiKini) return Promise.resolve(sesiKini);
    if (DEMO) {
      var s = LS("sesi", null);
      if (!s) return Promise.resolve(null);
      var rec = LS(s.jenis === "pegawai" ? "pegawai" : "sahabat", []).filter(function (x) { return x.id === s.id; })[0];
      if (!rec) return Promise.resolve(null);
      sesiKini = { id:rec.id, email:rec.email, jenis:s.jenis, profil:rec };
      return Promise.resolve(sesiKini);
    }
    return sb.auth.getUser().then(function (r) {
      var u = r && r.data && r.data.user;
      if (!u) return null;
      return sb.from("pegawai").select("*").eq("id", u.id).maybeSingle().then(function (rp) {
        if (rp.data) { sesiKini = { id:u.id, email:u.email, jenis:"pegawai", profil:rp.data }; return sesiKini; }
        return sb.from("sahabat").select("*").eq("id", u.id).maybeSingle().then(function (rs) {
          sesiKini = { id:u.id, email:u.email, jenis:"sahabat", profil: rs.data || { nama: u.email } };
          return sesiKini;
        });
      });
    }).catch(function () { return null; });
  }

  function terjemah(m) {
    m = String(m || "");
    if (/Invalid login/i.test(m)) return "Surel atau kata sandi tidak cocok.";
    if (/already registered|User already/i.test(m)) return "Surel itu sudah terdaftar.";
    if (/Password should be/i.test(m)) return "Kata sandi minimal 6 karakter.";
    if (/Email not confirmed/i.test(m)) return "Surel belum dikonfirmasi. Cek kotak masuk, atau minta admin mematikan konfirmasi surel di Supabase.";
    return m;
  }

  /* --------------------------------------------------------------- poin */
  function catatPoin(pegawaiId, jenis, refId) {
    var b = B.poin[jenis]; if (!b || !pegawaiId) return Promise.resolve();
    if (DEMO) {
      var arr = LS("poin", []);
      arr.push({ id:uid(), pegawai_id:pegawaiId, jenis:jenis, nilai:b.n, ref:refId, dibuat:new Date().toISOString() });
      SV("poin", arr); return Promise.resolve();
    }
    /* Di Supabase poin ditulis otomatis oleh pemicu basis data. */
    return Promise.resolve();
  }

  /* --------------------------------------------------------- buku tamu PST */
  function tambahKunjungan(d) {
    if (DEMO) {
      var n = LS("nomor", 0) + 1; SV("nomor", n);
      var arr = LS("kunjungan", []);
      var row = Object.assign({}, d, {
        id: uid(), kode_tiket: kodeTiket(n), dibuat: new Date().toISOString(),
        status: d.status || "selesai"
      });
      arr.unshift(row); SV("kunjungan", arr);
      catatPoin(d.petugas_id, "catat", row.id);
      return Promise.resolve(row);
    }
    return sb.from("kunjungan").insert(d).select().single().then(function (r) {
      if (r.error) throw new Error(r.error.message);
      return r.data;
    });
  }

  function daftarKunjungan(opt) {
    opt = opt || {};
    if (DEMO) {
      var arr = LS("kunjungan", []).slice();
      if (opt.status) arr = arr.filter(function (x) { return x.status === opt.status; });
      if (opt.sahabat_id) arr = arr.filter(function (x) { return x.sahabat_id === opt.sahabat_id; });
      return Promise.resolve(arr.slice(0, opt.limit || 2000));
    }
    var qy = sb.from("kunjungan").select("*").order("dibuat", { ascending: false }).limit(opt.limit || 2000);
    if (opt.status) qy = qy.eq("status", opt.status);
    if (opt.sahabat_id) qy = qy.eq("sahabat_id", opt.sahabat_id);
    return qy.then(function (r) { if (r.error) throw new Error(r.error.message); return r.data || []; });
  }

  function ubahKunjungan(id, patch, olehId) {
    if (DEMO) {
      var arr = LS("kunjungan", []);
      var i = arr.findIndex(function (x) { return x.id === id; });
      if (i < 0) return Promise.reject(new Error("Tiket tidak ditemukan."));
      var sblm = arr[i].status;
      arr[i] = Object.assign({}, arr[i], patch);
      SV("kunjungan", arr);
      if (patch.status === "selesai" && sblm !== "selesai") catatPoin(olehId, "tuntas", id);
      return Promise.resolve(arr[i]);
    }
    return sb.from("kunjungan").update(patch).eq("id", id).select().single().then(function (r) {
      if (r.error) throw new Error(r.error.message); return r.data;
    });
  }

  /* Cek tiket tanpa perlu akun — dicocokkan dengan 4 digit terakhir nomor HP. */
  function cekTiket(kode, hp4) {
    kode = String(kode || "").trim().toUpperCase();
    if (DEMO) {
      var t = LS("kunjungan", []).filter(function (x) { return x.kode_tiket === kode; })[0];
      if (!t) return Promise.resolve(null);
      if (String(t.no_hp || "").slice(-4) !== String(hp4).slice(-4)) return Promise.resolve(null);
      return Promise.resolve({
        kode_tiket:t.kode_tiket, dibuat:t.dibuat, status:t.status, kebutuhan:t.kebutuhan,
        jenis_layanan:t.jenis_layanan, hasil:t.hasil, tenggat:t.tenggat, nama:t.nama
      });
    }
    return sb.rpc("cek_tiket", { p_kode: kode, p_hp4: String(hp4).slice(-4) })
      .then(function (r) { if (r.error) throw new Error(r.error.message); return (r.data && r.data[0]) || null; });
  }

  /* ------------------------------------------------------- papan tanya-jawab */
  function daftarPertanyaan(opt) {
    opt = opt || {};
    if (DEMO) {
      var arr = LS("pertanyaan", []).slice();
      if (opt.status) arr = arr.filter(function (x) { return x.status === opt.status; });
      var jw = LS("jawaban", []);
      arr.forEach(function (p) { p.n_jawaban = jw.filter(function (j) { return j.pertanyaan_id === p.id; }).length; });
      return Promise.resolve(arr);
    }
    var qy = sb.from("v_pertanyaan").select("*").order("dibuat", { ascending: false }).limit(500);
    if (opt.status) qy = qy.eq("status", opt.status);
    return qy.then(function (r) { if (r.error) throw new Error(r.error.message); return r.data || []; });
  }

  function tambahPertanyaan(d) {
    if (DEMO) {
      var arr = LS("pertanyaan", []);
      var row = Object.assign({}, d, { id:uid(), status:"terbuka", dibuat:new Date().toISOString() });
      arr.unshift(row); SV("pertanyaan", arr);
      catatPoin(d.penanya_id, "tanya", row.id);
      return Promise.resolve(row);
    }
    return sb.from("pertanyaan").insert(d).select().single().then(function (r) {
      if (r.error) throw new Error(r.error.message); return r.data;
    });
  }

  function daftarJawaban(pid) {
    if (DEMO) {
      var peg = LS("pegawai", []);
      return Promise.resolve(LS("jawaban", []).filter(function (j) { return j.pertanyaan_id === pid; })
        .map(function (j) {
          var p = peg.filter(function (x) { return x.id === j.penjawab_id; })[0];
          return Object.assign({}, j, { penjawab_nama: p ? p.nama : "—" });
        })
        .sort(function (a, b) { return (b.terbaik?1:0)-(a.terbaik?1:0) || new Date(a.dibuat)-new Date(b.dibuat); }));
    }
    return sb.from("v_jawaban").select("*").eq("pertanyaan_id", pid)
      .order("terbaik", { ascending:false }).order("dibuat", { ascending:true })
      .then(function (r) { if (r.error) throw new Error(r.error.message); return r.data || []; });
  }

  function tambahJawaban(d) {
    if (DEMO) {
      var arr = LS("jawaban", []);
      var row = Object.assign({}, d, { id:uid(), terbaik:false, dibuat:new Date().toISOString() });
      arr.push(row); SV("jawaban", arr);
      catatPoin(d.penjawab_id, "jawab", row.id);
      return Promise.resolve(row);
    }
    return sb.from("jawaban").insert(d).select().single().then(function (r) {
      if (r.error) throw new Error(r.error.message); return r.data;
    });
  }

  function tandaiTerbaik(jawabanId, pertanyaanId) {
    if (DEMO) {
      var jw = LS("jawaban", []);
      jw.forEach(function (j) { if (j.pertanyaan_id === pertanyaanId) j.terbaik = (j.id === jawabanId); });
      SV("jawaban", jw);
      var pt = LS("pertanyaan", []);
      pt.forEach(function (p) { if (p.id === pertanyaanId) { p.status = "terjawab"; p.jawaban_terbaik = jawabanId; } });
      SV("pertanyaan", pt);
      var jr = jw.filter(function (j) { return j.id === jawabanId; })[0];
      if (jr) catatPoin(jr.penjawab_id, "terbaik", jawabanId);
      return Promise.resolve();
    }
    return sb.rpc("tandai_terbaik", { p_jawaban: jawabanId }).then(function (r) {
      if (r.error) throw new Error(r.error.message);
    });
  }

  function tutupPertanyaan(id) {
    if (DEMO) {
      var pt = LS("pertanyaan", []);
      pt.forEach(function (p) { if (p.id === id) p.status = "ditutup"; });
      SV("pertanyaan", pt); return Promise.resolve();
    }
    return sb.from("pertanyaan").update({ status:"ditutup" }).eq("id", id)
      .then(function (r) { if (r.error) throw new Error(r.error.message); });
  }

  /* ------------------------------------------------------------ peringkat */
  function papanPeringkat() {
    if (DEMO) {
      var peg = LS("pegawai", []), pn = LS("poin", []);
      var m = {};
      pn.forEach(function (x) {
        m[x.pegawai_id] = m[x.pegawai_id] || { poin:0, rinci:{} };
        m[x.pegawai_id].poin += x.nilai;
        m[x.pegawai_id].rinci[x.jenis] = (m[x.pegawai_id].rinci[x.jenis] || 0) + 1;
      });
      return Promise.resolve(peg.filter(function(p){return p.aktif;}).map(function (p) {
        var d = m[p.id] || { poin:0, rinci:{} };
        return { pegawai_id:p.id, nama:p.nama, jabatan:p.jabatan, poin:d.poin,
                 n_catat:d.rinci.catat||0, n_jawab:d.rinci.jawab||0,
                 n_terbaik:d.rinci.terbaik||0, n_tuntas:d.rinci.tuntas||0 };
      }).sort(function (a, b) { return b.poin - a.poin; }));
    }
    return sb.from("v_peringkat").select("*").order("poin", { ascending:false })
      .then(function (r) { if (r.error) throw new Error(r.error.message); return r.data || []; });
  }

  function daftarPegawai() {
    if (DEMO) return Promise.resolve(LS("pegawai", []));
    return sb.from("pegawai").select("*").order("nama")
      .then(function (r) { if (r.error) throw new Error(r.error.message); return r.data || []; });
  }

  /* ---------------------------------------------------------------- navigasi */
  function nav(aktif, s) {
    var kanan = "";
    if (s) {
      kanan = '<span class="nav__who">' + esc(s.profil && s.profil.nama ? s.profil.nama : s.email) +
              (s.jenis === "pegawai" ? "" : " · sahabat data") + '</span>' +
              '<button class="btn btn--ghost btn--sm" id="btnKeluar">Keluar</button>';
    }
    var t = [
      ["index.html",  "Katalog data"],
      ["admin.html",  "Ruang pegawai"],
      ["sahabat.html","Sahabat data"]
    ].map(function (x) {
      return '<a href="' + x[0] + '"' + (x[0] === aktif ? ' aria-current="page"' : "") + ">" + x[1] + "</a>";
    }).join("");
    return '<nav class="nav"><div class="nav__in"><span class="nav__brand">BPS Kukar · PST</span>' +
           t + '<span class="nav__right">' + kanan + "</span></div></nav>";
  }

  function pasangKeluar() {
    var b = el("btnKeluar");
    if (b) b.onclick = function () { keluar().then(function () { location.reload(); }); };
  }

  function spandukDemo() {
    if (GAGAL_MUAT) {
      return '<div class="msg msg--err" style="margin:0;border-radius:0;padding:11px 22px;font-size:13px">' +
        '<b>Tidak tersambung ke basis data.</b> Pustaka Supabase gagal dimuat dari cdn.jsdelivr.net — ' +
        'biasanya karena jaringan kantor memblokirnya. Catatan yang dibuat sekarang <b>tidak akan tersimpan</b>. ' +
        'Muat ulang halaman, atau unduh berkas pustakanya dan letakkan di folder assets/ (lihat PANDUAN-PASANG.md).</div>';
    }
    if (!DEMO) return "";
    return '<div class="msg msg--warn" style="margin:0;border-left:0;border-right:0;border-top:0;border-radius:0;padding:9px 22px;font-size:12.5px">' +
      '<b>Mode demo.</b> assets/config.js belum diisi, jadi semua catatan hanya tersimpan di peramban ini dan tidak terlihat pegawai lain. ' +
      'Masuk sebagai <span class="kode">admin@bps.go.id</span> / <span class="kode">demo1234</span> untuk mencoba. ' +
      'Lihat PANDUAN-PASANG.md untuk menyambungkannya ke Supabase.</div>';
  }

  return {
    DEMO: DEMO, GAGAL_MUAT: GAGAL_MUAT, sb: sb,
    esc:esc, el:el, q:q, qa:qa, tgl:tgl, sejak:sejak, pesan:pesan,
    opsi:opsi, centang:centang, nilaiCentang:nilaiCentang, uid:uid,
    masuk:masuk, keluar:keluar, sesi:sesi, daftarSahabat:daftarSahabat,
    tambahKunjungan:tambahKunjungan, daftarKunjungan:daftarKunjungan,
    ubahKunjungan:ubahKunjungan, cekTiket:cekTiket,
    daftarPertanyaan:daftarPertanyaan, tambahPertanyaan:tambahPertanyaan,
    daftarJawaban:daftarJawaban, tambahJawaban:tambahJawaban,
    tandaiTerbaik:tandaiTerbaik, tutupPertanyaan:tutupPertanyaan,
    papanPeringkat:papanPeringkat, daftarPegawai:daftarPegawai,
    nav:nav, pasangKeluar:pasangKeluar, spandukDemo:spandukDemo
  };
})();
