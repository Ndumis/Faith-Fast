<?php
require_once '../config.php';
require_once '../CRUD.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Fasting record ID is required']);
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
    $fasting_id = $input['id'];
    
    $fastingCrud = new CRUD('fasting_records');
    
    // Verify ownership
    $existing = $fastingCrud->read($fasting_id);
    if (!$existing || $existing['user_id'] != $user_id) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Fasting record not found']);
        exit;
    }
    
    $fastingCrud->delete($fasting_id);
    
    echo json_encode([
        'success' => true,
        'message' => 'Fasting record deleted successfully'
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error deleting fasting record: ' . $e->getMessage()
    ]);
}
?>