# Al-Baari Modest Attire - Hostinger Deployment Guide

This guide walks you through deploying your **Al-Baari Modest Attire** Point-of-Sale application onto your **Hostinger Domain & Web Hosting**.

---

## 📁 What Has Been Prepared For You

1. **`hostinger_database.sql`**: A complete, pre-built MySQL dump containing all your **857 products**, **1,004 sales invoices**, **5,627 line items**, **26 customers**, and **11 suppliers**.
2. **`api/index.php` & `api/config.php`**: Fast, secure PHP REST API backend that connects to your Hostinger MySQL database.
3. **`renderer/hostinger-api.js`**: Frontend API bridge that seamlessly connects the POS web app to your Hostinger API.
4. **`.htaccess`**: Optimized LiteSpeed/Apache configuration for clean routing and fast gzip compression.

---

## 🚀 4 Simple Steps to Deploy on Hostinger

### Step 1: Create a MySQL Database in Hostinger
1. Log into your **Hostinger hPanel** ([hpanel.hostinger.com](https://hpanel.hostinger.com)).
2. Go to **Databases** ➔ **MySQL Databases**.
3. Under **Create a New MySQL Database and Database User**:
   * **Database name**: enter a name (e.g., `albaari_db`).
   * **Username**: enter a username (e.g., `albaari_user`).
   * **Password**: enter a strong password (copy and save it).
4. Click **Create**.
5. Note the full database name (Hostinger will prefix it with something like `u123456789_albaari_db`), full username (`u123456789_albaari_user`), and password.

---

### Step 2: Import Your Data in phpMyAdmin
1. On the same **MySQL Databases** page, scroll down to your newly created database and click **Enter phpMyAdmin**.
2. Inside phpMyAdmin, click the **Import** tab at the top.
3. Click **Choose File** and select [`hostinger_database.sql`](./hostinger_database.sql) from your project folder.
4. Scroll to the bottom and click **Import** (or **Go**).
5. In ~5 seconds, phpMyAdmin will import all tables, 857 products, 1,004 invoices, and customer accounts!

---

### Step 3: Configure Database Credentials in `api/config.php`
Open [`api/config.php`](./api/config.php) on your computer or directly in Hostinger File Manager:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'u123456789_albaari_db');  // Your full Hostinger DB name
define('DB_USER', 'u123456789_albaari_user');// Your full Hostinger DB username
define('DB_PASS', 'your_actual_password');    // Your DB password
```

---

### Step 4: Upload Files to `public_html`
1. In Hostinger hPanel, go to **Files** ➔ **File Manager** (or connect via FTP / FileZilla).
2. Open the **`public_html`** folder for your domain.
3. Upload the following into `public_html`:
   * The **`api/`** folder (containing `config.php` and `index.php`)
   * The **`.htaccess`** file
   * All files and folders from inside **`renderer/`** (i.e. `index.html`, `app.js`, `hostinger-api.js`, `pages/`, `styles/`, `libs/`)

> **Structure in `public_html` should look like:**
> ```text
> public_html/
>   ├── api/
>   │    ├── config.php
>   │    └── index.php
>   ├── pages/
>   │    ├── sales-form.js
>   │    ├── proposals.js
>   │    └── ...
>   ├── styles/
>   ├── libs/
>   ├── .htaccess
>   ├── app.js
>   ├── hostinger-api.js
>   └── index.html
> ```

---

## 🌐 Done!
Open your domain in any browser:
```text
https://yourdomain.com
```

Your online POS is now live, connected to your Hostinger MySQL database, with all your stock, customer khatas, and billing history intact!
