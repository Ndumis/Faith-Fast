<?php
require_once '../config.php';
require_once '../CRUD.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$token = $_GET['token'] ?? '';

if (empty($token)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Reset token required']);
    exit;
}

try {
    $resetCrud = new CRUD('password_resets');
    $resets = $resetCrud->readAll(['token' => $token]);

    if (empty($resets) || $resets[0]['used'] || strtotime($resets[0]['expires_at']) < time()) {
        echo json_encode(['success' => false, 'message' => 'This password reset link is invalid or has expired']);
        exit;
    }

    echo json_encode(['success' => true, 'message' => 'Token is valid']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error validating token: ' . $e->getMessage()]);
}
?>
