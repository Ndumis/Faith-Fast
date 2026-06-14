<?php
require_once '../config.php';
require_once '../CRUD.php';

header('Content-Type: application/json');

try {
    $book_id = $_GET['book_id'] ?? $_GET['book'] ?? null;
    $chapter = $_GET['chapter'] ?? null;
    $testament = $_GET['testament'] ?? null;
    $search = $_GET['search'] ?? null;
    
    $db = Database::getInstance()->getConnection();
    
    // Build the query with proper conditions
    $conditions = [];
    $params = [];
    $types = '';
    
    if ($book_id) {
        $conditions[] = 'book_id = ?';
        $params[] = $book_id;
        $types .= 'i';
    }
    
    if ($chapter) {
        $conditions[] = 'chapter = ?';
        $params[] = $chapter;
        $types .= 'i';
    }
    
    if ($search) {
        $conditions[] = 'text LIKE ?';
        $params[] = '%' . $search . '%';
        $types .= 's';
    }
    
    $whereClause = empty($conditions) ? '' : 'WHERE ' . implode(' AND ', $conditions);
    $sql = "SELECT v.*, b.name as book_name, b.testament 
            FROM bible_verses v 
            JOIN bible_books b ON v.book_id = b.id 
            $whereClause 
            ORDER BY v.book_id, v.chapter, v.verse_number";
    
    $stmt = $db->prepare($sql);
    
    if ($stmt === false) {
        throw new Exception('Failed to prepare SQL statement: ' . $db->error);
    }
    
    // Bind parameters if needed
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    $verses = $result->fetch_all(MYSQLI_ASSOC);
    
    echo json_encode([
        'success' => true,
        'verses' => $verses,
        'count' => count($verses)
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching Bible verses: ' . $e->getMessage()
    ]);
}
?>