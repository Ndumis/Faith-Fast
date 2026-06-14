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
    $user_id = 1; // From JWT
    
    $title = $_POST['title'] ?? '';
    $description = $_POST['description'] ?? '';
    $category = $_POST['category'] ?? '';
    $url = $_POST['url'] ?? '';
    
    if (empty($title) || empty($category)) {
        throw new Exception('Title and category are required');
    }
    
    $uploadPath = '';
    $fileType = '';
    $fileSize = 0;
    
    // Handle file upload
    if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
        $uploadDir = '../../assets/images/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        $fileName = time() . '_' . basename($_FILES['file']['name']);
        $uploadPath = $uploadDir . $fileName;
        
        if (move_uploaded_file($_FILES['file']['tmp_name'], $uploadPath)) {
            $uploadPath = 'assets/images/' . $fileName;
            $fileType = $_FILES['file']['type'];
            $fileSize = $_FILES['file']['size'];
        }
    }
    
    // Use URL if no file uploaded
    if (empty($uploadPath) && !empty($url)) {
        $uploadPath = $url;
    }
    
    $resourceCrud = new CRUD('resources');
    $resourceId = $resourceCrud->create([
        'user_id' => $user_id,
        'title' => $title,
        'description' => $description,
        'category' => $category,
        'file_url' => $uploadPath,
        'file_type' => $fileType,
        'file_size' => $fileSize
    ]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Resource created successfully',
        'resource_id' => $resourceId
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error creating resource: ' . $e->getMessage()
    ]);
}
?>