// ==========================================================
// assets/js/offline-store.js
// Mesin data "local-first": semua baca & tulis (CRUD) untuk
// tabel_siswa, tabel_absensi, tabel_users tetap bisa jalan
// walau offline, lalu otomatis disinkronkan ke Supabase saat
// koneksi kembali online.
//
// Cara kerja singkat:
// - Setiap tabel punya "cache" tersendiri di localStorage,
//   isinya salinan data terakhir dari server + perubahan lokal
//   yang belum sempat terkirim.
// - Setiap perubahan (insert/update/delete/upsert) langsung
//   diterapkan ke cache (agar tampil seketika di layar) DAN
//   dicatat di satu antrean sinkronisasi global.
// - Saat online, antrean diproses satu per satu ke Supabase.
//   Baris baru yang dibuat offline punya "id sementara" yang
//   nanti ditukar otomatis dengan id asli dari server, termasuk
//   memperbaiki referensi (mis. absensi yang menunjuk ke siswa
//   yang juga baru dibuat offline).
// ==========================================================

const DB_PREFIX = "irma_db_";
const QUEUE_KEY = "irma_sync_queue";
let _sedangSinkron = false;

// ---------- Util penyimpanan lokal ----------
function _getCache(table) {
  const raw = localStorage.getItem(DB_PREFIX + table);
  return raw ? JSON.parse(raw) : [];
}

function _setCache(table, rows) {
  localStorage.setItem(DB_PREFIX + table, JSON.stringify(rows));
}

function _getQueue() {
  const raw = localStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function _setQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function _idSementara() {
  return "tmp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
}

// ---------- BACA DATA (read) ----------
/**
 * Ambil semua baris sebuah tabel. Kalau online, cache disegarkan
 * dulu dari Supabase (baris yang masih pending tetap dipertahankan).
 * Kalau offline (atau fetch gagal), langsung pakai cache lokal.
 */
async function dbSelect(table) {
  if (navigator.onLine) {
    try {
      const { data, error } = await supabase.from(table).select("*");
      if (!error && data) {
        const pending = _getCache(table).filter((r) => r._pending);
        _setCache(table, [...data, ...pending]);
      }
    } catch (e) {
      // gagal ambil dari server -> lanjut pakai cache yang ada
    }
  }
  return _getCache(table).filter((r) => !r._deleted);
}

// ---------- TULIS DATA (create/update/delete) ----------
async function dbInsert(table, payload) {
  const cache = _getCache(table);
  const tempId = _idSementara();
  const row = { ...payload, id: tempId, _pending: true, created_at: new Date().toISOString() };
  cache.push(row);
  _setCache(table, cache);

  const queue = _getQueue();
  queue.push({ table, op: "insert", tempId, payload });
  _setQueue(queue);

  if (navigator.onLine) await prosesAntreanSinkronisasi();
  return row;
}

async function dbUpdate(table, id, payload) {
  const cache = _getCache(table);
  const idx = cache.findIndex((r) => String(r.id) === String(id));
  if (idx >= 0) cache[idx] = { ...cache[idx], ...payload };
  _setCache(table, cache);

  const queue = _getQueue();
  // Kalau baris ini masih berupa "insert" yang belum sempat terkirim,
  // cukup gabungkan perubahan ke payload insert-nya (tidak perlu op baru)
  const insertTertunda = queue.find((q) => q.op === "insert" && q.tempId === id);
  if (insertTertunda) {
    insertTertunda.payload = { ...insertTertunda.payload, ...payload };
  } else {
    queue.push({ table, op: "update", targetId: id, payload });
  }
  _setQueue(queue);

  if (navigator.onLine) await prosesAntreanSinkronisasi();
}

async function dbDelete(table, id) {
  const cache = _getCache(table);
  const idx = cache.findIndex((r) => String(r.id) === String(id));
  const queue = _getQueue();

  const insertTertunda = queue.some((q) => q.op === "insert" && q.tempId === id);
  if (insertTertunda) {
    // Baris ini belum pernah sampai ke server -> batalkan saja
    _setQueue(queue.filter((q) => !(q.op === "insert" && q.tempId === id)));
    if (idx >= 0) cache.splice(idx, 1);
    _setCache(table, cache);
    return;
  }

  if (idx >= 0) cache[idx]._deleted = true;
  _setCache(table, cache);

  queue.push({ table, op: "delete", targetId: id });
  _setQueue(queue);

  if (navigator.onLine) await prosesAntreanSinkronisasi();
}

/**
 * Upsert dipakai untuk baris yang id-nya sudah pasti sejak awal
 * (mis. tabel_users, id = uid akun yang login), jadi tidak perlu
 * id sementara.
 */
async function dbUpsert(table, id, payload) {
  const cache = _getCache(table);
  const idx = cache.findIndex((r) => String(r.id) === String(id));
  const rowBaru = { ...payload, id };
  if (idx >= 0) cache[idx] = { ...cache[idx], ...rowBaru };
  else cache.push(rowBaru);
  _setCache(table, cache);

  const queue = _getQueue();
  queue.push({ table, op: "upsert", targetId: id, payload: rowBaru });
  _setQueue(queue);

  if (navigator.onLine) await prosesAntreanSinkronisasi();
}

// ---------- SINKRONISASI KE SUPABASE ----------
async function prosesAntreanSinkronisasi() {
  if (_sedangSinkron || !navigator.onLine) return;
  _sedangSinkron = true;

  try {
    const queue = _getQueue();
    if (queue.length === 0) {
      if (typeof perbaruiInfoAntrean === "function") perbaruiInfoAntrean();
      return;
    }

    const idMap = {}; // id sementara -> id asli dari server
    const sisaGagal = [];

    for (const item of queue) {
      try {
        if (item.op === "insert") {
          const payload = _terapkanIdMap(item.table, item.payload, idMap);
          const { data, error } = await supabase.from(item.table).insert(payload).select().single();
          if (error) throw error;
          idMap[item.tempId] = data.id;
          _gantiIdCache(item.table, item.tempId, data);
        } else if (item.op === "update") {
          const realId = idMap[item.targetId] || item.targetId;
          const payload = _terapkanIdMap(item.table, item.payload, idMap);
          const { error } = await supabase.from(item.table).update(payload).eq("id", realId);
          if (error) throw error;
        } else if (item.op === "upsert") {
          const { error } = await supabase.from(item.table).upsert(item.payload);
          if (error) throw error;
        } else if (item.op === "delete") {
          const realId = idMap[item.targetId] || item.targetId;
          const { error } = await supabase.from(item.table).delete().eq("id", realId);
          if (error) throw error;
          _hapusDariCache(item.table, item.targetId);
        }
      } catch (err) {
        console.error("Gagal sinkron item:", item, err?.message || err);
        sisaGagal.push(item);
      }
    }

    _setQueue(sisaGagal);

    // Perbaiki referensi siswa_id di cache absensi yang tadinya menunjuk ke id sementara
    if (Object.keys(idMap).length > 0) {
      const cacheAbsensi = _getCache("tabel_absensi");
      cacheAbsensi.forEach((row) => {
        if (idMap[row.siswa_id] !== undefined) row.siswa_id = idMap[row.siswa_id];
      });
      _setCache("tabel_absensi", cacheAbsensi);
    }

    if (sisaGagal.length === 0 && queue.length > 0 && typeof tampilkanNotifikasiSync === "function") {
      tampilkanNotifikasiSync(`${queue.length} perubahan berhasil disinkronkan.`);
    }
    if (typeof perbaruiInfoAntrean === "function") perbaruiInfoAntrean();
  } finally {
    _sedangSinkron = false;
  }
}

function _terapkanIdMap(table, payload, idMap) {
  if (table === "tabel_absensi" && payload.siswa_id && idMap[payload.siswa_id] !== undefined) {
    return { ...payload, siswa_id: idMap[payload.siswa_id] };
  }
  return payload;
}

function _gantiIdCache(table, tempId, dataAsli) {
  const cache = _getCache(table);
  const idx = cache.findIndex((r) => r.id === tempId);
  if (idx >= 0) cache[idx] = { ...dataAsli, _pending: false };
  _setCache(table, cache);
}

function _hapusDariCache(table, id) {
  const cache = _getCache(table).filter((r) => String(r.id) !== String(id));
  _setCache(table, cache);
}

function jumlahAntreanOffline() {
  return _getQueue().length;
}

// Sinkron otomatis begitu koneksi kembali online
window.addEventListener("online", () => prosesAntreanSinkronisasi());
