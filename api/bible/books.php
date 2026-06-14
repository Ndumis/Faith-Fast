<?php
require_once '../config.php';
require_once '../CRUD.php';

header('Content-Type: application/json');

try {
    $db = Database::getInstance()->getConnection();
    
    $sql = "SELECT * FROM bible_books ORDER BY id ASC";
    $stmt = $db->prepare($sql);
    
    if ($stmt === false) {
        throw new Exception('Failed to prepare SQL statement: ' . $db->error);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    $books = $result->fetch_all(MYSQLI_ASSOC);
    
    echo json_encode([
        'success' => true,
        'books' => $books
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching books: ' . $e->getMessage()
    ]);
}
?>