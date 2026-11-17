-- ==========================================================
-- Migrasi Supabase: tabel kegiatan kumpulan IRMA
-- Jalankan file ini lewat Supabase SQL Editor sebelum fitur
-- kegiatan dipakai, karena tabel baru tidak dibuat otomatis.
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.tabel_kegiatan (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  judul_kumpulan text NOT NULL,
  tanggal_kegiatan date NOT NULL,
  isi_kegiatan text NOT NULL,
  user_id uuid DEFAULT auth.uid(),
  CONSTRAINT tabel_kegiatan_pkey PRIMARY KEY (id),
  CONSTRAINT tabel_kegiatan_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE SET NULL
);

-- Aktifkan Row Level Security agar petugas hanya mengubah datanya sendiri.
ALTER TABLE public.tabel_kegiatan ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama dulu agar migrasi bisa dijalankan ulang dengan aman.
DROP POLICY IF EXISTS "Kegiatan dapat dibaca petugas" ON public.tabel_kegiatan;
DROP POLICY IF EXISTS "Kegiatan dapat ditambah petugas" ON public.tabel_kegiatan;
DROP POLICY IF EXISTS "Kegiatan dapat diubah petugas" ON public.tabel_kegiatan;
DROP POLICY IF EXISTS "Kegiatan dapat dihapus petugas" ON public.tabel_kegiatan;

CREATE POLICY "Kegiatan dapat dibaca petugas"
  ON public.tabel_kegiatan FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Kegiatan dapat ditambah petugas"
  ON public.tabel_kegiatan FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Kegiatan dapat diubah petugas"
  ON public.tabel_kegiatan FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Kegiatan dapat dihapus petugas"
  ON public.tabel_kegiatan FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
