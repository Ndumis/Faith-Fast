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

if (!isset($input['group_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Group ID required']);
    exit;
}

try {
    $db = Database::getInstance()->getConnection();
    
    // Get group details - fixed SQL syntax
    $sql = "SELECT g.*, u.name as leader_name, 
                   COUNT(gm.user_id) as member_count
            FROM `groups` g
            LEFT JOIN users u ON g.created_by = u.id
            LEFT JOIN group_members gm ON g.id = gm.group_id AND gm.status = 'approved'
            WHERE g.id = ?
            GROUP BY g.id";
    
    $stmt = $db->prepare($sql);
    if (!$stmt) {
        throw new Exception('Prepare failed: ' . $db->error);
    }
    
    $stmt->bind_param('i', $input['group_id']);
    $stmt->execute();
    $result = $stmt->get_result();
    $group = $result->fetch_assoc();
    
    if (!$group) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Group not found']);
        exit;
    }
    
    // Get members with online status - fixed SQL syntax
    $membersSql = "SELECT gm.*, u.name, u.email, u.profile_picture,
                          (EXISTS(SELECT 1 FROM user_sessions us 
                                  WHERE us.user_id = u.id AND us.last_activity > DATE_SUB(NOW(), INTERVAL 5 MINUTE))) as is_online
                   FROM group_members gm
                   JOIN users u ON gm.user_id = u.id
                   WHERE gm.group_id = ? AND gm.status = 'approved'
                   ORDER BY gm.role DESC, u.name ASC";
    
    $membersStmt = $db->prepare($membersSql);
    if (!$membersStmt) {
        throw new Exception('Prepare failed: ' . $db->error);
    }
    
    $membersStmt->bind_param('i', $input['group_id']);
    $membersStmt->execute();
    $membersResult = $membersStmt->get_result();
    $members = $membersResult->fetch_all(MYSQLI_ASSOC);
    
    echo json_encode([
        'success' => true,
        'group' => $group,
        'members' => $members
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching group details: ' . $e->getMessage()
    ]);
}
?>