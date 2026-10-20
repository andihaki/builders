import type { Metadata } from "next";
import Link from "@/app/components/responsive-link";
import { SiteFooter, SiteHeader } from "../components/shell";
import { shareCard } from "../content";
import { currentLocale } from "../lib/locale-server";
import { tx } from "../lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  const title = tx(locale, "Kebijakan Privasi — Builders", "Privacy Policy — Builders");
  const description = tx(locale, "Data yang dikumpulkan Builders, informasi yang tampil secara publik, serta cara data digunakan dan dilindungi.", "What Builders collects, what's public, and how your data is used and protected.");
  return {
    title,
    description,
    alternates: { canonical: "/privacy" },
    openGraph: shareCard({ title, description, url: "/privacy" }),
  };
}

export default async function PrivacyPage() {
  const locale = await currentLocale();

  return (
    <>
      <SiteHeader returnTo="/privacy" />

      <main id="main-content" className="page-narrow legal-content">
        <p className="eyebrow"><span /> {tx(locale, "Kebijakan Privasi", "Privacy Policy")}</p>
        <h1>{tx(locale, "Datamu, dan siapa yang dapat melihatnya.", "Your data, and who gets to see it.")}</h1>
        <p className="lede">
          {tx(locale, "Builders adalah papan kolaborasi sekaligus portofolio. Karena visibilitas karya merupakan inti layanan ini, kami menjelaskan secara langsung apa yang bersifat publik, apa yang tetap privat, dan ke mana datamu dikirim.", "Builders is both a collaboration board and a portfolio. Because making work visible is central to the service, this page plainly explains what is public, what stays private, and where your data goes.")}
        </p>

        <h2>{tx(locale, "1. Data yang kami kumpulkan", "1. What we collect")}</h2>

        <h3>{tx(locale, "Akun", "Account")}</h3>
        <p>
          {tx(locale, "Kamu dapat mendaftar dengan email dan kata sandi, dengan Google, atau dengan GitHub. Autentikasi ditangani oleh Supabase Auth; aplikasi ini tidak menyimpan kata sandi dalam bentuk teks biasa. Saat menggunakan Google, kami hanya menerima nama, email, dan ID akun Google sesuai izin yang kamu berikan. Email akun digunakan untuk masuk dan pemberitahuan sistem, serta tidak ditampilkan secara publik kecuali kamu menambahkannya secara terpisah sebagai email publik. Saat menggunakan GitHub, kami menerima nama, email, dan username GitHub-mu, serta token yang hanya bisa memberi atau menghapus bintang (star) pada repositori. Token itu disimpan di cookie browser-mu yang tidak bisa dibaca skrip halaman, hanya dipakai saat kamu menekan tombol Star, dan dihapus saat kamu keluar.", "You can sign up with email and password, with Google, or with GitHub. Authentication is handled by Supabase Auth; this app never stores your password in plain text. When you use Google, we only receive your name, email, and Google account ID under the permissions you grant. Your account email is used for sign-in and system notices and is never public unless you separately add it as a public email. When you use GitHub, we receive your name, email, and GitHub username, plus a token that can only star or unstar repositories. That token is kept in a cookie in your browser that page scripts cannot read, is used only when you press a Star button, and is deleted when you sign out.")}
        </p>

        <h3>{tx(locale, "Profil (publik dan opsional)", "Profile (public and optional)")}</h3>
        <p>
          {tx(locale, "Selain nama, setiap kolom di", "Other than your name, every field on")} <Link href="/account/profile">/account/profile</Link>{" "}
          {tx(locale, "boleh diisi atau dilewati: profesi, perkenalan singkat, bio, keahlian, bidang, pengalaman, serta tautan kontak. Status peluangmu juga bersifat publik. Kolom yang diisi akan muncul di profil publik dan dapat ditemukan melalui", "can be filled in or skipped: profession, introduction, bio, skills, fields, experience, and contact links. Your opportunity status is also public. Filled fields appear on your public profile and can be found through the")} <Link href="/people">Talent Pool</Link>.
        </p>

        <h3>{tx(locale, "Proyek dan kolaborasi", "Projects and collaboration")}</h3>
        <p>
          {tx(locale, "Tautan proyek, nama, deskripsi, ikon, ringkasan, masalah, solusi, sasaran, topik, tahap, pekerjaan terkini, perjalanan, peran terbuka, logo, komentar, dukungan, dan pengikut bersifat publik. Pengajuan peran serta tugas yang diambil dan diselesaikan juga dicatat agar kolaborasi dapat berlangsung. Jangan memasukkan informasi yang tidak ingin kamu tampilkan kepada publik.", "Project links, names, descriptions, icons, highlights, problems, solutions, audiences, topics, stages, current work, journeys, open roles, logos, comments, boosts, and follows are public. Role applications and tasks taken or completed are also recorded so collaboration can work. Do not enter anything you would not want to be public.")}
        </p>

        <h3>{tx(locale, "Jejak aktivitas", "Activity trail")}</h3>
        <p>
          {tx(locale, "Peristiwa tertentu dicatat otomatis saat terjadi—misalnya proyek dibuat, tahap berubah, peran dibuka atau diisi, tugas selesai, komentar dibuat, dukungan diberikan, atau kabar terbaru dikirim. Kamu dapat menyembunyikan jenis aktivitas tertentu dari profil publik; menyembunyikannya tidak menghapus catatan.", "Certain events are recorded automatically as they happen—for example, a project created, a stage changed, a role opened or filled, a task completed, a comment posted, a boost given, or an update posted. You can hide specific activity kinds from your public profile; hiding them does not delete the record.")}
        </p>

        <h3>{tx(locale, "Kotak masuk dan impor GitHub", "Inbox and GitHub import")}</h3>
        <p>
          {tx(locale, "Keputusan atas pengajuan dikirim sebagai pemberitahuan privat ke", "Application decisions are sent as private notices to")} <Link href="/inbox">/inbox</Link>.{" "}
          {tx(locale, "Saat kamu mengimpor repositori publik, kami membaca metadata dan README publik dari GitHub untuk mengisi formulir. Tidak ada data privat yang diakses dan hasilnya tidak disimpan sebelum kamu menyimpan proyek.", "When you import a public repository, we read its public metadata and README from GitHub to prefill the form. No private data is accessed, and the result is not stored until you save the project.")}
        </p>

        <h3>{tx(locale, "Masukan", "Feedback")}</h3>
        <p>
          {tx(locale, "Masukan yang dikirim lewat", "Feedback sent through")} <Link href="/feedback">/feedback</Link>{" "}
          {tx(locale, "menyimpan jenis masukan, isi pesanmu, dan email balasan jika kamu mengisinya. Jika kamu sedang masuk, akunmu ikut tercatat agar pengelola dapat menindaklanjuti. Masukan tidak pernah ditampilkan di halaman mana pun dan hanya dibaca pengelola; kamu boleh mengirimkannya tanpa akun.", "stores the kind of feedback, what you wrote, and a reply address if you gave one. If you are signed in, your account is recorded with it so the maintainers can follow up. Feedback is never shown on any page and is read by the maintainers only; you may send it without an account.")}
        </p>

        <h3>{tx(locale, "Data teknis", "Technical data")}</h3>
        <p>
          {tx(locale, "Sesi disimpan melalui cookie yang dikelola Supabase Auth, ditambah cookie PKCE berumur pendek saat masuk dengan Google. Situs ini juga menyimpan pilihan bahasa ID/EN. Kami tidak menggunakan cookie iklan atau analitik pihak ketiga.", "Your session is stored through cookies managed by Supabase Auth, plus a short-lived PKCE cookie during Google sign-in. This site also stores your ID/EN language choice. We do not use advertising or third-party analytics cookies.")}
        </p>

        <h2>{tx(locale, "2. Informasi publik dan privat", "2. Public and private information")}</h2>
        <ul>
          <li><strong>{tx(locale, "Selalu publik:", "Always public:")}</strong> {tx(locale, "proyek dan isinya, kolom profil yang kamu isi, jejak aktivitas selain jenis yang kamu sembunyikan, komentar, dan pengikut.", "projects and their content, profile fields you fill in, your activity trail except kinds you hide, comments, and follows.")}</li>
          <li><strong>{tx(locale, "Selalu privat:", "Always private:")}</strong> {tx(locale, "email akun (kecuali ditambahkan sebagai email publik), kata sandi, isi kotak masuk, isi proposal sebelum keputusan dibuat, dan masukan yang kamu kirim.", "your account email unless added as a public email, your password, inbox contents, proposal contents before a decision is made, and any feedback you send.")}</li>
        </ul>

        <h2>{tx(locale, "3. Penggunaan data", "3. How data is used")}</h2>
        <p>
          {tx(locale, "Data digunakan untuk menjalankan fitur yang kamu lihat: menampilkan proyek dan profil, mempertemukan orang dengan peran, mengirim pemberitahuan pengajuan, serta membangun jejak aktivitas. Data tidak dijual dan tidak digunakan untuk iklan bertarget.", "Data is used to run the features you see: showing projects and profiles, matching people to roles, sending application notices, and building activity trails. It is not sold or used for targeted advertising.")}
        </p>

        <h2>{tx(locale, "4. Penyedia layanan", "4. Service providers")}</h2>
        <p>{tx(locale, "Data hanya dibagikan dengan penyedia yang menjalankan situs ini:", "Data is only shared with providers that run this site:")}</p>
        <ul>
          <li><strong>Supabase</strong> — {tx(locale, "basis data dan autentikasi, termasuk penyimpanan kata sandi dan sesi.", "database and authentication, including password storage and sessions.")}</li>
          <li><strong>Google</strong> — {tx(locale, "hanya jika kamu memilih masuk dengan akun Google.", "only if you choose to sign in with a Google account.")}</li>
          <li><strong>Netlify</strong> — {tx(locale, "hosting aplikasi.", "application hosting.")}</li>
          <li><strong>GitHub API</strong> — {tx(locale, "hanya saat kamu menggunakan fitur impor repositori publik.", "only when you use the public repository import feature.")}</li>
        </ul>

        <h2>{tx(locale, "5. Keamanan", "5. Security")}</h2>
        <p>
          {tx(locale, "Akses data dibatasi langsung di basis data melalui row level security Postgres. Tindakan sensitif, seperti memutuskan pengajuan atau memindahkan tugas, dijalankan melalui fungsi basis data yang dibatasi.", "Data access is restricted directly in the database through Postgres row level security. Sensitive actions, such as deciding an application or moving a task, run through restricted database functions.")}
        </p>

        <h2>{tx(locale, "6. Kendali yang kamu miliki", "6. Your controls")}</h2>
        <p>
          {tx(locale, "Kamu dapat mengedit atau mengosongkan kolom profil, menyembunyikan jenis aktivitas tertentu, menghapus proyek milikmu, dan keluar dari akun. Penghapusan akun belum tersedia secara mandiri; untuk meminta penghapusan atau menanyakan data, kirim email ke zikrulihsanmd@gmail.com.", "You can edit or clear profile fields, hide specific activity kinds, delete projects you own, and sign out. Account deletion is not yet self-service; to request deletion or ask about your data, email zikrulihsanmd@gmail.com.")}
        </p>

        <h2>{tx(locale, "7. Anak-anak", "7. Children")}</h2>
        <p>{tx(locale, "Situs ini tidak ditujukan untuk anak di bawah 13 tahun dan kami tidak dengan sengaja mengumpulkan data mereka.", "This site is not directed at children under 13, and we do not knowingly collect their data.")}</p>

        <h2>{tx(locale, "8. Perubahan kebijakan", "8. Changes to this policy")}</h2>
        <p>{tx(locale, "Builders masih aktif dikembangkan, sehingga kebijakan ini dapat berubah mengikuti fitur. Tanggal di bawah menunjukkan versi terbaru.", "Builders is under active development, so this policy may change with its features. The date below reflects the latest version.")}</p>

        <p className="muted" style={{ marginTop: 40 }}>
          {tx(locale, "Terakhir diperbarui: 29 Agustus 2026.", "Last updated: August 29, 2026.")}
        </p>
      </main>

      <SiteFooter />
    </>
  );
}
