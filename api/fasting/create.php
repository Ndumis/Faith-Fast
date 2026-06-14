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

if (!isset($input['fast_type']) || !isset($input['start_date'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Fast type and start date are required']);
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
    
    $fastingCrud = new CRUD('fasting_records');
    
    $data = [
        'user_id' => $user_id,
        'fast_type' => $input['fast_type'],
        'start_date' => $input['start_date'],
        'notes' => $input['notes'] ?? '',
        'status' => 'active'
    ];
    
    // Calculate duration if end date is provided
    if (isset($input['end_date'])) {
        $data['end_date'] = $input['end_date'];
        $start = new DateTime($input['start_date']);
        $end = new DateTime($input['end_date']);
        $data['duration_hours'] = $end->diff($start)->h + ($end->diff($start)->days * 24);
        $data['status'] = 'completed';
    }
    
    $fasting_id = $fastingCrud->create($data);
    
    echo json_encode([
        'success' => true,
        'message' => 'Fasting record created successfully',
        'fasting_id' => $fasting_id
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error creating fasting record: ' . $e->getMessage()
    ]);
}
?>