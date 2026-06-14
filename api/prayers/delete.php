<?php
require_once '../config.php';
require_once '../CRUD.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$prayerId = $_GET['id'] ?? null;

if (!$prayerId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Prayer ID required']);
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
    
    $prayerCrud = new CRUD('prayer_requests');
    
    // Verify user owns this prayer
    $prayer = $prayerCrud->read($prayerId);
    if (!$prayer || $prayer['user_id'] != $user_id) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Prayer not found']);
        exit;
    }
    
    $success = $prayerCrud->delete($prayerId);
    
    if ($success) {
        echo json_encode([
            'success' => true,
            'message' => 'Prayer request deleted successfully'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Error deleting prayer request'
        ]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error deleting prayer request: ' . $e->getMessage()
    ]);
}
?>