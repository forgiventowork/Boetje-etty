-- Buat tabel app_state untuk menyimpan JSON data
CREATE TABLE app_state (
    id INT PRIMARY KEY,
    data JSONB NOT NULL
);

-- Atur agar bisa diakses public (karena ini tanpa authentication)
-- Perhatian: RLS (Row Level Security) dimatikan untuk kesederhanaan.
-- Jika aplikasi ini digunakan untuk publik, pastikan RLS dinyalakan sesuai aturan Anda.
ALTER TABLE app_state DISABLE ROW LEVEL SECURITY;
