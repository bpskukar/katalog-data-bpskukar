/* ============================================================================
   Terbitan & agenda awal — dipakai beranda PINTAR bila server belum terjangkau
   (atau mode demo), dan sebagai benih Ruang Pegawai mode demo.
   Isi sebenarnya dikelola di Ruang Pegawai → Terbitan & agenda, atau ditarik
   otomatis dari Web API BPS (perbaikan-06). Format sama dengan tabel terbitan.
   jenis: brs | publikasi | infografis | tabel | berita | agenda
   ========================================================================== */
window.TERBITAN_AWAL = [
  { jenis: "publikasi", judul: "Kabupaten Kutai Kartanegara Dalam Angka 2026",
    ringkas: "Publikasi tahunan terlengkap: geografi, pemerintahan, penduduk, sosial, pertanian, industri, perdagangan, keuangan.",
    tanggal: "2026-02-28", tautan: "https://kukarkab.bps.go.id/id/publication" },
  { jenis: "publikasi", judul: "Kecamatan Dalam Angka 2025 (tiap kecamatan)",
    ringkas: "Data tiap kecamatan: penduduk per desa, fasilitas pendidikan dan kesehatan, pertanian, infrastruktur.",
    tanggal: "2025-09-26", tautan: "https://kukarkab.bps.go.id/id/publication" },
  { jenis: "agenda", judul: "Kecamatan Dalam Angka 2026 (seluruh kecamatan)", ringkas: "Terbit serentak setiap 26 September.",
    tanggal: "2026-09-26", tautan: "https://kukarkab.bps.go.id/id/publication" },
  { jenis: "agenda", judul: "Kabupaten Kutai Kartanegara Dalam Angka 2027", ringkas: "Terbit setiap 28 Februari.",
    tanggal: "2027-02-28", tautan: "https://kukarkab.bps.go.id/id/publication" }
];
