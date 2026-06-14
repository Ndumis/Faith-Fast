<?php
require_once '../config.php';
require_once '../CRUD.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
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
    
    $resource_id = $_POST['id'] ?? '';
    $title = $_POST['title'] ?? '';
    $description = $_POST['description'] ?? '';
    $category = $_POST['category'] ?? '';
    $url = $_POST['url'] ?? '';
    
    if (empty($resource_id) || empty($title) || empty($category)) {
        throw new Exception('Resource ID, title and category are required');
    }
    
    // Verify resource belongs to user
    $resourceCrud = new CRUD('resources');
    $existingResource = $resourceCrud->read($resource_id);
    
    if (!$existingResource || $existingResource['user_id'] != $user_id) {
        throw new Exception('Resource not found or access denied');
    }
    
    $updateData = [
        'title' => $title,
        'description' => $description,
        'category' => $category
    ];
    
    // Handle file upload if provided
    if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
        $uploadDir = '../../assets/uploads/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        $fileName = time() . '_' . basename($_FILES['file']['name']);
        $uploadPath = $uploadDir . $fileName;
        
        if (move_uploaded_file($_FILES['file']['tmp_name'], $uploadPath)) {
            $updateData['file_url'] = 'assets/uploads/' . $fileName;
            $updateData['file_type'] = $_FILES['file']['type'];
            $updateData['file_size'] = $_FILES['file']['size'];
        }
    } elseif (!empty($url)) {
        $updateData['file_url'] = $url;
    }
    
    $resourceCrud->update($resource_id, $updateData);
    
    echo json_encode([
        'success' => true,
        'message' => 'Resource updated successfully'
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error updating resource: ' . $e->getMessage()
    ]);
}
?>