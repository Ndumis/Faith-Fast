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
    
    $sql = "SELECT * FROM fasting_records WHERE user_id = ? ORDER BY created_at DESC";
    $stmt = $db->prepare($sql);
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $fastingRecords = $result->fetch_all(MYSQLI_ASSOC);
    
    // Calculate current duration for active fasts
    foreach ($fastingRecords as &$record) {
        if ($record['status'] === 'active' && $record['start_date']) {
            $start = new DateTime($record['start_date']);
            $now = new DateTime();
            $record['current_duration_hours'] = $now->diff($start)->h + ($now->diff($start)->days * 24);
        }
    }
    
    echo json_encode([
        'success' => true,
        'fasting_records' => $fastingRecords
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching fasting records: ' . $e->getMessage()
    ]);
}
?>