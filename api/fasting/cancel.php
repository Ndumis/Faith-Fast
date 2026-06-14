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

if (!isset($input['fast_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Fast ID is required']);
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
    
    $fastCrud = new CRUD('user_fasts');
    $fast = $fastCrud->read($input['fast_id']);
    
    if (!$fast || $fast['user_id'] != $user_id) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Fast not found']);
        exit;
    }
    
    $updateData = [
        'status' => 'cancelled'
    ];
    
    $fastCrud->update($input['fast_id'], $updateData);
    
    echo json_encode([
        'success' => true,
        'message' => 'Fast cancelled successfully'
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error cancelling fast: ' . $e->getMessage()
    ]);
}
?>