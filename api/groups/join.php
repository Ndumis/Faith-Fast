<?php
// Update the existing join.php
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
    
    $user_id = $authUser['user_id'];
    $group_id = $input['group_id'];
    
    $membershipCrud = new CRUD('group_members');
    $groupCrud = new CRUD('`groups`');
    
    // Check if already a member
    $existing = $membershipCrud->readAll([
        'group_id' => $group_id,
        'user_id' => $user_id
    ]);
    
    if (!empty($existing)) {
        $status = $existing[0]['status'];
        if ($status === 'approved') {
            echo json_encode(['success' => false, 'message' => 'Already a member of this group']);
        } else if ($status === 'pending') {
            echo json_encode(['success' => false, 'message' => 'Request pending approval']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Previous request was rejected']);
        }
        exit;
    }
    
    // Get group info to check if approval is required
    $group = $groupCrud->read($group_id);
    $requiresApproval = $group['requires_approval'] ?? 1;
    
    $membershipData = [
        'group_id' => $group_id,
        'user_id' => $user_id,
        'role' => 'member',
        'status' => $requiresApproval ? 'pending' : 'approved',
        'joined_at' => date('Y-m-d H:i:s'),
        'approved_at' => $requiresApproval ? null : date('Y-m-d H:i:s'),
        'approved_by' => $requiresApproval ? null : $user_id
    ];
    
    $membershipId = $membershipCrud->create($membershipData);
    
    $message = $requiresApproval 
        ? 'Join request sent. Waiting for approval.' 
        : 'Joined group successfully';
    
    echo json_encode([
        'success' => true,
        'message' => $message,
        'requires_approval' => $requiresApproval,
        'membership_id' => $membershipId
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error joining group: ' . $e->getMessage()
    ]);
}
?>