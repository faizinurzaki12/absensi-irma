// 1. Konfigurasi URL Supabase Anda yang sudah diperbaiki (tanpa typo b dan g)
const SUPABASE_URL = "https://shbagbqrcmzqxdjcacsz.supabase.co";

// 2. Kunci Anon publik Anda (WAJIB diganti dengan kunci dari dashboard)
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoYmFnYnFyY216cXhkamNhY3N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NDI1NDcsImV4cCI6MjEwMTUxODU0N30.bQXtOcl745PwobDuq6v8VMSod7jTP-reWrLZy04d9q4";

// Inisialisasi aman tanpa konflik deklarasi ganda
if (!window.supabaseClient) {
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
const supabase = window.supabaseClient;

/**
 * Saat offline, getSession() bisa gagal kalau token perlu di-refresh
 * ke server. Fallback ini membaca sesi langsung dari localStorage
 * (tempat supabase-js menyimpan sesi login) supaya petugas tetap
 * bisa masuk & bekerja walau tidak ada sinyal — SELAMA dia pernah
 * login minimal sekali sebelumnya saat online.
 */
function _bacaSesiOfflineDariStorage() {
  try {
    const key = Object.keys(localStorage).find((k) => k.startsWith("sb-") && k.endsWith("-auth-token"));
    if (!key) return null;
    const parsed = JSON.parse(localStorage.getItem(key));
    const sesi = parsed?.currentSession || parsed;
    if (sesi?.user) return sesi;
  } catch (e) {
    /* abaikan, dianggap tidak ada sesi tersimpan */
  }
  return null;
}

// Proteksi halaman (wajib login)
async function requireAuth() {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) return session;
  } catch (e) {
    // getSession bisa melempar error saat offline & butuh refresh ke server
  }

  if (!navigator.onLine) {
    const sesiOffline = _bacaSesiOfflineDariStorage();
    if (sesiOffline) return sesiOffline;
  }

  window.location.href = "/";
  return null;
}

// Cek sesi di halaman login
async function redirectIfLoggedIn() {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      window.location.href = "/siswa";
      return;
    }
  } catch (e) {
    /* lanjut cek fallback di bawah */
  }

  if (!navigator.onLine && _bacaSesiOfflineDariStorage()) {
    window.location.href = "/siswa";
  }
}

// Fungsi Logout
async function logout() {
  await supabase.auth.signOut();
  window.location.href = "/"
}
