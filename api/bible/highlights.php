<?php
require_once '../config.php';
require_once '../CRUD.php';

header('Content-Type: application/json');

$authUser = getAuthUser();
if (!$authUser) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Authentication required']);
    exit;
}

$user_id = $authUser['user_id'];
$db = Database::getInstance()->getConnection();

// Highlight colors offered to users - keep this in sync with the swatches
// rendered in js/bible.js so a stored color always has a matching style.
$allowedColors = ['yellow', 'green', 'blue', 'pink'];

try {
    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            $book_id = $_GET['book_id'] ?? null;
            $chapter = $_GET['chapter'] ?? null;

            if (!$book_id || !$chapter) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'book_id and chapter are required']);
                exit;
            }

            $stmt = $db->prepare("SELECT verse_number, color FROM bible_highlights WHERE user_id = ? AND book_id = ? AND chapter = ?");
            $stmt->bind_param('iii', $user_id, $book_id, $chapter);
            $stmt->execute();
            $highlights = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

            echo json_encode(['success' => true, 'highlights' => $highlights]);
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);

            $book_id = $input['book_id'] ?? null;
            $chapter = $input['chapter'] ?? null;
            $verse_number = $input['verse_number'] ?? null;
            $color = $input['color'] ?? null;

            if (!$book_id || !$chapter || !$verse_number || !$color) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'book_id, chapter, verse_number and color are required']);
                exit;
            }

            if (!in_array($color, $allowedColors, true)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Invalid highlight color']);
                exit;
            }

            $stmt = $db->prepare("INSERT INTO bible_highlights (user_id, book_id, chapter, verse_number, color)
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE color = VALUES(color)");
            $stmt->bind_param('iiiis', $user_id, $book_id, $chapter, $verse_number, $color);
            $stmt->execute();

            echo json_encode(['success' => true]);
            break;

        case 'DELETE':
            $book_id = $_GET['book_id'] ?? null;
            $chapter = $_GET['chapter'] ?? null;
            $verse_number = $_GET['verse_number'] ?? null;

            if (!$book_id || !$chapter || !$verse_number) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'book_id, chapter and verse_number are required']);
                exit;
            }

            $stmt = $db->prepare("DELETE FROM bible_highlights WHERE user_id = ? AND book_id = ? AND chapter = ? AND verse_number = ?");
            $stmt->bind_param('iiii', $user_id, $book_id, $chapter, $verse_number);
            $stmt->execute();

            echo json_encode(['success' => true]);
            break;

        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
?>
