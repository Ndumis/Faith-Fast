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
    
    // Return zero notifications for now
    echo json_encode([
        'success' => true,
        'count' => 0
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching notifications'
    ]);
}
?>