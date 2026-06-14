<?php
require_once '../config.php';
require_once '../CRUD.php';

header('Content-Type: application/json');

try {
    $user_id = 1; // From JWT - replace with actual JWT extraction
    
    $db = Database::getInstance()->getConnection();
    
    // Get resources with user information and like status
    $sql = "SELECT r.*, 
                   u.name as author_name,
                   u.profile_picture as author_avatar,
                   (SELECT COUNT(*) FROM resource_likes rl WHERE rl.resource_id = r.id) as like_count,
                   EXISTS(SELECT 1 FROM resource_likes rl2 WHERE rl2.resource_id = r.id AND rl2.user_id = ?) as is_liked
            FROM resources r
            LEFT JOIN users u ON r.user_id = u.id
            ORDER BY r.created_at DESC";
    
    $stmt = $db->prepare($sql);
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $resources = $result->fetch_all(MYSQLI_ASSOC);
    
    echo json_encode([
        'success' => true,
        'resources' => $resources
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching resources: ' . $e->getMessage()
    ]);
}
?>