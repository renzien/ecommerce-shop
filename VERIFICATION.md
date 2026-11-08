# Pemeriksaan paket Ayyashop

Pemeriksaan berikut dijalankan pada kode dalam paket ini:

- `npm run typecheck`: lulus.
- `npm run build`: lulus sebagai build produksi Next.js.
- `npm ls --depth=0`: seluruh dependensi langsung terpasang sesuai versi yang dikunci.
- `scripts/smoke.mjs`: 19 pemeriksaan API lulus dalam mode demo lokal.
- Server produksi: halaman toko dan katalog merespons HTTP 200; API admin menolak pengunjung tanpa login dengan HTTP 401.
- Browser: login admin, pencarian, favorit, detail produk, jumlah barang, keranjang, formulir checkout, pengaturan WhatsApp, pratinjau pesan, label QRIS, menu admin, dan formulir produk diperiksa.
- Tata letak desktop dan ponsel diperiksa, termasuk viewport 1280px dan 390px. Halaman toko serta dashboard tidak melebar keluar viewport ponsel. Gambar produk dimuat dari aset lokal.
- Konsol halaman toko pada build produksi tidak menunjukkan error saat diperiksa.

Tes API mencakup penolakan akses anonim, pemeriksaan origin, password salah, cookie sesi, pemisahan nomor WhatsApp dari katalog publik, validasi template, sakelar QRIS, pengelolaan produk, URL gambar, jumlah barang, perhitungan ulang harga, pencegahan pesanan ganda, redirect WhatsApp, token palsu, pengurangan stok, stok tidak cukup, pengembalian stok, dan batas perpindahan status.

Redirect WhatsApp diperiksa tanpa mengunjungi layanan WhatsApp atau mengirim pesan. Nomor uji dan data pesanan uji tidak disertakan dalam ZIP.

## Batas pemeriksaan

MongoDB Atlas dan Vercel belum dihubungkan karena koneksi akan ditambahkan saat deployment. Koneksi database produksi, transaksi stok pada cluster Atlas, dan deployment Vercel belum diuji secara langsung. Implementasi MongoDB telah melewati pemeriksaan TypeScript dan build; tes perilaku saat ini menggunakan penyimpanan demo lokal.

QRIS sengaja hanya berupa opsi Coming soon yang dapat ditampilkan atau disembunyikan. Pembayaran dan ongkir dikonfirmasi manual lewat WhatsApp.
