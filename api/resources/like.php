<?php
require_once '../config.php';
require_once '../CRUD.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['resource_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Resource ID required']);
    exit;
}

try {
    $authUser = getAuthUser();
    if (!$authUser) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Authentication required']);
        exit;
    }

    $user_id = $authUser['user_id'];
    $resource_id = $input['resource_id'];
    
    $db = Database::getInstance()->getConnection();
    
    // Check if already liked
    $check_sql = "SELECT id FROM resource_likes WHERE resource_id = ? AND user_id = ?";
    $check_stmt = $db->prepare($check_sql);
    $check_stmt->bind_param('ii', $resource_id, $user_id);
    $check_stmt->execute();
    $existing_like = $check_stmt->get_result()->fetch_assoc();
    
    if ($existing_like) {
        // Unlike
        $delete_sql = "DELETE FROM resource_likes WHERE resource_id = ? AND user_id = ?";
        $delete_stmt = $db->prepare($delete_sql);
        $delete_stmt->bind_param('ii', $resource_id, $user_id);
        $delete_stmt->execute();
        
        echo json_encode([
            'success' => true,
            'action' => 'unliked'
        ]);
    } else {
        // Like
        $insert_sql = "INSERT INTO resource_likes (resource_id, user_id) VALUES (?, ?)";
        $insert_stmt = $db->prepare($insert_sql);
        $insert_stmt->bind_param('ii', $resource_id, $user_id);
        $insert_stmt->execute();
        
        echo json_encode([
            'success' => true,
            'action' => 'liked'
        ]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error toggling like: ' . $e->getMessage()
    ]);
}
?>