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
    
    $sql = "SELECT uf.*, fp.name as plan_name, fp.duration_days, fp.description as plan_description
            FROM user_fasts uf 
            LEFT JOIN fasting_plans fp ON uf.plan_id = fp.id 
            WHERE uf.user_id = ? 
            ORDER BY uf.start_date DESC";
    
    $stmt = $db->prepare($sql);
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $fasts = $result->fetch_all(MYSQLI_ASSOC);
    
    // Calculate current progress for each fast
    foreach ($fasts as &$fast) {
        $start = new DateTime($fast['start_date']);
        $end = new DateTime($fast['end_date']);
        $now = new DateTime();
        
        $totalDuration = $end->getTimestamp() - $start->getTimestamp();
        $elapsed = $now->getTimestamp() - $start->getTimestamp();
        
        if ($totalDuration > 0 && $fast['status'] === 'active') {
            $progress = min(100, max(0, ($elapsed / $totalDuration) * 100));
            $fast['progress_percent'] = round($progress);
            
            // Calculate time remaining for active fasts
            $timeRemaining = $end->getTimestamp() - $now->getTimestamp();
            $fast['time_remaining_seconds'] = max(0, $timeRemaining);
        } else {
            $fast['progress_percent'] = $fast['status'] === 'completed' ? 100 : 0;
            $fast['time_remaining_seconds'] = 0;
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
        'message' => 'Error fetching user fasts: ' . $e->getMessage()
    ]);
}
?>