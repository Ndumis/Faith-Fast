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

if (!isset($input['email'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Email address required']);
    exit;
}

try {
    $userCrud = new CRUD('users');
    $users = $userCrud->readAll(['email' => $input['email']]);
    
    if (empty($users)) {
        // For security, don't reveal if email exists
        echo json_encode([
            'success' => true,
            'message' => 'If the email exists, password reset instructions have been sent'
        ]);
        exit;
    }
    
    $user = $users[0];
    
    // Generate reset token (in real app, this would be more secure)
    $resetToken = bin2hex(random_bytes(32));
    $expires = date('Y-m-d H:i:s', strtotime('+1 hour'));
    
    // Store reset token (you'd need a password_resets table)
    // For demo, we'll just return success
    
    // In real app, send email with reset link
    // mail($user['email'], 'Password Reset', "Reset link: ...");
    
    echo json_encode([
        'success' => true,
        'message' => 'Password reset instructions have been sent to your email'
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error processing request: ' . $e->getMessage()
    ]);
}
?>