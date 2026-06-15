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

if (!isset($input['action']) || !isset($input['group_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Action and group ID required']);
    exit;
}

try {
    // Get authenticated user
    $authUser = getAuthUser();
    if (!$authUser) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Authentication required']);
        exit;
    }
    
    $user_id = $authUser['user_id'];
    $db = Database::getInstance()->getConnection();

    // Verify user is admin of the group
    $membershipCrud = new CRUD('group_members');
    $membership = $membershipCrud->readAll([
        'group_id' => $input['group_id'],
        'user_id' => $user_id,
        'role' => 'admin'
    ]);
    
    if (empty($membership)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Admin access required']);
        exit;
    }
    
    switch ($input['action']) {
        case 'remove_member':
            if (!isset($input['member_id'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Member ID required']);
                exit;
            }
            $membershipCrud->delete($input['member_id']);
            break;
            
        case 'update_role':
            if (!isset($input['member_id']) || !isset($input['new_role'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Member ID and new role required']);
                exit;
            }
            $membershipCrud->update($input['member_id'], ['role' => $input['new_role']]);
            break;

        case 'update_settings':
            if (!isset($input['name']) || trim($input['name']) === '') {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Group name is required']);
                exit;
            }

            $groupCrud = new CRUD('groups');
            $groupCrud->update((int) $input['group_id'], [
                'name' => $input['name'],
                'description' => $input['description'] ?? '',
                'category' => $input['category'] ?? 'General',
                'is_public' => !empty($input['is_public']) ? 1 : 0,
                'requires_approval' => !empty($input['requires_approval']) ? 1 : 0
            ]);
            break;

        case 'delete_group':
            $group_id = (int) $input['group_id'];

            $stmt = $db->prepare("DELETE FROM group_messages WHERE group_id = ?");
            $stmt->bind_param('i', $group_id);
            $stmt->execute();
            $stmt->close();

            $stmt = $db->prepare("DELETE FROM group_members WHERE group_id = ?");
            $stmt->bind_param('i', $group_id);
            $stmt->execute();
            $stmt->close();

            $stmt = $db->prepare("DELETE FROM `groups` WHERE id = ?");
            $stmt->bind_param('i', $group_id);
            $stmt->execute();
            $stmt->close();
            break;

        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
            exit;
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Action completed successfully'
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error managing group: ' . $e->getMessage()
    ]);
}
?>