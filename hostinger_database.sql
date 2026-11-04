-- ======================================================================
-- Al-Baari Modest Attire - Fresh Start Database for Hostinger MySQL
-- Brand: Al-Baari Modest Attire | EMA Belle by Al-Baari
-- Import this file into phpMyAdmin on Hostinger for a 100% clean, fresh start.
-- ======================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. DROP EXISTING TABLES FOR CLEAN OVERWRITE
DROP TABLE IF EXISTS `proposal_items`;
DROP TABLE IF EXISTS `proposals`;
DROP TABLE IF EXISTS `product_rate_history`;
DROP TABLE IF EXISTS `favorites`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `customers`;
DROP TABLE IF EXISTS `companies`;
DROP TABLE IF EXISTS `shops`;
DROP TABLE IF EXISTS `employees`;
DROP TABLE IF EXISTS `expenses`;
DROP TABLE IF EXISTS `expense_categories`;
DROP TABLE IF EXISTS `product_units`;
DROP TABLE IF EXISTS `category_labels`;
DROP TABLE IF EXISTS `app_kv_store`;
DROP TABLE IF EXISTS `settings`;

-- 2. CREATE SETTINGS & KEY-VALUE STORE
CREATE TABLE `settings` (
  `key` VARCHAR(100) NOT NULL PRIMARY KEY,
  `value` LONGTEXT NULL,
  `branch_id` VARCHAR(10) DEFAULT 'b1',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `app_kv_store` (
  `key` VARCHAR(100) NOT NULL PRIMARY KEY,
  `value` LONGTEXT NULL,
  `branch_id` VARCHAR(10) DEFAULT 'b1',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. CREATE CATEGORIES & UNITS
CREATE TABLE `category_labels` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `slug` VARCHAR(100) NOT NULL UNIQUE,
  `label` VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `product_units` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. CREATE SUPPLIERS (COMPANIES) & CUSTOMERS (KHATA)
CREATE TABLE `companies` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `amount` DECIMAL(12,2) DEFAULT 0,
  `phone` VARCHAR(50) NULL,
  `email` VARCHAR(100) NULL,
  `address` TEXT NULL,
  `branch_id` VARCHAR(10) DEFAULT 'b1',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `customers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `amount` DECIMAL(12,2) DEFAULT 0,
  `phone` VARCHAR(50) NULL,
  `email` VARCHAR(100) NULL,
  `address` TEXT NULL,
  `branch_id` VARCHAR(10) DEFAULT 'b1',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `shops` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `owner_name` VARCHAR(255) NULL,
  `phone` VARCHAR(50) NULL,
  `address` TEXT NULL,
  `city` VARCHAR(100) DEFAULT 'Wah Cantt',
  `amount` DECIMAL(12,2) DEFAULT 0,
  `notes` TEXT NULL,
  `branch_id` VARCHAR(10) DEFAULT 'b1',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. CREATE PRODUCTS TABLE (EMPTY - FRESH START)
CREATE TABLE `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `category_slug` VARCHAR(100) NOT NULL,
  `item_name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `current_stock` DECIMAL(10,2) DEFAULT 0,
  `unit` VARCHAR(50) DEFAULT 'pcs',
  `cost_price` DECIMAL(12,2) DEFAULT 0,
  `retail_price` DECIMAL(12,2) DEFAULT 0,
  `wholesale_cost_price` DECIMAL(12,2) DEFAULT 0,
  `wholesale_price` DECIMAL(12,2) DEFAULT 0,
  `company_id` INT NULL,
  `barcode` VARCHAR(100) NULL,
  `pieces_per_carton` INT DEFAULT 12,
  `branch_id` VARCHAR(10) DEFAULT 'b1',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_prod_cat (`category_slug`, `branch_id`),
  INDEX idx_prod_barcode (`barcode`),
  INDEX idx_prod_name (`item_name`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4;

CREATE TABLE `favorites` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `category_slug` VARCHAR(100),
  `product_id` INT,
  `branch_id` VARCHAR(10) DEFAULT 'b1',
  UNIQUE KEY `fav_unique` (`category_slug`, `product_id`, `branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `product_rate_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `category_slug` VARCHAR(100) NULL,
  `product_id` INT NULL,
  `item_name` VARCHAR(255) NULL,
  `old_stock` DECIMAL(10,2) DEFAULT 0,
  `added_qty` DECIMAL(10,2) DEFAULT 0,
  `new_stock` DECIMAL(10,2) DEFAULT 0,
  `old_cost_price` DECIMAL(12,2) DEFAULT 0,
  `purchase_price` DECIMAL(12,2) DEFAULT 0,
  `new_cost_price` DECIMAL(12,2) DEFAULT 0,
  `retail_price` DECIMAL(12,2) DEFAULT 0,
  `wholesale_price` DECIMAL(12,2) DEFAULT 0,
  `source` VARCHAR(100) NULL,
  `notes` TEXT NULL,
  `branch_id` VARCHAR(10) DEFAULT 'b1',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4;

-- 6. CREATE PROPOSALS (SALES INVOICES) & LINE ITEMS (EMPTY - FRESH START)
CREATE TABLE `proposals` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `proposal_number` VARCHAR(100) NOT NULL,
  `customer_name` VARCHAR(255) NULL,
  `location` TEXT NULL,
  `phone` VARCHAR(50) NULL,
  `date` VARCHAR(50) NULL,
  `retail_total` DECIMAL(12,2) DEFAULT 0,
  `cost_total` DECIMAL(12,2) DEFAULT 0,
  `profit` DECIMAL(12,2) DEFAULT 0,
  `status` VARCHAR(50) DEFAULT 'active',
  `received_amount` DECIMAL(12,2) DEFAULT 0,
  `discount` DECIMAL(12,2) DEFAULT 0,
  `seller_name` VARCHAR(255) NULL,
  `payment_method` VARCHAR(50) DEFAULT 'Cash',
  `tax_percent` DECIMAL(5,2) DEFAULT 0,
  `tax_amount` DECIMAL(12,2) DEFAULT 0,
  `subtotal` DECIMAL(12,2) DEFAULT 0,
  `sale_mode` VARCHAR(50) DEFAULT 'retail',
  `branch_id` VARCHAR(10) DEFAULT 'b1',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_prop_num (`proposal_number`),
  INDEX idx_prop_branch (`branch_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4;

CREATE TABLE `proposal_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `proposal_id` INT NOT NULL,
  `item_id` INT NULL,
  `section` VARCHAR(100) NULL,
  `description` VARCHAR(255) NULL,
  `qty` DECIMAL(10,2) DEFAULT 0,
  `unit` VARCHAR(50) DEFAULT 'pcs',
  `unit_cost` DECIMAL(12,2) DEFAULT 0,
  `unit_retail` DECIMAL(12,2) DEFAULT 0,
  `unit_discounted` DECIMAL(12,2) DEFAULT 0,
  `line_cost` DECIMAL(12,2) DEFAULT 0,
  `line_retail` DECIMAL(12,2) DEFAULT 0,
  `line_profit` DECIMAL(12,2) DEFAULT 0,
  INDEX idx_prop_item_pid (`proposal_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4;

-- 7. CREATE EXPENSES & EMPLOYEES (EMPTY - FRESH START)
CREATE TABLE `expense_categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `expenses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `date` VARCHAR(50) NULL,
  `category` VARCHAR(100) NULL,
  `amount` DECIMAL(12,2) DEFAULT 0,
  `description` TEXT NULL,
  `paid_by` VARCHAR(100) NULL,
  `notes` TEXT NULL,
  `branch_id` VARCHAR(10) DEFAULT 'b1',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4;

CREATE TABLE `employees` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `full_name` VARCHAR(255) NOT NULL,
  `role` VARCHAR(100) NULL,
  `phone` VARCHAR(50) NULL,
  `email` VARCHAR(100) NULL,
  `date_joined` VARCHAR(50) NULL,
  `salary` DECIMAL(12,2) DEFAULT 0,
  `status` VARCHAR(50) DEFAULT 'Active',
  `notes` TEXT NULL,
  `date_inactive` VARCHAR(50) NULL,
  `branch_id` VARCHAR(10) DEFAULT 'b1',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4;

-- ======================================================================
-- 8. INITIAL SEED CONFIGURATION (SETTINGS, CATEGORIES, UNITS)
-- ======================================================================
INSERT INTO `settings` (`key`, `value`, `branch_id`) VALUES
  ('company_name', 'Al-Baari Modest Attire', 'b1'),
  ('branch_name', 'Branch 1', 'b1'),
  ('branch_id', 'b1', 'b1'),
  ('address', 'Wah Cantt', 'b1'),
  ('phone', '0335-0059819', 'b1'),
  ('tagline', 'Returns & exchange accepted within 2 days.\nItems must be unworn with original tags attached.', 'b1'),
  ('auto_backup_dir', 'Hostinger Cloud Database', 'b1');

INSERT INTO `category_labels` (`slug`, `label`) VALUES
  ('abayas', 'Abayas'),
  ('hijabs', 'Hijabs'),
  ('suits', 'Suits & Dresses'),
  ('shawls', 'Shawls & Scarves'),
  ('accessories', 'Accessories'),
  ('others', 'General Items');

INSERT INTO `product_units` (`name`) VALUES
  ('PCS'),
  ('SUIT'),
  ('SET'),
  ('PACK'),
  ('BOX'),
  ('METER');

INSERT INTO `expense_categories` (`name`) VALUES
  ('Office'),
  ('Shop Rent'),
  ('Utilities'),
  ('Salaries'),
  ('Purchase'),
  ('Transport'),
  ('Other');

SET FOREIGN_KEY_CHECKS = 1;
