<?php
require_once '../config.php';
require_once '../CRUD.php';

header('Content-Type: application/json');

try {
    $user_id = 1; // From JWT
    
    $journalCrud = new CRUD('journal_entries');
    $entries = $journalCrud->readAll(
        ['user_id' => $user_id],
        'entry_date DESC, created_at DESC'
    );
    
    echo json_encode([
        'success' => true,
        'entries' => $entries
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching journal entries: ' . $e->getMessage()
    ]);
}
?>