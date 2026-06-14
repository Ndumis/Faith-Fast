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

// Validate required fields
$required = ['name', 'email', 'password', 'age_group', 'position', 'subscription'];
foreach ($required as $field) {
    if (!isset($input[$field]) || empty($input[$field])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => "Missing required field: $field"]);
        exit;
    }
}

try {
    $userCrud = new CRUD('users');
    
    // Check if email already exists
    $existingUser = $userCrud->readAll(['email' => $input['email']]);
    if (!empty($existingUser)) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'Email already registered']);
        exit;
    }
    
    // Hash password
    $hashedPassword = password_hash($input['password'], PASSWORD_DEFAULT);
    
    // Create user
    $userData = [
        'name' => $input['name'],
        'email' => $input['email'],
        'password' => $hashedPassword,
        'age_group' => $input['age_group'],
        'position' => $input['position'],
        'subscription' => $input['subscription'],
        'created_at' => date('Y-m-d H:i:s')
    ];
    
    $userId = $userCrud->create($userData);
    
    // Generate JWT token
    $token = generateJWT([
        'user_id' => $userId,
        'email' => $input['email'],
        'exp' => time() + (7 * 24 * 60 * 60) // 7 days
    ]);
    
    // Get user data without password
    $user = $userCrud->read($userId);
    unset($user['password']);
    
    echo json_encode([
        'success' => true,
        'message' => 'Registration successful',
        'token' => $token,
        'user' => $user
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Registration failed: ' . $e->getMessage()
    ]);
}
?>