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
    $input = json_decode(file_get_contents('php://input'), true);
    $db = Database::getInstance()->getConnection();

    if (!empty($input['all'])) {
        $sql = "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0";
        $stmt = $db->prepare($sql);
        if (!$stmt) {
            throw new Exception('Failed to prepare SQL statement: ' . $db->error);
        }
        $stmt->bind_param('i', $user_id);
        $stmt->execute();
        $affected = $stmt->affected_rows;
    } elseif (isset($input['id'])) {
        $sql = "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?";
        $stmt = $db->prepare($sql);
        if (!$stmt) {
            throw new Exception('Failed to prepare SQL statement: ' . $db->error);
        }
        $stmt->bind_param('ii', $input['id'], $user_id);
        $stmt->execute();
        $affected = $stmt->affected_rows;
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'id or all required']);
        exit;
    }

    echo json_encode(['success' => true, 'affected_rows' => $affected]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
?>
