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

if (!isset($input['id']) || !isset($input['title']) || !isset($input['content'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required fields']);
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
    
    $journalCrud = new CRUD('journal_entries');
    
    // Check if entry belongs to user
    $existingEntry = $journalCrud->read($input['id']);
    if (!$existingEntry || $existingEntry['user_id'] != $user_id) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Entry not found']);
        exit;
    }
    
    $updateData = [
        'title' => $input['title'],
        'content' => $input['content'],
        'updated_at' => date('Y-m-d H:i:s')
    ];
    
    $success = $journalCrud->update($input['id'], $updateData);
    
    if ($success) {
        echo json_encode([
            'success' => true,
            'message' => 'Journal entry updated successfully'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Error updating journal entry'
        ]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error updating journal entry: ' . $e->getMessage()
    ]);
}
?>