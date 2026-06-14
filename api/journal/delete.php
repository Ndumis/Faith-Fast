<?php
require_once '../config.php';
require_once '../CRUD.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$entryId = $_GET['id'] ?? null;

if (!$entryId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Entry ID required']);
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
    $existingEntry = $journalCrud->read($entryId);
    if (!$existingEntry || $existingEntry['user_id'] != $user_id) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Entry not found']);
        exit;
    }
    
    $success = $journalCrud->delete($entryId);
    
    if ($success) {
        echo json_encode([
            'success' => true,
            'message' => 'Journal entry deleted successfully'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Error deleting journal entry'
        ]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error deleting journal entry: ' . $e->getMessage()
    ]);
}
?>