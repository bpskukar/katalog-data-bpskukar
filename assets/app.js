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
  /* Teks apa adanya → HTML aman dengan tautan yang bisa diklik. */
  function linkify(s) {
    return esc(s).replace(/(https?:\/\/[^\s<]+?)([.,;:!?)\]"']*)(?=\s|$|<)/g, function (m, u, ekor) {
      return '<a href="' + u + '" target="_blank" rel="noopener">' + u + "</a>" + ekor;
    }).replace(/\n/g, "<br>");
  }
  /* Tautan WhatsApp tanpa API: buka wa.me dengan pesan tersusun. */
  function waLink(hp, teks) {
    var d = String(hp || "").replace(/\D/g, "");
    if (!d) return "";
    if (d.charAt(0) === "0") d = "62" + d.slice(1);
    return "https://wa.me/" + d + "?text=" + encodeURIComponent(teks);
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
    SV("konsultasi", []); SV("nomorKon", 0);
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
        return x.email.toLowerCase() === email.toLowerCase() && x.sandi === sandi;
      })[0];
      if (p && p.aktif === false) return Promise.reject(new Error("Akun " + p.email + " sudah dinonaktifkan. Hubungi admin PST bila ini keliru."));
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
      if (s.jenis === "pegawai" && rec.aktif === false) return Promise.resolve({ id:rec.id, email:rec.email, jenis:"nonaktif", profil:rec });
      sesiKini = { id:rec.id, email:rec.email, jenis:s.jenis, profil:rec };
      return Promise.resolve(sesiKini);
    }
    return sb.auth.getUser().then(function (r) {
      var u = r && r.data && r.data.user;
      if (!u) return null;
      return sb.from("pegawai").select("*").eq("id", u.id).maybeSingle().then(function (rp) {
        if (rp.data && rp.data.aktif === false) return { id:u.id, email:u.email, jenis:"nonaktif", profil:rp.data };
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
    if (/new row violates row-level security/i.test(m)) return "Anda tidak berwenang melakukan ini.";
    if (/duplicate key.*konsultasi_slot_aktif/i.test(m)) return "Jadwal itu sudah terisi. Pilih waktu lain.";
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
      var peg = LS("pegawai", []);
      var namaPeg = function (id) { var p = peg.filter(function (x) { return x.id === id; })[0]; return p ? p.nama : null; };
      var arr = LS("kunjungan", []).map(function (x) {
        return Object.assign({}, x, { petugas_nama: namaPeg(x.petugas_id), penyelesai_nama: namaPeg(x.diselesaikan_oleh) });
      });
      if (opt.status) arr = arr.filter(function (x) { return x.status === opt.status; });
      if (opt.sahabat_id) arr = arr.filter(function (x) { return x.sahabat_id === opt.sahabat_id; });
      return Promise.resolve(arr.slice(0, opt.limit || 2000));
    }
    var qy = sb.from("v_kunjungan").select("*").order("dibuat", { ascending: false }).limit(opt.limit || 2000);
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
      if (patch.status === "selesai" && sblm !== "selesai") {
        arr[i].selesai_pada = new Date().toISOString();
        arr[i].diselesaikan_oleh = olehId;
        var sudah = LS("poin", []).some(function (p) { return p.jenis === "tuntas" && p.ref === id; });
        var umurJam = (Date.now() - new Date(arr[i].dibuat)) / 36e5;
        if (!sudah && olehId && (olehId !== arr[i].petugas_id || umurJam >= 1)) catatPoin(olehId, "tuntas", id);
      } else if (patch.status && patch.status !== "selesai" && sblm === "selesai") {
        arr[i].selesai_pada = null; arr[i].diselesaikan_oleh = null;
      }
      SV("kunjungan", arr);
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

  /* Permintaan data dari asisten PST, tanpa akun (perbaikan-07). Kode PST-… dikembalikan;
     statusnya dicek dengan kode + 4 digit HP seperti tiket lain. */
  function ajukanPermintaan(d) {
    var hp = String(d.no_hp || "").replace(/\D/g, "");
    if (!d.nama || String(d.nama).trim().length < 2) return Promise.reject(new Error("Nama wajib diisi."));
    if (hp.length < 9 || hp.length > 15) return Promise.reject(new Error("Nomor HP tidak sah."));
    if (!d.kebutuhan || String(d.kebutuhan).trim().length < 8) return Promise.reject(new Error("Tuliskan kebutuhan datanya lebih jelas."));
    if (DEMO) {
      var arr = LS("kunjungan", []);
      var aktif = arr.filter(function (x) { return x.status === "proses" && String(x.no_hp || "").replace(/\D/g, "") === hp; });
      if (aktif.length >= 3) return Promise.reject(new Error("Masih ada tiga permintaan aktif untuk nomor ini. Tunggu sampai salah satunya selesai."));
      var ses = LS("sesi", null), n = LS("nomor", 0) + 1; SV("nomor", n);
      var row = { id: uid(), kode_tiket: kodeTiket(n), dibuat: new Date().toISOString(), petugas_id: null,
        sahabat_id: ses && ses.jenis === "sahabat" ? ses.id : null, nama: String(d.nama).trim(), email: d.email || null, no_hp: hp,
        pemanfaatan: d.pemanfaatan || null, nama_instansi: d.nama_instansi || null, jenis_layanan: ["Konsultasi data statistik"],
        sarana: "Asisten PST (daring)", kebutuhan: String(d.kebutuhan).trim(), status: "proses",
        tenggat: tambahHari(tglWita(), 4) };
      arr.unshift(row); SV("kunjungan", arr);
      return Promise.resolve(row.kode_tiket);
    }
    return sb.rpc("ajukan_permintaan", { p: { nama: d.nama, no_hp: hp, email: d.email || null, kebutuhan: d.kebutuhan,
      pemanfaatan: d.pemanfaatan || null, nama_instansi: d.nama_instansi || null, halaman: d.halaman || null } })
      .then(function (r) { if (r.error) throw new Error(terjemah(r.error.message)); return r.data; });
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
      var pt = LS("pertanyaan", []).filter(function (p) { return p.id === d.pertanyaan_id; })[0];
      if (!pt || pt.penanya_id !== d.penjawab_id) catatPoin(d.penjawab_id, "jawab", row.id);
      return Promise.resolve(row);
    }
    return sb.from("jawaban").insert(d).select().single().then(function (r) {
      if (r.error) throw new Error(r.error.message); return r.data;
    });
  }

  function tandaiTerbaik(jawabanId, pertanyaanId) {
    if (DEMO) {
      var jw = LS("jawaban", []);
      var ses = LS("sesi", null), aku = ses ? ses.id : null;
      var akuPeg = LS("pegawai", []).filter(function (p) { return p.id === aku; })[0];
      var jr0 = jw.filter(function (j) { return j.id === jawabanId; })[0];
      var pt0 = LS("pertanyaan", []).filter(function (p) { return p.id === pertanyaanId; })[0];
      if (!jr0 || !pt0) return Promise.reject(new Error("Jawaban tidak ditemukan."));
      if (jr0.penjawab_id === aku) return Promise.reject(new Error("Jawaban sendiri tidak boleh ditandai paling membantu."));
      if (pt0.penanya_id !== aku && !(akuPeg && akuPeg.peran === "admin"))
        return Promise.reject(new Error("Hanya penanya atau admin yang boleh menandai jawaban paling membantu."));
      var sudahTerbaik = LS("poin", []).some(function (p) { return p.jenis === "terbaik" && p.ref === jawabanId; });
      jw.forEach(function (j) { if (j.pertanyaan_id === pertanyaanId) j.terbaik = (j.id === jawabanId); });
      SV("jawaban", jw);
      var pt = LS("pertanyaan", []);
      pt.forEach(function (p) { if (p.id === pertanyaanId) { p.status = "terjawab"; p.jawaban_terbaik = jawabanId; } });
      SV("pertanyaan", pt);
      if (!sudahTerbaik) catatPoin(jr0.penjawab_id, "terbaik", jawabanId);
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

  /* ------------------------------------------------------- konsultasi daring */
  function tglWita() {
    var d = new Date(Date.now() + (8 * 60 + new Date().getTimezoneOffset()) * 60000);
    return d.toISOString().slice(0, 10);
  }
  function tambahHari(iso, n) { var d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function hariKerja(iso) { var w = new Date(iso + "T00:00:00Z").getUTCDay(); return w !== 0 && w !== 6; }

  /* aturan jadwal: dari tabel pengaturan (Supabase) atau config.js (demo) */
  function aturanKonsultasi() {
    var c = B.konsultasi, def = { jam: c.jam.slice(), durasi: c.durasi, minHari: c.minHari, maksHari: c.maksHari };
    if (DEMO) return Promise.resolve(def);
    return sb.rpc("pengaturan_publik").then(function (r) {
      var m = {}; (r.data || []).forEach(function (x) { m[x.kunci] = x.nilai; });
      if (m.konsultasi_jam) def.jam = m.konsultasi_jam.split(",").map(function (x) { return x.trim(); });
      if (m.konsultasi_durasi) def.durasi = +m.konsultasi_durasi;
      if (m.konsultasi_min_hari) def.minHari = +m.konsultasi_min_hari;
      if (m.konsultasi_maks_hari) def.maksHari = +m.konsultasi_maks_hari;
      if (m.situs_url) def.situs = m.situs_url;
      return def;
    }).catch(function () { return def; });
  }

  function slotTerpakai(dari, sampai) {
    if (DEMO) {
      return Promise.resolve(LS("konsultasi", []).filter(function (k) {
        return (k.status === "diajukan" || k.status === "dijadwalkan") && k.tanggal >= dari && k.tanggal <= sampai;
      }).map(function (k) { return { tanggal: k.tanggal, jam: k.jam }; }));
    }
    return sb.rpc("slot_terpakai", { p_dari: dari, p_sampai: sampai })
      .then(function (r) { if (r.error) throw new Error(r.error.message); return (r.data || []).map(function (x) { return { tanggal: x.tanggal, jam: String(x.jam).slice(0, 5) }; }); });
  }

  function kodeKon(n) {
    var d = new Date();
    return "KON-" + String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(n).padStart(4, "0");
  }

  /* pengajuan dari sahabat data (tanpa akun pun boleh) */
  function ajukanKonsultasi(d) {
    if (DEMO) {
      return aturanKonsultasi().then(function (a) {
        var hp = String(d.no_hp || "").replace(/\D/g, "");
        if (hp.length < 9) throw new Error("Nomor HP tidak sah.");
        if (!d.nama || !d.kebutuhan) throw new Error("Nama dan kebutuhan wajib diisi.");
        if (!hariKerja(d.tanggal)) throw new Error("Konsultasi hanya pada hari kerja (Senin–Jumat).");
        if (a.jam.indexOf(d.jam) === -1) throw new Error("Jam " + d.jam + " di luar pilihan sesi.");
        var cepat = tambahHari(tglWita(), a.minHari), jauh = tambahHari(tglWita(), a.maksHari);
        if (d.tanggal < cepat) throw new Error("Jadwal paling cepat " + tgl(cepat) + ".");
        if (d.tanggal > jauh) throw new Error("Jadwal paling jauh " + tgl(jauh) + ".");
        var arr = LS("konsultasi", []);
        var aktif = arr.filter(function (k) { return k.status === "diajukan" || k.status === "dijadwalkan"; });
        var ada = aktif.filter(function (k) { return String(k.no_hp).replace(/\D/g, "") === hp; })[0];
        if (ada) throw new Error("Masih ada permintaan konsultasi aktif untuk nomor ini (" + ada.kode + "). Tunggu sampai selesai atau hubungi PST.");
        if (aktif.some(function (k) { return k.tanggal === d.tanggal && k.jam === d.jam; })) throw new Error("Jadwal itu baru saja diambil orang lain. Pilih waktu lain.");
        var n = LS("nomorKon", 0) + 1; SV("nomorKon", n);
        var ses = LS("sesi", null);
        var row = Object.assign({}, d, { id: uid(), kode: kodeKon(n), no_hp: hp, status: "diajukan", durasi_menit: a.durasi,
          sahabat_id: ses && ses.jenis === "sahabat" ? ses.id : null, dibuat: new Date().toISOString(), diubah: new Date().toISOString() });
        arr.unshift(row); SV("konsultasi", arr);
        return row.kode;
      });
    }
    return sb.rpc("ajukan_konsultasi", { p: d }).then(function (r) {
      if (r.error) throw new Error(terjemah(r.error.message)); return r.data;
    });
  }

  function cekKonsultasi(kode, hp4) {
    kode = String(kode || "").trim().toUpperCase();
    if (DEMO) {
      var t = LS("konsultasi", []).filter(function (x) { return x.kode === kode; })[0];
      if (!t || String(t.no_hp).slice(-4) !== String(hp4).slice(-4)) return Promise.resolve(null);
      var peg = LS("pegawai", []).filter(function (p) { return p.id === t.narasumber_id; })[0];
      return Promise.resolve({ kode: t.kode, dibuat: t.dibuat, status: t.status, kebutuhan: t.kebutuhan, topik: t.topik,
        tanggal: t.tanggal, jam: t.jam, durasi_menit: t.durasi_menit, narasumber: peg ? peg.nama : null,
        tautan_zoom: t.status === "dijadwalkan" ? t.tautan_zoom : null, pesan_untuk_sahabat: t.pesan_untuk_sahabat, nama: t.nama });
    }
    return sb.rpc("cek_konsultasi", { p_kode: kode, p_hp4: String(hp4).slice(-4) })
      .then(function (r) { if (r.error) throw new Error(r.error.message); return (r.data && r.data[0]) || null; });
  }

  function daftarKonsultasi(opt) {
    opt = opt || {};
    if (DEMO) {
      var peg = LS("pegawai", []);
      var arr = LS("konsultasi", []).map(function (k) {
        var p = peg.filter(function (x) { return x.id === k.narasumber_id; })[0];
        return Object.assign({}, k, { narasumber_nama: p ? p.nama : null, narasumber_zoom: p ? p.tautan_zoom : null });
      });
      if (opt.status) arr = arr.filter(function (k) { return k.status === opt.status; });
      if (opt.sahabat_id) arr = arr.filter(function (k) { return k.sahabat_id === opt.sahabat_id; });
      return Promise.resolve(arr.sort(function (a, b) { return (a.tanggal + a.jam) < (b.tanggal + b.jam) ? 1 : -1; }));
    }
    var qy = sb.from("v_konsultasi").select("*").order("tanggal", { ascending: false }).order("jam", { ascending: false }).limit(500);
    if (opt.status) qy = qy.eq("status", opt.status);
    if (opt.sahabat_id) qy = qy.eq("sahabat_id", opt.sahabat_id);
    return qy.then(function (r) {
      if (r.error) throw new Error(r.error.message);
      return (r.data || []).map(function (k) { k.jam = String(k.jam).slice(0, 5); return k; });
    });
  }

  function ubahKonsultasi(id, patch) {
    if (DEMO) {
      var arr = LS("konsultasi", []);
      var i = arr.findIndex(function (k) { return k.id === id; });
      if (i < 0) return Promise.reject(new Error("Permintaan tidak ditemukan."));
      var sblm = arr[i].status;
      arr[i] = Object.assign({}, arr[i], patch, { diubah: new Date().toISOString() });
      if (patch.status === "selesai" && sblm !== "selesai" && arr[i].narasumber_id) {
        var sudah = LS("poin", []).some(function (p) { return p.jenis === "konsul" && p.ref === id; });
        if (!sudah) catatPoin(arr[i].narasumber_id, "konsul", id);
      }
      SV("konsultasi", arr); return Promise.resolve(arr[i]);
    }
    return sb.from("konsultasi").update(patch).eq("id", id).select().single()
      .then(function (r) { if (r.error) throw new Error(terjemah(r.error.message)); return r.data; });
  }

  /* pegawai menjadwalkan langsung (mis. sahabat data menelepon) */
  function tambahKonsultasiPetugas(d) {
    if (DEMO) {
      return aturanKonsultasi().then(function (a) {
        var n = LS("nomorKon", 0) + 1; SV("nomorKon", n);
        var arr = LS("konsultasi", []);
        var row = Object.assign({ status: "diajukan" }, d, { id: uid(), kode: kodeKon(n), durasi_menit: a.durasi, dibuat: new Date().toISOString(), diubah: new Date().toISOString() });
        arr.unshift(row); SV("konsultasi", arr); return row;
      });
    }
    return sb.from("konsultasi").insert(d).select().single()
      .then(function (r) { if (r.error) throw new Error(terjemah(r.error.message)); return r.data; });
  }

  /* profil pegawai: keahlian, tautan zoom, no hp */
  function ubahProfil(patch) {
    if (DEMO) {
      var ses = LS("sesi", null), peg = LS("pegawai", []);
      peg.forEach(function (p) { if (ses && p.id === ses.id) Object.assign(p, patch); });
      SV("pegawai", peg); sesiKini = null; return Promise.resolve();
    }
    return sb.auth.getUser().then(function (r) {
      return sb.from("pegawai").update(patch).eq("id", r.data.user.id);
    }).then(function (r) { if (r.error) throw new Error(r.error.message); sesiKini = null; });
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
                 n_terbaik:d.rinci.terbaik||0, n_tuntas:d.rinci.tuntas||0, n_konsul:d.rinci.konsul||0 };
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

  /* ------------------------------------------- isi situs indikator strategis
     Satu baris JSON di tabel indikator_konten (lihat supabase/perbaikan-03.sql).
     Dibaca publik; ditulis pegawai lewat tab "Indikator" di ruang pegawai. */
  var TAUTAN_PINTAR = (window.PINTAR && window.PINTAR.TAUTAN) || {
    pintu: "/", indikator: "/indikator-strategis-bpskukar/", katalog: "/katalog-data-bpskukar/",
    konsultasi: "/katalog-data-bpskukar/konsultasi.html", sahabat: "/katalog-data-bpskukar/sahabat.html", pegawai: "/katalog-data-bpskukar/admin.html"
  };

  function muatIndikator() {
    if (DEMO) {
      var d = LS("indikator", null);
      return Promise.resolve(d && d.data ? d : null);
    }
    return sb.from("indikator_konten").select("data,versi,diubah_pada").eq("id", "utama").maybeSingle()
      .then(function (r) { if (r.error) throw new Error(r.error.message); return r.data || null; });
  }

  function simpanIndikator(data, catatan) {
    if (!data || typeof data !== "object" || Array.isArray(data)) return Promise.reject(new Error("Isi data tidak sah."));
    if (DEMO) {
      var ses = LS("sesi", null), lama = LS("indikator", null), versi = (lama && lama.versi ? lama.versi : 0) + 1;
      var baru = { data: data, versi: versi, catatan: catatan || null, diubah_pada: new Date().toISOString(), diubah_oleh: ses ? ses.id : null };
      SV("indikator", baru);
      var riw = LS("indikatorRiwayat", []);
      riw.unshift(Object.assign({ id: uid() }, baru)); SV("indikatorRiwayat", riw.slice(0, 60));
      return Promise.resolve(baru);
    }
    /* update dulu; bila baris 'utama' belum ada (pemasangan pertama), sisipkan.
       Sengaja bukan upsert: kolom catatan tidak diberi hak baca publik. */
    return sb.from("indikator_konten").update({ data: data, catatan: catatan || null }).eq("id", "utama").select("versi,diubah_pada")
      .then(function (r) {
        if (r.error) throw new Error(terjemah(r.error.message));
        if (r.data && r.data.length) return r.data[0];
        return sb.from("indikator_konten").insert({ id: "utama", data: data, catatan: catatan || null }).select("versi,diubah_pada").single()
          .then(function (r2) { if (r2.error) throw new Error(terjemah(r2.error.message)); return r2.data; });
      });
  }

  function riwayatIndikator() {
    if (DEMO) {
      var peg = LS("pegawai", []);
      return Promise.resolve(LS("indikatorRiwayat", []).map(function (r) {
        var p = peg.filter(function (x) { return x.id === r.diubah_oleh; })[0];
        return { id: r.id, versi: r.versi, catatan: r.catatan, diubah_pada: r.diubah_pada, nama_pengubah: p ? p.nama : null };
      }));
    }
    return sb.from("v_indikator_riwayat").select("*").order("versi", { ascending: false }).limit(60)
      .then(function (r) { if (r.error) throw new Error(r.error.message); return r.data || []; });
  }

  function bacaRiwayatIndikator(id) {
    if (DEMO) {
      var r = LS("indikatorRiwayat", []).filter(function (x) { return x.id === id; })[0];
      return r ? Promise.resolve({ data: r.data, versi: r.versi }) : Promise.reject(new Error("Versi tidak ditemukan."));
    }
    return sb.from("indikator_riwayat").select("data,versi").eq("id", id).single()
      .then(function (r) { if (r.error) throw new Error(r.error.message); return r.data; });
  }

  /* isi awal: assets/data.js milik situs indikator (satu domain), dimuat saat diperlukan */
  var janjiAwal = null;
  function muatIndikatorAwal() {
    if (window.INDIKATOR_AWAL) return Promise.resolve(window.INDIKATOR_AWAL);
    if (janjiAwal) return janjiAwal;
    janjiAwal = new Promise(function (ok, gagal) {
      var s = document.createElement("script");
      s.src = TAUTAN_PINTAR.indikator + "assets/data.js";
      s.onload = function () { window.INDIKATOR_AWAL ? ok(window.INDIKATOR_AWAL) : gagal(new Error("Berkas data.js tidak berisi INDIKATOR_AWAL.")); };
      s.onerror = function () { janjiAwal = null; gagal(new Error("Tidak bisa memuat " + s.src + " — pastikan situs indikator sudah terpasang di alamat itu.")); };
      document.head.appendChild(s);
    });
    return janjiAwal;
  }

  /* untuk asisten & beranda: isi terbit, atau cadangan data.js bila belum ada */
  var janjiIndikator = null;
  /* Isi terbit di server bisa berasal dari berkas versi lama (belum punya bagian
     pembanding kab/kota, kolom IPM per wilayah, atau daftar kecamatan). Bagian yang
     belum ada dilengkapi dari berkas awal; yang sudah ada tidak pernah ditimpa. */
  function lengkapiIndikator(data) {
    var perlu = !data || !data.banding || !data.kecamatan ||
      (Array.isArray(data.wilayah) && data.wilayah.some(function (r) { return r.ipm === undefined; }));
    if (!perlu) return Promise.resolve(data);
    return muatIndikatorAwal().then(function (A) {
      if (!data) return A;
      if (!data.banding && A.banding) data.banding = JSON.parse(JSON.stringify(A.banding));
      if (!data.kecamatan && A.kecamatan) data.kecamatan = JSON.parse(JSON.stringify(A.kecamatan));
      if (Array.isArray(data.wilayah) && Array.isArray(A.wilayah)) {
        data.wilayah.forEach(function (r) {
          var x = A.wilayah.filter(function (w) { return (w.bps && w.bps === r.bps) || w.nama === r.nama; })[0];
          if (x) Object.keys(x).forEach(function (k) { if (r[k] === undefined) r[k] = x[k]; });
        });
      }
      return data;
    }).catch(function () { return data; });
  }
  function indikatorSiap() {
    if (janjiIndikator) return janjiIndikator;
    janjiIndikator = muatIndikator().then(function (r) { return r && r.data ? lengkapiIndikator(r.data) : muatIndikatorAwal(); })
      .catch(function () { return muatIndikatorAwal(); })
      .catch(function () { janjiIndikator = null; return null; });
    return janjiIndikator;
  }

  /* --------------------------------- pembaruan otomatis dari Web API BPS
     Lihat supabase/perbaikan-04.sql. Di mode demo hanya tiruan supaya
     tampilannya bisa dicoba; tidak ada panggilan API sungguhan. */
  var VAR_DEMO = [
    { domain:"6400", var_id:501, judul:"Indeks Pembangunan Manusia Menurut Kabupaten/Kota", satuan:"", subjek:"IPM" },
    { domain:"6400", var_id:502, judul:"Persentase Penduduk Miskin Menurut Kabupaten/Kota", satuan:"Persen", subjek:"Kemiskinan" },
    { domain:"6400", var_id:503, judul:"Jumlah Penduduk Menurut Kabupaten/Kota dan Jenis Kelamin (Ribu Jiwa)", satuan:"Ribu Jiwa", subjek:"Kependudukan" }
  ];
  function rpc(nama, arg) {
    return sb.rpc(nama, arg || {}).then(function (r) { if (r.error) throw new Error(terjemah(r.error.message)); return r.data; });
  }
  function bpsStatus() {
    if (DEMO) return Promise.resolve({ demo:true, kunci_terpasang: !!LS("bpsKey", ""), kunci_awal: LS("bpsKey","") ? LS("bpsKey","").slice(0,4) + "…" : null,
      domain_prov:"6400", domain_kab:"6403", vervar_kukar:"6403", sinkron_aktif: LS("bpsAktif", true), sinkron_terakhir: LS("bpsTerakhir", null), http_tersedia:true, cron_tersedia:true });
    return rpc("bps_status");
  }
  function aturPengaturan(kunci, nilai) {
    if (DEMO) { if (kunci === "bps_api_key") SV("bpsKey", nilai); if (kunci === "bps_sinkron_aktif") SV("bpsAktif", nilai === "true"); return Promise.resolve(); }
    return rpc("atur_pengaturan", { p_kunci: kunci, p_nilai: nilai });
  }
  function bpsUjiKunci() {
    if (DEMO) return LS("bpsKey","") ? Promise.resolve({ ok:true, halaman:{ total: VAR_DEMO.length } }) : Promise.reject(new Error("Kunci belum diisi (mode demo: isi apa saja)."));
    return rpc("bps_uji_kunci");
  }
  /* memuat daftar variabel beberapa halaman per panggilan (batas ±8 detik per RPC) */
  function bpsMuatVar(domain, lapor) {
    if (DEMO) { SV("bpsVar", VAR_DEMO); return Promise.resolve(VAR_DEMO.length); }
    var total = 0;
    var langkah = function (mulai) {
      return rpc("bps_muat_var", { p_domain: domain, p_mulai: mulai, p_jumlah: 4 }).then(function (r) {
        total = r.jumlah_cache || (total + (r.dimuat || 0));
        if (lapor) lapor(Math.min(mulai + 3, r.total_halaman || mulai), r.total_halaman || 1, total);
        return r.halaman_berikut ? langkah(r.halaman_berikut) : total;
      });
    };
    return langkah(1);
  }
  function daftarVarBps(domain, kata) {
    kata = (kata || "").trim().toLowerCase();
    if (DEMO) return Promise.resolve(LS("bpsVar", []).filter(function (v) { return v.domain === domain && (!kata || (v.judul || "").toLowerCase().indexOf(kata) !== -1); }));
    var qy = sb.from("bps_var_cache").select("*").eq("domain", domain).order("var_id").limit(60);
    if (kata) qy = qy.ilike("judul", "%" + kata + "%");
    return qy.then(function (r) { if (r.error) throw new Error(r.error.message); return r.data || []; });
  }
  function bpsPratinjau(domain, varId, vervar, turvar, turtahun) {
    if (DEMO) return Promise.resolve({ var:{ val:varId, label:"Contoh variabel " + varId }, labelvervar:"Kabupaten/Kota",
      vervar:[{val:6403,label:"Kutai Kartanegara"},{val:6472,label:"Samarinda"}], turvar:[{val:0,label:"Tidak ada"}], turtahun:[{val:0,label:"Tahunan"}],
      tahun:[{val:123,label:"2023"},{val:124,label:"2024"},{val:125,label:"2025"}], deret:{ "2023": 75.95, "2024": 76.57, "2025": 77.25 },
      per_wilayah:{ tahun:"2025", wilayah:{ "6403":{ nilai:77.25, tahun:"2025", label:"Kutai Kartanegara" }, "6472":{ nilai:81.4, tahun:"2025", label:"Samarinda" } } } });
    return rpc("bps_pratinjau", { p_domain: domain, p_var: varId, p_vervar: vervar || null, p_turvar: turvar || null, p_turtahun: turtahun || null });
  }
  function daftarSumberApi() {
    if (DEMO) return Promise.resolve(LS("sumberApi", []));
    return sb.from("sumber_api").select("*").order("id").then(function (r) { if (r.error) throw new Error(r.error.message); return r.data || []; });
  }
  function simpanSumberApi(row) {
    if (DEMO) {
      var arr = LS("sumberApi", []), i = arr.findIndex(function (x) { return x.id === row.id; });
      if (i >= 0) arr[i] = Object.assign({}, arr[i], row); else arr.push(Object.assign({ id: Date.now() % 100000, dibuat: new Date().toISOString() }, row));
      SV("sumberApi", arr); return Promise.resolve();
    }
    var q2 = row.id ? sb.from("sumber_api").update(row).eq("id", row.id) : sb.from("sumber_api").insert(row);
    return q2.then(function (r) { if (r.error) throw new Error(terjemah(r.error.message)); });
  }
  function hapusSumberApi(id) {
    if (DEMO) { SV("sumberApi", LS("sumberApi", []).filter(function (x) { return x.id !== id; })); return Promise.resolve(); }
    return sb.from("sumber_api").delete().eq("id", id).then(function (r) { if (r.error) throw new Error(r.error.message); });
  }
  /* tarik satu pemetaan atau semua (berurutan, satu HTTP per panggilan), lalu terbitkan */
  function bpsTarik(id, lapor) {
    if (DEMO) {
      var n = LS("sumberApi", []).filter(function (x) { return x.aktif !== false && (!id || x.id === id); }).length;
      SV("bpsTerakhir", new Date().toISOString());
      var log = LS("sinkronLog", []); log.unshift({ id: Date.now(), waktu: new Date().toISOString(), status: "sama", target: id ? "satu pemetaan" : "semua", pesan: "Mode demo: tidak ada API sungguhan; " + n + " pemetaan diperiksa" });
      SV("sinkronLog", log.slice(0, 60));
      return Promise.resolve({ berubah: 0, sama: n, gagal: 0, terbit: false, demo: true });
    }
    var hasil = { berubah: 0, sama: 0, gagal: 0, terbit: false, versi: null, gagalRinci: [] };
    var daftar = id ? Promise.resolve([{ id: id }]) : daftarSumberApi().then(function (r) { return r.filter(function (x) { return x.aktif !== false; }); });
    return daftar.then(function (arr) {
      var i = 0;
      var satu = function () {
        if (i >= arr.length) return Promise.resolve();
        var x = arr[i++];
        if (lapor) lapor(i, arr.length);
        return rpc("bps_tarik_satu", { p_id: x.id }).then(function (r) {
          if (r.status === "berubah") hasil.berubah++; else if (r.status === "gagal") { hasil.gagal++; hasil.gagalRinci.push(r.target + ": " + r.pesan); } else hasil.sama++;
        }).then(satu);
      };
      return satu();
    }).then(function () { return rpc("bps_terbitkan"); }).then(function (t) {
      hasil.terbit = !!t.terbit; hasil.versi = t.versi || null; hasil.dilewati = false;
      return hasil;
    });
  }
  function logSinkron() {
    if (DEMO) return Promise.resolve(LS("sinkronLog", []));
    return sb.from("v_sinkron_log").select("*").limit(60).then(function (r) { if (r.error) throw new Error(r.error.message); return r.data || []; });
  }

  /* --------------------------------------------------- terbitan & agenda */
  /* Daftar terbitan (BRS, publikasi, infografis, berita) + agenda rilis untuk beranda.
     Mode demo: localStorage "terbitan", dibenihi dari window.TERBITAN_AWAL bila kosong. */
  function terbitanDemo() {
    var arr = LS("terbitan", null);
    if (!arr || !arr.length) {
      arr = (window.TERBITAN_AWAL || []).map(function (t, i) { return Object.assign({ id: i + 1, sumber: "manual", aktif: true, dibuat: new Date().toISOString() }, t); });
      if (arr.length) SV("terbitan", arr);   /* benih hanya disimpan bila berkas awalnya termuat */
    }
    return arr;
  }
  function daftarTerbitan() {
    if (DEMO) return Promise.resolve(terbitanDemo().slice().sort(function (a, b) { return String(b.tanggal).localeCompare(String(a.tanggal)) || b.id - a.id; }));
    return sb.from("terbitan").select("*").order("tanggal", { ascending: false }).order("id", { ascending: false }).limit(300)
      .then(function (r) { if (r.error) throw new Error(terjemah(r.error.message)); return r.data || []; });
  }
  function simpanTerbitan(row) {
    if (DEMO) {
      var arr = terbitanDemo(), i = arr.findIndex(function (x) { return x.id === row.id; });
      if (i >= 0) arr[i] = Object.assign({}, arr[i], row, { diubah: new Date().toISOString() });
      else arr.push(Object.assign({ id: Date.now() % 1000000, sumber: "manual", aktif: true, dibuat: new Date().toISOString() }, row));
      SV("terbitan", arr); return Promise.resolve();
    }
    var q2 = row.id ? sb.from("terbitan").update(row).eq("id", row.id) : sb.from("terbitan").insert(row);
    return q2.then(function (r) { if (r.error) throw new Error(terjemah(r.error.message)); });
  }
  function hapusTerbitan(id) {
    if (DEMO) { SV("terbitan", terbitanDemo().filter(function (x) { return x.id !== id; })); return Promise.resolve(); }
    return sb.from("terbitan").delete().eq("id", id).then(function (r) { if (r.error) throw new Error(terjemah(r.error.message)); });
  }
  function tarikTerbitan() {
    if (DEMO) return Promise.resolve({ baru: 0, sama: terbitanDemo().length, gagal: 0, demo: true });
    return rpc("bps_tarik_terbitan");
  }

  /* daftar terbitan untuk pengunjung (tanpa masuk): tampilan v_terbitan */
  function daftarTerbitanPublik() {
    if (DEMO) return Promise.resolve(terbitanDemo().filter(function (t) { return t.aktif !== false; }));
    return sb.from("v_terbitan").select("*").limit(300)
      .then(function (r) { if (r.error) throw new Error(r.error.message); return r.data || []; })
      .catch(function () { return (window.TERBITAN_AWAL || []).slice(); });
  }

  /* ------------------------------------------- catatan asisten (perbaikan-07)
     Pertanyaan pengunjung + hasilnya dicatat tanpa identitas, supaya pegawai tahu
     apa yang belum bisa dijawab. Nomor/kode disamarkan sebelum dikirim. */
  function samarkan(t) {
    return String(t || "").replace(/(PST|KON)-\d{4}-\d{4}/gi, "$1-****-****").replace(/\d{6,}/g, "######")
      .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "email@…").slice(0, 300);
  }
  function catatAsisten(p) {
    var row = { pertanyaan: samarkan(p.pertanyaan), jenis: p.jenis || null, skor: p.skor == null ? null : Number(p.skor), halaman: p.halaman || null, sesi: p.sesi || null };
    if (!row.pertanyaan) return Promise.resolve(null);
    if (DEMO) {
      var arr = LS("asistenLog", []); var id = (arr[0] ? arr[0].id : 0) + 1;
      arr.unshift(Object.assign({ id: id, waktu: new Date().toISOString(), nilai: null, ditangani: false }, row)); SV("asistenLog", arr.slice(0, 2000));
      return Promise.resolve(id);
    }
    return sb.rpc("asisten_catat", { p: row }).then(function (r) { return r.error ? null : r.data; }).catch(function () { return null; });
  }
  function nilaiAsisten(id, sesi, nilai) {
    if (!id) return Promise.resolve();
    if (DEMO) {
      var arr = LS("asistenLog", []), i = arr.findIndex(function (x) { return x.id === id; });
      if (i >= 0) { arr[i].nilai = nilai; SV("asistenLog", arr); }
      return Promise.resolve();
    }
    return sb.rpc("asisten_nilai", { p_id: id, p_sesi: sesi, p_nilai: nilai }).then(function () {}).catch(function () {});
  }
  function daftarLogAsisten(opt) {
    opt = opt || {};
    if (DEMO) return Promise.resolve(LS("asistenLog", []).slice(0, opt.limit || 2000));
    return sb.from("asisten_log").select("*").order("waktu", { ascending: false }).limit(opt.limit || 2000)
      .then(function (r) { if (r.error) throw new Error(terjemah(r.error.message)); return r.data || []; });
  }
  function ubahLogAsisten(ids, patch) {
    if (DEMO) {
      var arr = LS("asistenLog", []);
      arr.forEach(function (x) { if (ids.indexOf(x.id) !== -1) Object.assign(x, patch); });
      SV("asistenLog", arr); return Promise.resolve();
    }
    return sb.from("asisten_log").update(patch).in("id", ids).then(function (r) { if (r.error) throw new Error(terjemah(r.error.message)); });
  }

  /* ---------------------------------------------------------------- navigasi */
  function nav(aktif, s) {
    var kanan = "";
    if (s) {
      kanan = '<span class="nav__who">' + esc(s.profil && s.profil.nama ? s.profil.nama : s.email) +
              (s.jenis === "pegawai" ? "" : " · sahabat data") + '</span>' +
              '<button class="btn btn--ghost btn--sm" id="btnKeluar">Keluar</button>';
    }
    /* Tautan ke situs saudara (Indikator Strategis, beranda) ada di bilah PINTAR di atas,
       jadi menu ini hanya memuat halaman situs katalog sendiri. */
    var t = [
      ["index.html",     "Katalog Data"],
      ["glosarium.html", "Glosarium"],
      ["konsultasi.html","Konsultasi Daring"],
      ["sahabat.html",   "Sahabat Data"],
      ["admin.html",     "Ruang Pegawai"]
    ].map(function (x) {
      return '<a href="' + x[0] + '"' + (x[0] === aktif ? ' aria-current="page"' : "") + ">" + x[1] + "</a>";
    }).join("");
    /* Logo resmi: letakkan berkas assets/logo-bps.png (dari aset kantor). Bila tidak
       ada, gambar disembunyikan dan hanya tulisan yang tampil. */
    return '<nav class="nav"><div class="nav__in">' +
           '<a class="nav__brand" href="index.html"><img src="assets/logo-bps.png" alt="" onerror="this.style.display=\'none\'">' +
           '<span><b>PST BPS Kutai Kartanegara</b><span>Pelayanan Statistik Terpadu</span></span></a>' +
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
    esc:esc, linkify:linkify, waLink:waLink, el:el, q:q, qa:qa, tgl:tgl, sejak:sejak, pesan:pesan,
    opsi:opsi, centang:centang, nilaiCentang:nilaiCentang, uid:uid,
    masuk:masuk, keluar:keluar, sesi:sesi, daftarSahabat:daftarSahabat,
    tambahKunjungan:tambahKunjungan, daftarKunjungan:daftarKunjungan, ajukanPermintaan:ajukanPermintaan,
    daftarTerbitanPublik:daftarTerbitanPublik, catatAsisten:catatAsisten, nilaiAsisten:nilaiAsisten, daftarLogAsisten:daftarLogAsisten, ubahLogAsisten:ubahLogAsisten,
    ubahKunjungan:ubahKunjungan, cekTiket:cekTiket,
    daftarPertanyaan:daftarPertanyaan, tambahPertanyaan:tambahPertanyaan,
    daftarJawaban:daftarJawaban, tambahJawaban:tambahJawaban,
    tandaiTerbaik:tandaiTerbaik, tutupPertanyaan:tutupPertanyaan,
    papanPeringkat:papanPeringkat, daftarPegawai:daftarPegawai,
    aturanKonsultasi:aturanKonsultasi, slotTerpakai:slotTerpakai, ajukanKonsultasi:ajukanKonsultasi,
    cekKonsultasi:cekKonsultasi, daftarKonsultasi:daftarKonsultasi, ubahKonsultasi:ubahKonsultasi,
    tambahKonsultasiPetugas:tambahKonsultasiPetugas, ubahProfil:ubahProfil,
    tglWita:tglWita, tambahHari:tambahHari, hariKerja:hariKerja,
    muatIndikator:muatIndikator, simpanIndikator:simpanIndikator, riwayatIndikator:riwayatIndikator,
    bacaRiwayatIndikator:bacaRiwayatIndikator, muatIndikatorAwal:muatIndikatorAwal, indikatorSiap:indikatorSiap,
    bpsStatus:bpsStatus, aturPengaturan:aturPengaturan, bpsUjiKunci:bpsUjiKunci, bpsMuatVar:bpsMuatVar, daftarVarBps:daftarVarBps,
    bpsPratinjau:bpsPratinjau, daftarSumberApi:daftarSumberApi, simpanSumberApi:simpanSumberApi, hapusSumberApi:hapusSumberApi,
    bpsTarik:bpsTarik, logSinkron:logSinkron,
    daftarTerbitan:daftarTerbitan, simpanTerbitan:simpanTerbitan, hapusTerbitan:hapusTerbitan, tarikTerbitan:tarikTerbitan,
    TAUTAN:TAUTAN_PINTAR,
    nav:nav, pasangKeluar:pasangKeluar, spandukDemo:spandukDemo
  };
})();
