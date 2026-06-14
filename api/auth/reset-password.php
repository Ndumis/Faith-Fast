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

if (!isset($input['token']) || !isset($input['password'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Token and new password required']);
    exit;
}

if (strlen($input['password']) < 8) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Password must be at least 8 characters long']);
    exit;
}

try {
    $resetCrud = new CRUD('password_resets');
    $resets = $resetCrud->readAll(['token' => $input['token']]);

    if (empty($resets) || $resets[0]['used'] || strtotime($resets[0]['expires_at']) < time()) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'This password reset link is invalid or has expired']);
        exit;
    }

    $reset = $resets[0];

    $userCrud = new CRUD('users');
    $userCrud->update($reset['user_id'], [
        'password'   => password_hash($input['password'], PASSWORD_DEFAULT),
        'updated_at' => date('Y-m-d H:i:s')
    ]);

    $resetCrud->update($reset['id'], ['used' => 1]);

    echo json_encode(['success' => true, 'message' => 'Password has been reset successfully']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error resetting password: ' . $e->getMessage()]);
}
?>
