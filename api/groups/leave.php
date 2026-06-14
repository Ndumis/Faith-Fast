<?php
// api/groups/leave.php
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
    $db = Database::getInstance()->getConnection();
    
    // Check if user is the last admin
    $adminCheckSql = "SELECT COUNT(*) as admin_count 
                     FROM group_members 
                     WHERE group_id = ? AND role = 'admin' AND status = 'approved'";
    $adminStmt = $db->prepare($adminCheckSql);
    $adminStmt->bind_param('i', $group_id);
    $adminStmt->execute();
    $adminResult = $adminStmt->get_result();
    $adminData = $adminResult->fetch_assoc();
    
    if ($adminData['admin_count'] <= 1) {
        // Check if user is an admin
        $userAdminSql = "SELECT role FROM group_members WHERE group_id = ? AND user_id = ?";
        $userAdminStmt = $db->prepare($userAdminSql);
        $userAdminStmt->bind_param('ii', $group_id, $user_id);
        $userAdminStmt->execute();
        $userAdminResult = $userAdminStmt->get_result();
        $userAdminData = $userAdminResult->fetch_assoc();
        
        if ($userAdminData && $userAdminData['role'] === 'admin') {
            echo json_encode([
                'success' => false,
                'message' => 'Cannot leave group as you are the last admin. Assign another admin first or delete the group.'
            ]);
            exit;
        }
    }
    
    // Delete membership
    $deleteSql = "DELETE FROM group_members WHERE group_id = ? AND user_id = ?";
    $deleteStmt = $db->prepare($deleteSql);
    $deleteStmt->bind_param('ii', $group_id, $user_id);
    
    if ($deleteStmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Successfully left the group'
        ]);
    } else {
        throw new Exception('Failed to leave group');
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error leaving group: ' . $e->getMessage()
    ]);
}
?>