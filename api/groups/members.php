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
    $authUser = getAuthUser();
    if (!$authUser) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Authentication required']);
        exit;
    }
    
    // Verify user is admin
    $membershipCrud = new CRUD('group_members');
    $membership = $membershipCrud->readAll([
        'group_id' => $input['group_id'],
        'user_id' => $authUser['user_id'],
        'role' => 'admin'
    ]);
    
    if (empty($membership)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Admin access required']);
        exit;
    }
    
    $db = Database::getInstance()->getConnection();
    
    // Fixed SQL syntax - removed extra parenthesis and fixed EXISTS clause
    $sql = "SELECT gm.id as membership_id, gm.role, gm.joined_at, 
                   u.id as user_id, u.name, u.email, u.profile_picture,
                   (EXISTS(SELECT 1 FROM user_sessions us 
                           WHERE us.user_id = u.id AND us.last_activity > DATE_SUB(NOW(), INTERVAL 5 MINUTE))) as is_online
            FROM group_members gm
            JOIN users u ON gm.user_id = u.id
            WHERE gm.group_id = ? AND gm.status = 'approved'
            ORDER BY gm.role DESC, u.name ASC";
    
    $stmt = $db->prepare($sql);
    if (!$stmt) {
        throw new Exception('Prepare failed: ' . $db->error);
    }
    
    $stmt->bind_param('i', $input['group_id']);
    $stmt->execute();
    $result = $stmt->get_result();
    $members = $result->fetch_all(MYSQLI_ASSOC);
    
    echo json_encode([
        'success' => true,
        'members' => $members
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching members: ' . $e->getMessage()
    ]);
}
?>