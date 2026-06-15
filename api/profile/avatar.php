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
    $authUser = getAuthUser();
    if (!$authUser) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Authentication required']);
        exit;
    }

    $user_id = $authUser['user_id'];

    if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('No avatar file uploaded');
    }

    $uploadDir = '../../assets/images/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    $fileName = safeUploadFilename($_FILES['avatar']['name'], $allowedExtensions);
    $uploadPath = $uploadDir . $fileName;

    if (!move_uploaded_file($_FILES['avatar']['tmp_name'], $uploadPath)) {
        throw new Exception('Failed to save avatar');
    }

    $avatarUrl = 'assets/images/' . $fileName;

    $userCrud = new CRUD('users');
    $userCrud->update($user_id, [
        'profile_picture' => $avatarUrl,
        'updated_at' => date('Y-m-d H:i:s')
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'Avatar updated successfully',
        'avatar_url' => $avatarUrl
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error uploading avatar: ' . $e->getMessage()
    ]);
}
?>
