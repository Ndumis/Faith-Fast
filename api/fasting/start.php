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

if (!isset($input['plan_id']) || !isset($input['start_date'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Plan ID and start date are required']);
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
    
    // Get plan details
    $planCrud = new CRUD('fasting_plans');
    $plan = $planCrud->read($input['plan_id']);
    
    if (!$plan) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Fasting plan not found']);
        exit;
    }
    
    // Calculate end date
    $start_date = new DateTime($input['start_date']);
    $end_date = clone $start_date;
    $end_date->modify('+' . $plan['duration_days'] . ' days');
    
    $fastData = [
        'user_id' => $user_id,
        'plan_id' => $input['plan_id'],
        'start_date' => $start_date->format('Y-m-d H:i:s'),
        'end_date' => $end_date->format('Y-m-d H:i:s'),
        'status' => 'active',
        'progress_percent' => 0,
        'intention' => $input['intention'] ?? ''
    ];
    
    $fastCrud = new CRUD('user_fasts');
    $fast_id = $fastCrud->create($fastData);
    
    echo json_encode([
        'success' => true,
        'message' => 'Fast started successfully',
        'fast_id' => $fast_id
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error starting fast: ' . $e->getMessage()
    ]);
}
?>