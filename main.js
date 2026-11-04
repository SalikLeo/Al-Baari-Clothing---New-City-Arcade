const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

app.setName('al-baari-modest-attire');
const db = require('./database');
const cloudSync = require('./cloud-sync');
cloudSync.setDb(db);

let mainWindow;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.maximize();
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.setZoomFactor(0.88);
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message} (${sourceId}:${line})`);
  });

  // Intercept F6 and F8 globally before Chromium's native handlers intercept or suppress them
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown') {
      const key = (input.key || '').toUpperCase();
      const code = (input.code || '').toUpperCase();
      const isF6 = key === 'F6' || code === 'F6';
      const isF8 = key === 'F8' || code === 'F8';

      if (isF6 || isF8) {
        event.preventDefault();
        mainWindow.webContents.send('trigger-price-checker');
      }
    }
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http') || url.startsWith('mailto:')) {
      require('electron').shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('close', async (e) => {
    if (isQuitting) return;

    e.preventDefault();
    isQuitting = true;

    try {
      // Sync any unsaved localStorage into SQLite store before backup
      if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
        try {
          await mainWindow.webContents.executeJavaScript(`
            (async () => {
              if (window.api && window.api.saveAllKv) {
                const allKv = {};
                for (let i = 0; i < localStorage.length; i++) {
                  const key = localStorage.key(i);
                  if (key) allKv[key] = localStorage.getItem(key);
                }
                await window.api.saveAllKv(allKv);
              }
            })()
          `, true);
        } catch (syncErr) {
          console.warn('LocalStorage pre-close sync warning:', syncErr);
        }
      }

      await performAutoBackup();

      // Auto-cloud sync on close if enabled
      try {
        const kv = db.getAllKv ? db.getAllKv() : {};
        if (kv && kv.auto_cloud_sync === 'true') {
          console.log('[AutoCloudSync] Syncing to Supabase cloud before close...');
          const branch = db.getCurrentBranch ? db.getCurrentBranch() : 'b1';
          await cloudSync.uploadToCloud(branch);
        }
      } catch (cloudErr) {
        console.warn('[AutoCloudSync] Warning during close sync:', cloudErr.message);
      }
    } catch (err) {
      console.error('Failed to perform auto backup on window close:', err);
    } finally {
      try { db.close(); } catch (e) {}
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.destroy();
      }
      app.quit();
    }
  });
}

app.whenReady().then(() => {
  db.init(); // Initialize database
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Multi-Branch IPC
ipcMain.handle('get-active-branch', () => (db.getCurrentBranch ? db.getCurrentBranch() : 'b1'));
ipcMain.handle('switch-branch', (event, branchId) => (db.switchBranch ? db.switchBranch(branchId) : { success: true }));
ipcMain.handle('copy-catalog-from-branch', (event, fromBranch, toBranch) => (db.copyCatalogFromBranch ? db.copyCatalogFromBranch(fromBranch, toBranch) : { success: false }));

// Settings IPC
ipcMain.handle('get-settings', () => db.getSettings());
ipcMain.handle('save-settings', (event, data) => db.saveSettings(data));

// Products IPC
ipcMain.handle('get-products', (event, category) => db.getProducts(category));
ipcMain.handle('add-product', (event, category, data) => db.addProduct(category, data));
ipcMain.handle('update-product', (event, category, id, data) => db.updateProduct(category, id, data));
ipcMain.handle('change-product-category', (event, oldCategory, newCategory, id, data) => db.changeProductCategory(oldCategory, newCategory, id, data));
ipcMain.handle('delete-product', (event, category, id) => db.deleteProduct(category, id));
ipcMain.handle('find-product-by-name', (event, name, excludeCategory, excludeId) => db.findProductByName(name, excludeCategory, excludeId));
ipcMain.handle('find-product-by-barcode', (event, barcode, excludeCategory, excludeId) => db.findProductByBarcode(barcode, excludeCategory, excludeId));
ipcMain.handle('get-category-labels', () => db.getCategoryLabels());
ipcMain.handle('get-category-stats', () => db.getCategoryStats());
ipcMain.handle('update-category-label', (event, slug, label) => db.updateCategoryLabel(slug, label));
ipcMain.handle('add-category', (event, label) => db.addCategory(label));
ipcMain.handle('delete-category', (event, slug) => db.deleteCategory(slug));
ipcMain.handle('search-all-products', (event, query, companyId) => db.searchAllProducts(query, companyId));
ipcMain.handle('add-product-stock', (event, data) => db.addProductStock(data));
ipcMain.handle('get-rate-history', (event, category, productId) => db.getRateHistory(category, productId));
ipcMain.handle('delete-rate-history', (event, id) => db.deleteRateHistory(id));
ipcMain.handle('get-all-rates-list', () => db.getAllRatesList());

// Units IPC
ipcMain.handle('get-units', () => db.getUnits());
ipcMain.handle('add-unit', (event, name) => db.addUnit(name));
ipcMain.handle('update-unit', (event, id, name) => db.updateUnit(id, name));
ipcMain.handle('delete-unit', (event, id) => db.deleteUnit(id));

// Proposals IPC
ipcMain.handle('get-proposals', () => db.getProposals());
ipcMain.handle('get-proposal', (event, id) => db.getProposal(id));
ipcMain.handle('get-all-proposal-items', () => db.getAllProposalItems());
ipcMain.handle('save-proposal', (event, data) => db.saveProposal(data));
ipcMain.handle('delete-proposal', (event, id) => db.deleteProposal(id));
ipcMain.handle('update-proposal-status', (event, id, status) => db.updateProposalStatus(id, status));
ipcMain.handle('receive-payment', (event, id, amount, paymentMethod) => db.receivePayment(id, amount, paymentMethod));
ipcMain.handle('mark-proposal-paid', (event, idOrNumber) => db.markProposalPaid(idOrNumber));
ipcMain.handle('get-next-proposal-number', () => db.getNextProposalNumber());
ipcMain.handle('get-next-customer-name', () => db.getNextCustomerName());

// Expenses IPC
ipcMain.handle('get-expenses', (event, filters) => db.getExpenses(filters));
ipcMain.handle('save-expense', (event, data) => db.saveExpense(data));
ipcMain.handle('delete-expense', (event, id) => db.deleteExpense(id));
ipcMain.handle('get-expenses-summary', (event, filters) => db.getExpensesSummary(filters));
ipcMain.handle('get-expense-categories', () => db.getExpenseCategories());
ipcMain.handle('add-expense-category', (event, name) => db.addExpenseCategory(name));
ipcMain.handle('delete-expense-category', (event, id) => db.deleteExpenseCategory(id));

// Employees IPC
ipcMain.handle('get-employees', (event, status) => db.getEmployees(status));
ipcMain.handle('save-employee', (event, data) => db.saveEmployee(data));
ipcMain.handle('delete-employee', (event, id) => db.deleteEmployee(id));

// Companies IPC
ipcMain.handle('get-companies', () => db.getCompanies());
ipcMain.handle('save-company', (event, data) => db.saveCompany(data));
ipcMain.handle('delete-company', (event, id) => db.deleteCompany(id));

// Customers IPC
ipcMain.handle('get-customers', () => db.getCustomers());
ipcMain.handle('save-customer', (event, data) => db.saveCustomer(data));
ipcMain.handle('delete-customer', (event, id) => db.deleteCustomer(id));

// Shops IPC
ipcMain.handle('get-shops', () => db.getShops());
ipcMain.handle('get-shop', (event, id) => db.getShop(id));
ipcMain.handle('save-shop', (event, data) => db.saveShop(data));
ipcMain.handle('delete-shop', (event, id) => db.deleteShop(id));

// Dashboard Stats IPC
ipcMain.handle('get-dashboard-stats', (event, period) => db.getDashboardStats(period));
ipcMain.handle('get-item-sales', (event, section, period, targetDate) => db.getItemSales(section, period, targetDate));
ipcMain.handle('get-report-summary', (event, filters) => db.getReportSummary(filters));
ipcMain.handle('toggle-favorite', (event, category, id) => db.toggleFavorite(category, id));
ipcMain.handle('get-favorite-products', () => db.getFavoriteProducts());

// File Dialog for Logo
ipcMain.handle('select-logo-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png'] }]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]; // Return the absolute file path
  }
  return null;
});

// --- Automatic Backup Logic & IPC ---
function pruneOldBackups(dir, keepCount = 50) {
  try {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir)
      .filter(f => (f.startsWith('AlBaariModestAttire_') || f.startsWith('AlBaariModestAttire-') || f.startsWith('IshaqJadoonTraders_') || f.startsWith('IshaqJadoonTraders-')) && f.endsWith('.db'))
      .map(f => {
        const fullPath = path.join(dir, f);
        return { name: f, fullPath, mtime: fs.statSync(fullPath).mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length > keepCount) {
      for (let i = keepCount; i < files.length; i++) {
        try { fs.unlinkSync(files[i].fullPath); } catch (e) {}
      }
    }
  } catch (e) {
    console.warn('[AutoBackup] Prune warning:', e);
  }
}

async function performAutoBackup() {
  try {
    const settings = db.getSettings();
    let targetDir = settings.auto_backup_dir;
    const defaultDir = path.join(app.getPath('documents'), 'Al-Baari Modest Attire Backups');

    if (!targetDir || !fs.existsSync(targetDir) || targetDir.includes('Ishaq Jadoon Traders Backups')) {
      try {
        if (targetDir && !targetDir.includes('Ishaq Jadoon Traders Backups')) {
          fs.mkdirSync(targetDir, { recursive: true });
        } else {
          targetDir = defaultDir;
        }
      } catch (e) {
        targetDir = defaultDir;
      }
    }
    if (!targetDir || !fs.existsSync(targetDir)) {
      targetDir = defaultDir;
      try { fs.mkdirSync(targetDir, { recursive: true }); } catch (e) {}
    }

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const datetimeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const branchTag = (db.getCurrentBranch ? db.getCurrentBranch().toUpperCase() : 'B1');
    const fileName = `AlBaariModestAttire_${branchTag}-AutoBackup-${datetimeStr}.db`;
    const destPath = path.join(targetDir, fileName);

    console.log(`[AutoBackup] Backing up database to: ${destPath}`);
    await db.backupDatabase(destPath);
    console.log(`[AutoBackup] Successfully created backup at: ${destPath}`);

    pruneOldBackups(targetDir, 50);

    return { success: true, path: destPath };
  } catch (err) {
    console.error('[AutoBackup] Error during auto-backup:', err);
    return { success: false, error: err.message };
  }
}

ipcMain.handle('get-backup-directory', () => {
  const settings = db.getSettings();
  if (settings.auto_backup_dir && fs.existsSync(settings.auto_backup_dir) && !settings.auto_backup_dir.includes('Ishaq Jadoon Traders Backups')) {
    return settings.auto_backup_dir;
  }
  return path.join(app.getPath('documents'), 'Al-Baari Modest Attire Backups');
});

ipcMain.handle('select-backup-directory', async () => {
  const settings = db.getSettings();
  const defaultDir = (settings.auto_backup_dir && fs.existsSync(settings.auto_backup_dir) && !settings.auto_backup_dir.includes('Ishaq Jadoon Traders Backups'))
    ? settings.auto_backup_dir
    : path.join(app.getPath('documents'), 'Al-Baari Modest Attire Backups');
  if (!fs.existsSync(defaultDir)) {
    try { fs.mkdirSync(defaultDir, { recursive: true }); } catch (e) {}
  }

  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Automatic Backup Directory',
    defaultPath: defaultDir,
    properties: ['openDirectory', 'createDirectory']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const selectedDir = result.filePaths[0];
    db.saveSettings({ auto_backup_dir: selectedDir });
    return { success: true, path: selectedDir };
  }
  return { success: false, cancelled: true };
});

ipcMain.handle('open-backup-directory', async () => {
  const settings = db.getSettings();
  let dir = settings.auto_backup_dir;
  if (!dir || !fs.existsSync(dir) || dir.includes('Ishaq Jadoon Traders Backups')) {
    dir = path.join(app.getPath('documents'), 'Al-Baari Modest Attire Backups');
  }
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
  }
  const { shell } = require('electron');
  await shell.openPath(dir);
  return { success: true };
});

// Backup/Restore IPC
ipcMain.handle('backup-data', async () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const datetimeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  
  const branchTag = (db.getCurrentBranch ? db.getCurrentBranch().toUpperCase() : 'B1');
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Backup Database',
    defaultPath: `AlBaariModestAttire_${branchTag}-${datetimeStr}.db`,
    filters: [{ name: 'SQLite Database', extensions: ['db'] }]
  });

  if (!result.canceled && result.filePath) {
    try {
      return await db.backupDatabase(result.filePath);
    } catch (err) {
      console.error('Backup error:', err);
      return { success: false, error: err.message };
    }
  }
  return { success: false, error: 'Cancelled' };
});

ipcMain.handle('restore-data', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Restore Database',
    properties: ['openFile'],
    filters: [{ name: 'SQLite Database', extensions: ['db'] }]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    try {
      const backupPath = result.filePaths[0];
      const dbPath = db.getDbPath();

      // Close DB, delete leftover WAL/SHM, replace file, relaunch
      db.close();

      const walPath = dbPath + '-wal';
      const shmPath = dbPath + '-shm';
      if (fs.existsSync(walPath)) {
        try { fs.unlinkSync(walPath); } catch(e) {}
      }
      if (fs.existsSync(shmPath)) {
        try { fs.unlinkSync(shmPath); } catch(e) {}
      }

      fs.copyFileSync(backupPath, dbPath);
      app.relaunch();
      app.exit(0);
      return { success: true };
    } catch (err) {
      console.error('Restore error:', err);
      return { success: false, error: err.message };
    }
  }
  return { success: false, error: 'Cancelled' };
});

ipcMain.handle('clear-app-data', async () => {
  try {
    if (db && typeof db.clearAllData === 'function') {
      const res = db.clearAllData();
      if (!res.success) throw new Error(res.error || 'Failed to clear database');
    }
    return { success: true };
  } catch (err) {
    console.error('Clear app data error:', err);
    return { success: false, error: err.message };
  }
});

// Cloud Sync IPC Handlers
ipcMain.handle('cloud-sync-upload', async () => {
  try {
    const branch = db.getCurrentBranch ? db.getCurrentBranch() : 'b1';
    return await cloudSync.uploadToCloud(branch);
  } catch (err) {
    console.error('[CloudSync Upload Error]:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('cloud-sync-restore', async () => {
  try {
    const branch = db.getCurrentBranch ? db.getCurrentBranch() : 'b1';
    return await cloudSync.restoreFromCloud(branch);
  } catch (err) {
    console.error('[CloudSync Restore Error]:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('cloud-sync-get-status', async () => {
  try {
    const branch = db.getCurrentBranch ? db.getCurrentBranch() : 'b1';
    return await cloudSync.getCloudStatus(branch);
  } catch (err) {
    console.error('[CloudSync Status Error]:', err);
    return { connected: false, error: err.message };
  }
});

// KV Store IPC
ipcMain.handle('get-all-kv', () => db.getAllKv());
ipcMain.handle('set-kv', (event, key, value) => db.setKv(key, value));
ipcMain.handle('save-all-kv', (event, data) => db.saveAllKv(data));
ipcMain.handle('generate-pdf', async (event, filename) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showSaveDialog(win, {
    title: 'Save Quotation as PDF',
    defaultPath: filename,
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
  });

  if (!result.canceled && result.filePath) {
    try {
        const pdfOptions = {
            printBackground: true,
            margins: {
                marginType: 'none',
                top: 0,
                bottom: 0,
                left: 0,
                right: 0
            }
        };
        const prevZoom = win.webContents.getZoomFactor();
        if (prevZoom !== 1.0) {
          win.webContents.setZoomFactor(1.0);
        }
        const pdfData = await event.sender.printToPDF(pdfOptions);
        if (prevZoom !== 1.0) {
          win.webContents.setZoomFactor(prevZoom);
        }
        fs.writeFileSync(result.filePath, pdfData);
        return { success: true, path: result.filePath };
    } catch (err) {
        console.error(err);
        return { success: false, error: err.message };
    }
  }
  return { success: false };
});

// Thermal Printer IPC
ipcMain.handle('get-printers', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return [];
  return await win.webContents.getPrintersAsync();
});

ipcMain.handle('print-receipt', async (event, options = {}) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { success: false, error: 'No active window' };

  try {
    const printers = await win.webContents.getPrintersAsync();
    const posPrinter = printers.find(p => /pos|receipt|thermal|xp-|80|58|xprinter|speed|sp-|650|label|sticker|barcode|printer/i.test(p.name));
    const targetPrinter = options.deviceName || (posPrinter ? posPrinter.name : undefined);

    const printOptions = {
      silent: options.silent !== undefined ? options.silent : false,
      printBackground: true,
      margins: {
        marginType: 'none',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
      }
    };

    if (targetPrinter) {
      printOptions.deviceName = targetPrinter;
    }
    if (options.pageSize) {
      printOptions.pageSize = options.pageSize;
    }
    if (options.copies && Number(options.copies) > 1) {
      printOptions.copies = Number(options.copies);
    }

    const prevZoom = win.webContents.getZoomFactor();
    if (prevZoom !== 1.0) {
      win.webContents.setZoomFactor(1.0);
    }

    return new Promise((resolve) => {
      win.webContents.print(printOptions, (success, failureReason) => {
        if (prevZoom !== 1.0) {
          try { win.webContents.setZoomFactor(prevZoom); } catch(e) {}
        }
        resolve({ success, failureReason });
      });
    });
  } catch (err) {
    console.error('print-receipt error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('print-barcode-stickers', async (event, options = {}) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { success: false, error: 'No active window' };

  try {
    const printers = await win.webContents.getPrintersAsync();
    // Prioritize 4BARCODE 3B-365B / sticker printer first, avoid POS80 receipt printer
    const labelPrinter = options.deviceName || 
      (printers.find(p => /4barcode|3b-365/i.test(p.name))?.name) ||
      (printers.find(p => /label|sticker|speed|sp-|650/i.test(p.name))?.name) ||
      (printers.find(p => /barcode/i.test(p.name))?.name) ||
      (printers.find(p => /pos|receipt|thermal|xp-|80|58|xprinter/i.test(p.name))?.name);

    const printOptions = {
      silent: options.silent !== undefined ? options.silent : false,
      printBackground: true,
      margins: {
        marginType: 'none',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
      }
    };

    if (labelPrinter) {
      printOptions.deviceName = labelPrinter;
    }

    if (options.pageSize) {
      printOptions.pageSize = options.pageSize;
    }

    if (options.copies && Number(options.copies) > 1) {
      printOptions.copies = Number(options.copies);
    }

    const prevZoom = win.webContents.getZoomFactor();
    if (prevZoom !== 1.0) {
      win.webContents.setZoomFactor(1.0);
    }

    return new Promise((resolve) => {
      win.webContents.print(printOptions, (success, failureReason) => {
        if (prevZoom !== 1.0) {
          try { win.webContents.setZoomFactor(prevZoom); } catch(e) {}
        }
        resolve({ success, failureReason, deviceName: printOptions.deviceName });
      });
    });
  } catch (err) {
    console.error('print-barcode-stickers error:', err);
    return { success: false, error: err.message };
  }
});

