<?php
// chat/unread-count.php
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
    
    // Count unread group messages - simplified query
    $sql_group = "SELECT COUNT(*) as count 
                  FROM group_messages gm
                  JOIN group_members gmem ON gm.group_id = gmem.group_id
                  WHERE gmem.user_id = ? AND gm.sender_id != ? AND gm.is_read = 0";
    
    $stmt = $db->prepare($sql_group);
    if (!$stmt) {
        throw new Exception('Failed to prepare SQL statement: ' . $db->error);
    }
    
    $stmt->bind_param('ii', $user_id, $user_id);
    $stmt->execute();
    $group_result = $stmt->get_result();
    $group_unread = $group_result->fetch_assoc()['count'];
    
    // Count unread direct messages
    $sql_direct = "SELECT COUNT(*) as count 
                   FROM direct_messages 
                   WHERE receiver_id = ? AND is_read = 0";
    
    $stmt = $db->prepare($sql_direct);
    if (!$stmt) {
        throw new Exception('Failed to prepare SQL statement: ' . $db->error);
    }
    
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $direct_result = $stmt->get_result();
    $direct_unread = $direct_result->fetch_assoc()['count'];
    
    $total_unread = $group_unread + $direct_unread;
    
    echo json_encode([
        'success' => true,
        'unread_count' => $total_unread
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error counting unread messages: ' . $e->getMessage()
    ]);
}
?>