<?php
require_once '../config.php';
require_once '../Database.php';

header('Content-Type: application/json');

try {
    $db = Database::getInstance()->getConnection();
    
    $sql = "SELECT * FROM fasting_plans WHERE status = 'active' ORDER BY duration_days ASC, difficulty ASC";
    $stmt = $db->prepare($sql);
    $stmt->execute();
    $result = $stmt->get_result();
    $plans = $result->fetch_all(MYSQLI_ASSOC);
    
    echo json_encode([
        'success' => true,
        'plans' => $plans,
        'count' => count($plans)
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching fasting plans: ' . $e->getMessage(),
        'plans' => []
    ]);
}
?>