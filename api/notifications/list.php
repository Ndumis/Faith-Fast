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

    $user_id = $authUser['user_id'];
    $crud = new CRUD('notifications');

    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
    $limit = max(1, min($limit, 50));

    $notifications = $crud->readAll(
        ['user_id' => $user_id],
        'created_at DESC',
        $limit
    );

    echo json_encode([
        'success' => true,
        'notifications' => $notifications
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching notifications: ' . $e->getMessage()
    ]);
}
?>
