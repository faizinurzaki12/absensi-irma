// 1. Konfigurasi URL Supabase Anda yang sudah diperbaiki (tanpa typo b dan g)
const SUPABASE_URL = "https://shbagbqrcmzqxdjcacsz.supabase.co";

// 2. Kunci Anon publik Anda (WAJIB diganti dengan kunci dari dashboard)
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoYmFnYnFyY216cXhkamNhY3N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NDI1NDcsImV4cCI6MjEwMTUxODU0N30.bQXtOcl745PwobDuq6v8VMSod7jTP-reWrLZy04d9q4";

// Inisialisasi aman tanpa konflik deklarasi ganda
if (!window.supabaseClient) {
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
const supabase = window.supabaseClient;

// Proteksi halaman (wajib login)
async function requireAuth() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error || !session) {
    window.location.href = "index.html";
    return null;
  }
  return session;
}

// Cek sesi di halaman login
async function redirectIfLoggedIn() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) {
    window.location.href = "siswa.html";
  }
}

// Fungsi Logout
async function logout() {
  await supabase.auth.signOut();
  window.location.href = "index.html";
}
