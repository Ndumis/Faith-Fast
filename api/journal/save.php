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

if (!isset($input['title']) || !isset($input['content']) || !isset($input['entry_date'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required fields']);
    exit;
}

try {
    $authUser = getAuthUser();
    if (!$authUser) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Authentication required']);
        exit;
    }

    $user_id = $authUser['user_id'];

    $journalCrud = new CRUD('journal_entries');
    
    $entryData = [
        'user_id' => $user_id,
        'title' => $input['title'],
        'content' => $input['content'],
        'entry_date' => $input['entry_date'],
        'user_fast_id' => !empty($input['user_fast_id']) ? (int)$input['user_fast_id'] : null,
        'created_at' => date('Y-m-d H:i:s')
    ];
    
    $entryId = $journalCrud->create($entryData);
    
    echo json_encode([
        'success' => true,
        'message' => 'Journal entry saved successfully',
        'entry_id' => $entryId
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error saving journal entry: ' . $e->getMessage()
    ]);
}
?>