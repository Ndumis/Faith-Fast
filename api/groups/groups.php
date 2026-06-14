<?php
// api/groups/create.php
require_once '../config.php';
require_once '../CRUD.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['name']) || empty($input['name'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Group name is required']);
    exit;
}

try {
    $authUser = getAuthUser();
    if (!$authUser) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Authentication required']);
        exit;
    }
    
    $groupCrud = new CRUD('groups');
    $membershipCrud = new CRUD('group_members');
    
    $groupData = [
        'name' => $input['name'],
        'description' => $input['description'] ?? '',
        'category' => $input['category'] ?? 'General',
        'tags' => isset($input['tags']) ? json_encode($input['tags']) : null,
        'is_public' => $input['is_public'] ?? 1,
        'requires_approval' => $input['requires_approval'] ?? 1,
        'max_members' => $input['max_members'] ?? 50,
        'created_by' => $authUser['user_id'],
        'created_at' => date('Y-m-d H:i:s')
    ];
    
    $groupId = $groupCrud->create($groupData);
    
    // Add creator as admin
    $membershipData = [
        'group_id' => $groupId,
        'user_id' => $authUser['user_id'],
        'role' => 'admin',
        'status' => 'approved',
        'approved_at' => date('Y-m-d H:i:s'),
        'approved_by' => $authUser['user_id']
    ];
    
    $membershipCrud->create($membershipData);
    
    echo json_encode([
        'success' => true,
        'message' => 'Group created successfully',
        'group_id' => $groupId
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error creating group: ' . $e->getMessage()
    ]);
}
?>