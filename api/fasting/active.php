<?php
require_once '../config.php';
require_once '../CRUD.php';

header('Content-Type: application/json');

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
    
    $sql = "SELECT uf.*, fp.name as plan_name 
            FROM user_fasts uf 
            JOIN fasting_plans fp ON uf.plan_id = fp.id 
            WHERE uf.user_id = ? AND uf.status = 'active' 
            ORDER BY uf.start_date DESC";
    
    $stmt = $db->prepare($sql);
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $fasts = $result->fetch_all(MYSQLI_ASSOC);
    
    // Calculate progress for each fast
    foreach ($fasts as &$fast) {
        $start = new DateTime($fast['start_date']);
        $end = new DateTime($fast['end_date']);
        $now = new DateTime();
        
        $totalDuration = $end->getTimestamp() - $start->getTimestamp();
        $elapsed = $now->getTimestamp() - $start->getTimestamp();
        
        if ($totalDuration > 0) {
            $progress = min(100, ($elapsed / $totalDuration) * 100);
            $fast['progress_percent'] = round($progress);
        } else {
            $fast['progress_percent'] = 100;
        }
    }
    
    echo json_encode([
        'success' => true,
        'fasts' => $fasts
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching active fasts: ' . $e->getMessage()
    ]);
}
?>