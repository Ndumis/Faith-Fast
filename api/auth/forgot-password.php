<?php
require_once '../config.php';
require_once '../CRUD.php';
require_once '../Mailer.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['email']) || empty($input['email'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Email address required']);
    exit;
}

$genericResponse = [
    'success' => true,
    'message' => 'If an account exists for that email, password reset instructions have been sent.'
];

try {
    $userCrud = new CRUD('users');
    $users = $userCrud->readAll(['email' => $input['email']]);

    if (empty($users)) {
        // For security, don't reveal if the email exists
        echo json_encode($genericResponse);
        exit;
    }

    $user = $users[0];

    // Generate a secure reset token valid for 1 hour
    $resetToken = bin2hex(random_bytes(32));
    $expiresAt = date('Y-m-d H:i:s', strtotime('+1 hour'));

    $resetCrud = new CRUD('password_resets');
    $resetCrud->create([
        'user_id'    => $user['id'],
        'token'      => $resetToken,
        'expires_at' => $expiresAt,
        'used'       => 0
    ]);

    $resetLink = appUrl() . '/reset-password.html?token=' . $resetToken;
    Mailer::sendPasswordResetEmail($user['email'], $user['name'], $resetLink);

    echo json_encode($genericResponse);

} catch (Exception $e) {
    error_log('Forgot password error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error processing request: ' . $e->getMessage()
    ]);
}
?>
