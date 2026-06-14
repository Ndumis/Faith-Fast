<?php
// api/groups/my.php
require_once '../config.php';
require_once '../CRUD.php';

header('Content-Type: application/json');

try {
    $authUser = getAuthUser();
    if (!$authUser) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Authentication required']);
        exit;
    }
    
    $user_id = $authUser['user_id'];
    $db = Database::getInstance()->getConnection();
    
    // Fixed SQL - removed duplicate WHERE condition and fixed parameter binding
    $sql = "SELECT g.*, 
                   u.name as leader_name,
                   COUNT(DISTINCT gm_all.user_id) as member_count,
                   gm.role,
                   gm.status,
                   (gm.role = 'admin') as is_admin,
                   (SELECT COUNT(*) FROM group_members gm2 
                    WHERE gm2.group_id = g.id AND gm2.status = 'pending') as pending_requests_count
            FROM `groups` g
            LEFT JOIN users u ON g.created_by = u.id
            LEFT JOIN group_members gm ON g.id = gm.group_id AND gm.user_id = ?
            LEFT JOIN group_members gm_all ON g.id = gm_all.group_id AND gm_all.status = 'approved'
            WHERE gm.user_id = ? AND gm.status = 'approved'
            GROUP BY g.id
            ORDER BY g.created_at DESC";
    
    $stmt = $db->prepare($sql);
    
    if ($stmt === false) {
        throw new Exception('Prepare failed: ' . $db->error);
    }
    
    // Bind two parameters as required by the SQL
    $stmt->bind_param('ii', $user_id, $user_id);
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