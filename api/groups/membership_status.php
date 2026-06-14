<?php
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
    
    $db = Database::getInstance()->getConnection();
    
    $sql = "SELECT group_id, status 
            FROM group_members 
            WHERE user_id = ?";
    
    $stmt = $db->prepare($sql);
    if (!$stmt) {
        throw new Exception('Prepare failed: ' . $db->error);
    }
    
    $stmt->bind_param('i', $authUser['user_id']);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $memberships = [];
    while ($row = $result->fetch_assoc()) {
        $memberships[$row['group_id']] = $row['status'];
    }
    
    echo json_encode([
        'success' => true,
        'memberships' => $memberships
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching membership status: ' . $e->getMessage()
    ]);
}
?>