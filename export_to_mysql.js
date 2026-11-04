/**
 * Export SQLite Database to Hostinger MySQL Dump (hostinger_database.sql)
 * 
 * Usage:
 *   $env:ELECTRON_RUN_AS_NODE=1; npx electron export_to_mysql.js
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

function getDbPath() {
  const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME, 'Library/Application Support') : path.join(process.env.HOME, '.config'));
  const targetDir = path.join(appData, 'al-baari-modest-attire');
  const primaryDb = path.join(targetDir, 'al_baari.db');
  if (fs.existsSync(primaryDb)) return primaryDb;
  if (fs.existsSync('./db.sqlite')) return './db.sqlite';
  throw new Error(`Database not found in ${targetDir}`);
}

function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val;
  const str = String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `'${str}'`;
}

function runExport() {
  console.log('Generating hostinger_database.sql for phpMyAdmin import...');
  const dbPath = getDbPath();
  const db = new Database(dbPath, { readonly: true });

  let sql = `-- ======================================================================\n`;
  sql += `-- Al-Baari Modest Attire - Complete Hostinger MySQL Database Dump\n`;
  sql += `-- Import this file directly into Hostinger phpMyAdmin\n`;
  sql += `-- ======================================================================\n\n`;
  sql += `SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS = 0;\n\n`;

  // 1. Settings Table
  sql += `-- Table: settings\n`;
  sql += `CREATE TABLE IF NOT EXISTS \`settings\` (\n`;
  sql += `  \`key\` VARCHAR(100) NOT NULL PRIMARY KEY,\n`;
  sql += `  \`value\` LONGTEXT NULL,\n`;
  sql += `  \`branch_id\` VARCHAR(10) DEFAULT 'b1',\n`;
  sql += `  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  const settings = db.prepare('SELECT key, value FROM settings').all();
  settings.forEach(s => {
    sql += `INSERT INTO \`settings\` (\`key\`, \`value\`, \`branch_id\`) VALUES (${escapeSql(s.key)}, ${escapeSql(s.value)}, 'b1') ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`);\n`;
  });
  sql += `\n`;

  // 2. App KV Store
  sql += `-- Table: app_kv_store\n`;
  sql += `CREATE TABLE IF NOT EXISTS \`app_kv_store\` (\n`;
  sql += `  \`key\` VARCHAR(100) NOT NULL PRIMARY KEY,\n`;
  sql += `  \`value\` LONGTEXT NULL,\n`;
  sql += `  \`branch_id\` VARCHAR(10) DEFAULT 'b1',\n`;
  sql += `  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  const kv = db.prepare('SELECT key, value FROM app_kv_store').all();
  kv.forEach(k => {
    sql += `INSERT INTO \`app_kv_store\` (\`key\`, \`value\`, \`branch_id\`) VALUES (${escapeSql(k.key)}, ${escapeSql(k.value)}, 'b1') ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`);\n`;
  });
  sql += `\n`;

  // 3. Category Labels
  sql += `-- Table: category_labels\n`;
  sql += `CREATE TABLE IF NOT EXISTS \`category_labels\` (\n`;
  sql += `  \`id\` INT AUTO_INCREMENT PRIMARY KEY,\n`;
  sql += `  \`slug\` VARCHAR(100) NOT NULL UNIQUE,\n`;
  sql += `  \`label\` VARCHAR(255) NOT NULL\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  const cats = db.prepare('SELECT id, slug, label FROM category_labels').all();
  cats.forEach(c => {
    sql += `INSERT INTO \`category_labels\` (\`id\`, \`slug\`, \`label\`) VALUES (${c.id}, ${escapeSql(c.slug)}, ${escapeSql(c.label)}) ON DUPLICATE KEY UPDATE \`label\` = VALUES(\`label\`);\n`;
  });
  sql += `\n`;

  // 4. Product Units
  sql += `-- Table: product_units\n`;
  sql += `CREATE TABLE IF NOT EXISTS \`product_units\` (\n`;
  sql += `  \`id\` INT AUTO_INCREMENT PRIMARY KEY,\n`;
  sql += `  \`name\` VARCHAR(100) NOT NULL UNIQUE\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  const units = db.prepare('SELECT id, name FROM product_units').all();
  units.forEach(u => {
    sql += `INSERT INTO \`product_units\` (\`id\`, \`name\`) VALUES (${u.id}, ${escapeSql(u.name)}) ON DUPLICATE KEY UPDATE \`name\` = VALUES(\`name\`);\n`;
  });
  sql += `\n`;

  // 5. Companies
  sql += `-- Table: companies\n`;
  sql += `CREATE TABLE IF NOT EXISTS \`companies\` (\n`;
  sql += `  \`id\` INT AUTO_INCREMENT PRIMARY KEY,\n`;
  sql += `  \`name\` VARCHAR(255) NOT NULL,\n`;
  sql += `  \`description\` TEXT NULL,\n`;
  sql += `  \`amount\` DECIMAL(12,2) DEFAULT 0,\n`;
  sql += `  \`phone\` VARCHAR(50) NULL,\n`;
  sql += `  \`email\` VARCHAR(100) NULL,\n`;
  sql += `  \`address\` TEXT NULL,\n`;
  sql += `  \`branch_id\` VARCHAR(10) DEFAULT 'b1',\n`;
  sql += `  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  const companies = db.prepare('SELECT * FROM companies').all();
  companies.forEach(c => {
    sql += `INSERT INTO \`companies\` (\`id\`, \`name\`, \`description\`, \`amount\`, \`phone\`, \`email\`, \`address\`, \`branch_id\`) VALUES (${c.id}, ${escapeSql(c.name)}, ${escapeSql(c.description)}, ${c.amount || 0}, ${escapeSql(c.phone)}, ${escapeSql(c.email)}, ${escapeSql(c.address)}, 'b1') ON DUPLICATE KEY UPDATE \`name\` = VALUES(\`name\`);\n`;
  });
  sql += `\n`;

  // 6. Customers
  sql += `-- Table: customers\n`;
  sql += `CREATE TABLE IF NOT EXISTS \`customers\` (\n`;
  sql += `  \`id\` INT AUTO_INCREMENT PRIMARY KEY,\n`;
  sql += `  \`name\` VARCHAR(255) NOT NULL,\n`;
  sql += `  \`description\` TEXT NULL,\n`;
  sql += `  \`amount\` DECIMAL(12,2) DEFAULT 0,\n`;
  sql += `  \`phone\` VARCHAR(50) NULL,\n`;
  sql += `  \`email\` VARCHAR(100) NULL,\n`;
  sql += `  \`address\` TEXT NULL,\n`;
  sql += `  \`branch_id\` VARCHAR(10) DEFAULT 'b1',\n`;
  sql += `  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  const customers = db.prepare('SELECT * FROM customers').all();
  customers.forEach(c => {
    sql += `INSERT INTO \`customers\` (\`id\`, \`name\`, \`description\`, \`amount\`, \`phone\`, \`email\`, \`address\`, \`branch_id\`) VALUES (${c.id}, ${escapeSql(c.name)}, ${escapeSql(c.description)}, ${c.amount || 0}, ${escapeSql(c.phone)}, ${escapeSql(c.email)}, ${escapeSql(c.address)}, 'b1') ON DUPLICATE KEY UPDATE \`name\` = VALUES(\`name\`);\n`;
  });
  sql += `\n`;

  // 7. Products
  sql += `-- Table: products\n`;
  sql += `CREATE TABLE IF NOT EXISTS \`products\` (\n`;
  sql += `  \`id\` INT AUTO_INCREMENT PRIMARY KEY,\n`;
  sql += `  \`category_slug\` VARCHAR(100) NOT NULL,\n`;
  sql += `  \`item_name\` VARCHAR(255) NOT NULL,\n`;
  sql += `  \`description\` TEXT NULL,\n`;
  sql += `  \`current_stock\` DECIMAL(10,2) DEFAULT 0,\n`;
  sql += `  \`unit\` VARCHAR(50) DEFAULT 'pcs',\n`;
  sql += `  \`cost_price\` DECIMAL(12,2) DEFAULT 0,\n`;
  sql += `  \`retail_price\` DECIMAL(12,2) DEFAULT 0,\n`;
  sql += `  \`wholesale_cost_price\` DECIMAL(12,2) DEFAULT 0,\n`;
  sql += `  \`wholesale_price\` DECIMAL(12,2) DEFAULT 0,\n`;
  sql += `  \`company_id\` INT NULL,\n`;
  sql += `  \`barcode\` VARCHAR(100) NULL,\n`;
  sql += `  \`pieces_per_carton\` INT DEFAULT 12,\n`;
  sql += `  \`branch_id\` VARCHAR(10) DEFAULT 'b1',\n`;
  sql += `  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n`;
  sql += `  INDEX idx_prod_cat (\`category_slug\`, \`branch_id\`),\n`;
  sql += `  INDEX idx_prod_barcode (\`barcode\`),\n`;
  sql += `  INDEX idx_prod_name (\`item_name\`)\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  let prodAutoId = 1;
  cats.forEach(c => {
    try {
      const prods = db.prepare(`SELECT * FROM products_${c.slug}`).all();
      prods.forEach(p => {
        const itemName = p.item_name || p.description || 'Product';
        sql += `INSERT INTO \`products\` (\`id\`, \`category_slug\`, \`item_name\`, \`description\`, \`current_stock\`, \`unit\`, \`cost_price\`, \`retail_price\`, \`wholesale_cost_price\`, \`wholesale_price\`, \`company_id\`, \`barcode\`, \`pieces_per_carton\`, \`branch_id\`) VALUES (${prodAutoId}, ${escapeSql(c.slug)}, ${escapeSql(itemName)}, ${escapeSql(p.description)}, ${p.current_stock || 0}, ${escapeSql(p.unit || 'pcs')}, ${p.cost_price || 0}, ${p.retail_price || 0}, ${p.wholesale_cost_price || p.cost_price || 0}, ${p.wholesale_price || p.retail_price || 0}, ${p.company_id ? p.company_id : 'NULL'}, ${escapeSql(p.barcode)}, ${p.pieces_per_carton || 12}, 'b1');\n`;
        prodAutoId++;
      });
    } catch(e) {}
  });
  sql += `\n`;

  // 8. Proposals
  sql += `-- Table: proposals\n`;
  sql += `CREATE TABLE IF NOT EXISTS \`proposals\` (\n`;
  sql += `  \`id\` INT AUTO_INCREMENT PRIMARY KEY,\n`;
  sql += `  \`proposal_number\` VARCHAR(100) NOT NULL,\n`;
  sql += `  \`customer_name\` VARCHAR(255) NULL,\n`;
  sql += `  \`location\` TEXT NULL,\n`;
  sql += `  \`phone\` VARCHAR(50) NULL,\n`;
  sql += `  \`date\` VARCHAR(50) NULL,\n`;
  sql += `  \`retail_total\` DECIMAL(12,2) DEFAULT 0,\n`;
  sql += `  \`cost_total\` DECIMAL(12,2) DEFAULT 0,\n`;
  sql += `  \`profit\` DECIMAL(12,2) DEFAULT 0,\n`;
  sql += `  \`status\` VARCHAR(50) DEFAULT 'active',\n`;
  sql += `  \`received_amount\` DECIMAL(12,2) DEFAULT 0,\n`;
  sql += `  \`discount\` DECIMAL(12,2) DEFAULT 0,\n`;
  sql += `  \`seller_name\` VARCHAR(255) NULL,\n`;
  sql += `  \`payment_method\` VARCHAR(50) DEFAULT 'Cash',\n`;
  sql += `  \`tax_percent\` DECIMAL(5,2) DEFAULT 0,\n`;
  sql += `  \`tax_amount\` DECIMAL(12,2) DEFAULT 0,\n`;
  sql += `  \`subtotal\` DECIMAL(12,2) DEFAULT 0,\n`;
  sql += `  \`sale_mode\` VARCHAR(50) DEFAULT 'retail',\n`;
  sql += `  \`branch_id\` VARCHAR(10) DEFAULT 'b1',\n`;
  sql += `  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n`;
  sql += `  INDEX idx_prop_num (\`proposal_number\`),\n`;
  sql += `  INDEX idx_prop_branch (\`branch_id\`)\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  const props = db.prepare('SELECT * FROM proposals').all();
  props.forEach(p => {
    sql += `INSERT INTO \`proposals\` (\`id\`, \`proposal_number\`, \`customer_name\`, \`location\`, \`phone\`, \`date\`, \`retail_total\`, \`cost_total\`, \`profit\`, \`status\`, \`received_amount\`, \`discount\`, \`seller_name\`, \`payment_method\`, \`tax_percent\`, \`tax_amount\`, \`subtotal\`, \`sale_mode\`, \`branch_id\`) VALUES (${p.id}, ${escapeSql(p.proposal_number)}, ${escapeSql(p.customer_name)}, ${escapeSql(p.location)}, ${escapeSql(p.phone)}, ${escapeSql(p.date)}, ${p.retail_total || 0}, ${p.cost_total || 0}, ${p.profit || 0}, ${escapeSql(p.status)}, ${p.received_amount || 0}, ${p.discount || 0}, ${escapeSql(p.seller_name)}, ${escapeSql(p.payment_method || 'Cash')}, ${p.tax_percent || 0}, ${p.tax_amount || 0}, ${p.subtotal || 0}, ${escapeSql(p.sale_mode || 'retail')}, 'b1');\n`;
  });
  sql += `\n`;

  // 9. Proposal Items
  sql += `-- Table: proposal_items\n`;
  sql += `CREATE TABLE IF NOT EXISTS \`proposal_items\` (\n`;
  sql += `  \`id\` INT AUTO_INCREMENT PRIMARY KEY,\n`;
  sql += `  \`proposal_id\` INT NOT NULL,\n`;
  sql += `  \`item_id\` INT NULL,\n`;
  sql += `  \`section\` VARCHAR(100) NULL,\n`;
  sql += `  \`description\` VARCHAR(255) NULL,\n`;
  sql += `  \`qty\` DECIMAL(10,2) DEFAULT 0,\n`;
  sql += `  \`unit\` VARCHAR(50) DEFAULT 'pcs',\n`;
  sql += `  \`unit_cost\` DECIMAL(12,2) DEFAULT 0,\n`;
  sql += `  \`unit_retail\` DECIMAL(12,2) DEFAULT 0,\n`;
  sql += `  \`unit_discounted\` DECIMAL(12,2) DEFAULT 0,\n`;
  sql += `  \`line_cost\` DECIMAL(12,2) DEFAULT 0,\n`;
  sql += `  \`line_retail\` DECIMAL(12,2) DEFAULT 0,\n`;
  sql += `  \`line_profit\` DECIMAL(12,2) DEFAULT 0,\n`;
  sql += `  INDEX idx_prop_item_pid (\`proposal_id\`)\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  const items = db.prepare('SELECT * FROM proposal_items').all();
  items.forEach(it => {
    sql += `INSERT INTO \`proposal_items\` (\`id\`, \`proposal_id\`, \`item_id\`, \`section\`, \`description\`, \`qty\`, \`unit\`, \`unit_cost\`, \`unit_retail\`, \`unit_discounted\`, \`line_cost\`, \`line_retail\`, \`line_profit\`) VALUES (${it.id}, ${it.proposal_id}, ${it.item_id ? it.item_id : 'NULL'}, ${escapeSql(it.section)}, ${escapeSql(it.description)}, ${it.qty || 0}, ${escapeSql(it.unit || 'pcs')}, ${it.unit_cost || 0}, ${it.unit_retail || 0}, ${it.unit_discounted || it.unit_retail || 0}, ${it.line_cost || 0}, ${it.line_retail || 0}, ${it.line_profit || 0});\n`;
  });
  sql += `\n`;

  // 10. Expenses & Categories
  sql += `-- Table: expense_categories & expenses\n`;
  sql += `CREATE TABLE IF NOT EXISTS \`expense_categories\` (\n`;
  sql += `  \`id\` INT AUTO_INCREMENT PRIMARY KEY,\n`;
  sql += `  \`name\` VARCHAR(100) NOT NULL UNIQUE\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  const expCats = db.prepare('SELECT * FROM expense_categories').all();
  expCats.forEach(ec => {
    sql += `INSERT INTO \`expense_categories\` (\`id\`, \`name\`) VALUES (${ec.id}, ${escapeSql(ec.name)}) ON DUPLICATE KEY UPDATE \`name\` = VALUES(\`name\`);\n`;
  });
  sql += `\n`;

  sql += `CREATE TABLE IF NOT EXISTS \`expenses\` (\n`;
  sql += `  \`id\` INT AUTO_INCREMENT PRIMARY KEY,\n`;
  sql += `  \`date\` VARCHAR(50) NULL,\n`;
  sql += `  \`category\` VARCHAR(100) NULL,\n`;
  sql += `  \`amount\` DECIMAL(12,2) DEFAULT 0,\n`;
  sql += `  \`description\` TEXT NULL,\n`;
  sql += `  \`paid_by\` VARCHAR(100) NULL,\n`;
  sql += `  \`notes\` TEXT NULL,\n`;
  sql += `  \`branch_id\` VARCHAR(10) DEFAULT 'b1',\n`;
  sql += `  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  const expenses = db.prepare('SELECT * FROM expenses').all();
  expenses.forEach(e => {
    sql += `INSERT INTO \`expenses\` (\`id\`, \`date\`, \`category\`, \`amount\`, \`description\`, \`paid_by\`, \`notes\`, \`branch_id\`) VALUES (${e.id}, ${escapeSql(e.date)}, ${escapeSql(e.category)}, ${e.amount || 0}, ${escapeSql(e.description)}, ${escapeSql(e.paid_by)}, ${escapeSql(e.notes)}, 'b1');\n`;
  });
  sql += `\n`;

  // 11. Product Rate History
  sql += `-- Table: product_rate_history\n`;
  sql += `CREATE TABLE IF NOT EXISTS \`product_rate_history\` (\n`;
  sql += `  \`id\` INT AUTO_INCREMENT PRIMARY KEY,\n`;
  sql += `  \`category_slug\` VARCHAR(100) NULL,\n`;
  sql += `  \`product_id\` INT NULL,\n`;
  sql += `  \`item_name\` VARCHAR(255) NULL,\n`;
  sql += `  \`old_stock\` DECIMAL(10,2) DEFAULT 0,\n`;
  sql += `  \`added_qty\` DECIMAL(10,2) DEFAULT 0,\n`;
  sql += `  \`new_stock\` DECIMAL(10,2) DEFAULT 0,\n`;
  sql += `  \`old_cost_price\` DECIMAL(12,2) DEFAULT 0,\n`;
  sql += `  \`purchase_price\` DECIMAL(12,2) DEFAULT 0,\n`;
  sql += `  \`new_cost_price\` DECIMAL(12,2) DEFAULT 0,\n`;
  sql += `  \`retail_price\` DECIMAL(12,2) DEFAULT 0,\n`;
  sql += `  \`wholesale_price\` DECIMAL(12,2) DEFAULT 0,\n`;
  sql += `  \`source\` VARCHAR(100) NULL,\n`;
  sql += `  \`notes\` TEXT NULL,\n`;
  sql += `  \`branch_id\` VARCHAR(10) DEFAULT 'b1',\n`;
  sql += `  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  try {
    const rateHistory = db.prepare('SELECT * FROM product_rate_history').all();
    rateHistory.forEach(r => {
      sql += `INSERT INTO \`product_rate_history\` (\`id\`, \`category_slug\`, \`product_id\`, \`item_name\`, \`old_stock\`, \`added_qty\`, \`new_stock\`, \`old_cost_price\`, \`purchase_price\`, \`new_cost_price\`, \`retail_price\`, \`wholesale_price\`, \`source\`, \`notes\`, \`branch_id\`) VALUES (${r.id}, ${escapeSql(r.category_slug)}, ${r.product_id || 'NULL'}, ${escapeSql(r.item_name)}, ${r.old_stock || 0}, ${r.added_qty || 0}, ${r.new_stock || 0}, ${r.old_cost_price || 0}, ${r.purchase_price || 0}, ${r.new_cost_price || 0}, ${r.retail_price || 0}, ${r.wholesale_price || 0}, ${escapeSql(r.source)}, ${escapeSql(r.notes)}, 'b1');\n`;
    });
  } catch(e) {}
  sql += `\n`;

  sql += `SET FOREIGN_KEY_CHECKS = 1;\n`;

  fs.writeFileSync('hostinger_database.sql', sql, 'utf8');
  console.log('✅ hostinger_database.sql generated successfully!');
  db.close();
}

runExport();
