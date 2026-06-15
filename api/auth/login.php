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

if (!isset($input['email']) || !isset($input['password'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Email and password required']);
    exit;
}

try {
    $userCrud = new CRUD('users');
    $users = $userCrud->readAll(['email' => $input['email']]);
    
    if (empty($users) || !password_verify($input['password'], $users[0]['password'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
        exit;
    }
    
    $user = $users[0];
    
    // Update last_active timestamp on login
    $userCrud->update($user['id'], [
        'last_active' => date('Y-m-d H:i:s')
    ]);
    
    // Handle user session with better error handling
    $sessionCrud = new CRUD('user_sessions');
    
    // Check if session already exists for this user
    $existingSession = $sessionCrud->readAll(['user_id' => $user['id']]);
    
    $sessionToken = bin2hex(random_bytes(32));
    $sessionData = [
        'user_id' => $user['id'],
        'session_token' => $sessionToken,
        'last_activity' => date('Y-m-d H:i:s')
    ];
    
    if (!empty($existingSession)) {
        // Update existing session
        $sessionCrud->update($existingSession[0]['id'], $sessionData);
        error_log("Session updated for user ID: " . $user['id']);
    } else {
        // Create new session
        $sessionId = $sessionCrud->create($sessionData);
        error_log("Session created with ID: " . $sessionId . " for user ID: " . $user['id']);
    }
    
    // Verify the session was created/updated
    $verifiedSession = $sessionCrud->readAll(['user_id' => $user['id']]);
    if (empty($verifiedSession)) {
        throw new Exception('Failed to create user session');
    }
    
    // Generate JWT token
    $token = generateJWT([
        'user_id' => $user['id'],
        'email' => $user['email'],
        'session_token' => $sessionToken, // Include session token in JWT
        'exp' => time() + (7 * 24 * 60 * 60) // 7 days
    ]);
    
    // Remove password from response
    unset($user['password']);
    
    echo json_encode([
        'success' => true,
        'message' => 'Login successful',
        'token' => $token,
        'user' => $user,
        'session_created' => !empty($existingSession) ? 'updated' : 'created'
    ]);
    
} catch (Exception $e) {
    error_log("Login error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Login failed: ' . $e->getMessage()
    ]);
}
?>