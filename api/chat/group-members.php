<?php
// chat/group-members.php - members of a group, for @mention autocomplete
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
    $group_id = isset($_GET['group_id']) ? (int)$_GET['group_id'] : 0;

    if (!$group_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Group ID required']);
        exit;
    }

    $db = Database::getInstance()->getConnection();

    // Only members of the group can see its member list
    $checkStmt = $db->prepare("SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ? AND status = 'approved'");
    $checkStmt->bind_param('ii', $group_id, $user_id);
    $checkStmt->execute();
    if ($checkStmt->get_result()->num_rows === 0) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Not a member of this group']);
        exit;
    }

    $stmt = $db->prepare("SELECT u.id, u.name
                           FROM group_members gm
                           JOIN users u ON gm.user_id = u.id
                           WHERE gm.group_id = ? AND gm.status = 'approved'
                           ORDER BY u.name ASC");
    $stmt->bind_param('i', $group_id);
    $stmt->execute();
    $members = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    echo json_encode([
        'success' => true,
        'members' => $members
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching group members: ' . $e->getMessage()
    ]);
}
