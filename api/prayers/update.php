<?php
require_once '../config.php';
require_once '../CRUD.php';
require_once '../notifications/_helper.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['id'])) {
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
    $prayer = $prayerCrud->read($input['id']);
    if (!$prayer || $prayer['user_id'] != $user_id) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Prayer not found']);
        exit;
    }
    
    $updateData = [];
    if (isset($input['status'])) $updateData['status'] = $input['status'];
    if (isset($input['title'])) $updateData['title'] = $input['title'];
    if (isset($input['description'])) $updateData['description'] = $input['description'];
    if (isset($input['category'])) $updateData['category'] = $input['category'];
    if (array_key_exists('user_fast_id', $input)) {
        $updateData['user_fast_id'] = !empty($input['user_fast_id']) ? (int)$input['user_fast_id'] : null;
    }
    
    if (!empty($updateData)) {
        $updateData['updated_at'] = date('Y-m-d H:i:s');
        $prayerCrud->update($input['id'], $updateData);

        if (isset($input['status']) && $input['status'] === 'answered' && $prayer['status'] !== 'answered') {
            createNotification(
                $prayer['user_id'],
                'prayer_answered',
                'Prayer Answered',
                'Your prayer "' . $prayer['title'] . '" has been marked as answered.',
                'prayers',
                $prayer['id']
            );
        }
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Prayer updated successfully'
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error updating prayer: ' . $e->getMessage()
    ]);
}
?>