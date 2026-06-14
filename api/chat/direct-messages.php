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
    $other_user_id = $_GET['user_id'] ?? null;
    
    if (!$other_user_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'User ID required']);
        exit;
    }
    
    $db = Database::getInstance()->getConnection();
    
    $sql = "SELECT dm.*, u.name as user_name 
            FROM direct_messages dm 
            JOIN users u ON dm.sender_id = u.id 
            WHERE (dm.sender_id = ? AND dm.receiver_id = ?) 
               OR (dm.sender_id = ? AND dm.receiver_id = ?)
            ORDER BY dm.created_at DESC 
            LIMIT 50";
    
    $stmt = $db->prepare($sql);
    $stmt->bind_param('iiii', $user_id, $other_user_id, $other_user_id, $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $messages = $result->fetch_all(MYSQLI_ASSOC);
    
    // Reverse to show oldest first
    $messages = array_reverse($messages);
    
    echo json_encode([
        'success' => true,
        'messages' => $messages
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching messages: ' . $e->getMessage()
    ]);
}
?>