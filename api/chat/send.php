<?php
// chat/send.php
require_once '../config.php';
require_once '../CRUD.php';
require_once '../notifications/_helper.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['message'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Message required']);
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
    $db = Database::getInstance()->getConnection();
    
    if (isset($input['group_id'])) {
        // Group message - check membership
        $checkSql = "SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?";
        $checkStmt = $db->prepare($checkSql);
        if (!$checkStmt) {
            throw new Exception('Failed to prepare check SQL: ' . $db->error);
        }
        
        $checkStmt->bind_param('ii', $input['group_id'], $user_id);
        $checkStmt->execute();
        
        if ($checkStmt->get_result()->num_rows === 0) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Not a member of this group']);
            exit;
        }
        
        $sql = "INSERT INTO group_messages (group_id, sender_id, message, message_type, created_at) 
                VALUES (?, ?, ?, ?, NOW())";
        $stmt = $db->prepare($sql);
        if (!$stmt) {
            throw new Exception('Failed to prepare SQL: ' . $db->error);
        }
        
        $message_type = $input['message_type'] ?? 'text';
        $stmt->bind_param('iiss', $input['group_id'], $user_id, $input['message'], $message_type);
        
    } elseif (isset($input['receiver_id'])) {
        // Direct message
        $sql = "INSERT INTO direct_messages (sender_id, receiver_id, message, message_type, created_at) 
                VALUES (?, ?, ?, ?, NOW())";
        $stmt = $db->prepare($sql);
        if (!$stmt) {
            throw new Exception('Failed to prepare SQL: ' . $db->error);
        }
        
        $message_type = $input['message_type'] ?? 'text';
        $stmt->bind_param('iiss', $user_id, $input['receiver_id'], $input['message'], $message_type);
        
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Group ID or Receiver ID required']);
        exit;
    }
    
    if ($stmt->execute()) {
        $messageId = $db->insert_id;

        if (isset($input['receiver_id'])) {
            $sender = (new CRUD('users'))->read($user_id);
            $senderName = $sender['name'] ?? 'Someone';
            createNotification(
                $input['receiver_id'],
                'direct_message',
                $senderName,
                mb_strimwidth($input['message'], 0, 80, '...'),
                'chat',
                $user_id
            );
        }

        echo json_encode([
            'success' => true,
            'message' => 'Message sent successfully',
            'message_id' => $messageId
        ]);
    } else {
        throw new Exception('Failed to send message: ' . $stmt->error);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error sending message: ' . $e->getMessage()
    ]);
}
?>