<?php
// chat/users.php
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
    
    // Simplified SQL query to avoid complex joins
    $sql = "SELECT u.id, u.name, u.email, u.position,
                   CASE WHEN us.last_activity IS NOT NULL AND us.last_activity > DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 1 ELSE 0 END as is_online,
                   (SELECT COUNT(*) FROM direct_messages dm 
                    WHERE dm.receiver_id = ? AND dm.sender_id = u.id AND dm.is_read = 0) as unread_count
            FROM users u
            LEFT JOIN user_sessions us ON u.id = us.user_id
            WHERE u.id != ?
            ORDER BY is_online DESC, u.name ASC";
    
    $stmt = $db->prepare($sql);
    if (!$stmt) {
        throw new Exception('Failed to prepare SQL statement: ' . $db->error);
    }
    
    $stmt->bind_param('ii', $user_id, $user_id);
    
    if (!$stmt->execute()) {
        throw new Exception('Failed to execute SQL statement: ' . $stmt->error);
    }
    
    $result = $stmt->get_result();
    $users = $result->fetch_all(MYSQLI_ASSOC);
    
    echo json_encode([
        'success' => true,
        'users' => $users
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching users: ' . $e->getMessage()
    ]);
}
?>