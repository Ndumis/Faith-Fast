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

if (!isset($input['id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Fasting record ID is required']);
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
    $fasting_id = $input['id'];
    
    $fastingCrud = new CRUD('fasting_records');
    
    // Verify ownership
    $existing = $fastingCrud->read($fasting_id);
    if (!$existing || $existing['user_id'] != $user_id) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Fasting record not found']);
        exit;
    }
    
    $updateData = [];
    if (isset($input['fast_type'])) $updateData['fast_type'] = $input['fast_type'];
    if (isset($input['start_date'])) $updateData['start_date'] = $input['start_date'];
    if (isset($input['end_date'])) $updateData['end_date'] = $input['end_date'];
    if (isset($input['notes'])) $updateData['notes'] = $input['notes'];
    if (isset($input['status'])) $updateData['status'] = $input['status'];
    
    // Recalculate duration if end date is updated
    if (isset($input['end_date']) && isset($input['start_date'])) {
        $start = new DateTime($input['start_date']);
        $end = new DateTime($input['end_date']);
        $updateData['duration_hours'] = $end->diff($start)->h + ($end->diff($start)->days * 24);
    }
    
    if (!empty($updateData)) {
        $fastingCrud->update($fasting_id, $updateData);
        
        echo json_encode([
            'success' => true,
            'message' => 'Fasting record updated successfully'
        ]);
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No data to update']);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error updating fasting record: ' . $e->getMessage()
    ]);
}
?>