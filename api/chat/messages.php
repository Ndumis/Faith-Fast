<?php
// chat/messages.php
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
    $group_id = $_GET['group_id'] ?? null;
    
    if (!$group_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Group ID required']);
        exit;
    }
    
    $db = Database::getInstance()->getConnection();
    
    // Check if user is member of the group
    $checkSql = "SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?";
    $checkStmt = $db->prepare($checkSql);
    if (!$checkStmt) {
        throw new Exception('Failed to prepare check SQL: ' . $db->error);
    }
    
    $checkStmt->bind_param('ii', $group_id, $user_id);
    $checkStmt->execute();
    
    if ($checkStmt->get_result()->num_rows === 0) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Not a member of this group']);
        exit;
    }
    
    $sql = "SELECT gm.*, u.name as user_name 
            FROM group_messages gm 
            JOIN users u ON gm.sender_id = u.id 
            WHERE gm.group_id = ? 
            ORDER BY gm.created_at DESC 
            LIMIT 50";
    
    $stmt = $db->prepare($sql);
    if (!$stmt) {
        throw new Exception('Failed to prepare SQL statement: ' . $db->error);
    }
    
    $stmt->bind_param('i', $group_id);
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