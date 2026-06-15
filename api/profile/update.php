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

try {
    $authUser = getAuthUser();
    if (!$authUser) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Authentication required']);
        exit;
    }

    $user_id = $authUser['user_id'];

    $userCrud = new CRUD('users');
    
    $updateData = [];
    if (isset($input['name'])) $updateData['name'] = $input['name'];
    if (isset($input['email'])) $updateData['email'] = $input['email'];
    if (isset($input['age_group'])) $updateData['age_group'] = $input['age_group'];
    if (isset($input['position'])) $updateData['position'] = $input['position'];
    if (isset($input['subscription'])) $updateData['subscription'] = $input['subscription'];
    
    if (!empty($updateData)) {
        $updateData['updated_at'] = date('Y-m-d H:i:s');
        
        // Check if email is being changed and if it's already taken
        if (isset($input['email'])) {
            $existing = $userCrud->readAll(['email' => $input['email']]);
            if (!empty($existing) && $existing[0]['id'] != $user_id) {
                http_response_code(409);
                echo json_encode(['success' => false, 'message' => 'Email already taken']);
                exit;
            }
        }
        
        $userCrud->update($user_id, $updateData);
        
        // Get updated user data
        $user = $userCrud->read($user_id);
        unset($user['password']);
        
        echo json_encode([
            'success' => true,
            'message' => 'Profile updated successfully',
            'user' => $user
        ]);
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No data to update']);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error updating profile: ' . $e->getMessage()
    ]);
}
?>