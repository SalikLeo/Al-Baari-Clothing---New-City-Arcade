<?php
/**
 * Hostinger Database Configuration
 * 
 * Fill in your MySQL database credentials from Hostinger hPanel -> Databases -> MySQL Databases
 */

define('DB_HOST', 'localhost');
define('DB_NAME', 'albaari_db');      // e.g. u123456789_albaari
define('DB_USER', 'albaari_user');    // e.g. u123456789_albaari
define('DB_PASS', 'your_db_password');// Your database password
define('DB_CHARSET', 'utf8mb4');

// Establish PDO connection
function getDbConnection() {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        return $pdo;
    } catch (\PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
        exit;
    }
}
