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

if (!isset($input['membership_id']) || !isset($input['action'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Membership ID and action required']);
    exit;
}

try {
    $authUser = getAuthUser();
    if (!$authUser) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Authentication required']);
        exit;
    }
    
    $membershipCrud = new CRUD('group_members');
    $membership = $membershipCrud->read($input['membership_id']);
    
    if (!$membership) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Membership not found']);
        exit;
    }
    
    // Verify user is admin of the group
    $adminCheck = $membershipCrud->readAll([
        'group_id' => $membership['group_id'],
        'user_id' => $authUser['user_id'],
        'role' => 'admin'
    ]);
    
    if (empty($adminCheck)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Admin access required']);
        exit;
    }
    
    $updateData = [];
    if ($input['action'] === 'approve') {
        $updateData = [
            'status' => 'approved',
            'approved_at' => date('Y-m-d H:i:s'),
            'approved_by' => $authUser['user_id']
        ];
        $message = 'Join request approved';
    } else if ($input['action'] === 'reject') {
        $updateData = ['status' => 'rejected'];
        $message = 'Join request rejected';
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
        exit;
    }
    
    $membershipCrud->update($input['membership_id'], $updateData);
    
    echo json_encode([
        'success' => true,
        'message' => $message
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error processing request: ' . $e->getMessage()
    ]);
}
?>