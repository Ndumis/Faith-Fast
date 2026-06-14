<?php
require_once '../config.php';
require_once '../CRUD.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$fast_id = $_GET['id'] ?? null;

if (!$fast_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Fast ID is required']);
    exit;
}

try {
    // Get authenticated user
    $authUser = getAuthUser();
    if (!$authUser) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Authentication required']);
        exit;
    }
    
    $user_id = $authUser['user_id'];
    
    $db = Database::getInstance()->getConnection();
    
    $sql = "SELECT uf.*, fp.name as plan_name, fp.description as plan_description, 
                   fp.duration_days, fp.difficulty
            FROM user_fasts uf 
            LEFT JOIN fasting_plans fp ON uf.plan_id = fp.id 
            WHERE uf.id = ? AND uf.user_id = ?";
    
    $stmt = $db->prepare($sql);
    $stmt->bind_param('ii', $fast_id, $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $fast = $result->fetch_assoc();
    
    if (!$fast) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Fast not found']);
        exit;
    }
    
    // Get journal entries for this fast
    $journalSql = "SELECT * FROM journal_entries 
                   WHERE user_id = ? AND entry_date BETWEEN ? AND ?
                   ORDER BY entry_date DESC";
    $journalStmt = $db->prepare($journalSql);
    $journalStmt->bind_param('iss', $user_id, $fast['start_date'], $fast['end_date']);
    $journalStmt->execute();
    $journalResult = $journalStmt->get_result();
    $fast['journal_entries'] = $journalResult->fetch_all(MYSQLI_ASSOC);
    
    // Calculate statistics
    $start = new DateTime($fast['start_date']);
    $end = new DateTime($fast['end_date']);
    $now = new DateTime();
    
    $fast['total_duration_days'] = $start->diff($end)->days;
    $fast['elapsed_days'] = $start->diff($now)->days;
    $fast['remaining_days'] = max(0, $now->diff($end)->days);
    
    echo json_encode([
        'success' => true,
        'fast' => $fast
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching fast details: ' . $e->getMessage()
    ]);
}
?>