<?php
// Get pending join requests
require_once '../config.php';
require_once '../CRUD.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

try {
    $authUser = getAuthUser();
    if (!$authUser) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Authentication required']);
        exit;
    }
    
    $group_id = $input['group_id'] ?? null;
    if (!$group_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Group ID required']);
        exit;
    }
    
    // Verify user is admin of the group
    $membershipCrud = new CRUD('group_members');
    $membership = $membershipCrud->readAll([
        'group_id' => $group_id,
        'user_id' => $authUser['user_id'],
        'role' => 'admin'
    ]);
    
    if (empty($membership)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Admin access required']);
        exit;
    }
    
    $db = Database::getInstance()->getConnection();
    $sql = "SELECT gm.*, u.name as user_name, u.email, u.profile_picture
            FROM group_members gm
            JOIN users u ON gm.user_id = u.id
            WHERE gm.group_id = ? AND gm.status = 'pending'";
    
    $stmt = $db->prepare($sql);
    if (!$stmt) {
        throw new Exception('Prepare failed: ' . $db->error);
    }
    
    $stmt->bind_param('i', $group_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $pendingRequests = $result->fetch_all(MYSQLI_ASSOC);
    
    echo json_encode([
        'success' => true,
        'pending_requests' => $pendingRequests
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching pending requests: ' . $e->getMessage()
    ]);
}
?>