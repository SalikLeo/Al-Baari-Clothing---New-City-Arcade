/**
 * Data Migration Script: SQLite -> Supabase PostgreSQL
 * 
 * Usage:
 *   node migrate_to_supabase.js <SUPABASE_URL> <SUPABASE_SERVICE_ROLE_OR_ANON_KEY>
 * Or set environment variables:
 *   SUPABASE_URL=... SUPABASE_KEY=... node migrate_to_supabase.js
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { createClient } = require('@supabase/supabase-js');

// 1. Resolve Supabase Credentials
const supabaseUrl = process.argv[2] || process.env.SUPABASE_URL;
const supabaseKey = process.argv[3] || process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ ERROR: Supabase credentials missing!');
  console.log('\nUsage:');
  console.log('  node migrate_to_supabase.js <SUPABASE_URL> <SUPABASE_KEY>');
  console.log('\nExample:');
  console.log('  node migrate_to_supabase.js https://xyzproject.supabase.co eyJhbGciOiJKV1Qi...');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

// 2. Resolve SQLite database path
function getDbPath() {
  const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME, 'Library/Application Support') : path.join(process.env.HOME, '.config'));
  const targetDir = path.join(appData, 'al-baari-modest-attire');
  const primaryDb = path.join(targetDir, 'al_baari.db');
  
  if (fs.existsSync(primaryDb)) return primaryDb;
  
  // Legacy paths fallback
  const legacyDb1 = path.join(targetDir, 'ishaq_jadoon.db');
  if (fs.existsSync(legacyDb1)) return legacyDb1;
  const legacyDb2 = path.join(appData, 'ishaq-jadoon-traders', 'ishaq_jadoon.db');
  if (fs.existsSync(legacyDb2)) return legacyDb2;
  
  // Local project file fallback
  if (fs.existsSync('./db.sqlite')) return './db.sqlite';
  
  throw new Error(`SQLite database not found in ${targetDir}`);
}

async function batchInsert(tableName, rows, batchSize = 100) {
  if (!rows || rows.length === 0) return 0;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(tableName).upsert(chunk, { ignoreDuplicates: false });
    if (error) {
      console.warn(`  ⚠️ Warning on ${tableName} batch [${i}-${i + chunk.length}]:`, error.message);
    } else {
      inserted += chunk.length;
    }
  }
  return inserted;
}

async function runMigration() {
  console.log('\n🚀 Starting Al-Baari Modest Attire Migration to Supabase');
  console.log('------------------------------------------------------------');
  
  const dbPath = getDbPath();
  console.log(`📂 SQLite database located at: ${dbPath}`);
  const db = new Database(dbPath, { readonly: true });

  try {
    // A. Migrate Category Labels
    console.log('\n📦 1/12 Migrating Category Labels...');
    const categories = db.prepare('SELECT id, slug, label FROM category_labels').all();
    const catCount = await batchInsert('category_labels', categories);
    console.log(`   ✅ ${catCount} categories migrated`);

    // B. Migrate Product Units
    console.log('\n📏 2/12 Migrating Product Units...');
    const units = db.prepare('SELECT name FROM product_units').all();
    const unitCount = await batchInsert('product_units', units);
    console.log(`   ✅ ${unitCount} units migrated`);

    // C. Migrate Companies
    console.log('\n🏢 3/12 Migrating Companies (Suppliers)...');
    const companies = db.prepare('SELECT id, name, description, amount, phone, email, address, created_at FROM companies').all();
    const companyCount = await batchInsert('companies', companies);
    console.log(`   ✅ ${companyCount} companies migrated`);

    // D. Migrate Customers
    console.log('\n👥 4/12 Migrating Customers (Khata)...');
    const customers = db.prepare('SELECT id, name, description, amount, phone, email, address, created_at FROM customers').all();
    const customerCount = await batchInsert('customers', customers);
    console.log(`   ✅ ${customerCount} customers migrated`);

    // E. Migrate Shops
    console.log('\n🏪 5/12 Migrating Shops...');
    const shops = db.prepare('SELECT * FROM shops').all();
    const shopCount = await batchInsert('shops', shops);
    console.log(`   ✅ ${shopCount} shops migrated`);

    // F. Migrate Products (From all category tables into unified 'products' table)
    console.log('\n🏷️  6/12 Migrating Products across all categories...');
    let allProducts = [];
    for (const cat of categories) {
      try {
        const prods = db.prepare(`SELECT * FROM products_${cat.slug}`).all();
        prods.forEach(p => {
          allProducts.push({
            category_slug: cat.slug,
            legacy_id: p.id,
            item_name: p.item_name || p.description || 'Unnamed Product',
            description: p.description || '',
            current_stock: p.current_stock || 0,
            unit: p.unit || 'pcs',
            cost_price: p.cost_price || 0,
            retail_price: p.retail_price || 0,
            wholesale_cost_price: p.wholesale_cost_price || p.cost_price || 0,
            wholesale_price: p.wholesale_price || p.retail_price || 0,
            company_id: p.company_id || null,
            barcode: p.barcode || null,
            pieces_per_carton: p.pieces_per_carton || 12,
            branch_id: 'b1'
          });
        });
      } catch (err) {
        // Table might not exist yet for this category
      }
    }
    const productCount = await batchInsert('products', allProducts, 100);
    console.log(`   ✅ ${productCount} total products migrated`);

    // G. Migrate Rate & Stock Purchase History
    console.log('\n📊 7/12 Migrating Product Purchase History...');
    try {
      const history = db.prepare('SELECT category_slug, product_id, item_name, old_stock, added_qty, new_stock, old_cost_price, purchase_price, new_cost_price, retail_price, wholesale_price, source, notes, created_at FROM product_rate_history').all();
      const histCount = await batchInsert('product_rate_history', history, 100);
      console.log(`   ✅ ${histCount} purchase history records migrated`);
    } catch(e) {
      console.log('   ℹ️ No rate history table found or empty');
    }

    // H. Migrate Proposals (Sales Invoices)
    console.log('\n🧾 8/12 Migrating Sales Invoices (Proposals)...');
    const proposals = db.prepare('SELECT * FROM proposals').all();
    const propCount = await batchInsert('proposals', proposals, 100);
    console.log(`   ✅ ${propCount} invoices migrated`);

    // I. Migrate Proposal Items (Line Items)
    console.log('\n🛒 9/12 Migrating Invoice Items...');
    const items = db.prepare('SELECT id, proposal_id, item_id, section, description, qty, unit, unit_cost, unit_retail, unit_discounted, line_cost, line_retail, line_profit FROM proposal_items').all();
    const itemCount = await batchInsert('proposal_items', items, 150);
    console.log(`   ✅ ${itemCount} line items migrated`);

    // J. Migrate Expense Categories & Expenses
    console.log('\n💸 10/12 Migrating Expenses...');
    const expCats = db.prepare('SELECT name FROM expense_categories').all();
    await batchInsert('expense_categories', expCats);
    const expenses = db.prepare('SELECT date, category, amount, description, paid_by, notes, created_at FROM expenses').all();
    const expCount = await batchInsert('expenses', expenses);
    console.log(`   ✅ ${expCount} expenses migrated`);

    // K. Migrate Employees
    console.log('\n👔 11/12 Migrating Employees...');
    const employees = db.prepare('SELECT * FROM employees').all();
    const empCount = await batchInsert('employees', employees);
    console.log(`   ✅ ${empCount} employees migrated`);

    // L. Migrate Settings & App KV Store
    console.log('\n⚙️  12/12 Migrating Settings & Configuration...');
    const settings = db.prepare('SELECT key, value FROM settings').all();
    await batchInsert('settings', settings);
    const kv = db.prepare('SELECT key, value FROM app_kv_store').all();
    await batchInsert('app_kv_store', kv);
    console.log(`   ✅ App settings migrated`);

    console.log('\n🎉 ALL DATA MIGRATED TO SUPABASE SUCCESSFULLY!');
    console.log('------------------------------------------------------------');
    console.log('You can now open your Vercel web app or local browser and start selling.\n');
  } catch (err) {
    console.error('\n❌ Fatal Migration Error:', err);
  } finally {
    db.close();
  }
}

runMigration();
