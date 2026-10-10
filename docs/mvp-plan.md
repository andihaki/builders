# Rencana MVP — Builders

> Dokumen kerja: apa yang dikirim untuk MVP, kenapa, dan bagaimana urutannya.
> Ditulis 2026-08-22 dari hasil analisa codebase di branch
> `claude/mvp-use-case-features-bx1lgh`.

## Status: semua fase MVP sudah dikirim

Fase A sampai C selesai di branch ini; Fase D tetap keputusan tertulis, bukan
kode. Rinciannya di [Catatan penutup](#catatan-penutup) di bawah — bagian
rencana di tengah dibiarkan apa adanya sebagai rekaman alasan tiap keputusan.

## Dua use case yang dilayani

Platform ini melayani dua hal sekaligus, dan MVP harus menganggap keduanya
setara:

1. **Papan kolaborasi.** Orang menaruh ide dengan brief, membuka peran
   (seat), orang lain melamar, pemilik menerima. Loop ini sudah jalan.
2. **Media promosi orangnya.** Profil `/u/username` adalah portofolio:
   proyek yang dimiliki, peran yang dijalani, dan jejak aktivitas yang
   ditulis otomatis oleh sistem — bukti kerja yang tidak bisa dikarang.
   Loop ini baru setengah jalan.

Kekuatan yang sudah ada dan harus dijual: **jejak ditulis trigger database
saat kejadian, bukan diketik belakangan.** Klaim di portofolio ini punya
bukti. Tidak ada platform portofolio lain yang bisa bilang begitu.

## Kondisi sekarang (ringkas)

Sudah jalan: feed dengan filter stage/tag/pencarian/urutan, detail proyek
(seats, lamaran, tasks, komentar, boost, activity), profil + portofolio +
kontrol visibilitas jejak, kotak masuk lamaran, auth Supabase dengan RLS,
fallback seed tanpa database.

Gap yang menghalangi kedua use case, urut dampak:

| # | Gap | Use case yang kena |
|---|-----|--------------------|
| 1 | Peran di proyek yang dibantu dibuang (`getPortfolio` tidak select `role`) | Promosi |
| 2 | Tidak ada metadata OG/Twitter sama sekali; share link = teks polos | Promosi |
| 3 | Feed tidak bisa difilter per peran yang dibutuhkan | Kolaborasi |
| 4 | Pencarian hanya title/tagline/problem | Kolaborasi |
| 5 | Jejak dipotong 40 entri, tanpa sorotan, tanpa pagination | Promosi |
| 6 | Statistik profil lemah (3 angka), padahal tabel `events` kaya | Promosi |
| 7 | Tidak ada sitemap, tidak ada direktori orang | Promosi |
| 8 | Lamaran ditolak lenyap tanpa jejak (`decide_seat` menghapus `user_id`); pelamar tidak pernah tahu keputusannya | Kolaborasi |
| 9 | Tidak ada reset password — lupa password = terkunci permanen | Keduanya |
| 10 | Portofolio bergantung pada seat `filled` saat ini; begitu ada fitur keluar-proyek, riwayat kontribusi lenyap | Promosi |

## Scope MVP

Empat fase. A dan B adalah nilai produk; C adalah jalur kritis yang tidak
boleh bolong saat launch; D adalah keputusan arsitektur yang murah sekarang
dan mahal nanti.

### Fase A — Portofolio yang bisa dipromosikan

**A1. Peran tampil di "Ikut menggarap"**

- `getPortfolio` (`app/lib/data.ts`) ikut select `role` dari `seats`
  (satu orang maksimal satu seat per proyek — dijaga `apply_for_seat`,
  jadi mapping-nya sederhana).
- Tipe balikan jadi `{ owned, contributing: (ProjectSummary & { role })[] }`.
- Halaman profil menampilkan badge peran (`roleLabel`) di tiap kartu
  bagian "Ikut menggarap".
- Selesai bila: profil menampilkan "sebagai Designer" (dst.) di tiap
  proyek yang dibantu, termasuk di fallback seed.

**A2. Metadata sharing + OG image dinamis**

- `openGraph` + `twitter` (summary_large_image) di semua halaman publik:
  feed, `/projects/[slug]`, `/u/[username]`, `/about`.
- OG image dinamis via `opengraph-image.tsx` (ImageResponse, runtime edge):
  - `/u/[username]`: nama, headline, statistik (proyek, tugas beres,
    peran) — kartu promosi orangnya.
  - `/projects/[slug]`: judul, tagline, stage, peran yang dibuka.
  - Root: pakai `public/og.png` yang sudah ada tapi belum pernah dirujuk.
- Selesai bila: paste link profil ke WhatsApp/LinkedIn memunculkan kartu
  bergambar dengan nama dan angka pencapaian.

**A3. Statistik profil dari tabel `events`**

- Fungsi baru `getPersonStats(personId)` di `app/lib/data.ts`: hitung per
  `kind` dari `events` (`task_done`, `seat_filled`, `project_created`),
  plus tanggal event pertama ("aktif sejak").
- `profile-stats` di halaman profil jadi: proyek dimiliki · sudah jalan ·
  ikut menggarap · tugas dibereskan · aktif sejak.
- Menghormati `activity_hidden`: kind yang disembunyikan pemilik profil
  tidak dihitung untuk pengunjung (SELECT policy `events` sudah
  menyaring ini — hitung dari hasil query, jangan query terpisah yang
  membocorkan).
- Selesai bila: profil menampilkan angka-angka itu, dan menyembunyikan
  sebuah kind menghilangkan angkanya bagi pengunjung.

**A4. Jejak: sorotan + muat semua + pagination**

- Default profil menampilkan **sorotan**: `project_created`,
  `project_stage_changed`, `seat_opened`, `seat_filled`, `task_done`
  (kejadian bernilai portofolio). `comment_posted` / `boost_given` /
  `seat_applied` / `task_created` / `task_taken` masuk mode "semua".
- Toggle via query param `?jejak=semua`, link "Tampilkan semua jejak".
- Pagination offset sederhana (`.range()`) dengan "Muat lebih lama",
  batch 40. Batas keras 40 sekarang jadi batas per halaman.
- Satu kalimat kredibilitas di atas jejak: *"Jejak ini ditulis sistem
  saat kejadian — bukan diketik."*
- Selesai bila: jejak lama tetap terjangkau, sorotan default tidak
  tenggelam oleh komentar/boost.

### Fase B — Penemuan

**B1. Filter peran di feed**

- Migrasi `0007_open_roles.sql`: tambah kolom agregat ke view
  `project_overview`:
  `(select coalesce(array_agg(distinct s.role), '{}') from seats s where s.project_id = p.id and s.status = 'open') as open_roles`.
- `FeedQuery` dapat `role?: string`; `listProjects` filter
  `.contains("open_roles", [role])` (validasi `isRole` dulu).
- UI feed: baris filter peran (chips dari `ROLES` + `roleMeta.label`) di
  `filter-bar`, ikut dibawa `linkTo()` seperti stage/tag/sort.
- Kartu proyek menampilkan peran yang dibuka (dari `open_roles`) — data
  yang sama, dua kegunaan.
- Fallback seed ikut: `seedSummaries` menghitung `openRoles` dari seats.
- Selesai bila: `/?role=design` hanya menampilkan proyek yang sedang
  membuka peran designer, dan chip-nya aktif.

**B2. Perluasan cakupan pencarian**

- `listProjects`: tambah `solution.ilike` dan `audience.ilike` ke `or()`
  yang sudah ada (`escapeLike` tetap dipakai). Fallback seed ikut.
- Full-text search Postgres (tsvector) **bukan** MVP — dicatat sebagai
  lanjutan bila ILIKE mulai lambat.
- Selesai bila: mencari kata yang hanya ada di kolom solusi menemukan
  proyeknya.

**B3. Sitemap + direktori orang**

- `app/sitemap.ts`: feed, about, semua `/projects/[slug]`, semua
  `/u/[username]` (basis `siteUrl` dari `app/content.ts`).
- Halaman `/orang`: daftar profil (nama, headline, statistik ringkas),
  fungsi `listPeople()` baru. Link dari header/footer.
- Selesai bila: `/sitemap.xml` valid dan `/orang` menampilkan semua
  profil dengan link.

### Fase C — Jalur kritis akun & notifikasi

**C1. Reset password**

- `auth-actions.ts`: `requestPasswordReset` (memanggil
  `supabase.auth.resetPasswordForEmail` dengan redirect ke
  `/auth/confirm?next=/akun/password`) dan `updatePassword`
  (`supabase.auth.updateUser`).
- Halaman `/lupa-password` (form email) dan `/akun/password` (form
  password baru, butuh sesi dari link email). Link "Lupa password?" di
  halaman masuk.
- Pesan sukses yang tidak membocorkan apakah emailnya terdaftar.
- Selesai bila: alur lupa → email → setel ulang → masuk lagi jalan
  end-to-end di Supabase.

**C2. Keputusan lamaran sampai ke pelamar**

Masalah akar: `decide_seat` saat menolak me-reset seat (`status='open'`,
`user_id=null`) — riwayat lamaran pelamar hilang, dan tidak ada mekanisme
memberitahunya.

- Migrasi `0008_notices.sql`: tabel kecil
  `notices (id, recipient_id → profiles cascade, kind, payload jsonb,
  seen boolean default false, created_at)` + RLS: recipient select/update
  `seen` miliknya sendiri.
- `decide_seat` menulis satu baris notice ke pelamar
  (`kind = 'application_accepted' | 'application_declined'`, payload:
  slug, title, role) **sebelum** me-reset seat.
- Badge header (sekarang `countIncomingApplications`) jadi:
  lamaran masuk pending **+ notice belum dibaca**.
- `/inbox` menampilkan bagian "Keputusan" dari notices dan menandai
  `seen` saat halaman dibuka.
- Ini sekaligus fondasi notifikasi lain nanti (komentar, mention) tanpa
  tabel baru lagi.
- Selesai bila: pelamar yang ditolak melihat keputusannya di inbox
  dengan badge, dan setelah dibuka badge-nya hilang.

### Fase D — Keputusan arsitektur (didokumentasikan, dijaga)

**D1. Portofolio permanen.** Kontribusi seseorang di portofolio harus
bertahan walau ia keluar dari proyek atau seat-nya dibuka lagi. Keputusan:
saat fitur "keluar/mengeluarkan dari proyek" dibuat nanti, bagian "Ikut
menggarap" diturunkan dari event `seat_filled` (permanen, sudah menyimpan
snapshot judul), bukan hanya dari seat `filled` saat ini — kontribusi lama
tampil sebagai "pernah menggarap". **Konsekuensi sekarang:** fitur
keluar-proyek tidak boleh dikirim sebelum ini; tidak ada perubahan kode di
MVP ini selain catatan ini.

**D2. Kredibilitas jejak.** Event dari proyek sendiri (bikin task sendiri,
beresin sendiri) kurang bernilai daripada event yang butuh keputusan orang
lain (`seat_filled` = diterima pemilik proyek lain). Belum ada mitigasi di
MVP; dicatat supaya desain "verifikasi" nanti (mis. badge khusus untuk
kontribusi lintas-orang) tidak terkejut.

## Yang sengaja TIDAK masuk MVP

Upload avatar (inisial cukup), edit teks task (sudah ditunda sadar),
reply berantai komentar, full-text search, moderasi/pelaporan (menyusul
segera setelah launch — sebelum promosi terbuka), direktori/pencarian
orang dengan filter keahlian, i18n `/en` yang lebih dalam, hapus/edit
komentar, tutup seat, tarik lamaran (tiga terakhir: gelombang berikutnya,
sebagian tergantung D1).

## Urutan eksekusi

Dependensi menentukan urutan, bukan prioritas rasa:

1. **B1 dulu sebagian (migrasi `open_roles`)** karena A1 + B1 memakai
   jalur data yang sama (role dari seats) — dikerjakan satu tarikan:
   migrasi 0007 → `listProjects`/`getPortfolio`/seed → UI feed + profil.
2. **A3 + A4** (profil: statistik + jejak) — satu file halaman yang sama,
   satu PR rasa.
3. **A2** (metadata + OG image) — setelah statistik ada, karena OG image
   profil menampilkan angka dari A3.
4. **B2 + B3** (pencarian + sitemap + `/orang`) — kecil, independen.
5. **C1** (reset password) — independen, kapan saja.
6. **C2** (notices, migrasi 0008) — terakhir karena menyentuh fungsi
   database `decide_seat`.

Tiap langkah: jalankan `npm run lint` dan `npm test` (build + unit) sebelum
commit; logika murni baru (filter sorotan jejak, statistik, normalisasi
role) dapat unit test di `tests/` mengikuti pola `domain.test.mjs`.

## Catatan penutup

Apa yang benar-benar dikirim, dan yang berubah dari rencana:

| Fase | Hasil | Catatan |
|------|-------|---------|
| A1 | Peran tampil di "Ikut menggarap" | Sesuai rencana |
| A2 | OG image dinamis profil + proyek, metadata sitewide | Ditambah `shareCard()` — lihat di bawah |
| A3 | Statistik profil dari `events` | Sesuai rencana |
| A4 | Sorotan + "muat jejak lebih lama" | Sesuai rencana |
| B1 | Filter peran + migrasi `0007_open_roles.sql` | Chip peran juga tampil di tiap kartu |
| B2 | Pencarian membaca solusi dan audiens | Full-text search tetap ditunda |
| B3 | `/orang` + `app/sitemap.ts` | Sesuai rencana |
| C1 | Reset password | Memakai ulang `/auth/confirm` yang sudah ada |
| C2 | Notices + migrasi `0008_notices.sql` | Ditandai manual, bukan otomatis — lihat di bawah |

Tiga hal yang berbeda dari rencana awal, dan alasannya:

1. **`shareCard()` di `app/content.ts`.** Next.js mengganti seluruh objek
   `openGraph` alih-alih menggabungkannya dengan milik layout, jadi halaman
   yang menyebut judulnya sendiri diam-diam kehilangan gambar bagikannya.
   Papan dan kedua halaman cerita sempat kena persis begitu sampai
   test menangkapnya. Helper ini yang menahan kelas bug tersebut, dan ada
   test yang menjaganya.

2. **Notices ditandai lewat tombol, bukan saat halaman dibuka.** Rencana awal
   menandai `seen` saat `/inbox` dirender. Itu salah: halaman yang menghapus
   badge-nya sendiri saat render bisa menghapus kabar yang belum sempat
   dibaca, dan GET seharusnya tidak mengubah apa pun.

3. **`decide_seat` menulis notice sebelum menyentuh seat.** Menolak lamaran
   itulah yang mengosongkan `user_id`; kalau pelamar dibaca setelahnya, sudah
   tidak ada siapa-siapa untuk diberi tahu.

### Sisa untuk gelombang berikutnya

Urut kesiapan: moderasi/pelaporan (sebaiknya sebelum promosi dibuka lebar),
hapus/edit komentar sendiri, tutup seat, tarik lamaran, lalu fitur keluar
proyek — yang terakhir ini terkunci di belakang keputusan D1 dan tidak boleh
dikirim sebelum "Ikut menggarap" diturunkan dari event `seat_filled`.

## Catatan rollout

Migrasi dijalankan manual di SQL editor Supabase (konvensi repo ini), dan
kode sudah toleran tabel yang belum ada (`isMissingTable`) — pola yang sama
dipakai untuk `notices`: bila tabelnya belum ada, badge dan bagian "Kabar
untukmu" hilang diam-diam dengan warning di log, bukan error.

Jalankan **`0007_open_roles.sql` dan `0008_notices.sql` sebelum men-deploy
kode ini**, dengan satu catatan penting untuk masing-masing:

- **0007** men-drop dan membuat ulang view `project_overview` (pola yang sama
  dengan 0004 dan 0006). Membaca `open_roles` sebelum migrasinya jalan akan
  gagal di kolom itu — jadi migrasi dulu, deploy setelahnya. Pembacaan biasa
  tetap aman karena `toSummary` memberi `?? []`; yang butuh kolomnya adalah
  filter perannya.
- **0008** mengganti fungsi `decide_seat` sekaligus membuat tabel `notices`.
  Keduanya ada di satu berkas dan harus dijalankan utuh: fungsi barunya
  memanggil `record_notice()`, jadi menjalankan sebagian akan membuat
  keputusan lamaran gagal.
