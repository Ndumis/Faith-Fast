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

if (!isset($input['name']) || empty(trim($input['name']))) {
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
    
    $user_id = $authUser['user_id'];
    $db = Database::getInstance()->getConnection();
    
    // Prepare group data
    $groupData = [
        'name' => trim($input['name']),
        'description' => isset($input['description']) ? trim($input['description']) : '',
        'category' => $input['category'] ?? 'General',
        'tags' => isset($input['tags']) && is_array($input['tags']) ? json_encode($input['tags']) : null,
        'is_public' => $input['is_public'] ?? 1,
        'requires_approval' => $input['requires_approval'] ?? 1,
        'max_members' => $input['max_members'] ?? 50,
        'created_by' => $user_id,
        'created_at' => date('Y-m-d H:i:s')
    ];
    
    // Manually create the group using prepared statements to avoid reserved keyword issues
    $columns = implode(', ', array_keys($groupData));
    $placeholders = implode(', ', array_fill(0, count($groupData), '?'));
    
    $sql = "INSERT INTO `groups` ($columns) VALUES ($placeholders)";
    $stmt = $db->prepare($sql);
    
    if ($stmt === false) {
        throw new Exception('Prepare failed: ' . $db->error);
    }
    
    // Bind parameters
    $types = str_repeat('s', count($groupData));
    $stmt->bind_param($types, ...array_values($groupData));
    
    if (!$stmt->execute()) {
        throw new Exception('Execute failed: ' . $stmt->error);
    }
    
    $groupId = $stmt->insert_id;
    $stmt->close();
    
    // Add creator as admin using manual query
    $membershipData = [
        'group_id' => $groupId,
        'user_id' => $user_id,
        'role' => 'admin',
        'status' => 'approved',
        'approved_at' => date('Y-m-d H:i:s'),
        'approved_by' => $user_id,
        'joined_at' => date('Y-m-d H:i:s')
    ];
    
    $membershipColumns = implode(', ', array_keys($membershipData));
    $membershipPlaceholders = implode(', ', array_fill(0, count($membershipData), '?'));
    
    $membershipSql = "INSERT INTO group_members ($membershipColumns) VALUES ($membershipPlaceholders)";
    $membershipStmt = $db->prepare($membershipSql);
    
    if ($membershipStmt === false) {
        throw new Exception('Prepare failed for membership: ' . $db->error);
    }
    
    $membershipTypes = str_repeat('s', count($membershipData));
    $membershipStmt->bind_param($membershipTypes, ...array_values($membershipData));
    
    if (!$membershipStmt->execute()) {
        throw new Exception('Execute failed for membership: ' . $membershipStmt->error);
    }
    
    $membershipStmt->close();
    
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