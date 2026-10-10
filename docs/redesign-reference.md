# Acuan redesign UI/UX

Dokumen riset yang dipakai sebagai acuan saat papan ini diredesain: benchmark,
prinsip UX yang dipilih, dan keputusan visualnya. Disimpan di sini supaya
alasan di balik tampilan sekarang bisa dibaca ulang saat mengubahnya lagi.

---

# Riset UI/UX Builders

## Tujuan produk

Builders bukan sekadar galeri ide atau landing page. Produk ini perlu mempertemukan empat kebutuhan dalam satu alur:

1. Menemukan proyek yang relevan.
2. Memahami kondisi dan kebutuhan proyek dengan cepat.
3. Mengambil kontribusi yang ukuran dan hasilnya jelas.
4. Mengubah hasil kerja menjadi portofolio yang dapat dipercaya.

## Benchmark

### GitHub

Pola yang dipakai:

- Profil menggabungkan identitas, bio, proyek, jaringan, dan aktivitas.
- Tab menjaga informasi yang padat tetap mudah dinavigasi.
- Contribution graph membuat konsistensi kerja terlihat tanpa perlu membaca seluruh riwayat.
- Repository card menyajikan nama, deskripsi, topik, status, dan bukti aktivitas.
- Issues, label, assignee, milestone, serta “good first issue” menurunkan hambatan kontribusi.
- Kontribusi tertaut ke pengguna dan proyek sehingga menjadi bukti kerja yang dapat diverifikasi.

Risiko yang perlu dihindari:

- Terminologi teknis GitHub tidak cocok untuk semua peran.
- Kepadatan informasinya bisa mengintimidasi pengguna baru.
- Grafik aktivitas tidak boleh menjadi satu-satunya ukuran kualitas kontribusi.

### Product Hunt

Pola yang dipakai:

- Discovery list dapat dipindai cepat melalui logo, nama, tagline, kategori, komentar, dan upvote.
- Ranking dan momentum waktu membantu proyek baru mendapatkan perhatian.
- Product detail menyediakan overview, media, team, review, diskusi, dan produk serupa.
- Satu aksi utama selalu tampak jelas: upvote, follow, atau visit.
- Maker melekat pada produk sehingga keberhasilan produk memperkuat reputasi pembuatnya.

Risiko yang perlu dihindari:

- Popularity loop dapat mengalahkan relevansi atau kebutuhan dampak sosial.
- Upvote tanpa kontribusi mudah menjadi metrik dangkal.
- Sistem ranking harian tidak cukup untuk proyek yang bertumbuh perlahan.

## Prinsip UX yang dipilih

1. **Contribution-first discovery** — rekomendasi tidak hanya berdasarkan popularitas, tetapi juga kecocokan skill dan kebutuhan proyek.
2. **Progress before promotion** — status, milestone, dan pembaruan terakhir muncul sebelum angka dukungan.
3. **Small, scoped entry points** — setiap peran memiliki hasil, tingkat kesulitan, dan estimasi waktu.
4. **Portfolio by evidence** — portofolio dihasilkan dari kontribusi yang tertaut ke proyek dan rekan kolaborasi.
5. **Shared ownership** — proyek menampilkan initiator, lead, dan kontributor; bukan hanya pemilik tunggal.
6. **Inclusive language** — istilah dibuat netral untuk product, design, engineering, research, content, dan domain expert.

## Arsitektur informasi

- Jelajah: rekomendasi, proyek, kategori, topik.
- Kontribusi: semua peran terbuka, filter skill, tingkat kesulitan, estimasi waktu.
- Project detail: masalah, target pengguna, progres, roadmap, peran, kontributor, diskusi.
- Portofolio: profil, skill terverifikasi, contribution graph, proyek pilihan, aktivitas, apresiasi.
- Aktivitas: update proyek, milestone, kontribusi baru, dan rilis.

## Alur utama prototype

`Jelajah proyek → buka detail → pahami masalah & roadmap → pilih peran → konfirmasi minat → kontribusi masuk ke aktivitas dan portofolio`

## Keputusan visual

- Struktur lebih menyerupai aplikasi daripada landing page.
- Kepadatan moderat: cukup kaya untuk menilai proyek, tetap bisa dipindai cepat.
- Warna hijau Ahsan dipertahankan sebagai fondasi; coral untuk momentum, lime untuk ajakan bertindak.
- Kartu proyek tidak mengandalkan gambar dekoratif; informasi dan status menjadi visual utama.
- Portofolio memakai contribution graph, tetapi dilengkapi konteks proyek dan aktivitas agar tidak menjadi vanity metric.
