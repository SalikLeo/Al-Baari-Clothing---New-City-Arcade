<?php
/**
 * Al-Baari Modest Attire - Central PHP REST API for Hostinger
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config.php';

$action = $_GET['action'] ?? '';
$input = json_decode(file_get_contents('php://input'), true) ?? [];
$branchId = $_GET['branch_id'] ?? $input['branch_id'] ?? 'b1';

try {
    $db = getDbConnection();

    switch ($action) {
        case 'ping':
            echo json_encode(['success' => true, 'time' => date('Y-m-d H:i:s'), 'db' => DB_NAME]);
            break;

        // --- SETTINGS ---
        case 'getSettings':
            $stmt = $db->query("SELECT `key`, `value` FROM settings");
            $rows = $stmt->fetchAll();
            $res = [
                'company_name' => 'Al-Baari Modest Attire',
                'branch_name'  => $branchId === 'b2' ? 'Branch 2' : 'Branch 1',
                'branch_id'    => $branchId,
                'address'      => 'Wah Cantt',
                'phone'        => '0335-0059819',
                'tagline'      => "Returns & exchange accepted within 2 days.\nItems must be unworn with original tags attached.",
                'logo_path'    => '',
                'website'      => '',
                'auto_backup_dir' => 'Hostinger Cloud Database'
            ];
            foreach ($rows as $r) {
                $res[$r['key']] = $r['value'];
            }
            echo json_encode($res);
            break;

        case 'saveSettings':
            $stmt = $db->prepare("INSERT INTO settings (`key`, `value`, `branch_id`) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)");
            foreach ($input as $k => $v) {
                $valStr = is_array($v) ? json_encode($v) : (string)$v;
                $stmt->execute([$k, $valStr, $branchId]);
            }
            echo json_encode(['success' => true]);
            break;

        // --- CATEGORIES & UNITS ---
        case 'getCategoryLabels':
            $stmt = $db->query("SELECT * FROM category_labels ORDER BY id ASC");
            echo json_encode($stmt->fetchAll());
            break;

        case 'getCategoryStats':
            $cats = $db->query("SELECT * FROM category_labels ORDER BY id ASC")->fetchAll();
            $counts = [];
            $stmt = $db->prepare("SELECT category_slug, COUNT(*) as c FROM products WHERE branch_id = ? GROUP BY category_slug");
            $stmt->execute([$branchId]);
            foreach ($stmt->fetchAll() as $row) {
                $counts[$row['category_slug']] = (int)$row['c'];
            }
            foreach ($cats as &$cat) {
                $cat['count'] = $counts[$cat['slug']] ?? 0;
            }
            echo json_encode($cats);
            break;

        case 'updateCategoryLabel':
            $stmt = $db->prepare("UPDATE category_labels SET label = ? WHERE slug = ?");
            $stmt->execute([$input['label'] ?? '', $input['slug'] ?? '']);
            echo json_encode(['success' => true]);
            break;

        case 'addCategory':
            $label = trim($input['label'] ?? '');
            $slug = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '_', $label));
            $stmt = $db->prepare("INSERT INTO category_labels (slug, label) VALUES (?, ?)");
            $stmt->execute([$slug, $label]);
            echo json_encode(['success' => true, 'slug' => $slug]);
            break;

        case 'deleteCategory':
            $stmt = $db->prepare("DELETE FROM category_labels WHERE slug = ?");
            $stmt->execute([$input['slug'] ?? '']);
            echo json_encode(['success' => true]);
            break;

        case 'getUnits':
            $stmt = $db->query("SELECT * FROM product_units ORDER BY name ASC");
            echo json_encode($stmt->fetchAll());
            break;

        case 'addUnit':
            $stmt = $db->prepare("INSERT INTO product_units (name) VALUES (?)");
            $stmt->execute([$input['name'] ?? '']);
            echo json_encode($db->lastInsertId());
            break;

        case 'updateUnit':
            $stmt = $db->prepare("UPDATE product_units SET name = ? WHERE id = ?");
            $stmt->execute([$input['name'] ?? '', $input['id'] ?? 0]);
            echo json_encode(['success' => true]);
            break;

        case 'deleteUnit':
            $stmt = $db->prepare("DELETE FROM product_units WHERE id = ?");
            $stmt->execute([$input['id'] ?? 0]);
            echo json_encode(['success' => true]);
            break;

        // --- PRODUCTS ---
        case 'getProducts':
            $cat = $_GET['category'] ?? '';
            $comp = $_GET['company_id'] ?? null;
            if (!$cat || $cat === 'all') {
                $sql = "SELECT p.*, c.name as company_name, p.category_slug as slug FROM products p LEFT JOIN companies c ON c.id = p.company_id WHERE p.branch_id = ?";
                $params = [$branchId];
            } else {
                $sql = "SELECT p.*, c.name as company_name, p.category_slug as slug FROM products p LEFT JOIN companies c ON c.id = p.company_id WHERE p.category_slug = ? AND p.branch_id = ?";
                $params = [$cat, $branchId];
            }
            if ($comp) {
                $sql .= " AND p.company_id = ?";
                $params[] = $comp;
            }
            $sql .= " ORDER BY p.id DESC";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            echo json_encode($stmt->fetchAll());
            break;

        case 'searchAllProducts':
            $query = trim($_GET['query'] ?? '');
            $comp = $_GET['company_id'] ?? null;
            $sql = "SELECT p.*, c.name as company_name, p.category_slug as slug, cl.label as category_label 
                    FROM products p 
                    LEFT JOIN companies c ON c.id = p.company_id 
                    LEFT JOIN category_labels cl ON cl.slug = p.category_slug 
                    WHERE p.branch_id = ?";
            $params = [$branchId];
            if ($query !== '') {
                $sql .= " AND (p.item_name LIKE ? OR p.description LIKE ? OR p.barcode LIKE ?)";
                $like = "%$query%";
                $params[] = $like; $params[] = $like; $params[] = $like;
            }
            if ($comp) {
                $sql .= " AND p.company_id = ?";
                $params[] = $comp;
            }
            $sql .= " ORDER BY p.item_name ASC";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            echo json_encode($stmt->fetchAll());
            break;

        case 'findProductByName':
            $name = trim($_GET['name'] ?? '');
            $stmt = $db->prepare("SELECT id, item_name, current_stock, category_slug as slug FROM products WHERE LOWER(TRIM(item_name)) = LOWER(?) AND branch_id = ? LIMIT 1");
            $stmt->execute([$name, $branchId]);
            echo json_encode($stmt->fetch() ?: null);
            break;

        case 'findProductByBarcode':
            $bc = trim($_GET['barcode'] ?? '');
            $stmt = $db->prepare("SELECT p.*, c.name as company_name, p.category_slug as slug FROM products p LEFT JOIN companies c ON c.id = p.company_id WHERE p.barcode = ? AND p.branch_id = ? LIMIT 1");
            $stmt->execute([$bc, $branchId]);
            echo json_encode($stmt->fetch() ?: null);
            break;

        case 'addProduct':
            $stmt = $db->prepare("INSERT INTO products (category_slug, item_name, description, current_stock, unit, cost_price, retail_price, wholesale_cost_price, wholesale_price, company_id, barcode, pieces_per_carton, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $input['category'] ?? $input['category_slug'] ?? 'others',
                $input['item_name'] ?? $input['description'] ?? 'Product',
                $input['description'] ?? '',
                (float)($input['current_stock'] ?? 0),
                $input['unit'] ?? 'pcs',
                (float)($input['cost_price'] ?? 0),
                (float)($input['retail_price'] ?? 0),
                (float)($input['wholesale_cost_price'] ?? $input['cost_price'] ?? 0),
                (float)($input['wholesale_price'] ?? $input['retail_price'] ?? 0),
                !empty($input['company_id']) ? (int)$input['company_id'] : null,
                !empty($input['barcode']) ? trim($input['barcode']) : null,
                (int)($input['pieces_per_carton'] ?? 12),
                $branchId
            ]);
            echo json_encode($db->lastInsertId());
            break;

        case 'updateProduct':
            $id = (int)($input['id'] ?? 0);
            $stmt = $db->prepare("UPDATE products SET item_name = ?, description = ?, current_stock = ?, unit = ?, cost_price = ?, retail_price = ?, wholesale_cost_price = ?, wholesale_price = ?, company_id = ?, barcode = ?, pieces_per_carton = ? WHERE id = ?");
            $stmt->execute([
                $input['item_name'] ?? '',
                $input['description'] ?? '',
                (float)($input['current_stock'] ?? 0),
                $input['unit'] ?? 'pcs',
                (float)($input['cost_price'] ?? 0),
                (float)($input['retail_price'] ?? 0),
                (float)($input['wholesale_cost_price'] ?? 0),
                (float)($input['wholesale_price'] ?? 0),
                !empty($input['company_id']) ? (int)$input['company_id'] : null,
                !empty($input['barcode']) ? trim($input['barcode']) : null,
                (int)($input['pieces_per_carton'] ?? 12),
                $id
            ]);
            echo json_encode(['success' => true]);
            break;

        case 'deleteProduct':
            $id = (int)($input['id'] ?? $_GET['id'] ?? 0);
            $stmt = $db->prepare("DELETE FROM products WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
            break;

        case 'addProductStock':
            $prodId = (int)$input['productId'];
            $addedQty = (float)($input['addedQty'] ?? 0);
            $purchasePrice = (float)($input['purchasePrice'] ?? 0);
            $retailPrice = !empty($input['retailPrice']) ? (float)$input['retailPrice'] : null;
            $wholesalePrice = !empty($input['wholesalePrice']) ? (float)$input['wholesalePrice'] : null;

            $curStmt = $db->prepare("SELECT * FROM products WHERE id = ?");
            $curStmt->execute([$prodId]);
            $cur = $curStmt->fetch();
            if (!$cur) throw new Exception("Product not found");

            $oldStock = (float)$cur['current_stock'];
            $oldCost = (float)$cur['cost_price'];
            $newCost = ($purchasePrice > 0) ? $purchasePrice : $oldCost;
            $newStock = round(max(0, $oldStock) + $addedQty, 2);
            $newRetail = $retailPrice !== null ? $retailPrice : (float)$cur['retail_price'];
            $newWholesale = $wholesalePrice !== null ? $wholesalePrice : (float)$cur['wholesale_price'];

            $upd = $db->prepare("UPDATE products SET current_stock = ?, cost_price = ?, wholesale_cost_price = ?, retail_price = ?, wholesale_price = ? WHERE id = ?");
            $upd->execute([$newStock, $newCost, $newCost, $newRetail, $newWholesale, $prodId]);

            $hist = $db->prepare("INSERT INTO product_rate_history (category_slug, product_id, item_name, old_stock, added_qty, new_stock, old_cost_price, purchase_price, new_cost_price, retail_price, wholesale_price, source, notes, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $hist->execute([
                $cur['category_slug'], $prodId, $cur['item_name'],
                $oldStock, $addedQty, $newStock,
                $oldCost, $purchasePrice, $newCost,
                $newRetail, $newWholesale,
                $input['source'] ?? 'Manual Stock Add',
                $input['notes'] ?? '',
                $branchId
            ]);
            echo json_encode(['success' => true]);
            break;

        case 'getRateHistory':
            $prodId = (int)$_GET['productId'];
            $stmt = $db->prepare("SELECT * FROM product_rate_history WHERE product_id = ? ORDER BY id DESC");
            $stmt->execute([$prodId]);
            echo json_encode($stmt->fetchAll());
            break;

        case 'deleteRateHistory':
            $stmt = $db->prepare("DELETE FROM product_rate_history WHERE id = ?");
            $stmt->execute([(int)$input['id']]);
            echo json_encode(['success' => true]);
            break;

        case 'getAllRatesList':
            $stmt = $db->query("SELECT * FROM product_rate_history ORDER BY id DESC LIMIT 200");
            echo json_encode($stmt->fetchAll());
            break;

        // --- PROPOSALS (SALES INVOICES) ---
        case 'getProposals':
            $stmt = $db->prepare("SELECT * FROM proposals WHERE branch_id = ? ORDER BY id DESC");
            $stmt->execute([$branchId]);
            $proposals = $stmt->fetchAll();

            $pIds = array_column($proposals, 'id');
            $itemsByProp = [];
            if (!empty($pIds)) {
                $inQuery = implode(',', array_map('intval', $pIds));
                $itemStmt = $db->query("SELECT * FROM proposal_items WHERE proposal_id IN ($inQuery)");
                foreach ($itemStmt->fetchAll() as $it) {
                    $itemsByProp[$it['proposal_id']][] = $it;
                }
            }
            foreach ($proposals as &$p) {
                $p['items'] = $itemsByProp[$p['id']] ?? [];
            }
            echo json_encode($proposals);
            break;

        case 'getProposal':
            $id = (int)$_GET['id'];
            $stmt = $db->prepare("SELECT * FROM proposals WHERE id = ?");
            $stmt->execute([$id]);
            $prop = $stmt->fetch();
            if ($prop) {
                $itemStmt = $db->prepare("SELECT * FROM proposal_items WHERE proposal_id = ?");
                $itemStmt->execute([$id]);
                $prop['items'] = $itemStmt->fetchAll();
            }
            echo json_encode($prop ?: null);
            break;

        case 'getNextProposalNumber':
            $stmt = $db->query("SELECT proposal_number, id FROM proposals ORDER BY id DESC LIMIT 1");
            $row = $stmt->fetch();
            if (!$row) {
                echo json_encode('INV-1001');
            } else {
                preg_match('/(\d+)$/', $row['proposal_number'], $m);
                $next = isset($m[1]) ? ((int)$m[1] + 1) : ((int)$row['id'] + 1001);
                echo json_encode("INV-$next");
            }
            break;

        case 'getNextCustomerName':
            $stmt = $db->query("SELECT id FROM customers ORDER BY id DESC LIMIT 1");
            $row = $stmt->fetch();
            $next = $row ? ((int)$row['id'] + 1) : 1;
            echo json_encode("Customer-$next");
            break;

        case 'saveProposal':
            $db->beginTransaction();
            $items = $input['items'] ?? [];
            $propId = !empty($input['id']) ? (int)$input['id'] : 0;

            if ($propId > 0) {
                // Restore old items stock before editing
                $oldStmt = $db->prepare("SELECT item_id, qty FROM proposal_items WHERE proposal_id = ?");
                $oldStmt->execute([$propId]);
                $restStock = $db->prepare("UPDATE products SET current_stock = ROUND(current_stock + ?, 2) WHERE id = ?");
                foreach ($oldStmt->fetchAll() as $old) {
                    if (!empty($old['item_id'])) $restStock->execute([(float)$old['qty'], (int)$old['item_id']]);
                }

                $updProp = $db->prepare("UPDATE proposals SET proposal_number = ?, customer_name = ?, location = ?, phone = ?, date = ?, retail_total = ?, cost_total = ?, profit = ?, status = ?, received_amount = ?, discount = ?, seller_name = ?, payment_method = ?, tax_percent = ?, tax_amount = ?, subtotal = ?, sale_mode = ? WHERE id = ?");
                $updProp->execute([
                    $input['proposal_number'] ?? '', $input['customer_name'] ?? '', $input['location'] ?? '', $input['phone'] ?? '', $input['date'] ?? date('Y-m-d'),
                    (float)($input['retail_total'] ?? 0), (float)($input['cost_total'] ?? 0), (float)($input['profit'] ?? 0), $input['status'] ?? 'active',
                    (float)($input['received_amount'] ?? 0), (float)($input['discount'] ?? 0), $input['seller_name'] ?? '', $input['payment_method'] ?? 'Cash',
                    (float)($input['tax_percent'] ?? 0), (float)($input['tax_amount'] ?? 0), (float)($input['subtotal'] ?? 0), $input['sale_mode'] ?? 'retail',
                    $propId
                ]);

                $delItems = $db->prepare("DELETE FROM proposal_items WHERE proposal_id = ?");
                $delItems->execute([$propId]);
            } else {
                $insProp = $db->prepare("INSERT INTO proposals (proposal_number, customer_name, location, phone, date, retail_total, cost_total, profit, status, received_amount, discount, seller_name, payment_method, tax_percent, tax_amount, subtotal, sale_mode, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $insProp->execute([
                    $input['proposal_number'] ?? '', $input['customer_name'] ?? '', $input['location'] ?? '', $input['phone'] ?? '', $input['date'] ?? date('Y-m-d'),
                    (float)($input['retail_total'] ?? 0), (float)($input['cost_total'] ?? 0), (float)($input['profit'] ?? 0), $input['status'] ?? 'active',
                    (float)($input['received_amount'] ?? 0), (float)($input['discount'] ?? 0), $input['seller_name'] ?? '', $input['payment_method'] ?? 'Cash',
                    (float)($input['tax_percent'] ?? 0), (float)($input['tax_amount'] ?? 0), (float)($input['subtotal'] ?? 0), $input['sale_mode'] ?? 'retail',
                    $branchId
                ]);
                $propId = (int)$db->lastInsertId();
            }

            // Insert line items & deduct stock
            $insItem = $db->prepare("INSERT INTO proposal_items (proposal_id, item_id, section, description, qty, unit, unit_cost, unit_retail, unit_discounted, line_cost, line_retail, line_profit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $deduct = $db->prepare("UPDATE products SET current_stock = GREATEST(0, ROUND(current_stock - ?, 2)) WHERE id = ?");

            foreach ($items as $it) {
                $itemId = !empty($it['item_id']) ? (int)$it['item_id'] : null;
                $qty = (float)($it['qty'] ?? 0);
                $insItem->execute([
                    $propId, $itemId, $it['section'] ?? '', $it['description'] ?? '',
                    $qty, $it['unit'] ?? 'pcs', (float)($it['unit_cost'] ?? 0), (float)($it['unit_retail'] ?? 0),
                    (float)($it['unit_discounted'] ?? $it['unit_retail'] ?? 0), (float)($it['line_cost'] ?? 0),
                    (float)($it['line_retail'] ?? 0), (float)($it['line_profit'] ?? 0)
                ]);
                if ($itemId) $deduct->execute([$qty, $itemId]);
            }

            $db->commit();
            echo json_encode($propId);
            break;

        case 'deleteProposal':
            $db->beginTransaction();
            $id = (int)($input['id'] ?? $_GET['id'] ?? 0);
            $oldStmt = $db->prepare("SELECT item_id, qty FROM proposal_items WHERE proposal_id = ?");
            $oldStmt->execute([$id]);
            $restStock = $db->prepare("UPDATE products SET current_stock = ROUND(current_stock + ?, 2) WHERE id = ?");
            foreach ($oldStmt->fetchAll() as $old) {
                if (!empty($old['item_id'])) $restStock->execute([(float)$old['qty'], (int)$old['item_id']]);
            }
            $db->prepare("DELETE FROM proposal_items WHERE proposal_id = ?")->execute([$id]);
            $db->prepare("DELETE FROM proposals WHERE id = ?")->execute([$id]);
            $db->commit();
            echo json_encode(['success' => true]);
            break;

        case 'receivePayment':
            $ref = $input['id'] ?? 0;
            $amt = (float)($input['amount'] ?? 0);
            $method = $input['paymentMethod'] ?? 'Cash';

            $sel = $db->prepare(is_numeric($ref) ? "SELECT * FROM proposals WHERE id = ?" : "SELECT * FROM proposals WHERE proposal_number = ?");
            $sel->execute([$ref]);
            $p = $sel->fetch();
            if (!$p) throw new Exception("Proposal not found");

            $newRec = (float)$p['received_amount'] + $amt;
            $status = ($newRec >= (float)$p['retail_total']) ? 'Paid' : 'Partial';

            $upd = $db->prepare("UPDATE proposals SET received_amount = ?, status = ?, payment_method = ? WHERE id = ?");
            $upd->execute([$newRec, $status, $method, $p['id']]);
            echo json_encode(['newReceived' => $newRec, 'status' => $status, 'id' => $p['id'], 'proposalNumber' => $p['proposal_number']]);
            break;

        // --- EXPENSES ---
        case 'getExpenses':
            $stmt = $db->prepare("SELECT * FROM expenses WHERE branch_id = ? ORDER BY date DESC");
            $stmt->execute([$branchId]);
            echo json_encode($stmt->fetchAll());
            break;

        case 'saveExpense':
            if (!empty($input['id'])) {
                $stmt = $db->prepare("UPDATE expenses SET date = ?, category = ?, amount = ?, description = ?, paid_by = ?, notes = ? WHERE id = ?");
                $stmt->execute([$input['date'] ?? date('Y-m-d'), $input['category'] ?? 'Other', (float)($input['amount'] ?? 0), $input['description'] ?? '', $input['paid_by'] ?? '', $input['notes'] ?? '', (int)$input['id']]);
            } else {
                $stmt = $db->prepare("INSERT INTO expenses (date, category, amount, description, paid_by, notes, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$input['date'] ?? date('Y-m-d'), $input['category'] ?? 'Other', (float)($input['amount'] ?? 0), $input['description'] ?? '', $input['paid_by'] ?? '', $input['notes'] ?? '', $branchId]);
            }
            echo json_encode(['success' => true]);
            break;

        case 'deleteExpense':
            $stmt = $db->prepare("DELETE FROM expenses WHERE id = ?");
            $stmt->execute([(int)($input['id'] ?? $_GET['id'] ?? 0)]);
            echo json_encode(['success' => true]);
            break;

        case 'getExpenseCategories':
            $stmt = $db->query("SELECT * FROM expense_categories ORDER BY name ASC");
            echo json_encode($stmt->fetchAll());
            break;

        // --- COMPANIES & CUSTOMERS ---
        case 'getCompanies':
            $stmt = $db->prepare("SELECT * FROM companies WHERE branch_id = ? ORDER BY name ASC");
            $stmt->execute([$branchId]);
            echo json_encode($stmt->fetchAll());
            break;

        case 'saveCompany':
            if (!empty($input['id'])) {
                $stmt = $db->prepare("UPDATE companies SET name = ?, description = ?, amount = ?, phone = ?, email = ?, address = ? WHERE id = ?");
                $stmt->execute([$input['name'] ?? '', $input['description'] ?? '', (float)($input['amount'] ?? 0), $input['phone'] ?? '', $input['email'] ?? '', $input['address'] ?? '', (int)$input['id']]);
                echo json_encode($input['id']);
            } else {
                $stmt = $db->prepare("INSERT INTO companies (name, description, amount, phone, email, address, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$input['name'] ?? '', $input['description'] ?? '', (float)($input['amount'] ?? 0), $input['phone'] ?? '', $input['email'] ?? '', $input['address'] ?? '', $branchId]);
                echo json_encode($db->lastInsertId());
            }
            break;

        case 'deleteCompany':
            $stmt = $db->prepare("DELETE FROM companies WHERE id = ?");
            $stmt->execute([(int)($input['id'] ?? $_GET['id'] ?? 0)]);
            echo json_encode(['success' => true]);
            break;

        case 'getCustomers':
            $stmt = $db->prepare("SELECT * FROM customers WHERE branch_id = ? ORDER BY name ASC");
            $stmt->execute([$branchId]);
            echo json_encode($stmt->fetchAll());
            break;

        case 'saveCustomer':
            if (!empty($input['id'])) {
                $stmt = $db->prepare("UPDATE customers SET name = ?, description = ?, amount = ?, phone = ?, email = ?, address = ? WHERE id = ?");
                $stmt->execute([$input['name'] ?? '', $input['description'] ?? '', (float)($input['amount'] ?? 0), $input['phone'] ?? '', $input['email'] ?? '', $input['address'] ?? '', (int)$input['id']]);
                echo json_encode($input['id']);
            } else {
                $stmt = $db->prepare("INSERT INTO customers (name, description, amount, phone, email, address, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$input['name'] ?? '', $input['description'] ?? '', (float)($input['amount'] ?? 0), $input['phone'] ?? '', $input['email'] ?? '', $input['address'] ?? '', $branchId]);
                echo json_encode($db->lastInsertId());
            }
            break;

        case 'deleteCustomer':
            $stmt = $db->prepare("DELETE FROM customers WHERE id = ?");
            $stmt->execute([(int)($input['id'] ?? $_GET['id'] ?? 0)]);
            echo json_encode(['success' => true]);
            break;

        // --- DASHBOARD ---
        case 'getDashboardStats':
            $today = date('Y-m-d');
            $period = $_GET['period'] ?? 'daily';
            $pSql = "SELECT retail_total, cost_total, profit FROM proposals WHERE branch_id = ?";
            $eSql = "SELECT amount FROM expenses WHERE branch_id = ?";
            $params = [$branchId];

            if ($period === 'daily') {
                $pSql .= " AND date = ?"; $eSql .= " AND date LIKE ?";
                $params[] = $today; $eParams = [$branchId, "$today%"];
            } elseif ($period === 'monthly') {
                $m = date('Y-m');
                $pSql .= " AND date LIKE ?"; $eSql .= " AND date LIKE ?";
                $params[] = "$m%"; $eParams = [$branchId, "$m%";
            } else {
                $y = date('Y');
                $pSql .= " AND date LIKE ?"; $eSql .= " AND date LIKE ?";
                $params[] = "$y%"; $eParams = [$branchId, "$y%"];
            }

            $pStmt = $db->prepare($pSql); $pStmt->execute($params);
            $props = $pStmt->fetchAll();

            $eStmt = $db->prepare($eSql); $eStmt->execute($eParams);
            $exps = $eStmt->fetchAll();

            $custStmt = $db->prepare("SELECT SUM(GREATEST(0, amount)) as totalDue FROM customers WHERE branch_id = ?");
            $custStmt->execute([$branchId]);
            $dueRow = $custStmt->fetch();

            $lowStmt = $db->prepare("SELECT COUNT(*) as c FROM products WHERE branch_id = ? AND current_stock <= 5");
            $lowStmt->execute([$branchId]);
            $lowRow = $lowStmt->fetch();

            $sales = array_sum(array_column($props, 'retail_total'));
            $profit = array_sum(array_column($props, 'profit'));
            $totalExp = array_sum(array_column($exps, 'amount'));

            echo json_encode([
                'grossSales' => round($sales),
                'grossProfit' => round($profit),
                'totalExpenses' => round($totalExp),
                'netProfit' => round($profit - $totalExp),
                'totalInvoices' => count($props),
                'customerDue' => round((float)($dueRow['totalDue'] ?? 0)),
                'lowStock' => (int)($lowRow['c'] ?? 0),
                'topSold' => []
            ]);
            break;

        // --- KEY-VALUE STORE ---
        case 'getAllKv':
            $stmt = $db->query("SELECT `key`, `value` FROM app_kv_store");
            $kv = [];
            foreach ($stmt->fetchAll() as $r) { $kv[$r['key']] = $r['value']; }
            echo json_encode($kv);
            break;

        case 'setKv':
            $stmt = $db->prepare("INSERT INTO app_kv_store (`key`, `value`, `branch_id`) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)");
            $stmt->execute([$input['key'] ?? '', is_array($input['value']) ? json_encode($input['value']) : (string)$input['value'], $branchId]);
            echo json_encode(['success' => true]);
            break;

        default:
            http_response_code(404);
            echo json_encode(['error' => "Action '$action' not found"]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
