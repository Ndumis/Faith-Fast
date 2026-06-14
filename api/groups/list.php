<?php
// api/groups/list.php
require_once '../config.php';
require_once '../CRUD.php';

header('Content-Type: application/json');

try {
    $db = Database::getInstance()->getConnection();
    
    // Use backticks around the reserved keyword 'groups'
    $sql = "SELECT g.*, 
                   u.name as leader_name,
                   COUNT(gm.user_id) as member_count,
                   g.requires_approval,
                   g.is_public,
                   g.category
            FROM `groups` g
            LEFT JOIN users u ON g.created_by = u.id
            LEFT JOIN group_members gm ON g.id = gm.group_id AND gm.status = 'approved'
            WHERE g.is_public = 1
            GROUP BY g.id
            ORDER BY g.created_at DESC";
    
    $stmt = $db->prepare($sql);
    
    if ($stmt === false) {
        throw new Exception('Prepare failed: ' . $db->error);
    }
    
    $stmt->execute();
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