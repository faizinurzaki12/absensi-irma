-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.tabel_users (
  id uuid NOT NULL,
  nama_petugas text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tabel_users_pkey PRIMARY KEY (id),
  CONSTRAINT tabel_users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.tabel_siswa (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  nama_siswa text NOT NULL,
  kelas text NOT NULL,
  user_id uuid DEFAULT auth.uid(),
  CONSTRAINT tabel_siswa_pkey PRIMARY KEY (id),
  CONSTRAINT tabel_siswa_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.tabel_absensi (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  tanggal_kegiatan date NOT NULL,
  siswa_id bigint,
  status_kehadiran text NOT NULL CHECK (status_kehadiran = ANY (ARRAY['Hadir'::text, 'Sakit'::text, 'Izin'::text, 'Alfa'::text])),
  user_id uuid DEFAULT auth.uid(),
  CONSTRAINT tabel_absensi_pkey PRIMARY KEY (id),
  CONSTRAINT tabel_absensi_siswa_id_fkey FOREIGN KEY (siswa_id) REFERENCES public.tabel_siswa(id),
  CONSTRAINT tabel_absensi_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);