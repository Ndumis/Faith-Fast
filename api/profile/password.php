<?php
require_once '../config.php';
require_once '../CRUD.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['current_password']) || !isset($input['new_password'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Current and new password required']);
    exit;
}

try {
    $user_id = 1; // From JWT
    
    $userCrud = new CRUD('users');
    $user = $userCrud->read($user_id);
    
    if (!password_verify($input['current_password'], $user['password'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Current password is incorrect']);
        exit;
    }
    
    $newHashedPassword = password_hash($input['new_password'], PASSWORD_DEFAULT);
    $userCrud->update($user_id, [
        'password' => $newHashedPassword,
        'updated_at' => date('Y-m-d H:i:s')
    ]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Password updated successfully'
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error updating password: ' . $e->getMessage()
    ]);
}
?>