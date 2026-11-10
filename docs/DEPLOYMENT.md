# PANDUAN DEPLOYMENT — HITUNG BANTER

Aplikasi frontend dibuat menggunakan Vite + React + TypeScript + Tailwind CSS, sehingga sangat optimal dan siap di-deploy secara instan ke **Vercel** maupun **Cloudflare Pages**.

Aplikasi ini sudah dilengkapi dengan **Engine Lokal Reaktif** (`localStorage`) serta **Fallback Autentikasi Mandiri**, sehingga dapat langsung digunakan tanpa memerlukan backend server atau database Supabase aktif.

---

## 1. Hosting Cepat di Vercel (Rekomendasi untuk Tahap Awal)

Proyek ini telah dilengkapi file konfigurasi `vercel.json` untuk SPA routing otomatis.

### Langkah Deploy ke Vercel:
1. Buka dashboard [vercel.com](https://vercel.com) dan login dengan akun GitHub / GitLab Anda.
2. Klik **Add New...** > **Project**.
3. Import repository GitHub `hitung-banter`.
4. Pengaturan Build & Output Settings:
   - **Framework Preset**: `Vite` (terdeteksi otomatis)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. (Opsional) Environment Variables:
   - Kosongkan untuk sementara jika belum menggunakan Supabase. Aplikasi akan otomatis berjalan dalam mode **Engine Lokal Reaktif**.
6. Klik **Deploy**.
7. Setelah selesai dideploy, buka URL yang diberikan oleh Vercel. Anda dapat langsung login menggunakan:
   - **Username**: `admin_banter`
   - **Password**: `bantermas99`

---

## 2. Hosting di Cloudflare Pages / Workers
Aplikasi juga dapat di-deploy ke **Cloudflare Pages**.

### Langkah Deploy ke Cloudflare Pages:
1. Hubungkan repository GitHub ke akun Cloudflare Dashboard.
2. Pilih **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3. Pengaturan Build:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Output directory**: `dist`
   - **Node.js version**: `20` atau lebih baru
4. Klik **Save and Deploy**.

---

## 3. Menghubungkan Supabase PostgreSQL (Jika Siap Lanjut ke Tahap Cloud Database)
1. Buka [database.new](https://database.new) untuk membuat proyek Supabase baru.
2. Masuk ke menu **SQL Editor** di dashboard Supabase.
3. Jalankan file migrasi dari folder `supabase/migrations/`:
   - `20261109000000_hitung_banter_schema.sql`
   - `20261109000001_order_gabungan_schema.sql`
   - `20261109000002_driver_tracking_schema.sql`
   - `20261109000003_admin_auth_rls.sql`
4. Masuk ke **Project Settings** > **API**. Salin **Project URL** dan **anon public key**.
5. Buka aplikasi HITUNG BANTER > menu **Pengaturan** > tab **Koneksi Supabase & Backup**, lalu tempelkan URL dan Key tersebut untuk mengaktifkan sinkronisasi cloud.
