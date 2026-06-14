<?php
require_once '../config.php';
require_once '../CRUD.php';

header('Content-Type: application/json');

try {
    // Get authenticated user
    $authUser = getAuthUser();
    if (!$authUser) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Authentication required']);
        exit;
    }
    
    $user_id = $authUser['user_id'];
    
    $prayerCrud = new CRUD('prayer_requests');
    $prayers = $prayerCrud->readAll(
        ['user_id' => $user_id],
        'created_at DESC'
    );
    
    echo json_encode([
        'success' => true,
        'prayers' => $prayers
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching prayers: ' . $e->getMessage()
    ]);
}
?>