# AquaSense Borikamase

**Sistem Monitoring Kualitas Air Real-Time Berbasis IoT dengan Kalman Filter — Desa Borikamase, Maros Baru**

Repository ini merupakan dokumentasi source code tugas akhir berjudul:

> **"Implementasi Algoritma Kalman Filter pada Sistem Monitoring Kualitas Air Secara Real-Time
> Berbasis Internet of Things Menggunakan Node-RED (Studi Kasus: Desa Borikamase, Maros Baru)"**

Pada tahap ini, repository berisi source code **Website AquaSense** (React + Vite). Firmware ESP32
dan flow Node-RED akan ditambahkan pada tahap pengembangan repository berikutnya.

---

## 1. Deskripsi Singkat Sistem

AquaSense Borikamase adalah sistem monitoring kualitas air berbasis Internet of Things (IoT).
Perangkat ESP32 membaca tiga parameter kualitas air, yaitu **pH**, **TDS** (ppm), dan
**Turbidity / kekeruhan** (NTU), kemudian mengirimkan data melalui MQTT ke Node-RED. Node-RED
melakukan validasi data, menerapkan algoritma **Kalman Filter** untuk mereduksi fluktuasi (noise)
pembacaan sensor, mengklasifikasikan kualitas air (**GOOD / WARNING / DANGER**), menyimpan data ke
MySQL, serta mengirim notifikasi Telegram.

Website AquaSense berfungsi sebagai antarmuka untuk menampilkan data tersebut secara real-time
kepada masyarakat dan administrator. Website **tidak** melakukan filter ulang maupun klasifikasi
ulang — seluruh nilai mentah (raw), nilai hasil Kalman Filter (filtered), dan status kualitas
berasal dari Node-RED.

## 2. Tujuan Pengembangan Sistem

1. Menyediakan pemantauan kualitas air Desa Borikamase secara real-time yang dapat diakses
   masyarakat tanpa login.
2. Menerapkan algoritma Kalman Filter untuk menghasilkan nilai pengukuran sensor yang lebih stabil.
3. Menyajikan perbandingan data raw dan filtered beserta evaluasi performa Kalman Filter.
4. Menyimpan riwayat pengukuran sehingga data dapat ditelusuri dan diekspor.
5. Memberikan notifikasi kepada pengelola melalui Telegram ketika status kualitas air berubah.

---

## 3. Arsitektur Singkat Sistem

```
ESP32 (pH, TDS, Turbidity)
   │  MQTT
   ▼
Mosquitto Broker ──► Node-RED ──► Validasi ──► Kalman Filter ──► Klasifikasi Kualitas ──► MySQL
                        │
                        ├── REST API  (/api/*)          ──► Website AquaSense (riwayat, statistik, autentikasi)
                        ├── WebSocket (/ws/aquasense)   ──► Website AquaSense (data real-time)
                        └── Telegram Bot API            ──► Notifikasi perubahan status kualitas
```

Website terhubung ke Node-RED melalui REST API dan WebSocket. Apabila koneksi WebSocket terputus,
website melakukan koneksi ulang secara otomatis dan sementara mengambil data terbaru melalui
polling REST API.

---

## 4. Teknologi yang Digunakan

| Kategori | Teknologi |
|---|---|
| Framework UI | React 19 |
| Build tool | Vite 8 |
| Routing | React Router 7 |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`) |
| Grafik | Recharts 3 |
| Ikon | lucide-react |
| Linting | ESLint 10 |
| Backend (terpisah, belum diunggah) | Node-RED, MQTT (Mosquitto), MySQL, Telegram Bot API |
| Perangkat (terpisah, belum diunggah) | ESP32 |

---

## 5. Fitur Website

- **Monitoring real-time** melalui WebSocket, dengan koneksi ulang otomatis dan polling cadangan.
- **Indikator status data LIVE / WAITING FOR DATA / OFFLINE.** Data dianggap LIVE bila pembacaan
  terbaru berumur kurang dari ambang kesegaran (default 180 detik, atau nilai dari `/api/config`).
  Nilai terakhir tetap ditampilkan pada semua status.
- **Grafik raw vs filtered** untuk setiap parameter sensor.
- **Riwayat pengukuran** dengan filter rentang tanggal, sesi pengukuran, dan status kualitas.
- **Sesi pengukuran** Pagi, Siang, dan Sore (daftar sesi diambil dari backend).
- **Zona waktu WITA** (Asia/Makassar, UTC+8) untuk seluruh tampilan dan filter.
- **Evaluasi Kalman Filter** (standard deviation dan fluktuasi pengukuran sebelum/sesudah filter).
- **Ekspor data** ke CSV dan Excel (XLSX) pada halaman admin, serta ekspor grafik ke PNG.
- **Status perangkat dan integrasi sistem** (ESP32, MQTT, Node-RED, MySQL, WebSocket, Telegram).
- **Autentikasi admin** berbasis sesi server (cookie `HttpOnly`); website tidak menyimpan token
  maupun password.
- **Tema gelap (default) dan terang**, disimpan per browser.

---

## 6. Halaman Publik (tanpa login)

### 6.1 Halaman Monitoring (`/`)

Halaman utama untuk masyarakat yang menampilkan:

- Status kualitas air terkini (GOOD / WARNING / DANGER) dan indikator LIVE / WAITING / OFFLINE.
- Kartu sensor pH, TDS, dan Turbidity beserta gauge dan status masing-masing sensor.
- Ringkasan jumlah pembacaan hari ini.
- Grafik real-time perbandingan nilai raw dan filtered.
- Distribusi status kualitas air hari ini.
- Tabel ambang batas (threshold) klasifikasi kualitas air.

### 6.2 Halaman History (`/history`)

Menampilkan riwayat data pengukuran yang tersimpan di database, dengan:

- Filter rentang tanggal, sesi pengukuran, dan status kualitas.
- Ringkasan statistik sesuai filter yang dipilih.
- Tabel data pengukuran dengan paginasi.

---

## 7. Halaman Admin

Halaman admin diakses melalui **`/login`** dan dilindungi oleh sesi login. Seluruh route
`/admin/*` hanya dapat dibuka setelah autentikasi berhasil.

| Route | Halaman | Keterangan |
|---|---|---|
| `/admin/dashboard` | Dashboard | Ringkasan sensor, data reading, grafik raw vs filtered, dan status sistem |
| `/admin/monitoring` | Real-Time Monitoring | Pemantauan data sensor secara real-time |
| `/admin/data-reading` | Data Reading | Ringkasan statistik sensor, jumlah pembacaan, dan distribusi kualitas berdasarkan filter tanggal dan sesi |
| `/admin/history` | Monitoring History | Riwayat data + ekspor CSV / Excel |
| `/admin/kalman` | Kalman Filter Analysis | Lihat bagian 8 |
| `/admin/integration` | System Integration | Status integrasi ESP32, MQTT, Node-RED, MySQL, WebSocket, dan Telegram |
| `/admin/telegram` | Telegram Notification | Riwayat notifikasi, kirim ulang, hapus, dan kirim pesan uji |
| `/admin/settings` | Settings | Informasi konfigurasi sistem dan pengaturan tema |
| `/admin/profile` | Profile | Profil admin, foto profil, dan penggantian password |

---

## 8. Halaman Kalman Analysis (`/admin/kalman`)

Halaman analisis algoritma Kalman Filter yang terdiri dari:

1. **Sensor Accuracy Evaluation** — hasil pengujian akurasi sensor terhadap alat ukur referensi
   (akurasi, MAE, dan RMSE). Nilai ini merupakan hasil pengujian yang dicantumkan langsung pada
   website dan tidak dihitung ulang dari data monitoring.
2. **Filter Performance Evaluation** — dihitung dari data yang tersimpan di database sesuai
   rentang tanggal dan sesi yang dipilih:
   - *Standard Deviation*: SD Raw, SD Filtered, dan SD Reduction.
   - *Measurement Fluctuation*: Fluctuation Raw, Fluctuation Filtered, dan Fluctuation Reduction.
3. **Kalman Filter Visualization** — grafik perbandingan nilai raw dan filtered untuk setiap
   parameter, dengan filter tanggal/sesi dan fitur ekspor grafik ke PNG.

---

## 9. Struktur Folder Repository

```
aquasense-borikamase/
├── README.md
├── .gitignore
└── website/                 ← Website AquaSense (React + Vite)
    ├── public/              ← favicon
    ├── src/
    │   ├── components/      ← SensorCard, GaugeWidget, grafik Kalman, layout (Sidebar, TopHeader, Footer), …
    │   ├── constants/       ← parameter sensor, navigasi, data evaluasi
    │   ├── context/         ← MonitoringContext (WebSocket), AuthContext, ThemeContext
    │   ├── hooks/           ← hooks pengambilan data
    │   ├── layouts/         ← layout publik dan admin
    │   ├── pages/           ← public/, admin/, Login.jsx
    │   ├── services/        ← klien REST API (api.js)
    │   ├── utils/           ← format WITA, statistik, kualitas air, ekspor CSV/XLSX/PNG, dll.
    │   ├── App.jsx          ← konfigurasi routing
    │   ├── config.js        ← konfigurasi URL API/WebSocket
    │   ├── index.css        ← tema dan styling Tailwind CSS
    │   └── main.jsx
    ├── .env.example         ← contoh konfigurasi (tanpa rahasia)
    ├── eslint.config.js
    ├── index.html
    ├── package.json
    ├── package-lock.json
    └── vite.config.js       ← konfigurasi Vite + proxy ke Node-RED
```

---

## 10. Persyaratan Instalasi

- **Node.js** 20.19+ atau 22.12+ (dikembangkan dengan Node.js 24) beserta **npm**.
- **Git**.
- **Backend Node-RED AquaSense** yang sedang berjalan (default `http://localhost:1880`).
  Tanpa Node-RED, website tetap dapat dibuka, tetapi akan menampilkan status OFFLINE dan tidak
  menampilkan data.

## 11. Instalasi Dependensi

```bash
git clone https://github.com/lizzamirizza-tech/aquasense-borikamase.git
cd aquasense-borikamase/website
npm install
```

## 12. Menjalankan Website Secara Lokal

```bash
# Salin file konfigurasi contoh
cp .env.example .env            # Windows PowerShell: Copy-Item .env.example .env

# Jalankan server pengembangan
npm run dev                     # buka http://localhost:5173
```

Perintah lainnya:

| Perintah | Keterangan |
|---|---|
| `npm run dev -- --host` | Server pengembangan yang dapat diakses dari perangkat lain di jaringan yang sama |
| `npm run build` | Build produksi ke folder `dist/` |
| `npm run preview` | Menjalankan hasil build (proxy ke Node-RED tetap aktif) |
| `npm run lint` | Pemeriksaan kode dengan ESLint |

---

## 13. Konfigurasi Koneksi ke Backend Node-RED

Website berkomunikasi dengan Node-RED melalui **proxy Vite** (`website/vite.config.js`).
Setiap request `/api/*` dan koneksi WebSocket `/ws/*` dari browser diteruskan ke Node-RED,
sehingga website dan API berada pada origin yang sama dan cookie sesi admin dapat bekerja.

### Variabel lingkungan (`website/.env`)

| Variabel | Default | Keterangan |
|---|---|---|
| `NODE_RED_URL` | `http://localhost:1880` | Alamat Node-RED untuk proxy Vite (hanya dibaca di sisi server Vite) |
| `VITE_API_URL` | *(kosong)* | Diisi hanya bila website **tidak** dilayani melalui proxy |
| `VITE_WS_URL` | *(kosong)* | Diisi hanya bila website **tidak** dilayani melalui proxy |

> ⚠️ Jangan menaruh rahasia apa pun pada variabel `VITE_*`, karena nilainya ikut masuk ke kode
> JavaScript di browser. File `.env` tidak disertakan dalam repository; gunakan `.env.example`
> sebagai acuan.

### Endpoint yang digunakan website

**WebSocket:** `/ws/aquasense` — pengiriman data pembacaan terbaru secara real-time.

**Publik:**

| Method | Endpoint |
|---|---|
| GET | `/api/health`, `/api/config` |
| GET | `/api/water/latest`, `/api/water/history` |
| GET | `/api/water/readings` — parameter `from, to, session, quality, search, page, pageSize` |
| GET | `/api/water/summary` — parameter filter yang sama |
| GET | `/api/water/series` — parameter `range=15m\|1h\|24h\|all\|custom, from, to, max` |
| GET | `/api/water/metrics` — parameter `from, to` |
| POST | `/api/auth/login` |

**Admin (memerlukan sesi login):**

| Method | Endpoint |
|---|---|
| GET | `/api/auth/me`, `/api/auth/session` |
| POST | `/api/auth/logout` |
| PUT | `/api/admin/profile` |
| GET / PUT / DELETE | `/api/admin/profile/photo` |
| POST | `/api/admin/password` |
| GET | `/api/admin/export`, `/api/admin/notifications`, `/api/admin/audit`, `/api/admin/system` |
| POST | `/api/admin/telegram/test` |
| POST | `/api/admin/notifications/:id/send` |
| DELETE | `/api/admin/notifications/:id` |

### Kredensial

Kredensial berikut dikonfigurasi di sisi backend (Node-RED / server) dan **tidak disimpan di
repository ini**:

- Akun database MySQL.
- Akun broker MQTT.
- Token bot dan chat ID Telegram.
- Akun administrator website.

---

## 14. Pengembangan Repository Berikutnya

Repository ini belum mencakup dokumentasi seluruh sistem. Pada tahap berikutnya akan ditambahkan:

| Folder | Isi |
|---|---|
| `firmware/` | Firmware utama ESP32, kode pengujian sensor, dan kode kalibrasi |
| `node-red/` | Export flow Node-RED, function node, dan file SQL yang digunakan dalam implementasi |

Setiap komponen ditempatkan pada folder masing-masing, sehingga `firmware/` dan `node-red/` dapat
ditambahkan tanpa mengubah folder `website/`.

---

Dikembangkan untuk keperluan penelitian tugas akhir — AquaSense Borikamase, Desa Borikamase, Maros Baru.
