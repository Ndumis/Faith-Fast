<?php
require_once '../config.php';
require_once '../CRUD.php';

header('Content-Type: application/json');

try {
    $authUser = getAuthUser();
    if (!$authUser) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Authentication required']);
        exit;
    }
    
    $user_id = $authUser['user_id'];
    
    $db = Database::getInstance()->getConnection();
    
    $sql = "SELECT uf.*, fp.name as plan_name 
            FROM user_fasts uf 
            JOIN fasting_plans fp ON uf.plan_id = fp.id 
            WHERE uf.user_id = ? AND uf.status = 'completed' 
            ORDER BY uf.end_date DESC 
            LIMIT 10";
    
    $stmt = $db->prepare($sql);
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $fasts = $result->fetch_all(MYSQLI_ASSOC);
    
    // Calculate duration for each completed fast
    foreach ($fasts as &$fast) {
        $start = new DateTime($fast['start_date']);
        $end = new DateTime($fast['end_date']);
        $fast['duration_days'] = $start->diff($end)->days;
        $fast['duration_hours'] = $start->diff($end)->h + ($start->diff($end)->days * 24);
    }
    
    echo json_encode([
        'success' => true,
        'fasts' => $fasts
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching completed fasts: ' . $e->getMessage()
    ]);
}
?>