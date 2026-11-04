/**
 * Al-Baari Modest Attire - Production Web Server for Hostinger
 * 
 * Provides HTTP server listening on process.env.PORT, serves static assets,
 * and handles the /api REST bridge for the web POS system.
 * Supports MySQL (via mysql2), SQLite (via database.js), or standalone in-memory mode.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = parseInt(process.env.PORT || '3000', 10);

// Try to parse credentials from process.env or api/config.php
let dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || ''
};

try {
  const configPath = path.join(__dirname, 'api', 'config.php');
  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf8');
    const hostMatch = content.match(/define\(\s*['"]DB_HOST['"]\s*,\s*['"](.*?)['"]\s*\)/);
    const dbMatch = content.match(/define\(\s*['"]DB_NAME['"]\s*,\s*['"](.*?)['"]\s*\)/);
    const userMatch = content.match(/define\(\s*['"]DB_USER['"]\s*,\s*['"](.*?)['"]\s*\)/);
    const passMatch = content.match(/define\(\s*['"]DB_PASS['"]\s*,\s*['"](.*?)['"]\s*\)/);

    if (hostMatch && hostMatch[1] && !process.env.DB_HOST) dbConfig.host = hostMatch[1];
    if (dbMatch && dbMatch[1] && !process.env.DB_NAME && dbMatch[1] !== 'albaari_db') dbConfig.database = dbMatch[1];
    if (userMatch && userMatch[1] && !process.env.DB_USER && userMatch[1] !== 'albaari_user') dbConfig.user = userMatch[1];
    if (passMatch && passMatch[1] && !process.env.DB_PASS && passMatch[1] !== 'your_db_password') dbConfig.password = passMatch[1];
  }
} catch (e) {}

let mysqlPool = null;
if (dbConfig.database && dbConfig.user) {
  try {
    const mysql = require('mysql2/promise');
    mysqlPool = mysql.createPool({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    console.log(`[Server] MySQL pool created for database "${dbConfig.database}"`);
  } catch (err) {
    console.warn('[Server] MySQL initialization failed:', err.message);
  }
}

// Initialize SQLite database as fallback or local engine
let sqliteDb = null;
try {
  sqliteDb = require('./database');
  if (sqliteDb && typeof sqliteDb.init === 'function') {
    sqliteDb.init();
    console.log('[Server] SQLite database initialized successfully.');
  }
} catch (err) {
  console.warn('[Server] SQLite database operating in fallback mode:', err.message);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.mjs': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=UTF-8'
};

const DEFAULT_SETTINGS = {
  company_name: 'Al-Baari Modest Attire',
  branch_name: 'Branch 1',
  branch_id: 'b1',
  address: 'Wah Cantt',
  phone: '0335-0059819',
  tagline: "Returns & exchange accepted within 2 days.\nItems must be unworn with original tags attached.",
  logo_path: '',
  website: '',
  auto_backup_dir: 'Hostinger Cloud Database'
};

const inMemoryKv = {};

async function handleApiAction(action, branchId, query, input) {
  // If MySQL is active
  if (mysqlPool) {
    try {
      return await handleMysqlAction(action, branchId, query, input);
    } catch (err) {
      console.warn(`[MySQL Fallback] Query failed for ${action}:`, err.message);
    }
  }

  // Fallback to SQLite if available
  if (sqliteDb) {
    try {
      if (branchId && typeof sqliteDb.switchBranch === 'function') {
        if (sqliteDb.getCurrentBranch() !== branchId) {
          sqliteDb.switchBranch(branchId);
        }
      }
    } catch (e) {}
  }

  switch (action) {
    case 'ping':
      return { 
        success: true, 
        time: new Date().toISOString(), 
        server: 'Hostinger Node.js',
        mode: mysqlPool ? 'MySQL' : (sqliteDb ? 'SQLite' : 'Standalone')
      };

    // --- SETTINGS ---
    case 'getSettings':
      if (sqliteDb && typeof sqliteDb.getSettings === 'function') {
        return Object.assign({}, DEFAULT_SETTINGS, sqliteDb.getSettings());
      }
      return DEFAULT_SETTINGS;

    case 'saveSettings':
      if (sqliteDb && typeof sqliteDb.saveSettings === 'function') {
        return sqliteDb.saveSettings(input);
      }
      return { success: true };

    // --- CATEGORIES ---
    case 'getCategoryLabels':
      if (sqliteDb && typeof sqliteDb.getCategoryLabels === 'function') {
        return sqliteDb.getCategoryLabels();
      }
      return [
        { id: 1, slug: 'panels', label: 'Biscuits' },
        { id: 2, slug: 'inverters', label: 'Cold Drinks' },
        { id: 3, slug: 'structures', label: 'Jellies & Candies' },
        { id: 4, slug: 'cables', label: 'Snacks & Chips' },
        { id: 5, slug: 'breakers', label: 'Chocolates' },
        { id: 6, slug: 'batteries', label: 'Dairy & Groceries' },
        { id: 8, slug: 'others', label: 'General Items' },
        { id: 38, slug: 'misc', label: 'Juices & Beverages' }
      ];

    case 'getCategoryStats':
      if (sqliteDb && typeof sqliteDb.getCategoryStats === 'function') {
        return sqliteDb.getCategoryStats();
      }
      return [];

    case 'updateCategoryLabel':
      if (sqliteDb && typeof sqliteDb.updateCategoryLabel === 'function') {
        return sqliteDb.updateCategoryLabel(input.slug, input.label);
      }
      return { success: true };

    case 'addCategory':
      if (sqliteDb && typeof sqliteDb.addCategory === 'function') {
        return sqliteDb.addCategory(input.label);
      }
      return { success: true };

    case 'deleteCategory':
      if (sqliteDb && typeof sqliteDb.deleteCategory === 'function') {
        return sqliteDb.deleteCategory(input.slug);
      }
      return { success: true };

    // --- UNITS ---
    case 'getUnits':
      if (sqliteDb && typeof sqliteDb.getUnits === 'function') {
        return sqliteDb.getUnits();
      }
      return [
        { id: 1, name: 'CARTON' },
        { id: 2, name: 'PCS' },
        { id: 3, name: 'SET' },
        { id: 4, name: 'PACK' },
        { id: 5, name: 'BOX' },
        { id: 6, name: 'BOTTLE' }
      ];

    case 'addUnit':
      if (sqliteDb && typeof sqliteDb.addUnit === 'function') {
        return sqliteDb.addUnit(input.name);
      }
      return { success: true };

    case 'updateUnit':
      if (sqliteDb && typeof sqliteDb.updateUnit === 'function') {
        return sqliteDb.updateUnit(input.id, input.name);
      }
      return { success: true };

    case 'deleteUnit':
      if (sqliteDb && typeof sqliteDb.deleteUnit === 'function') {
        return sqliteDb.deleteUnit(input.id);
      }
      return { success: true };

    // --- PRODUCTS ---
    case 'getProducts':
      if (sqliteDb && typeof sqliteDb.getProducts === 'function') {
        return sqliteDb.getProducts(query.category || input.category, query.company_id || input.company_id);
      }
      return [];

    case 'searchAllProducts':
      if (sqliteDb && typeof sqliteDb.searchAllProducts === 'function') {
        return sqliteDb.searchAllProducts(query.query || input.query || '', query.company_id || input.company_id);
      }
      return [];

    case 'findProductByName':
      if (sqliteDb && typeof sqliteDb.findProductByName === 'function') {
        return sqliteDb.findProductByName(query.name || input.name);
      }
      return null;

    case 'findProductByBarcode':
      if (sqliteDb && typeof sqliteDb.findProductByBarcode === 'function') {
        return sqliteDb.findProductByBarcode(query.barcode || input.barcode);
      }
      return null;

    case 'addProduct':
      if (sqliteDb && typeof sqliteDb.addProduct === 'function') {
        return sqliteDb.addProduct(input.category || input.category_slug, input);
      }
      return { id: Date.now() };

    case 'updateProduct':
      if (sqliteDb && typeof sqliteDb.updateProduct === 'function') {
        return sqliteDb.updateProduct(input.category || input.category_slug, input.id, input);
      }
      return { success: true };

    case 'deleteProduct':
      if (sqliteDb && typeof sqliteDb.deleteProduct === 'function') {
        return sqliteDb.deleteProduct(input.category || input.category_slug, input.id);
      }
      return { success: true };

    case 'addProductStock':
      if (sqliteDb && typeof sqliteDb.addProductStock === 'function') {
        return sqliteDb.addProductStock(input);
      }
      return { success: true };

    case 'getRateHistory':
      if (sqliteDb && typeof sqliteDb.getRateHistory === 'function') {
        return sqliteDb.getRateHistory(query.category, query.productId);
      }
      return [];

    case 'deleteRateHistory':
      if (sqliteDb && typeof sqliteDb.deleteRateHistory === 'function') {
        return sqliteDb.deleteRateHistory(input.id);
      }
      return { success: true };

    case 'getAllRatesList':
      if (sqliteDb && typeof sqliteDb.getAllRatesList === 'function') {
        return sqliteDb.getAllRatesList();
      }
      return [];

    // --- PROPOSALS (SALES INVOICES) ---
    case 'getProposals':
      if (sqliteDb && typeof sqliteDb.getProposals === 'function') {
        return sqliteDb.getProposals();
      }
      return [];

    case 'getProposal':
      if (sqliteDb && typeof sqliteDb.getProposal === 'function') {
        return sqliteDb.getProposal(query.id || input.id);
      }
      return null;

    case 'getNextProposalNumber':
      if (sqliteDb && typeof sqliteDb.getNextProposalNumber === 'function') {
        return sqliteDb.getNextProposalNumber();
      }
      return '000001';

    case 'getNextCustomerName':
      if (sqliteDb && typeof sqliteDb.getNextCustomerName === 'function') {
        return sqliteDb.getNextCustomerName();
      }
      return 'Walk-in Customer';

    case 'saveProposal':
      if (sqliteDb && typeof sqliteDb.saveProposal === 'function') {
        return sqliteDb.saveProposal(input);
      }
      return { success: true, id: Date.now() };

    case 'deleteProposal':
      if (sqliteDb && typeof sqliteDb.deleteProposal === 'function') {
        return sqliteDb.deleteProposal(input.id);
      }
      return { success: true };

    case 'updateProposalStatus':
      if (sqliteDb && typeof sqliteDb.updateProposalStatus === 'function') {
        return sqliteDb.updateProposalStatus(input.id, input.status);
      }
      return { success: true };

    case 'receivePayment':
      if (sqliteDb && typeof sqliteDb.receivePayment === 'function') {
        return sqliteDb.receivePayment(input.id, input.amount, input.paymentMethod || 'Cash');
      }
      return { success: true };

    // --- EXPENSES ---
    case 'getExpenses':
      if (sqliteDb && typeof sqliteDb.getExpenses === 'function') {
        return sqliteDb.getExpenses(query);
      }
      return [];

    case 'saveExpense':
      if (sqliteDb && typeof sqliteDb.saveExpense === 'function') {
        return sqliteDb.saveExpense(input);
      }
      return { success: true, id: Date.now() };

    case 'deleteExpense':
      if (sqliteDb && typeof sqliteDb.deleteExpense === 'function') {
        return sqliteDb.deleteExpense(input.id);
      }
      return { success: true };

    case 'getExpenseCategories':
      if (sqliteDb && typeof sqliteDb.getExpenseCategories === 'function') {
        return sqliteDb.getExpenseCategories();
      }
      return [
        { id: 1, name: 'Office' },
        { id: 2, name: 'Transport' },
        { id: 3, name: 'Utilities' },
        { id: 4, name: 'Salaries' },
        { id: 5, name: 'Purchase' },
        { id: 6, name: 'Other' }
      ];

    case 'addExpenseCategory':
      if (sqliteDb && typeof sqliteDb.addExpenseCategory === 'function') {
        return sqliteDb.addExpenseCategory(input.name);
      }
      return { success: true };

    case 'deleteExpenseCategory':
      if (sqliteDb && typeof sqliteDb.deleteExpenseCategory === 'function') {
        return sqliteDb.deleteExpenseCategory(input.id);
      }
      return { success: true };

    // --- COMPANIES & CUSTOMERS ---
    case 'getCompanies':
      if (sqliteDb && typeof sqliteDb.getCompanies === 'function') {
        return sqliteDb.getCompanies();
      }
      return [];

    case 'saveCompany':
      if (sqliteDb && typeof sqliteDb.saveCompany === 'function') {
        return sqliteDb.saveCompany(input);
      }
      return { success: true, id: Date.now() };

    case 'deleteCompany':
      if (sqliteDb && typeof sqliteDb.deleteCompany === 'function') {
        return sqliteDb.deleteCompany(input.id);
      }
      return { success: true };

    case 'getCustomers':
      if (sqliteDb && typeof sqliteDb.getCustomers === 'function') {
        return sqliteDb.getCustomers();
      }
      return [];

    case 'saveCustomer':
      if (sqliteDb && typeof sqliteDb.saveCustomer === 'function') {
        return sqliteDb.saveCustomer(input);
      }
      return { success: true, id: Date.now() };

    case 'deleteCustomer':
      if (sqliteDb && typeof sqliteDb.deleteCustomer === 'function') {
        return sqliteDb.deleteCustomer(input.id);
      }
      return { success: true };

    // --- DASHBOARD ---
    case 'getDashboardStats':
      if (sqliteDb && typeof sqliteDb.getDashboardStats === 'function') {
        return sqliteDb.getDashboardStats(query.period || input.period || 'daily');
      }
      return { revenue: 0, paid: 0, due: 0, expenses: 0, profit: 0, count: 0 };

    // --- KEY-VALUE STORAGE ---
    case 'getAllKv':
      if (sqliteDb && typeof sqliteDb.getAllKv === 'function') {
        return sqliteDb.getAllKv();
      }
      return inMemoryKv;

    case 'setKv':
      if (sqliteDb && typeof sqliteDb.setKv === 'function') {
        return sqliteDb.setKv(input.key, input.value);
      }
      inMemoryKv[input.key] = input.value;
      return { success: true };

    case 'switchBranch':
      if (sqliteDb && typeof sqliteDb.switchBranch === 'function') {
        return sqliteDb.switchBranch(input.branchId || branchId);
      }
      return { success: true, branch: input.branchId || branchId };

    case 'copyCatalogFromBranch':
      if (sqliteDb && typeof sqliteDb.copyCatalogFromBranch === 'function') {
        return sqliteDb.copyCatalogFromBranch(input.fromBranch, input.toBranch);
      }
      return { success: false };

    default:
      return { success: true, message: `Action ${action} handled.` };
  }
}

async function handleMysqlAction(action, branchId, query, input) {
  switch (action) {
    case 'getSettings': {
      const [rows] = await mysqlPool.query("SELECT `key`, `value` FROM settings WHERE branch_id = ? OR branch_id = '' OR branch_id IS NULL", [branchId]);
      const res = Object.assign({}, DEFAULT_SETTINGS);
      for (const r of rows) res[r.key] = r.value;
      return res;
    }
    case 'saveSettings': {
      for (const [k, v] of Object.entries(input)) {
        const valStr = typeof v === 'object' ? JSON.stringify(v) : String(v);
        await mysqlPool.query(
          "INSERT INTO settings (`key`, `value`, `branch_id`) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
          [k, valStr, branchId]
        );
      }
      return { success: true };
    }
    case 'getCategoryLabels': {
      const [rows] = await mysqlPool.query("SELECT * FROM category_labels ORDER BY id ASC");
      return rows;
    }
    case 'getCategoryStats': {
      const [cats] = await mysqlPool.query("SELECT * FROM category_labels ORDER BY id ASC");
      const [counts] = await mysqlPool.query("SELECT category_slug, COUNT(*) as c FROM products WHERE branch_id = ? GROUP BY category_slug", [branchId]);
      const countMap = {};
      for (const r of counts) countMap[r.category_slug] = Number(r.c);
      return cats.map(c => ({ ...c, count: countMap[c.slug] || 0 }));
    }
    case 'getUnits': {
      const [rows] = await mysqlPool.query("SELECT * FROM product_units ORDER BY id ASC");
      return rows;
    }
    case 'getProducts': {
      const cat = query.category || input.category;
      if (cat) {
        const [rows] = await mysqlPool.query("SELECT * FROM products WHERE category_slug = ? AND branch_id = ? ORDER BY id DESC", [cat, branchId]);
        return rows;
      }
      const [rows] = await mysqlPool.query("SELECT * FROM products WHERE branch_id = ? ORDER BY id DESC", [branchId]);
      return rows;
    }
    case 'searchAllProducts': {
      const q = `%${query.query || input.query || ''}%`;
      const [rows] = await mysqlPool.query(
        "SELECT * FROM products WHERE branch_id = ? AND (name LIKE ? OR barcode LIKE ? OR category_slug LIKE ?) ORDER BY name ASC LIMIT 100",
        [branchId, q, q, q]
      );
      return rows;
    }
    case 'getProposals': {
      const [rows] = await mysqlPool.query("SELECT * FROM proposals WHERE branch_id = ? ORDER BY id DESC LIMIT 100", [branchId]);
      return rows;
    }
    case 'getCustomers': {
      const [rows] = await mysqlPool.query("SELECT * FROM customers WHERE branch_id = ? ORDER BY name ASC", [branchId]);
      return rows;
    }
    case 'getCompanies': {
      const [rows] = await mysqlPool.query("SELECT * FROM companies WHERE branch_id = ? ORDER BY name ASC", [branchId]);
      return rows;
    }
    case 'getExpenses': {
      const [rows] = await mysqlPool.query("SELECT * FROM expenses WHERE branch_id = ? ORDER BY id DESC LIMIT 100", [branchId]);
      return rows;
    }
    default:
      throw new Error(`Unhandled MySQL action: ${action}`);
  }
}

const server = http.createServer((req, res) => {
  const host = req.headers.host || `localhost:${PORT}`;
  const parsedUrl = new URL(req.url, `http://${host}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  // --- API ROUTE ---
  if (pathname === '/api' || pathname.startsWith('/api/') || pathname === '/api/index.php') {
    const action = parsedUrl.searchParams.get('action') || '';
    const branchId = parsedUrl.searchParams.get('branch_id') || 'b1';

    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 25 * 1024 * 1024) req.destroy();
    });

    req.on('end', async () => {
      let input = {};
      if (body) {
        try { input = JSON.parse(body); } catch (e) { input = {}; }
      }
      const query = {};
      for (const [k, v] of parsedUrl.searchParams.entries()) {
        query[k] = v;
      }

      try {
        const result = await handleApiAction(action, branchId, query, input);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error(`[API Error] ${action}:`, err);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=UTF-8' });
        res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
      }
    });
    return;
  }

  // --- STATIC FILES ROUTE ---
  if (pathname === '/' || pathname === '/index.html') {
    res.writeHead(302, { Location: '/renderer/index.html' });
    return res.end();
  }

  let safePath = pathname.replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(__dirname, safePath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    const rendererPath = path.join(__dirname, 'renderer', safePath);
    if (fs.existsSync(rendererPath) && !fs.statSync(rendererPath).isDirectory()) {
      filePath = rendererPath;
    }
  }

  if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400'
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    const indexPath = path.join(__dirname, 'renderer', 'index.html');
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
      fs.createReadStream(indexPath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    }
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Al-Baari POS Server listening on http://0.0.0.0:${PORT}`);
});
