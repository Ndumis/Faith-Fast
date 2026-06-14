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

if (!isset($input['id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Resource ID required']);
    exit;
}

try {
    $user_id = 1; // From JWT
    $resource_id = $input['id'];
    
    // Verify resource belongs to user
    $resourceCrud = new CRUD('resources');
    $existingResource = $resourceCrud->read($resource_id);
    
    if (!$existingResource || $existingResource['user_id'] != $user_id) {
        throw new Exception('Resource not found or access denied');
    }
    
    // Delete resource likes first
    $db = Database::getInstance()->getConnection();
    $deleteLikesSql = "DELETE FROM resource_likes WHERE resource_id = ?";
    $deleteLikesStmt = $db->prepare($deleteLikesSql);
    $deleteLikesStmt->bind_param('i', $resource_id);
    $deleteLikesStmt->execute();
    
    // Delete resource
    $resourceCrud->delete($resource_id);
    
    echo json_encode([
        'success' => true,
        'message' => 'Resource deleted successfully'
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error deleting resource: ' . $e->getMessage()
    ]);
}
?>