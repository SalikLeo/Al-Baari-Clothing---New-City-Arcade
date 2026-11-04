/**
 * Al-Baari Modest Attire - Supabase Cloud Sync Engine
 * 
 * Provides cloud snapshot backup and restore across multiple laptops.
 * The Electron app stays 100% offline-first with local SQLite.
 */

const os = require('os');
const path = require('path');
const fs = require('fs');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dcjulrzicedexpntvloe.supabase.co';
const DEFAULT_KEY_B64 = 'c2Jfc2VjcmV0Xzc1U2hjR2d5NjV4UHM5eDN4X1lWMEFfM0hIQTRYcV8=';
const SUPABASE_KEY = process.env.SUPABASE_KEY || Buffer.from(DEFAULT_KEY_B64, 'base64').toString('utf8');

let dbInstance = null;

function setDb(db) {
  dbInstance = db;
}

async function supabaseFetch(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers = Object.assign({
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  }, options.headers || {});

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Cloud error (${res.status}): ${errorText}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return await res.json();
  }
  return null;
}

/**
 * Upload entire local database snapshot to Supabase cloud
 */
async function uploadToCloud(branchId = 'b1') {
  if (!dbInstance) throw new Error('Database not initialized');

  if (typeof dbInstance.exportAllData !== 'function') {
    throw new Error('Database does not support exportAllData');
  }

  const dump = dbInstance.exportAllData();
  const timestamp = new Date().toISOString();
  const hostname = os.hostname();

  const payload = {
    appName: 'Al-Baari Modest Attire',
    branchId: branchId,
    timestamp: timestamp,
    device: hostname,
    counts: dump.counts,
    data: dump
  };

  const backupKey = `al_baari_cloud_backup_${branchId}`;
  const metaKey = `al_baari_cloud_meta_${branchId}`;

  const metaData = {
    timestamp: timestamp,
    device: hostname,
    counts: dump.counts,
    branchId: branchId
  };

  // 1. Upload metadata
  await supabaseFetch('app_kv_store', {
    method: 'POST',
    headers: { 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify({
      key: metaKey,
      value: JSON.stringify(metaData),
      branch_id: branchId
    })
  });

  // 2. Upload full snapshot
  await supabaseFetch('app_kv_store', {
    method: 'POST',
    headers: { 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify({
      key: backupKey,
      value: JSON.stringify(payload),
      branch_id: branchId
    })
  });

  // Save local record of sync
  if (typeof dbInstance.setKv === 'function') {
    try {
      dbInstance.setKv('last_cloud_sync_time', timestamp);
      dbInstance.setKv('last_cloud_sync_device', hostname);
    } catch (e) {}
  }

  return {
    success: true,
    timestamp: timestamp,
    device: hostname,
    counts: dump.counts
  };
}

/**
 * Restore database from the latest Supabase cloud snapshot
 */
async function restoreFromCloud(branchId = 'b1') {
  if (!dbInstance) throw new Error('Database not initialized');

  const backupKey = `al_baari_cloud_backup_${branchId}`;

  // 1. Fetch latest backup from Supabase
  const rows = await supabaseFetch(`app_kv_store?key=eq.${encodeURIComponent(backupKey)}&select=value,updated_at`);

  if (!rows || rows.length === 0 || !rows[0].value) {
    throw new Error(`No cloud backup found for branch "${branchId}". Please click "Sync to Cloud" from your main laptop first.`);
  }

  let payload = null;
  try {
    payload = JSON.parse(rows[0].value);
  } catch (e) {
    throw new Error('Cloud backup payload is corrupted: ' + e.message);
  }

  if (!payload || !payload.data) {
    throw new Error('Cloud backup data is missing or empty.');
  }

  // 2. Take a local safety backup of the current SQLite database on disk before restore
  try {
    const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME, 'Library/Application Support') : path.join(process.env.HOME, '.config'));
    const dir = path.join(appData, 'al-baari-modest-attire');
    const safetyFile = path.join(dir, `safety_backup_before_cloud_restore_${Date.now()}.db`);
    if (typeof dbInstance.getDbPath === 'function') {
      const currentDbPath = dbInstance.getDbPath();
      if (fs.existsSync(currentDbPath)) {
        fs.copyFileSync(currentDbPath, safetyFile);
        console.log(`[CloudSync] Safety backup saved to: ${safetyFile}`);
      }
    }
  } catch (err) {
    console.warn('[CloudSync] Could not create local safety backup:', err);
  }

  // 3. Import full data into SQLite
  if (typeof dbInstance.importAllData !== 'function') {
    throw new Error('Database does not support importAllData');
  }

  const result = dbInstance.importAllData(payload.data);

  // 4. Record local restore timestamp
  if (typeof dbInstance.setKv === 'function') {
    try {
      dbInstance.setKv('last_cloud_restore_time', new Date().toISOString());
      dbInstance.setKv('last_cloud_restore_source_timestamp', payload.timestamp || '');
      dbInstance.setKv('last_cloud_restore_source_device', payload.device || '');
    } catch (e) {}
  }

  return {
    success: true,
    timestamp: payload.timestamp,
    device: payload.device,
    counts: result.counts || payload.counts
  };
}

/**
 * Get cloud backup metadata and status
 */
async function getCloudStatus(branchId = 'b1') {
  const metaKey = `al_baari_cloud_meta_${branchId}`;
  let cloudMeta = null;
  let connected = false;

  try {
    const rows = await supabaseFetch(`app_kv_store?key=eq.${encodeURIComponent(metaKey)}&select=value,updated_at`);
    if (rows && rows.length > 0 && rows[0].value) {
      cloudMeta = JSON.parse(rows[0].value);
    }
    connected = true;
  } catch (err) {
    connected = false;
  }

  let localSyncTime = null;
  let localRestoreTime = null;
  if (dbInstance && typeof dbInstance.getAllKv === 'function') {
    try {
      const kv = dbInstance.getAllKv();
      localSyncTime = kv.last_cloud_sync_time || null;
      localRestoreTime = kv.last_cloud_restore_time || null;
    } catch (e) {}
  }

  return {
    connected,
    cloudMeta,
    localSyncTime,
    localRestoreTime,
    supabaseUrl: SUPABASE_URL
  };
}

module.exports = {
  setDb,
  uploadToCloud,
  restoreFromCloud,
  getCloudStatus
};
