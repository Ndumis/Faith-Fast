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

            if ($book_id && $chapter) {
                $stmt = $db->prepare("SELECT id, verse_number, start_offset, end_offset, color FROM bible_highlights WHERE user_id = ? AND book_id = ? AND chapter = ? ORDER BY verse_number, start_offset");
                $stmt->bind_param('iii', $user_id, $book_id, $chapter);
                $stmt->execute();
                $highlights = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

                echo json_encode(['success' => true, 'highlights' => $highlights]);
                break;
            }

            // No book/chapter given - return every highlight the user has
            // saved, with enough context (book name + verse text) to show as
            // a "My Highlights" study summary.
            $stmt = $db->prepare("
                SELECT h.id, h.book_id, b.name AS book_name, h.chapter, h.verse_number,
                       h.start_offset, h.end_offset, h.color, v.text AS verse_text, h.created_at
                FROM bible_highlights h
                JOIN bible_books b ON b.id = h.book_id
                JOIN bible_verses v ON v.book_id = h.book_id AND v.chapter = h.chapter AND v.verse_number = h.verse_number
                WHERE h.user_id = ?
                ORDER BY h.created_at DESC
            ");
            $stmt->bind_param('i', $user_id);
            $stmt->execute();
            $highlights = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

            echo json_encode(['success' => true, 'highlights' => $highlights]);
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);

            $book_id = $input['book_id'] ?? null;
            $chapter = $input['chapter'] ?? null;
            $verse_number = $input['verse_number'] ?? null;
            $start_offset = $input['start_offset'] ?? null;
            $end_offset = $input['end_offset'] ?? null;
            $color = $input['color'] ?? null;

            if (!$book_id || !$chapter || !$verse_number || $start_offset === null || $end_offset === null || !$color) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'book_id, chapter, verse_number, start_offset, end_offset and color are required']);
                exit;
            }

            $start_offset = (int) $start_offset;
            $end_offset = (int) $end_offset;

            if ($start_offset < 0 || $end_offset <= $start_offset) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Invalid highlight range']);
                exit;
            }

            if (!in_array($color, $allowedColors, true)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Invalid highlight color']);
                exit;
            }

            // Remove any existing highlights for this verse that overlap the
            // new range - the new highlight takes precedence over the text
            // it covers.
            $stmt = $db->prepare("DELETE FROM bible_highlights WHERE user_id = ? AND book_id = ? AND chapter = ? AND verse_number = ? AND start_offset < ? AND end_offset > ?");
            $stmt->bind_param('iiiiii', $user_id, $book_id, $chapter, $verse_number, $end_offset, $start_offset);
            $stmt->execute();
            $stmt->close();

            $stmt = $db->prepare("INSERT INTO bible_highlights (user_id, book_id, chapter, verse_number, start_offset, end_offset, color) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param('iiiiiis', $user_id, $book_id, $chapter, $verse_number, $start_offset, $end_offset, $color);
            $stmt->execute();
            $stmt->close();

            $stmt = $db->prepare("SELECT id, verse_number, start_offset, end_offset, color FROM bible_highlights WHERE user_id = ? AND book_id = ? AND chapter = ? AND verse_number = ? ORDER BY start_offset");
            $stmt->bind_param('iiii', $user_id, $book_id, $chapter, $verse_number);
            $stmt->execute();
            $highlights = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

            echo json_encode(['success' => true, 'highlights' => $highlights]);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;

            if (!$id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'id is required']);
                exit;
            }

            $stmt = $db->prepare("DELETE FROM bible_highlights WHERE id = ? AND user_id = ?");
            $stmt->bind_param('ii', $id, $user_id);
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
