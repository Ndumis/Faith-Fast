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

if (!isset($input['title']) || !isset($input['description'])) {
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
    
    $prayerCrud = new CRUD('prayer_requests');
    
    // Check for duplicate prayer (same title and content recently)
    $recentPrayers = $prayerCrud->readAll([
        'user_id' => $user_id,
        'title' => $input['title']
    ], 'created_at DESC', 1);
    
    if (!empty($recentPrayers)) {
        $recentPrayer = $recentPrayers[0];
        $timeDiff = time() - strtotime($recentPrayer['created_at']);
        
        // If same prayer was created within last 5 minutes, prevent duplicate
        if ($timeDiff < 300 && $recentPrayer['description'] === $input['description']) {
            echo json_encode([
                'success' => false,
                'message' => 'Similar prayer request was recently created. Please wait before creating a duplicate.'
            ]);
            exit;
        }
    }
    
    $prayerData = [
        'user_id' => $user_id,
        'title' => $input['title'],
        'description' => $input['description'],
        'category' => $input['category'] ?? 'personal',
        'status' => 'active',
        'created_at' => date('Y-m-d H:i:s'),
        'updated_at' => date('Y-m-d H:i:s')
    ];
    
    $prayerId = $prayerCrud->create($prayerData);
    
    echo json_encode([
        'success' => true,
        'message' => 'Prayer request saved successfully',
        'prayer_id' => $prayerId
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error saving prayer request: ' . $e->getMessage()
    ]);
}
?>