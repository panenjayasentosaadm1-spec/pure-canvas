# Migrasi UsagiNime tahap pertama

- Pemeriksaan awal mengonfirmasi semua nama kolom dalam dokumen diterima oleh proyek `aqzavboruvlppnbflfse`; tipe yang tersimpan di aplikasi masih memakai beberapa nama lama. Login sudah memakai autentikasi asli dan pemeriksaan `has_role`, sehingga tidak perlu diganti.
- Pertahankan tampilan, alamat halaman, login, dan konfigurasi proyek yang ada.
- Sesuaikan tipe dan pemetaan kolom dengan skema yang telah dikonfirmasi melalui pembacaan layanan.
- Migrasikan API konten publik dan admin ke layanan yang sama; jangan gunakan data contoh sebagai cadangan produksi.
- Pertahankan pembatasan publikasi, hubungan genre, validasi domain video, dan penanganan kesalahan.
- Jangan menjalankan perubahan skema atau memindahkan unggahan ke penyimpanan baru.
- Jalankan tes API dan periksa hasil pemeriksaan otomatis; laporkan bagian yang memerlukan akun admin asli atau pengujian penyimpanan.

## Detail teknis

- Gunakan klien yang sudah tersedia, tanpa kunci istimewa.
- Perbaiki nama kolom `poster_path`, `number`, `thumbnail_path`, `alt_title`, dan `logo_path` pada tipe TypeScript.
- Fungsi gambar daftar harus menjadi asinkron; perbarui seluruh pemanggil tanpa mengubah tampilan.
- Operasi relasi beberapa permintaan tidak dapat dijamin atomik tanpa fungsi transaksi yang sudah tersedia; jangan menciptakan fungsi SQL baru.
- Pertahankan pemrosesan gambar yang ada. Petakan nilai tersimpan kembali ke alamat gambar tanpa menyimpan alamat sementara; verifikasi akses gambar privat sebelum mengklaim penyimpanan selesai.
- Jangan mengubah tombol pemulihan data contoh menjadi penghapusan atau pengisian ulang data jarak jauh; tolak tindakan itu secara aman selama migrasi.

## Validasi dan laporan

- Tambahkan tes pembacaan publik, induk anime yang tidak terbit, hasil kosong, kesalahan layanan, penolakan mutasi, hubungan genre, dan nama kolom.
- Jalankan seluruh tes tersedia dan periksa hasil build/typecheck otomatis.
- Laporkan berkas yang berubah, API yang sudah dimigrasikan, sisa penggunaan data contoh, hasil tes, asumsi, serta langkah verifikasi manual.
- Pemeriksaan skema lengkap/RLS melalui alat terkelola tidak tersedia. Pembacaan kolom melalui layanan berhasil, tetapi kebijakan akses aktual, gambar privat, dan mutasi dengan akun admin tetap perlu diverifikasi; tidak akan dinyatakan lulus hanya berdasarkan tes tiruan.