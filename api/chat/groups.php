<?php
// chat/groups.php
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
    
    // Fixed SQL query - removed ambiguous columns and fixed joins
    $sql = "SELECT g.*, 
                   COUNT(DISTINCT gm2.user_id) as member_count,
                   SUM(CASE WHEN us.last_activity > DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 1 ELSE 0 END) as online_count,
                   CASE WHEN gm.user_id IS NOT NULL THEN 1 ELSE 0 END as is_member,
                   (SELECT COUNT(*) FROM group_messages gm_msg 
                    WHERE gm_msg.group_id = g.id AND gm_msg.sender_id != ? AND gm_msg.is_read = 0) as unread_count,
                   (SELECT gm_msg.message FROM group_messages gm_msg 
                    WHERE gm_msg.group_id = g.id 
                    ORDER BY gm_msg.created_at DESC LIMIT 1) as last_message
            FROM `groups` g
            LEFT JOIN group_members gm ON g.id = gm.group_id AND gm.user_id = ?
            LEFT JOIN group_members gm2 ON g.id = gm2.group_id
            LEFT JOIN user_sessions us ON gm2.user_id = us.user_id
            GROUP BY g.id
            ORDER BY g.created_at DESC";
    
    $stmt = $db->prepare($sql);
    if (!$stmt) {
        throw new Exception('Failed to prepare SQL statement: ' . $db->error);
    }
    
    $stmt->bind_param('ii', $user_id, $user_id);
    
    if (!$stmt->execute()) {
        throw new Exception('Failed to execute SQL statement: ' . $stmt->error);
    }
    
    $result = $stmt->get_result();
    $groups = $result->fetch_all(MYSQLI_ASSOC);
    
    echo json_encode([
        'success' => true,
        'groups' => $groups
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching groups: ' . $e->getMessage()
    ]);
}
?>