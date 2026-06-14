<?php
require_once '../config.php';
require_once '../CRUD.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    // Get authenticated user
    $authUser = getAuthUser();
    if (!$authUser) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Authentication required']);
        exit;
    }
    
    $user_id = $authUser['user_id'];
    $input = json_decode(file_get_contents('php://input'), true);
    
    $db = Database::getInstance()->getConnection();
    
    // Debug logging (remove in production)
    error_log("Mark read request: " . print_r($input, true));
    
    if (isset($input['group_id']) && $input['group_id']) {
        // Mark group messages as read
        $sql = "UPDATE group_messages SET is_read = 1 
                WHERE group_id = ? AND sender_id = ? AND is_read = 0";
        $stmt = $db->prepare($sql);
        
        if (!$stmt) {
            throw new Exception("Failed to prepare group message query: " . $db->error);
        }
        
        $stmt->bind_param('ii', $input['group_id'], $user_id);
        $stmt->execute();
        
        $affected_rows = $stmt->affected_rows;
        $stmt->close();
        
        error_log("Marked $affected_rows group messages as read for user $user_id in group {$input['group_id']}");
        
    } elseif (isset($input['user_id']) && $input['user_id']) {
        // Mark direct messages as read
        $sql = "UPDATE direct_messages SET is_read = 1 
                WHERE sender_id = ? AND receiver_id = ? AND is_read = 0";
        $stmt = $db->prepare($sql);
        
        if (!$stmt) {
            throw new Exception("Failed to prepare direct message query: " . $db->error);
        }
        
        $stmt->bind_param('ii', $input['user_id'], $user_id);
        $stmt->execute();
        
        $affected_rows = $stmt->affected_rows;
        $stmt->close();
        
        error_log("Marked $affected_rows direct messages as read for user $user_id from sender {$input['user_id']}");
        
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Valid Group ID or User ID required']);
        exit;
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Messages marked as read',
        'affected_rows' => $affected_rows
    ]);
    
} catch (Exception $e) {
    error_log("Error in mark-read.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error marking messages as read: ' . $e->getMessage()
    ]);
}
?>